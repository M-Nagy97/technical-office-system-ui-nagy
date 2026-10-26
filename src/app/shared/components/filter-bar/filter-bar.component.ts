import { Component, input, model } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { TranslatePipe } from '@ngx-translate/core';
import { InputTextModule } from 'primeng/inputtext';

@Component({
  selector: 'app-filter-bar',
  standalone: true,
  imports: [FormsModule, InputTextModule, TranslatePipe],
  template: `
    <div class="filter-bar">
      @if (showSearch()) {
        <span class="p-input-icon-left filter-search">
          <i class="pi pi-search"></i>
          <input
            type="text"
            pInputText
            [ngModel]="search()"
            (ngModelChange)="search.set($event)"
            [placeholder]="(searchPlaceholderKey() || 'common.search') | translate"
          />
        </span>
      }
      <ng-content />
    </div>
  `,
  styles: [
    `
      :host {
        display: block;
      }

      .filter-bar {
        display: flex;
        flex-wrap: wrap;
        align-items: center;
        gap: 0.75rem;
      }

      .filter-search {
        min-width: 12rem;
        flex: 1;
      }
    `,
  ],
})
export class FilterBarComponent {
  readonly search = model('');
  readonly showSearch = input(true);
  readonly searchPlaceholderKey = input<string | null>(null);
}
