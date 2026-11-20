import { amountsMatch, billedRowAmount, billedRowAmounts, BilledRowAmounts, normalizeKey, parseAmount } from '../../../form-widgets/intake-account-widget/batch-state-billing-fields';

export { billedRowAmounts, parseAmount };
export type { BilledRowAmounts };

/**
 * Compact intake of the case view (Service Explorer + Document Control Center), pure. Support is
 * read only from the documentary coverage (required vs present document classes); extraction
 * confidence and IDP review flags are not shown here.
 */

export interface IntakeServiceLike {
    id: string;
    serviceDate: string | null;
    serviceCode: string | null;
    cup: string | null;
    description: string | null;
    quantity: string | null;
    price: string | null;
    total: string | null;
    coverage: string | null;
    invoiceNumber: string | null;
    category: string | null;
    completionPercent: number;
    requiredDocuments: string[];
    presentDocuments: string[];
    missingDocuments: string[];
    extractionSource: string | null;
    sourceDocumentId?: string;
    extractedFields?: Array<{ label: string; value: string }>;
    /** Service group from the mapper (section header or group text); null/absent = no group. */
    serviceGroup?: IntakeServiceGroupLike | null;
}

export interface IntakeServiceGroupLike {
    key: string;
    code: string | null;
    label: string;
    order: number;
    /** Billed subtotal of the invoice's group rows; null/absent when none. */
    billedSubtotal?: number | null;
}

export interface IntakeDocumentLike {
    id: string;
    className: string;
}

export interface IntakeKpis {
    documents: number;
    services: number;
    supported: number;
    unsupported: number;
    /** Average documentary coverage of the services, 0-100 (100 with no services). */
    readiness: number;
}

/** Status filters of the Service Explorer (same set as the intake widget, plus the analyst's marks). */
export type IntakeFilter = 'all' | 'supported' | 'unsupported' | 'unreviewed' | 'reviewed' | 'withFinding' | 'withWarnings';
export const INTAKE_FILTERS: readonly IntakeFilter[] = ['all', 'supported', 'unsupported', 'unreviewed', 'reviewed', 'withFinding', 'withWarnings'];

/**
 * Why a service needs a second look: its group sum does not match the billed subtotal, or it lacks
 * documentary support. An assumed quantity or a computed total is a calculation, not a warning: the
 * table marks it (italic + tooltip) without the amber icon.
 */
export type IntakeWarning = 'subtotalMismatch' | 'unsupported';
export const INTAKE_WARNINGS: readonly IntakeWarning[] = ['subtotalMismatch', 'unsupported'];

/** Audit finding statuses that settle a service in the intake: sent to review, accepted or dismissed. */
export const SETTLED_FINDING_STATUSES: readonly string[] = ['review', 'accepted', 'dismissed'];

/** What the analyst already did on the intake services of ONE invoice (structural subsets of the progress and the audit). */
export interface IntakeResolutionInput {
    /** Services marked reviewed (`case-progress.json` → `reviewedServices`). */
    reviewed?: Iterable<string>;
    /** Registrations of the invoice (`case-progress.json` → `registrations`). */
    registrations?: ReadonlyArray<{ kind: string; serviceIds: readonly string[]; findingIds: readonly string[] }>;
    /** Findings of the invoice in the audit tray. */
    findings?: ReadonlyArray<{ id: string; origin: string; status: string; sourceRef: string | null }>;
    /** Status of the audit finding that covers each service (deduplicated match), by service id. */
    findingStatus?: Readonly<Record<string, string>>;
}

/**
 * Services whose warnings no longer count: reviewed, or remediated (a remediation registration, or
 * a finding of theirs in `review`, `accepted` or `dismissed`). They show no warning icon, are left
 * out of the warning counts (intake chip, Control Center chip) and do not block the automatic
 * intake approval.
 */
export function resolvedIntakeServiceIds(input: IntakeResolutionInput): Set<string> {
    const resolved = new Set<string>(input.reviewed ?? []);
    const settled = new Set((input.findings ?? []).filter((finding) => SETTLED_FINDING_STATUSES.includes(finding.status)).map((finding) => finding.id));
    for (const registration of input.registrations ?? []) {
        if (registration.kind === 'remediation' || registration.findingIds.some((id) => settled.has(id))) {
            registration.serviceIds.forEach((id) => resolved.add(id));
        }
    }
    for (const finding of input.findings ?? []) {
        if (finding.origin === 'intake' && finding.sourceRef && settled.has(finding.id)) {
            resolved.add(finding.sourceRef);
        }
    }
    for (const [id, status] of Object.entries(input.findingStatus ?? {})) {
        if (SETTLED_FINDING_STATUSES.includes(status)) {
            resolved.add(id);
        }
    }
    return resolved;
}
export interface PendingSupportClass {
    label: string;
    /** Services that miss a document of this class. */
    count: number;
}

