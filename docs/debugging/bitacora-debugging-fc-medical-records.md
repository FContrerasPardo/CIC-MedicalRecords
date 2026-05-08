# Bitácora de Debugging — FC Medical Records / Automate Deployment

## 1. Objetivo del diagnóstico

Documentar paso a paso el error presentado durante el deployment del proyecto **FC Medical Records**, especialmente después de cambios menores relacionados con control de errores en Automate. El objetivo es identificar si el problema proviene de:

- Inconsistencias internas del modelo de Automate.
- Artefactos temporales generados por Quick Run o deployment.
- Condiciones o expresiones no definidas.
- Cambios recientes en eventos, pools, gateways o variables.
- Problemas del paquete Custom UI.
- Un posible comportamiento o bug de la plataforma.

---

## 2. Contexto inicial

### Situación reportada

Se realizaron modificaciones pequeñas al proyecto, principalmente cambios de control de errores. No se modificó directamente el paquete de la interfaz Custom UI ni archivos visuales de la aplicación.

Al intentar hacer deployment en la plataforma, apareció un error relacionado con archivos temporales que no podían eliminarse o posibles inconsistencias internas.

### Comportamiento observado

- Se restauró una versión anterior del proyecto, aproximadamente la versión 22.
- Esa versión anterior fue cargada como proyecto nuevo con el nombre **FC - MedicalRecords 22**.
- Al restaurar el proyecto, aparecieron errores asociados a los agentes.
- Los agentes parecen mapearse internamente por **nombre** y por **ID**.
- La corrección aplicada fue:
  1. Ir al agente.
  2. Ejecutar **Export to file**.
  3. Borrar el agente.
  4. Volver a importar el agente con **Import**.
  5. Ir a **AgentMesh**.
  6. En cada uso del agente, abrir el parámetro **Agent**.
  7. Re-seleccionar el nuevo agente importado.
- Después de esta corrección, no se pierden los mapeos y el flujo vuelve a funcionar.
- En el proyecto **FC - MedicalRecords 22**, al ejecutar **Quick Run**, la plataforma muestra **Project validation failed**.
- La ventana de Quick Run indica: “The project contains validation errors and is not ready for a quick run. For more information, see the log view below.”
- El log del Project Editor a las **11:47:32** muestra errores en procesos, AgentMesh, initialize-batch y un connector.

---

## 3. Hipótesis

| ID  | Hipótesis | Evidencia a favor | Evidencia en contra / validación | Estado |
| --- | --- | --- | --- | --- |
| H1 | Quick Run genera o expone inconsistencias que Validate normal no detecta inicialmente. | Los errores aparecen después de Quick Run en el baseline FC - MedicalRecords 22. | Después de hacer release y actualizar deployment en FC - MedicalRecords 22, no falló. Esto descarta que Quick Run por sí solo esté dañando el proyecto. | Debilitada / casi descartada |
| H2 | El problema está en el modelo de Automate, no en el Custom UI. | Quick Run falla por errores de procesos, AgentMesh, initialize-batch y connector; no se reporta error de paquete UI. | Falta reproducir deployment actual con mensaje exacto. | Reforzada |
| H3 | Hay expresiones o condiciones con referencias internas rotas aunque visualmente parezcan correctas. | El log indica una expresión condicional que referencia la variable no definida `part`. | La validación manual parecía correcta, pero puede existir scope interno roto. | Reforzada |
| H4 | El deployment está fallando por archivos temporales o metadata interna generada por la plataforma. | El error original menciona temporales/inconsistencias. | FC - MedicalRecords 22 no falló después de Quick Run + release + actualización de deployment, por lo que no parece ser un efecto general de Quick Run ni de temporales generados por esa acción. | Abierta, pero menos probable |
| H5 | Algún cambio menor de control de errores afectó eventos throw/catch, pools o rutas de excepción. | Hay warning/error relacionado con manejo de fallas silenciosas en un service de AgentMesh. | El baseline 22 también presenta errores, por lo que puede no ser exclusivo de los cambios recientes. | Abierta |
| H6 | La restauración del proyecto genera referencias rotas para agentes por cambio de ID interno. | Al restaurar, los agentes quedaron inconsistentes y fue necesario exportar, borrar, importar y re-seleccionar agentes. | Después de recrearlos, los mapeos parecen funcionar. | Parcialmente confirmada |
| H7 | El error puede estar relacionado con cambios posteriores en la configuración quemada del conector CFS/cfConnector. | En la versión 28, el conector CFS aún pide parámetros porque no está configurado dentro del proyecto. Después se hizo un cambio para dejar quemados en el código valores como connection identifier, external application ID y external application secret. | En la prueba actual se ingresaron valores cualquiera y aparentemente no está fallando, lo cual requiere validación adicional. | Abierta |
| H8 | El formulario importado `ABValidation` tiene metadata, referencias internas o configuración incompatible. | Después de importar/integrar `ABValidation`, el proyecto estable FC - MedicalRecords 22 terminó en Deploy Failed. Además, la versión 25 funciona y todavía no contiene el formulario de Agent Builder / `ABValidation`, reforzando que el cambio se introdujo después. | Confirmado por descarte incremental: al eliminar `ABValidation`, crear un formulario manual nuevo e integrar todas las variables progresivamente, el deployment/upgrade funcionó sin reproducir el error. | Confirmada |
| H9 | La User Task que usa formularios de validación rompe el runtime/deployment. | El objetivo del cambio fue agregar una User Task antes de enviar variables a los agentes. Se creó una prueba con un formulario simple nuevo (`AB New Form`) y una User Task con mapping mínimo de `BatchState`. El upgrade presentó un error temporal de websocket, pero después de aproximadamente 2 minutos actualizó y cargó correctamente. | La User Task quedó integrada con el nuevo formulario manual y no generó error, por lo que la User Task como concepto queda descartada como causa raíz. | Descartada |
| H10 | Alguna variable mapeada hacia el formulario de validación tiene tipo, tamaño o estructura incompatible. | El formulario original recibía variables complejas como `batchState`, reglas y resultados de agentes. Ya existía sospecha de errores por tamaño máximo de `batchState`. Se creó una prueba controlada con un formulario nuevo y un único campo `BatchState`. | La integración progresiva del nuevo formulario manual con todas las variables no generó error. Esto descarta que la causa principal sea la cantidad de variables, el tamaño de los datos o los mappings en sí mismos. | Descartada como causa principal |
| H11 | Existen recursos de Agent Builder huérfanos o inconsistentes entre Automate y la API de agentes. | En el Deployment Service aparecen errores al intentar borrar agentes por ID, pero la API responde `404 Agent Not Found`. Esto sugiere que Automate intenta limpiar recursos que ya no existen en Agent Builder. | Falta confirmar si estos errores son causa fatal o si son warnings no controlados durante limpieza. | Abierta |
| H12 | El proceso de upgrade puede fallar aunque un deploy directo de la misma versión funcione. | El upgrade de EB Custom UI Class de v25 a v27 falló, y luego el deploy directo de v27 también terminó en `Deployment Failed` después de aproximadamente 11 minutos. En Medical Records 22, el upgrade con formulario manual simple tuvo un error temporal de websocket pero luego actualizó y cargó. | El deploy directo de v27 también falló; por tanto, el problema del proyecto original no parece ser exclusivo del mecanismo de upgrade. | Debilitada / casi descartada |
| H13 | El formulario generado por la IA interna de Automate/Hyland pudo corromper metadata del proyecto. | `ABValidation`, creado con ayuda de la IA interna, causó fallas al importarlo/integrarlo. Borrar solo la acción no fue suficiente; al eliminar el formulario completo el deployment volvió a funcionar. Además, un formulario nuevo manual con solo `BatchState`, luego con variables de Compliance y finalmente con todas las variables, actualizó y cargó correctamente. | La prueba incremental no generó errores y el nuevo formulario quedó integrado. La causa más probable queda aislada en la creación/importación del formulario anterior y su metadata. | Confirmada / causa raíz probable |
| H14 | La metadata `Collaboration` agregada automáticamente en el JSON del proceso no es compatible con el schema. | Al intentar guardar/release después de ampliar el formulario manual, Studio Modeler muestra: `#/extensions: property 'Collaboration' is not defined in the schema and the schema does not allow additional properties`. En el JSON del proceso aparece una sección `Collaboration` generada automáticamente con `constants`, `mappings`, `properties`, `assignments` y `templates`. | Ya se había visto que borrar solo la etapa no resolvía el fallo cuando el formulario `ABValidation` estaba presente, pero este error sí bloquea el release actual y debe corregirse eliminando esa sección del JSON. | Activa / corregida para continuar |

