import { buildChartSeries } from '../mappers/dashboard-chart.mapper';
import { buildChartProgressRows, chartHeadlineVariation } from './dashboard-chart-progress.util';
import { aggregateBySlices, groupThousands } from './dashboard-numeric-aggregation.util';

// Synthetic data only.
describe('chart extensions for the reconciliation and audit indicators', () => {
    describe('buildChartSeries', () => {
        const rows = [
            { calc_provider: 'Clinica Uno', calc_auditFinding: '1', calc_auditReasons: '["A","B"]' },
            { calc_provider: 'Clinica Uno', calc_auditFinding: '0', calc_auditReasons: '["A"]' },
            { calc_provider: 'Centro Dos', calc_auditFinding: '1', calc_auditReasons: '[]' },
        ];

        it('averages the value field per bucket and returns counts and sums', () => {
            const series = buildChartSeries(rows, 'calc_provider', 'category', { yAggregation: 'avg', yField: 'calc_auditFinding' });
            expect(series.labels).toEqual(['Centro Dos', 'Clinica Uno']);
            expect(series.values).toEqual([1, 0.5]);
            expect(series.counts).toEqual([1, 2]);
            expect(series.sums).toEqual([1, 1]);
        });

        it('counts a list argument once per value when multi-value is on', () => {
            const series = buildChartSeries(rows, 'calc_auditReasons', 'category', { argumentMultiValue: true });
            expect(series.labels).toEqual(['A', 'B']);
            expect(series.values).toEqual([2, 1]);
        });
    });

    describe('buildChartProgressRows', () => {
        it('reads x/y · % for a percent average and colours it by threshold', () => {
            const rows = buildChartProgressRows(
                { labels: ['Clinica Uno'], values: [0.5], counts: [4], sums: [2], aggregation: 'avg' },
                'percent',
                { warnAt: 20, dangerAt: 40 }
            );
            expect(rows[0].display).toBe('2/4 · 50%');
            expect(rows[0].width).toBe(50);
            expect(rows[0].accent).toBe('danger');
        });

        it('reads value · share % for counts', () => {
            const rows = buildChartProgressRows({ labels: ['A', 'B'], values: [3, 1], aggregation: 'count' });
            expect(rows.map((row) => row.display)).toEqual(['3 · 75%', '1 · 25%']);
            expect(rows[1].accent).toBe('neutral');
        });
    });

    describe('aggregateBySlices', () => {
        it('aggregates the field per equal slice of the range, null where empty', () => {
            const range = { start: new Date('2026-11-01T00:00:00Z'), end: new Date('2026-11-04T00:00:00Z') };
            const rows = [
                { startDate: '2026-11-01T06:00:00Z', calc_reconciliationHours: '10' },
                { startDate: '2026-11-01T12:00:00Z', calc_reconciliationHours: '20' },
                { startDate: '2026-11-03T12:00:00Z', calc_reconciliationHours: '6' },
                { startDate: '2026-11-02T12:00:00Z', calc_reconciliationHours: '' },
            ];
            expect(aggregateBySlices(rows, 'calc_reconciliationHours', undefined, 'avg', 'startDate', range, 3)).toEqual([15, null, 6]);
        });
    });
});

describe('chartHeadlineVariation', () => {
    it('compares the last bucket with the previous one', () => {
        expect(chartHeadlineVariation([10, 20, 16], true)).toEqual({ percent: -20, direction: 'down', positive: true });
        expect(chartHeadlineVariation([10, 12])?.positive).toBe(true);
    });

    it('is null without two buckets or with a zero previous bucket', () => {
        expect(chartHeadlineVariation([5])).toBeNull();
        expect(chartHeadlineVariation([0, 5])).toBeNull();
    });
});

describe('amount formatting and bucket order', () => {
    it('groups thousands with non-breaking spaces', () => {
        expect(groupThousands(1234567.5)).toBe('1 234 567.5');
        expect(groupThousands(-950)).toBe('-950');
    });

    it('orders category buckets by label when asked', () => {
        const rows = [{ stage: 'S_2' }, { stage: 'S_1' }, { stage: 'S_2' }];
        expect(buildChartSeries(rows, 'stage', 'category', { bucketOrder: 'label' }).labels).toEqual(['S_1', 'S_2']);
        expect(buildChartSeries(rows, 'stage', 'category', {}).labels).toEqual(['S_2', 'S_1']);
    });
});
