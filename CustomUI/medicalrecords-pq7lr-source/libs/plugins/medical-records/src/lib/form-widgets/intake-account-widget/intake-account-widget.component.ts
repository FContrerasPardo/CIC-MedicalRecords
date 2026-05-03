import { CommonModule } from '@angular/common';
import { PdfViewerComponent, ViewerComponent, WidgetComponent } from '@alfresco/adf-core';
import { BlobDownloadService } from '@alfresco/adf-hx-content-services/services';
import { Component, inject } from '@angular/core';
import { take } from 'rxjs/operators';
import { BatchStateSource } from './batch-state.model';
import { createEmptyIntakeAccountViewModel, mapBatchStateToIntakeAccountViewModel } from './batch-state.mapper';
import {
    IntakeAccountDocumentItemViewModel,
    IntakeAccountServiceItemViewModel,
    IntakeAccountSummaryCardViewModel,
    IntakeServiceFilterKey,
    IntakeAccountViewModel
} from './intake-account-view.model';

type PendingUploadItem = {
    label: string;
    normalizedLabel: string;
    serviceCount: number;
};

@Component({
    templateUrl: './intake-account-widget.component.html',
    styleUrls: ['./intake-account-widget.component.scss'],
    selector: 'medical-records-intake-account-widget',
    standalone: true,
    imports: [CommonModule, ViewerComponent, PdfViewerComponent],
})
export class IntakeAccountWidgetComponent extends WidgetComponent {
    private readonly UPLOAD_FIELD_ID = 'supportDocumentUpload';
    private readonly UPLOAD_HIGHLIGHT_TIMEOUT_MS = 2000;
    private readonly blobDownloadService = inject(BlobDownloadService);

    private cachedPrimaryValue: unknown;
    private cachedFallbackValue: unknown;
    private cachedSelectedPatientKey: string | null = null;
    private selectedPatientKey: string | null = null;
    private cachedViewModel: IntakeAccountViewModel = createEmptyIntakeAccountViewModel('No fue posible leer batchState. Verifica que el formulario reciba un JSON valido.');
    private selectedDisplayNameByPatientKey = new Map<string, string>();
    private highlightedUploadElement: HTMLElement | null = null;
    private uploadHighlightTimeout: ReturnType<typeof setTimeout> | null = null;
    private highlightedUploadElementStyles: Record<string, string> | null = null;

    searchTerm = '';
    private activeFilterKey: IntakeServiceFilterKey | null = null;
    private activePendingDocumentFilter: string | null = null;
    private expandedServiceIds = new Set<string>();
    private expandedDocumentIds = new Set<string>();
    private selectedDocumentIdForViewer: string | null = null;
    private viewerPanel: 'preview' | 'metadata' = 'preview';
    private viewerMode: 'inline-modal' | null = null;
    private viewerBlobRequestId = 0;
    uploadFieldFound = false;
    uploadFieldHasValue = false;
    uploadFieldValuePreview: string | null = 'No value';
    uploadFieldError: string | null = null;
    uploadFieldHighlighted = false;
    uploadStatusMessage: string | null = null;
    viewerStatusMessage: string | null = null;
    viewerLoading = false;
    viewerPreviewRendering = false;
    selectedViewerBlob: Blob | null = null;

    get viewModel(): IntakeAccountViewModel {
        const primaryValue = this.field?.value;
        const fallbackValue = this.field?.form?.getFieldById('batchState')?.value;

        if (
            primaryValue === this.cachedPrimaryValue &&
            fallbackValue === this.cachedFallbackValue &&
            this.selectedPatientKey === this.cachedSelectedPatientKey
        ) {
            return this.cachedViewModel;
        }

        this.cachedPrimaryValue = primaryValue;
        this.cachedFallbackValue = fallbackValue;
        this.cachedSelectedPatientKey = this.selectedPatientKey;

        const batchState = this.resolveBatchState(primaryValue, fallbackValue);

        if (!batchState) {
            this.cachedViewModel = createEmptyIntakeAccountViewModel('No fue posible leer batchState. Verifica que el formulario reciba un JSON valido.');
            this.activeFilterKey = null;
            return this.cachedViewModel;
        }

        this.cachedViewModel = mapBatchStateToIntakeAccountViewModel(batchState, this.selectedPatientKey);
        this.selectedPatientKey = this.cachedViewModel.patientSelector.selectedKey;
        this.cachedSelectedPatientKey = this.selectedPatientKey;

        const currentFilter = this.activeFilterKey ?? this.cachedViewModel.activeFilter;
        if (!this.isFilterAvailable(currentFilter, this.cachedViewModel)) {
            this.activeFilterKey = this.cachedViewModel.activeFilter;
        }

        return this.cachedViewModel;
    }

