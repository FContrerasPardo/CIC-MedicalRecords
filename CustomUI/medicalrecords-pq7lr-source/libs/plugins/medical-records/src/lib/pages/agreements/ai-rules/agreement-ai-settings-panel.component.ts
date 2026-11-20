import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, OnChanges, Output, inject } from '@angular/core';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { AgreementFileStatusComponent } from '../shared/agreement-file-status.component';
import { AgreementFileLoadResult, AgreementRepositoryService } from '../store/agreement-repository.service';
import { AGREEMENT_FILE_NAMES, AgreementFileIssueCode, AgreementFileKind, stampAgreementFile, validateAgreementFile } from '../store/agreement-store.util';
import {
    AI_SENSITIVITIES,
    AI_THRESHOLD_RANGES,
    AiHistoryEvent,
    AiHistoryValue,
    AiSensitivity,
    AiSettings,
    AiSettingsChange,
    AiThresholds,
    applyAiSettingsChange,
    clampThreshold,
    diffAiSettings,
    parseAiSettings,
    stampTemplateCreation,
    tariffDefaultVariance,
} from './agreement-ai-settings.util';

const I18N = 'MEDICAL_RECORDS.AGREEMENTS';

/** i18n suffix (`AI.THRESHOLD_*`) of each threshold. */
const THRESHOLD_LABELS: Record<string, string> = {
    autoApprovalMinConfidencePct: 'CONFIDENCE',
    anomalySensitivity: 'SENSITIVITY',
    tariffVariancePct: 'VARIANCE',
};

/**
 * «AI rules» of an agreement (`ai-settings.json`): the validations the agents apply (switches),
 * the decision thresholds (sliders) and the history of changes, logged on every save. The switches
 * and sliders edit a draft; «Save» writes the file with one history event per change.
 */
@Component({
    selector: 'medical-records-agreement-ai-settings-panel',
    standalone: true,
    imports: [CommonModule, TranslateModule, AgreementFileStatusComponent],
    templateUrl: './agreement-ai-settings-panel.component.html',
    styleUrls: ['../agreements-page.component.scss', './agreement-ai-settings-panel.component.scss'],
})
export class AgreementAiSettingsPanelComponent implements OnChanges {
    private readonly repository = inject(AgreementRepositoryService);
    private readonly translate = inject(TranslateService);

    @Input() agreementId = '';
    @Input() file: AgreementFileLoadResult | null = null;
    /** `tariff-agreement.json` content shown for the agreement: its default tolerance is the reference of the tariff slider. */
    @Input() tariffContent: Record<string, unknown> | null = null;
    @Output() saved = new EventEmitter<void>();

    readonly i18n = I18N;
    readonly sensitivities = AI_SENSITIVITIES;
    readonly ranges = AI_THRESHOLD_RANGES;
    readonly uid = `mr-ai-${Math.random().toString(36).slice(2, 9)}`;

    settings: AiSettings | null = null;
    draft: AiSettingsChange | null = null;
    /** Newest first. */
    history: AiHistoryEvent[] = [];
    issues: AgreementFileIssueCode[] = [];
    saving = false;
    saveError = false;
    savedVersion: string | null = null;

    get tariffVariance(): number | null {
        return tariffDefaultVariance(this.tariffContent);
    }

    /** Changes in the draft not saved yet. */
    get pendingCount(): number {
        return this.settings && this.draft ? diffAiSettings(this.settings, this.draft, { at: '', user: null }).length : 0;
    }

    get sensitivityIndex(): number {
        return Math.max(0, AI_SENSITIVITIES.indexOf(this.draft?.thresholds.anomalySensitivity ?? 'MEDIUM'));
    }

    ngOnChanges(): void {
        const dirty = this.pendingCount > 0;
        this.settings = parseAiSettings(this.file?.content ?? null);
        this.history = [...(this.settings?.history ?? [])].reverse();
        // A history event logged from another file must not drop the switches being edited.
        if (!dirty || !this.draft) {
            this.reset();
        }
    }

    reset(): void {
        this.draft = this.settings ? { validations: Object.fromEntries(this.settings.validations.map((item) => [item.id, item.enabled])), thresholds: { ...this.settings.thresholds } } : null;
        this.issues = [];
    }

    setEnabled(id: string, enabled: boolean): void {
        if (this.draft) {
            this.draft = { ...this.draft, validations: { ...this.draft.validations, [id]: enabled } };
            this.savedVersion = null;
        }
    }