---

## 4. Proyectos involucrados

| Proyecto | Descripción | Estado |
| --- | --- | --- |
| FC Medical Records | Entrada descartada: no corresponde al proyecto involucrado en este diagnóstico. | No aplica |
| FC - MedicalRecords 22 | Proyecto nuevo creado desde el release 22, usado como baseline estable y sujeto de prueba manual. | En pruebas; usado para aplicar cambios incrementales |
| EB Custom UI Class / fc_gb Custom UI Class | Proyecto original. Se usa para revisar versiones anteriores y ubicar el punto exacto donde inició el error de deployment. | En análisis de releases |

---

## 5. Releases / versiones de referencia

> **Nota crítica de control:** los números de release son independientes por proyecto. Por lo tanto, un release con el mismo número puede representar estados completamente diferentes según el proyecto.
>
> ```text
> EB Custom UI Class v30 != FC - MedicalRecords 22 release 30
> ```

### 5.1 Línea de releases del proyecto original — EB Custom UI Class / fc_gb Custom UI Class

| Release / versión | Proyecto | Descripción | Resultado Validate | Resultado Quick Run | Resultado Deployment / Upgrade | Lectura |
| --- | --- | --- | --- | --- | --- | --- |
| 35 | EB Custom UI Class / fc_gb Custom UI Class | Versión anterior al cambio de Custom UI, en teoría conserva el Custom UI previo. Mantiene Claim Portal y custom widgets. Incluye cambios de workflow relacionados con AgentMesh/Medical Records. | Pendiente | Pendiente | Pendiente | Revisar si pertenece al bloque posterior al error. |
| 34 | EB Custom UI Class / fc_gb Custom UI Class | Revisada como posible versión del cambio, pero se descartó preliminarmente como la versión buscada. | Pendiente | Pendiente | Pendiente | Probablemente pertenece al bloque de debugging. |
| 33 | EB Custom UI Class / fc_gb Custom UI Class | Tiene todavía los mismos cambios que se están revisando. | Pendiente | Pendiente | Pendiente | Probablemente posterior al punto de quiebre. |
| 32 | EB Custom UI Class / fc_gb Custom UI Class | También mantiene los mismos cambios. Parece pertenecer al bloque de debugging posterior al error. | Pendiente | Pendiente | Pendiente | Probablemente posterior al punto de quiebre. |
| 30 | EB Custom UI Class / fc_gb Custom UI Class | Versión seleccionada como punto intermedio inicial para búsqueda binaria. | Pendiente | Pendiente | Upgrade Failed | Falla; se debe buscar hacia atrás. |
| 27 | EB Custom UI Class / fc_gb Custom UI Class | Nueva versión seleccionada como punto intermedio entre v25 estable y v30 fallida. Se probó primero como upgrade desde v25 a v27 y falló. Después se probó como deploy directo y también falló después de aproximadamente 11 minutos. | Pendiente | Pendiente | Upgrade Failed / Deploy directo Failed | Como v25 funciona y v27 falla tanto por upgrade como por deploy directo, el punto de quiebre queda acotado entre v25 y v27. |
| 25 | EB Custom UI Class / fc_gb Custom UI Class | Versión seleccionada para continuar búsqueda hacia atrás después de que v30 falló. Se confirmó que sí levantó y todavía no contiene el formulario de Agent Builder / `ABValidation`. | Pendiente | Pendiente | Deployed / Funciona | Punto estable confirmado. |

### 5.2 Línea de releases del proyecto de prueba — FC - MedicalRecords 22

| Release | Proyecto | Comentario visible | Descripción / lectura | Resultado Deployment |
| --- | --- | --- | --- | --- |
| 34 | FC - MedicalRecords 22 | `Debugging: All Variables Added to Form` | Release donde el formulario manual `AB New Form` ya incluye todas las variables requeridas para la validación previa a agentes. El upgrade tardó aproximadamente 2 minutos y la aplicación levantó correctamente. | Deployed / Funciona |
| 33 | FC - MedicalRecords 22 | `Prueba 021 — FC - MedicalRecords 22: ampliación progresiva del formulario manual con variables de Compliance, Removing Collaboration of the extention JSON of agent Mesh` | Release donde se amplió progresivamente el formulario manual con variables de Compliance y se eliminó la sección `Collaboration` del JSON de extensión de AgentMesh. | Deployed / Funciona |
| 32 | FC - MedicalRecords 22 | `Post OK: Adding a New Form Manualy` | Release donde se agregó manualmente un formulario nuevo simple (`AB New Form`) con User Task y mapping mínimo. Confirmó que una User Task con formulario manual no rompe el deployment por sí sola. | Deployed / Funciona |
| 31 | FC - MedicalRecords 22 | `Post Fail: Removing Form` | Release posterior al fallo donde ya se eliminó manualmente el formulario `ABValidation`, no solo la acción/tarea. Esta prueba valida si el formulario importado era la causa o si persistía un estado residual/metadata huérfana. | Deployed / Funciona |
| 30 | FC - MedicalRecords 22 | `Post Fail: Deleted just the action, not the form` | Release posterior al fallo donde se eliminó únicamente la acción/tarea de validación, pero se dejó el formulario importado. Esta prueba no fue suficiente: el deployment quedó estancado y volvió a fallar. | Falló / estancado en Runtime Bundle |
| 29 | FC - MedicalRecords 22 | `Add Validate variables in agent mesh, just variable mappings and form import` | Release donde se agregó la validación de variables en AgentMesh, mappings e importación del formulario `ABValidation`. | En análisis |
| 28 | FC - MedicalRecords 22 | `Variables Update in Agent Mesh` | Release de actualización de variables/mappings en AgentMesh. | En análisis |
| 27 | FC - MedicalRecords 22 | `After Quick Run` | Release posterior a Quick Run; usado como referencia previa. | Ya usado como referencia previa |
| 26 | FC - MedicalRecords 22 | Sin comentario visible | Release intermedio del proyecto de prueba. | Pendiente |
| 25 | FC - MedicalRecords 22 | Sin comentario visible | Release intermedio del proyecto de prueba. | Pendiente |
| 24 | FC - MedicalRecords 22 | Sin comentario visible | Release intermedio del proyecto de prueba. | Pendiente |
| 23 | FC - MedicalRecords 22 | Sin comentario visible | Release intermedio del proyecto de prueba. | Pendiente |

