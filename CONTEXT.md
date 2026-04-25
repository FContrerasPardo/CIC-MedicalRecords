# Hyland — Cuentas Médicas
## Funcionalidades para Prestadores de Servicios de Salud

> **Documento de Alcance y Definición de Solución — 2025**

---

## Introducción

Este documento describe las funcionalidades de la plataforma Hyland para el proceso de Cuentas Médicas del lado del Prestador de Servicios de Salud. Cubre las seis etapas del ciclo de vida de una cuenta médica, desde la captura del evento clínico hasta la conciliación del pago, detallando las capacidades disponibles, los módulos involucrados y los principales desafíos que la solución resuelve.

| Campo | Detalle |
|---|---|
| **Audiencia objetivo** | Equipos comerciales, preventas y clientes del sector salud |
| **Alcance** | Prestadores de servicios de salud: clínicas, hospitales, IPS |
| **Plataforma** | Hyland — ECM, IDP, Knowledge Enrichment, Agentes IA, Automate, Case Management, Knowledge Discovery |

### Leyenda de prioridades

| Indicador | Significado |
|---|---|
| ⭐ **CRÍTICA** | Funcionalidades críticas para el diferenciador de la demo |
| **MEDIA** | Capacidades de soporte y orquestación del flujo |

---

## Etapa 1 — Captura y Estructuración del Evento Clínico

### Descripción

El proceso inicia con la atención al paciente. El prestador genera documentos heterogéneos: historia clínica, órdenes médicas, resultados de laboratorio, imágenes diagnósticas y registros de enfermería, muchos de los cuales existen en papel o en sistemas desconectados. Esta etapa consolida toda esa información en un expediente digital estructurado.

### Funcionalidades

| Funcionalidad | Descripción | Módulo Hyland | Prioridad |
|---|---|---|---|
| **Captura multicanal de documentos** | Ingesta automática desde escaner, email, portal web, sistemas HIS y fax digital | IDP | ⭐ CRÍTICA |
| **Clasificación automática de documentos** | Identifica el tipo de documento (historia clínica, orden, laboratorio, imagen) sin configuración manual | IDP | ⭐ CRÍTICA |
| **Extracción de campos clave** | Extrae diagnósticos CIE-10, procedimientos CUPS, medicamentos, fechas y valores con alta precisión | IDP | ⭐ CRÍTICA |
| **Enriquecimiento de imágenes médicas** | Indexa RX, ecografías y fotografías con metadatos clínicos para búsqueda semántica posterior | Knowledge Enrichment | ⭐ CRÍTICA |
| **Creación del expediente unificado** | Consolida todos los documentos del evento en un expediente único vinculado al paciente en el ECM | ECM / CIC | ⭐ CRÍTICA |
| Validación de completitud documental | Verifica que el expediente tenga todos los documentos requeridos antes de avanzar al siguiente paso | Automate | MEDIA |
| Integración con sistemas HIS | Sincronización bidireccional con sistemas clínicos del prestador para no duplicar digitación | ECM / Automate | MEDIA |
| Control de versiones de documentos | Gestiona versiones cuando se actualiza una historia clínica o se corrige un documento | ECM | MEDIA |

### ⚠️ Desafíos y retos

- **Alta heterogeneidad documental:** los prestadores combinan documentos digitales, papel escaneado e imágenes médicas en un mismo caso.
- **Falta de estandarización en códigos:** el uso incorrecto de códigos CIE-10 y CUPS desde el origen es la causa principal de glosas posteriores.
- **Integración con sistemas HIS heredados:** muchos prestadores tienen sistemas clínicos antiguos sin API modernas, lo que dificulta la ingesta automática.
- **Resistencia del personal clínico:** los médicos y enfermeros no deben percibir la plataforma como trabajo adicional — la captura debe ser transparente para ellos.

---

## Etapa 2 — Validación Previa con Agente IA

### Descripción

Antes de armar y enviar la cuenta a la aseguradora, un Agente IA analiza el expediente completo en busca de inconsistencias internas: procedimientos sin diagnóstico de respaldo, códigos incorrectos, documentos faltantes o montos fuera del rango tarifario del convenio. **Esta es la etapa de mayor diferenciación de la solución.**

### Funcionalidades