    get formFieldId(): string {
        return this.field?.id ?? 'intake-account-widget';
    }

    get isReadOnly(): boolean {
        return Boolean(this.field?.readOnly);
    }

    get currentDisplayName(): string | null {
        const selectedKey = this.viewModel.patientSelector.selectedKey;
        if (!selectedKey) {
            return this.viewModel.header.patientName;
        }

        return this.selectedDisplayNameByPatientKey.get(selectedKey)
            || this.viewModel.patientResolution.canonicalName
            || this.viewModel.header.patientName;
    }

    get currentDisplayInitials(): string {
        return this.createInitials(this.currentDisplayName);
    }

    get aliasChoices(): string[] {
        return this.viewModel.patientResolution.aliases;
    }

    get selectedAliasChoice(): string | null {
        const selectedKey = this.viewModel.patientSelector.selectedKey;
        if (!selectedKey) {
            return null;
        }

        return this.selectedDisplayNameByPatientKey.get(selectedKey)
            || this.viewModel.patientResolution.canonicalName
            || this.aliasChoices[0]
            || null;
    }

    get patientResolutionMessage(): string | null {
        if (!this.viewModel.patientResolution.showAliasBanner) {
            return null;
        }

        const aliases = this.aliasChoices;
        const selectedAlias = this.selectedAliasChoice;

        if (!aliases.length) {
            return this.viewModel.patientResolution.message;
        }

        if (!selectedAlias) {
            return `Se unificaron variantes OCR del mismo paciente: ${aliases.join(' / ')}`;
        }

        return `Se unificaron variantes OCR del mismo paciente: ${aliases.join(' / ')}. Nombre visual actual: ${selectedAlias}.`;
    }

    get currentFilterKey(): IntakeServiceFilterKey {
        return this.activeFilterKey ?? this.viewModel.activeFilter;
    }

    get primarySummaryCards(): IntakeAccountSummaryCardViewModel[] {
        return this.viewModel.summaryCards.primary.filter((card) => card.visible);
    }

    get secondarySummaryCards(): IntakeAccountSummaryCardViewModel[] {
        return this.viewModel.summaryCards.secondary.filter((card) => card.visible);
    }

    get filterTabs(): Array<{ key: IntakeServiceFilterKey; label: string; count: string }> {
        return this.primarySummaryCards
            .filter((card) => Boolean(card.filterKey))
            .map((card) => ({
                key: card.filterKey as IntakeServiceFilterKey,
                label: card.label,
                count: card.value,
            }));
    }

    get filteredServices(): IntakeAccountServiceItemViewModel[] {
        const search = this.searchTerm.trim().toLowerCase();
        const pendingDocumentFilter = this.pendingUploadItems.some((item) => item.normalizedLabel === this.activePendingDocumentFilter)
            ? this.activePendingDocumentFilter
            : null;

        return this.viewModel.services.filter((service) => {
            const matchesSearch = !search || [
                service.serviceCode,
                service.cup,
                service.description,
                service.category,
            ].some((value) => value?.toLowerCase().includes(search));

            const matchesPendingDocument = !pendingDocumentFilter || service.missingDocuments.some((documentLabel) =>
                this.normalizeMissingDocumentLabel(documentLabel) === pendingDocumentFilter
            );

            return matchesSearch && matchesPendingDocument && this.matchesActiveFilter(service, this.currentFilterKey);
        });
    }

    get filteredDocuments(): IntakeAccountDocumentItemViewModel[] {
        return this.viewModel.documents;
    }

    get selectedViewerDocument(): IntakeAccountDocumentItemViewModel | null {
        const selectedId = this.selectedDocumentIdForViewer;
        if (!selectedId) {
            return null;
        }

        return this.viewModel.documents.find((document) => document.id === selectedId) ?? null;
    }

    get isViewerOpen(): boolean {
        return this.viewerMode === 'inline-modal' && Boolean(this.selectedDocumentIdForViewer);
    }

    get selectedViewerNodeId(): string | null {
        return this.selectedViewerDocument?.repositoryNodeId ?? null;
    }

    get canRenderSelectedDocumentInline(): boolean {
        return Boolean(this.selectedViewerBlob && this.selectedViewerMimeType);
    }

    get selectedViewerMimeType(): string | null {
        return this.selectedViewerDocument?.mimeType ?? null;
    }

