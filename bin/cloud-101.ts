#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import { DartsBackendCommandStack } from '../lib/darts-backend-command-stack';
import { DartsCloudfrontCertificateStack } from '../lib/darts-cloudfront-certificate-stack';
import { DartsFrontendStack } from '../lib/darts-frontend-stack';
import { DartsAuthenticationStack } from '../lib/darts-authentication-stack';
import { DartsAPICertificateStack } from '../lib/darts-api-certificate-stack';
import { DartsEventProjectionStack } from '../lib/darts-event-projection-stack';
import { DartsDynamodbToSqsStack } from '../lib/darts-dynamodb-to-sqs-stack';

const app = new cdk.App();

const cloudfrontCertificateStack = new DartsCloudfrontCertificateStack(app, 'dartsCloudfrontCertificateStack', {
  env: { region: 'us-east-1', account: '531843824238' },
});

const apiCertificateStack = new DartsAPICertificateStack(app, 'dartsAPICertificateStack', {
  env: { region: 'us-west-2', account: '531843824238' },
});

const authenticationStack = new DartsAuthenticationStack(app, 'dartsAuthenticationStack', {
  env: { region: 'us-west-2', account: '531843824238' },
});

const commandStack = new DartsBackendCommandStack(app, 'dartsBackendStack', {
  env: { region: 'us-west-2', account: '531843824238' },
  cognitoUserPool: authenticationStack.cognitoUserPool,
  cognitoUserPoolClient: authenticationStack.cognitoUserPoolClient,
  apiCertificate: apiCertificateStack.apiCertificate,
});

const dynamodbToSqsStack = new DartsDynamodbToSqsStack(app, 'DartsDynamodbToSqsStack', {
  env: { region: 'us-west-2', account: '531843824238' },
  dartsEventTable: commandStack.dartsEventTable
});

const eventProjectionStack = new DartsEventProjectionStack(app, 'dartsEventProjectionStack', {
  env: { region: 'us-west-2', account: '531843824238' },
  dartsEventQueue: dynamodbToSqsStack.dartsEventSqsQueue
});

const frontendStack = new DartsFrontendStack(app, 'dartsFrontendStack', {
  env: { region: 'us-west-2', account: '531843824238' },
  cloudfrontCertificate: cloudfrontCertificateStack.cloudfrontCertificate,
  crossRegionReferences: true,
  commandApi: commandStack.api
});
