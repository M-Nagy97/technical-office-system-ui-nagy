import { Component, OnInit, inject, signal } from '@angular/core';
import { Observable } from 'rxjs';
import { NgClass, NgFor, NgIf, DatePipe } from '@angular/common';
import { ButtonModule } from 'primeng/button';
import { CardModule } from 'primeng/card';
import { TagModule } from 'primeng/tag';
import { ToastModule } from 'primeng/toast';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { DialogModule } from 'primeng/dialog';
import { TableModule } from 'primeng/table';
import { TooltipModule } from 'primeng/tooltip';
import { MessageService, ConfirmationService } from 'primeng/api';
import { DeviceService } from './services/device.service';
import { DeviceFormComponent } from './device-form/device-form.component';
import { Device, DeviceFormData, DeviceLogPreview, ReadLogsResult } from './models/device.model';

@Component({
  selector: 'app-devices',
  standalone: true,
  imports: [
    NgFor, NgIf, NgClass, DatePipe,
    ButtonModule, CardModule, TagModule,
    ToastModule, ConfirmDialogModule, DialogModule, TableModule, TooltipModule,
    DeviceFormComponent,
  ],
  providers: [MessageService, ConfirmationService],
  templateUrl: './devices.component.html',
  styleUrl: './devices.component.scss',
})
export class DevicesComponent implements OnInit {
  private readonly deviceService = inject(DeviceService);
  private readonly messageService = inject(MessageService);
  private readonly confirmService = inject(ConfirmationService);

  readonly devices         = signal<Device[]>([]);
  readonly loading         = signal(false);
  readonly formVisible     = signal(false);
  readonly selectedDevice  = signal<Device | null>(null);
  readonly testingId       = signal<string | null>(null);
  readonly syncingId       = signal<string | null>(null);

  readonly readingId       = signal<string | null>(null);
  readonly previewDevice   = signal<Device | null>(null);
  readonly previewLogs     = signal<DeviceLogPreview[]>([]);
  readonly previewVisible  = signal(false);
  readonly previewError    = signal<string | null>(null);

  ngOnInit(): void {
    this.loadDevices();
  }

  loadDevices(): void {
    this.loading.set(true);
    this.deviceService.getAll().subscribe({
      next: (list) => { this.devices.set(list); this.loading.set(false); },
      error: () => this.loading.set(false),
    });
  }

  openAddForm(): void {
    this.selectedDevice.set(null);
    this.formVisible.set(true);
  }

  openEditForm(device: Device): void {
    this.selectedDevice.set(device);
    this.formVisible.set(true);
  }

  closeForm(): void {
    this.formVisible.set(false);
    this.selectedDevice.set(null);
  }

  onFormSaved(data: DeviceFormData): void {
    const dev = this.selectedDevice();
    const obs$: Observable<unknown> = dev
      ? this.deviceService.update(dev.id, data)
      : this.deviceService.create(data);

    obs$.subscribe({
      next: () => {
        this.messageService.add({ severity: 'success', summary: 'تم', detail: dev ? 'تم تعديل الجهاز' : 'تمت إضافة الجهاز' });
        this.closeForm();
        this.loadDevices();
      },
      error: () => {
        this.messageService.add({ severity: 'error', summary: 'خطأ', detail: 'فشلت العملية' });
      },
    });
  }

  confirmDelete(device: Device): void {
    this.confirmService.confirm({
      message: `هل تريد حذف الجهاز "${device.deviceName}"؟`,
      header: 'تأكيد الحذف',
      icon: 'pi pi-trash',
      acceptLabel: 'حذف',
      rejectLabel: 'إلغاء',
      acceptButtonStyleClass: 'p-button-danger',
      accept: () => this.deleteDevice(device.id),
    });
  }

  private deleteDevice(id: string): void {
    this.deviceService.delete(id).subscribe({
      next: () => {
        this.messageService.add({ severity: 'success', summary: 'تم', detail: 'تم حذف الجهاز' });
        this.devices.update((list) => list.filter((d) => d.id !== id));
      },
      error: () => this.messageService.add({ severity: 'error', summary: 'خطأ', detail: 'فشل الحذف' }),
    });
  }