export interface ServiceDetailField {
    /** i18n key of the label (main fields) or null for an extracted label shown as is. */
    labelKey: string | null;
    label: string;
    value: string;
    /** Parsed amount of Quantity / Unit price / Total (the template formats it); absent for text fields. */
    amount?: number;
    /** `assumed`: quantity 1 because IDP did not detect one; `computed`: total = price x quantity. */
    mark?: 'assumed' | 'computed';
}

export function isSupported(service: Pick<IntakeServiceLike, 'missingDocuments'>): boolean {
    return service.missingDocuments.length === 0;
}

export function computeIntakeKpis(services: readonly IntakeServiceLike[], documentCount: number): IntakeKpis {
    const supported = services.filter(isSupported).length;
    const readiness = services.length ? Math.round(services.reduce((sum, service) => sum + (service.completionPercent ?? 0), 0) / services.length) : 100;
    return { documents: documentCount, services: services.length, supported, unsupported: services.length - supported, readiness };
}

export function filterServices<T extends IntakeServiceLike>(
    services: readonly T[],
    filter: IntakeFilter,
    reviewed: ReadonlySet<string>,
    linkedTo: ReadonlySet<string> | null = null,
    withFinding: ReadonlySet<string> = new Set(),
    warnings: ReadonlyMap<string, readonly IntakeWarning[]> = new Map(),
    warningReason: IntakeWarning | null = null
): T[] {
    return services.filter((service) => {
        if (linkedTo && !linkedTo.has(service.id)) {
            return false;
        }
        switch (filter) {
            case 'unsupported':
                return !isSupported(service);
            case 'supported':
                return isSupported(service);
            case 'unreviewed':
                return !reviewed.has(service.id);
            case 'reviewed':
                return reviewed.has(service.id);
            case 'withFinding':
                return withFinding.has(service.id);
            case 'withWarnings':
                return hasIntakeWarning(warnings, service.id, warningReason);
            default:
                return true;
        }
    });
}

/** Everything that narrows the Service Explorer; null/empty means "not applied". */
export interface IntakeCriteria {
    filter: IntakeFilter;
    reviewed: ReadonlySet<string>;
    withFinding: ReadonlySet<string>;
    search: string;
    /** Services linked to the document chosen in the document filter. */
    documentIds: ReadonlySet<string> | null;
    /** Service group key (`NO_GROUP_KEY` for the rows without group). */
    groupKey: string | null;
    /** Services of the selected finding or pending support class. */
    focusIds: ReadonlySet<string> | null;
    /** Warnings by service id (`intakeWarningsById` over the whole invoice), read by the `withWarnings` filter. */
    warnings?: ReadonlyMap<string, readonly IntakeWarning[]>;
    /** Reason of the `withWarnings` filter; null/absent = any reason. */
    warningReason?: IntakeWarning | null;
}

export const NO_GROUP_KEY = '__none__';

export function groupKeyOf(service: Pick<IntakeServiceLike, 'serviceGroup'>): string {
    return service.serviceGroup?.key ?? NO_GROUP_KEY;
}

/** Free-text search on code, CUP, description, category and group (case and accent insensitive). */
export function matchesIntakeSearch(service: IntakeServiceLike, term: string): boolean {
    const needle = normalizeKey(term);
    if (!needle) {
        return true;
    }
    return [service.serviceCode, service.cup, service.description, service.category, service.serviceGroup?.label].some((value) => !!value && normalizeKey(value).includes(needle));
}

export function applyIntakeCriteria<T extends IntakeServiceLike>(services: readonly T[], criteria: IntakeCriteria): T[] {
    return filterServices(services, criteria.filter, criteria.reviewed, criteria.documentIds, criteria.withFinding, criteria.warnings, criteria.warningReason ?? null).filter(
        (service) =>
            (!criteria.focusIds || criteria.focusIds.has(service.id)) &&
            (!criteria.groupKey || groupKeyOf(service) === criteria.groupKey) &&
            matchesIntakeSearch(service, criteria.search)
    );
}

