import { Component, OnInit, signal, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { CardModule } from 'primeng/card';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { DropdownModule } from 'primeng/dropdown';
import { MessageModule } from 'primeng/message';
import { MessageService } from 'primeng/api';
import { OrganizationUnitsService, OrganizationUnitDto, UpdateOrganizationUnitCommand, CreateOrganizationUnitCommand } from '../../../core/api/generated';


@Component({
  selector: 'app-organization-unit-form',
  standalone: true,
  imports: [
    CommonModule,
    RouterLink,
    ReactiveFormsModule,
    CardModule,
    ButtonModule,
    InputTextModule,
    DropdownModule,
    MessageModule,
  ],
  templateUrl: './organization-unit-form.component.html',
  styleUrl: './organization-unit-form.component.scss',
})
export class OrganizationUnitFormComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly organizationUnitsService = inject(OrganizationUnitsService);
  private readonly messageService = inject(MessageService);

  readonly isEdit = signal(false);
  readonly id = signal<string | null>(null);
  readonly saving = signal(false);
  readonly allUnits = signal<OrganizationUnitDto[]>([]);
  readonly parentOptions = computed(() => {
    const units = this.allUnits();
    const currentId = this.id();
    const excluded = new Set<string>();
    if (currentId) {
      excluded.add(currentId);
      const queue = [currentId];
      while (queue.length) {
        const parent = queue.shift()!;
        for (const u of units) {
          if (u.parentId === parent && u.id && !excluded.has(u.id)) {
            excluded.add(u.id);
            queue.push(u.id);
          }
        }
      }
    }
    return [
      { label: '— لا يوجد (جذر) —', value: null as string | null },
      ...units
        .filter((u) => u.id && !excluded.has(u.id))
        .map((u) => ({
          label: u.name ?? u.code ?? u.id ?? '',
          value: u.id!,
        })),
    ];
  });
  form!: FormGroup;

  ngOnInit(): void {
    this.form = this.fb.group({
      companyId: [null as string | null],
      code: ['', [Validators.required, Validators.maxLength(50)]],
      name: ['', [Validators.required, Validators.maxLength(200)]],
      parentId: [null as string | null],
    });

    this.organizationUnitsService.organizationUnitsGetAll().subscribe({
      next: (res) => {
        if (res.success && res.data) {
          this.allUnits.set(res.data);
        }
      },
    });

    const routeId = this.route.snapshot.paramMap.get('id');
    if (routeId && routeId !== 'add') {
      this.id.set(routeId);
      this.isEdit.set(true);
      this.form.get('code')?.clearValidators();
      this.form.get('code')?.updateValueAndValidity();
      this.organizationUnitsService.organizationUnitsGetById(routeId).subscribe({
        next: (res) => {
          if (res.success && res.data) {
            const d = res.data;
            this.form.patchValue({
              companyId: d.companyId ?? null,
              code: d.code ?? '',
              name: d.name ?? '',
              parentId: d.parentId ?? null,
            });
          }
        },
        error: () => {
          this.messageService.add({
            severity: 'error',
            summary: 'خطأ',
            detail: 'فشل تحميل الوحدة التنظيمية',
          });
        },
      });
    }
  }

  submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const id = this.id();
    const isEdit = this.isEdit();
    this.saving.set(true);

    if (isEdit && id) {
      const cmd: UpdateOrganizationUnitCommand = {
        id,
        name: this.form.value.name ?? null,
        parentId: this.form.value.parentId ?? null,
      };
      this.organizationUnitsService.organizationUnitsUpdate(id, cmd).subscribe({
        next: (res) => {
          this.saving.set(false);
          if (res.success) {
            this.messageService.add({
              severity: 'success',
              summary: 'تم',
              detail: 'تم تحديث الوحدة التنظيمية',
            });
            this.router.navigate(['/organization-units']);
          } else {
            this.messageService.add({
              severity: 'error',
              summary: 'خطأ',
              detail: res.message ?? 'فشل التحديث',
            });
          }
        },
        error: () => {
          this.saving.set(false);
          this.messageService.add({
            severity: 'error',
            summary: 'خطأ',
            detail: 'حدث خطأ أثناء التحديث',
          });
        },
      });
    } else {
      const cmd: CreateOrganizationUnitCommand = {
        companyId: this.form.value.companyId ?? null,
        code: this.form.value.code ?? null,
        name: this.form.value.name ?? null,
        parentId: this.form.value.parentId ?? null,
      };
      this.organizationUnitsService.organizationUnitsCreate(cmd).subscribe({
        next: (res) => {
          this.saving.set(false);
          if (res.success) {
            this.messageService.add({
              severity: 'success',
              summary: 'تم',
              detail: 'تم إضافة الوحدة التنظيمية',
            });
            this.router.navigate(['/organization-units']);
          } else {
            this.messageService.add({
              severity: 'error',
              summary: 'خطأ',
              detail: res.message ?? 'فشل الإضافة',
            });
          }
        },
        error: () => {
          this.saving.set(false);
          this.messageService.add({
            severity: 'error',
            summary: 'خطأ',
            detail: 'حدث خطأ أثناء الإضافة',
          });
        },
      });
    }
  }
}
