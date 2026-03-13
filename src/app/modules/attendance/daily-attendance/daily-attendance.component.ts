import { Component, OnInit, signal, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TableModule } from 'primeng/table';
import { CardModule } from 'primeng/card';
import { ButtonModule } from 'primeng/button';
import { CalendarModule } from 'primeng/calendar';
import { DropdownModule } from 'primeng/dropdown';
import { InputTextModule } from 'primeng/inputtext';
import { FileUploadModule } from 'primeng/fileupload';
import { AttendanceService } from '../../../core/services/attendance.service';
import { AttendanceRecord } from '../../../core/models/attendance.model';

const STATUS_OPTIONS = [
  { label: 'حاضر', value: 'present' },
  { label: 'غائب', value: 'absent' },
  { label: 'متأخر', value: 'late' },
  { label: 'معذور', value: 'excused' },
  { label: 'إجازة', value: 'vacation' },
  { label: 'إجازة مرضية', value: 'sick_leave' },
];

@Component({
  selector: 'app-daily-attendance',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    TableModule,
    CardModule,
    ButtonModule,
    CalendarModule,
    DropdownModule,
    InputTextModule,
    FileUploadModule,
  ],
  templateUrl: './daily-attendance.component.html',
  styleUrl: './daily-attendance.component.scss',
})
export class DailyAttendanceComponent implements OnInit {
  // private readonly attendanceService = inject(AttendanceService);

  // readonly selectedDate = signal(new Date());
  // readonly records = signal<AttendanceRecord[]>([]);
  // readonly loading = signal(false);
  // readonly statusOptions = STATUS_OPTIONS;

  // readonly stats = computed(() => {
  //   const list = this.records();
  //   return {
  //     present: list.filter((r) => r.status === 'present').length,
  //     absent: list.filter((r) => r.status === 'absent').length,
  //     late: list.filter((r) => r.status === 'late').length,
  //     vacation: list.filter((r) => r.status === 'vacation' || r.status === 'sick_leave').length,
  //   };
  // });

  ngOnInit(): void {
  //  this.loadForDate(this.selectedDate());
  }

  // onDateChange(date: Date): void {
  //   this.selectedDate.set(date);
  //   this.loadForDate(date);
  // }

  // loadForDate(date: Date): void {
  //   this.loading.set(true);
  //   const list = this.attendanceService.ensureRecordsForDate(date);
  //   this.records.set([...list]);
  //   this.loading.set(false);
  // }

  // updateCheckIn(record: AttendanceRecord, value: string): void {
  //   this.attendanceService.updateRecord(record.id, { checkIn: value });
  //   this.records.set(this.attendanceService.getRecordsByDateSync(this.selectedDate()));
  // }

  // updateCheckOut(record: AttendanceRecord, value: string): void {
  //   this.attendanceService.updateRecord(record.id, { checkOut: value });
  //   this.records.set(this.attendanceService.getRecordsByDateSync(this.selectedDate()));
  // }

  // updateStatus(record: AttendanceRecord, status: string): void {
  //   const s = status as AttendanceRecord['status'];
  //   const patch: Partial<AttendanceRecord> = { status: s };
  //   if (s === 'absent' || s === 'vacation' || s === 'sick_leave' || s === 'excused') {
  //     patch.checkIn = '--:--';
  //     patch.checkOut = '--:--';
  //     patch.workHours = 0;
  //     patch.lateMinutes = 0;
  //     patch.earlyLeaveMinutes = 0;
  //   } else if (s === 'present') {
  //     patch.checkIn = '08:00';
  //     patch.checkOut = '16:00';
  //     patch.workHours = 8;
  //     patch.lateMinutes = 0;
  //     patch.earlyLeaveMinutes = 0;
  //   } else if (s === 'late') {
  //     patch.checkIn = '08:30';
  //     patch.checkOut = '16:00';
  //     patch.workHours = 7.5;
  //     patch.lateMinutes = 30;
  //     patch.earlyLeaveMinutes = 0;
  //   }
  //   this.attendanceService.updateRecord(record.id, patch);
  //   this.records.set(this.attendanceService.getRecordsByDateSync(this.selectedDate()));
  // }

  // markAllPresent(): void {
  //   this.attendanceService.markAllPresentForDate(this.selectedDate());
  //   this.records.set(this.attendanceService.getRecordsByDateSync(this.selectedDate()));
  // }

  // onImportFile(): void {
  //   // Placeholder: open file dialog or show message
  // }

  // getRowClass(record: AttendanceRecord): string {
  //   switch (record.status) {
  //     case 'present':
  //       return 'row-present';
  //     case 'absent':
  //       return 'row-absent';
  //     case 'late':
  //       return 'row-late';
  //     case 'vacation':
  //     case 'sick_leave':
  //       return 'row-vacation';
  //     case 'excused':
  //       return 'row-excused';
  //     default:
  //       return '';
  //   }
  // }
}
