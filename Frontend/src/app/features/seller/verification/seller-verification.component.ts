// src/app/features/seller/verification/seller-verification.component.ts
// FIX: Removed @let syntax — that's Angular 18+. This project is Angular 17.
// The @let block was:
//   @let uploaded = getUploadedDoc(docType.value);
// Replaced with a direct method call inline in the template expressions.
// Everything else is identical to the Phase 2 version.

import { Component, inject, signal, OnInit, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { SellerVerificationService } from '../../../core/services/seller-verification.service';
import {
  SellerVerificationStatus,
  VerificationDocument,
  SellerProfileForm
} from '../../../core/models/ecommerce.models';

const DOC_TYPES = [
  { value: 'CnicFront',            label: 'CNIC Front',            required: true,  icon: '🪪' },
  { value: 'CnicBack',             label: 'CNIC Back',             required: true,  icon: '🪪' },
  { value: 'BusinessRegistration', label: 'Business Registration', required: false, icon: '📄' },
  { value: 'TaxCertificate',       label: 'Tax Certificate',       required: false, icon: '📋' },
  { value: 'BankStatement',        label: 'Bank Statement',        required: false, icon: '🏦' },
];

@Component({
  selector: 'app-seller-verification',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  template: `
    <div class="verification-page">

      <div class="page-header">
        <div>
          <h1 class="page-title">Seller Verification</h1>
          <p class="page-sub">Complete your verification to start listing products</p>
        </div>
        @if (auth.isSellerApproved()) {
          <a routerLink="/products" class="btn-primary">+ Add Product</a>
        }
      </div>

      @if (loading()) {
        <div class="loading-state">Loading your verification status…</div>
      } @else if (error()) {
        <div class="alert-error">{{ error() }}</div>
      } @else if (verificationData()) {

        <!-- Status Banner -->
        <div class="status-banner" [class]="'status-' + verificationData()!.status">
          <span class="status-icon">{{ statusIcon() }}</span>
          <div class="status-content">
            <div class="status-title">{{ statusTitle() }}</div>
            <div class="status-desc">{{ statusDescription() }}</div>
          </div>
          @if (verificationData()!.submissionCount > 1) {
            <span class="submission-badge">Submission #{{ verificationData()!.submissionCount }}</span>
          }
        </div>

        @if (latestComment()) {
          <div class="admin-comment">
            <span class="comment-label">📝 Admin Note:</span>
            <span class="comment-text">{{ latestComment() }}</span>
          </div>
        }

        <!-- Documents section -->
        <div class="panel">
          <div class="panel-header">
            <span class="panel-title">Verification Documents</span>
            <span class="panel-hint">Max 5MB per file · JPEG, PNG, PDF accepted</span>
          </div>

          <div class="doc-grid">
            <!-- FIX: replaced @let with direct getUploadedDoc() calls in each expression -->
            @for (docType of docTypes; track docType.value) {
              <div class="doc-card" [class.doc-uploaded]="!!getUploadedDoc(docType.value)">
                <div class="doc-type-header">
                  <span class="doc-icon">{{ docType.icon }}</span>
                  <div>
                    <div class="doc-label">{{ docType.label }}</div>
                    @if (docType.required) {
                      <span class="doc-required">Required</span>
                    } @else {
                      <span class="doc-optional">Optional</span>
                    }
                  </div>
                </div>

                @if (getUploadedDoc(docType.value)) {
                  <div class="doc-uploaded-info">
                    <span class="doc-filename">{{ getUploadedDoc(docType.value)!.originalFileName }}</span>
                    <span class="doc-size">{{ formatBytes(getUploadedDoc(docType.value)!.fileSizeBytes) }}</span>
                    @if (isImage(getUploadedDoc(docType.value)!)) {
                      <a [href]="getUploadedDoc(docType.value)!.filePath" target="_blank" class="doc-preview-link">
                        Preview →
                      </a>
                    }
                  </div>
                  <div class="doc-status doc-ok">✓ Uploaded</div>
                } @else {
                  <div class="doc-empty">Not uploaded yet</div>
                }

                @if (canUpload()) {
                  <label class="btn-upload" [class.uploading]="uploadingFor() === docType.value">
                    @if (uploadingFor() === docType.value) {
                      Uploading…
                    } @else {
                      {{ getUploadedDoc(docType.value) ? '↑ Replace' : '↑ Upload' }}
                    }
                    <input type="file" accept=".jpg,.jpeg,.png,.pdf"
                      (change)="onFileSelected($event, docType.value)"
                      style="display:none" />
                  </label>
                }
              </div>
            }
          </div>

          @if (uploadError()) {
            <div class="alert-error" style="margin-top:12px">{{ uploadError() }}</div>
          }
          @if (uploadSuccess()) {
            <div class="alert-success" style="margin-top:12px">{{ uploadSuccess() }}</div>
          }
        </div>

        <!-- Re-submission form -->
        @if (canResubmit()) {
          <div class="panel">
            <div class="panel-header">
              <span class="panel-title">Update & Re-submit</span>
              <span class="panel-hint">Correct the issues noted above then re-submit</span>
            </div>
            <form (ngSubmit)="resubmit()">
              <div class="form-grid">
                <div class="field">
                  <label>Store Name</label>
                  <input class="form-input" [(ngModel)]="resubmitForm.storeName" name="storeName" />
                </div>
                <div class="field">
                  <label>Phone Number</label>
                  <input class="form-input" [(ngModel)]="resubmitForm.phoneNumber" name="phone" />
                </div>
                <div class="field">
                  <label>Address</label>
                  <input class="form-input" [(ngModel)]="resubmitForm.addressLine1" name="addr" />
                </div>
                <div class="field">
                  <label>City</label>
                  <input class="form-input" [(ngModel)]="resubmitForm.city" name="city" />
                </div>
                <div class="field">
                  <label>Bank Name</label>
                  <input class="form-input" [(ngModel)]="resubmitForm.bankName" name="bank" />
                </div>
                <div class="field">
                  <label>Account Number</label>
                  <input class="form-input" [(ngModel)]="resubmitForm.accountNumber" name="acct" />
                </div>
              </div>
              <div class="form-actions">
                <button type="submit" class="btn-primary" [disabled]="resubmitting()">
                  {{ resubmitting() ? 'Submitting…' : '↑ Re-submit for Review' }}
                </button>
              </div>
              @if (resubmitError())   { <div class="alert-error"   style="margin-top:12px">{{ resubmitError() }}</div> }
              @if (resubmitSuccess()) { <div class="alert-success" style="margin-top:12px">{{ resubmitSuccess() }}</div> }
            </form>
          </div>
        }

        <!-- History timeline -->
        @if (verificationData()!.history.length > 0) {
          <div class="panel">
            <div class="panel-header">
              <span class="panel-title">Verification History</span>
            </div>
            <div class="timeline">
              @for (entry of verificationData()!.history; track entry.changedAt) {
                <div class="timeline-entry">
                  <div class="timeline-dot" [class]="'dot-' + entry.toStatus"></div>
                  <div class="timeline-content">
                    <div class="timeline-status">
                      <span class="from-status">{{ entry.fromStatus }}</span>
                      <span class="arrow">→</span>
                      <span class="to-status" [class]="'chip-' + entry.toStatus">
                        {{ entry.toStatus }}
                      </span>
                    </div>
                    @if (entry.comment) {
                      <div class="timeline-comment">{{ entry.comment }}</div>
                    }
                    <div class="timeline-meta">
                      {{ entry.changedBy }} · {{ entry.changedAt | date:'mediumDate' }}
                    </div>
                  </div>
                </div>
              }
            </div>
          </div>
        }

      } @else {
        <div class="empty-state">
          <div class="empty-icon">📋</div>
          <div class="empty-title">No verification record found</div>
          <p class="empty-sub">Please contact support if you believe this is an error.</p>
        </div>
      }
    </div>
  `,
  styles: [`
    .verification-page { max-width: 860px; margin: 0 auto; padding: 24px; }
    .page-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 24px; }
    .page-title  { font-size: 24px; font-weight: 700; color: var(--text-primary, #e6edf3); margin: 0 0 4px; }
    .page-sub    { font-size: 14px; color: var(--text-secondary, #8b949e); margin: 0; }
    .loading-state { text-align: center; padding: 60px; color: #8b949e; }

    .status-banner { display: flex; align-items: center; gap: 16px; padding: 18px 20px; border-radius: 12px; margin-bottom: 16px; border: 1px solid transparent; }
    .status-PendingApproval, .status-Resubmitted { background: rgba(234,179,8,.08); border-color: rgba(234,179,8,.3); }
    .status-Approved      { background: rgba(34,197,94,.08);  border-color: rgba(34,197,94,.3); }
    .status-Rejected      { background: rgba(239,68,68,.08);  border-color: rgba(239,68,68,.3); }
    .status-InfoRequested { background: rgba(59,130,246,.08); border-color: rgba(59,130,246,.3); }
    .status-UnderReview   { background: rgba(168,85,247,.08); border-color: rgba(168,85,247,.3); }
    .status-icon  { font-size: 32px; flex-shrink: 0; }
    .status-title { font-size: 16px; font-weight: 700; color: #e6edf3; }
    .status-desc  { font-size: 13px; color: #8b949e; margin-top: 2px; }
    .submission-badge { margin-left: auto; font-size: 11px; padding: 3px 8px; background: rgba(255,255,255,.08); border-radius: 99px; color: #8b949e; white-space: nowrap; }

    .admin-comment { background: rgba(59,130,246,.08); border: 1px solid rgba(59,130,246,.2); border-radius: 8px; padding: 12px 16px; margin-bottom: 16px; font-size: 13px; color: #e6edf3; }
    .comment-label { font-weight: 600; margin-right: 8px; }

    .panel { background: var(--bg-secondary, #161b22); border: 1px solid var(--border, #21262d); border-radius: 12px; padding: 20px; margin-bottom: 20px; }
    .panel-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 16px; }
    .panel-title  { font-size: 15px; font-weight: 600; color: #e6edf3; }
    .panel-hint   { font-size: 12px; color: #64748b; }

    .doc-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 12px; }
    .doc-card { background: #0d1117; border: 1px solid #21262d; border-radius: 10px; padding: 14px; display: flex; flex-direction: column; gap: 10px; }
    .doc-card.doc-uploaded { border-color: rgba(34,197,94,.3); }
    .doc-type-header { display: flex; gap: 10px; align-items: flex-start; }
    .doc-icon  { font-size: 22px; flex-shrink: 0; }
    .doc-label { font-size: 13px; font-weight: 600; color: #e6edf3; }
    .doc-required { font-size: 10px; color: #ef4444; background: rgba(239,68,68,.12); padding: 1px 6px; border-radius: 4px; }
    .doc-optional { font-size: 10px; color: #64748b; }
    .doc-uploaded-info { font-size: 11px; color: #8b949e; }
    .doc-filename { display: block; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .doc-size  { display: block; margin-top: 2px; }
    .doc-preview-link { color: #60a5fa; text-decoration: none; font-size: 11px; }
    .doc-status.doc-ok { font-size: 12px; color: #22c55e; }
    .doc-empty { font-size: 12px; color: #64748b; }
    .btn-upload { display: block; text-align: center; padding: 7px; background: #21262d; border: 1px dashed #334155; border-radius: 7px; font-size: 12px; color: #8b949e; cursor: pointer; transition: all .15s; }
    .btn-upload:hover { border-color: #6366f1; color: #6366f1; }
    .btn-upload.uploading { opacity: .6; pointer-events: none; }

    .form-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; }
    .field { display: flex; flex-direction: column; gap: 5px; }
    .field label { font-size: 11px; font-weight: 600; color: #8b949e; text-transform: uppercase; }
    .form-input { background: #0d1117; border: 1px solid #21262d; color: #e6edf3; border-radius: 7px; padding: 9px 12px; font-size: 13px; outline: none; transition: border-color .15s; }
    .form-input:focus { border-color: #6366f1; }
    .form-actions { margin-top: 16px; display: flex; justify-content: flex-end; }

    .timeline { display: flex; flex-direction: column; }
    .timeline-entry { display: flex; gap: 14px; padding-bottom: 20px; position: relative; }
    .timeline-entry:not(:last-child)::before { content: ''; position: absolute; left: 7px; top: 16px; bottom: 0; width: 2px; background: #21262d; }
    .timeline-dot { width: 16px; height: 16px; border-radius: 50%; border: 2px solid #334155; background: #0d1117; flex-shrink: 0; margin-top: 2px; z-index: 1; }
    .dot-approved      { border-color: #22c55e; background: #22c55e; }
    .dot-rejected      { border-color: #ef4444; background: #ef4444; }
    .dot-inforequested { border-color: #3b82f6; background: #3b82f6; }
    .dot-resubmitted   { border-color: #f59e0b; background: #f59e0b; }
    .timeline-status { display: flex; align-items: center; gap: 6px; font-size: 13px; }
    .from-status { color: #64748b; }
    .arrow { color: #334155; }
    .to-status { padding: 1px 8px; border-radius: 99px; font-size: 11px; font-weight: 600; }
    .chip-approved      { background: rgba(34,197,94,.12); color: #22c55e; }
    .chip-rejected      { background: rgba(239,68,68,.12); color: #ef4444; }
    .chip-inforequested { background: rgba(59,130,246,.12); color: #60a5fa; }
    .chip-pendingapproval, .chip-resubmitted { background: rgba(234,179,8,.12); color: #eab308; }
    .timeline-comment { font-size: 12px; color: #8b949e; margin: 4px 0; padding: 6px 10px; background: rgba(255,255,255,.03); border-radius: 6px; border-left: 2px solid #334155; }
    .timeline-meta    { font-size: 11px; color: #64748b; margin-top: 2px; }

    .alert-error   { background: rgba(239,68,68,.1);  border: 1px solid rgba(239,68,68,.3);  color: #ef4444; border-radius: 7px; padding: 10px 14px; font-size: 13px; }
    .alert-success { background: rgba(34,197,94,.1);  border: 1px solid rgba(34,197,94,.3);  color: #22c55e; border-radius: 7px; padding: 10px 14px; font-size: 13px; }

    .btn-primary { padding: 10px 20px; background: #f05537; color: #fff; border: none; border-radius: 8px; font-size: 14px; font-weight: 600; cursor: pointer; text-decoration: none; display: inline-block; }
    .btn-primary:disabled { opacity: .5; cursor: not-allowed; }

    .empty-state { text-align: center; padding: 60px 20px; }
    .empty-icon  { font-size: 48px; margin-bottom: 12px; }
    .empty-title { font-size: 18px; font-weight: 600; color: #e6edf3; }
    .empty-sub   { font-size: 14px; color: #8b949e; margin-top: 6px; }

    @media (max-width: 600px) {
      .form-grid { grid-template-columns: 1fr; }
      .doc-grid  { grid-template-columns: 1fr 1fr; }
    }
  `]
})
export class SellerVerificationComponent implements OnInit {
  readonly auth = inject(AuthService);
  readonly svc  = inject(SellerVerificationService);

  readonly loading          = signal(true);
  readonly error            = signal<string | null>(null);
  readonly verificationData = signal<SellerVerificationStatus | null>(null);
  readonly uploadingFor     = signal<string | null>(null);
  readonly uploadError      = signal<string | null>(null);
  readonly uploadSuccess    = signal<string | null>(null);
  readonly resubmitting     = signal(false);
  readonly resubmitError    = signal<string | null>(null);
  readonly resubmitSuccess  = signal<string | null>(null);

  readonly docTypes = DOC_TYPES;
  resubmitForm: Partial<SellerProfileForm> = {};

  readonly canUpload   = computed(() => this.verificationData()?.status !== 'Approved');
  readonly canResubmit = computed(() => {
    const s = this.verificationData()?.status;
    return s === 'Rejected' || s === 'InfoRequested';
  });

  readonly statusIcon = computed(() => ({
    PendingApproval: '⏳', UnderReview: '🔍', Approved: '✅',
    Rejected: '❌', InfoRequested: 'ℹ️', Resubmitted: '🔄'
  }[this.verificationData()?.status ?? 'PendingApproval'] ?? '⏳'));

  readonly statusTitle = computed(() => ({
    PendingApproval: 'Pending Admin Approval',
    UnderReview:     'Under Review',
    Approved:        'Verification Approved',
    Rejected:        'Verification Rejected',
    InfoRequested:   'Additional Information Required',
    Resubmitted:     'Re-submitted — Awaiting Review'
  }[this.verificationData()?.status ?? 'PendingApproval'] ?? 'Pending'));

  readonly statusDescription = computed(() => ({
    PendingApproval: 'Your documents are in the queue. We typically review within 1–2 business days.',
    UnderReview:     'An admin is currently reviewing your documents.',
    Approved:        'Congratulations! You can now list products on DevHub.',
    Rejected:        'Your verification was not approved. See the admin note below and re-submit.',
    InfoRequested:   'Admin needs more information. Upload the required documents and re-submit.',
    Resubmitted:     'Your updated documents are under review. We will notify you shortly.'
  }[this.verificationData()?.status ?? 'PendingApproval'] ?? ''));

  readonly latestComment = computed(() =>
    [...(this.verificationData()?.history ?? [])]
      .reverse()
      .find(h => h.comment && (h.toStatus === 'Rejected' || h.toStatus === 'InfoRequested'))
      ?.comment ?? null
  );

  ngOnInit(): void {
    this.svc.getMyStatus().subscribe({
      next:  data => { this.verificationData.set(data); this.loading.set(false); },
      error: err  => { this.error.set(err?.error?.message ?? 'Could not load verification status.'); this.loading.set(false); }
    });
  }

  // FIX: This is now called directly in the template instead of @let
  getUploadedDoc(docType: string): VerificationDocument | undefined {
    return this.verificationData()?.documents.find(
      d => d.documentType === docType && d.status === 'Active'
    );
  }

  isImage(doc: VerificationDocument): boolean {
    return /\.(jpg|jpeg|png)$/i.test(doc.originalFileName);
  }

  formatBytes(bytes: number): string {
    if (bytes < 1024)        return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
  }

  onFileSelected(event: Event, docType: string): void {
    const input = event.target as HTMLInputElement;
    const file  = input.files?.[0];
    if (!file) return;

    this.uploadError.set(null);
    this.uploadSuccess.set(null);
    this.uploadingFor.set(docType);

    this.svc.uploadDocument(file, docType).subscribe({
      next: () => {
        this.uploadSuccess.set(`${DOC_TYPES.find(d => d.value === docType)?.label} uploaded successfully.`);
        this.uploadingFor.set(null);
        this._refreshStatus();
      },
      error: err => {
        this.uploadError.set(err?.error?.message ?? 'Upload failed. Please try again.');
        this.uploadingFor.set(null);
      }
    });

    input.value = '';
  }

  resubmit(): void {
    this.resubmitError.set(null);
    this.resubmitSuccess.set(null);
    this.resubmitting.set(true);

    this.svc.resubmit(this.resubmitForm).subscribe({
      next:  result => { this.resubmitSuccess.set(result.message); this.resubmitting.set(false); this._refreshStatus(); },
      error: err    => { this.resubmitError.set(err?.error?.message ?? 'Re-submission failed.'); this.resubmitting.set(false); }
    });
  }

  private _refreshStatus(): void {
    this.svc.getMyStatus().subscribe({ next: data => this.verificationData.set(data) });
  }
}