import {
    BatchStateDocument,
    BatchStateField,
    BatchStateSource,
    BatchStateTable,
    BatchStateTableCell,
    IdpBatchStageStatus,
} from './batch-state.model';
import {
    IntakeAccountAiExtractionViewModel,
    IntakeAccountDocumentControlItemViewModel,
    IntakeAccountDocumentHighlightViewModel,
    IntakeAccountMissingDocumentViewModel,
    IntakeAccountProcedureSummaryItemViewModel,
    IntakeAccountReviewAlertViewModel,
    IntakeAccountServiceItemViewModel,
    IntakeAccountTone,
    IntakeAccountViewModel,
} from './intake-account-view.model';

type DocumentKind = 'billing' | 'authorization' | 'admission' | 'objection' | 'pathology' | 'lab' | 'other';

interface DocumentProfile {
    sourceKind: DocumentKind;
    sourcePriority: number;
    patientName: string | null;
    patientId: string | null;
    mrn: string | null;
    dob: string | null;
    ageLabel: string | null;
    provider: string | null;
    invoiceNumber: string | null;
    admissionDate: string | null;
    dischargeDate: string | null;
    insurancePlan: string | null;
    totalBilled: string | null;
    arsAmount: string | null;
    patientAmount: string | null;
    arsBalance: string | null;
    patientBalance: string | null;
}

interface ServiceSeedRow {
    id: string;
    serviceDate: string | null;
    serviceDateValue: Date | null;
    serviceName: string | null;
    cup: string | null;
    description: string | null;
    quantity: string | null;
    price: string | null;
    total: string | null;
    coverage: string | null;
    patientName: string | null;
    invoiceNumber: string | null;
    sourceDocument: string | null;
    procedureKey: string;
    totalAmountValue: number | null;
    coverageAmountValue: number | null;
    copayAmountValue: number | null;
}

interface AccountSeed {
    key: string;
    profiles: DocumentProfile[];
    documents: BatchStateDocument[];
    services: ServiceSeedRow[];
    names: string[];
    patientIds: string[];
    mrns: string[];
    invoices: string[];
    providers: string[];
    signalDates: Date[];
}

interface AccountCluster extends AccountSeed {
    assistedMerged: boolean;
}

interface SummarySupportInfo {
    requiredDocs: string[];
    presentDocs: string[];
    missingDocs: string[];
    tone: IntakeAccountTone;
    supportStatus: string;
}

const EMPTY_MESSAGE = 'No fue posible leer batchState. Verifica que el formulario reciba un JSON valido.';
const SUPPORTED_PAGE_SIZES = [10, 25, 50];
const STAGES = ['Intake', 'Analysis', 'Approval', 'Execution', 'Review', 'Completed'];

const BILLING_FIELDS = {
    patientName: ['Nombre del Paciente', 'Paciente'],
    patientId: ['Cedula', 'No. Carnet', 'Numero de Carnet', 'Document Number'],
    mrn: ['Record', 'MRN', 'Historia Clinica'],
    dob: ['Fecha Nacimiento', 'Fecha de Nacimiento'],
    ageLabel: ['Edad'],
    provider: ['Prestador', 'IPS', 'Institucion', 'Hospital', 'Centro Medico'],
    invoiceNumber: ['Numero de Factura', 'Factura', 'No. Factura'],
    admissionDate: ['Fecha Admision', 'Fecha de Admision', 'Fecha Ingreso'],
    dischargeDate: ['Fecha De Alta', 'Fecha de Alta', 'Fecha Egreso'],
    insurancePlan: ['Plan', 'Contratante', 'ARS', 'Aseguradora'],
    totalBilled: ['Monto total Facturado', 'Monto Total Facturado', 'Total Facturado'],
    arsAmount: ['Monto Facturado al ARS', 'Monto Facturado ARS', 'Monto ARS'],
    patientAmount: ['Monto Facturado al Paciente', 'Monto Paciente'],
    arsBalance: ['Balance del ARS', 'Balance ARS'],
    patientBalance: ['Balance del Paciente', 'Balance Paciente'],
} as const;

const DIAGNOSIS_FIELD_ALIASES = ['Diagnostico', 'Diagnostico Principal', 'Diagnosticos', 'Impresion Diagnostica'];

