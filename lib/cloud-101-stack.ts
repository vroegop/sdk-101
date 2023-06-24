import { CfnOutput, Duration, RemovalPolicy, Stack, StackProps } from 'aws-cdk-lib';
import { Construct } from 'constructs';
import { Bucket, BucketAccessControl } from 'aws-cdk-lib/aws-s3';
import { BucketDeployment, Source } from 'aws-cdk-lib/aws-s3-deployment';
import * as path from 'path';
import { Distribution, OriginAccessIdentity } from 'aws-cdk-lib/aws-cloudfront';
import { S3Origin } from 'aws-cdk-lib/aws-cloudfront-origins';
import { CnameRecord, HostedZone } from 'aws-cdk-lib/aws-route53';
import { Certificate } from 'aws-cdk-lib/aws-certificatemanager';

export class Cloud101Stack extends Stack {
  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props);

    /**
     * Existing resources already created outside CDK or in other stacks
     */

    // cloud101.nl hosted zone (DNS management)
    const hostedZone = HostedZone.fromLookup(this, 'Cloud101HostedZone', {
      domainName: 'cloud101.nl',
    });

    // HTTPS certificate
    const certificate = Certificate.fromCertificateArn(
      this,
      '*.cloud101.nl-certificate',
      'arn:aws:acm:us-east-1:531843824238:certificate/603b6c7a-2a0d-4ca9-b154-0886cd81b67e'
    );

    /**
     * New resources that will be created by this stack
     */

      // Create an S3 bucket
    const bucket = new Bucket(this, 'Cloud101PresentationBucket', {
      accessControl: BucketAccessControl.PRIVATE,
      bucketName: 'cloud-101-presentation',

      // delete objects on stack/bucket removal
      removalPolicy: RemovalPolicy.DESTROY,
      autoDeleteObjects: true,
    });

    // Deploy files to the S3 bucket
    new BucketDeployment(this, 'Cloud101PresentationDeployment', {
      destinationBucket: bucket,
      sources: [ Source.asset(path.resolve(__dirname, '../slides')) ]
    });

    // Create an origin access identity for CloudFront
    const originAccessIdentity = new OriginAccessIdentity(this, 'Cloud101OriginAccessIdentity');
    bucket.grantRead(originAccessIdentity);

    // Create a CloudFront distribution
    const distribution = new Distribution(this, 'Cloud101Distribution', {
      defaultRootObject: 'index.html',
      domainNames: ['presentation.cloud101.nl'],
      defaultBehavior: {
        origin: new S3Origin(bucket, { originAccessIdentity }),
      },
      certificate,
    });

    // Remove cloudfront on stack removal
    distribution.applyRemovalPolicy(RemovalPolicy.DESTROY);

    // Create a new CName Record for the (existing) hosted zone and add it to route53
    const record = new CnameRecord(this, 'Cloud101DistributionAlias', {
      recordName: `presentation.cloud101.nl`,
      domainName: distribution.domainName,
      zone: hostedZone,
      ttl: Duration.seconds(300),
    });

    record.applyRemovalPolicy(RemovalPolicy.DESTROY);

    // Output the CloudFront distribution URL
    new CfnOutput(this, 'Cloud101DistributionURL', {
      value: `https://${distribution.distributionDomainName}`
    });
  }
}
