import * as cmlAgreement from './templates/centro-medico-latam/agreement.json';
import * as cmlCodingRules from './templates/centro-medico-latam/coding-rules.json';
import * as cmlChecklist from './templates/centro-medico-latam/documentation-checklist.json';
import * as cmlCodingPolicy from './templates/centro-medico-latam/payer-coding-policy.json';
import * as cmlCompliance from './templates/centro-medico-latam/payer-compliance-policy.json';
import * as cmlPolicy from './templates/centro-medico-latam/preanalysis-policy.json';
import * as cmlTariff from './templates/centro-medico-latam/tariff-agreement.json';
import * as hghlAgreement from './templates/hospital-general-hyland-latam/agreement.json';
import * as hghlCodingRules from './templates/hospital-general-hyland-latam/coding-rules.json';
import * as hghlChecklist from './templates/hospital-general-hyland-latam/documentation-checklist.json';
import * as hghlCodingPolicy from './templates/hospital-general-hyland-latam/payer-coding-policy.json';
import * as hghlCompliance from './templates/hospital-general-hyland-latam/payer-compliance-policy.json';
import * as hghlPolicy from './templates/hospital-general-hyland-latam/preanalysis-policy.json';
import * as hghlTariff from './templates/hospital-general-hyland-latam/tariff-agreement.json';
import * as indexModule from './templates/agreements-index.json';
import { AgreementFileKind, AgreementsIndex, cloneJson, DEFAULT_AGREEMENT_ID, JsonObject, parseAgreementsIndex } from './agreement-store.util';

/**
 * Synthetic agreement seeds bundled with the plugin (mirrored in `docs/automate/agreements/`).
 * They are what the page shows before the files exist in Appdata and what «Create in Appdata from
 * template» writes. Bundlers expose JSON as `default`; jest (no esModuleInterop) as the module itself.
 */
function json(module: unknown): JsonObject {
    return ((module as { default?: unknown }).default ?? module) as JsonObject;
}

const TEMPLATES: Record<string, Record<AgreementFileKind, JsonObject>> = {
    'centro-medico-latam': {
        agreement: json(cmlAgreement),
        documentationChecklist: json(cmlChecklist),
        preanalysisPolicy: json(cmlPolicy),
        tariffAgreement: json(cmlTariff),
        payerCompliancePolicy: json(cmlCompliance),
        payerCodingPolicy: json(cmlCodingPolicy),
        codingRules: json(cmlCodingRules),
    },
    'hospital-general-hyland-latam': {
        agreement: json(hghlAgreement),
        documentationChecklist: json(hghlChecklist),
        preanalysisPolicy: json(hghlPolicy),
        tariffAgreement: json(hghlTariff),
        payerCompliancePolicy: json(hghlCompliance),
        payerCodingPolicy: json(hghlCodingPolicy),
        codingRules: json(hghlCodingRules),
    },
};

export const TEMPLATE_AGREEMENT_IDS: readonly string[] = Object.keys(TEMPLATES);

export function hasAgreementTemplate(agreementId: string): boolean {
    return !!TEMPLATES[agreementId];
}

/**
 * A fresh copy of a template file: the agreement's own seed, or the default agreement's seed for an
 * agreement created by duplication (its files are then expected in Appdata).
 */
export function agreementTemplateFile(agreementId: string, kind: AgreementFileKind): JsonObject {
    const template = TEMPLATES[agreementId] ?? TEMPLATES[DEFAULT_AGREEMENT_ID];
    return cloneJson(template[kind]);
}

/** The seed index (both synthetic agreements). */
export function templateAgreementsIndex(): AgreementsIndex {
    const parsed = parseAgreementsIndex(json(indexModule));
    return parsed ?? { kind: 'medical-records.agreements-index', schemaVersion: 1, updatedAt: null, agreements: [] };
}