    get isSelectedViewerPdf(): boolean {
        return (this.selectedViewerMimeType ?? '').toLowerCase().includes('pdf');
    }

    get selectedViewerSourceReferenceLabel(): string | null {
        const document = this.selectedViewerDocument;
        if (!document) {
            return null;
        }

        const segments: string[] = [];

        if (document.contentFileReferenceIndex !== null) {
            segments.push(`Ref ${document.contentFileReferenceIndex}`);
        }

        if (document.sourcePageIndex !== null) {
            segments.push(`Page ${document.sourcePageIndex + 1}`);
        }

        if (document.mimeType) {
            segments.push(document.mimeType);
        }

        return segments.length ? segments.join(' · ') : null;
    }

    get isViewerPreviewPanelActive(): boolean {
        return this.viewerPanel === 'preview';
    }

    get isViewerMetadataPanelActive(): boolean {
        return this.viewerPanel === 'metadata';
    }

    get pendingUploadItems(): PendingUploadItem[] {
        const aggregated = new Map<string, PendingUploadItem>();

        this.viewModel.services.forEach((service) => {
            const seenInService = new Set<string>();

            service.missingDocuments.forEach((documentLabel) => {
                const normalizedLabel = this.normalizeMissingDocumentLabel(documentLabel);
                if (!normalizedLabel || seenInService.has(normalizedLabel)) {
                    return;
                }

                seenInService.add(normalizedLabel);
                const stableLabel = documentLabel?.trim() || 'Pending support document';
                const current = aggregated.get(normalizedLabel);

                if (current) {
                    current.serviceCount += 1;
                    return;
                }

                aggregated.set(normalizedLabel, {
                    label: stableLabel,
                    normalizedLabel,
                    serviceCount: 1,
                });
            });
        });

        return Array.from(aggregated.values()).sort((left, right) => {
            if (right.serviceCount !== left.serviceCount) {
                return right.serviceCount - left.serviceCount;
            }

            return left.label.localeCompare(right.label);
        });
    }

    get pendingUploadCount(): number {
        return this.pendingUploadItems.length;
    }

    get activePendingUploadFilterLabel(): string | null {
        const activeKey = this.activePendingDocumentFilter;
        if (!activeKey) {
            return null;
        }

        return this.pendingUploadItems.find((item) => item.normalizedLabel === activeKey)?.label ?? null;
    }

    get pendingUploadTone(): 'success' | 'warning' {
        return this.pendingUploadCount > 0 ? 'warning' : 'success';
    }

    get pendingUploadHelperText(): string {
        return this.pendingUploadCount > 0
            ? 'Derived from current services in this account.'
            : 'All required support documents are currently mapped.';
    }

    get uploadCaptureMessage(): string | null {
        if (this.uploadFieldHighlighted) {
            return 'Usa el campo nativo File Upload resaltado para adjuntar el documento.';
        }

        if (this.uploadFieldError || this.shouldShowUploadFallbackMessage(this.uploadStatusMessage)) {
            return 'Si el selector nativo no se abre automaticamente, usa el campo File Upload del formulario para adjuntar el soporte.';
        }

        return null;
    }

    get uploadFieldStatusLabel(): string {
        return this.uploadFieldFound ? 'Found' : 'Not found';
    }

    get uploadFieldStatusTone(): 'success' | 'warning' | 'danger' {
        if (!this.uploadFieldFound) {
            return 'danger';
        }

        return this.uploadFieldHasValue ? 'success' : 'warning';
    }

    get uploadValueStatusLabel(): string {
        if (!this.uploadFieldFound) {
            return 'Field unavailable';
        }

        return this.uploadFieldHasValue ? 'File detected' : 'Empty';
    }

    get uploadValueStatusTone(): 'success' | 'warning' | 'neutral' {
        if (!this.uploadFieldFound) {
            return 'neutral';
        }

        return this.uploadFieldHasValue ? 'success' : 'warning';
    }

    getPatientOptionLabel(option: IntakeAccountViewModel['patientSelector']['options'][number]): string {
        if (option.key === this.viewModel.patientSelector.selectedKey) {
            return this.currentDisplayName || option.label;
        }

        return option.label;
    }

    selectPatient(patientKey: string): void {
        if (!patientKey || patientKey === this.selectedPatientKey) {
            return;
        }

        this.selectedPatientKey = patientKey;
        this.resetInteractiveState();
    }

    setActiveFilter(filterKey: IntakeServiceFilterKey, event?: Event): void {
        event?.preventDefault();
        event?.stopPropagation();

        if (filterKey === this.currentFilterKey) {
            return;
        }

        this.activeFilterKey = filterKey;
    }

