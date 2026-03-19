# agents.md

## Patrones vigentes
- Mantener UI de una sola pantalla y minimalismo estricto: un CTA primario y dos paneles principales.
- Evitar exponer secretos en frontend; todo token efímero debe salir de backend.
- Reusar tokens globales de estilo (`styles/globals.css`) para colores y spacing consistente.
- Nuevas funcionalidades deben incluir pruebas automáticas (Vitest) si tocan lógica de estado/utilidades.

## Aprendizajes de esta sesión
- Para transcripción realtime estable, consolidar texto en `completed` y usar `delta` sólo para preview visual.
- Para resumen incremental robusto, combinar trigger por pausa + heartbeat con umbrales de caracteres y tiempo.
- Mantener botones secundarios mínimos (`Copy`, `Save`) evita ruido y conserva UX enfocada.
