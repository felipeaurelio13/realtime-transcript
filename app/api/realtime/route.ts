import { NextRequest, NextResponse } from 'next/server';
import { buildTranscriptionSession, getPreferredTranscriptionLanguage } from '@/lib/realtime';

export async function POST(request: NextRequest) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: 'OPENAI_API_KEY no configurada' }, { status: 500 });
  }

  const sdp = await request.text();
  if (!sdp.trim()) {
    return NextResponse.json({ error: 'SDP inválida o vacía' }, { status: 400 });
  }

  const acceptLanguage = request.headers.get('accept-language') ?? undefined;
  const session = buildTranscriptionSession(getPreferredTranscriptionLanguage(acceptLanguage));

  const formData = new FormData();
  formData.set('sdp', sdp);
  formData.set('model', 'gpt-4o-transcribe');
  formData.set('session', JSON.stringify(session));

  try {
    const response = await fetch('https://api.openai.com/v1/realtime/calls', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`
      },
      body: formData
    });

    const answerSdp = await response.text();
    if (!response.ok) {
      return NextResponse.json({ error: `No se pudo crear la llamada realtime: ${answerSdp}` }, { status: 500 });
    }

    if (!answerSdp.trimStart().startsWith('v=')) {
      return NextResponse.json({ error: 'OpenAI devolvió una SDP inválida' }, { status: 500 });
    }

    return new Response(answerSdp, {
      status: 200,
      headers: {
        'Content-Type': 'application/sdp'
      }
    });
  } catch {
    return NextResponse.json({ error: 'No se pudo inicializar la llamada realtime' }, { status: 500 });
  }
}
