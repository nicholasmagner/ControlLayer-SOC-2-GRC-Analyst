import { prisma } from '@/db/prisma';
import { ControlEvaluation } from './types';

export class AssessmentEngine {
  /**
   * Reads recent EventLogs and EvidenceArtifacts to evaluate control status.
   */
  static async runAssessment(controlId: string, evaluateFn: (logs: any[], evidence: any[]) => ControlEvaluation) {
    const logs = await prisma.eventLog.findMany({
      orderBy: { timestamp: 'desc' },
      take: 100
    });
    
    const evidence = await prisma.evidenceArtifact.findMany({
      orderBy: { collectedAt: 'desc' },
      take: 100
    });

    const result = evaluateFn(logs, evidence);

    const control = await prisma.control.findFirst({
      where: { controlId }
    });

    if (control) {
      await prisma.assessmentScore.create({
        data: {
          controlId: control.id,
          status: result.status,
          justification: result.justification,
        }
      });
    }

    return result;
  }
}