| Funcionalidad | Descripción | Módulo Hyland | Prioridad |
|---|---|---|---|
| **Análisis de consistencia clínico-administrativa** | El agente verifica que cada procedimiento facturado tenga diagnóstico de respaldo válido según las reglas de la aseguradora | Agente IA | ⭐ CRÍTICA |
| **Detección de códigos CUPS incorrectos** | Identifica códigos de procedimiento que no corresponden al diagnóstico o que están desactualizados | Agente IA + IDP | ⭐ CRÍTICA |
| **Verificación de autorizaciones previas** | Cruza los procedimientos realizados contra las autorizaciones previas registradas en el ECM | Agente IA + ECM | ⭐ CRÍTICA |
| **Comparación con tarifas del convenio** | Valida que los montos facturados estén dentro del rango tarifario pactado con cada aseguradora | Agente IA + KD | ⭐ CRÍTICA |
| **Informe de pre-validación con sugerencias** | Genera un reporte con los hallazgos, el nivel de riesgo de glosa y las acciones de corrección recomendadas | Agente IA | ⭐ CRÍTICA |
| **Aprendizaje de patrones históricos de glosa** | El agente consulta el historial de glosas recibidas para anticipar objeciones recurrentes de cada aseguradora | Knowledge Discovery | ⭐ CRÍTICA |
| Detección de documentos faltantes | Identifica si faltan documentos de soporte que la aseguradora habitualmente exige para aprobar la cuenta | Agente IA + KD | MEDIA |
| Flujo de corrección para el equipo de facturación | Los hallazgos se convierten en tareas asignables al equipo antes de que la cuenta salga | Automate + Case Mgmt | MEDIA |

### ⚠️ Desafíos y retos

- **Calidad de los datos de entrada:** la precisión del agente depende directamente de la calidad de la extracción en la Etapa 1. Documentos mal capturados generan falsos positivos.
- **Variabilidad por aseguradora:** cada aseguradora tiene sus propias reglas de validación. El agente debe parametrizarse por convenio, lo que requiere un proceso de configuración inicial.
- **Adopción del equipo de facturación:** el personal debe confiar en las sugerencias del agente y actuar sobre ellas, no omitirlas.
- **Construcción de la base de conocimiento inicial:** el Knowledge Discovery necesita datos históricos de glosas para ser útil desde el primer día. El cliente debe tener esos datos disponibles.

---

## Etapa 3 — Armado y Envío de la Cuenta

### Descripción

Con el expediente validado, el sistema arma el paquete de envío en el formato exigido por cada aseguradora y lo envía de forma trazable. El prestador puede manejar múltiples aseguradoras con formatos distintos desde una única plataforma.

### Funcionalidades

| Funcionalidad | Descripción | Módulo Hyland | Prioridad |
|---|---|---|---|
| **Generación de RIPS automática** | Arma el archivo RIPS en el formato requerido por cada aseguradora a partir del expediente estructurado | Automate + ECM | ⭐ CRÍTICA |
| **Soporte multi-formato de envío** | Adapta el paquete a XML FHIR, EDI, RIPS o formato propietario según el convenio sin intervención manual | Automate | ⭐ CRÍTICA |
| **Registro de trazabilidad de envío** | Guarda fecha, hora, canal, destinatario y número de radicado en el expediente como evidencia legal | ECM | ⭐ CRÍTICA |
| Gestión de portales de aseguradoras | Automatiza el logín y subida de documentos a portales web de aseguradoras que no tienen API | Automate (RPA) | MEDIA |
| Notificación automática de acuse de recibo | Cuando la aseguradora confirma la recepción, el acuse se adjunta automáticamente al expediente | Automate + ECM | MEDIA |
| Panel de seguimiento de envíos | Dashboard con estado de todas las cuentas enviadas: en tránsito, recibidas, en análisis, glosadas | ECM / CIC | MEDIA |
| Gestión de reenvíos por rechazo técnico | Si la aseguradora rechaza el envío por error de formato, el sistema corrige y reenvía automáticamente | Automate | MEDIA |

### ⚠️ Desafíos y retos

- **Fragmentación de canales:** cada aseguradora tiene su propio portal o mecanismo de recepción. La automatización de portales sin API (RPA) es técnicamente compleja y frágil ante cambios de interfaz.
- **Gestión de convenios tarifarios:** las reglas de formato y los códigos aceptados varían por convenio y pueden cambiar sin previo aviso.
- **Plazos legales de radicación:** el sistema debe garantizar el envío dentro de los plazos establecidos por regulación, con evidencia de fecha y hora.