export function mapBatchStateToIntakeAccountViewModel(batchState: BatchStateSource, selectedPatientKey: string | null): IntakeAccountViewModel {
    const documents = Array.isArray(batchState.documents) ? batchState.documents.filter(Boolean) : [];

    if (!documents.length) {
        return createEmptyIntakeAccountViewModel('No se encontraron documentos en batchState.');
    }

    const clusters = buildAccountClusters(documents).filter((cluster) => isRenderableCluster(cluster));
    const sortedClusters = sortClusters(clusters);
    const selectedCluster = resolveSelectedCluster(sortedClusters, selectedPatientKey);

    if (!selectedCluster) {
        return createEmptyIntakeAccountViewModel('No fue posible asociar documentos a una cuenta medica.');
    }

    const procedureSummaries = buildProcedureSummaries(selectedCluster);
    const procedureSupportMap = new Map(procedureSummaries.map((item) => [item.id, item]));
    const serviceItems = buildServiceExplorerItems(selectedCluster, procedureSupportMap);
    const documentControlItems = buildDocumentControlItems(selectedCluster, procedureSummaries);
    const missingDocumentItems = buildMissingDocumentItems(procedureSummaries);
    const reviewAlerts = buildReviewAlerts(batchState, selectedCluster, procedureSummaries);
    const readiness = buildReadiness(batchState, selectedCluster, procedureSummaries, reviewAlerts);
    const aiExtraction = buildAiExtraction(batchState, selectedCluster, procedureSummaries);
    const verifiedCount = documentControlItems.filter((item) => item.tone === 'success' || item.tone === 'neutral').length;
    const pendingReviewCount = getBlockingReviewAlertCount(reviewAlerts);
    const summary = {
        totalServices: selectedCluster.services.length,
        totalProcedures: procedureSummaries.length,
        totalDocumentsFound: selectedCluster.documents.length,
        missingRequirements: procedureSummaries.reduce((total, item) => total + item.missingDocs.length, 0),
        pendingReviewCount,
        readyForAnalysis: readiness.readyForAnalysis,
    };

    return {
        stageNav: {
            currentStage: 'Intake',
            stages: STAGES.map((label, index) => ({
                key: normalizeIdentifier(label),
                label,
                active: index === 0,
                completed: false,
            })),
        },
        patientSelector: {
            visible: sortedClusters.length > 1,
            selectedKey: selectedCluster.key,
            totalPatients: sortedClusters.length,
            options: sortedClusters.map((cluster) => ({
                key: cluster.key,
                label: getCanonicalPatientName(cluster) ?? 'Cuenta sin paciente',
                subtitle: buildPatientOptionSubtitle(cluster),
                documentCount: cluster.documents.length,
                serviceCount: cluster.services.length,
                tone: cluster.assistedMerged ? 'warning' : 'neutral',
                selected: cluster.key === selectedCluster.key,
            })),
        },
        patientResolution: buildPatientResolutionViewModel(selectedCluster),
        header: {
            patientName: getCanonicalPatientName(selectedCluster),
            patientInitials: createInitials(getCanonicalPatientName(selectedCluster)),
            mrn: pickProfileValue(selectedCluster, 'mrn'),
            patientId: pickProfileValue(selectedCluster, 'patientId'),
            dob: pickProfileValue(selectedCluster, 'dob'),
            ageLabel: resolveAgeLabel(selectedCluster),
            provider: pickProfileValue(selectedCluster, 'provider'),
            invoiceNumber: pickProfileValue(selectedCluster, 'invoiceNumber'),
            admissionDate: pickProfileValue(selectedCluster, 'admissionDate'),
            dischargeDate: pickProfileValue(selectedCluster, 'dischargeDate'),
            insurancePlan: pickProfileValue(selectedCluster, 'insurancePlan'),
            intakeStatus: readiness.readyForAnalysis ? 'Ready for Analysis' : (summary.missingRequirements > 0 ? 'Support Pending' : 'Review in Progress'),
        },
        summary,
        serviceExplorer: {
            items: serviceItems,
            filters: {
                statuses: uniqueSortedStrings(serviceItems.map((item) => item.derivedStatus)),
                serviceNames: uniqueSortedStrings(serviceItems.map((item) => item.serviceName ?? item.description)),
                invoices: uniqueSortedStrings(serviceItems.map((item) => item.invoiceNumber)),
                coverages: uniqueSortedStrings(serviceItems.map((item) => item.coverage)),
            },
            pageSizeOptions: SUPPORTED_PAGE_SIZES,
        },
        documentControl: {
            items: documentControlItems,
            missingItems: missingDocumentItems,
            verifiedCount,
        },
        procedureSummary: {
            items: procedureSummaries,
        },
        aiExtraction,
        reviewAlerts,
        readiness,
        meta: {
            parseError: false,
            parseErrorMessage: null,
            emptyState: !selectedCluster.documents.length,
            schemaHints: buildSchemaHints(sortedClusters.length, selectedCluster),
        },
    };
}

export function createEmptyIntakeAccountViewModel(message = EMPTY_MESSAGE): IntakeAccountViewModel {
    return {
        stageNav: {
            currentStage: 'Intake',
            stages: STAGES.map((label, index) => ({
                key: normalizeIdentifier(label),
                label,
                active: index === 0,
                completed: false,
            })),
        },
        patientSelector: {
            visible: false,
            selectedKey: null,
            totalPatients: 0,
            options: [],
        },
        patientResolution: {
            canonicalName: null,
            aliases: [],
            assistedMerged: false,
            showAliasBanner: false,
            message: null,
        },
        header: {
            patientName: null,
            patientInitials: 'MR',
            mrn: null,
            patientId: null,
            dob: null,
            ageLabel: null,
            provider: null,
            invoiceNumber: null,
            admissionDate: null,
            dischargeDate: null,
            insurancePlan: null,
            intakeStatus: 'Pending batchState',
        },
        summary: {
            totalServices: 0,
            totalProcedures: 0,
            totalDocumentsFound: 0,
            missingRequirements: 0,
            pendingReviewCount: 0,
            readyForAnalysis: false,
        },
        serviceExplorer: {
            items: [],
            filters: {
                statuses: [],
                serviceNames: [],
                invoices: [],
                coverages: [],
            },
            pageSizeOptions: SUPPORTED_PAGE_SIZES,
        },
        documentControl: {
            items: [],
            missingItems: [],
            verifiedCount: 0,
        },
        procedureSummary: {
            items: [],
        },
        aiExtraction: {
            predictedDiagnoses: [],
            predictedProcedures: [],
            extractionStatus: null,
            classificationStatus: null,
            separationStatus: null,
            confidenceSummary: null,
        },
        reviewAlerts: [],
        readiness: {
            score: 0,
            readyForAnalysis: false,
            statusLabel: 'Pending batchState',
            blockers: [],
        },
        meta: {
            parseError: true,
            parseErrorMessage: message,
            emptyState: true,
            schemaHints: [],
        },
    };
}

export function getBatchStateStatusLabel(status: IdpBatchStageStatus | null | undefined): string {
    if (!status) {
        return 'Pending';
    }

    return status.replace(/([A-Z])/g, ' $1').trim();
}

export function getBatchStateStatusTone(status: IdpBatchStageStatus | null | undefined): IntakeAccountTone {
    switch (status) {
        case 'Extracted':
        case 'Classified':
        case 'Separated':
            return 'success';
        case 'ReviewRequired':
            return 'warning';
        case 'Awaiting':
        default:
            return 'neutral';
    }
}

function buildAccountClusters(documents: BatchStateDocument[]): AccountCluster[] {
    const seeds = documents.reduce<AccountSeed[]>((collection, document) => {
        collection.push(...buildSeedsFromDocument(document));
        return collection;
    }, []);
    const clusters: AccountCluster[] = [];

    for (const seed of seeds) {
        const match = findBestClusterMatch(clusters, seed);
        if (!match) {
            clusters.push({
                ...seed,
                assistedMerged: false,
            });
            continue;
        }

        mergeSeedIntoCluster(match.cluster, seed, match.assistedMerged);
    }

    return clusters;
}

function buildSeedsFromDocument(document: BatchStateDocument): AccountSeed[] {
    const kind = getDocumentKind(document.className);
    const profile = extractDocumentProfile(document, kind);
    const services = extractServiceRows(document, profile.invoiceNumber);

    if (kind === 'billing' && services.length) {
        const groups = groupServicesByPatientName(services, profile.patientName);
        return groups.map((group, index) => createSeedFromDocument(document, kind, {
            ...profile,
            patientName: group.patientName,
        }, group.services, `${document.id}-group-${index}`));
    }

    return [createSeedFromDocument(document, kind, profile, services, document.id)];
}

