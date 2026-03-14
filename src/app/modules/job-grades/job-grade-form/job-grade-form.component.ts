import { Component, OnInit, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { CardModule } from 'primeng/card';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { InputNumberModule } from 'primeng/inputnumber';
import { MessageModule } from 'primeng/message';

import { MessageService } from 'primeng/api';
import { JobGradesService, UpdateJobGradeCommand, CreateJobGradeCommand } from '../../../core/api/generated';

@Component({
  selector: 'app-job-grade-form',
  standalone: true,
  imports: [
    CommonModule,
    RouterLink,
    ReactiveFormsModule,
    CardModule,
    ButtonModule,
    InputTextModule,
    InputNumberModule,
    MessageModule,
  ],
  templateUrl: './job-grade-form.component.html',
  styleUrl: './job-grade-form.component.scss',
})
export class JobGradeFormComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly jobGradesService = inject(JobGradesService);
  private readonly messageService = inject(MessageService);

  readonly isEdit = signal(false);
  readonly id = signal<string | null>(null);
  readonly saving = signal(false);
  form!: FormGroup;

  ngOnInit(): void {
    this.form = this.fb.group({
      code: ['', [Validators.required, Validators.maxLength(50)]],
      name: ['', [Validators.required, Validators.maxLength(200)]],
      rank: [null as number | null, [Validators.required, Validators.min(0)]],
    });

    const routeId = this.route.snapshot.paramMap.get('id');
    if (routeId && routeId !== 'add') {
      this.id.set(routeId);
      this.isEdit.set(true);
      this.form.get('code')?.clearValidators();
      this.form.get('code')?.updateValueAndValidity();
      this.jobGradesService.jobGradesGetById(routeId).subscribe({
        next: (res) => {
          if (res.success && res.data) {
            const d = res.data;
            this.form.patchValue({
              code: d.code ?? '',
              name: d.name ?? '',
              rank: d.rank ?? null,
            });
          }
        },
        error: () => {
          this.messageService.add({
            severity: 'error',
            summary: 'خطأ',
            detail: 'فشل تحميل الدرجة الوظيفية',
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
      const cmd: UpdateJobGradeCommand = {
        id,
        name: this.form.value.name ?? null,
        rank: this.form.value.rank ?? undefined,
      };
      this.jobGradesService.jobGradesUpdate(id, cmd).subscribe({
        next: (res) => {
          this.saving.set(false);
          if (res.success) {
            this.messageService.add({
              severity: 'success',
              summary: 'تم',
              detail: 'تم تحديث الدرجة الوظيفية',
            });
            this.router.navigate(['/job-grades']);
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
      const cmd: CreateJobGradeCommand = {
        code: this.form.value.code ?? null,
        name: this.form.value.name ?? null,
        rank: this.form.value.rank ?? undefined,
      };
      this.jobGradesService.jobGradesCreate(cmd).subscribe({
        next: (res) => {
          this.saving.set(false);
          if (res.success && res.data) {
            this.messageService.add({
              severity: 'success',
              summary: 'تم',
              detail: 'تم إضافة الدرجة الوظيفية',
            });
            this.router.navigate(['/job-grades']);
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
