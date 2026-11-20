import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, OnChanges, Output, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { TranslateModule } from '@ngx-translate/core';
import { AgreementGeneralFieldDefinition, AgreementGeneralViewModel } from '../../../form-widgets/agent-rules-widget/agent-rules-widget.model';
import { addUniqueValue } from '../checklist/documentation-checklist.util';
import { AgreementFileStatusComponent } from '../shared/agreement-file-status.component';
import { AgreementHelpCoachComponent } from '../shared/agreement-help-coach.component';
import { AgreementFileLoadResult, AgreementRepositoryService } from '../store/agreement-repository.service';
import { AGREEMENT_STATUSES, AgreementStatus, agreementAliases, cloneJson, JsonObject, stampAgreementFile, validateAgreementFile } from '../store/agreement-store.util';
import { AgreementContact, agreementContacts, contactInitials, createContact, executionBars, ExecutionBar } from './agreement-general.util';

const I18N = 'MEDICAL_RECORDS.AGREEMENTS';

/** Fields of `agreement.json` → `general`, the same model as the agent rules widget's General tab. */
const GENERAL_FIELDS: AgreementGeneralFieldDefinition[] = [
    { key: 'providerName', labelKey: 'PROVIDER_NAME', type: 'text', editable: true },
    { key: 'providerDisplayName', labelKey: 'PROVIDER_DISPLAY_NAME', type: 'text', editable: true },
    { key: 'agreementBadge', labelKey: 'BADGE', type: 'text', editable: true },
    { key: 'payer', labelKey: 'PAYER', type: 'text', editable: true },
    { key: 'contractId', labelKey: 'CONTRACT_ID', type: 'text', editable: true },
    { key: 'planName', labelKey: 'PLAN', type: 'text', editable: true },
    { key: 'contractType', labelKey: 'CONTRACT_TYPE', type: 'text', editable: true },
    { key: 'effectiveFrom', labelKey: 'EFFECTIVE_FROM', type: 'text', editable: true },
    { key: 'effectiveTo', labelKey: 'EFFECTIVE_TO', type: 'text', editable: true },
    { key: 'jurisdiction', labelKey: 'JURISDICTION', type: 'text', editable: true },
    { key: 'legalRepresentative', labelKey: 'LEGAL_REPRESENTATIVE', type: 'text', editable: true },
    { key: 'budgetCurrency', labelKey: 'CURRENCY', type: 'text', editable: true },
    { key: 'capitationBase', labelKey: 'BASE_VALUE', type: 'number', editable: true },
    { key: 'budgetTotal', labelKey: 'BUDGET', type: 'number', editable: true },
    { key: 'billedYtd', labelKey: 'BILLED_YTD', type: 'number', editable: true },
    { key: 'pendingApproval', labelKey: 'PENDING_APPROVAL', type: 'number', editable: true },
];

interface GeneralDraft {
    general: Partial<AgreementGeneralViewModel>;
    status: AgreementStatus;
    aliases: string[];
    contacts: AgreementContact[];
}

/**
 * General data of the agreement (`agreement.json`), in the CIC-Fin card style of the radication:
 * «General information» (editable with the pencil), «Execution status» bars and the «Key contacts»
 * directory (synthetic contacts saved in the same file).
 */
@Component({
    selector: 'medical-records-agreement-general-panel',
    standalone: true,
    imports: [CommonModule, FormsModule, TranslateModule, AgreementFileStatusComponent, AgreementHelpCoachComponent],
    templateUrl: './agreement-general-panel.component.html',
    styleUrls: ['../agreements-page.component.scss', './agreement-general-panel.component.scss'],
})
export class AgreementGeneralPanelComponent implements OnChanges {
    private readonly repository = inject(AgreementRepositoryService);

    @Input() agreementId = '';
    @Input() file: AgreementFileLoadResult | null = null;
    /** Rule counts per file, for the overview. */
    @Input() summary: Array<{ labelKey: string; value: number }> = [];
    /** The tab is visible (first-time help). */
    @Input() active = true;
    @Output() saved = new EventEmitter<void>();

