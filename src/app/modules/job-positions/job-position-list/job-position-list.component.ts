import { Component, OnInit, signal, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { TableModule } from 'primeng/table';
import { CardModule } from 'primeng/card';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { ConfirmPopupModule } from 'primeng/confirmpopup';
import { ToastModule } from 'primeng/toast';
import { TooltipModule } from 'primeng/tooltip';
import { RippleModule } from 'primeng/ripple';
import { ConfirmationService, MessageService } from 'primeng/api';
import { JobPositionsService, JobPositionDto } from '../../../core/api/generated';


@Component({
  selector: 'app-job-position-list',
  standalone: true,
  imports: [
    RouterLink,
    FormsModule,
    TableModule,
    CardModule,
    ButtonModule,
    InputTextModule,
    ConfirmDialogModule,
    ConfirmPopupModule,
    ToastModule,
    TooltipModule,
    RippleModule,
  ],
  templateUrl: './job-position-list.component.html',
  styleUrl: './job-position-list.component.scss',
})
export class JobPositionListComponent implements OnInit {
  private readonly jobPositionsService = inject(JobPositionsService);
  private readonly confirmationService = inject(ConfirmationService);
  private readonly messageService = inject(MessageService);

  readonly loading = signal(false);
  readonly positions = signal<JobPositionDto[]>([]);
  readonly searchText = signal('');

  readonly filteredPositions = computed(() => {
    const list = this.positions();
    const search = this.searchText().trim().toLowerCase();
    if (!search) return list;
    return list.filter(
      (p) =>
        (p.code?.toLowerCase().includes(search) ?? false) ||
        (p.name?.toLowerCase().includes(search) ?? false) ||
        (p.description?.toLowerCase().includes(search) ?? false)
    );
  });

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.loading.set(true);
    this.jobPositionsService.jobPositionsGetAll().subscribe({
      next: (res) => {
        if (res.success && res.data) {
          this.positions.set(res.data);
        } else {
          this.messageService.add({
            severity: 'warn',
            summary: 'تحذير',
            detail: res.message ?? 'فشل في تحميل المسميات الوظيفية',
          });
        }
        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
        this.messageService.add({
          severity: 'error',
          summary: 'خطأ',
          detail: 'حدث خطأ أثناء تحميل البيانات',
        });
      },
    });
  }

  confirmDelete(event: Event, position: JobPositionDto): void {
    if (!position.id) return;
    this.confirmationService.confirm({
      target: event.target as EventTarget,
      message: `هل أنت متأكد من حذف المسمى "${position.name ?? position.code}"؟`,
      icon: 'pi pi-exclamation-triangle',
      acceptButtonStyleClass: 'p-button-danger',
      accept: () => this.delete(position.id!),
    });
  }

  delete(id: string): void {
    this.jobPositionsService.jobPositionsDelete(id).subscribe({
      next: (res) => {
        if (res.success) {
          this.messageService.add({
            severity: 'success',
            summary: 'تم',
            detail: 'تم حذف المسمى الوظيفي',
          });
          this.load();
        } else {
          this.messageService.add({
            severity: 'error',
            summary: 'خطأ',
            detail: res.message ?? 'فشل الحذف',
          });
        }
      },
      error: () => {
        this.messageService.add({
          severity: 'error',
          summary: 'خطأ',
          detail: 'حدث خطأ أثناء الحذف',
        });
      },
    });
  }
}
