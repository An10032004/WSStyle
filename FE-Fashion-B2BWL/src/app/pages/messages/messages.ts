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
           <h2 class="tui-text_h3 page-header__title">Tin nhắn</h2>
           <span class="count text-muted">{{ conversations().length }} hội thoại</span>
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
  styleUrl: './messages.scss',
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
