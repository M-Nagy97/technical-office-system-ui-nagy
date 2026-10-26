import { Pipe, PipeTransform, inject } from '@angular/core';
import { LanguageService } from '../../core/services/language.service';
import { formatAppDate, formatAppDateTime } from '../utils/date.utils';

@Pipe({
  name: 'appDate',
  standalone: true,
  pure: false,
})
export class AppDatePipe implements PipeTransform {
  private readonly language = inject(LanguageService);

  transform(
    value: Date | string | number | null | undefined,
    mode: 'date' | 'datetime' = 'date',
  ): string {
    const lang = this.language.currentLang();
    return mode === 'datetime' ? formatAppDateTime(value, lang) : formatAppDate(value, lang);
  }
}
