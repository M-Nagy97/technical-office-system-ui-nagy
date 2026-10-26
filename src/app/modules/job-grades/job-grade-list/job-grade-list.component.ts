import { Component, OnInit, signal, computed, inject } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { TranslatePipe } from '@ngx-translate/core';
import { CardModule } from 'primeng/card';
import { ButtonModule } from 'primeng/button';
import { PermissionService } from '../../../core/auth/permission.service';
import { HasPermissionDirective } from '../../../core/directives/has-permission.directive';
import { JobGradesService, JobGradeDto } from '../../../core/api/generated';
import {
  ConfirmService,
  FilterBarComponent,
  NotifyService,
  SharedTableAction,
  SharedTableColumn,
  SharedTableComponent,
  tableDeleteAction,
  tableEditAction,
} from '../../../shared';

@Component({
  selector: 'app-job-grade-list',
  standalone: true,
  imports: [
    RouterLink,
    TranslatePipe,
    CardModule,
    ButtonModule,
    HasPermissionDirective,
    SharedTableComponent,
    FilterBarComponent,
  ],
  templateUrl: './job-grade-list.component.html',
  styleUrl: './job-grade-list.component.scss',
})
export class JobGradeListComponent implements OnInit {
  private readonly jobGradesService = inject(JobGradesService);
  private readonly notify = inject(NotifyService);
  private readonly confirm = inject(ConfirmService);
  private readonly router = inject(Router);
  private readonly permission = inject(PermissionService);

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

  readonly columns: SharedTableColumn<JobGradeDto>[] = [
    { id: 'code', header: 'common.code', field: 'code', sortableField: 'code' },
    { id: 'name', header: 'common.name', field: 'name', sortableField: 'name' },
    { id: 'rank', header: 'common.rank', field: 'rank', sortableField: 'rank', valueGetter: (row) => row.rank ?? '-' },
  ];

  readonly actions: SharedTableAction<JobGradeDto>[] = [
    tableEditAction((row) => {
      if (!row.id) return;
      this.router.navigate(['/job-grades', row.id, 'edit']);
    }, { visible: this.permission.writeVisible('employees') }),
    tableDeleteAction((row) => this.confirmDelete(row), { visible: this.permission.writeVisible('employees') }),
  ];

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.loading.set(true);
    this.jobGradesService.jobGradesGetAll().subscribe({
      next: (res) => {
        if (res.success && res.data) {
          this.grades.set(res.data);
        } else if (res.message) {
          this.notify.warnText(res.message);
        } else {
          this.notify.warn('common.load_error');
        }
        this.loading.set(false);
      },
      error: (error) => {
        this.loading.set(false);
        this.notify.error(error, 'common.load_error');
      },
    });
  }

  confirmDelete(grade: JobGradeDto): void {
    if (!grade.id) return;
    this.confirm.confirmDelete(grade.name ?? grade.code, () => this.delete(grade.id!));
  }

  delete(id: string): void {
    this.jobGradesService.jobGradesDelete(id).subscribe({
      next: (res) => {
        if (res.success) {
          this.notify.success('common.delete_success');
          this.load();
        } else if (res.message) {
          this.notify.errorText(res.message);
        } else {
          this.notify.error(null, 'common.delete_error');
        }
      },
      error: (error) => this.notify.error(error, 'common.delete_error'),
    });
  }
}
