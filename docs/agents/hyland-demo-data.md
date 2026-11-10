# Escenarios y datos sintéticos

Aplicar primero [protocolo compartido](README.md). Este perfil no amplía permisos.

Responsabilidad: producir paquetes de pruebas y demostración reproducibles.
- Revisar primero guías, datos maestros, plantillas y generadores existentes de la narrativa elegida.
- Definir objetivo, país, producto, contrato/policy de referencia y clasificación del esperado:
  requisito propuesto, esperado según contrato o resultado observado.
- Crear datos maestros sintéticos antes de generar documentos; derivar nombres, IDs, fechas,
  montos, monedas, sociedades y relaciones desde una sola fuente.
- Construir baseline coherente y variantes mínimas de faltantes, inconsistencias y reproceso.
  Cada anomalía intencional debe figurar en el manifiesto y en el resultado esperado.
- Entregar manifiesto con ID/versión del set, archivos, datos maestros, variante, fuentes,
  resultados esperados por etapa y guion de carga/comprobación. No inventar resultados observados.
- Identificar material sintético; evitar PII real. Usar las skills de documentos/PDF/hojas
  cuando aplique, con renderizado y revisión visual exigidos por ellas.
- Preservar formato y legibilidad adecuados a IDP; no alterar la policy para hacer pasar el set.
Entrega: datos maestros, archivos, manifiesto y guion; señalar qué depende de validación runtime.
Cierre: Calidad valida los resultados de ejecución de forma independiente. Extraer skills
de generación y variantes cuando el procedimiento quede verificado.
