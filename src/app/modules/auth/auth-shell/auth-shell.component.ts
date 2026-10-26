import { Component, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { ToastModule } from 'primeng/toast';
import { LanguageService } from '../../../core/services/language.service';
import { ThemeService } from '../../../core/services/theme.service';

@Component({
  selector: 'app-auth-shell',
  standalone: true,
  imports: [RouterOutlet, ButtonModule, ToastModule],
  templateUrl: './auth-shell.component.html',
  styleUrl: './auth-shell.component.scss',
})
export class AuthShellComponent {
  readonly languageService = inject(LanguageService);
  readonly themeService = inject(ThemeService);
  readonly darkTheme = this.themeService.darkTheme;

  toggleTheme(): void {
    this.themeService.toggle();
  }
}
