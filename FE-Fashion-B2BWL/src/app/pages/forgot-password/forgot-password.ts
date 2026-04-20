import { Component, ChangeDetectionStrategy, inject, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { TuiButton, TuiError, TuiTextfield, TuiLabel, TuiIcon } from '@taiga-ui/core';
import { TuiFieldErrorPipe } from '@taiga-ui/kit';
import { TuiTextfieldControllerModule } from '@taiga-ui/legacy';
import { TranslocoModule } from '@jsverse/transloco';
import { AuthService } from '../../services/auth.service';
import { readAuthApiMessage } from '../../utils/auth-http.util';

@Component({
  selector: 'app-forgot-password',
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
  templateUrl: './forgot-password.html',
  styleUrls: ['./forgot-password.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ForgotPasswordComponent {
  private readonly fb = inject(FormBuilder);
  private readonly auth = inject(AuthService);
  private readonly cdr = inject(ChangeDetectorRef);

  readonly form = this.fb.group({
    email: ['', [Validators.required, Validators.email]],
  });

  errorMsg: string | null = null;
  successMsg: string | null = null;
  loading = false;

  onSubmit(): void {
    if (this.form.invalid) return;
    this.loading = true;
    this.errorMsg = null;
    this.successMsg = null;
    const email = this.form.value.email!;
    this.auth.forgotPassword(email).subscribe({
      next: (res) => {
        this.successMsg =
          res.message?.trim() ||
          'Nếu email đã đăng ký, bạn sẽ nhận hướng dẫn đặt lại mật khẩu.';
        this.loading = false;
        this.cdr.markForCheck();
      },
      error: (err) => {
        this.errorMsg = readAuthApiMessage(err, 'Không thể gửi yêu cầu. Vui lòng thử lại sau.');
        this.loading = false;
        this.cdr.markForCheck();
      },
    });
  }
}
