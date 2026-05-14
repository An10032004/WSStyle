import {
  Component,
  ChangeDetectionStrategy,
  inject,
  OnInit,
  OnDestroy,
  ChangeDetectorRef,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { TranslocoModule } from '@jsverse/transloco';
import {
  TuiButton,
  TuiLabel,
  TuiTextfield,
  TuiDataList,
  TuiAlertService,
  TuiLoader,
  TuiIcon,
} from '@taiga-ui/core';
import { TuiDataListWrapper } from '@taiga-ui/kit';
import { TuiSelectModule, TuiTextfieldControllerModule } from '@taiga-ui/legacy';
import {
  ApiService,
  Product,
  InventoryInflowRequest,
  InventoryInflowReceipt,
  InventoryInflowReceiptLine,
  InventoryInflowVariantRow,
} from '../../services/api.service';
import { Subject, Subscription, firstValueFrom } from 'rxjs';
import { debounceTime, distinctUntilChanged, switchMap } from 'rxjs/operators';

type WizardStep = 1 | 2 | 3;

interface InflowVariantRow {
  variantId: number;
  sku: string;
  currentStock: number;
  addedQty: number;
  costPrice: number;
  imageUrl?: string | null;
  color?: string | null;
  size?: string | null;
}

@Component({
  standalone: true,
  selector: 'app-inventory-inflow',
  imports: [
    CommonModule,
    FormsModule,
    TranslocoModule,
    TuiButton,
    TuiSelectModule,
    TuiDataList,
    TuiDataListWrapper,
    TuiTextfieldControllerModule,
    TuiLabel,
    TuiTextfield,
    TuiLoader,
    TuiIcon,
  ],
  templateUrl: './inventory-inflow.html',
  styleUrls: ['./inventory-inflow.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class InventoryInflowComponent implements OnInit, OnDestroy {
  private readonly api = inject(ApiService);
  private readonly alerts = inject(TuiAlertService);
  private readonly cdr = inject(ChangeDetectorRef);

  /** Tìm kiếm SP phía server (phân trang) — không tải toàn bộ catalog. */
  readonly productPageSize = 100;

  filteredProducts: Product[] = [];
  productSearchTotal = 0;
  searchQuery = '';
  productsLoading = false;

  private readonly searchDebounced$ = new Subject<string>();
  private searchSub?: Subscription;

  /** Cache biến thể theo productId (tránh gọi lại API khi chọn lại cùng SP). */
  private readonly variantRowCache = new Map<number, InflowVariantRow[]>();

  selectedProduct: Product | null = null;
  loading = false;
  submitting = false;
  confirming = false;

  step: WizardStep = 1;
  draftReceipt: InventoryInflowReceipt | null = null;

  /** Phiếu DRAFT trên server — có thể tiếp tục bất kỳ lúc nào. */
  pendingDrafts: InventoryInflowReceipt[] = [];
  draftsLoading = false;
  openingDraftId: number | null = null;

  inflowDate = new Date().toISOString().split('T')[0];
  description = '';
  items: InflowVariantRow[] = [];

  ngOnInit(): void {
    void this.loadProductsPage('');
    void this.refreshDraftList();

    this.searchSub = this.searchDebounced$
      .pipe(
        debounceTime(300),
        distinctUntilChanged(),
        switchMap((q) =>
          this.api.searchProducts({
            search: q || undefined,
            page: 0,
            size: this.productPageSize,
            sortBy: 'newest',
            includeInactive: 'true',
          }),
        ),
      )
      .subscribe({
        next: (page) => {
          this.filteredProducts = page?.content ?? [];
          this.productSearchTotal = page?.totalElements ?? 0;
          this.productsLoading = false;
          this.cdr.detectChanges();
        },
        error: () => {
          this.productsLoading = false;
          this.alerts.open('Không tải được danh sách sản phẩm', { appearance: 'error' }).subscribe();
          this.cdr.detectChanges();
        },
      });
  }

  ngOnDestroy(): void {
    this.searchSub?.unsubscribe();
  }

  private async loadProductsPage(q: string): Promise<void> {
    this.productsLoading = true;
    this.cdr.detectChanges();
    try {
      const page = await firstValueFrom(
        this.api.searchProducts({
          search: q.trim() || undefined,
          page: 0,
          size: this.productPageSize,
          sortBy: 'newest',
          includeInactive: 'true',
        }),
      );
      this.filteredProducts = page?.content ?? [];
      this.productSearchTotal = page?.totalElements ?? 0;
    } catch {
      this.filteredProducts = [];
      this.alerts.open('Không tải được danh sách sản phẩm', { appearance: 'error' }).subscribe();
    } finally {
      this.productsLoading = false;
      this.cdr.detectChanges();
    }
  }

  onSearchQueryChange(value: string): void {
    this.searchQuery = value;
    this.productsLoading = true;
    this.cdr.detectChanges();
    this.searchDebounced$.next(value.trim());
  }

  trackByVariantId(_index: number, row: InflowVariantRow): number {
    return row.variantId;
  }

  trackByReceiptId(_index: number, r: InventoryInflowReceipt): number {
    return r.id;
  }

  trackByReceiptLine(index: number, ln: InventoryInflowReceiptLine): number | string {
    return ln.lineId ?? ln.variantId ?? index;
  }

  get draftLines(): InventoryInflowReceiptLine[] {
    return this.draftReceipt?.lines ?? [];
  }

  async refreshDraftList(): Promise<void> {
    this.draftsLoading = true;
    this.cdr.detectChanges();
    try {
      const page = await firstValueFrom(
        this.api.listInventoryInflowReceipts({ page: 0, size: 50, status: 'DRAFT' }),
      );
      this.pendingDrafts = page?.content ?? [];
    } catch {
      this.pendingDrafts = [];
    } finally {
      this.draftsLoading = false;
      this.cdr.detectChanges();
    }
  }

  async resumeDraft(id: number): Promise<void> {
    if (this.draftReceipt?.id === id && this.step === 2) {
      return;
    }
    this.openingDraftId = id;
    this.cdr.detectChanges();
    try {
      const receipt = await firstValueFrom(this.api.getInventoryInflowReceipt(id));
      if (receipt.status !== 'DRAFT') {
        this.alerts.open('Phiếu này không còn ở trạng thái nháp.', { appearance: 'warning' }).subscribe();
        await this.refreshDraftList();
        return;
      }
      this.draftReceipt = receipt;
      this.step = 2;
      this.alerts
        .open(`Đã mở phiếu #${id}. Kiểm tra và bấm «Xác nhận nhập kho» khi sẵn sàng.`, { appearance: 'success' })
        .subscribe();
    } catch {
      this.alerts.open('Không tải được phiếu.', { appearance: 'error' }).subscribe();
    } finally {
      this.openingDraftId = null;
      this.cdr.detectChanges();
    }
  }

  async cancelDraftFromList(id: number): Promise<void> {
    try {
      await firstValueFrom(this.api.cancelInventoryInflowReceipt(id));
      this.alerts.open('Đã hủy phiếu nháp.', { appearance: 'info' }).subscribe();
      if (this.draftReceipt?.id === id) {
        this.step = 1;
        this.draftReceipt = null;
      }
      await this.refreshDraftList();
    } catch {
      this.alerts.open('Không hủy được phiếu', { appearance: 'error' }).subscribe();
    } finally {
      this.cdr.detectChanges();
    }
  }

  /** Quay về bước 1 để tạo phiếu nháp mới; phiếu hiện tại vẫn lưu trên server. */
  goToNewDraftForm(): void {
    this.step = 1;
    this.draftReceipt = null;
    void this.refreshDraftList();
    this.cdr.detectChanges();
  }

  private cloneVariantRows(rows: InflowVariantRow[]): InflowVariantRow[] {
    return rows.map((r) => ({ ...r }));
  }

  private clearVariantCache(): void {
    this.variantRowCache.clear();
  }

  async onProductSelected(product: Product): Promise<void> {
    this.selectedProduct = product;
    if (!product) {
      this.items = [];
      this.cdr.detectChanges();
      return;
    }

    const cached = this.variantRowCache.get(product.id);
    if (cached) {
      this.items = this.cloneVariantRows(cached);
      this.cdr.detectChanges();
      return;
    }

    this.loading = true;
    this.cdr.detectChanges();
    try {
      const data = await firstValueFrom(this.api.getInventoryInflowVariantRows(product.id));
      const fallbackImg = product.imageUrl || null;
      this.items = (data || []).map((v: InventoryInflowVariantRow) => ({
        variantId: v.id,
        sku: v.sku ?? '',
        currentStock: v.stockQuantity ?? 0,
        addedQty: 0,
        costPrice: v.costPrice != null ? Number(v.costPrice) : 0,
        imageUrl: v.imageUrl || fallbackImg,
        color: v.color || null,
        size: v.size || null,
      }));
      this.variantRowCache.set(product.id, this.cloneVariantRows(this.items));
    } catch {
      this.alerts.open('Lỗi lấy danh sách biến thể', { appearance: 'error' }).subscribe();
    } finally {
      this.loading = false;
      this.cdr.detectChanges();
    }
  }

  get totalAmount(): number {
    return this.items.reduce((sum, it) => sum + it.addedQty * (it.costPrice || 0), 0);
  }

  /** Bước 1 — tạo phiếu nháp (ghi nhận thời điểm tạo phiếu trên server). */
  async createDraft(): Promise<void> {
    const validItems = this.items.filter((it) => it.addedQty > 0);
    if (validItems.length === 0) {
      this.alerts.open('Vui lòng nhập số lượng cho ít nhất 1 biến thể', { appearance: 'warning' }).subscribe();
      return;
    }

    this.submitting = true;
    this.cdr.detectChanges();
    const body: InventoryInflowRequest = {
      date: this.inflowDate,
      description: this.description,
      items: validItems.map((it) => ({
        variantId: it.variantId,
        quantity: it.addedQty,
        costPrice: it.costPrice,
      })),
    };

    try {
      const receipt = await firstValueFrom(this.api.createInventoryInflowReceipt(body));
      this.draftReceipt = receipt;
      this.step = 2;
      this.alerts
        .open('Đã tạo phiếu nhập. Vui lòng kiểm tra lại trước khi xác nhận nhập kho.', { appearance: 'success' })
        .subscribe();
    } catch {
      this.alerts.open('Không tạo được phiếu nhập', { appearance: 'error' }).subscribe();
    } finally {
      this.submitting = false;
      void this.refreshDraftList();
      this.cdr.detectChanges();
    }
  }

  /** Bước 2 — xác nhận: cộng tồn + ghi chi phí theo thời điểm bấm xác nhận. */
  async confirmPost(): Promise<void> {
    if (!this.draftReceipt?.id) {
      return;
    }
    this.confirming = true;
    this.cdr.detectChanges();
    try {
      const posted = await firstValueFrom(this.api.confirmInventoryInflowReceipt(this.draftReceipt.id));
      this.draftReceipt = posted;
      this.step = 3;
      this.clearVariantCache();
      this.alerts.open('Đã nhập kho và ghi thống kê chi phí.', { appearance: 'success' }).subscribe();
    } catch (e: unknown) {
      let msg = 'Xác nhận nhập kho thất bại';
      if (e instanceof HttpErrorResponse) {
        const body = e.error as { message?: string } | null | undefined;
        if (body?.message) {
          msg = body.message;
        } else if (typeof e.error === 'string' && e.error.trim().length > 0) {
          msg = e.error;
        } else if (e.status === 0) {
          msg = 'Không kết nối được máy chủ (CORS/mạng). Kiểm tra backend đang chạy và URL API.';
        } else if (e.message) {
          msg = e.message;
        }
      } else if (e instanceof Error && e.message) {
        msg = e.message;
      }
      this.alerts.open(msg, { appearance: 'error' }).subscribe();
    } finally {
      this.confirming = false;
      void this.refreshDraftList();
      this.cdr.detectChanges();
    }
  }

  async cancelDraft(): Promise<void> {
    if (!this.draftReceipt?.id || this.draftReceipt.status !== 'DRAFT') {
      await this.refreshDraftList();
      this.goBackToEdit();
      return;
    }
    try {
      await firstValueFrom(this.api.cancelInventoryInflowReceipt(this.draftReceipt.id));
      this.alerts.open('Đã hủy phiếu nháp.', { appearance: 'info' }).subscribe();
    } catch {
      this.alerts.open('Không hủy được phiếu', { appearance: 'error' }).subscribe();
    }
    await this.refreshDraftList();
    this.goBackToEdit();
  }

  goBackToEdit(): void {
    this.step = 1;
    this.draftReceipt = null;
    this.cdr.detectChanges();
  }

  startNew(): void {
    this.step = 1;
    this.draftReceipt = null;
    this.selectedProduct = null;
    this.items = [];
    this.description = '';
    this.inflowDate = new Date().toISOString().split('T')[0];
    this.clearVariantCache();
    void this.refreshDraftList();
    this.cdr.detectChanges();
  }

  productName(p: Product | null): string {
    return p ? `${p.name} (${p.productCode})` : '';
  }

  formatViDateTime(iso: string | null | undefined): string {
    if (!iso) return '—';
    try {
      const d = new Date(iso.length === 10 ? iso + 'T00:00:00' : iso);
      if (Number.isNaN(d.getTime())) return iso;
      return d.toLocaleString('vi-VN', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      });
    } catch {
      return iso;
    }
  }

  formatViDate(ymd: string | null | undefined): string {
    if (!ymd) return '—';
    return this.formatViDateTime(ymd + 'T12:00:00');
  }

  variantDims(it: { color?: string | null; size?: string | null }): string {
    const parts = [it.color, it.size].filter(Boolean);
    return parts.length ? parts.join(' · ') : '—';
  }
}
