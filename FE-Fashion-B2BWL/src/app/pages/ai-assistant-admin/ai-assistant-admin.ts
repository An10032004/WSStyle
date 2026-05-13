import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  OnDestroy,
  OnInit,
  inject,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TuiButton, TuiLoader, TuiAlertService } from '@taiga-ui/core';
import { TranslocoModule } from '@jsverse/transloco';
import {
  AiAssistantAdminContext,
  AiAssistantAdminContextRequest,
  AiAssistantProductPicker,
  AiAssistantVariantPicker,
  ApiService,
} from '../../services/api.service';
import { finalize } from 'rxjs';

/** Tóm tắt sau khi gán search_tags hàng loạt (hiển thị cho người dùng). */
interface BulkApplyVariantRef {
  variantId: number;
  sku: string;
}

interface BulkApplyProductGroup {
  productId: number;
  productName: string;
  /** Có ít nhất một variant khớp từ danh sách SP đang tải trên trang. */
  resolvedFromPicker: boolean;
  variants: BulkApplyVariantRef[];
}

interface BulkApplySummary {
  atLabel: string;
  searchTagsDisplay: string;
  updated: number;
  totalRequested: number;
  groups: BulkApplyProductGroup[];
}

@Component({
  selector: 'app-ai-assistant-admin',
  standalone: true,
  imports: [CommonModule, FormsModule, TuiButton, TuiLoader, TranslocoModule],
  templateUrl: './ai-assistant-admin.html',
  styleUrl: './ai-assistant-admin.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AiAssistantAdminComponent implements OnInit, OnDestroy {
  private readonly api = inject(ApiService);
  private readonly alerts = inject(TuiAlertService);
  private readonly cdr = inject(ChangeDetectorRef);

  /** Đồng bộ với BE: tối đa số khối ngữ cảnh đang bật được ghép vào prompt cho AI. */
  readonly maxActiveContextsForAi = 3;
  /** Đồng bộ với BE: độ dài tối đa mỗi khối nội dung AI đọc. */
  readonly maxBodyCharsForAi = 500;

  loading = false;
  saving = false;
  bulkBusy = false;
  rows: AiAssistantAdminContext[] = [];

  /** Picker SP + variant (phân trang server). */
  pickerProducts: AiAssistantProductPicker[] = [];
  productSearchInput = '';
  productSortBy = 'newest';
  productPage = 0;
  readonly productPageSize = 15;
  productTotalElements = 0;
  productTotalPages = 0;
  productsLoading = false;
  private productSearchTimer: ReturnType<typeof setTimeout> | undefined;

  /** Sản phẩm nào đang mở danh sách variant (click để bật/tắt). */
  expandedProductIds = new Set<number>();

  /** Variant đã chọn (hợp với ô ID thủ công khi áp dụng tag). */
  bulkSelectedVariantIds = new Set<number>();

  selectedId: number | null = null;
  formTitle = '';
  formBody = '';
  formSortOrder = 0;
  formActive = true;

  bulkVariantIdsText = '';
  bulkSearchTags = '';

  /** Kết quả lần «Áp dụng» gần nhất (tag → từng SP/variant); null = chưa có hoặc đã ẩn. */
  lastBulkApplyResult: BulkApplySummary | null = null;

  ngOnInit(): void {
    this.reload();
    this.loadPickerProducts();
  }

  ngOnDestroy(): void {
    if (this.productSearchTimer != null) {
      clearTimeout(this.productSearchTimer);
    }
  }

  onProductSearchInputChange(): void {
    if (this.productSearchTimer != null) {
      clearTimeout(this.productSearchTimer);
    }
    this.productSearchTimer = setTimeout(() => {
      this.productSearchTimer = undefined;
      this.productPage = 0;
      this.loadPickerProducts();
    }, 400);
  }

  loadPickerProducts(): void {
    this.productsLoading = true;
    this.cdr.markForCheck();
    this.api
      .searchAiAssistantProductsForBulkTags({
        search: this.productSearchInput.trim() || undefined,
        page: this.productPage,
        size: this.productPageSize,
        sortBy: this.productSortBy,
      })
      .pipe(finalize(() => (this.productsLoading = false)))
      .subscribe({
        next: (page) => {
          this.pickerProducts = page.content ?? [];
          this.productTotalElements = page.totalElements ?? 0;
          this.productTotalPages = page.totalPages ?? 0;
          this.expandedProductIds.clear();
          this.cdr.markForCheck();
        },
        error: () => {
          this.pickerProducts = [];
          this.productTotalElements = 0;
          this.productTotalPages = 0;
          this.expandedProductIds.clear();
          this.alerts.open('Không tải được danh sách sản phẩm / biến thể.', { appearance: 'error' }).subscribe();
          this.cdr.markForCheck();
        },
      });
  }

  searchProductsNow(): void {
    if (this.productSearchTimer != null) {
      clearTimeout(this.productSearchTimer);
      this.productSearchTimer = undefined;
    }
    this.productPage = 0;
    this.loadPickerProducts();
  }

  productPageLabel(): string {
    if (!this.productTotalPages) {
      return '0 / 0';
    }
    return `${this.productPage + 1} / ${this.productTotalPages}`;
  }

  prevProductPage(): void {
    if (this.productPage <= 0) {
      return;
    }
    this.productPage--;
    this.loadPickerProducts();
  }

  nextProductPage(): void {
    if (this.productPage + 1 >= this.productTotalPages) {
      return;
    }
    this.productPage++;
    this.loadPickerProducts();
  }

  toggleProductVariants(productId: number): void {
    if (this.expandedProductIds.has(productId)) {
      this.expandedProductIds.delete(productId);
    } else {
      this.expandedProductIds.add(productId);
    }
    this.cdr.markForCheck();
  }

  isProductVariantsExpanded(productId: number): boolean {
    return this.expandedProductIds.has(productId);
  }

  countSelectedVariantsForProduct(p: AiAssistantProductPicker): number {
    let n = 0;
    for (const v of p.variants ?? []) {
      if (this.bulkSelectedVariantIds.has(v.id)) {
        n++;
      }
    }
    return n;
  }

  isAllVariantsOfProductSelected(p: AiAssistantProductPicker): boolean {
    const vars = p.variants ?? [];
    if (vars.length === 0) {
      return false;
    }
    return vars.every((v) => this.bulkSelectedVariantIds.has(v.id));
  }

  onToggleAllVariantsForProduct(p: AiAssistantProductPicker, checked: boolean): void {
    for (const v of p.variants ?? []) {
      if (checked) {
        this.bulkSelectedVariantIds.add(v.id);
      } else {
        this.bulkSelectedVariantIds.delete(v.id);
      }
    }
    this.cdr.markForCheck();
  }

  isVariantBulkSelected(id: number): boolean {
    return this.bulkSelectedVariantIds.has(id);
  }

  onVariantBulkCheck(id: number, checked: boolean): void {
    if (checked) {
      this.bulkSelectedVariantIds.add(id);
    } else {
      this.bulkSelectedVariantIds.delete(id);
    }
    this.cdr.markForCheck();
  }

  selectAllVariantsOnCurrentPage(): void {
    for (const p of this.pickerProducts) {
      for (const v of p.variants ?? []) {
        this.bulkSelectedVariantIds.add(v.id);
      }
    }
    this.cdr.markForCheck();
  }

  clearBulkVariantSelection(): void {
    this.bulkSelectedVariantIds.clear();
    this.cdr.markForCheck();
  }

  trackProduct(_i: number, p: AiAssistantProductPicker): number {
    return p.id;
  }

  trackVariant(_i: number, v: AiAssistantVariantPicker): number {
    return v.id;
  }

  reload(): void {
    this.loading = true;
    this.cdr.markForCheck();
    this.api
      .listAiAssistantAdminContexts()
      .pipe(finalize(() => (this.loading = false)))
      .subscribe({
        next: (list) => {
          this.rows = list;
          this.cdr.markForCheck();
        },
        error: () => {
          this.rows = [];
          this.alerts.open('Không tải được danh sách ngữ cảnh.', { appearance: 'error' }).subscribe();
          this.cdr.markForCheck();
        },
      });
  }

  newRow(): void {
    this.selectedId = null;
    this.formTitle = '';
    this.formBody = '';
    this.formSortOrder = 0;
    this.formActive = true;
    this.cdr.markForCheck();
  }

  editRow(row: AiAssistantAdminContext): void {
    this.selectedId = row.id;
    this.formTitle = row.title;
    this.formBody = row.body;
    this.formSortOrder = row.sortOrder ?? 0;
    this.formActive = row.active;
    this.cdr.markForCheck();
  }

  private hasActiveSlotForSave(): boolean {
    const others = this.rows.filter((r) => r.active && r.id !== this.selectedId).length;
    return others < this.maxActiveContextsForAi;
  }

  private payload(): AiAssistantAdminContextRequest {
    return {
      title: this.formTitle.trim(),
      body: this.formBody.trim(),
      sortOrder: this.formSortOrder,
      active: this.formActive,
    };
  }

  save(): void {
    const bodyTrim = this.formBody.trim();
    if (!this.formTitle.trim() || !bodyTrim) {
      this.alerts.open('Tiêu đề và nội dung không được để trống.', { appearance: 'warning' }).subscribe();
      return;
    }
    if (bodyTrim.length > this.maxBodyCharsForAi) {
      this.alerts.open(`Nội dung tối đa ${this.maxBodyCharsForAi} ký tự (phần AI đọc).`, {
        appearance: 'warning',
      }).subscribe();
      return;
    }
    if (this.formActive && !this.hasActiveSlotForSave()) {
      this.alerts.open(
        `Chỉ được bật tối đa ${this.maxActiveContextsForAi} ngữ cảnh cùng lúc cho AI đọc trong prompt storefront.`,
        { appearance: 'warning' },
      ).subscribe();
      return;
    }
    this.saving = true;
    this.cdr.markForCheck();
    const req$ =
      this.selectedId == null
        ? this.api.createAiAssistantAdminContext(this.payload())
        : this.api.updateAiAssistantAdminContext(this.selectedId, this.payload());
    req$.pipe(finalize(() => (this.saving = false))).subscribe({
      next: (saved) => {
        this.selectedId = saved.id;
        this.alerts.open('Đã lưu.', { appearance: 'success' }).subscribe();
        this.reload();
      },
      error: () => {
        this.alerts.open('Lưu thất bại.', { appearance: 'error' }).subscribe();
        this.cdr.markForCheck();
      },
    });
  }

  deleteSelected(): void {
    if (this.selectedId == null) return;
    if (!confirm(`Xóa ngữ cảnh #${this.selectedId} — ${this.formTitle}?`)) return;
    this.saving = true;
    this.cdr.markForCheck();
    this.api
      .deleteAiAssistantAdminContext(this.selectedId)
      .pipe(finalize(() => (this.saving = false)))
      .subscribe({
        next: () => {
          this.alerts.open('Đã xóa.', { appearance: 'success' }).subscribe();
          this.newRow();
          this.reload();
        },
        error: () => {
          this.alerts.open('Xóa thất bại.', { appearance: 'error' }).subscribe();
          this.cdr.markForCheck();
        },
      });
  }

  parseVariantIds(): number[] {
    const merged = new Set<number>();
    for (const id of this.bulkSelectedVariantIds) {
      merged.add(id);
    }
    const parts = this.bulkVariantIdsText.split(/[\s,;]+/).filter((s) => s.length > 0);
    for (const p of parts) {
      const n = Number(p);
      if (Number.isFinite(n) && n > 0) {
        merged.add(Math.floor(n));
      }
    }
    return Array.from(merged).sort((a, b) => a - b);
  }

  dismissBulkApplySummary(): void {
    this.lastBulkApplyResult = null;
    this.cdr.markForCheck();
  }

  private buildBulkApplySummary(
    variantIds: readonly number[],
    updated: number,
    searchTagsTrimmed: string,
  ): BulkApplySummary {
    const byVariant = new Map<number, { productId: number; productName: string; sku: string }>();
    for (const p of this.pickerProducts) {
      for (const v of p.variants ?? []) {
        byVariant.set(v.id, { productId: p.id, productName: p.name, sku: v.sku });
      }
    }
    const UNKNOWN_KEY = -1;
    const groupMap = new Map<number, BulkApplyProductGroup>();
    for (const vid of variantIds) {
      const m = byVariant.get(vid);
      if (m) {
        if (!groupMap.has(m.productId)) {
          groupMap.set(m.productId, {
            productId: m.productId,
            productName: m.productName,
            resolvedFromPicker: true,
            variants: [],
          });
        }
        groupMap.get(m.productId)!.variants.push({ variantId: vid, sku: m.sku });
      } else {
        if (!groupMap.has(UNKNOWN_KEY)) {
          groupMap.set(UNKNOWN_KEY, {
            productId: 0,
            productName: 'Variant không nằm trang này (chỉ có ID — đổi trang tìm để xem tên/SKU)',
            resolvedFromPicker: false,
            variants: [],
          });
        }
        groupMap.get(UNKNOWN_KEY)!.variants.push({ variantId: vid, sku: '—' });
      }
    }
    return {
      atLabel: new Date().toLocaleString('vi-VN'),
      searchTagsDisplay: searchTagsTrimmed.length
        ? searchTagsTrimmed
        : '(đã xóa search_tags / để trống)',
      updated,
      totalRequested: variantIds.length,
      groups: Array.from(groupMap.values()),
    };
  }

  /** Sau khi áp dụng thành công: bỏ chọn, xóa ô nhập để lần sau rõ ràng. */
  private resetBulkFormAfterApply(): void {
    this.bulkSelectedVariantIds.clear();
    this.bulkVariantIdsText = '';
    this.bulkSearchTags = '';
    this.expandedProductIds.clear();
    this.cdr.markForCheck();
  }

  applyBulkTags(): void {
    const ids = this.parseVariantIds();
    if (!ids.length) {
      this.alerts.open('Chọn ít nhất một biến thể trong danh sách hoặc nhập ID thủ công.', {
        appearance: 'warning',
      }).subscribe();
      return;
    }
    const tagSnapshot = this.bulkSearchTags.trim();
    const idsSnapshot = [...ids];
    this.bulkBusy = true;
    this.cdr.markForCheck();
    this.api
      .bulkVariantSearchTags(ids, tagSnapshot || null)
      .pipe(finalize(() => (this.bulkBusy = false)))
      .subscribe({
        next: (r) => {
          this.lastBulkApplyResult = this.buildBulkApplySummary(idsSnapshot, r.updated, tagSnapshot);
          this.resetBulkFormAfterApply();
          const notUpdated = idsSnapshot.length - r.updated;
          this.alerts
            .open(
              `Đã ghi tag cho ${r.updated}/${idsSnapshot.length} variant.` +
                (notUpdated > 0
                  ? ` ${notUpdated} variant không đổi hoặc không tìm thấy trong DB.`
                  : '') +
                ' Xem chi tiết theo sản phẩm ở khung bên dưới.',
              { appearance: 'success' },
            )
            .subscribe();
          this.loadPickerProducts();
          this.cdr.markForCheck();
        },
        error: () => {
          this.alerts.open('Gán tag hàng loạt thất bại.', { appearance: 'error' }).subscribe();
          this.cdr.markForCheck();
        },
      });
  }
}
