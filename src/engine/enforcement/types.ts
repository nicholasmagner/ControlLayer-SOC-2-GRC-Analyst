export interface PolicyRule {
  field: string;
  operator: 'equals' | 'not_equals' | 'contains' | 'in' | 'not_in' | 'greater_than' | 'less_than';
  value: any;
}

export interface PolicyDefinition {
  effect: 'Allow' | 'Deny';
  condition: 'AND' | 'OR';
  rules: PolicyRule[];
}

export interface ActionPayload {
  action: string;
  actor: string;
  resource?: string;
  metadata: Record<string, any>;
}

export interface EnforcementDecision {
  decision: 'Allow' | 'Deny';
  reason: string;
  matchedPolicyId?: string;
  actionPayload: ActionPayload;
}
