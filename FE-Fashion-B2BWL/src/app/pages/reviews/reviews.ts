import { Component, ChangeDetectionStrategy, inject, signal, TemplateRef, ViewChild, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { TranslocoModule } from '@jsverse/transloco';
import { TuiIcon, TuiButton, TuiDialogService, TuiNotification, TuiFormatDatePipe } from '@taiga-ui/core';
import { TuiTextareaModule } from '@taiga-ui/legacy';
import { TuiBadge, TuiRating } from '@taiga-ui/kit';
import { ApiService, ProductReview } from '../../services/api.service';
import { StorefrontHeaderComponent } from '../../shared/components/storefront-header/storefront-header';
import { StorefrontFooterComponent } from '../../shared/components/storefront-footer/storefront-footer';
import { firstValueFrom } from 'rxjs';

@Component({
  standalone: true,
  imports: [
    CommonModule, 
    FormsModule, 
    RouterModule,
    TranslocoModule, 
    TuiIcon, 
    TuiButton, 
    TuiTextareaModule, 
    TuiBadge,
    TuiRating,
    TuiNotification,
    TuiFormatDatePipe,
    StorefrontHeaderComponent,
    StorefrontFooterComponent
  ],
  template: `
    <div class="reviews-page" [class.is-admin]="isAdmin()">
      <app-storefront-header *ngIf="!isAdmin()"></app-storefront-header>
      
      <div class="container" [class.admin-layout]="isAdmin()">
        <header class="reviews-header">
           <div class="header-content">
             <h1 class="title">
               <tui-icon icon="@tui.message-square"></tui-icon>
               {{ isAdmin() ? 'Quản lý đánh giá' : 'Khách hàng nói gì về chúng tôi' }}
             </h1>
             <p class="subtitle" *ngIf="!isAdmin()">Cùng xem những chia sẻ thật từ những khách hàng đã trải nghiệm sản phẩm.</p>
           </div>
        </header>

        <!-- Sơ lược đánh giá (Rating Summary) - Chỉ hiện ở Storefront -->
        <div class="rating-overall-card" *ngIf="!isAdmin() && reviews().length > 0">
           <div class="overall-info">
              <span class="big-num">{{ averageRating() | number:'1.1-1' }}</span>
              <tui-rating [max]="5" [ngModel]="averageRating()" [readOnly]="true" class="large-rating"></tui-rating>
              <span class="total-count">{{ reviews().length }} Đánh giá công khai</span>
           </div>
           <div class="rating-bars-grid">
              <div class="bar-row" *ngFor="let s of [5,4,3,2,1]">
                 <span class="star-label">{{ s }} <tui-icon icon="@tui.star-filled"></tui-icon></span>
                 <div class="bar-container">
                    <div class="bar-value" [style.width.%]="getRatingPercent(s)"></div>
                 </div>
                 <span class="percent-label">{{ getRatingPercent(s) }}%</span>
              </div>
           </div>
        </div>

        <ng-template #replyDialog let-observer>
          <div class="reply-modal">
            <h3 class="modal-title">Phản hồi khách hàng</h3>
            <p class="modal-desc">Gửi lời cảm ơn hoặc giải đáp thắc mắc của khách hàng.</p>
            
            <tui-textarea [(ngModel)]="replyMessage" [expandable]="true" class="reply-input">
              Nhập nội dung phản hồi...
            </tui-textarea>
            
            <div class="modal-actions">
              <button tuiButton type="button" size="m" appearance="outline" (click)="observer.complete()">Hủy bỏ</button>
              <button tuiButton type="button" size="m" (click)="observer.next(true); observer.complete()">Gửi phản hồi</button>
            </div>
          </div>
        </ng-template>

        <div class="reviews-grid">
           <div *ngFor="let review of reviews()" class="review-card-luxe">
              <div class="product-banner" *ngIf="review.productName" [routerLink]="['/product', review.productId]">
                 <img [src]="review.productImage || 'assets/placeholder-p.png'" [alt]="review.productName" class="prod-thumb">
                 <div class="prod-info">
                   <span class="prod-label">Sản phẩm đánh giá</span>
                   <h4 class="prod-name">{{ review.productName }}</h4>
                 </div>
                 <tui-icon icon="@tui.chevron-right" class="arrow"></tui-icon>
              </div>

              <div class="review-body">
                <div class="review-meta">
                   <div class="user-info">
                      <div class="avatar-placeholder">
                        {{ (review.userName || 'U')[0].toUpperCase() }}
                      </div>
                      <div class="user-details">
                        <span class="user-name">{{ review.userName || 'Khách hàng ẩn danh' }}</span>
                        <span class="review-date">{{ review.createdAt | date:'dd/MM/yyyy HH:mm' }}</span>
                      </div>
                   </div>
                   <div class="rating-display">
                      <tui-rating [max]="5" [ngModel]="review.rating" [readOnly]="true"></tui-rating>
                   </div>
                </div>

                <div class="review-content">
                   <p class="comment-text">{{ review.comment }}</p>
                </div>

                <div class="admin-reply-box" *ngIf="review.replyMessage">
                   <div class="reply-header">
                      <tui-icon icon="@tui.corner-down-right"></tui-icon>
                      <strong>Phản hồi từ cửa hàng</strong>
                   </div>
                   <p class="reply-text">{{ review.replyMessage }}</p>
                </div>

                <div class="card-footer" *ngIf="isAdmin() && !review.replyMessage">
                   <button tuiButton type="button" size="s" appearance="secondary" (click)="showReplyDialog(review.id)">
                     <tui-icon icon="@tui.reply"></tui-icon> Phản hồi nhanh
                   </button>
                </div>
              </div>
           </div>

           <div *ngIf="reviews().length === 0" class="empty-state">
              <tui-icon icon="@tui.message-square-off" class="empty-icon"></tui-icon>
              <h3>Chưa có đánh giá nào</h3>
              <p>Hiện tại hệ thống chưa nhận được phản hồi nào từ khách hàng.</p>
           </div>
        </div>
      </div>

      <app-storefront-footer *ngIf="!isAdmin()"></app-storefront-footer>
    </div>
  `,
  styleUrl: './reviews.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ReviewsComponent {
  private readonly api = inject(ApiService);
  private readonly dialogs = inject(TuiDialogService);
  private readonly router = inject(Router);
  
  readonly reviews = signal<ProductReview[]>([]);
  readonly isAdmin = computed(() => this.router.url.includes('/admin/'));

  readonly averageRating = computed(() => {
    const list = this.reviews();
    if (list.length === 0) return 0;
    const sum = list.reduce((acc, r) => acc + r.rating, 0);
    return sum / list.length;
  });

  getRatingPercent(star: number): number {
    const list = this.reviews();
    if (list.length === 0) return 0;
    const count = list.filter(r => r.rating === star).length;
    return Math.round((count / list.length) * 100);
  }

  @ViewChild('replyDialog') replyDialogTemplate!: TemplateRef<any>;
  replyMessage = '';
  currentReviewId: number | null = null;

  constructor() {
    this.refresh();
  }

  async refresh() {
    try {
      const data = await firstValueFrom(this.api.getReviews());
      this.reviews.set(data);
    } catch (e) {
      console.error('Failed to load reviews', e);
    }
  }

  showReplyDialog(id: number) {
    this.currentReviewId = id;
    this.replyMessage = '';
    this.dialogs.open<boolean>(this.replyDialogTemplate, { 
      size: 'm',
      label: 'Phản hồi đánh giá'
    }).subscribe({
      next: (res) => {
        if (res && this.currentReviewId) this.sendReply();
      }
    });
  }

  async sendReply() {
    if (!this.currentReviewId || !this.replyMessage) return;
    try {
      await firstValueFrom(this.api.replyToReview(this.currentReviewId, this.replyMessage));
      this.refresh();
    } catch (e) {
      console.error('Failed to send reply', e);
    }
  }
}
