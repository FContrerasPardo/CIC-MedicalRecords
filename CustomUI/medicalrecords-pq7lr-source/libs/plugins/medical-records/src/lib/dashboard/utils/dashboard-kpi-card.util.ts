/** Pure KPI-card helpers (no Angular imports) so they can be unit tested in isolation. */

/** Where the shown value really came from. `error` = query failed and the card fell back to demo. */
export type KpiOriginState = 'live' | 'demo' | 'error';

export type KpiAccent = 'neutral' | 'ok' | 'warn' | 'danger';

export interface KpiThresholds {
    /** Value at which the card turns to the warning accent. */
    warnAt?: number;
    /** Value at which the card turns to the danger accent. */
    dangerAt?: number;
    /** `higher-is-worse` (default): value >= threshold escalates. `lower-is-worse`: value <= threshold escalates. */
    direction?: 'higher-is-worse' | 'lower-is-worse';
}

/**
 * Honest origin of a metric value. Any error flag wins over the source, because the
 * registry falls back to `demoValue` silently when a query fails.
 */
export function resolveKpiOrigin(source: string | undefined, error?: string | null): KpiOriginState {
    if (error) {
        return 'error';
    }
    return !source || source === 'demo' ? 'demo' : 'live';
}

/** Parses a displayed metric ("12", "87,5%", "—") into a number, or null when it is not numeric. */
export function parseKpiNumber(raw: string | null | undefined): number | null {
    if (raw == null) {
        return null;
    }
    const normalized = raw.replace(/\s/g, '').replace(',', '.').replace(/[^\d.-]/g, '');
    if (!normalized || normalized === '-' || normalized === '.') {
        return null;
    }
    const parsed = Number.parseFloat(normalized);
    return Number.isFinite(parsed) ? parsed : null;
}

/** Color accent for a value against optional thresholds. Missing value or thresholds → neutral. */
export function resolveKpiAccent(value: number | null, thresholds?: KpiThresholds | null): KpiAccent {
    if (value == null || !thresholds || (thresholds.warnAt == null && thresholds.dangerAt == null)) {
        return 'neutral';
    }
    const worse = (threshold: number | undefined): boolean =>
        threshold != null &&
        (thresholds.direction === 'lower-is-worse' ? value <= threshold : value >= threshold);

    if (worse(thresholds.dangerAt)) {
        return 'danger';
    }
    if (worse(thresholds.warnAt)) {
        return 'warn';
    }
    return 'ok';
}
