import { Component, ChangeDetectionStrategy, inject, signal, TemplateRef, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TranslocoModule } from '@jsverse/transloco';
import { TuiIcon, TuiButton, TuiDialogService } from '@taiga-ui/core';
import { TuiTextareaModule } from '@taiga-ui/legacy';
import { ApiService, ProductReview } from '../../services/api.service';
import { firstValueFrom } from 'rxjs';

@Component({
  standalone: true,
  imports: [CommonModule, FormsModule, TranslocoModule, TuiIcon, TuiButton, TuiTextareaModule],
  template: `
    <div class="page-container" *transloco="let t">
      <div class="page-header">
        <h1 class="tui-text_h3">{{ 'SIDEBAR.REVIEWS' | transloco }}</h1>
      </div>

      <ng-template #replyDialog let-observer>
        <div class="dialog-content">
          <h2 class="tui-text_h5" style="margin-bottom: 24px;">Reply to Review</h2>
          <tui-textarea [(ngModel)]="replyMessage" [expandable]="true">
            Enter your reply message...
          </tui-textarea>
          
          <div style="margin-top: 32px; display: flex; justify-content: flex-end; gap: 12px;">
            <button tuiButton type="button" size="m" appearance="flat" (click)="observer.complete()">Cancel</button>
            <button tuiButton type="button" size="m" (click)="observer.next(true); observer.complete()">Send Reply</button>
          </div>
        </div>
      </ng-template>
      
      <div class="review-list">
        <div *ngFor="let review of reviews()" class="review-card">
          <div class="header">
             <span class="user">User #{{ review.userId }}</span>
             <div class="rating">
                <tui-icon *ngFor="let s of [1,2,3,4,5]" 
                         [icon]="review.rating >= s ? '@tui.star' : '@tui.star-off'"
                         class="star-icon">
                </tui-icon>
             </div>
          </div>
          <p class="comment">{{ review.comment }}</p>
          <div class="reply" *ngIf="review.replyMessage">
             <strong>Shop Reply:</strong> {{ review.replyMessage }}
          </div>
          <div class="actions" *ngIf="!review.replyMessage">
             <button tuiButton type="button" size="s" appearance="secondary" (click)="showReplyDialog(review.id)">Quick Reply</button>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .page-container { padding: 32px; }
    .page-header { margin-bottom: 32px; }
    .review-list { display: flex; flex-direction: column; gap: 16px; }
    .review-card { padding: 24px; background: #fff; border-radius: 12px; border: 1px solid #eee; }
    .header { display: flex; justify-content: space-between; margin-bottom: 12px; }
    .rating { color: #ffc107; }
    .reply { margin-top: 16px; padding: 12px; background: #f9f9f9; border-left: 4px solid #3f51b5; font-size: 14px; }
    .actions { margin-top: 16px; }
  `],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ReviewsComponent {
  private readonly api = inject(ApiService);
  private readonly dialogs = inject(TuiDialogService);
  
  readonly reviews = signal<ProductReview[]>([]);

  @ViewChild('replyDialog') replyDialogTemplate!: TemplateRef<any>;
  replyMessage = '';
  currentReviewId: number | null = null;

  constructor() {
    this.refresh();
  }

  async refresh() {
    const data = await firstValueFrom(this.api.getReviews());
    this.reviews.set(data);
  }

  showReplyDialog(id: number) {
    this.currentReviewId = id;
    this.replyMessage = '';
    this.dialogs.open<boolean>(this.replyDialogTemplate, { size: 'm' }).subscribe({
      next: (res) => {
        if (res && this.currentReviewId) this.sendReply();
      }
    });
  }

  async sendReply() {
    if (!this.currentReviewId || !this.replyMessage) return;
    await firstValueFrom(this.api.replyToReview(this.currentReviewId, this.replyMessage));
    this.refresh();
  }
}
