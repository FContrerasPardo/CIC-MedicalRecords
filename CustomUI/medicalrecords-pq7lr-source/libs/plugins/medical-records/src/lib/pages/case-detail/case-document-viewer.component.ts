import { CommonModule } from '@angular/common';
import { Component, EventEmitter, HostListener, Input, OnChanges, OnDestroy, Output, inject } from '@angular/core';
import { PdfViewerComponent, ViewerComponent } from '@alfresco/adf-core';
import { BlobDownloadService } from '@alfresco/adf-hx-content-services/services';
import { TranslateModule } from '@ngx-translate/core';
import { Subscription } from 'rxjs';
import { take } from 'rxjs/operators';
import { CaseDocument } from './case-detail.model';

type ViewerError = 'NO_REF' | 'EMPTY' | 'LOAD' | 'PDF' | null;

/**
 * Inline document preview. Same mechanism as the intake widget: the repository file is
 * downloaded with BlobDownloadService (by the node id found in batchState) and rendered
 * with the ADF viewers. Read-only; nothing is written back.
 */
@Component({
    selector: 'medical-records-case-document-viewer',
    standalone: true,
    imports: [CommonModule, ViewerComponent, PdfViewerComponent, TranslateModule],
    templateUrl: './case-document-viewer.component.html',
    styleUrls: ['./case-document-viewer.component.scss'],
})
export class CaseDocumentViewerComponent implements OnChanges, OnDestroy {
    private readonly blobDownloadService = inject(BlobDownloadService);
    private subscription?: Subscription;

    @Input({ required: true }) document!: CaseDocument;
    @Output() closed = new EventEmitter<void>();

    loading = false;
    blob: Blob | null = null;
    error: ViewerError = null;

    get title(): string {
        return this.document.name ?? this.document.nameKey ?? '';
    }

    get isPdf(): boolean {
        return (this.document.mimeType ?? '').toLowerCase().includes('pdf');
    }

    ngOnChanges(): void {
        this.load();
    }

    ngOnDestroy(): void {
        this.subscription?.unsubscribe();
    }

    @HostListener('document:keydown.escape')
    close(): void {
        this.closed.emit();
    }

    onPdfError(): void {
        this.error = 'PDF';
    }

    private load(): void {
        this.subscription?.unsubscribe();
        this.blob = null;
        this.error = null;

        if (!this.document.nodeId) {
            this.loading = false;
            this.error = 'NO_REF';
            return;
        }

        this.loading = true;
        this.subscription = this.blobDownloadService
            .downloadBlob(this.document.nodeId)
            .pipe(take(1))
            .subscribe({
                next: (blob) => {
                    this.loading = false;
                    this.blob = blob?.size ? blob : null;
                    this.error = blob?.size ? null : 'EMPTY';
                },
                error: () => {
                    this.loading = false;
                    this.blob = null;
                    this.error = 'LOAD';
                },
            });
    }
}