---

## Etapa 4 — Recepción y Gestión de Glosas

### Descripción

La aseguradora devuelve la cuenta con glosas parciales o totales. El sistema las recibe, las vincula al expediente y abre un caso de gestión. El equipo del prestador ve de inmediato qué fue objetado, por qué valor y con qué justificación, y cuenta con inteligencia histórica para decidir si aceptar o apelar.

### Funcionalidades

| Funcionalidad | Descripción | Módulo Hyland | Prioridad |
|---|---|---|---|
| **Recepción automática de respuestas de glosa** | Captura la respuesta de la aseguradora por email, portal o EDI y la vincula al expediente original | IDP + Automate | ⭐ CRÍTICA |
| **Apertura automática de caso de glosa** | Cada glosa genera un caso en Case Management asignado al auditor responsable con toda la información del expediente | Case Management | ⭐ CRÍTICA |
| **Análisis de recurrencia con Knowledge Discovery** | Muestra si la misma glosa se ha recibido antes, cuántas veces y cuál fue el resultado al apelar | Knowledge Discovery | ⭐ CRÍTICA |
| **Dashboard de glosas por aseguradora y código** | Visualización agregada de glosas por aseguradora, tipo de procedimiento y valor objetado | ECM / CIC | ⭐ CRÍTICA |
| **Alertas de vencimiento de plazo de respuesta** | Notificaciones automáticas cuando se acerca el plazo legal para responder la glosa | Automate | ⭐ CRÍTICA |
| Clasificación de glosas por tipo | Categoriza automáticamente la glosa: técnica, administrativa, documental o de cobertura | Agente IA + IDP | MEDIA |
| Cálculo de impacto financiero en tiempo real | Calcula el monto total objetado, el monto en apelación y la proyección de recupero | ECM / CIC | MEDIA |
| Integración con sistema contable del prestador | Sincroniza el estado de las glosas con el sistema de cuentas por cobrar del prestador | Automate + Integraciones | MEDIA |

### ⚠️ Desafíos y retos

- **Volumen y velocidad:** un hospital de alta complejidad puede recibir cientos de glosas por semana. La gestión manual es insostenible sin automatización.
- **Falta de estandarización en las respuestas de las aseguradoras:** cada una tiene formatos distintos para notificar glosas, lo que complica la captura automática.
- **Conocimiento no documentado:** el historial de cómo se resolvió cada glosa suele vivir en la memoria de personas clave, no en sistemas. Construir esa base de conocimiento es crítico.
- **Riesgo de pérdida de plazo:** sin alertas automáticas, las glosas vencen y el prestador pierde el derecho a apelar, generando pérdidas directas.

---

## Etapa 5 — Respuesta y Apelación de Glosas

### Descripción

El prestador decide apelar la glosa. El Agente IA ayuda a construir el argumento de respuesta, identificando los documentos de soporte relevantes y sugiriendo el texto de justificación basado en casos similares resueltos exitosamente. El Automate gestiona el envío dentro del plazo legal.

### Funcionalidades

| Funcionalidad | Descripción | Módulo Hyland | Prioridad |
|---|---|---|---|
| **Asistencia del Agente IA para construir la apelación** | El agente identifica los documentos de soporte del expediente, sugiere el argumento y redacta el borrador de respuesta | Agente IA + KD | ⭐ CRÍTICA |
| **Búsqueda de precedentes exitosos** | Recupera casos similares donde la apelación fue aceptada, con los argumentos que funcionaron | Knowledge Discovery | ⭐ CRÍTICA |
| **Gestión del flujo de aprobación interna** | La respuesta pasa por un flujo de revisión y aprobación antes del envío, con firma electrónica si aplica | Automate + ECM | ⭐ CRÍTICA |
| **Envío trazable de la apelación** | El envío queda registrado con fecha, hora y acuse de recibo en el expediente del caso | Automate + ECM | ⭐ CRÍTICA |
| **Seguimiento del estado de la apelación** | Panel que muestra el estado de cada apelación enviada: pendiente, aceptada, rechazada, en conciliación | Case Management | ⭐ CRÍTICA |
| Conciliación de glosas entre partes | Soporte para el proceso de conciliación formal entre prestador y aseguradora, con registro de acuerdos | Case Management + ECM | MEDIA |
| Enriquecimiento continuo de la base de conocimiento | Cada glosa resuelta (aceptada o rechazada) alimenta automáticamente el Knowledge Discovery | Knowledge Discovery | MEDIA |

