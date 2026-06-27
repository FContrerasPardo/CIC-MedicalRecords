import {
    AgentRuleScriptItem,
    AgentRulesChipField,
    AgentRulesListField,
    AgentRulesListItem,
    AgentRulesMetaField,
    AgentRulesSectionDraft,
    AgentRulesSectionViewModel,
    AgentRuleTone,
    AgentRulesWidgetViewModel,
    AgreementDocumentsViewModel,
    AgreementGeneralViewModel,
    PayerSidebarProfile,
} from './agent-rules-widget.model';
import { AGREEMENT_DOCUMENTS_DEMO, AGREEMENT_GENERAL_DEMO, PAYER_SIDEBAR_PROFILES } from './agent-rules-demo.fixture';

const UI_ONLY_ITEM_IDS = new Set(['agreementGeneral', 'agreementDocuments']);
const SECTIONS_EXCLUDED_FROM_WORKSPACE = new Set(['batchState', ...UI_ONLY_ITEM_IDS]);

const GROUP_ORDER = ['Context', 'Intake', 'Compliance', 'Financial', 'Coding'];
const RISK_LEVELS = ['HIGH', 'MEDIUM', 'LOW'];
const AUTH_STATUSES = ['APPROVED', 'NOT_REQUIRED', 'PENDING', 'DENIED', 'EXPIRED'];

const SECTION_METADATA: Record<
    string,
    { group: string; agent: string; audience: 'context' | 'intake' | 'agent'; purpose?: string; hideWhenEmpty?: boolean }
> = {
    batchState: {
        group: 'Context',
        agent: 'Comparison payload — not a rule set',
        audience: 'context',
        purpose: 'Batch data validated against agent rule packs. Shared context for review and copy.',
    },
    documentationRules: {
        group: 'Intake',
        agent: 'Intake only — not sent to agents',
        audience: 'intake',
        purpose: 'Documentation coverage heuristics for the Intake stage.',
    },
    payerCompliancePolicy: {
        group: 'Compliance',
        agent: 'Compliance Alert Agent',
        audience: 'agent',
        purpose: 'Payer compliance policy rules validated by Compliance Alert.',
    },
    tariffAgreement: {
        group: 'Financial',
        agent: 'Financial Variance Agent',
        audience: 'agent',
        purpose: 'Tariff agreement and variance thresholds for Financial Variance.',
    },
    payerCodingPolicy: {
        group: 'Coding',
        agent: 'Coding Integrity Agent',
        audience: 'agent',
        purpose: 'Payer coding policy rules for Coding Integrity.',
    },
    codingRules: {
        group: 'Coding',
        agent: 'Coding Integrity Agent',
        audience: 'agent',
        purpose: 'Clinical coding integrity rules for Coding Integrity.',
    },
    preAuthorization: {
        group: 'Financial',
        agent: 'Excluded in current pilot',
        audience: 'agent',
        purpose: 'Pre-authorization payload (disabled while agents are stabilized).',
        hideWhenEmpty: true,
    },
};

export function parseScriptPayload(raw: unknown): AgentRuleScriptItem[] {
    if (!Array.isArray(raw)) {
        return [];
    }

    return raw
        .filter((item): item is AgentRuleScriptItem => !!item && typeof item === 'object' && typeof (item as AgentRuleScriptItem).id === 'string')
        .map((item) => ({
            id: item.id,
            label: item.label ?? item.id,
            agent: item.agent ?? '',
            group: item.group ?? 'Shared',
            value: item.value,
            valueType: item.valueType,
            isEmpty: !!item.isEmpty,
            preview: item.preview,
        }));
}

