---
name: i18n-key-audit
description: Auditar claves i18n faltantes, sobrantes, TODO y deriva de código del plugin MedicalRecords mediante el script existente. No evalúa calidad de traducciones, placeholders ni formatos; no se ejecuta automáticamente al editar documentación.
---

# Entrada de Codex para la auditoría i18n existente

Leer `.claude/skills/i18n-key-audit/SKILL.md` y sus límites. No duplicar su script
ni sus casos. Ver idiomas y convención fuente en `docs/agents/proyecto.md`.

Para una auditoría solicitada, explicar primero el comando exacto y su motivo:

```powershell
node .claude/skills/i18n-key-audit/scripts/audit.cjs --plugin CustomUI/medicalrecords-pq7lr-source/libs/plugins/medical-records --expect de,es,fr,it,pl,pt --baseline HEAD
```

Ejecutarlo solo con autorización aplicable según AGENTS.md. Reportar hallazgos
heredados y nuevos por separado. No corregir ni borrar claves por el simple hecho
de auditar. Una auditoría de claves no comprueba que las traducciones sean fieles
o que el cambio de idioma funcione en runtime.

La evidencia histórica se conserva en la skill original; este adaptador no añade
una ejecución verificada. Ejemplo: «Audita si los siete idiomas siguen en sync».
