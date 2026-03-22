import { Component, ChangeDetectionStrategy, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { RouterModule, Router } from '@angular/router';
import { TuiButton, TuiError, TuiTextfield, TuiLabel, TuiNotification, TuiLoader } from '@taiga-ui/core';
import { TuiFieldErrorPipe } from '@taiga-ui/kit';
import { TuiTextfieldControllerModule } from '@taiga-ui/legacy';
import { TranslocoModule } from '@jsverse/transloco';
import { ApiService } from '../../services/api.service';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-b2b-register',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    RouterModule,
    TuiButton,
    TuiTextfield,
    TuiLabel,
    TuiError,
    TuiFieldErrorPipe,
    TuiTextfieldControllerModule,
    TuiNotification,
    TuiLoader,
    TranslocoModule
  ],
  templateUrl: './b2b-register.html',
  styleUrls: ['./b2b-register.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class B2BRegisterComponent {
  private readonly fb = inject(FormBuilder);
  private readonly api = inject(ApiService);
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  readonly registerForm = this.fb.group({
    companyName: ['', [Validators.required]],
    taxCode: ['', [Validators.required]],
    address: ['', [Validators.required]],
    businessType: ['', [Validators.required]],
    description: [''],
  });

  success = false;
  loading = false;
  errorMsg: string | null = null;

  onSubmit(): void {
    const user = this.auth.currentUserValue;
    if (!user) {
      this.errorMsg = 'Please login first to submit B2B registration.';
      return;
    }

    if (this.registerForm.invalid) return;

    this.loading = true;
    this.errorMsg = null;

    const request = {
      userId: user.id,
      formData: JSON.stringify(this.registerForm.value)
    };

    this.api.createB2BForm(request).subscribe({
      next: () => {
        this.success = true;
        this.loading = false;
      },
      error: (err) => {
        this.errorMsg = 'Failed to submit registration. Please try again.';
        this.loading = false;
      }
    });
  }
}
