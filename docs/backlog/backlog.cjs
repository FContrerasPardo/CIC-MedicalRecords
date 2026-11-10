#!/usr/bin/env node
'use strict';
// Uso:
//   node docs/backlog/backlog.cjs check            valida el manifiesto y muestra conteos
//   node docs/backlog/backlog.cjs review           genera docs/backlog/PROPUESTA.md
//   node docs/backlog/backlog.cjs apply            muestra el plan (no escribe en GitHub)
//   node docs/backlog/backlog.cjs apply --yes [--project]
//                                                  crea labels, milestones, issues, sub-issues,
//                                                  dependencias y cierra lo completado.
//                                                  --project agrega los issues al proyecto MedRec.
// Es reanudable: el avance se guarda en docs/backlog/.state.json (no versionar).
const fs = require('fs');
const path = require('path');
const cp = require('child_process');
const M = require('./manifest.cjs');

const REPO = 'FContrerasPardo/CIC-MedicalRecords';
const OWNER = 'FContrerasPardo';
const PROJECT_NUM = 2;
const PROJECT_ID = 'PVT_kwHOAUS_Ic4BqNTp';
const STATE_FILE = path.join(__dirname, '.state.json');
const REVIEW_FILE = path.join(__dirname, 'PROPUESTA.md');

const argv = process.argv.slice(2);
const cmd = argv[0] || 'check';
const has = (f) => argv.includes(f);
const sleepSync = (ms) => Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms);

/* ------------------------------ modelo ------------------------------ */
const byId = new Map(M.items.map((i) => [i.id, i]));
for (const it of M.items) {
  const p = it.parent ? byId.get(it.parent) : null;
  it.ms = it.ms || (p && p.ms);
  it.pri = it.pri || (p && p.pri);
  it.etapa = it.etapa || (p && p.etapa);
  it.area = it.area || (p && p.area);
  it.labels = it.labels || [];
  it.blocked = it.blocked || [];
  it.who = it.who || [];
}
const kindOf = (it) => (it.kind === 'epic' ? 'EPIC' : it.kind === 'task' ? 'TASK' : { historia: 'HU', habilitador: 'HAB', entregable: 'ENT' }[it.type]);
const titleOf = (it) => `[${kindOf(it)}] ${it.title}`;
const tipoLabel = (it) => (it.kind === 'epic' ? 'tipo:epic' : it.kind === 'task' ? 'tipo:tarea' : `tipo:${it.type}`);
const labelsOf = (it) => [tipoLabel(it), it.pri, it.etapa && `etapa:${it.etapa}`, it.area && `area:${it.area}`, ...it.labels].filter(Boolean);
const stLabel = { done: 'completado', doing: 'en progreso', open: 'pendiente' };

function validate() {
  const errs = [];
  const warn = [];
  const seen = new Set();
  const names = new Set(M.labels.map((l) => l[0]));
  for (const it of M.items) {
    if (seen.has(it.id)) errs.push(`id duplicado ${it.id}`);
    seen.add(it.id);
    if (!it.title) errs.push(`${it.id}: sin título`);
    if (!M.milestones[it.ms]) errs.push(`${it.id}: milestone inválido`);
    if (!['P0', 'P1', 'P2', 'P3'].includes(it.pri)) errs.push(`${it.id}: prioridad inválida`);
    if (!['open', 'doing', 'done'].includes(it.st)) errs.push(`${it.id}: estado inválido`);
    for (const w of it.who) if (!M.users[w]) errs.push(`${it.id}: responsable ${w} desconocido`);
    for (const l of labelsOf(it)) if (!names.has(l)) errs.push(`${it.id}: label no definido ${l}`);
    const p = it.parent ? byId.get(it.parent) : null;
    if (it.kind === 'epic' && it.parent) errs.push(`${it.id}: un epic no tiene padre`);
    if (it.kind === 'story' && !(p && p.kind === 'epic')) errs.push(`${it.id}: la HU debe colgar de un epic`);
    if (it.kind === 'task' && !(p && p.kind === 'story')) errs.push(`${it.id}: la tarea debe colgar de una HU`);
    if (it.kind === 'story' && !['historia', 'habilitador', 'entregable'].includes(it.type)) errs.push(`${it.id}: type inválido`);
    if (it.kind === 'story' && !(it.ac && it.ac.length)) errs.push(`${it.id}: sin criterios de aceptación`);
    for (const b of it.blocked) {
      const t = byId.get(b);
      if (!t) errs.push(`${it.id}: bloqueado por inexistente ${b}`);
      else {
        if (b === it.id) errs.push(`${it.id}: se bloquea a sí mismo`);
        if (b === it.parent || t.parent === it.id) errs.push(`${it.id}: dependencia padre/hijo con ${b}`);
        if (it.st === 'done' && t.st !== 'done') warn.push(`${it.id} está completado pero depende de ${b} (${t.st})`);
      }
    }
  }
  // ciclos
  const color = {};
  const visit = (id, stack) => {
    if (color[id] === 2) return;
    if (color[id] === 1) { errs.push(`ciclo de dependencias: ${[...stack, id].join(' -> ')}`); return; }
    color[id] = 1;
    for (const b of (byId.get(id) || {}).blocked || []) visit(b, [...stack, id]);
    color[id] = 2;
  };
  for (const it of M.items) visit(it.id, []);
  return { errs, warn };
}

