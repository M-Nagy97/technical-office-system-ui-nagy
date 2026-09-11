import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { CardModule } from 'primeng/card';
import { ButtonModule } from 'primeng/button';
import { TableModule } from 'primeng/table';
import { TabViewModule } from 'primeng/tabview';
import { TagModule } from 'primeng/tag';
import { InputSwitchModule } from 'primeng/inputswitch';
import { DialogModule } from 'primeng/dialog';
import { DropdownModule } from 'primeng/dropdown';
import { RadioButtonModule } from 'primeng/radiobutton';
import { InputTextModule } from 'primeng/inputtext';
import { InputNumberModule } from 'primeng/inputnumber';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { TooltipModule } from 'primeng/tooltip';
import { ConfirmationService, MessageService } from 'primeng/api';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { PolicyRuleService, LeaveTypeService, LanguageService } from '../../../core/services';
import {
  PolicyRuleDto,
  RuleCatalogItemDto,
  RuleTargetScope,
  RuleSeverity,
  CreatePolicyRuleCommand,
  UpdatePolicyRuleCommand,
} from '../../../core/models/policy-rule.model';
import { LeaveTypeDto } from '../../../core/services/leave-type.service';
import {
  ParamFieldSchema,
  buildParamFieldsFromValues,
  mergeRuleParameters,
  serializeParametersObject,
} from './param-schema.registry';