export function mapToViewModel(items: AgentRuleScriptItem[]): AgentRulesWidgetViewModel {
    const sections = items
        .map((item) => applySectionMetadata(mapItemToSection(item)))
        .filter((section) => !shouldHideSection(section))
        .filter((section) => !SECTIONS_EXCLUDED_FROM_WORKSPACE.has(section.itemId))
        .sort((left, right) => {
            const leftIndex = GROUP_ORDER.indexOf(left.group);
            const rightIndex = GROUP_ORDER.indexOf(right.group);

            return (leftIndex === -1 ? 99 : leftIndex) - (rightIndex === -1 ? 99 : rightIndex);
        });

    const populated = sections.filter((section) => !section.isEmpty).length;

    return {
        sections,
        summary: {
            total: sections.length,
            populated,
            empty: sections.length - populated,
        },
    };
}

function applySectionMetadata(section: AgentRulesSectionDraft): AgentRulesSectionViewModel {
    const metadata = SECTION_METADATA[section.itemId];
    if (!metadata) {
        return {
            ...section,
            audience: section.group === 'Intake' ? 'intake' : 'agent',
        };
    }

    return {
        ...section,
        group: metadata.group,
        agent: metadata.agent,
        audience: metadata.audience,
        purpose: metadata.purpose,
        tone: toneForGroup(metadata.group),
    };
}

function shouldHideSection(section: AgentRulesSectionViewModel): boolean {
    const metadata = SECTION_METADATA[section.itemId];
    return Boolean(metadata?.hideWhenEmpty && section.isEmpty);
}

export function serializeItemValue(item: AgentRuleScriptItem): unknown {
    if (item.valueType === 'json-string' && typeof item.value !== 'string') {
        return JSON.stringify(item.value ?? {});
    }

    return item.value;
}

export function applyMetaFieldChange(
    items: AgentRuleScriptItem[],
    itemId: string,
    key: string,
    value: string
): AgentRuleScriptItem[] {
    return updateItemValue(items, itemId, (data) => {
        data[key] = value;
    });
}

export function applyListFieldChange(
    items: AgentRuleScriptItem[],
    itemId: string,
    listKey: string,
    rowId: string,
    fieldKey: string,
    value: string | number | boolean
): AgentRuleScriptItem[] {
    return updateItemValue(items, itemId, (data) => {
        const list = getList(data, listKey);
        const row = list.find((entry, index) => getRowId(entry, index) === rowId);

        if (!row) {
            return;
        }

        if (fieldKey === 'riskLevelIfMissing' || fieldKey === 'riskLevelIfViolated') {
            row.riskLevelIfMissing = value;
            row.riskLevelIfViolated = value;
            return;
        }

        row[fieldKey] = value;
    });
}

export function applyChipItemsChange(
    items: AgentRuleScriptItem[],
    itemId: string,
    listKey: string,
    rowId: string,
    chipKey: string,
    chipItems: string[]
): AgentRuleScriptItem[] {
    return updateItemValue(items, itemId, (data) => {
        const list = getList(data, listKey);
        const row = list.find((entry, index) => getRowId(entry, index) === rowId);

        if (!row) {
            return;
        }

        row[chipKey] = chipItems.filter((item) => item.trim().length > 0);
    });
}

function updateItemValue(
    items: AgentRuleScriptItem[],
    itemId: string,
    mutator: (data: Record<string, unknown>) => void
): AgentRuleScriptItem[] {
    return items.map((item) => {
        if (item.id !== itemId) {
            return item;
        }

        const data = cloneValue(item.value);
        mutator(data);

        return {
            ...item,
            value: item.valueType === 'json-string' ? JSON.stringify(data) : data,
            isEmpty: false,
            valueType: item.valueType === 'json-string' ? 'json-string' : 'object',
        };
    });
}

