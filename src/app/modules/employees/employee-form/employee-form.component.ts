import { Component, OnInit, signal, inject } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import {
  AbstractControl,
  FormBuilder,
  FormGroup,
  ReactiveFormsModule,
  ValidationErrors,
  Validators,
} from '@angular/forms';
import { StepsModule } from 'primeng/steps';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { DropdownModule } from 'primeng/dropdown';
import { CalendarModule } from 'primeng/calendar';
import { RadioButtonModule } from 'primeng/radiobutton';
import { FileUploadModule } from 'primeng/fileupload';
import { MessageModule } from 'primeng/message';
import { TooltipModule } from 'primeng/tooltip';
import { MenuItem, MessageService } from 'primeng/api';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { forkJoin, switchMap, of } from 'rxjs';
import {
  JobGradesService,
  JobPositionsService,
  OrganizationUnitsService,
  JobGradeDto,
  JobPositionDto,
  OrganizationUnitDto,
} from '../../../core/api/generated';
import { EmployeeService } from '../../../core/services/employee.service';
import { FileUploadService } from '../../../core/services/file-upload.service';
import { Employee, EmployeeDocument } from '../../../core/models/employee.model';
import {
  NATIONAL_ID_DOCUMENT_TYPE_ID,
  defaultExpiryFromIssue,
  getDocTypeLabel,
  isPersistedDocumentId,
  isSameLocalDay,
  pickCurrentNationalIdDocument,
  resolveDocumentTypeId,
  truncateDocumentNumber,
} from '../../../core/mappers/employee-document-types';
import { parseEgyptianNationalIdBirthDate } from '../../../core/utils/egyptian-national-id';

const LAST_STEP = 2;

const STEP_FIELDS: string[][] = [
  [
    'firstName',
    'secondName',
    'thirdName',
    'lastName',
    'nationalId',
    'gender',
    'nationality',
    'phone',
    'alternatePhone',
  ],
  [
    'employeeNumber',
    'appointmentDate',
    'jobGrade',
    'jobTitle',
    'department',
    'section',
    'employmentType',
    'status',
  ],
  ['nationalIdIssueDate', 'nationalIdExpiryDate', 'nationalIdFileUrl'],
];

function egyptianNationalIdValidator(control: AbstractControl): ValidationErrors | null {
  const value = (control.value ?? '').toString().trim();
  if (!value) return null;
  if (!/^\d{14}$/.test(value)) return { pattern: true };
  if (!parseEgyptianNationalIdBirthDate(value)) return { nationalIdBirthDate: true };
  return null;
}

/** Stored option values stay Arabic (existing DB data); labels are translated. */
const NATIONALITY_VALUES: { key: string; value: string }[] = [
  { key: 'employees.nationality.egyptian', value: 'مصري' },
  { key: 'employees.nationality.saudi', value: 'سعودي' },
  { key: 'employees.nationality.jordanian', value: 'أردني' },
  { key: 'employees.nationality.syrian', value: 'سوري' },
  { key: 'employees.nationality.lebanese', value: 'لبناني' },
  { key: 'employees.nationality.palestinian', value: 'فلسطيني' },
  { key: 'employees.nationality.sudanese', value: 'سوداني' },
  { key: 'employees.nationality.yemeni', value: 'يمني' },
  { key: 'employees.nationality.iraqi', value: 'عراقي' },
  { key: 'employees.nationality.other', value: 'أخرى' },
];

