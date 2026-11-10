#!/usr/bin/env node
'use strict';
/*
 * i18n-key-audit: read-only audit of a Hyland Custom UI plugin's translation files.
 *
 *  1. Locale parity: keys missing from / extra in each locale compared with the source locale.
 *  2. [TODO] placeholders still present in each locale.
 *  3. Code drift: translation keys used in src/**.ts|html (and assets/*.json) that the source
 *     locale does not define. Keys built by concatenation show up as dynamic prefixes.
 *  4. Optional baseline: the same parity numbers at a git ref, to tell old gaps from new ones.
 *
 * Node >= 20, no dependencies, never writes files. Output is plain ASCII.
 */

const fs = require('node:fs');
const path = require('node:path');
const { execFileSync } = require('node:child_process');

const TODO_PREFIX = '[TODO]';
// en, de, pt-BR, zh-Hans ... A file such as policy-v2.json is not a locale and is skipped.
const LOCALE_NAME = /^[a-z]{2,3}(?:-[A-Za-z0-9]{2,8})*$/;
const CODE_EXTENSIONS = new Set(['.ts', '.html']);
const SKIP_DIRS = new Set(['node_modules', '.git', 'dist']);

function fail(message) {
    console.error(`i18n-key-audit: ${message}`);
    process.exit(2);
}

function usage() {
    return [
        'Usage: node audit.cjs [--plugin <dir>] [--source <locale>] [--baseline <git-ref>]',
        '                      [--list] [--limit <n>] [--json] [--strict]',
        '',
        '  --plugin    Plugin root (holds assets/i18n and src). When omitted it is detected as the',
        '              only CustomUI/*/libs/plugins/* in the current directory.',
        '  --source    Source locale, file name without .json (default: en).',
        '  --expect    Comma-separated locales the project declares (de,es,fr): reports each one whose file does not exist.',
        '  --baseline  Git ref to compare with (HEAD, main, a SHA): adds a "before" column.',
        '  --list      Print the missing/extra keys; locales with identical gaps are grouped.',
        '  --limit     Keys printed per list with --list (default 20, 0 = all).',
        '  --json      Print a JSON report (full key lists) instead of text.',
        '  --strict    Exit 1 when a locale has missing/extra keys or the code uses unknown keys.',
        '',
        'Exit codes: 0 ok (or findings without --strict), 1 findings with --strict, 2 usage error or invalid JSON.',
    ].join('\n');
}

function parseArgs(argv) {
    const opts = { source: 'en', limit: 20, list: false, json: false, strict: false };
    for (let i = 0; i < argv.length; i++) {
        const arg = argv[i];
        const value = () => {
            if (i + 1 >= argv.length) fail(`${arg} needs a value`);
            return argv[++i];
        };
        switch (arg) {
            case '--plugin':
                opts.plugin = value();
                break;
            case '--source':
                opts.source = value();
                break;
            case '--expect':
                opts.expect = value()
                    .split(',')
                    .map((name) => name.trim())
                    .filter(Boolean);
                if (opts.expect.some((name) => !LOCALE_NAME.test(name))) fail('--expect needs locale names such as de,es,pt-BR');
                break;
            case '--baseline':
                opts.baseline = value();
                break;
            case '--limit':
                opts.limit = Number.parseInt(value(), 10);
                if (!Number.isInteger(opts.limit) || opts.limit < 0) fail('--limit needs a non-negative integer');
                break;
            case '--list':
                opts.list = true;
                break;
            case '--json':
                opts.json = true;
                break;
            case '--strict':
                opts.strict = true;
                break;
            case '--help':
            case '-h':
                console.log(usage());
                process.exit(0);
                break;
            default:
                fail(`unknown argument ${arg}\n\n${usage()}`);
        }
    }
    return opts;
}

function listDirs(dir) {
    try {
        return fs
            .readdirSync(dir, { withFileTypes: true })
            .filter((entry) => entry.isDirectory())
            .map((entry) => entry.name);
    } catch {
        return [];
    }
}

function detectPlugins(cwd) {
    const found = [];
    for (const workspace of listDirs(path.join(cwd, 'CustomUI'))) {
        const plugins = path.join(cwd, 'CustomUI', workspace, 'libs', 'plugins');
        for (const plugin of listDirs(plugins)) {
            const root = path.join(plugins, plugin);
            if (fs.existsSync(path.join(root, 'assets', 'i18n'))) found.push(root);
        }
    }
    return found;
}

