import { Component, ChangeDetectionStrategy, inject, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { TuiButton, TuiIcon, TuiDropdown, TuiDataList } from '@taiga-ui/core';
import { AuthService } from '../../../services/auth.service';
import { ApiService, Category, Product } from '../../../services/api.service';
import { CartService } from '../../../services/cart.service';
import { Observable, map } from 'rxjs';

@Component({
  selector: 'app-storefront-header',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule, TuiButton, TuiIcon, TuiDropdown, TuiDataList],
  templateUrl: './storefront-header.html',
  styleUrls: ['./storefront-header.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class StorefrontHeaderComponent {
  private readonly auth = inject(AuthService);
  private readonly api = inject(ApiService);
  private readonly router = inject(Router);
  private readonly cdr = inject(ChangeDetectorRef);
  private readonly cart = inject(CartService);

  searchQuery = '';

  cartCount$ = this.cart.cart$.pipe(map(items => items.reduce((sum, i) => sum + i.quantity, 0)));
  cartItems$ = this.cart.cart$;
  totalPrice$ = this.cart.cart$.pipe(map(items => items.reduce((sum, i) => sum + (i.price * i.quantity), 0)));
  
  user$ = this.auth.user$;
  dropdownOpen = false;
  cartDropdownOpen = false;
  isMegaMenuOpen = false;

  categoryTree: Category[] = [];
  navigationItems: { label: string; link: string }[] = [
    { label: 'Nam', link: '/shop' },
    { label: 'Nữ', link: '/shop' },
    { label: 'Phụ kiện', link: '/shop' },
    { label: 'Thương hiệu', link: '/shop' },
    { label: 'Xếp hạng', link: '/shop' },
    { label: 'Đánh giá', link: '/customer-reviews' },
    { label: 'Thông tin', link: '/shop' },
    { label: 'Hỗ trợ', link: '/support' }
  ];

  allProducts: Product[] = [];
  suggestions: Product[] = [];
  showSuggestions = false;

  ngOnInit() {
    this.api.getProducts().subscribe(prods => {
      this.allProducts = prods;
    });

    this.api.getCategories().subscribe(cats => {
      if (!cats || cats.length === 0) return;

      // Map categories to avoid O(n^2) lookups
      const categoryMap = new Map<number, Category & { children: Category[] }>();
      cats.forEach(c => categoryMap.set(c.id, { ...c, children: [] }));

      const roots: Category[] = [];
      categoryMap.forEach(cat => {
        if (!cat.parentId || cat.parentId === cat.id || !categoryMap.has(cat.parentId)) {
          roots.push(cat);
        } else {
          categoryMap.get(cat.parentId)?.children.push(cat);
        }
      });

      this.categoryTree = roots;
      this.cdr.markForCheck();
      this.cdr.detectChanges();
    });
  }

  onSearch(): void {
    const q = this.searchQuery.trim();
    this.showSuggestions = false;
    
    this.router.navigate(['/shop'], { 
      queryParams: { search: q || null }, // Setting to null removes the param from URL
      queryParamsHandling: 'merge' 
    });
  }

  clearSearch(): void {
    this.searchQuery = '';
    this.onSearch();
  }

  updateSuggestions(): void {
    const q = this.searchQuery.trim().toLowerCase();
    
    // Auto-reset when empty (solves "having to press enter" inconvenience)
    if (q.length === 0) {
      this.suggestions = [];
      this.showSuggestions = false;
      this.onSearch(); 
      return;
    }

    if (q.length < 2) {
      this.suggestions = [];
      this.showSuggestions = false;
      return;
    }

    this.suggestions = this.allProducts
      .filter(p => p.name.toLowerCase().includes(q) || (p.brand && p.brand.toLowerCase().includes(q)))
      .slice(0, 6);
    
    this.showSuggestions = this.suggestions.length > 0;
    this.cdr.markForCheck();
  }

  selectSuggestion(productId: number): void {
    this.showSuggestions = false;
    this.searchQuery = '';
    this.router.navigate(['/product', productId]);
  }

  logout(): void {
    this.auth.logout();
    this.router.navigate(['/login']);
  }
}
