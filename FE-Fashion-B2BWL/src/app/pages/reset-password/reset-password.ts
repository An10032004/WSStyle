import { Component, ChangeDetectionStrategy, inject, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { RouterModule, Router, ActivatedRoute } from '@angular/router';
import { TuiButton, TuiError, TuiTextfield, TuiLabel, TuiIcon } from '@taiga-ui/core';
import { TuiFieldErrorPipe } from '@taiga-ui/kit';
import { TuiTextfieldControllerModule } from '@taiga-ui/legacy';
import { TranslocoModule } from '@jsverse/transloco';
import { AuthService } from '../../services/auth.service';
import { readAuthApiMessage } from '../../utils/auth-http.util';

@Component({
  selector: 'app-reset-password',
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
    TuiError,
    TuiFieldErrorPipe,
    TuiTextfieldControllerModule,
    TranslocoModule,
  ],
  templateUrl: './reset-password.html',
  styleUrls: ['./reset-password.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ResetPasswordComponent {
  private readonly fb = inject(FormBuilder);
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly cdr = inject(ChangeDetectorRef);

  readonly token = (this.route.snapshot.queryParamMap.get('token') || '').trim();

  readonly form = this.fb.group({
    password: ['', [Validators.required, Validators.minLength(6)]],
    confirm: ['', [Validators.required, Validators.minLength(6)]],
  });

  errorMsg: string | null = null;
  successMsg: string | null = null;
  loading = false;

  onSubmit(): void {
    if (!this.token || this.form.invalid) return;
    const { password, confirm } = this.form.value;
    if (password !== confirm) {
      this.errorMsg = 'Hai lần nhập mật khẩu không khớp.';
      this.cdr.markForCheck();
      return;
    }
    this.loading = true;
    this.errorMsg = null;
    this.successMsg = null;
    this.auth.completePasswordReset(this.token, password!).subscribe({
      next: (res) => {
        if (res.success) {
          this.successMsg = res.message?.trim() || 'Mật khẩu đã được cập nhật. Đang chuyển đến đăng nhập…';
          this.loading = false;
          this.cdr.markForCheck();
          setTimeout(() => void this.router.navigate(['/login']), 1200);
        } else {
          this.errorMsg = res.message?.trim() || 'Không thể đặt lại mật khẩu.';
          this.loading = false;
          this.cdr.markForCheck();
        }
      },
      error: (err) => {
        this.errorMsg = readAuthApiMessage(err, 'Liên kết không hợp lệ hoặc đã hết hạn.');
        this.loading = false;
        this.cdr.markForCheck();
      },
    });
  }
}
