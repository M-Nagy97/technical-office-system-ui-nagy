import { Component, OnInit, signal, inject } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule, FormArray } from '@angular/forms';
import { TranslatePipe } from '@ngx-translate/core';
import { CardModule } from 'primeng/card';
import { ButtonModule } from 'primeng/button';
import { InputNumberModule } from 'primeng/inputnumber';
import { InputTextModule } from 'primeng/inputtext';
import { InputTextareaModule } from 'primeng/inputtextarea';
import { InputSwitchModule } from 'primeng/inputswitch';
import { DropdownModule } from 'primeng/dropdown';
import { MultiSelectModule } from 'primeng/multiselect';
import {
  FormActionsComponent,
  FormFieldComponent,
  FormSectionComponent,
  NotifyService,
  SharedTableCellTemplateDirective,
  SharedTableColumn,
  SharedTableComponent,
} from '../../../shared';
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
    ReactiveFormsModule,
    TranslatePipe,
    CardModule,
    ButtonModule,
    InputNumberModule,
    InputTextModule,
    InputTextareaModule,
    InputSwitchModule,
    DropdownModule,
    MultiSelectModule,
    SharedTableComponent,
    SharedTableCellTemplateDirective,
    FormFieldComponent,
    FormSectionComponent,
    FormActionsComponent,
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
  private readonly notify = inject(NotifyService);

  readonly isEdit = signal(false);
  readonly planId = signal<string | null>(null);
  readonly saving = signal(false);
  readonly loading = signal(true);
  readonly shifts = signal<ShiftListItemDto[]>([]);
  form!: FormGroup;

  readonly planTypeOptions = [
    { labelKey: 'month_plans.type_standard', value: PlanType.NUMBER_1 },
    { labelKey: 'month_plans.type_flexible', value: PlanType.NUMBER_2 },
    { labelKey: 'month_plans.type_rotating', value: PlanType.NUMBER_3 },
  ];

  readonly modeOptions = [
    { labelKey: 'month_plans.mode_flat', value: FactorMode.NUMBER_1 },
    { labelKey: 'month_plans.mode_tiered', value: FactorMode.NUMBER_2 },
  ];

  readonly factorTypes = [
    { labelKey: 'month_plans.factor_late', value: FactorType.NUMBER_1 },
    { labelKey: 'month_plans.factor_early', value: FactorType.NUMBER_2 },
    { labelKey: 'month_plans.factor_ot_before', value: FactorType.NUMBER_3 },
    { labelKey: 'month_plans.factor_ot_after', value: FactorType.NUMBER_4 },
  ];

  readonly tierColumns: SharedTableColumn<any>[] = [
    { id: 'fromMinute', header: 'month_plans.from_minute', align: 'start' },
    { id: 'toMinute', header: 'month_plans.to_minute', align: 'start' },
    { id: 'factorValue', header: 'month_plans.factor', align: 'start' },
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
            this.notify.error(null, 'common.save_error');
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
            this.notify.error(null, 'common.save_error');
          }
        },
        error: () => this.saving.set(false),
      });
    }
  }

  private finalizeSubmit(): void {
    this.saving.set(false);
    this.notify.success('common.update_success');
    this.router.navigate(['/attendance/plans']);
  }
}
