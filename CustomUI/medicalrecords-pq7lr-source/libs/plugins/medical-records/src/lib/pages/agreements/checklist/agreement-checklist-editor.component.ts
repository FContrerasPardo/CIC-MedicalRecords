import { CommonModule } from '@angular/common';
import { Component, ElementRef, EventEmitter, Input, OnChanges, Output, SimpleChanges, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { TranslateModule } from '@ngx-translate/core';
import { AssistantDraftRequest } from '../assistant/rule-assistant.model';
import { AgreementFileStatusComponent } from '../shared/agreement-file-status.component';
import { AgreementHelpCoachComponent } from '../shared/agreement-help-coach.component';
import { AgreementFileLoadResult, AgreementRepositoryService } from '../store/agreement-repository.service';
import { cloneJson, JsonObject, stampAgreementFile } from '../store/agreement-store.util';
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
    parseDocumentationChecklist,
    serializeDocumentationChecklist,
    toDocumentationRules,
    validateChecklist,
} from './documentation-checklist.util';

type RiskFilter = 'ALL' | ChecklistRisk;
type RuleListKey = 'requiredDocuments' | 'procedureCodes' | 'serviceCategories' | 'profiles';

const I18N = 'MEDICAL_RECORDS.AGREEMENTS';

/**
 * Viewer and editor of the documentary checklist of one agreement
 * (`/MedRec/Appdata/Agreements/<agreementId>/documentation-checklist.json`), the canonical catalogue
 * of rule ids the pre-analysis policy references. Nothing is written until the user saves.
 */
