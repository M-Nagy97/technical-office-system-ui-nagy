import { Component, computed, input } from '@angular/core';

@Component({
  selector: 'app-entity-cell',
  standalone: true,
  template: `
    <div class="entity-cell">
      <span class="entity-mark">
        @if (icon()) {
          <i [class]="icon()!"></i>
        } @else {
          {{ initial() }}
        }
      </span>
      <span class="entity-name">{{ name() || '-' }}</span>
    </div>
  `,
  styles: [
    `
      :host {
        display: inline-flex;
        min-width: 0;
      }

      .entity-cell {
        display: inline-flex;
        align-items: center;
        gap: 0.75rem;
        font-weight: 600;
        min-width: 0;
      }

      .entity-mark {
        inline-size: 2rem;
        block-size: 2rem;
        border-radius: 999px;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        flex-shrink: 0;
        background: color-mix(in srgb, var(--primary-color) 14%, white);
        color: var(--primary-color);
        font-size: 0.85rem;
      }

      .entity-name {
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }
    `,
  ],
})
export class EntityCellComponent {
  readonly name = input<string | null>('');
  readonly icon = input<string | null>(null);

  readonly initial = computed(() => (this.name() || '?').charAt(0).toUpperCase());
}
