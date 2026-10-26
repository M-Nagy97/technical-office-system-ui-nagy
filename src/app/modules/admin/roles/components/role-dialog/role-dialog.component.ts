import { Component, EventEmitter, Input, OnChanges, Output, SimpleChanges, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { TranslatePipe } from '@ngx-translate/core';
import { InputTextModule } from 'primeng/inputtext';
import { InputTextareaModule } from 'primeng/inputtextarea';
import { IdentityRole, RolePayload } from '../../../../../core/api/identity-management-api.service';
import { CrudDialogComponent, FormFieldComponent } from '../../../../../shared';

@Component({
  selector: 'app-role-dialog',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    TranslatePipe,
    InputTextModule,
    InputTextareaModule,
    CrudDialogComponent,
    FormFieldComponent,
  ],
  templateUrl: './role-dialog.component.html',
  styleUrl: './role-dialog.component.scss',
})
export class RoleDialogComponent implements OnChanges {
  private readonly formBuilder = inject(FormBuilder);

  @Input() visible = false;
  @Input() role: IdentityRole | null = null;
  @Input() saving = false;
  @Output() visibleChange = new EventEmitter<boolean>();
  @Output() save = new EventEmitter<RolePayload>();

  readonly form = this.formBuilder.nonNullable.group({
    name: ['', [Validators.required, Validators.maxLength(256)]],
    description: ['', [Validators.maxLength(500)]],
  });

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['role'] || changes['visible']) {
      this.patchForm();
    }
  }

  get isEdit(): boolean {
    return !!this.role?.id;
  }

  submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const value = this.form.getRawValue();
    this.save.emit({
      name: value.name.trim(),
      description: this.toNullable(value.description),
    });
  }

  close(): void {
    this.visibleChange.emit(false);
  }

  isInvalid(controlName: keyof typeof this.form.controls): boolean {
    const control = this.form.controls[controlName];
    return control.invalid && (control.touched || control.dirty);
  }

  private patchForm(): void {
    if (!this.visible) {
      return;
    }

    this.form.reset({
      name: this.role?.name ?? '',
      description: this.role?.description ?? '',
    });
  }

  private toNullable(value: string): string | null {
    const trimmed = value.trim();
    return trimmed ? trimmed : null;
  }
}
