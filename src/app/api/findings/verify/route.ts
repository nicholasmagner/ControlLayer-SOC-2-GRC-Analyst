import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { IAMClient, ListUserPoliciesCommand } from "@aws-sdk/client-iam";

const prisma = new PrismaClient();
const iamClient = new IAMClient({ region: process.env.AWS_REGION || "us-east-1" });

export async function POST(req: Request) {
  try {
    const { findingId } = await req.json();

    if (!findingId) {
      return NextResponse.json({ error: 'Finding ID is required' }, { status: 400 });
    }

    const finding = await prisma.finding.findUnique({
      where: { id: findingId }
    });

    if (!finding) {
      return NextResponse.json({ error: 'Finding not found' }, { status: 404 });
    }

    // Determine Verification Strategy based on Title
    if (finding.title === "IAM User missing MFA") {
      const details = finding.details as any;
      const userName = details?.user?.UserName;

      if (!userName) {
        return NextResponse.json({ error: 'Could not extract IAM Username from finding details.' }, { status: 400 });
      }

      try {
        const command = new ListUserPoliciesCommand({
          UserName: userName,
        });
        
        const response = await iamClient.send(command);
        const policies = response.PolicyNames || [];

        const isMitigated = policies.includes("Force_MFA_Enforcement");

        if (isMitigated) {
          // Log verification success
          await prisma.eventLog.create({
            data: {
              action: 'Verify IAM MFA Remediation',
              actor: 'System Auto-Remediator',
              resource: finding.resource || userName,
              decision: 'Verified',
              reason: 'Force_MFA_Enforcement policy is successfully attached.'
            }
          });

          return NextResponse.json({ 
            success: true, 
            verified: true,
            message: `Successfully verified policy on ${userName}.`
          });
        } else {
          // The finding is NOT mitigated. The policy was removed or never existed.
          // Revert the finding status back to Open.
          const updatedFinding = await prisma.finding.update({
            where: { id: findingId },
            data: { status: 'Open' }
          });

          await prisma.eventLog.create({
            data: {
              action: 'Verify IAM MFA Remediation',
              actor: 'System Auto-Remediator',
              resource: finding.resource || userName,
              decision: 'Failed Verification',
              reason: 'Force_MFA_Enforcement policy was missing. Reverted status to Open.'
            }
          });

          return NextResponse.json({ 
            success: true, 
            verified: false,
            message: `Verification failed. Force_MFA_Enforcement policy is NOT attached to ${userName}. Reverting status to Open.`,
            finding: updatedFinding
          });
        }

      } catch (awsError: any) {
        console.error("AWS Verification Error:", awsError);
        return NextResponse.json({ error: `AWS Error: ${awsError.message}` }, { status: 500 });
      }

    } else {
      return NextResponse.json({ error: 'Verification not yet supported for this finding type.' }, { status: 400 });
    }

  } catch (error: any) {
    console.error("Error in verify API:", error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}
