# LiveNotes

Aplicación interna enfocada en una sola pantalla para transcripción de voz en tiempo real y resumen incremental con OpenAI.

## Stack
- Next.js 15 (App Router)
- React 19
- Tailwind CSS
- Zustand
- OpenAI Realtime API (`gpt-4o-transcribe`) + Responses API para resumen

## Estructura de carpetas

```text
app/
  api/token/route.ts
  api/summarize/route.ts
  layout.tsx
  page.tsx
components/
  summary-view.tsx
  transcript-view.tsx
  ui.tsx
hooks/
  useRealtimeTranscription.ts
  useIncrementalSummary.ts
store/
  livenotes-store.ts
lib/
  types.ts
  utils.ts
styles/
  globals.css
tests/
  setup.ts
  store.test.ts
  utils.test.ts
```

## Ejecución local

1. Instalar dependencias:

```bash
npm install
```

2. Configurar credenciales por variable de entorno del sistema (sin hardcodear secretos):

```bash
export OPENAI_API_KEY="<tu_clave>"
```

3. Levantar la app:

```bash
npm run dev
```

4. Abrir `http://localhost:3000`.

## Endpoints

### `POST /api/token`
Genera un token efímero para conectar WebRTC desde frontend a OpenAI Realtime.

### `POST /api/summarize`
Entrada:

```json
{
  "previousSummary": "string",
  "newTranscript": "string"
}
```

Salida:

```json
{
  "executive_summary": "string",
  "key_points": ["string"],
  "decisions": ["string"],
  "action_items": ["string"],
  "open_questions": ["string"]
}
```

## Lógica de resumen incremental
- Resumen en pausa (1.5s sin nuevo bloque confirmado)
- Resumen cada 5s con flujo continuo
- Ignora actualizaciones si hay menos de 60 caracteres nuevos
- Respeta rate limit interno (mínimo 3s entre actualizaciones)
- Envía sólo delta nuevo + resumen previo

## Registro de sesión (2026-03-19)
- Se creó la V1 completa de LiveNotes con UX minimalista, WebRTC, token efímero backend y resumen incremental.
- Se añadieron pruebas para estado global y parseo de respuesta de resumen.
- Se agregó guardado local en JSON y copia de resumen al portapapeles.

## Mejoras futuras (breve)
- Indicadores de calidad/volumen de audio en vivo.
- Resumen streaming token a token para transiciones aún más fluidas.
- Persistencia opcional cifrada por sesión (sin bloquear modo interno simple).
