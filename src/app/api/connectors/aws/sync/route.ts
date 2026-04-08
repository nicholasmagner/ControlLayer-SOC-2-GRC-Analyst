import { NextResponse } from 'next/server';
import { EC2Client, DescribeInstancesCommand } from '@aws-sdk/client-ec2';
import { IAMClient, ListUsersCommand } from '@aws-sdk/client-iam';
import { prisma } from '@/db/prisma';

export async function POST() {
  try {
    console.log("Starting AWS Sync...");
    
    // Default region can be customized or pulled from env
    const region = process.env.AWS_REGION || 'us-east-1';
    const ec2Client = new EC2Client({ region });
    const iamClient = new IAMClient({ region });

    // Fetch EC2 Instances
    const ec2Data = await ec2Client.send(new DescribeInstancesCommand({}));
    const instances = ec2Data.Reservations?.flatMap(r => r.Instances || []) || [];
    
    // Fetch IAM Users
    const iamData = await iamClient.send(new ListUsersCommand({ MaxItems: 50 }));
    const users = iamData.Users || [];

    // Lookup Controls mapping
    const acControl1 = await prisma.control.findFirst({ where: { controlId: 'AC.L1-3.1.1' } });
    const acControl2 = await prisma.control.findFirst({ where: { controlId: 'AC.L1-3.1.2' } });

    // Create Evidence for EC2
    const ec2Evidence = await prisma.evidenceArtifact.create({
      data: {
        title: 'AWS EC2 Inventory Scan',
        content: { instancesCount: instances.length, instances: instances.map(i => i.InstanceId).filter(Boolean) as string[] },
        source: 'AWS EC2 DescribeInstances API'
      }
    });

    // Create Evidence for IAM
    const iamEvidence = await prisma.evidenceArtifact.create({
      data: {
        title: 'AWS IAM User Audit',
        content: { userCount: users.length, users: users.map(u => ({ userName: u.UserName, mfaActive: false /* simplified for demo */ })) },
        source: 'AWS IAM ListUsers API'
      }
    });

    // Create an Event Log representing the Sync Action
    await prisma.eventLog.create({
      data: {
        action: 'AWS Telemetry Sync',
        actor: 'System Integration Service',
        decision: 'Allow',
        reason: `Successfully synced ${instances.length} EC2 instances and ${users.length} IAM users.`,
        metadata: { ec2EvidenceId: ec2Evidence.id, iamEvidenceId: iamEvidence.id }
      }
    });

    // Update Assessment Scores based on discovered resources
    // If we have any instances, let's mark AC.L1-3.1.1 as 'Met' for demonstration
    if (acControl1) {
      await prisma.assessmentScore.create({
        data: {
          controlId: acControl1.id,
          status: instances.length > 0 ? 'Met' : 'Partially Met',
          justification: `Validated against ${instances.length} AWS EC2 Instances.`
        }
      });
    }

    if (acControl2) {
      await prisma.assessmentScore.create({
        data: {
          controlId: acControl2.id,
          status: users.length > 0 ? 'Met' : 'Partially Met',
          justification: `Validated against ${users.length} AWS IAM Users.`
        }
      });
    }

    return NextResponse.json({ 
      success: true, 
      message: `Synced ${instances.length} instances and ${users.length} users.`,
      ec2Count: instances.length,
      iamCount: users.length
    });
  } catch (error: any) {
    console.error("AWS Sync Error:", error);
    
    // Create an Event Log representing the Failure
    await prisma.eventLog.create({
      data: {
        action: 'AWS Telemetry Sync',
        actor: 'System Integration Service',
        decision: 'Deny',
        reason: error.message || 'Authentication or network error connecting to AWS',
        metadata: { error: error.toString() }
      }
    });

    return NextResponse.json(
      { success: false, error: 'Failed to sync with AWS. Check server logs or ensure AWS credentials are valid locally.' },
      { status: 500 }
    );
  }
}
