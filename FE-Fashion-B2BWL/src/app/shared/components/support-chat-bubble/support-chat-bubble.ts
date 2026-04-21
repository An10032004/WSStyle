import { Component, inject, ChangeDetectionStrategy, ChangeDetectorRef, ViewChild, ElementRef, AfterViewChecked, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TuiButton, TuiIcon, TuiScrollbar } from '@taiga-ui/core';
import { ApiService, ChatMessage } from '../../../services/api.service';
import { AuthService } from '../../../services/auth.service';
import { animate, style, transition, trigger } from '@angular/animations';
import { interval, Subscription, startWith, switchMap, map } from 'rxjs';

@Component({
  selector: 'app-support-chat-bubble',
  standalone: true,
  imports: [CommonModule, FormsModule, TuiButton, TuiIcon, TuiScrollbar],
  template: `
    <div class="support-chat-container" [class.is-open]="isOpen" *ngIf="isLoggedIn$ | async">
      <!-- CHAT WINDOW -->
      <div class="chat-window luxe-glass" *ngIf="isOpen" [@slideInOut]>
        <div class="chat-header">
          <div class="header-info">
            <div class="support-avatar">
              <tui-icon icon="@tui.headset"></tui-icon>
            </div>
            <div class="header-text">
              <span class="name">Hỗ trợ trực tuyến</span>
              <span class="status">Đang sẵn sàng giúp bạn</span>
            </div>
          </div>
          <button class="close-btn" (click)="toggleChat()">
            <tui-icon icon="@tui.x"></tui-icon>
          </button>
        </div>

        <div class="chat-messages" #scrollContainer>
          <div *ngFor="let m of messages" class="message-wrapper" [class.user-msg]="m.senderId === currentUserId">
            <div class="message-bubble">
              <div class="msg-text">{{ m.message }}</div>
            </div>
            <span class="message-time">{{ m.createdAt | date:'HH:mm' }}</span>
          </div>
          
          <div class="empty-chat" *ngIf="messages.length === 0">
             <tui-icon icon="@tui.message-square"></tui-icon>
             <p>Chào bạn! Chúng tôi có thể giúp gì cho bạn?</p>
          </div>
        </div>

        <div class="chat-input-area">
          <input 
            type="text" 
            placeholder="Nhắn tin cho chúng tôi..." 
            [(ngModel)]="userInput"
            (keyup.enter)="sendMessage()"
          >
          <button class="send-btn" (click)="sendMessage()" [disabled]="!userInput.trim()">
            <tui-icon icon="@tui.send-horizontal"></tui-icon>
          </button>
        </div>
      </div>

      <!-- FLOATING BUBBLE -->
      <button 
        class="floating-bubble support-gradient" 
        (click)="toggleChat()"
        [class.active]="isOpen"
      >
        <tui-icon [icon]="isOpen ? '@tui.chevron-down' : '@tui.message-circle'"></tui-icon>
        <div class="unread-badge" *ngIf="unreadCount > 0">{{ unreadCount }}</div>
      </button>
    </div>
  `,
  styles: [`
    .support-chat-container {
      position: fixed;
      bottom: 100px; /* Above AI bubble */
      right: 32px;
      z-index: 9999;
      font-family: 'Inter', sans-serif;
    }

    .luxe-glass {
      background: rgba(255, 255, 255, 0.95);
      backdrop-filter: blur(20px);
      border: 1px solid rgba(255, 255, 255, 0.3);
      box-shadow: 0 20px 40px rgba(0,0,0,0.15);
    }

    .chat-window {
      position: absolute;
      bottom: 80px;
      right: 0;
      width: 360px;
      height: 500px;
      border-radius: 24px;
      display: flex;
      flex-direction: column;
      overflow: hidden;
    }

    .chat-header {
      padding: 20px;
      background: #0f172a;
      color: white;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }

    .header-info { display: flex; gap: 12px; align-items: center; }
    .support-avatar {
      width: 40px;
      height: 40px;
      background: #3b82f6;
      border-radius: 12px;
      display: flex;
      align-items: center;
      justify-content: center;
      color: white;
    }

    .header-text { display: flex; flex-direction: column; }
    .name { font-weight: 700; font-size: 15px; }
    .status { font-size: 12px; opacity: 0.8; }

    .close-btn { 
      background: rgba(255,255,255,0.1); 
      border: none; 
      color: white; 
      width: 32px; 
      height: 32px; 
      border-radius: 50%;
      cursor: pointer;
    }

    .chat-messages {
      flex: 1;
      padding: 20px;
      overflow-y: auto;
      display: flex;
      flex-direction: column;
      gap: 16px;
      background: #f8fafc;
    }

    .message-wrapper {
      display: flex;
      flex-direction: column;
      max-width: 80%;
      align-self: flex-start;
    }

    .message-wrapper.user-msg {
      align-self: flex-end;
    }

    .message-bubble {
      padding: 12px 16px;
      border-radius: 18px;
      font-size: 14px;
      line-height: 1.5;
    }

    .message-wrapper:not(.user-msg) .message-bubble {
      background: white;
      color: #1e293b;
      border-bottom-left-radius: 4px;
      box-shadow: 0 2px 4px rgba(0,0,0,0.05);
    }

    .message-wrapper.user-msg .message-bubble {
      background: #3b82f6;
      color: white;
      border-bottom-right-radius: 4px;
    }

    .message-time { font-size: 10px; color: #94a3b8; margin-top: 4px; }
    .message-wrapper.user-msg .message-time { text-align: right; }

    .empty-chat {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      height: 100%;
      color: #94a3b8;
      text-align: center;
      gap: 12px;
      tui-icon { font-size: 48px; opacity: 0.3; }
    }

    .chat-input-area {
      padding: 16px;
      background: white;
      border-top: 1px solid #e2e8f0;
      display: flex;
      gap: 12px;
      
      input {
        flex: 1;
        border: none;
        background: #f1f5f9;
        padding: 10px 16px;
        border-radius: 20px;
        font-size: 14px;
        outline: none;
      }
    }

    .send-btn {
      background: #3b82f6;
      color: white;
      border: none;
      width: 40px;
      height: 40px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      transition: transform 0.2s;
      &:disabled { opacity: 0.5; cursor: default; }
      &:hover:not(:disabled) { transform: scale(1.1); }
    }

    .floating-bubble {
      width: 60px;
      height: 60px;
      border-radius: 50%;
      border: none;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      color: white;
      box-shadow: 0 10px 25px rgba(59, 130, 246, 0.4);
      transition: all 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275);
      position: relative;
    }

    .support-gradient {
      background: linear-gradient(135deg, #3b82f6, #2563eb);
    }

    .floating-bubble:hover { transform: scale(1.1) rotate(5deg); }
    .floating-bubble.active { transform: scale(0.9) rotate(-90deg); }

    .unread-badge {
      position: absolute;
      top: -5px;
      right: -5px;
      background: #ef4444;
      color: white;
      font-size: 11px;
      font-weight: 800;
      width: 20px;
      height: 20px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      border: 2px solid white;
    }
  `],
  animations: [
    trigger('slideInOut', [
      transition(':enter', [
        style({ transform: 'translateY(20px) scale(0.9)', opacity: 0 }),
        animate('300ms cubic-bezier(0.4, 0, 0.2, 1)', style({ transform: 'translateY(0) scale(1)', opacity: 1 }))
      ]),
      transition(':leave', [
        animate('200ms cubic-bezier(0.4, 0, 0.2, 1)', style({ transform: 'translateY(20px) scale(0.9)', opacity: 0 }))
      ])
    ])
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SupportChatBubbleComponent implements OnInit, OnDestroy, AfterViewChecked {
  private readonly api = inject(ApiService);
  private readonly auth = inject(AuthService);
  private readonly cdr = inject(ChangeDetectorRef);
  
  @ViewChild('scrollContainer') private scrollContainer!: ElementRef;

  isOpen = false;
  userInput = '';
  messages: ChatMessage[] = [];
  currentUserId: number | null = null;
  adminId = 1;
  unreadCount = 0;
  isLoggedIn$ = this.auth.user$.pipe(map(u => !!u));
  
  private pollingSub?: Subscription;

  ngOnInit() {
    this.auth.user$.subscribe(user => {
      this.currentUserId = user?.id || null;
      if (this.currentUserId) {
         this.startPolling();
      } else {
         this.stopPolling();
      }
    });

    // Handle global event to open chat
    (window as any).openSupportChat = () => {
       this.isOpen = true;
       this.cdr.markForCheck();
    };
  }

  ngOnDestroy() {
    this.stopPolling();
  }

  ngAfterViewChecked() {
    this.scrollToBottom();
  }

  startPolling() {
    this.stopPolling();
    if (!this.currentUserId) return;

    this.pollingSub = interval(3000)
      .pipe(
        startWith(0),
        switchMap(() => this.api.getChat(this.currentUserId!, this.adminId))
      )
      .subscribe(msgs => {
        if (msgs.length !== this.messages.length) {
          this.messages = msgs;
          this.calculateUnread();
          this.cdr.markForCheck();
        }
      });
  }

  stopPolling() {
    this.pollingSub?.unsubscribe();
  }

  toggleChat() {
    this.isOpen = !this.isOpen;
    if (this.isOpen) {
      this.calculateUnread(); // Effectively "read" them when open? 
      // Or we can call markMessagesAsRead API
      if (this.currentUserId) {
        this.api.markMessagesAsRead(this.adminId, this.currentUserId).subscribe();
        this.unreadCount = 0;
      }
    }
    this.cdr.markForCheck();
  }

  calculateUnread() {
    if (this.isOpen) {
       this.unreadCount = 0;
       return;
    }
    this.unreadCount = this.messages.filter(m => !m.isRead && m.receiverId === this.currentUserId).length;
  }

  sendMessage() {
    if (!this.userInput.trim() || !this.currentUserId) return;

    const msg: Partial<ChatMessage> = {
      senderId: this.currentUserId,
      receiverId: this.adminId,
      message: this.userInput.trim(),
    };

    this.userInput = '';
    this.api.sendMessage(msg).subscribe(savedMsg => {
      this.messages.push(savedMsg);
      this.cdr.markForCheck();
      this.scrollToBottom();
    });
  }

  private scrollToBottom(): void {
    if (this.scrollContainer) {
      this.scrollContainer.nativeElement.scrollTop = this.scrollContainer.nativeElement.scrollHeight;
    }
  }
}
