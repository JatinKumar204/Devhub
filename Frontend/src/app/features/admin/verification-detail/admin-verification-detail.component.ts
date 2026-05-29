// src/app/features/admin/verification-detail/admin-verification-detail.component.ts
// NEW FILE
// Route: /admin/verification/:id  (Admin role only)
//
// Full detail view for one seller verification:
//   - Seller info + store details
//   - Document preview (images inline, PDFs as download links)
//   - Full status history timeline
//   - Approve / Reject / Request Info action panel

import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { SellerVerificationService } from '../../../core/services/seller-verification.service';
import { VerificationQueueItem, VerificationDocument } from '../../../core/models/ecommerce.models';

@Component({
  selector: 'app-admin-verification-detail',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  template: `
    <div class="detail-page">

      <!-- Breadcrumb -->
      <div class="breadcrumb">
        <a routerLink="/admin/verification" class="breadcrumb-link">← Verification Queue</a>
      </div>

      @if (loading()) {
        <div class="loading-state">Loading verification details…</div>
      } @else if (error()) {
        <div class="alert-error">{{ error() }}</div>
      } @else if (item()) {

        <div class="detail-header">
          <div>
            <h1 class="page-title">{{ item()!.sellerName }}</h1>
            <p class="page-sub">{{ item()!.sellerEmail }} · Submission #{{ item()!.submissionCount }}</p>
          </div>
          <span class="status-chip large" [class]="'chip-' + item()!.status">
            {{ item()!.statusLabel }}
          </span>
        </div>

        <div class="detail-grid">

          <!-- Left column: seller info + documents -->
          <div class="detail-left">

            <!-- Store info panel -->
            <div class="panel">
              <div class="panel-title">Store Information</div>
              <div class="info-grid">
                <div class="info-row">
                  <span class="info-label">Store Name</span>
                  <span class="info-value">{{ item()!.storeName }}</span>
                </div>
                <div class="info-row">
                  <span class="info-label">Phone</span>
                  <span class="info-value">{{ item()!.phoneNumber }}</span>
                </div>
                <div class="info-row">
                  <span class="info-label">Location</span>
                  <span class="info-value">{{ item()!.city }}, {{ item()!.province }}</span>
                </div>
                <div class="info-row">
                  <span class="info-label">Submitted</span>
                  <span class="info-value">{{ item()!.submittedAt | date:'mediumDate' }}</span>
                </div>
                @if (item()!.lastResubmittedAt) {
                  <div class="info-row">
                    <span class="info-label">Last Resubmit</span>
                    <span class="info-value">{{ item()!.lastResubmittedAt | date:'mediumDate' }}</span>
                  </div>
                }
              </div>
            </div>

            <!-- Documents panel -->
            <div class="panel">
              <div class="panel-title">Uploaded Documents</div>

              @if (activeDocs().length === 0) {
                <div class="empty-docs">No documents uploaded yet</div>
              } @else {
                <div class="doc-list">
                  @for (doc of activeDocs(); track doc.id) {
                    <div class="doc-item">
                      <div class="doc-meta">
                        <span class="doc-type-badge">{{ formatDocType(doc.documentType) }}</span>
                        <span class="doc-filename">{{ doc.originalFileName }}</span>
                        <span class="doc-size">{{ formatBytes(doc.fileSizeBytes) }}</span>
                        <span class="doc-date">{{ doc.uploadedAt | date:'mediumDate' }}</span>
                      </div>

                      <!-- Image preview inline -->
                      @if (isImage(doc)) {
                        <div class="doc-preview">
                          <img [src]="doc.filePath" [alt]="doc.originalFileName"
                            class="doc-img" (click)="openPreview(doc.filePath)" />
                        </div>
                      } @else {
                        <!-- PDF download -->
                        <a [href]="doc.filePath" target="_blank" class="doc-download">
                          📄 View PDF
                        </a>
                      }

                      @if (doc.notes) {
                        <div class="doc-note">Note: {{ doc.notes }}</div>
                      }
                    </div>
                  }
                </div>
              }

              <!-- Superseded docs toggle -->
              @if (supersededDocs().length > 0) {
                <button class="btn-show-old" (click)="showSuperseded.set(!showSuperseded())">
                  {{ showSuperseded() ? 'Hide' : 'Show' }} {{ supersededDocs().length }} replaced document(s)
                </button>

                @if (showSuperseded()) {
                  <div class="doc-list superseded">
                    @for (doc of supersededDocs(); track doc.id) {
                      <div class="doc-item faded">
                        <div class="doc-meta">
                          <span class="doc-type-badge">{{ formatDocType(doc.documentType) }}</span>
                          <span class="doc-filename">{{ doc.originalFileName }}</span>
                          <span class="superseded-label">Superseded</span>
                        </div>
                      </div>
                    }
                  </div>
                }
              }
            </div>

            <!-- History timeline -->
            <div class="panel">
              <div class="panel-title">Status History</div>
              @if (item()!.history.length === 0) {
                <div class="empty-docs">No history yet</div>
              } @else {
                <div class="timeline">
                  @for (entry of item()!.history; track entry.changedAt) {
                    <div class="timeline-entry">
                      <div class="timeline-dot" [class]="'dot-' + entry.toStatus"></div>
                      <div class="timeline-content">
                        <div class="timeline-status">
                          <span class="t-from">{{ entry.fromStatus }}</span>
                          <span class="t-arrow">→</span>
                          <span class="t-to" [class]="'chip-' + entry.toStatus">{{ entry.toStatus }}</span>
                        </div>
                        @if (entry.comment) {
                          <div class="timeline-comment">{{ entry.comment }}</div>
                        }
                        <div class="timeline-meta">{{ entry.changedBy }} · {{ entry.changedAt | date:'medium' }}</div>
                      </div>
                    </div>
                  }
                </div>
              }
            </div>

          </div>

          <!-- Right column: action panel -->
          <div class="detail-right">
            <div class="action-panel">
              <div class="panel-title">Admin Decision</div>

              @if (actionSuccess()) {
                <div class="alert-success">{{ actionSuccess() }}</div>
              } @else if (actionError()) {
                <div class="alert-error">{{ actionError() }}</div>
              }

              @if (item()!.status === 'Approved') {
                <div class="already-decided approved">
                  ✅ This seller has already been approved.
                </div>
              } @else {

                <!-- Comment field (required for Reject/InfoRequest) -->
                <div class="field">
                  <label>
                    Comment
                    <span class="field-hint">Required for Reject and Info Request</span>
                  </label>
                  <textarea class="form-input" [(ngModel)]="comment" rows="4"
                    placeholder="Leave a note for the seller explaining your decision or what's needed…">
                  </textarea>
                </div>

                <!-- Action buttons -->
                <div class="action-buttons">
                  <button class="btn-action approve"
                    [disabled]="submitting()"
                    (click)="submitDecision('Approved')">
                    @if (submitting() && activeAction() === 'Approved') { Processing… }
                    @else { ✅ Approve }
                  </button>

                  <button class="btn-action info-req"
                    [disabled]="submitting() || !comment.trim()"
                    (click)="submitDecision('InfoRequested')">
                    @if (submitting() && activeAction() === 'InfoRequested') { Processing… }
                    @else { ℹ️ Request Info }
                  </button>

                  <button class="btn-action reject"
                    [disabled]="submitting() || !comment.trim()"
                    (click)="submitDecision('Rejected')">
                    @if (submitting() && activeAction() === 'Rejected') { Processing… }
                    @else { ❌ Reject }
                  </button>
                </div>

                <p class="action-note">
                  Approve: seller can immediately list products.<br>
                  Request Info: seller will be prompted to provide more documents.<br>
                  Reject: seller must re-submit verification from scratch.
                </p>
              }
            </div>
          </div>

        </div>

        <!-- Full-screen image preview overlay -->
        @if (previewUrl()) {
          <div class="preview-overlay" (click)="previewUrl.set(null)">
            <img [src]="previewUrl()!" class="preview-img" (click)="$event.stopPropagation()" />
            <button class="preview-close" (click)="previewUrl.set(null)">✕</button>
          </div>
        }

      }
    </div>
  `,
  styles: [`
    .detail-page { max-width: 1100px; margin: 0 auto; padding: 24px; }
    .breadcrumb { margin-bottom: 20px; }
    .breadcrumb-link { font-size: 13px; color: #60a5fa; text-decoration: none; }
    .breadcrumb-link:hover { color: #93c5fd; }

    .loading-state { text-align: center; padding: 60px; color: #8b949e; font-size: 14px; }
    .alert-error   { background: rgba(239,68,68,.1); border: 1px solid rgba(239,68,68,.3); color: #ef4444; border-radius: 8px; padding: 12px 16px; font-size: 13px; margin-bottom: 16px; }
    .alert-success { background: rgba(34,197,94,.1); border: 1px solid rgba(34,197,94,.3); color: #22c55e; border-radius: 8px; padding: 12px 16px; font-size: 13px; margin-bottom: 16px; }

    .detail-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 24px; }
    .page-title { font-size: 24px; font-weight: 700; color: #e6edf3; margin: 0 0 4px; }
    .page-sub   { font-size: 13px; color: #8b949e; margin: 0; }

    .status-chip { padding: 4px 12px; border-radius: 99px; font-size: 12px; font-weight: 600; }
    .status-chip.large { font-size: 14px; padding: 6px 16px; }
    .chip-pendingapproval  { background: rgba(234,179,8,.12);  color: #eab308; }
    .chip-resubmitted      { background: rgba(245,158,11,.12); color: #f59e0b; }
    .chip-underreview      { background: rgba(168,85,247,.12); color: #a855f7; }
    .chip-approved         { background: rgba(34,197,94,.12);  color: #22c55e; }
    .chip-rejected         { background: rgba(239,68,68,.12);  color: #ef4444; }
    .chip-inforequested    { background: rgba(59,130,246,.12); color: #60a5fa; }

    .detail-grid { display: grid; grid-template-columns: 1fr 340px; gap: 20px; align-items: start; }

    /* Panel */
    .panel { background: #161b22; border: 1px solid #21262d; border-radius: 12px; padding: 20px; margin-bottom: 16px; }
    .panel-title { font-size: 14px; font-weight: 600; color: #e6edf3; margin-bottom: 14px; }

    /* Info grid */
    .info-grid { display: flex; flex-direction: column; gap: 10px; }
    .info-row  { display: flex; gap: 12px; }
    .info-label { font-size: 12px; color: #64748b; width: 110px; flex-shrink: 0; }
    .info-value { font-size: 13px; color: #e6edf3; }

    /* Documents */
    .doc-list { display: flex; flex-direction: column; gap: 14px; }
    .doc-item { background: #0d1117; border: 1px solid #21262d; border-radius: 8px; padding: 12px; }
    .doc-item.faded { opacity: .5; }
    .doc-meta { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; margin-bottom: 8px; }
    .doc-type-badge { font-size: 11px; font-weight: 600; padding: 2px 8px; background: rgba(99,102,241,.15); color: #818cf8; border-radius: 4px; }
    .doc-filename { font-size: 12px; color: #8b949e; flex: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .doc-size  { font-size: 11px; color: #64748b; }
    .doc-date  { font-size: 11px; color: #64748b; }
    .doc-preview { margin-top: 8px; }
    .doc-img { max-width: 100%; max-height: 200px; border-radius: 6px; cursor: zoom-in; object-fit: contain; background: #000; }
    .doc-download { font-size: 13px; color: #60a5fa; text-decoration: none; }
    .doc-note { font-size: 11px; color: #64748b; margin-top: 6px; }
    .superseded-label { font-size: 10px; color: #64748b; background: #21262d; padding: 1px 6px; border-radius: 4px; }
    .empty-docs { font-size: 13px; color: #64748b; padding: 12px 0; }
    .btn-show-old { background: none; border: none; color: #60a5fa; font-size: 12px; cursor: pointer; margin-top: 10px; text-decoration: underline; }
    .doc-list.superseded { margin-top: 10px; }

    /* Timeline */
    .timeline { display: flex; flex-direction: column; }
    .timeline-entry { display: flex; gap: 12px; padding-bottom: 16px; position: relative; }
    .timeline-entry:not(:last-child)::before { content: ''; position: absolute; left: 7px; top: 16px; bottom: 0; width: 2px; background: #21262d; }
    .timeline-dot { width: 16px; height: 16px; border-radius: 50%; border: 2px solid #334155; background: #0d1117; flex-shrink: 0; margin-top: 2px; z-index: 1; }
    .dot-approved     { border-color: #22c55e; background: #22c55e; }
    .dot-rejected     { border-color: #ef4444; background: #ef4444; }
    .dot-inforequested { border-color: #3b82f6; background: #3b82f6; }
    .dot-resubmitted  { border-color: #f59e0b; background: #f59e0b; }
    .dot-underreview  { border-color: #a855f7; background: #a855f7; }
    .timeline-status { display: flex; align-items: center; gap: 6px; font-size: 12px; }
    .t-from  { color: #64748b; }
    .t-arrow { color: #334155; }
    .t-to    { padding: 1px 7px; border-radius: 99px; font-size: 11px; font-weight: 600; }
    .timeline-comment { font-size: 12px; color: #8b949e; margin: 4px 0; padding: 6px 10px; background: rgba(255,255,255,.03); border-radius: 5px; border-left: 2px solid #334155; }
    .timeline-meta    { font-size: 11px; color: #64748b; margin-top: 2px; }

    /* Action panel */
    .action-panel { background: #161b22; border: 1px solid #21262d; border-radius: 12px; padding: 20px; position: sticky; top: 24px; }
    .already-decided { font-size: 14px; padding: 14px; border-radius: 8px; text-align: center; }
    .already-decided.approved { background: rgba(34,197,94,.08); color: #22c55e; }
    .field { margin-bottom: 16px; display: flex; flex-direction: column; gap: 5px; }
    .field label { font-size: 11px; font-weight: 600; color: #8b949e; text-transform: uppercase; letter-spacing: .5px; display: flex; justify-content: space-between; align-items: center; }
    .field-hint { font-size: 10px; color: #64748b; text-transform: none; font-weight: 400; }
    .form-input { background: #0d1117; border: 1px solid #21262d; color: #e6edf3; border-radius: 7px; padding: 10px 12px; font-size: 13px; outline: none; width: 100%; box-sizing: border-box; resize: vertical; transition: border-color .15s; }
    .form-input:focus { border-color: #6366f1; }
    .action-buttons { display: flex; flex-direction: column; gap: 8px; }
    .btn-action { padding: 11px; border: none; border-radius: 8px; font-size: 14px; font-weight: 600; cursor: pointer; transition: opacity .15s; }
    .btn-action:disabled { opacity: .4; cursor: not-allowed; }
    .btn-action.approve  { background: #22c55e; color: #fff; }
    .btn-action.info-req { background: #3b82f6; color: #fff; }
    .btn-action.reject   { background: #ef4444; color: #fff; }
    .action-note { font-size: 11px; color: #64748b; margin-top: 12px; line-height: 1.6; }

    /* Image preview overlay */
    .preview-overlay { position: fixed; inset: 0; background: rgba(0,0,0,.85); z-index: 1000; display: flex; align-items: center; justify-content: center; }
    .preview-img { max-width: 90vw; max-height: 90vh; border-radius: 8px; object-fit: contain; }
    .preview-close { position: absolute; top: 20px; right: 24px; background: rgba(255,255,255,.1); border: none; color: #fff; font-size: 20px; width: 36px; height: 36px; border-radius: 50%; cursor: pointer; }

    @media (max-width: 800px) {
      .detail-grid { grid-template-columns: 1fr; }
      .action-panel { position: static; }
    }
  `]
})
export class AdminVerificationDetailComponent implements OnInit {
  private readonly _svc   = inject(SellerVerificationService);
  private readonly _route  = inject(ActivatedRoute);
  private readonly _router = inject(Router);

