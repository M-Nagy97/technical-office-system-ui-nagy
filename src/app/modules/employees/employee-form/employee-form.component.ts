import { Component, OnInit, signal, inject } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import {
  FormBuilder,
  FormGroup,
  Validators,
  ReactiveFormsModule,
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
import { forkJoin } from 'rxjs';
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
  isPersistedDocumentId,
} from '../../../core/mappers/employee-document-types';

const STEP_FIELDS: string[][] = [
  [
    'firstName',
    'secondName',
    'thirdName',
    'lastName',
    'nationalId',
    'gender',
    'birthDate',
    'birthPlace',
    'nationality',
    'religion',
    'maritalStatus',
    'phone',
    'alternatePhone',
    'email',
    'address',
  ],
  [
    'employeeNumber',
    'appointmentDate',
    'appointmentDecisionNumber',
    'appointmentDecisionDate',
    'jobTitle',
    'jobGrade',
    'department',
    'section',
    'workLocation',
    'employmentType',
    'status',
  ],
  ['educationLevel', 'educationField', 'graduationYear'],
  ['nationalIdIssueDate', 'nationalIdExpiryDate', 'nationalIdFileUrl'],
];

const ARABIC_ERRORS: Record<string, string> = {
  required: 'هذا الحقل مطلوب',
  minlength: 'القيمة قصيرة جداً',
  maxlength: 'القيمة طويلة جداً',
  email: 'البريد الإلكتروني غير صحيح',
  pattern: 'القيمة غير صحيحة',
};

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

  readonly activeStep = signal(0);
  readonly isEdit = signal(false);
  readonly employeeId = signal<string | null>(null);
  readonly isDraft = signal(false);
  readonly saving = signal(false);
  /** After a failed save, show errors even if controls were not blurred. */
  readonly submittedAttempt = signal(false);
  readonly nationalIdFileName = signal<string>('');

  readonly stepItems: MenuItem[] = [
    { label: 'البيانات الشخصية' },
    { label: 'بيانات التعيين' },
    { label: 'المؤهلات والخبرات' },
    { label: 'المستندات' },
  ];

  form!: FormGroup;

  private jobGrades: JobGradeDto[] = [];
  private jobPositions: JobPositionDto[] = [];
  private organizationUnits: OrganizationUnitDto[] = [];

  readonly departmentOptions = signal<{ label: string; value: string }[]>([]);
  readonly sectionOptions = signal<{ label: string; value: string }[]>([]);
  readonly jobGradeOptions = signal<{ label: string; value: string }[]>([]);
  readonly jobPositionOptions = signal<{ label: string; value: string }[]>([]);

  readonly genderOptions = [
    { label: 'ذكر', value: 'male' },
    { label: 'أنثى', value: 'female' },
  ];
  readonly maritalOptions = [
    { label: 'أعزب', value: 'single' },
    { label: 'متزوج', value: 'married' },
    { label: 'مطلق', value: 'divorced' },
    { label: 'أرمل', value: 'widowed' },
  ];
  readonly employmentTypeOptions = [
    { label: 'دائم', value: 'permanent' },
    { label: 'مؤقت', value: 'temporary' },
    { label: 'عقد', value: 'contract' },
  ];
  readonly statusOptions = [
    { label: 'نشط', value: 'active' },
    { label: 'موقوف', value: 'suspended' },
    { label: 'منتهي', value: 'terminated' },
    { label: 'متقاعد', value: 'retired' },
  ];

  readonly nationalityOptions = [
    { label: 'مصري', value: 'مصري' },
    { label: 'سعودي', value: 'سعودي' },
    { label: 'أردني', value: 'أردني' },
    { label: 'سوري', value: 'سوري' },
    { label: 'لبناني', value: 'لبناني' },
    { label: 'فلسطيني', value: 'فلسطيني' },
    { label: 'سوداني', value: 'سوداني' },
    { label: 'يمني', value: 'يمني' },
    { label: 'عراقي', value: 'عراقي' },
    { label: 'أخرى', value: 'أخرى' },
  ];

  readonly religionOptions = [
    { label: 'مسلم', value: 'مسلم' },
    { label: 'مسيحي', value: 'مسيحي' },
    { label: 'يهودي', value: 'يهودي' },
    { label: 'أخرى', value: 'أخرى' },
  ];

  readonly governorateOptions = [
    { label: 'القاهرة', value: 'القاهرة' },
    { label: 'الجيزة', value: 'الجيزة' },
    { label: 'الإسكندرية', value: 'الإسكندرية' },
    { label: 'الدقهلية', value: 'الدقهلية' },
    { label: 'الشرقية', value: 'الشرقية' },
    { label: 'القليوبية', value: 'القليوبية' },
    { label: 'كفر الشيخ', value: 'كفر الشيخ' },
    { label: 'الغربية', value: 'الغربية' },
    { label: 'المنوفية', value: 'المنوفية' },
    { label: 'البحيرة', value: 'البحيرة' },
    { label: 'دمياط', value: 'دمياط' },
    { label: 'الفيوم', value: 'الفيوم' },
    { label: 'بني سويف', value: 'بني سويف' },
    { label: 'المنيا', value: 'المنيا' },
    { label: 'أسيوط', value: 'أسيوط' },
    { label: 'سوهاج', value: 'سوهاج' },
    { label: 'قنا', value: 'قنا' },
    { label: 'الأقصر', value: 'الأقصر' },
    { label: 'أسوان', value: 'أسوان' },
    { label: 'البحر الأحمر', value: 'البحر الأحمر' },
    { label: 'الوادي الجديد', value: 'الوادي الجديد' },
    { label: 'مطروح', value: 'مطروح' },
    { label: 'شمال سيناء', value: 'شمال سيناء' },
    { label: 'جنوب سيناء', value: 'جنوب سيناء' },
    { label: 'بورسعيد', value: 'بورسعيد' },
    { label: 'الإسماعيلية', value: 'الإسماعيلية' },
    { label: 'السويس', value: 'السويس' },
  ];

  readonly educationLevelOptions = [
    { label: 'دبلوم فني', value: 'دبلوم فني' },
    { label: 'دبلوم عالي', value: 'دبلوم عالي' },
    { label: 'بكالوريوس', value: 'بكالوريوس' },
    { label: 'ليسانس', value: 'ليسانس' },
    { label: 'بكالوريوس هندسة', value: 'بكالوريوس هندسة' },
    { label: 'ماجستير', value: 'ماجستير' },
    { label: 'دكتوراه', value: 'دكتوراه' },
  ];

  readonly educationFieldOptions = [
    { label: 'هندسة مدنية', value: 'هندسة مدنية' },
    { label: 'هندسة معمارية', value: 'هندسة معمارية' },
    { label: 'هندسة كهرباء', value: 'هندسة كهرباء' },
    { label: 'هندسة ميكانيكا', value: 'هندسة ميكانيكا' },
    { label: 'محاسبة', value: 'محاسبة' },
    { label: 'إدارة أعمال', value: 'إدارة أعمال' },
    { label: 'موارد بشرية', value: 'موارد بشرية' },
    { label: 'قانون', value: 'قانون' },
    { label: 'علوم حاسب', value: 'علوم حاسب' },
    { label: 'نظم معلومات', value: 'نظم معلومات' },
    { label: 'آداب ولغات', value: 'آداب ولغات' },
    { label: 'تربية', value: 'تربية' },
    { label: 'طب', value: 'طب' },
    { label: 'صيدلة', value: 'صيدلة' },
    { label: 'علوم', value: 'علوم' },
    { label: 'أخرى', value: 'أخرى' },
  ];

  constructor() {
    this.buildForm();
  }

  ngOnInit(): void {
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
          this.jobPositionOptions.set(this.mapPositionsToOptions(positions.data));
        }
        if (units.success && units.data) {
          this.organizationUnits = units.data;
          this.rebuildDepartmentOptions();
          this.syncSectionOptions();
        }

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

  private buildForm(): void {
    this.form = this.fb.group({
      // Step 1 - personal (Name parts, nationalId, gender, birthDate, phone required)
      firstName: ['', [Validators.required, Validators.minLength(2)]],
      secondName: ['', [Validators.required, Validators.minLength(2)]],
      thirdName: ['', [Validators.required, Validators.minLength(2)]],
      lastName: [''],
      nationalId: ['', [Validators.required, Validators.pattern(/^\d{14}$/)]],
      gender: ['male', Validators.required],
      birthDate: [null as Date | null, Validators.required],
      birthPlace: [''],
      nationality: ['مصري'],
      religion: [''],
      maritalStatus: ['single'],
      phone: ['', [Validators.required, Validators.pattern(/^01[0125]\d{8}$/)]],
      alternatePhone: [''],
      email: ['', Validators.email],
      address: [''],
      // Step 2 - appointment
      employeeNumber: ['', [Validators.required, Validators.maxLength(50)]],
      appointmentDate: [null as Date | null],
      appointmentDecisionNumber: [''],
      appointmentDecisionDate: [null as Date | null],
      jobTitle: [''],
      jobGrade: [''],
      department: [''],
      section: [''],
      workLocation: [''],
      employmentType: ['permanent'],
      status: ['active'],
      // Step 3 - qualifications
      educationLevel: [''],
      educationField: [''],
      graduationYear: [null as number | null, [Validators.min(1950), Validators.max(new Date().getFullYear())]],
      // Step 4 - documents
      nationalIdIssueDate: [null as Date | null],
      nationalIdExpiryDate: [null as Date | null],
      nationalIdFileUrl: [''],
    });
    this.form.addControl('fullName', this.fb.control(''));
    this.form.get('firstName')?.valueChanges.subscribe(() => this.updateFullName());
    this.form.get('secondName')?.valueChanges.subscribe(() => this.updateFullName());
    this.form.get('thirdName')?.valueChanges.subscribe(() => this.updateFullName());
    this.form.get('lastName')?.valueChanges.subscribe(() => this.updateFullName());
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

  private patchForm(emp: Employee): void {
    this.rebuildDepartmentOptions();
    this.syncSectionOptions();

    const toDate = (val: any) => {
      if (!val) return null;
      const d = val instanceof Date ? val : new Date(val);
      return isNaN(d.getTime()) || d.getTime() === 0 ? null : d;
    };

    const depId = this.resolveOrganizationUnitId(emp.department, 'department');
    const secId = this.resolveOrganizationUnitId(emp.section, 'section');

    const natDoc = (emp.documents || []).find(
      (d) => (d.documentNumber && d.documentNumber === emp.nationalId) ||
        (d.name && d.name === emp.nationalId) ||
        d.documentTypeId === NATIONAL_ID_DOCUMENT_TYPE_ID
      ) || (emp.documents && emp.documents.length > 0 ? emp.documents[0] : null);

    this.form.patchValue({
      firstName: emp.firstName ?? '',
      secondName: emp.secondName ?? '',
      thirdName: emp.thirdName ?? '',
      lastName: emp.lastName ?? '',
      fullName: emp.fullName ?? '',
      nationalId: emp.nationalId ?? '',
      gender: emp.gender ?? 'male',
      birthDate: toDate(emp.birthDate),
      birthPlace: emp.birthPlace ?? '',
      nationality: emp.nationality || 'مصري',
      religion: emp.religion ?? '',
      maritalStatus: emp.maritalStatus ?? 'single',
      phone: emp.phone ?? '',
      alternatePhone: emp.alternatePhone ?? '',
      email: emp.email ?? '',
      address: emp.address ?? '',
      employeeNumber: emp.employeeNumber ?? '',
      appointmentDate: toDate(emp.appointmentDate),
      appointmentDecisionNumber: emp.appointmentDecisionNumber ?? '',
      appointmentDecisionDate: toDate(emp.appointmentDecisionDate),
      jobTitle: this.resolveJobPositionId(emp.jobTitle),
      jobGrade: this.resolveJobGradeId(emp.jobGrade),
      department: depId,
      section: secId,
      workLocation: emp.workLocation ?? '',
      employmentType: emp.employmentType ?? 'permanent',
      status: emp.status ?? 'active',
      educationLevel: emp.educationLevel ?? '',
      educationField: emp.educationField ?? '',
      graduationYear: emp.graduationYear || null,
      nationalIdIssueDate: toDate(natDoc?.uploadDate),
      nationalIdExpiryDate: toDate(natDoc?.expiryDate),
      nationalIdFileUrl: natDoc?.fileUrl ?? '',
    });
    if (natDoc?.fileUrl && natDoc.fileUrl !== 'https://example.com/doc.pdf') {
      this.nationalIdFileName.set(natDoc.fileUrl.startsWith('data:') ? 'وثيقة مرفقة' : (natDoc.fileUrl.split('/').pop() || 'وثيقة مرفقة'));
    } else {
      this.nationalIdFileName.set('');
    }
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
    if (e['required']) return ARABIC_ERRORS['required'];
    if (e['email']) return ARABIC_ERRORS['email'];
    if (e['minlength']) return ARABIC_ERRORS['minlength'];
    if (e['maxlength']) return ARABIC_ERRORS['maxlength'];
    if (e['pattern']) {
      if (controlName === 'nationalId') return 'الرقم القومي يجب أن يكون 14 رقماً';
      if (controlName === 'phone') return 'صيغة رقم الهاتف غير صحيحة (مثال: 01xxxxxxxxx)';
      return ARABIC_ERRORS['pattern'];
    }
    if (e['min']) {
      const m = e['min'] as { min?: number; actual?: number };
      if (controlName === 'graduationYear') {
        return `سنة التخرج يجب ألا تقل عن ${m.min ?? ''}`;
      }
      return `القيمة يجب ألا تقل عن ${m.min ?? ''}`;
    }
    if (e['max']) {
      const m = e['max'] as { max?: number; actual?: number };
      if (controlName === 'graduationYear') {
        return `سنة التخرج يجب ألا تتجاوز ${m.max ?? ''}`;
      }
      return `القيمة يجب ألا تتجاوز ${m.max ?? ''}`;
    }

    const key = Object.keys(e)[0];
    return ARABIC_ERRORS[key] ?? 'قيمة غير صحيحة';
  }

  stepValid(step: number): boolean {
    const names = STEP_FIELDS[step];
    if (!names.length) return true;
    return names.every((name) => {
      const ctrl = this.form.get(name);
      return !ctrl || ctrl.valid;
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
    this.activeStep.update((s) => Math.min(s + 1, 3));
  }

  prevStep(): void {
    this.activeStep.update((s) => Math.max(s - 1, 0));
  }

  saveDraft(): void {
    this.messageService.add({
      severity: 'info',
      summary: 'غير متاح',
      detail: 'حفظ المسودة غير مدعوم حالياً. استخدم حفظ لإرسال البيانات للخادم.',
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
    const v = this.form.value;

    const toDate = (val: any) => {
      if (!val) return null;
      const d = val instanceof Date ? val : new Date(val);
      return isNaN(d.getTime()) || d.getTime() === 0 ? null : d;
    };

    const existingEmployee = this.employeeId() ? this.employeeService.getByIdSync(this.employeeId()!) : null;
    const natDoc = (existingEmployee?.documents || []).find(
      (d) => (d.documentNumber && d.documentNumber === v.nationalId) ||
        (d.name && d.name === v.nationalId) ||
        d.documentTypeId === NATIONAL_ID_DOCUMENT_TYPE_ID
      ) || (existingEmployee?.documents && existingEmployee.documents.length > 0 ? existingEmployee.documents[0] : null);

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
      expiryDate: natExpiryDate || natDoc?.expiryDate || new Date(Date.now() + 10 * 365 * 24 * 60 * 60 * 1000),
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
      birthDate: v.birthDate ?? new Date(),
      birthPlace: v.birthPlace,
      nationality: v.nationality,
      religion: v.religion,
      maritalStatus: v.maritalStatus,
      phone: v.phone,
      alternatePhone: v.alternatePhone || undefined,
      email: v.email || undefined,
      address: v.address,
      appointmentDate: v.appointmentDate ?? new Date(),
      appointmentDecisionNumber: v.appointmentDecisionNumber,
      appointmentDecisionDate: v.appointmentDecisionDate ?? new Date(),
      jobTitle: this.jobPositionDisplay(v.jobTitle),
      jobGrade: this.jobGradeDisplay(v.jobGrade),
      department: this.organizationUnitDisplay(v.department),
      section: this.organizationUnitDisplay(v.section),
      workLocation: v.workLocation,
      employmentType: v.employmentType,
      status: v.status,
      educationLevel: v.educationLevel,
      educationField: v.educationField,
      graduationYear: Number(v.graduationYear) || new Date().getFullYear(),
      documents: documentsPayload,
    };
    const positionIds = {
      jobPositionId: this.resolveJobPositionId(v.jobTitle || ''),
      organizationUnitId:
        this.resolveOrganizationUnitId(v.section || '', 'section') ||
        this.resolveOrganizationUnitId(v.department || '', 'department'),
      fromDate: this.toIsoDate(toDate(v.appointmentDate) || new Date()),
    };

    const id = this.employeeId();
    if (id && this.isEdit()) {
      this.employeeService.update(id, payload).subscribe({
        next: () => {
          this.afterEmployeeSaved(id, positionIds, 'تم تحديث بيانات الموظف بنجاح');
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
            this.afterEmployeeSaved(newId, positionIds, 'تمت إضافة الموظف بنجاح');
          } else {
            this.saving.set(false);
            this.messageService.add({ severity: 'success', summary: 'تم بنجاح', detail: 'تمت إضافة الموظف بنجاح' });
            this.router.navigate(['/employees']);
          }
        },
        error: () => {
          this.saving.set(false);
        },
      });
    }
  }

  private toIsoDate(d: Date): string {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  }

  private afterEmployeeSaved(
    employeeId: string,
    position: { jobPositionId: string; organizationUnitId: string; fromDate: string },
    successDetail: string
  ): void {
    const finish = () => {
      this.saving.set(false);
      this.messageService.add({ severity: 'success', summary: 'تم بنجاح', detail: successDetail });
      this.router.navigate(['/employees', employeeId]);
    };

    if (!position.jobPositionId || !position.organizationUnitId) {
      finish();
      return;
    }

    this.employeeService
      .setPosition(employeeId, {
        jobPositionId: position.jobPositionId,
        organizationUnitId: position.organizationUnitId,
        fromDate: position.fromDate,
        isPrimary: true,
      })
      .subscribe({
        next: () => finish(),
        error: (err) => {
          this.saving.set(false);
          const detail =
            err?.error?.message ||
            err?.error?.title ||
            err?.message ||
            'تم حفظ الموظف لكن تعذر تعيين الوظيفة';
          this.messageService.add({ severity: 'warn', summary: 'تنبيه', detail });
          this.router.navigate(['/employees', employeeId]);
        },
      });
  }

  onUpload(): void {
    this.messageService.add({
      severity: 'info',
      summary: 'قريباً',
      detail: 'رفع المستندات الإضافية سيتم عبر خدمة الملفات المشتركة.',
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
          summary: 'تم الرفع',
          detail: 'تم رفع ملف البطاقة بنجاح',
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
