import { Component, effect, inject, input, output } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { InputNumberModule } from 'primeng/inputnumber';
import { ToggleButtonModule } from 'primeng/togglebutton';
import { DialogModule } from 'primeng/dialog';
import { NgIf } from '@angular/common';
import { Device, DeviceFormData } from '../models/device.model';

const IPV4_PATTERN = /^(\d{1,3}\.){3}\d{1,3}$/;

@Component({
  selector: 'app-device-form',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    ButtonModule,
    InputTextModule,
    InputNumberModule,
    ToggleButtonModule,
    DialogModule,
    NgIf,
  ],
  templateUrl: './device-form.component.html',
  styleUrl: './device-form.component.scss',
})
export class DeviceFormComponent {
  private readonly fb = inject(FormBuilder);

  readonly visible = input<boolean>(false);
  readonly device = input<Device | null>(null);
  readonly saved = output<DeviceFormData>();
  readonly cancelled = output<void>();

  readonly form = this.fb.group({
    deviceName:   ['', [Validators.required, Validators.maxLength(100)]],
    deviceIp:     ['', [Validators.required, Validators.pattern(IPV4_PATTERN)]],
    port:         [4370, [Validators.required, Validators.min(1), Validators.max(65535)]],
    commPassword: [0, [Validators.min(0), Validators.max(999999)]],
    location:     [''],
    isActive:     [true],
  });

  get isEdit(): boolean {
    return !!this.device();
  }

  constructor() {
    effect(() => {
      if (!this.visible()) return;
      this.patchForm(this.device());
    });
  }

  private patchForm(dev: Device | null): void {
    if (dev) {
      this.form.reset({
        deviceName:   dev.deviceName ?? '',
        deviceIp:     dev.deviceIp ?? '',
        port:         dev.port ?? 4370,
        commPassword: dev.commPassword ?? 0,
        location:     dev.location ?? '',
        isActive:     dev.isActive ?? true,
      });
    } else {
      this.form.reset({
        deviceName:   '',
        deviceIp:     '',
        port:         4370,
        commPassword: 0,
        location:     '',
        isActive:     true,
      });
    }
  }

  onSave(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.saved.emit(this.form.getRawValue() as DeviceFormData);
  }

  onCancel(): void {
    this.cancelled.emit();
  }

  fieldInvalid(name: string): boolean {
    const ctrl = this.form.get(name);
    return !!(ctrl?.invalid && ctrl?.touched);
  }
}
