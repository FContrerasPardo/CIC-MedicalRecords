import { CommonModule } from '@angular/common';
import { Component, ElementRef, Input, inject } from '@angular/core';
import { RouterModule } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { CASE_DETAIL_DATA } from './case-detail-data.provider';
import { CaseDetail, CaseDocument, ScoreSummary } from './case-detail.model';
import { CaseDocumentViewerComponent } from './case-document-viewer.component';
import { summarizeCase } from './case-score';

type MainTabId = 'summary' | 'requests' | 'tasks' | 'documents' | 'returns' | 'guidelines' | 'timeline' | 'audit';
type SubTabId = 'clinical' | 'documents' | 'score' | 'audit';

interface TabItem<T extends string> {
    id: T;
    labelKey: string;
    icon: string;
}

const I18N = 'MEDICAL_RECORDS.CASE_DETAIL';

/**
 * Case detail view (demo, read-only v1). Data comes from CASE_DETAIL_DATA (mock by default).
 * Header actions are visual only and never write Automate variables.
 */
@Component({
    selector: 'medical-records-case-detail',
    standalone: true,
    imports: [CommonModule, RouterModule, TranslateModule, CaseDocumentViewerComponent],
    templateUrl: './case-detail.component.html',
    styleUrls: ['./case-detail.component.scss'],
})
export class CaseDetailComponent {
    private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);

    private readonly provider = inject(CASE_DETAIL_DATA);

    detail: CaseDetail = this.provider.getCase();
    score: ScoreSummary = summarizeCase(this.detail);
    request: CaseDetail['linkedRequests'][number] | undefined = this.detail.linkedRequests[0];

    /** Case data pushed by a host (e.g. the form widget). Falls back to the default provider. */
    @Input() set data(value: CaseDetail | null | undefined) {
        this.detail = value ?? this.provider.getCase();
        this.score = summarizeCase(this.detail);
        this.request = this.detail.linkedRequests[0];
    }

    viewingDocument: CaseDocument | null = null;

    readonly steps = [
        { key: 'OPERATIONS', icon: 'inbox' },
        { key: 'CASE', icon: 'assignment_ind' },
        { key: 'COMPLIANCE', icon: 'fact_check' },
        { key: 'ELIGIBILITY', icon: 'verified_user' },
        { key: 'READINESS', icon: 'speed' },
        { key: 'MEDICAL_REPORT', icon: 'description' },
        { key: 'CONSOLIDATION', icon: 'task_alt' },
    ].map((step) => ({ ...step, labelKey: `${I18N}.STEPS.${step.key}`, current: step.key === 'CASE' }));

    readonly tabs: TabItem<MainTabId>[] = [
        { id: 'summary', icon: 'description', labelKey: `${I18N}.TABS.SUMMARY` },
        { id: 'requests', icon: 'send', labelKey: `${I18N}.TABS.REQUESTS` },
        { id: 'tasks', icon: 'checklist', labelKey: `${I18N}.TABS.TASKS` },
        { id: 'documents', icon: 'folder_open', labelKey: `${I18N}.TABS.DOCUMENTS` },
        { id: 'returns', icon: 'report', labelKey: `${I18N}.TABS.RETURNS` },
        { id: 'guidelines', icon: 'compare_arrows', labelKey: `${I18N}.TABS.GUIDELINES` },
        { id: 'timeline', icon: 'history', labelKey: `${I18N}.TABS.TIMELINE` },
        { id: 'audit', icon: 'task_alt', labelKey: `${I18N}.TABS.AUDIT` },
    ];

    readonly subTabs: TabItem<SubTabId>[] = [
        { id: 'clinical', icon: '', labelKey: `${I18N}.SUBTABS.CLINICAL` },
        { id: 'documents', icon: '', labelKey: `${I18N}.SUBTABS.DOCUMENTS` },
        { id: 'score', icon: '', labelKey: `${I18N}.SUBTABS.SCORE` },
        { id: 'audit', icon: '', labelKey: `${I18N}.SUBTABS.AUDIT` },
    ];

    readonly timelineFilters = [
        'ALL', 'REQUESTS', 'TASKS', 'PENDING', 'DOCUMENTS', 'RECORD', 'ANALYSES', 'GUIDELINES', 'PAYER', 'SLA', 'CHANGES', 'SYSTEM',
    ];
    readonly auditColumns = ['DATE', 'ACTION', 'OWNER', 'ORIGIN', 'CHANGE'];
    readonly documentColumns = ['CATEGORY', 'DOCUMENT', 'CLASSIFICATION', 'DATE', 'ORIGIN', 'REFERENCE', 'ACTIONS'];

    activeTimelineFilter = 'ALL';

    activeTab: MainTabId = 'summary';
    activeSubTab: SubTabId = 'score';

    readonly i18n = I18N;

    openDocument(doc: CaseDocument): void {
        if (doc.nodeId) {
            this.viewingDocument = doc;
        }
    }

    closeDocument(): void {
        this.viewingDocument = null;
    }

    selectTab(id: MainTabId): void {
        this.activeTab = id;
    }

    selectSubTab(id: SubTabId): void {
        this.activeSubTab = id;
    }

    onTabKeydown(event: KeyboardEvent): void {
        this.moveFocus(event, this.tabs, this.activeTab, 'case-tab-', (id) => this.selectTab(id));
    }

    onSubTabKeydown(event: KeyboardEvent): void {
        this.moveFocus(event, this.subTabs, this.activeSubTab, 'case-subtab-', (id) => this.selectSubTab(id));
    }

    /** Arrow/Home/End navigation with automatic activation (WAI-ARIA tabs pattern). */
    private moveFocus<T extends string>(
        event: KeyboardEvent,
        items: TabItem<T>[],
        current: T,
        prefix: string,
        select: (id: T) => void
    ): void {
        const index = items.findIndex((item) => item.id === current);
        let next = index;
        switch (event.key) {
            case 'ArrowRight':
                next = (index + 1) % items.length;
                break;
            case 'ArrowLeft':
                next = (index - 1 + items.length) % items.length;
                break;
            case 'Home':
                next = 0;
                break;
            case 'End':
                next = items.length - 1;
                break;
            default:
                return;
        }
        event.preventDefault();
        select(items[next].id);
        this.host.nativeElement.querySelector<HTMLElement>(`#${prefix}${items[next].id}`)?.focus();
    }
}
