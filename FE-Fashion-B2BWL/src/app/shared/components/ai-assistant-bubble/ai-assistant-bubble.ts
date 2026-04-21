import { Component, inject, ChangeDetectionStrategy, ChangeDetectorRef, ViewChild, ElementRef, AfterViewChecked, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { TuiButton, TuiIcon, TuiScrollbar } from '@taiga-ui/core';
import { ApiService, Product, AIResponse, User } from '../../../services/api.service';
import { AuthService } from '../../../services/auth.service';
import { animate, style, transition, trigger } from '@angular/animations';
import { catchError, map, of, switchMap } from 'rxjs';

interface Message {
  text: string;
  sender: 'user' | 'ai';
  time: Date;
  products?: Product[];
}

@Component({
  selector: 'app-ai-assistant-bubble',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, TuiButton, TuiIcon, TuiScrollbar],
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
export class AiAssistantBubbleComponent implements AfterViewChecked, OnInit {
  private readonly api = inject(ApiService);
  private readonly auth = inject(AuthService);
  private readonly cdr = inject(ChangeDetectorRef);
  private readonly router = inject(Router);
  
  @ViewChild('scrollContainer') private scrollContainer!: ElementRef;

  isLoggedIn$ = this.auth.user$.pipe(map(u => !!u));
  isOpen = false;
  isLoading = false;
  userInput = '';
  
  messages: Message[] = [
    {
      text: 'Xin chào! Tôi là trợ lý ảo Luxe Assistant. Tôi có thể giúp gì cho bạn hôm nay?',
      sender: 'ai',
      time: new Date()
    }
  ];

  ngOnInit() {
    // Initial load check if needed
  }

  ngAfterViewChecked() {
    this.scrollToBottom();
  }

  toggleChat() {
    this.isOpen = !this.isOpen;
    if (this.isOpen && this.messages.length === 1) {
       // Optional: add a tiny delay or effect
    }
  }

  sendMessage() {
    if (!this.userInput.trim() || this.isLoading) return;

    const userMsg = this.userInput.trim();
    this.messages.push({
      text: userMsg,
      sender: 'user',
      time: new Date()
    });
    
    this.userInput = '';
    this.isLoading = true;
    this.cdr.markForCheck();

    const u = this.auth.currentUserValue;
    this.api
      .quoteTax({ userId: u?.id ?? null, orderAmount: 1_000_000 })
      .pipe(
        catchError(() => of(null)),
        switchMap((tax) => {
          const storefrontContext = this.buildStorefrontContext(u, tax);
          return this.api.chatWithAI(userMsg, {
            userId: u?.id,
            storefrontContext: storefrontContext ?? undefined,
          });
        })
      )
      .subscribe({
        next: (response: AIResponse) => {
          this.messages.push({
            text: response.message,
            sender: 'ai',
            time: new Date(),
            products: response.products,
          });
          this.isLoading = false;
          this.cdr.markForCheck();
        },
        error: () => {
          this.messages.push({
            text: 'Rất tiếc, hệ thống AI đang bận. Bạn vui lòng thử lại sau nhé!',
            sender: 'ai',
            time: new Date(),
          });
          this.isLoading = false;
          this.cdr.markForCheck();
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
      '- Phí ship: phụ thuộc địa chỉ và cấu hình checkout; không cố định trong chat. Hướng dẫn khách xem bước thanh toán hoặc trang hỗ trợ.'
    );
    return lines.join('\n');
  }

  quickAsk(text: string) {
    this.userInput = text;
    this.sendMessage();
  }

  viewProduct(p: Product): void {
    void this.router.navigate(['/product', p.id]);
  }

  displayPrice(p: Product): number {
    if (p.hidePrice) return 0;
    const c = p.calculatedPrice ?? p.basePrice;
    return typeof c === 'number' ? c : Number(c);
  }

  private scrollToBottom(): void {
    if (this.scrollContainer) {
      this.scrollContainer.nativeElement.scrollTop = this.scrollContainer.nativeElement.scrollHeight;
    }
  }
}
