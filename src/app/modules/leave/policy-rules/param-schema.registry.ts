/**
 * Parameter Schema Registry & Default Rule Catalog
 *
 * Maps known JSON parameter keys used in policy rules to:
 *  - Arabic label (labelAr)
 *  - Input type (number | boolean | string | multiselect)
 *  - Optional constraints (min, max, step, options, suffix)
 *
 * Also provides built-in fallback rule catalog templates for Leave and Permission scopes
 * so the catalog dropdown is always populated even before or without backend seed data.
 */

import { RuleCatalogItemDto, RuleSeverity, RuleTargetScope } from '../../../core/models/policy-rule.model';

export type ParamFieldType = 'number' | 'boolean' | 'string' | 'multiselect';

export interface ParamFieldOption {
  label: string;
  value: any;
}

export interface ParamFieldSchema {
  key: string;
  labelAr: string;
  labelEn?: string;
  type: ParamFieldType;
  min?: number;
  max?: number;
  step?: number;
  options?: ParamFieldOption[];
  suffix?: string;
  suffixEn?: string;
  placeholder?: string;
}

const PARAM_KEY_REGISTRY: Record<string, Omit<ParamFieldSchema, 'key'>> = {
  // ─── Days / Notice ───────────────────────────────────────────────────────
  minDays: {
    labelAr: 'الحد الأدنى للأيام المطلوبة',
    labelEn: 'Minimum required days',
    type: 'number',
    min: 0,
    suffix: 'يوم',
    suffixEn: 'days',
  },
  maxDays: {
    labelAr: 'الحد الأقصى للأيام المسموحة',
    labelEn: 'Maximum allowed days',
    type: 'number',
    min: 0,
    suffix: 'يوم',
    suffixEn: 'days',
  },
  minNoticeDays: {
    labelAr: 'أدنى أيام الإشعار المبكر قبل الإجازة',
    labelEn: 'Minimum advance notice (days)',
    type: 'number',
    min: 0,
    suffix: 'يوم',
    suffixEn: 'days',
  },
  advanceNoticeDays: {
    labelAr: 'أيام التقديم المسبق المطلوبة',
    labelEn: 'Required advance submission days',
    type: 'number',
    min: 0,
    suffix: 'يوم',
    suffixEn: 'days',
  },
  maxConsecutiveDays: {
    labelAr: 'الحد الأقصى للأيام المتتالية في طلب واحد',
    labelEn: 'Maximum consecutive days per request',
    type: 'number',
    min: 0,
    suffix: 'يوم',
    suffixEn: 'days',
  },
  minInterval: {
    labelAr: 'الحد الأدنى بين طلبين متتاليين',
    labelEn: 'Minimum interval between requests (days)',
    type: 'number',
    min: 0,
    suffix: 'يوم',
    suffixEn: 'days',
  },
  bufferDays: {
    labelAr: 'أيام الهامش الاحتياطي',
    labelEn: 'Buffer days',
    type: 'number',
    min: 0,
    suffix: 'يوم',
    suffixEn: 'days',
  },
  minBalance: {
    labelAr: 'الحد الأدنى للرصيد المتبقي بعد الطلب',
    labelEn: 'Minimum remaining balance after request',
    type: 'number',
    min: 0,
    suffix: 'يوم',
    suffixEn: 'days',
  },

  // ─── Count / Frequency ───────────────────────────────────────────────────
  maxAllowed: {
    labelAr: 'العدد الأقصى المسموح به',
    labelEn: 'Maximum allowed count',
    type: 'number',
    min: 0,
  },
  maxPerMonth: {
    labelAr: 'الحد الأقصى لعدد الطلبات في الشهر',
    labelEn: 'Maximum requests per month',
    type: 'number',
    min: 0,
  },
  maxPerYear: {
    labelAr: 'الحد الأقصى لعدد الطلبات في السنة',
    labelEn: 'Maximum requests per year',
    type: 'number',
    min: 0,
  },
  maxOverlap: {
    labelAr: 'الحد الأقصى للغياب المتزامن في نفس القسم',
    labelEn: 'Maximum simultaneous department absences',
    type: 'number',
    min: 0,
  },

  // ─── Hours ───────────────────────────────────────────────────────────────
  maxHours: {
    labelAr: 'الحد الأقصى للساعات',
    labelEn: 'Maximum hours',
    type: 'number',
    min: 0,
    step: 0.5,
    suffix: 'ساعة',
    suffixEn: 'hrs',
  },
  maxHoursPerDay: {
    labelAr: 'الحد الأقصى للساعات في اليوم',
    labelEn: 'Maximum hours per day',
    type: 'number',
    min: 0,
    step: 0.5,
    suffix: 'ساعة',
    suffixEn: 'hrs',
  },
  maxHoursPerMonth: {
    labelAr: 'الحد الأقصى للساعات في الشهر',
    labelEn: 'Maximum hours per month',
    type: 'number',
    min: 0,
    step: 0.5,
    suffix: 'ساعة',
    suffixEn: 'hrs',
  },
  minHours: {
    labelAr: 'الحد الأدنى للساعات',
    labelEn: 'Minimum hours',
    type: 'number',
    min: 0,
    step: 0.5,
    suffix: 'ساعة',
    suffixEn: 'hrs',
  },

  // ─── Boolean flags ───────────────────────────────────────────────────────
  requiresApproval: {
    labelAr: 'يستلزم موافقة مسبقة من المدير المباشر',
    labelEn: 'Requires direct manager pre-approval',
    type: 'boolean',
  },
  requiresDocument: {
    labelAr: 'يشترط إرفاق تقرير أو مستند رسمي',
    labelEn: 'Requires official / medical report attachment',
    type: 'boolean',
  },
  allowWeekends: {
    labelAr: 'السماح بتقديم الطلب في أيام الإجازة الرسمية والعطلات',
    labelEn: 'Allow requests on official holidays / weekends',
    type: 'boolean',
  },
  countWeekends: {
    labelAr: 'احتساب أيام العطل الرسمية ضمن مدة الإجازة',
    labelEn: 'Count official holidays within leave duration',
    type: 'boolean',
  },
  allowSplitting: {
    labelAr: 'السماح بتقسيم الإجازة على دفعات',
    labelEn: 'Allow splitting leave into batches',
    type: 'boolean',
  },
  allowPartialDay: {
    labelAr: 'السماح بإجازة جزء من اليوم',
    labelEn: 'Allow partial day leave',
    type: 'boolean',
  },

  // ─── Weekdays ────────────────────────────────────────────────────────────
  allowedWeekdays: {
    labelAr: 'أيام الأسبوع المسموح بتقديم الطلب فيها',
    labelEn: 'Allowed weekdays for requests',
    type: 'multiselect',
    options: [
      { label: 'الأحد', value: 0 },
      { label: 'الاثنين', value: 1 },
      { label: 'الثلاثاء', value: 2 },
      { label: 'الأربعاء', value: 3 },
      { label: 'الخميس', value: 4 },
      { label: 'الجمعة', value: 5 },
      { label: 'السبت', value: 6 },
    ],
  },
  excludedWeekdays: {
    labelAr: 'أيام الأسبوع المستثناة',
    labelEn: 'Excluded weekdays',
    type: 'multiselect',
    options: [
      { label: 'الأحد', value: 0 },
      { label: 'الاثنين', value: 1 },
      { label: 'الثلاثاء', value: 2 },
      { label: 'الأربعاء', value: 3 },
      { label: 'الخميس', value: 4 },
      { label: 'الجمعة', value: 5 },
      { label: 'السبت', value: 6 },
    ],
  },
};

