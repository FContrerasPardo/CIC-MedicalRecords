import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, OnChanges, OnInit, Output, SimpleChanges } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { TranslateModule } from '@ngx-translate/core';
import {
    DashboardLayoutDocumentInfo,
    DashboardLayoutService,
} from '../../services/dashboard-layout.service';
import type {
    DashboardLayoutDocumentRef,
    DashboardLayoutFolderListing,
} from '../../services/dashboard-layout-repository.service';

@Component({
    selector: 'medical-records-dashboard-builder-layout-source-panel',
    standalone: true,
    imports: [CommonModule, FormsModule, TranslateModule],
    templateUrl: './dashboard-builder-layout-source-panel.component.html',
    styleUrls: ['./dashboard-builder-layout-source-panel.component.scss'],
})
export class DashboardBuilderLayoutSourcePanelComponent implements OnInit, OnChanges {
    @Input() loading = false;
    @Input() activeDocument: DashboardLayoutDocumentInfo | null = null;

    @Output() applyDocument = new EventEmitter<string>();
    @Output() copyDocument = new EventEmitter<void>();
    @Output() refreshDocuments = new EventEmitter<void>();

    expanded = true;
    documents: DashboardLayoutDocumentRef[] = [];
    folderListing: DashboardLayoutFolderListing | null = null;
    selectedDocumentId = '';
    saveFileName = '';
    saveAsNew = false;
    listLoading = false;
    listError = false;

    constructor(private readonly layoutService: DashboardLayoutService) {}

    ngOnInit(): void {
        this.syncSaveFieldsFromService();
        void this.loadDocuments();
    }

    ngOnChanges(changes: SimpleChanges): void {
        if (changes['activeDocument']) {
            this.syncSaveFieldsFromService();
        }
    }

    toggleExpanded(): void {
        this.expanded = !this.expanded;
    }

    syncSaveFieldsFromService(): void {
        this.saveFileName = this.layoutService.getLayoutSaveFileName();
        this.saveAsNew = this.layoutService.getLayoutSaveAsNew();
    }

    onSaveFileNameChange(value: string): void {
        this.saveFileName = value;
        this.layoutService.setLayoutSaveFileName(value);
    }

    onSaveAsNewChange(value: boolean): void {
        this.saveAsNew = value;
        this.layoutService.setLayoutSaveAsNew(value);
    }

    onDocumentSelectionChange(): void {
        if (this.selectedDocumentId) {
            this.layoutService.setSaveTargetDocumentId(this.selectedDocumentId);
        }
        const selected = this.documents.find((doc) => doc.id === this.selectedDocumentId);
        if (selected?.title) {
            this.onSaveFileNameChange(selected.title);
            this.onSaveAsNewChange(false);
        }
    }

    applyLanguageSuffix(suffix: 'en' | 'es' | 'pt'): void {
        const base = this.stripLanguageSuffix(this.saveFileName);
        this.onSaveFileNameChange(`${base}-${suffix}`);
    }

    private stripLanguageSuffix(fileName: string): string {
        const trimmed = fileName.trim();
        const withoutExt = trimmed.replace(/\.layout\.json$/i, '').replace(/\.json$/i, '');
        return withoutExt.replace(/-(en|es|pt)$/i, '');
    }

    async loadDocuments(): Promise<void> {
        this.listLoading = true;
        this.listError = false;
        try {
            this.folderListing = await this.layoutService.getLayoutFolderListing();
            this.documents = this.folderListing.documents;
            const preferred =
                this.activeDocument?.id ??
                this.layoutService.getPreferredLayoutDocumentId() ??
                this.folderListing.latestDocument?.id ??
                '';
            this.selectedDocumentId = preferred;
            this.syncSaveFieldsFromService();
        } catch {
            this.listError = true;
            this.documents = [];
            this.folderListing = null;
        } finally {
            this.listLoading = false;
        }
    }

    onRefresh(): void {
        void this.loadDocuments();
        this.refreshDocuments.emit();
    }

    onApply(): void {
        if (!this.selectedDocumentId || this.loading) {
            return;
        }
        this.layoutService.setPreferredLayoutDocumentId(this.selectedDocumentId);
        this.layoutService.setSaveTargetDocumentId(this.selectedDocumentId);
        this.applyDocument.emit(this.selectedDocumentId);
    }

    onCopy(): void {
        if (!this.selectedDocumentId || !this.saveFileName.trim() || this.loading) {
            return;
        }
        this.copyDocument.emit();
    }

    get canCopyFile(): boolean {
        if (!this.selectedDocumentId || !this.saveFileName.trim()) {
            return false;
        }
        const selected = this.documents.find((doc) => doc.id === this.selectedDocumentId);
        if (!selected?.title) {
            return true;
        }
        const sourceName = this.normalizeComparableName(selected.title);
        const targetName = this.normalizeComparableName(this.saveFileName);
        return sourceName !== targetName;
    }

    private normalizeComparableName(fileName: string): string {
        const trimmed = fileName.trim().replace(/\.layout\.json$/i, '').replace(/\.json$/i, '');
        return trimmed.toLowerCase();
    }

    formatSavedAt(value?: string | null): string {
        if (!value?.trim()) {
            return '—';
        }
        const parsed = Date.parse(value);
        if (!Number.isFinite(parsed)) {
            return value;
        }
        return new Intl.DateTimeFormat(undefined, {
            dateStyle: 'medium',
            timeStyle: 'short',
        }).format(new Date(parsed));
    }
}
