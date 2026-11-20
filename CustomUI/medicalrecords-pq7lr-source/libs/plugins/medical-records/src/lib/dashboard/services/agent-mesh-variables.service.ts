import { inject, Injectable } from '@angular/core';
import { AppConfigService } from '@alfresco/adf-core';
import { AdfHttpClient } from '@alfresco/adf-core/api';
import { forkJoin, from, map, Observable, of, switchMap } from 'rxjs';
import { resolveDeployedAppName } from '../utils/dashboard-app-config.util';
import {
    AGENT_MESH_RESULT_VARIABLES,
    ChildProcessCandidate,
    ChildTaskCandidate,
    mergeProcessVariables,
    MergedProcessVariables,
    openTasks,
    selectLatestChildInstance,
} from '../utils/agent-mesh-variables.util';
import { DashboardDiagnosticsService } from './dashboard-diagnostics.service';
import { ProcessVariablesService } from './process-variables.service';

interface QueryList<T> {
    list?: { entries?: Array<{ entry?: T }> };
}

export interface AgentMeshChild {
    id: string;
    status: string | null;
    startDate: string | null;
    /** Open user tasks of the child ("Validate Rules", "Analisys"). */
    openTasks: Array<{ id: string; name: string | null; status: string | null }>;
}

export interface AccountVariablesRead extends MergedProcessVariables {
    /** Root instance answered (the variables service answers {} on failure). */
    rootRead: boolean;
    /** AgentMesh child, when it was looked up and found. */
    agentMesh: AgentMeshChild | null;
}

/** Child lookups for the same root are shared for this long (Control Center rows, several widgets). */
const CHILD_CACHE_TTL_MS = 30_000;
const CHILD_CACHE_LIMIT = 200;

/**
 * Process variables of an account (root `medical-records` instance) merged with those of its running
 * "AgentMesh" child, whose results reach the root only when the call activity completes. Uses the
 * same query service as the radication progress poll (`process-instances?parentId=` and
 * `process-instances/{id}/tasks`) and ProcessVariablesService (shared cache) for the variables.
 */
@Injectable({ providedIn: 'root' })
export class AgentMeshVariablesService {
    private readonly http = inject(AdfHttpClient);
    private readonly appConfig = inject(AppConfigService);
    private readonly processVariables = inject(ProcessVariablesService);
    private readonly diagnostics = inject(DashboardDiagnosticsService);
    private readonly childCache = new Map<string, { at: number; value: Promise<AgentMeshChild | null> }>();

    /**
     * Root variables and, with `includeChild`, the AgentMesh child (latest instance) with its open
     * tasks and variables merged under the root ones. `fresh` skips the short caches (polling).
     */
    readAccountVariables(rootProcessInstanceId: string, options: { fresh?: boolean; includeChild?: boolean } = {}): Observable<AccountVariablesRead> {
        const root$ = this.processVariables.fetchVariables(rootProcessInstanceId, { fresh: options.fresh });
        if (!options.includeChild || !rootProcessInstanceId) {
            return root$.pipe(map((root) => ({ ...mergeProcessVariables(root, null), rootRead: Object.keys(root).length > 0, agentMesh: null })));
        }
        const started = Date.now();
        return forkJoin([root$, from(this.findAgentMesh(rootProcessInstanceId, !!options.fresh))]).pipe(
            switchMap(([root, child]) =>
                (child ? this.processVariables.fetchVariables(child.id, { fresh: options.fresh }) : of({} as Record<string, unknown>)).pipe(
                    map((childVariables): AccountVariablesRead => {
                        const merged = mergeProcessVariables(root, childVariables);
                        this.recordProbe(rootProcessInstanceId, child, merged, Date.now() - started);
                        return { ...merged, rootRead: Object.keys(root).length > 0, agentMesh: child };
                    })
                )
            )
        );
    }

