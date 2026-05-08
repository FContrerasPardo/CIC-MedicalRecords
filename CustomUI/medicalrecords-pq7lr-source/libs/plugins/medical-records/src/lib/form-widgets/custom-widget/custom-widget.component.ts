import { CommonModule } from '@angular/common';
import { WidgetComponent } from '@alfresco/adf-core';
import { Component } from '@angular/core';

interface IntakeDocument {
    id?: string;
    name?: string;
    status?: string;
    description?: string;
}

interface IntakePatient {
    id?: string;
    name?: string;
    dob?: string;
    insuranceId?: string;
}

interface IntakePayer {
    name?: string;
    plan?: string;
}

interface IntakeFinancials {
    totalBilled?: number;
    totalExpected?: number;
    totalGlosado?: number;
}

interface IntakeMetadata {
    readinessScore?: number;
    readinessMessage?: string;
}

interface IntakeCasePayload {
    schemaVersion?: number;
    caseId?: string;
    taskId?: string;
    processInstanceId?: string;
    phase?: string;
    patient?: IntakePatient;
    payer?: IntakePayer;
    insurer?: string;
    financials?: IntakeFinancials;
    documents?: IntakeDocument[];
    intake?: IntakeMetadata;
    updatedAt?: string;
}

@Component({
    templateUrl: './custom-widget.component.html',
    styleUrls: ['./custom-widget.component.scss'],
    selector: 'medical-records-custom-widget',
    standalone: true,
    imports: [CommonModule]
})
export class CustomWidgetComponent extends WidgetComponent {
    get casePayload(): IntakeCasePayload | null {
        return this.resolveCasePayload();
    }

    get documents(): IntakeDocument[] {
        return this.casePayload?.documents ?? [];
    }

    get totalDocuments(): number {
        return this.documents.length;
    }

    get verifiedDocumentsCount(): number {
        return this.documents.filter((document) => this.isDocumentVerified(document)).length;
    }

    get pendingDocumentsCount(): number {
        return Math.max(this.totalDocuments - this.verifiedDocumentsCount, 0);
    }

    get patientName(): string {
        return this.casePayload?.patient?.name ?? 'Paciente sin nombre';
    }

    get patientId(): string {
        return this.casePayload?.patient?.id ?? 'Sin identificador';
    }

    get patientDob(): string | null {
        return this.casePayload?.patient?.dob ?? null;
    }

    get payerName(): string {
        return this.casePayload?.payer?.name ?? this.casePayload?.insurer ?? 'Sin pagador';
    }

    get planName(): string {
        return this.casePayload?.payer?.plan ?? 'Sin plan';
    }

    get caseId(): string {
        return this.casePayload?.caseId ?? 'Caso pendiente';
    }

    get taskId(): string {
        return this.casePayload?.taskId ?? 'Pendiente';
    }

    get processInstanceId(): string {
        return this.casePayload?.processInstanceId ?? 'Pendiente';
    }

    get phaseLabel(): string {
        return this.casePayload?.phase ?? 'intake';
    }

    get schemaVersion(): number | null {
        return this.casePayload?.schemaVersion ?? null;
    }

    get updatedAt(): string | null {
        return this.casePayload?.updatedAt ?? null;
    }

    get totalBilled(): number | null {
        return this.casePayload?.financials?.totalBilled ?? null;
    }

    get totalExpected(): number | null {
        return this.casePayload?.financials?.totalExpected ?? null;
    }

    get totalGlosado(): number | null {
        return this.casePayload?.financials?.totalGlosado ?? null;
    }

    get readinessScore(): number {
        const configuredScore = this.casePayload?.intake?.readinessScore;
        if (typeof configuredScore === 'number') {
            return configuredScore;
        }

        if (this.totalDocuments === 0) {
            return 0;
        }

        return Math.round((this.verifiedDocumentsCount / this.totalDocuments) * 100);
    }

    get readinessMessage(): string {
        const configuredMessage = this.casePayload?.intake?.readinessMessage;
        if (configuredMessage) {
            return configuredMessage;
        }

        if (this.pendingDocumentsCount > 0) {
            return `${this.pendingDocumentsCount} document(s) still require review before automated analysis.`;
        }

        if (this.totalDocuments > 0) {
            return 'Document package is ready for automated analysis.';
        }

        return 'Waiting for documents to be attached to this intake case.';
    }

    get intakeStatusLabel(): string {
        return this.pendingDocumentsCount > 0 ? 'Intake in review' : 'Intake active';
    }

    get documentsHelper(): string {
        if (this.totalDocuments === 0) {
            return 'Waiting for document intake';
        }

        return `${this.totalDocuments} document(s) mapped to this account`;
    }

    get verifiedHelper(): string {
        if (this.verifiedDocumentsCount === 0) {
            return 'No verified documents yet';
        }

        return 'Ready for coding';
    }

    get pendingHelper(): string {
        if (this.pendingDocumentsCount === 0) {
            return 'No pending reviews';
        }

        return 'Requires attention';
    }

    get formFieldId(): string {
        return this.field?.id ?? 'custom-widget';
    }

    isDocumentVerified(document: IntakeDocument): boolean {
        return ['verified', 'ready', 'approved', 'complete', 'completed'].includes(this.normalizeStatus(document.status));
    }

    getDocumentIcon(document: IntakeDocument): string {
        const status = this.normalizeStatus(document.status);

        if (status === 'verified' || status === 'ready' || status === 'approved' || status === 'complete' || status === 'completed') {
            return 'task_alt';
        }

        if (status === 'pending' || status === 'review' || status === 'warning') {
            return 'pending_actions';
        }

        return 'description';
    }

    getDocumentStatusLabel(document: IntakeDocument): string {
        if (!document.status) {
            return 'Ready';
        }

        return this.toTitleCase(document.status);
    }

    getDocumentSummary(document: IntakeDocument): string {
        if (document.description) {
            return document.description;
        }

        return this.isDocumentVerified(document)
            ? 'Document verified and ready for downstream analysis.'
            : 'Document received but still requires manual review.';
    }

    private resolveCasePayload(): IntakeCasePayload | null {
        const candidates = [
            this.field?.value,
            this.field?.form?.getFieldById('case_payload')?.value,
            this.field?.form?.getFieldById('casePayload')?.value
        ];

        for (const candidate of candidates) {
            const parsed = this.parsePayload(candidate);
            if (parsed) {
                return parsed;
            }
        }

        return null;
    }

    private parsePayload(value: unknown): IntakeCasePayload | null {
        if (!value) {
            return null;
        }

        if (typeof value === 'string') {
            try {
                return JSON.parse(value) as IntakeCasePayload;
            } catch {
                return null;
            }
        }

        if (typeof value === 'object' && !Array.isArray(value)) {
            return value as IntakeCasePayload;
        }

        return null;
    }

    private normalizeStatus(status?: string): string {
        return (status ?? '').trim().toLowerCase();
    }

    private toTitleCase(value: string): string {
        return value
            .split(/[\s_-]+/)
            .filter(Boolean)
            .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
            .join(' ');
    }
}
