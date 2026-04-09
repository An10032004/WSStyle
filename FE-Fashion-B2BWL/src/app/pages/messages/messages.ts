import { 
  Component, 
  ChangeDetectionStrategy, 
  inject, 
  signal, 
  computed, 
  ViewChild, 
  ElementRef, 
  AfterViewChecked, 
  OnInit, 
  OnDestroy, 
  ChangeDetectorRef 
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TranslocoModule } from '@jsverse/transloco';
import { TuiIcon, TuiButton, TuiScrollbar } from '@taiga-ui/core';
import { TuiBadge, TuiAvatar } from '@taiga-ui/kit';
import { ApiService, ChatMessage, Conversation } from '../../services/api.service';
import { interval, Subscription, startWith, switchMap } from 'rxjs';

@Component({
  standalone: true,
  imports: [CommonModule, FormsModule, TranslocoModule, TuiIcon, TuiButton, TuiScrollbar, TuiBadge, TuiAvatar],
  template: `
    <div class="messages-page" *transloco="let t">
      <div class="sidebar-panel">
        <div class="sidebar-header">
           <h2>Tin nhắn</h2>
           <span class="count">{{ conversations().length }} hội thoại</span>
        </div>
        
        <tui-scrollbar class="sidebar-scroll">
          <div class="conv-list">
            <div 
              *ngFor="let c of conversations()" 
              class="conv-item" 
              [class.active]="selectedUserId() === c.otherUserId"
              (click)="selectUser(c.otherUserId)"
            >
              <tui-avatar 
                [src]="c.otherUserAvatar || ''" 
                size="l"
                class="avatar"
              ></tui-avatar>
              <div class="conv-info">
                <div class="top">
                  <span class="name">{{ c.otherUserName }}</span>
                  <span class="time">{{ c.lastMessageTime | date:'HH:mm' }}</span>
                </div>
                <div class="bottom">
                  <span class="msg" [class.unread]="c.hasUnread">{{ c.lastMessage }}</span>
                  <tui-badge *ngIf="c.hasUnread" appearance="primary" size="s" value="!"></tui-badge>
                </div>
              </div>
            </div>
          </div>
        </tui-scrollbar>
      </div>

      <div class="chat-panel">
        <ng-container *ngIf="selectedUserId(); else noChat">
          <div class="chat-header">
            <div class="user-meta">
               <tui-avatar [src]="''" size="s"></tui-avatar>
               <div class="text">
                  <h3>{{ selectedUserName() }}</h3>
                  <span class="status">Đang trực tuyến</span>
               </div>
            </div>
            <div class="actions">
               <button tuiIconButton type="button" iconStart="@tui.phone" appearance="flat" size="s"></button>
               <button tuiIconButton type="button" iconStart="@tui.more-vertical" appearance="flat" size="s"></button>
            </div>
          </div>

          <div class="chat-history" #scrollContainer>
            <div 
              *ngFor="let msg of messages()" 
              class="msg-row" 
              [class.sent]="msg.senderId === 1"
            >
              <div class="msg-bubble">
                <p>{{ msg.message }}</p>
                <span class="time">{{ msg.createdAt | date:'HH:mm' }}</span>
              </div>
            </div>
          </div>

          <div class="chat-input luxe-input-wrapper">
            <input 
              type="text" 
              placeholder="Nhập nội dung phản hồi..." 
              [(ngModel)]="replyText"
              (keyup.enter)="send()"
            />
            <button 
              tuiButton 
              type="button" 
              appearance="primary" 
              (click)="send()"
              [disabled]="!replyText.trim()"
            >
              Gửi
            </button>
          </div>
        </ng-container>

        <ng-template #noChat>
          <div class="no-chat-state">
             <div class="icon-circle">
                <tui-icon icon="@tui.message-square"></tui-icon>
             </div>
             <h3>Chọn một cuộc hội thoại</h3>
             <p>Chọn khách hàng từ danh sách bên trái để bắt đầu hỗ trợ.</p>
          </div>
        </ng-template>
      </div>
    </div>
  `,
  styles: [`
    .messages-page {
      display: flex;
      height: calc(100vh - 100px);
      background: #f8fafc;
      margin: -32px; /* Offset parent padding if any */
      overflow: hidden;
    }

    /* Sidebar */
    .sidebar-panel {
      width: 400px;
      background: #fff;
      border-right: 1px solid #e2e8f0;
      display: flex;
      flex-direction: column;
    }
    .sidebar-header {
      padding: 32px;
      border-bottom: 1px solid #f1f5f9;
      h2 { font-size: 24px; font-weight: 800; margin-bottom: 4px; }
      .count { font-size: 14px; color: #64748b; font-weight: 500; }
    }
    .sidebar-scroll { flex: 1; }
    .conv-list { display: flex; flex-direction: column; }
    .conv-item {
      padding: 20px 32px;
      display: flex;
      gap: 16px;
      cursor: pointer;
      transition: background 0.2s;
      border-bottom: 1px solid #f8fafc;
      &:hover { background: #f8fafc; }
      &.active { background: #eff6ff; border-right: 3px solid #3b82f6; }
    }
    .conv-info {
      flex: 1;
      overflow: hidden;
      .top { display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px; }
      .name { font-weight: 700; color: #1e293b; }
      .time { font-size: 11px; color: #94a3b8; }
      .bottom { display: flex; justify-content: space-between; align-items: center; }
      .msg { font-size: 13px; color: #64748b; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
      .msg.unread { color: #1e293b; font-weight: 700; }
    }

    /* Main Chat */
    .chat-panel {
      flex: 1;
      display: flex;
      flex-direction: column;
      background: #fff;
    }

    .chat-header {
      padding: 20px 40px;
      border-bottom: 1px solid #f1f5f9;
      display: flex;
      justify-content: space-between;
      align-items: center;
      .user-meta { display: flex; gap: 12px; align-items: center; }
      h3 { font-size: 16px; font-weight: 800; }
      .status { font-size: 12px; color: #22c55e; font-weight: 600; display: flex; align-items: center; gap: 4px; }
      .status::before { content: ''; width: 6px; height: 6px; background: #22c55e; border-radius: 50%; }
    }

    .chat-history {
      flex: 1;
      padding: 40px;
      overflow-y: auto;
      background: #f8fafc;
      display: flex;
      flex-direction: column;
      gap: 24px;
    }

    .msg-row { display: flex; flex-direction: column; max-width: 60%; align-self: flex-start; }
    .msg-row.sent { align-self: flex-end; }

    .msg-bubble {
      padding: 16px 20px;
      border-radius: 20px;
      font-size: 14px;
      line-height: 1.6;
      position: relative;
    }
    .msg-row:not(.sent) .msg-bubble { 
      background: white; color: #1e293b; border-bottom-left-radius: 4px; 
      box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.05);
    }
    .msg-row.sent .msg-bubble { 
      background: #3b82f6; color: white; border-bottom-right-radius: 4px; 
      box-shadow: 0 10px 15px -3px rgba(59, 130, 246, 0.2);
    }

    .time { font-size: 10px; color: #94a3b8; margin-top: 8px; font-weight: 500; }
    .sent .time { text-align: right; }

    .chat-input {
      padding: 32px 40px;
      border-top: 1px solid #f1f5f9;
      display: flex;
      gap: 16px;
      input {
        flex: 1;
        background: #f1f5f9;
        border: 2px solid transparent;
        border-radius: 16px;
        padding: 0 24px;
        font-size: 15px;
        transition: all 0.2s;
        outline: none;
        &:focus { background: white; border-color: #3b82f6; box-shadow: 0 0 0 4px rgba(59, 130, 246, 0.1); }
      }
      button { border-radius: 16px; padding: 0 32px; font-weight: 700; height: 48px; }
    }

    .no-chat-state {
      flex: 1;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      color: #94a3b8;
      .icon-circle {
        width: 80px;
        height: 80px;
        background: #f1f5f9;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        margin-bottom: 24px;
        tui-icon { font-size: 32px; opacity: 0.5; }
      }
      h3 { color: #1e293b; font-size: 20px; font-weight: 800; margin-bottom: 8px; }
    }
  `],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MessagesComponent implements OnInit, OnDestroy, AfterViewChecked {
  private readonly api = inject(ApiService);
  
  @ViewChild('scrollContainer') private scrollContainer!: ElementRef;

  readonly conversations = signal<Conversation[]>([]);
  readonly selectedUserId = signal<number | null>(null);
  readonly messages = signal<ChatMessage[]>([]);
  
  replyText = '';
  private pollingSub?: Subscription;
  private listPollingSub?: Subscription;

  constructor(private readonly cdr: ChangeDetectorRef) {}

  selectedUserName = computed(() => {
    const id = this.selectedUserId();
    if (!id) return '';
    const c = this.conversations().find(conv => conv.otherUserId === id);
    return c ? c.otherUserName : 'Khách hàng';
  });

  ngOnInit() {
    this.loadConversations();
    // Poll for conversation list updates
    this.listPollingSub = interval(5000)
      .pipe(startWith(0))
      .subscribe(() => this.loadConversations());
  }

  ngOnDestroy() {
    this.stopPolling();
    this.listPollingSub?.unsubscribe();
  }

  ngAfterViewChecked() {
    this.scrollToBottom();
  }

  loadConversations() {
    this.api.getConversations().subscribe(data => {
      this.conversations.set(data);
      this.cdr.markForCheck();
    });
  }

  selectUser(userId: number) {
    this.selectedUserId.set(userId);
    this.startPollingMessages(userId);
    // Mark as read
    this.api.markMessagesAsRead(userId, 1).subscribe(() => {
       this.loadConversations();
    });
  }

  startPollingMessages(userId: number) {
    this.stopPolling();
    this.messages.set([]); // Clear current
    this.pollingSub = interval(3000)
      .pipe(
        startWith(0),
        switchMap(() => this.api.getChat(1, userId))
      )
      .subscribe(msgs => {
        if (msgs.length !== this.messages().length) {
          this.messages.set(msgs);
          this.cdr.markForCheck();
          this.scrollToBottom();
        }
      });
  }

  stopPolling() {
    this.pollingSub?.unsubscribe();
  }

  send() {
    if (!this.replyText.trim() || !this.selectedUserId()) return;
    
    const targetUserId = this.selectedUserId()!;
    this.api.sendMessage({
      senderId: 1,
      receiverId: targetUserId,
      message: this.replyText
    }).subscribe(saved => {
      this.messages.set([...this.messages(), saved]);
      this.replyText = '';
      this.cdr.markForCheck();
      this.scrollToBottom();
      this.loadConversations();
    });
  }

  private scrollToBottom(): void {
    if (this.scrollContainer) {
      this.scrollContainer.nativeElement.scrollTop = this.scrollContainer.nativeElement.scrollHeight;
    }
  }
}
