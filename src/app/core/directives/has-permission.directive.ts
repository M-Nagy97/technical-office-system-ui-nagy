import { Directive, Input, TemplateRef, ViewContainerRef, effect, inject, signal } from '@angular/core';
import { PermissionService } from '../auth/permission.service';

@Directive({
  selector: '[appHasPermission]',
  standalone: true,
})
export class HasPermissionDirective {
  private readonly permission = inject(PermissionService);
  private readonly templateRef = inject(TemplateRef<unknown>);
  private readonly viewContainer = inject(ViewContainerRef);
  private readonly required = signal<string | readonly string[] | null>(null);

  @Input({ required: true })
  set appHasPermission(value: string | readonly string[]) {
    this.required.set(value);
  }

  constructor() {
    effect(() => {
      const required = this.required();
      this.permission.codes();
      this.viewContainer.clear();

      if (required == null) {
        return;
      }

      const allowed = typeof required === 'string'
        ? this.permission.has(required)
        : this.permission.hasAny(required);

      if (allowed) {
        this.viewContainer.createEmbeddedView(this.templateRef);
      }
    });
  }
}
