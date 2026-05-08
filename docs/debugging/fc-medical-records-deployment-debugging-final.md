# FC Medical Records - Informe Final de Debugging de Deployment

> Rama: `codex/integration`  
> Proyecto principal: `EB Custom UI Class / fc_gb Custom UI Class`  
> Proyecto baseline de prueba: `FC - MedicalRecords 22`  
> Fecha de cierre del diagnostico: 2026-05-05  
> Fuentes consolidadas: `fc-medical-records-deployment-debugging.md` y `bitacora-debugging-fc-medical-records.md`

---

## 1. Resumen ejecutivo

El fallo de deployment no queda atribuido al paquete Custom UI ni al proceso de
re-empaquetado. La evidencia apunta a una inconsistencia interna del modelo de
Automate, aislada alrededor del formulario anterior `ABValidation`.

La causa raiz probable es que `ABValidation`, creado/importado con ayuda de la
IA interna de Automate/Hyland, dejo metadata o referencias internas
incompatibles. El deployment fallaba aunque el action de deployment inicial
terminara, porque la aplicacion quedaba demasiado tiempo en `DEPLOYING` y
terminaba en `DEPLOYMENT_FAILED`.

La prueba decisiva fue eliminar el formulario `ABValidation` completo, crear un
formulario manual nuevo (`AB New Form`) y agregar progresivamente las variables
requeridas. Con ese formulario manual, el proyecto volvio a desplegar
correctamente incluso al incluir todas las variables necesarias.

---

## 2. Conclusion final

### Causa raiz probable

El problema queda aislado en el formulario anterior:

```text
ABValidation
```

El comportamiento observado sugiere corrupcion o incompatibilidad de metadata
interna del formulario, posiblemente asociada a referencias internas generadas
por Automate al crear/importar el formulario con asistencia de IA.

### Sintoma visible

El deployment tecnico avanzaba y registraba pasos exitosos, pero la aplicacion
no alcanzaba estado saludable:

```text
Deploy UIs completed successfully
Deployment request sent successfully
Completed deployment action
```

Luego fallaba por timeout de readiness:

```text
Application [fc-gb-customui-class-xm8b4-58e71b1e] is in [DEPLOYING] status for too long, sending ERROR event
Application fc-gb-customui-class-xm8b4-58e71b1e status changed to failure status DEPLOYMENT_FAILED - Deployment type: MANUAL
```

### Descartes confirmados

| Candidato | Estado | Motivo |
|---|---|---|
| Paquete Custom UI / zip | Descartado | No se modifico el paquete UI durante el bloque problematico y el fallo se manifesto en Runtime Bundle / App Services. |
| Quick Run como causa directa | Casi descartado | Quick Run expuso validaciones, pero Quick Run + release + deployment sobre baseline funcional no rompio el proyecto. |
| User Task como concepto | Descartado | Una User Task nueva con formulario manual funciono correctamente. |
| Cantidad/tamano de variables del formulario | Descartado como causa principal | El formulario manual funciono con `BatchState`, variables de Compliance y luego todas las variables. |
| Mappings de AgentMesh | No causa principal | Requieren correccion funcional, pero no reprodujeron por si solos el fallo final. |
| Temporales internos de deployment | Menos probable | Warnings similares aparecen en proyectos que si despliegan. |

---

## 3. Evidencia clave

### 3.1 Baseline funcional

Se uso `FC - MedicalRecords 22` como baseline funcional. Al restaurarlo, algunos
agentes quedaron inconsistentes por referencias internas de nombre/ID.

La correccion aplicada fue:

1. Exportar el agente.
2. Borrar el agente.
3. Importar el agente nuevamente.
4. Re-seleccionar el agente importado en cada uso de AgentMesh.

Despues de esta correccion, los mappings de AgentMesh pudieron operar sobre el
baseline.

### 3.2 Quick Run no dano el baseline

Quick Run mostro errores de validacion en el baseline restaurado, entre ellos:

- gateway exclusivo con salida sin condicion ni default;
- service de AgentMesh con posible falla silenciosa;
- variable `part` referenciada pero no definida;
- `cfConnector` sin `CONNECTOR_CONNECTION_IDENTIFIER`.

