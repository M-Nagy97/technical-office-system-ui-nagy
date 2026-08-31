import { Component, EventEmitter, Input, Output, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DialogModule } from 'primeng/dialog';
import { ButtonModule } from 'primeng/button';
import { InputTextareaModule } from 'primeng/inputtextarea';

export type LeaveActionType = 'approve' | 'reject' | 'cancel';

export interface LeaveActionEvent {
  action: LeaveActionType;
  requestId: string;
  reason?: string;
}

@Component({
  selector: 'app-leave-action-dialog',
  standalone: true,
  imports: [CommonModule, FormsModule, DialogModule, ButtonModule, InputTextareaModule],
  templateUrl: './leave-action-dialog.component.html',
  styleUrl: './leave-action-dialog.component.scss',
})
export class LeaveActionDialogComponent {
  @Input() visible = false;
  @Input() action: LeaveActionType | null = null;
  @Input() requestId = '';
  @Input() loading = false;

  @Output() visibleChange = new EventEmitter<boolean>();
  @Output() confirmed = new EventEmitter<LeaveActionEvent>();
  @Output() cancelled = new EventEmitter<void>();

  readonly reason = signal('');
  readonly reasonTouched = signal(false);

  readonly title = computed(() => {
    switch (this.action) {
      case 'approve':
        return 'الموافقة على الطلب';
      case 'reject':
        return 'رفض الطلب';
      case 'cancel':
        return 'إلغاء الطلب';
      default:
        return 'إجراء الطلب';
    }
  });

  readonly confirmButtonLabel = computed(() => {
    switch (this.action) {
      case 'approve':
        return 'تأكيد الموافقة';
      case 'reject':
        return 'تأكيد الرفض';
      case 'cancel':
        return 'تأكيد الإلغاء';
      default:
        return 'تأكيد';
    }
  });

  readonly confirmButtonClass = computed(() => {
    switch (this.action) {
      case 'approve':
        return 'p-button-success';
      case 'reject':
        return 'p-button-danger';
      case 'cancel':
        return 'p-button-warning';
      default:
        return 'p-button-primary';
    }
  });

  onHide(): void {
    this.reason.set('');
    this.reasonTouched.set(false);
    this.visible = false;
    this.visibleChange.emit(false);
    this.cancelled.emit();
  }

  onConfirm(): void {
    if (this.action === 'reject') {
      this.reasonTouched.set(true);
      if (!this.reason().trim()) {
        return;
      }
    }

    if (!this.action || !this.requestId) return;

    this.confirmed.emit({
      action: this.action,
      requestId: this.requestId,
      reason: this.reason().trim() || undefined,
    });
  }
}
