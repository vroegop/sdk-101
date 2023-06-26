import { CfnOutput, RemovalPolicy, Stack, StackProps } from 'aws-cdk-lib';
import { Construct } from 'constructs';
import { CognitoToApiGatewayToLambda } from '@aws-solutions-constructs/aws-cognito-apigateway-lambda';
import { Code, Runtime } from 'aws-cdk-lib/aws-lambda';
import { UserPoolEmail } from 'aws-cdk-lib/aws-cognito';
import { Cors } from 'aws-cdk-lib/aws-apigateway';

export class CognitoApigatewayLambdaStack extends Stack {
  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props);

    // npm i @aws-solutions-constructs/aws-cognito-apigateway-lambda
    // https://docs.aws.amazon.com/solutions/latest/constructs/aws-cognito-apigateway-lambda.html
    const construct = new CognitoToApiGatewayToLambda(this, 'test-cognito-apigateway-lambda', {
      lambdaFunctionProps: {
        functionName: 'serverlessAPIExampleLambdaFunction',
        // Deploys the local folder to the lambda function
        code: Code.fromAsset(`lambda`),
        runtime: Runtime.NODEJS_18_X,
        // file index.ts method handler
        handler: 'index.handler',
      },
      apiGatewayProps: {
        // Allows all method calls to go directly to the lambda integration
        proxy: true,
        restApiName: 'serverlessAPIExampleApiGateway',
        // No authentication required to validate OPTIONS requests
        AddDefaultAuthorizerToCorsPreflight: false,
        // Localhost testing
        defaultCorsPreflightOptions: {
          allowOrigins: Cors.ALL_ORIGINS,
          allowMethods: Cors.ALL_METHODS
        }
      },
      cognitoUserPoolProps: {
        userPoolName: 'serverlessAPIExampleUserPool',
        selfSignUpEnabled: true,
        // If you add email, the username can no longer be an email because the email address will become an alias.
        signInAliases: {
          username: true
        },
        // This doesn't directly verify emails, but sends an email with the verification code automatically.
        // Sounds weird but it's the default behavior.
        autoVerify: {
          email: true
        },
        // This is scary, dev only! You will delete your users on deletion.
        deletionProtection: false,
        removalPolicy:  RemovalPolicy.DESTROY,
        passwordPolicy: {
          minLength: 8,
          requireLowercase: true,
          requireDigits: false,
          requireSymbols: false,
          requireUppercase: true
        },
        // Important setting!
        // Setting this to true will cause production issues unless you have ultra smart users or .toLowerCase() everywhere!
        // The problem here is account recovery will only work if you use the right uppercase for email/username too and that's hard to
        // remember. The default value is true but I submitted a PR to change this to false.
        signInCaseSensitive: false,
        email: UserPoolEmail.withCognito('randy.vroegop@luminis.eu'),
      },
      cognitoUserPoolClientProps: {
        authFlows: {
          adminUserPassword: true,
          custom: false,
          userPassword: true,
          userSrp: false
        },
      }
    });

    construct.apiGateway.applyRemovalPolicy(RemovalPolicy.DESTROY);
    construct.lambdaFunction.applyRemovalPolicy(RemovalPolicy.DESTROY);
    construct.userPoolClient.applyRemovalPolicy(RemovalPolicy.DESTROY);

    // output variables from cdk
    const url = new CfnOutput(this, 'API Endpoint', { value: construct.apiGateway.url });
    const userPoolClientId = new CfnOutput(this, 'User Pool Client ID', { value: construct.userPoolClient.userPoolClientId });
  }
}
