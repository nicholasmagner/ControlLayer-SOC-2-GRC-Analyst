import { NextRequest, NextResponse } from 'next/server';
import { AIEngine } from '@/engine/ai/engine';
import { prisma } from '@/db/prisma';

export const MAX_MESSAGES = 20;
export const MAX_MESSAGE_LENGTH = 4000;

type ChatMessage = { role: 'user' | 'assistant'; content: string };

export function isValidHistory(value: unknown): value is ChatMessage[] {
  return (
    Array.isArray(value) &&
    value.length > 0 &&
    value.length <= MAX_MESSAGES &&
    value.every(
      m =>
        m &&
        (m.role === 'user' || m.role === 'assistant') &&
        typeof m.content === 'string' &&
        m.content.length > 0 &&
        m.content.length <= MAX_MESSAGE_LENGTH
    )
  );
}

export async function POST(req: NextRequest) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body.' }, { status: 400 });
  }

  const messages = (body as { messages?: unknown })?.messages;
  if (!isValidHistory(messages)) {
    return NextResponse.json(
      { error: `Expected { messages: {role: "user"|"assistant", content: string}[] }, max ${MAX_MESSAGES} messages, ${MAX_MESSAGE_LENGTH} chars each.` },
      { status: 400 }
    );
  }

  // Server fetches its own bounded snapshot of system state - the client
  // only ever supplies conversation text, never the compliance context.
  const [scores, controls, logs, findings] = await Promise.all([
    prisma.assessmentScore.findMany({ include: { control: true }, orderBy: { evaluatedAt: 'desc' }, take: 20 }),
    prisma.control.findMany({ take: 30 }),
    prisma.eventLog.findMany({ orderBy: { timestamp: 'desc' }, take: 20 }),
    prisma.finding.findMany({ where: { status: 'Open' }, orderBy: { createdAt: 'desc' }, take: 20 }),
  ]);

  const reply = await AIEngine.chat(messages, { scores, controls, logs, findings });

  return NextResponse.json({ reply });
}