// ---------------------------------------------------------------------------
// Built-in Default Catalogs (Leave & Permission)
// ---------------------------------------------------------------------------

export const DEFAULT_LEAVE_RULE_CATALOG: RuleCatalogItemDto[] = [
  {
    scope: RuleTargetScope.Leave,
    ruleCode: 'LEAVE_MIN_NOTICE_DAYS',
    name: 'الحد الأدنى لأيام الإشعار المبكر (Notice Period)',
    nameAr: 'الحد الأدنى لأيام الإشعار المبكر',
    nameEn: 'Minimum Notice Period (Days)',
    description: 'يلزم الموظف بتقديم طلب الإجازة قبل عدد محدد من الأيام من تاريخ البدء',
    descriptionAr: 'يلزم الموظف بتقديم طلب الإجازة قبل عدد محدد من الأيام من تاريخ البدء',
    descriptionEn: 'Enforces that employees submit leave requests a minimum number of days before start date',
    defaultParametersJson: JSON.stringify({ minNoticeDays: 3 }, null, 2),
    defaultSeverity: RuleSeverity.Warning,
    defaultErrorMessage: 'Leave request must be submitted at least 3 days in advance',
    defaultErrorMessageAr: 'يجب تقديم طلب الإجازة قبل موعدها بـ 3 أيام على الأقل',
  },
  {
    scope: RuleTargetScope.Leave,
    ruleCode: 'LEAVE_MAX_CONSECUTIVE_DAYS',
    name: 'الحد الأقصى للأيام المتتالية (Max Consecutive Days)',
    nameAr: 'الحد الأقصى للأيام المتتالية',
    nameEn: 'Maximum Consecutive Days',
    description: 'يحدد الحد الأقصى لأيام الإجازة المتصلة في طلب واحد',
    descriptionAr: 'يحدد الحد الأقصى لأيام الإجازة المتصلة في طلب واحد',
    descriptionEn: 'Sets the maximum consecutive leave days in a single request',
    defaultParametersJson: JSON.stringify({ maxConsecutiveDays: 14 }, null, 2),
    defaultSeverity: RuleSeverity.Error,
    defaultErrorMessage: 'Leave duration cannot exceed 14 consecutive days in a single request',
    defaultErrorMessageAr: 'لا يمكن أن تتجاوز مدة الإجازة المتصلة 14 يوماً في طلب واحد',
  },
  {
    scope: RuleTargetScope.Leave,
    ruleCode: 'LEAVE_MIN_INTERVAL_DAYS',
    name: 'الفاصل الزمني الأدنى بين الإجازات (Interval Between Leaves)',
    nameAr: 'الفاصل الزمني الأدنى بين الإجازات',
    nameEn: 'Minimum Interval Between Leaves',
    description: 'يحدد عدد الأيام الفاصلة الإلزامية بين إجازتين لنفس الموظف',
    descriptionAr: 'يحدد عدد الأيام الفاصلة الإلزامية بين إجازتين لنفس الموظف',
    descriptionEn: 'Sets minimum gap in days required between two consecutive leaves',
    defaultParametersJson: JSON.stringify({ minInterval: 7 }, null, 2),
    defaultSeverity: RuleSeverity.Warning,
    defaultErrorMessage: 'A minimum interval of 7 days is required between leave requests',
    defaultErrorMessageAr: 'يجب أن يفصل بين الإجازتين 7 أيام على الأقل',
  },
  {
    scope: RuleTargetScope.Leave,
    ruleCode: 'LEAVE_MAX_PER_MONTH',
    name: 'الحد الأقصى لعدد الطلبات شهرياً (Max Requests Per Month)',
    nameAr: 'الحد الأقصى لعدد الطلبات شهرياً',
    nameEn: 'Maximum Requests Per Month',
    description: 'يحدد الحد الأقصى لعدد طلبات الإجازة المسموح بتقديمها شهرياً',
    descriptionAr: 'يحدد الحد الأقصى لعدد طلبات الإجازة المسموح بتقديمها شهرياً',
    descriptionEn: 'Sets maximum number of leave requests an employee can submit monthly',
    defaultParametersJson: JSON.stringify({ maxPerMonth: 2 }, null, 2),
    defaultSeverity: RuleSeverity.Warning,
    defaultErrorMessage: 'Maximum allowed leave requests per month reached',
    defaultErrorMessageAr: 'تم تجاوز الحد الأقصى لعدد طلبات الإجازة المسموح بها شهرياً',
  },
  {
    scope: RuleTargetScope.Leave,
    ruleCode: 'LEAVE_BLOCK_ON_INSUFFICIENT_BALANCE',
    name: 'منع تجاوز الرصيد المتاح (Block on Insufficient Balance)',
    nameAr: 'منع تجاوز الرصيد المتاح',
    nameEn: 'Block on Insufficient Balance',
    description: 'يمنع تقديم طلب إجازة إذا كان الرصيد المتاح غير كافٍ',
    descriptionAr: 'يمنع تقديم طلب إجازة إذا كان الرصيد المتاح غير كافٍ',
    descriptionEn: 'Blocks leave request submission when employee balance is insufficient',
    defaultParametersJson: JSON.stringify({ minBalance: 0 }, null, 2),
    defaultSeverity: RuleSeverity.Error,
    defaultErrorMessage: 'Insufficient leave balance for this request',
    defaultErrorMessageAr: 'رصيد الإجازات المتاح غير كافٍ لتغطية مدة الطلب',
  },
  {
    scope: RuleTargetScope.Leave,
    ruleCode: 'LEAVE_MAX_OVERLAPPING_TEAM',
    name: 'الحد الأقصى للغياب المتزامن بالقسم (Max Team Overlap)',
    nameAr: 'الحد الأقصى للغياب المتزامن بالقسم',
    nameEn: 'Maximum Department Team Overlap',
    description: 'يحذر أو يمنع عند تجاوز عدد الموظفين المجازين في نفس القسم في نفس الوقت',
    descriptionAr: 'يحذر أو يمنع عند تجاوز عدد الموظفين المجازين في نفس القسم في نفس الوقت',
    descriptionEn: 'Alerts or blocks when too many department members are away simultaneously',
    defaultParametersJson: JSON.stringify({ maxOverlap: 2 }, null, 2),
    defaultSeverity: RuleSeverity.Warning,
    defaultErrorMessage: 'Multiple team members in the same department are on leave during this period',
    defaultErrorMessageAr: 'يوجد تعارض مع إجازات موظفين آخرين في نفس القسم لنفس الفترة',
  },
  {
    scope: RuleTargetScope.Leave,
    ruleCode: 'LEAVE_ATTACHMENT_REQUIRED_OVER_DAYS',
    name: 'إلزامية المرفقات للطلب الطويل (Attachment Required)',
    nameAr: 'إلزامية المرفقات للطلب الطويل',
    nameEn: 'Mandatory Attachments for Extended Leaves',
    description: 'يشترط إرفاق تقرير طبي أو مستند رسمي للإجازات التي تتجاوز عدداً معيناً من الأيام',
    descriptionAr: 'يشترط إرفاق تقرير طبي أو مستند رسمي للإجازات التي تتجاوز عدداً معيناً من الأيام',
    descriptionEn: 'Requires supporting documents or medical certificates for extended leaves',
    defaultParametersJson: JSON.stringify({ minDays: 3, requiresDocument: true }, null, 2),
    defaultSeverity: RuleSeverity.Error,
    defaultErrorMessage: 'Supporting document or medical report is required for leaves exceeding 3 days',
    defaultErrorMessageAr: 'يلزم إرفاق مستند أو تقرير طبي للإجازات التي تتجاوز 3 أيام',
  },
];

