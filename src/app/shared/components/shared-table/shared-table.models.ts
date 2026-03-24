export type SharedTableTextAlign = 'start' | 'end' | 'center';

export interface SharedTableColumn<T = any> {
  /**
   * Unique column id. Used to match projected cell templates.
   */
  id: string;
  /**
   * Header text (translation key expected by the shared table).
   */
  header: string;
  /**
   * Property name to read from the row (optional if you use valueGetter or cell template).
   */
  field?: keyof T & string;
  /**
   * Value resolver used when no template is provided for this column.
   */
  valueGetter?: (row: T) => unknown;
  width?: string;
  align?: SharedTableTextAlign;
  /**
   * If provided, header will render PrimeNG sort controls using this field.
   */
  sortableField?: string;
  /**
   * Class(es) applied to the <td> for this column.
   */
  cellClass?: string | ((row: T, value: unknown) => string);
}

export interface SharedTableAction<T = any> {
  /**
   * Unique action id (useful if you want to keep stable identity).
   */
  id: string;
  /**
   * PrimeIcons class name (e.g. "pi pi-eye") or function to compute it per row.
   */
  icon: string | ((row: T) => string);
  /**
   * Button label translation key (optional, icons-only is supported).
   */
  label?: string;
  /**
   * Show action for a given row.
   */
  visible?: boolean | ((row: T) => boolean);
  /**
   * Disable action for a given row.
   */
  disabled?: boolean | ((row: T) => boolean);
  /**
   * Show PrimeNG loading spinner for a given row.
   */
  loading?: boolean | ((row: T) => boolean);
  /**
   * Extra button CSS classes (optional, can be dynamic).
   */
  buttonClass?: string | ((row: T) => string);
  /**
   * Action handler.
   */
  onClick: (row: T, event: MouseEvent) => void;
}

