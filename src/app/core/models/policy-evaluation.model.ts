export enum RuleSeverity {
  Error = 0,
  Warning = 1,
}

export interface PolicyEvaluationIssueDto {
  ruleCode: string;
  message: string;
  messageAr: string;
  severity: RuleSeverity;
}

export interface PolicyEvaluationResultDto {
  hasErrors: boolean;
  hasWarnings: boolean;
  errors: PolicyEvaluationIssueDto[];
  warnings: PolicyEvaluationIssueDto[];
}
