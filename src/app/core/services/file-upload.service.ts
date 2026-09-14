import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface FileUploadResult {
  success?: boolean;
  data?: string | null;
  message?: string | null;
}

@Injectable({ providedIn: 'root' })
export class FileUploadService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = environment.apiBaseUrl.replace(/\/$/, '');

  /**
   * Shared multipart upload. Returns the relative path stored under /uploads/{folder}/.
   * @param folder e.g. 'employees/documents', 'custody/documents'
   */
  upload(file: File, folder: string): Observable<string> {
    const form = new FormData();
    form.append('file', file, file.name);
    form.append('folder', folder);

    return this.http
      .post<FileUploadResult>(`${this.baseUrl}/api/Files/upload`, form)
      .pipe(
        map((res) => {
          const path = res?.data?.trim();
          if (!path) {
            throw new Error(res?.message || 'Upload failed');
          }
          return path;
        })
      );
  }
}
