import { Component, ChangeDetectionStrategy, inject, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { TuiButton, TuiIcon, TuiDropdown, TuiDataList } from '@taiga-ui/core';
import { AuthService } from '../../../services/auth.service';
import { ApiService, Category } from '../../../services/api.service';
import { CartService } from '../../../services/cart.service';
import { Observable, map } from 'rxjs';

@Component({
  selector: 'app-storefront-header',
  standalone: true,
  imports: [CommonModule, RouterModule, TuiButton, TuiIcon, TuiDropdown, TuiDataList],
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

  cartCount$ = this.cart.cart$.pipe(map(items => items.reduce((sum, i) => sum + i.quantity, 0)));
  
  user$ = this.auth.user$;
  dropdownOpen = false;
  isMegaMenuOpen = false;

  categoryTree: Category[] = [];
  mockCategories = ['Nam', 'Nữ', 'Phụ kiện', 'Thương hiệu', 'Xếp hạng', 'Mới nhất'];

  ngOnInit() {
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

  logout(): void {
    this.auth.logout();
    this.router.navigate(['/login']);
  }
}