---

## 6. Bitácora cronológica de pruebas

### Prueba 001 — Creación de baseline desde release 22

| Campo | Detalle |
| --- | --- |
| Fecha / hora | 2026-05-05, hora exacta pendiente |
| Proyecto | FC - MedicalRecords 22 |
| Release | 22 |
| Acción | Cargar release 22 como proyecto nuevo |
| Resultado | El proyecto fue restaurado, pero los agentes quedaron con inconsistencias de referencia |
| Observaciones | Los agentes se construyen o referencian por nombre e ID. Al restaurar, fue necesario exportar, borrar, importar y re-seleccionar el agente en AgentMesh para recuperar la referencia. |

### Prueba 002 — Quick Run sobre baseline FC - MedicalRecords 22

| Campo | Detalle |
| --- | --- |
| Fecha / hora | Project Editor 11:47:32 |
| Proyecto | FC - MedicalRecords 22 |
| Release | 22 |
| Acción | Quick Run en ambiente DEV |
| Resultado | Falla la validación del proyecto |
| Mensaje del modal | Project validation failed. The project contains validation errors and is not ready for a quick run. For more information, see the log view below. |
| Observaciones | El log muestra errores en Document AI Process, AgentMesh, initialize-batch y cfConnector. |

### Prueba 003 — Preparación de release y actualización de deployment después de Quick Run

| Campo | Detalle |
| --- | --- |
| Proyecto | FC - MedicalRecords 22 |
| Acción | Después de ejecutar Quick Run, se hizo release y se actualizó el deployment a la nueva versión |
| Resultado | No falló |
| Observaciones | Este resultado permite descartar que Quick Run por sí solo sea el causante del daño o de la falla de deployment. |

### Prueba 004 — Análisis de releases anteriores en fc_gb Custom UI Class

| Campo | Detalle |
| --- | --- |
| Proyecto | fc_gb Custom UI Class |
| Release | Se revisaron versiones 35, 34, 33, 32 y finalmente 28 como candidata |
| Acción | Buscar la versión anterior al cambio que empezó a generar fallas de deployment |
| Resultado | Versión 28 seleccionada como candidata para prueba |

### Prueba 005 — Revisión del conector CFS/cfConnector en versión 28

| Campo | Detalle |
| --- | --- |
| Proyecto | fc_gb Custom UI Class |
| Release | 28 |
| Acción | Probar comportamiento del conector CFS/cfConnector con parámetros manuales |
| Resultado | En observación. Se ingresaron valores cualquiera y aparentemente no está fallando todavía. |

### Prueba 006 — Aplicación incremental de mappings de AgentMesh sobre baseline 22

| Campo | Detalle |
| --- | --- |
| Proyecto base | FC - MedicalRecords 22 |
| Proyecto de referencia | Proyecto actual / fc_gb Custom UI Class |
| Acción | Empezar a adicionar al proyecto que sí despliega los componentes/cambios del proyecto actual, para identificar el punto exacto que rompe el deployment. |
| Resultado esperado | Confirmar si los cambios de mapping de AgentMesh despliegan correctamente o si reproducen el error de Runtime Bundle / App Services 503. |
| Resultado real | Pendiente |

#### Cambios incluidos en el bloque de mapping de AgentMesh

| Elemento | Cambio observado / requerido | Estado |
| --- | --- | --- |
| Script / conversión de pre-authorization | Mapear `out_String` hacia la variable de proceso `SpreAuthorization`. | En aplicación |
| Compliance Alert Agent | Revisar inputs: `agent`, `batchState`, `documentationRules`, `payerCompliancePolicy`, `preAuthorization`. Mapear output de resultado hacia `ScomplianceAlertResult`. | En aplicación |
| Financial Variance Agent | Revisar inputs: `agent`, `batchState`, `preAuthorization`, `tariffAgreement`. Mapear output de resultado hacia `SfinancialVarianceResult`. | En aplicación |
| Coding Integrity Agent | Revisar inputs: `agent`, `batchState`, `codingRules`, `payerCodingPolicy`. Mapear output de resultado hacia variable de resultado correspondiente. | En aplicación |
| Output `tools` | En las capturas aparece como `No process variable`. Pendiente confirmar si debe quedar sin mapear o si necesita variable de proceso. | Pendiente revisar |

### Prueba 007 — Importación e integración inicial del formulario ABValidation

| Campo | Detalle |
| --- | --- |
| Proyecto base estable | FC - MedicalRecords 22 |
| Proyecto origen | EB Custom UI Class / fc_gb Custom UI Class |
| Artefacto agregado | Formulario `ABValidation` |
| Tipo de cambio | Importación de formulario + preparación de User Task en AgentMesh |
| Acción | Exportar el formulario `ABValidation` desde EB Custom UI Class e importarlo en Medical Records 22. Luego preparar su integración como una tarea de usuario antes de invocar los agentes. |
| Objetivo | Crear una etapa manual de validación/modificación de variables antes de enviarlas a los agentes. |
| Resultado Medical Records 22 | Deploy Failed |
| Resultado EB Custom UI Class v30 | Upgrade Failed |
| Estado | En análisis |

### Prueba 008 — Retirar User Task de ABValidation y probar rollback/manual restart

| Campo | Detalle |
| --- | --- |
| Proyecto base | FC - MedicalRecords 22 |
| Acción principal | Eliminar o retirar la tarea de usuario de validación para que `ABValidation` quede sin conectarse a ningún proceso. Luego enviar nuevamente el deployment del proyecto 22. |
| Resultado real | Borrar solo la acción/tarea no fue suficiente; el deployment volvió a fallar. |

### Prueba 009 — Búsqueda binaria: probar EB Custom UI Class versión 25

