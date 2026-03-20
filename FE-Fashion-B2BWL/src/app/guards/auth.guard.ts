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
      const expectedRoles = route.data['expectedRoles'] as Array<string>;
      
      // If no specific roles required, allow access (just being logged in is enough)
      if (!expectedRoles || expectedRoles.length === 0) {
        return true;
      }

      // If user has one of the expected roles, allow access
      if (user && expectedRoles.includes(user.role)) {
        return true;
      }

      // Role mismatch: redirect to storefront (or a 403 page)
      router.navigate(['/storefront']);
      return false;
    })
  );
};