function createSeedFromDocument(
    document: BatchStateDocument,
    _kind: DocumentKind,
    profile: DocumentProfile,
    services: ServiceSeedRow[],
    key: string
): AccountSeed {
    return {
        key,
        profiles: [profile],
        documents: [document],
        services,
        names: toArray(profile.patientName),
        patientIds: toArray(profile.patientId).map(normalizeIdentifier),
        mrns: toArray(profile.mrn).map(normalizeIdentifier),
        invoices: toArray(profile.invoiceNumber).map(normalizeIdentifier),
        providers: toArray(profile.provider).map(normalizeKey),
        signalDates: extractProfileSignalDates(profile, services),
    };
}

function findBestClusterMatch(clusters: AccountCluster[], seed: AccountSeed): { cluster: AccountCluster; assistedMerged: boolean } | null {
    let bestScore = -1;
    let bestCluster: AccountCluster | null = null;
    let assistedMerged = false;

    for (const cluster of clusters) {
        const score = scoreClusterMatch(cluster, seed);
        if (score.score > bestScore) {
            bestScore = score.score;
            bestCluster = cluster;
            assistedMerged = score.assistedMerged;
        }
    }

    if (!bestCluster || bestScore < 0) {
        return null;
    }

    return {
        cluster: bestCluster,
        assistedMerged,
    };
}

function scoreClusterMatch(cluster: AccountCluster, seed: AccountSeed): { score: number; assistedMerged: boolean } {
    const sharedPatientId = intersectNormalized(cluster.patientIds, seed.patientIds);
    if (sharedPatientId) {
        return { score: 100, assistedMerged: false };
    }

    if (cluster.patientIds.length && seed.patientIds.length) {
        return { score: -1, assistedMerged: false };
    }

    const sharedMrn = intersectNormalized(cluster.mrns, seed.mrns);
    if (sharedMrn) {
        return { score: 90, assistedMerged: false };
    }

    if (!cluster.patientIds.length && !seed.patientIds.length && cluster.mrns.length && seed.mrns.length) {
        return { score: -1, assistedMerged: false };
    }

    const sharedInvoice = intersectNormalized(cluster.invoices, seed.invoices);
    if (sharedInvoice) {
        return { score: 80, assistedMerged: false };
    }

    if (hasConflictingProviders(cluster.providers, seed.providers)) {
        return { score: -1, assistedMerged: false };
    }

    if (hasConflictingDates(cluster.signalDates, seed.signalDates)) {
        return { score: -1, assistedMerged: false };
    }

    const clusterName = getBestNameCandidate(cluster.profiles);
    const seedName = getBestNameCandidate(seed.profiles);
    if (!clusterName || !seedName) {
        return { score: -1, assistedMerged: false };
    }

    const similarity = calculateNameSimilarity(clusterName, seedName);
    if (similarity >= 0.92) {
        return { score: Math.round(similarity * 100), assistedMerged: true };
    }

    return { score: -1, assistedMerged: false };
}

function mergeSeedIntoCluster(cluster: AccountCluster, seed: AccountSeed, assistedMerged: boolean): void {
    cluster.profiles.push(...seed.profiles);
    cluster.documents.push(...seed.documents);
    cluster.services.push(...seed.services);
    cluster.names = uniqueNormalizedMerge(cluster.names, seed.names);
    cluster.patientIds = uniqueNormalizedMerge(cluster.patientIds, seed.patientIds);
    cluster.mrns = uniqueNormalizedMerge(cluster.mrns, seed.mrns);
    cluster.invoices = uniqueNormalizedMerge(cluster.invoices, seed.invoices);
    cluster.providers = uniqueNormalizedMerge(cluster.providers, seed.providers);
    cluster.signalDates = uniqueDatesMerge(cluster.signalDates, seed.signalDates);
    cluster.assistedMerged = cluster.assistedMerged || assistedMerged;
}

function extractDocumentProfile(document: BatchStateDocument, sourceKind: DocumentKind): DocumentProfile {
    return {
        sourceKind,
        sourcePriority: getDocumentPriority(sourceKind),
        patientName: findFieldValue(document.fields, BILLING_FIELDS.patientName),
        patientId: findFieldValue(document.fields, BILLING_FIELDS.patientId),
        mrn: findFieldValue(document.fields, BILLING_FIELDS.mrn),
        dob: normalizeDateDisplay(findFieldValue(document.fields, BILLING_FIELDS.dob)),
        ageLabel: findFieldValue(document.fields, BILLING_FIELDS.ageLabel),
        provider: findFieldValue(document.fields, BILLING_FIELDS.provider),
        invoiceNumber: findFieldValue(document.fields, BILLING_FIELDS.invoiceNumber),
        admissionDate: normalizeDateDisplay(findFieldValue(document.fields, BILLING_FIELDS.admissionDate)),
        dischargeDate: normalizeDateDisplay(findFieldValue(document.fields, BILLING_FIELDS.dischargeDate)),
        insurancePlan: findFieldValue(document.fields, BILLING_FIELDS.insurancePlan),
        totalBilled: findFieldValue(document.fields, BILLING_FIELDS.totalBilled),
        arsAmount: findFieldValue(document.fields, BILLING_FIELDS.arsAmount),
        patientAmount: findFieldValue(document.fields, BILLING_FIELDS.patientAmount),
        arsBalance: findFieldValue(document.fields, BILLING_FIELDS.arsBalance),
        patientBalance: findFieldValue(document.fields, BILLING_FIELDS.patientBalance),
    };
}

function extractServiceRows(document: BatchStateDocument, invoiceNumber: string | null): ServiceSeedRow[] {
    const serviceTables = (document.tables ?? []).filter((table) => normalizeKey(table.name).includes('TABLA DE SERVICIOS FACTURADOS'));

    return serviceTables.reduce<ServiceSeedRow[]>((collection, table) => {
        const rows = (table.records ?? [])
            .map((row, index) => toServiceSeedRow(document, table, row.records ?? [], invoiceNumber, index))
            .filter((item): item is ServiceSeedRow => Boolean(item));
        collection.push(...rows);
        return collection;
    }, []);
}

