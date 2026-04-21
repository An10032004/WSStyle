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

  /** Khu /admin: ẩn toàn bộ bubble. Trang /assistant: ẩn bubble AI (tránh trùng trang lớn); vẫn giữ hỗ trợ nếu cần. */
  showAiBubble$ = this.router.events.pipe(
    filter((e) => e instanceof NavigationEnd),
    startWith(null),
    map(() => {
      const path = this.router.url.split('?')[0];
      if (path.startsWith('/admin')) {
        return false;
      }
      if (path.startsWith('/assistant')) {
        return false;
      }
      return true;
    })
  );

  showSupportBubble$ = this.router.events.pipe(
    filter((e) => e instanceof NavigationEnd),
    startWith(null),
    map(() => {
      const path = this.router.url.split('?')[0];
      return !path.startsWith('/admin');
    })
  );

  constructor(transloco: TranslocoService) {
    transloco.setActiveLang('vi');
  }
}
