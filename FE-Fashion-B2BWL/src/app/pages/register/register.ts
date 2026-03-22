import { Component, ChangeDetectionStrategy, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { RouterModule, Router } from '@angular/router';
import { TuiButton, TuiError, TuiTextfield, TuiLabel } from '@taiga-ui/core';
import { TuiFieldErrorPipe, TuiPassword } from '@taiga-ui/kit';
import { TuiTextfieldControllerModule } from '@taiga-ui/legacy';
import { TranslocoModule } from '@jsverse/transloco';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    RouterModule,
    TuiButton,
    TuiTextfield,
    TuiLabel,
    TuiPassword,
    TuiError,
    TuiFieldErrorPipe,
    TuiTextfieldControllerModule,
    TranslocoModule
  ],
  templateUrl: './register.html',
  styleUrls: ['./register.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RegisterComponent {
  private readonly fb = inject(FormBuilder);
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  readonly registerForm = this.fb.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(6)]],
    fullName: ['', Validators.required],
    phone: ['', Validators.required],
  });

  errorMsg: string | null = null;
  loading = false;

  onSubmit(): void {
    if (this.registerForm.invalid) return;

    this.loading = true;
    this.errorMsg = null;
    
    this.auth.register(this.registerForm.value).subscribe({
      next: (res) => {
        if (res.success) {
          this.router.navigate(['/storefront']);
        } else {
          this.errorMsg = res.message;
          this.loading = false;
        }
      },
      error: (err) => {
        this.errorMsg = 'An unexpected error occurred. Please try again.';
        this.loading = false;
      }
    });
  }
}
