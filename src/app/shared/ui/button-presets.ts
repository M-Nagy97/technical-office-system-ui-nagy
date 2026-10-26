export type ButtonPreset = 'primary' | 'secondary' | 'ghost' | 'danger' | 'table' | 'success';

export const BUTTON_PRESET_CLASS: Record<ButtonPreset, string> = {
  primary: '',
  secondary: 'p-button-secondary',
  ghost: 'p-button-text p-button-secondary',
  danger: 'p-button-danger',
  table: 'p-button-text p-button-rounded p-button-sm',
  success: 'p-button-success',
};

export const TABLE_ACTION_CLASS = {
  view: 'p-button-text p-button-rounded p-button-sm',
  edit: 'p-button-text p-button-rounded p-button-sm',
  delete: 'p-button-text p-button-rounded p-button-sm p-button-danger',
  custom: 'p-button-text p-button-rounded p-button-sm',
} as const;

export function buttonClass(preset: ButtonPreset, extra?: string): string {
  const base = BUTTON_PRESET_CLASS[preset];
  return extra ? `${base} ${extra}`.trim() : base;
}
