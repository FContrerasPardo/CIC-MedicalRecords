import {
    IntakeDocumentKind,
    IntakeDocumentClassificationRule,
    IntakeSupportHeuristicsConfig,
} from './intake-heuristics.types';
import intakeSupportHeuristics from './intake-support-heuristics.json';
import {
    BatchStateDocument,
    BatchStateField,
    BatchStateSource,
    BatchStateTableCell,
    IdpBatchStageStatus
} from './batch-state.model';
import {
    IntakeAccountDocumentHighlightViewModel,
    IntakeAccountDocumentItemViewModel,
    IntakeAccountReviewAlertViewModel,
    IntakeAccountServiceItemViewModel,
    IntakeAccountSummaryCardViewModel,
    IntakeAccountTone,
    IntakeServiceFilterKey,
    IntakeAccountViewModel,
    IntakeServiceStatus
} from './intake-account-view.model';

type DocumentKind = IntakeDocumentKind;

const INTAKE_SUPPORT_HEURISTICS = intakeSupportHeuristics as IntakeSupportHeuristicsConfig;

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
}

interface ServiceSeedRow {
    id: string;
    serviceDate: string | null;
    serviceDateValue: Date | null;
    serviceCode: string | null;
    cup: string | null;
    description: string | null;
    quantity: string | null;
    price: string | null;
    total: string | null;
    coverage: string | null;
    patientName: string | null;
    invoiceNumber: string | null;
    sourceDocumentName: string;
    sourceDocumentId: string;
    sourceDocumentKind: DocumentKind;
    sourceDocumentConfidence: number | null;
    sourceDocumentReviewRequired: boolean;
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

interface SupportCoverageInfo {
    requiredDocuments: string[];
    presentDocuments: string[];
    missingDocuments: string[];
    completionPercent: number;
    tone: IntakeAccountTone;
}

const EMPTY_MESSAGE = 'No fue posible leer batchState. Verifica que el formulario reciba un JSON valido.';
const STAGES = ['Intake', 'Analysis', 'Approval', 'Execution', 'Review', 'Completed'];
const LOW_CONFIDENCE_THRESHOLD = 0.9;
const DEFAULT_FILTER: IntakeServiceFilterKey = 'all';

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
} as const;

const PLACEHOLDER_FIELD_TOKENS = new Set(['NULL', 'NA', 'NONE', 'NIL', 'UNKNOWN', 'UNDEFINED']);

export const INTAKE_PATIENT_FIELD_ALIASES = {
    patientName: BILLING_FIELDS.patientName,
    patientId: BILLING_FIELDS.patientId,
    mrn: BILLING_FIELDS.mrn,
} as const;

export interface PatientClusterSnapshot {
    key: string;
    documentIds: string[];
    patientId: string | null;
    mrn: string | null;
    invoiceNumber: string | null;
}

export function getPatientClusterSnapshots(batchState: BatchStateSource): PatientClusterSnapshot[] {
    const documents = Array.isArray(batchState.documents) ? batchState.documents.filter(Boolean) : [];

    return buildAccountClusters(documents)
        .filter((cluster) => isRenderableCluster(cluster))
        .map((cluster) => ({
            key: cluster.key,
            documentIds: uniqueStrings(cluster.documents.map((document) => document.id)),
            patientId: pickProfileValue(cluster, 'patientId'),
            mrn: pickProfileValue(cluster, 'mrn'),
            invoiceNumber: pickProfileValue(cluster, 'invoiceNumber'),
        }));
}

const DOCUMENT_HIGHLIGHT_ALIASES = [
    { label: 'Factura', aliases: ['Numero de Factura', 'Factura', 'No. Factura'] },
    { label: 'Monto total', aliases: ['Monto total Facturado', 'Monto Total Facturado', 'Total Facturado'] },
    { label: 'Monto paciente', aliases: ['Monto Facturado al Paciente', 'Monto Paciente', 'Balance del Paciente'] },
    { label: 'Diagnóstico', aliases: ['Diagnostico', 'Diagnostico Principal', 'Impresion Diagnostica'] },
    { label: 'Paciente', aliases: ['Nombre del Paciente', 'Paciente'] },
    { label: 'Autorización', aliases: ['Numero de Autorizacion', 'Autorizacion', 'Authorization Number'] },
];

const MAX_DOCUMENT_HIGHLIGHTS = 12;

