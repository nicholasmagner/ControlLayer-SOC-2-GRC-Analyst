export interface ControlEvaluation {
  status: 'Met' | 'Partially Met' | 'Not Met';
  justification: string;
}

export interface FrameworkControlMapping {
  controlId: string;
  evaluate: (logs: any[], evidence: any[]) => ControlEvaluation;
}
