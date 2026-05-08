# FC Medical Records — Deployment Debugging Report

> Branch: `codex/integration`  
> Repository: `FContrerasPardo/CIC-MedicalRecords`  
> Scope: Automate deployment, AgentMesh mappings, Runtime Bundle/App Services readiness, Custom UI deployment comparison.

---

## 1. Objetivo

Documentar el diagnóstico del error de deployment observado en el proyecto **FC Medical Records / fc-gb-customui-class**, comparando una versión baseline funcional contra versiones que presentan `Deployment Failed`.

El objetivo principal es aislar cuál bloque de cambios rompe el deployment, evitando reconstruir manualmente todo el proyecto desde cero.

---

## 2. Estrategia de diagnóstico

La estrategia adoptada es usar el proyecto funcional **FC - MedicalRecords 22** como baseline y aplicar incrementalmente los cambios del proyecto actual.

Flujo de diagnóstico:

1. Confirmar baseline funcional.
2. Ejecutar Quick Run, Release y Deployment sobre baseline.
3. Comparar contra proyecto fallido.
4. Revisar logs de Deployment Service.
5. Identificar si el fallo ocurre en build, deployment action, runtime readiness o health check.
6. Aplicar cambios por bloques sobre el baseline funcional.
7. Publicar/deployar después de cada bloque.
8. Registrar el primer bloque que reproduzca el fallo.

---

## 3. Proyectos y versiones evaluadas

| Proyecto / Aplicación | Release | App Version | Estado observado | Comentario |
|---|---:|---:|---|---|
| `fc-medicalrecords-22-f3esc` | 27 | 2 | Deployed | Baseline funcional. |
| `fc-gb-customui-class-xm8b4` | 28 | 1 | Deployment Failed | Falla por quedarse demasiado tiempo en estado `DEPLOYING`. |
| `FC - MedicalRecords 22` | 22/27 según prueba | N/A | Funcional después de correcciones | Usado como baseline para aplicar cambios incrementales. |

---

## 4. Hallazgos principales

### 4.1 Quick Run no parece ser la causa raíz

Después de ejecutar Quick Run sobre **FC - MedicalRecords 22**, se hizo release y actualización de deployment. El deployment no falló.

Conclusión: Quick Run puede exponer validaciones, pero no parece dañar el proyecto ni ser la causa directa del `Deployment Failed`.

### 4.2 Los warnings de temporales no parecen ser causa raíz

Los logs muestran warnings de limpieza temporal similares en proyectos que sí levantan correctamente. Por eso se consideran ruido o advertencias no fatales.

### 4.3 El deployment action termina, pero la aplicación falla después

En el proyecto fallido, el Deployment Service muestra pasos exitosos como:

```text
Deploy UIs completed successfully
Deployment request sent successfully
Completed deployment action
```

Pero posteriormente aparece:

```text
Application [fc-gb-customui-class-xm8b4-58e71b1e] is in [DEPLOYING] status for too long, sending ERROR event
Application fc-gb-customui-class-xm8b4-58e71b1e status changed to failure status DEPLOYMENT_FAILED - Deployment type: MANUAL
```

Conclusión: el deployment técnico termina, pero la aplicación no alcanza estado saludable dentro del tiempo esperado.

### 4.4 El foco del error apunta a Runtime Bundle / App Services

En el Monitoring Dashboard del proyecto fallido, los servicios principales aparecen operativos, pero el bloque **Runtime Bundle** muestra:

```text
Kubernetes Infrastructure:
Service loading, please wait a few seconds and refresh the page

App Services:
Error 503: Service Unavailable
```

Conclusión: el problema parece estar en readiness/health del Runtime Bundle o App Services, no necesariamente en el Custom UI estático ni en conectores.

---

## 5. Errores y validaciones observadas

### 5.1 Quick Run validation errors en baseline restaurado

Durante pruebas de Quick Run se observaron los siguientes mensajes:

```text
Processes -- Document AI Process
Exclusive gateway has at least one outgoing sequence flow without a condition (which isn't the default one)

Processes -- AgentMesh
The service implementation on service 'Activity_01jc4cz' might fail silently. Consider adding an Error boundary event to handle failures.

Processes -- initialize-batch
The conditional expression references variables that are not defined in the process: part.

Connectors -- cfConnector
Missing or empty 'CONNECTOR_CONNECTION_IDENTIFIER' config for connector 'cfConnector'
```

Lectura:

- El gateway sin condición sí es un error de modelo BPMN.
- La variable `part` no definida sugiere problema de scope o expresión copiada.
- El warning de `Activity_01jc4cz` sugiere falta de boundary event para controlar fallas silenciosas.
- El conector `cfConnector` puede quedar sin configuración al restaurar/importar el proyecto.

### 5.2 Deployment failed por estado DEPLOYING demasiado largo

Error clave del proyecto fallido:

```text
Application [fc-gb-customui-class-xm8b4-58e71b1e] is in [DEPLOYING] status for too long, sending ERROR event
Application fc-gb-customui-class-xm8b4-58e71b1e status changed to failure status DEPLOYMENT_FAILED - Deployment type: MANUAL
```

Lectura:

- No es un error inmediato de empaquetado.
- No parece un error directo de los conectores.
- Se comporta como timeout lógico de health/readiness.

---

## 6. Hipótesis activas

| ID | Hipótesis | Estado | Comentario |
|---|---|---|---|
| H1 | Quick Run daña el proyecto. | Casi descartada | Quick Run + release + deployment sobre baseline no falló. |
| H2 | El problema está en el modelo de Automate, no en Custom UI. | Activa | Runtime Bundle puede fallar por modelo, proceso o configuración. |
| H3 | Hay expresiones o condiciones con referencias internas rotas. | Activa | Se observó variable `part` no definida. |
| H4 | El deployment falla por temporales internos. | Menos probable | Los mismos warnings aparecen en proyecto funcional. |
| H5 | Cambios de manejo de errores en AgentMesh afectaron runtime. | Activa | Hay warnings sobre fallas silenciosas y boundary events. |
| H6 | La restauración rompe referencias internas de agentes por ID. | Parcialmente confirmada | Requirió exportar/importar agentes y re-seleccionarlos. |
| H7 | La configuración quemada del conector CFS/cfConnector puede estar relacionada. | Abierta | Falta confirmar si el conector realmente se ejecuta en la ruta probada. |

---

## 7. Prueba 006 — Corrección incremental de mappings en AgentMesh

### 7.1 Motivo de la prueba

Se detectó que algunas acciones de AgentMesh requieren mapping de variables, pero no todas estaban correctamente conectadas. El plan es aplicar este bloque primero sobre el baseline funcional **FC - MedicalRecords 22**.

Este cambio probablemente no es el que rompe el deployment, porque ya se había probado desplegado anteriormente y el error observado en ese momento era funcional: los agentes fallaban por tamaño máximo de `batchState`.

### 7.2 Cambios incluidos

| Elemento | Cambio requerido | Estado |
|---|---|---|
| PreAuthorization / Script de conversión | Mapear `out_String` hacia `SpreAuthorization`. | En aplicación |
| Compliance Alert Agent | Validar inputs: `agent`, `batchState`, `documentationRules`, `payerCompliancePolicy`, `preAuthorization`. Mapear output hacia `ScomplianceAlertResult`. | En aplicación |
| Financial Variance Agent | Validar inputs: `agent`, `batchState`, `preAuthorization`, `tariffAgreement`. Mapear output hacia `SfinancialVarianceResult`. | En aplicación |
| Coding Integrity Agent | Validar inputs: `agent`, `batchState`, `codingRules`, `payerCodingPolicy`. Mapear output de resultado correspondiente. | En aplicación |
| Output `tools` | Aparece como `No process variable`. | Pendiente confirmar si debe quedar sin mapear. |

### 7.3 Evidencia visual

> Nota: la intención es mantener este documento como archivo Markdown exportable. Las imágenes deben residir en `docs/debugging/assets/`. En esta primera versión se dejan las referencias y títulos; los binarios se deben agregar en la misma rama para que rendericen en GitHub y puedan exportarse a Word.

#### Figura IMG-006-01 — Mapping de `out_String` hacia `SpreAuthorization`

Ruta sugerida:

```markdown
![IMG-006-01](./assets/IMG-006-01-preauthorization-out-string-mapping.png)
```

Qué demuestra:

- La salida `out_String` del script de conversión debe quedar asociada con la variable de proceso `SpreAuthorization`.

#### Figura IMG-006-02 — Actividad `preAuthorization` con input/output mapping

Ruta sugerida:

```markdown
![IMG-006-02](./assets/IMG-006-02-preauthorization-activity-mapping.png)
```

Qué demuestra:

- El input `in_Json` y el output `out_String` deben estar correctamente mapeados.

#### Figura IMG-006-03 — Compliance Alert Agent con output `tools` sin mapear

Ruta sugerida:

