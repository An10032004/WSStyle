import {
  Component,
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  inject,
  ViewChild,
  ElementRef,
  OnInit,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { catchError, map, of, switchMap } from 'rxjs';
import {
  ApiService,
  AIResponse,
  AIBundleSummary,
  AssistantSessionItem,
  AssistantTurn,
  AssistantWholesaleProductLink,
  Product,
  User,
} from '../../services/api.service';
import { AuthService } from '../../services/auth.service';
import { CartService } from '../../services/cart.service';
import { StorefrontHeaderComponent } from '../../shared/components/storefront-header/storefront-header';
import { StorefrontFooterComponent } from '../../shared/components/storefront-footer/storefront-footer';
import {
  buildWholesaleLinkBlockFromMessage,
  looksLikeBulkOrDealerIntent,
  looksLikeWholesaleIntent,
  resolveWholesaleLinkBlockForAiReply,
  wholesaleConversationCarryoverExcludingCurrent,
  WHOLESALE_USER_MESSAGE_WINDOW,
} from '../../shared/utils/assistant-wholesale-links';
import { TuiButton, TuiScrollbar } from '@taiga-ui/core';

interface ChatMessage {
  text: string;
  sender: 'user' | 'ai';
  time: Date;
  products?: Product[];
  bundles?: AIBundleSummary[];
  /** Markdown từ BE (product_search); hiển thị trong <details>, đồng thời gửi lại kèm storefrontContext. */
  pipelineNotes?: string | null;
  wholesaleLinkIntro?: string | null;
  wholesaleProductLinks?: AssistantWholesaleProductLink[];
}

@Component({
  selector: 'app-ai-assistant-page',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterModule,
    StorefrontHeaderComponent,
    StorefrontFooterComponent,
    TuiButton,
    TuiScrollbar,
  ],
  templateUrl: './ai-assistant-page.html',
  styleUrl: './ai-assistant-page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AiAssistantPageComponent implements OnInit {
  private readonly api = inject(ApiService);
  private readonly auth = inject(AuthService);
  private readonly cart = inject(CartService);
  private readonly cdr = inject(ChangeDetectorRef);

  @ViewChild('scrollArea') private scrollArea?: ElementRef<HTMLElement>;

  isLoggedIn$ = this.auth.user$.pipe(map((u) => !!u));

  userInput = '';
  isLoading = false;
  sessions: AssistantSessionItem[] = [];
  sessionsLoading = false;
  selectedSessionId: number | null = null;
  /** Phiên đang gửi tin (BE trả sessionId sau mỗi lần chat). */
  currentSessionId: number | null = null;

  messages: ChatMessage[] = [];

  lastResultProducts: Product[] = [];

  /** Lượt product_search gần nhất — đính kèm prompt kế tiếp để model bám pipeline. */
  private lastPipelineNotes: string | null = null;

  ngOnInit(): void {
    this.resetWelcome();
    this.refreshSessions();
    this.scheduleScrollChatToBottom();
  }

  refreshSessions(): void {
    const u = this.auth.currentUserValue;
    if (!u?.id) return;
    this.sessionsLoading = true;
    this.cdr.markForCheck();
    this.api.listAssistantSessions(u.id, 40).subscribe({
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
    this.selectedSessionId = null;
    this.currentSessionId = null;
    this.lastResultProducts = [];
    this.lastPipelineNotes = null;
    this.resetWelcome();
    this.cdr.markForCheck();
    this.scheduleScrollChatToBottom();
  }

  openSession(sessionId: number): void {
    const u = this.auth.currentUserValue;
    if (!u?.id) return;
    this.selectedSessionId = sessionId;
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
          this.syncLastProductsFromMessages();
          this.isLoading = false;
          this.cdr.markForCheck();
          this.scheduleScrollChatToBottom();
        },
        error: () => {
          this.isLoading = false;
          this.cdr.markForCheck();
        },
      });
  }

  private turnsToMessages(turns: AssistantTurn[], byId: Map<number, Product>): ChatMessage[] {
    const out: ChatMessage[] = [];
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

  private resetWelcome(): void {
    this.messages = [
      {
        text:
          'Xin chào! Mình là <strong>Luxe Assistant</strong>. Hỏi về sản phẩm (màu, size, giá…); cột bên phải hiển thị ' +
          '<strong>ảnh, giá và link</strong> khi có kết quả từ kho.',
        sender: 'ai',
        time: new Date(),
      },
    ];
  }

  private syncLastProductsFromMessages(): void {
    for (let i = this.messages.length - 1; i >= 0; i--) {
      const m = this.messages[i];
      if (m.sender === 'ai' && m.products?.length) {
        this.lastResultProducts = m.products;
        return;
      }
    }
    this.lastResultProducts = [];
  }

  send(): void {
    const text = this.userInput.trim();
    if (!text || this.isLoading) return;

    this.messages.push({ text, sender: 'user', time: new Date() });
    const userTxts = this.messages.filter((m) => m.sender === 'user').map((m) => m.text);
    const wholesaleConversationCarryover = wholesaleConversationCarryoverExcludingCurrent(userTxts);
    const wholesaleEffective =
      wholesaleConversationCarryover ||
      looksLikeWholesaleIntent(text) ||
      looksLikeBulkOrDealerIntent(text);
    this.userInput = '';
    this.isLoading = true;
    this.cdr.markForCheck();
    this.scheduleScrollChatToBottom();

    const u = this.auth.currentUserValue;
    const hints = this.cart.getAssistantPricingHints();
    this.api
      .quoteTax({ userId: u?.id ?? null, orderAmount: 1_000_000 })
      .pipe(
        catchError(() => of(null)),
        switchMap((tax) =>
          this.api.chatWithAI(text, {
            userId: u?.id,
            sessionId: this.currentSessionId,
            storefrontContext: this.buildStorefrontContext(u, tax) ?? undefined,
            pricingHintProductIds: hints.pricingHintProductIds,
            pricingHintCategoryIds: hints.pricingHintCategoryIds,
            wholesaleConversationCarryover,
          })
        )
      )
      .subscribe({
        next: (res: AIResponse) => {
          const products = res.products ?? [];
          const bundles = res.bundles ?? [];
          this.lastPipelineNotes = res.pipelineNotes?.trim() ? res.pipelineNotes : null;
          const fromBe = resolveWholesaleLinkBlockForAiReply(
            wholesaleEffective,
            res.wholesaleLinkIntro,
            res.wholesaleProductLinks,
            text,
            products,
            wholesaleConversationCarryover,
          );
          console.log('[LuxeAssistant AI]', {
            userMessage: text,
            wholesaleConversationCarryover,
            wholesaleEffective,
            assistantPricingToolSummary: res.assistantPricingToolSummary ?? null,
            pipelineNotes: res.pipelineNotes ?? null,
            wholesaleProductLinksCount: fromBe.links.length,
            productsCount: products.length,
          });
          this.messages.push({
            text: res.message,
            sender: 'ai',
            time: new Date(),
            products,
            bundles,
            pipelineNotes: this.lastPipelineNotes,
            wholesaleLinkIntro: fromBe.intro ?? undefined,
            wholesaleProductLinks: fromBe.links.length ? fromBe.links : undefined,
          });
          if (products.length > 0) {
            this.lastResultProducts = products;
          } else {
            this.syncLastProductsFromMessages();
          }
          if (res.sessionId != null) {
            this.currentSessionId = res.sessionId;
            this.selectedSessionId = res.sessionId;
            this.refreshSessions();
          }
          this.isLoading = false;
          this.cdr.markForCheck();
          this.scheduleScrollChatToBottom();
        },
        error: () => {
          this.messages.push({
            text: 'Không gọi được AI. Bạn thử lại sau.',
            sender: 'ai',
            time: new Date(),
          });
          this.isLoading = false;
          this.cdr.markForCheck();
          this.scheduleScrollChatToBottom();
        },
      });
  }

  trackById(_i: number, p: Product): number {
    return p.id;
  }

  trackSession(_i: number, s: AssistantSessionItem): number {
    return s.id;
  }

  displayPrice(p: Product): number {
    if (p.hidePrice) return 0;
    const c = p.calculatedPrice ?? p.basePrice;
    return typeof c === 'number' ? c : Number(c);
  }

  private buildStorefrontContext(u: User | null, tax: Record<string, unknown> | null): string | undefined {
    const lines: string[] = [];
    if (u) {
      lines.push(`- userId=${u.id}, role=${u.role ?? 'n/a'}`);
      if (u.displayRoles) lines.push(`- displayRoles: ${u.displayRoles}`);
      if (u.customerGroup?.name) lines.push(`- nhóm B2B: ${u.customerGroup.name}`);
    } else {
      lines.push('- Guest');
    }
    if (tax && tax['applied'] === true) {
      lines.push(
        `- Thuế (quote 1M₫): ${String(tax['taxDisplayType'] ?? '')}, rate=${String(tax['taxRate'] ?? '')}%`
      );
    }
    lines.push(
      '- Giá trên thẻ sản phẩm API đã áp rule B2B/theo nhóm khi có userId; có thể có quantityBreaksJson (bậc sỉ) và totalStock (tồn tổng).'
    );
    lines.push(
      '- Trang assistant full: cột trái lịch sử phiên; bảng sản phẩm + link /product/:id; có thể tiếp tục phiên từ chat nổi.'
    );
    if (this.lastPipelineNotes) {
      lines.push('');
      lines.push('## Pipeline lượt product_search trước (từ server, đọc kỹ khi trả lời tiếp)');
      lines.push(this.lastPipelineNotes);
    }
    return lines.join('\n');
  }

  stockLabel(p: Product): string {
    const n = p.totalStock;
    if (n == null || Number.isNaN(Number(n))) return '—';
    if (n <= 0) return 'Hết';
    if (n < 5) return `Còn ${n} (ít)`;
    return `Còn ${n}`;
  }

  bulkHint(p: Product): string {
    if (p.quantityBreaksJson && p.quantityBreaksJson.length > 4) return 'Có bậc SL';
    const d = (p.discountLabel || '').toLowerCase();
    if (d.includes('sỉ') || d.includes('si') || d.includes('mua sỉ')) return p.discountLabel || 'Ưu đãi SL';
    return '—';
  }

  bundlePrice(b: AIBundleSummary): number {
    const x = b.newPrice ?? b.oldPrice;
    return typeof x === 'number' ? x : Number(x);
  }

  /** Chỉ cuộn khi có tin mới — không gọi mỗi CD (click sidebar/header sẽ không kéo chat xuống đáy). */
  private scheduleScrollChatToBottom(): void {
    setTimeout(() => this.scrollChatToBottom(), 0);
  }

  private scrollChatToBottom(): void {
    const el = this.scrollArea?.nativeElement;
    if (el) {
      el.scrollTop = el.scrollHeight;
    }
  }
}
