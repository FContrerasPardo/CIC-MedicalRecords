---
name: i18n-key-audit
description: Audita las traducciones de un plugin Custom UI de Hyland (carpeta assets/i18n/*.json) sin modificar nada, con un script determinista. Detecta claves faltantes o sobrantes de cada idioma frente al idioma fuente (en.json), valores [TODO] pendientes y claves usadas en el código (.ts/.html) que el idioma fuente no define. Úsala siempre que el usuario pida revisar, validar o sincronizar traducciones, idiomas, i18n o locales, cuando se agreguen o cambien textos visibles o claves de idioma, antes de un commit o PR que toque assets/i18n o plantillas con `| translate`, o ante frases como «¿están al día los idiomas?», «faltan claves», «translation keys», «locale parity» o «i18n drift», aunque no se nombre la skill. No traduce, no corrige valores y no juzga la calidad de una traducción: eso es del rol hyland-i18n.
compatibility: Node.js 20 o superior. Solo lectura; no requiere npm ni Nx, así que sirve en un worktree sin node_modules.
---

# i18n-key-audit

Mide, sin modificar nada, cuánto se alejan los idiomas de un plugin Custom UI de Hyland de su idioma fuente y si el código usa claves que el idioma fuente no define.

## Por qué existe

Un plugin lleva `assets/i18n/en.json` como fuente y un archivo por idioma que debe seguirla. Cuando falta una clave, la pantalla muestra la clave cruda en ese idioma; cuando sobra, es texto huérfano que nadie mantiene; y una clave que una plantilla usa pero `en.json` no define no se traduce en ningún idioma. Revisarlo a mano es lento y se olvida, y un `grep` no distingue una clave armada en ejecución de un error. El script lo resuelve en segundos, de forma determinista y sin tocar nada.

## Cuándo usarla

- El usuario pide revisar, validar o sincronizar las traducciones, los idiomas o el i18n de un plugin, o pregunta si «están al día».
- Se agregaron, renombraron o quitaron textos visibles o claves de idioma (`| translate`, `translate.instant`, `assets/i18n/*.json`) y toca comprobarlo antes de un commit o PR.
- Hace falta medir una brecha de traducción para decidir qué traducir primero.

No la uses cuando:

- Piden traducir un texto o juzgar o mejorar una traducción: la calidad y la terminología son del rol `hyland-i18n`; esta skill solo cuenta claves.
- Preguntan por placeholders `{{x}}`, plurales o formatos de un valor concreto: el script no los compara.
- La carpeta tiene JSON que no son idiomas (por ejemplo una policy): el script los omite a propósito y lo avisa.

## Cómo ejecutarla

Desde la raíz del repositorio, con Node 20 o superior (no hace falta `npm install`):

```bash
node .claude/skills/i18n-key-audit/scripts/audit.cjs
```

- Si hay un solo plugin bajo `CustomUI/*/libs/plugins/*`, lo detecta solo. Con varios, o con otra estructura, pasa `--plugin <carpeta del plugin>` (la que contiene `assets/i18n` y `src`).
- `--list` imprime las claves concretas (los idiomas con huecos idénticos se agrupan); `--limit 0` imprime todas.
- `--baseline <ref>` (`HEAD`, `main` o un SHA) agrega la columna «Before» con las cifras en ese ref. Úsala siempre que haya un cambio en curso: separa lo heredado de lo nuevo. Consulta el git del repositorio que contiene el plugin.
- `--strict` devuelve código 1 si hay hallazgos, para usarla como compuerta; `--json` entrega el informe completo para otras herramientas.
- `--source <idioma>` cambia el idioma fuente si no es `en`.
- `--expect <idiomas>` (por ejemplo `de,es,fr,it,pl,pt`, los que declare «Idiomas» en `docs/agents/proyecto.md`) avisa de un idioma cuyo archivo no existe. Sin él, un idioma ausente no se ve: el script solo audita los archivos que encuentra.

## Cómo leer el resultado

| Dato | Qué significa |
| --- | --- |
| Missing | Claves del idioma fuente que el idioma no tiene: la pantalla muestra la clave cruda |
| Extra | Claves que el idioma tiene y el fuente no: basura o renombres a medias |
| [TODO] | Valores marcados como pendientes (`[TODO] <texto>`); existen en el idioma, así que no cuentan como faltantes |
| Missing locale files | Idiomas declarados con `--expect` que no tienen archivo: equivalen a tener todas las claves faltantes |
| Code drift | Claves que el código usa (`.ts`, `.html`) y el idioma fuente no define: no se traducen en ningún idioma |
| Dynamic prefixes | Claves que el código completa en ejecución (`'A.B.' + estado`, `'A.B.PRESET_' + id`): no se pueden verificar |
| Before | Missing/extra en el ref de `--baseline` |

La regla habitual es 0 faltantes, 0 sobrantes y 0 deriva de código; los idiomas esperados y cualquier otra regla del proyecto están en «Idiomas» de `docs/agents/proyecto.md`. Una brecha que ya existía no es culpa del cambio en curso: reporta aparte lo heredado (`Before`) y lo nuevo.

## Qué reportar

Responde corto y en este orden:

1. Veredicto en una línea: en sync o con hallazgos.
2. Por idioma: faltantes, sobrantes y `[TODO]` (agrupa los idiomas con las mismas cifras).
3. Deriva de código con `archivo:línea`.
4. Qué es heredado y qué es nuevo, si usaste `--baseline`.
5. Una sugerencia de siguiente paso, sin ejecutarla.

No pegues la salida completa: el usuario puede correr el script; entrega la lectura.

## Si piden corregirlo

La auditoría no modifica archivos; corregir es un paso aparte y solo si el usuario lo pide:

- Agrega las claves faltantes a cada idioma con el valor que fije el proyecto para claves nuevas (está en `proyecto.md`; el patrón habitual es `[TODO] <texto en inglés>` y traducir solo el idioma principal). Respeta el orden y la sangría del archivo y no reordenes claves existentes.
- Una clave usada en código y ausente en el idioma fuente se agrega primero al fuente.
- Las sobrantes se quitan solo con confirmación: pueden ser un renombre a medias.
- Vuelve a correr la auditoría y reporta el antes y el después.

## Límites

- Reconoce claves por patrón literal: una clave solo cuenta si empieza por una de las claves raíz del idioma fuente. Las armadas con variables o de otros namespaces (por ejemplo las de ADF) quedan fuera o aparecen como dinámicas.
- Revisa `src/**/*.ts` y `*.html` (sin specs) y los `assets/*.json` de nivel superior. Un comentario que contenga una clave cuenta como uso.
- No compara placeholders, plurales ni formatos, ni juzga calidad o terminología.
- Un idioma es un `*.json` cuyo nombre parece un código de idioma (`es`, `pt-BR`); el resto se omite y se avisa. Un idioma sin archivo no aparece salvo que lo declares con `--expect`.
- Una clave del fuente que el código nunca usa no se reporta, porque puede ser dinámica.

## Verificación y fuentes

El caso real que respalda esta skill, lo que se comprobó y lo que sigue pendiente están en [references/verification.md](references/verification.md). Los casos de comprobación, en `evals/`. Fuentes: `docs/agents/hyland-i18n.md` (rol) y `docs/agents/proyecto.md` («Idiomas»).
