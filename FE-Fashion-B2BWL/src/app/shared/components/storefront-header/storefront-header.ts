import { Component, ChangeDetectionStrategy, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { TuiButton, TuiIcon, TuiDropdown, TuiDataList } from '@taiga-ui/core';
import { AuthService } from '../../../services/auth.service';

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
  private readonly router = inject(Router);
  user$ = this.auth.user$;
  dropdownOpen = false;

  categories = ['NEW ARRIVALS', 'BRANDS', 'MEN', 'WOMEN', 'ACCESSORIES', 'SALE'];

  logout(): void {
    this.auth.logout();
    this.router.navigate(['/login']);
  }
}
