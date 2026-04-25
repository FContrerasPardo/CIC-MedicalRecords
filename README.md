# CIC-MedicalRecords

Repositorio de demostración para una solución de **Cuentas Médicas** sobre **Hyland Content Innovation Cloud (CIC)**, con foco en:

- Contexto funcional del caso de uso.
- Proyecto **Custom UI** ya inicializado (base Angular exportada desde Automate).
- Guías operativas para crear, cambiar, compilar y desplegar interfaces personalizadas en Automate.

---

## Estado actual del repositorio

Este repositorio ya incluye una base inicial funcional para avanzar en la demo:

1. **Contexto funcional** del proceso de cuentas médicas en `CONTEXT.md`.
2. **Artefactos de Custom UI** en `CustomUI/` (incluye build/export y zip).
3. **Guías paso a paso** para creación/cambio de UI en `UI Change Instructions/`.
4. **Plantilla base de proyecto** en `UI Change Instructions/starting-point/` para referencia y comparación.

> Nota: el ejemplo de UI actualmente está conectado para desarrollo local y puede presentar comportamientos esperables de `localhost` durante pruebas. Esto es normal en esta etapa y se irá ajustando en iteraciones posteriores.

---

## Estructura del proyecto

```text
.
├─ README.md
├─ CONTEXT.md
├─ IA_CONTEXT.md
├─ CustomUI/
│  ├─ workspace-hxp-edited/
│  └─ workspace-hxp-edited.zip
└─ UI Change Instructions/
   ├─ README.md
   ├─ Create-Custom-UI.md
   ├─ Changing-Angular-UI.md
   ├─ GLS-Creating an Hyland Experience Application (Custom UI)-250426-013037.pdf
   ├─ images/
   ├─ images-for-ui/
   ├─ required-docs/
   └─ starting-point/
```

---

## ¿Qué contiene cada carpeta principal?

### `CONTEXT.md`
Documento funcional de la demo (flujo end-to-end para prestadores de salud):

- Captura y estructuración del evento clínico.
- Validación previa con Agente IA.
- Envío de cuenta, gestión de glosas y apelaciones.
- Conciliación de pago y cierre.

### `CustomUI/`
Artefactos del front-end personalizado:

- Build/export listo para pruebas.
- Paquete `.zip` para transporte/backup.

### `UI Change Instructions/`
Base documental para operación de Custom UI en Automate:

- **`README.md`**: prerequisitos (Node, NVM, entorno local).
- **`Create-Custom-UI.md`**: generación de Custom UI, descarga de fuente, configuración local, creación de plugin/página y personalización.
- **`Changing-Angular-UI.md`**: cambio de ruta principal para reemplazar Home por página personalizada.
- **PDF guía**: instructivo de referencia visual/paso a paso.

---

## Flujo recomendado para trabajar

1. Revisar `CONTEXT.md` para alinear el objetivo funcional.
2. Seguir `UI Change Instructions/README.md` para preparar entorno.
3. Ejecutar el flujo de `Create-Custom-UI.md` para generación/configuración.
4. Aplicar ajustes de navegación con `Changing-Angular-UI.md`.
5. Probar localmente con `npm start workspace-hxp` dentro del proyecto fuente correspondiente.

---

## Convenciones de documentación

- Mantener instrucciones operativas en `UI Change Instructions/`.
- Mantener visión funcional en `CONTEXT.md`.
- Mantener lineamientos para trabajo asistido por IA en `IA_CONTEXT.md`.

---

## Próximos pasos sugeridos

- Ajustar endpoints/configuración para reducir dependencias de `localhost`.
- Definir checklist mínimo de validación de UI antes de despliegue.
- Versionar cambios de plantilla Custom UI por iteración funcional de la demo.
