import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, OnChanges, Output, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { TranslateModule } from '@ngx-translate/core';
import { parsePreanalysisPolicy, PreanalysisPolicy } from '../../radication/utils/radication-policy.util';
import { addUniqueValue } from '../checklist/documentation-checklist.util';
import { AgreementFileStatusComponent } from '../shared/agreement-file-status.component';
import { AgreementHelpCoachComponent } from '../shared/agreement-help-coach.component';
import { AgreementFileLoadResult, AgreementRepositoryService } from '../store/agreement-repository.service';
import { cloneJson, JsonObject } from '../store/agreement-store.util';
import {
    createPolicyCrossCheck,
    createPolicyRequirement,
    fromPolicyDraft,
    POLICY_ADVANCED_FIELDS,
    POLICY_RISKS,
    policyClassSuggestions,
    PolicyDraft,
    PolicyIssue,
    PolicyIssueSection,
    PolicyProfileDraft,
    PolicyRequirementSection,
    serializePolicyDocument,
    toPolicyDraft,
    validatePolicyDraft,
} from './preanalysis-policy-editor.util';

const I18N = 'MEDICAL_RECORDS.AGREEMENTS';

/**
 * Viewer and editor of the pre-analysis policy of one agreement
 * (`/MedRec/Appdata/Agreements/<agreementId>/preanalysis-policy.json`). Without a file it shows the
 * bundled template and offers to create it; the file is only written on create or save. Every
 * requirement's rule id must exist in the documentary checklist of the same agreement.
 */
@Component({
    selector: 'medical-records-preanalysis-policy-editor',
    standalone: true,
    imports: [CommonModule, FormsModule, TranslateModule, AgreementFileStatusComponent, AgreementHelpCoachComponent],
    templateUrl: './preanalysis-policy-editor.component.html',
    styleUrls: ['../agreements-page.component.scss', './preanalysis-policy-editor.component.scss'],
})
export class PreanalysisPolicyEditorComponent implements OnChanges {
    private readonly repository = inject(AgreementRepositoryService);

    @Input() agreementId = '';
    @Input() file: AgreementFileLoadResult | null = null;
    /** The tab is visible (first-time help). */
    @Input() active = true;
    /** Extra class names for suggestions (the checklist document catalogue). */
    @Input() classCatalogue: readonly string[] = [];
    /** Rule ids of the agreement's checklist (the canonical catalogue); null skips the cross-check. */
    @Input() checklistRuleIds: readonly string[] | null = null;
    /** The file was written: the page reloads it. */
    @Output() saved = new EventEmitter<void>();

    readonly i18n = I18N;
    readonly risks = POLICY_RISKS;
    readonly advancedFields = POLICY_ADVANCED_FIELDS;
    readonly requirementSections: PolicyRequirementSection[] = ['alwaysRequired', 'conditionallyRequired'];

    saving = false;
    saveError = false;
    savedVersion: string | null = null;
    policy: PreanalysisPolicy | null = null;
    /** What is shown: the loaded document as a draft (read only until editing starts). */
    view: PolicyDraft | null = null;
    selectedProfile = '';
    /** Rule ids of the shown policy the checklist does not define, as `PROFILE · RULE`. */
    missingRuleIds: string[] = [];

    /** Editor: a copy of the policy; nothing is written until it is saved. */
    draft: PolicyDraft | null = null;
    issues: PolicyIssue[] = [];
    saveAttempted = false;
    suggestions: string[] = [];

    get shown(): PolicyDraft | null {
        return this.draft ?? this.view;
    }

    get profile(): PolicyProfileDraft | null {
        const shown = this.shown;
        return shown?.profiles.find((item) => item.key === this.selectedProfile) ?? shown?.profiles[0] ?? null;
    }

    get hasAdvancedIssues(): boolean {
        return this.issues.some((issue) => issue.profileKey === null);
    }

    get canCreate(): boolean {
        return !!this.file && (this.file.source !== 'appdata' || this.file.legacy) && !this.saving && !this.draft;
    }

    ngOnChanges(): void {
        this.policy = this.file ? parsePreanalysisPolicy(this.file.content) : null;
        this.view = this.file ? toPolicyDraft(this.file.content) : null;
        if (!this.view?.profiles.some((item) => item.key === this.selectedProfile)) {
            this.selectedProfile = this.view?.profiles[0]?.key ?? '';
        }
        this.missingRuleIds = this.findMissingRuleIds();
        if (this.draft) {
            this.validate();
        }
    }

