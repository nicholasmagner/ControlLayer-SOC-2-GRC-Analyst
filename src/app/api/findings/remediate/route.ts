import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { IAMClient, PutUserPolicyCommand } from "@aws-sdk/client-iam";

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

    if (finding.status === 'Resolved') {
      return NextResponse.json({ error: 'Finding is already resolved' }, { status: 400 });
    }

    // Determine Remediation Strategy based on Title
    if (finding.title === "IAM User missing MFA") {
      // Extract Username from ARN (e.g., arn:aws:iam::123456789012:user/Alice)
      // Or safer, extract from the details JSON we saved
      if (!finding.details) {
        return NextResponse.json({ error: 'Finding details missing, cannot determine user.' }, { status: 400 });
      }
      
      const details = finding.details as any;
      const userName = details.user?.UserName;

      if (!userName) {
        return NextResponse.json({ error: 'Could not extract IAM Username from finding details.' }, { status: 400 });
      }

      // We will attach an inline policy that Denies all actions except IAM MFA management
      const forceMfaPolicyDocument = {
        "Version": "2012-10-17",
        "Statement": [
          {
            "Sid": "BlockMostAccessUnlessSignedInWithMFA",
            "Effect": "Deny",
            "NotAction": [
              "iam:CreateVirtualMFADevice",
              "iam:EnableMFADevice",
              "iam:ListMFADevices",
              "iam:ListUsers",
              "iam:ListVirtualMFADevices",
              "iam:ResyncMFADevice",
              "sts:GetSessionToken"
            ],
            "Resource": "*",
            "Condition": {
              "BoolIfExists": {
                "aws:MultiFactorAuthPresent": "false"
              }
            }
          }
        ]
      };

      try {
        const command = new PutUserPolicyCommand({
          UserName: userName,
          PolicyName: "Force_MFA_Enforcement",
          PolicyDocument: JSON.stringify(forceMfaPolicyDocument)
        });
        
        await iamClient.send(command);
        console.log(`Successfully attached Force_MFA_Enforcement policy to ${userName}`);

        // Update finding status to Resolved
        const updatedFinding = await prisma.finding.update({
          where: { id: findingId },
          data: { status: 'Resolved' }
        });

        // Log the event
        await prisma.eventLog.create({
          data: {
            action: 'Auto-Remediate IAM MFA',
            actor: 'System Auto-Remediator',
            resource: finding.resource || userName,
            decision: 'Applied',
            reason: 'Attached Force_MFA_Enforcement inline policy.'
          }
        });

        return NextResponse.json({ 
          success: true, 
          message: `Successfully enforced MFA policy on ${userName}.`,
          finding: updatedFinding
        });

      } catch (awsError: any) {
        console.error("AWS Remediation Error:", awsError);
        return NextResponse.json({ error: `AWS Error: ${awsError.message}` }, { status: 500 });
      }

    } else {
      return NextResponse.json({ error: 'Auto-remediation not yet supported for this finding type.' }, { status: 400 });
    }

  } catch (error: any) {
    console.error("Error in remediate API:", error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}
