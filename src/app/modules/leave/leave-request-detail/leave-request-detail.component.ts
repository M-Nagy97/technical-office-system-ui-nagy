import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { CardModule } from 'primeng/card';
import { ButtonModule } from 'primeng/button';
import { DividerModule } from 'primeng/divider';
import { TooltipModule } from 'primeng/tooltip';
import { MessageService } from 'primeng/api';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { LeaveRequestService, EmployeeService, LanguageService } from '../../../core/services';
import { LeaveRequestDto, LeaveRequestStatus } from '../../../core/models/leave-request.model';
import { StatusBadgeComponent } from '../../../shared';
import {
  LeaveActionDialogComponent,
  LeaveActionEvent,
  LeaveActionType,
} from '../leave-action-dialog/leave-action-dialog.component';

@Component({
  selector: 'app-leave-request-detail',
  standalone: true,
  imports: [
    CommonModule,
    RouterLink,
    CardModule,
    ButtonModule,
    DividerModule,
    StatusBadgeComponent,
    LeaveActionDialogComponent,
    TranslateModule,
  ],
  templateUrl: './leave-request-detail.component.html',
  styleUrl: './leave-request-detail.component.scss',
})
export class LeaveRequestDetailComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly leaveRequestService = inject(LeaveRequestService);
  private readonly employeeService = inject(EmployeeService);
  private readonly messageService = inject(MessageService);
  private readonly translate = inject(TranslateService);
  readonly languageService = inject(LanguageService);

  readonly loading = signal(false);
  readonly request = signal<LeaveRequestDto | null>(null);
  readonly employeeName = signal<string>('');

  // Dialog signals
  readonly actionDialogOpen = signal(false);
  readonly currentAction = signal<LeaveActionType | null>(null);
  readonly actionLoading = signal(false);

  readonly LeaveRequestStatus = LeaveRequestStatus;

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.loadRequest(id);
    } else {
      this.router.navigate(['/leave/requests']);
    }
  }

  loadRequest(id: string): void {
    this.loading.set(true);
    this.leaveRequestService.getById(id).subscribe({
      next: (req) => {
        this.request.set(req);
        this.loading.set(false);
        if (req?.employeeId) {
          this.loadEmployeeName(req.employeeId);
        }
      },
      error: () => {
        this.loading.set(false);
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

  openActionDialog(action: LeaveActionType): void {
    this.currentAction.set(action);
    this.actionDialogOpen.set(true);
  }

  handleActionConfirm(event: LeaveActionEvent): void {
    const req = this.request();
    if (!req) return;

    this.actionLoading.set(true);
    let op$;
    if (event.action === 'approve') {
      op$ = this.leaveRequestService.approve(req.id);
    } else if (event.action === 'reject') {
      op$ = this.leaveRequestService.reject(req.id, event.reason || '');
    } else {
      op$ = this.leaveRequestService.cancel(req.id, event.reason);
    }

    op$.subscribe({
      next: () => {
        this.actionLoading.set(false);
        this.actionDialogOpen.set(false);
        const detailMsg =
          event.action === 'approve'
            ? this.translate.instant('leave.actions.approve_leave_success')
            : event.action === 'reject'
            ? this.translate.instant('leave.actions.reject_leave_success')
            : this.translate.instant('leave.actions.cancel_leave_success');

        this.messageService.add({
          severity: 'success',
          summary: this.translate.instant('common.success'),
          detail: detailMsg,
        });
        this.loadRequest(req.id);
      },
      error: () => {
        this.actionLoading.set(false);
      },
    });
  }
}

