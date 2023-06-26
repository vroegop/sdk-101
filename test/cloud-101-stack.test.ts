import { Template } from 'aws-cdk-lib/assertions';
import { CognitoApigatewayLambdaStack } from '../lib/cognito-apigateway-lambda-stack';
import { App } from 'aws-cdk-lib';

describe('Test the Cloud101Stack', () => {
  let app: App;
  let stack: CognitoApigatewayLambdaStack;
  let template: Template;

  beforeEach(() => {
    app = new App();
    stack = new CognitoApigatewayLambdaStack(app, 'MyTestStack', { env: { region: 'us-west-2', account: '531843824238' } });
    template = Template.fromStack(stack);
  });

  test('Test if the lambda is created', () => {
    template.resourceCountIs('AWS::Lambda::Function', 1);
  });
});
