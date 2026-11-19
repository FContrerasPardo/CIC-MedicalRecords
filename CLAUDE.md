# Convenciones Angular de MedicalRecords

Aplicar AGENTS.md. Este archivo añade solo las reglas del plugin en
CustomUI/medicalrecords-pq7lr-source/. No cargarlo para consultas ajenas a Angular.

## Verificación
- Durante iteración visual no ejecutar AOT. Usar el feedback del servidor del
  usuario si está activo; no levantar otro por iniciativa propia.
- Tests de lógica pura, solo autorizados:
  npx nx test medical-records --testPathPattern=<spec>
- Antes de un commit/push autorizado que afecte Angular, proponer:
  npx nx build workspace-hxp --configuration=development
  desde el workspace indicado. Requiere autorización explícita del comando;
  pedir commit no la sustituye. Es la comprobación completa de plantillas,
  bindings, tipos y SCSS; la librería no tiene target build.
- Si se autoriza AOT, corregir fallos antes del commit. Si no, registrar pendiente.
  Documentación sola no necesita build.

## Traducciones
- libs/plugins/medical-records/assets/i18n/en.json es la fuente.
- de/es/fr/it/pl/pt: 0 faltantes, 0 sobrantes y 0 claves de código sin definir.
- Claves nuevas sin traducir: [TODO] seguido del inglés.
- Auditoría solo al cambiar traducciones y con autorización aplicable.

## Límites conocidos
- Se han registrado fallos previos de lint/stylelint por configuración; contrastar
  la evidencia actual antes de atribuirlos al cambio.
- Acciones visuales o simuladas no acreditan escritura en Automate; comprobar
  el componente y el contrato vigente de la tarea.