@Component({
    selector: 'medical-records-agreement-checklist-editor',
    standalone: true,
    imports: [CommonModule, FormsModule, TranslateModule, AgreementFileStatusComponent, AgreementHelpCoachComponent],
    templateUrl: './agreement-checklist-editor.component.html',
    styleUrls: ['../agreements-page.component.scss'],
})
export class AgreementChecklistEditorComponent implements OnChanges {
    private readonly repository = inject(AgreementRepositoryService);
    private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);

    @Input() agreementId = '';
    @Input() file: AgreementFileLoadResult | null = null;
    /** Policy profile keys offered for the rule's profile list. */
    @Input() profileKeys: readonly string[] = [];
    /** The tab is visible (first-time help). */
    @Input() active = true;
    /** A row proposed by the rules assistant, added to the draft and highlighted. */
    @Input() assistantDraft: AssistantDraftRequest | null = null;
    /** The file was written: the page reloads it. */
    @Output() saved = new EventEmitter<void>();

    readonly i18n = I18N;
    readonly riskFilters: RiskFilter[] = ['ALL', 'HIGH', 'MEDIUM', 'LOW'];
    readonly risks: ChecklistRisk[] = ['HIGH', 'MEDIUM', 'LOW'];
    readonly consumerOptions: ChecklistConsumer[] = ['validation', 'agent'];

    checklist: DocumentationChecklist | null = null;
    publishing = false;
    publishError = false;
    savedVersion: string | null = null;
    search = '';
    riskFilter: RiskFilter = 'ALL';
    /** Catalogue filter: only rules that require this document class. */
    documentFilter: string | null = null;
    /** Rule ids added by the assistant in the current draft (highlighted). */
    assistantRuleIds = new Set<string>();

    visibleRules: ChecklistRule[] = [];
    catalogue: Array<{ name: string; rules: number }> = [];

    /** Editor: a copy of the checklist; nothing is written until it is saved. */
    draft: DocumentationChecklist | null = null;
    issues: ChecklistIssue[] = [];
    saveAttempted = false;

    get editing(): boolean {
        return !!this.draft;
    }

    get canPublish(): boolean {
        return !!this.file && (this.file.source !== 'appdata' || this.file.legacy) && !this.publishing && !this.draft;
    }

    ngOnChanges(changes: SimpleChanges): void {
        if (changes['file']) {
            this.checklist = this.file ? parseDocumentationChecklist(this.file.content) : null;
            this.rebuild();
        }
        if (changes['assistantDraft'] && this.assistantDraft?.proposal.kind === 'documentationChecklist') {
            this.addProposedRule(this.assistantDraft.proposal.row as unknown as ChecklistRule);
        }
    }

    /** Rules assistant: opens the editor (when closed), appends the proposed rule and scrolls to it. */
    addProposedRule(rule: ChecklistRule): void {
        if (!this.draft) {
            this.startEdit();
        }
        if (!this.draft) {
            return;
        }
        const copy = cloneJson(rule);
        this.draft.rules = [...this.draft.rules, copy];
        this.assistantRuleIds.add(copy.ruleId);
        this.validate();
        setTimeout(() => this.host.nativeElement.querySelector('.assistant-new')?.scrollIntoView({ behavior: 'smooth', block: 'center' }), 60);
    }

    setDocumentFilter(name: string): void {
        this.documentFilter = this.documentFilter === name ? null : name;
        this.rebuild();
    }

    /** Who uses a rule: validation, agent or both (i18n suffix). */
    usedBy(rule: ChecklistRule): string {
        const validation = rule.consumers.includes('validation');
        const agent = rule.consumers.includes('agent');
        return validation && agent ? 'BOTH' : agent ? 'AGENT' : validation ? 'VALIDATION' : 'NONE';
    }

    /** Edit one rule from the table: opens the editor and scrolls to that rule. */
    editRule(ruleId: string): void {
        if (!this.draft) {
            this.startEdit();
        }
        setTimeout(() => this.host.nativeElement.querySelector('[data-rule-id="' + ruleId.replace(/"/g, '') + '"]')?.scrollIntoView({ behavior: 'smooth', block: 'center' }), 60);
    }

    /** Writes the checklist shown (template or repaired file) to the agreement's folder, unchanged. */
    async publish(): Promise<void> {
        if (this.file && this.canPublish) {
            await this.write(cloneJson(this.file.content));
        }
    }

    startEdit(): void {
        if (!this.checklist) {
            return;
        }
        this.draft = cloneJson(this.checklist);
        this.saveAttempted = false;
        this.publishError = false;
        this.savedVersion = null;
        this.validate();
    }

    cancelEdit(): void {
        this.draft = null;
        this.issues = [];
        this.assistantRuleIds.clear();
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
        const content = JSON.parse(serializeDocumentationChecklist({ ...this.draft, agreementId: this.agreementId })) as JsonObject;
        if (await this.write(stampAgreementFile('documentationChecklist', content))) {
            this.draft = null;
            this.assistantRuleIds.clear();
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
        if (key === 'requiredDocuments') {
            return rule.requiredDocuments;
        }
        return key === 'profiles' ? rule.profiles : rule.appliesTo[key];
    }

    /** Enter or the add button: adds the typed value to the rule's list and clears the input. */
    addValue(rule: ChecklistRule, key: RuleListKey, input: HTMLInputElement, event?: Event): void {
        event?.preventDefault();
        this.setList(rule, key, addUniqueValue(this.listOf(rule, key), input.value));
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
            this.download(`documentation-checklist-${this.agreementId}`, serializeDocumentationChecklist(this.checklist));
        }
    }

    /** The payload in the legacy `documentationRules` shape the Agent Mesh still reads. */
    downloadAgentRules(): void {
        if (this.checklist) {
            this.download(`documentation-rules-${this.agreementId}`, JSON.stringify(toDocumentationRules(this.checklist), null, 2));
        }
    }

    private setList(rule: ChecklistRule, key: RuleListKey, values: string[]): void {
        if (key === 'requiredDocuments') {
            rule.requiredDocuments = values;
        } else if (key === 'profiles') {
            rule.profiles = values;
        } else {
            rule.appliesTo = { ...rule.appliesTo, [key]: values };
        }
        this.validate();
    }

    private async write(content: JsonObject): Promise<boolean> {
        if (!this.file) {
            return false;
        }
        this.publishing = true;
        this.publishError = false;
        this.savedVersion = null;
        try {
            await this.repository.saveAgreementFile(this.file, content);
            this.savedVersion = String(content['version'] ?? '') || '—';
            this.saved.emit();
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
            if (this.documentFilter && !rule.requiredDocuments.includes(this.documentFilter)) {
                return false;
            }
            if (!term) {
                return true;
            }
            return [rule.ruleId, rule.description, rule.condition, ...rule.requiredDocuments, ...rule.profiles, ...rule.appliesTo.procedureCodes, ...rule.appliesTo.serviceCategories]
                .join(' ')
                .toLowerCase()
                .includes(term);
        });
        this.catalogue = checklistDocumentCatalogue(checklist).map((name) => ({
            name,
            rules: checklist.rules.filter((rule) => rule.requiredDocuments.includes(name)).length,
        }));
    }

    private download(name: string, content: string): void {
        const blob = new Blob([content], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `${name}.json`;
        link.click();
        URL.revokeObjectURL(url);
    }
}
