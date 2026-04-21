import { HttpErrorResponse } from '@angular/common/http';

/**
 * Đọc {@code message} từ body JSON kiểu ApiResponse / AuthResponse khi API trả 4xx/5xx.
 */
export function readAuthApiMessage(err: unknown, fallback: string): string {
  if (!(err instanceof HttpErrorResponse)) {
    return fallback;
  }
  const body = err.error;
  if (body && typeof body === 'object') {
    const msg = (body as { message?: unknown }).message;
    if (typeof msg === 'string' && msg.trim().length > 0) {
      return msg.trim();
    }
  }
  return fallback;
}

/** Alias — dùng cho mọi endpoint trả {@code ApiResponse} có {@code message}. */
export const readApiErrorMessage = readAuthApiMessage;