export interface IntakeServiceGroup<T extends IntakeServiceLike> {
    key: string;
    code: string | null;
    /** Null for the rows without group (the template shows "No group"). */
    label: string | null;
    services: T[];
    /** Sum of the item amounts (Total, else Price x Quantity); null when no row has one. */
    subtotal: number | null;
    /** Subtotal the invoice bills for the group (its group row); null when none. */
    billedSubtotal: number | null;
    /** True when a billed subtotal exists and the item sum does not match it (beyond tolerance). */
    subtotalMismatch: boolean;
    supported: number;
    unsupported: number;
}

/** Services by group, in invoice order (first row of each group); rows without group last. */
export function groupIntakeServices<T extends IntakeServiceLike>(services: readonly T[]): IntakeServiceGroup<T>[] {
    const groups = new Map<string, IntakeServiceGroup<T> & { order: number }>();
    for (const service of services) {
        const key = groupKeyOf(service);
        let group = groups.get(key);
        if (!group) {
            group = {
                key,
                code: service.serviceGroup?.code ?? null,
                label: service.serviceGroup?.label ?? null,
                order: service.serviceGroup ? service.serviceGroup.order : Number.MAX_SAFE_INTEGER,
                services: [],
                subtotal: null,
                billedSubtotal: service.serviceGroup?.billedSubtotal ?? null,
                subtotalMismatch: false,
                supported: 0,
                unsupported: 0,
            };
            groups.set(key, group);
        }
        group.services.push(service);
        const amount = billedRowAmount(service);
        if (amount !== null) {
            group.subtotal = Math.round(((group.subtotal ?? 0) + amount) * 100) / 100;
        }
        if (isSupported(service)) {
            group.supported++;
        } else {
            group.unsupported++;
        }
    }
    return [...groups.values()]
        .sort((a, b) => a.order - b.order || (a.label ?? '').localeCompare(b.label ?? ''))
        .map(({ order: _order, ...group }) => ({
            ...group,
            subtotalMismatch: group.billedSubtotal !== null && (group.subtotal === null || !amountsMatch(group.subtotal, group.billedSubtotal)),
        }));
}

/**
 * Warnings of one service, in `INTAKE_WARNINGS` order (empty when none). `group` is the service's
 * group computed over the whole invoice, so a filtered view does not hide a subtotal mismatch. A
 * service in `resolved` (reviewed or remediated, see `resolvedIntakeServiceIds`) has none.
 */
export function intakeServiceWarnings(
    service: IntakeServiceLike,
    group: Pick<IntakeServiceGroup<IntakeServiceLike>, 'subtotalMismatch'> | null,
    resolved: ReadonlySet<string> = new Set()
): IntakeWarning[] {
    if (resolved.has(service.id)) {
        return [];
    }
    const warnings: IntakeWarning[] = [];
    if (group?.subtotalMismatch) {
        warnings.push('subtotalMismatch');
    }
    if (!isSupported(service)) {
        warnings.push('unsupported');
    }
    return warnings;
}

/**
 * Warnings by service id, with the group mismatches computed over every service of the invoice;
 * the services in `resolved` (reviewed or remediated) map to no warning.
 */
export function intakeWarningsById(services: readonly IntakeServiceLike[], resolved: ReadonlySet<string> = new Set()): Map<string, IntakeWarning[]> {
    const warnings = new Map<string, IntakeWarning[]>();
    for (const group of groupIntakeServices(services)) {
        group.services.forEach((service) => warnings.set(service.id, intakeServiceWarnings(service, group, resolved)));
    }
    return warnings;
}

/** Services with at least one warning in a map of `intakeWarningsById`. */
export function countIntakeServicesWithWarnings(warnings: ReadonlyMap<string, readonly unknown[]>): number {
    return [...warnings.values()].filter((list) => list.length > 0).length;
}

/** True when the service has the given warning (any warning when `reason` is null). */
export function hasIntakeWarning(warnings: ReadonlyMap<string, readonly IntakeWarning[]>, serviceId: string, reason: IntakeWarning | null = null): boolean {
    const list = warnings.get(serviceId) ?? [];
    return reason ? list.includes(reason) : list.length > 0;
}

/** Options of the group filter (every group of the invoice, in invoice order). */
export function intakeGroupOptions(services: readonly IntakeServiceLike[]): Array<{ key: string; label: string | null; count: number }> {
    return groupIntakeServices(services).map((group) => ({ key: group.key, label: group.label, count: group.services.length }));
}

/** Services that miss a document of the given support class. */
export function servicesMissingDocument(services: readonly IntakeServiceLike[], label: string): string[] {
    return services.filter((service) => service.missingDocuments.includes(label)).map((service) => service.id);
}

// Findings panel ------------------------------------------------------------------------------

