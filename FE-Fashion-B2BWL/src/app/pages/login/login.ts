import { Component, ChangeDetectionStrategy, inject, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { RouterModule, Router } from '@angular/router';
import { TuiButton, TuiError, TuiTextfield, TuiLabel, TuiIcon } from '@taiga-ui/core';
import { TuiFieldErrorPipe, TuiPassword } from '@taiga-ui/kit';
import { TuiTextfieldControllerModule } from '@taiga-ui/legacy';
import { TranslocoModule } from '@jsverse/transloco';
import { AuthService } from '../../services/auth.service';
import { readAuthApiMessage } from '../../utils/auth-http.util';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    RouterModule,
    TuiButton,
    TuiIcon,
    TuiTextfield,
    TuiLabel,
    TuiPassword,
    TuiError,
    TuiFieldErrorPipe,
    TuiTextfieldControllerModule,
    TranslocoModule
  ],
  templateUrl: './login.html',
  styleUrls: ['./login.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LoginComponent {
  private readonly fb = inject(FormBuilder);
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly cdr = inject(ChangeDetectorRef);

  readonly loginForm = this.fb.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(6)]],
  });

  errorMsg: string | null = null;
  successMsg: string | null = null;
  loading = false;

  onSubmit(): void {
    if (this.loginForm.invalid) return;

    this.loading = true;
    this.errorMsg = null;
    this.successMsg = null;

    const { email, password } = this.loginForm.value;
    this.auth.login({ email: email!, password: password! }).subscribe({
      next: (res) => {
        if (res.success && res.user) {
          this.errorMsg = null;
          this.successMsg = 'Đăng nhập thành công. Đang chuyển hướng…';
          this.loading = false;
          this.cdr.markForCheck();

          const role = res.user.role?.toUpperCase() || '';
          const isAdmin = role === 'ADMINISTRATOR' || role === 'ADMIN' || role === 'STAFF';
          const target = isAdmin ? '/admin' : '/storefront';
          setTimeout(() => void this.router.navigate([target]), 450);
        } else {
          this.errorMsg = res.message?.trim() || 'Đăng nhập thất bại.';
          this.loading = false;
          this.cdr.markForCheck();
        }
      },
      error: (err) => {
        this.errorMsg = readAuthApiMessage(
          err,
          'Không thể đăng nhập. Vui lòng thử lại sau.'
        );
        this.loading = false;
        this.cdr.markForCheck();
      },
    });
  }
}
