import { Component, OnInit, inject } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { RouterLink } from '@angular/router';
import { TranslatePipe } from '@ngx-translate/core';
import { CardModule } from 'primeng/card';
import { ButtonModule } from 'primeng/button';
import { MessageModule } from 'primeng/message';

@Component({
  selector: 'app-payroll-placeholder',
  standalone: true,
  imports: [RouterLink, TranslatePipe, CardModule, ButtonModule, MessageModule],
  templateUrl: './payroll-placeholder.component.html',
  styleUrl: './payroll-placeholder.component.scss',
})
export class PayrollPlaceholderComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);

  titleKey = 'payroll.placeholder';
  descriptionKey = 'payroll.api_pending';

  ngOnInit(): void {
    const data = this.route.snapshot.data;
    if (data['titleKey']) this.titleKey = data['titleKey'];
    if (data['descriptionKey']) this.descriptionKey = data['descriptionKey'];
  }
}
