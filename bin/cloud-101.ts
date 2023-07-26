#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import { DartsCommandStack } from '../lib/darts-command-stack';
import { DartsCertificateCloudfrontStack } from '../lib/darts-certificate-cloudfront-stack';
import { DartsFrontendStack } from '../lib/darts-frontend-stack';
import { DartsCognitoStack } from '../lib/darts-cognito-stack';
import { DartsCertificateApiStack } from '../lib/darts-certificate-api-stack';
import { DartsEventProjectionStack } from '../lib/darts-event-projection-stack';

const app = new cdk.App();

const cloudfrontCertificateStack = new DartsCertificateCloudfrontStack(app, 'dartsCloudfrontCertificateStack', {
  env: { region: 'us-east-1', account: '531843824238' },
});

const apiCertificateStack = new DartsCertificateApiStack(app, 'dartsAPICertificateStack', {
  env: { region: 'eu-west-1', account: '531843824238' },
});

const authenticationStack = new DartsCognitoStack(app, 'dartsAuthenticationStack', {
  env: { region: 'eu-west-1', account: '531843824238' },
});

const commandStack = new DartsCommandStack(app, 'dartsBackendStack', {
  env: { region: 'eu-west-1', account: '531843824238' },
  cognitoUserPool: authenticationStack.cognitoUserPool,
  cognitoUserPoolClient: authenticationStack.cognitoUserPoolClient,
  apiCertificate: apiCertificateStack.apiCertificate,
});

const dynamodbToSqsStack = new DartsEventProjectionStack(app, 'DartsDynamodbToSqsStack', {
  env: { region: 'eu-west-1', account: '531843824238' },
  dartsEventTable: commandStack.dartsEventTable
});

const frontendStack = new DartsFrontendStack(app, 'dartsFrontendStack', {
  env: { region: 'eu-west-1', account: '531843824238' },
  cloudfrontCertificate: cloudfrontCertificateStack.cloudfrontCertificate,
  crossRegionReferences: true,
  commandApi: commandStack.api
});