    isFilterActive(filterKey: IntakeServiceFilterKey): boolean {
        return this.currentFilterKey === filterKey;
    }

    updateSearchTerm(event: Event): void {
        this.searchTerm = this.readControlValue(event);
    }

    clearSearch(): void {
        this.searchTerm = '';
    }

    togglePendingUploadFilter(item: PendingUploadItem): void {
        const nextFilter = item.normalizedLabel;

        if (this.activePendingDocumentFilter === nextFilter) {
            this.activePendingDocumentFilter = null;
            return;
        }

        this.activePendingDocumentFilter = nextFilter;
        this.activeFilterKey = 'missing-support';
    }

    clearPendingUploadFilter(): void {
        this.activePendingDocumentFilter = null;
    }

    isPendingUploadFilterActive(item: PendingUploadItem): boolean {
        return this.activePendingDocumentFilter === item.normalizedLabel;
    }

    openDocumentViewer(document: IntakeAccountDocumentItemViewModel): void {
        this.selectedDocumentIdForViewer = document.id;
        this.viewerPanel = 'preview';
        this.viewerMode = 'inline-modal';
        this.viewerStatusMessage = document.repositoryNodeId
            ? null
            : 'This document does not expose a resolvable repository content reference in batchState yet.';
        this.loadViewerBlob(document);
    }

    closeDocumentViewer(): void {
        this.viewerBlobRequestId += 1;
        this.selectedDocumentIdForViewer = null;
        this.viewerPanel = 'preview';
        this.viewerMode = null;
        this.viewerStatusMessage = null;
        this.viewerLoading = false;
        this.viewerPreviewRendering = false;
        this.selectedViewerBlob = null;
    }

    showViewerPreviewPanel(): void {
        this.viewerPanel = 'preview';
    }

    showViewerMetadataPanel(): void {
        this.viewerPanel = 'metadata';
    }

    handlePdfPreviewRendered(): void {
        this.viewerPreviewRendering = false;
    }

    handlePdfPreviewError(): void {
        this.viewerPreviewRendering = false;
        this.viewerStatusMessage = 'The PDF preview could not be rendered inline.';
    }

    refreshUploadStatus(): void {
        this.uploadFieldError = null;
        this.uploadStatusMessage = null;

        try {
            const uploadField = this.findUploadFieldModel();
            this.uploadFieldFound = Boolean(uploadField);

            if (!uploadField) {
                this.uploadFieldHasValue = false;
                this.uploadFieldValuePreview = 'No value';
                const nativeButton = this.findNativeUploadFieldElement();
                this.uploadFieldError = nativeButton
                    ? `No se encontro el campo ${this.UPLOAD_FIELD_ID} en el modelo del formulario, pero si un boton nativo Attach en el DOM. Valida si el id real publicado por Hyland cambio en tiempo de ejecucion.`
                    : `No se encontro el campo ${this.UPLOAD_FIELD_ID}. Valida el id del campo File Upload en Studio Modeler.`;
                return;
            }

            const value = uploadField.value;
            this.uploadFieldHasValue = this.hasUploadValue(value);
            this.uploadFieldValuePreview = this.buildUploadValuePreview(value);
            this.uploadStatusMessage = this.uploadFieldHasValue
                ? `The native File Upload field is available as ${uploadField.id ?? this.UPLOAD_FIELD_ID} and has a value.`
                : `The native File Upload field is available as ${uploadField.id ?? this.UPLOAD_FIELD_ID} but empty.`;
        } catch (error) {
            this.uploadFieldFound = false;
            this.uploadFieldHasValue = false;
            this.uploadFieldValuePreview = 'No value';
            this.uploadFieldError = `No fue posible leer el campo ${this.UPLOAD_FIELD_ID}.`;
            this.uploadStatusMessage = this.stringifyUploadError(error);
        }
    }

    triggerNativeUpload(event?: Event): void {
        event?.preventDefault();
        event?.stopPropagation();

        this.refreshUploadStatus();

        const container = this.findNativeUploadFieldElement();
        if (!container) {
            this.uploadStatusMessage = this.uploadFieldFound
                ? `Se encontro el campo ${this.UPLOAD_FIELD_ID} en el modelo, pero no se pudo localizar su render nativo en pantalla.`
                : `No se encontro el campo ${this.UPLOAD_FIELD_ID} en el modelo ni un boton nativo Attach en el DOM.`;
            return;
        }

        const clickTarget = this.findNativeUploadClickTarget(container);

        if (clickTarget) {
            try {
                clickTarget.click();
                this.uploadStatusMessage = this.uploadFieldFound
                    ? 'Intentando abrir el campo nativo File Upload.'
                    : 'Se encontro un boton nativo Attach en el DOM y se intento abrir desde el widget.';
                return;
            } catch {
                // Fall through to highlight guidance below.
            }
        }

        this.highlightNativeUploadField(container);
        this.uploadStatusMessage = 'Usa el campo nativo File Upload resaltado para adjuntar el documento.';
    }

