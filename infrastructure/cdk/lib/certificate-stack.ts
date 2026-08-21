import * as cdk from 'aws-cdk-lib';
import * as acm from 'aws-cdk-lib/aws-certificatemanager';
import * as route53 from 'aws-cdk-lib/aws-route53';
import { Construct } from 'constructs';

export interface CertificateStackProps extends cdk.StackProps {
  domainName: string;
  subjectAlternativeNames: string[];
  hostedZone: route53.IHostedZone;
}

/**
 * CloudFront requires ACM certificates in us-east-1.
 * DNS validation CNAMEs are written to TowDns; mirror into the live source
 * zone until registrar nameservers point at the new zone.
 */
export class CertificateStack extends cdk.Stack {
  public readonly certificate: acm.Certificate;

  constructor(scope: Construct, id: string, props: CertificateStackProps) {
    super(scope, id, props);

    this.certificate = new acm.Certificate(this, 'SiteCert', {
      domainName: props.domainName,
      subjectAlternativeNames: props.subjectAlternativeNames,
      validation: acm.CertificateValidation.fromDns(props.hostedZone),
      // Keep cert if stack is replaced during early migration experiments
    });

    new cdk.CfnOutput(this, 'CertificateArn', { value: this.certificate.certificateArn });
  }
}
