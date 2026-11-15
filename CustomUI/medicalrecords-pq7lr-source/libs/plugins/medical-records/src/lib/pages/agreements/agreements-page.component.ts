import { CommonModule } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { ChecklistLoadResult, DocumentationChecklistRepositoryService } from './checklist/documentation-checklist-repository.service';
import {
    addUniqueValue,
    ChecklistConsumer,
    ChecklistIssue,
    ChecklistRisk,
    ChecklistRule,
    checklistDocumentCatalogue,
    createChecklistRule,
    DocumentationChecklist,
    duplicateChecklistRule,
    serializeDocumentationChecklist,
    toDocumentationRules,
    validateChecklist,
} from './checklist/documentation-checklist.util';

type RiskFilter = 'ALL' | ChecklistRisk;
type RuleListKey = 'requiredDocuments' | 'procedureCodes' | 'serviceCategories';

const I18N = 'MEDICAL_RECORDS.AGREEMENTS';

/**
 * Agreements (convenios) in the unified UI. First section: the documentary checklist, read from
 * Appdata instead of the `documentationRules` process variable, with a viewer and an editor.
 * The file is only written when the user publishes or saves.
 */
@Component({
    selector: 'medical-records-agreements-page',
    standalone: true,
    imports: [CommonModule, FormsModule, RouterModule, TranslateModule],
    templateUrl: './agreements-page.component.html',
    styleUrls: ['./agreements-page.component.scss'],
})
export class AgreementsPageComponent implements OnInit {
    private readonly repository = inject(DocumentationChecklistRepositoryService);

    readonly i18n = I18N;
    readonly riskFilters: RiskFilter[] = ['ALL', 'HIGH', 'MEDIUM', 'LOW'];
    readonly risks: ChecklistRisk[] = ['HIGH', 'MEDIUM', 'LOW'];
    readonly consumerOptions: ChecklistConsumer[] = ['validation', 'agent'];

    loading = true;
    publishing = false;
    publishError = false;
    result: ChecklistLoadResult | null = null;
    search = '';
    riskFilter: RiskFilter = 'ALL';

    visibleRules: ChecklistRule[] = [];
    catalogue: Array<{ name: string; rules: number }> = [];

    /** Editor: a copy of the checklist; nothing is written until it is saved. */
    draft: DocumentationChecklist | null = null;
    issues: ChecklistIssue[] = [];
    saveAttempted = false;

    get checklist(): DocumentationChecklist | null {
        return this.result?.checklist ?? null;
    }

    get editing(): boolean {
        return !!this.draft;
    }

    get filePath(): string {
        return this.repository.filePath;
    }

    get canPublish(): boolean {
        return !!this.result && this.result.source !== 'appdata' && !this.publishing;
    }

    ngOnInit(): void {
        void this.load();
    }

    async load(): Promise<void> {
        this.loading = true;
        this.result = await this.repository.load();
        this.loading = false;
        this.rebuild();
    }

    /** Writes the checklist shown (seed or repaired file) to Appdata so it becomes the editable source. */
    async publish(): Promise<void> {
        if (this.result && this.canPublish) {
            await this.write(this.result.checklist);
        }
    }

    startEdit(): void {
        if (!this.checklist) {
            return;
        }
        this.draft = structuredClone(this.checklist);
        this.saveAttempted = false;
        this.publishError = false;
        this.validate();
    }

    cancelEdit(): void {
        this.draft = null;
        this.issues = [];
    }

    async saveDraft(): Promise<void> {
        if (!this.draft) {
            return;
        }
        this.saveAttempted = true;
        this.validate();
        if (this.issues.length) {
            return;
        }
        if (await this.write(this.draft)) {
            this.draft = null;
        }
    }

    validate(): void {
        this.issues = this.draft ? validateChecklist(this.draft) : [];
    }

    issuesFor(ruleIndex: number | null): ChecklistIssue[] {
        return this.issues.filter((issue) => issue.ruleIndex === ruleIndex);
    }

    addRule(): void {
        if (this.draft) {
            this.draft.rules = [...this.draft.rules, createChecklistRule(this.draft.rules)];
            this.validate();
        }
    }

    duplicateRule(index: number): void {
        if (this.draft) {
            const copy = duplicateChecklistRule(this.draft.rules[index], this.draft.rules);
            this.draft.rules = [...this.draft.rules.slice(0, index + 1), copy, ...this.draft.rules.slice(index + 1)];
            this.validate();
        }
    }

