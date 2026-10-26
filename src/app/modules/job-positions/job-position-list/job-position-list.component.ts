import { Component, OnInit, signal, computed, inject } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { TranslatePipe } from '@ngx-translate/core';
import { CardModule } from 'primeng/card';
import { ButtonModule } from 'primeng/button';
import { PermissionService } from '../../../core/auth/permission.service';
import { HasPermissionDirective } from '../../../core/directives/has-permission.directive';
import { JobPositionsService, JobPositionDto } from '../../../core/api/generated';
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
  selector: 'app-job-position-list',
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
  templateUrl: './job-position-list.component.html',
  styleUrl: './job-position-list.component.scss',
})
export class JobPositionListComponent implements OnInit {
  private readonly jobPositionsService = inject(JobPositionsService);
  private readonly confirm = inject(ConfirmService);
  private readonly notify = inject(NotifyService);
  private readonly router = inject(Router);
  private readonly permission = inject(PermissionService);

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

  readonly columns: SharedTableColumn<JobPositionDto>[] = [
    { id: 'code', header: 'common.code', field: 'code', sortableField: 'code' },
    { id: 'name', header: 'common.name', field: 'name', sortableField: 'name' },
    { id: 'description', header: 'common.description', valueGetter: (row) => row.description ?? '-' },
  ];

  readonly actions: SharedTableAction<JobPositionDto>[] = [
    tableEditAction((row) => {
      if (!row.id) return;
      this.router.navigate(['/job-positions', row.id, 'edit']);
    }, { visible: this.permission.writeVisible('employees') }),
    tableDeleteAction((row) => this.confirmDelete(row), { visible: this.permission.writeVisible('employees') }),
  ];

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.loading.set(true);
    this.jobPositionsService.jobPositionsGetAll().subscribe({
      next: (res) => {
        if (res.success && res.data) {
          this.positions.set(res.data);
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

  confirmDelete(position: JobPositionDto): void {
    if (!position.id) return;
    this.confirm.confirmDelete(position.name ?? position.code, () => this.delete(position.id!));
  }

  delete(id: string): void {
    this.jobPositionsService.jobPositionsDelete(id).subscribe({
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