export const DEFAULT_PERMISSION_RULE_CATALOG: RuleCatalogItemDto[] = [
  {
    scope: RuleTargetScope.Permission,
    ruleCode: 'PERMISSION_MAX_HOURS_PER_DAY',
    name: 'الحد الأقصى لساعات الإذن باليوم (Max Hours Per Day)',
    nameAr: 'الحد الأقصى لساعات الإذن باليوم',
    nameEn: 'Maximum Permission Hours Per Day',
    description: 'يحدد الحد الأقصى لساعات الاستئذان المسموحة في اليوم الواحد',
    descriptionAr: 'يحدد الحد الأقصى لساعات الاستئذان المسموحة في اليوم الواحد',
    descriptionEn: 'Sets the maximum permission hours allowed in a single day',
    defaultParametersJson: JSON.stringify({ maxHoursPerDay: 2.0 }, null, 2),
    defaultSeverity: RuleSeverity.Error,
    defaultErrorMessage: 'Permission hours cannot exceed 2 hours per day',
    defaultErrorMessageAr: 'لا يجوز أن تتجاوز ساعات الإذن ساعتين في اليوم الواحد',
  },
  {
    scope: RuleTargetScope.Permission,
    ruleCode: 'PERMISSION_MAX_HOURS_PER_MONTH',
    name: 'الحد الأقصى لساعات الإذن شهرياً (Max Hours Per Month)',
    nameAr: 'الحد الأقصى لساعات الإذن شهرياً',
    nameEn: 'Maximum Permission Hours Per Month',
    description: 'يحدد إجمالي الساعات الشهرية المسموح بها للاستئذان',
    descriptionAr: 'يحدد إجمالي الساعات الشهرية المسموح بها للاستئذان',
    descriptionEn: 'Sets the maximum total permission hours allowed per month',
    defaultParametersJson: JSON.stringify({ maxHoursPerMonth: 4.0 }, null, 2),
    defaultSeverity: RuleSeverity.Error,
    defaultErrorMessage: 'Monthly permission quota of 4 hours exceeded',
    defaultErrorMessageAr: 'تم تجاوز الرصيد الشهري المسموح به للأذونات (4 ساعات)',
  },
  {
    scope: RuleTargetScope.Permission,
    ruleCode: 'PERMISSION_MAX_COUNT_PER_MONTH',
    name: 'الحد الأقصى لعدد الأذونات شهرياً (Max Permissions Per Month)',
    nameAr: 'الحد الأقصى لعدد الأذونات شهرياً',
    nameEn: 'Maximum Permission Requests Per Month',
    description: 'يحدد عدد مرات الاستئذان المسموحة للموظف خلال الشهر الواحد',
    descriptionAr: 'يحدد عدد مرات الاستئذان المسموحة للموظف خلال الشهر الواحد',
    descriptionEn: 'Sets the maximum number of permission requests allowed per month',
    defaultParametersJson: JSON.stringify({ maxPerMonth: 3 }, null, 2),
    defaultSeverity: RuleSeverity.Warning,
    defaultErrorMessage: 'Maximum number of permission requests per month reached',
    defaultErrorMessageAr: 'تم بلوغ الحد الأقصى لعدد مرات الاستئذان في الشهر (3 مرات)',
  },
  {
    scope: RuleTargetScope.Permission,
    ruleCode: 'PERMISSION_MIN_NOTICE_DAYS',
    name: 'أيام الإشعار المسبق لطلب الإذن (Advance Notice)',
    nameAr: 'أيام الإشعار المسبق لطلب الإذن',
    nameEn: 'Advance Notice For Permissions (Days)',
    description: 'يشترط تقديم طلب الإذن مسبقاً قبل الموعد بمدة محددة',
    descriptionAr: 'يشترط تقديم طلب الإذن مسبقاً قبل الموعد بمدة محددة',
    descriptionEn: 'Enforces advance submission notice for permission requests',
    defaultParametersJson: JSON.stringify({ minNoticeDays: 1 }, null, 2),
    defaultSeverity: RuleSeverity.Warning,
    defaultErrorMessage: 'Permission request must be submitted at least 1 day in advance',
    defaultErrorMessageAr: 'يجب تقديم طلب الإذن قبل موعده بيوم واحد على الأقل',
  },
  {
    scope: RuleTargetScope.Permission,
    ruleCode: 'PERMISSION_NO_WEEKEND',
    name: 'منع الأذونات في العطلات الرسمية (No Weekend Permissions)',
    nameAr: 'منع الأذونات في العطلات الرسمية',
    nameEn: 'No Weekend / Holiday Permissions',
    description: 'يمنع تقديم أذونات خروج في أيام العطلات الأسبوعية أو الرسمية',
    descriptionAr: 'يمنع تقديم أذونات خروج في أيام العطلات الأسبوعية أو الرسمية',
    descriptionEn: 'Disallows permission requests on official holidays or weekends',
    defaultParametersJson: JSON.stringify({ allowWeekends: false }, null, 2),
    defaultSeverity: RuleSeverity.Error,
    defaultErrorMessage: 'Permissions cannot be requested on weekends or official holidays',
    defaultErrorMessageAr: 'لا يمكن تقديم طلب إذن في أيام العطلات الأسبوعية أو الرسمية',
  },
];

