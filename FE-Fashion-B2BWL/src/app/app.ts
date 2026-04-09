import { Component, inject } from '@angular/core';
import { RouterOutlet, Router, NavigationEnd } from '@angular/router';
import { TuiRoot } from '@taiga-ui/core';
import { TranslocoService, TranslocoModule } from '@jsverse/transloco';
import { AiAssistantBubbleComponent } from './shared/components/ai-assistant-bubble/ai-assistant-bubble';
import { SupportChatBubbleComponent } from './shared/components/support-chat-bubble/support-chat-bubble';
import { CommonModule } from '@angular/common';
import { filter, map, startWith } from 'rxjs';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, TuiRoot, RouterOutlet, TranslocoModule, AiAssistantBubbleComponent, SupportChatBubbleComponent],
  templateUrl: './app.html',
  styleUrl: './app.scss',
})
export class App {
  private readonly router = inject(Router);
  title = 'WSSTYLE';

  showBubbles$ = this.router.events.pipe(
    filter(event => event instanceof NavigationEnd),
    startWith(null), // Handle initial check
    map(() => {
      const url = this.router.url;
      // Admin layout paths from app.routes.ts
      const adminBasePaths = [
        '/dashboard', '/categories', '/products', '/product-variants', 
        '/rule-engine', '/users', '/customer-groups', '/registration-forms',
        '/orders', '/ai-sync', '/staff', '/banner-manager', '/coupons',
        '/sale-campaigns', '/wallets', '/advanced-reports', '/messages', '/permissions'
      ];
      const isAdminPath = adminBasePaths.some(path => url.startsWith(path)) || url === '/';
      return !isAdminPath;
    })
  );

  constructor(transloco: TranslocoService) {
    transloco.setActiveLang('vi');
  }
}