function mapItemToSection(item: AgentRuleScriptItem): AgentRulesSectionDraft {
    switch (item.id) {
        case 'batchState':
            return mapBatchStateSection(item);
        case 'documentationRules':
            return mapRulesSection(item, 'Documentation rules (Intake)', 'rules', {
                idKey: 'ruleId',
                subtitleKeys: ['appliesToProcedureCode', 'appliesToServiceCategory'],
                riskKey: 'riskLevelIfMissing',
                chipsKey: 'requiredDocuments',
            });
        case 'payerCompliancePolicy':
            return mapRulesSection(item, 'Compliance policy rules', 'rules', {
                idKey: 'policyRuleId',
                subtitleKeys: ['type', 'procedureCode', 'serviceCategory'],
                riskKey: 'riskLevelIfViolated',
                chipsKey: 'requiredDocuments',
            });
        case 'codingRules':
            return mapRulesSection(item, 'Coding rules', 'rules', {
                idKey: 'ruleId',
                subtitleKeys: ['type', 'procedureCode'],
                riskKey: 'riskLevelIfViolated',
                chipsKey: 'allowedDiagnosisCodes',
                chipsLabel: 'Allowed diagnosis codes',
            });
        case 'payerCodingPolicy':
            return mapRulesSection(item, 'Payer coding policy rules', 'rules', {
                idKey: 'policyRuleId',
                subtitleKeys: ['type', 'procedureCode'],
                riskKey: 'riskLevelIfViolated',
                chipsKey: 'requiredDocuments',
            });
        case 'tariffAgreement':
            return mapTariffAgreementSection(item);
        case 'preAuthorization':
            return mapPreAuthorizationSection(item);
        default:
            return mapGenericSection(item);
    }
}

function mapBatchStateSection(item: AgentRuleScriptItem): AgentRulesSectionDraft {
    const data = resolveValue(item.value) ?? {};
    const documents = Array.isArray(data.documents) ? data.documents : [];

    return {
        itemId: item.id,
        label: item.label,
        agent: item.agent,
        group: item.group,
        tone: toneForGroup(item.group),
        isEmpty: item.isEmpty ?? false,
        readOnly: true,
        metaFields: [],
        summaryMetrics: [
            { label: 'Documents', value: String(documents.length) },
            { label: 'Extraction', value: String(data.extractionStatus ?? 'Unknown') },
            { label: 'Classification', value: String(data.classificationStatus ?? 'Unknown') },
            { label: 'Separation', value: String(data.separationStatus ?? 'Unknown') },
        ],
        listTitle: 'Documents in batch',
        listItems: documents.slice(0, 12).map((document, index) => ({
            id: String(document.id ?? index),
            title: String(document.name ?? `Document ${index + 1}`),
            subtitle: String(document.className ?? 'Unclassified'),
            fields: [
                {
                    key: 'review',
                    label: 'Review status',
                    type: 'text',
                    value: String(document.extractionReviewStatus ?? document.classificationReviewStatus ?? 'Pending'),
                },
            ],
        })),
    };
}

function mapRulesSection(
    item: AgentRuleScriptItem,
    listTitle: string,
    listKey: string,
    config: {
        idKey: string;
        subtitleKeys: string[];
        riskKey: string;
        chipsKey: string;
        chipsLabel?: string;
    }
): AgentRulesSectionDraft {
    const data = resolveValue(item.value) ?? {};
    const rules = getList(data, listKey);

    return {
        itemId: item.id,
        label: item.label,
        agent: item.agent,
        group: item.group,
        tone: toneForGroup(item.group),
        isEmpty: item.isEmpty ?? false,
        readOnly: false,
        metaFields: buildMetaFields(data, [
            ['rulesetId', 'Ruleset ID'],
            ['policyId', 'Policy ID'],
            ['codingSystem', 'Coding system'],
            ['payer', 'Payer'],
            ['effectiveFrom', 'Effective from'],
            ['effectiveTo', 'Effective to'],
        ]),
        summaryMetrics: [{ label: 'Rules', value: String(rules.length) }],
        listTitle,
        listItems: rules.map((rule, index) => mapRuleRow(rule, index, listKey, config)),
    };
}

