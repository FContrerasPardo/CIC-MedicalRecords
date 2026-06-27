import { AgentRuleScriptItem } from './agent-rules-widget.model';
import { serializeItemValue } from './agent-rules.mapper';

type FormFieldRef = { id?: string; value?: unknown };
type FormRef = {
    getFieldById?: (id: string) => FormFieldRef | undefined;
    getFormFields?: () => FormFieldRef[];
};

const ITEM_FORM_FIELD_ALIASES: Record<string, string[]> = {
    batchState: ['batchState', 'BatchState'],
    documentationRules: ['documentationRules', 'documentation-rules'],
    payerCompliancePolicy: ['payerCompliancePolicy', 'payer-compliance-policy'],
    preAuthorization: ['preAuthorization', 'pre-authorization'],
    tariffAgreement: ['tariffAgreement', 'tariff-agreement'],
    payerCodingPolicy: ['payerCodingPolicy', 'payer-coding-policy'],
    codingRules: ['codingRules', 'coding-rules'],
    agreementGeneral: ['agreementGeneral', 'agreement-general'],
    agreementDocuments: ['agreementDocuments', 'agreement-documents'],
};

function normalizeFieldKey(value: string): string {
    return value.replace(/[^a-z0-9]/gi, '').toLowerCase();
}

export function findLinkedFormField(form: FormRef | undefined, itemId: string): FormFieldRef | undefined {
    if (!form) {
        return undefined;
    }

    const aliases = ITEM_FORM_FIELD_ALIASES[itemId] ?? [itemId];

    for (const alias of aliases) {
        const field = form.getFieldById?.(alias);
        if (field) {
            return field;
        }
    }

    const targetKey = normalizeFieldKey(itemId);
    const fields = form.getFormFields?.() ?? [];

    return fields.find((field) => normalizeFieldKey(String(field.id ?? '')) === targetKey);
}

export function toFormFieldValue(item: AgentRuleScriptItem, currentFieldValue: unknown): unknown {
    const serialized = serializeItemValue(item);
    const prefersString =
        typeof currentFieldValue === 'string' || item.valueType === 'json-string' || item.id !== 'batchState';

    if (item.id === 'batchState') {
        const objectValue =
            typeof serialized === 'string'
                ? parseJsonObject(serialized)
                : serialized;

        if (typeof currentFieldValue === 'string') {
            return JSON.stringify(objectValue ?? {});
        }

        return objectValue ?? {};
    }

    if (prefersString) {
        if (typeof serialized === 'string') {
            return serialized;
        }

        return JSON.stringify(serialized ?? {});
    }

    return serialized;
}

function parseJsonObject(value: string): Record<string, unknown> | null {
    try {
        const parsed = JSON.parse(value);
        return typeof parsed === 'object' && parsed !== null ? (parsed as Record<string, unknown>) : null;
    } catch {
        return null;
    }
}
