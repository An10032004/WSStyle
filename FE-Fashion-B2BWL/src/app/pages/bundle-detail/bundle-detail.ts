import {
  Component,
  OnInit,
  ChangeDetectionStrategy,
  inject,
  ChangeDetectorRef,
  DestroyRef,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { CommonModule } from '@angular/common';
import { RouterModule, ActivatedRoute } from '@angular/router';
import { forkJoin, of } from 'rxjs';
import { catchError, map, switchMap, take } from 'rxjs/operators';
import { ApiService, Bundle, BundleItem, Product, ProductVariant } from '../../services/api.service';
import { isVariantAvailableForSale } from '../../utils/variant-availability';
import { AuthService } from '../../services/auth.service';
import { CartService } from '../../services/cart.service';
import { StorefrontHeaderComponent } from '../../shared/components/storefront-header/storefront-header';
import { StorefrontFooterComponent } from '../../shared/components/storefront-footer/storefront-footer';
import { TuiButton, TuiIcon, TuiAlertService } from '@taiga-ui/core';

interface ResolvedRow {
  bundleItem: BundleItem;
  variant: ProductVariant;
  product: Product;
  /** Giá niêm yết dùng làm trọng số (không dùng discountPrice — tránh lệch phân bổ). */
  unitListPrice: number;
  lineWeight: number;
  /** Đơn giá sau giảm (theo newPrice bundle) — đưa vào giỏ. */
  allocatedUnitPrice: number;
  /** Đơn giá tham chiếu theo oldPrice bundle (cùng trọng số); tổng × SL ≈ tổng giá cũ. */
  allocatedListUnitPrice?: number;
}

/** Chia `total` thành các phần nguyên theo trọng số, đảm bảo tổng khớp (largest remainder). */
function allocateIntegerByWeight(weights: number[], total: number): number[] {
  const n = weights.length;
  if (n === 0) return [];
  const t = Math.max(0, Math.round(total));
  const sumW = weights.reduce((a, w) => a + w, 0);
  if (sumW <= 0) return Array(n).fill(0);
  const exact = weights.map((w) => (w / sumW) * t);
  const floors = exact.map((x) => Math.floor(x));
  let rem = t - floors.reduce((a, b) => a + b, 0);
  const order = exact
    .map((x, i) => ({ i, r: x - Math.floor(x) }))
    .sort((a, b) => b.r - a.r);
  const out = [...floors];
  for (let k = 0; k < rem; k++) out[order[k % n].i]++;
  return out;
}

/** Khi không có giá catalog để trọng số: chia tổng theo tổng SL từng dòng. */
function allocateIntegerByQuantity(qtys: number[], total: number): number[] {
  const n = qtys.length;
  if (n === 0) return [];
  const t = Math.max(0, Math.round(total));
  const totalQty = qtys.reduce((a, q) => a + q, 0);
  if (totalQty <= 0) return Array(n).fill(0);
  const exact = qtys.map((q) => (q / totalQty) * t);
  const floors = exact.map((x) => Math.floor(x));
  let rem = t - floors.reduce((a, b) => a + b, 0);
  const order = exact
    .map((x, i) => ({ i, r: x - Math.floor(x) }))
    .sort((a, b) => b.r - a.r);
  const out = [...floors];
  for (let k = 0; k < rem; k++) out[order[k % n].i]++;
  return out;
}

@Component({
  selector: 'app-bundle-detail',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    TuiButton,
    TuiIcon,
    StorefrontHeaderComponent,
    StorefrontFooterComponent,
  ],
  templateUrl: './bundle-detail.html',
  styleUrl: './bundle-detail.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BundleDetailComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly api = inject(ApiService);
  private readonly auth = inject(AuthService);
  private readonly cart = inject(CartService);
  private readonly cdr = inject(ChangeDetectorRef);
  private readonly destroyRef = inject(DestroyRef);
  private readonly alerts = inject(TuiAlertService);

  user$ = this.auth.user$;

  bundle?: Bundle;
  rows: ResolvedRow[] = [];
  loading = true;
  error?: string;
  adding = false;

  ngOnInit(): void {
    this.route.paramMap
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        switchMap((pm) => {
          const id = Number(pm.get('id'));
          if (!Number.isFinite(id) || id <= 0) {
            return of({ bundle: undefined, rows: [] as ResolvedRow[], badId: true });
          }
          return this.auth.user$.pipe(
            take(1),
            switchMap((u) =>
              this.api.getBundleById(id).pipe(
                switchMap((bundle) => {
                  const items = bundle.items || [];
                  if (!items.length) {
                    return of({ bundle, rows: [] as ResolvedRow[] });
                  }
                  return forkJoin(
                    items.map((bi) =>
                      this.api.getProductVariant(Number(bi.variantId)).pipe(
                        switchMap((variant) => {
                          const pid = variant.productId;
                          if (pid == null) {
                            return of({
                              bundleItem: bi,
                              variant,
                              product: null as unknown as Product,
                              unitListPrice: 0,
                              lineWeight: 0,
                              allocatedUnitPrice: 0,
                            });
                          }
                          return this.api.getProductById(pid, u?.id).pipe(
                            map((product) => {
                              // Chỉ giá niêm yết / catalog — không dùng discountPrice làm trọng số
                              const unit = Number(
                                variant.price ??
                                  product.calculatedPrice ??
                                  product.basePrice ??
                                  0,
                              );
                              const w = Math.max(0, unit) * Math.max(1, bi.quantity || 1);
                              return {
                                bundleItem: bi,
                                variant,
                                product,
                                unitListPrice: unit,
                                lineWeight: w,
                                allocatedUnitPrice: 0,
                              };
                            }),
                          );
                        }),
                        catchError(() =>
                          of({
                            bundleItem: bi,
                            variant: null as unknown as ProductVariant,
                            product: null as unknown as Product,
                            unitListPrice: 0,
                            lineWeight: 0,
                            allocatedUnitPrice: 0,
                          }),
                        ),
                      ),
                    ),
                  ).pipe(
                    map((partial) => {
                      const valid = partial.filter((p) => p.variant?.id && p.product?.id);
                      const weights = valid.map((p) => p.lineWeight);
                      const qtys = valid.map((p) => Math.max(1, p.bundleItem.quantity || 1));
                      const sumW = weights.reduce((a, w) => a + w, 0);
                      const comboPrice = Math.max(0, bundle.newPrice || 0);
                      const oldTotal =
                        bundle.oldPrice != null && bundle.oldPrice > 0
                          ? Math.max(0, bundle.oldPrice)
                          : 0;

                      const lineTotalsNew =
                        sumW > 0
                          ? allocateIntegerByWeight(weights, comboPrice)
                          : allocateIntegerByQuantity(qtys, comboPrice);
                      const lineTotalsOld =
                        oldTotal > 0
                          ? sumW > 0
                            ? allocateIntegerByWeight(weights, oldTotal)
                            : allocateIntegerByQuantity(qtys, oldTotal)
                          : [];

                      const rows: ResolvedRow[] = valid.map((p, i) => {
                        const qty = qtys[i]!;
                        const ltN = lineTotalsNew[i] ?? 0;
                        const perUnitNew = qty > 0 ? ltN / qty : 0;
                        const ltO = lineTotalsOld[i];
                        const perUnitOld = ltO != null && oldTotal > 0 && qty > 0 ? ltO / qty : undefined;
                        const showList =
                          oldTotal > comboPrice &&
                          perUnitOld != null &&
                          Math.round(perUnitOld) > Math.round(perUnitNew);
                        return {
                          ...p,
                          allocatedUnitPrice: perUnitNew,
                          allocatedListUnitPrice: showList ? Math.round(perUnitOld!) : undefined,
                        };
                      });

                      return { bundle, rows };
                    }),
                  );
                }),
                catchError(() => of({ bundle: undefined, rows: [] as ResolvedRow[] })),
              ),
            ),
          );
        }),
      )
      .subscribe((res: { bundle?: Bundle; rows: ResolvedRow[]; badId?: boolean }) => {
        this.loading = false;
        this.error = undefined;
        if (res.badId) {
          this.error = 'Combo không hợp lệ';
          this.bundle = undefined;
          this.rows = [];
        } else if (!res.bundle) {
          this.error = 'Không tải được combo';
          this.bundle = undefined;
          this.rows = [];
        } else {
          this.bundle = res.bundle;
          this.rows = res.rows;
          if (res.bundle.status !== 'ACTIVE') {
            this.error = 'Combo này hiện không mở bán';
          }
        }
        this.cdr.markForCheck();
      });
  }

  /** Có ít nhất một SP trong combo bị chặn giá — không hiển thị tổng tiền số ở header. */
  get hideBundleComboPrices(): boolean {
    return this.rows.some((r) => !!r.product.hidePrice);
  }

  /** Thông báo thay cho giá tổng combo khi có dòng hidePrice. */
  get bundleComboPriceReplacement(): string {
    const row = this.rows.find((r) => !!r.product.hidePrice);
    const t = row?.product.replacementText?.trim();
    return t || 'Liên hệ để có giá';
  }

  /** Kiểm tra tồn kho cho toàn bộ dòng combo trước khi thêm (tránh thêm dở). */
  private bundleStockError(bundleId: number): string | null {
    const sim = this.cart.currentItems.map((i) => ({ ...i }));
    for (const row of this.rows) {
      const v = row.variant;
      const p = row.product;
      const qty = Math.max(1, row.bundleItem.quantity || 1);
      if (v.stockQuantity == null) continue;
      const idx = sim.findIndex(
        (i) =>
          i.productId === p.id &&
          i.variantId === v.id &&
          (i.bundleId ?? null) === bundleId,
      );
      const cur = idx >= 0 ? sim[idx].quantity : 0;
      if (cur + qty > v.stockQuantity) {
        return `Không đủ tồn kho cho «${p.name}» (${v.color || ''} ${v.size || ''}). Còn tối đa ${v.stockQuantity}.`;
      }
      if (idx >= 0) sim[idx] = { ...sim[idx], quantity: cur + qty };
      else {
        sim.push({
          productId: p.id,
          variantId: v.id,
          name: p.name,
          quantity: qty,
          price: 0,
          bundleId,
          selected: true,
        });
      }
    }
    return null;
  }

  addComboToCart(): void {
    if (!this.bundle || !this.rows.length || this.adding) return;
    const bid = this.bundle.id;
    if (this.cart.hasBundleInCart(bid)) {
      this.alerts
        .open(
          'Combo này đã có trong giỏ. Mỗi loại combo chỉ thêm một lần — xóa combo đó trong giỏ nếu muốn thêm lại.',
          { label: 'Không thể thêm combo', appearance: 'warning' },
        )
        .subscribe();
      return;
    }
    const err = this.bundleStockError(bid);
    if (err) {
      this.alerts.open(err, { label: 'Không thể thêm combo', appearance: 'warning' }).subscribe();
      return;
    }
    const inactiveRow = this.rows.find((r) => !isVariantAvailableForSale(r.variant, r.product?.status));
    if (inactiveRow) {
      this.alerts
        .open(
          `Combo có biến thể đã ngừng bán («${inactiveRow.product.name}»). Không thể thêm vào giỏ.`,
          { label: 'Ngừng bán', appearance: 'warning' },
        )
        .subscribe();
      return;
    }

    this.adding = true;
    this.cdr.markForCheck();

    for (let i = 0; i < this.rows.length; i++) {
      const row = this.rows[i];
      const silent = i < this.rows.length - 1;
      const qty = Math.max(1, row.bundleItem.quantity || 1);
      this.cart.addToCart(
        row.product,
        row.variant,
        qty,
        row.allocatedUnitPrice,
        true,
        bid,
        silent,
        this.bundle.name,
        { skipComboBundleGuard: true },
      );
    }

    this.cart.validate().subscribe((results) => {
      this.adding = false;
      const failures = results.filter((r) => !r.success);
      if (failures.length) {
        failures.forEach((f) =>
          this.alerts.open(f.message, { label: 'Cảnh báo Quy định Đơn hàng', appearance: 'warning' }).subscribe(),
        );
      } else {
        this.alerts
          .open('Đã thêm combo vào giỏ hàng', { label: 'Thành công', appearance: 'success' })
          .subscribe();
      }
      this.cdr.markForCheck();
    });
  }
}
