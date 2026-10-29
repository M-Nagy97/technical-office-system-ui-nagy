import { Component, forwardRef, input } from '@angular/core';
import { ControlValueAccessor, FormsModule, NG_VALUE_ACCESSOR } from '@angular/forms';
import { CalendarModule } from 'primeng/calendar';
import { formatTimeFromDate, parseTimeToDate } from '../../utils/date.utils';

@Component({
  selector: 'app-time-input',
  standalone: true,
  imports: [CalendarModule, FormsModule],
  template: `
    <p-calendar
      [inputId]="inputId() || undefined"
      [ngModel]="innerValue"
      [ngModelOptions]="{ standalone: true }"
      (ngModelChange)="onInnerChange($event)"
      [timeOnly]="true"
      [showTime]="true"
      hourFormat="12"
      [placeholder]="placeholder()"
      [showIcon]="true"
      icon="pi pi-clock"
      [appendTo]="appendTo()"
      [styleClass]="styleClass()"
      [disabled]="disabled"
      (onBlur)="markTouched()"
      (onClose)="markTouched()"
    />
  `,
  styles: [
    `
      :host {
        display: block;
      }

      :host ::ng-deep .p-calendar {
        width: 100%;
      }
    `,
  ],
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => TimeInputComponent),
      multi: true,
    },
  ],
})
export class TimeInputComponent implements ControlValueAccessor {
  readonly inputId = input<string | null>(null);
  readonly placeholder = input('hh:mm AM');
  readonly appendTo = input<string | HTMLElement | undefined>('body');
  readonly styleClass = input('w-full');
  readonly asTimeString = input(false);

  innerValue: Date | null = null;
  disabled = false;

  private onChange: (value: Date | string | null) => void = () => {};
  private onTouched: () => void = () => {};

  writeValue(value: Date | string | null | undefined): void {
    this.innerValue = parseTimeToDate(value);
  }

  registerOnChange(fn: (value: Date | string | null) => void): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: () => void): void {
    this.onTouched = fn;
  }

  setDisabledState(isDisabled: boolean): void {
    this.disabled = isDisabled;
  }

  onInnerChange(value: Date | null): void {
    this.innerValue = value;
    this.markTouched();
    if (!value) {
      this.onChange(null);
      return;
    }

    this.onChange(this.asTimeString() ? formatTimeFromDate(value) ?? null : value);
  }

  markTouched(): void {
    this.onTouched();
  }
}
