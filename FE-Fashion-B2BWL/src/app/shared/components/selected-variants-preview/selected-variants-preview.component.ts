import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  Input,
  OnChanges,
  SimpleChanges,
  inject,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { ApiService, ProductVariant } from '../../../services/api.service';

export interface SelectedVariantPreviewRow {
  productName: string;
  label: string;
  variantId: number;
}

@Component({
  selector: 'app-selected-variants-preview',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="svp" *ngIf="variantIds?.length">
      <div class="svp__title">Biến thể đã chọn</div>
      <ul class="svp__list">
        <li *ngFor="let row of rows" class="svp__item">
          <span class="svp__product">{{ row.productName }}</span>
          <span class="svp__sep">·</span>
          <span class="svp__variant">{{ row.label }}</span>
        </li>
      </ul>
    </div>
  `,
  styles: [
    `
      .svp {
        margin-top: 12px;
        padding: 12px 14px;
        border: 1px solid #e2e8f0;
        border-radius: 10px;
        background: #f8fafc;
        max-height: 220px;
        overflow-y: auto;
      }
      .svp__title {
        font-size: 12px;
        font-weight: 700;
        color: #64748b;
        text-transform: uppercase;
        letter-spacing: 0.03em;
        margin-bottom: 8px;
      }
      .svp__list {
        list-style: none;
        margin: 0;
        padding: 0;
      }
      .svp__item {
        font-size: 13px;
        color: #0f172a;
        padding: 6px 0;
        border-bottom: 1px solid #e2e8f0;
        line-height: 1.35;
      }
      .svp__item:last-child {
        border-bottom: none;
      }
      .svp__product {
        font-weight: 600;
      }
      .svp__sep {
        color: #94a3b8;
        margin: 0 6px;
      }
      .svp__variant {
        color: #475569;
      }
    `,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SelectedVariantsPreviewComponent implements OnChanges {
  private readonly api = inject(ApiService);
  private readonly cdr = inject(ChangeDetectorRef);

  /** Danh sách id biến thể (ưu tiên). */
  @Input() variantIds: number[] = [];
  /** Sản phẩm đã chọn (chỉ cần các SP có biến thể trong variantIds). */
  @Input() products: any[] = [];

  rows: SelectedVariantPreviewRow[] = [];

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['variantIds'] || changes['products']) {
      this.refresh();
    }
  }

  private variantLabel(v: ProductVariant): string {
    const parts: string[] = [];
    if (v.size) parts.push(`Size: ${v.size}`);
    if (v.color) parts.push(`Color: ${v.color}`);
    if (v.weight) parts.push(`Weight: ${v.weight}`);
    if (v.length != null || v.width != null || v.height != null) {
      parts.push(`L×W×H: ${v.length ?? '-'}×${v.width ?? '-'}×${v.height ?? '-'}`);
    }
    if (parts.length) return parts.join(', ');
    return v.sku || `#${v.id}`;
  }

  private refresh(): void {
    const vids = [...new Set(this.variantIds || [])];
    const prods = this.products || [];
    if (!vids.length) {
      this.rows = [];
      this.cdr.markForCheck();
      return;
    }
    if (!prods.length) {
      this.rows = vids
        .sort((a, b) => a - b)
        .map((id) => ({ productName: '—', label: `ID ${id}`, variantId: id }));
      this.cdr.markForCheck();
      return;
    }
    const reqs = prods.map((p) =>
      this.api.getProductVariantsByProduct(p.id).pipe(catchError(() => of([] as ProductVariant[]))),
    );
    forkJoin(reqs).subscribe((lists) => {
      const idSet = new Set(vids);
      const found = new Map<number, SelectedVariantPreviewRow>();
      prods.forEach((p, i) => {
        const name = p?.name || `Sản phẩm #${p?.id}`;
        for (const v of lists[i] || []) {
          if (idSet.has(v.id)) {
            found.set(v.id, { productName: name, label: this.variantLabel(v), variantId: v.id });
          }
        }
      });
      this.rows = vids
        .sort((a, b) => a - b)
        .map((id) => found.get(id) ?? { productName: '—', label: `ID ${id}`, variantId: id });
      this.cdr.markForCheck();
    });
  }
}
