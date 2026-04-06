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

  cart$ = this.cartService.cart$.pipe(map(items => items.filter(i => i.selected)), shareReplay(1)); 
  subtotal$ = this.cart$.pipe(map(items => items.reduce((sum, i) => sum + (i.price * i.quantity), 0)));
  totalItems$ = this.cart$.pipe(map(items => items.reduce((sum, i) => sum + i.quantity, 0)));
  
  shippingFee$ = new BehaviorSubject<number>(0);
  totalPrice$ = new BehaviorSubject<number>(0);

  isNetTermEligible$ = this.cart$.pipe(
    map(items => items.length > 0 && items.every(i => (i as any).isNetTermEligible)),
    startWith(false)
  );

  netTermDays$ = this.cart$.pipe(
    map(items => {
      const firstEligible = items.find(i => (i as any).isNetTermEligible);
      return (firstEligible as any)?.netTermDays || 0;
    }),
    startWith(0)
  );

  isPlacingOrder = false;

  ngOnInit() {
    const user = this.auth.currentUserValue;
    if (user) {
      this.checkoutForm.patchValue({
        fullName: user.fullName || '',
        phone: user.phone || ''
      });
    }

    // Calculate shipping and total
    this.subtotal$.pipe(
      switchMap(subtotal => 
        this.totalItems$.pipe(
          map(itemsCount => ({ subtotal, itemsCount }))
        )
      )
    ).subscribe(({ subtotal, itemsCount }) => {
      this.calculateShipping(subtotal, itemsCount);
    });

    // If cart is empty, go back to storefront
    this.cartService.cart$.subscribe(items => {
      if (items.length === 0 && !this.isPlacingOrder) {
        this.router.navigate(['/storefront']);
      }
    });
  }

  private calculateShipping(subtotal: number, itemsCount: number) {
    this.apiService.getShippingRules().subscribe(rules => {
      const activeRules = rules.filter(r => r.status === 'ACTIVE');
      if (activeRules.length === 0) {
        this.updateTotal(subtotal, 0);
        return;
      }

      // Sort by priority (lower is better, or match logic from backend)
      const sortedRules = activeRules.sort((a, b) => (a.priority || 0) - (b.priority || 0));
      const user = this.auth.currentUserValue;
      
      // Find matching rule
      let matchedRule = sortedRules.find(rule => {
        // Customer Group Check
        if (rule.applyCustomerType === 'GROUP' && rule.applyCustomerValue) {
          try {
            const val = JSON.parse(rule.applyCustomerValue);
            const groupIds = val.groupIds || [];
            return groupIds.includes(user?.customerGroup?.id);
          } catch(e) { return false; }
        }
        if (rule.applyCustomerType === 'LOGGED_IN') return !!user;
        if (rule.applyCustomerType === 'GUEST') return !user;
        return true; // ALL
      });

      if (!matchedRule) {
        this.updateTotal(subtotal, 0);
        return;
      }

      // Calculate fee from rateRanges
      let fee = 0;
      try {
        const ranges = JSON.parse(matchedRule.rateRanges || '[]');
        const valToCheck = matchedRule.baseOn === 'AMOUNT_RANGE' ? subtotal : itemsCount;
        
        const rangeMatch = ranges.find((r: any) => {
          const from = r.from ?? r.min ?? -1;
          const to = r.to ?? r.max ?? 999999999;
          return valToCheck >= from && valToCheck <= to;
        });

        if (rangeMatch) {
          fee = rangeMatch.rate || 0;
        }
      } catch (e) {
        console.error('Error parsing shipping ranges', e);
      }

      this.shippingFee$.next(fee);
      this.updateTotal(subtotal, fee);
    });
  }

  private updateTotal(subtotal: number, shipping: number) {
    this.totalPrice$.next(subtotal + shipping);
  }

  setPaymentMethod(method: string) {
    this.checkoutForm.get('paymentMethod')?.setValue(method);
  }

  onSubmit() {
    if (this.checkoutForm.invalid || this.isPlacingOrder) return;

    this.isPlacingOrder = true;
    const formValue = this.checkoutForm.value;
    const currentItems = this.cartService.cartItems.filter(i => i.selected);
    const user = this.auth.currentUserValue;
    const subtotal = currentItems.reduce((sum, i) => sum + (i.price * i.quantity), 0);
    const shippingFee = this.shippingFee$.value;
    const finalTotal = subtotal + shippingFee;

    const request: OrderRequest = {
      userId: user?.id,
      orderType: 'RETAIL',
      paymentMethod: formValue.paymentMethod,
      fullName: formValue.fullName,
      phone: formValue.phone,
      shippingAddress: formValue.shippingAddress,
      note: formValue.note,
      shippingFee: shippingFee,
      items: currentItems.map(i => ({
        productId: i.productId,
        variantId: i.variantId,
        quantity: i.quantity,
        unitPrice: i.price
      }))
    };

    this.apiService.createOrder(request).subscribe({
      next: (order) => {
        this.isPlacingOrder = false;
        this.currentOrder = order;
        if (formValue.paymentMethod === 'VNPAY') {
          // Generate VietQR URL
          // Bank: VietinBank (970415), Acc: 103877669895
          const bankId = '970415';
          const accountNo = '103877669895';
          const accountName = encodeURIComponent('NGUYEN VAN SON');
          const description = encodeURIComponent(`Thanh toan don hang #${order.id}`);
          
          this.paymentQrUrl = `https://img.vietqr.io/image/${bankId}-${accountNo}-compact2.png?amount=${finalTotal}&addInfo=${description}&accountName=${accountName}`;
          
          this.dialogs.open(this.paymentDialogTemplate, { 
            size: 'm', 
            dismissible: false,
            label: 'Secure Checkout' 
          }).subscribe(); // Removed the complete handler that was causing premature redirection
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

  onPaymentComplete(isPaidNotify: boolean = false) {
    const message = isPaidNotify 
      ? 'Chúng tôi đã nhận được thông báo chuyển khoản của bạn. Vui lòng chờ nhân viên kiểm tra nhé!'
      : 'Đơn hàng của bạn đã được ghi nhận. Bạn có thể thanh toán sau trong trang Lịch sử đơn hàng.';
    
    this.alerts.open(message, { 
      label: 'Đặt hàng thành công', 
      appearance: 'success',
      autoClose: 5000 
    }).subscribe();
    
    this.cartService.clearSelected();
    this.router.navigate(['/storefront']);
  }

  confirmPayment(observer: any) {
    if (!this.currentOrder) {
      observer.complete();
      return;
    }
    
    this.apiService.updatePaymentStatus(this.currentOrder.id, 'AWAITING_CONFIRMATION').subscribe({
      next: () => {
        this.onPaymentComplete(true);
        observer.complete();
      },
      error: () => {
        this.alerts.open('Có lỗi xảy ra khi thông báo thanh toán. Vui lòng thử lại sau!', { 
          label: 'Lỗi', 
          appearance: 'error' 
        }).subscribe();
        observer.complete();
      }
    });
  }

  cancelPayment(observer: any) {
    this.onPaymentComplete(false);
    observer.complete();
  }
}
