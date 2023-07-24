import { CfnOutput, RemovalPolicy, Stack, StackProps } from 'aws-cdk-lib';
import { Construct } from 'constructs';
import { Code, Function, Runtime } from 'aws-cdk-lib/aws-lambda';
import { UserPool, UserPoolClient, UserPoolEmail } from 'aws-cdk-lib/aws-cognito';
import { CognitoUserPoolsAuthorizer, Cors, LambdaRestApi } from 'aws-cdk-lib/aws-apigateway';
import { HostedZone } from 'aws-cdk-lib/aws-route53';
import { Certificate, CertificateValidation } from 'aws-cdk-lib/aws-certificatemanager';

interface StackPropsWithCognito extends StackProps {
  cognitoUserPool: UserPool;
  cognitoUserPoolClient: UserPoolClient;
}

export class DartsBackendStack extends Stack {

  public api: LambdaRestApi;

  constructor(scope: Construct, id: string, props: StackPropsWithCognito) {
    super(scope, id, props);

    const hostedZone = HostedZone.fromLookup(this, 'cloud101HostedZone', {
      domainName: 'cloud101.nl'
    });

    const apiCertificate = new Certificate(this, 'dartsBackendCertificate', {
      domainName: 'darts.cloud101.nl',
      certificateName: 'dartsAPICertificate',
      validation: CertificateValidation.fromDns(hostedZone)
    });

    // This is a setting that allows us to couple the API and Cognito to enforce authentication on the API call
    const auth = new CognitoUserPoolsAuthorizer(this, 'dartsBackendCommandsCognitoUserPoolAuthorizer', {
      cognitoUserPools: [ props.cognitoUserPool ],
      authorizerName: 'dartsBackendCommandsCognitoUserPoolAuthorizer'
    });

    // This is the lambda we are trying to protect. It receives the API call from the API Gateway if authentication succeeds.
    const lambda = new Function(this, 'dartsBackendCommandsLambda', {
      functionName: 'commandLambda',
      // Deploys the local folder to the lambda function
      code: Code.fromAsset(`lambda`),
      runtime: Runtime.NODEJS_18_X,
      // file index.ts method handler
      handler: 'index.handler',
    });

    // The actual API Gateway (LambdaRestApi has default settings to make life easier, we could have used `new RestApi`)
    this.api = new LambdaRestApi(this, 'dartsBackendCommandsAPI', {
      handler: lambda,
      proxy: true,
      domainName: {
        domainName: 'darts.cloud101.nl',
        certificate: apiCertificate,
      },
      defaultCorsPreflightOptions: {
        allowOrigins: Cors.ALL_ORIGINS, // Add other allowed origins if needed
        allowMethods: Cors.ALL_METHODS, // Add other allowed methods if needed
        allowHeaders: [ '*' ], // Add other allowed headers if needed
        allowCredentials: true
      },
      defaultMethodOptions: {
        authorizer: auth,
        authorizationType: auth.authorizationType
      }
    });

    // destroy everything on stack removal (cognito pool requires extra removal settings, see construct)
    auth.applyRemovalPolicy(RemovalPolicy.DESTROY);
    lambda.applyRemovalPolicy(RemovalPolicy.DESTROY);
    this.api.applyRemovalPolicy(RemovalPolicy.DESTROY);

    // output variables from cdk (for human consumption)
    const url = new CfnOutput(this, 'API Endpoint', { value: this.api.url });
  }
}
