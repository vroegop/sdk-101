import { RemovalPolicy, Stack, StackProps } from 'aws-cdk-lib';
import { Construct } from 'constructs';
import { Code, Function, Runtime, StartingPosition } from 'aws-cdk-lib/aws-lambda';
import { UserPool, UserPoolClient } from 'aws-cdk-lib/aws-cognito';
import { CognitoUserPoolsAuthorizer, Cors, LambdaRestApi } from 'aws-cdk-lib/aws-apigateway';
import { Certificate } from 'aws-cdk-lib/aws-certificatemanager';
import { AttributeType, BillingMode, StreamViewType, Table } from 'aws-cdk-lib/aws-dynamodb';
import { Effect, PolicyStatement } from 'aws-cdk-lib/aws-iam';
import { RetentionDays } from 'aws-cdk-lib/aws-logs';

interface IDartsBackendStackProps extends StackProps {
  cognitoUserPool: UserPool;
  cognitoUserPoolClient: UserPoolClient;
  apiCertificate: Certificate;
}

export class DartsBackendCommandStack extends Stack {

  public api: LambdaRestApi;
  public dartsEventTable: Table;

  constructor(scope: Construct, id: string, props: IDartsBackendStackProps) {
    super(scope, id, props);

    // This is a setting that allows us to couple the API and Cognito to enforce authentication on the API call
    const auth = new CognitoUserPoolsAuthorizer(this, 'dartsBackendCommandsCognitoUserPoolAuthorizer', {
      cognitoUserPools: [ props.cognitoUserPool ],
      authorizerName: 'dartsBackendCommandsCognitoUserPoolAuthorizer'
    });

    // Create a DynamoDB table
    this.dartsEventTable = new Table(this, 'DartsEventTable', {
      tableName: 'DartsEventTable',
      partitionKey: {
        name: 'gameId',
        type: AttributeType.STRING,
      },
      sortKey: {
        name: 'timestamp',
        type: AttributeType.STRING,
      },
      billingMode: BillingMode.PAY_PER_REQUEST,
      removalPolicy: RemovalPolicy.DESTROY,
      deletionProtection: false,
      stream: StreamViewType.NEW_IMAGE,
    });

    // Create a Global Secondary Index (GSI) on 'playerId'
    this.dartsEventTable.addGlobalSecondaryIndex({
      indexName: 'PlayerIdIndex',
      partitionKey: {
        name: 'playerId',
        type: AttributeType.STRING,
      },
    });

    // This is the commandHandlerLambda we are trying to protect. It receives the API call from the API Gateway if authentication succeeds.
    const commandHandlerLambda = new Function(this, 'dartsBackendCommandsLambda', {
      functionName: 'commandLambda',
      // Deploys the local folder to the commandHandlerLambda function
      code: Code.fromAsset(`lambda/commandHandler`),
      runtime: Runtime.NODEJS_18_X,
      // file index.ts method handler
      handler: 'index.handler',
      environment: {
        EVENT_SOURCE_TABLE_NAME: this.dartsEventTable.tableName,
      },
      logRetention: RetentionDays.ONE_DAY
    });

    // Policy for the commandHandlerLambda to access DynamoDB
    commandHandlerLambda.addToRolePolicy(new PolicyStatement({
      effect: Effect.ALLOW,
      actions: [ 'dynamodb:PutItem' ], // Specify the actions you want to allow
      resources: [ this.dartsEventTable.tableArn ], // Specify the ARN of the DynamoDB table
    }));

    // The actual API Gateway (LambdaRestApi has default settings to make life easier, we could have used `new RestApi`)
    this.api = new LambdaRestApi(this, 'dartsBackendCommandsAPI', {
      handler: commandHandlerLambda,
      proxy: true,
      domainName: {
        domainName: 'darts.cloud101.nl',
        certificate: props.apiCertificate,
      },
      defaultCorsPreflightOptions: {
        allowOrigins: Cors.ALL_ORIGINS, // Add other allowed origins if needed
        allowMethods: [ 'POST' ], // Add other allowed methods if needed
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
    commandHandlerLambda.applyRemovalPolicy(RemovalPolicy.DESTROY);
    this.api.applyRemovalPolicy(RemovalPolicy.DESTROY);
  }
}
