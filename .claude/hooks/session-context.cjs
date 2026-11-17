#!/usr/bin/env node
/*
 * Harness de contexto (patrón SessionStart de CIC-Learn/superpowers, adaptado).
 * Protocolo: docs/agents/contexto.md. Nunca bloquea la sesión: cualquier error sale con 0.
 *
 *   session-start  Reinyecta el estado (.claude/session-state.md) al arrancar, reanudar, limpiar o compactar.
 *   pre-compact    Guarda un snapshot automático (rama y archivos cambiados) en el estado antes de compactar.
 *   prompt         Si la conversación es grande y el estado está desactualizado, pide un checkpoint.
 */
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const ROOT = process.env.CLAUDE_PROJECT_DIR || process.cwd();
const STATE = path.join(ROOT, '.claude', 'session-state.md');
const MAX_STATE_CHARS = 8000;
const WARN_BYTES = Number(process.env.MR_CONTEXT_WARN_BYTES) || 1_500_000;
const STALE_MS = 20 * 60 * 1000;
const SNAP_START = '<!-- auto-snapshot:start -->';
const SNAP_END = '<!-- auto-snapshot:end -->';
const PLUGIN_PREFIX = 'CustomUI/medicalrecords-pq7lr-source/libs/plugins/medical-records/';

const TEMPLATE = `# Estado de sesión (local, no versionado)

Protocolo: docs/agents/contexto.md. Máx. ~80 líneas. Sin PII/PHI ni valores de entorno.
Lo duradero vive en las issues; aquí solo lo volátil y los punteros.

## Objetivo actual

## Decisiones vigentes (con issue)

## En curso

## Siguiente paso

## Autorizaciones y verificaciones pendientes

${SNAP_START}
${SNAP_END}
`;

function readStdin() {
    try {
        const raw = fs.readFileSync(0, 'utf8');
        return raw ? JSON.parse(raw) : {};
    } catch {
        return {};
    }
}

function git(args) {
    try {
        return execFileSync('git', args, { cwd: ROOT, encoding: 'utf8', timeout: 4000, stdio: ['ignore', 'pipe', 'ignore'] }).trim();
    } catch {
        return '';
    }
}

function emit(event, additionalContext) {
    process.stdout.write(JSON.stringify({ hookSpecificOutput: { hookEventName: event, additionalContext } }));
}

function sessionStart(input) {
    const source = input.source || 'startup';
    const branch = git(['rev-parse', '--abbrev-ref', 'HEAD']) || '?';
    const changed = git(['status', '--porcelain']).split('\n').filter(Boolean).length;
    const lines = [
        '## Contexto persistente (harness del proyecto)',
        `Origen: ${source}. Rama: ${branch}. Archivos con cambios: ${changed}.`,
        'Protocolo: docs/agents/contexto.md. Memoria duradera = issues de GitHub; estado volátil = .claude/session-state.md.',
        'Checkpoint: skill `context-checkpoint` al cerrar un tramo, antes de delegar y cuando el harness lo pida.',
    ];
    if (source === 'compact' || source === 'resume') {
        lines.push('Tras compactar/reanudar: contrasta el estado con `git status` y las issues citadas antes de actuar; no re-decidas lo ya registrado.');
    }
    if (fs.existsSync(STATE)) {
        let state = fs.readFileSync(STATE, 'utf8');
        if (state.length > MAX_STATE_CHARS) {
            state = state.slice(0, MAX_STATE_CHARS) + '\n…(recortado: resume el estado en el próximo checkpoint)';
        }
        lines.push('', '### .claude/session-state.md', state);
    } else {
        lines.push('No existe .claude/session-state.md: créalo con la skill `context-checkpoint` cuando haya trabajo en curso.');
    }
    emit('SessionStart', lines.join('\n'));
}

function preCompact(input) {
    const branch = git(['rev-parse', '--abbrev-ref', 'HEAD']) || '?';
    const changed = git(['status', '--porcelain']).split('\n').filter(Boolean);
    // Agrupado por carpeta para no gastar el presupuesto del estado en rutas largas.
    const byDir = new Map();
    for (const line of changed) {
        const file = line.slice(3).replace(/^"|"$/g, '').replace(PLUGIN_PREFIX, '…/');
        const dir = file.includes('/') ? file.slice(0, file.lastIndexOf('/')) : '.';
        byDir.set(dir, (byDir.get(dir) || 0) + 1);
    }
    const dirs = [...byDir.entries()].sort((x, y) => y[1] - x[1]);
    const shown = dirs.slice(0, 20).map(([dir, n]) => `- \`${dir}\` (${n})`);
    if (dirs.length > 20) {
        shown.push(`- … y ${dirs.length - 20} carpetas más`);
    }
    const snapshot = [
        SNAP_START,
        `## Snapshot automático (${input.trigger || 'compact'}, ${new Date().toISOString()})`,
        `Rama \`${branch}\`, ${changed.length} archivos con cambios sin commit:`,
        ...shown,
        SNAP_END,
    ].join('\n');
    let state = fs.existsSync(STATE) ? fs.readFileSync(STATE, 'utf8') : TEMPLATE;
    const a = state.indexOf(SNAP_START);
    const b = state.indexOf(SNAP_END);
    state = a >= 0 && b > a ? state.slice(0, a) + snapshot + state.slice(b + SNAP_END.length) : state.trimEnd() + '\n\n' + snapshot + '\n';
    fs.mkdirSync(path.dirname(STATE), { recursive: true });
    fs.writeFileSync(STATE, state);
}

function prompt(input) {
    const transcript = input.transcript_path;
    if (!transcript || !fs.existsSync(transcript)) {
        return;
    }
    // La transcripción acumula todo el historial: medir solo lo posterior a la última compactación.
    const raw = fs.readFileSync(transcript, 'utf8');
    const boundary = Math.max(raw.lastIndexOf('"compact_boundary"'), raw.lastIndexOf('"isCompactSummary":true'));
    const size = Buffer.byteLength(boundary >= 0 ? raw.slice(boundary) : raw);
    if (size < WARN_BYTES) {
        return;
    }
    const stateAge = fs.existsSync(STATE) ? Date.now() - fs.statSync(STATE).mtimeMs : Infinity;
    if (stateAge < STALE_MS) {
        return;
    }
    const mb = (size / 1_000_000).toFixed(1);
    emit(
        'UserPromptSubmit',
        `Harness de contexto: la conversación ocupa ~${mb} MB y .claude/session-state.md lleva más de 20 min sin actualizarse. ` +
            'Antes de seguir con trabajo largo, haz un checkpoint (skill `context-checkpoint`): estado local + avance en la issue; ' +
            'si el siguiente tramo es independiente, propón continuarlo en una sesión nueva que arranque del estado y las issues.'
    );
}

try {
    const mode = process.argv[2];
    const input = readStdin();
    if (mode === 'session-start') sessionStart(input);
    else if (mode === 'pre-compact') preCompact(input);
    else if (mode === 'prompt') prompt(input);
} catch {
    // El harness nunca bloquea la sesión.
}
process.exit(0);