    /** Writes the policy shown (bundled template or repaired file), unchanged, to the agreement's folder. */
    async createFromTemplate(): Promise<void> {
        if (this.canCreate && this.file) {
            await this.write(cloneJson(this.file.content));
        }
    }

    startEdit(): void {
        if (!this.file) {
            return;
        }
        this.draft = toPolicyDraft(this.file.content);
        this.saveAttempted = false;
        this.saveError = false;
        this.savedVersion = null;
        this.refreshSuggestions();
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
        const document = fromPolicyDraft(this.draft);
        document['policyMetadata'] = { ...(document['policyMetadata'] as JsonObject), agreementId: this.agreementId };
        if (await this.write(document)) {
            this.draft = null;
            this.issues = [];
        }
    }

    validate(): void {
        this.issues = this.draft ? validatePolicyDraft(this.draft, this.checklistRuleIds) : [];
    }

    issuesFor(section: PolicyIssueSection, index: number | null): PolicyIssue[] {
        const profileKey = index === null ? null : this.profile?.key;
        return this.issues.filter((issue) => issue.section === section && issue.index === index && issue.profileKey === profileKey);
    }

    profileIssueCount(key: string): number {
        return this.issues.filter((issue) => issue.profileKey === key).length;
    }

    addRequirement(section: PolicyRequirementSection): void {
        const profile = this.profile;
        if (this.draft && profile) {
            profile[section] = [...profile[section], createPolicyRequirement(profile, section)];
            this.validate();
        }
    }

    removeRequirement(section: PolicyRequirementSection, index: number): void {
        const profile = this.profile;
        if (this.draft && profile) {
            profile[section] = profile[section].filter((_item, position) => position !== index);
            this.changed();
        }
    }

    addCrossCheck(): void {
        const profile = this.profile;
        if (this.draft && profile) {
            profile.crossChecks = [...profile.crossChecks, createPolicyCrossCheck()];
            this.validate();
        }
    }

    removeCrossCheck(index: number): void {
        const profile = this.profile;
        if (this.draft && profile) {
            profile.crossChecks = profile.crossChecks.filter((_item, position) => position !== index);
            this.validate();
        }
    }

    addOptional(input: HTMLInputElement, event?: Event): void {
        event?.preventDefault();
        const profile = this.profile;
        if (this.draft && profile) {
            profile.optional = addUniqueValue(profile.optional, input.value);
            input.value = '';
            this.refreshSuggestions();
        }
    }

    removeOptional(index: number): void {
        const profile = this.profile;
        if (this.draft && profile) {
            profile.optional = profile.optional.filter((_item, position) => position !== index);
            this.refreshSuggestions();
        }
    }

    /** A class name or row changed: validation and suggestions follow. */
    changed(): void {
        this.validate();
        this.refreshSuggestions();
    }

    download(): void {
        if (!this.file) {
            return;
        }
        const blob = new Blob([serializePolicyDocument(this.file.content)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `preanalysis-policy-${this.agreementId}.json`;
        link.click();
        URL.revokeObjectURL(url);
    }

    private findMissingRuleIds(): string[] {
        const view = this.view;
        if (!view || !this.checklistRuleIds) {
            return [];
        }
        return validatePolicyDraft(view, this.checklistRuleIds)
            .filter((issue) => issue.code === 'RULE_ID_NOT_IN_CHECKLIST')
            .map((issue) => {
                const profile = view.profiles.find((item) => item.key === issue.profileKey);
                const section = issue.section === 'alwaysRequired' || issue.section === 'conditionallyRequired' ? issue.section : null;
                const ruleId = profile && section && issue.index !== null ? profile[section][issue.index]?.ruleId : '';
                return `${issue.profileKey} · ${ruleId || '?'}`;
            });
    }

    private refreshSuggestions(): void {
        const shown = this.shown;
        this.suggestions = shown ? policyClassSuggestions(shown, this.classCatalogue) : [];
    }

    private async write(content: JsonObject): Promise<boolean> {
        if (!this.file) {
            return false;
        }
        this.saving = true;
        this.saveError = false;
        this.savedVersion = null;
        try {
            await this.repository.saveAgreementFile(this.file, content);
            this.savedVersion = parsePreanalysisPolicy(content)?.version || '—';
            this.saved.emit();
            return true;
        } catch {
            this.saveError = true;
            return false;
        } finally {
            this.saving = false;
        }
    }
}
