import { Component, OnInit, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule, FormArray } from '@angular/forms';
import { CardModule } from 'primeng/card';
import { ButtonModule } from 'primeng/button';
import { InputNumberModule } from 'primeng/inputnumber';
import { InputTextModule } from 'primeng/inputtext';
import { InputTextareaModule } from 'primeng/inputtextarea';
import { InputSwitchModule } from 'primeng/inputswitch';
import { DropdownModule } from 'primeng/dropdown';
import { MessageModule } from 'primeng/message';
import { MessageService } from 'primeng/api';
import { TooltipModule } from 'primeng/tooltip';
import { MultiSelectModule } from 'primeng/multiselect';
import { SharedTableComponent } from '../../../shared/components/shared-table/shared-table.component';
import { SharedTableCellTemplateDirective } from '../../../shared/components/shared-table/shared-table-cell-template.directive';
import { SharedTableColumn } from '../../../shared/components/shared-table/shared-table.models';
import { map } from 'rxjs/operators';
import {
  PlansService,
  CreatePlanCommand,
  UpdatePlanCommand,
  PlanDto,
  FactorType,
  FactorMode,
  ShiftsService,
} from '../../../core/api/generated';

// Temporary types until API client is regenerated
export enum PlanType {
  NUMBER_1 = 1,
  NUMBER_2 = 2,
  NUMBER_3 = 3
}
export type ShiftListItemDto = any;

