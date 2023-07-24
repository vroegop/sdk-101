import { Stack, StackProps } from 'aws-cdk-lib';
import { Construct } from 'constructs';
import { HostedZone } from 'aws-cdk-lib/aws-route53';
import { Certificate, CertificateValidation } from 'aws-cdk-lib/aws-certificatemanager';

export class DartsCloudfrontCertificateStack extends Stack {
  public cloudfrontCertificate: Certificate;

  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props);

    const hostedZone = HostedZone.fromLookup(this, 'dartsFrontendHostedZone', {
      domainName: 'cloud101.nl'
    });

    this.cloudfrontCertificate = new Certificate(this, 'dartsFrontendCertificate', {
      domainName: 'darts.cloud101.nl',
      certificateName: 'dartsFrontendCertificate',
      validation: CertificateValidation.fromDns(hostedZone),
    });
  }
}
