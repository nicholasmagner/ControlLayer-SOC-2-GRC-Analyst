import { prisma } from '@/db/prisma';
import { ActionPayload, EnforcementDecision, PolicyDefinition } from './types';

export class EnforcementEngine {
  /**
   * Evaluates an action against all active policies
   * Returns a deterministic Allow/Deny decision
   */
  static async evaluateAction(payload: ActionPayload): Promise<EnforcementDecision> {
    const policies = await prisma.policy.findMany({
      where: { isActive: true }
    });

    // Fail closed: an action that matches no policy is denied, not allowed.
    // A compliance-enforcement engine that defaults to Allow only enforces
    // the policies someone remembered to write - the whole point is to deny
    // by default and require an explicit Allow policy to open anything up.
    const defaultDecision: EnforcementDecision = {
      decision: 'Deny',
      reason: 'Default Deny - No matching Allow policy',
      actionPayload: payload,
    };

    let finalDecision: EnforcementDecision | null = null;

    for (const policy of policies) {
      const def = policy.content as unknown as PolicyDefinition;
      if (!def || !def.rules) continue;

      const isMatch = this.evaluateRules(payload, def);

      if (isMatch) {
        if (def.effect === 'Deny') {
          // Log Deny
          const d: EnforcementDecision = {
            decision: 'Deny',
            reason: `Action denied by policy: ${policy.name}`,
            matchedPolicyId: policy.id,
            actionPayload: payload
          };
          await this.logEvent(payload, d.decision, d.reason);
          return d; 
        } else if (def.effect === 'Allow' && !finalDecision) {
          finalDecision = {
            decision: 'Allow',
            reason: `Action allowed by policy: ${policy.name}`,
            matchedPolicyId: policy.id,
            actionPayload: payload
          };
        }
      }
    }

    const decision = finalDecision || defaultDecision;

    // Log the event immutably
    await this.logEvent(payload, decision.decision, decision.reason);

    return decision;
  }

  private static async logEvent(payload: ActionPayload, decision: string, reason: string) {
    await prisma.eventLog.create({
      data: {
        action: payload.action,
        actor: payload.actor,
        resource: payload.resource,
        decision: decision,
        reason: reason,
        metadata: payload.metadata !== undefined ? payload.metadata : {},
      }
    });
  }

  private static evaluateRules(payload: ActionPayload, def: PolicyDefinition): boolean {
    if (!def.rules || def.rules.length === 0) return false;

    const results = def.rules.map(rule => {
      const value = this.resolveField(payload, rule.field);
      return this.evaluateCondition(value, rule.operator, rule.value);
    });

    if (def.condition === 'AND') {
      return results.every(r => r === true);
    } else {
      return results.some(r => r === true);
    }
  }

  private static resolveField(obj: any, path: string): any {
    return path.split('.').reduce((acc, part) => acc && acc[part], obj);
  }

  private static evaluateCondition(actualValue: any, operator: string, expectedValue: any): boolean {
    if (actualValue === undefined || actualValue === null) return false;
    
    switch (operator) {
      case 'equals': return actualValue === expectedValue;
      case 'not_equals': return actualValue !== expectedValue;
      case 'contains': return String(actualValue).includes(String(expectedValue));
      case 'in': return Array.isArray(expectedValue) && expectedValue.includes(actualValue);
      case 'not_in': return Array.isArray(expectedValue) && !expectedValue.includes(actualValue);
      case 'greater_than': return Number(actualValue) > Number(expectedValue);
      case 'less_than': return Number(actualValue) < Number(expectedValue);
      default: return false;
    }
  }
}
