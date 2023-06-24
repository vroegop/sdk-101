import { Template } from 'aws-cdk-lib/assertions';
import { Cloud101Stack } from '../lib/cloud-101-stack';
import { App } from 'aws-cdk-lib';

describe('Test the Cloud101Stack', () => {
  let app: App;
  let stack: Cloud101Stack;
  let template: Template;

  beforeEach(() => {
    app = new App();
    stack = new Cloud101Stack(app, 'MyTestStack', { env: { region: 'us-west-2', account: '531843824238' } });
    template = Template.fromStack(stack);
  });

  test('Test if the bucket resource is created', () => {
    template.resourceCountIs('AWS::S3::Bucket', 1);
  });

  test('Test if the bucket resource has the right properties', () => {
    template.hasResourceProperties('AWS::S3::Bucket', {
      AccessControl: 'Private',
      BucketName: 'cloud-101-presentation'
    });
  });

  test('Test if the bucket deployment resource is created', () => {
    template.resourceCountIs('Custom::CDKBucketDeployment', 1);
  });

  test('Test if the origin access identity resource is created', () => {
    template.resourceCountIs('AWS::CloudFront::CloudFrontOriginAccessIdentity', 1);
  });

  test('Test if the distribution resource is created', () => {
    template.resourceCountIs('AWS::CloudFront::Distribution', 1);
  });

  test('Test if the distribution resource has the right properties', () => {
    template.hasResourceProperties('AWS::CloudFront::Distribution', {
      DistributionConfig: {
        DefaultRootObject: 'index.html',
        Enabled: true
      }
    });
  });

  test('Test if the CNAME record is created', () => {
    template.resourceCountIs('AWS::Route53::RecordSet', 1);
    template.hasResourceProperties('AWS::Route53::RecordSet', {
      Name: 'presentation.cloud101.nl.',
      Type: 'CNAME',
      TTL: '300',
    });
  });
});
