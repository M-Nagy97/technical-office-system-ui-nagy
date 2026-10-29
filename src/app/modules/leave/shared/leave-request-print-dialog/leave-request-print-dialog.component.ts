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
import { DropdownModule } from 'primeng/dropdown';
import { CalendarModule } from 'primeng/calendar';
import { ProgressSpinnerModule } from 'primeng/progressspinner';
import { MessageService } from 'primeng/api';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import {
  EmployeeService,
  LeaveBalanceService,
  LeaveRequestService,
} from '../../../../core/services';
import { Employee } from '../../../../core/models/employee.model';
import { EmployeeLeaveBalanceDto } from '../../../../core/models/leave-balance.model';
import { LeaveRequestDto } from '../../../../core/models/leave-request.model';

const PERIODIC_LEAVE_ID = '11111111-1111-1111-1111-111111111111';
const EMERGENCY_LEAVE_ID = '22222222-2222-2222-2222-222222222222';

const DEFAULT_RIGHT_RANK = 'نقيب /';
const DEFAULT_RIGHT_NAME = 'محمد ناجي شحاتة';
const DEFAULT_RIGHT_TITLE = 'رئيس قسم الشئون الإدارية';
const DEFAULT_LEFT_RANK = 'لواء /';
const DEFAULT_LEFT_NAME = 'عمرو نصار';
const DEFAULT_LEFT_TITLE = 'مدير إدارة مركز تكنولوجيا المعلومات';

const ARABIC_DIGITS = '٠١٢٣٤٥٦٧٨٩';

export function toArabicDigits(value: string | number | null | undefined): string {
  if (value == null || value === '') {
    return '';
  }
  return String(value).replace(/\d/g, (d) => ARABIC_DIGITS[Number(d)]);
}

export function formatPaperDate(value: string | Date | null | undefined): string {
  if (value == null || value === '') {
    return '';
  }

  if (typeof value === 'string') {
    const iso = value.slice(0, 10);
    if (/^\d{4}-\d{2}-\d{2}$/.test(iso)) {
      const [y, m, d] = iso.split('-');
      return toArabicDigits(`${y}/${m}/${d}`);
    }
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) {
      return '';
    }
    value = parsed;
  }

  if (value instanceof Date) {
    if (Number.isNaN(value.getTime())) {
      return '';
    }
    const y = value.getFullYear();
    const m = String(value.getMonth() + 1).padStart(2, '0');
    const d = String(value.getDate()).padStart(2, '0');
    return toArabicDigits(`${y}/${m}/${d}`);
  }

  return '';
}

function yearFromStartDate(startDate: string | undefined): number {
  const y = Number(startDate?.slice(0, 4));
  return Number.isFinite(y) && y > 1900 ? y : new Date().getFullYear();
}

function matchBalanceKind(
  row: Pick<EmployeeLeaveBalanceDto, 'leaveTypeId' | 'leaveTypeName' | 'leaveTypeArabicName'>,
): 'annual' | 'emergency' | 'other' {
  if (row.leaveTypeId === PERIODIC_LEAVE_ID) {
    return 'annual';
  }
  if (row.leaveTypeId === EMERGENCY_LEAVE_ID) {
    return 'emergency';
  }
  const blob = `${row.leaveTypeName ?? ''} ${row.leaveTypeArabicName ?? ''}`.toLowerCase();
  if (/اعتياد|annual|periodic|دوري/.test(blob)) {
    return 'annual';
  }
  if (/طارئ|emergency|عارضة|casual/.test(blob)) {
    return 'emergency';
  }
  return 'other';
}

@Component({
  selector: 'app-leave-request-print-dialog',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    DialogModule,
    ButtonModule,
    InputTextModule,
    DropdownModule,
    CalendarModule,
    ProgressSpinnerModule,
    TranslateModule,
  ],
  templateUrl: './leave-request-print-dialog.component.html',
  styleUrl: './leave-request-print-dialog.component.scss',
})
export class LeaveRequestPrintDialogComponent implements OnChanges, OnDestroy {
  private readonly leaveRequestService = inject(LeaveRequestService);
  private readonly employeeService = inject(EmployeeService);
  private readonly leaveBalanceService = inject(LeaveBalanceService);
  private readonly messageService = inject(MessageService);
  private readonly translate = inject(TranslateService);

  @Input() visible = false;
  @Input() requestId = '';
  @Input() request: LeaveRequestDto | null = null;

  @Output() visibleChange = new EventEmitter<boolean>();

  readonly loading = signal(false);
  readonly loadedRequest = signal<LeaveRequestDto | null>(null);
  readonly employee = signal<Employee | null>(null);
  readonly employees = signal<Employee[]>([]);
  readonly annualBalance = signal<EmployeeLeaveBalanceDto | null>(null);
  readonly emergencyBalance = signal<EmployeeLeaveBalanceDto | null>(null);