| Campo | Detalle |
| --- | --- |
| Proyecto | EB Custom UI Class / fc_gb Custom UI Class |
| Versión anterior probada | v30 |
| Resultado versión anterior | Upgrade Failed |
| Nueva versión probada | v25 |
| Resultado real | La versión 25 sí funcionó y levantó correctamente. |
| Observación clave | En la versión 25 todavía no existe el formulario de Agent Builder / `ABValidation`. |
| Estado | Exitosa / versión estable confirmada |

### Prueba 010 — Upgrade de EB Custom UI Class de v25 a v27

| Campo | Detalle |
| --- | --- |
| Proyecto | EB Custom UI Class / fc_gb Custom UI Class |
| Versión origen | v25 |
| Versión destino | v27 |
| Acción | Ejecutar upgrade de la aplicación desde v25 hacia v27, sin hacer deployment limpio. |
| Resultado real | Upgrade Failed. |

### Prueba 011 — Reinicio manual de FC - MedicalRecords 22 como sujeto de prueba

| Campo | Detalle |
| --- | --- |
| Proyecto | FC - MedicalRecords 22 |
| Rol del proyecto | Nuevo sujeto de prueba para aplicar cambios manualmente sobre el baseline estable. |
| Acción prevista | Tumbar manualmente la instancia/deployment de FC - MedicalRecords 22 y redesplegar desde un estado más limpio. |

### Prueba 012 — Aclaración de versionado entre proyectos

| Campo | Detalle |
| --- | --- |
| Proyecto observado | FC - MedicalRecords 22 |
| Release observado | Release 30 del proyecto FC - MedicalRecords 22 |
| Aclaración | Cada proyecto tiene su propia numeración de releases. La versión 30 de FC - MedicalRecords 22 no corresponde a la versión 30 de EB Custom UI Class / fc_gb Custom UI Class. |

```text
EB Custom UI Class v30 != FC - MedicalRecords 22 release 30
```

### Prueba 013 — EB Custom UI Class v25 → v27: upgrade fallido

| Campo | Detalle |
| --- | --- |
| Proyecto | EB Custom UI Class / fc_gb Custom UI Class |
| Versión origen | v25 |
| Versión destino | v27 |
| Acción | Upgrade de v25 a v27, sin deployment limpio. |
| Resultado real | El upgrade a v27 generó error. |
| Decisión tomada | Probar v27 como deploy directo, no como upgrade. |

### Prueba 014 — FC - MedicalRecords 22 release 30: eliminar solo la acción no fue suficiente

| Campo | Detalle |
| --- | --- |
| Proyecto | FC - MedicalRecords 22 |
| Release | 30 |
| Comentario del release | `Post Fail: Deleted just the action, not the form` |
| Acción probada | Se eliminó únicamente la acción/tarea de validación asociada a `ABValidation`, pero se dejó el formulario importado en el proyecto. |
| Resultado real | El deployment quedó estancado por más de 9 minutos y volvió a presentar error. |
| Lectura | Eliminar solo la acción/tarea no fue suficiente. El formulario importado, su metadata o recursos asociados a Agent Builder siguen siendo sospechosos. |

#### Logs relevantes de Deployment Service

```text
2026-05-05T21:52:07.477629098Z ERROR 1 --- [AsynchThread-4] com.alfresco.process.deployment.service.cin.CinAgentBuilderService : Failed to delete agent with ID e986fc9e-1d87-409a-84bc-1fe506750938: [404 ] during [DELETE] to [https://api.agents.ai.experience.hyland.com/v1/agents/e986fc9e-1d87-409a-84bc-1fe506750938] [CinAgentBuilderClient#deleteAgent(String)]: [{"status":404,"error":"Agent Not Found","message":"The specified agent does not exist."}]
2026-05-05T21:52:07.509880841Z ERROR 1 --- [AsynchThread-4] com.alfresco.process.deployment.service.cin.CinAgentBuilderService : Failed to delete agent with ID 1e9e3ddd-d0f2-403c-9080-92c8e96eda9d: [404 ] during [DELETE] to [https://api.agents.ai.experience.hyland.com/v1/agents/1e9e3ddd-d0f2-403c-9080-92c8e96eda9d] [CinAgentBuilderClient#deleteAgent(String)]: [{"status":404,"error":"Agent Not Found","message":"The specified agent does not exist."}]
2026-05-05T21:52:07.615064339Z ERROR 1 --- [AsynchThread-4] com.alfresco.process.deployment.service.cin.CinAgentBuilderService : Failed to delete agent with ID 6c6a961d-ba27-4cdf-bde7-a7c006515ef9: [404 ] during [DELETE] to [https://api.agents.ai.experience.hyland.com/v1/agents/6c6a961d-ba27-4cdf-bde7-a7c006515ef9] [CinAgentBuilderClient#deleteAgent(String)]: [{"status":404,"error":"Agent Not Found","message":"The specified agent does not exist."}]
2026-05-05T21:52:07.616528914Z WARN 1 --- [AsynchThread-4] com.alfresco.process.deployment.registry.action.CinAgentBuilderDelete : Agent Builder deletion failed com.alfresco.process.deployment.exceptions.AgentBuilderException: Error while deleting Agent Builder resources [Exception redacted]
```

### Prueba 015 — FC - MedicalRecords 22 release 31: eliminar manualmente el formulario ABValidation

| Campo | Detalle |
| --- | --- |
| Proyecto | FC - MedicalRecords 22 |
| Release | 31 |
| Comentario del release | `Post Fail: Removing Form` |
| Acción | Se eliminó manualmente el formulario `ABValidation`, no solo la acción/tarea asociada. |
| Resultado real | La aplicación `fc-medicalrecords-22-f3esc` quedó en estado `Deployed` sobre release 31. El deployment tardó aproximadamente 3 minutos. |
| Estado | Exitosa / desplegó correctamente |

### Prueba 016 — EB Custom UI Class v27 como deploy directo

| Campo | Detalle |
| --- | --- |
| Proyecto | EB Custom UI Class / fc_gb Custom UI Class |
| Versión | v27 |
| Acción | Hacer deploy directo de v27, no upgrade desde v25. |
| Resultado real | Deployment Failed después de aproximadamente 11 minutos. |
| Estado | Fallida |

### Prueba 017 — Comparación de tiempos: FC - MedicalRecords 22 release 31 vs EB Custom UI Class v27

| Campo | Detalle |
| --- | --- |
| Aplicación 1 | `fc-medicalrecords-22-f3esc` |
| Proyecto / release | FC - MedicalRecords 22 release 31 |
| Resultado | Deployed |
| Tiempo aproximado | ~3 minutos |
| Aplicación 2 | `fc-gb-customui-class-xm8b4` |
| Proyecto / versión | EB Custom UI Class / fc_gb Custom UI Class v27 |
| Resultado | Deployment Failed |
| Tiempo aproximado | ~11 minutos |
| Lectura | Como el deployment funcional de Medical Records 22 release 31 levantó en aproximadamente 3 minutos, mientras EB Custom UI Class v27 falló después de ~11 minutos, se confirma que v27 tiene un problema propio y no solo un problema de upgrade. |