Sin embargo, despues de Quick Run se pudo hacer release y actualizar deployment
sin reproducir el fallo principal. Por eso Quick Run queda como herramienta que
expone validaciones, no como causa directa del deployment fallido.

### 3.3 Runtime Bundle / App Services como sintoma

En el proyecto fallido, el dashboard mostraba problemas posteriores al deployment:

```text
Kubernetes Infrastructure:
Service loading, please wait a few seconds and refresh the page

App Services:
Error 503: Service Unavailable
```

Lectura final: esto es un sintoma de que el runtime no logra estabilizarse, no
una prueba de que el zip de la Custom UI este corrupto.

---

## 4. Linea de versiones evaluadas

### 4.1 Proyecto original — EB Custom UI Class / fc_gb Custom UI Class

| Version | Resultado | Lectura |
|---:|---|---|
| 25 | Deployed / funciona | Punto estable confirmado. Todavia no contiene `ABValidation`. |
| 27 | Upgrade Failed / Deploy directo Failed | Punto de quiebre acotado entre v25 y v27. |
| 30 | Upgrade Failed | Confirma que el problema ya estaba presente en versiones posteriores. |
| 32-35 | En bloque posterior | Mantienen cambios del periodo de debugging y no se usan como baseline estable. |

### 4.2 Proyecto de prueba — FC - MedicalRecords 22

| Release | Cambio probado | Resultado |
|---:|---|---|
| 30 | Borrar solo la accion/tarea de `ABValidation`, dejando el formulario | Falla / runtime estancado. |
| 31 | Eliminar manualmente el formulario `ABValidation` completo | Deployed / funciona. |
| 32 | Crear User Task con formulario manual simple `AB New Form` y `BatchState` | Deployed / funciona. |
| 33 | Agregar variables de Compliance y eliminar metadata `Collaboration` del JSON | Deployed / funciona. |
| 34 | Agregar todas las variables requeridas al formulario manual | Deployed / funciona. |

---

## 5. Pruebas decisivas

### Prueba A — Borrar solo la accion no fue suficiente

Se elimino la accion/tarea que usaba `ABValidation`, pero se dejo el formulario
importado en el proyecto.

Resultado:

```text
Deployment Failed / runtime estancado
```

Lectura: el problema no estaba solamente en la conexion de la tarea dentro del
flujo; el formulario o su metadata seguia afectando el modelo.

### Prueba B — Eliminar el formulario completo restauro el deployment

Se elimino manualmente `ABValidation` completo, no solo la tarea asociada.

Resultado:

```text
Deployed / funciona
```

Lectura: este fue el primer descarte fuerte que aislo el problema en el
formulario importado/generado.

### Prueba C — Formulario manual minimo funciono

Se creo un formulario manual nuevo:

```text
AB New Form
```

Primero se uso con un unico campo/mapping de `BatchState`.

Resultado:

```text
Deployed / funciona
```

Lectura: una User Task con formulario no rompe el deployment por si misma.

### Prueba D — Formulario manual con variables progresivas funciono

Se agregaron progresivamente variables de Compliance y luego el set completo de
variables requeridas por la validacion previa a agentes.

Resultado:

```text
Deployed / funciona
```

Lectura: la cantidad de variables, los mappings o el tamano de datos no explican
el fallo principal.

### Prueba E — Metadata `Collaboration` debio eliminarse del JSON

Durante la ampliacion del formulario manual, Studio Modeler agrego una seccion
`Collaboration` en el JSON del proceso:

```json
"Collaboration": {
  "constants": {},
  "mappings": {},
  "properties": {},
  "assignments": {},
  "templates": {}
}
```

El schema rechazo esa propiedad:

```text
#/extensions: property 'Collaboration' is not defined in the schema and the schema does not allow additional properties
```

Accion correctiva:

```text
Eliminar manualmente la seccion Collaboration del JSON del proceso.
```

Resultado: permitio continuar con release/deployment.

---

## 6. Estado de hipotesis

