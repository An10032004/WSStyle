import { Component, inject, ChangeDetectionStrategy, ChangeDetectorRef, ViewChild, ElementRef, AfterViewChecked } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TuiButton, TuiIcon, TuiScrollbar } from '@taiga-ui/core';
import { ApiService, Product, AIResponse } from '../../../services/api.service';
import { animate, style, transition, trigger } from '@angular/animations';

interface Message {
  text: string;
  sender: 'user' | 'ai';
  time: Date;
  products?: Product[];
}

@Component({
  selector: 'app-ai-assistant-bubble',
  standalone: true,
  imports: [CommonModule, FormsModule, TuiButton, TuiIcon, TuiScrollbar],
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
export class AiAssistantBubbleComponent implements AfterViewChecked {
  private readonly api = inject(ApiService);
  private readonly cdr = inject(ChangeDetectorRef);
  
  @ViewChild('scrollContainer') private scrollContainer!: ElementRef;

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

    this.api.chatWithAI(userMsg).subscribe({
      next: (response: AIResponse) => {
        this.messages.push({
          text: response.message,
          sender: 'ai',
          time: new Date(),
          products: response.products
        });
        this.isLoading = false;
        this.cdr.markForCheck();
      },
      error: (err: any) => {
        this.messages.push({
          text: 'Rất tiếc, hệ thống AI đang bận. Bạn vui lòng thử lại sau nhé!',
          sender: 'ai',
          time: new Date()
        });
        this.isLoading = false;
        this.cdr.markForCheck();
      }
    });
  }

  quickAsk(text: string) {
    this.userInput = text;
    this.sendMessage();
  }

  viewProduct(p: Product) {
    // Navigate to product detail or close chat
    window.location.href = `/product/${p.id}`;
  }

  private scrollToBottom(): void {
    if (this.scrollContainer) {
      this.scrollContainer.nativeElement.scrollTop = this.scrollContainer.nativeElement.scrollHeight;
    }
  }
}
