import {
  Component,
  EventEmitter,
  Input,
  Output,
  ViewEncapsulation,
  inject,
  signal,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { DialogModule } from 'primeng/dialog';
import { ButtonModule } from 'primeng/button';
import { MessageService } from 'primeng/api';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { EmployeeDocument } from '../../../core/models/employee.model';
import {
  isImageMediaUrl,
  isPdfMediaUrl,
  isPlaceholderDocumentUrl,
} from '../../../core/utils/media-url.util';

@Component({
  selector: 'app-document-preview-dialog',
  standalone: true,
  imports: [CommonModule, DialogModule, ButtonModule, TranslateModule],
  templateUrl: './document-preview-dialog.component.html',
  styleUrl: './document-preview-dialog.component.scss',
  encapsulation: ViewEncapsulation.None,
})
export class DocumentPreviewDialogComponent {
  private readonly messageService = inject(MessageService);
  private readonly translate = inject(TranslateService);
  private readonly sanitizer = inject(DomSanitizer);

  @Input() visible = false;

  private _document: EmployeeDocument | null = null;
  safePdfUrl: SafeResourceUrl | null = null;

  @Input()
  set document(value: EmployeeDocument | null) {
    this._document = value;
    this.updateSafePdfUrl();
  }
  get document(): EmployeeDocument | null {
    return this._document;
  }

  @Input() headerKey = 'document_preview.default_header';
  @Input() downloadFileName = '';

  @Output() visibleChange = new EventEmitter<boolean>();

  readonly downloading = signal(false);

  private updateSafePdfUrl(): void {
    const url = this._document?.fileUrl?.trim();
    if (url && !isPlaceholderDocumentUrl(url) && isPdfMediaUrl(url)) {
      this.safePdfUrl = this.sanitizer.bypassSecurityTrustResourceUrl(url);
    } else {
      this.safePdfUrl = null;
    }
  }

  onVisibleChange(value: boolean): void {
    this.visible = value;
    this.visibleChange.emit(value);
  }

  close(): void {
    this.onVisibleChange(false);
  }

  hasFile(): boolean {
    const url = this.document?.fileUrl?.trim();
    return Boolean(url) && !isPlaceholderDocumentUrl(url);
  }

  isImage(): boolean {
    return isImageMediaUrl(this.document?.fileUrl);
  }

  isPdf(): boolean {
    return isPdfMediaUrl(this.document?.fileUrl);
  }

  formatDateOrDash(d?: Date | null): string {
    if (!d) return '—';
    const dateObj = new Date(d);
    return isNaN(dateObj.getTime()) || dateObj.getTime() === 0
      ? '—'
      : dateObj.toLocaleDateString(this.translate.currentLang === 'en' ? 'en-GB' : 'ar-EG');
  }

  print(): void {
    const url = this.document?.fileUrl?.trim();
    if (!url || isPlaceholderDocumentUrl(url)) {
      this.messageService.add({
        severity: 'warn',
        summary: this.translate.instant('common.warning'),
        detail: this.translate.instant('document_preview.no_doc_print'),
      });
      return;
    }

    if (isImageMediaUrl(url)) {
      const safeUrl = url.replace(/"/g, '&quot;');
      const title = this.translate.instant(this.headerKey).replace(/</g, '');
      // Do not use noopener — it makes window.open return null and blocks document.write.
      const printWindow = window.open('', '_blank', 'width=800,height=900');
      if (!printWindow) {
        this.messageService.add({
          severity: 'error',
          summary: this.translate.instant('common.error'),
          detail: this.translate.instant('document_preview.print_window_blocked'),
        });
        return;
      }

      printWindow.document.write(`<!DOCTYPE html>
<html dir="rtl" lang="ar">
<head>
  <meta charset="utf-8" />
  <title>${title}</title>
  <style>
    body { margin: 0; display: flex; align-items: center; justify-content: center; min-height: 100vh; background: #fff; }
    img { max-width: 100%; max-height: 100vh; object-fit: contain; }
  </style>
</head>
<body>
  <img src="${safeUrl}" alt="${title}" onload="window.focus(); window.print();" />
</body>
</html>`);
      printWindow.document.close();
      return;
    }

    const fileWindow = window.open(url, '_blank');
    if (!fileWindow) {
      this.messageService.add({
        severity: 'error',
        summary: this.translate.instant('common.error'),
        detail: this.translate.instant('document_preview.open_file_failed'),
      });
      return;
    }
    fileWindow.focus();
  }

  download(): void {
    const doc = this.document;
    const url = doc?.fileUrl?.trim();
    if (!url || isPlaceholderDocumentUrl(url)) {
      this.messageService.add({
        severity: 'warn',
        summary: this.translate.instant('common.warning'),
        detail: this.translate.instant('document_preview.no_doc_download'),
      });
      return;
    }

    this.downloading.set(true);
    const fileName = this.resolveDownloadFileName(doc, url);

    fetch(url)
      .then((res) => {
        if (!res.ok) throw new Error('download failed');
        return res.blob();
      })
      .then((blob) => {
        const objectUrl = URL.createObjectURL(blob);
        const anchor = document.createElement('a');
        anchor.href = objectUrl;
        anchor.download = fileName;
        anchor.rel = 'noopener';
        anchor.style.display = 'none';
        document.body.appendChild(anchor);
        anchor.click();
        document.body.removeChild(anchor);
        URL.revokeObjectURL(objectUrl);
        this.messageService.add({
          severity: 'success',
          summary: this.translate.instant('common.success'),
          detail: this.translate.instant('document_preview.download_success'),
        });
      })
      .catch(() => {
        window.open(url, '_blank');
        this.messageService.add({
          severity: 'info',
          summary: this.translate.instant('common.warning'),
          detail: this.translate.instant('document_preview.download_fallback'),
        });
      })
      .finally(() => this.downloading.set(false));
  }

  private resolveDownloadFileName(doc: EmployeeDocument | null, url: string): string {
    if (this.downloadFileName?.trim()) {
      return this.downloadFileName.trim();
    }

    const path = url.split('?')[0];
    const extMatch = path.match(/\.(png|jpe?g|gif|webp|bmp|pdf|svg)$/i);
    const extRaw =
      extMatch?.[1]?.toLowerCase() ??
      (isImageMediaUrl(url) ? 'jpg' : isPdfMediaUrl(url) ? 'pdf' : 'pdf');
    const ext = extRaw === 'jpeg' ? 'jpg' : extRaw;
    const base = doc?.documentNumber?.trim() || doc?.name?.trim() || 'document';
    return `${base}.${ext}`;
  }
}
