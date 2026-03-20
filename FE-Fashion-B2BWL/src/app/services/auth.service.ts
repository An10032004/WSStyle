import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, tap } from 'rxjs';
import { map } from 'rxjs/operators';
import { User, ApiResponse } from './api.service';

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
      localStorage.setItem('auth_user', JSON.stringify(authRes.user));
      this.userSubject.next(authRes.user);
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
}
