import { Component, EventEmitter, Input, Output, ViewEncapsulation, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DialogModule } from 'primeng/dialog';
import { ButtonModule } from 'primeng/button';
import { TranslateModule, TranslateService } from '@ngx-translate/core';

export type PolicyEvaluationDialogMode = 'error' | 'warning';

@Component({
  selector: 'app-policy-evaluation-dialog',
  standalone: true,
  imports: [CommonModule, DialogModule, ButtonModule, TranslateModule],
  templateUrl: './policy-evaluation-dialog.component.html',
  styleUrl: './policy-evaluation-dialog.component.scss',
  encapsulation: ViewEncapsulation.None,
})
export class PolicyEvaluationDialogComponent {
  private readonly translate = inject(TranslateService);

  private readonly _visible = signal(false);
  private readonly _mode = signal<PolicyEvaluationDialogMode>('warning');
  private readonly _messages = signal<string[]>([]);
  private readonly _loading = signal(false);

  @Input() set visible(val: boolean) {
    this._visible.set(!!val);
  }
  get visible(): boolean {
    return this._visible();
  }

  @Input() set mode(val: PolicyEvaluationDialogMode) {
    this._mode.set(val || 'warning');
  }
  get mode(): PolicyEvaluationDialogMode {
    return this._mode();
  }

  @Input() set messages(val: string[] | null | undefined) {
    this._messages.set((val || []).filter((m) => !!m?.trim()));
  }

  @Input() set loading(val: boolean) {
    this._loading.set(!!val);
  }
  get loading(): boolean {
    return this._loading();
  }

  @Output() visibleChange = new EventEmitter<boolean>();
  @Output() proceed = new EventEmitter<void>();
  @Output() cancelled = new EventEmitter<void>();

  readonly isError = computed(() => this._mode() === 'error');
  readonly displayMessages = computed(() => this._messages());
  readonly joinedMessages = computed(() => {
    const msgs = this._messages();
    return msgs.length ? msgs.join('\n') : '';
  });

  readonly title = computed(() =>
    this.translate.instant(
      this.isError() ? 'leave.policy_dialog.error_title' : 'leave.policy_dialog.warning_title'
    )
  );

  readonly heading = computed(() =>
    this.translate.instant(
      this.isError() ? 'leave.policy_dialog.error_heading' : 'leave.policy_dialog.warning_heading'
    )
  );

  onVisibleChange(val: boolean): void {
    this._visible.set(val);
    this.visibleChange.emit(val);
    if (!val) {
      this.cancelled.emit();
    }
  }

  onClose(): void {
    this.onVisibleChange(false);
  }

  onProceed(): void {
    if (this.isError() || this.loading) return;
    this.proceed.emit();
  }
}
