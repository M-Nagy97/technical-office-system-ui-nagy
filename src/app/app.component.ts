import { Component, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { PrimeNGConfig } from 'primeng/api';
import { LanguageService } from './core/services/language.service';
import { ThemeService } from './core/services/theme.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet],
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss',
})
export class AppComponent {
  title = 'technical-office-system';

  constructor() {
    inject(LanguageService);
    inject(ThemeService);

    const primeNg = inject(PrimeNGConfig);
    // Keep overlays above dialogs (1100) and out of overflow:hidden parents
    // such as scrollable tables and layout-content.
    primeNg.zIndex = {
      modal: 1100,
      overlay: 1200,
      menu: 1200,
      tooltip: 1300,
    };
    primeNg.overlayOptions = {
      appendTo: 'body',
      autoZIndex: true,
    };
  }
}