function mapTariffAgreementSection(item: AgentRuleScriptItem): AgentRulesSectionDraft {
    const data = resolveValue(item.value) ?? {};
    const rules = getList(data, 'tariffRules');

    return {
        itemId: item.id,
        label: item.label,
        agent: item.agent,
        group: item.group,
        tone: toneForGroup(item.group),
        isEmpty: item.isEmpty ?? false,
        readOnly: false,
        metaFields: buildMetaFields(data, [
            ['contractId', 'Contract ID'],
            ['payer', 'Payer'],
            ['provider', 'Provider'],
            ['currency', 'Currency'],
            ['defaultAllowedVariancePercentage', 'Allowed variance %'],
        ]),
        summaryMetrics: [{ label: 'Tariff rules', value: String(rules.length) }],
        listTitle: 'Tariff rules',
        listItems: rules.map((rule, index) => ({
            id: getRowId(rule, index),
            title: String(rule.serviceCode ?? rule.procedureCode ?? `Tariff ${index + 1}`),
            subtitle: String(rule.description ?? ''),
            riskLevel: rule.requiresAuthorization ? 'HIGH' : 'LOW',
            fields: [
                textField('serviceCode', 'Service code', rule.serviceCode),
                textField('procedureCode', 'Procedure code', rule.procedureCode),
                textareaField('description', 'Description', rule.description),
                numberField('expectedAmount', 'Expected amount', rule.expectedAmount),
                numberField('minAmount', 'Minimum amount', rule.minAmount),
                numberField('maxAmount', 'Maximum amount', rule.maxAmount),
                booleanField('requiresAuthorization', 'Requires authorization', rule.requiresAuthorization),
            ],
            chips: chipField('requiredDocuments', 'Required documents', rule.requiredDocuments, true),
        })),
    };
}

function mapPreAuthorizationSection(item: AgentRuleScriptItem): AgentRulesSectionDraft {
    const data = resolveValue(item.value) ?? {};
    const services = getList(data, 'approvedServices');

    return {
        itemId: item.id,
        label: item.label,
        agent: item.agent,
        group: item.group,
        tone: toneForGroup(item.group),
        isEmpty: item.isEmpty ?? false,
        readOnly: false,
        metaFields: buildMetaFields(data, [
            ['authorizationId', 'Authorization ID'],
            ['payer', 'Payer'],
            ['patientId', 'Patient ID'],
            ['accountId', 'Account ID'],
            ['validFrom', 'Valid from'],
            ['validTo', 'Valid to'],
        ]),
        summaryMetrics: [{ label: 'Approved services', value: String(services.length) }],
        listTitle: 'Approved services',
        listItems: services.map((service, index) => ({
            id: getRowId(service, index),
            title: String(service.serviceCode ?? service.procedureCode ?? `Service ${index + 1}`),
            subtitle: String(service.description ?? ''),
            riskLevel: String(service.authorizationStatus ?? ''),
            fields: [
                textField('serviceCode', 'Service code', service.serviceCode),
                textField('procedureCode', 'Procedure code', service.procedureCode),
                textareaField('description', 'Description', service.description),
                numberField('approvedQuantity', 'Approved quantity', service.approvedQuantity),
                numberField('approvedAmount', 'Approved amount', service.approvedAmount),
                selectField('authorizationStatus', 'Authorization status', service.authorizationStatus, AUTH_STATUSES),
                booleanField('authorizationRequired', 'Authorization required', service.authorizationRequired),
            ],
        })),
    };
}

function mapGenericSection(item: AgentRuleScriptItem): AgentRulesSectionDraft {
    const data = resolveValue(item.value) ?? {};

    return {
        itemId: item.id,
        label: item.label,
        agent: item.agent,
        group: item.group,
        tone: toneForGroup(item.group),
        isEmpty: item.isEmpty ?? false,
        readOnly: false,
        metaFields: Object.keys(data)
            .filter((key) => typeof data[key] !== 'object')
            .slice(0, 6)
            .map((key) => ({
                key,
                label: humanizeKey(key),
                value: String(data[key] ?? ''),
                editable: true,
            })),
        summaryMetrics: [],
        listItems: [],
    };
}

