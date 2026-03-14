export interface NavItem {
  label: string;
  icon: string;
  route?: string;
  /** When true, renders as section header (ترميزات / عمليات رئيسية) with no link */
  section?: boolean;
  children?: NavItem[];
  module: string;
}
