import { NextResponse } from 'next/server';
import OpenAI from 'openai';

export async function POST() {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: 'OPENAI_API_KEY no configurada' }, { status: 500 });
  }

  const client = new OpenAI({ apiKey });

  try {
    const session = await client.beta.realtime.sessions.create({
      model: 'gpt-4o-transcribe',
      input_audio_transcription: { model: 'gpt-4o-transcribe' }
    });

    return NextResponse.json(session);
  } catch {
    return NextResponse.json({ error: 'No se pudo crear sesión efímera' }, { status: 500 });
  }
}
