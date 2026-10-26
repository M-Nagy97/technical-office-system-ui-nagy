import { Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { TranslatePipe } from '@ngx-translate/core';
import { CardModule } from 'primeng/card';
import { InputTextModule } from 'primeng/inputtext';
import { ButtonModule } from 'primeng/button';
import { TagModule } from 'primeng/tag';
import { TooltipModule } from 'primeng/tooltip';
import {
  NotifyService,
  PageHeaderComponent,
  SharedTableCellTemplateDirective,
  SharedTableColumn,
  SharedTableComponent,
} from '../../../shared';
import { EmployeeEnrollService } from './services/employee-enroll.service';
import { EmployeeEnrollLink } from './models/employee-enroll-link.model';

@Component({
  selector: 'app-employee-enroll-links',
  standalone: true,
  imports: [
    FormsModule,
    TranslatePipe,
    CardModule,
    InputTextModule,
    ButtonModule,
    TagModule,
    TooltipModule,
    PageHeaderComponent,
    SharedTableComponent,
    SharedTableCellTemplateDirective,
  ],
  templateUrl: './employee-enroll-links.component.html',
  styleUrl: './employee-enroll-links.component.scss',
})
export class EmployeeEnrollLinksComponent implements OnInit {
  private readonly enrollService = inject(EmployeeEnrollService);
  private readonly notify = inject(NotifyService);

  readonly columns: SharedTableColumn<EmployeeEnrollLink>[] = [
    { id: 'employeeName', header: 'enroll_links.employee', field: 'employeeName' },
    { id: 'enrollNumber', header: 'enroll_links.current' },
    { id: 'draft', header: 'enroll_links.device' },
    { id: 'save', header: '', width: '4rem' },
  ];

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
        this.notify.error(err, 'enroll_links.load_error');
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
      this.notify.warn('enroll_links.enroll_required');
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
        this.notify.success('enroll_links.save_success', { name: row.employeeName, number: enrollNumber });
      },
      error: (err) => {
        this.savingId.set(null);
        this.notify.error(err, 'enroll_links.save_error');
      },
    });
  }
}
