import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError, switchMap } from 'rxjs/operators';

export interface CloudinarySignResponse {
  cloudName: string;
  apiKey: string;
  timestamp: number;
  signature: string;
  folder: string;
  configured?: boolean;
  message?: string;
}

@Injectable({ providedIn: 'root' })
export class CloudinaryUploadService {
  private readonly http = inject(HttpClient);
  private readonly signUrl = '/api/media/cloudinary/signature';

  sign(folder?: string): Observable<CloudinarySignResponse> {
    return this.http.post<CloudinarySignResponse>(this.signUrl, folder ? { folder } : {}).pipe(
      catchError((e: HttpErrorResponse) => {
        const body = e.error as { message?: string } | undefined;
        const msg =
          body?.message ||
          (e.status === 503
            ? 'Cloudinary chưa cấu hình trên server (điền app.cloudinary.* trong application.properties).'
            : e.message);
        return throwError(() => new Error(msg || 'Signature request failed'));
      })
    );
  }

  /**
   * Upload image to Cloudinary using server-signed params. Returns secure_url (https) suitable for DB.
   */
  uploadImage(
    file: File,
    opts?: { folder?: string; maxBytes?: number; onProgress?: (percent: number) => void }
  ): Observable<string> {
    const maxBytes = opts?.maxBytes ?? 10 * 1024 * 1024;
    if (file.size > maxBytes) {
      return throwError(
        () => new Error(`File too large (max ${Math.round(maxBytes / (1024 * 1024))} MB)`)
      );
    }
    if (!file.type.startsWith('image/')) {
      return throwError(() => new Error('Please select an image file'));
    }
    return this.sign(opts?.folder).pipe(
      switchMap((sig) => {
        if (!sig?.cloudName || !sig.apiKey || !sig.signature) {
          return throwError(() => new Error('Invalid signature response from server'));
        }
        return this.postMultipart(file, sig, opts?.onProgress);
      })
    );
  }

  private postMultipart(
    file: File,
    sig: CloudinarySignResponse,
    onProgress?: (percent: number) => void
  ): Observable<string> {
    return new Observable<string>((subscriber) => {
      const fd = new FormData();
      fd.append('file', file);
      fd.append('api_key', sig.apiKey);
      fd.append('timestamp', String(sig.timestamp));
      fd.append('signature', sig.signature);
      if (sig.folder) {
        fd.append('folder', sig.folder);
      }
      const url = `https://api.cloudinary.com/v1_1/${sig.cloudName}/image/upload`;
      const xhr = new XMLHttpRequest();
      xhr.open('POST', url);
      xhr.upload.onprogress = (e) => {
        if (e.lengthComputable && onProgress) {
          onProgress(Math.round((100 * e.loaded) / e.total));
        }
      };
      xhr.onload = () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          try {
            const body = JSON.parse(xhr.responseText) as { secure_url?: string; error?: { message?: string } };
            if (body.error?.message) {
              subscriber.error(new Error(body.error.message));
              return;
            }
            const secure = body.secure_url;
            if (secure) {
              subscriber.next(secure);
              subscriber.complete();
            } else {
              subscriber.error(new Error('Upload response missing secure_url'));
            }
          } catch (err) {
            subscriber.error(err);
          }
        } else {
          let msg = `Upload failed (${xhr.status})`;
          try {
            const body = JSON.parse(xhr.responseText) as { error?: { message?: string } };
            if (body.error?.message) msg = body.error.message;
          } catch {
            if (xhr.responseText) msg = xhr.responseText.slice(0, 200);
          }
          subscriber.error(new Error(msg));
        }
      };
      xhr.onerror = () => subscriber.error(new Error('Network error during upload'));
      xhr.send(fd);
      return () => xhr.abort();
    });
  }
}
