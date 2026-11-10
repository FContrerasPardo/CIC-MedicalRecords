#!/usr/bin/env node
'use strict';
// Crea campos de selección en el proyecto MedRec (Tipo, Prioridad, Etapa, Área) y los llena
// desde el manifiesto. Ejecutar después de `backlog.cjs apply --yes --project`.
const cp = require('child_process');
const M = require('./manifest.cjs');
const OWNER = 'FContrerasPardo', NUM = '2', PID = 'PVT_kwHOAUS_Ic4BqNTp';
const state = require('./.state.json');
const sleepSync = (ms) => Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms);
const gh = (a) => cp.execFileSync('gh', a, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'], maxBuffer: 1 << 26 });

const byId = new Map(M.items.map((i) => [i.id, i]));
for (const it of M.items) {
  const p = it.parent ? byId.get(it.parent) : null;
  it.pri = it.pri || (p && p.pri); it.etapa = it.etapa || (p && p.etapa); it.area = it.area || (p && p.area);
}
const tipo = (it) => (it.kind === 'epic' ? 'Epic' : it.kind === 'task' ? 'Tarea' : { historia: 'Historia', habilitador: 'Habilitador', entregable: 'Entregable' }[it.type]);
const defs = {
  Tipo: { opts: ['Epic', 'Historia', 'Habilitador', 'Entregable', 'Tarea'], get: tipo },
  Prioridad: { opts: ['P0', 'P1', 'P2', 'P3'], get: (it) => it.pri },
  Etapa: { opts: [...new Set(M.items.map((i) => i.etapa))], get: (it) => it.etapa },
  Área: { opts: [...new Set(M.items.map((i) => i.area))], get: (it) => it.area },
};

let fields = JSON.parse(gh(['project', 'field-list', NUM, '--owner', OWNER, '--format', 'json'])).fields;
for (const [name, d] of Object.entries(defs)) {
  if (fields.some((f) => f.name === name)) continue;
  gh(['project', 'field-create', NUM, '--owner', OWNER, '--name', name, '--data-type', 'SINGLE_SELECT', '--single-select-options', d.opts.join(',')]);
  console.log(`campo + ${name}`);
  sleepSync(1000);
}
fields = JSON.parse(gh(['project', 'field-list', NUM, '--owner', OWNER, '--format', 'json'])).fields;
const items = JSON.parse(gh(['project', 'item-list', NUM, '--owner', OWNER, '--limit', '300', '--format', 'json'])).items;
const itemByNumber = new Map(items.filter((i) => i.content && i.content.number).map((i) => [i.content.number, i.id]));

for (const it of M.items) {
  const st = state.items[it.id];
  const itemId = itemByNumber.get(st.number);
  if (!itemId) { console.log(`sin item en proyecto: ${it.id} #${st.number}`); continue; }
  for (const [name, d] of Object.entries(defs)) {
    const f = fields.find((x) => x.name === name);
    const opt = f.options.find((o) => o.name === d.get(it));
    gh(['project', 'item-edit', '--id', itemId, '--project-id', PID, '--field-id', f.id, '--single-select-option-id', opt.id]);
    sleepSync(700);
  }
  console.log(`campos ${it.id} #${st.number}`);
}
console.log('Listo.');
