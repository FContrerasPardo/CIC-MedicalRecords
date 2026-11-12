import { InjectionToken } from '@angular/core';
import { CaseDetail } from './case-detail.model';

/** Contract the view consumes. Replace the implementation with Automate-backed data later. */
export interface CaseDetailDataProvider {
    getCase(caseCode?: string): CaseDetail;
}

const demoKey = (key: string): string => `MEDICAL_RECORDS.CASE_DETAIL.DEMO.${key}`;

/**
 * DEMO ONLY: synthetic data, no PII, no clinical recommendation.
 * Criteria and points are demonstration values taken from a reference capture.
 */
export class MockCaseDetailDataProvider implements CaseDetailDataProvider {
    getCase(): CaseDetail {
        const k = demoKey;
        return {
            code: 'ONC-TESTE-CEN16EXTRA',
            patientName: 'Paciente Oncoclinicas Teste — Cenário 16 EXTRA',
            diagnosisKey: k('DIAGNOSIS'),
            statusKey: k('STATUS_PENDING'),
            linkedRequests: [
                {
                    code: 'SOL-TESTE-CEN16EXTRA',
                    typeKey: k('REQUEST_TYPE'),
                    statusKey: k('REQUEST_STATUS'),
                    owner: 'Juliana Martins',
                    sla: null,
                },
            ],
            pendingComplements: 8,
            openDivergences: 1,
            profile: { profileId: 'poc_2026_10_09', engineVersion: 'v0.4.0', ceiling: 100, cutoff: 70 },
            criteria: [
                { id: 'C1', titleKey: k('C1_TITLE'), explanationKey: k('C1_TEXT'), blocking: true, points: 0, max: 10 },
                { id: 'C2', titleKey: k('C2_TITLE'), explanationKey: k('C2_TEXT'), blocking: true, points: 0, max: 10 },
                { id: 'C3', titleKey: k('C3_TITLE'), explanationKey: k('C3_TEXT'), blocking: true, points: 20, max: 20 },
                {
                    id: 'C4',
                    titleKey: k('C4_TITLE'),
                    explanationKey: k('C4_TEXT'),
                    blocking: true,
                    points: 15,
                    max: 30,
                    minRequired: 25,
                    subItems: [
                        { labelKey: k('C4_S1'), points: 0, max: 15, noteKey: k('C4_S1_NOTE') },
                        { labelKey: k('C4_S2'), points: 10, max: 10 },
                        { labelKey: k('C4_S3'), points: 5, max: 5 },
                    ],
                },
                { id: 'C5', titleKey: k('C5_TITLE'), explanationKey: k('C5_TEXT'), blocking: false, points: 5, max: 5 },
                {
                    id: 'C6',
                    titleKey: k('C6_TITLE'),
                    explanationKey: k('C6_TEXT'),
                    blocking: false,
                    points: 20,
                    max: 25,
                    minRequired: 20,
                    subItems: [
                        { labelKey: k('C6_S1'), points: 15, max: 15 },
                        { labelKey: k('C6_S2'), points: 5, max: 5 },
                        { labelKey: k('C6_S3'), points: 0, max: 5, noteKey: k('C6_S3_NOTE') },
                    ],
                },
            ],
        };
    }
}

/** Default is the mock; override with `{ provide: CASE_DETAIL_DATA, useClass: ... }` to wire real data. */
export const CASE_DETAIL_DATA = new InjectionToken<CaseDetailDataProvider>('CASE_DETAIL_DATA', {
    providedIn: 'root',
    factory: () => new MockCaseDetailDataProvider(),
});
