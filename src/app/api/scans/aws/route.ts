import { NextResponse } from 'next/server';
import { EC2Client, DescribeInstancesCommand } from '@aws-sdk/client-ec2';
import { IAMClient, ListUsersCommand, ListMFADevicesCommand } from '@aws-sdk/client-iam';
import { prisma } from '@/db/prisma';

export async function POST() {
  try {
    console.log("Starting AWS Deep Scan...");
    const region = process.env.AWS_REGION || 'us-east-1';
    const ec2Client = new EC2Client({ region });
    const iamClient = new IAMClient({ region });

    let newFindingsCount = 0;

    // 1. Scan IAM for users without MFA
    const iamData = await iamClient.send(new ListUsersCommand({ MaxItems: 50 }));
    const users = iamData.Users || [];

    for (const user of users) {
      if (!user.UserName) continue;
      
      const mfaData = await iamClient.send(new ListMFADevicesCommand({ UserName: user.UserName }));
      const hasMfa = mfaData.MFADevices && mfaData.MFADevices.length > 0;

      if (!hasMfa) {
        // Create a finding
        const findingTitle = 'IAM User missing MFA';
        
        // Check if we already have an open finding for this
        const existing = await prisma.finding.findFirst({
          where: { title: findingTitle, resource: user.Arn, status: 'Open' }
        });

        if (!existing) {
          await prisma.finding.create({
            data: {
              title: findingTitle,
              description: `User ${user.UserName} does not have a virtual or physical MFA device configured.`,
              severity: 'High',
              resource: user.Arn,
              remediation: `1. Sign in to the AWS Management Console.\n2. Navigate to the IAM console.\n3. In the navigation pane, choose **Users**.\n4. Click on the user **${user.UserName}**.\n5. Go to the **Security credentials** tab.\n6. In the **Multi-factor authentication (MFA)** section, click **Assign MFA device** and follow the prompts to configure a virtual or hardware token.`,
              details: JSON.parse(JSON.stringify({
                user: user,
                mfaDevicesFound: mfaData.MFADevices,
                checkPerformedAt: new Date().toISOString()
              })),
              status: 'Open'
            }
          });
          newFindingsCount++;
        }
      }
    }

    // 2. Scan EC2 for instances with Public IPs
    const ec2Data = await ec2Client.send(new DescribeInstancesCommand({}));
    const instances = ec2Data.Reservations?.flatMap(r => r.Instances || []) || [];

    for (const instance of instances) {
      if (!instance.InstanceId) continue;

      const hasPublicIp = !!instance.PublicIpAddress;

      if (hasPublicIp) {
        const findingTitle = 'EC2 Instance has Public IP';
        
        const existing = await prisma.finding.findFirst({
          where: { title: findingTitle, resource: instance.InstanceId, status: 'Open' }
        });

        if (!existing) {
          await prisma.finding.create({
            data: {
              title: findingTitle,
              description: `Instance ${instance.InstanceId} is reachable via public IP address ${instance.PublicIpAddress}.`,
              severity: 'Medium',
              resource: instance.InstanceId,
              remediation: `1. Sign in to the AWS Management Console.\n2. Navigate to the Amazon EC2 console.\n3. In the navigation pane, locate and choose **Instances**.\n4. Select the instance **${instance.InstanceId}**.\n5. Determine if the Public IP is an Elastic IP or an auto-assigned public IP.\n6. If it's an Elastic IP, disassociate it via the **Elastic IPs** screen.\n7. If it's auto-assigned, consider migrating the instance to a private subnet or securing it tightly via stringent Security Groups.`,
              details: JSON.parse(JSON.stringify({
                instanceId: instance.InstanceId,
                publicIpAddress: instance.PublicIpAddress,
                publicDnsName: instance.PublicDnsName,
                vpcId: instance.VpcId,
                subnetId: instance.SubnetId,
                checkPerformedAt: new Date().toISOString()
              })),
              status: 'Open'
            }
          });
          newFindingsCount++;
        }
      }
    }

    // Event Log
    await prisma.eventLog.create({
      data: {
        action: 'AWS Deep Security Scan',
        actor: 'Active Scanner',
        decision: 'Allow',
        reason: `Scan completed. Found ${newFindingsCount} new issues.`,
      }
    });

    return NextResponse.json({ 
      success: true, 
      message: `Scan complete. Found ${newFindingsCount} new issues.`,
      newFindings: newFindingsCount
    });

  } catch (error: any) {
    console.error("AWS Scan Error:", error);
    
    await prisma.eventLog.create({
      data: {
        action: 'AWS Deep Security Scan',
        actor: 'Active Scanner',
        decision: 'Deny',
        reason: error.message || 'Scan failed to run.',
        metadata: { error: error.toString() }
      }
    });

    return NextResponse.json(
      { success: false, error: 'Failed to run security scan on AWS.' },
      { status: 500 }
    );
  }
}
