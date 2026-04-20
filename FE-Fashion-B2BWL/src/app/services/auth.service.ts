import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, tap } from 'rxjs';
import { map } from 'rxjs/operators';
import { User, ApiResponse } from './api.service';

export type VoidApiResponse = ApiResponse<null | void>;

export interface AuthResponse {
  success: boolean;
  message: string;
  user: User;
  accessToken?: string;
  refreshToken?: string;
  tokenType?: string;
  expiresIn?: number;
}

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private userSubject = new BehaviorSubject<User | null>(this.getStoredUser());
  user$ = this.userSubject.asObservable();

  constructor(private http: HttpClient) {}

  login(credentials: { email: string; password: String }): Observable<AuthResponse> {
    return this.http.post<AuthResponse>('/api/auth/login', credentials).pipe(
      tap(res => {
        if (res.success && res.user) {
          this.setSession(res);
        }
      })
    );
  }

  forgotPassword(email: string): Observable<VoidApiResponse> {
    return this.http.post<VoidApiResponse>('/api/auth/forgot-password', { email });
  }

  completePasswordReset(token: string, newPassword: string): Observable<VoidApiResponse> {
    return this.http.post<VoidApiResponse>('/api/auth/complete-password-reset', {
      token,
      newPassword,
    });
  }

  register(userData: any): Observable<AuthResponse> {
    return this.http.post<AuthResponse>('/api/auth/register', userData).pipe(
      tap(res => {
        if (res.success && res.user) {
          this.setSession(res);
        }
      })
    );
  }

  logout() {
    localStorage.removeItem('auth_user');
    localStorage.removeItem('auth_token');
    localStorage.removeItem('refresh_token');
    this.userSubject.next(null);
  }

  refreshToken(): Observable<AuthResponse> {
    const refreshToken = localStorage.getItem('refresh_token');
    return this.http.post<AuthResponse>('/api/auth/refresh-token', { refreshToken }).pipe(
      tap(res => {
        if (res.success) {
          this.setSession(res);
        }
      })
    );
  }

  private setSession(authRes: AuthResponse) {
    if (authRes.user) {
      // Compute composite roles (primary + secondary from tags) before storing
      const u = authRes.user;
      (u as any).roles = this.computeRoles(u);
      // expose assignedRole (if any) at top-level for templates
      try {
        if (u.tags) {
          const t = JSON.parse(u.tags as string);
          (u as any).assignedRole = t?.assignedRole ?? null;
        } else {
          (u as any).assignedRole = null;
        }
      } catch (e) {
        (u as any).assignedRole = null;
      }
      localStorage.setItem('auth_user', JSON.stringify(u));
      this.userSubject.next(u);
    }
    
    if (authRes.accessToken) {
      localStorage.setItem('auth_token', authRes.accessToken);
    }
    
    if (authRes.refreshToken) {
      localStorage.setItem('refresh_token', authRes.refreshToken);
    }
  }

  private getStoredUser(): User | null {
    const user = localStorage.getItem('auth_user');
    return user ? JSON.parse(user) : null;
  }

  get currentUserValue(): User | null {
    return this.userSubject.value;
  }

  /** Cập nhật session sau khi backend đổi hồ sơ (vd. đăng ký đại lý). */
  updateStoredUser(user: User): void {
    // Ensure roles are computed when updating stored user
    (user as any).roles = this.computeRoles(user);
    try {
      if (user.tags) {
        const t = JSON.parse(user.tags as string);
        (user as any).assignedRole = t?.assignedRole ?? null;
      } else {
        (user as any).assignedRole = null;
      }
    } catch (e) {
      (user as any).assignedRole = null;
    }
    localStorage.setItem('auth_user', JSON.stringify(user));
    this.userSubject.next(user);
  }

  private computeRoles(user: User): string[] {
    const roles: string[] = [];
    if (user?.role) {
      roles.push(user.role);
    }
    if (user?.tags) {
      try {
        const t = JSON.parse(user.tags);
        const arr = t?.secondaryRoles ?? t?.roles;
        if (Array.isArray(arr)) {
          for (const r of arr) {
            if (typeof r === 'string' && r && !roles.includes(r)) roles.push(r);
          }
        }
      } catch (e) {
        // ignore parse errors
      }
    }
    return roles;
  }
}
