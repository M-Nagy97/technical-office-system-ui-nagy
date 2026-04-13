import { Component, OnInit, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { CardModule } from 'primeng/card';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { InputNumberModule } from 'primeng/inputnumber';
import { InputSwitchModule } from 'primeng/inputswitch';
import { TooltipModule } from 'primeng/tooltip';
import { RippleModule } from 'primeng/ripple';
import { MessageService } from 'primeng/api';
import { ProgressSpinnerModule } from 'primeng/progressspinner';

import {
  WorkforceAttendanceSettingsService,
  WorkforceAttendanceSettingsDto,
} from '../../../core/services/workforce-attendance-settings.service';

@Component({
  selector: 'app-time-attendance-settings',
  standalone: true,
  imports: [
    RouterLink,
    FormsModule,
    CardModule,
    ButtonModule,
    InputTextModule,
    InputNumberModule,
    InputSwitchModule,
    TooltipModule,
    RippleModule,
    ProgressSpinnerModule,
  ],
  templateUrl: './time-attendance-settings.component.html',
  styleUrl: './time-attendance-settings.component.scss',
})
export class TimeAttendanceSettingsComponent implements OnInit {
  private readonly api = inject(WorkforceAttendanceSettingsService);
  private readonly messages = inject(MessageService);

  readonly loading = signal(false);
  readonly saving = signal(false);

  /** Editable row (typed settings; replaces legacy key/value table). */
  readonly model = signal<{
    defaultCalculationMethod: string;
    lateToleranceMinutes: number;
    earlyLeaveToleranceMinutes: number;
    roundToNearestMinutes: number;
    requirePunchOut: boolean;
  }>({
    defaultCalculationMethod: 'Fifo',
    lateToleranceMinutes: 15,
    earlyLeaveToleranceMinutes: 15,
    roundToNearestMinutes: 5,
    requirePunchOut: true,
  });

  readonly settingsId = signal<string | null>(null);

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.loading.set(true);
    this.api.get().subscribe({
      next: (row: WorkforceAttendanceSettingsDto | null) => {
        if (row) {
          this.settingsId.set(row.id);
          this.model.set({
            defaultCalculationMethod: row.defaultCalculationMethod,
            lateToleranceMinutes: row.lateToleranceMinutes,
            earlyLeaveToleranceMinutes: row.earlyLeaveToleranceMinutes,
            roundToNearestMinutes: row.roundToNearestMinutes,
            requirePunchOut: row.requirePunchOut,
          });
        } else {
          this.settingsId.set(null);
        }
        this.loading.set(false);
      },
      error: (err: Error) => {
        this.loading.set(false);
        this.messages.add({
          severity: 'error',
          summary: 'تعذر التحميل',
          detail: err.message,
        });
      },
    });
  }

  patchModel(patch: {
    defaultCalculationMethod?: string;
    lateToleranceMinutes?: number;
    earlyLeaveToleranceMinutes?: number;
    roundToNearestMinutes?: number;
    requirePunchOut?: boolean;
  }): void {
    this.model.update((m) => ({ ...m, ...patch }));
  }

  onNumberChange(
    field: 'lateToleranceMinutes' | 'earlyLeaveToleranceMinutes' | 'roundToNearestMinutes',
    value: number | null
  ): void {
    const n = value ?? 0;
    if (field === 'lateToleranceMinutes') this.patchModel({ lateToleranceMinutes: n });
    else if (field === 'earlyLeaveToleranceMinutes') this.patchModel({ earlyLeaveToleranceMinutes: n });
    else this.patchModel({ roundToNearestMinutes: n });
  }

  save(): void {
    const m = this.model();
    this.saving.set(true);
    this.api
      .upsert({
        defaultCalculationMethod: m.defaultCalculationMethod?.trim() || 'Fifo',
        lateToleranceMinutes: m.lateToleranceMinutes,
        earlyLeaveToleranceMinutes: m.earlyLeaveToleranceMinutes,
        roundToNearestMinutes: m.roundToNearestMinutes,
        requirePunchOut: m.requirePunchOut,
      })
      .subscribe({
        next: (saved: WorkforceAttendanceSettingsDto) => {
          this.settingsId.set(saved.id);
          this.saving.set(false);
          this.messages.add({
            severity: 'success',
            summary: 'تم الحفظ',
            detail: 'تم تحديث إعدادات الحضور.',
          });
        },
        error: (err: Error) => {
          this.saving.set(false);
          this.messages.add({
            severity: 'error',
            summary: 'فشل الحفظ',
            detail: err.message,
          });
        },
      });
  }
}
