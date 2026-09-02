import { Component, EventEmitter, Input, Output, signal, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DialogModule } from 'primeng/dialog';
import { ButtonModule } from 'primeng/button';
import { InputTextareaModule } from 'primeng/inputtextarea';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { LanguageService } from '../../../core/services';

export type PermissionActionType = 'approve' | 'reject' | 'cancel';

export interface PermissionActionEvent {
  action: PermissionActionType;
  requestId: string;
  reason?: string;
}

@Component({
  selector: 'app-permission-action-dialog',
  standalone: true,
  imports: [CommonModule, FormsModule, DialogModule, ButtonModule, InputTextareaModule, TranslateModule],
  templateUrl: './permission-action-dialog.component.html',
  styleUrl: './permission-action-dialog.component.scss',
})
export class PermissionActionDialogComponent {
  private readonly translate = inject(TranslateService);
  readonly languageService = inject(LanguageService);

  @Input() visible = false;
  @Input() action: PermissionActionType | null = null;
  @Input() requestId = '';
  @Input() loading = false;
  @Input() warningAlerts?: string | null = null;
  @Input() warningAlertsAr?: string | null = null;

  @Output() visibleChange = new EventEmitter<boolean>();
  @Output() confirmed = new EventEmitter<PermissionActionEvent>();
  @Output() cancelled = new EventEmitter<void>();

  readonly reason = signal('');
  readonly reasonTouched = signal(false);

  readonly displayWarnings = computed(() => {
    if (this.languageService.currentLang() === 'ar') {
      return this.warningAlertsAr || this.warningAlerts || null;
    }
    return this.warningAlerts || this.warningAlertsAr || null;
  });

  readonly title = computed(() => {
    switch (this.action) {
      case 'approve':
        return this.translate.instant('leave.actions.title_approve_perm');
      case 'reject':
        return this.translate.instant('leave.actions.title_reject_perm');
      case 'cancel':
        return this.translate.instant('leave.actions.title_cancel_perm');
      default:
        return this.translate.instant('leave.actions.title_action');
    }
  });

  readonly confirmButtonLabel = computed(() => {
    switch (this.action) {
      case 'approve':
        return this.translate.instant('leave.actions.confirm_approve');
      case 'reject':
        return this.translate.instant('leave.actions.confirm_reject');
      case 'cancel':
        return this.translate.instant('leave.actions.confirm_cancel');
      default:
        return this.translate.instant('leave.actions.confirm');
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

