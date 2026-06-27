import { CommonModule } from '@angular/common';
import {
    ChangeDetectorRef,
    Component,
    ElementRef,
    inject,
    OnDestroy,
    OnInit,
    ViewChild,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { WidgetComponent } from '@alfresco/adf-core';
import { DocumentService } from '@alfresco/adf-hx-content-services/services';
import { Document } from '@hylandsoftware/hxcs-js-client';
import { TranslateModule } from '@ngx-translate/core';
import { take } from 'rxjs/operators';
import { DocumentViewerComponent } from '../../../../../../workspace-hxp/content-services-extension/content-browser/feature-shell/src/lib/components/document-viewer/document-viewer.component';
import {
    applyAgreementGeneralFieldChange,
    applyChipItemsChange,
    applyListFieldChange,
    applyMetaFieldChange,
    ensureUiTabItems,
    getListKeyForItem,
    getPayerProfileById,
    getPayerSidebarProfiles,
    getTariffModifierLabel,
    getTariffModifierTone,
    mapAgreementDocumentsViewModel,
    mapAgreementGeneralViewModel,
    mapTariffSectionFromPayloadValue,
    mapToViewModel,
    parseScriptPayload,
    resolveActivePayerId,
    ruleHasIssues,
    sectionHasIssues,
    serializeItemValue,
} from './agent-rules.mapper';
import {
    AgentRuleScriptItem,
    AgentRulesAiSubTab,
    AgentRulesListField,
    AgentRulesListItem,
    AgentRulesMainTab,
    AgentRulesSectionViewModel,
    AgentRulesWidgetViewModel,
    AgreementDocumentsViewModel,
    AgreementGeneralViewModel,
    PayerSidebarProfile,
} from './agent-rules-widget.model';
import { findLinkedFormField, toFormFieldValue } from './agent-rules-form-sync';

export type AgentRulesRiskTone = 'high' | 'medium' | 'low' | 'neutral' | 'warning';

const AI_SUB_TAB_ORDER: AgentRulesAiSubTab[] = ['Intake', 'Compliance', 'Coding'];

const AI_SECTION_IDS: Record<AgentRulesAiSubTab, string[]> = {
    Intake: ['documentationRules'],
    Compliance: ['payerCompliancePolicy'],
    Coding: ['codingRules', 'payerCodingPolicy'],
};

@Component({
    templateUrl: './agent-rules-widget.component.html',
    styleUrls: ['./agent-rules-widget.component.scss'],
    selector: 'medical-records-agent-rules-widget',
    standalone: true,
    imports: [CommonModule, FormsModule, TranslateModule, DocumentViewerComponent],
})
export class AgentRulesWidgetComponent extends WidgetComponent implements OnInit, OnDestroy {
    private readonly documentService = inject(DocumentService);
    private readonly changeDetectorRef = inject(ChangeDetectorRef);

    viewModel: AgentRulesWidgetViewModel = {
        sections: [],
        summary: { total: 0, populated: 0, empty: 0 },
    };

    activeMainTab: AgentRulesMainTab = 'general';
    activeAiSubTab: AgentRulesAiSubTab = 'Intake';
    activePayerId = 'ars-primera';
    payerSearchTerm = '';
    ruleSearchTerm = '';
    showOnlyIssues = false;
    copiedItemId: string | null = null;

    viewerDocument?: Document;
    viewerLoading = false;
    viewerError: string | null = null;
    nativePreviewOpen = false;
    nativeViewerSettling = false;

    readonly mainTabs: AgentRulesMainTab[] = ['general', 'tariffs', 'aiRules', 'documents'];
    readonly aiSubTabs = AI_SUB_TAB_ORDER;
    readonly payerProfiles = getPayerSidebarProfiles();

    private workingItems: AgentRuleScriptItem[] = [];
    private chipDrafts = new Map<string, string>();
    private expandedRuleIds = new Set<string>();
    private copyFeedbackTimeout?: ReturnType<typeof setTimeout>;
    private contractViewerRequestId = 0;
    private loadedDocumentKey: string | null = null;
    private nativeViewerSettlingTimer?: ReturnType<typeof setTimeout>;
    private embeddedNativeViewerElement?: HTMLElement;
    private embeddedNativeFullscreenClickHandler?: (event: Event) => void;
    private embeddedFullscreenCaptureEnabled = false;
    private embeddedFullscreenCaptureTimer?: ReturnType<typeof setTimeout>;
    private pendingFullscreenRequest = false;

    @ViewChild('embeddedNativeViewer')
    set embeddedNativeViewerRef(ref: ElementRef<HTMLElement> | undefined) {
        this.detachEmbeddedNativeViewerFullscreenCapture();

        if (!ref?.nativeElement) {
            return;
        }

        this.embeddedNativeViewerElement = ref.nativeElement;
        this.embeddedNativeFullscreenClickHandler = (event) => this.handleEmbeddedNativeFullscreenClick(event);
        this.embeddedNativeViewerElement.addEventListener('click', this.embeddedNativeFullscreenClickHandler, true);
    }

    ngOnInit(): void {
        this.reloadFromField();
    }

    ngOnDestroy(): void {
        this.detachEmbeddedNativeViewerFullscreenCapture();
        this.clearEmbeddedFullscreenCaptureTimer();
        this.clearNativeViewerSettling();
        clearTimeout(this.copyFeedbackTimeout);
    }

    get formFieldId(): string {
        return this.field?.id ?? 'agent-rules-widget';
    }

    get isReadOnly(): boolean {
        return !!this.field?.form?.readOnly;
    }

    get activePayerProfile(): PayerSidebarProfile {
        return getPayerProfileById(this.activePayerId) ?? this.payerProfiles[0];
    }

    get filteredPayerProfiles(): PayerSidebarProfile[] {
        const term = this.payerSearchTerm.trim().toLowerCase();
        if (!term) {
            return this.payerProfiles;
        }

        return this.payerProfiles.filter(
            (profile) =>
                profile.name.toLowerCase().includes(term) ||
                profile.category.toLowerCase().includes(term) ||
                profile.agreementGeneral.contractId.toLowerCase().includes(term)
        );
    }

    get isActivePayerEditable(): boolean {
        return this.activePayerProfile.bindsRealPayload && !this.isReadOnly;
    }

    get displayAgreementGeneral(): AgreementGeneralViewModel {
        if (this.activePayerProfile.bindsRealPayload) {
            return mapAgreementGeneralViewModel(this.workingItems);
        }

        return this.activePayerProfile.agreementGeneral;
    }

    get displayAgreementDocuments(): AgreementDocumentsViewModel {
        if (this.activePayerProfile.bindsRealPayload) {
            return mapAgreementDocumentsViewModel(this.workingItems);
        }

        return this.activePayerProfile.agreementDocuments;
    }

    get realTariffSection(): AgentRulesSectionViewModel | undefined {
        return this.viewModel.sections.find((section) => section.itemId === 'tariffAgreement');
    }

    get displayTariffSection(): AgentRulesSectionViewModel | undefined {
        if (this.activePayerProfile.bindsRealPayload) {
            return this.realTariffSection;
        }

        if (!this.activePayerProfile.demoTariffPayload?.tariffRules) {
            return undefined;
        }

        return mapTariffSectionFromPayloadValue(this.activePayerProfile.demoTariffPayload, {
            readOnly: true,
            agentLabel: 'Demo profile — not sent to agents',
        });
    }

    get billedProgressPercent(): number {
        if (!this.displayAgreementGeneral.budgetTotal) {
            return 0;
        }

        return Math.min(
            100,
            Math.round((this.displayAgreementGeneral.billedYtd / this.displayAgreementGeneral.budgetTotal) * 1000) / 10
        );
    }

    get pendingProgressPercent(): number {
        if (!this.displayAgreementGeneral.budgetTotal) {
            return 0;
        }

        return Math.min(
            100,
            Math.round((this.displayAgreementGeneral.pendingApproval / this.displayAgreementGeneral.budgetTotal) * 1000) / 10
        );
    }

    get canRenderContractViewer(): boolean {
        return Boolean(this.viewerDocument);
    }

    trackBySection(_index: number, section: AgentRulesSectionViewModel): string {
        return section.itemId;
    }

    trackByListItem(_index: number, item: { id: string }): string {
        return item.id;
    }

    trackByField(_index: number, field: { key: string }): string {
        return field.key;
    }

    trackByPayer(_index: number, profile: PayerSidebarProfile): string {
        return profile.id;
    }

    selectPayer(payerId: string): void {
        if (this.activePayerId === payerId) {
            return;
        }

        this.activePayerId = payerId;
        this.expandedRuleIds.clear();
        this.closeNativeFullscreenPreview();
        this.disableEmbeddedFullscreenCapture();
        this.loadedDocumentKey = null;
        this.viewerDocument = undefined;

        if (this.activeMainTab === 'documents') {
            this.loadContractDocument();
        }
    }

    setMainTab(tab: AgentRulesMainTab): void {
        this.activeMainTab = tab;
        this.closeNativeFullscreenPreview();
        this.disableEmbeddedFullscreenCapture();

        if (tab === 'documents') {
            this.loadContractDocument();
        }
    }

    getMainTabLabelKey(tab: AgentRulesMainTab): string {
        switch (tab) {
            case 'general':
                return 'GENERAL';
            case 'tariffs':
                return 'TARIFFS';
            case 'aiRules':
                return 'AI_RULES';
            case 'documents':
                return 'DOCUMENTS';
        }
    }

    getRuleDescription(listItem: AgentRulesListItem): string {
        const description = listItem.fields.find((field) => field.key === 'description')?.value;
        return typeof description === 'string' && description.trim() ? description : listItem.subtitle || '—';
    }

    listItemHasIssues(listItem: AgentRulesListItem): boolean {
        return ruleHasIssues(listItem);
    }

    setAiSubTab(tab: AgentRulesAiSubTab): void {
        this.activeAiSubTab = tab;
    }

    toggleIssuesFilter(): void {
        this.showOnlyIssues = !this.showOnlyIssues;
    }

    isRuleExpanded(ruleKey: string): boolean {
        return this.expandedRuleIds.has(ruleKey);
    }

    toggleRule(ruleKey: string): void {
        if (this.expandedRuleIds.has(ruleKey)) {
            this.expandedRuleIds.delete(ruleKey);
            return;
        }

        this.expandedRuleIds.add(ruleKey);
    }

    getRuleKey(sectionId: string, ruleId: string): string {
        return `${this.activePayerId}:${sectionId}:${ruleId}`;
    }

    getAiSections(): AgentRulesSectionViewModel[] {
        const ids = new Set(AI_SECTION_IDS[this.activeAiSubTab]);
        return this.viewModel.sections.filter((section) => ids.has(section.itemId));
    }

    getVisibleListItems(section: AgentRulesSectionViewModel): AgentRulesListItem[] {
        const term = this.ruleSearchTerm.trim().toLowerCase();

        return section.listItems.filter((listItem) => {
            if (this.showOnlyIssues && !sectionHasIssues(section) && !ruleHasIssues(listItem)) {
                return false;
            }

            if (!term) {
                return true;
            }

            const haystack = [listItem.title, listItem.subtitle ?? '', ...(listItem.chips?.items ?? [])]
                .join(' ')
                .toLowerCase();

            return haystack.includes(term);
        });
    }

    getSectionStatusLabel(section: AgentRulesSectionViewModel): string {
        if (section.isEmpty) {
            return 'Missing data';
        }

        if (!section.listItems.length) {
            return 'No items';
        }

        if (sectionHasIssues(section)) {
            return 'Review';
        }

        return section.readOnly ? 'Read only' : 'Ready';
    }

    getSectionStatusTone(section: AgentRulesSectionViewModel): 'ok' | 'warning' | 'neutral' {
        if (section.isEmpty || !section.listItems.length || sectionHasIssues(section)) {
            return 'warning';
        }

        return section.readOnly ? 'neutral' : 'ok';
    }

    getTariffAmount(listItem: AgentRulesListItem): string {
        const expected = listItem.fields.find((field) => field.key === 'expectedAmount')?.value;
        return typeof expected === 'number'
            ? this.formatCurrency(expected, this.displayAgreementGeneral.budgetCurrency)
            : '—';
    }

    getTariffModifierLabel(listItem: AgentRulesListItem): string {
        return getTariffModifierLabel(listItem);
    }

    getTariffModifierTone(listItem: AgentRulesListItem): 'positive' | 'negative' | 'neutral' {
        return getTariffModifierTone(listItem);
    }

    normalizeRiskTone(riskLevel: string | undefined): AgentRulesRiskTone {
        const normalized = (riskLevel ?? '').trim().toUpperCase();

        if (['HIGH', 'DENIED', 'EXPIRED', 'CRITICAL'].includes(normalized)) {
            return 'high';
        }

        if (['MEDIUM', 'PENDING', 'PARTIAL'].includes(normalized)) {
            return 'medium';
        }

        if (['LOW', 'APPROVED', 'NOT_REQUIRED', 'COMPLETE'].includes(normalized)) {
            return 'low';
        }

        if (normalized) {
            return 'warning';
        }

        return 'neutral';
    }

    getChipPreview(items: string[], maxVisible = 3): { visible: string[]; overflow: number } {
        const visible = items.slice(0, maxVisible);
        return { visible, overflow: Math.max(items.length - visible.length, 0) };
    }

    getPrimaryFields(listItem: AgentRulesListItem): AgentRulesListField[] {
        const primaryKeys = new Set(['description', 'procedureCode', 'serviceCode', 'type', 'authorizationStatus']);
        return listItem.fields.filter((field) => primaryKeys.has(field.key));
    }

    getSecondaryFields(listItem: AgentRulesListItem): AgentRulesListField[] {
        const primaryKeys = new Set(['description', 'procedureCode', 'serviceCode', 'type', 'authorizationStatus']);
        return listItem.fields.filter((field) => !primaryKeys.has(field.key));
    }

    formatCurrency(value: number, currency = this.displayAgreementGeneral.budgetCurrency): string {
        return new Intl.NumberFormat(undefined, {
            style: 'currency',
            currency,
            maximumFractionDigits: 0,
        }).format(value);
    }

    formatCapitation(): string {
        const general = this.displayAgreementGeneral;
        return `${this.formatCurrency(general.capitationBase, general.capitationCurrency)} /${general.capitationPeriod}`;
    }

    isVariableCopied(itemId: string): boolean {
        return this.copiedItemId === itemId;
    }

    async copyVariableJson(itemId: string, event?: Event): Promise<void> {
        event?.preventDefault();
        event?.stopPropagation();

        const jsonText = this.getVariableJsonText(itemId);

        try {
            await navigator.clipboard.writeText(jsonText);
        } catch {
            this.fallbackCopyToClipboard(jsonText);
        }

        this.copiedItemId = itemId;
        clearTimeout(this.copyFeedbackTimeout);
        this.copyFeedbackTimeout = setTimeout(() => {
            if (this.copiedItemId === itemId) {
                this.copiedItemId = null;
            }
        }, 2000);
    }

    openNativeFullscreenPreview(): void {
        this.pendingFullscreenRequest = true;

        if (!this.viewerDocument) {
            this.loadContractDocument();
            return;
        }

        this.pendingFullscreenRequest = false;
        this.nativePreviewOpen = true;
        this.startNativeViewerSettling();
    }

    closeNativeFullscreenPreview(): void {
        this.nativePreviewOpen = false;
        this.pendingFullscreenRequest = false;
        this.clearNativeViewerSettling();
    }

    onGeneralFieldChange(key: keyof AgreementGeneralViewModel, value: string | number): void {
        if (!this.isActivePayerEditable) {
            return;
        }

        this.commitItems(applyAgreementGeneralFieldChange(this.workingItems, key, value));
    }

    onMetaFieldChange(itemId: string, key: string, value: string): void {
        if (this.isReadOnly || (itemId === 'tariffAgreement' && !this.isActivePayerEditable)) {
            return;
        }

        this.commitItems(applyMetaFieldChange(this.workingItems, itemId, key, value));
    }

    onListFieldChange(itemId: string, rowId: string, fieldKey: string, value: string | number | boolean): void {
        if (this.isReadOnly || (itemId === 'tariffAgreement' && !this.isActivePayerEditable)) {
            return;
        }

        this.commitItems(
            applyListFieldChange(this.workingItems, itemId, getListKeyForItem(itemId), rowId, fieldKey, value)
        );
    }

    getChipDraftKey(itemId: string, rowId: string, chipKey: string): string {
        return `${itemId}:${rowId}:${chipKey}`;
    }

    getChipDraft(itemId: string, rowId: string, chipKey: string): string {
        return this.chipDrafts.get(this.getChipDraftKey(itemId, rowId, chipKey)) ?? '';
    }

    setChipDraft(itemId: string, rowId: string, chipKey: string, value: string): void {
        this.chipDrafts.set(this.getChipDraftKey(itemId, rowId, chipKey), value);
    }

    addChipItem(itemId: string, rowId: string, chipKey: string, currentItems: string[]): void {
        if (this.isReadOnly || (itemId === 'tariffAgreement' && !this.isActivePayerEditable)) {
            return;
        }

        const draftKey = this.getChipDraftKey(itemId, rowId, chipKey);
        const draft = (this.chipDrafts.get(draftKey) ?? '').trim();

        if (!draft) {
            return;
        }

        const nextItems = currentItems.includes(draft) ? currentItems : [...currentItems, draft];
        this.chipDrafts.delete(draftKey);
        this.commitItems(applyChipItemsChange(this.workingItems, itemId, getListKeyForItem(itemId), rowId, chipKey, nextItems));
    }

    removeChipItem(itemId: string, rowId: string, chipKey: string, currentItems: string[], itemToRemove: string): void {
        if (this.isReadOnly || (itemId === 'tariffAgreement' && !this.isActivePayerEditable)) {
            return;
        }

        this.commitItems(
            applyChipItemsChange(
                this.workingItems,
                itemId,
                getListKeyForItem(itemId),
                rowId,
                chipKey,
                currentItems.filter((item) => item !== itemToRemove)
            )
        );
    }

    private reloadFromField(): void {
        this.workingItems = ensureUiTabItems(parseScriptPayload(this.field?.value));
        this.activePayerId = resolveActivePayerId(this.workingItems);
        this.viewModel = mapToViewModel(this.workingItems);
        this.field.value = this.workingItems;
        this.syncHiddenFields(this.workingItems);
    }

    private commitItems(nextItems: AgentRuleScriptItem[]): void {
        this.workingItems = nextItems;
        this.field.value = nextItems;
        this.syncHiddenFields(nextItems);
        this.viewModel = mapToViewModel(nextItems);
    }

    private syncHiddenFields(items: AgentRuleScriptItem[]): void {
        const form = this.field?.form;

        for (const item of items) {
            const hiddenField = findLinkedFormField(form, item.id);

            if (!hiddenField) {
                continue;
            }

            hiddenField.value = toFormFieldValue(item, hiddenField.value);
        }
    }

    private loadContractDocument(): void {
        const primaryDocument = this.displayAgreementDocuments.primaryDocument;
        const documentKey = `${this.activePayerId}:${primaryDocument.repositoryId}:${primaryDocument.repositoryNodeId}`;

        if (this.loadedDocumentKey === documentKey && this.viewerDocument) {
            if (this.pendingFullscreenRequest) {
                this.pendingFullscreenRequest = false;
                this.nativePreviewOpen = true;
                this.startNativeViewerSettling();
            }

            return;
        }

        this.contractViewerRequestId += 1;
        const requestId = this.contractViewerRequestId;

        this.viewerLoading = true;
        this.viewerError = null;
        this.viewerDocument = undefined;
        this.clearNativeViewerSettling();
        this.disableEmbeddedFullscreenCapture();

        this.documentService
            .getDocumentById(primaryDocument.repositoryNodeId, primaryDocument.repositoryId)
            .pipe(take(1))
            .subscribe({
                next: (document) => {
                    if (requestId !== this.contractViewerRequestId) {
                        return;
                    }

                    this.viewerLoading = false;
                    this.viewerDocument = document;
                    this.loadedDocumentKey = documentKey;

                    if (this.pendingFullscreenRequest) {
                        this.pendingFullscreenRequest = false;
                        this.nativePreviewOpen = true;
                        this.startNativeViewerSettling();
                    }

                    this.scheduleEmbeddedFullscreenCapture();
                    this.changeDetectorRef.markForCheck();
                },
                error: () => {
                    if (requestId !== this.contractViewerRequestId) {
                        return;
                    }

                    this.viewerLoading = false;
                    this.viewerDocument = undefined;
                    this.loadedDocumentKey = null;
                    this.pendingFullscreenRequest = false;
                    this.viewerError = 'Unable to load the contract preview from the repository.';
                    this.changeDetectorRef.markForCheck();
                },
            });
    }

    private handleEmbeddedNativeFullscreenClick(event: Event): void {
        if (!this.embeddedFullscreenCaptureEnabled) {
            return;
        }

        if (event instanceof MouseEvent && !event.isTrusted) {
            return;
        }

        if (!this.isNativeFullscreenTarget(event)) {
            return;
        }

        event.preventDefault();
        event.stopPropagation();
        event.stopImmediatePropagation();
        this.openNativeFullscreenPreview();
    }

    private isNativeFullscreenTarget(event: Event): boolean {
        const target = event.target;

        if (target instanceof Element && target.closest('#document-viewer-fullscreen, [data-automation-id="document-viewer-fullscreen"]')) {
            return true;
        }

        return event.composedPath().some((node) => {
            if (!(node instanceof Element)) {
                return false;
            }

            return node.id === 'document-viewer-fullscreen' || node.getAttribute('data-automation-id') === 'document-viewer-fullscreen';
        });
    }

    private detachEmbeddedNativeViewerFullscreenCapture(): void {
        if (this.embeddedNativeViewerElement && this.embeddedNativeFullscreenClickHandler) {
            this.embeddedNativeViewerElement.removeEventListener('click', this.embeddedNativeFullscreenClickHandler, true);
        }

        this.embeddedNativeViewerElement = undefined;
        this.embeddedNativeFullscreenClickHandler = undefined;
    }

    private startNativeViewerSettling(): void {
        this.clearNativeViewerSettling();
        this.nativeViewerSettling = true;
        this.nativeViewerSettlingTimer = setTimeout(() => {
            this.nativeViewerSettling = false;
            this.nativeViewerSettlingTimer = undefined;
            this.changeDetectorRef.markForCheck();
        }, 900);
    }

    private clearNativeViewerSettling(): void {
        if (this.nativeViewerSettlingTimer) {
            clearTimeout(this.nativeViewerSettlingTimer);
            this.nativeViewerSettlingTimer = undefined;
        }

        this.nativeViewerSettling = false;
    }

    private disableEmbeddedFullscreenCapture(): void {
        this.embeddedFullscreenCaptureEnabled = false;
        this.clearEmbeddedFullscreenCaptureTimer();
    }

    private scheduleEmbeddedFullscreenCapture(): void {
        this.disableEmbeddedFullscreenCapture();
        this.embeddedFullscreenCaptureTimer = setTimeout(() => {
            this.embeddedFullscreenCaptureEnabled = true;
            this.embeddedFullscreenCaptureTimer = undefined;
        }, 400);
    }

    private clearEmbeddedFullscreenCaptureTimer(): void {
        if (this.embeddedFullscreenCaptureTimer) {
            clearTimeout(this.embeddedFullscreenCaptureTimer);
            this.embeddedFullscreenCaptureTimer = undefined;
        }
    }

    private getVariableJsonText(itemId: string): string {
        const item = this.workingItems.find((entry) => entry.id === itemId);

        if (!item) {
            return '{}';
        }

        const serialized = serializeItemValue(item);

        if (typeof serialized === 'string') {
            try {
                return JSON.stringify(JSON.parse(serialized), null, 2);
            } catch {
                return serialized;
            }
        }

        return JSON.stringify(serialized ?? {}, null, 2);
    }

    private fallbackCopyToClipboard(text: string): void {
        const textarea = document.createElement('textarea');
        textarea.value = text;
        textarea.setAttribute('readonly', '');
        textarea.style.position = 'fixed';
        textarea.style.left = '-9999px';
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand('copy');
        document.body.removeChild(textarea);
    }
}
