/**
 * Maps known policy-rule JSON parameter keys (matching backend evaluators)
 * to bilingual labels and input types for the structured param editor.
 */

export type ParamFieldType = 'number' | 'boolean' | 'select';

export interface ParamFieldOption {
  labelEn: string;
  labelAr: string;
  value: number | boolean | string;
}

export interface ParamFieldSchema {
  key: string;
  labelEn: string;
  labelAr: string;
  type: ParamFieldType;
  min?: number;
  max?: number;
  step?: number;
  options?: ParamFieldOption[];
  suffixEn?: string;
  suffixAr?: string;
}

/**
 * Extra defaults merged by rule code so the editor shows new keys
 * even when stored ParametersJson (or a stale API catalog) omits them.
 */
const RULE_CODE_DEFAULT_PARAMS: Record<string, Record<string, unknown>> = {
  MAX_DEPARTMENT_CONCURRENCY: {
    MaxConcurrentEmployees: 2,
    CountPending: true,
    IncludeChildDepartments: false,
  },
  DEPARTMENT_PERMISSION_CONCURRENCY: {
    MaxConcurrentEmployees: 2,
    CountPending: true,
    IncludeChildDepartments: false,
    MatchMode: 'ByDayAndTime',
  },
};

/** Backend param keys used by LeavePermissions evaluators / catalog defaults. */
const PARAM_KEY_REGISTRY: Record<string, Omit<ParamFieldSchema, 'key'>> = {
  RequiredGenderId: {
    labelEn: 'Required gender',
    labelAr: 'الجنس المطلوب',
    type: 'select',
    options: [
      { labelEn: 'Male', labelAr: 'ذكر', value: 1 },
      { labelEn: 'Female', labelAr: 'أنثى', value: 2 },
    ],
  },
  MaxConcurrentEmployees: {
    labelEn: 'Max concurrent employees',
    labelAr: 'الحد الأقصى للموظفين المتزامنين',
    type: 'number',
    min: 1,
    step: 1,
  },
  CountPending: {
    labelEn: 'Count pending requests',
    labelAr: 'احتساب الطلبات قيد الانتظار',
    type: 'boolean',
  },
  IncludeChildDepartments: {
    labelEn: 'Include child departments',
    labelAr: 'تضمين الأقسام / الوحدات الفرعية',
    type: 'boolean',
  },
  MatchMode: {
    labelEn: 'Concurrency match mode',
    labelAr: 'طريقة احتساب التزامن',
    type: 'select',
    options: [
      { labelEn: 'Per day', labelAr: 'حسب اليوم', value: 'ByDay' },
      { labelEn: 'Per day and time', labelAr: 'حسب اليوم والوقت', value: 'ByDayAndTime' },
    ],
  },
  MinMonths: {
    labelEn: 'Minimum service months',
    labelAr: 'الحد الأدنى لأشهر الخدمة',
    type: 'number',
    min: 0,
    step: 1,
    suffixEn: 'months',
    suffixAr: 'شهر',
  },
  MinDaysInAdvance: {
    labelEn: 'Minimum days in advance',
    labelAr: 'أدنى أيام الإشعار المسبق',
    type: 'number',
    min: 0,
    step: 1,
    suffixEn: 'days',
    suffixAr: 'يوم',
  },
  MaxDays: {
    labelEn: 'Maximum consecutive days',
    labelAr: 'الحد الأقصى للأيام المتتالية',
    type: 'number',
    min: 1,
    step: 1,
    suffixEn: 'days',
    suffixAr: 'يوم',
  },
  MaxCount: {
    labelEn: 'Maximum count per month',
    labelAr: 'الحد الأقصى للعدد شهرياً',
    type: 'number',
    min: 1,
    step: 1,
  },
  MaxHours: {
    labelEn: 'Maximum hours',
    labelAr: 'الحد الأقصى للساعات',
    type: 'number',
    min: 0,
    step: 0.5,
    suffixEn: 'hours',
    suffixAr: 'ساعة',
  },
};

export function buildParamFieldsFromJson(parametersJson: string | null | undefined): ParamFieldSchema[] {
  const obj = parseParametersObject(parametersJson);
  return Object.keys(obj).map((key) => toParamField(key, obj[key]));
}

/**
 * Merges stored params with catalog defaults and rule-code UI defaults.
 * Stored values win; missing keys (e.g. IncludeChildDepartments) are filled in.
 */
export function mergeRuleParameters(
  parametersJson: string | null | undefined,
  ruleCode?: string | null,
  catalogDefaultParametersJson?: string | null
): Record<string, unknown> {
  const stored = parseParametersObject(parametersJson);
  const catalogDefaults = parseParametersObject(catalogDefaultParametersJson);
  const ruleDefaults = (ruleCode && RULE_CODE_DEFAULT_PARAMS[ruleCode]) || {};
  return { ...ruleDefaults, ...catalogDefaults, ...stored };
}

export function buildParamFieldsFromValues(values: Record<string, unknown>): ParamFieldSchema[] {
  const preferredOrder = [
    'MaxConcurrentEmployees',
    'MatchMode',
    'CountPending',
    'IncludeChildDepartments',
    'RequiredGenderId',
    'MinMonths',
    'MinDaysInAdvance',
    'MaxDays',
    'MaxCount',
    'MaxHours',
  ];
  const keys = Object.keys(values);
  const ordered = [
    ...preferredOrder.filter((key) => keys.includes(key)),
    ...keys.filter((key) => !preferredOrder.includes(key)),
  ];
  return ordered.map((key) => toParamField(key, values[key]));
}

function toParamField(key: string, value: unknown): ParamFieldSchema {
  const known = PARAM_KEY_REGISTRY[key];
  if (known) {
    return { key, ...known };
  }
  if (typeof value === 'boolean') {
    return {
      key,
      labelEn: key,
      labelAr: key,
      type: 'boolean',
    };
  }
  if (typeof value === 'number') {
    return {
      key,
      labelEn: key,
      labelAr: key,
      type: 'number',
      step: Number.isInteger(value) ? 1 : 0.1,
    };
  }
  return {
    key,
    labelEn: key,
    labelAr: key,
    type: typeof value === 'string' ? 'select' : 'number',
    options:
      typeof value === 'string'
        ? [{ labelEn: value, labelAr: value, value }]
        : undefined,
  };
}

export function parseParametersObject(parametersJson: string | null | undefined): Record<string, unknown> {
  if (!parametersJson || !parametersJson.trim()) return {};
  try {
    const parsed = JSON.parse(parametersJson);
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
      return parsed as Record<string, unknown>;
    }
  } catch {
    // ignore invalid JSON
  }
  return {};
}

export function serializeParametersObject(values: Record<string, unknown>): string {
  return JSON.stringify(values);
}