function mapRuleRow(
    rule: Record<string, unknown>,
    index: number,
    listKey: string,
    config: {
        idKey: string;
        subtitleKeys: string[];
        riskKey: string;
        chipsKey: string;
        chipsLabel?: string;
    }
): AgentRulesListItem {
    const subtitle = config.subtitleKeys
        .map((key) => (rule[key] ? `${humanizeKey(key)}: ${rule[key]}` : null))
        .filter(Boolean)
        .join(' · ');

    return {
        id: getRowId(rule, index),
        title: String(rule[config.idKey] ?? `Rule ${index + 1}`),
        subtitle,
        riskLevel: String(rule[config.riskKey] ?? ''),
        fields: [
            textareaField('description', 'Description', rule.description),
            selectField(config.riskKey, 'Risk level', rule[config.riskKey], RISK_LEVELS),
            textField('procedureCode', 'Procedure code', rule.procedureCode),
            textField('serviceCategory', 'Service category', rule.serviceCategory),
            textField('type', 'Rule type', rule.type),
        ],
        chips: chipField(config.chipsKey, config.chipsLabel ?? 'Required documents', rule[config.chipsKey], true),
    };
}

function buildMetaFields(data: Record<string, unknown>, definitions: Array<[string, string]>): AgentRulesMetaField[] {
    return definitions
        .filter(([key]) => data[key] !== undefined && data[key] !== null && data[key] !== '')
        .map(([key, label]) => ({
            key,
            label,
            value: String(data[key] ?? ''),
            editable: true,
        }));
}

function textField(key: string, label: string, value: unknown): AgentRulesListField {
    return { key, label, type: 'text', value: String(value ?? '') };
}

function textareaField(key: string, label: string, value: unknown): AgentRulesListField {
    return { key, label, type: 'textarea', value: String(value ?? '') };
}

function numberField(key: string, label: string, value: unknown): AgentRulesListField {
    const parsed = Number(value);
    return { key, label, type: 'number', value: Number.isFinite(parsed) ? parsed : 0 };
}

function booleanField(key: string, label: string, value: unknown): AgentRulesListField {
    return { key, label, type: 'boolean', value: !!value };
}

function selectField(key: string, label: string, value: unknown, options: string[]): AgentRulesListField {
    return { key, label, type: 'select', value: String(value ?? options[0] ?? ''), options };
}

function chipField(key: string, label: string, value: unknown, editable: boolean): AgentRulesChipField {
    const items = Array.isArray(value) ? value.map((entry) => String(entry)) : [];

    return { key, label, items, editable };
}

function resolveValue(value: unknown): Record<string, unknown> | null {
    if (value === null || value === undefined || value === '') {
        return null;
    }

    if (typeof value === 'object') {
        return value as Record<string, unknown>;
    }

    if (typeof value === 'string') {
        try {
            const parsed = JSON.parse(value);
            return typeof parsed === 'object' && parsed !== null ? (parsed as Record<string, unknown>) : null;
        } catch {
            return null;
        }
    }

    return null;
}

function cloneValue(value: unknown): Record<string, unknown> {
    const resolved = resolveValue(value);

    if (!resolved) {
        return {};
    }

    return JSON.parse(JSON.stringify(resolved));
}

function getList(data: Record<string, unknown>, key: string): Array<Record<string, unknown>> {
    const value = data[key];
    return Array.isArray(value) ? (value as Array<Record<string, unknown>>) : [];
}

function getRowId(row: Record<string, unknown>, index: number): string {
    return String(row.ruleId ?? row.policyRuleId ?? row.serviceCode ?? row.procedureCode ?? index);
}

function toneForGroup(group: string): AgentRuleTone {
    switch (group) {
        case 'Context':
            return 'context';
        case 'Intake':
            return 'intake';
        case 'Compliance':
            return 'compliance';
        case 'Financial':
            return 'financial';
        case 'Coding':
            return 'coding';
        default:
            return 'shared';
    }
}