const DOCUMENT_HIGHLIGHT_ALIASES_BY_KIND: Record<DocumentKind, Array<{ label: string; aliases: string[] }>> = {
    billing: [
        { label: 'Prestador', aliases: ['Nombre del Prestador', 'Prestador'] },
        { label: 'Record', aliases: ['Record'] },
        { label: 'Motivo de visita', aliases: ['Motivo de la Visita'] },
        { label: 'Monto ARS', aliases: ['Monto Facturado a ARS', 'Monto ARS'] },
        { label: 'Balance ARS', aliases: ['Balance ARS'] },
        { label: 'Balance paciente', aliases: ['Balance del Paciente'] },
        { label: 'Fecha admision', aliases: ['Fecha Admision', 'Fecha Admisión', 'Fecha de Admision', 'Fecha de Admisión'] },
        { label: 'Fecha alta', aliases: ['Fecha De Alta', 'Fecha de Alta'] },
    ],
    authorization: [
        { label: 'Carnet', aliases: ['No. Carnet', 'Numero de Carnet'] },
        { label: 'Contratante', aliases: ['Contratante'] },
        { label: 'Plan', aliases: ['Plan'] },
        { label: 'Total', aliases: ['Total'] },
        { label: 'Fecha', aliases: ['Fecha'] },
    ],
    admission: [
        { label: 'Prestador', aliases: ['Nombre del Prestador', 'Prestador'] },
        { label: 'Record', aliases: ['Record'] },
        { label: 'Cedula', aliases: ['Cedula'] },
        { label: 'Fecha admision', aliases: ['Fecha Admision', 'Fecha Admisión', 'Fecha de Admision', 'Fecha de Admisión'] },
    ],
    objection: [
        { label: 'Prestador', aliases: ['Nombre del Prestador'] },
        { label: 'Codigo PSS', aliases: ['Codigo PSS', 'Código PSS'] },
        { label: 'Procedimientos objetados', aliases: ['Procedimientos Objetados'] },
        { label: 'Monto objecion', aliases: ['Monto de Objecion', 'Monto de Objeción'] },
        { label: 'Valor total glosado', aliases: ['Valor Total Glosado'] },
        { label: 'Respuesta del prestador', aliases: ['Respuesta del prestador'] },
        { label: 'Fecha aceptacion', aliases: ['Fecha de aceptacion del prestador', 'Fecha de aceptación del prestador'] },
    ],
    pathology: [
        { label: 'Prestador', aliases: ['Nombre del Prestador'] },
        { label: 'Estudio', aliases: ['Estudio Realizado', 'Estudio'] },
        { label: 'Nota', aliases: ['Nota'] },
        { label: 'Fecha reporte', aliases: ['Fecha de reporte'] },
    ],
    lab: [
        { label: 'Prestador', aliases: ['Nombre del Prestador'] },
        { label: 'Cedula', aliases: ['Cedula'] },
        { label: 'Record', aliases: ['Record'] },
        { label: 'Estudio', aliases: ['Estudio'] },
        { label: 'Hallazgos', aliases: ['Hallazgos'] },
        { label: 'Conclusion', aliases: ['Conclusion', 'Conclusión'] },
    ],
    other: [],
};

