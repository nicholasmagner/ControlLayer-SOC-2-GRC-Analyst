import { PrismaClient } from '@prisma/client'
import 'dotenv/config'
const prisma = new PrismaClient()

async function main() {
  // Create sample controls
  const c1 = await prisma.control.create({
    data: {
      framework: 'CMMC',
      controlId: 'AC.L1-3.1.1',
      name: 'Authorized Access Control',
      description: 'Limit information system access to authorized users, processes acting on behalf of authorized users, or devices.',
    }
  });

  const c2 = await prisma.control.create({
    data: {
      framework: 'CMMC',
      controlId: 'AC.L1-3.1.2',
      name: 'Transaction & Function Control',
      description: 'Limit information system access to the types of transactions and functions that authorized users are permitted to execute.',
    }
  });

  const s1 = await prisma.control.create({
    data: {
      framework: 'SOC2',
      controlId: 'CC6.1',
      name: 'Logical Access Security',
      description: 'The entity implements logical access security software, infrastructure, and architectures over protected information assets.',
    }
  });

  // Create sample policies
  await prisma.policy.create({
    data: {
      name: 'Restrict Administrative Access',
      description: 'Deny privilege escalation attempts from non-admin resources.',
      content: {
        effect: 'Deny',
        condition: 'AND',
        rules: [
          { field: 'action', operator: 'equals', value: 'Privilege Escalation' },
          { field: 'actor', operator: 'not_contains', value: 'admin' }
        ]
      }
    }
  });

  await prisma.policy.create({
    data: {
      name: 'Allow Standard User Login',
      description: 'Allow standard authenticated users to login successfully.',
      content: {
        effect: 'Allow',
        condition: 'AND',
        rules: [
          { field: 'action', operator: 'equals', value: 'User Login' },
          { field: 'metadata.isAuthenticated', operator: 'equals', value: true }
        ]
      }
    }
  });

  // Create simulated Event Logs
  await prisma.eventLog.create({
    data: {
      action: 'User Login',
      actor: 'bob@example.com',
      decision: 'Allow',
      reason: 'Action allowed by policy: Allow Standard User Login',
      metadata: { isAuthenticated: true, ip: '192.168.1.12' },
      timestamp: new Date(Date.now() - 1000 * 60 * 60 * 2) // 2 hours ago
    }
  });

  await prisma.eventLog.create({
    data: {
      action: 'Privilege Escalation',
      actor: 'guest@example.com',
      decision: 'Deny',
      reason: 'Action denied by policy: Restrict Administrative Access',
      metadata: { roleRequired: 'admin' },
      timestamp: new Date(Date.now() - 1000 * 60 * 15) // 15 mins ago
    }
  });

  // Create simulated Assessment Scores
  await prisma.assessmentScore.create({
    data: {
      controlId: c1.id,
      status: 'Met',
      justification: 'System access is actively enforced and limited to authorized users.'
    }
  });

  await prisma.assessmentScore.create({
    data: {
      controlId: c2.id,
      status: 'Not Met',
      justification: 'Unauthorized privilege escalation detected in the last 24 hours.'
    }
  });

  await prisma.assessmentScore.create({
    data: {
      controlId: s1.id,
      status: 'Met',
      justification: 'Logical access controls are strictly enforced.'
    }
  });

  console.log("Database seeded successfully");
}

main()
  .catch(e => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
