---
name: hyland-ui-refactor
description: Adaptar patrones de CIC-Fin y componentes Satori a la Custom UI Angular de MedicalRecords. Usar para refactors de interfaz, apariencia, estados, accesibilidad y selección de componentes existentes; no para instalar Satori ni migrar el shell.
---

# Refactor de interfaz Hyland

Entrada: pantalla/componente y comportamiento esperado, o una referencia de CIC-Fin.
Leer `docs/agents/proyecto.md`, el perfil `hyland-frontend` o `hyland-ux` y
solo la especificación UI relevante. Las reglas de ejecución están en AGENTS.md.

1. Identificar la persona, la tarea real y los estados afectados: carga, vacío,
   error, parcial y éxito. Reusar el contexto existente; no iniciar una entrevista
   completa para un cambio acotado.
2. Leer el componente destino y su servicio/contrato inmediato. Antes de portar
   un componente de CIC-Fin, comparar API y versiones Angular/ADF/Satori en los
   package.json pertinentes; no leer todo el lockfile.
3. Preferir componentes nativos que ya usa la plantilla y entry points específicos
   de Satori. No asumir que el catálogo del kit coincide con la versión instalada.
4. Mantener las etapas en tareas/formularios de Automate, shell nativo, auth y
   rutas. Para apariencia, conservar preferencias e i18n y adaptar los tokens
   existentes antes de agregar otro sistema de temas.
5. Hacer el cambio mínimo dentro del alcance aprobado. Revisar teclado/foco,
   responsive, contraste, scroll y traducciones de los textos afectados.
6. Entregar archivos, comportamiento, diferencias de versión y comprobación manual
   concreta. No ejecutar build/lint/tests ni crear capturas sin autorización aplicable.

Referencia opcional bajo demanda: `C:/CIC-Learn/skills/hyland-ai-toolkit-main/plugins/`:
`hyland/skills/ux-discovery/SKILL.md` para descubrimiento UX;
`satori/skills/satori-developer/SKILL.md` y solo su referencia del componente
necesario para APIs. No cargar el catálogo completo. Si falta el bundle, usar
la plantilla local y reportar la referencia no disponible.

Ejemplo: «Adapta el selector de apariencia de CIC-Fin preservando el menú nativo».
Cierre: distinguir inspección de código de comportamiento observado en navegador.
