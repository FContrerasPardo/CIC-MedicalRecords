import { agreementTemplateFile, TEMPLATE_AGREEMENT_IDS } from '../store/agreement-templates';
import { agreementFilePath, validateAgreementFile } from '../store/agreement-store.util';
import {
    AI_HISTORY_MAX,
    AiHistoryEvent,
    appendAiHistory,
    appendAiHistoryToContent,
    applyAiSettingsChange,
    clampThreshold,
    diffAiSettings,
    fileSavedEvent,
    isThresholdInRange,
    parseAiSettings,
    stampTemplateCreation,
    syncAiSettingsLanguageVersion,
    tariffDefaultVariance,
    validateAiSettings,
} from './agreement-ai-settings.util';

const meta = { at: '2026-11-18T10:00:00.000Z', user: 'Usuario Demo' };

function event(index: number): AiHistoryEvent {
    return { at: `2026-01-01T00:00:${String(index % 60).padStart(2, '0')}.000Z`, event: 'THRESHOLD', user: null, file: 'ai-settings.json', field: 'tariffVariancePct', from: index, to: index + 1 };
}

describe('agreement AI settings (ai-settings.json)', () => {
    it('is one more file of each agreement, valid in both templates and starting with «created from template»', () => {
        expect(agreementFilePath('centro-medico-latam', 'aiSettings')).toBe('/MedRec/Appdata/Agreements/centro-medico-latam/ai-settings.json');
        expect(agreementFilePath('centro-medico-latam', 'aiSettings', 'es')).toBe('/MedRec/Appdata/Agreements/centro-medico-latam/ai-settings.es.json');
        for (const agreementId of TEMPLATE_AGREEMENT_IDS) {
            const settings = parseAiSettings(agreementTemplateFile(agreementId, 'aiSettings'));
            expect(settings?.validations.map((item) => item.id)).toEqual(['coding-icd10-procedure', 'authorization-check', 'documentary-support', 'tariff-variance']);
            expect(settings?.validations.map((item) => item.agent)).toEqual(['Coding Integrity', 'Compliance Alert', 'Pre-analysis', 'Financial Variance']);
            expect(settings?.history.map((item) => item.event)).toEqual(['TEMPLATE_CREATED']);
            // The AI tariff tolerance starts equal to the tariff agreement's default tolerance.
            expect(settings?.thresholds.tariffVariancePct).toBe(tariffDefaultVariance(agreementTemplateFile(agreementId, 'tariffAgreement')));
        }
    });

    it('keeps the language versions with the same switches and thresholds, only the texts change', () => {
        const es = parseAiSettings(agreementTemplateFile('centro-medico-latam', 'aiSettings', 'es'));
        const base = parseAiSettings(agreementTemplateFile('centro-medico-latam', 'aiSettings'));
        expect(es?.validations[0].title).toBe('Diagnóstico CIE-10 frente a procedimiento');
        expect(base?.validations[0].title).toBe('ICD-10 diagnosis vs. procedure');
        expect(es?.thresholds).toEqual(base?.thresholds);
    });

    it('turns a change into history events: one per switch and per threshold, from → to', () => {
        const before = parseAiSettings(agreementTemplateFile('centro-medico-latam', 'aiSettings'));
        expect(before).not.toBeNull();
        if (!before) {
            return;
        }
        const events = diffAiSettings(
            before,
            {
                validations: { 'tariff-variance': false, 'authorization-check': true },
                thresholds: { autoApprovalMinConfidencePct: 85, anomalySensitivity: 'HIGH', tariffVariancePct: 10 },
            },
            meta
        );
        expect(events).toEqual([
            { at: meta.at, user: 'Usuario Demo', file: 'ai-settings.json', event: 'VALIDATION', field: 'tariff-variance', from: true, to: false },
            { at: meta.at, user: 'Usuario Demo', file: 'ai-settings.json', event: 'THRESHOLD', field: 'autoApprovalMinConfidencePct', from: 90, to: 85 },
            { at: meta.at, user: 'Usuario Demo', file: 'ai-settings.json', event: 'THRESHOLD', field: 'anomalySensitivity', from: 'MEDIUM', to: 'HIGH' },
        ]);
    });

    it('applies a change to the file content and appends its events, keeping texts and agents', () => {
        const content = agreementTemplateFile('hospital-general-hyland-latam', 'aiSettings');
        const { content: next, events } = applyAiSettingsChange(
            content,
            { validations: { 'documentary-support': false }, thresholds: { autoApprovalMinConfidencePct: 95, anomalySensitivity: 'HIGH', tariffVariancePct: 99 } },
            { at: meta.at, user: null }
        );
        const parsed = parseAiSettings(next);
        expect(events.map((item) => item.field)).toEqual(['documentary-support', 'autoApprovalMinConfidencePct', 'tariffVariancePct']);
        expect(parsed?.validations.find((item) => item.id === 'documentary-support')?.enabled).toBe(false);
        expect(parsed?.validations.find((item) => item.id === 'documentary-support')?.agent).toBe('Pre-analysis');
        // Out of range values are kept inside the slider range.
        expect(parsed?.thresholds.tariffVariancePct).toBe(30);
        expect(parsed?.history.length).toBe(4);
        expect(parsed?.history[3].user).toBeNull();
        expect(validateAgreementFile('aiSettings', next)).toEqual([]);
        // The source content is untouched.
        expect(parseAiSettings(content)?.history.length).toBe(1);
        expect(applyAiSettingsChange(next, { validations: {}, thresholds: parsed?.thresholds ?? { autoApprovalMinConfidencePct: 0, anomalySensitivity: 'LOW', tariffVariancePct: 0 } }, meta).events).toEqual([]);
    });

    it('keeps at most 100 events, dropping the oldest first', () => {
        const history = Array.from({ length: AI_HISTORY_MAX }, (_value, index) => event(index));
        const next = appendAiHistory(history, [event(500), event(501)]);
        expect(AI_HISTORY_MAX).toBe(100);
        expect(next.length).toBe(100);
        expect(next[0].from).toBe(2);
        expect(next[99].from).toBe(501);
        expect(appendAiHistory([event(1)], [event(2)], 1).map((item) => item.from)).toEqual([2]);
        const content = appendAiHistoryToContent({ validations: [], thresholds: {}, history }, [fileSavedEvent('tariff-agreement.json', '2026-11-17-r1', '2026-11-18-r1', meta)]);
        const logged = parseAiSettings(content)?.history ?? [];
        expect(logged.length).toBe(100);
        expect(logged[99]).toEqual({ at: meta.at, user: 'Usuario Demo', event: 'FILE_SAVED', file: 'tariff-agreement.json', field: null, from: '2026-11-17-r1', to: '2026-11-18-r1' });
    });

    it('validates the threshold ranges and the sensitivity', () => {
        expect(isThresholdInRange('autoApprovalMinConfidencePct', 50)).toBe(true);
        expect(isThresholdInRange('autoApprovalMinConfidencePct', 100)).toBe(true);
        expect(isThresholdInRange('autoApprovalMinConfidencePct', 49)).toBe(false);
        expect(isThresholdInRange('autoApprovalMinConfidencePct', '90')).toBe(false);
        expect(isThresholdInRange('tariffVariancePct', 0)).toBe(true);
        expect(isThresholdInRange('tariffVariancePct', 30.5)).toBe(false);
        expect(clampThreshold('tariffVariancePct', -3)).toBe(0);
        expect(clampThreshold('autoApprovalMinConfidencePct', 'x')).toBe(50);
        const valid = { validations: [], thresholds: { autoApprovalMinConfidencePct: 90, anomalySensitivity: 'LOW', tariffVariancePct: 5 } };
        expect(validateAiSettings(valid)).toEqual([]);
        expect(validateAiSettings({ ...valid, thresholds: { autoApprovalMinConfidencePct: 120, anomalySensitivity: 'EXTREME', tariffVariancePct: -1 } })).toEqual([
            'AI_CONFIDENCE_RANGE',
            'AI_SENSITIVITY_INVALID',
            'AI_VARIANCE_RANGE',
        ]);
        expect(validateAiSettings({ thresholds: valid.thresholds })).toEqual(['AI_VALIDATIONS_REQUIRED']);
        expect(validateAiSettings('{ broken')).toEqual(['AI_VALIDATIONS_REQUIRED']);
        expect(validateAgreementFile('aiSettings', { thresholds: valid.thresholds }).map((issue) => issue.code)).toEqual(['AI_VALIDATIONS_REQUIRED']);
    });

    it('starts the history of a file created from the template with the date and user of the creation', () => {
        const stamped = parseAiSettings(stampTemplateCreation(agreementTemplateFile('centro-medico-latam', 'aiSettings'), meta));
        expect(stamped?.history).toEqual([{ at: meta.at, event: 'TEMPLATE_CREATED', user: 'Usuario Demo', file: 'ai-settings.json', field: null, from: null, to: null }]);
    });

    it('carries switches, thresholds and history to another language version, keeping its texts', () => {
        const en = agreementTemplateFile('centro-medico-latam', 'aiSettings', 'en');
        const es = agreementTemplateFile('centro-medico-latam', 'aiSettings', 'es');
        const saved = applyAiSettingsChange(es, { validations: { 'tariff-variance': false }, thresholds: { autoApprovalMinConfidencePct: 80, anomalySensitivity: 'LOW', tariffVariancePct: 7 } }, meta).content;
        const synced = parseAiSettings(syncAiSettingsLanguageVersion(en, saved));
        expect(synced?.validations.find((item) => item.id === 'tariff-variance')).toEqual({
            id: 'tariff-variance',
            enabled: false,
            agent: 'Financial Variance',
            title: 'Tariff variance vs. agreement',
            description: 'Compares each billed amount with the agreed tariff and flags the differences beyond the allowed tolerance.',
        });
        expect(synced?.thresholds).toEqual({ autoApprovalMinConfidencePct: 80, anomalySensitivity: 'LOW', tariffVariancePct: 7 });
        expect(synced?.history.length).toBe(5);
    });
});
