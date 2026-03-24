import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import { EMPTY_SUMMARY, SummarySection, SummaryRouteResponse } from '@/lib/types';
import { buildFallbackSummary, sectionsToMarkdown, mergeSections } from '@/lib/utils';

const fallbackResponse = (
  previousSections: SummarySection[],
  newTranscript: string,
  warning: string
) => {
  const fallback = buildFallbackSummary(previousSections, newTranscript);
  return NextResponse.json({
    ...fallback,
    fallback: true,
    warning
  } satisfies SummaryRouteResponse);
};

const DEFAULT_SYSTEM_PROMPT = `Eres un asistente que mantiene notas estructuradas de una conversación hablada en tiempo real.

Recibirás las secciones actuales del resumen (JSON) y un nuevo bloque de transcripción.

Tu trabajo es devolver SOLO las operaciones necesarias en JSON:

{
  "ops": [
    { "action": "add", "section": "Puntos clave", "items": ["Nuevo punto descubierto"] },
    { "action": "add", "section": "Decisiones", "items": ["Se decidió X"] },
    { "action": "update", "section": "Resumen ejecutivo", "items": ["Texto actualizado del resumen ejecutivo"] },
    { "action": "add", "section": "Nueva sección", "items": ["Primer ítem de la nueva sección"] }
  ]
}

Reglas:
- "add": agrega ítems al final de una sección existente, o crea la sección si no existe.
- "update": reemplaza TODOS los ítems de esa sección. Usa SOLO si la nueva transcripción corrige o invalida información previa de esa sección.
- NUNCA uses "update" solo para reformular. Úsalo solo si hay corrección real.
- Prefiere "add" sobre "update". La mayoría de las veces solo necesitas agregar.
- No inventes información. Si algo es incierto, márcalo con (?).
- Devuelve ops vacío [] si no hay nada nuevo que agregar.
- Responde SOLO con JSON válido, sin markdown ni texto adicional.`;

/** JSON schema for the LLM structured output. */
const OPS_SCHEMA = {
  type: 'json_schema' as const,
  name: 'summary_ops',
  strict: true,
  schema: {
    type: 'object',
    properties: {
      ops: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            action: { type: 'string', enum: ['add', 'update'] },
            section: { type: 'string' },
            items: { type: 'array', items: { type: 'string' } }
          },
          required: ['action', 'section', 'items'],
          additionalProperties: false
        }
      }
    },
    required: ['ops'],
    additionalProperties: false
  }
};

interface SummaryOp {
  action: 'add' | 'update';
  section: string;
  items: string[];
}

export async function POST(request: NextRequest) {
  const body = (await request.json()) as {
    previousSummary?: string;
    newTranscript?: string;
    contextPrompt?: string;
  };

  if (!body.newTranscript?.trim()) {
    return NextResponse.json(EMPTY_SUMMARY);
  }

  // Parse previous sections from the client
  let previousSections: SummarySection[] = [];
  try {
    const parsed = JSON.parse(body.previousSummary || '{}') as { sections?: SummarySection[] };
    previousSections = parsed.sections ?? [];
  } catch {
    previousSections = [];
  }

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return fallbackResponse(previousSections, body.newTranscript, 'OpenAI no está configurado; usando resumen local.');
  }

  const client = new OpenAI({ apiKey });

  // Build the context: show current sections as JSON so the model knows what exists
  const sectionsJson = previousSections.length > 0
    ? JSON.stringify(previousSections.map(s => ({ title: s.title, items: s.items.map(i => i.text) })))
    : '[]';

  const systemPrompt = body.contextPrompt?.trim()
    ? `${body.contextPrompt.trim()}\n\nIMPORTANTE: Responde SOLO con JSON de operaciones en el formato: {"ops": [{"action": "add"|"update", "section": "...", "items": ["..."]}]}`
    : DEFAULT_SYSTEM_PROMPT;

  const userMessage = `Secciones actuales del resumen:\n${sectionsJson}\n\n---\n\nNuevo bloque de transcripción:\n${body.newTranscript}`;

  try {
    const response = await client.responses.create({
      model: 'gpt-4.1-mini',
      instructions: systemPrompt,
      input: userMessage,
      text: { format: OPS_SCHEMA },
    });

    let ops: SummaryOp[] = [];
    try {
      const parsed = JSON.parse(response.output_text) as { ops: SummaryOp[] };
      ops = parsed.ops ?? [];
    } catch {
      // If parsing fails, return previous state unchanged
      return NextResponse.json({
        sections: previousSections,
        content: sectionsToMarkdown(previousSections),
        usage: {
          input_tokens: response.usage?.input_tokens ?? 0,
          output_tokens: response.usage?.output_tokens ?? 0
        }
      } satisfies SummaryRouteResponse);
    }

    // Apply operations to produce updated sections
    const updatedSections = mergeSections(previousSections, ops);

    return NextResponse.json({
      sections: updatedSections,
      content: sectionsToMarkdown(updatedSections),
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

    return fallbackResponse(previousSections, body.newTranscript, details);
  }
}
