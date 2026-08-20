import { Component, inject, computed, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { CardModule } from 'primeng/card';
import { ButtonModule } from 'primeng/button';
import { ChartModule } from 'primeng/chart';
import { EmployeeService, AttendanceService, PenaltyService, PenaltyType, PENALTY_TYPE_LABELS } from '../../core';

interface ActivityItem {
  id: string;
  textKey: string;
  timeKey: string;
  icon: string;
}

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, RouterLink, TranslatePipe, CardModule, ButtonModule, ChartModule],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.scss',
})
export class DashboardComponent implements OnInit {
  private readonly employeeService = inject(EmployeeService);
  private readonly attendanceService = inject(AttendanceService);
  private readonly penaltyService = inject(PenaltyService);
  private readonly translate = inject(TranslateService);

  readonly today = signal<Date>(new Date());

  ngOnInit(): void {
    this.attendanceService.ensureRecordsForDate(new Date());
  }

  readonly employeeCount = computed(() => this.employeeService.getList().length);

  readonly todayAttendancePercent = computed(() => {
    const today = this.today();
    const records = this.attendanceService.getRecordsByDateSync(today);
    if (records.length === 0) return 0;
    const present = records.filter((r) => r.status === 'present').length;
    return Math.round((present / records.length) * 100);
  });

  readonly pendingPenaltiesCount = computed(() =>
    this.penaltyService.getList().filter((p) => p.status === 'pending').length
  );

  readonly documentsCount = computed(() =>
    this.employeeService.getList().reduce((sum, e) => sum + (e.documents?.length ?? 0), 0)
  );

  readonly recentActivity = signal<ActivityItem[]>([
    { id: '1', textKey: 'dashboard.activity_1', timeKey: 'dashboard.time_ago_1h', icon: 'pi pi-calendar' },
    { id: '2', textKey: 'dashboard.activity_2', timeKey: 'dashboard.time_ago_3h', icon: 'pi pi-user-plus' },
    { id: '3', textKey: 'dashboard.activity_3', timeKey: 'dashboard.time_yesterday', icon: 'pi pi-exclamation-triangle' },
    { id: '4', textKey: 'dashboard.activity_4', timeKey: 'dashboard.time_yesterday', icon: 'pi pi-file' },
    { id: '5', textKey: 'dashboard.activity_5', timeKey: 'dashboard.time_2_days', icon: 'pi pi-clock' },
  ]);

  readonly lineChartData = computed(() => {
    const days: string[] = [];
    const percents: number[] = [];
    const d = new Date();
    for (let i = 6; i >= 0; i--) {
      const date = new Date(d);
      date.setDate(date.getDate() - i);
      const recs = this.attendanceService.getRecordsByDateSync(date);
      const label = date.toLocaleDateString('ar-EG', { weekday: 'short' });
      days.push(label);
      if (recs.length === 0) percents.push(0);
      else {
        const present = recs.filter((r) => r.status === 'present').length;
        percents.push(Math.round((present / recs.length) * 100));
      }
    }
    return {
      labels: days,
      datasets: [
        {
          label: this.translate.instant('dashboard.attendance_percent'),
          data: percents,
          fill: true,
          borderColor: 'var(--primary-color, #1e40af)',
          tension: 0.4,
        },
      ],
    };
  });

  readonly lineChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
    },
    scales: {
      y: {
        min: 0,
        max: 100,
        ticks: { stepSize: 20 },
      },
    },
  };

  readonly donutChartData = computed(() => {
    const list = this.penaltyService.getList();
    const byType: Record<PenaltyType, number> = {
      warning: 0,
      written_warning: 0,
      deduction: 0,
      suspension: 0,
      dismissal: 0,
    };
    list.forEach((p) => byType[p.type]++);
    return {
      labels: (Object.keys(byType) as PenaltyType[]).map((t) => PENALTY_TYPE_LABELS[t]),
      datasets: [
        {
          data: Object.values(byType),
          backgroundColor: [
            '#ca8a04',
            '#ea580c',
            '#d97706',
            '#dc2626',
            '#7f1d1d',
          ],
          hoverBackgroundColor: [
            '#ca8a04',
            '#ea580c',
            '#d97706',
            '#dc2626',
            '#7f1d1d',
          ],
        },
      ],
    };
  });

  readonly donutChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { position: 'bottom' },
    },
  };

  getArabicDate(): string {
    const lang = typeof document !== 'undefined' && document.documentElement.getAttribute('lang');
    const locale = lang === 'ar' ? 'ar-EG' : 'en-GB';
    return this.today().toLocaleDateString(locale, {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  }
}
