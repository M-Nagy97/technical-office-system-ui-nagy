export enum RuleTargetScope {
  Leave = 0,
  Permission = 1,
}

export enum RuleSeverity {
  Error = 0,
  Warning = 1,
}

export interface PolicyRuleDto {
  id: string;
  scope: RuleTargetScope;
  scopeName: string;
  leaveTypeId?: string | null;
  ruleCode: string;
  description: string;
  severity: RuleSeverity;
  severityName: string;
  isEnabled: boolean;
  parametersJson: string;
  errorMessage: string;
  errorMessageAr: string;
  createdDate: string;
}

export interface RuleCatalogItemDto {
  scope: RuleTargetScope;
  ruleCode: string;
  name: string;
  nameAr?: string;
  description: string;
  descriptionAr?: string;
  defaultParametersJson: string;
  defaultSeverity: RuleSeverity;
  defaultErrorMessage: string;
  defaultErrorMessageAr: string;
}

export interface CreatePolicyRuleCommand {
  scope: RuleTargetScope;
  ruleCode: string;
  description: string;
  severity: RuleSeverity;
  parametersJson: string;
  errorMessage: string;
  errorMessageAr: string;
  leaveTypeId?: string | null;
  isEnabled?: boolean;
}

export interface UpdatePolicyRuleCommand {
  id: string;
  description: string;
  severity: RuleSeverity;
  parametersJson: string;
  errorMessage: string;
  errorMessageAr: string;
  isEnabled: boolean;
}
