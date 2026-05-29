// src/app/features/shop/product-reviews/product-reviews.component.ts
// NEW FILE — embedded in product-detail page
// Usage: <app-product-reviews [productId]="product.id" [productName]="product.name" />

import { Component, inject, signal, Input, OnInit, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ReviewService, ReviewItem, RatingStats } from '../../../core/services/review.service';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-product-reviews',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="reviews-section">
      <h2 class="section-title">Ratings & Reviews</h2>

      <!-- Rating summary -->
      @if (stats()) {
        <div class="rating-summary">
          <div class="big-rating">
            <span class="big-num">{{ stats()!.averageRating | number:'1.1-1' }}</span>
            <div class="stars-row">{{ starsDisplay(stats()!.averageRating) }}</div>
            <div class="total-reviews">{{ stats()!.totalReviews }} reviews</div>
          </div>
          <div class="rating-bars">
            @for (star of [5,4,3,2,1]; track star) {
              <div class="bar-row">
                <span class="bar-label">{{ star }}★</span>
                <div class="bar-track">
                  <div class="bar-fill"
                    [style.width.%]="getBarWidth(star)">
                  </div>
                </div>
                <span class="bar-count">{{ stats()!.distribution[star] }}</span>
              </div>
            }
          </div>
        </div>
      }

      <!-- Write review (Buyers only, not already reviewed) -->
      @if (auth.isBuyer() && auth.isAuthenticated() && !hasReviewed()) {
        <div class="write-review-panel">
          <div class="wr-header">
            <span class="wr-title">Write a Review</span>
          </div>

          @if (submitError()) {
            <div class="alert-error">{{ submitError() }}</div>
          }
          @if (submitSuccess()) {
            <div class="alert-success">{{ submitSuccess() }}</div>
          }

          <form (ngSubmit)="submitReview()">
            <!-- Star picker -->
            <div class="star-picker">
              @for (s of [1,2,3,4,5]; track s) {
                <button type="button" class="star-btn"
                  [class.active]="newRating() >= s"
                  (click)="newRating.set(s)"
                  (mouseenter)="hoverRating.set(s)"
                  (mouseleave)="hoverRating.set(0)">
                  {{ (hoverRating() || newRating()) >= s ? '★' : '☆' }}
                </button>
              }
              <span class="star-label">{{ ratingLabel() }}</span>
            </div>

            <div class="field">
              <label>Review Title</label>
              <input class="form-input" [(ngModel)]="newTitle" name="title"
                placeholder="Summarise your experience" maxlength="200" required />
            </div>
            <div class="field">
              <label>Your Review</label>
              <textarea class="form-input" [(ngModel)]="newBody" name="body"
                rows="4" placeholder="What did you like or dislike?"
                maxlength="4000" required></textarea>
            </div>

            <div class="submit-row">
              <button type="submit" class="btn-submit"
                [disabled]="submitting() || newRating() === 0 || !newTitle.trim() || !newBody.trim()">
                {{ submitting() ? 'Submitting…' : 'Submit Review' }}
              </button>
            </div>
          </form>
        </div>
      }

      <!-- Review list -->
      @if (loading()) {
        <div class="reviews-loading">Loading reviews…</div>
      } @else if (reviews().length === 0) {
        <div class="no-reviews">
          <span>💬</span>
          <p>No reviews yet. Be the first to share your experience!</p>
        </div>
      } @else {
        <div class="review-list">
          @for (review of reviews(); track review.id) {
            <div class="review-card">
              <div class="review-header">
                <div class="reviewer-info">
                  <span class="reviewer-avatar">{{ review.buyerName[0].toUpperCase() }}</span>
                  <div>
                    <span class="reviewer-name">{{ review.buyerName }}</span>
                    @if (review.isVerifiedBuyer) {
                      <span class="verified-badge">✔ Verified Purchase</span>
                    }
                  </div>
                </div>
                <div class="review-meta">
                  <span class="review-stars">{{ starsDisplay(review.rating) }}</span>
                  <span class="review-date">{{ review.createdDate | date:'mediumDate' }}</span>
                </div>
              </div>

              <div class="review-title">{{ review.title }}</div>
              <div class="review-body">{{ review.body }}</div>

              <!-- Edit/delete own review -->
              @if (auth.userId() === review.buyerId) {
                <div class="review-actions-own">
                  @if (editingId() === review.id) {
                    <div class="edit-form">
                      <select class="form-input-sm"
                        [(ngModel)]="editRating"
                        [name]="'editRating-' + review.id">
                        @for (s of [5,4,3,2,1]; track s) {
                          <option [value]="s">{{ s }}★</option>
                        }
                      </select>
                      <input class="form-input" [(ngModel)]="editTitle"
                        [name]="'editTitle-' + review.id"
                        placeholder="Title" />
                      <textarea class="form-input" [(ngModel)]="editBody"
                        [name]="'editBody-' + review.id" rows="3"></textarea>
                      <div class="edit-btns">
                        <button class="btn-save" (click)="saveEdit(review)">Save</button>
                        <button class="btn-cancel" (click)="editingId.set(null)">Cancel</button>
                      </div>
                    </div>
                  } @else {
                    <button class="btn-text" (click)="startEdit(review)">Edit</button>
                    <button class="btn-text danger" (click)="deleteReview(review)">Delete</button>
                  }
                </div>
              }

              <!-- Seller reply -->
              @if (review.sellerReply) {
                <div class="seller-reply">
                  <div class="reply-header">🏪 Seller's Response</div>
                  <div class="reply-body">{{ review.sellerReply }}</div>
                  @if (review.sellerRepliedAt) {
                    <div class="reply-date">{{ review.sellerRepliedAt | date:'mediumDate' }}</div>
                  }
                </div>
              }

              <!-- Seller reply form (Seller only, no reply yet) -->
              @if (auth.isSeller() && !review.sellerReply) {
                <div class="reply-form">
                  @if (replyingId() === review.id) {
                    <textarea class="form-input" [(ngModel)]="replyText"
                      [name]="'reply-' + review.id"
                      rows="2" placeholder="Write your response…"></textarea>
                    <div class="edit-btns">
                      <button class="btn-save" (click)="submitReply(review)"
                        [disabled]="!replyText.trim()">Reply</button>
                      <button class="btn-cancel" (click)="replyingId.set(null)">Cancel</button>
                    </div>
                  } @else {
                    <button class="btn-text" (click)="startReply(review)">Reply to this review</button>
                  }
                </div>
              }
            </div>
          }
        </div>

        <!-- Pagination -->
        @if (totalPages() > 1) {
          <div class="pagination">
            <button class="page-btn" [disabled]="page() === 1"
              (click)="goPage(page() - 1)">← Prev</button>
            <span class="page-info">{{ page() }} / {{ totalPages() }}</span>
            <button class="page-btn" [disabled]="page() === totalPages()"
              (click)="goPage(page() + 1)">Next →</button>
          </div>
        }
      }
    </div>
  `,
  styles: [`
    .reviews-section { margin-top: 40px; padding-top: 32px; border-top: 1px solid var(--border, #21262d); }
    .section-title { font-size: 20px; font-weight: 700; color: var(--text-primary, #e6edf3); margin: 0 0 20px; }

    /* Rating summary */
    .rating-summary { display: flex; gap: 32px; margin-bottom: 28px; padding: 20px; background: var(--bg-secondary, #161b22); border: 1px solid var(--border, #21262d); border-radius: 12px; }
    .big-rating     { display: flex; flex-direction: column; align-items: center; gap: 4px; min-width: 90px; }
    .big-num        { font-size: 48px; font-weight: 800; color: var(--text-primary, #e6edf3); line-height: 1; }
    .stars-row      { font-size: 18px; color: #f59e0b; letter-spacing: 2px; }
    .total-reviews  { font-size: 12px; color: #8b949e; }
    .rating-bars    { flex: 1; display: flex; flex-direction: column; gap: 6px; justify-content: center; }
    .bar-row        { display: flex; align-items: center; gap: 8px; font-size: 12px; }
    .bar-label      { width: 20px; text-align: right; color: #8b949e; }
    .bar-track      { flex: 1; height: 8px; background: #21262d; border-radius: 4px; overflow: hidden; }
    .bar-fill       { height: 100%; background: #f59e0b; border-radius: 4px; transition: width .3s; }
    .bar-count      { width: 24px; color: #64748b; }

    /* Write review */
    .write-review-panel { background: var(--bg-secondary, #161b22); border: 1px solid var(--border, #21262d); border-radius: 12px; padding: 20px; margin-bottom: 24px; }
    .wr-header { margin-bottom: 16px; }
    .wr-title  { font-size: 15px; font-weight: 600; color: var(--text-primary, #e6edf3); }
    .star-picker { display: flex; align-items: center; gap: 4px; margin-bottom: 14px; }
    .star-btn { background: none; border: none; font-size: 28px; cursor: pointer; color: #f59e0b; padding: 0 2px; line-height: 1; transition: transform .1s; }
    .star-btn:hover { transform: scale(1.2); }
    .star-label { font-size: 13px; color: #8b949e; margin-left: 8px; }
    .field { margin-bottom: 12px; display: flex; flex-direction: column; gap: 4px; }
    .field label { font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: .5px; color: #8b949e; }
    .form-input { background: #0d1117; border: 1px solid #21262d; color: var(--text-primary, #e6edf3); border-radius: 7px; padding: 9px 12px; font-size: 13px; outline: none; resize: vertical; transition: border-color .15s; width: 100%; box-sizing: border-box; }
    .form-input:focus { border-color: #6366f1; }
    .form-input-sm { background: #0d1117; border: 1px solid #21262d; color: var(--text-primary, #e6edf3); border-radius: 6px; padding: 5px 8px; font-size: 12px; outline: none; }
    .submit-row { display: flex; justify-content: flex-end; margin-top: 4px; }
    .btn-submit { padding: 10px 20px; background: #f05537; color: #fff; border: none; border-radius: 8px; font-size: 13px; font-weight: 600; cursor: pointer; }
    .btn-submit:disabled { opacity: .5; cursor: not-allowed; }

    .alert-error   { background: rgba(239,68,68,.1); border: 1px solid rgba(239,68,68,.3); color: #ef4444; border-radius: 7px; padding: 9px 12px; font-size: 13px; margin-bottom: 12px; }
    .alert-success { background: rgba(34,197,94,.1);  border: 1px solid rgba(34,197,94,.3);  color: #22c55e; border-radius: 7px; padding: 9px 12px; font-size: 13px; margin-bottom: 12px; }

    /* Review list */
    .reviews-loading { padding: 32px; text-align: center; color: #8b949e; }
    .no-reviews { padding: 40px; text-align: center; color: #64748b; }
    .no-reviews span { font-size: 36px; display: block; margin-bottom: 8px; }
    .review-list { display: flex; flex-direction: column; gap: 16px; }
    .review-card { background: var(--bg-secondary, #161b22); border: 1px solid var(--border, #21262d); border-radius: 10px; padding: 16px; }
    .review-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 10px; }
    .reviewer-info { display: flex; align-items: center; gap: 10px; }
    .reviewer-avatar { width: 34px; height: 34px; border-radius: 50%; background: #6366f1; display: flex; align-items: center; justify-content: center; font-size: 14px; font-weight: 700; color: #fff; flex-shrink: 0; }
    .reviewer-name   { font-size: 13px; font-weight: 600; color: var(--text-primary, #e6edf3); display: block; }
    .verified-badge  { font-size: 11px; color: #22c55e; }
    .review-meta     { display: flex; flex-direction: column; align-items: flex-end; gap: 2px; }
    .review-stars    { font-size: 14px; color: #f59e0b; letter-spacing: 1px; }
    .review-date     { font-size: 11px; color: #64748b; }
    .review-title    { font-size: 14px; font-weight: 600; color: var(--text-primary, #e6edf3); margin-bottom: 6px; }
    .review-body     { font-size: 13px; color: #8b949e; line-height: 1.6; }
    .review-actions-own { margin-top: 10px; display: flex; gap: 10px; }
    .btn-text { background: none; border: none; font-size: 12px; color: #60a5fa; cursor: pointer; padding: 0; }
    .btn-text:hover { text-decoration: underline; }
    .btn-text.danger { color: #ef4444; }
    .edit-form { display: flex; flex-direction: column; gap: 8px; margin-top: 10px; }
    .edit-btns { display: flex; gap: 8px; }
    .btn-save   { padding: 6px 14px; background: #f05537; color: #fff; border: none; border-radius: 6px; font-size: 12px; cursor: pointer; }
    .btn-cancel { padding: 6px 14px; background: #21262d; color: #e6edf3; border: none; border-radius: 6px; font-size: 12px; cursor: pointer; }
    .btn-save:disabled { opacity: .5; cursor: not-allowed; }
    .seller-reply { background: rgba(99,102,241,.07); border: 1px solid rgba(99,102,241,.15); border-radius: 7px; padding: 10px 14px; margin-top: 12px; }
    .reply-header { font-size: 12px; font-weight: 600; color: #818cf8; margin-bottom: 4px; }
    .reply-body   { font-size: 13px; color: #8b949e; }
    .reply-date   { font-size: 11px; color: #64748b; margin-top: 4px; }
    .reply-form   { margin-top: 10px; display: flex; flex-direction: column; gap: 8px; }
    .pagination   { display: flex; align-items: center; justify-content: center; gap: 14px; margin-top: 20px; }
    .page-btn     { padding: 6px 14px; background: #21262d; border: 1px solid #30363d; border-radius: 7px; color: #e6edf3; font-size: 13px; cursor: pointer; }
    .page-btn:disabled { opacity: .4; cursor: not-allowed; }
    .page-info    { font-size: 13px; color: #64748b; }

    @media (max-width: 600px) {
      .rating-summary { flex-direction: column; gap: 16px; }
      .big-rating { flex-direction: row; align-items: center; gap: 12px; }
    }
  `]
})
export class ProductReviewsComponent implements OnInit {
  @Input() productId!:   number;
  @Input() productName!: string;

  readonly auth      = inject(AuthService);
  readonly reviewSvc = inject(ReviewService);

  readonly loading      = signal(true);
  readonly reviews      = signal<ReviewItem[]>([]);
  readonly stats        = signal<RatingStats | null>(null);
  readonly hasReviewed  = signal(false);
  readonly page         = signal(1);
  readonly totalPages   = signal(1);
  readonly submitting   = signal(false);
  readonly submitError  = signal<string | null>(null);
  readonly submitSuccess = signal<string | null>(null);
  readonly editingId    = signal<number | null>(null);
  readonly replyingId   = signal<number | null>(null);

  // New review form
  newRating   = signal(0);
  hoverRating = signal(0);
  newTitle    = '';
  newBody     = '';

  // Edit form
  editRating = 5;
  editTitle  = '';
  editBody   = '';

  // Reply form
  replyText = '';

  readonly ratingLabel = computed(() => {
    const r = this.hoverRating() || this.newRating();
    return ['', 'Poor', 'Fair', 'Good', 'Very Good', 'Excellent'][r] ?? '';
  });

  ngOnInit(): void {
    this._loadStats();
    this._loadReviews();
    // Check if the current buyer has already reviewed this product
    if (this.auth.isBuyer()) {
      this._checkHasReviewed();
    }
  }

  goPage(p: number): void { this.page.set(p); this._loadReviews(); }

  starsDisplay(rating: number): string {
    const full  = Math.floor(rating);
    const half  = rating - full >= 0.5 ? 1 : 0;
    const empty = 5 - full - half;
    return '★'.repeat(full) + (half ? '½' : '') + '☆'.repeat(empty);
  }

  getBarWidth(star: number): number {
    const s = this.stats();
    if (!s || s.totalReviews === 0) return 0;
    return Math.round(((s.distribution[star] ?? 0) / s.totalReviews) * 100);
  }

  submitReview(): void {
    if (this.newRating() === 0 || !this.newTitle.trim() || !this.newBody.trim()) return;
    this.submitError.set(null);
    this.submitSuccess.set(null);
    this.submitting.set(true);

    this.reviewSvc.createReview(this.productId, {
      rating: this.newRating(),
      title:  this.newTitle.trim(),
      body:   this.newBody.trim()
    }).subscribe({
      next: () => {
        this.submitSuccess.set('Thank you! Your review has been submitted.');
        this.hasReviewed.set(true);
        this.newRating.set(0);
        this.newTitle = '';
        this.newBody  = '';
        this.submitting.set(false);
        this._loadReviews();
        this._loadStats();
      },
      error: err => {
        this.submitError.set(err?.error?.message ?? 'Failed to submit review.');
        this.submitting.set(false);
      }
    });
  }

  startEdit(review: ReviewItem): void {
    this.editingId.set(review.id);
    this.editRating = review.rating;
    this.editTitle  = review.title;
    this.editBody   = review.body;
  }

  saveEdit(review: ReviewItem): void {
    this.reviewSvc.updateReview(this.productId, review.id, {
      rating: this.editRating,
      title:  this.editTitle.trim(),
      body:   this.editBody.trim()
    }).subscribe({
      next: () => {
        this.editingId.set(null);
        this._loadReviews();
        this._loadStats();
      },
      error: err => alert(err?.error?.message ?? 'Update failed')
    });
  }

  deleteReview(review: ReviewItem): void {
    if (!confirm('Delete your review?')) return;
    this.reviewSvc.deleteReview(this.productId, review.id).subscribe({
      next: () => {
        this.hasReviewed.set(false);
        this._loadReviews();
        this._loadStats();
      }
    });
  }

  startReply(review: ReviewItem): void {
    this.replyingId.set(review.id);
    this.replyText = '';
  }

  submitReply(review: ReviewItem): void {
    if (!this.replyText.trim()) return;
    this.reviewSvc.replyToReview(this.productId, review.id, this.replyText.trim()).subscribe({
      next: () => {
        this.replyingId.set(null);
        this._loadReviews();
      },
      error: err => alert(err?.error?.message ?? 'Reply failed')
    });
  }

  private _loadReviews(): void {
    this.loading.set(true);
    this.reviewSvc.getReviews(this.productId, this.page()).subscribe({
      next: data => {
        this.reviews.set(data.items);
        this.totalPages.set(data.totalPages);
        this.loading.set(false);
      },
      error: () => this.loading.set(false)
    });
  }

  private _loadStats(): void {
    this.reviewSvc.getRatingStats(this.productId).subscribe({
      next: s => this.stats.set(s)
    });
  }

  private _checkHasReviewed(): void {
    // Check the loaded reviews for the buyer's own entry
    this.reviewSvc.getReviews(this.productId, 1, 100).subscribe({
      next: data => {
        const uid = this.auth.userId();
        this.hasReviewed.set(data.items.some(r => r.buyerId === uid));
      }
    });
  }
}