### Prueba 018 — FC - MedicalRecords 22: nuevo formulario simple con solo BatchState

| Campo | Detalle |
| --- | --- |
| Proyecto | FC - MedicalRecords 22 |
| Formulario | `AB New Form` |
| Tipo de formulario | Formulario nuevo creado manualmente, no importado desde EB Custom UI Class |
| Campo agregado | Un único campo multilínea identificado como `BatchState` |
| Acción en AgentMesh | Se agregó una User Task `New Form` en el flujo de AgentMesh antes de los agentes. |
| Mapping de entrada | `BatchState` → `$batchState` |
| Mapping de salida | `BatchState` → `$batchState` |
| Resultado real | Se aplicó mediante upgrade. Durante el upgrade apareció un error temporal relacionado con websocket, pero tras aproximadamente 2 minutos el proyecto actualizó y cargó correctamente. |
| Estado | Exitosa / upgrade cargó correctamente |

### Prueba 021 — FC - MedicalRecords 22: ampliación progresiva del formulario manual con variables de Compliance

| Campo | Detalle |
| --- | --- |
| Proyecto | FC - MedicalRecords 22 |
| Formulario | `AB New Form` |
| Acción | Agregar únicamente las variables relacionadas con el agente de Compliance al formulario manual `AB New Form`. |
| Variables agregadas / mapeadas | `preAuthorization`, `documentationRules`, `BatchState`, `payerCompliancePolicy` |
| Resultado real | Funcionó. Después de eliminar la sección `Collaboration` del JSON, se hizo release/upgrade y la aplicación levantó correctamente. |
| Estado | Exitosa / desplegó correctamente |

### Prueba 022 — Error de schema por propiedad `Collaboration` en JSON del proceso

| Campo | Detalle |
| --- | --- |
| Proyecto | FC - MedicalRecords 22 |
| Proceso | AgentMesh |
| Contexto | Después de ampliar el formulario manual `AB New Form` con variables del agente de Compliance, al intentar guardar o generar release aparece una validación de schema. |
| Mensaje exacto | `#/extensions: property 'Collaboration' is not defined in the schema and the schema does not allow additional properties` |
| Observación | La sección `Collaboration` fue agregada automáticamente por el sistema. En el JSON aparece dentro de `extensions`. |
| Acción correctiva | Eliminar manualmente la sección `Collaboration` del JSON de la etapa/proceso y volver a intentar guardar/release. |
| Resultado | Corregido; permitió continuar. |

#### Fragmento observado en JSON

```json
"Collaboration": {
  "constants": {},
  "mappings": {},
  "properties": {},
  "assignments": {
    "Activity_04bhinb": {
      "type": "expression",
      "assignment": "assignee",
      "id": "Activity_04bhinb"
    }
  },
  "templates": {
    "tasks": {},
    "default": {}
  }
}
```

### Prueba 023 — FC - MedicalRecords 22 release 34: formulario manual con todas las variables

| Campo | Detalle |
| --- | --- |
| Proyecto | FC - MedicalRecords 22 |
| Release | 34 |
| Comentario del release | `Debugging: All Variables Added to Form` |
| Formulario | `AB New Form` |
| Acción | Agregar progresivamente los demás campos/variables faltantes al formulario manual hasta incluir todas las variables necesarias para la etapa de validación previa a agentes. |
| Variables observadas | `preAuthorization`, `documentationRules`, `BatchState`, `payerCodingPolicy`, `payerCompliancePolicy`, `tariffAgreement`, `codingRules` y otras variables asociadas al flujo de AgentMesh. |
| Resultado real | Funcionó. El upgrade tardó aproximadamente 2 minutos y la aplicación levantó correctamente. |
| Estado | Exitosa / Deployed |

### Prueba 024 — Confirmación de causa probable: formulario anterior ABValidation

| Campo | Detalle |
| --- | --- |
| Proyecto | FC - MedicalRecords 22 |
| Contexto | Después de eliminar `ABValidation`, se creó un nuevo formulario manual `AB New Form` y se integró progresivamente al flujo de AgentMesh. |
| Acción | Validar la integración incremental del nuevo formulario manual hasta completar las variables requeridas. |
| Resultado | La prueba incremental no generó ningún error. El nuevo formulario quedó integrado y la aplicación levantó correctamente. |
| Lectura | La causa más probable queda aislada en el formulario anterior `ABValidation`, creado/importado con la IA interna de Automate/Hyland, o en su metadata interna. |
| Estado | Confirmada / causa raíz probable |

#### Conclusión de descarte

| Elemento evaluado | Resultado |
| --- | --- |
| User Task en AgentMesh | Funciona correctamente con formulario manual. |
| Mapping mínimo de `BatchState` | Funciona correctamente. |
| Formulario manual simple | Funciona correctamente. |
| Formulario manual con variables de Compliance | Funciona correctamente tras limpiar `Collaboration`. |
| Formulario manual con todas las variables | Funciona correctamente. |
| Formulario anterior `ABValidation` | Falla o deja metadata inconsistente incluso al borrar solo la acción. |

---

## 7. Matriz de pruebas

| ID | Proyecto | Acción | Resultado esperado | Resultado real | Estado |
| --- | --- | --- | --- | --- | --- |
| T1 | FC Medical Records 22 | Validate antes de Quick Run | Sin errores ni warnings | Pendiente | Pendiente |
| T2 | FC Medical Records 22 | Deploy normal | Deployment exitoso | Pendiente | Pendiente |
| T3 | FC - MedicalRecords 22 | Quick Run | Ambiente rápido generado correctamente | Falla con Project validation failed | Fallida |
| T4 | FC - MedicalRecords 22 | Validate después de Quick Run | Comparar si aparecen errores nuevos | Errores visibles en Log history del Project Editor | En análisis |
| T8 | FC - MedicalRecords 22 | Release + actualizar deployment después de Quick Run | Confirmar si el deployment reproduce el error original o si solo falla Quick Run | No falló | Exitosa |
| T16 | EB Custom UI Class v30 | Probar upgrade/deployment como punto intermedio de búsqueda binaria | Determinar si v30 es estable | Upgrade Failed | Fallida |
| T20 | EB Custom UI Class v25 | Probar deployment/upgrade como nuevo punto de búsqueda hacia atrás | Determinar si v25 es estable o si también falla | Funciona / levantó correctamente | Exitosa |
| T22 | EB Custom UI Class upgrade v25 → v27 | Ejecutar upgrade sin deployment limpio | Determinar si v27 funciona como punto intermedio entre v25 y v30 | Upgrade Failed | Fallida |
| T25 | FC - MedicalRecords 22 release 30 | Probar deployment borrando solo la acción de ABValidation, dejando el formulario importado | Validar si la User Task era la causa | Falló / se quedó estancado | Fallida |
| T26 | FC - MedicalRecords 22 release 31 | Eliminar manualmente el formulario ABValidation y desplegar | Validar si el formulario o su metadata eran la causa | Deployed / ~3 minutos | Exitosa |
| T27 | EB Custom UI Class v27 | Hacer deploy directo, no upgrade | Separar fallo de versión versus fallo de upgrade | Deployment Failed / ~11 minutos | Fallida |
| T28 | FC - MedicalRecords 22 | Crear formulario nuevo simple `AB New Form` con solo `BatchState` y conectarlo a User Task | Validar si una User Task con formulario nuevo y mapping mínimo despliega correctamente | Upgrade exitoso tras error temporal de websocket / ~2 minutos | Exitosa |
| T30 | FC - MedicalRecords 22 | Ampliar `AB New Form` con variables del agente de Compliance | Validar si un formulario manual con más variables sigue desplegando correctamente | Deployed / Funciona | Exitosa |
| T31 | FC - MedicalRecords 22 / AgentMesh | Eliminar sección `Collaboration` del JSON del proceso | Corregir error de schema que bloquea/advierte el guardado o release | Corregido / permitió continuar | Exitosa |
| T32 | FC - MedicalRecords 22 release 34 | Agregar todas las variables faltantes al formulario manual `AB New Form` | Validar si el formulario manual completo despliega correctamente | Deployed / upgrade ~2 minutos | Exitosa |
| T33 | FC - MedicalRecords 22 | Confirmar causa probable tras integración incremental completa del formulario manual | Determinar si el problema fue el formulario anterior `ABValidation` | Sin errores / formulario nuevo integrado | Confirmada |