  readonly ledgerSerial = signal('');
  readonly substituteId = signal<string | null>(null);
  readonly substituteName = signal('');
  readonly issueDate = signal<Date>(new Date());
  readonly rightRank = signal(DEFAULT_RIGHT_RANK);
  readonly rightName = signal(DEFAULT_RIGHT_NAME);
  readonly rightTitle = signal(DEFAULT_RIGHT_TITLE);
  readonly leftRank = signal(DEFAULT_LEFT_RANK);
  readonly leftName = signal(DEFAULT_LEFT_NAME);
  readonly leftTitle = signal(DEFAULT_LEFT_TITLE);

  private loadSeq = 0;
  private printCleanup: (() => void) | null = null;

  readonly substituteOptions = computed(() => {
    const requesterId = this.loadedRequest()?.employeeId;
    return this.employees().filter((emp) => emp.id !== requesterId);
  });

  readonly employeeName = computed(
    () => this.employee()?.fullName || this.loadedRequest()?.employeeName || '',
  );
  readonly toArabicDigits = toArabicDigits;
  readonly employeeNumber = computed(() => toArabicDigits(this.employee()?.employeeNumber || ''));
  readonly departmentLine = computed(() => {
    const emp = this.employee();
    if (!emp) {
      return '';
    }
    return emp.section || emp.department || '';
  });
  readonly phone = computed(() =>
    toArabicDigits(this.employee()?.phone || this.employee()?.alternatePhone || ''),
  );
  readonly address = computed(() => this.employee()?.address || '');
  readonly leaveTypeTitle = computed(() => {
    const req = this.loadedRequest();
    return req?.leaveTypeArabicName || req?.leaveTypeName || '';
  });
  readonly totalDays = computed(() => toArabicDigits(this.loadedRequest()?.totalDays ?? ''));
  readonly startDateText = computed(() => formatPaperDate(this.loadedRequest()?.startDate));
  readonly endDateText = computed(() => formatPaperDate(this.loadedRequest()?.endDate));
  readonly notes = computed(() => this.loadedRequest()?.reason?.trim() || '');
  readonly issueDateText = computed(() => formatPaperDate(this.issueDate()));

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

  onSubstituteChange(id: string | null): void {
    this.substituteId.set(id);
    const emp = this.employees().find((e) => e.id === id);
    this.substituteName.set(emp?.fullName ?? '');
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

  formatBalance(value: number | null | undefined): string {
    if (value === null || value === undefined) {
      return '';
    }
    return toArabicDigits(value);
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
        : this.leaveRequestService.getById(id);

    request$
      .pipe(
        switchMap((req) => {
          this.loadedRequest.set(req);
          const year = yearFromStartDate(req.startDate);
          return forkJoin({
            employee: this.employeeService.getById(req.employeeId).pipe(
              catchError(() => of(undefined)),
            ),
            balances: this.leaveBalanceService.getByEmployee(req.employeeId, year).pipe(
              catchError(() => of([] as EmployeeLeaveBalanceDto[])),
            ),
            employees: this.employeeService.fetchAll().pipe(
              catchError(() => of(this.employeeService.getList())),
            ),
          });
        }),
        finalize(() => {
          if (seq === this.loadSeq) {
            this.loading.set(false);
          }
        }),
      )
      .subscribe({
        next: ({ employee, balances, employees }) => {
          if (seq !== this.loadSeq) {
            return;
          }
          this.employee.set(employee ?? null);
          this.employees.set(employees || []);
          this.annualBalance.set(balances.find((b) => matchBalanceKind(b) === 'annual') ?? null);
          this.emergencyBalance.set(
            balances.find((b) => matchBalanceKind(b) === 'emergency') ?? null,
          );
        },
        error: () => {
          if (seq !== this.loadSeq) {
            return;
          }
          this.messageService.add({
            severity: 'error',
            summary: this.translate.instant('common.error'),
            detail: this.translate.instant('leave.print.load_failed'),
          });
        },
      });
  }

  private resetPreviewFields(): void {
    this.ledgerSerial.set('');
    this.substituteId.set(null);
    this.substituteName.set('');
    this.issueDate.set(new Date());
    this.rightRank.set(DEFAULT_RIGHT_RANK);
    this.rightName.set(DEFAULT_RIGHT_NAME);
    this.rightTitle.set(DEFAULT_RIGHT_TITLE);
    this.leftRank.set(DEFAULT_LEFT_RANK);
    this.leftName.set(DEFAULT_LEFT_NAME);
    this.leftTitle.set(DEFAULT_LEFT_TITLE);
    this.annualBalance.set(null);
    this.emergencyBalance.set(null);
  }

  private detachPrintCleanup(): void {
    if (this.printCleanup) {
      this.printCleanup();
    }
  }
}