    readonly i18n = I18N;
    readonly fields = GENERAL_FIELDS;
    readonly statuses = AGREEMENT_STATUSES;
    readonly initials = contactInitials;

    general: Partial<AgreementGeneralViewModel> = {};
    status: AgreementStatus = 'DRAFT';
    aliases: string[] = [];
    contacts: AgreementContact[] = [];
    bars: ExecutionBar[] = [];
    draft: GeneralDraft | null = null;
    saving = false;
    saveError = false;
    savedVersion: string | null = null;
    invalid = false;

    get canCreate(): boolean {
        return !!this.file && this.file.source !== 'appdata' && !this.saving && !this.draft;
    }

    ngOnChanges(): void {
        const content = this.file?.content ?? {};
        this.general = { ...((content['general'] as Partial<AgreementGeneralViewModel>) ?? {}) };
        const status = String(content['status'] ?? '').toUpperCase() as AgreementStatus;
        this.status = AGREEMENT_STATUSES.includes(status) ? status : 'DRAFT';
        this.aliases = agreementAliases(content);
        this.contacts = agreementContacts(content);
        this.bars = executionBars(this.general);
    }

    value(key: keyof AgreementGeneralViewModel): string | number {
        const value = this.general[key];
        return value === undefined || value === null || value === '' ? '—' : (value as string | number);
    }

    startEdit(): void {
        this.draft = { general: { ...this.general }, status: this.status, aliases: [...this.aliases], contacts: this.contacts.map((contact) => ({ ...contact })) };
        this.invalid = false;
        this.saveError = false;
        this.savedVersion = null;
    }

    cancelEdit(): void {
        this.draft = null;
        this.invalid = false;
    }

    /** «+ New contact»: opens the editor with an empty contact card. */
    newContact(): void {
        if (!this.draft) {
            this.startEdit();
        }
        if (this.draft) {
            this.draft.contacts = [...this.draft.contacts, createContact(this.agreementId, this.draft.contacts)];
        }
    }

    removeContact(index: number): void {
        if (this.draft) {
            this.draft.contacts = this.draft.contacts.filter((_contact, position) => position !== index);
        }
    }

    setField(key: keyof AgreementGeneralViewModel, value: unknown, type: 'text' | 'number'): void {
        if (this.draft) {
            (this.draft.general as Record<string, unknown>)[key] = type === 'number' ? Number(value) || 0 : value;
        }
    }

    addAlias(input: HTMLInputElement, event?: Event): void {
        event?.preventDefault();
        if (this.draft) {
            this.draft.aliases = addUniqueValue(this.draft.aliases, input.value);
            input.value = '';
        }
    }

    removeAlias(index: number): void {
        if (this.draft) {
            this.draft.aliases = this.draft.aliases.filter((_alias, position) => position !== index);
        }
    }

    async createFromTemplate(): Promise<void> {
        if (this.file && this.canCreate) {
            await this.write(cloneJson(this.file.content));
        }
    }

    async save(): Promise<void> {
        if (!this.draft || !this.file) {
            return;
        }
        const content: JsonObject = {
            ...cloneJson(this.file.content),
            agreementId: this.agreementId,
            status: this.draft.status,
            providerAliases: this.draft.aliases,
            general: { ...this.draft.general },
            contacts: this.draft.contacts.filter((contact) => contact.name.trim() || contact.email.trim() || contact.phone.trim()),
        };
        this.invalid = validateAgreementFile('agreement', content).length > 0;
        if (this.invalid) {
            return;
        }
        if (await this.write(stampAgreementFile('agreement', content))) {
            this.draft = null;
        }
    }

    private async write(content: JsonObject): Promise<boolean> {
        if (!this.file) {
            return false;
        }
        this.saving = true;
        this.saveError = false;
        try {
            await this.repository.saveAgreementFile(this.file, content);
            this.savedVersion = String(content['version'] ?? '') || '—';
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
