import { Component, ChangeDetectionStrategy, inject, OnInit, ViewChild, TemplateRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { FormBuilder, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { CartService, CartItem } from '../../services/cart.service';
import { TuiButton, TuiIcon, TuiFormatNumberPipe, TuiLabel, TuiAlertService, TuiLoader, TuiTextfield, TuiDialogService } from '@taiga-ui/core';
import { TuiBadge } from '@taiga-ui/kit';
import { BehaviorSubject, map, shareReplay, startWith, switchMap, tap } from 'rxjs';
import { TranslocoModule } from '@jsverse/transloco';
import { StorefrontHeaderComponent } from '../../shared/components/storefront-header/storefront-header';
import { StorefrontFooterComponent } from '../../shared/components/storefront-footer/storefront-footer';
import { ApiService, OrderRequest } from '../../services/api.service';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-checkout',
  standalone: true,
  imports: [
    CommonModule, RouterModule, FormsModule, ReactiveFormsModule,
    TuiButton, TuiIcon, TuiBadge, TuiLoader, TuiTextfield,
    TuiFormatNumberPipe, TuiLabel, TranslocoModule,
    StorefrontHeaderComponent, StorefrontFooterComponent
  ],
  templateUrl: './checkout.html',
  styleUrls: ['./checkout.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CheckoutComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly cartService = inject(CartService);
  private readonly apiService = inject(ApiService);
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly alerts = inject(TuiAlertService);
  private readonly dialogs = inject(TuiDialogService);

  @ViewChild('paymentDialog') paymentDialogTemplate!: TemplateRef<any>;
  paymentQrUrl = '';
  currentOrder: any = null;

  copyToClipboard(text: string, label: string) {
    if (!text) return;
    navigator.clipboard.writeText(text).then(() => {
      this.alerts.open(`${label} copied to clipboard!`, {
        appearance: 'success',
        autoClose: 2000
      }).subscribe();
    });
  }

  readonly checkoutForm: FormGroup = this.fb.group({
    fullName: ['', [Validators.required]],
    phone: ['', [Validators.required, Validators.pattern(/^[0-9]{10,11}$/)]],
    shippingAddress: ['', [Validators.required]],
    note: [''],
    paymentMethod: ['COD', [Validators.required]]
  });

  cart$ = this.cartService.cart$;
  totalItems$ = this.cart$.pipe(map(items => items.reduce((sum, i) => sum + i.quantity, 0)));
  totalPrice$ = this.cart$.pipe(map(items => items.reduce((sum, i) => sum + (i.price * i.quantity), 0)));

  isPlacingOrder = false;

  ngOnInit() {
    const user = this.auth.currentUserValue;
    if (user) {
      this.checkoutForm.patchValue({
        fullName: user.fullName || '',
        phone: user.phone || ''
      });
    }

    // If cart is empty, go back to storefront
    this.cartService.cart$.subscribe(items => {
      if (items.length === 0 && !this.isPlacingOrder) {
        this.router.navigate(['/storefront']);
      }
    });
  }

  setPaymentMethod(method: string) {
    this.checkoutForm.get('paymentMethod')?.setValue(method);
  }

  onSubmit() {
    if (this.checkoutForm.invalid || this.isPlacingOrder) return;

    this.isPlacingOrder = true;
    const formValue = this.checkoutForm.value;
    const currentItems = this.cartService.cartItems;
    const user = this.auth.currentUserValue;
    const total = currentItems.reduce((sum, i) => sum + (i.price * i.quantity), 0);

    const request: OrderRequest = {
      userId: user?.id,
      orderType: 'RETAIL',
      paymentMethod: formValue.paymentMethod,
      fullName: formValue.fullName,
      phone: formValue.phone,
      shippingAddress: formValue.shippingAddress,
      note: formValue.note,
      items: currentItems.map(i => ({
        productId: i.productId,
        variantId: i.variantId,
        quantity: i.quantity,
        unitPrice: i.price
      }))
    };

    this.apiService.createOrder(request).subscribe({
      next: (order) => {
        this.currentOrder = order;
        if (formValue.paymentMethod === 'VNPAY') {
          // Generate VietQR URL
          // Bank: VietinBank (970415), Acc: 0968987154
          const bankId = '970415';
          const accountNo = '103877669895';
          const accountName = encodeURIComponent('NGUYEN VAN SON');
          const description = encodeURIComponent(`Thanh toan don hang #${order.id}`);
          
          this.paymentQrUrl = `https://img.vietqr.io/image/${bankId}-${accountNo}-compact2.png?amount=${total}&addInfo=${description}&accountName=${accountName}`;
          
          this.dialogs.open(this.paymentDialogTemplate, { 
            size: 'm', 
            dismissible: false,
            label: 'Secure Checkout' 
          }).subscribe({
            complete: () => {
              this.onPaymentComplete();
            }
          });
        } else {
          this.onPaymentComplete();
        }
      },
      error: (err) => {
        this.alerts.open('An error occurred while placing your order. Please try again.', { 
          label: 'Order Failed', 
          appearance: 'error' 
        }).subscribe();
        this.isPlacingOrder = false;
      }
    });
  }

  onPaymentComplete() {
    this.alerts.open('Thank you for your order! We will process it shortly.', { 
      label: 'Order Successful', 
      appearance: 'success',
      autoClose: 5000 
    }).subscribe();
    this.cartService.clear();
    this.router.navigate(['/storefront']);
  }
}
