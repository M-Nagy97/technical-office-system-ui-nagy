import { Component, OnInit, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { CardModule } from 'primeng/card';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { InputTextareaModule } from 'primeng/inputtextarea';
import { DropdownModule } from 'primeng/dropdown';
import { MessageModule } from 'primeng/message';
import { MessageService } from 'primeng/api';
import { JobPositionsService, JobGradesService, JobGradeDto, UpdateJobPositionCommand, CreateJobPositionCommand } from '../../../core/api/generated';

@Component({
  selector: 'app-job-position-form',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    CardModule,
    ButtonModule,
    InputTextModule,
    InputTextareaModule,
    DropdownModule,
    MessageModule,
  ],
  templateUrl: './job-position-form.component.html',
  styleUrl: './job-position-form.component.scss',
})
export class JobPositionFormComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly jobPositionsService = inject(JobPositionsService);
  private readonly jobGradesService = inject(JobGradesService);
  private readonly messageService = inject(MessageService);

  readonly isEdit = signal(false);
  readonly id = signal<string | null>(null);
  readonly saving = signal(false);
  readonly gradeOptions = signal<{ label: string; value: string }[]>([]);
  form!: FormGroup;

  ngOnInit(): void {
    this.form = this.fb.group({
      companyId: [null as string | null],
      jobGradeId: [null as string | null, Validators.required],
      code: ['', [Validators.required, Validators.maxLength(50)]],
      name: ['', [Validators.required, Validators.maxLength(200)]],
      description: ['', Validators.maxLength(500)],
    });

    this.jobGradesService.jobGradesGetAll().subscribe({
      next: (res) => {
        if (res.success && res.data) {
          const options = (res.data as JobGradeDto[]).map((g) => ({
            label: `${g.name ?? g.code ?? g.id}`,
            value: g.id!,
          }));
          this.gradeOptions.set(options);
        }
      },
    });

    const routeId = this.route.snapshot.paramMap.get('id');
    if (routeId && routeId !== 'add') {
      this.id.set(routeId);
      this.isEdit.set(true);
      this.form.get('code')?.clearValidators();
      this.form.get('code')?.updateValueAndValidity();
      this.jobPositionsService.jobPositionsGetById(routeId).subscribe({
        next: (res) => {
          if (res.success && res.data) {
            const d = res.data;
            this.form.patchValue({
              companyId: d.companyId ?? null,
              jobGradeId: d.jobGradeId ?? null,
              code: d.code ?? '',
              name: d.name ?? '',
              description: d.description ?? '',
            });
          }
        },
        error: () => {
          this.messageService.add({
            severity: 'error',
            summary: 'خطأ',
            detail: 'فشل تحميل المسمى الوظيفي',
          });
        },
      });
    }
  }

  submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const id = this.id();
    const isEdit = this.isEdit();
    this.saving.set(true);

    if (isEdit && id) {
      const cmd: UpdateJobPositionCommand = {
        id,
        jobGradeId: this.form.value.jobGradeId ?? null,
        name: this.form.value.name ?? null,
        description: this.form.value.description || null,
      };
      this.jobPositionsService.jobPositionsUpdate(id, cmd).subscribe({
        next: (res) => {
          this.saving.set(false);
          if (res.success) {
            this.messageService.add({
              severity: 'success',
              summary: 'تم',
              detail: 'تم تحديث المسمى الوظيفي',
            });
            this.router.navigate(['/job-positions']);
          } else {
            this.messageService.add({
              severity: 'error',
              summary: 'خطأ',
              detail: res.message ?? 'فشل التحديث',
            });
          }
        },
        error: () => {
          this.saving.set(false);
          this.messageService.add({
            severity: 'error',
            summary: 'خطأ',
            detail: 'حدث خطأ أثناء التحديث',
          });
        },
      });
    } else {
      const cmd: CreateJobPositionCommand = {
        companyId: this.form.value.companyId ?? null,
        jobGradeId: this.form.value.jobGradeId ?? null,
        code: this.form.value.code ?? null,
        name: this.form.value.name ?? null,
        description: this.form.value.description || null,
      };
      this.jobPositionsService.jobPositionsCreate(cmd).subscribe({
        next: (res) => {
          this.saving.set(false);
          if (res.success) {
            this.messageService.add({
              severity: 'success',
              summary: 'تم',
              detail: 'تم إضافة المسمى الوظيفي',
            });
            this.router.navigate(['/job-positions']);
          } else {
            this.messageService.add({
              severity: 'error',
              summary: 'خطأ',
              detail: res.message ?? 'فشل الإضافة',
            });
          }
        },
        error: () => {
          this.saving.set(false);
          this.messageService.add({
            severity: 'error',
            summary: 'خطأ',
            detail: 'حدث خطأ أثناء الإضافة',
          });
        },
      });
    }
  }
}
