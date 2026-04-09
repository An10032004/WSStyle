import { Component, ChangeDetectionStrategy, inject, OnInit, ChangeDetectorRef, DestroyRef } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { TuiButton, TuiIcon, TuiDropdown, TuiDataList, TuiScrollbar } from '@taiga-ui/core';
import { AuthService } from '../../../services/auth.service';
import { ApiService, Category, Product } from '../../../services/api.service';
import { CartService } from '../../../services/cart.service';
import { Observable, map, distinctUntilChanged, switchMap } from 'rxjs';

@Component({
  selector: 'app-storefront-header',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule, TuiButton, TuiIcon, TuiDropdown, TuiDataList, TuiScrollbar],
  templateUrl: './storefront-header.html',
  styleUrls: ['./storefront-header.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class StorefrontHeaderComponent implements OnInit {
  private readonly auth = inject(AuthService);
  private readonly destroyRef = inject(DestroyRef);
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
  namOpen = false;
  nuOpen = false;
  phuKienOpen = false;
  brandOpen = false;

  categoryTree: Category[] = [];
  navigationItems: { label: string; link: string }[] = [
    { label: 'Xếp hạng', link: '/shop' },
    { label: 'Đánh giá', link: '/customer-reviews' },
    { label: 'Hỗ trợ', link: '/support' }
  ];

  allProducts: Product[] = [];
  suggestions: Product[] = [];
  showSuggestions = false;
  brands: string[] = [];
  saleProducts: Product[] = [];

  get namCategory() {
    return this.categoryTree.find(c => c.name.toLowerCase() === 'nam');
  }

  get nuCategory() {
    return this.categoryTree.find(c => c.name.toLowerCase() === 'nữ');
  }

  get phuKienCategory() {
    return this.categoryTree.find(c => c.name.toLowerCase().includes('phụ kiện'));
  }

  ngOnInit() {
    this.auth.user$
      .pipe(
        map((u) => u?.id),
        distinctUntilChanged(),
        switchMap((uid) => this.api.getProducts(uid)),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe((prods) => {
        this.allProducts = prods;
        this.cdr.markForCheck();
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

    this.api.getProductBrands().subscribe(brands => {
      this.brands = brands;
      this.cdr.markForCheck();
    });

    this.api.searchProducts({}).subscribe(res => {
      this.saleProducts = res.content.filter(p => (p.calculatedPrice || p.basePrice) < p.basePrice).slice(0, 6);
      if (this.saleProducts.length === 0) {
        this.saleProducts = res.content.slice(0, 6); // Fallback to newest if no discounts found
      }
      this.cdr.markForCheck();
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

  hasAdminAccess(): boolean {
    const u = this.auth.currentUserValue;
    if (!u) return false;
    const role = (u.role || '').toString().toUpperCase();
    if (role === 'ADMIN' || role === 'ADMINISTRATOR' || role === 'SUPER_ADMIN') return true;
    try {
      let perms: string[] = [];
      if (typeof u.permissions === 'string') perms = JSON.parse(u.permissions);
      else if (Array.isArray(u.permissions)) perms = u.permissions;
      if (perms.includes('ALL')) return true;
      if (perms.includes('Quản lý report')) return true; // dashboard access mapping
    } catch (e) {
      // ignore
    }
    return false;
  }
}
