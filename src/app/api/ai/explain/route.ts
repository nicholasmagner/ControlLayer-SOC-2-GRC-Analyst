import { NextRequest, NextResponse } from 'next/server';
import { AIEngine } from '@/engine/ai/engine';
import { prisma } from '@/db/prisma';

export async function POST(req: NextRequest) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body.' }, { status: 400 });
  }

  const controlId = (body as { controlId?: unknown })?.controlId;
  if (typeof controlId !== 'string' || controlId.length === 0 || controlId.length > 64) {
    return NextResponse.json({ error: 'Expected { controlId: string }.' }, { status: 400 });
  }

  const control = await prisma.control.findFirst({
    where: { OR: [{ id: controlId }, { controlId }] },
    include: { scores: { orderBy: { evaluatedAt: 'desc' }, take: 10 } },
  });

  if (!control) {
    return NextResponse.json({ error: `No control found for "${controlId}".` }, { status: 404 });
  }

  // Findings/EventLogs aren't linked to a control by foreign key in the current
  // schema, so we scope by resource/text match as a best effort rather than
  // dumping the entire table into the prompt.
  const [logs, evidence] = await Promise.all([
    prisma.eventLog.findMany({
      where: { OR: [{ resource: { contains: control.name } }, { action: { contains: control.controlId } }] },
      orderBy: { timestamp: 'desc' },
      take: 20,
    }),
    prisma.evidenceArtifact.findMany({
      where: { title: { contains: control.name } },
      orderBy: { collectedAt: 'desc' },
      take: 20,
    }),
  ]);

  const explanation = await AIEngine.generateExplanation(control.controlId, [
    ...logs,
    ...control.scores,
  ], evidence);

  return NextResponse.json({ explanation });
}