function toServiceSeedRow(
    document: BatchStateDocument,
    _table: BatchStateTable,
    cells: BatchStateTableCell[],
    invoiceNumber: string | null,
    index: number
): ServiceSeedRow | null {
    const rowMap = new Map<string, string>();

    for (const cell of cells) {
        const key = normalizeKey(cell.recordName ?? cell.name);
        const value = toDisplayValue(cell.value);
        if (key) {
            rowMap.set(key, value ?? '');
        }
    }

    const serviceDateRaw = rowMap.get('FECHA') ?? null;
    const serviceName = rowMap.get('SERVICIO') ?? null;
    const cup = rowMap.get('CUP') || rowMap.get('CUPS') || null;
    const description = rowMap.get('DESCRIPCION') ?? null;
    const quantity = rowMap.get('CANTIDAD') ?? null;
    const price = rowMap.get('PRECIO') ?? null;
    const total = rowMap.get('TOTAL') ?? null;
    const coverage = rowMap.get('COBERTURA') ?? null;
    const patientName = rowMap.get('PACIENTE') ?? null;

    if (!serviceDateRaw && !serviceName && !cup && !description && !quantity && !price && !total && !coverage && !patientName) {
        return null;
    }

    const serviceDateValue = parseFlexibleDate(serviceDateRaw);
    const displayDate = serviceDateValue ? formatDate(serviceDateValue) : trimOrNull(serviceDateRaw);
    const totalAmountValue = toNumberValue(total ?? price);
    const coverageAmountValue = toNumberValue(coverage);
    const copayAmountValue = totalAmountValue !== null && coverageAmountValue !== null ? Math.max(totalAmountValue - coverageAmountValue, 0) : null;
    const procedureKey = normalizeIdentifier(cup || serviceName || description || `${document.id}-${index}`);

    return {
        id: `${document.id}-service-${index}`,
        serviceDate: displayDate,
        serviceDateValue,
        serviceName: trimOrNull(serviceName),
        cup: trimOrNull(cup),
        description: trimOrNull(description),
        quantity: trimOrNull(quantity),
        price: trimOrNull(price),
        total: trimOrNull(total),
        coverage: trimOrNull(coverage),
        patientName: trimOrNull(patientName),
        invoiceNumber: trimOrNull(invoiceNumber),
        sourceDocument: document.className ?? document.name ?? 'Documento',
        procedureKey,
        totalAmountValue,
        coverageAmountValue,
        copayAmountValue,
    };
}

function groupServicesByPatientName(services: ServiceSeedRow[], fallbackPatientName: string | null): Array<{ patientName: string | null; services: ServiceSeedRow[] }> {
    const groups = new Map<string, ServiceSeedRow[]>();

    for (const service of services) {
        const patientName = trimOrNull(service.patientName) ?? trimOrNull(fallbackPatientName);
        const key = normalizeIdentifier(patientName || 'single-account');
        if (!groups.has(key)) {
            groups.set(key, []);
        }
        groups.get(key)?.push(service);
    }

    return Array.from(groups.values()).map((groupServices) => ({
        patientName: trimOrNull(groupServices.find((item) => item.patientName)?.patientName) ?? trimOrNull(fallbackPatientName),
        services: groupServices,
    }));
}

function buildProcedureSummaries(cluster: AccountCluster): IntakeAccountProcedureSummaryItemViewModel[] {
    const groups = new Map<string, ServiceSeedRow[]>();

    for (const service of cluster.services) {
        if (!groups.has(service.procedureKey)) {
            groups.set(service.procedureKey, []);
        }
        groups.get(service.procedureKey)?.push(service);
    }

    return Array.from(groups.entries())
        .map(([procedureKey, services]) => {
            const representative = services[0];
            const supportInfo = resolveSupportCoverage(cluster, services);
            const hasPendingReview = cluster.documents.some((document) => isDocumentReviewPending(document));

            return {
                id: procedureKey,
                procedureCode: representative.cup,
                procedureName: representative.description ?? representative.serviceName,
                serviceCount: services.length,
                lastServiceDate: sortServices(services)[0]?.serviceDate ?? representative.serviceDate,
                requiredDocs: supportInfo.requiredDocs,
                presentDocs: supportInfo.presentDocs,
                missingDocs: supportInfo.missingDocs,
                supportStatus: supportInfo.supportStatus,
                tone: supportInfo.tone,
                hasPendingReview,
            };
        })
        .sort((left, right) => {
            const leftDate = parseFlexibleDate(left.lastServiceDate);
            const rightDate = parseFlexibleDate(right.lastServiceDate);
            if (leftDate && rightDate) {
                return rightDate.getTime() - leftDate.getTime();
            }
            return (right.serviceCount - left.serviceCount) || compareNullableStrings(left.procedureName, right.procedureName);
        });
}

function resolveSupportCoverage(cluster: AccountCluster, services: ServiceSeedRow[]): SummarySupportInfo {
    const anchor = services[0];
    const descriptionSignal = normalizeKey(`${anchor.serviceName ?? ''} ${anchor.description ?? ''}`);
    const presentDocLabels = uniqueSortedStrings(cluster.documents.map((document) => mapDocumentKindLabel(getDocumentKind(document.className))));
    const requiredDocs = new Set<string>(['Factura y Desglose']);

    if (cluster.documents.some((document) => getDocumentKind(document.className) === 'admission') || /ADMISION|HOSP|INGRESO|CUARTA PLANTA|CUIDADO INT|PRIVADO/.test(descriptionSignal)) {
        requiredDocs.add('Planilla de Admisión');
    }

    if (cluster.documents.some((document) => getDocumentKind(document.className) === 'authorization') || /AUTORIZ|AMBULATORIO|PROCEDIMIENTO|CIRUG|QUIR/.test(descriptionSignal)) {
        requiredDocs.add('Formato de Autorización');
    }

    if (cluster.documents.some((document) => getDocumentKind(document.className) === 'lab') || /RADIO|RAYO|ULTRA|SONO|LAB|RX/.test(descriptionSignal)) {
        requiredDocs.add('Laboratorios');
    }

    if (cluster.documents.some((document) => getDocumentKind(document.className) === 'pathology') || /PATOLOG|BIOPS/.test(descriptionSignal)) {
        requiredDocs.add('Reporte de Patología');
    }

    const requiredDocsList = Array.from(requiredDocs);
    const presentDocs = requiredDocsList.filter((required) => presentDocLabels.includes(required));
    const missingDocs = requiredDocsList.filter((required) => !presentDocLabels.includes(required));
    const hasPendingReview = cluster.documents.some((document) => isDocumentReviewPending(document));

    if (missingDocs.length) {
        return {
            requiredDocs: requiredDocsList,
            presentDocs,
            missingDocs,
            tone: 'danger',
            supportStatus: 'Missing Support',
        };
    }

    if (hasPendingReview) {
        return {
            requiredDocs: requiredDocsList,
            presentDocs,
            missingDocs,
            tone: 'warning',
            supportStatus: 'Pending Review',
        };
    }

    return {
        requiredDocs: requiredDocsList,
        presentDocs,
        missingDocs,
        tone: 'success',
        supportStatus: 'Complete',
    };
}

