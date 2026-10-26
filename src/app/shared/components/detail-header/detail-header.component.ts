import { Component, inject, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { TranslatePipe } from '@ngx-translate/core';
import { ButtonModule } from 'primeng/button';
import { LanguageService } from '../../../core/services/language.service';
import { BUTTON_PRESET_CLASS } from '../../ui/button-presets';

@Component({
  selector: 'app-detail-header',
  standalone: true,
  imports: [RouterLink, TranslatePipe, ButtonModule],
  template: `
    <div class="detail-header">
      <div class="detail-header-main">
        @if (backLink()) {
          <a
            pButton
            [routerLink]="backLink()!"
            [icon]="language.isRtl() ? 'pi pi-arrow-right' : 'pi pi-arrow-left'"
            [label]="(backLabelKey() || 'common.back') | translate"
            [class]="BUTTON_PRESET_CLASS.ghost + ' p-button-sm'"
          ></a>
        }
        <div class="detail-header-copy">
          @if (titleKey()) {
            <h1 class="detail-title">{{ titleKey()! | translate }}</h1>
          } @else if (title()) {
            <h1 class="detail-title">{{ title() }}</h1>
          }
          @if (subtitle()) {
            <p class="detail-subtitle">{{ subtitle() }}</p>
          }
        </div>
        <ng-content select="[detailStatus]" />
      </div>
      <div class="detail-header-actions">
        <ng-content />
      </div>
    </div>
  `,
  styles: [
    `
      :host {
        display: block;
      }

      .detail-header {
        display: flex;
        justify-content: space-between;
        align-items: flex-start;
        flex-wrap: wrap;
        gap: 0.75rem;
        margin-bottom: 1rem;
      }

      .detail-header-main {
        display: flex;
        flex-wrap: wrap;
        align-items: center;
        gap: 0.75rem;
        min-width: 0;
      }

      .detail-title {
        margin: 0;
        font-size: 1.25rem;
        font-weight: 700;
      }

      .detail-subtitle {
        margin: 0.2rem 0 0;
        color: var(--text-color-secondary);
        font-size: 0.875rem;
      }

      .detail-header-actions {
        display: flex;
        flex-wrap: wrap;
        gap: 0.5rem;
        align-items: center;
      }
    `,
  ],
})
export class DetailHeaderComponent {
  readonly BUTTON_PRESET_CLASS = BUTTON_PRESET_CLASS;
  readonly language = inject(LanguageService);

  readonly backLink = input<string | null>(null);
  readonly backLabelKey = input<string | null>(null);
  readonly titleKey = input<string | null>(null);
  readonly title = input<string | null>(null);
  readonly subtitle = input<string | null>(null);
}
