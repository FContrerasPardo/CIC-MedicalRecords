import { Component, OnDestroy, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { ProcessAttentionItem } from '../../dashboard/definitions/process-attention.model';
import { NativeAutomationReference } from '../../models/medical-record.model';
import { MedicalRecordService } from '../../services/medical-record.service';

type MedicalRecordsPhaseKey = 'overview' | 'intake' | 'analysis' | 'approval' | 'execution' | 'review' | 'completed';

interface PhaseNavigationItem {
    key: MedicalRecordsPhaseKey;
    label: string;
    labelKey: string;
    route: string;
    order: number;
}

interface PhaseDetail {
    eyebrow: string;
    title: string;
    titleKey: string;
    description: string;
    descriptionKey: string;
    status: string;
    statusTone: 'blue' | 'amber' | 'green' | 'red';
    primaryAction: string;
    secondaryAction: string;
    heroMetric: string;
    heroMetricLabel: string;
    cards: Array<{ label: string; value: string; helper: string; icon: string; tone: string }>;
    tableTitle: string;
    tableSubtitle: string;
    tableRows: Array<{ id: string; patient: string; insurer: string; amount: string; status: string; risk: string }>;
}

interface NativeNavigationItem {
    id?: string;
    nativeReference?: NativeAutomationReference;
}

@Component({
  selector: 'medical-records-shell',
  standalone: false,
  templateUrl: './medical-records-shell.component.html',
  styleUrls: ['./medical-records-shell.component.scss']
})
export class MedicalRecordsShellComponent implements OnInit, OnDestroy {
    private routeSubscription?: Subscription;

    readonly phases: PhaseNavigationItem[] = [
        { key: 'overview', label: 'Overview', labelKey: 'MEDICAL_RECORDS.PHASES.OVERVIEW', route: '', order: 0 },
        { key: 'intake', label: 'Intake', labelKey: 'MEDICAL_RECORDS.PHASES.INTAKE', route: 'intake', order: 1 },
        { key: 'analysis', label: 'Analysis', labelKey: 'MEDICAL_RECORDS.PHASES.ANALYSIS', route: 'analysis', order: 2 },
        { key: 'approval', label: 'Approval', labelKey: 'MEDICAL_RECORDS.PHASES.APPROVAL', route: 'approval', order: 3 },
        { key: 'execution', label: 'Execution', labelKey: 'MEDICAL_RECORDS.PHASES.EXECUTION', route: 'execution', order: 4 },
        { key: 'review', label: 'Review', labelKey: 'MEDICAL_RECORDS.PHASES.REVIEW', route: 'review', order: 5 },
        { key: 'completed', label: 'Completed', labelKey: 'MEDICAL_RECORDS.PHASES.COMPLETED', route: 'completed', order: 6 },
    ];

    readonly overviewMetrics = [
        { label: 'Total Processes', value: '1,245', helper: '3.4% Increase', icon: 'account_tree', tone: 'blue' },
        { label: 'Completed', value: '980', helper: '2.1% Increase', icon: 'task_alt', tone: 'green' },
        { label: 'Pending Review', value: '185', helper: '12 high priority', icon: 'rate_review', tone: 'amber' },
        { label: 'Execution Queue', value: '80', helper: 'Avg. 14 days', icon: 'schedule', tone: 'slate' },
    ];

    readonly exceptionItems = [
        {
            phase: 'Analysis Phase',
            title: 'Authorization mismatch',
            description: 'Procedure 47562 has no matching prior authorization in the payer policy set.',
            tone: 'red',
        },
        {
            phase: 'Review Phase',
            title: 'Coding mismatch identified',
            description: 'Needs specialist validation before the final audit package is generated.',
            tone: 'amber',
        },
        {
            phase: 'Approval Phase',
            title: 'RIPS batch ready',
            description: '24 pre-validated claims are ready for institutional submission.',
            tone: 'green',
        },
    ];

    readonly phaseDetails: Record<MedicalRecordsPhaseKey, PhaseDetail> = {
        overview: {
            eyebrow: 'Command center',
            title: 'Process Overview Dashboard',
            titleKey: 'MEDICAL_RECORDS.PAGES.OVERVIEW.TITLE',
            description: 'Unified operational cockpit for medical billing, glosa prevention, audit readiness, and recovery performance.',
            descriptionKey: 'MEDICAL_RECORDS.PAGES.OVERVIEW.DESCRIPTION',
            status: 'Live operations',
            statusTone: 'blue',
            primaryAction: 'New Intake',
            secondaryAction: 'Export Report',
            heroMetric: '87.4%',
            heroMetricLabel: 'Total Recovery Rate',
            cards: [
                { label: 'Recovery Rate', value: '87.4%', helper: '+2.1% vs last month', icon: 'trending_up', tone: 'blue' },
                { label: 'Process Completion', value: '95%', helper: 'Projected 98% efficiency', icon: 'verified', tone: 'green' },
                { label: 'Glosa Risk', value: '$45.2M', helper: '5% reduction expected', icon: 'warning', tone: 'amber' },
            ],
            tableTitle: 'Active Medical Accounts',
            tableSubtitle: 'High-value accounts crossing intake, analysis, approval, and review.',
            tableRows: [
                { id: 'ACC-2026-8901', patient: 'Carlos Mendoza', insurer: 'SURA', amount: '$15.4M', status: 'Analysis', risk: 'High' },
                { id: 'ACC-2026-8902', patient: 'Ana Sofia Rojas', insurer: 'Allianz', amount: '$8.2M', status: 'Execution', risk: 'Medium' },
                { id: 'ACC-2026-8903', patient: 'Luis Fernando Gomez', insurer: 'Compensar', amount: '$3.5M', status: 'Intake', risk: 'Low' },
            ],
        },
        intake: {
            eyebrow: 'Document capture',
            title: 'Expediente Unificado - Intake',
            titleKey: 'MEDICAL_RECORDS.PAGES.INTAKE.TITLE',
            description: 'Capture, classify, and structure clinical documents before automated validation begins.',
            descriptionKey: 'MEDICAL_RECORDS.PAGES.INTAKE.DESCRIPTION',
            status: 'Intake Active',
            statusTone: 'blue',
            primaryAction: 'Proceed to Analysis',
            secondaryAction: 'Review Extracted Data',
            heroMetric: '96%',
            heroMetricLabel: 'Document completeness',
            cards: [
                { label: 'Documents Captured', value: '128', helper: '14 pending review', icon: 'folder_copy', tone: 'blue' },
                { label: 'IDP Confidence', value: '94%', helper: 'Across 6 document classes', icon: 'document_scanner', tone: 'green' },
                { label: 'Missing Supports', value: '7', helper: 'Requires billing team action', icon: 'rule', tone: 'amber' },
            ],
            tableTitle: 'Unified Expedient Queue',
            tableSubtitle: 'Clinical records waiting for data review and validation.',
            tableRows: [
                { id: 'EXP-4108', patient: 'Maria Velasquez', insurer: 'Nueva EPS', amount: '$4.8M', status: 'Needs Review', risk: 'Medium' },
                { id: 'EXP-4112', patient: 'Jorge Salazar', insurer: 'SURA', amount: '$12.1M', status: 'Ready', risk: 'Low' },
                { id: 'EXP-4119', patient: 'Paula Rincon', insurer: 'Sanitas', amount: '$6.7M', status: 'Missing Order', risk: 'High' },
            ],
        },
        analysis: {
            eyebrow: 'AI pre-validation',
            title: 'Analysis Phase',
            titleKey: 'MEDICAL_RECORDS.PAGES.ANALYSIS.TITLE',
            description: 'Review automated findings and resolve risk signals before the account moves to approval.',
            descriptionKey: 'MEDICAL_RECORDS.PAGES.ANALYSIS.DESCRIPTION',
            status: 'High glosa probability',
            statusTone: 'red',
            primaryAction: 'Review Contract',
            secondaryAction: 'Open Findings',
            heroMetric: '82%',
            heroMetricLabel: 'Risk confidence',
            cards: [
                { label: 'Analyzed Claims', value: '348', helper: '24 require human review', icon: 'analytics', tone: 'blue' },
                { label: 'Potential Glosa', value: '$18.6M', helper: 'Authorization and coding gaps', icon: 'report', tone: 'red' },
                { label: 'Auto Cleared', value: '71%', helper: 'Ready for approval queue', icon: 'task_alt', tone: 'green' },
            ],
            tableTitle: 'Billed Items Analysis',
            tableSubtitle: 'AI findings mapped against payer policies, CUPS codes, and clinical support.',
            tableRows: [
                { id: 'BILL-2041', patient: 'Carlos Mendoza', insurer: 'SURA', amount: '$2.4M', status: 'Authorization Missing', risk: 'High' },
                { id: 'BILL-2088', patient: 'Paula Rincon', insurer: 'Sanitas', amount: '$980K', status: 'Code Mismatch', risk: 'High' },
                { id: 'BILL-2110', patient: 'Andres Prieto', insurer: 'Compensar', amount: '$1.2M', status: 'Cleared', risk: 'Low' },
            ],
        },
        approval: {
            eyebrow: 'Account assembly',
            title: 'Approval Phase',
            titleKey: 'MEDICAL_RECORDS.PAGES.APPROVAL.TITLE',
            description: 'Finalize the billing package, verify validated claims, and select the target transmission format.',
            descriptionKey: 'MEDICAL_RECORDS.PAGES.APPROVAL.DESCRIPTION',
            status: 'Claims ready',
            statusTone: 'green',
            primaryAction: 'Generate RIPS',
            secondaryAction: 'Preview Batch',
            heroMetric: '24',
            heroMetricLabel: 'Pre-validated claims',
            cards: [
                { label: 'Selected Claims', value: '24', helper: '100% match with intake', icon: 'inventory', tone: 'green' },
                { label: 'Submission Format', value: 'RIPS', helper: 'Institutional package', icon: 'description', tone: 'blue' },
                { label: 'Review Required', value: '3', helper: 'Specialist approval needed', icon: 'approval', tone: 'amber' },
            ],
            tableTitle: 'Pre-Validated Claims',
            tableSubtitle: 'Select verified claims to include in this institutional submission batch.',
            tableRows: [
                { id: 'CLM-7701', patient: 'Ana Sofia Rojas', insurer: 'Allianz', amount: '$8.2M', status: 'Selected', risk: 'Medium' },
                { id: 'CLM-7716', patient: 'Jorge Salazar', insurer: 'SURA', amount: '$12.1M', status: 'Selected', risk: 'Low' },
                { id: 'CLM-7740', patient: 'Maria Velasquez', insurer: 'Nueva EPS', amount: '$4.8M', status: 'Review Req.', risk: 'Medium' },
            ],
        },
        execution: {
            eyebrow: 'Appeals management',
            title: 'Execution Phase',
            titleKey: 'MEDICAL_RECORDS.PAGES.EXECUTION.TITLE',
            description: 'Generate clinical justifications and send traceable appeal packages for denied claims.',
            descriptionKey: 'MEDICAL_RECORDS.PAGES.EXECUTION.DESCRIPTION',
            status: 'Appeals in progress',
            statusTone: 'amber',
            primaryAction: 'Generate Appeal',
            secondaryAction: 'View Evidence',
            heroMetric: '68%',
            heroMetricLabel: 'Appeal success projection',
            cards: [
                { label: 'Open Appeals', value: '42', helper: '9 due this week', icon: 'gavel', tone: 'amber' },
                { label: 'Recovered Value', value: '$21.8M', helper: '+6.5% this cycle', icon: 'payments', tone: 'green' },
                { label: 'Knowledge Matches', value: '18', helper: 'Similar successful precedents', icon: 'psychology', tone: 'blue' },
            ],
            tableTitle: 'Appeal Workbench',
            tableSubtitle: 'Denied claims enriched with precedent, clinical notes, and payer policy evidence.',
            tableRows: [
                { id: 'APL-3301', patient: 'Ana Sofia Rojas', insurer: 'Allianz', amount: '$1.2M', status: 'Draft Ready', risk: 'Medium' },
                { id: 'APL-3309', patient: 'Carlos Mendoza', insurer: 'SURA', amount: '$2.9M', status: 'Evidence Needed', risk: 'High' },
                { id: 'APL-3316', patient: 'Paula Rincon', insurer: 'Sanitas', amount: '$740K', status: 'Sent', risk: 'Low' },
            ],
        },
        review: {
            eyebrow: 'Final audit console',
            title: 'Final Review & Audit Phase',
            titleKey: 'MEDICAL_RECORDS.PAGES.REVIEW.TITLE',
            description: 'Review finalized claims and verify reconciliation metrics for the active cycle.',
            descriptionKey: 'MEDICAL_RECORDS.PAGES.REVIEW.DESCRIPTION',
            status: 'Audit active',
            statusTone: 'blue',
            primaryAction: 'Final Approval',
            secondaryAction: 'Generate Audit Report',
            heroMetric: '99.2%',
            heroMetricLabel: 'Audit accuracy',
            cards: [
                { label: 'Claims Audited', value: '12,400', helper: 'Q3 cycle checkpoint', icon: 'fact_check', tone: 'blue' },
                { label: 'Exceptions', value: '18', helper: '4 require supervisor signoff', icon: 'policy', tone: 'amber' },
                { label: 'Ready to Close', value: '96%', helper: 'All evidence attached', icon: 'verified', tone: 'green' },
            ],
            tableTitle: 'Audit Logs',
            tableSubtitle: 'Final claim checks before completed status and payment reconciliation.',
            tableRows: [
                { id: 'AUD-9012', patient: 'Metro Medical Center', insurer: 'SURA', amount: '$31.5M', status: 'Validated', risk: 'Low' },
                { id: 'AUD-9027', patient: 'Santa Maria IPS', insurer: 'Sanitas', amount: '$17.9M', status: 'Specialist Review', risk: 'Medium' },
                { id: 'AUD-9044', patient: 'Clinica Norte', insurer: 'Allianz', amount: '$8.8M', status: 'Correction Needed', risk: 'High' },
            ],
        },
        completed: {
            eyebrow: 'Payment reconciliation',
            title: 'Completed Phase',
            titleKey: 'MEDICAL_RECORDS.PAGES.COMPLETED.TITLE',
            description: 'Close reconciled accounts, track recovered value, and update the billing intelligence loop.',
            descriptionKey: 'MEDICAL_RECORDS.PAGES.COMPLETED.DESCRIPTION',
            status: 'Cycle closing',
            statusTone: 'green',
            primaryAction: 'Close Expedient',
            secondaryAction: 'Download Summary',
            heroMetric: '$74.6M',
            heroMetricLabel: 'Recovered value',
            cards: [
                { label: 'Closed Accounts', value: '312', helper: 'Last 30 days', icon: 'archive', tone: 'green' },
                { label: 'Recovered', value: '$74.6M', helper: 'Against payer agreements', icon: 'payments', tone: 'blue' },
                { label: 'Pending Difference', value: '$2.3M', helper: 'Needs finance review', icon: 'balance', tone: 'amber' },
            ],
            tableTitle: 'Recent Closed Accounts',
            tableSubtitle: 'Officially reconciled billing expedients with payment evidence.',
            tableRows: [
                { id: 'CLS-6101', patient: 'Carlos Mendoza', insurer: 'SURA', amount: '$15.4M', status: 'Closed', risk: 'Low' },
                { id: 'CLS-6118', patient: 'Maria Velasquez', insurer: 'Nueva EPS', amount: '$4.8M', status: 'Paid', risk: 'Low' },
                { id: 'CLS-6126', patient: 'Jorge Salazar', insurer: 'SURA', amount: '$12.1M', status: 'Reconciled', risk: 'Low' },
            ],
        },
    };

    activePhase = this.phases[0];
    activeDetail = this.phaseDetails.overview;
    isConfigureView = false;

    constructor(
        private readonly route: ActivatedRoute,
        private readonly router: Router,
        private readonly medicalRecordService: MedicalRecordService
    ) {}

    ngOnInit(): void {
        this.syncRouteState();
        this.routeSubscription = this.route.paramMap.subscribe(() => this.syncRouteState());
    }

    private syncRouteState(): void {
        this.isConfigureView = this.router.url.includes('/medical-records/configure');
        if (this.isConfigureView) {
            return;
        }

        const routePhase = this.route.snapshot.paramMap.get('phase') ?? '';
        const nextPhase = this.phases.find((phase) => phase.route === routePhase) ?? this.phases[0];
        this.activePhase = nextPhase;
        this.activeDetail = this.phaseDetails[nextPhase.key];
    }

    ngOnDestroy(): void {
        this.routeSubscription?.unsubscribe();
    }

    trackByPhase(_: number, phase: PhaseNavigationItem): MedicalRecordsPhaseKey {
        return phase.key;
    }

    trackById(_: number, row: { id: string }): string {
        return row.id;
    }

    trackByIndex(index: number): number {
        return index;
    }

    openStartProcess(item?: NativeNavigationItem): void {
        const reference = this.resolveNativeReference(item);
        void this.router.navigateByUrl(this.medicalRecordService.getStartProcessUrl(reference));
    }

    openTaskDetails(item?: NativeNavigationItem): void {
        const reference = this.resolveNativeReference(item);
        void this.router.navigateByUrl(this.medicalRecordService.getTaskDetailsUrl(reference));
    }

    openProcessDetails(item?: NativeNavigationItem | ProcessAttentionItem): void {
        const reference =
            item && 'nativeReference' in item && item.nativeReference
                ? item.nativeReference
                : this.resolveNativeReference(item as NativeNavigationItem | undefined);
        void this.router.navigateByUrl(this.medicalRecordService.getProcessDetailsUrl(reference));
    }

    openDocument(item?: NativeNavigationItem): void {
        const reference = this.resolveNativeReference(item);
        void this.router.navigateByUrl(this.medicalRecordService.getDocumentUrl(reference));
    }

    private resolveNativeReference(item?: NativeNavigationItem): NativeAutomationReference {
        return {
            ...this.medicalRecordService.getNativeReference(item?.id),
            ...item?.nativeReference,
        };
    }

}
