import { CaseDetail, EvaluatedCriterion, ScoreCriterion, ScoreProfile, ScoreSummary } from './case-detail.model';

/** A criterion is met when its points reach `minRequired` (default: its maximum). */
export function isCriterionMet(criterion: ScoreCriterion): boolean {
    return criterion.points >= (criterion.minRequired ?? criterion.max);
}

/**
 * Pure derivation of the demo readiness score. Apt only when the total reaches the cutoff
 * and no blocking criterion is unmet. It is not a coverage decision.
 */
export function summarizeScore(criteria: ScoreCriterion[], profile: ScoreProfile): ScoreSummary {
    const evaluated: EvaluatedCriterion[] = criteria.map((criterion) => ({ ...criterion, met: isCriterionMet(criterion) }));
    const total = Math.min(
        profile.ceiling,
        evaluated.reduce((sum, criterion) => sum + criterion.points, 0)
    );
    const criticalPending = evaluated.filter((criterion) => criterion.blocking && !criterion.met).map((criterion) => criterion.id);
    return {
        total,
        ceiling: profile.ceiling,
        cutoff: profile.cutoff,
        criteria: evaluated,
        criticalPending,
        apt: total >= profile.cutoff && criticalPending.length === 0,
    };
}

export function summarizeCase(detail: CaseDetail): ScoreSummary {
    return summarizeScore(detail.criteria, detail.profile);
}
