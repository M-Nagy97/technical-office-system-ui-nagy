import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { CardModule } from 'primeng/card';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { InputNumberModule } from 'primeng/inputnumber';
import { InputSwitchModule } from 'primeng/inputswitch';
import { InputTextareaModule } from 'primeng/inputtextarea';
import { MessageService } from 'primeng/api';
import { LeaveTypeService } from '../../../core';

@Component({
  selector: 'app-add-leave-type',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    CardModule,
    ButtonModule,
    InputTextModule,
    InputNumberModule,
    InputSwitchModule,
    InputTextareaModule,
  ],
  templateUrl: './add-leave-type.component.html',
  styleUrl: './add-leave-type.component.scss',
})
export class AddLeaveTypeComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly messageService = inject(MessageService);
  private readonly leaveTypeService = inject(LeaveTypeService);

  readonly isEdit = signal(false);
  readonly editId = signal<string | null>(null);
  readonly saving = signal(false);
  form!: FormGroup;

  ngOnInit(): void {
    this.initForm();
    this.checkEditMode();
  }

  private initForm(): void {
    this.form = this.fb.group({
      arabicName: ['', [Validators.required, Validators.maxLength(100)]],
      name: ['', [Validators.required, Validators.maxLength(100)]],
      isUnlimitedDays: [false],
      maxDaysPerYear: [30, [Validators.required, Validators.min(1)]],
      isPaid: [true],
      requiresDocument: [false],
      isActive: [true],
    });

    this.form.get('isUnlimitedDays')?.valueChanges.subscribe((isUnlimited) => {
      const maxDaysCtrl = this.form.get('maxDaysPerYear');
      if (isUnlimited) {
        maxDaysCtrl?.clearValidators();
        maxDaysCtrl?.setValue(null);
        maxDaysCtrl?.disable();
      } else {
        maxDaysCtrl?.setValidators([Validators.required, Validators.min(1)]);
        if (maxDaysCtrl?.value == null) {
          maxDaysCtrl?.setValue(30);
        }
        maxDaysCtrl?.enable();
      }
      maxDaysCtrl?.updateValueAndValidity();
    });
  }

  private checkEditMode(): void {
    const id = this.route.snapshot.queryParamMap.get('id');
    if (id) {
      this.isEdit.set(true);
      this.editId.set(id);
      this.leaveTypeService.getById(id).subscribe({
        next: (data) => {
          if (data) {
            const isUnlimited = data.maxDaysPerYear == null;
            this.form.patchValue({
              arabicName: data.arabicName,
              name: data.name,
              isUnlimitedDays: isUnlimited,
              maxDaysPerYear: data.maxDaysPerYear,
              isPaid: data.isPaid ?? true,
              requiresDocument: data.requiresDocument ?? false,
              isActive: data.isActive ?? true,
            });
            if (isUnlimited) {
              this.form.get('maxDaysPerYear')?.disable();
            }
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
        summary: 'تنبيه',
        detail: 'يرجى ملء جميع الحقول المطلوبة بشكل صحيح',
      });
      return;
    }

    this.saving.set(true);
    const raw = this.form.getRawValue();
    const payload = {
      arabicName: raw.arabicName,
      name: raw.name,
      maxDaysPerYear: raw.isUnlimitedDays ? null : Number(raw.maxDaysPerYear),
      isPaid: !!raw.isPaid,
      requiresDocument: !!raw.requiresDocument,
      isActive: raw.isActive !== undefined ? !!raw.isActive : true,
    };
    const id = this.editId();

    const request$ =
      this.isEdit() && id
        ? this.leaveTypeService.update(id, payload)
        : this.leaveTypeService.create(payload);

    request$.subscribe({
      next: () => {
        this.saving.set(false);
        this.messageService.add({
          severity: 'success',
          summary: 'نجاح',
          detail: this.isEdit() ? 'تم تحديث نوع الإجازة بنجاح' : 'تمت إضافة نوع الإجازة بنجاح',
        });
        this.router.navigate(['/leave/types']);
      },
      error: () => {
        this.saving.set(false);
        this.messageService.add({
          severity: 'error',
          summary: 'خطأ',
          detail: 'حدث خطأ أثناء حفظ نوع الإجازة في الخادم',
        });
      },
    });
  }

  cancel(): void {
    this.router.navigate(['/leave/types']);
  }
}
