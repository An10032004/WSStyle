import { Component, ChangeDetectionStrategy, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, Validators, AbstractControl, ValidationErrors, AsyncValidatorFn } from '@angular/forms';
import { RouterModule, Router } from '@angular/router';
import { TuiButton, TuiError, TuiTextfield, TuiLabel, TuiIcon } from '@taiga-ui/core';
import { TuiFieldErrorPipe, TuiPassword } from '@taiga-ui/kit';
import { TuiTextfieldControllerModule } from '@taiga-ui/legacy';
import { TranslocoModule } from '@jsverse/transloco';
import { AuthService } from '../../services/auth.service';
import { ApiService } from '../../services/api.service';
import { debounceTime, switchMap, take, first, of, Observable, map } from 'rxjs';

@Component({
  selector: 'app-register',
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
  templateUrl: './register.html',
  styleUrls: ['./register.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RegisterComponent {
  private readonly fb = inject(FormBuilder);
  private readonly auth = inject(AuthService);
  private readonly api = inject(ApiService);
  private readonly router = inject(Router);

  readonly registerForm = this.fb.group({
    email: [
      '', 
      [Validators.required, Validators.email], 
      [this.emailUniqueValidator()]
    ],
    password: ['', [Validators.required, Validators.minLength(6)]],
    fullName: ['', Validators.required],
    phone: [
      '', 
      [Validators.required, Validators.pattern(/^0[0-9]{9}$/)],
      [this.phoneUniqueValidator()]
    ],
  }, { validators: [this.passwordPolicyValidator] });

  private passwordPolicyValidator(group: AbstractControl): ValidationErrors | null {
    const email = group.get('email')?.value;
    const phone = group.get('phone')?.value;
    const password = group.get('password')?.value;

    if (!password) return null;

    if (password === email || (phone && password.includes(phone))) {
      return { passwordPolicy: true };
    }
    return null;
  }

  private emailUniqueValidator(): AsyncValidatorFn {
    return (control: AbstractControl): Observable<ValidationErrors | null> => {
      if (!control.value) return of(null);
      return control.valueChanges.pipe(
        debounceTime(500),
        take(1),
        switchMap(email => this.api.checkEmail(email)),
        map(exists => (exists ? { emailExists: true } : null)),
        first()
      );
    };
  }

  private phoneUniqueValidator(): AsyncValidatorFn {
    return (control: AbstractControl): Observable<ValidationErrors | null> => {
      if (!control.value) return of(null);
      return control.valueChanges.pipe(
        debounceTime(500),
        take(1),
        switchMap(phone => this.api.checkPhone(phone)),
        map(exists => (exists ? { phoneExists: true } : null)),
        first()
      );
    };
  }

  errorMsg: string | null = null;
  loading = false;

  onSubmit(): void {
    if (this.registerForm.invalid) {
      this.registerForm.markAllAsTouched();
      return;
    }

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
