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
  styles: [`
    .reviews-page {
      min-height: 100vh;
      background: #f8fafc;
    }
    .is-admin { background: transparent; padding-top: 0; }
    
    .container {
      max-width: 1000px;
      margin: 0 auto;
      padding: 40px 20px;
    }
    .admin-layout { max-width: 100%; padding: 32px; }

    .reviews-header {
      margin-bottom: 40px;
      text-align: center;
    }
    .is-admin .reviews-header { text-align: left; margin-bottom: 32px; }

    .title {
      font-size: 2.5rem;
      font-weight: 800;
      color: #1e293b;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 16px;
      margin-bottom: 12px;
    }
    .is-admin .title { justify-content: flex-start; font-size: 1.8rem; }
    
    .subtitle { color: #64748b; font-size: 1.1rem; }
    
    .rating-overall-card {
      background: #fff;
      border-radius: 16px;
      padding: 32px;
      margin-bottom: 40px;
      display: grid;
      grid-template-columns: 1fr 2fr;
      gap: 40px;
      align-items: center;
      box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1);
    }
    @media (max-width: 640px) {
      .rating-overall-card { grid-template-columns: 1fr; gap: 24px; text-align: center; }
    }

    .overall-info {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 8px;
    }
    .big-num { font-size: 3.5rem; font-weight: 900; color: #1e293b; line-height: 1; }
    .large-rating { --tui-rating-size: 24px; }
    .total-count { color: #94a3b8; font-weight: 600; font-size: 0.9rem; }

    .rating-bars-grid { display: flex; flex-direction: column; gap: 12px; }
    .bar-row { display: flex; align-items: center; gap: 12px; }
    .star-label { min-width: 40px; font-weight: 700; color: #475569; display: flex; align-items: center; gap: 4px; }
    .bar-container { flex: 1; height: 10px; background: #f1f5f9; border-radius: 5px; overflow: hidden; }
    .bar-value { height: 100%; background: #facc15; border-radius: 5px; }
    .percent-label { min-width: 45px; font-size: 0.85rem; color: #94a3b8; font-weight: 600; text-align: right; }

    .reviews-grid {
      display: flex;
      flex-direction: column;
      gap: 24px;
    }

    .review-card-luxe {
      background: #fff;
      border-radius: 16px;
      overflow: hidden;
      box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1);
      transition: transform 0.2s, box-shadow 0.2s;
    }
    .review-card-luxe:hover {
      box-shadow: 0 10px 15px -3px rgb(0 0 0 / 0.1);
    }

    .product-banner {
      display: flex;
      align-items: center;
      gap: 16px;
      padding: 12px 24px;
      background: #f1f5f9;
      cursor: pointer;
      border-bottom: 1px solid #e2e8f0;
    }
    .product-banner:hover { background: #e2e8f0; }

    .prod-thumb {
      width: 50px;
      height: 50px;
      object-fit: cover;
      border-radius: 8px;
    }
    .prod-info { flex: 1; }
    .prod-label { font-size: 0.75rem; color: #64748b; font-weight: 600; text-transform: uppercase; }
    .prod-name { margin: 0; font-size: 1rem; color: #1e293b; font-weight: 700; }
    .arrow { color: #94a3b8; }

    .review-body { padding: 24px; }

    .review-meta {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-bottom: 20px;
    }

    .user-info { display: flex; gap: 12px; align-items: center; }
    .avatar-placeholder {
      width: 44px;
      height: 44px;
      background: #3b82f6;
      color: #fff;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      font-weight: 800;
      font-size: 1.2rem;
    }
    .user-details { display: flex; flex-direction: column; }
    .user-name { font-weight: 700; color: #1e293b; }
    .review-date { font-size: 0.85rem; color: #94a3b8; }

    .comment-text {
      font-size: 1.05rem;
      line-height: 1.6;
      color: #334155;
      margin: 0;
    }

    .admin-reply-box {
      margin-top: 24px;
      padding: 16px 20px;
      background: #f8fafc;
      border-radius: 12px;
      border-left: 4px solid #3b82f6;
    }
    .reply-header { display: flex; align-items: center; gap: 8px; margin-bottom: 8px; color: #3b82f6; }
    .reply-text { margin: 0; color: #475569; line-height: 1.6; }

    .card-footer { margin-top: 24px; display: flex; justify-content: flex-end; }

    .empty-state {
      text-align: center;
      padding: 80px 20px;
      background: #fff;
      border-radius: 16px;
    }
    .empty-icon { font-size: 4rem; color: #cbd5e1; margin-bottom: 16px; }

    .reply-modal { padding: 8px; }
    .modal-title { margin: 0 0 8px 0; font-weight: 800; color: #1e293b; }
    .modal-desc { margin: 0 0 24px 0; color: #64748b; }
    .reply-input { margin-bottom: 24px; }
    .modal-actions { display: flex; justify-content: flex-end; gap: 12px; }
  `],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ReviewsComponent {
  private readonly api = inject(ApiService);
  private readonly dialogs = inject(TuiDialogService);
  private readonly router = inject(Router);
  
  readonly reviews = signal<ProductReview[]>([]);
  readonly isAdmin = computed(() => this.router.url.startsWith('/reviews'));

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
