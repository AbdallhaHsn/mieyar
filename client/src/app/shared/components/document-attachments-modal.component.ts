import { Component, Input, Output, EventEmitter, OnInit, OnChanges, SimpleChanges, signal, inject } from '@angular/core';
import { CommonModule, DecimalPipe, DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { LanguageService } from '../../core/services/language.service';
import Swal from 'sweetalert2';

export interface DocumentAttachmentDto {
  id: string;
  entityType: string;
  entityId: string;
  fileName: string;
  contentType: string;
  fileSize: number;
  description?: string;
  uploadedAt: string;
}

@Component({
  selector: 'app-document-attachments-modal',
  standalone: true,
  imports: [CommonModule, FormsModule, DecimalPipe, DatePipe],
  template: `
    <div class="modal-backdrop" *ngIf="isOpen" (click)="onClose()">
      <div class="modal-box" (click)="$event.stopPropagation()" [attr.dir]="langService.currentLang() === 'ar' ? 'rtl' : 'ltr'">
        
        <!-- Modal Header -->
        <div class="modal-header">
          <div class="title-cluster">
            <div class="icon-orb">
              <i class="pi pi-paperclip"></i>
            </div>
            <div>
              <h3>{{ langService.currentLang() === 'ar' ? 'المستندات والمرفقات المؤيدة' : 'Supporting Documents & Attachments' }}</h3>
              <p class="subtitle">
                {{ langService.currentLang() === 'ar' ? 'المرجع:' : 'Reference:' }} 
                <strong>{{ entityTitle || entityNumber || entityId }}</strong>
                ({{ entityType }})
              </p>
            </div>
          </div>
          <button class="close-btn" (click)="onClose()">&times;</button>
        </div>

        <!-- Modal Body -->
        <div class="modal-body">
          
          <!-- Upload Form Strip -->
          <div class="upload-strip">
            <input type="file" #fileInput (change)="onFileSelected($event)" style="display:none" />
            
            <div class="upload-controls">
              <input 
                type="text" 
                [(ngModel)]="uploadDescription" 
                [placeholder]="langService.currentLang() === 'ar' ? 'وصف المستند (مثال: صورة الفاتورة الضريبية، العقد...)' : 'Document description...'" 
                class="form-control desc-input" />
              
              <button class="btn-select-file" (click)="fileInput.click()" [disabled]="isUploading()">
                <i class="pi pi-file-arrow-up"></i>
                <span>{{ selectedFile ? selectedFile.name : (langService.currentLang() === 'ar' ? 'اختر ملفاً' : 'Choose File') }}</span>
              </button>

              <button class="btn-upload" (click)="uploadFile()" [disabled]="!selectedFile || isUploading()">
                <i class="pi pi-upload" [class.pi-spin]="isUploading()"></i>
                <span>{{ isUploading() ? (langService.currentLang() === 'ar' ? 'جارٍ الرفع...' : 'Uploading...') : (langService.currentLang() === 'ar' ? 'رفع المستند' : 'Upload') }}</span>
              </button>
            </div>
            <small class="upload-hint">{{ langService.currentLang() === 'ar' ? 'الصيغ المدعومة: PDF, JPG, PNG, Excel (بحد أقصى 20 ميجابايت)' : 'Supported: PDF, JPG, PNG, Excel (Max 20MB)' }}</small>
          </div>

          <!-- Attachments List Table -->
          <div class="attachments-list">
            <div *ngIf="isLoading()" class="loading-state">
              <i class="pi pi-spin pi-spinner text-emerald text-2xl"></i>
              <span>{{ langService.currentLang() === 'ar' ? 'جارٍ تحميل المرفقات...' : 'Loading attachments...' }}</span>
            </div>

            <div *ngIf="!isLoading() && attachments().length === 0" class="empty-state">
              <i class="pi pi-folder-open"></i>
              <p>{{ langService.currentLang() === 'ar' ? 'لا توجد مستندات مرفقة مع هذه الحركة حتى الآن' : 'No attachments found for this transaction' }}</p>
            </div>

            <table *ngIf="!isLoading() && attachments().length > 0" class="docs-table">
              <thead>
                <tr>
                  <th>{{ langService.currentLang() === 'ar' ? 'اسم الملف' : 'File Name' }}</th>
                  <th>{{ langService.currentLang() === 'ar' ? 'الوصف' : 'Description' }}</th>
                  <th>{{ langService.currentLang() === 'ar' ? 'الحجم' : 'Size' }}</th>
                  <th>{{ langService.currentLang() === 'ar' ? 'تاريخ الرفع' : 'Uploaded At' }}</th>
                  <th class="text-center">{{ langService.currentLang() === 'ar' ? 'إجراءات' : 'Actions' }}</th>
                </tr>
              </thead>
              <tbody>
                <tr *ngFor="let doc of attachments()">
                  <td>
                    <div class="file-name-cell">
                      <i class="pi" [ngClass]="getFileIcon(doc.contentType)"></i>
                      <strong>{{ doc.fileName }}</strong>
                    </div>
                  </td>
                  <td>{{ doc.description || '—' }}</td>
                  <td>{{ (doc.fileSize / 1024) | number:'1.1-1' }} KB</td>
                  <td>{{ doc.uploadedAt | date:'yyyy-MM-dd HH:mm' }}</td>
                  <td class="text-center actions-cell">
                    <button class="btn-icon download" (click)="downloadDoc(doc)" [title]="langService.currentLang() === 'ar' ? 'تنزيل الملف' : 'Download'">
                      <i class="pi pi-download"></i>
                    </button>
                    <button class="btn-icon delete" (click)="deleteDoc(doc)" [title]="langService.currentLang() === 'ar' ? 'حذف الملف' : 'Delete'">
                      <i class="pi pi-trash"></i>
                    </button>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

        </div>

        <!-- Modal Footer -->
        <div class="modal-footer">
          <button class="btn-close" (click)="onClose()">
            {{ langService.currentLang() === 'ar' ? 'إغلاق النافذة' : 'Close' }}
          </button>
        </div>

      </div>
    </div>
  `,
  styles: [`
    .modal-backdrop {
      position: fixed;
      inset: 0;
      background: rgba(15, 23, 42, 0.5);
      backdrop-filter: blur(4px);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 1100;
      padding: 1rem;
      font-family: var(--font-arabic) !important;
    }

    .modal-box {
      background: #FFFFFF;
      border-radius: 16px;
      width: 100%;
      max-width: 680px;
      max-height: 90vh;
      display: flex;
      flex-direction: column;
      box-shadow: 0 20px 35px -10px rgba(15, 23, 42, 0.2);
      overflow: hidden;
      border: 1px solid #E2E8F0;
    }

    .modal-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 1.15rem 1.5rem;
      background: #F8FAFC;
      border-bottom: 1px solid #E2E8F0;
    }

    .title-cluster {
      display: flex;
      align-items: center;
      gap: 0.85rem;
    }

    .icon-orb {
      width: 40px;
      height: 40px;
      border-radius: 10px;
      background: #ECFDF5;
      color: #059669;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 1.15rem;
    }

    .modal-header h3 {
      font-size: 1.05rem;
      font-weight: 800;
      color: #0F172A;
      margin: 0;
    }

    .subtitle {
      font-size: 0.78rem;
      color: #64748B;
      margin: 0.15rem 0 0 0;
    }

    .close-btn {
      background: transparent;
      border: none;
      font-size: 1.6rem;
      color: #64748B;
      cursor: pointer;
    }

    .modal-body {
      padding: 1.25rem 1.5rem;
      overflow-y: auto;
      display: flex;
      flex-direction: column;
      gap: 1.25rem;
    }

    .upload-strip {
      background: #F8FAFC;
      border: 1.5px dashed #CBD5E1;
      border-radius: 12px;
      padding: 1rem;
      display: flex;
      flex-direction: column;
      gap: 0.6rem;
    }

    .upload-controls {
      display: flex;
      gap: 0.65rem;
      flex-wrap: wrap;
    }

    .desc-input {
      flex: 1;
      min-width: 200px;
      border: 1px solid #CBD5E1;
      border-radius: 8px;
      padding: 0.45rem 0.75rem;
      font-size: 0.82rem;
      outline: none;
    }

    .btn-select-file {
      background: #FFFFFF;
      border: 1px solid #CBD5E1;
      border-radius: 8px;
      padding: 0.45rem 0.85rem;
      font-size: 0.8rem;
      font-weight: 600;
      color: #475569;
      cursor: pointer;
      display: flex;
      align-items: center;
      gap: 0.4rem;
      max-width: 180px;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .btn-upload {
      background: linear-gradient(135deg, #059669 0%, #10B981 100%);
      color: #FFFFFF;
      border: none;
      border-radius: 8px;
      padding: 0.45rem 1.15rem;
      font-size: 0.82rem;
      font-weight: 750;
      cursor: pointer;
      display: flex;
      align-items: center;
      gap: 0.4rem;

      &:disabled {
        opacity: 0.5;
        cursor: not-allowed;
      }
    }

    .upload-hint {
      font-size: 0.72rem;
      color: #94A3B8;
    }

    /* Table */
    .docs-table {
      width: 100%;
      border-collapse: collapse;
      text-align: start;

      th {
        background: #F8FAFC;
        padding: 0.65rem 0.85rem;
        font-size: 0.75rem;
        font-weight: 750;
        color: #475569;
        border-bottom: 1px solid #E2E8F0;
      }

      td {
        padding: 0.65rem 0.85rem;
        font-size: 0.8rem;
        color: #334155;
        border-bottom: 1px solid #F1F5F9;
      }
    }

    .file-name-cell {
      display: flex;
      align-items: center;
      gap: 0.5rem;

      i { color: #059669; font-size: 1.1rem; }
      strong { color: #0F172A; }
    }

    .actions-cell {
      display: flex;
      gap: 0.4rem;
      justify-content: center;
    }

    .btn-icon {
      width: 28px;
      height: 28px;
      border-radius: 6px;
      border: 1px solid #E2E8F0;
      background: #FFFFFF;
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      transition: all 0.15s ease;

      &.download { color: #0284C7; &:hover { background: #E0F2FE; } }
      &.delete { color: #E11D48; &:hover { background: #FFE4E6; } }
    }

    .empty-state {
      text-align: center;
      padding: 2rem 1rem;
      color: #94A3B8;

      i { font-size: 2.2rem; margin-bottom: 0.4rem; }
      p { font-size: 0.84rem; margin: 0; }
    }

    .loading-state {
      text-align: center;
      padding: 2rem;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 0.5rem;
      color: #64748B;
    }

    .modal-footer {
      padding: 0.85rem 1.5rem;
      background: #F8FAFC;
      border-top: 1px solid #E2E8F0;
      display: flex;
      justify-content: flex-end;
    }

    .btn-close {
      background: #FFFFFF;
      border: 1px solid #CBD5E1;
      border-radius: 8px;
      padding: 0.45rem 1.15rem;
      font-size: 0.82rem;
      font-weight: 600;
      color: #475569;
      cursor: pointer;
    }
  `]
})
export class DocumentAttachmentsModalComponent implements OnInit, OnChanges {
  @Input() isOpen: boolean = true;
  @Input() entityType: string = 'JournalEntry';
  @Input() entityId!: string;
  @Input() entityNumber?: string;
  @Input() entityTitle?: string;
  @Output() close = new EventEmitter<void>();
  @Output() closed = new EventEmitter<void>();

  onClose() {
    this.close.emit();
    this.closed.emit();
  }

  private http = inject(HttpClient);
  langService = inject(LanguageService);

  attachments = signal<DocumentAttachmentDto[]>([]);
  isLoading = signal<boolean>(false);
  isUploading = signal<boolean>(false);

  selectedFile: File | null = null;
  uploadDescription: string = '';

  ngOnInit() {
    this.loadAttachments();
  }

  ngOnChanges(changes: SimpleChanges) {
    if ((changes['isOpen'] && this.isOpen) || (changes['entityId'] && this.entityId)) {
      this.loadAttachments();
    }
  }

  loadAttachments() {
    if (!this.entityType || !this.entityId) return;
    this.isLoading.set(true);
    this.http.get<DocumentAttachmentDto[]>(`/api/documents/${this.entityType}/${this.entityId}`).subscribe({
      next: (res) => {
        this.attachments.set(res || []);
        this.isLoading.set(false);
      },
      error: () => this.isLoading.set(false)
    });
  }

  onFileSelected(event: any) {
    const file = event.target.files?.[0];
    if (file) {
      this.selectedFile = file;
      if (!this.uploadDescription) {
        this.uploadDescription = file.name;
      }
    }
  }

  uploadFile() {
    if (!this.selectedFile) return;

    this.isUploading.set(true);
    const formData = new FormData();
    formData.append('file', this.selectedFile);
    formData.append('entityType', this.entityType);
    formData.append('entityId', this.entityId);
    if (this.uploadDescription) {
      formData.append('description', this.uploadDescription);
    }

    this.http.post('/api/documents/upload', formData).subscribe({
      next: () => {
        this.isUploading.set(false);
        this.selectedFile = null;
        this.uploadDescription = '';
        Swal.fire({ icon: 'success', title: 'تم الرفع', text: 'تم إرفاق المستند بنجاح.', timer: 1500, showConfirmButton: false });
        this.loadAttachments();
      },
      error: (err) => {
        this.isUploading.set(false);
        Swal.fire({ icon: 'error', title: 'خطأ في الرفع', text: err?.error?.description || 'فشل رفع المستند' });
      }
    });
  }

  downloadDoc(doc: DocumentAttachmentDto) {
    window.open(`/api/documents/${doc.id}/download`, '_blank');
  }

  deleteDoc(doc: DocumentAttachmentDto) {
    Swal.fire({
      title: 'حذف المستند المرفق؟',
      text: doc.fileName,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'تأكيد الحذف',
      cancelButtonText: 'إلغاء'
    }).then(result => {
      if (result.isConfirmed) {
        this.http.delete(`/api/documents/${doc.id}`).subscribe({
          next: () => {
            Swal.fire({ icon: 'success', title: 'تم الحذف', text: 'تم حذف المستند بنجاح.', timer: 1500, showConfirmButton: false });
            this.loadAttachments();
          },
          error: (err) => Swal.fire({ icon: 'error', title: 'خطأ', text: err?.error?.description || 'فشل حذف المستند' })
        });
      }
    });
  }

  getFileIcon(contentType: string): string {
    if (contentType.includes('pdf')) return 'pi-file-pdf';
    if (contentType.includes('image')) return 'pi-image';
    if (contentType.includes('excel') || contentType.includes('spreadsheet')) return 'pi-file-excel';
    return 'pi-file';
  }
}
