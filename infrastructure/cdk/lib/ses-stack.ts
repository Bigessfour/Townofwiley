import * as cdk from 'aws-cdk-lib';
import * as route53 from 'aws-cdk-lib/aws-route53';
import * as ses from 'aws-cdk-lib/aws-ses';
import { Construct } from 'constructs';

export interface SesStackProps extends cdk.StackProps {
  domainName: string;
  hostedZone: route53.IHostedZone;
}

/**
 * SES outbound domain identity. Easy DKIM CNAMEs are published into TowDns.
 * Until NS cutover, mirror those CNAMEs into the live source zone.
 */
export class SesStack extends cdk.Stack {
  public readonly identity: ses.EmailIdentity;

  constructor(scope: Construct, id: string, props: SesStackProps) {
    super(scope, id, props);

    this.identity = new ses.EmailIdentity(this, 'DomainIdentity', {
      identity: ses.Identity.publicHostedZone(props.hostedZone),
      dkimSigning: true,
    });

    new cdk.CfnOutput(this, 'IdentityName', { value: props.domainName });
    new cdk.CfnOutput(this, 'DkimRecordsHint', {
      value: 'Mirror SES DKIM CNAMEs from this zone into source zone until NS cutover',
    });
  }
}