function humanizeKey(key: string): string {
    return key
        .replace(/([A-Z])/g, ' $1')
        .replace(/^./, (char) => char.toUpperCase())
        .trim();
}

export function getListKeyForItem(itemId: string): string {
    switch (itemId) {
        case 'tariffAgreement':
            return 'tariffRules';
        case 'preAuthorization':
            return 'approvedServices';
        default:
            return 'rules';
    }
}

export function ensureUiTabItems(items: AgentRuleScriptItem[]): AgentRuleScriptItem[] {
    const next = [...items];

    if (!next.some((item) => item.id === 'agreementGeneral')) {
        next.push(createUiScriptItem('agreementGeneral', 'Agreement General', deriveAgreementGeneralRaw(items)));
    }

    if (!next.some((item) => item.id === 'agreementDocuments')) {
        next.push(createUiScriptItem('agreementDocuments', 'Agreement Documents', deriveAgreementDocumentsRaw(items)));
    }

    return next;
}

export function mapAgreementGeneralViewModel(items: AgentRuleScriptItem[]): AgreementGeneralViewModel {
    const item = items.find((entry) => entry.id === 'agreementGeneral');
    const resolved = item ? resolveValue(item.value) : null;

    if (resolved) {
        return mergeAgreementGeneral(resolved);
    }

    return mergeAgreementGeneral(deriveAgreementGeneralRaw(items));
}

export function mapAgreementDocumentsViewModel(items: AgentRuleScriptItem[]): AgreementDocumentsViewModel {
    const item = items.find((entry) => entry.id === 'agreementDocuments');
    const resolved = item ? resolveValue(item.value) : null;

    if (resolved) {
        return mergeAgreementDocuments(resolved);
    }

    return mergeAgreementDocuments(deriveAgreementDocumentsRaw(items));
}

export function applyAgreementGeneralFieldChange(
    items: AgentRuleScriptItem[],
    key: keyof AgreementGeneralViewModel,
    value: string | number
): AgentRuleScriptItem[] {
    return updateItemValue(items, 'agreementGeneral', (data) => {
        data[key] = value;
    });
}

export function ruleHasIssues(listItem: AgentRulesListItem): boolean {
    const description = listItem.fields.find((field) => field.key === 'description')?.value;
    const hasDescription = typeof description === 'string' && description.trim().length > 0;
    const requiresChips = ['HIGH', 'MEDIUM'].includes(String(listItem.riskLevel ?? '').toUpperCase());
    const hasChips = (listItem.chips?.items.length ?? 0) > 0;

    return !hasDescription || (requiresChips && !hasChips);
}

export function sectionHasIssues(section: AgentRulesSectionViewModel): boolean {
    if (section.isEmpty || !section.listItems.length) {
        return true;
    }

    return section.listItems.some((listItem) => ruleHasIssues(listItem));
}

export function isValidateRulesReady(items: AgentRuleScriptItem[]): boolean {
    const viewModel = mapToViewModel(items);
    const agentSections = viewModel.sections.filter((section) => section.audience === 'agent');

    if (!agentSections.length) {
        return false;
    }

    return agentSections.every((section) => !sectionHasIssues(section));
}

export function getTariffModifierLabel(listItem: AgentRulesListItem): string {
    const expected = listItem.fields.find((field) => field.key === 'expectedAmount')?.value;
    const min = listItem.fields.find((field) => field.key === 'minAmount')?.value;
    const max = listItem.fields.find((field) => field.key === 'maxAmount')?.value;

    if (typeof expected !== 'number' || !expected) {
        return 'Standard';
    }

    if (typeof max === 'number' && max > expected) {
        const pct = Math.round(((max - expected) / expected) * 100);
        return `+${pct}%`;
    }

    if (typeof min === 'number' && min < expected) {
        const pct = Math.round(((expected - min) / expected) * 100);
        return `-${pct}%`;
    }

    return 'Standard';
}