@Component({
  selector: 'app-policy-rules',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    CardModule,
    ButtonModule,
    TableModule,
    TabViewModule,
    TagModule,
    InputSwitchModule,
    DialogModule,
    DropdownModule,
    RadioButtonModule,
    InputTextModule,
    InputNumberModule,
    ConfirmDialogModule,
    TooltipModule,
    TranslateModule,
  ],
  providers: [ConfirmationService],
  templateUrl: './policy-rules.component.html',
  styleUrl: './policy-rules.component.scss',
})
export class PolicyRulesComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly policyRuleService = inject(PolicyRuleService);
  private readonly leaveTypeService = inject(LeaveTypeService);
  private readonly messageService = inject(MessageService);
  private readonly confirmationService = inject(ConfirmationService);
  private readonly translate = inject(TranslateService);
  readonly languageService = inject(LanguageService);

  readonly loading = signal(false);
  readonly saving = signal(false);
  readonly rules = signal<PolicyRuleDto[]>([]);
  readonly catalog = signal<RuleCatalogItemDto[]>([]);
  readonly leaveTypes = signal<LeaveTypeDto[]>([]);

  activeTabIndex = 0;
  readonly dialogOpen = signal(false);
  readonly isEditMode = signal(false);
  readonly editingRuleId = signal<string | null>(null);
  readonly paramFields = signal<ParamFieldSchema[]>([]);
  readonly paramValues = signal<Record<string, unknown>>({});
  /** Drives catalog filtering (form scope alone is not tracked by computed). */
  readonly selectedScope = signal<RuleTargetScope>(RuleTargetScope.Leave);

  ruleForm!: FormGroup;

  readonly leaveRules = computed(() =>
    this.rules().filter((r) => Number(r.scope) === RuleTargetScope.Leave)
  );

  readonly permissionRules = computed(() =>
    this.rules().filter((r) => Number(r.scope) === RuleTargetScope.Permission)
  );

  readonly scopeOptions = [
    { label: 'Leave Rule (قواعد الإجازات)', value: RuleTargetScope.Leave },
    { label: 'Permission Rule (قواعد الأذونات)', value: RuleTargetScope.Permission },
  ];

  readonly leaveTypeOptionLabel = computed(() =>
    this.languageService.currentLang() === 'en' ? 'name' : 'arabicName'
  );

  readonly filteredCatalog = computed(() => {
    const scope = Number(this.selectedScope());
    const isAr = this.languageService.currentLang() === 'ar';
    return this.catalog()
      .filter((c) => Number(c.scope) === scope)
      .map((c) => ({
        ...c,
        displayName: `${isAr ? c.nameAr || c.name : c.name} (${c.ruleCode})`,
      }));
  });

  /** Shown when MatchMode is part of the active rule parameters. */
  readonly showMatchModeRadios = computed(() =>
    Object.prototype.hasOwnProperty.call(this.paramValues(), 'MatchMode')
  );

  readonly matchModeOptions = [
    { labelEn: 'Per day', labelAr: 'حسب اليوم فقط', value: 'ByDay' },
    { labelEn: 'Per day and time', labelAr: 'حسب اليوم والوقت', value: 'ByDayAndTime' },
  ];

  /** Dynamic fields excluding MatchMode (rendered as radios above). */
  readonly editorParamFields = computed(() =>
    this.paramFields().filter((field) => field.key !== 'MatchMode')
  );

  readonly dialogTitleKey = computed(() =>
    this.isEditMode() ? 'leave.rules.dialog_edit_title' : 'leave.rules.dialog_create_title'
  );

  ngOnInit(): void {
    this.initForm();
    this.loadRules();
    this.loadCatalog();
    this.loadLeaveTypes();
  }

  private initForm(): void {
    this.ruleForm = this.fb.group({
      scope: [RuleTargetScope.Leave, [Validators.required]],
      ruleCode: ['', [Validators.required]],
      description: [''],
      leaveTypeId: [null],
      severity: [RuleSeverity.Warning, [Validators.required]],
      errorMessage: ['', [Validators.required]],
      errorMessageAr: ['', [Validators.required]],
      isEnabled: [true],
    });
  }

  loadRules(): void {
    this.loading.set(true);
    this.policyRuleService.getRules().subscribe({
      next: (data) => {
        this.rules.set(data || []);
        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
      },
    });
  }

  loadCatalog(): void {
    this.policyRuleService.getCatalog().subscribe({
      next: (items) => this.catalog.set(items || []),
      error: () => {},
    });
  }

  loadLeaveTypes(): void {
    this.leaveTypeService.getAll().subscribe({
      next: (types) => this.leaveTypes.set(types || []),
      error: () => {},
    });
  }

  onTabChange(index: number): void {
    this.activeTabIndex = index;
  }

  openAddDialog(): void {
    this.isEditMode.set(false);
    this.editingRuleId.set(null);
    this.initForm();
    this.paramFields.set([]);
    this.paramValues.set({});
    const scope =
      this.activeTabIndex === 0 ? RuleTargetScope.Leave : RuleTargetScope.Permission;
    this.selectedScope.set(scope);
    this.ruleForm.patchValue({ scope });
    this.ruleForm.get('scope')?.enable();
    this.ruleForm.get('ruleCode')?.enable();
    this.ruleForm.get('leaveTypeId')?.enable();
    this.dialogOpen.set(true);
  }

  openEditDialog(rule: PolicyRuleDto): void {
    this.isEditMode.set(true);
    this.editingRuleId.set(rule.id);
    this.initForm();
    const scope = Number(rule.scope) as RuleTargetScope;
    this.selectedScope.set(scope);
    this.ruleForm.patchValue({
      scope,
      ruleCode: rule.ruleCode,
      description: rule.description,
      leaveTypeId: rule.leaveTypeId ?? null,
      severity: rule.severity,
      errorMessage: rule.errorMessage,
      errorMessageAr: rule.errorMessageAr,
      isEnabled: rule.isEnabled,
    });
    this.ruleForm.get('scope')?.disable();
    this.ruleForm.get('ruleCode')?.disable();
    this.ruleForm.get('leaveTypeId')?.disable();
    this.applyParametersJson(rule.parametersJson, rule.ruleCode);
    this.dialogOpen.set(true);
  }

  onScopeChanged(): void {
    const scope = Number(this.ruleForm.get('scope')?.value) as RuleTargetScope;
    this.selectedScope.set(scope);
    this.ruleForm.patchValue({
      ruleCode: '',
      leaveTypeId: null,
      description: '',
      errorMessage: '',
      errorMessageAr: '',
    });
    this.paramFields.set([]);
    this.paramValues.set({});
  }

  onTemplateSelected(value: string | { ruleCode?: string }): void {
    const ruleCode = typeof value === 'string' ? value : value?.ruleCode;
    if (!ruleCode) return;

    const item = this.catalog().find((c) => c.ruleCode === ruleCode);
    if (!item) return;

    this.ruleForm.patchValue({
      ruleCode,
      description: item.description,
      severity: item.defaultSeverity,
      errorMessage: item.defaultErrorMessage,
      errorMessageAr: item.defaultErrorMessageAr,
    });
    this.applyParametersJson(item.defaultParametersJson, ruleCode);
  }

  private applyParametersJson(parametersJson: string | null | undefined, ruleCode?: string): void {
    const catalogItem = ruleCode
      ? this.catalog().find((c) => c.ruleCode === ruleCode)
      : undefined;
    const merged = mergeRuleParameters(
      parametersJson,
      ruleCode,
      catalogItem?.defaultParametersJson
    );

    // Always surface MatchMode for permission department concurrency.
    if (ruleCode === 'DEPARTMENT_PERMISSION_CONCURRENCY' && merged['MatchMode'] == null) {
      merged['MatchMode'] = 'ByDayAndTime';
    }

    this.paramValues.set(merged);
    this.paramFields.set(buildParamFieldsFromValues(merged));
  }

  getMatchModeLabel(option: { labelEn: string; labelAr: string }): string {
    return this.languageService.currentLang() === 'ar' ? option.labelAr : option.labelEn;
  }

  onParamChange(key: string, value: unknown): void {
    this.paramValues.update((current) => ({ ...current, [key]: value }));
  }

  getParamLabel(field: ParamFieldSchema): string {
    return this.languageService.currentLang() === 'ar' ? field.labelAr : field.labelEn;
  }

  getParamSuffix(field: ParamFieldSchema): string {
    if (this.languageService.currentLang() === 'ar') {
      return field.suffixAr || '';
    }
    return field.suffixEn || '';
  }

  getSelectOptions(field: ParamFieldSchema) {
    return (field.options || []).map((o) => ({
      label: this.languageService.currentLang() === 'ar' ? o.labelAr : o.labelEn,
      value: o.value,
    }));
  }

  toggleRule(rule: PolicyRuleDto, newState: boolean): void {
    const oldState = rule.isEnabled;
    rule.isEnabled = newState;

    this.policyRuleService.toggleRule(rule.id, newState).subscribe({
      next: () => {
        this.messageService.add({
          severity: 'success',
          summary: this.translate.instant('common.success'),
          detail: this.translate.instant(
            newState ? 'leave.rules.toggle_enabled_success' : 'leave.rules.toggle_disabled_success'
          ),
        });
      },
      error: () => {
        rule.isEnabled = oldState;
      },
    });
  }

  confirmDelete(rule: PolicyRuleDto): void {
    this.confirmationService.confirm({
      header: this.translate.instant('leave.rules.delete_confirm_title'),
      message: this.translate.instant('leave.rules.delete_confirm_msg', { name: rule.ruleCode }),
      icon: 'pi pi-exclamation-triangle',
      acceptLabel: this.translate.instant('leave.rules.confirm_delete_btn'),
      rejectLabel: this.translate.instant('common.cancel'),
      acceptButtonStyleClass: 'p-button-danger',
      accept: () => this.deleteRule(rule),
    });
  }

  private deleteRule(rule: PolicyRuleDto): void {
    this.policyRuleService.deleteRule(rule.id).subscribe({
      next: () => {
        this.messageService.add({
          severity: 'success',
          summary: this.translate.instant('common.success'),
          detail: this.translate.instant('leave.rules.delete_success'),
        });
        this.loadRules();
      },
    });
  }

  submitRule(): void {
    if (this.ruleForm.invalid) {
      this.ruleForm.markAllAsTouched();
      this.messageService.add({
        severity: 'warn',
        summary: this.translate.instant('common.warning'),
        detail: this.translate.instant('leave.rules.form_invalid_warn'),
      });
      return;
    }

    const raw = this.ruleForm.getRawValue();
    const parametersJson = serializeParametersObject(this.paramValues());

    this.saving.set(true);

    if (this.isEditMode()) {
      const id = this.editingRuleId()!;
      const command: UpdatePolicyRuleCommand = {
        id,
        description: raw.description || raw.ruleCode,
        severity: raw.severity,
        parametersJson,
        errorMessage: raw.errorMessage,
        errorMessageAr: raw.errorMessageAr,
        isEnabled: raw.isEnabled,
      };

      this.policyRuleService.updateRule(id, command).subscribe({
        next: () => {
          this.saving.set(false);
          this.dialogOpen.set(false);
          this.messageService.add({
            severity: 'success',
            summary: this.translate.instant('common.success'),
            detail: this.translate.instant('leave.rules.update_success'),
          });
          this.loadRules();
        },
        error: () => {
          this.saving.set(false);
        },
      });
      return;
    }

    const command: CreatePolicyRuleCommand = {
      scope: raw.scope,
      ruleCode: raw.ruleCode,
      description: raw.description || raw.ruleCode,
      severity: raw.severity,
      parametersJson,
      errorMessage: raw.errorMessage,
      errorMessageAr: raw.errorMessageAr,
      leaveTypeId: raw.scope === RuleTargetScope.Leave ? raw.leaveTypeId : null,
      isEnabled: raw.isEnabled ?? true,
    };

    this.policyRuleService.createRule(command).subscribe({
      next: () => {
        this.saving.set(false);
        this.dialogOpen.set(false);
        this.messageService.add({
          severity: 'success',
          summary: this.translate.instant('common.success'),
          detail: this.translate.instant('leave.rules.create_success'),
        });
        this.loadRules();
      },
      error: () => {
        this.saving.set(false);
      },
    });
  }

  getLeaveTypeName(typeId?: string | null): string {
    if (!typeId) return '-';
    const type = this.leaveTypes().find((t) => t.id === typeId);
    if (!type) return typeId;
    return this.languageService.currentLang() === 'en' ? type.name : type.arabicName || type.name;
  }
}