/** Audit finding as the intake reads it (structural subset of `AuditFinding`). */
export interface IntakeFindingLike {
    id: string;
    origin: string;
    description: string;
    serviceCode: string | null;
    status: string;
    comment: string | null;
    sourceRef: string | null;
}

/** Intake registration as the intake reads it (structural subset of `CaseRegistration`). */
export interface IntakeRegistrationLike {
    id: string;
    kind: 'finding' | 'remediation';
    serviceIds: string[];
    findingIds: string[];
    comment: string | null;
    at: string;
}

/** `registration`: registered from the intake (progress JSON); `audit`: in the audit tray; `analysis`: agent observation not registered yet. */
export type IntakeFindingSource = 'registration' | 'audit' | 'analysis';

export interface IntakeFindingEntry {
    id: string;
    source: IntakeFindingSource;
    kind: 'finding' | 'remediation' | null;
    origin: string;
    title: string;
    comment: string | null;
    status: string | null;
    at: string | null;
    /** Services of this invoice the finding points to. */
    serviceIds: string[];
    /** Registration id (`registration`) or audit / analysis finding id (`audit`, `analysis`). */
    refId: string;
}

/** What the analyst can do with a finding card: delete his own record, dismiss an agent observation, or nothing. */
export type IntakeFindingAction = 'delete' | 'dismiss' | null;

/**
 * Registrations and intake findings are the analyst's records: they can be deleted. Agent
 * observations (in the audit or not yet) are never deleted; they can be dismissed, as in the audit
 * tray, unless they already are.
 */
export function intakeFindingAction(entry: Pick<IntakeFindingEntry, 'source' | 'origin' | 'status'>): IntakeFindingAction {
    if (entry.source === 'registration' || (entry.source === 'audit' && entry.origin === 'intake')) {
        return 'delete';
    }
    return entry.status === 'dismissed' ? null : 'dismiss';
}

/**
 * Services a finding points to: the intake service it was registered from (`sourceRef`), else
 * the services whose CUP/CUM or service code matches the finding code.
 */
export function servicesForFinding(finding: Pick<IntakeFindingLike, 'origin' | 'serviceCode' | 'sourceRef'>, services: readonly IntakeServiceLike[]): string[] {
    if (finding.origin === 'intake' && finding.sourceRef && services.some((service) => service.id === finding.sourceRef)) {
        return [finding.sourceRef];
    }
    const code = normalizeKey(finding.serviceCode);
    if (!code) {
        return [];
    }
    return services.filter((service) => normalizeKey(service.cup) === code || normalizeKey(service.serviceCode) === code).map((service) => service.id);
}

/**
 * Findings panel: the intake registrations (newest first, one entry per registration with all
 * its services), then the audit findings no registration covers, then the analysis observations
 * not yet in the audit.
 */
export function buildIntakeFindings(
    services: readonly IntakeServiceLike[],
    registrations: readonly IntakeRegistrationLike[],
    auditFindings: readonly IntakeFindingLike[],
    analysisFindings: readonly IntakeFindingLike[] = []
): IntakeFindingEntry[] {
    const serviceIds = new Set(services.map((service) => service.id));
    const auditById = new Map(auditFindings.map((finding) => [finding.id, finding]));
    const covered = new Set<string>();
    const entries: IntakeFindingEntry[] = [];

    for (const registration of [...registrations].reverse()) {
        const ids = registration.serviceIds.filter((id) => serviceIds.has(id));
        if (!ids.length) {
            continue;
        }
        registration.findingIds.forEach((id) => covered.add(id));
        const first = registration.findingIds.map((id) => auditById.get(id)).find((finding): finding is IntakeFindingLike => !!finding);
        entries.push({
            id: `registration:${registration.id}`,
            refId: registration.id,
            source: 'registration',
            kind: registration.kind,
            origin: 'intake',
            title: registration.comment ?? first?.description ?? '',
            comment: registration.comment ? (first?.description ?? null) : null,
            status: first?.status ?? null,
            at: registration.at,
            serviceIds: ids,
        });
    }

    for (const finding of auditFindings) {
        if (covered.has(finding.id)) {
            continue;
        }
        entries.push({
            id: `audit:${finding.id}`,
            refId: finding.id,
            source: 'audit',
            kind: finding.status === 'review' ? 'remediation' : 'finding',
            origin: finding.origin,
            title: finding.description,
            comment: finding.comment,
            status: finding.status,
            at: null,
            serviceIds: servicesForFinding(finding, services),
        });
    }

    for (const finding of analysisFindings) {
        if (auditById.has(finding.id)) {
            continue;
        }
        entries.push({
            id: `analysis:${finding.id}`,
            refId: finding.id,
            source: 'analysis',
            kind: null,
            origin: finding.origin,
            title: finding.description,
            comment: null,
            status: null,
            at: null,
            serviceIds: servicesForFinding(finding, services),
        });
    }
    return entries;
}

