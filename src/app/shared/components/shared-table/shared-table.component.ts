import {
  AfterContentInit,
  ChangeDetectionStrategy,
  Component,
  ContentChildren,
  Input,
  QueryList,
  TemplateRef,
  inject,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { TableModule } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { TranslateModule } from '@ngx-translate/core';
import { LanguageService } from '../../../core/services/language.service';
import { SharedTableAction, SharedTableColumn, SharedTableTextAlign } from './shared-table.models';
import { SharedTableCellTemplateDirective } from './shared-table-cell-template.directive';

/**
 * Shared PrimeNG table wrapper with:
 * - default 10 rows
 * - automatic RTL/LTR alignment based on document direction
 * - optional per-cell templates via `SharedTableCellTemplateDirective`
 * - configurable action icons (view/edit/delete/custom)
 */
@Component({
  selector: 'app-shared-table',
  standalone: true,
  imports: [CommonModule, TableModule, ButtonModule, TranslateModule],
  templateUrl: './shared-table.component.html',
  styleUrl: './shared-table.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SharedTableComponent<T = any> implements AfterContentInit {
  private readonly languageService = inject(LanguageService);

  @Input() value: T[] = [];
  @Input() columns: SharedTableColumn<T>[] = [];
  @Input() loading = false;

  @Input() paginator = true;
  @Input() rows = 10;
  @Input() rowsPerPageOptions: number[] = [10, 20, 50];

  @Input() scrollable = false;
  @Input() scrollHeight: string | null = null;

  @Input() showCurrentPageReport = false;
  @Input() currentPageReportTemplate = 'showing {first} to {last} of {totalRecords}';

  @Input() styleClass = 'p-datatable-sm p-datatable-striped';
  @Input() tableStyle: Record<string, string> | null = null;

  @Input() actions: SharedTableAction<T>[] = [];
  @Input() actionsColumnHeader?: string;
  @Input() actionsColumnWidth?: string = '8rem';
  @Input() actionsAlign: SharedTableTextAlign = 'end';

  @Input() emptyMessage = 'common.no_data';
  @Input() translateEmptyMessage = true;

  @Input() rowClass?: string | ((row: T) => string);
  @Input() rowClick?: (row: T, event: MouseEvent) => void;
  @Input() translateHeader = true;

  @ContentChildren(SharedTableCellTemplateDirective)
  private readonly cellTemplateDirectives!: QueryList<SharedTableCellTemplateDirective<T>>;

  private cellTemplateByColumnId = new Map<string, TemplateRef<any>>();

  ngAfterContentInit(): void {
    this.rebuildCellTemplateMap();
    this.cellTemplateDirectives.changes.subscribe(() => this.rebuildCellTemplateMap());
  }

  private rebuildCellTemplateMap(): void {
    const map = new Map<string, TemplateRef<any>>();
    for (const d of this.cellTemplateDirectives.toArray()) {
      map.set(d.columnId, d.template);
    }
    this.cellTemplateByColumnId = map;
  }

  private getDir(): 'rtl' | 'ltr' {
    return this.languageService.dir();
  }

  resolveAlign(align: SharedTableTextAlign | undefined): 'left' | 'right' | 'center' {
    const dir = this.getDir();
    if (!align || align === 'start') return dir === 'rtl' ? 'right' : 'left';
    if (align === 'end') return dir === 'rtl' ? 'left' : 'right';
    return 'center';
  }

  resolveActionsJustify(): 'flex-end' | 'flex-start' | 'center' {
    if (this.actionsAlign === 'center') return 'center';
    // In RTL we map "end" to physical left.
    const dir = this.getDir();
    const isRtl = dir === 'rtl';
    if (!isRtl) {
      // LTR
      return this.actionsAlign === 'start' ? 'flex-start' : 'flex-end';
    }
    // RTL
    return this.actionsAlign === 'start' ? 'flex-end' : 'flex-start';
  }

  getColumnValue(col: SharedTableColumn<T>, row: T): unknown {
    if (col.valueGetter) return col.valueGetter(row);
    if (col.field) return (row as any)[col.field];
    return '';
  }

  getCellTemplate(colId: string): TemplateRef<any> | undefined {
    return this.cellTemplateByColumnId.get(colId);
  }

  getCellClass(col: SharedTableColumn<T>, row: T): string {
    if (!col.cellClass) return '';
    const value = this.getColumnValue(col, row);
    if (typeof col.cellClass === 'function') return col.cellClass(row, value) ?? '';
    return col.cellClass;
  }

  getRowClass(row: T): string {
    if (!this.rowClass) return '';
    return typeof this.rowClass === 'function' ? this.rowClass(row) : this.rowClass;
  }

  onRowClicked(row: T, event: MouseEvent): void {
    if (!this.rowClick) return;
    const target = event.target as HTMLElement | null;
    if (!target) return;

    // Avoid firing row click when user interacts with buttons/links inside the row.
    const interactive = target.closest('button, a, input, select, textarea, [role="button"]');
    if (interactive) return;

    this.rowClick(row, event);
  }

  isActionVisible(action: SharedTableAction<T>, row: T): boolean {
    if (action.visible === undefined) return true;
    return typeof action.visible === 'function' ? action.visible(row) : action.visible;
  }

  getActionIcon(action: SharedTableAction<T>, row: T): string {
    return typeof action.icon === 'function' ? action.icon(row) : action.icon;
  }

  isActionDisabled(action: SharedTableAction<T>, row: T): boolean {
    if (action.disabled === undefined) return false;
    return typeof action.disabled === 'function' ? action.disabled(row) : action.disabled;
  }

  isActionLoading(action: SharedTableAction<T>, row: T): boolean {
    if (action.loading === undefined) return false;
    return typeof action.loading === 'function' ? action.loading(row) : action.loading;
  }

  getActionButtonClass(action: SharedTableAction<T>, row: T): string {
    const base = 'p-button-text p-button-sm';
    if (!action.buttonClass) return base;
    const extra = typeof action.buttonClass === 'function' ? action.buttonClass(row) : action.buttonClass;
    return extra ? `${base} ${extra}` : base;
  }

  getActionLabel(action: SharedTableAction<T>, row: T): string | undefined {
    if (!action.label) return undefined;
    // label is assumed to be a translation key, handled by template pipe.
    return action.label;
  }

  actionsEnabled(): boolean {
    return (this.actions ?? []).length > 0;
  }
}