    /** Latest AgentMesh child of a root instance with its open tasks; null when none or on failure. */
    findAgentMesh(rootProcessInstanceId: string, fresh = false): Promise<AgentMeshChild | null> {
        const cached = this.childCache.get(rootProcessInstanceId);
        if (cached && !fresh && Date.now() - cached.at < CHILD_CACHE_TTL_MS) {
            return cached.value;
        }
        const value = this.lookupAgentMesh(rootProcessInstanceId).catch(() => null);
        this.childCache.delete(rootProcessInstanceId);
        if (this.childCache.size >= CHILD_CACHE_LIMIT) {
            const oldest = this.childCache.keys().next().value;
            if (oldest !== undefined) {
                this.childCache.delete(oldest);
            }
        }
        this.childCache.set(rootProcessInstanceId, { at: Date.now(), value });
        return value;
    }

    private async lookupAgentMesh(rootProcessInstanceId: string): Promise<AgentMeshChild | null> {
        const base = this.queryBaseUrl();
        if (!base) {
            return null;
        }
        const children = (await this.http
            .get<QueryList<ChildProcessCandidate>>(`${base}/process-instances?parentId=${encodeURIComponent(rootProcessInstanceId)}&maxItems=50`)
            .catch(() => null)) as QueryList<ChildProcessCandidate> | null;
        const child = selectLatestChildInstance(entries(children));
        if (!child?.id) {
            return null;
        }
        const tasks = (await this.http
            .get<QueryList<ChildTaskCandidate>>(`${base}/process-instances/${encodeURIComponent(child.id)}/tasks?maxItems=50`)
            .catch(() => null)) as QueryList<ChildTaskCandidate> | null;
        return {
            id: child.id,
            status: child.status ?? null,
            startDate: child.startDate ?? null,
            openTasks: openTasks(entries(tasks)).map((task) => ({ id: String(task.id), name: task.name ?? null, status: task.status ?? null })),
        };
    }

    /** Technical view: which instance each agent variable came from. */
    private recordProbe(rootId: string, child: AgentMeshChild | null, merged: MergedProcessVariables, durationMs: number): void {
        const rows = AGENT_MESH_RESULT_VARIABLES.map((name) => [
            name,
            name in merged.variables ? (merged.origins[name] === 'child' ? `AgentMesh ${child?.id?.slice(0, 8) ?? '?'}…` : `root ${rootId.slice(0, 8)}…`) : '—',
        ]);
        const fromChild = Object.values(merged.origins).filter((origin) => origin === 'child').length;
        this.diagnostics.record({
            kind: 'process-variables',
            key: `agent-mesh:${rootId}`,
            label: child
                ? `account · AgentMesh ${child.id.slice(0, 8)}… ${child.status ?? '?'} · ${child.openTasks.length} open task(s) · ${fromChild} variable(s) from AgentMesh`
                : 'account · no AgentMesh child found · root variables only',
            durationMs,
            rows: fromChild,
            tables: [
                {
                    title: 'Variable origin (root wins unless empty)',
                    request: `GET query/v1/process-instances?parentId=${rootId.slice(0, 8)}… + /tasks + /variables`,
                    columns: ['variable', 'instance'],
                    rows,
                },
                ...(child?.openTasks.length
                    ? [{ title: 'AgentMesh open tasks', columns: ['task', 'status'], rows: child.openTasks.map((task) => [task.name ?? '?', task.status ?? '?']) }]
                    : []),
            ],
        });
    }

    private queryBaseUrl(): string {
        const appName = resolveDeployedAppName(this.appConfig);
        if (!appName) {
            return '';
        }
        const host = String(this.appConfig.get('bpmHost', '')).replace(/\/+$/, '');
        return `${host}/${appName}/query/v1`;
    }
}

function entries<T>(list: QueryList<T> | null): T[] {
    return (list?.list?.entries ?? []).map((item) => item.entry).filter((item): item is T => !!item);
}

