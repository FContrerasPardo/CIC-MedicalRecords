/**
 * DEMO ONLY. Types for the case-detail view. There is no backend contract yet:
 * all data comes from a mock provider with synthetic values.
 * The readiness score is informational; the AI neither decides nor recommends coverage.
 */

export interface CriterionSubItem {
    /** i18n key of the sub-item label. */
    labelKey: string;
    points: number;
    max: number;
    /** Optional i18n key of the evidence note. */
    noteKey?: string;
}

export interface ScoreCriterion {
    id: string;
    /** i18n key of the criterion title. */
    titleKey: string;
    /** i18n key of the one-line explanation. */
    explanationKey: string;
    blocking: boolean;
    points: number;
    max: number;
    /** Minimum points to count as met. Defaults to `max`. */
    minRequired?: number;
    subItems?: CriterionSubItem[];
}

export interface ScoreProfile {
    profileId: string;
    engineVersion: string;
    ceiling: number;
    cutoff: number;
}

export interface EvaluatedCriterion extends ScoreCriterion {
    met: boolean;
}

export interface ScoreSummary {
    total: number;
    ceiling: number;
    cutoff: number;
    criteria: EvaluatedCriterion[];
    /** Ids of unmet blocking criteria. */
    criticalPending: string[];
    apt: boolean;
}

export interface LinkedRequest {
    code: string;
    /** i18n key of the request type. */
    typeKey: string;
    /** i18n key of the request status. */
    statusKey: string;
    owner: string;
    /** `null` means the source did not provide an SLA. */
    sla: string | null;
    /** i18n key of the treatment / procedure (demo text). */
    treatmentKey: string;
    /** `null` means not reported. */
    requestingDoctor: string | null;
    /** ISO date-time of creation. */
    createdAt: string;
    documentsCount: number;
    submissionsCount: number;
    protocol: string | null;
    /** `null` means no decision recorded. */
    decisionKey: string | null;
    openPendings: number;
}

export type DocumentClassification = 'attached' | 'form' | 'missing' | 'transcribed';

export interface CaseDocument {
    /** i18n keys for category, classification label, origin and reference; names are literal synthetic data. */
    categoryKey: string;
    /** Literal file name, or an i18n key for a label (missing or transcribed items). */
    name?: string;
    nameKey?: string;
    classification: DocumentClassification;
    classificationKey: string;
    /** ISO date or `null`. */
    date: string | null;
    originKey: string;
    referenceKey: string;
}

export interface CaseEvent {
    id: string;
    date: string;
    actionKey: string;
    owner: string;
    originKey: string;
    changeKey: string;
}

export interface CaseDetail {
    code: string;
    patientName: string;
    /** i18n key of the diagnosis. */
    diagnosisKey: string;
    /** i18n key of the case status. */
    statusKey: string;
    linkedRequests: LinkedRequest[];
    pendingComplements: number;
    openDivergences: number;
    documents: CaseDocument[];
    /** Empty in the demo. */
    timelineEvents: CaseEvent[];
    auditRecords: CaseEvent[];
    profile: ScoreProfile;
    criteria: ScoreCriterion[];
}