function buildServiceExplorerItems(
    cluster: AccountCluster,
    procedureSupportMap: Map<string, IntakeAccountProcedureSummaryItemViewModel>
): IntakeAccountServiceItemViewModel[] {
    return sortServices(cluster.services).map((service) => {
        const support = procedureSupportMap.get(service.procedureKey);
        const derivedStatus = support?.missingDocs.length
            ? 'Missing Support'
            : (cluster.documents.some((document) => isDocumentReviewPending(document)) ? 'Pending Review' : 'Ready');
        const tone: IntakeAccountTone = derivedStatus === 'Missing Support'
            ? 'danger'
            : (derivedStatus === 'Pending Review' ? 'warning' : 'success');

        return {
            id: service.id,
            serviceDate: service.serviceDate,
            serviceName: service.serviceName,
            cup: service.cup,
            description: service.description,
            quantity: service.quantity,
            price: service.price,
            total: service.total,
            coverage: service.coverage,
            invoiceNumber: service.invoiceNumber,
            sourceDocument: service.sourceDocument,
            derivedStatus,
            tone,
            procedureKey: service.procedureKey,
            totalAmountValue: service.totalAmountValue,
            coverageAmountValue: service.coverageAmountValue,
            copayAmountValue: service.copayAmountValue,
        };
    });
}

function buildDocumentControlItems(
    cluster: AccountCluster,
    procedureSummaries: IntakeAccountProcedureSummaryItemViewModel[]
): IntakeAccountDocumentControlItemViewModel[] {
    const topProcedure = procedureSummaries[0];

    return cluster.documents
        .map((document) => {
            const tone = getDocumentTone(document);
            const extractionBadge = tone === 'danger'
                ? 'Rejected'
                : (tone === 'warning' ? 'Pending Review' : 'Verified');
            const status = tone === 'danger'
                ? 'Rejected by IDP'
                : (tone === 'warning' ? 'Needs review' : 'Ready');

            return {
                id: document.id,
                documentName: document.className ?? document.name ?? 'Document',
                documentType: document.className ?? 'Supporting document',
                linkedProcedureCode: topProcedure?.procedureCode ?? null,
                linkedProcedureName: topProcedure?.procedureName ?? null,
                status,
                dateReceived: normalizeDateDisplay(document.receivedAt ?? document.createdAt ?? document.updatedAt ?? null),
                extractedFields: buildDocumentHighlights(document),
                extractionBadge,
                confidence: toPercentageValue(document.classificationConfidence),
                tone,
                viewLabel: 'View',
            };
        })
        .sort((left, right) => compareTonePriority(left.tone, right.tone) || compareNullableStrings(left.documentName, right.documentName));
}

function buildMissingDocumentItems(procedureSummaries: IntakeAccountProcedureSummaryItemViewModel[]): IntakeAccountMissingDocumentViewModel[] {
    const items: IntakeAccountMissingDocumentViewModel[] = [];

    for (const procedure of procedureSummaries) {
        for (const missingDocument of procedure.missingDocs) {
            items.push({
                id: `${procedure.id}-${normalizeIdentifier(missingDocument)}`,
                documentName: missingDocument,
                linkedProcedureCode: procedure.procedureCode,
                linkedProcedureName: procedure.procedureName ?? 'Procedure',
                status: 'Missing support',
                primaryActionLabel: 'Request Document',
                secondaryActionLabel: 'Upload Manually',
            });
        }
    }

    return items;
}

function buildAiExtraction(
    batchState: BatchStateSource,
    cluster: AccountCluster,
    procedureSummaries: IntakeAccountProcedureSummaryItemViewModel[]
): IntakeAccountAiExtractionViewModel {
    const predictedDiagnoses = uniqueSortedStrings(
        cluster.documents.reduce<Array<string | null>>((collection, document) => {
            collection.push(...(document.fields ?? [])
                .filter((field) => DIAGNOSIS_FIELD_ALIASES.some((alias) => normalizeKey(field.name).includes(normalizeKey(alias))))
                .map((field) => toDisplayValue(field.value)));
            return collection;
        }, [])
    );
    const predictedProcedures = uniqueSortedStrings(procedureSummaries.map((item) => item.procedureName)).slice(0, 8);
    const confidenceValues = cluster.documents
        .map((document) => typeof document.classificationConfidence === 'number' ? document.classificationConfidence : null)
        .filter((value): value is number => value !== null);
    const averageConfidence = confidenceValues.length
        ? Math.round((confidenceValues.reduce((total, value) => total + value, 0) / confidenceValues.length) * 100)
        : null;

    return {
        predictedDiagnoses,
        predictedProcedures,
        extractionStatus: batchState.extractionStatus ?? null,
        classificationStatus: batchState.classificationStatus ?? null,
        separationStatus: batchState.separationStatus ?? null,
        confidenceSummary: averageConfidence !== null ? `Avg. confidence ${averageConfidence}%` : null,
    };
}

function buildReviewAlerts(
    batchState: BatchStateSource,
    cluster: AccountCluster,
    procedureSummaries: IntakeAccountProcedureSummaryItemViewModel[]
): IntakeAccountReviewAlertViewModel[] {
    const alerts: IntakeAccountReviewAlertViewModel[] = [];

    if (cluster.assistedMerged && buildPatientResolutionViewModel(cluster).showAliasBanner) {
        alerts.push({
            title: 'OCR name reconciliation applied',
            description: 'The widget merged close name variants into a single patient account for this intake view.',
            tone: 'warning',
        });
    }

    if (batchState.hasRejectedDocuments) {
        alerts.push({
            title: 'Rejected documents detected',
            description: 'At least one document was rejected by IDP and should be reviewed before advancing.',
            tone: 'danger',
        });
    }

    for (const document of cluster.documents) {
        if (isDocumentReviewPending(document)) {
            alerts.push({
                title: `${document.className ?? document.name ?? 'Document'} requires review`,
                description: 'Classification, extraction or separation marked this support as pending review.',
                tone: document.markAsRejected ? 'danger' : 'warning',
            });
        }

        const flaggedField = (document.fields ?? []).find((field) => field.extractionReviewStatus === 'ReviewRequired');
        if (flaggedField) {
            alerts.push({
                title: `Field review required in ${document.className ?? 'document'}`,
                description: `${flaggedField.name ?? 'An extracted field'} needs human validation.`,
                tone: 'warning',
            });
        }
    }

    for (const procedure of procedureSummaries.filter((item) => item.missingDocs.length > 0)) {
        alerts.push({
            title: `Missing support for ${procedure.procedureName ?? 'procedure'}`,
            description: `Missing: ${procedure.missingDocs.join(', ')}.`,
            tone: 'danger',
        });
    }

    return dedupeAlerts(alerts).slice(0, 8);
}

