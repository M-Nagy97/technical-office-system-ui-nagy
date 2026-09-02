import { Component, Input, computed, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TagModule } from 'primeng/tag';
import { TranslateModule, TranslatePipe } from '@ngx-translate/core';
import { LeaveRequestStatus } from '../../../core/models/leave-request.model';
import { PermissionRequestStatus } from '../../../core/models/permission-request.model';

type TagSeverity = 'success' | 'info' | 'warning' | 'danger' | 'secondary' | 'contrast' | undefined;

@Component({
  selector: 'app-status-badge',
  standalone: true,
  imports: [CommonModule, TagModule, TranslateModule, TranslatePipe],
  template: `
    @if (info().key) {
      <p-tag [value]="info().key | translate" [severity]="info().severity" [rounded]="rounded" [styleClass]="styleClass" />
    } @else {
      <p-tag [value]="info().label" [severity]="info().severity" [rounded]="rounded" [styleClass]="styleClass" />
    }
  `,
  styles: [
    `
      :host {
        display: inline-block;
      }
    `,
  ],
})
export class StatusBadgeComponent {
  private readonly _status = signal<number | string | null | undefined>(undefined);
  private readonly _type = signal<'leave' | 'permission' | 'general'>('leave');

  @Input() set status(val: number | string | null | undefined) {
    this._status.set(val);
  }

  @Input() set type(val: 'leave' | 'permission' | 'general') {
    this._type.set(val);
  }

  @Input() rounded = false;
  @Input() styleClass = '';

  readonly info = computed(() => {
    const raw = this._status();
    if (raw === null || raw === undefined) {
      return { key: '', label: '-', severity: undefined as TagSeverity };
    }

    const num = Number(raw);

    if (num === LeaveRequestStatus.Draft || raw === 'Draft' || raw === 'draft') {
      return { key: 'leave.status.draft', label: 'Draft', severity: 'info' as TagSeverity };
    }
    if (num === LeaveRequestStatus.Pending || raw === 'Pending' || raw === 'pending') {
      return { key: 'leave.status.pending', label: 'Pending', severity: 'warning' as TagSeverity };
    }
    if (num === LeaveRequestStatus.Approved || raw === 'Approved' || raw === 'approved') {
      return { key: 'leave.status.approved', label: 'Approved', severity: 'success' as TagSeverity };
    }
    if (num === LeaveRequestStatus.Rejected || raw === 'Rejected' || raw === 'rejected') {
      return { key: 'leave.status.rejected', label: 'Rejected', severity: 'danger' as TagSeverity };
    }
    if (num === LeaveRequestStatus.Cancelled || raw === 'Cancelled' || raw === 'cancelled') {
      return { key: 'leave.status.cancelled', label: 'Cancelled', severity: 'secondary' as TagSeverity };
    }

    return { key: '', label: String(raw), severity: undefined as TagSeverity };
  });
}