    selectDisplayName(alias: string): void {
        const selectedKey = this.viewModel.patientSelector.selectedKey;
        const nextAlias = alias.trim();

        if (!selectedKey || !nextAlias) {
            return;
        }

        this.selectedDisplayNameByPatientKey.set(selectedKey, nextAlias);
    }

    isDisplayNameSelected(alias: string): boolean {
        return this.selectedAliasChoice === alias;
    }

    toggleServiceExpansion(serviceId: string): void {
        const next = new Set(this.expandedServiceIds);
        if (next.has(serviceId)) {
            next.delete(serviceId);
        } else {
            next.add(serviceId);
        }
        this.expandedServiceIds = next;
    }

    isServiceExpanded(serviceId: string): boolean {
        return this.expandedServiceIds.has(serviceId);
    }

    toggleDocumentExpansion(documentId: string): void {
        const next = new Set(this.expandedDocumentIds);
        if (next.has(documentId)) {
            next.delete(documentId);
        } else {
            next.add(documentId);
        }
        this.expandedDocumentIds = next;
    }

    isDocumentExpanded(documentId: string): boolean {
        return this.expandedDocumentIds.has(documentId);
    }

    trackById(_index: number, item: { id: string }): string {
        return item.id;
    }

    trackByPendingUploadLabel(_index: number, item: PendingUploadItem): string {
        return item.normalizedLabel;
    }

    override ngAfterViewInit(): void {
        super.ngAfterViewInit();
        this.refreshUploadStatus();
    }

    ngOnDestroy(): void {
        this.clearUploadHighlight();
    }

    private matchesActiveFilter(service: IntakeAccountServiceItemViewModel, filterKey: IntakeServiceFilterKey): boolean {
        switch (filterKey) {
            case 'complete':
                return service.supportStatus === 'Complete';
            case 'missing-support':
                return service.supportStatus === 'Missing Support' || service.missingDocuments.length > 0;
            case 'pending-review':
                return service.supportStatus === 'Review Required' || service.hasReviewRequired;
            case 'low-confidence':
                return service.supportStatus === 'Low Confidence' || service.hasLowConfidence;
            case 'all':
            default:
                return true;
        }
    }

    private isFilterAvailable(filterKey: IntakeServiceFilterKey, model: IntakeAccountViewModel): boolean {
        return filterKey === 'all' || model.summaryCards.primary.some((card) => card.filterKey === filterKey && card.visible);
    }

    private resolveBatchState(primaryValue: unknown, fallbackValue: unknown): BatchStateSource | null {
        const candidates = [primaryValue, fallbackValue];

        for (const candidate of candidates) {
            const parsed = this.parseBatchState(candidate);
            if (parsed) {
                return parsed;
            }
        }

        return null;
    }

    private parseBatchState(value: unknown): BatchStateSource | null {
        if (!value) {
            return null;
        }

        if (typeof value === 'string') {
            try {
                return JSON.parse(value) as BatchStateSource;
            } catch {
                return null;
            }
        }

        if (typeof value === 'object' && !Array.isArray(value)) {
            return value as BatchStateSource;
        }

        return null;
    }

    private resetInteractiveState(): void {
        this.searchTerm = '';
        this.activeFilterKey = null;
        this.activePendingDocumentFilter = null;
        this.expandedServiceIds = new Set<string>();
        this.expandedDocumentIds = new Set<string>();
        this.closeDocumentViewer();
    }

    private readControlValue(event: Event): string {
        return (event.target as HTMLInputElement | null)?.value ?? '';
    }

    private hasUploadValue(value: unknown): boolean {
        if (value === null || value === undefined) {
            return false;
        }

        if (typeof value === 'string') {
            return value.trim().length > 0;
        }

        if (Array.isArray(value)) {
            return value.length > 0;
        }

        if (typeof value === 'object') {
            const objectValue = value as Record<string, unknown>;
            const keys = Object.keys(objectValue);
            if (!keys.length) {
                return false;
            }

            return keys.some((key) => {
                const entry = objectValue[key];
                if (entry === null || entry === undefined) {
                    return false;
                }

                if (typeof entry === 'string') {
                    return entry.trim().length > 0;
                }

                if (Array.isArray(entry)) {
                    return entry.length > 0;
                }

                return true;
            });
        }

        return true;
    }

