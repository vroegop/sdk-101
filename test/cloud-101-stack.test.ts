import { Template } from 'aws-cdk-lib/assertions';
import { DartsCommandStack } from '../lib/darts-command-stack';
import { App } from 'aws-cdk-lib';
import { UserPool, UserPoolClient } from 'aws-cdk-lib/aws-cognito';
import { Certificate } from 'aws-cdk-lib/aws-certificatemanager';

describe('Test the Cloud101Stack', () => {
  let app: App;
  let stack: DartsCommandStack;
  let template: Template;
  let userPool: UserPool;
  let userPoolClient: UserPoolClient;
  let certificate: Certificate;

  beforeEach(() => {
    app = new App();
    userPool = new UserPool(app, 'testUserPool');
    userPoolClient = new UserPoolClient(app, 'testUserPoolClient', { userPool });
    certificate = new Certificate(app, 'testCertificate', { domainName: 'test' });
    stack = new DartsCommandStack(app, 'MyTestStack', {
      env: { region: 'eu-west-1', account: '531843824238' },
      cognitoUserPool: userPool,
      cognitoUserPoolClient: userPoolClient,
      apiCertificate: certificate
    });
    template = Template.fromStack(stack);
  });

  test('Test if the lambda is created', () => {
    template.resourceCountIs('AWS::Lambda::Function', 1);
  });
});
