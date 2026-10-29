import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { CardModule } from 'primeng/card';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { InputSwitchModule } from 'primeng/inputswitch';
import { MessageService } from 'primeng/api';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { PermissionTypeService } from '../../../../core/services/permission-type.service';

@Component({
  selector: 'app-add-permission-type',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    CardModule,
    ButtonModule,
    InputTextModule,
    InputSwitchModule,
    TranslateModule,
  ],
  templateUrl: './add-permission-type.component.html',
  styleUrl: './add-permission-type.component.scss',
})
export class AddPermissionTypeComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly messageService = inject(MessageService);
  private readonly permissionTypeService = inject(PermissionTypeService);
  private readonly translate = inject(TranslateService);

  readonly isEdit = signal(false);
  readonly editId = signal<string | null>(null);
  readonly saving = signal(false);

  readonly form: FormGroup = this.fb.group({
    arabicName: ['', [Validators.required, Validators.maxLength(100)]],
    name: ['', [Validators.required, Validators.maxLength(100)]],
    isActive: [true],
  });

  ngOnInit(): void {
    this.checkEditMode();
  }

  private checkEditMode(): void {
    const id = this.route.snapshot.queryParamMap.get('id');
    if (id) {
      this.isEdit.set(true);
      this.editId.set(id);
      this.permissionTypeService.getById(id).subscribe({
        next: (data) => {
          if (data) {
            this.form.patchValue({
              arabicName: data.arabicName,
              name: data.name,
              isActive: data.isActive ?? true,
            });
          }
        },
      });
    }
  }

  submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.messageService.add({
        severity: 'warn',
        summary: this.translate.instant('common.warning'),
        detail: this.translate.instant('leave.permission_types.validation_warning'),
      });
      return;
    }

    this.saving.set(true);
    const raw = this.form.getRawValue();
    const payload = {
      arabicName: raw.arabicName,
      name: raw.name,
      isActive: raw.isActive !== undefined ? !!raw.isActive : true,
    };
    const id = this.editId();

    const request$ =
      this.isEdit() && id
        ? this.permissionTypeService.update(id, payload)
        : this.permissionTypeService.create(payload);

    request$.subscribe({
      next: () => {
        this.saving.set(false);
        this.messageService.add({
          severity: 'success',
          summary: this.translate.instant('common.success'),
          detail: this.isEdit()
            ? this.translate.instant('leave.permission_types.save_success_edit')
            : this.translate.instant('leave.permission_types.save_success_add'),
        });
        this.router.navigate(['/leave/permission-types']);
      },
      error: () => {
        this.saving.set(false);
      },
    });
  }

  cancel(): void {
    this.router.navigate(['/leave/permission-types']);
  }
}
