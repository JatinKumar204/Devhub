// src/app/features/seller/reviews/seller-reviews.component.ts
// NEW FILE — Route: /seller/reviews  (Seller role only)

import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { ReviewService, ReviewItem } from '../../../core/services/review.service';

@Component({
  selector: 'app-seller-reviews',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  template: `
    <div class="reviews-page">
      <div class="page-header">
        <div>
          <h1 class="page-title">My Product Reviews</h1>
          <p class="page-sub">Reviews left by buyers on your products</p>
        </div>
        <button class="btn-refresh" (click)="load()" [disabled]="loading()">↻ Refresh</button>
      </div>

      <!-- Filter -->
      <div class="filter-tabs">
        <button class="tab" [class.active]="!pendingOnly()" (click)="setPendingOnly(false)">All Reviews</button>
        <button class="tab" [class.active]="pendingOnly()" (click)="setPendingOnly(true)">
          Needs Reply
          @if (pendingOnlyCount() > 0) {
            <span class="badge">{{ pendingOnlyCount() }}</span>
          }
        </button>
      </div>

      @if (loading()) {
        <div class="loading-state">Loading reviews…</div>
      } @else if (reviews().length === 0) {
        <div class="empty-state">
          <span>💬</span>
          <p>{{ pendingOnly() ? 'No reviews awaiting a reply' : 'No reviews yet on your products' }}</p>
        </div>
      } @else {
        <div class="review-list">
          @for (r of reviews(); track r.id) {
            <div class="review-card">
              <div class="review-header">
                <div class="left">
                  <span class="stars">{{ starsText(r.rating) }}</span>
                  <span class="buyer-name">{{ r.buyerName }}</span>
                  @if (r.isVerifiedBuyer) {
                    <span class="verified">✔ Verified Purchase</span>
                  }
                </div>
                <div class="right">
                  <span class="review-date">{{ r.createdDate | date:'mediumDate' }}</span>
                  @if (!r.sellerReply) {
                    <span class="needs-reply-tag">Needs Reply</span>
                  }
                </div>
              </div>

              <div class="review-title">{{ r.title }}</div>
              <div class="review-body">{{ r.body }}</div>

              <!-- Existing seller reply -->
              @if (r.sellerReply) {
                <div class="existing-reply">
                  <span class="reply-label">Your reply</span>
                  <div class="reply-text">{{ r.sellerReply }}</div>
                  <div class="reply-date">{{ r.sellerRepliedAt | date:'mediumDate' }}</div>
                </div>
              }

              <!-- Reply form -->
              @if (!r.sellerReply) {
                <div class="reply-section">
                  @if (replyingId() === r.id) {
                    <textarea class="reply-input"
                      [(ngModel)]="replyText"
                      [name]="'reply-' + r.id"
                      rows="3"
                      placeholder="Write a professional, helpful reply…">
                    </textarea>
                    <div class="reply-actions">
                      <button class="btn-submit-reply"
                        [disabled]="submittingReply() || !replyText.trim()"
                        (click)="submitReply(r)">
                        {{ submittingReply() ? 'Posting…' : 'Post Reply' }}
                      </button>
                      <button class="btn-cancel" (click)="replyingId.set(null)">Cancel</button>
                    </div>
                    @if (replyError()) {
                      <div class="alert-error">{{ replyError() }}</div>
                    }
                  } @else {
                    <button class="btn-reply" (click)="startReply(r)">
                      💬 Reply to this review
                    </button>
                  }
                </div>
              }
            </div>
          }
        </div>

        @if (totalPages() > 1) {
          <div class="pagination">
            <button [disabled]="page() === 1" (click)="goPage(page() - 1)">← Prev</button>
            <span>Page {{ page() }} of {{ totalPages() }}</span>
            <button [disabled]="page() === totalPages()" (click)="goPage(page() + 1)">Next →</button>
          </div>
        }
      }
    </div>
  `,
  styles: [`
    .reviews-page { max-width: 820px; margin: 0 auto; padding: 24px; }
    .page-header  { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 20px; }
    .page-title   { font-size: 24px; font-weight: 700; color: var(--text-primary, #e6edf3); margin: 0 0 4px; }
    .page-sub     { font-size: 14px; color: #8b949e; margin: 0; }
    .btn-refresh  { padding: 8px 14px; background: #21262d; border: 1px solid #30363d; border-radius: 7px; color: #e6edf3; font-size: 13px; cursor: pointer; }
    .filter-tabs  { display: flex; gap: 6px; margin-bottom: 20px; }
    .tab { padding: 6px 16px; background: #161b22; border: 1px solid #21262d; border-radius: 99px; color: #8b949e; font-size: 13px; cursor: pointer; display: flex; align-items: center; gap: 6px; }
    .tab.active   { border-color: #f05537; color: #f05537; background: rgba(240,85,55,.08); }
    .badge { background: #ef4444; color: #fff; border-radius: 99px; padding: 0 6px; font-size: 10px; font-weight: 700; }
    .loading-state { text-align: center; padding: 60px; color: #8b949e; }
    .empty-state   { text-align: center; padding: 60px; color: #64748b; }
    .empty-state span { font-size: 40px; display: block; margin-bottom: 10px; }
    .review-list  { display: flex; flex-direction: column; gap: 14px; }
    .review-card  { background: #161b22; border: 1px solid #21262d; border-radius: 10px; padding: 16px; }
    .review-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px; gap: 10px; flex-wrap: wrap; }
    .left  { display: flex; align-items: center; gap: 10px; }
    .right { display: flex; align-items: center; gap: 10px; flex-shrink: 0; }
    .stars { font-size: 15px; color: #f59e0b; letter-spacing: 1px; }
    .buyer-name   { font-size: 13px; font-weight: 600; color: #e6edf3; }
    .verified     { font-size: 11px; color: #22c55e; }
    .review-date  { font-size: 12px; color: #64748b; }
    .needs-reply-tag { font-size: 11px; padding: 2px 8px; background: rgba(245,158,11,.12); color: #f59e0b; border-radius: 99px; font-weight: 600; }
    .review-title { font-size: 14px; font-weight: 600; color: #e6edf3; margin-bottom: 6px; }
    .review-body  { font-size: 13px; color: #8b949e; line-height: 1.6; }
    .existing-reply { background: rgba(99,102,241,.07); border: 1px solid rgba(99,102,241,.15); border-radius: 7px; padding: 10px 14px; margin-top: 12px; }
    .reply-label  { font-size: 11px; font-weight: 700; color: #818cf8; text-transform: uppercase; letter-spacing: .5px; display: block; margin-bottom: 4px; }
    .reply-text   { font-size: 13px; color: #8b949e; }
    .reply-date   { font-size: 11px; color: #64748b; margin-top: 4px; }
    .reply-section { margin-top: 12px; }
    .btn-reply { background: none; border: 1px solid #21262d; border-radius: 7px; padding: 7px 14px; font-size: 12px; color: #60a5fa; cursor: pointer; transition: all .15s; }
    .btn-reply:hover { border-color: #60a5fa; background: rgba(96,165,250,.07); }
    .reply-input { width: 100%; background: #0d1117; border: 1px solid #21262d; color: #e6edf3; border-radius: 7px; padding: 9px 12px; font-size: 13px; outline: none; resize: vertical; box-sizing: border-box; }
    .reply-input:focus { border-color: #6366f1; }
    .reply-actions { display: flex; gap: 8px; margin-top: 8px; }
    .btn-submit-reply { padding: 8px 16px; background: #f05537; color: #fff; border: none; border-radius: 7px; font-size: 13px; font-weight: 600; cursor: pointer; }
    .btn-submit-reply:disabled { opacity: .5; cursor: not-allowed; }
    .btn-cancel   { padding: 8px 14px; background: #21262d; border: none; border-radius: 7px; color: #e6edf3; font-size: 13px; cursor: pointer; }
    .alert-error  { background: rgba(239,68,68,.1); border: 1px solid rgba(239,68,68,.3); color: #ef4444; border-radius: 7px; padding: 8px 12px; font-size: 12px; margin-top: 8px; }
    .pagination   { display: flex; align-items: center; justify-content: center; gap: 14px; margin-top: 20px; }
    .pagination button { padding: 6px 14px; background: #21262d; border: 1px solid #30363d; border-radius: 7px; color: #e6edf3; font-size: 13px; cursor: pointer; }
    .pagination button:disabled { opacity: .4; cursor: not-allowed; }
    .pagination span { font-size: 13px; color: #64748b; }
  `]
})
export class SellerReviewsComponent implements OnInit {
  private readonly _reviewSvc = inject(ReviewService);

