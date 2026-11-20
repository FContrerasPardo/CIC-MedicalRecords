// Regenerates docs/automate/agreements/ from the plugin templates:
// - the base files (read by the Automate agents), copied as they are;
// - the language versions <name>.<lang>.json (es, en, pt) with the texts of
//   pages/agreements/store/templates/template-translations.json.
// Same rules as `localizeAgreementContent` (agreement-locale.util.ts): only free-text keys change;
// ids, codes, IDP class names and numbers stay the same. Contact names are never translated.
// Usage (from the repository root): node docs/automate/agreements/generate.cjs
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '../../..');
const templates = path.join(root, 'CustomUI/medicalrecords-pq7lr-source/libs/plugins/medical-records/src/lib/pages/agreements/store/templates');
const target = __dirname;
const LANGUAGES = ['es', 'en', 'pt'];
const TEXT_KEYS = new Set([
    'demoNote', 'agreementBadge', 'planName', 'legalRepresentative', 'contractType', 'jurisdiction', 'title', 'description',
    'condition', 'name', 'label', 'role', 'when', 'instruction', 'neverSelectFrom', 'scopeDecision', 'policySources',
    'outputCompatibility', 'commentRequirements', 'allDocumentsCoverage', 'sourceBoundary', 'unavailableValues',
    'statusDecision', 'normalization', 'datesAndAmounts', 'rule',
]);
const texts = JSON.parse(fs.readFileSync(path.join(templates, 'template-translations.json'), 'utf8')).texts;

function localize(value, language, key = '', parent = '') {
    if (Array.isArray(value)) {
        return value.map((item) => localize(item, language, key, parent));
    }
    if (value && typeof value === 'object') {
        return Object.fromEntries(Object.entries(value).map(([child, item]) => [child, localize(item, language, child, key || parent)]));
    }
    if (typeof value === 'string' && TEXT_KEYS.has(key) && !(key === 'name' && parent === 'contacts')) {
        return texts[value]?.[language] ?? value;
    }
    return value;
}

const write = (file, json) => fs.writeFileSync(file, `${JSON.stringify(json, null, 2)}\n`);
let count = 0;
fs.copyFileSync(path.join(templates, 'agreements-index.json'), path.join(target, 'agreements-index.json'));
for (const agreementId of fs.readdirSync(templates)) {
    const source = path.join(templates, agreementId);
    if (!fs.statSync(source).isDirectory()) {
        continue;
    }
    const folder = path.join(target, agreementId);
    fs.mkdirSync(folder, { recursive: true });
    for (const name of fs.readdirSync(source).filter((file) => /^[a-z-]+\.json$/.test(file))) {
        const base = JSON.parse(fs.readFileSync(path.join(source, name), 'utf8'));
        write(path.join(folder, name), base);
        for (const language of LANGUAGES) {
            write(path.join(folder, name.replace(/\.json$/, `.${language}.json`)), localize(base, language));
            count += 1;
        }
    }
}
console.log(`docs/automate/agreements regenerated (${count} language versions).`);
