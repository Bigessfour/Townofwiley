import * as cdk from 'aws-cdk-lib';
import * as route53 from 'aws-cdk-lib/aws-route53';
import { Construct } from 'constructs';

export interface DnsStackProps extends cdk.StackProps {
  domainName: string;
  mailHost: string;
  mailIpv4: string;
}

/**
 * Public hosted zone plus inbound-mail records that must survive NS cutover.
 * Website A/AAAA aliases are owned by HostingStack once CloudFront exists.
 */
export class DnsStack extends cdk.Stack {
  public readonly hostedZone: route53.PublicHostedZone;

  constructor(scope: Construct, id: string, props: DnsStackProps) {
    super(scope, id, props);

    this.hostedZone = new route53.PublicHostedZone(this, 'Zone', {
      zoneName: props.domainName,
      comment: 'Town of Wiley public DNS (account migration target)',
    });

    new route53.MxRecord(this, 'Mx', {
      zone: this.hostedZone,
      values: [{ hostName: props.mailHost, priority: 10 }],
      ttl: cdk.Duration.seconds(300),
    });

    new route53.ARecord(this, 'MailA', {
      zone: this.hostedZone,
      recordName: 'mail',
      target: route53.RecordTarget.fromIpAddresses(props.mailIpv4),
      ttl: cdk.Duration.seconds(300),
    });

    new route53.TxtRecord(this, 'Spf', {
      zone: this.hostedZone,
      values: [`v=spf1 ip4:${props.mailIpv4} include:amazonses.com ~all`],
      ttl: cdk.Duration.seconds(300),
    });

    new route53.TxtRecord(this, 'Dmarc', {
      zone: this.hostedZone,
      recordName: '_dmarc',
      values: ['v=DMARC1; p=none; rua=mailto:clerk@townofwiley.gov'],
      ttl: cdk.Duration.seconds(300),
    });

    // Synology MailPlus DKIM (split automatically by Route 53 for long TXT)
    new route53.TxtRecord(this, 'SynologyDkim', {
      zone: this.hostedZone,
      recordName: 'mail._domainkey',
      values: [
        'v=DKIM1; k=rsa; p=MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEAx+N9keDo9sVuFZm4nlrbKLy2oIIdHiPv972lQ/wGnU6VLOkO+ggr9QkuJ7+4cZdvHr+SC60w3IagfEV2SdtmotaK2tlxYqJDGoHO9zwVylUkrFnh18agU8l8c0znuqJz81d0wAUInSNW9w7hDQNQ+2FR6sM+IpbYKoaZZTXxS8mesBf2PwH5pmky9m0RvAMvR4F6/JwwTeEaPwiOw7QwwKyICVFvmw/GZaWUmiVS/q6CS+UVZE+bkLcrNWwk3nkJRbD5YCEz4mB9vHYowrW62dAQ6M/Iu6+o7P+tR1cqRmUBxdySAA4PvSjyf2rON32ddZKmQMlWwiZwzQ6mQaxhIwIDAQAB',
      ],
      ttl: cdk.Duration.seconds(300),
    });

    new cdk.CfnOutput(this, 'HostedZoneId', { value: this.hostedZone.hostedZoneId });
    new cdk.CfnOutput(this, 'NameServers', {
      value: cdk.Fn.join(',', this.hostedZone.hostedZoneNameServers ?? []),
    });
  }
}
