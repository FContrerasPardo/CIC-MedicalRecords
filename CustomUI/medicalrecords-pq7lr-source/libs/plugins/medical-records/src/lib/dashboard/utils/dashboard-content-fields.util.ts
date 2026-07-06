const LEGACY_CONTENT_FIELD_ALIASES: Record<string, string> = {
    sys_createddate: 'sys_created',
    'sys:created_date': 'sys_created',
    'cmis:creationdate': 'sys_created',
    sys_type: 'sys_primaryType',
    'cmis:objecttypeid': 'sys_primaryType',
};

const LEGACY_BINDING_FIELDS = new Set([
    'sys_createdDate',
    'sys:created_date',
    'sys_type',
    'cmis:creationDate',
    'cmis:objectTypeId',
]);

export const HXP_DOCUMENTS_ALL_QUERY = 'SELECT * FROM hxp:document';

export const HXP_DOCUMENTS_CLASSIFIED_QUERY =
    "SELECT * FROM hxp:document WHERE sys_primaryType IS NOT NULL AND sys_primaryType <> ''";

export function normalizeContentFieldKey(key: string): string {
    const trimmed = key.trim();
    if (!trimmed) {
        return trimmed;
    }
    const canonical = LEGACY_CONTENT_FIELD_ALIASES[trimmed.toLowerCase()];
    return canonical ?? trimmed;
}

export function normalizeContentRow(row: Record<string, unknown>): Record<string, unknown> {
    const next: Record<string, unknown> = { ...row };

    const created =
        next['sys_created'] ??
        next['sys_createdDate'] ??
        next['sys:created_date'] ??
        next['cmis:creationDate'];
    if (created != null && created !== '') {
        next['sys_created'] = created;
    }

    const primaryType =
        next['sys_primaryType'] ?? next['sys_type'] ?? next['cmis:objectTypeId'];
    if (primaryType != null && primaryType !== '') {
        next['sys_primaryType'] = primaryType;
    }

    return next;
}

export function normalizeContentBindingField(field?: string): string | undefined {
    if (!field) {
        return field;
    }
    return normalizeContentFieldKey(field);
}

export function isLegacyContentBindingField(field?: string): boolean {
    return !!field && LEGACY_BINDING_FIELDS.has(field);
}

export function normalizeContentColumnFields(fields?: string[]): string[] | undefined {
    if (!fields?.length) {
        return fields;
    }
    const normalized = fields.map((field) => normalizeContentFieldKey(field));
    return [...new Set(normalized)];
}

export function shouldUpgradeToClassifiedContentQuery(query?: string): boolean {
    const trimmed = query?.trim();
    if (!trimmed) {
        return false;
    }
    return trimmed.toUpperCase() === HXP_DOCUMENTS_ALL_QUERY.toUpperCase();
}

export function isClassifiedContentQuery(query?: string): boolean {
    const trimmed = query?.trim().toUpperCase() ?? '';
    return trimmed.includes('SYS_PRIMARYTYPE') && trimmed.includes('WHERE');
}
