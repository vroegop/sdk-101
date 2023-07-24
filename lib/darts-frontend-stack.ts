import { RemovalPolicy, Stack, StackProps } from 'aws-cdk-lib';
import { Construct } from 'constructs';
import { Bucket, BucketAccessControl } from 'aws-cdk-lib/aws-s3';
import { BucketDeployment, Source } from 'aws-cdk-lib/aws-s3-deployment';
import * as path from 'path';
import { AllowedMethods, CachePolicy, Distribution, OriginAccessIdentity } from 'aws-cdk-lib/aws-cloudfront';
import { RestApiOrigin, S3Origin } from 'aws-cdk-lib/aws-cloudfront-origins';
import { Certificate } from 'aws-cdk-lib/aws-certificatemanager';
import { ARecord, HostedZone, RecordTarget } from 'aws-cdk-lib/aws-route53';
import { CloudFrontTarget } from 'aws-cdk-lib/aws-route53-targets';
import { LambdaRestApi } from 'aws-cdk-lib/aws-apigateway';
import { GraphqlApi } from 'aws-cdk-lib/aws-appsync';

interface IDartsFrontendStackProps extends StackProps {
  cloudfrontCertificate: Certificate;
  commandApi: LambdaRestApi;
  queryApi?: GraphqlApi;
}

export class DartsFrontendStack extends Stack {
  constructor(scope: Construct, id: string, props: IDartsFrontendStackProps) {
    super(scope, id, props);

    // Point to existing hosted zone
    const hostedZone = HostedZone.fromLookup(this, 'cloud101HostedZone', {
      domainName: 'cloud101.nl'
    });

    // Create a bucket in which we can place our website
    const bucket = new Bucket(this, 'Bucket', {
      accessControl: BucketAccessControl.PRIVATE,
      removalPolicy: RemovalPolicy.DESTROY,
      autoDeleteObjects: true,
    });

    // Deploy the website to the bucket
    new BucketDeployment(this, 'BucketDeployment', {
      destinationBucket: bucket,
      sources: [ Source.asset(path.resolve(__dirname, '../website')) ],
    });

    // Grant access to the bucket for the distribution
    const originAccessIdentity = new OriginAccessIdentity(this, 'OriginAccessIdentity');
    bucket.grantRead(originAccessIdentity);

    // Make a cloudfront distribution (CDN) to access the bucket without public access
    const distribution = new Distribution(this, 'Distribution', {
      defaultRootObject: 'index.html',
      defaultBehavior: {
        origin: new S3Origin(bucket, { originAccessIdentity }),
        // Cache disabled is not recommended here, instead removing cache on deployments via pipeline is desired
        cachePolicy: CachePolicy.CACHING_DISABLED
      },
      domainNames: [ 'darts.cloud101.nl' ],
      certificate: props?.cloudfrontCertificate,
      additionalBehaviors: {
        '/api/*': {
          origin: new RestApiOrigin(props.commandApi),
          allowedMethods: AllowedMethods.ALLOW_ALL,
          // Cache disabled is recommended here
          cachePolicy: CachePolicy.CACHING_DISABLED
        },
      },
    });

    // Custom domain name for cloudfront, combining darts and the hosted zone URL, resulting in darts.cloud101.nl
    new ARecord(this, 'AliasRecord', {
      recordName: 'darts',
      zone: hostedZone,
      target: RecordTarget.fromAlias(new CloudFrontTarget(distribution)),
    });

    // Destroy distribution on stack removal
    distribution.applyRemovalPolicy(RemovalPolicy.DESTROY);
  }
}
