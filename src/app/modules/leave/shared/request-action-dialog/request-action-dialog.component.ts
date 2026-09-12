import { Component, EventEmitter, Input, Output, signal, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DialogModule } from 'primeng/dialog';
import { ButtonModule } from 'primeng/button';
import { InputTextareaModule } from 'primeng/inputtextarea';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { LanguageService } from '../../../../core/services';

export type RequestActionType = 'approve' | 'reject' | 'cancel';

export interface RequestActionEvent {
  action: RequestActionType;
  requestId: string;
  reason?: string;
}

/** Discriminator for leave vs permission i18n key suffixes under `leave.actions.*`. */
export type RequestActionI18nVariant = 'leave' | 'perm';

@Component({
  selector: 'app-request-action-dialog',
  standalone: true,
  imports: [CommonModule, FormsModule, DialogModule, ButtonModule, InputTextareaModule, TranslateModule],
  templateUrl: './request-action-dialog.component.html',
  styleUrl: './request-action-dialog.component.scss',
})
export class RequestActionDialogComponent {
  private readonly translate = inject(TranslateService);
  readonly languageService = inject(LanguageService);

  /** i18n key variant: `leave` → title_approve_leave; `perm` → title_approve_perm */
  @Input() i18nVariant: RequestActionI18nVariant = 'leave';

  @Input() visible = false;
  @Input() action: RequestActionType | null = null;
  @Input() requestId = '';
  @Input() loading = false;
  @Input() warningAlerts?: string | null = null;
  @Input() warningAlertsAr?: string | null = null;

  @Output() visibleChange = new EventEmitter<boolean>();
  @Output() confirmed = new EventEmitter<RequestActionEvent>();
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
        return this.translate.instant(`leave.actions.title_approve_${this.i18nVariant}`);
      case 'reject':
        return this.translate.instant(`leave.actions.title_reject_${this.i18nVariant}`);
      case 'cancel':
        return this.translate.instant(`leave.actions.title_cancel_${this.i18nVariant}`);
      default:
        return this.translate.instant('leave.actions.title_action');
    }
  });

  readonly confirmMessageKey = computed(() => {
    if (this.action === 'approve') {
      return `leave.actions.approve_${this.i18nVariant}_confirm`;
    }
    if (this.action === 'reject') {
      return this.i18nVariant === 'leave'
        ? 'leave.actions.reject_prompt'
        : 'leave.actions.reject_perm_prompt';
    }
    if (this.action === 'cancel') {
      return this.i18nVariant === 'leave'
        ? 'leave.actions.cancel_confirm'
        : 'leave.actions.cancel_perm_confirm';
    }
    return '';
  });

  readonly approveSubKey = computed(() =>
    this.i18nVariant === 'leave'
      ? 'leave.actions.approve_leave_sub'
      : 'leave.actions.approve_perm_sub'
  );

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
