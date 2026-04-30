import { CommonModule } from '@angular/common';
import { WidgetComponent } from '@alfresco/adf-core';
import { Component } from '@angular/core';

interface AnalysisFinding {
    title?: string;
    type?: string;
    severity?: string;
}

interface AnalysisParticipant {
    name?: string;
    plan?: string;
}

interface AnalysisPatient {
    id?: string;
    name?: string;
    dob?: string;
}

interface AnalysisFinancials {
    totalBilled?: number;
    totalExpected?: number;
    totalGlosado?: number;
}

interface AnalysisCasePayload {
    schemaVersion?: number;
    caseId?: string;
    taskId?: string;
    processInstanceId?: string;
    phase?: string;
    patient?: AnalysisPatient;
    payer?: AnalysisParticipant;
    insurer?: string;
    financials?: AnalysisFinancials;
    findings?: AnalysisFinding[];
    updatedAt?: string;
}

@Component({
    selector: 'medical-records-analysis-task-widget',
    standalone: true,
    imports: [CommonModule],
    templateUrl: './analysis-task-widget.component.html',
    styleUrls: ['./analysis-task-widget.component.scss']
})
export class AnalysisTaskWidgetComponent extends WidgetComponent {
    get casePayload(): AnalysisCasePayload | null {
        return this.resolveCasePayload();
    }

    get findings(): AnalysisFinding[] {
        return this.casePayload?.findings ?? [];
    }

    get patientName(): string {
        return this.casePayload?.patient?.name ?? 'Paciente sin nombre';
    }

    get payerName(): string {
        return this.casePayload?.payer?.name ?? this.casePayload?.insurer ?? 'Sin pagador';
    }

    get planName(): string {
        return this.casePayload?.payer?.plan ?? 'Sin plan';
    }

    get primaryFinding(): AnalysisFinding | null {
        return this.findings[0] ?? null;
    }

    get caseId(): string {
        return this.casePayload?.caseId ?? 'Case payload pendiente';
    }

    get phaseLabel(): string {
        return this.casePayload?.phase ?? 'analysis';
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

    get formFieldId(): string {
        return this.field?.id ?? 'analysis-task-widget';
    }

    private resolveCasePayload(): AnalysisCasePayload | null {
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

    private parsePayload(value: unknown): AnalysisCasePayload | null {
        if (!value) {
            return null;
        }

        if (typeof value === 'string') {
            try {
                return JSON.parse(value) as AnalysisCasePayload;
            } catch {
                return null;
            }
        }

        if (typeof value === 'object' && !Array.isArray(value)) {
            return value as AnalysisCasePayload;
        }

        return null;
    }
}
