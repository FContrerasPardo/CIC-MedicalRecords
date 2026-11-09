# Verificación de i18n-key-audit

Estado: **instalada** el 2026-11-09, tras verificar el procedimiento en un caso real y con casos de comprobación. Lo que no se verificó está al final.

## Entorno

Node v24.20.0, Windows 11 (Git Bash). Sin npm ni Nx: el script solo lee archivos (y git, con `--baseline`).

## Caso real

Plugin `medical-records` de CIC-MedicalRecords, checkout principal en la rama `refactor/integrated-ui`, con las 5 claves `MEDICAL_RECORDS.APPEARANCE.*` de la Fase 1 sin commit. Idioma fuente `en`: 766 claves.

| Idioma | Claves | Faltantes | Sobrantes | [TODO] |
| --- | --- | --- | --- | --- |
| es | 766 | 0 | 0 | 0 |
| de, fr, it, pl | 610 | 156 | 0 | 545 |
| pt | 614 | 152 | 0 | 452 |

- Deriva de código: 0, con 588 claves referenciadas y 10 prefijos dinámicos (4 ramas y 6 raíces terminadas en `_`, p. ej. `MEDICAL_RECORDS.THEME.PRESET_`).
- Las cifras de huecos y de `[TODO]` coinciden con las de la auditoría ad hoc que detectó la brecha ese mismo día, origen de esta skill. Esa auditoría comparó además con `HEAD` y mostró que las 5 claves de la Fase 1 no ensancharon la brecha (156 y 152 antes y después).
- `--expect de,es,fr,it,pl,pt` confirma que los seis archivos existen.
- El caso real destapó un error del propio script: marcaba 6 raíces terminadas en `_` como claves desconocidas. Se corrigió: una raíz es dinámica solo si alguna clave del idioma fuente empieza por ella; sin coincidencias sigue siendo deriva (`X.GHOST_` en la prueba de borde).

Para repetirlo desde la raíz del repositorio: `node .claude/skills/i18n-key-audit/scripts/audit.cjs`.

## Funciones comprobadas

- Detección automática del plugin, `--plugin`, `--source es`, `--list` con `--limit` y agrupación de idiomas con huecos idénticos, `--json`, `--expect`.
- `--baseline` con un ref válido (columna «Before») y con uno inexistente (avisa y sigue).
- Códigos de salida: 0, 1 con `--strict` y hallazgos, 2 por argumento inválido, plugin inexistente o JSON inválido (nombra el archivo y la posición).
- Borde: raíz de clave (`X.PRESET_`), rama dinámica (`X.GROUP.`), clave desconocida con `archivo:línea`, token parecido que no es clave (`X_PRESET.value`).

## Casos de comprobación (`evals/`)

| Caso | Tipo | Esperado | Comprobado |
| --- | --- | --- | --- |
| flags-gaps-and-unknown-keys | positivo | de: falta `DEMO.ACTIONS.CANCEL`, sobra `DEMO.STATUS.ARCHIVED`, 2 `[TODO]`; es al día; `DEMO.ACTIONS.DELETE` en `src/app.component.html:3`; `DEMO.STATUS` dinámica | El script reproduce exactamente eso. Un agente (modelo solicitado: haiku; efectivo no verificado) que leyó solo SKILL.md cumplió los 5 graders |
| reports-clean-plugin | positivo | Todo en sync | El script da OK. El agente cumplió los 2 graders |
| skips-translation-request | negativo cercano | Traducir directo, sin correr el script | Sin ejecutar |
| skips-translation-quality-review | negativo cercano | Juzgar la traducción alemana, sin correr el script | Sin ejecutar |

Nota de la corrida del caso limpio: el agente leyó `docs/agents/proyecto.md` y advirtió que la carpeta de prueba tenía 2 de los 6 idiomas del proyecto. Un idioma sin archivo era invisible para el script; de ahí salió `--expect`, ya documentado en SKILL.md.

Las corridas fueron de una sola pasada, sin línea base sin skill y sin medir tokens: comprueban que SKILL.md se entiende por sí solo, no son un benchmark.

## Pendiente (no verificado)

- Disparador: la descripción no se ha medido con consultas que deban y no deban activarla (no se corrió el optimizador de descripciones de skill-creator) y los dos casos negativos no se ejecutaron.
- Benchmark con y sin skill de los casos de `evals/`: no se corrió. Se puede con `claude plugin eval .` desde la carpeta de la skill (Claude Code 2.1.269 o superior; son corridas reales con costo), que lee estos casos tal cual.
- Otras estructuras de plugin: probado solo con `medical-records` y fixtures. AgenticBank tiene un `policy-v2.json` en su carpeta i18n: el script lo omite por nombre, pero no se ejecutó allí.
- Placeholders, plurales y calidad de traducción: fuera de alcance.
