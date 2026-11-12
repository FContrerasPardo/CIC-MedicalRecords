import { parseKpiNumber, resolveKpiAccent, resolveKpiOrigin } from './dashboard-kpi-card.util';

describe('dashboard-kpi-card.util', () => {
    describe('resolveKpiOrigin', () => {
        it('reports live for a real source without error', () => {
            expect(resolveKpiOrigin('process')).toBe('live');
            expect(resolveKpiOrigin('content', undefined)).toBe('live');
        });

        it('reports demo for demo or missing source', () => {
            expect(resolveKpiOrigin('demo')).toBe('demo');
            expect(resolveKpiOrigin(undefined)).toBe('demo');
        });

        it('reports error when the query fell back to demo', () => {
            expect(resolveKpiOrigin('demo', 'process-query-failed')).toBe('error');
            expect(resolveKpiOrigin('process', 'process-period-unavailable')).toBe('error');
        });
    });

    describe('parseKpiNumber', () => {
        it('parses plain, decimal-comma and percent values', () => {
            expect(parseKpiNumber('12')).toBe(12);
            expect(parseKpiNumber('87,5%')).toBe(87.5);
            expect(parseKpiNumber('1 200')).toBe(1200);
        });

        it('returns null for non numeric placeholders', () => {
            expect(parseKpiNumber('—')).toBeNull();
            expect(parseKpiNumber('')).toBeNull();
            expect(parseKpiNumber(undefined)).toBeNull();
        });
    });

    describe('resolveKpiAccent', () => {
        it('is neutral without value or thresholds', () => {
            expect(resolveKpiAccent(null, { warnAt: 1 })).toBe('neutral');
            expect(resolveKpiAccent(5, undefined)).toBe('neutral');
            expect(resolveKpiAccent(5, {})).toBe('neutral');
        });

        it('escalates when higher is worse (default)', () => {
            const t = { warnAt: 5, dangerAt: 10 };
            expect(resolveKpiAccent(4, t)).toBe('ok');
            expect(resolveKpiAccent(5, t)).toBe('warn');
            expect(resolveKpiAccent(10, t)).toBe('danger');
        });

        it('escalates when lower is worse', () => {
            const t = { warnAt: 80, dangerAt: 60, direction: 'lower-is-worse' as const };
            expect(resolveKpiAccent(90, t)).toBe('ok');
            expect(resolveKpiAccent(75, t)).toBe('warn');
            expect(resolveKpiAccent(60, t)).toBe('danger');
        });
    });
});
