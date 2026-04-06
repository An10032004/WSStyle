import { Component } from '@angular/core';
import { Router, RouterOutlet, RouterLink, RouterLinkActive } from '@angular/router';
import { TuiNavigation } from '@taiga-ui/layout';
import { TuiIcon, TuiButton, TuiDataList, TuiDropdown } from '@taiga-ui/core';
import { TuiAvatar } from '@taiga-ui/kit';
import { TranslocoModule } from '@jsverse/transloco';
import { CommonModule } from '@angular/common';
import { inject } from '@angular/core';
import { AuthService } from '../services/auth.service';
import { LanguageSwitcherComponent } from './header/language-switcher.component';

@Component({
  selector: 'app-layout',
  standalone: true,
  imports: [
    CommonModule,
    RouterOutlet,
    RouterLink,
    RouterLinkActive,
    TuiNavigation,
    TranslocoModule,
    TuiIcon,
    TuiButton,
    TuiAvatar,
    TuiDataList,
    TuiDropdown,
    LanguageSwitcherComponent
  ],
  templateUrl: './layout.html',
  styleUrl: './layout.scss',
})
export class LayoutComponent {
  sidebarExpanded = true;
  open = false;
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  get user() {
    return this.auth.currentUserValue;
  }

  logout(): void {
    this.auth.logout();
    this.router.navigate(['/login']);
  }

  viewProfile(): void {
    this.router.navigate(['/profile']);
  }

  private readonly allowedModules = new Set<string>([
    'categories', 'products', 'variants', 'orders', 
    'customer-groups', 'rule-engine', 'ai-sync', 
    'home-settings', 'messages', 'reviews', 'pos'
  ]);

  canSee(module: string): boolean {
    const user = this.user;
    if (!user) return true; // DEV Fallback

    const role = (user.role || '').toString().toUpperCase();

    // 1. Full Admin access bypass
    if (role === 'ADMIN' || role === 'ADMINISTRATOR' || role === 'SUPER_ADMIN') {
      return true;
    }

    // 2. Granular Permission Check
    if (user.permissions) {
      try {
        let perms: string[] = [];
        if (typeof user.permissions === 'string') {
          perms = JSON.parse(user.permissions);
        } else if (Array.isArray(user.permissions)) {
          perms = user.permissions;
        }

        if (perms.includes('ALL')) return true;

        const permissionMapping: Record<string, string> = {
          'dashboard': 'Quản lý report',
          'categories': 'Quản lý danh mục',
          'products': 'Quản lý sản phẩm',
          'variants': 'Quản lý biến thể',
          'orders': 'Quản lý đơn hàng',
          'customer-groups': 'Quản lý nhóm khách hàng',
          'rule-engine': 'Quản lý chiết khấu',
          'ai-sync': 'Quản lý AI',
          'home-settings': 'Quản lý banner',
          'messages': 'Hỗ trợ khách hàng',
          'reviews': 'Quản lý report',
          'pos': 'Point of sale',
          'staff': 'Quản lý nhân viên',
          'coupons': 'Quản lý coupon',
          'sale-campaigns': 'Quản lý chiến dịch sale',
          'wallets': 'Quản lý ví điện tử',
          'advanced-reports': 'Quản lý report',
          'users': 'Quản lý người dùng',
          'permissions': 'Quản lý nhân viên',
          'registration-forms': 'Quản lý hồ sơ đại lý'
        };

        const requiredPermission = permissionMapping[module];
        if (requiredPermission && perms.includes(requiredPermission)) {
           return true;
        }
      } catch (e) {
        console.error('Sidebar permission error:', e);
      }
    }

    // 3. Role-based Legacy Mapping
    if (role === 'STAFF') {
      return this.allowedModules.has(module);
    }
    
    return false;
  }
}
