import { Component, OnInit, inject, signal } from '@angular/core';
import { NgIf } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { CardModule } from 'primeng/card';
import { TableModule } from 'primeng/table';
import { InputTextModule } from 'primeng/inputtext';
import { ButtonModule } from 'primeng/button';
import { ToastModule } from 'primeng/toast';
import { TagModule } from 'primeng/tag';
import { TooltipModule } from 'primeng/tooltip';
import { MessageService } from 'primeng/api';
import { EmployeeEnrollService } from './services/employee-enroll.service';
import { EmployeeEnrollLink } from './models/employee-enroll-link.model';

@Component({
  selector: 'app-employee-enroll-links',
  standalone: true,
  imports: [
    NgIf,
    FormsModule,
    CardModule,
    TableModule,
    InputTextModule,
    ButtonModule,
    ToastModule,
    TagModule,
    TooltipModule,
  ],
  providers: [MessageService],
  templateUrl: './employee-enroll-links.component.html',
  styleUrl: './employee-enroll-links.component.scss',
})
export class EmployeeEnrollLinksComponent implements OnInit {
  private readonly enrollService = inject(EmployeeEnrollService);
  private readonly messageService = inject(MessageService);

  readonly rows = signal<EmployeeEnrollLink[]>([]);
  readonly loading = signal(false);
  readonly savingId = signal<string | null>(null);
  readonly drafts = signal<Record<string, string>>({});

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.loading.set(true);
    this.enrollService.getAll().subscribe({
      next: (list) => {
        this.rows.set(list);
        const next: Record<string, string> = {};
        for (const row of list) {
          next[row.employeeId] = row.enrollNumber ?? '';
        }
        this.drafts.set(next);
        this.loading.set(false);
      },
      error: (err) => {
        this.loading.set(false);
        this.messageService.add({
          severity: 'error',
          summary: 'خطأ',
          detail: err?.error?.message ?? 'تعذر تحميل قائمة الموظفين',
        });
      },
    });
  }

  draftFor(employeeId: string): string {
    return this.drafts()[employeeId] ?? '';
  }

  setDraft(employeeId: string, value: string): void {
    this.drafts.update((d) => ({ ...d, [employeeId]: value }));
  }

  isDirty(row: EmployeeEnrollLink): boolean {
    const draft = (this.draftFor(row.employeeId) ?? '').trim();
    const current = (row.enrollNumber ?? '').trim();
    return draft !== current;
  }

  save(row: EmployeeEnrollLink): void {
    const enrollNumber = this.draftFor(row.employeeId).trim();
    if (!enrollNumber) {
      this.messageService.add({
        severity: 'warn',
        summary: 'تنبيه',
        detail: 'أدخل رقم التسجيل على الجهاز (رقم الموظف)',
      });
      return;
    }

    this.savingId.set(row.employeeId);
    this.enrollService.link(row.employeeId, enrollNumber).subscribe({
      next: () => {
        this.savingId.set(null);
        this.rows.update((list) =>
          list.map((r) =>
            r.employeeId === row.employeeId ? { ...r, enrollNumber } : r
          )
        );
        this.messageService.add({
          severity: 'success',
          summary: 'تم',
          detail: `تم ربط ${row.employeeName} برقم ${enrollNumber}`,
        });
      },
      error: (err) => {
        this.savingId.set(null);
        this.messageService.add({
          severity: 'error',
          summary: 'خطأ',
          detail: err?.error?.message ?? 'تعذر حفظ رقم التسجيل',
        });
      },
    });
  }
}