  readonly loading        = signal(true);
  readonly reviews        = signal<ReviewItem[]>([]);
  readonly page           = signal(1);
  readonly totalPages     = signal(1);
  readonly pendingOnly    = signal(false);
  readonly pendingOnlyCount = signal(0);
  readonly replyingId     = signal<number | null>(null);
  readonly submittingReply = signal(false);
  readonly replyError     = signal<string | null>(null);

  replyText = '';

  ngOnInit(): void {
    this.load();
    // Get pending count for badge
    this._reviewSvc.getSellerReviews(1, 1, true).subscribe({
      next: data => this.pendingOnlyCount.set(data.total)
    });
  }

  setPendingOnly(val: boolean): void {
    this.pendingOnly.set(val);
    this.page.set(1);
    this.load();
  }

  goPage(p: number): void { this.page.set(p); this.load(); }

  load(): void {
    this.loading.set(true);
    this._reviewSvc.getSellerReviews(this.page(), 20, this.pendingOnly()).subscribe({
      next:  data => { this.reviews.set(data.items); this.totalPages.set(data.totalPages); this.loading.set(false); },
      error: ()   => this.loading.set(false)
    });
  }

  starsText(rating: number): string {
    return '★'.repeat(rating) + '☆'.repeat(5 - rating);
  }

  startReply(review: ReviewItem): void {
    this.replyingId.set(review.id);
    this.replyText = '';
    this.replyError.set(null);
  }

  submitReply(review: ReviewItem): void {
    if (!this.replyText.trim()) return;
    this.submittingReply.set(true);
    this.replyError.set(null);

    this._reviewSvc.replyToReview(review.productId, review.id, this.replyText.trim()).subscribe({
      next: () => {
        this.submittingReply.set(false);
        this.replyingId.set(null);
        this.load();
        // Update pending count
        this.pendingOnlyCount.update(c => Math.max(0, c - 1));
      },
      error: err => {
        this.replyError.set(err?.error?.message ?? 'Failed to post reply.');
        this.submittingReply.set(false);
      }
    });
  }
}
