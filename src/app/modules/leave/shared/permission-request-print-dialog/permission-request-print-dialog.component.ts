import {
  Component,
  EventEmitter,
  Input,
  OnChanges,
  OnDestroy,
  Output,
  SimpleChanges,
  computed,
  inject,
  signal,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { catchError, finalize, forkJoin, of, switchMap } from 'rxjs';
import { DialogModule } from 'primeng/dialog';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { CalendarModule } from 'primeng/calendar';
import { ProgressSpinnerModule } from 'primeng/progressspinner';
import { MessageService } from 'primeng/api';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { EmployeeService, PermissionRequestService } from '../../../../core/services';
import { Employee } from '../../../../core/models/employee.model';
import {
  PermissionDurationType,
  PermissionRequestDto,
  PermissionRequestStatus,
} from '../../../../core/models/permission-request.model';
import {
  formatPaperDate,
  toArabicDigits,
} from '../leave-request-print-dialog/leave-request-print-dialog.component';
import { TimeInputComponent, parseTimeToDate } from '../../../../shared';

const WEEKDAYS_AR = ['الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];

const DEFAULT_RIGHT_RANK = 'نقيب /';
const DEFAULT_RIGHT_NAME = 'محمد ناجي شحاتة';
const DEFAULT_RIGHT_TITLE = 'رئيس قسم الشئون الإدارية';
const DEFAULT_LEFT_RANK = 'لواء /';
const DEFAULT_LEFT_NAME = 'عمرو نصار';
const DEFAULT_LEFT_TITLE = 'مدير إدارة مركز تكنولوجيا المعلومات';

function formatPaperTime12(value: string | Date | null | undefined): string {
  if (!value) {
    return '';
  }

  let hours: number;
  let minutes: number;

  if (value instanceof Date) {
    if (Number.isNaN(value.getTime())) {
      return '';
    }
    hours = value.getHours();
    minutes = value.getMinutes();
  } else {
    const parts = value.split(':');
    hours = Number(parts[0]);
    minutes = Number(parts[1] ?? 0);
    if (!Number.isFinite(hours) || !Number.isFinite(minutes)) {
      return toArabicDigits(value);
    }
  }

  const period = hours >= 12 ? 'م' : 'ص';
  let hour12 = hours % 12;
  if (hour12 === 0) {
    hour12 = 12;
  }
  return toArabicDigits(`${String(hour12).padStart(2, '0')}:${String(minutes).padStart(2, '0')} ${period}`);
}

function parseLocalDate(value: string | undefined): Date | null {
  if (!value) {
    return null;
  }
  const iso = value.slice(0, 10);
  if (/^\d{4}-\d{2}-\d{2}$/.test(iso)) {
    const [y, m, d] = iso.split('-').map(Number);
    return new Date(y, m - 1, d);
  }
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function formatIsoDate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function monthRange(date: Date): { fromDate: string; toDate: string } {
  const from = new Date(date.getFullYear(), date.getMonth(), 1);
  const to = new Date(date.getFullYear(), date.getMonth() + 1, 0);
  return { fromDate: formatIsoDate(from), toDate: formatIsoDate(to) };
}

@Component({
  selector: 'app-permission-request-print-dialog',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    DialogModule,
    ButtonModule,
    InputTextModule,
    CalendarModule,
    ProgressSpinnerModule,
    TranslateModule,
    TimeInputComponent,
  ],
  templateUrl: './permission-request-print-dialog.component.html',
  styleUrl: './permission-request-print-dialog.component.scss',
})
export class PermissionRequestPrintDialogComponent implements OnChanges, OnDestroy {
  private readonly permissionRequestService = inject(PermissionRequestService);
  private readonly employeeService = inject(EmployeeService);
  private readonly messageService = inject(MessageService);
  private readonly translate = inject(TranslateService);

  @Input() visible = false;
  @Input() requestId = '';
  @Input() request: PermissionRequestDto | null = null;

  @Output() visibleChange = new EventEmitter<boolean>();

  readonly loading = signal(false);
  readonly loadedRequest = signal<PermissionRequestDto | null>(null);
  readonly employee = signal<Employee | null>(null);
  readonly monthlyCount = signal<number | null>(null);
  readonly issueDate = signal<Date>(new Date());
  readonly issueTime = signal<Date>(new Date());
  readonly rightRank = signal(DEFAULT_RIGHT_RANK);
  readonly rightName = signal(DEFAULT_RIGHT_NAME);
  readonly rightTitle = signal(DEFAULT_RIGHT_TITLE);
  readonly leftRank = signal(DEFAULT_LEFT_RANK);
  readonly leftName = signal(DEFAULT_LEFT_NAME);
  readonly leftTitle = signal(DEFAULT_LEFT_TITLE);

  onIssueTimeChange(value: Date | string | null | undefined): void {
    const parsed = value instanceof Date ? value : parseTimeToDate(value);
    if (parsed) {
      this.issueTime.set(parsed);
    }
  }

  private loadSeq = 0;
  private printCleanup: (() => void) | null = null;

  readonly employeeName = computed(
    () => this.employee()?.fullName || this.loadedRequest()?.employeeName || '',
  );
  readonly departmentLine = computed(() => {
    const emp = this.employee();
    if (!emp) {
      return '';
    }
    return emp.section || emp.department || '';
  });
  readonly permissionTypeTitle = computed(
    () =>
      this.loadedRequest()?.permissionTypeArabicName ||
      this.loadedRequest()?.permissionTypeName ||
      'إذن',
  );
  readonly fromTimeText = computed(() => {
    const req = this.loadedRequest();
    if (!req || req.durationType === PermissionDurationType.HalfDay) {
      return '';
    }
    return formatPaperTime12(req.fromTime);
  });
  readonly toTimeText = computed(() => {
    const req = this.loadedRequest();
    if (!req || req.durationType === PermissionDurationType.HalfDay) {
      return '';
    }
    return formatPaperTime12(req.toTime);
  });
  readonly weekdayText = computed(() => {
    const date = parseLocalDate(this.loadedRequest()?.date);
    if (!date) {
      return '';
    }
    return WEEKDAYS_AR[date.getDay()] ?? '';
  });
  readonly dateText = computed(() => formatPaperDate(this.loadedRequest()?.date));
  readonly issueDateText = computed(() => formatPaperDate(this.issueDate()));
  readonly issueTimeText = computed(() => formatPaperTime12(this.issueTime()));
  readonly monthlyCountText = computed(() => {
    const count = this.monthlyCount();
    return count == null ? '' : toArabicDigits(count);
  });

  ngOnChanges(changes: SimpleChanges): void {
    if (!this.visible) {
      return;
    }
    if (changes['visible'] || changes['requestId'] || changes['request']) {
      this.load();
    }
  }

  ngOnDestroy(): void {
    this.detachPrintCleanup();
  }

  onHide(): void {
    this.visible = false;
    this.visibleChange.emit(false);
  }

  print(): void {
    this.detachPrintCleanup();
    document.body.classList.add('leave-request-printing');

    const cleanup = () => {
      document.body.classList.remove('leave-request-printing');
      window.removeEventListener('afterprint', cleanup);
      this.printCleanup = null;
    };
    this.printCleanup = cleanup;
    window.addEventListener('afterprint', cleanup);
    window.print();
  }

  private load(): void {
    const id = this.requestId || this.request?.id;
    if (!id) {
      return;
    }

    const seq = ++this.loadSeq;
    this.loading.set(true);
    this.resetPreviewFields();

    const request$ =
      this.request && this.request.id === id
        ? of(this.request)
        : this.permissionRequestService.getById(id);

    request$
      .pipe(
        switchMap((req) => {
          this.loadedRequest.set(req);
          const permissionDate = parseLocalDate(req.date) ?? new Date();
          const { fromDate, toDate } = monthRange(permissionDate);
          return forkJoin({
            employee: this.employeeService.getById(req.employeeId).pipe(catchError(() => of(undefined))),
            monthRequests: this.permissionRequestService
              .getAll({ employeeId: req.employeeId, fromDate, toDate })
              .pipe(catchError(() => of([] as PermissionRequestDto[]))),
          });
        }),
        finalize(() => {
          if (seq === this.loadSeq) {
            this.loading.set(false);
          }
        }),
      )
      .subscribe({
        next: ({ employee, monthRequests }) => {
          if (seq !== this.loadSeq) {
            return;
          }
          this.employee.set(employee ?? null);
          this.monthlyCount.set(
            monthRequests.filter(
              (item) =>
                item.status !== PermissionRequestStatus.Rejected &&
                item.status !== PermissionRequestStatus.Cancelled,
            ).length,
          );
        },
        error: () => {
          if (seq !== this.loadSeq) {
            return;
          }
          this.messageService.add({
            severity: 'error',
            summary: this.translate.instant('common.error'),
            detail: this.translate.instant('leave.permissions.print.load_failed'),
          });
        },
      });
  }

  private resetPreviewFields(): void {
    const now = new Date();
    this.issueDate.set(now);
    this.issueTime.set(now);
    this.monthlyCount.set(null);
    this.rightRank.set(DEFAULT_RIGHT_RANK);
    this.rightName.set(DEFAULT_RIGHT_NAME);
    this.rightTitle.set(DEFAULT_RIGHT_TITLE);
    this.leftRank.set(DEFAULT_LEFT_RANK);
    this.leftName.set(DEFAULT_LEFT_NAME);
    this.leftTitle.set(DEFAULT_LEFT_TITLE);
  }

  private detachPrintCleanup(): void {
    if (this.printCleanup) {
      this.printCleanup();
    }
  }
}