function counts() {
  const c = { epics: 0, historia: 0, habilitador: 0, entregable: 0, tasks: 0, done: 0, doing: 0, open: 0, deps: 0, tdone: 0, tdoing: 0, topen: 0 };
  for (const it of M.items) {
    if (it.kind === 'epic') c.epics++;
    else if (it.kind === 'story') c[it.type]++;
    else { c.tasks++; c['t' + it.st]++; }
    c[it.st]++;
    c.deps += it.blocked.length;
  }
  c.stories = c.historia + c.habilitador + c.entregable;
  c.total = M.items.length;
  return c;
}

/* ------------------------------ cuerpos ------------------------------ */
const originText = (o) => (!o ? '' : o.startsWith('nuevo') ? `Ítem nuevo, no estaba en el Epic Tracker v2${o.length > 5 ? ` ${o.slice(5)}` : ''}.` : `Migrado y replanteado desde el Epic Tracker v2 (2026-07-03): ${o}.`);
const FOOT = '\n---\n_Solo datos sintéticos: sin PII, documentos reales ni secretos._';
function bodyOf(it) {
  const fase = M.milestones[it.ms].title;
  if (it.kind === 'epic') {
    return `## Objetivo\n${it.obj}\n\n**Fase:** ${fase} · **Prioridad:** ${it.pri}\n\n## Historias\nVer los sub-issues de este epic.\n\n## Origen\n${originText(it.origin)}${FOOT}`;
  }
  if (it.kind === 'story') {
    const box = it.st === 'done' ? 'x' : ' ';
    let b = `## Historia\nComo ${it.persona}, quiero ${it.want}, para ${it.why}.\n\n## Criterios de aceptación\n${it.ac.map((a) => `- [${box}] ${a}`).join('\n')}\n`;
    if (it.plat) b += `\n## Dependencias de plataforma\n${it.plat}\n`;
    b += `\n## Origen\n${originText(it.origin)}`;
    return b + FOOT;
  }
  return `${it.desc ? `${it.desc}\n\n` : ''}**Estado al migrar:** ${stLabel[it.st]}.\n\n## Origen\n${originText(it.origin)}${FOOT}`;
}

