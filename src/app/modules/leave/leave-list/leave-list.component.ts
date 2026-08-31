import { Component, OnInit, signal, computed, inject } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { CardModule } from 'primeng/card';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { ConfirmationService, MessageService } from 'primeng/api';
import {
  SharedTableComponent,
  SharedTableColumn,
  SharedTableAction,
} from '../../../shared';
import { LeaveTypeService, LeaveTypeDto } from '../../../core';

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
    { id: 'arabicName', header: 'نوع الإجازة', field: 'arabicName', sortableField: 'arabicName', width: '25%' },
    { id: 'name', header: 'الاسم بالإنجليزية', field: 'name', sortableField: 'name', width: '20%' },
    {
      id: 'maxDaysPerYear',
      header: 'الحد الأقصى للأيام',
      field: 'maxDaysPerYear',
      sortableField: 'maxDaysPerYear',
      width: '15%',
      valueGetter: (row) => (row.maxDaysPerYear != null ? `${row.maxDaysPerYear} يوم` : 'غير محدود'),
    },
    {
      id: 'isPaid',
      header: 'مدفوعة الأجر',
      width: '12%',
      valueGetter: (row) => (row.isPaid ? 'نعم' : 'لا'),
    },
    {
      id: 'requiresDocument',
      header: 'تتطلب مستند',
      width: '13%',
      valueGetter: (row) => (row.requiresDocument ? 'نعم' : 'لا'),
    },
    {
      id: 'isActive',
      header: 'الحالة',
      width: '15%',
      valueGetter: (row) => (row.isActive ? 'نشط' : 'غير نشط'),
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
        this.confirmationService.confirm({
          message: `هل أنت متأكد من رغبتك في حذف "${row.arabicName || row.name}"؟`,
          header: 'تأكيد الحذف',
          icon: 'pi pi-exclamation-triangle',
          acceptLabel: 'نعم، احذف',
          rejectLabel: 'إلغاء',
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
          summary: 'خطأ',
          detail: 'فشل في تحميل أنواع الإجازات من الخادم',
        });
      },
    });
  }

  deleteLeaveType(id: string): void {
    this.leaveTypeService.delete(id).subscribe({
      next: () => {
        this.messageService.add({
          severity: 'success',
          summary: 'نجاح',
          detail: 'تم حذف نوع الإجازة بنجاح',
        });
        this.loadData();
      },
      error: () => {
        this.messageService.add({
          severity: 'error',
          summary: 'خطأ',
          detail: 'فشل في حذف نوع الإجازة من الخادم',
        });
      },
    });
  }
}
