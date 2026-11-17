import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { DashboardWidgetConfig } from '../definitions/dashboard-widget.model';
import { buildDataPlan, DataPlan } from '../utils/dashboard-data-plan.util';
import { DashboardDiagnosticsService } from './dashboard-diagnostics.service';

/** Shared rows of one plan execution (one date range). */
export interface DataPlanDataset {
    rows: Array<Record<string, unknown>>;
    totalCount: number;
    error?: string;
    /** How variables were obtained: none needed, inline in the process list, or per instance. */
    strategy: 'none' | 'inline' | 'per-instance';
    enriched: number;
}

/** Plan executions are reused for this long; a reload of the dashboard after it fetches fresh data. */
const EXECUTION_TTL_MS = 30_000;

/**
 * Holds the data plan of the layout on screen (built from the widgets' declared needs) and the
 * shared executions. The process data provider executes the plan and serves every covered widget
 * from the same rows, so the layout runs one process query instead of one per widget.
 */
@Injectable({ providedIn: 'root' })
export class DashboardDataPlanService {
    private readonly diagnostics = inject(DashboardDiagnosticsService);
    private current: DataPlan | null = null;
    private readonly executions = new Map<string, { at: number; dataset$: Observable<DataPlanDataset> }>();
    /** Learned at runtime: whether the Query service returns requested variables inline. */
    inlineVariablesSupported: boolean | null = null;

    get plan(): DataPlan | null {
        return this.current;
    }

    /** Rebuilds the plan from the widgets placed in the layout (view or builder). */
    setWidgets(widgets: ReadonlyArray<DashboardWidgetConfig>): void {
        const next = buildDataPlan(widgets);
        if (next?.signature === this.current?.signature) {
            return;
        }
        this.current = next;
        this.executions.clear();
        if (next) {
            const variables = [...new Set(next.needs.flatMap((need) => need.variables))].sort();
            this.diagnostics.record({
                kind: 'data-plan',
                label: `plan · ${next.needs.length} widgets · ${next.definitions.join(', ')} · ${
                    next.statuses?.join('+') ?? 'ALL'
                } · vars: ${variables.join(', ') || '—'}`,
                durationMs: 0,
            });
        }
    }

    execution(key: string): Observable<DataPlanDataset> | null {
        const entry = this.executions.get(key);
        return entry && Date.now() - entry.at < EXECUTION_TTL_MS ? entry.dataset$ : null;
    }

    storeExecution(key: string, dataset$: Observable<DataPlanDataset>): void {
        this.executions.set(key, { at: Date.now(), dataset$ });
    }
}
