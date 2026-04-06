import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { map, take } from 'rxjs';

export const authGuard: CanActivateFn = (route, state) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  return authService.user$.pipe(
    take(1),
    map(user => {
      const isLoggedIn = !!user;
      
      // If not logged in, redirect to login
      if (!isLoggedIn) {
        router.navigate(['/login'], { queryParams: { returnUrl: state.url } });
        return false;
      }

      // Check required roles from route data
      const expectedRoles = (route.data['expectedRoles'] as Array<string>) || [];
      const moduleKey = route.data['module'] as string;
      
      if (user && user.role) {
        const uRole = user.role.toUpperCase();
        
        // 1. Full Admin access bypass
        if (uRole === 'ADMIN' || uRole === 'ADMINISTRATOR' || uRole === 'SUPER_ADMIN') {
          return true;
        }

        // 2. Check for explicit role matches
        if (expectedRoles.length > 0) {
           const hasRole = expectedRoles.some(role => role.toUpperCase() === uRole);
           if (hasRole) return true;
        }

        // 3. Granular Permission Check
        if (moduleKey && user.permissions) {
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

            const requiredPermission = permissionMapping[moduleKey];
            if (requiredPermission && perms.includes(requiredPermission)) {
              return true;
            }
          } catch (e) {
            console.error('Permission check error:', e);
          }
        }

        // 4. Legacy STAFF Fallback (Matches LayoutComponent)
        if (uRole === 'STAFF') {
           const allowedModules = new Set<string>([
             'categories', 'products', 'variants', 'orders', 
             'customer-groups', 'rule-engine', 'ai-sync', 
             'home-settings', 'messages', 'reviews', 'pos'
           ]);
           if (moduleKey && allowedModules.has(moduleKey)) {
             return true;
           }
        }
      }

      // If no specific roles/modules required, allow access
      if (expectedRoles.length === 0 && !moduleKey) {
        return true;
      }

      // Access Denied: redirect to storefront
      router.navigate(['/storefront']);
      return false;
    })
  );
};