/** i18n suffix of a finding origin: `codingIntegrity` -> `CODING_INTEGRITY`. */
export function originKey(origin: string): string {
    return origin.replace(/([a-z])([A-Z])/g, '$1_$2').toUpperCase();
}

/** Missing support grouped by document class, most frequent first. */
export function pendingSupportByClass(services: readonly IntakeServiceLike[]): PendingSupportClass[] {
    const counts = new Map<string, number>();
    for (const service of services) {
        for (const label of new Set(service.missingDocuments.filter(Boolean))) {
            counts.set(label, (counts.get(label) ?? 0) + 1);
        }
    }
    return [...counts.entries()].map(([label, count]) => ({ label, count })).sort((a, b) => b.count - a.count || a.label.localeCompare(b.label));
}

/**
 * Services tied to a document: billed in it (source of the row) or supported by its class.
 * `supportLabel` turns the document class into the support label used by the coverage.
 */
export function servicesLinkedToDocument(document: IntakeDocumentLike, services: readonly IntakeServiceLike[], supportLabel: (className: string) => string): string[] {
    const label = supportLabel(document.className);
    return services.filter((service) => service.sourceDocumentId === document.id || service.presentDocuments.includes(label)).map((service) => service.id);
}

/** Documents tied to a service: the one it was read from first, then those that support it. */
export function documentsLinkedToService<T extends IntakeDocumentLike>(service: IntakeServiceLike, documents: readonly T[], supportLabel: (className: string) => string): T[] {
    const source = documents.filter((document) => document.id === service.sourceDocumentId);
    const support = documents.filter((document) => document.id !== service.sourceDocumentId && service.presentDocuments.includes(supportLabel(document.className)));
    return [...source, ...support];
}

const AUTHORIZATION_KEYS = ['AUTORIZACION', 'NO AUTORIZACION', 'NUMERO DE AUTORIZACION', 'AUTHORIZATION', 'AUTORIZACAO'];

/** Authorization number of the billed row, when IDP extracted one. */
export function serviceAuthorization(service: IntakeServiceLike): string | null {
    const field = (service.extractedFields ?? []).find((entry) => {
        const key = normalizeKey(entry.label);
        return AUTHORIZATION_KEYS.includes(key) || key.startsWith('AUTORIZ');
    });
    return field?.value ?? null;
}

/**
 * Main fields of the service detail, in reading order and only when present (i18n keys under
 * `<prefix>.FIELD.*`). The full extracted row is listed apart (`extractedFields`).
 */
export function serviceDetailFields(service: IntakeServiceLike, prefix: string): ServiceDetailField[] {
    const amounts: BilledRowAmounts = billedRowAmounts(service);
    const priced = amounts.total !== null;
    const field = (key: string, value: string | null, extra: Partial<ServiceDetailField> = {}): ServiceDetailField | null =>
        value && String(value).trim() ? { labelKey: `${prefix}.FIELD.${key}`, label: key, value, ...extra } : null;
    const quantity = amounts.quantityAssumed
        ? priced || service.quantity
            ? field('QUANTITY', service.quantity?.trim() || '1', { amount: 1, mark: 'assumed' })
            : null
        : field('QUANTITY', service.quantity, { amount: amounts.quantity });
    const price = field('UNIT_PRICE', service.price, amounts.price !== null ? { amount: amounts.price } : {});
    const total = amounts.total === null ? field('TOTAL', service.total) : field('TOTAL', service.total?.trim() || String(amounts.total), { amount: amounts.total, ...(amounts.totalComputed ? { mark: 'computed' as const } : {}) });
    const fields: Array<ServiceDetailField | null> = [
        field('CODE', service.serviceCode),
        field('CUP', service.cup),
        field('DESCRIPTION', service.description),
        field('CATEGORY', service.category),
        field('DATE', service.serviceDate),
        quantity,
        price,
        total,
        field('AUTHORIZATION', serviceAuthorization(service)),
        field('COVERAGE', service.coverage),
        field('INVOICE', service.invoiceNumber),
        field('SOURCE', service.extractionSource),
    ];
    return fields.filter((entry): entry is ServiceDetailField => entry !== null);
}