@Component({
  selector: 'app-employee-form',
  standalone: true,
  imports: [
    RouterLink,
    ReactiveFormsModule,
    StepsModule,
    ButtonModule,
    InputTextModule,
    DropdownModule,
    CalendarModule,
    RadioButtonModule,
    FileUploadModule,
    MessageModule,
    TooltipModule,
    TranslateModule,
  ],
  templateUrl: './employee-form.component.html',
  styleUrl: './employee-form.component.scss',
})
export class EmployeeFormComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly employeeService = inject(EmployeeService);
  private readonly fileUploadService = inject(FileUploadService);
  private readonly messageService = inject(MessageService);
  private readonly jobGradesService = inject(JobGradesService);
  private readonly jobPositionsService = inject(JobPositionsService);
  private readonly organizationUnitsService = inject(OrganizationUnitsService);
  private readonly translate = inject(TranslateService);

  readonly activeStep = signal(0);
  readonly isEdit = signal(false);
  readonly employeeId = signal<string | null>(null);
  readonly isDraft = signal(false);
  readonly saving = signal(false);
  /** After a failed save, show errors even if controls were not blurred. */
  readonly submittedAttempt = signal(false);
  readonly nationalIdFileName = signal<string>('');
  private lastAutoNatExpiry: Date | null = null;

  stepItems: MenuItem[] = [];

  form!: FormGroup;

  private jobGrades: JobGradeDto[] = [];
  private jobPositions: JobPositionDto[] = [];
  private organizationUnits: OrganizationUnitDto[] = [];

  readonly departmentOptions = signal<{ label: string; value: string }[]>([]);
  readonly sectionOptions = signal<{ label: string; value: string }[]>([]);
  readonly jobGradeOptions = signal<{ label: string; value: string }[]>([]);
  readonly jobPositionOptions = signal<{ label: string; value: string }[]>([]);

  genderOptions: { label: string; value: string }[] = [];
  employmentTypeOptions: { label: string; value: string }[] = [];
  statusOptions: { label: string; value: string }[] = [];
  nationalityOptions: { label: string; value: string }[] = [];

  constructor() {
    this.buildForm();
  }

  ngOnInit(): void {
    this.rebuildLocalizedOptions();
    this.translate.onLangChange.subscribe(() => this.rebuildLocalizedOptions());

    forkJoin({
      grades: this.jobGradesService.jobGradesGetAll(),
      positions: this.jobPositionsService.jobPositionsGetAll(),
      units: this.organizationUnitsService.organizationUnitsGetAll(),
    }).subscribe({
      next: ({ grades, positions, units }) => {
        if (grades.success && grades.data) {
          this.jobGrades = grades.data;
          this.jobGradeOptions.set(this.mapGradesToOptions(grades.data));
        }
        if (positions.success && positions.data) {
          this.jobPositions = positions.data;
        }
        if (units.success && units.data) {
          this.organizationUnits = units.data;
          this.rebuildDepartmentOptions();
          this.syncSectionOptions();
        }
        this.syncJobTitleOptions();

        const id = this.route.snapshot.paramMap.get('id');
        if (id && id !== 'add') {
          this.employeeId.set(id);
          this.isEdit.set(true);
          this.employeeService.getById(id).subscribe({
            next: (emp) => {
              if (emp) this.patchForm(emp);
            },
          });
        }
      },
    });
  }

  private rebuildLocalizedOptions(): void {
    this.stepItems = [
      { label: this.translate.instant('employees.form.step_personal') },
      { label: this.translate.instant('employees.form.step_appointment') },
      { label: this.translate.instant('employees.form.step_documents') },
    ];
    this.genderOptions = [
      { label: this.translate.instant('employees.gender.male'), value: 'male' },
      { label: this.translate.instant('employees.gender.female'), value: 'female' },
    ];
    this.employmentTypeOptions = [
      { label: this.translate.instant('employees.employment_type.permanent'), value: 'permanent' },
      { label: this.translate.instant('employees.employment_type.temporary'), value: 'temporary' },
      { label: this.translate.instant('employees.employment_type.contract'), value: 'contract' },
    ];
    this.statusOptions = [
      { label: this.translate.instant('employees.status.active'), value: 'active' },
      { label: this.translate.instant('employees.status.suspended'), value: 'suspended' },
      { label: this.translate.instant('employees.status.terminated'), value: 'terminated' },
      { label: this.translate.instant('employees.status.retired'), value: 'retired' },
    ];
    this.nationalityOptions = NATIONALITY_VALUES.map((o) => ({
      label: this.translate.instant(o.key),
      value: o.value,
    }));
  }

  private buildForm(): void {
    this.form = this.fb.group({
      firstName: ['', [Validators.required, Validators.minLength(2)]],
      secondName: ['', [Validators.required, Validators.minLength(2)]],
      thirdName: ['', [Validators.required, Validators.minLength(2)]],
      lastName: [''],
      nationalId: ['', [Validators.required, egyptianNationalIdValidator]],
      gender: ['male', Validators.required],
      birthDate: [{ value: null as Date | null, disabled: true }, Validators.required],
      nationality: ['مصري'],
      phone: ['', [Validators.required, Validators.pattern(/^01[0125]\d{8}$/)]],
      alternatePhone: [''],
      employeeNumber: ['', [Validators.required, Validators.maxLength(50)]],
      appointmentDate: [null as Date | null],
      jobGrade: [''],
      jobTitle: [''],
      department: [''],
      section: [''],
      employmentType: ['permanent'],
      status: ['active'],
      nationalIdIssueDate: [null as Date | null],
      nationalIdExpiryDate: [null as Date | null],
      nationalIdFileUrl: [''],
    });
    this.form.addControl('fullName', this.fb.control(''));
    this.form.get('firstName')?.valueChanges.subscribe(() => this.updateFullName());
    this.form.get('secondName')?.valueChanges.subscribe(() => this.updateFullName());
    this.form.get('thirdName')?.valueChanges.subscribe(() => this.updateFullName());
    this.form.get('lastName')?.valueChanges.subscribe(() => this.updateFullName());
    this.form.get('nationalId')?.valueChanges.subscribe((value) => this.syncBirthDateFromNationalId(value));
    this.form.get('nationalIdIssueDate')?.valueChanges.subscribe((issue) => {
      this.syncNationalIdExpiryFromIssue(issue);
    });
    this.form.get('nationalIdExpiryDate')?.valueChanges.subscribe((expiry) => {
      if (!isSameLocalDay(expiry, this.lastAutoNatExpiry)) {
        this.lastAutoNatExpiry = null;
      }
    });
    this.form.get('jobGrade')?.valueChanges.subscribe(() => this.syncJobTitleOptions());
    this.form.get('department')?.valueChanges.subscribe(() => {
      const sectionCtrl = this.form.get('section');
      const sid = sectionCtrl?.value;
      this.syncSectionOptions();
      const allowed = new Set(this.sectionOptions().map((o) => o.value));
      if (sid && !allowed.has(sid)) {
        sectionCtrl?.setValue('', { emitEvent: false });
      }
    });
  }

  private updateFullName(): void {
    const first = (this.form.get('firstName')?.value ?? '').trim();
    const second = (this.form.get('secondName')?.value ?? '').trim();
    const third = (this.form.get('thirdName')?.value ?? '').trim();
    const last = (this.form.get('lastName')?.value ?? '').trim();
    const name = [first, second, third, last].filter(Boolean).join(' ');
    this.form.patchValue({ fullName: name }, { emitEvent: false });
  }

  private syncBirthDateFromNationalId(nationalId: string | null | undefined): void {
    const birthDate = parseEgyptianNationalIdBirthDate(nationalId);
    this.form.get('birthDate')?.setValue(birthDate, { emitEvent: false });
  }

  private syncNationalIdExpiryFromIssue(issue: Date | null | undefined): void {
    if (!issue) return;
    const expiryCtrl = this.form.get('nationalIdExpiryDate');
    const currentExpiry = expiryCtrl?.value as Date | null;
    const expected = defaultExpiryFromIssue(issue, 'id_copy');
    if (!expected) return;
    if (!currentExpiry || isSameLocalDay(currentExpiry, this.lastAutoNatExpiry)) {
      expiryCtrl?.setValue(expected, { emitEvent: false });
      this.lastAutoNatExpiry = expected;
    }
  }

  private syncJobTitleOptions(): void {
    const gradeId = this.form?.get('jobGrade')?.value as string | undefined;
    const list = gradeId
      ? this.jobPositions.filter((p) => (p.jobGradeId ?? '').toLowerCase() === gradeId.toLowerCase())
      : [];
    this.jobPositionOptions.set(this.mapPositionsToOptions(list));
    const titleCtrl = this.form.get('jobTitle');
    const current = titleCtrl?.value;
    const allowed = new Set(this.jobPositionOptions().map((o) => o.value));
    if (current && !allowed.has(current)) {
      titleCtrl?.setValue('', { emitEvent: false });
    }
  }

  private patchForm(emp: Employee): void {
    this.rebuildDepartmentOptions();
    this.syncSectionOptions();

    const toDate = (val: any) => {
      if (!val) return null;
      const d = val instanceof Date ? val : new Date(val);
      return isNaN(d.getTime()) || d.getTime() === 0 ? null : d;
    };

    const assignedId =
      this.resolveOrganizationUnitId(emp.organizationUnitId || '', 'section') ||
      this.resolveOrganizationUnitId(emp.section, 'section') ||
      this.resolveOrganizationUnitId(emp.department, 'department');
    const assigned = this.organizationUnits.find((u) => u.id === assignedId);
    const depId = assigned?.parentId || assignedId || '';
    const secId = assigned?.parentId ? assignedId : '';

    const natDoc = pickCurrentNationalIdDocument(emp.documents, emp.nationalId);

    const titleId = this.resolveJobPositionId(emp.jobPositionId || emp.jobTitle);
    const position = this.jobPositions.find((p) => p.id === titleId);
    const resolvedGrade = this.resolveJobGradeId(emp.jobGrade);
    const gradeId = this.jobGrades.some((g) => g.id === resolvedGrade)
      ? resolvedGrade
      : (position?.jobGradeId ?? '');

    this.form.patchValue({
      firstName: emp.firstName ?? '',
      secondName: emp.secondName ?? '',
      thirdName: emp.thirdName ?? '',
      lastName: emp.lastName ?? '',
      fullName: emp.fullName ?? '',
      nationalId: emp.nationalId ?? '',
      gender: emp.gender ?? 'male',
      nationality: emp.nationality || 'مصري',
      phone: emp.phone ?? '',
      alternatePhone: emp.alternatePhone ?? '',
      employeeNumber: emp.employeeNumber ?? '',
      appointmentDate: toDate(emp.appointmentDate),
      department: depId,
      section: secId,
      employmentType: emp.employmentType ?? 'permanent',
      status: emp.status ?? 'active',
      nationalIdIssueDate: toDate(natDoc?.uploadDate),
      nationalIdExpiryDate: toDate(natDoc?.expiryDate) || defaultExpiryFromIssue(toDate(natDoc?.uploadDate), 'id_copy'),
      nationalIdFileUrl: natDoc?.fileUrl ?? '',
    }, { emitEvent: false });
    this.form.get('jobGrade')?.setValue(gradeId);
    this.syncJobTitleOptions();
    this.form.get('jobTitle')?.setValue(titleId, { emitEvent: false });
    this.syncBirthDateFromNationalId(emp.nationalId);
    if (natDoc?.fileUrl && natDoc.fileUrl !== 'https://example.com/doc.pdf') {
      const attached = this.translate.instant('employees.form.attached_doc_label');
      this.nationalIdFileName.set(
        natDoc.fileUrl.startsWith('data:') ? attached : (natDoc.fileUrl.split('/').pop() || attached)
      );
    } else {
      this.nationalIdFileName.set('');
    }
    const patchedIssue = toDate(natDoc?.uploadDate);
    const patchedExpiry =
      toDate(natDoc?.expiryDate) || defaultExpiryFromIssue(patchedIssue, 'id_copy');
    this.lastAutoNatExpiry = isSameLocalDay(patchedExpiry, defaultExpiryFromIssue(patchedIssue, 'id_copy'))
      ? patchedExpiry
      : null;
    this.syncSectionOptions();
    if (secId) {
      this.form.get('section')?.setValue(secId, { emitEvent: false });
    }
    const dep = this.form.get('department')?.value;
    const sec = this.form.get('section')?.value;
    const allowedSec = new Set(this.sectionOptions().map((o) => o.value));
    if (sec && !allowedSec.has(sec)) {
      this.form.get('section')?.setValue('', { emitEvent: false });
    }
    if (!dep && sec) {
      const parent = this.organizationUnits.find((u) => u.id === sec)?.parentId;
      if (parent) {
        this.form.get('department')?.setValue(parent, { emitEvent: false });
        this.syncSectionOptions();
      }
    }
  }

  getError(controlName: string): string | null {
    const c = this.form.get(controlName);
    if (!c?.errors) return null;
    if (!c.touched && !this.submittedAttempt()) return null;

    const e = c.errors;
    if (e['required']) return this.translate.instant('employees.form.error_required');
    if (e['email']) return this.translate.instant('employees.form.error_email');
    if (e['minlength']) return this.translate.instant('employees.form.error_minlength');
    if (e['maxlength']) return this.translate.instant('employees.form.error_maxlength');
    if (e['pattern']) {
      if (controlName === 'nationalId') {
        return this.translate.instant('employees.form.error_national_id_pattern');
      }
      if (controlName === 'phone') {
        return this.translate.instant('employees.form.error_phone_pattern');
      }
      return this.translate.instant('employees.form.error_pattern');
    }
    if (e['nationalIdBirthDate']) {
      return this.translate.instant('employees.form.error_national_id_birth_date');
    }
    if (e['min']) {
      const m = e['min'] as { min?: number; actual?: number };
      return this.translate.instant('employees.form.error_min', { min: m.min ?? '' });
    }
    if (e['max']) {
      const m = e['max'] as { max?: number; actual?: number };
      return this.translate.instant('employees.form.error_max', { max: m.max ?? '' });
    }

    return this.translate.instant('employees.form.error_invalid');
  }

  stepValid(step: number): boolean {
    const names = STEP_FIELDS[step];
    if (!names.length) return true;
    return names.every((name) => {
      const ctrl = this.form.get(name);
      return !ctrl || ctrl.disabled || ctrl.valid;
    });
  }

  private firstInvalidStep(): number | null {
    for (let s = 0; s < STEP_FIELDS.length; s++) {
      if (!this.stepValid(s)) return s;
    }
    return null;
  }

  nextStep(): void {
    const step = this.activeStep();
    if (!this.stepValid(step)) {
      STEP_FIELDS[step].forEach((name) => this.form.get(name)?.markAllAsTouched());
      return;
    }
    this.activeStep.update((s) => Math.min(s + 1, LAST_STEP));
  }

  prevStep(): void {
    this.activeStep.update((s) => Math.max(s - 1, 0));
  }

  saveDraft(): void {
    this.messageService.add({
      severity: 'info',
      summary: this.translate.instant('employees.form.draft_unavailable_summary'),
      detail: this.translate.instant('employees.form.draft_unavailable_detail'),
    });
  }

  submit(): void {
    if (this.form.invalid) {
      this.submittedAttempt.set(true);
      this.form.markAllAsTouched();
      const step = this.firstInvalidStep();
      if (step != null) this.activeStep.set(step);
      return;
    }
    if (this.saving()) return;
    this.saving.set(true);

    this.submittedAttempt.set(false);
    this.updateFullName();
    const v = this.form.getRawValue();

    const toDate = (val: any) => {
      if (!val) return null;
      const d = val instanceof Date ? val : new Date(val);
      return isNaN(d.getTime()) || d.getTime() === 0 ? null : d;
    };

    const existingEmployee = this.employeeId() ? this.employeeService.getByIdSync(this.employeeId()!) : null;
    const natDoc = pickCurrentNationalIdDocument(existingEmployee?.documents, v.nationalId);

    const otherDocs = (existingEmployee?.documents || []).filter(
      (d) => d !== natDoc && d.documentNumber !== v.nationalId && d.name !== v.nationalId
    );

    const natIssueDate = toDate(v.nationalIdIssueDate);
    const natExpiryDate = toDate(v.nationalIdExpiryDate);
    const natFileUrl = (v.nationalIdFileUrl ?? '').trim();

    const nationalIdDocument: EmployeeDocument | null = v.nationalId ? {
      id: isPersistedDocumentId(natDoc?.id) ? natDoc!.id : `doc-nat-${v.nationalId}`,
      documentNumber: v.nationalId,
      documentTypeId: natDoc?.documentTypeId || NATIONAL_ID_DOCUMENT_TYPE_ID,
      type: 'id_copy' as const,
      name: v.nationalId,
      fileUrl: natFileUrl || natDoc?.fileUrl || '',
      uploadDate: natIssueDate || natDoc?.uploadDate || v.appointmentDate || v.birthDate || new Date(),
      expiryDate:
        natExpiryDate ||
        natDoc?.expiryDate ||
        defaultExpiryFromIssue(
          natIssueDate || natDoc?.uploadDate || v.appointmentDate || v.birthDate || new Date(),
          'id_copy'
        ) ||
        undefined,
    } : null;

    const documentsPayload: EmployeeDocument[] = [
      ...(nationalIdDocument ? [nationalIdDocument] : []),
      ...otherDocs,
    ];

    const payload = {
      employeeNumber: v.employeeNumber,
      nationalId: v.nationalId,
      fullName: v.fullName || `${v.firstName} ${v.secondName} ${v.thirdName} ${v.lastName}`.trim(),
      firstName: v.firstName,
      secondName: v.secondName,
      thirdName: v.thirdName,
      lastName: v.lastName,
      gender: v.gender,
      birthDate: v.birthDate ?? parseEgyptianNationalIdBirthDate(v.nationalId) ?? new Date(),
      nationality: v.nationality,
      phone: v.phone,
      alternatePhone: v.alternatePhone || undefined,
      appointmentDate: v.appointmentDate ?? new Date(),
      jobTitle: this.jobPositionDisplay(v.jobTitle),
      jobGrade: this.jobGradeDisplay(v.jobGrade),
      department: this.organizationUnitDisplay(v.department),
      section: this.organizationUnitDisplay(v.section),
      employmentType: v.employmentType,
      status: v.status,
      jobPositionId: this.resolveJobPositionId(v.jobTitle || ''),
      organizationUnitId:
        this.resolveOrganizationUnitId(v.section || '', 'section') ||
        this.resolveOrganizationUnitId(v.department || '', 'department'),
      maritalStatus: existingEmployee?.maritalStatus ?? 'single',
      birthPlace: existingEmployee?.birthPlace,
      religion: existingEmployee?.religion,
      appointmentDecisionNumber: existingEmployee?.appointmentDecisionNumber,
      appointmentDecisionDate: existingEmployee?.appointmentDecisionDate,
      email: existingEmployee?.email,
      contactId: existingEmployee?.contactId,
      documents: documentsPayload,
    };
    const id = this.employeeId();
    if (id && this.isEdit()) {
      const existingNatId = isPersistedDocumentId(natDoc?.id) ? natDoc!.id : undefined;
      this.employeeService.update(id, payload).pipe(
        switchMap(() =>
          nationalIdDocument
            ? this.employeeService.upsertNationalIdDocument(id, existingNatId, nationalIdDocument)
            : of(true)
        )
      ).subscribe({
        next: () => {
          this.afterEmployeeSaved(id, this.translate.instant('employees.form.update_success'));
        },
        error: () => {
          this.saving.set(false);
        },
      });
    } else {
      this.employeeService.create(payload).subscribe({
        next: (response: any) => {
          const newId = response?.data || response?.id || (typeof response === 'string' ? response : null);
          if (newId) {
            this.afterEmployeeSaved(
              newId,
              this.translate.instant('employees.form.create_success')
            );
          } else {
            this.saving.set(false);
            this.messageService.add({
              severity: 'success',
              summary: this.translate.instant('employees.form.success_summary'),
              detail: this.translate.instant('employees.form.create_success'),
            });
            this.router.navigate(['/employees']);
          }
        },
        error: () => {
          this.saving.set(false);
        },
      });
    }
  }

  private afterEmployeeSaved(employeeId: string, successDetail: string): void {
    this.saving.set(false);
    this.messageService.add({
      severity: 'success',
      summary: this.translate.instant('employees.form.success_summary'),
      detail: successDetail,
    });
    this.router.navigate(['/employees', employeeId]);
  }

  onUpload(event: { files?: File[] }): void {
    const employeeId = this.employeeId();
    if (!employeeId || !this.isEdit()) {
      this.messageService.add({
        severity: 'warn',
        summary: this.translate.instant('employees.form.upload_warn_summary'),
        detail: this.translate.instant('employees.form.upload_warn_detail'),
      });
      return;
    }

    const files = event.files?.filter(Boolean) ?? [];
    if (!files.length) return;

    const documentTypeId = resolveDocumentTypeId('other');
    if (!documentTypeId) return;

    const now = new Date();
    const extraExpiry = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    extraExpiry.setFullYear(extraExpiry.getFullYear() + 10);
    const otherLabel = getDocTypeLabel('other', this.translate);
    forkJoin(files.map((file) => this.fileUploadService.upload(file, 'employees/documents')))
      .pipe(
        switchMap((paths) => {
          const docs: EmployeeDocument[] = paths.map((path, index) => {
            const name = truncateDocumentNumber(
              files[index].name || otherLabel,
              otherLabel
            );
            return {
              id: `doc-${Date.now()}-${index}`,
              type: 'other' as const,
              documentTypeId,
              name,
              documentNumber: name,
              fileUrl: path,
              uploadDate: now,
              expiryDate: extraExpiry,
            };
          });
          return this.employeeService.addDocuments(employeeId, docs);
        })
      )
      .subscribe({
        next: () => {
          this.messageService.add({
            severity: 'success',
            summary: this.translate.instant('employees.form.upload_success_summary'),
            detail: this.translate.instant('employees.form.upload_extra_success'),
          });
        },
      });
  }

  onNationalIdFileSelect(event: { files?: File[]; currentFiles?: File[] }): void {
    const file: File | undefined = event.files?.[0] || event.currentFiles?.[0];
    if (!file) return;
    this.nationalIdFileName.set(file.name);
    this.fileUploadService.upload(file, 'employees/documents').subscribe({
      next: (path) => {
        this.form.patchValue({ nationalIdFileUrl: path });
        this.messageService.add({
          severity: 'success',
          summary: this.translate.instant('employees.form.upload_success_summary'),
          detail: this.translate.instant('employees.form.upload_national_id_success'),
        });
      },
      error: () => {
        this.nationalIdFileName.set('');
        this.form.patchValue({ nationalIdFileUrl: '' });
      },
    });
  }

  onNationalIdFileClear(): void {
    this.nationalIdFileName.set('');
    this.form.patchValue({ nationalIdFileUrl: '' });
  }

  private mapGradesToOptions(list: JobGradeDto[]): { label: string; value: string }[] {
    return list
      .filter((g) => g.id)
      .map((g) => ({
        label: [g.name, g.code].filter(Boolean).join(' — ') || g.id!,
        value: g.id!,
      }));
  }

  private mapPositionsToOptions(list: JobPositionDto[]): { label: string; value: string }[] {
    return list
      .filter((p) => p.id)
      .map((p) => ({
        label: [p.name, p.code].filter(Boolean).join(' — ') || p.id!,
        value: p.id!,
      }));
  }

  private rebuildDepartmentOptions(): void {
    const roots = this.organizationUnits.filter((u) => !u.parentId);
    const src = roots.length ? roots : this.organizationUnits;
    this.departmentOptions.set(
      src
        .filter((u) => u.id)
        .map((u) => ({
          label: [u.name, u.code].filter(Boolean).join(' — ') || u.id!,
          value: u.id!,
        }))
    );
  }

  private syncSectionOptions(): void {
    const depId = this.form?.get('department')?.value as string | undefined;
    let children = depId
      ? this.organizationUnits.filter((u) => u.parentId === depId)
      : [];
    if (depId && !children.length) {
      children = this.organizationUnits.filter((u) => !!u.parentId);
    }
    this.sectionOptions.set(
      children
        .filter((u) => u.id)
        .map((u) => ({
          label: [u.name, u.code].filter(Boolean).join(' — ') || u.id!,
          value: u.id!,
        }))
    );
  }

  private resolveJobGradeId(raw: string): string {
    if (!raw) return '';
    if (this.jobGrades.some((g) => g.id === raw)) return raw;
    const t = raw.trim();
    const m = this.jobGrades.find(
      (g) => (g.name ?? '').trim() === t || (g.code ?? '').trim() === t
    );
    return m?.id ?? raw;
  }

  private resolveJobPositionId(raw: string): string {
    if (!raw) return '';
    if (this.jobPositions.some((p) => p.id === raw)) return raw;
    const t = raw.trim();
    const m = this.jobPositions.find(
      (p) => (p.name ?? '').trim() === t || (p.code ?? '').trim() === t
    );
    return m?.id ?? raw;
  }

  private resolveOrganizationUnitId(raw: string, kind: 'department' | 'section'): string {
    if (!raw) return '';
    if (this.organizationUnits.some((u) => u.id === raw)) return raw;
    const trimmed = raw.trim();
    const matches = this.organizationUnits.filter(
      (u) => (u.name ?? '').trim() === trimmed || (u.code ?? '').trim() === trimmed
    );
    if (!matches.length) return raw;
    if (kind === 'department') {
      const root = matches.find((u) => !u.parentId);
      return (root ?? matches[0]).id ?? raw;
    }
    const child = matches.find((u) => !!u.parentId);
    return (child ?? matches[0]).id ?? raw;
  }

  private jobGradeDisplay(idOrFallback: string): string {
    const g = this.jobGrades.find((x) => x.id === idOrFallback);
    if (g) return [g.name, g.code].filter(Boolean).join(' — ') || idOrFallback;
    return idOrFallback;
  }

  private jobPositionDisplay(idOrFallback: string): string {
    const p = this.jobPositions.find((x) => x.id === idOrFallback);
    if (p) return [p.name, p.code].filter(Boolean).join(' — ') || idOrFallback;
    return idOrFallback;
  }

  private organizationUnitDisplay(idOrFallback: string): string {
    const u = this.organizationUnits.find((x) => x.id === idOrFallback);
    if (u) return [u.name, u.code].filter(Boolean).join(' — ') || idOrFallback;
    return idOrFallback;
  }
}
