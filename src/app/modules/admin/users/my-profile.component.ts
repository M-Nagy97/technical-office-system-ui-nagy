import { Component, OnInit, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { TranslatePipe } from '@ngx-translate/core';
import { finalize } from 'rxjs';
import { ButtonModule } from 'primeng/button';
import { CardModule } from 'primeng/card';
import { InputTextModule } from 'primeng/inputtext';
import { InputTextareaModule } from 'primeng/inputtextarea';
import { ProgressSpinnerModule } from 'primeng/progressspinner';
import {
  ProfileService,
  UpdateUserProfileRequestDto,
  UserProfileDto,
} from '../../../core/api/identity-generated';
import { AuthSessionService } from '../../../core/auth/auth-session.service';
import {
  BUTTON_PRESET_CLASS,
  NotifyService,
  PageHeaderComponent,
} from '../../../shared';

@Component({
  selector: 'app-my-profile',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    TranslatePipe,
    ButtonModule,
    CardModule,
    InputTextModule,
    InputTextareaModule,
    ProgressSpinnerModule,
    PageHeaderComponent,
  ],
  templateUrl: './my-profile.component.html',
  styleUrl: './my-profile.component.scss',
})
export class MyProfileComponent implements OnInit {
  private readonly formBuilder = inject(FormBuilder);
  private readonly profileService = inject(ProfileService);
  private readonly notify = inject(NotifyService);
  private readonly authSession = inject(AuthSessionService);
  readonly BUTTON_PRESET_CLASS = BUTTON_PRESET_CLASS;

  readonly loading = signal(true);
  readonly submitting = signal(false);
  readonly editing = signal(false);
  readonly profile = signal<UserProfileDto | null>(null);

  readonly form = this.formBuilder.nonNullable.group({
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
    this.loadProfile();
  }

  toggleEdit(): void {
    if (!this.editing()) {
      // Entering edit mode — populate form from profile
      const p = this.profile();
      if (p) {
        this.form.patchValue({
          displayName: p.displayName ?? '',
          firstName: p.firstName ?? '',
          lastName: p.lastName ?? '',
          phoneNumber: p.phoneNumber ?? '',
          avatarUrl: p.avatarUrl ?? '',
          timeZone: p.timeZone ?? '',
          preferredLanguage: p.preferredLanguage ?? '',
          bio: p.bio ?? '',
        });
      }
    }
    this.editing.update((v) => !v);
  }

  cancelEdit(): void {
    this.editing.set(false);
  }

  saveProfile(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const userId = this.authSession.currentUserId();
    if (!userId) return;

    this.submitting.set(true);

    this.profileService
      .apiProfileUserIdPut(userId, this.buildPayload())
      .pipe(finalize(() => this.submitting.set(false)))
      .subscribe({
        next: (updated) => {
          this.profile.set(updated);
          this.editing.set(false);
          this.notify.success('users.my_profile.save_success');
        },
        error: (error) => this.notify.error(error, 'users.my_profile.save_error'),
      });
  }

  private loadProfile(): void {
    const userId = this.authSession.currentUserId();
    if (!userId) {
      this.loading.set(false);
      return;
    }

    this.loading.set(true);

    this.profileService
      .apiProfileUserIdGet(userId)
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe({
        next: (profile) => {
          this.profile.set(profile);
        },
        error: (error) => this.notify.error(error, 'users.my_profile.load_error'),
      });
  }

  private buildPayload(): UpdateUserProfileRequestDto {
    const v = this.form.getRawValue();
    return {
      displayName: v.displayName.trim(),
      firstName: this.toNullable(v.firstName),
      lastName: this.toNullable(v.lastName),
      phoneNumber: this.toNullable(v.phoneNumber),
      avatarUrl: this.toNullable(v.avatarUrl),
      timeZone: this.toNullable(v.timeZone),
      preferredLanguage: this.toNullable(v.preferredLanguage),
      bio: this.toNullable(v.bio),
    };
  }

  private toNullable(value: string): string | null {
    const trimmed = value.trim();
    return trimmed ? trimmed : null;
  }

  isInvalid(controlName: keyof typeof this.form.controls): boolean {
    const control = this.form.controls[controlName];
    return control.invalid && (control.touched || control.dirty);
  }
}