    setThreshold(key: 'autoApprovalMinConfidencePct' | 'tariffVariancePct', value: string | number): void {
        if (this.draft) {
            this.draft = { ...this.draft, thresholds: { ...this.draft.thresholds, [key]: clampThreshold(key, Number(value)) } };
            this.savedVersion = null;
        }
    }

    setSensitivity(index: string | number): void {
        const sensitivity: AiSensitivity = AI_SENSITIVITIES[Number(index)] ?? 'MEDIUM';
        if (this.draft) {
            this.draft = { ...this.draft, thresholds: { ...this.draft.thresholds, anomalySensitivity: sensitivity } };
            this.savedVersion = null;
        }
    }

    /** Takes the tariff agreement's default tolerance as the AI tariff threshold. */
    useTariffVariance(): void {
        const value = this.tariffVariance;
        if (value !== null) {
            this.setThreshold('tariffVariancePct', value);
        }
    }

    async save(): Promise<void> {
        if (!this.file || !this.draft || this.saving) {
            return;
        }
        const meta = this.repository.changeMeta();
        // Not saved yet: the file starts its history with «AI profile created from template».
        const start = this.file.source === 'appdata' ? this.file.content : stampTemplateCreation(this.file.content, meta);
        const { content, events } = applyAiSettingsChange(start, this.draft, meta);
        if (!events.length && this.file.source === 'appdata') {
            return;
        }
        this.issues = validateAgreementFile('aiSettings', content).map((issue) => issue.code);
        if (this.issues.length) {
            return;
        }
        const stamped = stampAgreementFile('aiSettings', content);
        this.saving = true;
        this.saveError = false;
        try {
            await this.repository.saveAgreementFile(this.file, stamped);
            this.savedVersion = String(stamped['version'] ?? '') || '—';
            this.saved.emit();
        } catch {
            this.saveError = true;
        } finally {
            this.saving = false;
        }
    }

    validationTitle(id: string | null): string {
        return this.settings?.validations.find((item) => item.id === id)?.title || id || '—';
    }

    sensitivityKey(value: AiSensitivity): string {
        return `${I18N}.AI.SENSITIVITY_${value}`;
    }

    /** What changed, in words (the texts depend on the event type and the field). */
    describe(event: AiHistoryEvent): string {
        const t = (key: string, params?: Record<string, unknown>) => this.translate.instant(`${I18N}.AI.${key}`, params) as string;
        switch (event.event) {
            case 'TEMPLATE_CREATED':
                return t('EVENT_TEMPLATE_CREATED');
            case 'VALIDATION':
                return t('EVENT_VALIDATION', { name: this.validationTitle(event.field), from: this.stateText(event.from), to: this.stateText(event.to) });
            case 'THRESHOLD':
                return t('EVENT_THRESHOLD', {
                    name: t(`THRESHOLD_${THRESHOLD_LABELS[event.field ?? ''] ?? 'CONFIDENCE'}`),
                    from: this.valueText(event.field, event.from),
                    to: this.valueText(event.field, event.to),
                });
            default:
                return t('EVENT_FILE_SAVED', { name: this.fileLabel(event.file), from: event.from ?? '—', to: event.to ?? '—' });
        }
    }

    /** Readable name of the file affected (falls back to the file name). */
    fileLabel(fileName: string): string {
        const kind = (Object.keys(AGREEMENT_FILE_NAMES) as AgreementFileKind[]).find((item) => AGREEMENT_FILE_NAMES[item] === fileName);
        return kind ? (this.translate.instant(`${I18N}.RULES.FILE_${kind}`) as string) : fileName;
    }

    trackEvent(index: number, event: AiHistoryEvent): string {
        return `${event.at}|${event.event}|${event.field ?? ''}|${index}`;
    }

    private stateText(value: AiHistoryValue): string {
        return this.translate.instant(`${I18N}.AI.${value === true ? 'ENABLED' : 'DISABLED'}`) as string;
    }

    private valueText(field: string | null, value: AiHistoryValue): string {
        if (value === null) {
            return '—';
        }
        if (field === 'anomalySensitivity') {
            return this.translate.instant(this.sensitivityKey(String(value) as AiSensitivity)) as string;
        }
        return `${value} %`;
    }

    /** Thresholds of the draft, for the template. */
    get thresholds(): AiThresholds | null {
        return this.draft?.thresholds ?? null;
    }
}