  readonly loading       = signal(true);
  readonly error         = signal<string | null>(null);
  readonly item          = signal<VerificationQueueItem | null>(null);
  readonly submitting    = signal(false);
  readonly activeAction  = signal<string | null>(null);
  readonly actionSuccess = signal<string | null>(null);
  readonly actionError   = signal<string | null>(null);
  readonly showSuperseded = signal(false);
  readonly previewUrl    = signal<string | null>(null);

  comment = '';

  readonly activeDocs = () =>
    (this.item()?.documents ?? []).filter(d => d.status === 'Active');

  readonly supersededDocs = () =>
    (this.item()?.documents ?? []).filter(d => d.status === 'Superseded');

  ngOnInit(): void {
    const id = Number(this._route.snapshot.paramMap.get('id'));
    this._svc.getById(id).subscribe({
      next:  data => { this.item.set(data); this.loading.set(false); },
      error: err  => { this.error.set(err?.error?.message ?? 'Could not load verification.'); this.loading.set(false); }
    });
  }

  submitDecision(decision: 'Approved' | 'Rejected' | 'InfoRequested'): void {
    if ((decision === 'Rejected' || decision === 'InfoRequested') && !this.comment.trim()) return;

    this.actionSuccess.set(null);
    this.actionError.set(null);
    this.submitting.set(true);
    this.activeAction.set(decision);

    const id = this.item()!.verificationId;
    this._svc.review(id, { decision, comment: this.comment.trim() || undefined }).subscribe({
      next: result => {
        this.actionSuccess.set(result.message ?? `Seller ${decision} successfully.`);
        this.submitting.set(false);
        this.activeAction.set(null);
        // Refresh the item so the UI reflects the new status
        this._svc.getById(id).subscribe(data => this.item.set(data));
      },
      error: err => {
        this.actionError.set(err?.error?.message ?? 'Action failed. Please try again.');
        this.submitting.set(false);
        this.activeAction.set(null);
      }
    });
  }

  openPreview(url: string): void { this.previewUrl.set(url); }

  isImage(doc: VerificationDocument): boolean {
    return /\.(jpg|jpeg|png|webp)$/i.test(doc.originalFileName);
  }

  formatDocType(type: string): string {
    return type.replace(/([A-Z])/g, ' $1').trim();
  }

  formatBytes(bytes: number): string {
    if (bytes < 1024)        return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
  }
}