```markdown
![IMG-006-03](./assets/IMG-006-03-compliance-alert-tools-output.png)
```

Qué demuestra:

- El agente tiene inputs principales mapeados.
- El output `tools` aparece como `No process variable`.
- Queda pendiente validar si esto es correcto o si requiere variable de proceso.

#### Figura IMG-006-04 — Mapping de resultado de Compliance Alert

Ruta sugerida:

```markdown
![IMG-006-04](./assets/IMG-006-04-compliance-alert-result-mapping.png)
```

Qué demuestra:

- El resultado del agente debe mapearse hacia `ScomplianceAlertResult`.

#### Figura IMG-006-05 — Financial Variance Agent con mappings de entrada y salida

Ruta sugerida:

```markdown
![IMG-006-05](./assets/IMG-006-05-financial-variance-agent-mapping.png)
```

Qué demuestra:

- El agente recibe variables como `batchState`, `preAuthorization` y `tariffAgreement`.
- El output debe mapearse hacia variable de resultado.

#### Figura IMG-006-06 — Mapping de resultado de Financial Variance

Ruta sugerida:

```markdown
![IMG-006-06](./assets/IMG-006-06-financial-variance-result-mapping.png)
```

Qué demuestra:

- El resultado del agente se asigna a `SfinancialVarianceResult`.

#### Figura IMG-006-07 — Financial Variance después de completar mapping de output

Ruta sugerida:

```markdown
![IMG-006-07](./assets/IMG-006-07-financial-variance-output-completed.png)
```

Qué demuestra:

- El output de Financial Variance ya aparece asociado con la variable de proceso.

#### Figura IMG-006-08 — Coding Integrity Agent con inputs y output `tools`

Ruta sugerida:

```markdown
![IMG-006-08](./assets/IMG-006-08-coding-integrity-agent-mapping.png)
```

Qué demuestra:

- El agente usa `codingRules`, `payerCodingPolicy`, `batchState` y `agent`.
- El output `tools` aparece sin variable de proceso y queda pendiente validar.

---

## 8. Matriz de pruebas incremental

| ID | Proyecto base | Bloque de cambio | Acción | Resultado esperado | Resultado real | Estado |
|---|---|---|---|---|---|---|
| T12 | FC - MedicalRecords 22 | Mappings de AgentMesh | Validate + Release + Deployment | Deployment sigue funcionando | Pendiente | Pendiente |
| T13 | FC - MedicalRecords 22 | Correcciones de boundary/error handling | Validate + Release + Deployment | Identificar si rompe runtime | Pendiente | Pendiente |
| T14 | FC - MedicalRecords 22 | Cambios en Medical Records / etapa de validación | Validate + Release + Deployment | Identificar si reproduce error | Pendiente | Pendiente |
| T15 | FC - MedicalRecords 22 | Configuración quemada de CFS/cfConnector | Validate + Release + Deployment | Identificar si afecta Runtime Bundle | Pendiente | Pendiente |

---

## 9. Pendientes inmediatos

- [ ] Aplicar bloque de mapping de AgentMesh sobre `FC - MedicalRecords 22`.
- [ ] Ejecutar Validate.
- [ ] Generar release.
- [ ] Actualizar deployment.
- [ ] Revisar si vuelve a quedar `Deployed` o si pasa a `Deployment Failed`.
- [ ] Si falla, descargar logs de Runtime Bundle / App Services.
- [ ] Confirmar si el output `tools` debe quedar sin mapear.
- [ ] Agregar imágenes reales en `docs/debugging/assets/` para que el Markdown renderice correctamente en GitHub.

---

## 10. Convención para agregar imágenes

Las imágenes deben agregarse en esta ruta:

```text
docs/debugging/assets/
```

Convención de nombres:

```text
IMG-<prueba>-<numero>-<descripcion-corta>.png
```

Ejemplo:

```text
docs/debugging/assets/IMG-006-07-financial-variance-output-completed.png
```

Y deben referenciarse así:

```markdown
![IMG-006-07 — Financial Variance output completed](./assets/IMG-006-07-financial-variance-output-completed.png)
```

---

## 11. Conclusión parcial

Hasta este punto, la evidencia indica que el error no está en el deployment action inicial, sino en la estabilización posterior del Runtime Bundle / App Services. El proyecto fallido completa pasos de deployment, pero queda demasiado tiempo en `DEPLOYING` y termina como `DEPLOYMENT_FAILED`.

El siguiente paso más controlado es aplicar el bloque de mappings de AgentMesh al baseline funcional y verificar si el deployment sigue estable.