    private buildUploadValuePreview(value: unknown): string {
        if (value === null || value === undefined) {
            return 'No value';
        }

        if (typeof value === 'string') {
            return this.truncatePreview(value.trim() || 'No value');
        }

        if (Array.isArray(value)) {
            if (!value.length) {
                return 'Array(0)';
            }

            const labels = value
                .map((item) => this.extractUploadItemLabel(item))
                .filter((label): label is string => Boolean(label))
                .slice(0, 3);

            return labels.length
                ? `Array(${value.length}): ${this.truncatePreview(labels.join(', '))}`
                : `Array(${value.length})`;
        }

        if (typeof value === 'object') {
            const objectValue = value as Record<string, unknown>;
            const previewPairs = ['name', 'filename', 'title', 'id', 'value']
                .filter((key) => objectValue[key] !== undefined && objectValue[key] !== null)
                .map((key) => `${key}: ${this.truncatePreview(String(objectValue[key]))}`);

            if (previewPairs.length) {
                return this.truncatePreview(previewPairs.join(' | '), 180);
            }

            try {
                return this.truncatePreview(JSON.stringify(objectValue), 180);
            } catch {
                return 'Object value detected';
            }
        }

        return this.truncatePreview(String(value));
    }

    private extractUploadItemLabel(item: unknown): string | null {
        if (!item || typeof item !== 'object') {
            return typeof item === 'string' ? item : null;
        }

        const objectValue = item as Record<string, unknown>;
        const label = objectValue['name'] ?? objectValue['filename'] ?? objectValue['title'] ?? objectValue['id'];
        return typeof label === 'string' && label.trim() ? label.trim() : null;
    }

    private truncatePreview(value: string, maxLength = 120): string {
        return value.length > maxLength ? `${value.slice(0, maxLength - 3)}...` : value;
    }

    private stringifyUploadError(error: unknown): string {
        if (error instanceof Error) {
            return this.truncatePreview(error.message, 160);
        }

        return 'Unexpected upload field error.';
    }

    private normalizeMissingDocumentLabel(value: string | null | undefined): string {
        return (value ?? '')
            .trim()
            .toLowerCase()
            .replace(/\s+/g, ' ');
    }

    private loadViewerBlob(document: IntakeAccountDocumentItemViewModel): void {
        this.viewerBlobRequestId += 1;
        const requestId = this.viewerBlobRequestId;
        this.selectedViewerBlob = null;
        this.viewerPreviewRendering = false;

        if (!document.repositoryNodeId) {
            this.viewerLoading = false;
            return;
        }

        this.viewerLoading = true;
        this.viewerStatusMessage = null;

        this.blobDownloadService
            .downloadBlob(document.repositoryNodeId)
            .pipe(take(1))
            .subscribe({
                next: (blob) => {
                    if (requestId !== this.viewerBlobRequestId) {
                        return;
                    }

                    this.viewerLoading = false;
                    this.selectedViewerBlob = blob?.size ? blob : null;
                    this.viewerPreviewRendering = Boolean(blob?.size && this.isPdfMimeType(document.mimeType));

                    if (!blob?.size) {
                        this.viewerStatusMessage = 'The repository returned an empty file for this document preview.';
                    }
                },
                error: () => {
                    if (requestId !== this.viewerBlobRequestId) {
                        return;
                    }

                    this.viewerLoading = false;
                    this.viewerPreviewRendering = false;
                    this.selectedViewerBlob = null;
                    this.viewerStatusMessage = 'The repository file could not be loaded for inline preview.';
                },
            });
    }

    private isPdfMimeType(mimeType: string | null | undefined): boolean {
        return (mimeType ?? '').toLowerCase().includes('pdf');
    }

    private shouldShowUploadFallbackMessage(message: string | null): boolean {
        if (!message) {
            return false;
        }

        return /no se encontro|no se pudo localizar|usa el campo nativo/i.test(message);
    }

