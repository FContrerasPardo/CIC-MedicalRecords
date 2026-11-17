import { inject, Injectable } from '@angular/core';
import { AppConfigService } from '@alfresco/adf-core';
import { AdfHttpClient } from '@alfresco/adf-core/api';
import { catchError, from, map, Observable, of } from 'rxjs';
import { resolveDeployedAppName } from '../../../dashboard/utils/dashboard-app-config.util';
import { InvoiceAuditState, parseAuditState } from './audit-findings.util';

/** Process variable holding findings, proposed glosas and the communication status per invoice. */
export const INVOICE_AUDIT_STATE_VARIABLE = 'invoiceAuditState';
/** Written by the provider pre-filing (#146): comments the provider left on the account. */
export const PROVIDER_FINDING_COMMENTS_VARIABLE = 'providerFindingComments';

/** `process`: saved in the process variable. `simulated`: Automate refused it; kept in this browser only. */
export type AuditPersistenceMode = 'process' | 'simulated';

export interface LoadedAuditState {
    state: InvoiceAuditState;
    mode: AuditPersistenceMode;
}

const LOCAL_PREFIX = 'mr.invoiceAuditState.';

/**
 * Persists the invoice audit workspace. It writes the process variable through the Automate
 * runtime bundle (`PUT rb/v1/process-instances/{id}/variables`, SetProcessVariablesPayload), the
 * same host/app resolution as the bulk task service. When that is not possible (variable not
 * declared in the deployed process, no permission, offline demo) it falls back to a SIMULATED
 * store in localStorage and says so, so the UI can label it.
 */
@Injectable({ providedIn: 'root' })
export class InvoiceAuditStoreService {
    private readonly http = inject(AdfHttpClient);
    private readonly appConfig = inject(AppConfigService);

    /** The simulated copy wins: it is only written after the process variable was refused. */
    load(processInstanceId: string | null, variables: Record<string, unknown>): LoadedAuditState {
        const local = processInstanceId ? this.readLocal(processInstanceId) : null;
        if (local) {
            return { state: local, mode: 'simulated' };
        }
        return { state: parseAuditState(variables[INVOICE_AUDIT_STATE_VARIABLE]), mode: 'process' };
    }

    save(processInstanceId: string | null, state: InvoiceAuditState): Observable<AuditPersistenceMode> {
        const appName = resolveDeployedAppName(this.appConfig);
        if (!processInstanceId || !appName) {
            this.writeLocal(processInstanceId ?? 'demo', state);
            return of('simulated');
        }
        const host = String(this.appConfig.get('bpmHost', '')).replace(/\/+$/, '');
        const url = `${host}/${appName}/rb/v1/process-instances/${encodeURIComponent(processInstanceId)}/variables`;
        const bodyParam = {
            payloadType: 'SetProcessVariablesPayload',
            processInstanceId,
            variables: { [INVOICE_AUDIT_STATE_VARIABLE]: JSON.stringify(state) },
        };
        return from(this.http.put(url, { bodyParam })).pipe(
            map(() => {
                this.clearLocal(processInstanceId);
                return 'process' as AuditPersistenceMode;
            }),
            catchError(() => {
                this.writeLocal(processInstanceId, state);
                return of('simulated' as AuditPersistenceMode);
            })
        );
    }

    private readLocal(id: string): InvoiceAuditState | null {
        try {
            const raw = globalThis.localStorage?.getItem(LOCAL_PREFIX + id);
            return raw ? parseAuditState(raw) : null;
        } catch {
            return null;
        }
    }

    private writeLocal(id: string, state: InvoiceAuditState): void {
        try {
            globalThis.localStorage?.setItem(LOCAL_PREFIX + id, JSON.stringify(state));
        } catch {
            // Storage unavailable: the state lives in memory for this view only.
        }
    }

    private clearLocal(id: string): void {
        try {
            globalThis.localStorage?.removeItem(LOCAL_PREFIX + id);
        } catch {
            // Nothing to clear.
        }
    }
}
