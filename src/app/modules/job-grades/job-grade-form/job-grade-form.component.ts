import { Component, OnInit, signal, inject } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { TranslatePipe } from '@ngx-translate/core';
import { CardModule } from 'primeng/card';
import { InputTextModule } from 'primeng/inputtext';
import { InputNumberModule } from 'primeng/inputnumber';
import { JobGradesService, UpdateJobGradeCommand, CreateJobGradeCommand } from '../../../core/api/generated';
import { FormActionsComponent, FormFieldComponent, NotifyService } from '../../../shared';

@Component({
  selector: 'app-job-grade-form',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    TranslatePipe,
    CardModule,
    InputTextModule,
    InputNumberModule,
    FormFieldComponent,
    FormActionsComponent,
  ],
  templateUrl: './job-grade-form.component.html',
  styleUrl: './job-grade-form.component.scss',
})
export class JobGradeFormComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly jobGradesService = inject(JobGradesService);
  private readonly notify = inject(NotifyService);

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
        error: (error) => this.notify.error(error, 'common.load_error'),
      });
    }
  }

  isInvalid(controlName: string): boolean {
    const control = this.form.get(controlName);
    return !!control && control.invalid && (control.touched || control.dirty);
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
            this.notify.success('common.update_success');
            this.router.navigate(['/job-grades']);
          } else if (res.message) {
            this.notify.errorText(res.message);
          } else {
            this.notify.error(null, 'common.save_error');
          }
        },
        error: (error) => {
          this.saving.set(false);
          this.notify.error(error, 'common.save_error');
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
            this.notify.success('common.create_success');
            this.router.navigate(['/job-grades']);
          } else if (res.message) {
            this.notify.errorText(res.message);
          } else {
            this.notify.error(null, 'common.save_error');
          }
        },
        error: (error) => {
          this.saving.set(false);
          this.notify.error(error, 'common.save_error');
        },
      });
    }
  }
}