/* ------------------------------ review ------------------------------ */
const nameOf = { F: 'Fernando', L: 'Larissa', M: 'Mauricio' };
const whoText = (it) => (it.who.length ? it.who.map((w) => nameOf[w]).join(' / ') : 'sin asignar');
const mark = (st) => (st === 'done' ? 'x' : ' ');
const stIcon = { done: '✅', doing: '🔄', open: '⬜' };
function review() {
  const c = counts();
  const L = [];
  L.push('# Propuesta de backlog: Medical Records (Epics, HU y Tasks)', '');
  L.push('> Borrador para revisión. Generado desde `docs/backlog/manifest.cjs` con `node docs/backlog/backlog.cjs review`. **Todavía no se creó nada en GitHub.**', '');
  L.push('## Narrativa que ordena el backlog', '');
  L.push('**Prevención de glosas: validar la cuenta antes de enviarla.** Cargar → estructurar (IDP) → revisar la cuenta (intake) → enriquecer (re-IDP) → validar con la malla agéntica → decidir en la consola de Análisis → seguir en el overview. Lo posterior (aprobación, envío, glosas, apelación, pago) queda en Fase 2 y Fase 3 a nivel de historia, sin tareas hasta activarlas.', '');
  L.push('## Reglas de depuración', '');
  L.push('- Una **HU** tiene un usuario real de la demo; los habilitadores y entregables son HU de otro tipo (`tipo:habilitador`, `tipo:entregable`).');
  L.push('- Lo que se configura en Automate, Agent Builder o IDP **no es una tarea** de este backlog: queda como «Dependencias de plataforma» en la HU; el export de `Automate/` es la fuente de verdad.');
  L.push('- Las validaciones de runtime son **criterios de aceptación** (líneas `(runtime)`), no issues sueltos.');
  L.push('- Las subtareas genéricas («Pruebas de…», «Capacitación…», «Validación con cliente…») no se migran; se crean al activar la HU.', '');
  L.push('## Resumen', '');
  L.push('| | Cantidad |', '|---|---|');
  L.push(`| Epics | ${c.epics} |`, `| HU (historias) | ${c.historia} |`, `| Habilitadores | ${c.habilitador} |`, `| Entregables | ${c.entregable} |`, `| Tasks | ${c.tasks} (✅ ${c.tdone} · 🔄 ${c.tdoing} · ⬜ ${c.topen}) |`, `| **Issues en total** | **${c.total}** |`, `| Dependencias (bloqueado por) | ${c.deps} |`);
  L.push('', 'Tracker de origen: 45 epics y 187 subtareas.', '');
  const v = validate();
  L.push(`Validación del manifiesto: ${v.errs.length ? '❌ ' + v.errs.join('; ') : '✅ sin errores'}${v.warn.length ? ` · avisos: ${v.warn.join('; ')}` : ''}`, '');
  L.push('## Convenciones propuestas', '');
  L.push('- **Jerarquía**: sub-issues nativos de GitHub (Epic → HU → Task). **Dependencias**: relación nativa «blocked by».');
  L.push('- **Milestones** (sin fechas, para que las definas): Demo, Fase 2, Fase 3.');
  L.push('- **Labels**: `tipo:*` (epic, historia, tarea, habilitador, entregable, bug), `etapa:*` (etapas de la spec), `area:*` (custom-ui, automate, idp, agent-builder, kd, ecm, demo), `P0`–`P3` (CRÍTICA→P1, MEDIA→P2), `skill-candidate`.');
  L.push('- **Estado**: completado → issue cerrado; en progreso → `In Progress` en el proyecto MedRec; pendiente → `Todo`.');
  L.push('- **Responsables** (proponen según el tracker): ' + Object.entries(M.users).map(([k, u]) => `${nameOf[k]} → \`${u}\``).join(', ') + '. Lo posterior a la demo queda sin asignar.', '');
  L.push('## Backlog propuesto', '');
  for (const ep of M.items.filter((i) => i.kind === 'epic')) {
    L.push(`### ${ep.id} · ${ep.title}`, '');
    L.push(`${stIcon[ep.st]} **${M.milestones[ep.ms].title}** · ${ep.pri} · etapa \`${ep.etapa}\` · área \`${ep.area}\` · ${whoText(ep)}${ep.blocked.length ? ` · bloqueado por ${ep.blocked.join(', ')}` : ''}`, '');
    L.push(ep.obj, '');
    for (const s of M.items.filter((i) => i.parent === ep.id)) {
      const kt = kindOf(s);
      L.push(`- ${stIcon[s.st]} **${s.id}** \`${kt}\` ${s.title} — ${whoText(s)}${s.blocked.length ? ` · ⛔ ${s.blocked.join(', ')}` : ''}`);
      L.push(`  - _Como ${s.persona}, quiero ${s.want}, para ${s.why}._`);
      for (const t of M.items.filter((i) => i.parent === s.id)) {
        L.push(`  - [${mark(t.st)}] ${t.id} ${t.title} — ${whoText(t)}${t.blocked.length ? ` · ⛔ ${t.blocked.join(', ')}` : ''}`);
      }
    }
    L.push('');
  }
  L.push('## Qué se retira o se absorbe', '');
  L.push('| Grupo del tracker | Origen | Por qué | Destino |', '|---|---|---|---|');
  for (const d of M.discards) L.push(`| ${d.group} | ${d.refs} | ${d.why} | ${d.dest} |`);
  L.push('');
  L.push('## Decisiones que necesito de ti', '');
  L.push('1. **Visibilidad**: el repositorio es público. Los issues se redactaron sin nombres de cliente y con datos sintéticos; confirma que quieres publicarlos ahí (ver HU-4.5).');
  L.push('2. **Responsables**: ¿asigno a Fernando, Larissa y Mauricio como arriba? Se les notificará por GitHub.');
  L.push('3. **Cerrados**: ¿creo como cerrados los ítems ya completados para conservar el avance (✅)?');
  L.push('4. **Proyecto**: ¿agrego todo al proyecto `MedRec` con el estado inicial?');
  L.push('5. **Esquema de labels**: difiere del de Agentic-bank (que usa `tipo:feature` y epic = milestone) porque aquí el epic es un issue.');
  fs.writeFileSync(REVIEW_FILE, L.join('\n') + '\n', 'utf8');
  console.log(`Escrito ${REVIEW_FILE}`);
}

