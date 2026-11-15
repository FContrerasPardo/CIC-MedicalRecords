import { DecimalPipe, NgFor, NgIf } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { TranslateModule } from '@ngx-translate/core';
import { DashboardDiagnosticsService } from '../../services/dashboard-diagnostics.service';
import { DiagnosticProbe } from '../../utils/dashboard-diagnostics.util';

/** Floating technical view: masked trace of what the dashboard fetched (enabled from Appearance). */
@Component({
    selector: 'medical-records-dashboard-diagnostics-panel',
    standalone: true,
    imports: [NgFor, NgIf, DecimalPipe, TranslateModule],
    templateUrl: './dashboard-diagnostics-panel.component.html',
    styleUrls: ['./dashboard-diagnostics-panel.component.scss'],
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DashboardDiagnosticsPanelComponent {
    readonly diagnostics = inject(DashboardDiagnosticsService);
    readonly expandedId = signal<number | null>(null);
    readonly collapsed = signal(false);
    /** Variable picker: download only the chosen variables (batchState alone can weigh MBs). */
    readonly pickerOpen = signal(false);
    readonly selectedNames = signal<ReadonlySet<string>>(new Set());

    toggleVariable(name: string): void {
        const next = new Set(this.selectedNames());
        if (next.has(name)) {
            next.delete(name);
        } else {
            next.add(name);
        }
        this.selectedNames.set(next);
    }

    selectAllVariables(selected: boolean): void {
        this.selectedNames.set(new Set(selected ? this.diagnostics.variableNames() : []));
    }

    downloadSelectedVariables(): void {
        const names = this.diagnostics.variableNames().filter((name) => this.selectedNames().has(name));
        if (names.length) {
            this.diagnostics.downloadVariables(names);
        }
    }

    selectedCount(): number {
        return this.diagnostics.variableNames().filter((name) => this.selectedNames().has(name)).length;
    }

    toggleProbe(probe: DiagnosticProbe): void {
        this.expandedId.set(this.expandedId() === probe.id ? null : probe.id);
    }

    trackProbe(_index: number, probe: DiagnosticProbe): number {
        return probe.id;
    }

    close(): void {
        this.diagnostics.setEnabled(false);
    }
}