function buildReadiness(
    batchState: BatchStateSource,
    cluster: AccountCluster,
    procedureSummaries: IntakeAccountProcedureSummaryItemViewModel[],
    reviewAlerts: IntakeAccountReviewAlertViewModel[]
) {
    const blockers: string[] = [];
    const missingRequirementCount = procedureSummaries.reduce((total, item) => total + item.missingDocs.length, 0);
    const pendingReviewCount = getBlockingReviewAlertCount(reviewAlerts);
    const hasRejectedDocuments = batchState.hasRejectedDocuments || cluster.documents.some((document) => document.markAsRejected);

    if (missingRequirementCount) {
        blockers.push(`${missingRequirementCount} support requirement(s) are still missing.`);
    }

    if (pendingReviewCount) {
        blockers.push(`${pendingReviewCount} review alert(s) remain open for this account.`);
    }

    if (hasRejectedDocuments) {
        blockers.push('Rejected documents must be resolved before Analysis.');
    }

    if (!cluster.services.length) {
        blockers.push('No billed services were mapped for the selected account.');
    }

    let score = 100;
    score -= Math.min(missingRequirementCount * 12, 48);
    score -= Math.min(pendingReviewCount * 8, 32);
    if (hasRejectedDocuments) {
        score -= 20;
    }
    if (!cluster.services.length) {
        score -= 15;
    }
    score = Math.max(5, Math.min(score, 100));

    return {
        score,
        readyForAnalysis: blockers.length === 0,
        statusLabel: blockers.length === 0 ? 'Ready for Analysis' : (missingRequirementCount ? 'Support Pending' : 'Pending Review'),
        blockers,
    };
}

function buildPatientResolutionViewModel(cluster: AccountCluster) {
    const canonicalName = getCanonicalPatientName(cluster);
    const aliases = distinctDisplayNames(cluster.names);
    const uniqueNormalizedAliases = new Set(aliases.map((alias) => normalizeIdentifier(alias)));
    const showAliasBanner = aliases.length > 1 && uniqueNormalizedAliases.size > 1;

    return {
        canonicalName,
        aliases,
        assistedMerged: cluster.assistedMerged,
        showAliasBanner,
        message: showAliasBanner
            ? `Se unificaron variantes OCR del mismo paciente: ${aliases.join(' / ')}`
            : null,
    };
}

function buildSchemaHints(totalPatients: number, cluster: AccountCluster): string[] {
    const hints = [
        `${cluster.documents.length} docs`,
        `${cluster.services.length} services`,
        totalPatients > 1 ? `${totalPatients} patient accounts` : 'Single patient batch',
    ];

    if (cluster.assistedMerged) {
        hints.push('OCR reconciliation');
    }

    return hints.slice(0, 4);
}

function buildPatientOptionSubtitle(cluster: AccountCluster): string | null {
    const patientId = pickProfileValue(cluster, 'patientId');
    const mrn = pickProfileValue(cluster, 'mrn');

    if (patientId && mrn) {
        return `ID ${patientId} - MRN ${mrn}`;
    }

    if (patientId) {
        return `ID ${patientId}`;
    }

    if (mrn) {
        return `MRN ${mrn}`;
    }

    return null;
}

function buildDocumentHighlights(document: BatchStateDocument): IntakeAccountDocumentHighlightViewModel[] {
    const fields = document.fields ?? [];
    const highlightFields = [
        { label: 'Patient', aliases: BILLING_FIELDS.patientName },
        { label: 'Record', aliases: BILLING_FIELDS.mrn },
        { label: 'Invoice', aliases: BILLING_FIELDS.invoiceNumber },
    ];

    return highlightFields
        .map((item) => ({
            label: item.label,
            value: findFieldValue(fields, item.aliases),
        }))
        .filter((item): item is IntakeAccountDocumentHighlightViewModel => Boolean(item.value))
        .slice(0, 3);
}

function getCanonicalPatientName(cluster: AccountCluster): string | null {
    return getBestNameCandidate(cluster.profiles);
}

function getBestNameCandidate(profiles: DocumentProfile[]): string | null {
    const candidates = profiles
        .filter((profile) => trimOrNull(profile.patientName))
        .sort((left, right) => {
            if (left.sourcePriority !== right.sourcePriority) {
                return left.sourcePriority - right.sourcePriority;
            }

            return (trimOrNull(right.patientName)?.length ?? 0) - (trimOrNull(left.patientName)?.length ?? 0);
        });

    return trimOrNull(candidates[0]?.patientName);
}

function pickProfileValue(cluster: AccountCluster, field: keyof DocumentProfile): string | null {
    const candidates = cluster.profiles
        .map((profile) => ({
            value: trimOrNull(profile[field] as string | null),
            priority: profile.sourcePriority,
        }))
        .filter((candidate) => candidate.value)
        .sort((left, right) => {
            if (left.priority !== right.priority) {
                return left.priority - right.priority;
            }

            return (right.value?.length ?? 0) - (left.value?.length ?? 0);
        });

    return candidates[0]?.value ?? null;
}

function resolveAgeLabel(cluster: AccountCluster): string | null {
    const explicitAge = pickProfileValue(cluster, 'ageLabel');
    if (explicitAge) {
        return explicitAge;
    }

    const dob = pickProfileValue(cluster, 'dob');
    const dobDate = parseFlexibleDate(dob);
    if (!dobDate) {
        return null;
    }

    const now = new Date();
    let age = now.getUTCFullYear() - dobDate.getUTCFullYear();
    const monthDelta = now.getUTCMonth() - dobDate.getUTCMonth();
    if (monthDelta < 0 || (monthDelta === 0 && now.getUTCDate() < dobDate.getUTCDate())) {
        age -= 1;
    }

    return age >= 0 ? `${age}` : null;
}