function flatten(node, prefix, leaves, branches) {
    for (const [key, value] of Object.entries(node)) {
        const full = prefix ? `${prefix}.${key}` : key;
        if (value !== null && typeof value === 'object' && !Array.isArray(value)) {
            branches.add(full);
            flatten(value, full, leaves, branches);
        } else {
            leaves.set(full, value);
        }
    }
}

function parseLocale(text) {
    const leaves = new Map();
    const branches = new Set();
    flatten(JSON.parse(text.replace(/^﻿/, '')), '', leaves, branches);
    return { leaves, branches };
}

function gapsFor(locale, source) {
    const missing = [...source.leaves.keys()].filter((key) => !locale.leaves.has(key));
    const extra = [...locale.leaves.keys()].filter((key) => !source.leaves.has(key));
    const todo = [...locale.leaves.values()].filter(
        (value) => typeof value === 'string' && value.trim().startsWith(TODO_PREFIX)
    ).length;
    return { missing, extra, todo, keys: locale.leaves.size };
}

function walk(dir, out) {
    let entries;
    try {
        entries = fs.readdirSync(dir, { withFileTypes: true });
    } catch {
        return out;
    }
    for (const entry of entries) {
        if (entry.isDirectory()) {
            if (!SKIP_DIRS.has(entry.name)) walk(path.join(dir, entry.name), out);
        } else if (CODE_EXTENSIONS.has(path.extname(entry.name)) && !/\.(spec|test)\.ts$/.test(entry.name)) {
            out.push(path.join(dir, entry.name));
        }
    }
    return out;
}

function codeFiles(plugin) {
    const files = walk(path.join(plugin, 'src'), []);
    const assets = path.join(plugin, 'assets');
    try {
        for (const entry of fs.readdirSync(assets, { withFileTypes: true })) {
            if (entry.isFile() && entry.name.endsWith('.json')) files.push(path.join(assets, entry.name));
        }
    } catch {
        // No assets folder: nothing more to scan.
    }
    return files;
}

