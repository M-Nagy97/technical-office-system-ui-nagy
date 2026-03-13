import { Component, signal, effect } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { ToastModule } from 'primeng/toast';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { SidebarComponent } from '../sidebar/sidebar.component';
import { TopbarComponent } from '../topbar/topbar.component';

const SIDEBAR_COLLAPSED_KEY = 'technical-office-sidebar-collapsed';

@Component({
  selector: 'app-main-layout',
  standalone: true,
  imports: [
    RouterOutlet,
    ToastModule,
    ConfirmDialogModule,
    SidebarComponent,
    TopbarComponent,
  ],
  templateUrl: './main-layout.component.html',
  styleUrl: './main-layout.component.scss',
})
export class MainLayoutComponent {
  readonly sidebarCollapsed = signal<boolean>(this.readSidebarCollapsed());

  constructor() {
    effect(() => {
      const collapsed = this.sidebarCollapsed();
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem(SIDEBAR_COLLAPSED_KEY, String(collapsed));
      }
    });
  }

  private readSidebarCollapsed(): boolean {
    if (typeof localStorage === 'undefined') return false;
    const stored = localStorage.getItem(SIDEBAR_COLLAPSED_KEY);
    return stored === 'true';
  }

  toggleSidebar(): void {
    this.sidebarCollapsed.update((v) => !v);
  }
}
