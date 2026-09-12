import { Injectable, inject, signal } from '@angular/core';
import { Observable } from 'rxjs';
import { MessageService } from 'primeng/api';
import { TranslateService } from '@ngx-translate/core';
import { LanguageService } from '../../../core/services';
import {
  PolicyEvaluationIssueDto,
  PolicyEvaluationResultDto,
} from '../../../core/models/policy-evaluation.model';
import { PolicyEvaluationDialogMode } from './policy-evaluation-dialog/policy-evaluation-dialog.component';

export interface EvaluateSubmitOptions<TCommand> {
  evaluate: (command: TCommand) => Observable<PolicyEvaluationResultDto>;
  submit: (command: TCommand) => Observable<unknown>;
  onSuccess: () => void;
}

/**
 * Shared evaluate → policy dialog → submit flow for leave/permission request forms.
 * Provide on the form component (`providers: [EvaluateSubmitService]`) so dialog state is isolated.
 */
@Injectable()
export class EvaluateSubmitService {
  private readonly messageService = inject(MessageService);
  private readonly translate = inject(TranslateService);
  private readonly languageService = inject(LanguageService);

  readonly evaluating = signal(false);
  readonly submitting = signal(false);
  readonly policyDialogVisible = signal(false);
  readonly policyDialogMode = signal<PolicyEvaluationDialogMode>('warning');
  readonly policyDialogMessages = signal<string[]>([]);
  readonly policyDialogLoading = signal(false);

  private pendingCommand: unknown = null;
  private options: EvaluateSubmitOptions<unknown> | null = null;

  run<TCommand>(command: TCommand, options: EvaluateSubmitOptions<TCommand>): void {
    this.options = options as EvaluateSubmitOptions<unknown>;
    this.pendingCommand = command;
    this.evaluating.set(true);

    options.evaluate(command).subscribe({
      next: (result) => {
        this.evaluating.set(false);

        if (result.hasErrors) {
          this.openPolicyDialog('error', result.errors);
          return;
        }

        if (result.hasWarnings) {
          this.openPolicyDialog('warning', result.warnings);
          return;
        }

        this.executeSubmit(command, false);
      },
      error: (err) => {
        this.evaluating.set(false);
        this.pendingCommand = null;
        const isAr = this.languageService.currentLang() === 'ar';
        const msg =
          (isAr ? err?.error?.messageAr : err?.error?.message) ||
          err?.error?.message ||
          err?.error?.messageAr ||
          this.translate.instant('leave.policy_dialog.evaluate_failed');
        this.messageService.add({
          severity: 'error',
          summary: this.translate.instant('common.error'),
          detail: msg,
        });
      },
    });
  }

  onPolicyProceed(): void {
    if (!this.pendingCommand || this.policyDialogMode() === 'error' || !this.options) return;
    this.policyDialogLoading.set(true);
    this.executeSubmit(this.pendingCommand, true);
  }

  onPolicyDialogClosed(): void {
    if (!this.policyDialogLoading()) {
      this.pendingCommand = null;
    }
    this.policyDialogVisible.set(false);
  }

  private openPolicyDialog(mode: PolicyEvaluationDialogMode, issues: PolicyEvaluationIssueDto[]): void {
    this.policyDialogMode.set(mode);
    this.policyDialogMessages.set(this.localizeIssues(issues));
    this.policyDialogLoading.set(false);
    this.policyDialogVisible.set(true);
  }

  private localizeIssues(issues: PolicyEvaluationIssueDto[]): string[] {
    const isAr = this.languageService.currentLang() === 'ar';
    return issues
      .map((i) => (isAr ? i.messageAr || i.message : i.message || i.messageAr))
      .filter(Boolean);
  }

  private executeSubmit(command: unknown, fromDialog: boolean): void {
    if (!this.options) return;

    this.submitting.set(true);
    this.options.submit(command).subscribe({
      next: () => {
        this.submitting.set(false);
        this.policyDialogLoading.set(false);
        this.policyDialogVisible.set(false);
        this.pendingCommand = null;
        this.options!.onSuccess();
      },
      error: () => {
        this.submitting.set(false);
        this.policyDialogLoading.set(false);
        if (fromDialog) {
          this.policyDialogVisible.set(false);
        }
        this.pendingCommand = null;
      },
    });
  }
}
