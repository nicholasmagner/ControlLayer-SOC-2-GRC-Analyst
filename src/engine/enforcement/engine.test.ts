import { describe, it, expect, vi, beforeEach } from 'vitest';

const findMany = vi.fn();
const create = vi.fn();

vi.mock('@/db/prisma', () => ({
  prisma: {
    policy: { findMany: (...args: unknown[]) => findMany(...args) },
    eventLog: { create: (...args: unknown[]) => create(...args) },
  },
}));

// Import after the mock so the module under test picks up the mocked prisma.
const { EnforcementEngine } = await import('./engine');

function policy(effect: 'Allow' | 'Deny', field: string, operator: string, value: unknown, condition: 'AND' | 'OR' = 'AND') {
  return {
    id: `policy-${effect}-${field}`,
    name: `${effect} on ${field}`,
    isActive: true,
    content: { effect, condition, rules: [{ field, operator, value }] },
  };
}

beforeEach(() => {
  findMany.mockReset();
  create.mockReset();
});

describe('EnforcementEngine.evaluateAction', () => {
  it('denies by default when no policy matches (fail closed)', async () => {
    findMany.mockResolvedValue([]);

    const decision = await EnforcementEngine.evaluateAction({
      action: 'delete_bucket',
      actor: 'agent-1',
      resource: 's3://prod',
      metadata: {},
    });

    expect(decision.decision).toBe('Deny');
    expect(decision.reason).toMatch(/default deny/i);
    expect(create).toHaveBeenCalledOnce();
  });

  it('denies when an explicit Deny policy matches, even if an Allow policy also matches', async () => {
    findMany.mockResolvedValue([
      policy('Allow', 'action', 'equals', 'delete_bucket'),
      policy('Deny', 'resource', 'contains', 'prod'),
    ]);

    const decision = await EnforcementEngine.evaluateAction({
      action: 'delete_bucket',
      actor: 'agent-1',
      resource: 's3://prod',
      metadata: {},
    });

    expect(decision.decision).toBe('Deny');
    expect(decision.matchedPolicyId).toBe('policy-Deny-resource');
  });

  it('allows when an Allow policy matches and no Deny policy matches', async () => {
    findMany.mockResolvedValue([policy('Allow', 'action', 'equals', 'read_status')]);

    const decision = await EnforcementEngine.evaluateAction({
      action: 'read_status',
      actor: 'agent-1',
      resource: 's3://prod',
      metadata: {},
    });

    expect(decision.decision).toBe('Allow');
    expect(decision.matchedPolicyId).toBe('policy-Allow-action');
  });

  it('requires every rule to match under an AND condition', async () => {
    findMany.mockResolvedValue([{
      id: 'p1',
      name: 'AND policy',
      isActive: true,
      content: {
        effect: 'Deny',
        condition: 'AND',
        rules: [
          { field: 'action', operator: 'equals', value: 'delete_bucket' },
          { field: 'resource', operator: 'contains', value: 'staging' }, // won't match "prod"
        ],
      },
    }]);

    const decision = await EnforcementEngine.evaluateAction({
      action: 'delete_bucket',
      actor: 'agent-1',
      resource: 's3://prod',
      metadata: {},
    });

    // AND policy partially matches -> should not fire -> falls through to default deny
    expect(decision.decision).toBe('Deny');
    expect(decision.reason).toMatch(/default deny/i);
  });

  it('fires an OR policy if any single rule matches', async () => {
    findMany.mockResolvedValue([{
      id: 'p1',
      name: 'OR policy',
      isActive: true,
      content: {
        effect: 'Deny',
        condition: 'OR',
        rules: [
          { field: 'action', operator: 'equals', value: 'unrelated_action' },
          { field: 'resource', operator: 'contains', value: 'prod' },
        ],
      },
    }]);

    const decision = await EnforcementEngine.evaluateAction({
      action: 'delete_bucket',
      actor: 'agent-1',
      resource: 's3://prod',
      metadata: {},
    });

    expect(decision.decision).toBe('Deny');
    expect(decision.matchedPolicyId).toBe('p1');
  });

  it('treats an unknown operator as non-matching rather than throwing', async () => {
    findMany.mockResolvedValue([{
      id: 'p1',
      name: 'bad operator',
      isActive: true,
      content: { effect: 'Deny', condition: 'AND', rules: [{ field: 'action', operator: 'nonsense', value: 'x' }] },
    }]);

    const decision = await EnforcementEngine.evaluateAction({ action: 'x', actor: 'a', resource: 'r', metadata: {} });

    expect(decision.decision).toBe('Deny');
    expect(decision.reason).toMatch(/default deny/i);
  });
});
