import { Component, OnInit, inject, signal } from '@angular/core';
import {
  AbstractControl,
  FormBuilder,
  ReactiveFormsModule,
  ValidationErrors,
  Validators,
} from '@angular/forms';
import { Router } from '@angular/router';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { finalize } from 'rxjs';
import { MenuItem } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { CardModule } from 'primeng/card';
import { CheckboxModule } from 'primeng/checkbox';
import { InputTextareaModule } from 'primeng/inputtextarea';
import { InputTextModule } from 'primeng/inputtext';
import { MultiSelectModule } from 'primeng/multiselect';
import { PasswordModule } from 'primeng/password';
import { ProgressSpinnerModule } from 'primeng/progressspinner';
import { StepsModule } from 'primeng/steps';
import {
  CreateUserRequestDto,
  ProfileService,
  RoleDto,
  RolesService,
  UpdateUserProfileRequestDto,
  UsersService,
} from '../../../core/api/identity-generated';
import {
  BUTTON_PRESET_CLASS,
  FormActionsComponent,
  FormSectionComponent,
  NotifyService,
  PageHeaderComponent,
} from '../../../shared';

type RoleOption = {
  name: string;
  description: string | null;
};

function passwordMatchValidator(control: AbstractControl): ValidationErrors | null {
  const password = control.get('password')?.value;
  const confirmPassword = control.get('confirmPassword')?.value;

  if (!password || !confirmPassword || password === confirmPassword) {
    return null;
  }

  return { passwordMismatch: true };
}

@Component({
  selector: 'app-user-create',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    TranslatePipe,
    ButtonModule,
    CardModule,
    CheckboxModule,
    InputTextareaModule,
    InputTextModule,
    MultiSelectModule,
    PasswordModule,
    ProgressSpinnerModule,
    StepsModule,
    PageHeaderComponent,
    FormSectionComponent,
    FormActionsComponent,
  ],
  templateUrl: './user-create.component.html',
  styleUrl: './user-create.component.scss',
})
export class UserCreateComponent implements OnInit {
  private readonly formBuilder = inject(FormBuilder);
  private readonly usersService = inject(UsersService);
  private readonly rolesService = inject(RolesService);
  private readonly profileService = inject(ProfileService);
  private readonly notify = inject(NotifyService);
  private readonly translate = inject(TranslateService);
  private readonly router = inject(Router);
  readonly BUTTON_PRESET_CLASS = BUTTON_PRESET_CLASS;

  readonly creatingUser = signal(false);
  readonly savingProfile = signal(false);
  readonly activeIndex = signal(0);
  readonly stepItems = signal<MenuItem[]>([]);
  readonly createdUserId = signal<string | null>(null);
  readonly createdUserName = signal<string>('');
  readonly createdUserEmail = signal<string>('');
  readonly availableRoles = signal<RoleOption[]>([]);

  readonly accountForm = this.formBuilder.nonNullable.group(
    {
      userName: ['', [Validators.required, Validators.maxLength(64)]],
      email: ['', [Validators.required, Validators.email, Validators.maxLength(256)]],
      password: ['', [Validators.required, Validators.minLength(8), Validators.maxLength(128)]],
      confirmPassword: ['', [Validators.required]],
      isActive: true,
      roles: this.formBuilder.nonNullable.control<string[]>([]),
    },
    { validators: passwordMatchValidator },
  );

  readonly profileForm = this.formBuilder.nonNullable.group({
    displayName: ['', [Validators.required, Validators.maxLength(160)]],
    firstName: ['', [Validators.maxLength(100)]],
    lastName: ['', [Validators.maxLength(100)]],
    phoneNumber: ['', [Validators.maxLength(30)]],
    avatarUrl: ['', [Validators.maxLength(600)]],
    timeZone: ['', [Validators.maxLength(100)]],
    preferredLanguage: ['', [Validators.maxLength(16)]],
    bio: ['', [Validators.maxLength(1000)]],
  });

  ngOnInit(): void {
    this.updateStepItems();
    this.translate.onLangChange.subscribe(() => this.updateStepItems());
    this.loadRoles();
  }

