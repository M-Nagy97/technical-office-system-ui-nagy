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
import { JobGradesService, JobGradeDto } from '../../../core/api/generated';


@Component({
  selector: 'app-job-grade-list',
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
  templateUrl: './job-grade-list.component.html',
  styleUrl: './job-grade-list.component.scss',
})
export class JobGradeListComponent implements OnInit {
  private readonly jobGradesService = inject(JobGradesService);
  private readonly confirmationService = inject(ConfirmationService);
  private readonly messageService = inject(MessageService);

  readonly loading = signal(false);
  readonly grades = signal<JobGradeDto[]>([]);
  readonly searchText = signal('');

  readonly filteredGrades = computed(() => {
    const list = this.grades();
    const search = this.searchText().trim().toLowerCase();
    if (!search) return list;
    return list.filter(
      (g) =>
        (g.code?.toLowerCase().includes(search) ?? false) ||
        (g.name?.toLowerCase().includes(search) ?? false)
    );
  });

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.loading.set(true);
    this.jobGradesService.jobGradesGetAll().subscribe({
      next: (res) => {
        if (res.success && res.data) {
          this.grades.set(res.data);
        } else {
          this.messageService.add({
            severity: 'warn',
            summary: 'تحذير',
            detail: res.message ?? 'فشل في تحميل الدرجات الوظيفية',
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

  confirmDelete(event: Event, grade: JobGradeDto): void {
    if (!grade.id) return;
    this.confirmationService.confirm({
      target: event.target as EventTarget,
      message: `هل أنت متأكد من حذف الدرجة "${grade.name ?? grade.code}"؟`,
      icon: 'pi pi-exclamation-triangle',
      acceptButtonStyleClass: 'p-button-danger',
      accept: () => this.delete(grade.id!),
    });
  }

  delete(id: string): void {
    this.jobGradesService.jobGradesDelete(id).subscribe({
      next: (res) => {
        if (res.success) {
          this.messageService.add({
            severity: 'success',
            summary: 'تم',
            detail: 'تم حذف الدرجة الوظيفية',
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
