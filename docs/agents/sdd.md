# Especificación mínima por tarea

Objetivo: empezar con el contexto necesario y una condición clara de cierre.
La issue activa es la especificación; no crear spec, plan y diario duplicados.

## Cuándo usarla
- Consulta, texto o ajuste pequeño: petición y criterios en el chat, sin documentos nuevos.
- Feature o bug de varios pasos: leer la issue existente y completar solo lo que falte.
- Sin issue: usar un bloque breve en el estado local. Publicar exige autorización;
  su ausencia no bloquea trabajo local autorizado.

## Formato de la issue o bloque local
- Resultado: comportamiento observable que debe cambiar.
- Alcance / fuera de alcance.
- Aceptación: 2–5 condiciones observables.
- Contratos: entradas, salidas y variables afectadas; fuente del export si aplica.
- Rutas: archivos o módulos pertinentes, sin listados completos del repo.
- Validación: comando o recorrido manual, autorización y resultado por separado.
- Estado: pendiente / en curso / implementado / validado; siguiente acción.

No inventar decisiones para completar campos. Preguntar solo por lo que impida avanzar.

## Flujo
1. Leer la petición y, si hace falta continuidad, el estado local y la issue activa.
2. Buscar las rutas implicadas. Ampliar únicamente para resolver una duda concreta.
3. Implementar el cambio mínimo. Registrar cambios de alcance en la misma especificación.
4. Validar solo lo autorizado; separar evidencia estática, pruebas y runtime.
5. Reemplazar el estado local vigente y enlazar evidencia; publicar solo con autorización.

## Presupuesto de lectura orientativo
- Consultas de estado: resumen local y, si hace falta, hasta 3 issues vinculadas.
- Issue: primero número/título/estado; después cuerpo o últimos comentarios pertinentes.
- Archivos: buscar con rg y leer fragmentos; no releer contenido ya disponible sin cambios.
- Herramientas: seleccionar campos, excluir HTML duplicado y limitar resultados.
  Intentar mantener cada salida por debajo de 4.000 caracteres; paginar si hace falta.
- Si el resultado se trunca, reducir campos/rango antes de repetir.
- No delegar tareas pequeñas. Cada encargo lleva solo issue, rutas, objetivo y límites;
  evitar transmitir todo el historial cuando no sea necesario.
- Los límites orientan la lectura, no justifican omitir evidencia necesaria.

## Medir el resultado
Comparar varias peticiones equivalentes, con modelo y configuración similares:
tokens de entrada/salida (y razonamiento/caché si se muestran), llamadas y relecturas.
Tamaño de archivos es un indicador de contexto, no una medida de tokens facturados.
Anotar también correcciones necesarias: reducir lecturas no debe degradar el resultado.
