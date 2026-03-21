import { NextResponse } from 'next/server';
import { buildTranscriptionSession } from '@/lib/realtime';

export async function POST() {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: 'OPENAI_API_KEY no configurada' }, { status: 500 });
  }

  try {
    const response = await fetch('https://api.openai.com/v1/realtime/client_secrets', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        session: buildTranscriptionSession()
      })
    });

    const raw = await response.text();
    if (!response.ok) {
      return NextResponse.json({ error: `No se pudo crear client secret: ${raw}` }, { status: 500 });
    }

    const data = JSON.parse(raw) as {
      value?: string;
      expires_at?: number;
      client_secret?: { value?: string };
      session?: { type?: string };
    };

    const secretValue = data.value ?? data.client_secret?.value;
    if (!secretValue) {
      return NextResponse.json({ error: 'Client secret inválido (sin value)' }, { status: 500 });
    }

    return NextResponse.json({
      client_secret: { value: secretValue },
      value: secretValue,
      expires_at: data.expires_at,
      type: data.session?.type ?? 'transcription'
    });
  } catch {
    return NextResponse.json({ error: 'No se pudo crear sesión efímera' }, { status: 500 });
  }
}
