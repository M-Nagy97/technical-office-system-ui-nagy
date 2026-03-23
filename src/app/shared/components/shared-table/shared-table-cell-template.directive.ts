import { Directive, Input, TemplateRef } from '@angular/core';

/**
 * Usage:
 * <ng-template sharedTableCell="myColumnId" let-row let-value="value">
 *   ...
 * </ng-template>
 */
@Directive({
  standalone: true,
  selector: 'ng-template[sharedTableCell]',
})
export class SharedTableCellTemplateDirective<T = any> {
  @Input('sharedTableCell') columnId!: string;

  constructor(public readonly template: TemplateRef<T>) {}
}

