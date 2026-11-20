import { CommonModule } from '@angular/common';
import { Component, EventEmitter, inject, Input, OnInit, Output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { TranslateModule } from '@ngx-translate/core';
import { DashboardProcessListOptions, DashboardWidgetConfig } from '../../definitions/dashboard-widget.model';
import { DASHBOARD_PROCESS_CATALOG } from '../../definitions/dashboard-process-catalog';
import { canonicalProcessKey, normalizeProcessIdentifier } from '../../definitions/process-mapping';
import { ProcessMappingService } from '../../services/process-mapping.service';
import { PROCESS_LIST_DEFAULT_VARIABLES } from '../../utils/dashboard-data-plan.util';
import {
    checkConfiguredProcess,
    ConfiguredProcessCheck,
    DeployedProcessDefinition,
    formatDeployedDefinition,
} from '../../utils/process-definition-options.util';
import { defaultTaskSubprocessKeys, resolveTaskQueryScope } from '../../utils/process-list-scope.util';

/**
 * «Process» section of the open-tasks widget: root process (deployed definitions, saved by key),
 * subprocess tasks (by key) and the variables the list reads. Same selector, labels and
 * equivalent-definition warning as the process widgets' data panel.
 */
@Component({
    selector: 'medical-records-dashboard-builder-process-list-scope',
    standalone: true,
    imports: [CommonModule, FormsModule, TranslateModule],
    templateUrl: './dashboard-builder-process-list-scope.component.html',
    styleUrls: ['./dashboard-builder-process-list-scope.component.scss'],
})
export class DashboardBuilderProcessListScopeComponent implements OnInit {
    @Input({ required: true }) widget!: DashboardWidgetConfig;
    @Output() widgetPatch = new EventEmitter<Partial<DashboardWidgetConfig>>();

    readonly processCatalog = DASHBOARD_PROCESS_CATALOG;
    readonly defaultVariables: readonly string[] = PROCESS_LIST_DEFAULT_VARIABLES;

    deployedDefinitions: DeployedProcessDefinition[] = [];
    variableDraft = '';

    private readonly processMappingService = inject(ProcessMappingService);

    ngOnInit(): void {
        this.processMappingService.deployedDefinitions().subscribe((definitions) => (this.deployedDefinitions = definitions));
    }

    get options(): DashboardProcessListOptions {
        return this.widget.processListOptions ?? {};
    }

    /** Effective root key: the configured one (legacy names resolved) or the mapping root. */
    get selectedRootKey(): string {
        return resolveTaskQueryScope(this.options).root.key;
    }

    /** Root as stored in the widget (empty when the mapping decides). */
    get configuredRootIdentifier(): string {
        return this.options.rootProcessKey?.trim() ?? '';
    }

    get usesMappingRoot(): boolean {
        return !this.configuredRootIdentifier;
    }

    get selectedRootKeyMissing(): boolean {
        const selected = normalizeProcessIdentifier(this.selectedRootKey);
        return !this.deployedDefinitions.some((definition) => normalizeProcessIdentifier(definition.key) === selected);
    }

    /** Warning when the stored root is not a deployed key (legacy name or removed definition). */
    get configuredRootCheck(): ConfiguredProcessCheck | null {
        const configured = this.configuredRootIdentifier;
        if (!configured || !this.deployedDefinitions.length) {
            return null;
        }
        const check = checkConfiguredProcess(configured, this.deployedDefinitions);
        return check.storedByKey ? null : check;
    }

    get includeSubprocessTasks(): boolean {
        return this.options.includeSubprocessTasks !== false;
    }

    /** Subprocess keys offered: the root's subprocesses in the mapping, plus any key stored by the widget. */
    get subprocessOptions(): string[] {
        const offered = defaultTaskSubprocessKeys(this.selectedRootKey);
        const stored = (this.options.includedSubprocessKeys ?? []).map((key) => canonicalProcessKey(key));
        return [...new Set([...offered, ...stored].filter(Boolean))];
    }

    get includedSubprocessKeys(): string[] {
        return resolveTaskQueryScope(this.options).subprocesses.map((identity) => identity.key);
    }

    isSubprocessIncluded(key: string): boolean {
        return this.includedSubprocessKeys.includes(key);
    }

    /** Variables the list reads; the defaults when the widget has none. */
    get configuredVariables(): string[] {
        return (this.options.variables ?? []).map((name) => name.trim()).filter(Boolean);
    }

    get usesDefaultVariables(): boolean {
        return !this.configuredVariables.length;
    }

    get effectiveVariables(): readonly string[] {
        return this.usesDefaultVariables ? this.defaultVariables : this.configuredVariables;
    }

    formatDeployedDefinition(definition: DeployedProcessDefinition): string {
        return formatDeployedDefinition(definition);
    }

    /** Chip label: the deployed definition (name · key · version) or the key. */
    definitionLabel(key: string): string {
        const wanted = normalizeProcessIdentifier(key);
        const deployed = this.deployedDefinitions.find((definition) => normalizeProcessIdentifier(definition.key) === wanted);
        return deployed ? formatDeployedDefinition(deployed) : key;
    }

    onRootChange(key: string): void {
        const wanted = normalizeProcessIdentifier(key);
        const deployed = this.deployedDefinitions.find((definition) => normalizeProcessIdentifier(definition.key) === wanted);
        this.patchOptions({
            rootProcessKey: key,
            rootProcessName: deployed?.name || undefined,
            // The new root offers its own subprocesses (defaults until the user picks).
            includedSubprocessKeys: undefined,
        });
    }

    useEquivalentDefinition(definition: DeployedProcessDefinition): void {
        this.onRootChange(definition.key);
    }

    useMappingRoot(): void {
        this.patchOptions({ rootProcessKey: undefined, rootProcessName: undefined, includedSubprocessKeys: undefined });
    }

    setIncludeSubprocessTasks(include: boolean): void {
        this.patchOptions({ includeSubprocessTasks: include });
    }

    toggleSubprocess(key: string): void {
        const current = this.includedSubprocessKeys;
        const next = current.includes(key) ? current.filter((item) => item !== key) : [...current, key];
        this.patchOptions({ includeSubprocessTasks: true, includedSubprocessKeys: next });
    }

    addVariable(): void {
        const names = this.variableDraft
            .split(',')
            .map((name) => name.trim())
            .filter(Boolean);
        this.variableDraft = '';
        if (!names.length) {
            return;
        }
        this.patchOptions({ variables: [...new Set([...this.effectiveVariables, ...names])] });
    }

    removeVariable(name: string): void {
        const next = this.effectiveVariables.filter((variable) => variable !== name);
        // Removing every variable falls back to the defaults (empty list), as the data plan does.
        this.patchOptions({ variables: next });
    }

    resetVariables(): void {
        this.patchOptions({ variables: [] });
    }

    private patchOptions(patch: Partial<DashboardProcessListOptions>): void {
        const next: DashboardProcessListOptions = { ...this.widget.processListOptions, ...patch };
        for (const key of Object.keys(patch) as Array<keyof DashboardProcessListOptions>) {
            if (patch[key] === undefined) {
                delete next[key];
            }
        }
        this.widgetPatch.emit({ processListOptions: next });
    }
}
