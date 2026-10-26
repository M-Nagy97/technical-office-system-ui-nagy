import { Component, OnInit, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { TranslatePipe } from '@ngx-translate/core';
import { finalize } from 'rxjs';
import { ButtonModule } from 'primeng/button';
import { CardModule } from 'primeng/card';
import { UserDto, UsersService } from '../../../core/api/identity-generated';
import { HasPermissionDirective } from '../../../core/directives/has-permission.directive';
import { PermissionService } from '../../../core/auth/permission.service';
import {
  BUTTON_PRESET_CLASS,
  EntityCellComponent,
  NotifyService,
  PageHeaderComponent,
  SharedTableAction,
  SharedTableCellTemplateDirective,
  SharedTableColumn,
  SharedTableComponent,
  StatusBadgeComponent,
  tableEditAction,
} from '../../../shared';

@Component({
  selector: 'app-user-list',
  standalone: true,
  imports: [
    RouterLink,
    TranslatePipe,
    ButtonModule,
    CardModule,
    HasPermissionDirective,
    PageHeaderComponent,
    SharedTableComponent,
    SharedTableCellTemplateDirective,
    EntityCellComponent,
    StatusBadgeComponent,
  ],
  templateUrl: './user-list.component.html',
  styleUrl: './user-list.component.scss',
})
export class UserListComponent implements OnInit {
  private readonly usersService = inject(UsersService);
  private readonly notify = inject(NotifyService);
  private readonly router = inject(Router);
  private readonly permission = inject(PermissionService);

  readonly BUTTON_PRESET_CLASS = BUTTON_PRESET_CLASS;
  readonly loading = signal(true);
  readonly users = signal<UserDto[]>([]);

  readonly columns: SharedTableColumn<UserDto>[] = [
    { id: 'username', header: 'users.list.columns.username' },
    { id: 'email', header: 'users.list.columns.email', valueGetter: (row) => row.email || '-' },
    { id: 'status', header: 'users.list.columns.status' },
  ];

  readonly actions: SharedTableAction<UserDto>[] = [
    tableEditAction(
      (row) => {
        if (row.id) {
          this.router.navigate(['/admin/users/edit', row.id]);
        }
      },
      {
        icon: 'pi pi-user-edit',
        tooltip: 'users.list.edit_profile',
        visible: this.permission.writeVisible('admin'),
        disabled: (row) => !row.id,
      },
    ),
  ];

  ngOnInit(): void {
    this.loadUsers();
  }

  loadUsers(): void {
    this.loading.set(true);

    this.usersService.apiUsersGet()
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe({
        next: (users) => {
          this.users.set(
            [...users]
              .filter((user) => !user.isDeleted)
              .sort((left, right) => (left.userName ?? '').localeCompare(right.userName ?? '')),
          );
        },
        error: (error) => this.notify.error(error, 'users.list.load_error'),
      });
  }
}
