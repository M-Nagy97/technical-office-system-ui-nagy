export interface NavItem {
  label: string;
  icon: string;
  route?: string;
  children?: NavItem[];
  module: string;
}