@Component({
  selector: 'app-month-plan-form',
  standalone: true,
  imports: [
    CommonModule,
    RouterLink,
    ReactiveFormsModule,
    CardModule,
    ButtonModule,
    InputNumberModule,
    InputTextModule,
    InputTextareaModule,
    InputSwitchModule,
    DropdownModule,
    MessageModule,
    TooltipModule,
    MultiSelectModule,
    SharedTableComponent,
    SharedTableCellTemplateDirective,
  ],
  templateUrl: './month-plan-form.component.html',
  styleUrl: './month-plan-form.component.scss',
})
export class MonthPlanFormComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly plansApi = inject(PlansService);
  private readonly shiftsApi = inject(ShiftsService);
  private readonly messageService = inject(MessageService);

  readonly isEdit = signal(false);
  readonly planId = signal<string | null>(null);
  readonly saving = signal(false);
  readonly loading = signal(true);
  readonly shifts = signal<ShiftListItemDto[]>([]);
  form!: FormGroup;

  readonly planTypeOptions = [
    { label: 'Standard', value: PlanType.NUMBER_1 },
    { label: 'Flexible', value: PlanType.NUMBER_2 },
    { label: 'Rotating', value: PlanType.NUMBER_3 },
  ];

  readonly modeOptions = [
    { label: 'ثابت (Flat)', value: FactorMode.NUMBER_1 },
    { label: 'شرائح (Tiered)', value: FactorMode.NUMBER_2 },
  ];

  readonly factorTypes = [
    { label: 'تأخير (Late)', value: FactorType.NUMBER_1 },
    { label: 'انصراف مبكر (Early Leave)', value: FactorType.NUMBER_2 },
    { label: 'إضافي قبل (OT Before)', value: FactorType.NUMBER_3 },
    { label: 'إضافي بعد (OT After)', value: FactorType.NUMBER_4 },
  ];

  // Shared table config for the tier editor (FormArray rows).
  readonly tierColumns: SharedTableColumn<any>[] = [
    { id: 'fromMinute', header: 'من (دقيقة)', align: 'start' },
    { id: 'toMinute', header: 'إلى (دقيقة)', align: 'start' },
    { id: 'factorValue', header: 'العامل', align: 'start' },
    { id: 'delete', header: '', width: '3rem', align: 'end' },
  ];

  ngOnInit(): void {
    this.initForm();
    this.loadShifts();
    const id = this.route.snapshot.paramMap.get('id');
    if (id && id !== 'new') {
      this.planId.set(id);
      this.isEdit.set(true);
      this.loadPlan(id);
    } else {
      this.loading.set(false);
    }
  }

  private loadShifts(): void {
    this.shiftsApi.shiftsGetAll().pipe(map(r => r.data ?? [])).subscribe(list => this.shifts.set(list));
  }

  private initForm(): void {
    this.form = this.fb.group({
      name: ['', [Validators.required, Validators.maxLength(100)]],
      description: ['', [Validators.maxLength(255)]],
      isActive: [true],
      planType: [PlanType.NUMBER_1, Validators.required],
      minDeductMinutes: [5, [Validators.required, Validators.min(0)]],
      deductUnitMinutes: [1, [Validators.required, Validators.min(1)]],
      selectedShiftIds: [[]],
      factorProfiles: this.fb.array([]),
    });

    // Initialize default factor profiles if creating new
    if (!this.isEdit()) {
      this.factorTypes.forEach(ft => this.addFactorProfile(ft.value));
    }
  }

  get factorProfiles(): FormArray {
    return this.form.get('factorProfiles') as FormArray;
  }

  addFactorProfile(type: FactorType): void {
    const group = this.fb.group({
      factorType: [type, Validators.required],
      mode: [FactorMode.NUMBER_1, Validators.required],
      flatValue: [null],
      tiers: this.fb.array([]),
    });
    this.factorProfiles.push(group);
  }

  getTiers(profileIndex: number): FormArray {
    return this.factorProfiles.at(profileIndex).get('tiers') as FormArray;
  }

  addTier(profileIndex: number): void {
    const tiers = this.getTiers(profileIndex);
    tiers.push(this.fb.group({
      fromMinute: [0, Validators.required],
      toMinute: [null],
      factorValue: [1, Validators.required],
    }));
  }

  removeTier(profileIndex: number, tierIndex: number): void {
    this.getTiers(profileIndex).removeAt(tierIndex);
  }

  private loadPlan(id: string): void {
    this.plansApi.plansGetById(id).pipe(map(r => r.data)).subscribe({
      next: (plan) => {
        if (plan) {
          // Note: shifts for plan might need a separate call if not in PlanDto
          // For now, let's assume we fetch them separately or they are in another endpoint.
          // Since I just added GetShiftsByPlan endpoint, I'll use direct HTTP or wait for regeneration.
          // Let's use a workaround for now if needed.

          this.form.patchValue({
            name: (plan as any).name,
            description: (plan as any).description,
            isActive: (plan as any).isActive,
            planType: (plan as any).planType,
            minDeductMinutes: (plan as any).minDeductMinutes,
            deductUnitMinutes: (plan as any).deductUnitMinutes,
          });

          this.plansApi.plansGetShifts(id).pipe(map(r => r.data ?? [])).subscribe(assignedShifts => {
            this.form.patchValue({ selectedShiftIds: assignedShifts.map((s) => s.id!) });
          });

          const profilesArray = this.factorProfiles;
          profilesArray.clear();
          (plan.factorProfiles ?? []).forEach(p => {
             const pGroup = this.fb.group({
               id: [p.id],
               factorType: [p.factorType],
               mode: [p.mode],
               flatValue: [p.flatValue],
               tiers: this.fb.array((p.tiers ?? []).map(t => this.fb.group({
                 id: [t.id],
                 fromMinute: [t.fromMinute],
                 toMinute: [t.toMinute],
                 factorValue: [t.factorValue]
               })))
             });
             profilesArray.push(pGroup);
          });
        }
        this.loading.set(false);
      },
      error: () => this.loading.set(false)
    });
  }

  submit(): void {
    if (this.form.invalid) {
      console.log('Form is invalid:', this.form.errors, this.form.value);
      this.form.markAllAsTouched();
      return;
    }

    this.saving.set(true);
    const val = this.form.value;
    const { selectedShiftIds, ...planData } = val;
    const shiftIds = (selectedShiftIds as string[] | null | undefined) ?? [];

    if (this.isEdit()) {
      const planId = this.planId()!;
      const cmd: UpdatePlanCommand = {
        id: planId,
        ...planData,
        shiftIds,
      };

      this.plansApi.plansUpdate(planId, cmd).subscribe({
        next: (res) => {
          if (res.success) {
            this.finalizeSubmit();
          } else {
            this.saving.set(false);
            this.messageService.add({ severity: 'error', summary: 'خطأ', detail: 'فشل التحديث' });
          }
        },
        error: () => this.saving.set(false),
      });
    } else {
      const cmd: CreatePlanCommand = {
        ...planData,
        shiftIds,
      };
      this.plansApi.plansCreate(cmd).subscribe({
        next: (res) => {
          if (res.success && res.data) {
            this.finalizeSubmit();
          } else {
            this.saving.set(false);
            this.messageService.add({ severity: 'error', summary: 'خطأ', detail: 'فشل الإنشاء' });
          }
        },
        error: () => this.saving.set(false),
      });
    }
  }

  private finalizeSubmit(): void {
    this.saving.set(false);
    this.messageService.add({ severity: 'success', summary: 'تم', detail: 'تم الحفظ بنجاح' });
    this.router.navigate(['/attendance/plans']);
  }
}
