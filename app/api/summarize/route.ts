import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import { EMPTY_SUMMARY, SummaryRouteResponse } from '@/lib/types';
import { buildFallbackSummary, coerceSummaryShape } from '@/lib/utils';

const fallbackResponse = (
  previousSummary: ReturnType<typeof coerceSummaryShape>,
  newTranscript: string,
  warning: string
) =>
  NextResponse.json({
    ...buildFallbackSummary(previousSummary, newTranscript),
    fallback: true,
    warning
  } satisfies SummaryRouteResponse);

const DEFAULT_SYSTEM_PROMPT = `Actualiza un resumen acumulativo de una conversación hablada.

Reglas:
- No inventes información
- Mantén consistencia con el resumen previo
- Corrige si hay nueva información
- Marca incertidumbres

Estructura tu respuesta en markdown con las secciones que consideres relevantes. Por ejemplo:
- **Resumen ejecutivo**: síntesis breve
- **Puntos clave**: ideas principales
- **Decisiones**: lo que se acordó
- **Próximos pasos**: tareas o acciones
- **Preguntas abiertas**: lo que queda por resolver

Adapta las secciones según el contenido real de la conversación.`;

export async function POST(request: NextRequest) {
  const body = (await request.json()) as {
    previousSummary?: string;
    newTranscript?: string;
    contextPrompt?: string;
  };

  if (!body.newTranscript?.trim()) {
    return NextResponse.json(EMPTY_SUMMARY);
  }

  let previousSummary = EMPTY_SUMMARY;
  try {
    previousSummary = coerceSummaryShape(JSON.parse(body.previousSummary || '{}'));
  } catch {
    previousSummary = EMPTY_SUMMARY;
  }

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return fallbackResponse(previousSummary, body.newTranscript, 'OpenAI no está configurado; usando resumen local.');
  }

  const client = new OpenAI({ apiKey });

  const systemPrompt = body.contextPrompt?.trim() || DEFAULT_SYSTEM_PROMPT;

  const userMessage = `${previousSummary.content ? `Resumen previo:\n${previousSummary.content}\n\n---\n\n` : ''}Nuevo bloque de transcripción:\n${body.newTranscript}`;

  try {
    const response = await client.responses.create({
      model: 'gpt-4.1-mini',
      instructions: systemPrompt,
      input: userMessage,
    });

    return NextResponse.json({
      content: response.output_text,
      usage: {
        input_tokens: response.usage?.input_tokens ?? 0,
        output_tokens: response.usage?.output_tokens ?? 0
      }
    } satisfies SummaryRouteResponse);
  } catch (error) {
    const details =
      typeof error === 'object' && error && 'code' in error && error.code === 'insufficient_quota'
        ? 'OpenAI sin cuota disponible; usando resumen local.'
        : 'OpenAI no pudo generar el resumen; usando fallback local.';

    return fallbackResponse(previousSummary, body.newTranscript, details);
  }
}
