import { Injectable, inject } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import { MessageService } from 'primeng/api';
import { extractErrorMessage } from '../utils/extract-error-message';

@Injectable({ providedIn: 'root' })
export class NotifyService {
  private readonly messages = inject(MessageService);
  private readonly translate = inject(TranslateService);

  success(detailKey: string, params?: Record<string, unknown>): void {
    this.messages.add({
      severity: 'success',
      summary: this.translate.instant('common.success'),
      detail: this.translate.instant(detailKey, params),
    });
  }

  warn(detailKey: string, params?: Record<string, unknown>): void {
    this.messages.add({
      severity: 'warn',
      summary: this.translate.instant('common.warning'),
      detail: this.translate.instant(detailKey, params),
    });
  }

  error(error: unknown, fallbackKey: string, params?: Record<string, unknown>): void {
    this.messages.add({
      severity: 'error',
      summary: this.translate.instant('common.error'),
      detail: extractErrorMessage(error, this.translate.instant(fallbackKey, params)),
    });
  }

  errorText(detail: string): void {
    this.messages.add({
      severity: 'error',
      summary: this.translate.instant('common.error'),
      detail,
    });
  }

  warnText(detail: string): void {
    this.messages.add({
      severity: 'warn',
      summary: this.translate.instant('common.warning'),
      detail,
    });
  }
}
