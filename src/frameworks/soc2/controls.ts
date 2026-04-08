import { FrameworkControlMapping, ControlEvaluation } from '@/engine/assessment/types';

export const SOC2_CONTROLS: FrameworkControlMapping[] = [
  {
    controlId: 'CC6.1',
    evaluate: (logs, evidence) => {
      // Logical access security
      const configChanges = logs.filter(l => l.action === 'Config Change' && l.decision === 'Allow');
      if (configChanges.length > 0) {
        return { status: 'Partially Met', justification: 'Configuration changes were allowed; review is required to ensure logical access remains secure.' };
      }
      return { status: 'Met', justification: 'Logical access controls are strictly enforced.' };
    }
  }
];
