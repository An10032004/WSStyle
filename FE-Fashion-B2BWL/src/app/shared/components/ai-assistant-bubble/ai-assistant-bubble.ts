import { Component, inject, ChangeDetectionStrategy, ChangeDetectorRef, ViewChild, ElementRef, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { TuiButton, TuiIcon } from '@taiga-ui/core';
import {
  ApiService,
  Product,
  AIResponse,
  AIBundleSummary,
  User,
  AssistantSessionItem,
  AssistantTurn,
  AssistantWholesaleProductLink,
} from '../../../services/api.service';
import {
  buildWholesaleLinkBlockFromMessage,
  looksLikeBulkOrDealerIntent,
  looksLikeWholesaleIntent,
  resolveWholesaleLinkBlockForAiReply,
  wholesaleConversationCarryoverExcludingCurrent,
  WHOLESALE_USER_MESSAGE_WINDOW,
} from '../../utils/assistant-wholesale-links';
import { AuthService } from '../../../services/auth.service';
import { CartService } from '../../../services/cart.service';
import { animate, style, transition, trigger } from '@angular/animations';
import { catchError, map, of, switchMap } from 'rxjs';

interface Message {
  text: string;
  sender: 'user' | 'ai';
  time: Date;
  products?: Product[];
  bundles?: AIBundleSummary[];
  pipelineNotes?: string | null;
  wholesaleLinkIntro?: string | null;
  wholesaleProductLinks?: AssistantWholesaleProductLink[];
}

@Component({
  selector: 'app-ai-assistant-bubble',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, TuiButton, TuiIcon],
  templateUrl: './ai-assistant-bubble.html',
  styleUrls: ['./ai-assistant-bubble.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
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
  ]
})
export class AiAssistantBubbleComponent implements OnInit {
  private readonly api = inject(ApiService);
  private readonly auth = inject(AuthService);
  private readonly cart = inject(CartService);
  private readonly cdr = inject(ChangeDetectorRef);
  private readonly router = inject(Router);
  
  @ViewChild('scrollContainer') private scrollContainer!: ElementRef;

  isLoggedIn$ = this.auth.user$.pipe(map(u => !!u));
  isOpen = false;
  isLoading = false;
  userInput = '';

  sessions: AssistantSessionItem[] = [];
  sessionsLoading = false;
  /** Đồng bộ `<select>` (chuỗi rỗng = phiên mới). */
  sessionSelectKey = '';
  /** Phiên đang gửi — BE trả `sessionId` sau mỗi lượt chat. */
  currentSessionId: number | null = null;

  messages: Message[] = [
    {
      text: 'Xin chào! Tôi là trợ lý ảo Luxe Assistant. Tôi có thể giúp gì cho bạn hôm nay?',
      sender: 'ai',
      time: new Date()
    }
  ];

  private lastPipelineNotes: string | null = null;

  ngOnInit() {
    // Initial load check if needed
  }

  toggleChat() {
    const willOpen = !this.isOpen;
    this.isOpen = willOpen;
    if (willOpen) {
      this.refreshSessions();
      this.scheduleScrollToBottom();
    }
  }

  refreshSessions(): void {
    const u = this.auth.currentUserValue;
    if (!u?.id) return;
    this.sessionsLoading = true;
    this.cdr.markForCheck();
    this.api.listAssistantSessions(u.id, 30).subscribe({
      next: (list) => {
        this.sessions = list;
        this.sessionsLoading = false;
        this.cdr.markForCheck();
      },
      error: () => {
        this.sessions = [];
        this.sessionsLoading = false;
        this.cdr.markForCheck();
      },
    });
  }

  newSession(): void {
    this.currentSessionId = null;
    this.sessionSelectKey = '';
    this.lastPipelineNotes = null;
    this.messages = [
      {
        text: 'Xin chào! Tôi là trợ lý ảo Luxe Assistant. Tôi có thể giúp gì cho bạn hôm nay?',
        sender: 'ai',
        time: new Date(),
      },
    ];
    this.cdr.markForCheck();
    this.scheduleScrollToBottom();
  }

  onSessionPick(key: string): void {
    if (key === '') {
      this.newSession();
      return;
    }
    const id = Number(key);
    if (!Number.isFinite(id) || id <= 0) return;
    this.openSession(id);
  }

