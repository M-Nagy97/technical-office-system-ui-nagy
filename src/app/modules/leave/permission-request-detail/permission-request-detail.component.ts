import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { CardModule } from 'primeng/card';
import { ButtonModule } from 'primeng/button';
import { DividerModule } from 'primeng/divider';
import { TooltipModule } from 'primeng/tooltip';
import { MessageService } from 'primeng/api';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { PermissionRequestService, EmployeeService, LanguageService } from '../../../core/services';
import {
  PermissionRequestDto,
  PermissionRequestStatus,
  PermissionDurationType,
  HalfDayPeriod,
} from '../../../core/models/permission-request.model';
import { StatusBadgeComponent } from '../../../shared';
import {
  PermissionActionDialogComponent,
  PermissionActionEvent,
  PermissionActionType,
} from '../permission-action-dialog/permission-action-dialog.component';

@Component({
  selector: 'app-permission-request-detail',
  standalone: true,
  imports: [
    CommonModule,
    RouterLink,
    CardModule,
    ButtonModule,
    DividerModule,
    StatusBadgeComponent,
    PermissionActionDialogComponent,
    TranslateModule,
  ],
  templateUrl: './permission-request-detail.component.html',
  styleUrl: './permission-request-detail.component.scss',
})
export class PermissionRequestDetailComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly permissionRequestService = inject(PermissionRequestService);
  private readonly employeeService = inject(EmployeeService);
  private readonly messageService = inject(MessageService);
  private readonly translate = inject(TranslateService);
  readonly languageService = inject(LanguageService);

  readonly loading = signal(false);
  readonly request = signal<PermissionRequestDto | null>(null);
  readonly employeeName = signal<string>('');

  // Dialog signals
  readonly actionDialogOpen = signal(false);
  readonly currentAction = signal<PermissionActionType | null>(null);
  readonly actionLoading = signal(false);

  readonly PermissionRequestStatus = PermissionRequestStatus;
  readonly PermissionDurationType = PermissionDurationType;
  readonly HalfDayPeriod = HalfDayPeriod;

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.loadRequest(id);
    } else {
      this.router.navigate(['/leave/permissions']);
    }
  }

  loadRequest(id: string): void {
    this.loading.set(true);
    this.permissionRequestService.getById(id).subscribe({
      next: (req) => {
        this.request.set(req);
        this.loading.set(false);
        if (req?.employeeId) {
          this.loadEmployeeName(req.employeeId);
        }
      },
      error: () => {
        this.loading.set(false);
        this.messageService.add({
          severity: 'error',
          summary: this.translate.instant('common.error'),
          detail: this.translate.instant('leave.permissions.load_detail_failed'),
        });
      },
    });
  }

  private loadEmployeeName(employeeId: string): void {
    const cached = this.employeeService.getByIdSync(employeeId);
    if (cached) {
      this.employeeName.set(cached.fullName);
      return;
    }
    this.employeeService.getById(employeeId).subscribe({
      next: (emp) => {
        if (emp) this.employeeName.set(emp.fullName);
      },
    });
  }

  openActionDialog(action: PermissionActionType): void {
    this.currentAction.set(action);
    this.actionDialogOpen.set(true);
  }

  handleActionConfirm(event: PermissionActionEvent): void {
    const req = this.request();
    if (!req) return;

    this.actionLoading.set(true);
    let op$;
    if (event.action === 'approve') {
      op$ = this.permissionRequestService.approve(req.id);
    } else if (event.action === 'reject') {
      op$ = this.permissionRequestService.reject(req.id, event.reason || '');
    } else {
      op$ = this.permissionRequestService.cancel(req.id, event.reason);
    }

    op$.subscribe({
      next: () => {
        this.actionLoading.set(false);
        this.actionDialogOpen.set(false);
        const detailMsg =
          event.action === 'approve'
            ? this.translate.instant('leave.actions.approve_permission_success')
            : event.action === 'reject'
            ? this.translate.instant('leave.actions.reject_permission_success')
            : this.translate.instant('leave.actions.cancel_permission_success');

        this.messageService.add({
          severity: 'success',
          summary: this.translate.instant('common.success'),
          detail: detailMsg,
        });
        this.loadRequest(req.id);
      },
      error: (err) => {
        this.actionLoading.set(false);
        const isAr = this.languageService.currentLang() === 'ar';
        const msg =
          (isAr ? err?.error?.messageAr : err?.error?.message) ||
          err?.error?.message ||
          err?.error?.messageAr ||
          err?.error?.detail ||
          this.translate.instant('leave.actions.action_failed');

        this.messageService.add({
          severity: 'error',
          summary: this.translate.instant('common.error'),
          detail: msg,
        });
      },
    });
  }
}

