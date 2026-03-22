import { Component, Input, Output, EventEmitter, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { TuiIcon } from '@taiga-ui/core';
import { TuiNavigation } from '@taiga-ui/layout';
import { TranslocoModule } from '@jsverse/transloco';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [CommonModule, RouterLink, TuiNavigation, TuiIcon, TranslocoModule],
  templateUrl: './sidebar.html',
  styleUrl: './sidebar.scss',
})
export class SidebarComponent {
  @Input() expanded = true;
  @Output() expandedChange = new EventEmitter<boolean>();

  private readonly auth = inject(AuthService);

  canSee(module: string): boolean {
    const user = this.auth.currentUserValue;
    if (!user) return false;
    
    // Admin has full access (legacy role check or permission check)
    if (user.role?.toUpperCase() === 'ADMIN' || user.role?.toUpperCase() === 'SUPER_ADMIN') {
      return true;
    }

    // New Granular Permission Check
    if (user.permissions) {
      try {
        const perms: string[] = JSON.parse(user.permissions);
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
        return requiredPermission ? perms.includes(requiredPermission) : false;
      } catch (e) {
        return false;
      }
    }

    return false;
  }

  toggle(): void {
    this.expanded = !this.expanded;
    this.expandedChange.emit(this.expanded);
  }
}
