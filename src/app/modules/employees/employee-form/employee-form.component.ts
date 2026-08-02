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
import { MenuItem } from 'primeng/api';
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
import { Employee } from '../../../core/models/employee.model';

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
    'address',
  ],
  [
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
  [],
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
  ],
  templateUrl: './employee-form.component.html',
  styleUrl: './employee-form.component.scss',
})
export class EmployeeFormComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly employeeService = inject(EmployeeService);
  private readonly jobGradesService = inject(JobGradesService);
  private readonly jobPositionsService = inject(JobPositionsService);
  private readonly organizationUnitsService = inject(OrganizationUnitsService);

  readonly activeStep = signal(0);
  readonly isEdit = signal(false);
  readonly employeeId = signal<string | null>(null);
  readonly isDraft = signal(false);
  /** After a failed save, show errors even if controls were not blurred. */
  readonly submittedAttempt = signal(false);

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
            error: (err) => console.error('Error loading employee', err),
          });
        }
      },
      error: (err) => console.error('Error loading lookups', err),
    });
  }

  private buildForm(): void {
    this.form = this.fb.group({
      // Step 1 - personal
      firstName: ['', [Validators.required, Validators.minLength(2)]],
      secondName: ['', [Validators.required, Validators.minLength(2)]],
      thirdName: ['', Validators.required],
      lastName: ['', [Validators.required, Validators.minLength(2)]],
      nationalId: ['', [Validators.required, Validators.pattern(/^\d{14}$/)]],
      gender: ['male', Validators.required],
      birthDate: [null as Date | null, Validators.required],
      birthPlace: ['', Validators.required],
      nationality: ['مصري', Validators.required],
      religion: ['', Validators.required],
      maritalStatus: ['single', Validators.required],
      phone: ['', [Validators.required, Validators.pattern(/^01[0-2]\d{8}$/)]],
      alternatePhone: [''],
      email: ['', Validators.email],
      address: ['', Validators.required],
      // Step 2 - appointment
      appointmentDate: [null as Date | null, Validators.required],
      appointmentDecisionNumber: ['', Validators.required],
      appointmentDecisionDate: [null as Date | null, Validators.required],
      jobTitle: ['', Validators.required],
      jobGrade: ['', Validators.required],
      department: ['', Validators.required],
      section: ['', Validators.required],
      workLocation: ['', Validators.required],
      employmentType: ['permanent', Validators.required],
      status: ['active', Validators.required],
      // Step 3 - qualifications
      educationLevel: ['', Validators.required],
      educationField: ['', Validators.required],
      graduationYear: [null as number | null, [Validators.required, Validators.min(1950), Validators.max(new Date().getFullYear())]],
      // Step 4 - documents (handled separately; form just for notes if needed)
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
    const first = this.form.get('firstName')?.value ?? '';
    const second = this.form.get('secondName')?.value ?? '';
    const third = this.form.get('thirdName')?.value ?? '';
    const last = this.form.get('lastName')?.value ?? '';
    this.form.patchValue({ fullName: `${first} ${second} ${third} ${last}`.trim() }, { emitEvent: false });
  }

  private patchForm(emp: Employee): void {
    this.rebuildDepartmentOptions();
    this.syncSectionOptions();
    this.form.patchValue({
      firstName: emp.firstName,
      secondName: emp.secondName,
      thirdName: emp.thirdName,
      lastName: emp.lastName,
      fullName: emp.fullName,
      nationalId: emp.nationalId,
      gender: emp.gender,
      birthDate: emp.birthDate,
      birthPlace: emp.birthPlace,
      nationality: emp.nationality || 'مصري',
      religion: emp.religion,
      maritalStatus: emp.maritalStatus,
      phone: emp.phone,
      alternatePhone: emp.alternatePhone ?? '',
      email: emp.email ?? '',
      address: emp.address,
      appointmentDate: emp.appointmentDate,
      appointmentDecisionNumber: emp.appointmentDecisionNumber,
      appointmentDecisionDate: emp.appointmentDecisionDate,
      jobTitle: this.resolveJobPositionId(emp.jobTitle),
      jobGrade: this.resolveJobGradeId(emp.jobGrade),
      department: this.resolveOrganizationUnitId(emp.department, 'department'),
      section: this.resolveOrganizationUnitId(emp.section, 'section'),
      workLocation: emp.workLocation,
      employmentType: emp.employmentType,
      status: emp.status,
      educationLevel: emp.educationLevel,
      educationField: emp.educationField,
      graduationYear: emp.graduationYear,
    });
    this.syncSectionOptions();
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
    this.isDraft.set(true);
    this.submit();
  }

  submit(): void {
    if (this.form.invalid && !this.isDraft()) {
      this.submittedAttempt.set(true);
      this.form.markAllAsTouched();
      const step = this.firstInvalidStep();
      if (step != null) this.activeStep.set(step);
      return;
    }
    this.submittedAttempt.set(false);
    this.updateFullName();
    const v = this.form.value;
    const payload = {
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
      documents: [],
    };
    const id = this.employeeId();
    if (id && this.isEdit()) {
      this.employeeService.update(id, payload).subscribe({
        next: () => this.router.navigate(['/employees', id]),
        error: (err) => console.error('Error updating employee', err)
      });
    } else {
      this.employeeService.create(payload).subscribe({
        next: (response) => {
          // If the API returns the created object with ID, we use it, otherwise use local ID
          const newId = response?.id || id;
          this.router.navigate(['/employees', newId]);
        },
        error: (err) => console.error('Error creating employee', err)
      });
    }
  }

  onUpload(): void {
    // Placeholder: in real app would push to documents array
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