/**
 * Returns default built-in catalog items for a given scope
 */
export function getDefaultCatalog(scope: RuleTargetScope): RuleCatalogItemDto[] {
  return scope === RuleTargetScope.Leave
    ? DEFAULT_LEAVE_RULE_CATALOG
    : DEFAULT_PERMISSION_RULE_CATALOG;
}

export function getSchemaForParams(parametersJson: string): ParamFieldSchema[] {
  let parsed: Record<string, any>;
  try {
    parsed = JSON.parse(parametersJson || '{}');
  } catch {
    return [];
  }
  return Object.keys(parsed).map((key) => {
    const known = PARAM_KEY_REGISTRY[key];
    if (known) return { key, ...known } as ParamFieldSchema;
    const value = parsed[key];
    let type: ParamFieldType = 'string';
    if (typeof value === 'number') type = 'number';
    else if (typeof value === 'boolean') type = 'boolean';
    else if (Array.isArray(value)) type = 'multiselect';
    return { key, labelAr: key, type } as ParamFieldSchema;
  });
}

export function parseParamValues(parametersJson: string): Record<string, any> {
  try {
    return JSON.parse(parametersJson || '{}') || {};
  } catch {
    return {};
  }
}

export function buildParamsJson(values: Record<string, any>): string {
  return JSON.stringify(values, null, 2);
}