export function getTariffModifierTone(listItem: AgentRulesListItem): 'positive' | 'negative' | 'neutral' {
    const label = getTariffModifierLabel(listItem);
    if (label.startsWith('+')) {
        return 'positive';
    }

    if (label.startsWith('-')) {
        return 'negative';
    }

    return 'neutral';
}

function createUiScriptItem(id: string, label: string, value: Record<string, unknown>): AgentRuleScriptItem {
    return {
        id,
        label,
        agent: 'UI only — not sent to agents',
        group: 'UI',
        value,
        valueType: 'object',
        isEmpty: false,
    };
}

function deriveAgreementGeneralRaw(items: AgentRuleScriptItem[]): Record<string, unknown> {
    const merged: Record<string, unknown> = { ...AGREEMENT_GENERAL_DEMO };
    const tariff = resolveValue(items.find((item) => item.id === 'tariffAgreement')?.value);
    const compliance = resolveValue(items.find((item) => item.id === 'payerCompliancePolicy')?.value);
    const documentation = resolveValue(items.find((item) => item.id === 'documentationRules')?.value);
    const coding = resolveValue(items.find((item) => item.id === 'codingRules')?.value);

    if (tariff?.contractId) {
        merged.contractId = tariff.contractId;
    }

    if (tariff?.payer) {
        merged.payer = tariff.payer;
    }

    if (tariff?.provider) {
        merged.providerName = tariff.provider;
        merged.providerDisplayName = String(tariff.provider);
    }

    if (tariff?.effectiveFrom) {
        merged.effectiveFrom = tariff.effectiveFrom;
    }

    if (tariff?.effectiveTo) {
        merged.effectiveTo = tariff.effectiveTo;
    }

    if (tariff?.currency) {
        merged.capitationCurrency = tariff.currency;
        merged.budgetCurrency = tariff.currency;
    }

    const payer = compliance?.payer ?? documentation?.payer ?? coding?.payer;
    if (payer) {
        merged.payer = payer;
    }

    return merged;
}

function deriveAgreementDocumentsRaw(items: AgentRuleScriptItem[]): Record<string, unknown> {
    const general = deriveAgreementGeneralRaw(items);
    const demo = JSON.parse(JSON.stringify(AGREEMENT_DOCUMENTS_DEMO)) as AgreementDocumentsViewModel;

    demo.primaryDocument.contractId = String(general.contractId ?? demo.primaryDocument.contractId);
    demo.primaryDocument.expiresAt = String(general.effectiveTo ?? demo.primaryDocument.expiresAt);

    return demo as unknown as Record<string, unknown>;
}

function mergeAgreementGeneral(data: Record<string, unknown>): AgreementGeneralViewModel {
    return {
        providerName: stringValue(data.providerName, AGREEMENT_GENERAL_DEMO.providerName),
        providerDisplayName: stringValue(data.providerDisplayName, AGREEMENT_GENERAL_DEMO.providerDisplayName),
        agreementBadge: stringValue(data.agreementBadge, AGREEMENT_GENERAL_DEMO.agreementBadge),
        contractId: stringValue(data.contractId, AGREEMENT_GENERAL_DEMO.contractId),
        payer: stringValue(data.payer, AGREEMENT_GENERAL_DEMO.payer),
        planName: stringValue(data.planName, AGREEMENT_GENERAL_DEMO.planName),
        legalRepresentative: stringValue(data.legalRepresentative, AGREEMENT_GENERAL_DEMO.legalRepresentative),
        contractType: stringValue(data.contractType, AGREEMENT_GENERAL_DEMO.contractType),
        effectiveFrom: stringValue(data.effectiveFrom, AGREEMENT_GENERAL_DEMO.effectiveFrom),
        effectiveTo: stringValue(data.effectiveTo, AGREEMENT_GENERAL_DEMO.effectiveTo),
        jurisdiction: stringValue(data.jurisdiction, AGREEMENT_GENERAL_DEMO.jurisdiction),
        capitationBase: numberValue(data.capitationBase, AGREEMENT_GENERAL_DEMO.capitationBase),
        capitationCurrency: stringValue(data.capitationCurrency, AGREEMENT_GENERAL_DEMO.capitationCurrency),
        capitationPeriod: stringValue(data.capitationPeriod, AGREEMENT_GENERAL_DEMO.capitationPeriod),
        budgetTotal: numberValue(data.budgetTotal, AGREEMENT_GENERAL_DEMO.budgetTotal),
        billedYtd: numberValue(data.billedYtd, AGREEMENT_GENERAL_DEMO.billedYtd),
        pendingApproval: numberValue(data.pendingApproval, AGREEMENT_GENERAL_DEMO.pendingApproval),
        budgetCurrency: stringValue(data.budgetCurrency, AGREEMENT_GENERAL_DEMO.budgetCurrency),
    };
}

