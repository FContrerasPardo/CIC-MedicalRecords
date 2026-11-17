import { Injectable, signal } from '@angular/core';
import {
    buildDiagnosticDownload,
    buildVariablesDownload,
    CapturedProcessVariables,
    capturedVariableNames,
    DiagnosticProbe,
    mergeCapturedVariables,
    upsertDiagnosticProbe,
} from '../utils/dashboard-diagnostics.util';

const STORAGE_KEY = 'medicalRecords.showRuntimeDiagnostics';
const MAX_PROBES = 80;
const MAX_CAPTURED_INSTANCES = 200;

/**
 * Technical view (CIC-Fin style): when enabled from the Appearance panel, data services record
 * masked probes of what they fetched (timings, counts, field structure) so mapping problems can be
 * traced and the masked trace downloaded. Disabled by default; the preference is per browser.
 */
@Injectable({ providedIn: 'root' })
export class DashboardDiagnosticsService {
    readonly enabled = signal(this.readPreference());
    readonly probes = signal<DiagnosticProbe[]>([]);
    /** Instances whose process variables were read on screen while the technical view was on. */
    readonly capturedVariables = signal(0);
    /** Variable names seen in the captures, for the download picker. */
    readonly variableNames = signal<string[]>([]);

    private readonly captures = new Map<string, CapturedProcessVariables>();

    private nextId = 1;

    setEnabled(enabled: boolean): void {
        this.enabled.set(enabled);
        try {
            localStorage.setItem(STORAGE_KEY, enabled ? 'true' : 'false');
        } catch {
            // Storage can be blocked (private mode); the toggle still works for this session.
        }
    }

    /** Records a probe only while the technical view is on (no cost otherwise). */
    record(probe: Omit<DiagnosticProbe, 'id' | 'at'>): void {
        if (!this.enabled()) {
            return;
        }
        const entry: DiagnosticProbe = { id: this.nextId++, at: new Date().toISOString(), ...probe };
        this.probes.update((current) => upsertDiagnosticProbe(current, entry, MAX_PROBES));
    }

    /**
     * Keeps the process variables (with values) that the screen read, only while the technical
     * view is on and only in memory, so they can be downloaded to check the mapping.
     */
    captureVariables(processInstanceId: string, variables: Record<string, unknown>, source: CapturedProcessVariables['source']): void {
        if (!this.enabled() || !processInstanceId || !Object.keys(variables).length) {
            return;
        }
        const next: CapturedProcessVariables = { processInstanceId, source, at: new Date().toISOString(), variables };
        const merged = mergeCapturedVariables(this.captures.get(processInstanceId), next);
        this.captures.delete(processInstanceId);
        this.captures.set(processInstanceId, merged);
        if (this.captures.size > MAX_CAPTURED_INSTANCES) {
            const oldest = this.captures.keys().next().value;
            if (oldest !== undefined) {
                this.captures.delete(oldest);
            }
        }
        this.capturedVariables.set(this.captures.size);
        this.variableNames.set(capturedVariableNames([...this.captures.values()]));
    }

    clear(): void {
        this.probes.set([]);
        this.captures.clear();
        this.capturedVariables.set(0);
        this.variableNames.set([]);
    }

    download(): void {
        this.save('diagnostics', buildDiagnosticDownload(this.probes()));
    }

    /** Process variables with values (may contain patient data): local download only. */
    downloadVariables(names?: readonly string[]): void {
        this.save('process-variables', buildVariablesDownload([...this.captures.values()].reverse(), new Date(), names));
    }

    private save(name: string, content: string): void {
        const blob = new Blob([content], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `medical-records-${name}-${new Date().toISOString().replace(/[:.]/g, '-')}.json`;
        link.click();
        URL.revokeObjectURL(url);
    }

    private readPreference(): boolean {
        try {
            return localStorage.getItem(STORAGE_KEY) === 'true';
        } catch {
            return false;
        }
    }
}
