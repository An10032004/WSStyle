import {
  Component,
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  inject,
  OnInit,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  FormsModule,
  ReactiveFormsModule,
  FormBuilder,
  Validators,
  AbstractControl,
  ValidationErrors,
} from '@angular/forms';
import { RouterModule } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import { TuiButton, TuiError, TuiTextfield, TuiLabel, TuiNotification, TuiLoader, TuiIcon } from '@taiga-ui/core';
import { TuiFieldErrorPipe } from '@taiga-ui/kit';
import { TuiTextfieldControllerModule, TuiTextareaModule } from '@taiga-ui/legacy';
import { TranslocoModule } from '@jsverse/transloco';
import { ApiService, User } from '../../services/api.service';
import { AuthService } from '../../services/auth.service';
import { StorefrontHeaderComponent } from '../../shared/components/storefront-header/storefront-header';
import { StorefrontFooterComponent } from '../../shared/components/storefront-footer/storefront-footer';

type PageState = 'loading' | 'guest' | 'dealer' | 'pending' | 'form';

/** MST VN: 10 số hoặc 13 số (chi nhánh), có thể gõ dấu - giữa phần mở rộng. */
function taxCodeValidator(control: AbstractControl): ValidationErrors | null {
  const raw = (control.value ?? '').toString().trim().replace(/\s/g, '');
  const digits = raw.replace(/-/g, '');
  if (!digits.length) return null;
  if (!/^\d+$/.test(digits)) return { taxCodeFormat: true };
  if (digits.length !== 10 && digits.length !== 13) return { taxCodeLength: true };
  return null;
}

@Component({
  selector: 'app-b2b-register',
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
    TuiTextareaModule,
    TuiNotification,
    TuiLoader,
    TranslocoModule,
    StorefrontHeaderComponent,
    StorefrontFooterComponent,
  ],
  templateUrl: './b2b-register.html',
  styleUrls: ['./b2b-register.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class B2BRegisterComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly api = inject(ApiService);
  readonly auth = inject(AuthService);
  private readonly cdr = inject(ChangeDetectorRef);

  readonly registerForm = this.fb.group({
    companyName: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(255)]],
    taxCode: ['', [Validators.required, taxCodeValidator]],
    address: ['', [Validators.required, Validators.minLength(5), Validators.maxLength(500)]],
    businessType: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(200)]],
    description: ['', [Validators.maxLength(2000)]],
  });

  pageState: PageState = 'loading';
  loading = false;
  errorMsg: string | null = null;

  /** Chi tiết từ tags.b2bRegistrationDetails khi đã là đại lý */
  b2bDetails: {
    address?: string;
    businessType?: string;
    description?: string;
  } | null = null;

  ngOnInit(): void {
    const user = this.auth.currentUserValue;
    if (!user) {
      this.pageState = 'guest';
      this.cdr.markForCheck();
      return;
    }
    this.pageState = 'loading';
    this.api.getUserById(user.id).subscribe({
      next: (fresh) => {
        this.auth.updateStoredUser(fresh);
        this.applyProfileAndState(fresh);
        this.cdr.markForCheck();
      },
      error: () => {
        const u = this.auth.currentUserValue;
        if (u) this.applyProfileAndState(u);
        else this.pageState = 'guest';
        this.cdr.markForCheck();
      },
    });
  }

  private applyProfileAndState(u: User): void {
    this.parseB2bDetails(u);
    this.pageState = this.resolvePageState(u);
  }

  private resolvePageState(u: User): PageState {
    if (this.auth.isWholesaleApplicationPending(u)) return 'pending';
    if (this.auth.isApprovedWholesaleCustomer(u)) return 'dealer';
    return 'form';
  }

  private parseB2bDetails(user: User): void {
    this.b2bDetails = null;
    if (!user.tags) return;
    try {
      const t = JSON.parse(user.tags as string);
      const d = t?.b2bRegistrationDetails;
      if (d && typeof d === 'object') {
        this.b2bDetails = {
          address: d.address != null ? String(d.address) : '',
          businessType: d.businessType != null ? String(d.businessType) : '',
          description: d.description != null ? String(d.description) : '',
        };
      }
    } catch {
      /* ignore */
    }
  }

  onSubmit(): void {
    const user = this.auth.currentUserValue;
    if (!user) {
      this.errorMsg = 'Vui lòng đăng nhập để gửi hồ sơ đại lý.';
      return;
    }

    if (this.registerForm.invalid) {
      this.registerForm.markAllAsTouched();
      this.cdr.markForCheck();
      return;
    }

    this.loading = true;
    this.errorMsg = null;

    const raw = this.registerForm.getRawValue();
    const payload = {
      companyName: (raw.companyName ?? '').trim(),
      taxCode: (raw.taxCode ?? '').trim().replace(/\s/g, ''),
      address: (raw.address ?? '').trim(),
      businessType: (raw.businessType ?? '').trim(),
      description: (raw.description ?? '').trim(),
    };

    const request = {
      userId: user.id,
      formData: JSON.stringify(payload),
    };

    this.api.createB2BForm(request).subscribe({
      next: () => {
        this.loading = false;
        this.pageState = 'pending';
        this.api.getUserById(user.id).subscribe({
          next: (fresh) => {
            this.auth.updateStoredUser(fresh);
            this.applyProfileAndState(fresh);
            this.cdr.markForCheck();
          },
          error: () => {
            this.cdr.markForCheck();
          },
        });
        this.cdr.markForCheck();
      },
      error: (err: HttpErrorResponse) => {
        const body = err.error as { message?: string } | undefined;
        this.errorMsg = body?.message ?? err.message ?? 'Gửi hồ sơ thất bại. Vui lòng thử lại.';
        this.loading = false;
        this.cdr.markForCheck();
      },
    });
  }
}
