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
import { MessageService } from 'primeng/api';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { PolicyRuleService, LeaveTypeService, LanguageService } from '../../../core/services';
import {
  PolicyRuleDto,
  RuleCatalogItemDto,
  RuleTargetScope,
  RuleSeverity,
  CreatePolicyRuleCommand,
} from '../../../core/models/policy-rule.model';
import { LeaveTypeDto } from '../../../core/services/leave-type.service';

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
    TranslateModule,
  ],
  templateUrl: './policy-rules.component.html',
  styleUrl: './policy-rules.component.scss',
})
export class PolicyRulesComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly policyRuleService = inject(PolicyRuleService);
  private readonly leaveTypeService = inject(LeaveTypeService);
  private readonly messageService = inject(MessageService);
  private readonly translate = inject(TranslateService);
  readonly languageService = inject(LanguageService);

  readonly loading = signal(false);
  readonly saving = signal(false);
  readonly rules = signal<PolicyRuleDto[]>([]);
  readonly catalog = signal<RuleCatalogItemDto[]>([]);
  readonly leaveTypes = signal<LeaveTypeDto[]>([]);

  activeTabIndex = 0;
  readonly addDialogOpen = signal(false);
  ruleForm!: FormGroup;

  readonly leaveRules = computed(() =>
    this.rules().filter((r) => r.scope === RuleTargetScope.Leave)
  );

  readonly permissionRules = computed(() =>
    this.rules().filter((r) => r.scope === RuleTargetScope.Permission)
  );

  readonly scopeOptions = [
    { label: 'Leave Rule (قواعد الإجازات)', value: RuleTargetScope.Leave },
    { label: 'Permission Rule (قواعد الأذونات)', value: RuleTargetScope.Permission },
  ];

  readonly leaveTypeOptionLabel = computed(() =>
    this.languageService.currentLang() === 'en' ? 'name' : 'arabicName'
  );

  readonly filteredCatalog = computed(() => {
    const scope = this.ruleForm?.get('scope')?.value ?? RuleTargetScope.Leave;
    return this.catalog().filter((c) => c.scope === scope);
  });

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
      parametersJson: ['{}'],
      errorMessage: ['', [Validators.required]],
      errorMessageAr: ['', [Validators.required]],
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
        this.messageService.add({
          severity: 'error',
          summary: this.translate.instant('common.error'),
          detail: 'Failed to load policy rules.',
        });
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
    this.initForm();
    this.ruleForm.patchValue({
      scope: this.activeTabIndex === 0 ? RuleTargetScope.Leave : RuleTargetScope.Permission,
    });
    this.addDialogOpen.set(true);
  }

  onScopeChanged(): void {
    this.ruleForm.patchValue({
      ruleCode: '',
      leaveTypeId: null,
      parametersJson: '{}',
      errorMessage: '',
      errorMessageAr: '',
    });
  }

  onTemplateSelected(ruleCode: string): void {
    const item = this.catalog().find((c) => c.ruleCode === ruleCode);
    if (!item) return;

    this.ruleForm.patchValue({
      description: item.description,
      severity: item.defaultSeverity,
      parametersJson: item.defaultParametersJson,
      errorMessage: item.defaultErrorMessage,
      errorMessageAr: item.defaultErrorMessageAr,
    });
  }

  toggleRule(rule: PolicyRuleDto, newState: boolean): void {
    const oldState = rule.isEnabled;
    rule.isEnabled = newState;

    this.policyRuleService.toggleRule(rule.id, newState).subscribe({
      next: () => {
        this.messageService.add({
          severity: 'success',
          summary: this.translate.instant('common.success'),
          detail: `Rule ${rule.ruleCode} ${newState ? 'enabled' : 'disabled'} successfully.`,
        });
      },
      error: (err) => {
        rule.isEnabled = oldState;
        const isAr = this.languageService.currentLang() === 'ar';
        const msg =
          (isAr ? err?.error?.messageAr : err?.error?.message) ||
          err?.error?.message ||
          err?.error?.messageAr ||
          'Failed to update rule status.';

        this.messageService.add({
          severity: 'error',
          summary: this.translate.instant('common.error'),
          detail: msg,
        });
      },
    });
  }

  submitAddRule(): void {
    if (this.ruleForm.invalid) {
      this.ruleForm.markAllAsTouched();
      return;
    }

    this.saving.set(true);
    const val = this.ruleForm.value;

    const command: CreatePolicyRuleCommand = {
      scope: val.scope,
      ruleCode: val.ruleCode,
      description: val.description || val.ruleCode,
      severity: val.severity,
      parametersJson: val.parametersJson || '{}',
      errorMessage: val.errorMessage,
      errorMessageAr: val.errorMessageAr,
      leaveTypeId: val.scope === RuleTargetScope.Leave ? val.leaveTypeId : null,
      isEnabled: true,
    };

    this.policyRuleService.createRule(command).subscribe({
      next: () => {
        this.saving.set(false);
        this.addDialogOpen.set(false);
        this.messageService.add({
          severity: 'success',
          summary: this.translate.instant('common.success'),
          detail: 'Policy rule created successfully.',
        });
        this.loadRules();
      },
      error: (err) => {
        this.saving.set(false);
        const isAr = this.languageService.currentLang() === 'ar';
        const msg =
          (isAr ? err?.error?.messageAr : err?.error?.message) ||
          err?.error?.message ||
          err?.error?.messageAr ||
          'Failed to create policy rule.';

        this.messageService.add({
          severity: 'error',
          summary: this.translate.instant('common.error'),
          detail: msg,
        });
      },
    });
  }

  getLeaveTypeName(typeId?: string | null): string {
    if (!typeId) return '-';
    const type = this.leaveTypes().find((t) => t.id === typeId);
    if (!type) return typeId;
    return this.languageService.currentLang() === 'en' ? type.name : (type.arabicName || type.name);
  }
}