function sortClusters(clusters: AccountCluster[]): AccountCluster[] {
    return [...clusters].sort((left, right) => {
        const leftName = getCanonicalPatientName(left);
        const rightName = getCanonicalPatientName(right);
        return compareNullableStrings(leftName, rightName) || (right.services.length - left.services.length);
    });
}

function isRenderableCluster(cluster: AccountCluster): boolean {
    return Boolean(
        getCanonicalPatientName(cluster)
        || pickProfileValue(cluster, 'patientId')
        || pickProfileValue(cluster, 'mrn')
        || cluster.services.length
    );
}

function resolveSelectedCluster(clusters: AccountCluster[], selectedPatientKey: string | null): AccountCluster | null {
    if (!clusters.length) {
        return null;
    }

    return clusters.find((cluster) => cluster.key === selectedPatientKey) ?? clusters[0];
}

function sortServices(services: ServiceSeedRow[]): ServiceSeedRow[] {
    return [...services].sort((left, right) => {
        if (left.serviceDateValue && right.serviceDateValue) {
            return right.serviceDateValue.getTime() - left.serviceDateValue.getTime();
        }

        if (left.serviceDateValue) {
            return -1;
        }

        if (right.serviceDateValue) {
            return 1;
        }

        return compareNullableStrings(left.description ?? left.serviceName, right.description ?? right.serviceName);
    });
}

function getDocumentKind(className: string | undefined): DocumentKind {
    const normalized = normalizeKey(className);

    if (normalized.includes('FACTURA') && normalized.includes('DESGLOSE')) {
        return 'billing';
    }

    if (normalized.includes('AUTORIZ')) {
        return 'authorization';
    }

    if (normalized.includes('ADMISION')) {
        return 'admission';
    }

    if (normalized.includes('OBJECION')) {
        return 'objection';
    }

    if (normalized.includes('PATOLOG')) {
        return 'pathology';
    }

    if (normalized.includes('LABORATORIO')) {
        return 'lab';
    }

    return 'other';
}

function getDocumentPriority(kind: DocumentKind): number {
    switch (kind) {
        case 'billing':
            return 0;
        case 'authorization':
            return 1;
        case 'admission':
            return 2;
        case 'objection':
            return 3;
        case 'pathology':
            return 4;
        case 'lab':
            return 5;
        default:
            return 6;
    }
}

function getDocumentTone(document: BatchStateDocument): IntakeAccountTone {
    if (document.markAsRejected) {
        return 'danger';
    }

    if (isDocumentReviewPending(document)) {
        return 'warning';
    }

    return 'success';
}

function isDocumentReviewPending(document: BatchStateDocument): boolean {
    return document.classificationReviewStatus === 'ReviewRequired'
        || document.extractionReviewStatus === 'ReviewRequired'
        || document.separationReviewStatus === 'ReviewRequired'
        || (document.fields ?? []).some((field) => field.extractionReviewStatus === 'ReviewRequired');
}

function mapDocumentKindLabel(kind: DocumentKind): string {
    switch (kind) {
        case 'billing':
            return 'Factura y Desglose';
        case 'authorization':
            return 'Formato de Autorización';
        case 'admission':
            return 'Planilla de Admisión';
        case 'pathology':
            return 'Reporte de Patología';
        case 'lab':
            return 'Laboratorios';
        case 'objection':
            return 'Formulario de Objeciones Auditoría Médica';
        default:
            return 'Supporting Document';
    }
}

function findFieldValue(fields: BatchStateField[] | undefined, aliases: readonly string[]): string | null {
    if (!fields?.length) {
        return null;
    }

    const normalizedAliases = aliases.map(normalizeKey);
    const match = fields.find((field) => {
        const fieldName = normalizeKey(field.name ?? field.id);
        return normalizedAliases.includes(fieldName);
    });

    return trimOrNull(match ? toDisplayValue(match.value) : null);
}

function extractProfileSignalDates(profile: DocumentProfile, services: ServiceSeedRow[]): Date[] {
    const dates = [
        parseFlexibleDate(profile.admissionDate),
        parseFlexibleDate(profile.dischargeDate),
        parseFlexibleDate(profile.dob),
        services.find((service) => service.serviceDateValue)?.serviceDateValue ?? null,
    ];

    return dates.filter((date): date is Date => Boolean(date));
}

function hasConflictingProviders(leftProviders: string[], rightProviders: string[]): boolean {
    if (!leftProviders.length || !rightProviders.length) {
        return false;
    }

    return !intersectNormalized(leftProviders, rightProviders);
}

function hasConflictingDates(leftDates: Date[], rightDates: Date[]): boolean {
    if (!leftDates.length || !rightDates.length) {
        return false;
    }

    const left = leftDates[0];
    const right = rightDates[0];
    const differenceDays = Math.abs(left.getTime() - right.getTime()) / 86400000;
    return differenceDays > 30;
}

function calculateNameSimilarity(leftName: string, rightName: string): number {
    const left = simplifyNameForComparison(leftName);
    const right = simplifyNameForComparison(rightName);

    if (!left || !right) {
        return 0;
    }

    if (left === right) {
        return 1;
    }

    const distance = levenshteinDistance(left, right);
    return 1 - distance / Math.max(left.length, right.length, 1);
}

function simplifyNameForComparison(value: string): string {
    const normalized = normalizeKey(value);
    const tokens = normalized.split(' ').filter((token) => token.length > 1);
    const deduped: string[] = [];

    for (const token of tokens) {
        if (deduped[deduped.length - 1] !== token) {
            deduped.push(token);
        }
    }

    if (deduped.length % 2 === 0) {
        const midpoint = deduped.length / 2;
        const firstHalf = deduped.slice(0, midpoint).join(' ');
        const secondHalf = deduped.slice(midpoint).join(' ');
        if (firstHalf === secondHalf) {
            return firstHalf;
        }
    }

    return deduped.join(' ');
}

function normalizeDateDisplay(value: string | null): string | null {
    const date = parseFlexibleDate(value);
    return date ? formatDate(date) : trimOrNull(value);
}