  completeAccountStep(): void {
    if (this.createdUserId()) {
      this.activeIndex.set(1);
      return;
    }

    if (this.accountForm.invalid) {
      this.accountForm.markAllAsTouched();
      return;
    }

    this.creatingUser.set(true);

    this.usersService
      .apiUsersPost(this.buildCreatePayload())
      .pipe(finalize(() => this.creatingUser.set(false)))
      .subscribe({
        next: (user) => {
          const userId = user.id ?? null;
          const userName = user.userName ?? this.accountForm.controls.userName.value;
          const email = user.email ?? this.accountForm.controls.email.value;

          this.createdUserId.set(userId);
          this.createdUserName.set(userName);
          this.createdUserEmail.set(email);
          this.accountForm.disable({ emitEvent: false });

          if (!this.profileForm.controls.displayName.value.trim()) {
            this.profileForm.controls.displayName.setValue(userName);
          }

          this.notify.success('users.messages.create_success', { userName });

          this.activeIndex.set(1);
        },
        error: (error) => this.notify.error(error, 'users.messages.create_error'),
      });
  }

  goBackToAccount(): void {
    this.activeIndex.set(0);
  }

  skipProfile(): void {
    this.notify.success('users.messages.profile_skipped', {
      userName: this.createdUserName(),
    });

    void this.router.navigateByUrl('/admin/users/list');
  }

  saveProfile(): void {
    if (!this.createdUserId()) {
      this.activeIndex.set(0);
      return;
    }

    if (this.profileForm.invalid) {
      this.profileForm.markAllAsTouched();
      return;
    }

    this.savingProfile.set(true);

    this.profileService
      .apiProfileUserIdPut(this.createdUserId()!, this.buildProfilePayload())
      .pipe(finalize(() => this.savingProfile.set(false)))
      .subscribe({
        next: () => {
          this.notify.success('users.messages.profile_success', {
            userName: this.createdUserName(),
          });

          void this.router.navigateByUrl('/admin/users/list');
        },
        error: (error) => this.notify.error(error, 'users.messages.profile_error'),
      });
  }

  private updateStepItems(): void {
    this.stepItems.set([
      { label: this.translate.instant('users.steps.account') },
      { label: this.translate.instant('users.steps.profile') },
    ]);
  }



  private buildCreatePayload(): CreateUserRequestDto {
    const value = this.accountForm.getRawValue();

    return {
      userName: value.userName.trim(),
      email: value.email.trim(),
      password: value.password,
      isActive: value.isActive,
      roles: this.normalizeRoleNames(value.roles),
    };
  }

  private loadRoles(): void {
    this.accountForm.controls.roles.disable({ emitEvent: false });

    this.rolesService
      .apiRolesGet()
      .subscribe({
        next: (roles) => {
          this.availableRoles.set(this.mapRoleOptions(roles ?? []));
          if (!this.createdUserId()) {
            this.accountForm.controls.roles.enable({ emitEvent: false });
          }
        },
        error: (error) => {
          if (!this.createdUserId()) {
            this.accountForm.controls.roles.enable({ emitEvent: false });
          }

          this.notify.error(error, 'users.messages.load_roles_error');
        },
      });
  }

  private mapRoleOptions(roles: ReadonlyArray<RoleDto>): RoleOption[] {
    return [...roles]
      .map((role) => ({
        name: role.name?.trim() ?? '',
        description: role.description ?? null,
      }))
      .filter((role) => role.name.length > 0)
      .sort((left, right) => left.name.localeCompare(right.name));
  }

  private normalizeRoleNames(roleNames: ReadonlyArray<string | null | undefined>): string[] {
    return [...new Set(
      roleNames
        .map((roleName) => roleName?.trim() ?? '')
        .filter((roleName) => roleName.length > 0),
    )];
  }

  private buildProfilePayload(): UpdateUserProfileRequestDto {
    const value = this.profileForm.getRawValue();

    return {
      displayName: value.displayName.trim(),
      firstName: this.toNullable(value.firstName),
      lastName: this.toNullable(value.lastName),
      phoneNumber: this.toNullable(value.phoneNumber),
      avatarUrl: this.toNullable(value.avatarUrl),
      timeZone: this.toNullable(value.timeZone),
      preferredLanguage: this.toNullable(value.preferredLanguage),
      bio: this.toNullable(value.bio),
    };
  }

  private toNullable(value: string): string | null {
    const trimmed = value.trim();
    return trimmed ? trimmed : null;
  }

  isAccountInvalid(controlName: keyof typeof this.accountForm.controls): boolean {
    const control = this.accountForm.controls[controlName];
    return control.invalid && (control.touched || control.dirty);
  }

  isProfileInvalid(controlName: keyof typeof this.profileForm.controls): boolean {
    const control = this.profileForm.controls[controlName];
    return control.invalid && (control.touched || control.dirty);
  }

  get passwordsDoNotMatch(): boolean {
    return this.accountForm.hasError('passwordMismatch') &&
      (this.accountForm.controls.confirmPassword.touched || this.accountForm.controls.confirmPassword.dirty);
  }
}