function escapeRegExp(text) {
    return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/** 'A.B.PRESET_' + id: the code appends the rest of the last segment at runtime. */
function isKeyStem(token, knownKeys) {
    return token.endsWith('_') && knownKeys.some((key) => key.startsWith(token));
}

/**
 * Finds translation keys in code. A key is any dotted token that starts with one of the source
 * locale's top-level keys (MEDICAL_RECORDS.NAV.MENU_ITEM). A token that is a leaf of the source is
 * "used"; a branch ('A.B.' + status) or a stem ('A.B.PRESET_' + id) is "dynamic", completed at
 * runtime and impossible to verify; anything else is drift.
 */
function scanCode(plugin, source) {
    const used = new Set();
    const dynamic = new Set();
    const drift = new Map();
    const knownKeys = [...source.leaves.keys(), ...source.branches];
    const roots = [...new Set(knownKeys.map((key) => key.split('.')[0]))];
    if (roots.length === 0) return { used, dynamic, drift };
    const pattern = new RegExp(
        `\\b(?:${roots.map(escapeRegExp).join('|')})(?:\\.[A-Za-z0-9_]+)*(?![A-Za-z0-9_])`,
        'g'
    );
    for (const file of codeFiles(plugin)) {
        const text = fs.readFileSync(file, 'utf8');
        for (const match of text.matchAll(pattern)) {
            const key = match[0];
            if (source.leaves.has(key)) {
                used.add(key);
            } else if (dynamic.has(key) || source.branches.has(key) || isKeyStem(key, knownKeys)) {
                dynamic.add(key);
            } else {
                const places = drift.get(key) ?? [];
                if (places.length < 3) {
                    places.push({
                        file: path.relative(plugin, file).split(path.sep).join('/'),
                        line: text.slice(0, match.index).split('\n').length,
                    });
                }
                drift.set(key, places);
            }
        }
    }
    return { used, dynamic, drift };
}

function git(cwd, args) {
    return execFileSync('git', ['-C', cwd, ...args], {
        encoding: 'utf8',
        maxBuffer: 1 << 26,
        stdio: ['ignore', 'pipe', 'pipe'],
    });
}

/** The same missing/extra numbers computed from the files as they were at a git ref. */
function loadBaseline(i18nDir, localeNames, sourceName, ref) {
    let top;
    try {
        top = path.resolve(git(i18nDir, ['rev-parse', '--show-toplevel']).trim());
    } catch {
        return { ref, error: 'not inside a git checkout' };
    }
    const atRef = new Map();
    for (const name of localeNames) {
        const rel = path.relative(top, path.join(i18nDir, `${name}.json`)).split(path.sep).join('/');
        try {
            atRef.set(name, parseLocale(git(top, ['show', `${ref}:${rel}`])));
        } catch {
            // The file did not exist (or was not valid JSON) at that ref: no baseline for this locale.
        }
    }
    const sourceAtRef = atRef.get(sourceName);
    if (!sourceAtRef) return { ref, error: `${sourceName}.json is not available at ${ref}` };
    const rows = {};
    for (const [name, locale] of atRef) {
        if (name === sourceName) continue;
        const gaps = gapsFor(locale, sourceAtRef);
        rows[name] = { missing: gaps.missing.length, extra: gaps.extra.length };
    }
    return { ref, rows };
}

function groupBySignature(rows, field) {
    const groups = new Map();
    for (const row of rows) {
        const keys = row[field];
        if (keys.length === 0) continue;
        const signature = keys.join('\n');
        const group = groups.get(signature) ?? { locales: [], keys };
        group.locales.push(row.locale);
        groups.set(signature, group);
    }
    return [...groups.values()];
}

function formatText(report, rows, opts) {
    const lines = [];
    lines.push(`i18n-key-audit  plugin=${report.plugin}  source=${report.source} (${report.sourceKeys} keys)`);
    lines.push(`Locales: ${report.locales.map((row) => row.locale).join(', ') || '(none besides the source)'}`);
    if (report.skipped.length > 0) lines.push(`Skipped (not locale files): ${report.skipped.join(', ')}`);
    if (report.missingLocaleFiles.length > 0) {
        lines.push(`Missing locale files (declared with --expect): ${report.missingLocaleFiles.join(', ')}`);
    }
    lines.push('');

    const base = report.baseline && report.baseline.rows;
    const header = ['Locale', 'Keys', 'Missing', 'Extra', '[TODO]'];
    if (base) header.push(`Before ${report.baseline.ref} (missing/extra)`);
    const widths = [8, 6, 8, 6, 7];
    lines.push(header.map((cell, i) => (widths[i] ? cell.padEnd(widths[i]) : cell)).join(' '));
    for (const row of report.locales) {
        const cells = [row.locale, row.keys, row.missing, row.extra, row.todo].map((cell, i) =>
            String(cell).padEnd(widths[i])
        );
        if (base) cells.push(base[row.locale] ? `${base[row.locale].missing}/${base[row.locale].extra}` : 'n/a');
        lines.push(cells.join(' '));
    }
    if (report.baseline && report.baseline.error) {
        lines.push(`Baseline ${report.baseline.ref}: ${report.baseline.error}`);
    }

    if (opts.list) {
        const shown = (keys) => (opts.limit === 0 ? keys : keys.slice(0, opts.limit));
        for (const [field, label] of [
            ['missingKeys', 'Missing'],
            ['extraKeys', 'Extra'],
        ]) {
            for (const group of groupBySignature(
                rows.map((row) => ({ locale: row.locale, [field]: row[field === 'missingKeys' ? 'missing' : 'extra'] })),
                field
            )) {
                lines.push('');
                lines.push(
                    `${label} in ${group.locales.join(', ')} (${group.keys.length} ${group.keys.length === 1 ? 'key' : 'keys'}):`
                );
                for (const key of shown(group.keys)) lines.push(`  ${key}`);
                const rest = group.keys.length - shown(group.keys).length;
                if (rest > 0) lines.push(`  (+${rest} more; --limit 0 prints all)`);
            }
        }
    }

    lines.push('');
    lines.push(`Code drift: ${report.codeDrift.length} key(s) used in code are not defined in ${report.source}.json`);
    for (const item of report.codeDrift) {
        lines.push(`  ${item.key}  <- ${item.places.map((place) => `${place.file}:${place.line}`).join(', ')}`);
    }
    lines.push(
        `Dynamic prefixes (completed at runtime, cannot be verified): ${report.dynamicPrefixes.length}` +
            (report.dynamicPrefixes.length > 0 ? ` -> ${report.dynamicPrefixes.join(', ')}` : '')
    );
    lines.push(`Keys referenced in code: ${report.usedKeys}`);
    lines.push('');
    const missingLocales = report.locales.filter((row) => row.missing > 0).length;
    const extraLocales = report.locales.filter((row) => row.extra > 0).length;
    lines.push(
        report.ok
            ? 'Result: OK (0 missing, 0 extra, 0 code drift)'
            : `Result: FINDINGS (missing keys in ${missingLocales} locale(s), extra keys in ${extraLocales}, ` +
                  `${report.codeDrift.length} unknown key(s) used in code, ` +
                  `${report.missingLocaleFiles.length} locale file(s) missing)`
    );
    return lines.join('\n');
}

function main() {
    const opts = parseArgs(process.argv.slice(2));
    const cwd = process.cwd();

    let plugin = opts.plugin ? path.resolve(cwd, opts.plugin) : undefined;
    if (!plugin) {
        const candidates = detectPlugins(cwd);
        if (candidates.length !== 1) {
            fail(
                candidates.length === 0
                    ? 'no plugin found under CustomUI/*/libs/plugins/*; run from the repo root or pass --plugin <dir>'
                    : `several plugins found, pass --plugin <dir>:\n  ${candidates.join('\n  ')}`
            );
        }
        plugin = candidates[0];
    }
    const i18nDir = path.join(plugin, 'assets', 'i18n');
    if (!fs.existsSync(i18nDir)) fail(`${i18nDir} does not exist`);

    const files = fs.readdirSync(i18nDir).filter((name) => name.endsWith('.json')).sort();
    const localeNames = files.map((name) => name.slice(0, -5)).filter((name) => LOCALE_NAME.test(name));
    const skipped = files.filter((name) => !LOCALE_NAME.test(name.slice(0, -5)));
    if (!localeNames.includes(opts.source)) fail(`source locale ${opts.source}.json not found in ${i18nDir}`);
    // The audit only sees locales that exist as files, so a language with no file at all needs --expect.
    const absent = (opts.expect ?? []).filter((name) => name !== opts.source && !localeNames.includes(name));

    const locales = new Map();
    const invalid = [];
    for (const name of localeNames) {
        try {
            locales.set(name, parseLocale(fs.readFileSync(path.join(i18nDir, `${name}.json`), 'utf8')));
        } catch (error) {
            invalid.push(`${name}.json: ${error.message}`);
        }
    }
    if (invalid.length > 0) fail(`invalid JSON, nothing audited:\n  ${invalid.join('\n  ')}`);

    const source = locales.get(opts.source);
    const rows = localeNames
        .filter((name) => name !== opts.source)
        .map((name) => ({ locale: name, ...gapsFor(locales.get(name), source) }));
    const code = scanCode(plugin, source);
    const baseline = opts.baseline ? loadBaseline(i18nDir, localeNames, opts.source, opts.baseline) : undefined;

    const ok =
        rows.every((row) => row.missing.length === 0 && row.extra.length === 0) &&
        code.drift.size === 0 &&
        absent.length === 0;
    const report = {
        plugin: path.relative(cwd, plugin).split(path.sep).join('/') || '.',
        source: opts.source,
        sourceKeys: source.leaves.size,
        skipped,
        missingLocaleFiles: absent,
        locales: rows.map((row) => ({
            locale: row.locale,
            keys: row.keys,
            missing: row.missing.length,
            extra: row.extra.length,
            todo: row.todo,
            ...(opts.json ? { missingKeys: row.missing, extraKeys: row.extra } : {}),
        })),
        baseline,
        codeDrift: [...code.drift].map(([key, places]) => ({ key, places })),
        dynamicPrefixes: [...code.dynamic].sort(),
        usedKeys: code.used.size,
        ok,
    };

    console.log(opts.json ? JSON.stringify(report, null, 2) : formatText(report, rows, opts));
    process.exitCode = opts.strict && !ok ? 1 : 0;
}

main();