---

## 8. Registro de errores encontrados

### Error 001 — Exclusive gateway sin condición en una salida no default

| Campo | Detalle |
| --- | --- |
| Fecha / hora | Project Editor 11:47:32 |
| Proyecto | FC - MedicalRecords 22 |
| Acción que disparó el error | Quick Run |
| Mensaje exacto | Processes -- Document AI Process. Exclusive gateway has at least one outgoing sequence flow without a condition (which isn't the default one) |
| Tipo de error | Validación BPMN / gateway exclusivo |

### Error 002 — Posible falla silenciosa en service de AgentMesh

| Campo | Detalle |
| --- | --- |
| Fecha / hora | Project Editor 11:47:32 |
| Proyecto | FC - MedicalRecords 22 |
| Acción que disparó el error | Quick Run |
| Mensaje exacto | Processes -- AgentMesh. The service implementation on service 'Activity_01jc4cz' might fail silently. Consider adding an Error boundary event to handle failures. |
| Tipo de error | Validación/recomendación de manejo de errores en service task |

### Error 003 — Variable `part` no definida en expresión condicional

| Campo | Detalle |
| --- | --- |
| Fecha / hora | Project Editor 11:47:32 |
| Proyecto | FC - MedicalRecords 22 |
| Acción que disparó el error | Quick Run |
| Mensaje exacto | Processes -- initialize-batch. The conditional expression references variables that are not defined in the process: part. |
| Tipo de error | Expresión condicional / variable fuera de scope o no declarada |

### Error 004 — Connector cfConnector sin CONNECTOR_CONNECTION_IDENTIFIER

| Campo | Detalle |
| --- | --- |
| Fecha / hora | Project Editor 11:47:32 |
| Proyecto | FC - MedicalRecords 22 |
| Acción que disparó el error | Quick Run |
| Mensaje exacto | Connectors -- cfConnector. Missing or empty 'CONNECTOR_CONNECTION_IDENTIFIER' config for connector 'cfConnector' |
| Tipo de error | Configuración de connector |

### Error 005 — Deployment failed por estado DEPLOYING demasiado largo

| Campo | Detalle |
| --- | --- |
| Fecha / hora | 2026-05-05 17:06:49 UTC |
| Proyecto | fc-gb-customui-class-xm8b4 |
| Acción que disparó el error | Deployment manual de la versión 28 |
| Mensaje exacto | Application [fc-gb-customui-class-xm8b4-58e71b1e] is in [DEPLOYING] status for too long, sending ERROR event |
| Mensaje exacto 2 | Application fc-gb-customui-class-xm8b4-58e71b1e status changed to failure status DEPLOYMENT_FAILED - Deployment type: MANUAL |
| Tipo de error | Timeout lógico de estado / aplicación no alcanza estado estable |
| Objeto afectado | Runtime Bundle / App Services |

### Error 006 — Runtime Bundle / App Services con Error 503

| Campo | Detalle |
| --- | --- |
| Fecha / hora | 2026-05-05, observado en Monitoring Dashboard |
| Proyecto | fc-gb-customui-class-xm8b4 |
| Acción que disparó el error | Revisión del Monitoring Dashboard posterior al deployment fallido |
| Mensaje exacto | Runtime Bundle → App Services → Error 503: Service Unavailable |
| Mensaje adicional | Runtime Bundle → Kubernetes Infrastructure → Service loading, please wait a few seconds and refresh the page |
| Tipo de error | Servicio no disponible / health check fallido |

### Error 007 — Propiedad `Collaboration` no permitida por el schema

| Campo | Detalle |
| --- | --- |
| Fecha / hora | 2026-05-05, 17:27:31 aprox. |
| Proyecto | FC - MedicalRecords 22 |
| Proceso | AgentMesh |
| Acción que disparó el error | Guardado/release del proceso después de modificar mappings del formulario manual `AB New Form` |
| Mensaje exacto | `#/extensions: property 'Collaboration' is not defined in the schema and the schema does not allow additional properties` |
| Tipo de error | Validación de schema / metadata no permitida en JSON |
| Objeto afectado | Sección `extensions.Collaboration` del JSON del proceso |
| Acción correctiva | Eliminar manualmente la sección `Collaboration` del JSON de la etapa/proceso y volver a guardar/release. |
| Resultado | Corregido / permitió continuar |

---

## 9. Evidencias para recopilar

> Las capturas se documentan con un ID de evidencia, una descripción y su ubicación lógica dentro del diagnóstico. Las imágenes deben agregarse manualmente en Git si se desea que rendericen dentro del Markdown.

### 9.1 Índice de imágenes para exportación final

| ID | Prueba asociada | Pantalla / módulo | Qué demuestra | Estado |
| --- | --- | --- | --- | --- |
| IMG-002-01 | Prueba 002 | Studio Modeler / Quick Run | Modal `Project validation failed` y Log history con errores de validación. | Recibida / pendiente de incrustar |
| IMG-005-01 | Prueba 005 / Error 005 | Studio Admin / Application Instances | Comparación entre `fc-gb-customui-class-xm8b4` con `Deployment Failed` y `fc-medicalrecords-22-f3esc` con `Deployed`. | Recibida / pendiente de incrustar |
| IMG-005-02 | Prueba 005 / Error 006 | Studio Admin / Monitoring Dashboard | Runtime Bundle con `App Services: Error 503 Service Unavailable`. | Recibida / pendiente de incrustar |
| IMG-006-01 | Prueba 006 | Studio Modeler / AgentMesh | Mapping de `out_String` hacia `SpreAuthorization`. | Recibida / pendiente de incrustar |
| IMG-006-02 | Prueba 006 | Studio Modeler / AgentMesh | Actividad `preAuthorization` con input/output mapping. | Recibida / pendiente de incrustar |
| IMG-006-03 | Prueba 006 | Studio Modeler / AgentMesh | Actividad `Compliance Alert Agent` con inputs y output `tools` sin variable. | Recibida / pendiente de incrustar |
| IMG-006-04 | Prueba 006 | Studio Modeler / AgentMesh | Mapping del resultado de Compliance Alert hacia `ScomplianceAlertResult`. | Recibida / pendiente de incrustar |
| IMG-006-05 | Prueba 006 | Studio Modeler / AgentMesh | Actividad `Financial Variance Agent` con mappings de entrada y salida. | Recibida / pendiente de incrustar |
| IMG-006-06 | Prueba 006 | Studio Modeler / AgentMesh | Mapping del resultado de Financial Variance hacia `SfinancialVarianceResult`. | Recibida / pendiente de incrustar |
| IMG-006-07 | Prueba 006 | Studio Modeler / AgentMesh | Financial Variance después de completar mapping de output. | Recibida / pendiente de incrustar |
| IMG-006-08 | Prueba 006 | Studio Modeler / AgentMesh | Actividad `Coding Integrity Agent` con inputs y output `tools` sin variable. | Recibida / pendiente de incrustar |
| IMG-012-01 | Prueba 012 | Studio Modeler / Project Releases | Lista de releases 23 a 30 del proyecto FC - MedicalRecords 22; evidencia de numeración propia. | Recibida / pendiente de incrustar |
| IMG-015-01 | Prueba 015 | Studio Modeler / Project Releases | Release 31 de FC - MedicalRecords 22 con comentario `Post Fail: Removing Form`. | Recibida / pendiente de incrustar |
| IMG-016-01 | Prueba 016 | Studio Admin / Application Instances | Aplicaciones `fc-medicalrecords-22-f3esc` release 31 y `fc-gb-customui-class-xm8b4` release 27 en estado `Deploying`. | Recibida / pendiente de incrustar |
| IMG-017-01 | Prueba 017 | Studio Admin / Application Instances | `fc-medicalrecords-22-f3esc` release 31 como `Deployed`, mientras `fc-gb-customui-class-xm8b4` release 27 sigue en `Deploying`. | Recibida / pendiente de incrustar |
| IMG-018-01 | Prueba 018 | Studio Modeler / Form Editor | Nuevo formulario `AB New Form` con un único campo multilínea `BatchState`. | Recibida / pendiente de incrustar |
| IMG-018-02 | Prueba 018 | Studio Modeler / AgentMesh | User Task `New Form` agregada en AgentMesh con mapping de entrada y salida para `BatchState`. | Recibida / pendiente de incrustar |
| IMG-019-01 | Prueba 019 | Studio Admin / Application Instances | `fc-gb-customui-class-xm8b4` release 27 aparece como `Deployment Failed` después de ~11 minutos. | Recibida / pendiente de incrustar |
| IMG-021-01 | Prueba 021 | Studio Modeler / AgentMesh | Mapping de entrada del formulario manual `AB New Form` con variables de Compliance. | Recibida / pendiente de incrustar |
| IMG-021-02 | Prueba 021 | Studio Modeler / AgentMesh | Mapping de salida del formulario manual `AB New Form` devolviendo variables de Compliance. | Recibida / pendiente de incrustar |
| IMG-022-01 | Prueba 022 | Studio Modeler / Save Process Modal | Modal de validación indicando que `#/extensions` contiene la propiedad no permitida `Collaboration`. | Recibida / pendiente de incrustar |
| IMG-022-02 | Prueba 022 | Studio Modeler / JSON Editor | Vista JSON del proceso mostrando la sección `Collaboration`. | Recibida / pendiente de incrustar |
| IMG-023-01 | Prueba 023 | Studio Modeler / AgentMesh | Formulario manual `AB New Form` con más variables mapeadas. | Recibida / pendiente de incrustar |
| IMG-023-02 | Prueba 023 | Studio Admin / Application Instances | Aplicación `fc-medicalrecords-22-f3esc` release 34 aparece como `Deployed`. | Recibida / pendiente de incrustar |
| IMG-023-03 | Prueba 023 | Studio Modeler / Project Releases | Lista de releases mostrando release 34 `Debugging: All Variables Added to Form`, release 33 con eliminación de `Collaboration` y release 32 con formulario manual. | Recibida / pendiente de incrustar |

---

## 10. Decisiones tomadas

| Fecha | Decisión | Motivo | Impacto |
| --- | --- | --- | --- |
| 2026-05-05 | Crear proyecto FC - MedicalRecords 22 como baseline | Comparar versión estable contra versión actual sin destruir el trabajo reciente | Permite depurar con menor riesgo |
| 2026-05-05 | Recrear agentes exportando, borrando, importando y re-seleccionando en AgentMesh | La restauración dejó inconsistencias porque los agentes se referencian por nombre e ID | Se recuperan referencias de agentes sin perder mapeos |
| 2026-05-05 | Usar Quick Run como prueba para forzar validación profunda | Quick Run expone errores que bloquean la ejecución rápida | Permite identificar errores de modelo antes del deployment |
| 2026-05-05 | Cambiar estrategia a aplicación incremental sobre el baseline 22 funcional | No hay más logs disponibles desde la vista actual y el Runtime Bundle falla sin detalle suficiente | Permite identificar el bloque exacto de cambios que rompe el deployment |
| 2026-05-05 | Registrar `ABValidation` como nuevo bloque sospechoso | Después de importar/integrar este formulario, Medical Records 22 terminó en Deploy Failed y EB Custom UI Class v30 en Upgrade Failed | Cambia el foco del diagnóstico hacia formulario, User Task y mappings de variables |
| 2026-05-05 | Usar búsqueda binaria sobre versiones de EB Custom UI Class | v30 falló con Upgrade Failed | La siguiente prueba debe ir hacia atrás |
| 2026-05-05 | Probar v25 como nuevo punto de búsqueda hacia atrás | v30 falló y se necesita ubicar una versión estable anterior | v25 funciona y reduce el rango de búsqueda a v25-v30 |
| 2026-05-05 | Identificar ausencia de `ABValidation` en v25 | v25 levantó correctamente y todavía no contiene el formulario de Agent Builder / `ABValidation` | Refuerza la hipótesis de que el problema fue introducido después de v25 |
| 2026-05-05 | Retirar la User Task de `ABValidation` en Medical Records 22 | Diferenciar si falla por el formulario importado o por la tarea conectada al proceso | Borrar solo la tarea no fue suficiente |
| 2026-05-05 | Eliminar manualmente el formulario `ABValidation` en FC - MedicalRecords 22 | Borrar solo la acción/tarea no fue suficiente; el deployment volvió a fallar | La eliminación completa del formulario permitió que el deployment levantara correctamente |
| 2026-05-05 | Crear formulario nuevo mínimo `AB New Form` con solo `BatchState` | Eliminar `ABValidation` permitió desplegar; se necesita probar si una User Task con formulario nuevo simple funciona | La prueba cargó correctamente tras un error temporal de websocket |
| 2026-05-05 | Eliminar metadata `Collaboration` del JSON del proceso | Studio Modeler agregó automáticamente una sección `Collaboration` que no está permitida por el schema actual | La limpieza de esa sección permitió continuar con el release/upgrade del formulario manual ampliado |
| 2026-05-05 | Confirmar causa probable en `ABValidation` generado por IA interna | La prueba incremental con formulario manual nuevo no generó errores y el nuevo formulario quedó integrado correctamente | Se confirma por descarte que el problema estaba en la creación/importación del formulario anterior o en su metadata interna |

---

## 11. Plan de diagnóstico progresivo

### Fase 1 — Confirmar baseline

1. Validar que **FC Medical Records 22** despliega correctamente.
2. Ejecutar Validate antes de Quick Run.
3. Ejecutar Quick Run.
4. Ejecutar Validate después de Quick Run.
5. Documentar si aparecen errores nuevos.

### Fase 2 — Reproducir error actual

1. Ejecutar Validate en el proyecto actual.
2. Ejecutar deployment.
3. Capturar mensaje exacto.
4. Identificar si el error se relaciona con Automate, Custom UI, release o temporales.

### Fase 3 — Comparación controlada

1. Comparar diferencias entre release 22 y versión actual.
2. Priorizar cambios relacionados con:
   - Error handling.
   - Throw / Catch events.
   - Pools.
   - Gateways.
   - Conditions.
   - Variables locales.
3. Probar cambios por grupos, no uno por uno inicialmente.

### Fase 4 — Aislamiento del punto de quiebre

1. Aplicar cambios de la versión actual sobre el baseline por bloques.
2. Validar después de cada bloque.
3. Ejecutar Quick Run después de cada bloque crítico.
4. Documentar el primer bloque que reproduce el error.

### Fase 5 — Descarte específico de ABValidation

1. Probar `ABValidation` importado sin conectarlo al flujo.
2. Retirar/eliminar la User Task de validación y dejar el formulario sin conexión a ningún proceso.
3. Resultado observado: borrar solo la acción/tarea no fue suficiente; FC - MedicalRecords 22 release 30 volvió a fallar.
4. Eliminar manualmente el formulario `ABValidation` completo.
5. Resultado observado: FC - MedicalRecords 22 release 31 (`Post Fail: Removing Form`) desplegó correctamente en aproximadamente 3 minutos.
6. Probar una User Task simple sin `ABValidation`.
7. Resultado observado: se creó `AB New Form`, un formulario nuevo mínimo con un único campo `BatchState`, y se conectó a una User Task `New Form` dentro de AgentMesh.
8. El upgrade tuvo un error temporal de websocket, pero después de aproximadamente 2 minutos actualizó y cargó correctamente.
9. Se amplió el formulario manual con variables de Compliance y, tras eliminar la metadata `Collaboration`, el deployment funcionó.
10. Se agregaron todas las variables restantes al formulario manual en release 34 y el upgrade volvió a funcionar en aproximadamente 2 minutos.
11. La prueba incremental completa no generó ningún error y el nuevo formulario quedó integrado correctamente.
12. Conclusión: el problema efectivamente estaba en la creación/importación del formulario anterior `ABValidation` o en su metadata, no en la User Task, ni en el tamaño del formulario, ni en la cantidad de variables, ni en los mappings.

### Fase 6 — Búsqueda binaria en EB Custom UI Class

1. Tomar la versión 30 como punto intermedio.
2. Como v30 terminó en Upgrade Failed, avanzar hacia atrás.
3. Probar la versión 25 como nuevo punto de descarte.
4. Resultado: v25 funciona y levanta correctamente.
5. Como v25 funciona y v30 falla, avanzar hacia adelante entre v25 y v30 para identificar el primer release que rompe.
6. Ejecutar upgrade de v25 a v27 sin deployment limpio.
7. Resultado observado: el upgrade v25 → v27 falló.
8. Ejecutar deploy directo de v27.
9. Resultado confirmado: EB Custom UI Class / fc_gb Custom UI Class v27 falló también como deploy directo después de aproximadamente 11 minutos.
10. Como v25 funciona y v27 falla, investigar cambios entre v25 y v27.

---

## 12. Pendientes inmediatos

- [x] Crear release/deployment de FC - MedicalRecords 22 con `AB New Form` y mapping mínimo de `BatchState`. Resultado: upgrade exitoso tras error temporal de websocket.
- [x] Confirmar si la User Task con formulario nuevo simple queda Deployed o reproduce el fallo. Resultado: cargó correctamente.
- [x] Eliminar la sección `Collaboration` del JSON del proceso AgentMesh. Resultado: corregido.
- [x] Volver a intentar guardar/release después de eliminar `Collaboration`. Resultado: permitió continuar.
- [x] Ampliar `AB New Form` con variables del agente de Compliance y ejecutar release/upgrade/deployment. Resultado: funcionó.
- [x] Confirmar si el formulario manual con variables de Compliance despliega correctamente o reproduce el fallo. Resultado: despliega correctamente.
- [x] Agregar progresivamente variables de Financial Variance y Coding Integrity. Resultado: release 34 con todas las variables agregadas desplegó correctamente.
- [x] Confirmar causa probable después de la prueba incremental completa. Resultado: el nuevo formulario manual quedó integrado sin errores; el problema era el formulario anterior `ABValidation` o su metadata.
- [ ] Agregar el bloque de control de errores y excepciones en FC - MedicalRecords 22.
- [ ] Confirmar si el control de errores/excepciones despliega correctamente o reproduce el fallo.
- [ ] Si el error handling falla, revisar boundary events, throw/catch, pools y rutas de excepción.
- [ ] Investigar cambios entre EB Custom UI Class v25 y v27.

---

## 13. Conclusión parcial

La causa más probable del fallo de deployment quedó aislada en el formulario **`ABValidation`**, creado/importado con la IA interna de Automate/Hyland, o en la metadata generada por ese artefacto.

La prueba incremental demostró que el problema no está en:

- la existencia de una User Task previa a los agentes;
- el uso de un formulario de validación;
- el mapping de `BatchState`;
- la cantidad de variables;
- el tamaño general del formulario;
- el uso de múltiples mappings.

El nuevo formulario manual **`AB New Form`** quedó integrado correctamente y la aplicación levantó sin reproducir el error.

---

## 14. Notas adicionales

Este documento debe actualizarse si se agregan nuevas pruebas, especialmente el bloque pendiente de control de errores y excepciones.