  openSession(sessionId: number): void {
    const u = this.auth.currentUserValue;
    if (!u?.id) return;
    this.sessionSelectKey = String(sessionId);
    this.currentSessionId = sessionId;
    this.isLoading = true;
    this.cdr.markForCheck();
    this.api
      .getAssistantSessionMessages(sessionId, u.id)
      .pipe(
        switchMap((turns) => {
          const allIds = new Set<number>();
          for (const t of turns) {
            if (t.role === 'ASSISTANT' && t.productIds?.length) {
              t.productIds.forEach((id) => allIds.add(id));
            }
          }
          if (allIds.size === 0) {
            return of({ turns, products: [] as Product[] });
          }
          return this.api.searchProducts({ productIds: [...allIds], userId: u.id, includeInactive: 'true' }).pipe(
            map((page) => ({ turns, products: page.content })),
            catchError(() => of({ turns, products: [] as Product[] }))
          );
        })
      )
      .subscribe({
        next: ({ turns, products }) => {
          const byId = new Map(products.map((p) => [p.id, p]));
          this.messages = this.turnsToMessages(turns, byId);
          this.lastPipelineNotes = null;
          this.isLoading = false;
          this.cdr.markForCheck();
          this.scheduleScrollToBottom();
        },
        error: () => {
          this.isLoading = false;
          this.cdr.markForCheck();
        },
      });
  }

  private turnsToMessages(turns: AssistantTurn[], byId: Map<number, Product>): Message[] {
    const out: Message[] = [];
    const recentUser: string[] = [];
    for (const t of turns) {
      if (t.role === 'USER') {
        recentUser.push(t.content);
        if (recentUser.length > WHOLESALE_USER_MESSAGE_WINDOW) {
          recentUser.shift();
        }
        out.push({ text: t.content, sender: 'user', time: new Date() });
      } else {
        const products = (t.productIds || [])
          .map((id) => byId.get(id))
          .filter((p): p is Product => !!p);
        const carry = wholesaleConversationCarryoverExcludingCurrent(recentUser);
        const lastUser = recentUser.length > 0 ? recentUser[recentUser.length - 1] : '';
        const block = buildWholesaleLinkBlockFromMessage(lastUser, products, carry);
        out.push({
          text: t.content,
          sender: 'ai',
          time: new Date(),
          products,
          wholesaleLinkIntro: block.intro ?? undefined,
          wholesaleProductLinks: block.links.length ? block.links : undefined,
        });
      }
    }
    return out;
  }

  sendMessage() {
    if (!this.userInput.trim() || this.isLoading) return;

    const userMsg = this.userInput.trim();
    this.messages.push({
      text: userMsg,
      sender: 'user',
      time: new Date()
    });

    const userTxts = this.messages.filter((m) => m.sender === 'user').map((m) => m.text);
    const wholesaleConversationCarryover = wholesaleConversationCarryoverExcludingCurrent(userTxts);
    const wholesaleEffective =
      wholesaleConversationCarryover ||
      looksLikeWholesaleIntent(userMsg) ||
      looksLikeBulkOrDealerIntent(userMsg);
    
    this.userInput = '';
    this.isLoading = true;
    this.cdr.markForCheck();
    this.scheduleScrollToBottom();

    const u = this.auth.currentUserValue;
    const hints = this.cart.getAssistantPricingHints();
    this.api
      .quoteTax({ userId: u?.id ?? null, orderAmount: 1_000_000 })
      .pipe(
        catchError(() => of(null)),
        switchMap((tax) => {
          const storefrontContext = this.buildStorefrontContext(u, tax);
          return this.api.chatWithAI(userMsg, {
            userId: u?.id,
            sessionId: this.currentSessionId,
            storefrontContext: storefrontContext ?? undefined,
            pricingHintProductIds: hints.pricingHintProductIds,
            pricingHintCategoryIds: hints.pricingHintCategoryIds,
            wholesaleConversationCarryover,
          });
        })
      )
      .subscribe({
        next: (response: AIResponse) => {
          this.lastPipelineNotes = response.pipelineNotes?.trim() ? response.pipelineNotes : null;
          const products = response.products ?? [];
          const fromBe = resolveWholesaleLinkBlockForAiReply(
            wholesaleEffective,
            response.wholesaleLinkIntro,
            response.wholesaleProductLinks,
            userMsg,
            products,
            wholesaleConversationCarryover,
          );
          console.log('[LuxeAssistant AI]', {
            userMessage: userMsg,
            wholesaleConversationCarryover,
            wholesaleEffective,
            assistantPricingToolSummary: response.assistantPricingToolSummary ?? null,
            pipelineNotes: response.pipelineNotes ?? null,
            wholesaleProductLinksCount: fromBe.links.length,
            productsCount: products.length,
          });
          this.messages.push({
            text: response.message,
            sender: 'ai',
            time: new Date(),
            products,
            bundles: response.bundles,
            pipelineNotes: this.lastPipelineNotes,
            wholesaleLinkIntro: fromBe.intro ?? undefined,
            wholesaleProductLinks: fromBe.links.length ? fromBe.links : undefined,
          });
          if (response.sessionId != null) {
            this.currentSessionId = response.sessionId;
            this.sessionSelectKey = String(response.sessionId);
            this.refreshSessions();
          }
          this.isLoading = false;
          this.cdr.markForCheck();
          this.scheduleScrollToBottom();
        },
        error: () => {
          this.messages.push({
            text: 'Rất tiếc, hệ thống AI đang bận. Bạn vui lòng thử lại sau nhé!',
            sender: 'ai',
            time: new Date(),
          });
          this.isLoading = false;
          this.cdr.markForCheck();
          this.scheduleScrollToBottom();
        },
      });
  }

