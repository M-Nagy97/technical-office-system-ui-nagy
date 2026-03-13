import { Component, OnInit, signal, computed, inject } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import {
  FormBuilder,
  FormGroup,
  Validators,
  ReactiveFormsModule,
  AbstractControl,
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
import { EmployeeService } from '../../../core/services/employee.service';
import { Employee } from '../../../core/models/employee.model';

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

  readonly activeStep = signal(0);
  readonly isEdit = signal(false);
  readonly employeeId = signal<string | null>(null);
  readonly isDraft = signal(false);

  readonly stepItems: MenuItem[] = [
    { label: 'البيانات الشخصية' },
    { label: 'بيانات التعيين' },
    { label: 'المؤهلات والخبرات' },
    { label: 'المستندات' },
  ];

  form!: FormGroup;

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

  constructor() {
    this.buildForm();
  }

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (id && id !== 'add') {
      this.employeeId.set(id);
      this.isEdit.set(true);
      this.employeeService.getById(id).subscribe({
        next: (emp) => {
          if (emp) this.patchForm(emp);
        },
        error: (err) => {
          console.error('Error loading employee', err);
        }
      });
    }
  }

  private buildForm(): void {
    const today = new Date();
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
  }

  private updateFullName(): void {
    const first = this.form.get('firstName')?.value ?? '';
    const second = this.form.get('secondName')?.value ?? '';
    const third = this.form.get('thirdName')?.value ?? '';
    const last = this.form.get('lastName')?.value ?? '';
    this.form.patchValue({ fullName: `${first} ${second} ${third} ${last}`.trim() }, { emitEvent: false });
  }

  private patchForm(emp: Employee): void {
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
      nationality: emp.nationality,
      religion: emp.religion,
      maritalStatus: emp.maritalStatus,
      phone: emp.phone,
      alternatePhone: emp.alternatePhone ?? '',
      email: emp.email ?? '',
      address: emp.address,
      appointmentDate: emp.appointmentDate,
      appointmentDecisionNumber: emp.appointmentDecisionNumber,
      appointmentDecisionDate: emp.appointmentDecisionDate,
      jobTitle: emp.jobTitle,
      jobGrade: emp.jobGrade,
      department: emp.department,
      section: emp.section,
      workLocation: emp.workLocation,
      employmentType: emp.employmentType,
      status: emp.status,
      educationLevel: emp.educationLevel,
      educationField: emp.educationField,
      graduationYear: emp.graduationYear,
    });
  }

  getError(controlName: string): string | null {
    const c = this.form.get(controlName);
    if (!c || !c.errors || !c.touched) return null;
    const key = Object.keys(c.errors)[0];
    return ARABIC_ERRORS[key] ?? 'قيمة غير صحيحة';
  }

  stepValid(step: number): boolean {
    const groups: string[][] = [
      ['firstName', 'secondName', 'thirdName', 'lastName', 'nationalId', 'gender', 'birthDate', 'birthPlace', 'nationality', 'religion', 'maritalStatus', 'phone', 'address'],
      ['appointmentDate', 'appointmentDecisionNumber', 'appointmentDecisionDate', 'jobTitle', 'jobGrade', 'department', 'section', 'workLocation', 'employmentType', 'status'],
      ['educationLevel', 'educationField', 'graduationYear'],
      [],
    ];
    const names = groups[step];
    if (!names.length) return true;
    return names.every((name) => {
      const c = this.form.get(name);
      return !c || !c.invalid || !c.touched;
    });
  }

  nextStep(): void {
    const step = this.activeStep();
    if (!this.stepValid(step)) {
      const groups: string[][] = [
        ['firstName', 'secondName', 'thirdName', 'lastName', 'nationalId', 'gender', 'birthDate', 'birthPlace', 'nationality', 'religion', 'maritalStatus', 'phone', 'address'],
        ['appointmentDate', 'appointmentDecisionNumber', 'appointmentDecisionDate', 'jobTitle', 'jobGrade', 'department', 'section', 'workLocation', 'employmentType', 'status'],
        ['educationLevel', 'educationField', 'graduationYear'],
        [],
      ];
      groups[step].forEach((name) => this.form.get(name)?.markAllAsTouched());
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
      this.form.markAllAsTouched();
      return;
    }
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
      jobTitle: v.jobTitle,
      jobGrade: v.jobGrade,
      department: v.department,
      section: v.section,
      workLocation: v.workLocation,
      employmentType: v.employmentType,
      status: v.status,
      educationLevel: v.educationLevel,
      educationField: v.educationField,
      graduationYear: v.graduationYear ?? new Date().getFullYear(),
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
}