    removeRule(index: number): void {
        if (this.draft) {
            this.draft.rules = this.draft.rules.filter((_rule, position) => position !== index);
            this.validate();
        }
    }

    moveRule(index: number, offset: -1 | 1): void {
        const target = index + offset;
        if (!this.draft || target < 0 || target >= this.draft.rules.length) {
            return;
        }
        const rules = [...this.draft.rules];
        [rules[index], rules[target]] = [rules[target], rules[index]];
        this.draft.rules = rules;
        this.validate();
    }

    listOf(rule: ChecklistRule, key: RuleListKey): string[] {
        return key === 'requiredDocuments' ? rule.requiredDocuments : rule.appliesTo[key];
    }

    /** Enter or the add button: adds the typed value to the rule's list and clears the input. */
    addValue(rule: ChecklistRule, key: RuleListKey, input: HTMLInputElement, event?: Event): void {
        event?.preventDefault();
        const next = addUniqueValue(this.listOf(rule, key), input.value);
        this.setList(rule, key, next);
        input.value = '';
    }

    removeValue(rule: ChecklistRule, key: RuleListKey, index: number): void {
        this.setList(
            rule,
            key,
            this.listOf(rule, key).filter((_value, position) => position !== index)
        );
    }

    toggleConsumer(rule: ChecklistRule, consumer: ChecklistConsumer): void {
        rule.consumers = rule.consumers.includes(consumer)
            ? rule.consumers.filter((entry) => entry !== consumer)
            : this.consumerOptions.filter((entry) => entry === consumer || rule.consumers.includes(entry));
        this.validate();
    }

    onSearch(value: string): void {
        this.search = value;
        this.rebuild();
    }

    setRiskFilter(filter: RiskFilter): void {
        this.riskFilter = filter;
        this.rebuild();
    }

    riskCount(filter: RiskFilter): number {
        const rules = this.checklist?.rules ?? [];
        return filter === 'ALL' ? rules.length : rules.filter((rule) => rule.riskLevelIfMissing === filter).length;
    }

    consumerCount(consumer: ChecklistConsumer): number {
        return (this.checklist?.rules ?? []).filter((rule) => rule.enabled && rule.consumers.includes(consumer)).length;
    }

    downloadChecklist(): void {
        if (this.checklist) {
            this.save('documentation-checklist', serializeDocumentationChecklist(this.checklist));
        }
    }

    /** The payload the documentation agent reads today (`documentationRules`). */
    downloadAgentRules(): void {
        if (this.checklist) {
            this.save('documentation-rules-agent', JSON.stringify(toDocumentationRules(this.checklist), null, 2));
        }
    }

    private setList(rule: ChecklistRule, key: RuleListKey, values: string[]): void {
        if (key === 'requiredDocuments') {
            rule.requiredDocuments = values;
        } else {
            rule.appliesTo = { ...rule.appliesTo, [key]: values };
        }
        this.validate();
    }

    private async write(checklist: DocumentationChecklist): Promise<boolean> {
        this.publishing = true;
        this.publishError = false;
        try {
            await this.repository.publish(checklist, this.result?.documentId ?? null);
            await this.load();
            return true;
        } catch {
            this.publishError = true;
            return false;
        } finally {
            this.publishing = false;
        }
    }

    private rebuild(): void {
        const checklist = this.checklist;
        if (!checklist) {
            this.visibleRules = [];
            this.catalogue = [];
            return;
        }
        const term = this.search.trim().toLowerCase();
        this.visibleRules = checklist.rules.filter((rule) => {
            if (this.riskFilter !== 'ALL' && rule.riskLevelIfMissing !== this.riskFilter) {
                return false;
            }
            if (!term) {
                return true;
            }
            return [rule.ruleId, rule.description, ...rule.requiredDocuments, ...rule.appliesTo.procedureCodes, ...rule.appliesTo.serviceCategories]
                .join(' ')
                .toLowerCase()
                .includes(term);
        });
        this.catalogue = checklistDocumentCatalogue(checklist).map((name) => ({
            name,
            rules: checklist.rules.filter((rule) => rule.requiredDocuments.includes(name)).length,
        }));
    }

    private save(name: string, content: string): void {
        const blob = new Blob([content], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `${name}.json`;
        link.click();
        URL.revokeObjectURL(url);
    }
}
