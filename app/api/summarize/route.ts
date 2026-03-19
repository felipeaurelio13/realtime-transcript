import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import { EMPTY_SUMMARY } from '@/lib/types';

export async function POST(request: NextRequest) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: 'OPENAI_API_KEY no configurada' }, { status: 500 });
  }

  const body = (await request.json()) as {
    previousSummary?: string;
    newTranscript?: string;
  };

  if (!body.newTranscript?.trim()) {
    return NextResponse.json(EMPTY_SUMMARY);
  }

  const client = new OpenAI({ apiKey });

  const prompt = `Actualiza un resumen acumulativo de una conversación hablada.

Reglas:
- No inventes información
- Mantén consistencia con el resumen previo
- Corrige si hay nueva información
- Marca incertidumbres

Devuelve JSON:
{
  "executive_summary": "string",
  "key_points": ["string"],
  "decisions": ["string"],
  "action_items": ["string"],
  "open_questions": ["string"]
}

Resumen previo:
${body.previousSummary ?? '{}'}

Nuevo bloque de transcripción:
${body.newTranscript}`;

  try {
    const response = await client.responses.create({
      model: 'gpt-4.1-mini',
      input: prompt,
      text: {
        format: {
          type: 'json_schema',
          name: 'summary',
          schema: {
            type: 'object',
            additionalProperties: false,
            properties: {
              executive_summary: { type: 'string' },
              key_points: { type: 'array', items: { type: 'string' } },
              decisions: { type: 'array', items: { type: 'string' } },
              action_items: { type: 'array', items: { type: 'string' } },
              open_questions: { type: 'array', items: { type: 'string' } }
            },
            required: ['executive_summary', 'key_points', 'decisions', 'action_items', 'open_questions']
          }
        }
      }
    });

    const text = response.output_text;
    return NextResponse.json(JSON.parse(text));
  } catch {
    return NextResponse.json({ error: 'No se pudo resumir' }, { status: 500 });
  }
}