### ⚠️ Desafíos y retos

- **Calidad de la base de conocimiento:** si el KD no tiene datos históricos suficientes, las sugerencias del agente son genéricas. La utilidad crece con el tiempo y el volumen de casos.
- **Complejidad jurídica:** en algunos países, las apelaciones de glosas implican procesos regulatorios específicos. El sistema debe adaptarse al marco legal de cada mercado.
- **Resistencia a compartir la decisión con la IA:** los auditores senior pueden sentir que el agente reduce su rol. El posicionamiento debe ser como asistente, no como reemplazo.
- **Heterogeneidad de los mecanismos de apelación:** cada aseguradora acepta las apelaciones por distintos canales y con formatos diferentes.

---

## Etapa 6 — Seguimiento de Pago, Conciliación y Cierre

### Descripción

La aseguradora emite el pago. El sistema reconcilia el valor recibido contra la cuenta original y los acuerdos de glosa, cierra el expediente con trazabilidad completa y alimenta la inteligencia para futuros procesos.

### Funcionalidades

| Funcionalidad | Descripción | Módulo Hyland | Prioridad |
|---|---|---|---|
| **Conciliación automática de pagos** | Cruza el valor pagado por la aseguradora contra la cuenta original y los acuerdos de glosa, e identifica diferencias | Automate + ECM | ⭐ CRÍTICA |
| **Cierre del expediente con trazabilidad completa** | El expediente queda cerrado con el historial completo: facturación, glosas, apelaciones, acuerdos y pago | ECM | ⭐ CRÍTICA |
| **Dashboard financiero de recupero** | Muestra por aseguradora: valor facturado, valor glosado, valor recuperado en apelación y valor definitivamente perdido | ECM / CIC | ⭐ CRÍTICA |
| **Integración con ERP y sistema de cuentas por cobrar** | El cierre del expediente actualiza automáticamente el estado en el sistema contable del prestador | Automate + Integraciones | ⭐ CRÍTICA |
| **Métricas de ciclo de cuentas médicas** | Tiempo promedio de pago por aseguradora, tasa de glosas, tasa de éxito en apelación, valor en riesgo | ECM / CIC | ⭐ CRÍTICA |
| Retención documental y cumplimiento normativo | Gestión de retención según normativa vigente, con control de accesos y pistas de auditoría inmutables | ECM | MEDIA |
| Enriquecimiento del modelo predictivo de glosas | Las métricas del ciclo cerrado retroalimentan el agente IA para mejorar la validación previa en la Etapa 2 | Knowledge Discovery + Agente IA | MEDIA |
| Firma electrónica en documentos de cierre | Documentos de conciliación y cierre firmados electrónicamente con validez legal | ECM + Firma electrónica | MEDIA |

### ⚠️ Desafíos y retos

- **Complejidad de la conciliación:** cuando hay múltiples glosas parciales, acuerdos de conciliación y pagos fraccionados, la reconciliación automática requiere reglas de negocio bien definidas.
- **Integración con ERP heredados:** muchos prestadores tienen sistemas contables con interfaces limitadas que dificultan la sincronización en tiempo real.
- **Definición de KPIs con el cliente:** cada prestador mide el éxito de forma diferente. Es clave alinear las métricas desde el inicio del proyecto.
- **Normativa de retención documental:** los requisitos legales varían por país (Colombia, México, Perú, etc.) y deben mapearse antes de la implementación.

---

## Resumen Ejecutivo de Diferenciadores

La propuesta de valor de Hyland para prestadores de servicios de salud se concentra en tres diferenciadores que ningún competidor ofrece de forma integrada:

### 1. Prevención de glosas
El Agente IA valida la cuenta antes del envío, detectando inconsistencias que la aseguradora habría glosado. Esto reduce la tasa de glosas desde el origen, no solo después de recibirlas.

### 2. Inteligencia acumulada
El Knowledge Discovery aprende con cada caso resuelto. Con el tiempo, el sistema sabe qué glosas son apelables, cuál es el argumento correcto y cuál es la tasa de éxito por aseguradora.

### 3. Plataforma única end-to-end
IDP, ECM, Agentes IA, Automate, Case Management y Knowledge Discovery operan integrados en un único flujo. El prestador no necesita ensamblar soluciones de distintos proveedores.

---

*Confidencial — Uso interno Hyland*
