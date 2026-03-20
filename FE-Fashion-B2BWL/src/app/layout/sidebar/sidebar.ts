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
    
    // Admin has full access
    if (user.role?.toUpperCase() === 'ADMIN' || user.role?.toUpperCase() === 'SUPER_ADMIN') {
      return true;
    }

    // Staff access mapping from diagram
    const staffModules = [
      'categories', 'products', 'variants', 'orders', 
      'customer-groups', 'rule-engine', 'ai-sync', 
      'home-settings', 'messages', 'reviews', 'pos'
    ];

    if (user.role?.toUpperCase() === 'STAFF') {
      return staffModules.includes(module);
    }

    return false;
  }

  toggle(): void {
    this.expanded = !this.expanded;
    this.expandedChange.emit(this.expanded);
  }
}
