import { Component, OnInit, signal, computed, inject } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { CardModule } from 'primeng/card';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { ConfirmationService, MessageService } from 'primeng/api';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import {
  SharedTableComponent,
  SharedTableColumn,
  SharedTableAction,
} from '../../../shared';
import { LeaveTypeService, LeaveTypeDto, LanguageService } from '../../../core';

@Component({
  selector: 'app-leave-list',
  standalone: true,
  imports: [
    RouterLink,
    FormsModule,
    CardModule,
    ButtonModule,
    InputTextModule,
    ConfirmDialogModule,
    SharedTableComponent,
    TranslateModule,
  ],
  providers: [ConfirmationService],
  templateUrl: './leave-list.component.html',
  styleUrl: './leave-list.component.scss',
})
export class LeaveListComponent implements OnInit {
  private readonly router = inject(Router);
  private readonly confirmationService = inject(ConfirmationService);
  private readonly messageService = inject(MessageService);
  private readonly leaveTypeService = inject(LeaveTypeService);
  private readonly translate = inject(TranslateService);
  private readonly languageService = inject(LanguageService);

  readonly loading = signal(false);
  readonly searchText = signal('');
  readonly leaveTypes = signal<LeaveTypeDto[]>([]);

  readonly filteredLeaveTypes = computed(() => {
    const list = this.leaveTypes();
    const query = this.searchText().trim().toLowerCase();
    if (!query) return list;
    return list.filter(
      (item) =>
        (item.name?.toLowerCase().includes(query) ?? false) ||
        (item.arabicName?.toLowerCase().includes(query) ?? false)
    );
  });

  readonly columns: SharedTableColumn<LeaveTypeDto>[] = [
    { id: 'arabicName', header: 'leave.types.col_arabic_name', field: 'arabicName', sortableField: 'arabicName', width: '25%' },
    { id: 'name', header: 'leave.types.col_name', field: 'name', sortableField: 'name', width: '20%' },
    {
      id: 'maxDaysPerYear',
      header: 'leave.types.col_max_days',
      field: 'maxDaysPerYear',
      sortableField: 'maxDaysPerYear',
      width: '15%',
      valueGetter: (row) =>
        row.maxDaysPerYear != null
          ? this.translate.instant('leave.types.days_count', { count: row.maxDaysPerYear })
          : this.translate.instant('leave.types.unlimited'),
    },
    {
      id: 'isPaid',
      header: 'leave.types.col_paid',
      width: '12%',
      valueGetter: (row) =>
        row.isPaid ? this.translate.instant('leave.types.yes') : this.translate.instant('leave.types.no'),
    },
    {
      id: 'requiresDocument',
      header: 'leave.types.col_requires_doc',
      width: '13%',
      valueGetter: (row) =>
        row.requiresDocument ? this.translate.instant('leave.types.yes') : this.translate.instant('leave.types.no'),
    },
    {
      id: 'isActive',
      header: 'leave.types.col_status',
      width: '15%',
      valueGetter: (row) =>
        row.isActive
          ? this.translate.instant('leave.types.status_active')
          : this.translate.instant('leave.types.status_inactive'),
    },
  ];

  readonly actions: SharedTableAction<LeaveTypeDto>[] = [
    {
      id: 'edit',
      icon: 'pi pi-pencil',
      buttonClass: 'p-button-rounded p-button-text p-button-sm p-button-info',
      onClick: (row) => {
        this.router.navigate(['/leave/types/add'], { queryParams: { id: row.id } });
      },
    },
    {
      id: 'delete',
      icon: 'pi pi-trash',
      buttonClass: 'p-button-rounded p-button-text p-button-sm p-button-danger',
      onClick: (row) => {
        const name =
          this.languageService.currentLang() === 'ar'
            ? row.arabicName || row.name
            : row.name || row.arabicName;
        this.confirmationService.confirm({
          message: this.translate.instant('leave.types.delete_confirm_msg', { name }),
          header: this.translate.instant('leave.types.delete_confirm_title'),
          icon: 'pi pi-exclamation-triangle',
          acceptLabel: this.translate.instant('leave.types.confirm_delete_btn'),
          rejectLabel: this.translate.instant('leave.types.cancel_btn'),
          accept: () => this.deleteLeaveType(row.id),
        });
      },
    },
  ];

  ngOnInit(): void {
    this.loadData();
  }

  loadData(): void {
    this.loading.set(true);
    this.leaveTypeService.getAll().subscribe({
      next: (data) => {
        this.leaveTypes.set(data);
        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
        this.messageService.add({
          severity: 'error',
          summary: this.translate.instant('common.error'),
          detail: this.translate.instant('leave.types.load_failed'),
        });
      },
    });
  }

  deleteLeaveType(id: string): void {
    this.leaveTypeService.delete(id).subscribe({
      next: () => {
        this.messageService.add({
          severity: 'success',
          summary: this.translate.instant('common.success'),
          detail: this.translate.instant('leave.types.delete_success'),
        });
        this.loadData();
      },
      error: (err) => {
        const isAr = this.languageService.currentLang() === 'ar';
        const msg =
          (isAr ? err?.error?.messageAr : err?.error?.message) ||
          err?.error?.message ||
          err?.error?.messageAr ||
          err?.error?.detail ||
          this.translate.instant('leave.types.delete_failed');

        this.messageService.add({
          severity: 'error',
          summary: this.translate.instant('common.error'),
          detail: msg,
        });
      },
    });
  }
}

