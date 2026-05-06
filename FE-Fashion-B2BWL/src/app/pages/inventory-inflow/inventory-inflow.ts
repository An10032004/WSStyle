import { Component, ChangeDetectionStrategy, inject, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TranslocoModule } from '@jsverse/transloco';
import { 
  TuiButton, 
  TuiLabel, 
  TuiTextfield, 
  TuiDataList,
  TuiAlertService,
  TuiLoader,
  TuiIcon
} from '@taiga-ui/core';
import { 
  TuiDataListWrapper
} from '@taiga-ui/kit';
import { TuiSelectModule, TuiTextfieldControllerModule } from '@taiga-ui/legacy';
import { ApiService, Product, ProductVariant, InventoryInflowRequest } from '../../services/api.service';
import { firstValueFrom } from 'rxjs';

@Component({
  standalone: true,
  selector: 'app-inventory-inflow',
  imports: [
    CommonModule, FormsModule, TranslocoModule, TuiButton, 
    TuiSelectModule, TuiDataList, TuiDataListWrapper,
    TuiTextfieldControllerModule, TuiLabel, TuiTextfield,
    TuiLoader, TuiIcon
  ],
  templateUrl: './inventory-inflow.html',
  styleUrls: ['./inventory-inflow.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class InventoryInflowComponent implements OnInit {
  private readonly api = inject(ApiService);
  private readonly alerts = inject(TuiAlertService);
  private readonly cdr = inject(ChangeDetectorRef);

  products: Product[] = [];
  filteredProducts: Product[] = [];
  searchQuery = '';
  
  selectedProduct: Product | null = null;
  loading = false;
  submitting = false;

  // Inflow Data
  inflowDate = new Date().toISOString().split('T')[0];
  description = '';
  items: { variantId: number; sku: string; currentStock: number; addedQty: number; costPrice: number }[] = [];

  ngOnInit(): void {
    this.loadProducts();
  }

  async loadProducts() {
    try {
      const data = await firstValueFrom(this.api.getProducts());
      this.products = data || [];
      this.filterProducts();
      this.cdr.markForCheck();
    } catch (e) {
      console.error('Error loading products:', e);
      this.alerts.open('Không thể tải danh sách sản phẩm', { appearance: 'error' }).subscribe();
    }
  }

  filterProducts() {
    if (!this.searchQuery) {
      this.filteredProducts = [...this.products];
    } else {
      const q = this.searchQuery.toLowerCase();
      this.filteredProducts = this.products.filter(p => 
        p.name.toLowerCase().includes(q) || 
        p.productCode.toLowerCase().includes(q)
      );
    }
    this.cdr.markForCheck();
  }

  async onProductSelected(product: Product) {
    this.selectedProduct = product;
    if (!product) {
      this.items = [];
      this.cdr.markForCheck();
      return;
    }

    this.loading = true;
    this.cdr.markForCheck();
    try {
      const data = await firstValueFrom(this.api.getProductVariantsByProduct(product.id));
      this.items = (data || []).map(v => ({
        variantId: v.id,
        sku: v.sku,
        currentStock: v.stockQuantity || 0,
        addedQty: 0,
        costPrice: v.costPrice || 0
      }));
    } catch (e) {
      this.alerts.open('Lỗi lấy danh sách biến thể', { appearance: 'error' }).subscribe();
    } finally {
      this.loading = false;
      this.cdr.markForCheck();
    }
  }

  get totalAmount(): number {
    return this.items.reduce((sum, item) => sum + (item.addedQty * item.costPrice), 0);
  }

  async submit() {
    const validItems = this.items.filter(it => it.addedQty > 0);
    if (validItems.length === 0) {
      this.alerts.open('Vui lòng nhập số lượng cho ít nhất 1 biến thể', { appearance: 'warning' }).subscribe();
      return;
    }

    this.submitting = true;
    this.cdr.markForCheck();
    
    const body: InventoryInflowRequest = {
      date: this.inflowDate,
      description: this.description,
      items: validItems.map(it => ({
        variantId: it.variantId,
        quantity: it.addedQty,
        costPrice: it.costPrice
      }))
    };

    try {
      await firstValueFrom(this.api.processInventoryInflow(body));
      this.alerts.open('Nhập hàng thành công!', { appearance: 'success' }).subscribe();
      // Reset
      this.selectedProduct = null;
      this.items = [];
      this.description = '';
    } catch (e) {
      this.alerts.open('Lỗi khi xử lý nhập hàng', { appearance: 'error' }).subscribe();
    } finally {
      this.submitting = false;
      this.cdr.markForCheck();
    }
  }

  // Display helpers
  productName(p: Product | null): string {
    return p ? `${p.name} (${p.productCode})` : '';
  }
}