    private findUploadFieldModel(): { id?: string; value?: unknown; type?: unknown; name?: unknown } | null {
        const directField = this.field?.form?.getFieldById(this.UPLOAD_FIELD_ID);
        if (directField) {
            return directField;
        }

        const form = this.field?.form as {
            getFormFields?: () => Array<{ id?: string; value?: unknown; type?: unknown; name?: unknown }>;
        } | undefined;

        const fields = typeof form?.getFormFields === 'function' ? form.getFormFields() : [];
        if (!Array.isArray(fields) || !fields.length) {
            return null;
        }

        const uploadCandidates = fields.filter((candidate) => {
            const candidateId = String(candidate?.id ?? '').toLowerCase();
            const candidateType = String(candidate?.type ?? '').toLowerCase();
            const candidateName = String(candidate?.name ?? '').replace(/\s+/g, '').toLowerCase();

            return candidateId === this.UPLOAD_FIELD_ID.toLowerCase()
                || candidateId.startsWith('attachfile')
                || candidateType === 'upload'
                || candidateName === this.UPLOAD_FIELD_ID.toLowerCase()
                || candidateName === 'attachfile';
        });

        if (!uploadCandidates.length) {
            return null;
        }

        const exactIdMatch = uploadCandidates.find((candidate) => String(candidate?.id ?? '').toLowerCase() === this.UPLOAD_FIELD_ID.toLowerCase());
        if (exactIdMatch) {
            return exactIdMatch;
        }

        const attachIdMatches = uploadCandidates.filter((candidate) => String(candidate?.id ?? '').toLowerCase().startsWith('attachfile'));
        if (attachIdMatches.length === 1) {
            return attachIdMatches[0];
        }

        const uploadTypeMatches = uploadCandidates.filter((candidate) => String(candidate?.type ?? '').toLowerCase() === 'upload');
        if (uploadTypeMatches.length === 1) {
            return uploadTypeMatches[0];
        }

        return uploadCandidates.length === 1 ? uploadCandidates[0] : null;
    }

    private findNativeUploadFieldElement(): HTMLElement | null {
        const selectors = [
            `[data-automation-id="${this.UPLOAD_FIELD_ID}"]`,
            `[data-automation-id*="${this.UPLOAD_FIELD_ID}"]`,
            `#${this.UPLOAD_FIELD_ID}`,
            `[id*="${this.UPLOAD_FIELD_ID}"]`,
            `[name="${this.UPLOAD_FIELD_ID}"]`,
            `[name*="${this.UPLOAD_FIELD_ID}"]`,
            'hxp-attach-file-widget',
            'hxp-attach-file-widget.ng-star-inserted',
            '[id^="field-Attachfile"]',
            '[id*="field-Attachfile"]',
        ];

        for (const selector of selectors) {
            const match = document.querySelector<HTMLElement>(selector);
            if (match) {
                return this.normalizeUploadFieldContainer(match);
            }
        }

        const directiveMatches = Array.from(document.querySelectorAll<HTMLElement>('[adf-upload]'));
        if (directiveMatches.length === 1) {
            return this.normalizeUploadFieldContainer(directiveMatches[0]);
        }

        const fileInputMatches = Array.from(document.querySelectorAll<HTMLElement>('input[type="file"]'));
        if (fileInputMatches.length === 1) {
            return this.normalizeUploadFieldContainer(fileInputMatches[0]);
        }

        const buttonSelectors = [
            '.adf-attach-widget__menu-upload__button',
            '.adf-attach-widget__menu-upload button',
            'hxp-attach-file-widget button',
            'button[id^="Attachfile"]',
            'button[id*="Attachfile"]',
            '.adf-cloud-upload-widget-container button',
        ];

        for (const selector of buttonSelectors) {
            const match = document.querySelector<HTMLElement>(selector);
            if (match) {
                return this.normalizeUploadFieldContainer(match);
            }
        }

        const buttonMatches = Array.from(document.querySelectorAll<HTMLButtonElement>('button'));
        const fallbackButton = buttonMatches.find((button) => this.isLikelyNativeUploadButton(button));
        if (fallbackButton) {
            return this.normalizeUploadFieldContainer(fallbackButton);
        }

        return null;
    }

    private findNativeUploadClickTarget(container: HTMLElement): HTMLElement | null {
        const selectors = [
            '.adf-attach-widget__menu-upload__button:not([disabled])',
            'button[id^="Attachfile"]:not([disabled])',
            'button[id*="Attachfile"]:not([disabled])',
            'input[type="file"]:not([disabled])',
            '[adf-upload]:not([disabled])',
            'button:not([disabled])',
            '[role="button"]:not([aria-disabled="true"])',
        ];

        for (const selector of selectors) {
            if (container.matches(selector)) {
                return container;
            }

            const target = container.querySelector<HTMLElement>(selector);
            if (target) {
                return target;
            }
        }

        const hostComponent = container.closest<HTMLElement>('hxp-attach-file-widget');
        if (hostComponent) {
            return hostComponent;
        }

        if (container.matches('hxp-attach-file-widget')) {
            return container;
        }

        return null;
    }