  /** Markdown ngắn gửi kèm chat: user + quote thuế mẫu (1M) — model chỉ diễn đạt, không thay thế giá SP. */
  private buildStorefrontContext(u: User | null, tax: Record<string, unknown> | null): string | undefined {
    const lines: string[] = [];
    if (u) {
      lines.push(`- Người dùng đăng nhập: id=${u.id}, role=${u.role ?? 'n/a'}`);
      if (u.displayRoles) lines.push(`- Vai trò hiển thị: ${u.displayRoles}`);
      if (u.customerGroup?.name) lines.push(`- Nhóm khách B2B: ${u.customerGroup.name}`);
    } else {
      lines.push('- Khách chưa đăng nhập (guest).');
    }
    if (tax && tax['applied'] === true) {
      lines.push(
        `- Thuế hiển thị (quote thử với đơn hàng 1.000.000₫): loại=${String(tax['taxDisplayType'] ?? '')}, rate=${String(tax['taxRate'] ?? '')}%, taxAmount≈${String(tax['taxAmount'] ?? '')}₫. Đây chỉ là ví dụ; giá từng sản phẩm lấy từ thẻ sản phẩm API.`
      );
    } else {
      lines.push('- Quote thuế mẫu (1M): không áp dụng rule hiển thị hoặc chưa lấy được.');
    }
    lines.push(
      '- Giá thẻ sản phẩm đã theo rule B2B khi có userId; có thể có quantityBreaksJson (bậc sỉ) và totalStock (tồn tổng).'
    );
    lines.push(
      '- Phí ship: phụ thuộc địa chỉ và cấu hình checkout; không cố định trong chat. Hướng dẫn khách xem bước thanh toán hoặc trang hỗ trợ.'
    );
    if (this.lastPipelineNotes) {
      lines.push('');
      lines.push('## Pipeline lượt product_search trước (từ server)');
      lines.push(this.lastPipelineNotes);
    }
    return lines.join('\n');
  }

  quickAsk(text: string) {
    this.userInput = text;
    this.sendMessage();
  }

  viewProduct(p: Product): void {
    void this.router.navigate(['/product', p.id]);
  }

  viewBundle(b: AIBundleSummary): void {
    void this.router.navigate(['/bundle', b.id]);
  }

  bundlePrice(b: AIBundleSummary): number {
    const x = b.newPrice ?? b.oldPrice;
    return typeof x === 'number' ? x : Number(x);
  }

  displayPrice(p: Product): number {
    if (p.hidePrice) return 0;
    const c = p.calculatedPrice ?? p.basePrice;
    return typeof c === 'number' ? c : Number(c);
  }

  /** Chỉ cuộn khi có nội dung mới — tránh gọi mỗi CD (click nơi khác cũng kéo xuống đáy). */
  private scheduleScrollToBottom(): void {
    setTimeout(() => this.scrollToBottom(), 0);
  }

  private scrollToBottom(): void {
    if (!this.isOpen) return;
    const el = this.scrollContainer?.nativeElement;
    if (el) {
      el.scrollTop = el.scrollHeight;
    }
  }
}
