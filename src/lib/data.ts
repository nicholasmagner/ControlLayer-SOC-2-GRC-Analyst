import { prisma } from '@/db/prisma';

export async function getDashboardData() {
  const scores = await prisma.assessmentScore.findMany({
    include: { control: true },
    orderBy: { evaluatedAt: 'desc' }
  });
  
  const logs = await prisma.eventLog.findMany({
    orderBy: { timestamp: 'desc' },
    take: 50
  });
  
  const controls = await prisma.control.findMany({
    orderBy: { framework: 'asc' }
  });
  
  const evidence = await prisma.evidenceArtifact.findMany({
    orderBy: { collectedAt: 'desc' },
    take: 50
  });

  const findings = await prisma.finding.findMany({
    orderBy: { createdAt: 'desc' },
    take: 50
  });

  return { scores, logs, controls, evidence, findings };
}
