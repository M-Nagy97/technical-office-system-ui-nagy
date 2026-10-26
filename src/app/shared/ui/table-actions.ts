import { SharedTableAction } from '../components/shared-table/shared-table.models';
import { TABLE_ACTION_CLASS } from './button-presets';

type ActionExtras<T> = Partial<Omit<SharedTableAction<T>, 'onClick'>>;

export function tableViewAction<T>(
  onClick: SharedTableAction<T>['onClick'],
  extras: ActionExtras<T> = {},
): SharedTableAction<T> {
  return {
    id: 'view',
    icon: 'pi pi-eye',
    tooltip: 'common.open',
    buttonClass: TABLE_ACTION_CLASS.view,
    onClick,
    ...extras,
  };
}

export function tableEditAction<T>(
  onClick: SharedTableAction<T>['onClick'],
  extras: ActionExtras<T> = {},
): SharedTableAction<T> {
  return {
    id: 'edit',
    icon: 'pi pi-pencil',
    tooltip: 'common.edit',
    buttonClass: TABLE_ACTION_CLASS.edit,
    onClick,
    ...extras,
  };
}

export function tableDeleteAction<T>(
  onClick: SharedTableAction<T>['onClick'],
  extras: ActionExtras<T> = {},
): SharedTableAction<T> {
  return {
    id: 'delete',
    icon: 'pi pi-trash',
    tooltip: 'common.delete',
    buttonClass: TABLE_ACTION_CLASS.delete,
    onClick,
    ...extras,
  };
}

export function tableCustomAction<T>(
  action: SharedTableAction<T>,
): SharedTableAction<T> {
  return {
    buttonClass: TABLE_ACTION_CLASS.custom,
    ...action,
  };
}