function parseFlexibleDate(value: string | null | undefined): Date | null {
    const trimmed = trimOrNull(value);
    if (!trimmed) {
        return null;
    }

    const direct = new Date(trimmed);
    if (!Number.isNaN(direct.getTime())) {
        return direct;
    }

    const dayMonthYearMatch = trimmed.match(/^(\d{1,2})[\/-](\d{1,2})[\/-](\d{4})$/);
    if (dayMonthYearMatch) {
        const [, day, month, year] = dayMonthYearMatch;
        return new Date(Date.UTC(Number(year), Number(month) - 1, Number(day)));
    }

    const textualMonthMatch = trimmed.match(/^(\d{1,2})-([A-Za-z]{3})-(\d{4})$/);
    if (textualMonthMatch) {
        const [, day, month, year] = textualMonthMatch;
        const monthIndex = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'].indexOf(month.toUpperCase());
        if (monthIndex >= 0) {
            return new Date(Date.UTC(Number(year), monthIndex, Number(day)));
        }
    }

    return null;
}

function formatDate(value: Date): string {
    const year = value.getUTCFullYear();
    const month = `${value.getUTCMonth() + 1}`.padStart(2, '0');
    const day = `${value.getUTCDate()}`.padStart(2, '0');
    return `${year}-${month}-${day}`;
}

function createInitials(name: string | null): string {
    if (!name) {
        return 'MR';
    }

    const tokens = name.split(/\s+/).filter(Boolean).slice(0, 2);
    if (!tokens.length) {
        return 'MR';
    }

    return tokens.map((token) => token[0]?.toUpperCase() ?? '').join('');
}

function normalizeKey(value: unknown): string {
    return String(value ?? '')
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-zA-Z0-9]+/g, ' ')
        .trim()
        .toUpperCase();
}

function normalizeIdentifier(value: unknown): string {
    return String(value ?? '')
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-zA-Z0-9]+/g, '')
        .trim()
        .toUpperCase();
}

function trimOrNull(value: string | null | undefined): string | null {
    const trimmed = typeof value === 'string' ? value.trim() : '';
    return trimmed ? trimmed : null;
}

function toDisplayValue(value: unknown): string | null {
    if (typeof value === 'string') {
        return trimOrNull(value);
    }

    if (typeof value === 'number') {
        return Number.isFinite(value) ? `${value}` : null;
    }

    if (typeof value === 'boolean') {
        return value ? 'Yes' : 'No';
    }

    return null;
}

function toNumberValue(value: string | null | undefined): number | null {
    const trimmed = trimOrNull(value);
    if (!trimmed || /[\/]/.test(trimmed)) {
        return null;
    }

    const normalized = trimmed.replace(/[^0-9,.\-]/g, '');
    if (!normalized) {
        return null;
    }

    const hasComma = normalized.includes(',');
    const hasDot = normalized.includes('.');
    let sanitized = normalized;

    if (hasComma && hasDot) {
        sanitized = normalized.replace(/,/g, '');
    } else if (hasComma && !hasDot) {
        sanitized = normalized.replace(/,/g, '.');
    }

    const parsed = Number(sanitized);
    return Number.isFinite(parsed) ? parsed : null;
}

function toPercentageValue(value: number | null | undefined): number | null {
    if (typeof value !== 'number' || !Number.isFinite(value)) {
        return null;
    }

    return Math.round(value * 100);
}

function uniqueSortedStrings(values: Array<string | null | undefined>): string[] {
    return Array.from(new Set(values.map(trimOrNull).filter((value): value is string => Boolean(value)))).sort((left, right) => left.localeCompare(right));
}

function distinctDisplayNames(values: string[]): string[] {
    const result: string[] = [];
    const seen = new Set<string>();

    for (const value of values) {
        const trimmed = trimOrNull(value);
        if (!trimmed) {
            continue;
        }

        const key = normalizeIdentifier(trimmed);
        if (seen.has(key)) {
            continue;
        }
        seen.add(key);
        result.push(trimmed);
    }

    return result;
}

function uniqueNormalizedMerge(left: string[], right: string[]): string[] {
    return Array.from(new Set([...left, ...right].filter(Boolean)));
}

function uniqueDatesMerge(left: Date[], right: Date[]): Date[] {
    const result: Date[] = [];
    const seen = new Set<number>();

    for (const item of [...left, ...right]) {
        const key = item.getTime();
        if (seen.has(key)) {
            continue;
        }
        seen.add(key);
        result.push(item);
    }

    return result;
}

function intersectNormalized(left: string[], right: string[]): string | null {
    for (const item of left) {
        if (right.includes(item)) {
            return item;
        }
    }

    return null;
}

function toArray(value: string | null): string[] {
    return value ? [value] : [];
}

function compareNullableStrings(left: string | null | undefined, right: string | null | undefined): number {
    return (left ?? '').localeCompare(right ?? '');
}

function compareTonePriority(left: IntakeAccountTone, right: IntakeAccountTone): number {
    const priority = {
        danger: 0,
        warning: 1,
        neutral: 2,
        success: 3,
    } as Record<IntakeAccountTone, number>;

    return priority[left] - priority[right];
}

function dedupeAlerts(alerts: IntakeAccountReviewAlertViewModel[]): IntakeAccountReviewAlertViewModel[] {
    const seen = new Set<string>();
    const result: IntakeAccountReviewAlertViewModel[] = [];

    for (const alert of alerts) {
        const key = `${alert.title}::${alert.description}`;
        if (seen.has(key)) {
            continue;
        }
        seen.add(key);
        result.push(alert);
    }

    return result;
}

function getBlockingReviewAlertCount(alerts: IntakeAccountReviewAlertViewModel[]): number {
    return alerts.filter((alert) => alert.title !== 'OCR name reconciliation applied').length;
}

function levenshteinDistance(left: string, right: string): number {
    const matrix: number[][] = Array.from({ length: left.length + 1 }, () => Array(right.length + 1).fill(0));

    for (let row = 0; row <= left.length; row += 1) {
        matrix[row][0] = row;
    }

    for (let column = 0; column <= right.length; column += 1) {
        matrix[0][column] = column;
    }

    for (let row = 1; row <= left.length; row += 1) {
        for (let column = 1; column <= right.length; column += 1) {
            const cost = left[row - 1] === right[column - 1] ? 0 : 1;
            matrix[row][column] = Math.min(
                matrix[row - 1][column] + 1,
                matrix[row][column - 1] + 1,
                matrix[row - 1][column - 1] + cost
            );
        }
    }

    return matrix[left.length][right.length];
}
