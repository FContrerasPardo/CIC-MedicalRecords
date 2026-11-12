import { ScoreCriterion, ScoreProfile } from './case-detail.model';
import { MockCaseDetailDataProvider } from './case-detail-data.provider';
import { isCriterionMet, summarizeCase, summarizeScore } from './case-score';

const profile: ScoreProfile = { profileId: 'p', engineVersion: 'v', ceiling: 100, cutoff: 70 };
const criterion = (overrides: Partial<ScoreCriterion>): ScoreCriterion => ({
    id: 'X',
    titleKey: 't',
    explanationKey: 'e',
    blocking: false,
    points: 0,
    max: 10,
    ...overrides,
});

describe('case score', () => {
    it('uses minRequired when present, else the maximum', () => {
        expect(isCriterionMet(criterion({ points: 15, max: 30, minRequired: 25 }))).toBe(false);
        expect(isCriterionMet(criterion({ points: 25, max: 30, minRequired: 25 }))).toBe(true);
        expect(isCriterionMet(criterion({ points: 9, max: 10 }))).toBe(false);
        expect(isCriterionMet(criterion({ points: 10, max: 10 }))).toBe(true);
    });

    it('is not apt when a blocking criterion is unmet even above the cutoff', () => {
        const summary = summarizeScore(
            [criterion({ id: 'A', blocking: true, points: 0, max: 10 }), criterion({ id: 'B', points: 90, max: 90 })],
            profile
        );
        expect(summary.total).toBe(90);
        expect(summary.criticalPending).toEqual(['A']);
        expect(summary.apt).toBe(false);
    });

    it('is apt when above the cutoff with no blocking gap', () => {
        const summary = summarizeScore([criterion({ id: 'A', blocking: true, points: 80, max: 80 })], profile);
        expect(summary.apt).toBe(true);
    });

    it('caps the total at the ceiling', () => {
        expect(summarizeScore([criterion({ points: 150, max: 150 })], profile).total).toBe(100);
    });

    it('reproduces the demo case: 60/100, not apt, pending C1, C2, C4', () => {
        const summary = summarizeCase(new MockCaseDetailDataProvider().getCase());
        expect(summary.total).toBe(60);
        expect(summary.apt).toBe(false);
        expect(summary.criticalPending).toEqual(['C1', 'C2', 'C4']);
    });
});
