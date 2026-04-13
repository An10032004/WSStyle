import { Component, Input, Output, EventEmitter, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { TuiIcon } from '@taiga-ui/core';
import { TranslocoModule } from '@jsverse/transloco';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [CommonModule, RouterLink, RouterLinkActive, TuiIcon, TranslocoModule],
  templateUrl: './sidebar.html',
  styleUrl: './sidebar.scss',
  host: {
    '[class.expanded]': 'expanded',
  },
})
export class SidebarComponent {
  @Input() expanded = true;
  @Output() expandedChange = new EventEmitter<boolean>();

  private readonly auth = inject(AuthService);

  /** True if any of the modules is visible — used to hide empty sidebar sections. */
  hasAny(...modules: string[]): boolean {
    return modules.some((m) => this.canSee(m));
  }

  canSee(module: string): boolean {
    const user = this.auth.currentUserValue;
    if (!user) return false;

    const roleUpp = user.role?.toUpperCase() || '';
    const extraRoles = ((user as { roles?: string[] }).roles ?? []).map((r) =>
      (r || '').toUpperCase(),
    );

    // Admin has full access (primary role, or secondary roles from tags)
    const isElevated =
      roleUpp === 'ADMIN' ||
      roleUpp === 'SUPER_ADMIN' ||
      roleUpp === 'ADMINISTRATOR' ||
      extraRoles.some(
        (r) => r === 'ADMIN' || r === 'SUPER_ADMIN' || r === 'ADMINISTRATOR',
      );

    if (isElevated) {
      return true;
    }

    // New Granular Permission Check
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
          'bundles': 'Quản lý sản phẩm',
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
