import { CommonModule, DOCUMENT } from '@angular/common';
import { AfterViewInit, Component, ElementRef, EventEmitter, HostListener, Input, OnChanges, OnDestroy, OnInit, Output, ViewChild, inject } from '@angular/core';
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
export class CaseDocumentViewerComponent implements OnInit, OnChanges, AfterViewInit, OnDestroy {
    private readonly blobDownloadService = inject(BlobDownloadService);
    private subscription?: Subscription;

    @Input({ required: true }) document!: CaseDocument;
    /**
     * CSS length kept free at the right of the viewport (e.g. an open side drawer): the viewer
     * occupies the rest so the drawer stays visible. Ignored on narrow screens (full screen).
     */
    @Input() dockRight: string | null = null;
    @Output() closed = new EventEmitter<void>();

    @ViewChild('closeButton') private closeButton?: ElementRef<HTMLButtonElement>;
    private readonly page = inject(DOCUMENT);
    private opener: HTMLElement | null = null;

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

    ngOnInit(): void {
        this.opener = this.page.activeElement instanceof HTMLElement ? this.page.activeElement : null;
    }

    /** Focus moves into the viewer and returns to the opener (e.g. the drawer's eye button) on close. */
    ngAfterViewInit(): void {
        this.closeButton?.nativeElement.focus();
    }

    ngOnDestroy(): void {
        this.subscription?.unsubscribe();
        if (this.opener?.isConnected) {
            this.opener.focus();
        }
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
