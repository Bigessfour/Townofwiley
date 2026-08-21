import * as cdk from 'aws-cdk-lib';
import { Template } from 'aws-cdk-lib/assertions';
import { DnsStack } from '../lib/dns-stack';

test('DnsStack creates hosted zone', () => {
  const app = new cdk.App();
  const stack = new DnsStack(app, 'TestDns', {
    env: { account: '818904800844', region: 'us-east-2' },
    domainName: 'townofwiley.gov',
    mailHost: 'mail.townofwiley.gov',
    mailIpv4: '208.117.67.118',
  });
  const template = Template.fromStack(stack);
  template.resourceCountIs('AWS::Route53::HostedZone', 1);
});
