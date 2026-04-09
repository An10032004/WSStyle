import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { TuiRoot } from '@taiga-ui/core';
import { TranslocoService, TranslocoModule } from '@jsverse/transloco';
import { AiAssistantBubbleComponent } from './shared/components/ai-assistant-bubble/ai-assistant-bubble';
import { SupportChatBubbleComponent } from './shared/components/support-chat-bubble/support-chat-bubble';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [TuiRoot, RouterOutlet, TranslocoModule, AiAssistantBubbleComponent, SupportChatBubbleComponent],
  templateUrl: './app.html',
  styleUrl: './app.scss',
})
export class App {
  title = 'WSSTYLE';

  constructor(transloco: TranslocoService) {
    transloco.setActiveLang('vi');
  }
}