| ID | Hipotesis | Estado final |
|---|---|---|
| H1 | Quick Run dana el proyecto. | Casi descartada. |
| H2 | El problema esta en el modelo de Automate, no en Custom UI. | Confirmada como direccion principal. |
| H3 | Existen expresiones o condiciones con referencias internas rotas. | Confirmada como riesgo del modelo, no necesariamente causa final. |
| H4 | Temporales internos causan el fallo. | Menos probable. |
| H5 | Cambios de error handling en AgentMesh rompen runtime. | No confirmado como causa principal. |
| H6 | Restauraciones rompen referencias internas de agentes por ID. | Parcialmente confirmada y mitigada re-importando agentes. |
| H7 | Configuracion CFS/cfConnector causa el fallo. | Abierta, pero no principal con la evidencia actual. |
| H8 | `ABValidation` tiene metadata/referencias internas incompatibles. | Confirmada como causa raiz probable. |
| H9 | User Task con formulario rompe deployment. | Descartada. |
| H10 | Variables del formulario rompen por tipo/tamano/estructura. | Descartada como causa principal. |
| H11 | Agentes huerfanos en Agent Builder/API afectan limpieza. | Abierta como riesgo secundario. |
| H12 | Upgrade falla aunque deploy directo funciona. | Debilitada; v27 fallo tambien en deploy directo. |
| H13 | Formulario creado/importado con IA interna pudo corromper metadata. | Confirmada como explicacion mas probable. |
| H14 | Metadata `Collaboration` agregada automaticamente no cumple schema. | Confirmada y corregida para continuar. |

---

## 7. Evidencia visual integrada

El reporte remoto inicial agrego una evidencia visual para el mapping de
Financial Variance:

![IMG-006-05 - Financial Variance Agent mapping](./assets/IMG-006-05-financial-variance-agent-mapping.svg)

Nota: la version remota previa referenciaba esta imagen como `.png`, pero el
asset agregado al repositorio es `.svg`. En este informe final se usa la ruta
real para que renderice correctamente en GitHub.

Las demas imagenes enumeradas en la bitacora siguen pendientes de agregarse como
assets reales si se requiere exportacion completa a Word o presentacion.

---

## 8. Recomendaciones operativas

### Para continuar en Automate

- No reutilizar `ABValidation`.
- Mantener el formulario manual nuevo `AB New Form` o recrear formularios desde
  cero cuando haya sospecha de metadata interna inconsistente.
- Si Studio Modeler agrega `extensions.Collaboration`, eliminar esa seccion del
  JSON antes de release.
- Revalidar agentes re-importados y re-seleccionarlos en AgentMesh si vienen de
  restores/imports entre proyectos.

### Para Custom UI

- No bloquear el empaquetado de Custom UI por este diagnostico.
- Mantener el procedimiento documentado en
  `docs/custom-ui/repackage-and-upload-runbook.md`.
- Tratar los fallos `DEPLOYING` prolongado / `DEPLOYMENT_FAILED` como sintomas
  del runtime/modelo de Automate antes de atribuirlos al zip.

### Para documentacion

- Mantener este archivo como resumen final y ejecutivo.
- Mantener `bitacora-debugging-fc-medical-records.md` como bitacora completa de
  pruebas, si se desea conservar el detalle paso a paso.
- Mantener `fc-medical-records-deployment-debugging.md` como reporte preliminar
  de la fase AgentMesh/mappings, o reemplazarlo por este informe si se quiere
  una sola fuente final.

---

## 9. Pendientes

- Investigar con menor prioridad los cambios entre EB Custom UI Class v25 y v27
  si se necesita evidencia historica adicional.
- Confirmar si el output `tools` de los agentes debe permanecer sin mapear o si
  requiere variable de proceso.
- Agregar los screenshots restantes en `docs/debugging/assets/` solo si se
  requiere exportacion visual completa.

---

## 10. Cierre

El diagnostico queda cerrado con una causa raiz probable y accionable:

```text
No continuar depurando el zip ni el empaquetado de Custom UI.
Corregir el modelo de Automate eliminando el formulario ABValidation anterior
y usando un formulario manual nuevo sin metadata interna inconsistente.
```

El empaquetado de la Custom UI puede continuar por el flujo documentado. El
riesgo principal restante esta en metadata interna del modelo de Automate,
especialmente formularios generados/importados y secciones JSON agregadas fuera
del schema esperado.
