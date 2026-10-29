import { Pipe, PipeTransform, inject } from '@angular/core';
import { LanguageService } from '../../core/services/language.service';
import { formatAppDate, formatAppDateTime, formatAppTime } from '../utils/date.utils';

@Pipe({
  name: 'appDate',
  standalone: true,
  pure: false,
})
export class AppDatePipe implements PipeTransform {
  private readonly language = inject(LanguageService);

  transform(
    value: Date | string | number | null | undefined,
    mode: 'date' | 'datetime' | 'time' = 'date',
  ): string {
    const lang = this.language.currentLang();
    if (mode === 'datetime') {
      return formatAppDateTime(value, lang);
    }
    if (mode === 'time') {
      return formatAppTime(value, lang);
    }
    return formatAppDate(value, lang);
  }
}
