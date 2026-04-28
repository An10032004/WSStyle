import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  inject,
  OnInit,
  TemplateRef,
  ViewChild,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { FormBuilder, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { CartService, CartItem } from '../../services/cart.service';
import { TuiButton, TuiFormatNumberPipe, TuiLabel, TuiAlertService, TuiLoader, TuiTextfield, TuiDialogService, TuiDropdown } from '@taiga-ui/core';
import { TuiBadge } from '@taiga-ui/kit';
import { combineLatest, debounceTime, map, of, shareReplay, startWith, switchMap, take } from 'rxjs';
import { TranslocoModule } from '@jsverse/transloco';
import { StorefrontHeaderComponent } from '../../shared/components/storefront-header/storefront-header';
import { StorefrontFooterComponent } from '../../shared/components/storefront-footer/storefront-footer';
import { ApiService, DebtSummary, NetTermQuote, OrderRequest } from '../../services/api.service';
import { AuthService } from '../../services/auth.service';
import { QuantityBreakTableComponent } from '../../shared/components/quantity-break-table/quantity-break-table';
import { buildOrderItemPricingNote } from '../../utils/order-pricing-snapshot';
import { estimateCouponDiscountAmount, subtotalAfterCouponDiscount } from '../../utils/coupon-discount';
import { VnAddressFormComponent, VnAddressPayload } from '../../shared/components/vn-address-form/vn-address-form';
import { CheckoutShippingContextService } from '../../services/checkout-shipping-context.service';

@Component({
  selector: 'app-checkout',
  standalone: true,
  imports: [
    CommonModule, RouterModule, FormsModule, ReactiveFormsModule,
    TuiButton, TuiBadge, TuiLoader, TuiTextfield,
    TuiFormatNumberPipe, TuiLabel, TranslocoModule,
    StorefrontHeaderComponent, StorefrontFooterComponent,
    QuantityBreakTableComponent, TuiDropdown, VnAddressFormComponent,
  ],
  templateUrl: './checkout.html',
  styleUrls: ['./checkout.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CheckoutComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly cartService = inject(CartService);
  private readonly apiService = inject(ApiService);
  readonly shippingCtx = inject(CheckoutShippingContextService);
  readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly alerts = inject(TuiAlertService);
  private readonly dialogs = inject(TuiDialogService);
  private readonly cdr = inject(ChangeDetectorRef);

  @ViewChild('paymentDialog') paymentDialogTemplate!: TemplateRef<any>;
  paymentQrUrl = '';
  currentOrder: any = null;
  eligibleCoupons$ = this.cartService.eligibleCoupons$;
  selectedCouponCode$ = this.cartService.selectedCouponCode$;

  selectCheckoutCoupon(code: string | null): void {
    this.cartService.setSelectedCouponCode(code);
  }

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
    // Bỏ giới hạn độ dài, chỉ giữ kiểm tra ký tự số.
    phone: ['', [Validators.required, Validators.pattern(/^[0-9]+$/)]],
    shippingAddress: ['', [Validators.required]],
    note: [''],
    paymentMethod: ['COD', [Validators.required]]
  });

  cart$ = this.cartService.cart$.pipe(
    map((items) => items.filter((i) => i.selected !== false)),
    shareReplay(1),
  );

  /** Đồng bộ với giỏ: có dòng đang chọn ẩn giá thì không đặt hàng / không hiện tổng. */
  readonly selectionHasHiddenPrice$ = this.cartService.selectionHasHiddenPrice$;

  readonly selectionHasUnavailableLine$ = this.cartService.selectionHasUnavailableLine$;

  subtotal$ = this.cart$.pipe(
    map(items => items.reduce((sum, i) => sum + i.price * i.quantity, 0)),
    shareReplay(1),
  );

  totalItems$ = this.cart$.pipe(
    map(items => items.reduce((sum, i) => sum + i.quantity, 0)),
    shareReplay(1),
  );

  appliedCoupon$ = this.cartService.appliedCoupon$;

  readonly user$ = this.auth.user$;

  /** Địa chỉ đầy đủ từ form (để gửi mã tỉnh khi đặt hàng). */
  lastAddressPayload: VnAddressPayload | null = null;

  /** Đủ tỉnh / phường / số nhà — bắt buộc trước khi chọn Standard/Express theo vùng. */
  addressComplete = false;

  /** Cùng logic API với giỏ hàng: tổng tiền + SL + loại KH + tỉnh + hình thức ship. */
  shippingQuote$ = combineLatest([
    this.cartService.cart$,
    this.auth.user$,
    this.appliedCoupon$,
    this.shippingCtx.selection$,
    this.shippingCtx.provinceCode$,
  ]).pipe(
    debounceTime(200),
    switchMap(([items, user, coupon, selection, provinceCode]) => {
      const selected = items.filter(i => i.selected !== false);
      let subtotal = selected.reduce((s, i) => s + i.price * i.quantity, 0);

      subtotal = subtotalAfterCouponDiscount(subtotal, coupon);

      const qty = selected.reduce((s, i) => s + i.quantity, 0);
      if (selected.length === 0) {
        return of({
          fee: 0,
          matched: false,
          tierFeeBeforeDiscount: 0,
          ruleName: undefined as string | undefined,
          baseOn: undefined as string | undefined,
          ruleFee: 0,
          zoneMatched: false,
          zoneId: null as number | null,
          zoneName: null as string | null,
          zoneStandardFee: 0,
          zoneExpressFee: 0,
        });
      }
      const prov =
        this.lastAddressPayload?.provinceCode != null
          ? String(this.lastAddressPayload.provinceCode)
          : user?.id
            ? provinceCode || null
            : null;
      return this.apiService.quoteShipping({
        userId: user?.id,
        orderAmount: subtotal,
        totalQuantity: qty,
        provinceCode: prov || undefined,
        shippingSelection: selection,
      });
    }),
    shareReplay(1),
  );

  shippingFee$ = this.shippingQuote$.pipe(map(q => q?.fee ?? 0));

  taxQuote$ = combineLatest([this.cartService.cart$, this.auth.user$, this.appliedCoupon$]).pipe(
    debounceTime(200),
    switchMap(([items, user, coupon]) => {
      const selected = items.filter(i => i.selected !== false);
      let subtotal = selected.reduce((s, i) => s + i.price * i.quantity, 0);

      subtotal = subtotalAfterCouponDiscount(subtotal, coupon);

      if (selected.length === 0) {
        return of({ applied: false, taxAmount: 0, taxRate: 0, taxDisplayType: 'VAT' });
      }
      return this.apiService.quoteTax({
        userId: user?.id,
        orderAmount: subtotal
      });
    }),
    shareReplay(1),
  );

  taxFee$ = this.taxQuote$.pipe(map(q => q?.taxAmount ?? 0));

  discountAmount$ = combineLatest([this.subtotal$, this.appliedCoupon$]).pipe(
    map(([sub, coupon]) => estimateCouponDiscountAmount(sub, coupon)),
    shareReplay(1),
  );

  totalPrice$ = combineLatest([this.subtotal$, this.discountAmount$, this.shippingFee$, this.taxFee$]).pipe(
    map(([sub, discount, fee, tax]) => Math.max(0, sub - discount) + fee + tax),
  );

  afterDiscountSubtotal$ = combineLatest([this.subtotal$, this.discountAmount$]).pipe(
    map(([sub, discount]) => Math.max(0, sub - discount)),
    shareReplay(1)
  );

  debtSummary$ = this.auth.user$.pipe(
    switchMap(user => user?.id ? this.apiService.getDebtSummary(user.id) : of({ blocked: false, overdueCount: 0, items: [] } as DebtSummary)),
    startWith({ blocked: false, overdueCount: 0, items: [] } as DebtSummary),
    shareReplay(1),
  );

  isBlockedByDebt$ = this.debtSummary$.pipe(map(s => s.blocked));

  netTermQuote$ = this.auth.user$.pipe(
    switchMap(user => user?.id ? this.apiService.quoteNetTerm(user.id) : of({ eligible: false } as NetTermQuote)),
    startWith({ eligible: false } as NetTermQuote),
    shareReplay(1),
  );

  isNetTermEligible$ = this.netTermQuote$.pipe(map(q => !!q.eligible));
  netTermDays$ = this.netTermQuote$.pipe(map(q => q.netTermDays || 0));

  isPlacingOrder = false;

  ngOnInit() {
    const user = this.auth.currentUserValue;
    if (user) {
      this.checkoutForm.patchValue({
        fullName: user.fullName || '',
        phone: user.phone || ''
      });
      this.shippingCtx.loadFromUserShippingJson(user.shippingAddressJson);
    } else {
      this.shippingCtx.setProvinceCode(null);
      if (this.shippingCtx.snapshot().selection !== 'RULE') {
        this.shippingCtx.setSelection('RULE');
      }
    }

    this.cartService.syncHidePriceFlagsFromServer().subscribe({ error: () => {} });
    this.cartService.syncLineAvailabilityFromServer().subscribe({ error: () => {} });

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

  setPaymentMethodIfAllowed(method: string): void {
    this.isBlockedByDebt$.pipe(take(1)).subscribe(blocked => {
      if (!blocked) {
        this.setPaymentMethod(method);
      }
    });
  }

  onCheckoutAddress(payload: VnAddressPayload | null): void {
    const hadCompleteAddress = this.addressComplete;
    this.lastAddressPayload = payload;
    this.addressComplete = !!payload;
    if (payload?.provinceCode) {
      this.shippingCtx.setProvinceCode(String(payload.provinceCode));
    } else {
      this.shippingCtx.setProvinceCode(null);
    }
    if (payload) {
      this.checkoutForm.patchValue({ shippingAddress: payload.fullLine });
    } else {
      this.checkoutForm.patchValue({ shippingAddress: '' });
    }
    // Chỉ ép về RULE khi user đã có địa chỉ đủ rồi xóa / làm mất — không ép khi form vừa emit null lúc hydrate
    // (tránh mất Standard/Express đã chọn ở giỏ hàng khi vào thanh toán).
    if (!payload && hadCompleteAddress && this.shippingCtx.snapshot().selection !== 'RULE') {
      this.shippingCtx.setSelection('RULE');
    }
    this.cdr.markForCheck();
  }

  selectShipMode(mode: 'RULE' | 'STANDARD' | 'EXPRESS'): void {
    if (mode !== 'RULE' && !this.lastAddressPayload) {
      this.alerts
        .open(
          'Vui lòng chọn đủ Tỉnh / Phường và nhập địa chỉ chi tiết trước khi chọn phí Standard hoặc Express theo vùng.',
          { label: 'Thiếu địa chỉ', appearance: 'warning' },
        )
        .subscribe();
      return;
    }
    this.shippingCtx.setSelection(mode);
  }

  onSubmit() {
    if (this.checkoutForm.invalid || this.isPlacingOrder) return;
    combineLatest([
      this.isBlockedByDebt$,
      this.selectionHasHiddenPrice$,
      this.selectionHasUnavailableLine$,
    ])
      .pipe(take(1))
      .subscribe(([blocked, hiddenPrice, unavailable]) => {
      if (blocked) {
        this.alerts.open('Bạn đang có công nợ quá hạn. Vui lòng thanh toán các đơn công nợ trước khi đặt đơn mới.', {
          label: 'Công nợ quá hạn',
          appearance: 'error',
        }).subscribe();
        return;
      }
      if (hiddenPrice) {
        this.alerts
          .open(
            'Đơn có sản phẩm liên hệ để có giá — không thể đặt hàng trực tuyến. Vui lòng quay lại giỏ hàng và bỏ chọn hoặc xóa các dòng đó.',
            { label: 'Không thể đặt hàng', appearance: 'warning' },
          )
          .subscribe();
        return;
      }
      if (unavailable) {
        this.alerts
          .open(
            'Đơn có sản phẩm hoặc combo đã ngừng bán — không thể đặt hàng. Vui lòng quay lại giỏ hàng và xóa hoặc bỏ chọn các dòng đó.',
            { label: 'Ngừng bán', appearance: 'warning' },
          )
          .subscribe();
        return;
      }
      this.isPlacingOrder = true;
      this.cartService.validate().pipe(take(1)).subscribe({
      next: (results) => {
        const failures = (results || []).filter((r: { success?: boolean }) => r.success === false);
        if (failures.length > 0) {
          failures.forEach((f: { message?: string }) => {
            this.alerts
              .open(f.message || 'Đơn hàng không đáp ứng quy định giới hạn.', {
                label: 'Quy định đơn hàng',
                appearance: 'warning',
              })
              .subscribe();
          });
          this.isPlacingOrder = false;
          return;
        }
        this.placeOrderAfterValidation();
      },
      error: () => {
        this.alerts
          .open('Không kiểm tra được quy định đơn hàng. Vui lòng thử lại.', {
            label: 'Lỗi',
            appearance: 'error',
          })
          .subscribe();
        this.isPlacingOrder = false;
      },
    });
    });
  }

  private placeOrderAfterValidation() {
    this.shippingQuote$.pipe(take(1)).subscribe({
      next: quote => {
        const formValue = this.checkoutForm.value;
        const currentItems = this.cartService.cartItems.filter(i => i.selected);
        const user = this.auth.currentUserValue;
        if (currentItems.length === 0) {
          this.alerts.open(
            'Không có sản phẩm hợp lệ để đặt hàng. Vui lòng chọn lại sản phẩm có đủ biến thể.',
            { label: 'Giỏ hàng không hợp lệ', appearance: 'warning' },
          ).subscribe();
          this.isPlacingOrder = false;
          return;
        }
        if (currentItems.some((i) => i.hidePrice)) {
          this.alerts
            .open(
              'Đơn có sản phẩm liên hệ để có giá — không thể đặt hàng trực tuyến. Vui lòng quay lại giỏ và bỏ chọn hoặc xóa các dòng đó.',
              { label: 'Không thể đặt hàng', appearance: 'warning' },
            )
            .subscribe();
          this.isPlacingOrder = false;
          return;
        }
        if (currentItems.some((i) => i.variantInactive || i.bundleInactive)) {
          this.alerts
            .open(
              'Đơn có sản phẩm hoặc combo đã ngừng bán — không thể đặt hàng. Vui lòng quay lại giỏ và xóa hoặc bỏ chọn các dòng đó.',
              { label: 'Ngừng bán', appearance: 'warning' },
            )
            .subscribe();
          this.isPlacingOrder = false;
          return;
        }
        const subtotal = currentItems.reduce((sum, i) => sum + i.price * i.quantity, 0);
        const shippingFee = quote?.fee ?? 0;
        const finalTotal = subtotal + shippingFee;

        this.taxFee$.pipe(take(1)).subscribe(taxAmount => {
          this.appliedCoupon$.pipe(take(1)).subscribe(coupon => {
            this.discountAmount$.pipe(take(1)).subscribe(discountAmount => {
              const snap = this.shippingCtx.snapshot();
              const province =
                this.lastAddressPayload?.provinceCode != null
                  ? String(this.lastAddressPayload.provinceCode)
                  : snap.provinceCode || undefined;
              const request: OrderRequest = {
                userId: user?.id,
                orderType: 'RETAIL',
                paymentMethod: formValue.paymentMethod,
                fullName: formValue.fullName,
                phone: formValue.phone,
                shippingAddress: formValue.shippingAddress,
                note: formValue.note,
                shippingSelection: snap.selection,
                shippingProvinceCode: province,
                shippingFee,
                taxAmount,
                couponCode: coupon?.code,
                discountAmount,
                items: currentItems.map(i => ({
                  productId: i.productId,
                  variantId: i.variantId,
                  quantity: i.quantity,
                  unitPrice: i.price,
                  pricingNote: buildOrderItemPricingNote(i),
                })),
              };

              this.apiService.createOrder(request).subscribe({
                next: order => {
                  this.isPlacingOrder = false;
                  this.currentOrder = order;
                  if (formValue.paymentMethod === 'VNPAY') {
                    const bankId = '970415';
                    const accountNo = '103877669895';
                    const accountName = encodeURIComponent('NGUYEN VAN SON');
                    const description = encodeURIComponent(`Thanh toan don hang #${order.id}`);

                    this.paymentQrUrl = `https://img.vietqr.io/image/${bankId}-${accountNo}-compact2.png?amount=${order.totalAmount}&addInfo=${description}&accountName=${accountName}`;

                    this.dialogs.open(this.paymentDialogTemplate, {
                      size: 'm',
                      dismissible: false,
                      label: 'Secure Checkout',
                    }).subscribe();
                  } else {
                    this.onPaymentComplete(false, formValue.phone);
                  }
                },
                error: (err) => {
                  const msg =
                    err?.error?.message ||
                    err?.error?.error ||
                    err?.message ||
                    'An error occurred while placing your order. Please try again.';
                  this.alerts.open(msg, {
                    label: 'Order Failed',
                    appearance: 'error',
                  }).subscribe();
                  this.isPlacingOrder = false;
                },
              });
            });
          });
        });
      },
      error: () => {
        this.alerts.open('Không tính được phí vận chuyển. Vui lòng thử lại.', {
          label: 'Lỗi',
          appearance: 'error',
        }).subscribe();
        this.isPlacingOrder = false;
      },
    });
  }

  onPaymentComplete(isPaidNotify: boolean = false, guestPhone?: string) {
    const message = isPaidNotify 
      ? 'Chúng tôi đã nhận được thông báo chuyển khoản của bạn. Vui lòng chờ nhân viên kiểm tra nhé!'
      : 'Đơn hàng của bạn đã được ghi nhận. Bạn có thể thanh toán sau trong trang Lịch sử đơn hàng.';
    
    this.alerts.open(message, { 
      label: 'Đặt hàng thành công', 
      appearance: 'success',
      autoClose: 5000 
    }).subscribe();
    
    this.cartService.clearSelected();
    if (!this.auth.currentUserValue?.id && guestPhone) {
      this.router.navigate(['/guest-orders'], { queryParams: { phone: guestPhone } });
      return;
    }
    this.router.navigate(['/storefront']);
  }

  confirmPayment(observer: any) {
    if (!this.currentOrder) {
      observer.complete();
      return;
    }
    
    this.apiService.updatePaymentStatus(this.currentOrder.id, 'AWAITING_CONFIRMATION').subscribe({
      next: () => {
        const phone = this.checkoutForm.get('phone')?.value || '';
        this.onPaymentComplete(true, phone);
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

  getQB(item: CartItem): any[] {
    return this.cartService.getQuantityBreaks(item, this.auth.currentUserValue);
  }
}