    private normalizeUploadFieldContainer(element: HTMLElement): HTMLElement {
        return element.closest<HTMLElement>('hxp-attach-file-widget, [id^="field-Attachfile"], [id*="field-Attachfile"], .adf-attach-file-widget-container, .adf-attach-widget, .adf-cloud-upload-widget-container, .adf-upload-widget, [data-automation-id], [id], [name], [adf-upload]')
            ?? element;
    }

    private isLikelyNativeUploadButton(button: HTMLButtonElement): boolean {
        const id = button.id?.toLowerCase() ?? '';
        const text = button.textContent?.trim().toLowerCase() ?? '';
        const className = typeof button.className === 'string' ? button.className.toLowerCase() : '';
        const hasKnownContainer = Boolean(button.closest('hxp-attach-file-widget, [id^="field-Attachfile"], [id*="field-Attachfile"], .adf-attach-file-widget-container, .adf-attach-widget, .adf-cloud-upload-widget-container, .adf-upload-widget'));
        const hasUploadIcon = Boolean(button.querySelector('mat-icon[ng-reflect-svg-icon="attach_file"], mat-icon[ng-reflect-svg-icon="file_upload"], mat-icon[data-mat-icon-name="attach_file"], mat-icon[data-mat-icon-name="file_upload"]'));

        if (id.startsWith('attachfile') || className.includes('adf-attach-widget__menu-upload__button')) {
            return true;
        }

        if (!hasKnownContainer) {
            return false;
        }

        return hasUploadIcon && /(attach|adjuntar|upload|cargar)/i.test(text);
    }

    private highlightNativeUploadField(element: HTMLElement): void {
        this.clearUploadHighlight();

        this.highlightedUploadElement = element;
        this.highlightedUploadElementStyles = {
            outline: element.style.outline,
            outlineOffset: element.style.outlineOffset,
            boxShadow: element.style.boxShadow,
            borderRadius: element.style.borderRadius,
            backgroundColor: element.style.backgroundColor,
            transition: element.style.transition,
        };

        element.classList.add('native-upload-field-highlight');
        element.style.outline = '3px solid #f59e0b';
        element.style.outlineOffset = '6px';
        element.style.boxShadow = '0 0 0 10px rgba(245, 158, 11, 0.18)';
        element.style.borderRadius = '18px';
        element.style.backgroundColor = 'rgba(255, 249, 232, 0.92)';
        element.style.transition = 'outline 0.2s ease, box-shadow 0.2s ease, background-color 0.2s ease';
        element.scrollIntoView({ behavior: 'smooth', block: 'center' });
        this.uploadFieldHighlighted = true;

        this.uploadHighlightTimeout = setTimeout(() => {
            this.clearUploadHighlight();
        }, this.UPLOAD_HIGHLIGHT_TIMEOUT_MS);
    }

    private clearUploadHighlight(): void {
        if (this.uploadHighlightTimeout) {
            clearTimeout(this.uploadHighlightTimeout);
            this.uploadHighlightTimeout = null;
        }

        if (this.highlightedUploadElement) {
            this.highlightedUploadElement.classList.remove('native-upload-field-highlight');

            if (this.highlightedUploadElementStyles) {
                this.highlightedUploadElement.style.outline = this.highlightedUploadElementStyles.outline;
                this.highlightedUploadElement.style.outlineOffset = this.highlightedUploadElementStyles.outlineOffset;
                this.highlightedUploadElement.style.boxShadow = this.highlightedUploadElementStyles.boxShadow;
                this.highlightedUploadElement.style.borderRadius = this.highlightedUploadElementStyles.borderRadius;
                this.highlightedUploadElement.style.backgroundColor = this.highlightedUploadElementStyles.backgroundColor;
                this.highlightedUploadElement.style.transition = this.highlightedUploadElementStyles.transition;
            }
        }

        this.highlightedUploadElement = null;
        this.highlightedUploadElementStyles = null;
        this.uploadFieldHighlighted = false;
    }

    private createInitials(name: string | null): string {
        if (!name) {
            return 'MR';
        }

        return name
            .split(/\s+/)
            .filter(Boolean)
            .slice(0, 2)
            .map((token) => token[0]?.toUpperCase() || '')
            .join('') || 'MR';
    }
}