/* ------------------------------ GitHub ------------------------------ */
function gh(args, input) {
  for (let a = 0; a < 6; a++) {
    try {
      return cp.execFileSync('gh', args, { input, encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'], maxBuffer: 1 << 26 });
    } catch (e) {
      const msg = `${e.stderr || ''}${e.message || ''}`;
      if (/rate limit|abuse|secondary|HTTP 429|HTTP 502|HTTP 503/i.test(msg) && a < 5) {
        console.log(`  … límite o error transitorio, reintento ${a + 1}/5 en ${30 * (a + 1)}s`);
        sleepSync(30000 * (a + 1));
        continue;
      }
      throw new Error(msg.trim());
    }
  }
}
const api = (method, endpoint, body) => {
  const args = ['api', '-X', method, endpoint, '-H', 'X-GitHub-Api-Version: 2022-11-28'];
  if (body !== undefined) args.push('--input', '-');
  const out = gh(args, body !== undefined ? JSON.stringify(body) : undefined);
  return out && out.trim() ? JSON.parse(out) : null;
};
const load = () => (fs.existsSync(STATE_FILE) ? JSON.parse(fs.readFileSync(STATE_FILE, 'utf8')) : { ms: {}, items: {} });
const save = (s) => fs.writeFileSync(STATE_FILE, JSON.stringify(s, null, 2));
const pause = () => sleepSync(1100);

function apply() {
  const c = counts();
  const v = validate();
  if (v.errs.length) { console.error('Manifiesto inválido:\n- ' + v.errs.join('\n- ')); process.exit(1); }
  const withProject = has('--project');
  if (!has('--yes')) {
    console.log(`PLAN (no se escribe nada): ${c.total} issues (${c.epics} epics, ${c.stories} HU, ${c.tasks} tasks), ${c.deps} dependencias, ${c.done} cerrados, ${M.labels.length} labels, ${Object.keys(M.milestones).length} milestones${withProject ? ', + proyecto MedRec' : ''}.`);
    console.log(`Repo destino: ${REPO}. Ejecuta con --yes para aplicar.`);
    return;
  }
  const state = load();
  // labels
  const existing = new Set(api('GET', `repos/${REPO}/labels?per_page=100`).map((l) => l.name));
  for (const [name, color, description] of M.labels) {
    if (existing.has(name)) continue;
    api('POST', `repos/${REPO}/labels`, { name, color, description });
    console.log(`label + ${name}`);
    pause();
  }
  // milestones
  const msList = api('GET', `repos/${REPO}/milestones?state=all&per_page=100`);
  for (const [key, m] of Object.entries(M.milestones)) {
    const found = msList.find((x) => x.title === m.title);
    if (found) state.ms[key] = found.number;
    else {
      state.ms[key] = api('POST', `repos/${REPO}/milestones`, { title: m.title, description: m.description }).number;
      console.log(`milestone + ${m.title}`);
      pause();
    }
  }
  save(state);
  // issues (los padres van antes que los hijos en el manifiesto)
  for (const it of M.items) {
    if (state.items[it.id]) continue;
    const r = api('POST', `repos/${REPO}/issues`, {
      title: titleOf(it),
      body: bodyOf(it),
      labels: labelsOf(it),
      milestone: state.ms[it.ms],
      assignees: it.who.map((w) => M.users[w]),
    });
    state.items[it.id] = { number: r.number, dbId: r.id, url: r.html_url, linked: false, deps: [], closed: false, proj: false };
    save(state);
    console.log(`#${r.number} ${it.id} ${titleOf(it)}`);
    pause();
  }
  // sub-issues
  for (const it of M.items) {
    const st = state.items[it.id];
    if (!it.parent || st.linked) continue;
    api('POST', `repos/${REPO}/issues/${state.items[it.parent].number}/sub_issues`, { sub_issue_id: st.dbId });
    st.linked = true;
    save(state);
    console.log(`sub-issue ${it.parent} ⊃ ${it.id}`);
    pause();
  }
  // dependencias
  for (const it of M.items) {
    const st = state.items[it.id];
    for (const b of it.blocked) {
      if (st.deps.includes(b)) continue;
      api('POST', `repos/${REPO}/issues/${st.number}/dependencies/blocked_by`, { issue_id: state.items[b].dbId });
      st.deps.push(b);
      save(state);
      console.log(`dep ${it.id} ⛔ ${b}`);
      pause();
    }
  }
  // cerrar completados
  for (const it of M.items) {
    const st = state.items[it.id];
    if (it.st !== 'done' || st.closed) continue;
    api('PATCH', `repos/${REPO}/issues/${st.number}`, { state: 'closed', state_reason: 'completed' });
    st.closed = true;
    save(state);
    console.log(`cerrado ${it.id} #${st.number}`);
    pause();
  }
  // proyecto
  if (withProject) {
    const fields = JSON.parse(gh(['project', 'field-list', String(PROJECT_NUM), '--owner', OWNER, '--format', 'json'])).fields;
    const status = fields.find((f) => f.name === 'Status');
    const opt = (n) => status.options.find((o) => o.name === n).id;
    for (const it of M.items) {
      const st = state.items[it.id];
      if (st.proj) continue;
      const added = JSON.parse(gh(['project', 'item-add', String(PROJECT_NUM), '--owner', OWNER, '--url', st.url, '--format', 'json']));
      const target = it.st === 'done' ? 'Done' : it.st === 'doing' ? 'In Progress' : 'Todo';
      gh(['project', 'item-edit', '--id', added.id, '--project-id', PROJECT_ID, '--field-id', status.id, '--single-select-option-id', opt(target)]);
      st.proj = true;
      save(state);
      console.log(`proyecto + ${it.id} → ${target}`);
      pause();
    }
  }
  console.log('Listo.');
}

/* ------------------------------ main ------------------------------ */
if (cmd === 'check') {
  const v = validate();
  const c = counts();
  console.log(JSON.stringify(c));
  if (v.warn.length) console.log('AVISOS:\n- ' + v.warn.join('\n- '));
  if (v.errs.length) { console.error('ERRORES:\n- ' + v.errs.join('\n- ')); process.exit(1); }
  console.log('Manifiesto válido.');
} else if (cmd === 'review') review();
else if (cmd === 'apply') apply();
else { console.error('Comando desconocido'); process.exit(1); }
