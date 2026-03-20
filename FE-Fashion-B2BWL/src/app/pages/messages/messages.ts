import { Component, ChangeDetectionStrategy, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TranslocoModule } from '@jsverse/transloco';
import { TuiIcon, TuiButton, TuiTextfield } from '@taiga-ui/core';
import { TuiBadge } from '@taiga-ui/kit';
import { ApiService, ChatMessage } from '../../services/api.service';
import { firstValueFrom } from 'rxjs';
import { toSignal } from '@angular/core/rxjs-interop';

@Component({
  standalone: true,
  imports: [CommonModule, FormsModule, TranslocoModule, TuiIcon, TuiButton, TuiTextfield, TuiBadge],
  template: `
    <div class="page-container" *transloco="let t">
      <div class="page-header">
        <h1 class="tui-text_h3">{{ 'SIDEBAR.MESSAGES' | transloco }}</h1>
      </div>

      <div class="chat-container">
        <div class="chat-sidebar">
          <div class="user-item active">
             <div class="user-info">
                <strong>Customer #2</strong>
                <tui-badge appearance="primary" size="s" value="New"></tui-badge>
             </div>
          </div>
          <div class="user-item">
             <div class="user-info">
                <strong>Customer #3</strong>
             </div>
          </div>
        </div>

        <div class="chat-main">
          <div class="messages-list">
            <div *ngFor="let msg of messages()" 
                 class="message-bubble" 
                 [class.sent]="msg.senderId === 1">
              <div class="bubble-content">
                {{ msg.message }}
                <span class="bubble-time">{{ msg.createdAt | date:'shortTime' }}</span>
              </div>
            </div>
          </div>

          <div class="message-input">
            <tui-textfield>
               <input tuiTextfield placeholder="Type a message..." [(ngModel)]="replyText" />
            </tui-textfield>
            <button tuiButton type="button" size="m" (click)="send()">Send</button>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .page-container { padding: 32px; height: calc(100vh - 100px); display: flex; flex-direction: column; }
    .page-header { margin-bottom: 24px; }
    .chat-container { display: flex; flex: 1; gap: 24px; background: #fff; border-radius: 16px; overflow: hidden; border: 1px solid #eee; }
    .chat-sidebar { width: 300px; border-right: 1px solid #eee; padding: 16px; background: #f9f9f9; }
    .user-item { margin-bottom: 8px; cursor: pointer; padding: 16px; background: #fff; border-radius: 12px; border: 1px solid #eee; }
    .user-item.active { background: #eef2ff; border-color: #3f51b5; }
    .chat-main { flex: 1; display: flex; flex-direction: column; }
    .messages-list { flex: 1; padding: 24px; overflow-y: auto; display: flex; flex-direction: column; gap: 12px; }
    .message-bubble { max-width: 70%; padding: 12px 16px; border-radius: 16px; position: relative; }
    .message-bubble { align-self: flex-start; background: #f0f0f0; border-bottom-left-radius: 4px; }
    .message-bubble.sent { align-self: flex-end; background: #3f51b5; color: #fff; border-bottom-right-radius: 4px; }
    .bubble-time { display: block; font-size: 10px; margin-top: 4px; opacity: 0.7; }
    .message-input { padding: 16px; border-top: 1px solid #eee; display: flex; gap: 12px; }
    .message-input tui-textfield { flex: 1; }
  `],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MessagesComponent {
  private readonly api = inject(ApiService);
  readonly messages = signal<ChatMessage[]>([]);
  replyText = '';

  constructor() {
    this.refresh();
  }

  async refresh() {
    const data = await firstValueFrom(this.api.getChat(1, 2));
    this.messages.set(data);
  }

  async send() {
    if (!this.replyText.trim()) return;
    await firstValueFrom(this.api.sendMessage({
      senderId: 1,
      receiverId: 2,
      message: this.replyText
    }));
    this.replyText = '';
    this.refresh();
  }
}
