import { Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';
import { MedicalAccount, MetricData, NativeAutomationReference } from '../models/medical-record.model';

@Injectable({
    providedIn: 'root'
})
export class MedicalRecordService {
    private readonly defaultRepositoryId = 'default';
    private readonly rootDocumentId = '00000000-0000-0000-0000-000000000000';

    private readonly medicalAccountStartProcessName = 'Document AI Process';

    private readonly nativeReferences: Record<string, NativeAutomationReference> = {
        'ACC-2026-8901': { repositoryId: this.defaultRepositoryId, documentId: this.rootDocumentId },
        'ACC-2026-8902': { repositoryId: this.defaultRepositoryId, documentId: this.rootDocumentId },
        'ACC-2026-8903': { repositoryId: this.defaultRepositoryId, documentId: this.rootDocumentId },
        'ACC-2025-8901': { repositoryId: this.defaultRepositoryId, documentId: this.rootDocumentId },
        'ACC-2025-8902': { repositoryId: this.defaultRepositoryId, documentId: this.rootDocumentId },
        'ACC-2025-8903': { repositoryId: this.defaultRepositoryId, documentId: this.rootDocumentId },
        'ACT-8921-A': { repositoryId: this.defaultRepositoryId, documentId: this.rootDocumentId },
        'ACT-4410-B': { repositoryId: this.defaultRepositoryId, documentId: this.rootDocumentId },
        'ACT-5012-C': { repositoryId: this.defaultRepositoryId, documentId: this.rootDocumentId },
        'EXP-4108': { repositoryId: this.defaultRepositoryId, documentId: this.rootDocumentId },
        'EXP-4112': { repositoryId: this.defaultRepositoryId, documentId: this.rootDocumentId },
        'EXP-4119': { repositoryId: this.defaultRepositoryId, documentId: this.rootDocumentId },
        'BILL-2041': { repositoryId: this.defaultRepositoryId, documentId: this.rootDocumentId },
        'BILL-2088': { repositoryId: this.defaultRepositoryId, documentId: this.rootDocumentId },
        'BILL-2110': { repositoryId: this.defaultRepositoryId, documentId: this.rootDocumentId },
        'CLM-7701': { repositoryId: this.defaultRepositoryId, documentId: this.rootDocumentId },
        'CLM-7716': { repositoryId: this.defaultRepositoryId, documentId: this.rootDocumentId },
        'CLM-7740': { repositoryId: this.defaultRepositoryId, documentId: this.rootDocumentId },
        'APL-3301': { repositoryId: this.defaultRepositoryId, documentId: this.rootDocumentId },
        'APL-3309': { repositoryId: this.defaultRepositoryId, documentId: this.rootDocumentId },
        'APL-3316': { repositoryId: this.defaultRepositoryId, documentId: this.rootDocumentId },
        'AUD-9012': { repositoryId: this.defaultRepositoryId, documentId: this.rootDocumentId },
        'AUD-9027': { repositoryId: this.defaultRepositoryId, documentId: this.rootDocumentId },
        'AUD-9044': { repositoryId: this.defaultRepositoryId, documentId: this.rootDocumentId },
        'CLS-6101': { repositoryId: this.defaultRepositoryId, documentId: this.rootDocumentId },
        'CLS-6118': { repositoryId: this.defaultRepositoryId, documentId: this.rootDocumentId },
        'CLS-6126': { repositoryId: this.defaultRepositoryId, documentId: this.rootDocumentId },
    };

    constructor() { }

    getNativeReference(id?: string): NativeAutomationReference {
        return id ? this.nativeReferences[id] ?? {} : {};
    }

    getStartProcessUrl(reference: NativeAutomationReference = {}): string {
        const processName = reference.processName ?? this.medicalAccountStartProcessName;

        if (!processName) {
            return '/start-process-cloud';
        }

        return `/start-process-cloud?process=${this.encode(processName)}`;
    }

    getTaskDetailsUrl(reference: NativeAutomationReference = {}): string {
        if (!reference.taskId) {
            return reference.taskFilterId ? `/task-list-cloud?filterId=${this.encode(reference.taskFilterId)}` : '/task-list-cloud';
        }

        const processName = reference.taskProcessName ? `/${this.encode(reference.taskProcessName)}` : '';
        return `/task-details-cloud/${this.encode(reference.taskId)}${processName}`;
    }

    getProcessDetailsUrl(reference: NativeAutomationReference = {}): string {
        if (!reference.processInstanceId) {
            return reference.processFilterId ? `/process-list-cloud?filterId=${this.encode(reference.processFilterId)}` : '/process-list-cloud';
        }

        return `/process-details-cloud?processInstanceId=${this.encode(reference.processInstanceId)}`;
    }

    getDocumentUrl(reference: NativeAutomationReference = {}): string {
        const repositoryId = this.encode(reference.repositoryId ?? this.defaultRepositoryId);

        if (!reference.documentId) {
            return `/${repositoryId}/documents`;
        }

        return `/${repositoryId}/documents/${this.encode(reference.documentId)}`;
    }

    getDashboardMetrics(): Observable<MetricData[]> {
        return of([
            { label: 'Cuentas en Proceso', value: '1,245', trend: '+12%', trendUp: true, icon: 'receipt_long' },
            { label: 'Riesgo de Glosa Estimado', value: '$45.2M', trend: '-5%', trendUp: false, icon: 'warning' },
            { label: 'Tasa de Recuperación', value: '87.4%', trend: '+2.1%', trendUp: true, icon: 'trending_up' },
            { label: 'Tiempo Promedio Ciclo', value: '14 días', trend: '-2 días', trendUp: true, icon: 'schedule' }
        ]);
    }

    getRecentAccounts(): Observable<MedicalAccount[]> {
        return of([
            {
                id: 'ACC-2025-8901',
                status: 'Analysis',
                patient: { id: 'P-10293', name: 'Carlos Mendoza', dob: '1980-05-14', gender: 'M', insuranceId: 'SURA-992' },
                admissionDate: '2025-04-10',
                dischargeDate: '2025-04-15',
                totalBilled: 15400000,
                totalExpected: 15400000,
                insurer: 'SURA',
                urgency: 'High',
                nativeReference: this.getNativeReference('ACC-2025-8901')
            },
            {
                id: 'ACC-2025-8902',
                status: 'Appeals',
                patient: { id: 'P-10294', name: 'Ana Sofía Rojas', dob: '1992-11-20', gender: 'F', insuranceId: 'ALLI-441' },
                admissionDate: '2025-03-20',
                dischargeDate: '2025-03-25',
                totalBilled: 8200000,
                totalExpected: 8200000,
                totalGlosado: 1200000,
                insurer: 'Allianz',
                urgency: 'Medium',
                nativeReference: this.getNativeReference('ACC-2025-8902')
            },
            {
                id: 'ACC-2025-8903',
                status: 'Intake',
                patient: { id: 'P-10295', name: 'Luis Fernando Gómez', dob: '1975-02-10', gender: 'M', insuranceId: 'COMP-112' },
                admissionDate: '2025-04-20',
                dischargeDate: '2025-04-22',
                totalBilled: 3500000,
                totalExpected: 3500000,
                insurer: 'Compensar',
                urgency: 'Low',
                nativeReference: this.getNativeReference('ACC-2025-8903')
            }
        ]);
    }

    private encode(value: string): string {
        return encodeURIComponent(value);
    }
}
