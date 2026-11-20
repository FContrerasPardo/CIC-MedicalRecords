// Automate script task: pick the agreement (convenio) of the account by the provider name.
//
// Why: the rules of each agreement live in Appdata, one file per agent
// (/MedRec/Appdata/Agreements/<agreementId>/*.json, see docs/automate/convenios-appdata.md). The agents
// must read the files of the provider's agreement instead of the process variables with default values.
// The provider comes from the extraction, not from the start form:
//   1. docSummary.provider (IDP value of the invoice, e.g. "Centro Medico LATAM");
//   2. else accountSummary.provider (previous input, still accepted);
//   3. else no provider: the default agreement.
// Same matching as the Custom UI (agreement-store.util.ts → resolveAgreementForProvider): case, accents,
// punctuation and legal suffixes are ignored; exact match first, then containment (6+ characters);
// without a match, the default agreement.
//
// Where: once in the root process, after docSummary is computed and before the «Get Rules» / READ_FILE
// tasks; pass agreementFolder to Agent Mesh as an input of the call activity. Inputs: agreementsIndex
// (json, READ_FILE of /MedRec/Appdata/Agreements/agreements-index.json; empty when the file is missing),
// docSummary (json or JSON text), accountSummary (json, optional). Outputs: agreementId (string),
// agreementFolder (string, /MedRec/Appdata/Agreements/<agreementId>), agreementMatched (boolean).

const DEFAULT_AGREEMENT_ID = 'centro-medico-latam';
const LEGAL_SUFFIXES = ['S', 'A', 'SA', 'SAS', 'SRL', 'LTDA', 'INC', 'EIRL'];

const parse = (raw) => {
    if (!raw) {
        return {};
    }
    try {
        return typeof raw === 'string' ? JSON.parse(raw) : raw;
    } catch (error) {
        return {};
    }
};

function normalizeProvider(value) {
    return String(value === null || value === undefined ? '' : value)
        .normalize('NFD')
        .replace(/[̀-ͯ]/g, '')
        .replace(/[^a-zA-Z0-9]+/g, ' ')
        .trim()
        .toUpperCase()
        .split(' ')
        .filter((word) => word && LEGAL_SUFFIXES.indexOf(word) === -1)
        .join(' ');
}

const index = parse(variables.agreementsIndex);
const entries = (Array.isArray(index) ? index : Array.isArray(index.agreements) ? index.agreements : []).filter((entry) => entry && entry.agreementId);
const text = (value) => (value === null || value === undefined ? '' : String(value).trim());
const summary = parse(variables.docSummary);
const account = parse(variables.accountSummary);
const invoices = Array.isArray(summary.invoices) ? summary.invoices : [];
const invoiceProvider = invoices.map((invoice) => text(invoice && invoice.provider)).filter((name) => !!name)[0] || '';
const provider = text(summary.provider) || invoiceProvider || text(account.provider);
const wanted = normalizeProvider(provider);

let match = null;
if (wanted) {
    match = entries.find((entry) => normalizeProvider(entry.providerName) === wanted) || null;
    if (!match) {
        match =
            entries.find((entry) => {
                const name = normalizeProvider(entry.providerName);
                return Math.min(name.length, wanted.length) >= 6 && (name.indexOf(wanted) !== -1 || wanted.indexOf(name) !== -1);
            }) || null;
    }
}
const fallback =
    entries.find((entry) => entry.agreementId === DEFAULT_AGREEMENT_ID) || entries.find((entry) => String(entry.status).toUpperCase() === 'ACTIVE') || entries[0];
const agreementId = (match || fallback || { agreementId: DEFAULT_AGREEMENT_ID }).agreementId;

variables.agreementId = agreementId;
variables.agreementFolder = '/MedRec/Appdata/Agreements/' + agreementId;
variables.agreementMatched = !!match;