  testConnection(device: Device): void {
    this.testingId.set(device.id);
    this.deviceService.testConnection(device.id).subscribe({
      next: (result) => {
        this.testingId.set(null);
        this.updateDeviceStatus(device.id, result.success ? 'Connected' : 'Failed');
        if (result.success) {
          this.messageService.add({
            severity: result.errorMessage ? 'warn' : 'success',
            summary: result.errorMessage ? 'الشبكة متاحة' : 'نجح الاختبار',
            detail: result.errorMessage
              ?? `${result.deviceInfo?.model ?? 'ZKT K14 Pro'} — استخدم «سحب من الجهاز»`,
            life: 10000,
          });
        } else {
          this.messageService.add({
            severity: 'error',
            summary: 'فشل الاتصال',
            detail: result.errorMessage ?? 'تعذّر الوصول للجهاز',
          });
        }
      },
      error: () => {
        this.testingId.set(null);
        this.messageService.add({ severity: 'error', summary: 'خطأ', detail: 'تعذّر الاتصال بالجهاز' });
      },
    });
  }

  syncFromDevice(device: Device): void {
    this.syncingId.set(device.id);
    this.deviceService.syncFromDevice(device.id).subscribe({
      next: (result) => {
        this.syncingId.set(null);
        this.loadDevices();
        this.messageService.add({
          severity: result.success ? 'success' : 'warn',
          summary: result.success ? 'تم السحب' : 'تنبيه',
          detail: result.message,
          life: 12000,
        });
        this.readData(device);
      },
      error: () => {
        this.syncingId.set(null);
        this.messageService.add({
          severity: 'error',
          summary: 'فشل السحب',
          detail: 'تعذّر الاتصال بالجهاز أو بالخادم',
        });
      },
    });
  }

  readData(device: Device): void {
    this.readingId.set(device.id);
    this.previewError.set(null);
    this.deviceService.readLogs(device.id).subscribe({
      next: (result: ReadLogsResult) => {
        this.readingId.set(null);
        if (!result.success) {
          this.messageService.add({
            severity: 'error',
            summary: 'فشل القراءة',
            detail: result.errorMessage ?? 'تعذّر قراءة البيانات',
          });
          return;
        }
        this.previewDevice.set(device);
        this.previewLogs.set(result.logs);
        this.previewError.set(result.errorMessage ?? null);
        this.previewVisible.set(true);
      },
      error: () => {
        this.readingId.set(null);
        this.messageService.add({ severity: 'error', summary: 'خطأ', detail: 'تعذّر قراءة البيانات' });
      },
    });
  }

  closePreview(): void {
    this.previewVisible.set(false);
    this.previewLogs.set([]);
    this.previewDevice.set(null);
  }

  private updateDeviceStatus(id: string, status: 'Connected' | 'Failed' | 'Unknown'): void {
    this.devices.update((list) =>
      list.map((d) => d.id === id ? { ...d, lastStatus: status } : d)
    );
  }

  statusSeverity(status?: string): 'success' | 'danger' | 'secondary' {
    return status === 'Connected' ? 'success' : status === 'Failed' ? 'danger' : 'secondary';
  }

  statusLabel(status?: string): string {
    return status === 'Connected' ? 'متصل' : status === 'Failed' ? 'فشل' : 'غير معروف';
  }

  relativeTime(dateStr?: string): string {
    if (!dateStr) return 'لم تتم بعد';
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'الآن';
    if (mins < 60) return `منذ ${mins} دقيقة`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `منذ ${hrs} ساعة`;
    return `منذ ${Math.floor(hrs / 24)} يوم`;
  }

  previewMatchedCount(): number {
    return this.previewLogs().filter((l) => l.employeeFound).length;
  }

  previewUnmatchedCount(): number {
    return this.previewLogs().filter((l) => !l.employeeFound).length;
  }
}
