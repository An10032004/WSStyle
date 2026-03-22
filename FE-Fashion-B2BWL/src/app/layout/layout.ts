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
    // Fallback for development if no session is active
    if (!user) return true;

    const role = user.role?.toUpperCase() || 'ADMIN';

    if (role === 'ADMIN' || role === 'SUPER_ADMIN') {
      return true;
    }

    if (role === 'STAFF') {
      return this.allowedModules.has(module);
    }

    return false;
  }
}
