import { Component, inject } from '@angular/core';
import { Router } from '@angular/router';
import { PenaltyFormComponent } from '../penalty-form/penalty-form.component';

@Component({
  selector: 'app-add-penalty',
  standalone: true,
  imports: [PenaltyFormComponent],
  template: `
    <div class="add-penalty-page">
      <app-penalty-form
        [dialogMode]="false"
        (saved)="onSaved()"
        (cancelled)="onCancelled()"
      />
    </div>
  `,
  styles: [`.add-penalty-page { padding: 0; }`],
})
export class AddPenaltyComponent {
  private readonly router = inject(Router);

  onSaved(): void {
    this.router.navigate(['/penalties']);
  }

  onCancelled(): void {
    this.router.navigate(['/penalties']);
  }
}
