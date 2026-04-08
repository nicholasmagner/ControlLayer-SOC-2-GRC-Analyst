import { FrameworkControlMapping, ControlEvaluation } from '@/engine/assessment/types';

export const CMMC_CONTROLS: FrameworkControlMapping[] = [
  {
    controlId: 'AC.L1-3.1.1',
    evaluate: (logs, evidence) => {
      // Limit system access to authorized users
      const failedAuthLogs = logs.filter(l => l.action === 'User Login' && l.decision === 'Deny');
      if (failedAuthLogs.length > 5) {
        return { status: 'Partially Met', justification: 'Multiple failed unauthorized logins detected and blocked, but frequency is high.' };
      }
      return { status: 'Met', justification: 'System access is actively enforced and limited to authorized users.' };
    }
  },
  {
    controlId: 'AC.L1-3.1.2',
    evaluate: (logs, evidence) => {
      // Limit system access to the types of transactions and functions that authorized users are permitted to execute
      const privilegeEscalation = logs.filter(l => l.action === 'Privilege Escalation' && l.decision === 'Allow');
      if (privilegeEscalation.length > 0) {
        return { status: 'Not Met', justification: 'Unauthorized privilege escalation detected.' };
      }
      return { status: 'Met', justification: 'Transaction types and functions are correctly restricted by Enforcement Engine.' };
    }
  }
];
