#!/usr/bin/env node
import * as cdk from 'aws-cdk-lib';
import { DnsStack } from '../lib/dns-stack';
import { CertificateStack } from '../lib/certificate-stack';
import { HostingStack } from '../lib/hosting-stack';
import { SesStack } from '../lib/ses-stack';
import { CmsStack } from '../lib/cms-stack';

/**
 * Town of Wiley foundations for account 818904800844 (profile: tow).
 * Deploy order: Dns → Certificate (us-east-1) → Hosting → Ses → Cms
 */
const app = new cdk.App();

const account = process.env.CDK_DEFAULT_ACCOUNT ?? '818904800844';
const primaryRegion = 'us-east-2';
const cloudFrontCertRegion = 'us-east-1';

const envPrimary = { account, region: primaryRegion };
const envUsEast1 = { account, region: cloudFrontCertRegion };

const domainName = 'townofwiley.gov';
const mailHost = 'mail.townofwiley.gov';
const mailIpv4 = '208.117.67.118';

const dns = new DnsStack(app, 'TowDns', {
  env: envPrimary,
  domainName,
  mailHost,
  mailIpv4,
  description: 'Route 53 public zone + Synology mail records for townofwiley.gov',
});

const cert = new CertificateStack(app, 'TowCertificate', {
  env: envUsEast1,
  crossRegionReferences: true,
  domainName,
  subjectAlternativeNames: [`www.${domainName}`, `staging.${domainName}`],
  // Validation records are created in TowDns; until registrar NS cutover,
  // mirror them into the live source zone (see scripts/mirror-validation-to-source-zone.sh).
  hostedZone: dns.hostedZone,
  description: 'ACM cert in us-east-1 for CloudFront (apex, www, staging)',
});
cert.addStackDependency(dns);

const hosting = new HostingStack(app, 'TowHosting', {
  env: envPrimary,
  crossRegionReferences: true,
  domainName,
  hostedZone: dns.hostedZone,
  certificate: cert.certificate,
  // Apex/www free after release from personal-account CloudFront E1NZ3XCY5CYR1J.
  aliases: [domainName, `www.${domainName}`, `staging.${domainName}`],
  description: 'S3 + CloudFront + OAC static hosting for townofwiley.gov',
});
hosting.addStackDependency(cert);

const ses = new SesStack(app, 'TowSes', {
  env: envPrimary,
  domainName,
  hostedZone: dns.hostedZone,
  description: 'SES domain identity + Easy DKIM for outbound mail',
});
ses.addStackDependency(dns);

new CmsStack(app, 'TowCms', {
  env: envPrimary,
  // townofwiley-staff is still attached to personal Cognito; use a tow-owned prefix.
  cognitoDomainPrefix: 'tow-gov-staff',
  description: 'Staff Cognito + AppSync CMS + documents S3 (Amplify GraphQL construct, not Hosting)',
});

app.synth();
