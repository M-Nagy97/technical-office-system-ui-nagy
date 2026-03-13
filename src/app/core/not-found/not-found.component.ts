import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { CardModule } from 'primeng/card';
import { TranslatePipe } from '@ngx-translate/core';

@Component({
  selector: 'app-not-found',
  standalone: true,
  imports: [RouterLink, ButtonModule, CardModule, TranslatePipe],
  template: `
    <div class="not-found">
      <p-card>
        <div class="not-found-content">
          <h1>{{ 'not_found.title' | translate }}</h1>
          <p class="not-found-message">{{ 'not_found.message' | translate }}</p>
          <a pButton [label]="'not_found.back_home' | translate" icon="pi pi-home" routerLink="/dashboard"></a>
        </div>
      </p-card>
    </div>
  `,
  styles: [`
    .not-found {
      display: flex;
      align-items: center;
      justify-content: center;
      min-height: 60vh;
      padding: 2rem;
    }
    .not-found-content {
      text-align: center;
    }
    .not-found-content h1 {
      font-size: 4rem;
      margin: 0 0 1rem 0;
      color: var(--primary-color, #1e40af);
    }
    .not-found-message {
      margin-bottom: 1.5rem;
      color: var(--text-color-secondary);
    }
  `],
})
export class NotFoundComponent {}
