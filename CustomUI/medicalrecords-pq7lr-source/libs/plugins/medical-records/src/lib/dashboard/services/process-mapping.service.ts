import { inject, Injectable, signal } from '@angular/core';
import { AppConfigService } from '@alfresco/adf-core';
import { StartProcessCloudService } from '@alfresco/adf-process-services-cloud';
import { catchError, map, Observable, of, shareReplay } from 'rxjs';
import {
    activeProcessMapping,
    activeProcessMappingSource,
    describeProcessMapping,
    ProcessMapping,
    ProcessMappingOverride,
    ProcessMappingSource,
    setActiveProcessMapping,
} from '../definitions/process-mapping';
import { latestDeployedDefinitions, DeployedProcessDefinition } from '../utils/process-definition-options.util';
import { resolveDeployedAppName } from '../utils/dashboard-app-config.util';
import { DashboardDiagnosticsService } from './dashboard-diagnostics.service';

/**
 * Effective process mapping of the session. Defaults live in `definitions/process-mapping.ts`; a
 * layout loaded from the repository may override them (`DashboardLayoutState.processMapping`), and
 * each widget stores its own root/subprocess keys in `processQuery`. Non-widget screens (radication,
 * case view, open tasks) use the effective mapping.
 */
@Injectable({ providedIn: 'root' })
export class ProcessMappingService {
    private readonly diagnostics = inject(DashboardDiagnosticsService);
    private readonly appConfig = inject(AppConfigService);
    private readonly startProcess = inject(StartProcessCloudService);

    readonly mapping = signal<ProcessMapping>(activeProcessMapping());
    readonly source = signal<ProcessMappingSource>(activeProcessMappingSource());

    private definitions$: Observable<DeployedProcessDefinition[]> | null = null;

    /** Applies the override saved with a layout (or resets to the defaults) and records it. */
    applyLayoutOverride(override: ProcessMappingOverride | null | undefined): void {
        const mapping = setActiveProcessMapping(override);
        this.mapping.set(mapping);
        this.source.set(activeProcessMappingSource());
        this.diagnostics.record({
            kind: 'data-plan',
            key: 'process-mapping',
            label: `process mapping · source ${this.source()}`,
            durationMs: 0,
            tables: [
                {
                    title: 'Process mapping',
                    columns: ['role', 'keys / names'],
                    rows: describeProcessMapping(mapping).map((line) => {
                        const [role, ...rest] = line.split(': ');
                        return [role, rest.join(': ')];
                    }),
                },
            ],
        });
    }

    /** Deployed process definitions (latest version per key), shared and cached for the session. */
    deployedDefinitions(): Observable<DeployedProcessDefinition[]> {
        const appName = resolveDeployedAppName(this.appConfig);
        if (!appName) {
            return of([]);
        }
        if (!this.definitions$) {
            this.definitions$ = this.startProcess.getProcessDefinitions(appName).pipe(
                map((definitions) => latestDeployedDefinitions(definitions ?? [])),
                catchError(() => {
                    this.definitions$ = null;
                    return of([] as DeployedProcessDefinition[]);
                }),
                shareReplay({ bufferSize: 1, refCount: false })
            );
        }
        return this.definitions$;
    }
}