export function mapBatchStateToIntakeAccountViewModel(batchState: BatchStateSource, selectedPatientKey: string | null): IntakeAccountViewModel {
    const documents = Array.isArray(batchState.documents) ? batchState.documents.filter(Boolean) : [];

    if (!documents.length) {
        return createEmptyIntakeAccountViewModel('No se encontraron documentos en batchState.');
    }

    const clusters = buildAccountClusters(documents).filter((cluster) => isRenderableCluster(cluster));
    const selectedCluster = resolveSelectedCluster(sortClusters(clusters), selectedPatientKey);

    if (!selectedCluster) {
        return createEmptyIntakeAccountViewModel('No fue posible asociar documentos a una cuenta medica.');
    }

    const services = buildServiceItems(selectedCluster);
    const documentsView = buildDocumentItems(selectedCluster, batchState);
    const alerts = buildAlerts(batchState, selectedCluster, services, documentsView);
    const readiness = buildReadiness(batchState, services, alerts);
    const summaryCards = buildSummaryCards(services, documentsView.length, readiness);

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
            visible: clusters.length > 1,
            selectedKey: selectedCluster.key,
            totalPatients: clusters.length,
            options: sortClusters(clusters).map((cluster) => ({
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
            intakeStatus: readiness.readyForAnalysis ? 'Ready for Analysis' : readiness.statusLabel,
        },
        summaryCards,
        activeFilter: DEFAULT_FILTER,
        services,
        documents: documentsView,
        readiness,
        alerts,
        meta: {
            parseError: false,
            parseErrorMessage: null,
            emptyState: services.length === 0 && documentsView.length === 0,
            schemaHints: buildSchemaHints(clusters.length, selectedCluster, services.length),
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
        summaryCards: {
            primary: [],
            secondary: [],
        },
        activeFilter: DEFAULT_FILTER,
        services: [],
        documents: [],
        readiness: {
            score: 0,
            readyForAnalysis: false,
            statusLabel: 'Pending batchState',
            blockers: [],
        },
        alerts: [],
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
            clusters.push(finalizeCluster({
                ...seed,
                assistedMerged: distinctDisplayNames(seed.names).length > 1,
            }));
            continue;
        }

        mergeSeedIntoCluster(match.cluster, seed, match.assistedMerged);
    }

    return clusters.map((cluster) => finalizeCluster(cluster));
}

function finalizeCluster(cluster: AccountCluster): AccountCluster {
    cluster.key = resolveClusterKey(cluster);
    cluster.assistedMerged = cluster.assistedMerged || distinctDisplayNames(cluster.names).length > 1;
    return cluster;
}

function buildSeedsFromDocument(document: BatchStateDocument): AccountSeed[] {
    const kind = getDocumentKind(document.className);
    const profile = extractDocumentProfile(document, kind);
    const services = extractServiceRows(document, kind, profile.invoiceNumber);
    const names = collectPatientNames(profile, services);

    return [createSeedFromDocument(document, profile, services, names)];
}

function collectPatientNames(profile: DocumentProfile, services: ServiceSeedRow[]): string[] {
    return uniqueStrings([
        ...toArray(sanitizePatientNameCandidate(profile.patientName)),
        ...services
            .map((service) => sanitizePatientNameCandidate(service.patientName))
            .filter((name): name is string => Boolean(name)),
    ]);
}

function createSeedFromDocument(
    document: BatchStateDocument,
    profile: DocumentProfile,
    services: ServiceSeedRow[],
    names: string[]
): AccountSeed {
    const seed: AccountSeed = {
        key: buildClusterKey(profile, document.id),
        profiles: [profile],
        documents: [document],
        services,
        names,
        patientIds: toArray(profile.patientId).map(normalizeIdentifier),
        mrns: toArray(profile.mrn).map(normalizeIdentifier),
        invoices: toArray(profile.invoiceNumber).map(normalizeIdentifier),
        providers: toArray(profile.provider).map(normalizeKey),
        signalDates: extractProfileSignalDates(profile, services),
    };

    return seed;
}

function buildClusterKey(profile: DocumentProfile, documentId: string): string {
    const patientId = normalizeIdentifier(profile.patientId);
    const mrn = normalizeIdentifier(profile.mrn);
    const invoice = normalizeIdentifier(profile.invoiceNumber);

    if (patientId && mrn) {
        return `patient:${patientId}:${mrn}`;
    }

    if (patientId) {
        return `patient:${patientId}`;
    }

    if (mrn) {
        return `patient:mrn:${mrn}`;
    }

    if (invoice) {
        return `invoice:${invoice}`;
    }

    return `doc:${documentId}`;
}

function resolveClusterKey(cluster: AccountCluster): string {
    const profile: DocumentProfile = {
        sourceKind: 'other',
        sourcePriority: 99,
        patientName: null,
        patientId: cluster.patientIds[0] ?? null,
        mrn: cluster.mrns[0] ?? null,
        dob: null,
        ageLabel: null,
        provider: null,
        invoiceNumber: cluster.invoices[0] ?? null,
        admissionDate: null,
        dischargeDate: null,
        insurancePlan: null,
    };

    return buildClusterKey(profile, cluster.documents[0]?.id ?? cluster.key);
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
    if (intersectNormalized(cluster.patientIds, seed.patientIds)) {
        return { score: 100, assistedMerged: hasDistinctPatientNames(cluster, seed) };
    }

    if (cluster.patientIds.length && seed.patientIds.length) {
        return { score: -1, assistedMerged: false };
    }

    if (intersectNormalized(cluster.mrns, seed.mrns)) {
        return { score: 90, assistedMerged: hasDistinctPatientNames(cluster, seed) };
    }

    if (cluster.mrns.length && seed.mrns.length) {
        return { score: -1, assistedMerged: false };
    }

    if (intersectNormalized(cluster.invoices, seed.invoices)) {
        return { score: 80, assistedMerged: hasDistinctPatientNames(cluster, seed) };
    }

    if (hasConflictingProviders(cluster.providers, seed.providers) || hasConflictingDates(cluster.signalDates, seed.signalDates)) {
        return { score: -1, assistedMerged: false };
    }

    return { score: -1, assistedMerged: false };
}

function hasDistinctPatientNames(cluster: AccountCluster, seed: AccountSeed): boolean {
    const combined = uniqueStrings([...cluster.names, ...seed.names]);
    return distinctDisplayNames(combined).length > 1;
}

function mergeSeedIntoCluster(cluster: AccountCluster, seed: AccountSeed, assistedMerged: boolean): void {
    cluster.profiles.push(...seed.profiles);
    cluster.documents.push(...seed.documents);
    cluster.services.push(...seed.services);
    cluster.names = uniqueStrings([...cluster.names, ...seed.names]);
    cluster.patientIds = uniqueStrings([...cluster.patientIds, ...seed.patientIds]);
    cluster.mrns = uniqueStrings([...cluster.mrns, ...seed.mrns]);
    cluster.invoices = uniqueStrings([...cluster.invoices, ...seed.invoices]);
    cluster.providers = uniqueStrings([...cluster.providers, ...seed.providers]);
    cluster.signalDates = uniqueDates([...cluster.signalDates, ...seed.signalDates]);
    cluster.assistedMerged = cluster.assistedMerged || assistedMerged;
    cluster.key = resolveClusterKey(cluster);
}

function buildServiceItems(cluster: AccountCluster): IntakeAccountServiceItemViewModel[] {
    return sortServices(cluster.services)
        .map((service) => toServiceCard(cluster, service))
        .filter((service): service is IntakeAccountServiceItemViewModel => Boolean(service));
}

function toServiceCard(cluster: AccountCluster, service: ServiceSeedRow): IntakeAccountServiceItemViewModel | null {
    if (!hasRenderableServiceContent(service)) {
        return null;
    }

    const coverage = resolveSupportCoverage(cluster, service);
    const hasReviewRequired = service.sourceDocumentReviewRequired || cluster.documents.some((document) =>
        coverage.requiredDocuments.includes(mapDocumentKindLabel(getDocumentKind(document.className))) && isDocumentReviewPending(document)
    );
    const hasLowConfidence = typeof service.sourceDocumentConfidence === 'number' && service.sourceDocumentConfidence < LOW_CONFIDENCE_THRESHOLD;
    const supportStatus = resolveServiceStatus(coverage, hasReviewRequired, hasLowConfidence);
    const tone = mapServiceStatusTone(supportStatus);
    const confidencePercent = typeof service.sourceDocumentConfidence === 'number' ? Math.round(service.sourceDocumentConfidence * 100) : null;
    const alerts = buildServiceAlerts(coverage, hasReviewRequired, hasLowConfidence, confidencePercent);

    return {
        id: service.id,
        serviceDate: service.serviceDate,
        serviceCode: service.serviceCode,
        cup: service.cup,
        description: service.description,
        quantity: service.quantity,
        price: service.price,
        total: service.total,
        coverage: service.coverage,
        invoiceNumber: service.invoiceNumber,
        category: inferServiceCategory(service),
        supportStatus,
        completionPercent: coverage.completionPercent,
        requiredDocuments: coverage.requiredDocuments,
        presentDocuments: coverage.presentDocuments,
        missingDocuments: coverage.missingDocuments,
        extractionSource: service.sourceDocumentName,
        classificationConfidence: confidencePercent,
        confidenceSummary: confidencePercent !== null ? `${confidencePercent}% classification confidence` : null,
        alerts,
        tone,
        hasReviewRequired,
        hasLowConfidence,
    };
}

function buildDocumentItems(cluster: AccountCluster, batchState: BatchStateSource): IntakeAccountDocumentItemViewModel[] {
    return cluster.documents
        .map((document) => {
            const tone = getDocumentTone(document);
            const confidencePercent = typeof document.classificationConfidence === 'number' ? Math.round(document.classificationConfidence * 100) : null;
            const reviewStatus = resolveDocumentReviewStatus(document);
            const contentReference = resolveDocumentContentReference(document, batchState);

            return {
                id: document.id,
                name: document.name || document.className || 'Document',
                className: document.className || 'Supporting document',
                repositoryNodeId: contentReference?.nodeId ?? null,
                mimeType: contentReference?.mimeType ?? null,
                contentFileReferenceIndex: contentReference?.contentFileReferenceIndex ?? null,
                sourcePageIndex: contentReference?.sourcePageIndex ?? null,
                status: reviewStatus || (tone === 'warning' ? 'Low Confidence' : 'Complete'),
                classificationStatus: document.className ? 'Classified' : getBatchStateStatusLabel(batchState.classificationStatus),
                extractionStatus: ((document.fields?.length ?? 0) || (document.tables?.length ?? 0)) ? 'Extracted' : getBatchStateStatusLabel(batchState.extractionStatus),
                classificationConfidence: confidencePercent,
                extractionReviewStatus: document.extractionReviewStatus ?? null,
                separationReviewStatus: document.separationReviewStatus ?? null,
                extractedHighlights: buildDocumentHighlights(document),
                tone,
                viewLabel: 'View document',
            };
        })
        .sort((left, right) => compareTonePriority(left.tone, right.tone) || compareNullableStrings(left.className, right.className));
}

function resolveDocumentContentReference(document: BatchStateDocument, batchState: BatchStateSource): {
    nodeId: string | null;
    mimeType: string | null;
    contentFileReferenceIndex: number | null;
    sourcePageIndex: number | null;
} | null {
    const references = Array.isArray(batchState.contentFileReferences) ? batchState.contentFileReferences : [];
    const pages = Array.isArray(document.pages) ? document.pages : [];

    for (const page of pages) {
        if (typeof page.contentFileReferenceIndex !== 'number') {
            continue;
        }

        const reference = references[page.contentFileReferenceIndex] as { sys_id?: unknown; sysfile_blob?: { mimeType?: unknown } } | undefined;
        const nodeId = typeof reference?.sys_id === 'string' && reference.sys_id.trim() ? reference.sys_id.trim() : null;
        const mimeType = typeof reference?.sysfile_blob?.mimeType === 'string' && reference.sysfile_blob.mimeType.trim()
            ? reference.sysfile_blob.mimeType.trim()
            : null;

        if (!nodeId && !mimeType) {
            continue;
        }

        return {
            nodeId,
            mimeType,
            contentFileReferenceIndex: page.contentFileReferenceIndex,
            sourcePageIndex: typeof page.sourcePageIndex === 'number' ? page.sourcePageIndex : null,
        };
    }

    return null;
}

function buildSummaryCards(
    services: IntakeAccountServiceItemViewModel[],
    totalDocuments: number,
    readiness: IntakeAccountViewModel['readiness']
): IntakeAccountViewModel['summaryCards'] {
    const completeCount = services.filter((service) => service.supportStatus === 'Complete').length;
    const missingSupportCount = services.filter((service) => service.missingDocuments.length > 0).length;
    const pendingReviewCount = services.filter((service) => service.hasReviewRequired).length;
    const lowConfidenceCount = services.filter((service) => service.hasLowConfidence).length;

    const primary: IntakeAccountSummaryCardViewModel[] = [
        buildSummaryCard('all', 'Total Services', `${services.length}`, 'neutral', 'View all services'),
        buildSummaryCard('complete', 'Complete', `${completeCount}`, completeCount > 0 ? 'success' : 'neutral', 'Fully supported services'),
        buildSummaryCard('missing-support', 'Missing Support', `${missingSupportCount}`, missingSupportCount > 0 ? 'danger' : 'neutral', 'Services with missing support'),
        buildSummaryCard('pending-review', 'Pending Review', `${pendingReviewCount}`, pendingReviewCount > 0 ? 'warning' : 'neutral', 'Services or source docs marked for review'),
        buildSummaryCard('low-confidence', 'Low Confidence', `${lowConfidenceCount}`, lowConfidenceCount > 0 ? 'warning' : 'neutral', 'Confidence below threshold', lowConfidenceCount > 0),
    ];

    const secondary: IntakeAccountSummaryCardViewModel[] = [
        {
            key: 'documents',
            label: 'Total Documents',
            value: `${totalDocuments}`,
            tone: 'neutral',
            clickable: false,
            visible: true,
            helperText: 'General support repository',
        },
        {
            key: 'readiness',
            label: 'Analysis Readiness',
            value: `${readiness.score}%`,
            tone: readiness.readyForAnalysis
                ? 'success'
                : (readiness.blockers.some((blocker) => normalizeKey(blocker).includes('MISSING SUPPORT') || normalizeKey(blocker).includes('REJECTED DOCUMENTS'))
                    ? 'danger'
                    : (readiness.blockers.length ? 'warning' : 'neutral')),
            clickable: false,
            visible: true,
            helperText: buildReadinessHelperText(readiness),
        },
    ];

    return { primary, secondary };
}

function buildSummaryCard(
    filterKey: IntakeServiceFilterKey,
    label: string,
    value: string,
    tone: IntakeAccountTone,
    helperText: string,
    visible = true
): IntakeAccountSummaryCardViewModel {
    return {
        key: filterKey,
        label,
        value,
        tone,
        clickable: true,
        visible,
        helperText,
        filterKey,
    };
}

function buildReadinessHelperText(readiness: IntakeAccountViewModel['readiness']): string {
    if (readiness.readyForAnalysis) {
        return readiness.statusLabel;
    }

    if (!readiness.blockers.length) {
        return readiness.statusLabel;
    }

    if (readiness.blockers.length === 1) {
        return `${readiness.statusLabel}. ${readiness.blockers[0]}`;
    }

    return `${readiness.statusLabel}. ${readiness.blockers[0]} (+${readiness.blockers.length - 1} more)`;
}

function buildAlerts(
    batchState: BatchStateSource,
    cluster: AccountCluster,
    services: IntakeAccountServiceItemViewModel[],
    documents: IntakeAccountDocumentItemViewModel[]
): IntakeAccountReviewAlertViewModel[] {
    const alerts: IntakeAccountReviewAlertViewModel[] = [];

    if (cluster.assistedMerged && buildPatientResolutionViewModel(cluster).showAliasBanner) {
        alerts.push({
            title: 'OCR name reconciliation applied',
            description: 'The widget merged close patient name variants into a single account for Intake.',
            tone: 'warning',
        });
    }

    if (batchState.hasRejectedDocuments) {
        alerts.push({
            title: 'Rejected documents detected',
            description: 'At least one document was rejected by IDP and should be reviewed before Analysis.',
            tone: 'danger',
        });
    }

    const missingSupportServices = services.filter((service) => service.missingDocuments.length > 0);
    if (missingSupportServices.length) {
        alerts.push({
            title: 'Missing support detected',
            description: `${missingSupportServices.length} service(s) still require additional support documents.`,
            tone: 'danger',
        });
    }

    const pendingReviewDocuments = documents.filter((document) => document.status === 'Review Required');
    if (pendingReviewDocuments.length) {
        alerts.push({
            title: 'Document review required',
            description: `${pendingReviewDocuments.length} document(s) still have review-required signals.`,
            tone: 'warning',
        });
    }

    const lowConfidenceServices = services.filter((service) => service.hasLowConfidence);
    if (lowConfidenceServices.length) {
        alerts.push({
            title: 'Low confidence extraction',
            description: `${lowConfidenceServices.length} service(s) were extracted below the configured confidence threshold.`,
            tone: 'warning',
        });
    }

    return dedupeAlerts(alerts);
}

export function computeIntakeReadiness(
    services: IntakeAccountServiceItemViewModel[],
    hasRejectedDocuments: boolean,
    alerts: IntakeAccountReviewAlertViewModel[]
): IntakeAccountViewModel['readiness'] {
    return buildReadiness({ hasRejectedDocuments }, services, alerts);
}

function buildReadiness(
    batchState: BatchStateSource,
    services: IntakeAccountServiceItemViewModel[],
    alerts: IntakeAccountReviewAlertViewModel[]
): IntakeAccountViewModel['readiness'] {
    const blockers: string[] = [];
    const missingSupportCount = services.filter((service) => service.missingDocuments.length > 0).length;
    const pendingReviewCount = services.filter((service) => service.hasReviewRequired).length;

    if (missingSupportCount) {
        blockers.push(`${missingSupportCount} service(s) still have missing support.`);
    }

    if (pendingReviewCount) {
        blockers.push(`${pendingReviewCount} service(s) still need review.`);
    }

    if (batchState.hasRejectedDocuments) {
        blockers.push('Rejected documents must be resolved before advancing to Analysis.');
    }

    if (!services.length) {
        blockers.push('No billable services were mapped for this account.');
    }

    const averageCompletion = services.length
        ? Math.round((services.filter((service) => service.supportStatus === 'Complete').length / services.length) * 100)
        : 0;

    let score = averageCompletion;

    if (!services.length) {
        score = 0;
    }

    score = Math.max(0, Math.min(score, 100));

    return {
        score,
        readyForAnalysis: blockers.length === 0,
        statusLabel: blockers.length === 0 ? 'Ready for Analysis' : (alerts.length ? 'Review in Progress' : 'Support Pending'),
        blockers,
    };
}

function buildPatientResolutionViewModel(cluster: AccountCluster): IntakeAccountViewModel['patientResolution'] {
    const aliases = distinctDisplayNames(cluster.names);
    const showAliasBanner = aliases.length > 1;

    return {
        canonicalName: getCanonicalPatientName(cluster),
        aliases,
        assistedMerged: cluster.assistedMerged,
        showAliasBanner,
        message: showAliasBanner ? `Se unificaron variantes OCR del mismo paciente: ${aliases.join(' / ')}` : null,
    };
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
    const highlights: IntakeAccountDocumentHighlightViewModel[] = [];
    const fields = document.fields ?? [];
    const kind = getDocumentKind(document.className);
    const usedHighlightKeys = new Set<string>();
    const usedFieldKeys = new Set<string>();

    const addHighlight = (label: string, value: string | null, tone: IntakeAccountTone, field?: BatchStateField): void => {
        const normalizedLabel = normalizeKey(label);
        const normalizedValue = normalizeKey(value);
        if (!normalizedLabel || !normalizedValue) {
            return;
        }

        const dedupeKey = `${normalizedLabel}::${normalizedValue}`;
        if (usedHighlightKeys.has(dedupeKey)) {
            return;
        }

        usedHighlightKeys.add(dedupeKey);
        if (field) {
            usedFieldKeys.add(getFieldIdentity(field));
        }

        highlights.push({
            label,
            value: value as string,
            tone,
        });
    };

    const addConfiguredHighlights = (configs: Array<{ label: string; aliases: string[] }>): void => {
        for (const config of configs) {
            const field = findField(fields, config.aliases);
            if (!field) {
                continue;
            }

            addHighlight(
                config.label,
                toDisplayValue(field.value),
                field.extractionReviewStatus === 'ReviewRequired' ? 'warning' : 'neutral',
                field
            );
        }
    };

    addConfiguredHighlights(DOCUMENT_HIGHLIGHT_ALIASES_BY_KIND[kind] ?? []);
    addConfiguredHighlights(DOCUMENT_HIGHLIGHT_ALIASES);

    for (const table of document.tables ?? []) {
        const rowCount = table.records?.length ?? 0;
        if (!rowCount) {
            continue;
        }

        const tableLabel = normalizeKey(table.name) === normalizeKey('Tabla de Servicios facturados')
            ? 'Servicios detectados'
            : trimOrNull(table.name) || 'Tabla extraida';
        const rowLabel = rowCount === 1 ? '1 fila extraida' : `${rowCount} filas extraidas`;

        addHighlight(tableLabel, rowLabel, table.reviewStatus === 'ReviewRequired' ? 'warning' : 'neutral');
    }

    for (const field of fields.filter((item) => item.extractionReviewStatus === 'ReviewRequired')) {
        addHighlight(
            `Review: ${trimOrNull(field.name) || trimOrNull(field.id) || 'Field'}`,
            toDisplayValue(field.value),
            'warning',
            field
        );
    }

    for (const field of fields) {
        if (highlights.length >= MAX_DOCUMENT_HIGHLIGHTS) {
            break;
        }

        const fieldKey = getFieldIdentity(field);
        if (usedFieldKeys.has(fieldKey)) {
            continue;
        }

        addHighlight(
            trimOrNull(field.name) || trimOrNull(field.id) || 'Campo extraido',
            toDisplayValue(field.value),
            field.extractionReviewStatus === 'ReviewRequired' ? 'warning' : 'neutral',
            field
        );
    }

    return highlights.slice(0, MAX_DOCUMENT_HIGHLIGHTS);
}

function extractDocumentProfile(document: BatchStateDocument, sourceKind: DocumentKind): DocumentProfile {
    return {
        sourceKind,
        sourcePriority: getDocumentPriority(sourceKind),
        patientName: sanitizePatientNameCandidate(findFieldValue(document.fields, BILLING_FIELDS.patientName)),
        patientId: sanitizePlaceholderValue(findFieldValue(document.fields, BILLING_FIELDS.patientId)),
        mrn: sanitizePlaceholderValue(findFieldValue(document.fields, BILLING_FIELDS.mrn)),
        dob: normalizeDateDisplay(findFieldValue(document.fields, BILLING_FIELDS.dob)),
        ageLabel: findFieldValue(document.fields, BILLING_FIELDS.ageLabel),
        provider: findFieldValue(document.fields, BILLING_FIELDS.provider),
        invoiceNumber: findFieldValue(document.fields, BILLING_FIELDS.invoiceNumber),
        admissionDate: normalizeDateDisplay(findFieldValue(document.fields, BILLING_FIELDS.admissionDate)),
        dischargeDate: normalizeDateDisplay(findFieldValue(document.fields, BILLING_FIELDS.dischargeDate)),
        insurancePlan: findFieldValue(document.fields, BILLING_FIELDS.insurancePlan),
    };
}

function extractServiceRows(document: BatchStateDocument, kind: DocumentKind, invoiceNumber: string | null): ServiceSeedRow[] {
    const tables = document.tables ?? [];
    const serviceTable = tables.find((table) => normalizeKey(table.name) === normalizeKey('Tabla de Servicios facturados'));
    if (!serviceTable?.records?.length) {
        return [];
    }

    return serviceTable.records
        .map((row, index) => toServiceSeedRow(document, kind, row.records ?? [], invoiceNumber, index))
        .filter((service): service is ServiceSeedRow => Boolean(service));
}

function toServiceSeedRow(
    document: BatchStateDocument,
    kind: DocumentKind,
    cells: BatchStateTableCell[],
    invoiceNumber: string | null,
    index: number
): ServiceSeedRow | null {
    const rowMap = new Map<string, string>();

    for (const cell of cells) {
        const key = normalizeKey(cell.recordName ?? cell.name);
        const value = toDisplayValue(cell.value);
        if (key && value !== null) {
            rowMap.set(key, value);
        }
    }

    const serviceCode = trimOrNull(rowMap.get('SERVICIO') ?? null);
    const cup = trimOrNull(rowMap.get('CUP') ?? rowMap.get('CUPS') ?? null);
    const description = trimOrNull(rowMap.get('DESCRIPCION') ?? null);
    const quantity = trimOrNull(rowMap.get('CANTIDAD') ?? null);
    const price = trimOrNull(rowMap.get('PRECIO') ?? null);
    const total = trimOrNull(rowMap.get('TOTAL') ?? null);
    const coverage = trimOrNull(rowMap.get('COBERTURA') ?? null);
    const patientName = sanitizePatientNameCandidate(rowMap.get('PACIENTE') ?? null);
    const serviceDateRaw = trimOrNull(rowMap.get('FECHA') ?? null);

    if (!serviceCode && !cup && !description && !quantity && !price && !total) {
        return null;
    }

    const serviceDateValue = parseFlexibleDate(serviceDateRaw);

    return {
        id: `${document.id}-service-${index}`,
        serviceDate: serviceDateValue ? formatDate(serviceDateValue) : serviceDateRaw,
        serviceDateValue,
        serviceCode,
        cup,
        description,
        quantity,
        price,
        total,
        coverage,
        patientName,
        invoiceNumber: trimOrNull(invoiceNumber),
        sourceDocumentName: document.className || document.name || 'Document',
        sourceDocumentId: document.id,
        sourceDocumentKind: kind,
        sourceDocumentConfidence: typeof document.classificationConfidence === 'number' ? document.classificationConfidence : null,
        sourceDocumentReviewRequired: isDocumentReviewPending(document),
    };
}

function resolveSupportCoverage(cluster: AccountCluster, service: ServiceSeedRow): SupportCoverageInfo {
    const descriptionSignal = normalizeKey(`${service.serviceCode || ''} ${service.description || ''}`);
    const presentLabels = uniqueStrings(cluster.documents.map((document) => mapDocumentKindLabel(getDocumentKind(document.className))));
    const required = new Set<string>(INTAKE_SUPPORT_HEURISTICS.alwaysRequired);

    for (const requirement of INTAKE_SUPPORT_HEURISTICS.serviceRequirements) {
        const hasTriggerDocument = cluster.documents.some(
            (document) => getDocumentKind(document.className) === requirement.triggerDocumentKind
        );
        const matchesServiceDescription = new RegExp(requirement.serviceDescriptionPattern, 'i').test(descriptionSignal);

        if (hasTriggerDocument || matchesServiceDescription) {
            required.add(requirement.requiredDocument);
        }
    }

    const requiredDocuments = Array.from(required);
    const presentDocuments = requiredDocuments.filter((item) => presentLabels.includes(item));
    const missingDocuments = requiredDocuments.filter((item) => !presentLabels.includes(item));
    const completionPercent = requiredDocuments.length
        ? Math.round((presentDocuments.length / requiredDocuments.length) * 100)
        : 100;

    return {
        requiredDocuments,
        presentDocuments,
        missingDocuments,
        completionPercent,
        tone: missingDocuments.length ? (presentDocuments.length ? 'warning' : 'danger') : 'success',
    };
}

function resolveServiceStatus(
    coverage: SupportCoverageInfo,
    hasReviewRequired: boolean,
    hasLowConfidence: boolean
): IntakeServiceStatus {
    if (hasReviewRequired) {
        return 'Review Required';
    }

    if (hasLowConfidence) {
        return 'Low Confidence';
    }

    if (coverage.missingDocuments.length === 0) {
        return 'Complete';
    }

    if (coverage.presentDocuments.length === 0) {
        return 'Missing Support';
    }

    return 'Partial';
}

function mapServiceStatusTone(status: IntakeServiceStatus): IntakeAccountTone {
    switch (status) {
        case 'Complete':
            return 'success';
        case 'Partial':
        case 'Low Confidence':
        case 'Review Required':
            return 'warning';
        case 'Missing Support':
            return 'danger';
        default:
            return 'neutral';
    }
}

function buildServiceAlerts(
    coverage: SupportCoverageInfo,
    hasReviewRequired: boolean,
    hasLowConfidence: boolean,
    confidencePercent: number | null
): string[] {
    const alerts: string[] = [];

    if (coverage.missingDocuments.length) {
        alerts.push(`Missing: ${coverage.missingDocuments.join(', ')}`);
    }

    if (hasReviewRequired) {
        alerts.push('Review required in source documentation');
    }

    if (hasLowConfidence && confidencePercent !== null) {
        alerts.push(`Low confidence: ${confidencePercent}%`);
    }

    return alerts;
}

function inferServiceCategory(service: ServiceSeedRow): string | null {
    const signal = normalizeKey(`${service.serviceCode || ''} ${service.description || ''}`);

    if (/AMBULATORIO/.test(signal)) {
        return 'Ambulatory';
    }

    if (/HOSP|INTENSIVO|PLANTA|CUARTA/.test(signal)) {
        return 'Inpatient';
    }

    if (/LAB|RADIO|RAYO|ULTRA|SONO|PATOLOG/.test(signal)) {
        return 'Diagnostic';
    }

    return 'Clinical service';
}

function resolveDocumentReviewStatus(document: BatchStateDocument): string | null {
    if (document.extractionReviewStatus === 'ReviewRequired') {
        return 'Extraction review required';
    }

    if (document.separationReviewStatus === 'ReviewRequired') {
        return 'Separation review required';
    }

    if (document.classificationReviewStatus === 'ReviewRequired') {
        return 'Classification review required';
    }

    return null;
}

function getDocumentTone(document: BatchStateDocument): IntakeAccountTone {
    if (isDocumentReviewPending(document) || document.markAsRejected) {
        return 'danger';
    }

    if (typeof document.classificationConfidence === 'number' && document.classificationConfidence < LOW_CONFIDENCE_THRESHOLD) {
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

function matchesDocumentClassificationRule(normalizedClassName: string, rule: IntakeDocumentClassificationRule): boolean {
    if (!rule.classNameContains.length) {
        return false;
    }

    if (rule.classNameMatch === 'all') {
        return rule.classNameContains.every((token) => normalizedClassName.includes(normalizeKey(token)));
    }

    return rule.classNameContains.some((token) => normalizedClassName.includes(normalizeKey(token)));
}

function getDocumentKind(className: string | undefined): DocumentKind {
    const normalized = normalizeKey(className);

    for (const rule of INTAKE_SUPPORT_HEURISTICS.documentClassification) {
        if (rule.kind === 'other') {
            continue;
        }

        if (matchesDocumentClassificationRule(normalized, rule)) {
            return rule.kind;
        }
    }

    return 'other';
}

function getDocumentPriority(kind: DocumentKind): number {
    return INTAKE_SUPPORT_HEURISTICS.documentPriority[kind] ?? INTAKE_SUPPORT_HEURISTICS.documentPriority.other;
}

function mapDocumentKindLabel(kind: DocumentKind): string {
    const rule = INTAKE_SUPPORT_HEURISTICS.documentClassification.find((entry) => entry.kind === kind);
    return rule?.label ?? INTAKE_SUPPORT_HEURISTICS.documentClassification.find((entry) => entry.kind === 'other')?.label ?? 'Supporting Document';
}

function getCanonicalPatientName(cluster: AccountCluster): string | null {
    return getBestNameCandidate(cluster.profiles);
}

function getBestNameCandidate(profiles: DocumentProfile[]): string | null {
    const candidates = profiles
        .filter((profile) => sanitizePatientNameCandidate(profile.patientName))
        .sort((left, right) => {
            if (left.sourcePriority !== right.sourcePriority) {
                return left.sourcePriority - right.sourcePriority;
            }

            return (sanitizePatientNameCandidate(right.patientName)?.length || 0) - (sanitizePatientNameCandidate(left.patientName)?.length || 0);
        });

    return sanitizePatientNameCandidate(candidates[0]?.patientName || null);
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

            return (right.value?.length || 0) - (left.value?.length || 0);
        });

    return candidates[0]?.value || null;
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

function buildSchemaHints(totalPatients: number, _cluster: AccountCluster, _totalServices: number): string[] {
    return [
        totalPatients > 1 ? `${totalPatients} patient accounts` : 'Single patient batch',
    ];
}

function sortClusters(clusters: AccountCluster[]): AccountCluster[] {
    return [...clusters].sort((left, right) => {
        const leftName = getCanonicalPatientName(left);
        const rightName = getCanonicalPatientName(right);
        return compareNullableStrings(leftName, rightName) || (right.services.length - left.services.length);
    });
}

function sortServices(services: ServiceSeedRow[]): ServiceSeedRow[] {
    return [...services].sort((left, right) => {
        if (left.serviceDateValue && right.serviceDateValue) {
            return left.serviceDateValue.getTime() - right.serviceDateValue.getTime();
        }

        if (left.serviceDateValue) {
            return 1;
        }

        if (right.serviceDateValue) {
            return -1;
        }

        return compareNullableStrings(left.description || left.serviceCode, right.description || right.serviceCode);
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

    return clusters.find((cluster) => cluster.key === selectedPatientKey) || clusters[0];
}

function hasRenderableServiceContent(service: ServiceSeedRow): boolean {
    return Boolean(service.serviceCode || service.cup || service.description || service.price || service.total);
}

function findFieldValue(fields: BatchStateField[] | undefined, aliases: readonly string[]): string | null {
    const field = findField(fields ?? [], aliases);
    return trimOrNull(field ? toDisplayValue(field.value) : null);
}

function findField(fields: BatchStateField[], aliases: readonly string[]): BatchStateField | null {
    const normalizedAliases = aliases.map(normalizeKey);
    return fields.find((field) => normalizedAliases.includes(normalizeKey(field.name || field.id))) || null;
}

function getFieldIdentity(field: BatchStateField): string {
    return normalizeIdentifier(field.id || field.name || toDisplayValue(field.value) || 'field');
}

function extractProfileSignalDates(profile: DocumentProfile, services: ServiceSeedRow[]): Date[] {
    const dates = [
        parseFlexibleDate(profile.admissionDate),
        parseFlexibleDate(profile.dischargeDate),
        parseFlexibleDate(profile.dob),
        services.find((service) => service.serviceDateValue)?.serviceDateValue || null,
    ];

    return dates.filter((item): item is Date => Boolean(item));
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

function normalizeDateDisplay(value: string | null): string | null {
    const parsed = parseFlexibleDate(value);
    return parsed ? formatDate(parsed) : trimOrNull(value);
}

function formatDate(value: Date): string {
    const year = value.getUTCFullYear();
    const month = `${value.getUTCMonth() + 1}`.padStart(2, '0');
    const day = `${value.getUTCDate()}`.padStart(2, '0');
    return `${year}-${month}-${day}`;
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

function createInitials(name: string | null): string {
    if (!name) {
        return 'MR';
    }

    return name
        .split(/\s+/)
        .filter(Boolean)
        .slice(0, 2)
        .map((token) => token[0]?.toUpperCase() || '')
        .join('') || 'MR';
}

function trimOrNull(value: string | null | undefined): string | null {
    const trimmed = typeof value === 'string' ? value.trim() : '';
    return trimmed ? trimmed : null;
}

function sanitizePlaceholderValue(value: string | null | undefined): string | null {
    const trimmed = trimOrNull(value);
    if (!trimmed) {
        return null;
    }

    return PLACEHOLDER_FIELD_TOKENS.has(normalizeIdentifier(trimmed)) ? null : trimmed;
}

function sanitizePatientNameCandidate(value: string | null | undefined): string | null {
    const trimmed = sanitizePlaceholderValue(value);
    if (!trimmed) {
        return null;
    }

    const normalized = normalizeOcrNameArtifacts(trimmed);
    return /[A-Z]/i.test(normalizeKey(normalized)) ? normalized.trim() : null;
}

function normalizeOcrNameArtifacts(value: string): string {
    return value
        .replace(/\u00A5/g, 'Ñ')
        .replace(/\uFFE5/g, 'Ñ')
        .replace(/[`´ʹ''']/g, '')
        .replace(/\s+/g, ' ')
        .trim();
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

function toArray(value: string | null): string[] {
    return value ? [value] : [];
}

function uniqueStrings(values: Array<string | null | undefined>): string[] {
    return Array.from(new Set(values.filter((value): value is string => Boolean(value))));
}

function uniqueDates(values: Date[]): Date[] {
    const seen = new Set<number>();
    const result: Date[] = [];

    for (const value of values) {
        const key = value.getTime();
        if (seen.has(key)) {
            continue;
        }
        seen.add(key);
        result.push(value);
    }

    return result;
}

function distinctDisplayNames(values: string[]): string[] {
    const seen = new Set<string>();
    const result: string[] = [];

    for (const value of values) {
        const trimmed = sanitizePatientNameCandidate(value);
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

function intersectNormalized(left: string[], right: string[]): string | null {
    for (const value of left) {
        if (right.includes(value)) {
            return value;
        }
    }

    return null;
}

function compareNullableStrings(left: string | null | undefined, right: string | null | undefined): number {
    return (left || '').localeCompare(right || '');
}

function compareTonePriority(left: IntakeAccountTone, right: IntakeAccountTone): number {
    const order: Record<IntakeAccountTone, number> = {
        danger: 0,
        warning: 1,
        neutral: 2,
        success: 3,
    };

    return order[left] - order[right];
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
