import { Injectable, inject } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import { ConfirmationService } from 'primeng/api';

@Injectable({ providedIn: 'root' })
export class ConfirmService {
  private readonly confirmation = inject(ConfirmationService);
  private readonly translate = inject(TranslateService);

  confirmDelete(name: string | null | undefined, accept: () => void): void {
    this.confirm({
      headerKey: 'common.delete',
      messageKey: name ? 'common.delete_confirm_named' : 'common.delete_confirm',
      messageParams: name ? { name } : undefined,
      accept,
    });
  }

  confirm(options: {
    headerKey?: string;
    messageKey: string;
    messageParams?: Record<string, unknown>;
    accept: () => void;
  }): void {
    this.confirmation.confirm({
      header: this.translate.instant(options.headerKey ?? 'common.delete'),
      message: this.translate.instant(options.messageKey, options.messageParams),
      icon: 'pi pi-exclamation-triangle',
      acceptButtonStyleClass: 'p-button-danger',
      rejectButtonStyleClass: 'p-button-text p-button-secondary',
      accept: options.accept,
    });
  }
}