function mergeAgreementDocuments(data: Record<string, unknown>): AgreementDocumentsViewModel {
    const primary = (data.primaryDocument as Record<string, unknown>) ?? {};
    const demo = AGREEMENT_DOCUMENTS_DEMO;

    return {
        primaryDocument: {
            title: stringValue(primary.title, demo.primaryDocument.title),
            status: stringValue(primary.status, demo.primaryDocument.status),
            contractId: stringValue(primary.contractId, demo.primaryDocument.contractId),
            expiresAt: stringValue(primary.expiresAt, demo.primaryDocument.expiresAt),
            repositoryId: stringValue(primary.repositoryId, demo.primaryDocument.repositoryId),
            repositoryNodeId: stringValue(primary.repositoryNodeId, demo.primaryDocument.repositoryNodeId),
            mimeType: stringValue(primary.mimeType, demo.primaryDocument.mimeType),
        },
        relatedFiles: Array.isArray(data.relatedFiles)
            ? (data.relatedFiles as AgreementDocumentsViewModel['relatedFiles'])
            : demo.relatedFiles,
        historicalVersions: Array.isArray(data.historicalVersions)
            ? (data.historicalVersions as AgreementDocumentsViewModel['historicalVersions'])
            : demo.historicalVersions,
    };
}

function stringValue(value: unknown, fallback: string): string {
    return value === undefined || value === null || value === '' ? fallback : String(value);
}

function numberValue(value: unknown, fallback: number): number {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : fallback;
}

export function getPayerSidebarProfiles(): PayerSidebarProfile[] {
    return PAYER_SIDEBAR_PROFILES;
}

export function getPayerProfileById(payerId: string): PayerSidebarProfile | undefined {
    return PAYER_SIDEBAR_PROFILES.find((profile) => profile.id === payerId);
}

export function resolveActivePayerId(items: AgentRuleScriptItem[]): string {
    const tariff = resolveValue(items.find((item) => item.id === 'tariffAgreement')?.value);
    const payer = String(tariff?.payer ?? '').trim().toLowerCase();
    const provider = String(tariff?.provider ?? '').trim().toLowerCase();

    if (payer.includes('ars primera') || provider.includes('cm-uce') || provider.includes('cm uce')) {
        return 'ars-primera';
    }

    return 'ars-primera';
}

export function mapTariffSectionFromPayloadValue(
    value: Record<string, unknown>,
    options: { readOnly?: boolean; agentLabel?: string } = {}
): AgentRulesSectionViewModel {
    const item: AgentRuleScriptItem = {
        id: 'tariffAgreement',
        label: 'Tariff Agreement',
        agent: options.agentLabel ?? (options.readOnly ? 'Demo profile — not sent to agents' : 'Financial Variance Agent'),
        group: 'Financial',
        value,
        isEmpty: false,
    };

    const section = applySectionMetadata(mapTariffAgreementSection(item));

    return {
        ...section,
        readOnly: options.readOnly ?? false,
    };
}
