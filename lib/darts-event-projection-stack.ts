import { Code, Function, Runtime, StartingPosition } from 'aws-cdk-lib/aws-lambda';
import { DynamoEventSource, SqsEventSource } from 'aws-cdk-lib/aws-lambda-event-sources';
import { AssetHashType, Duration, RemovalPolicy, Stack, StackProps } from 'aws-cdk-lib';
import { Queue } from 'aws-cdk-lib/aws-sqs';
import { AttributeType, BillingMode, Table } from 'aws-cdk-lib/aws-dynamodb';
import { Construct } from 'constructs';

interface IDartsEventStreamProps extends StackProps {
  dartsEventTable: Table;
}

export class DartsEventProjectionStack extends Stack {

  constructor(scope: Construct, id: string, props: IDartsEventStreamProps) {
    super(scope, id, props);

    const dartsEventSqsQueue = new Queue(this, 'dartsEventQueue', {
      queueName: 'dartsEventQueue.fifo',
      visibilityTimeout: Duration.seconds(30),
      fifo: true, // Enable FIFO queue to use message groups
      removalPolicy: RemovalPolicy.DESTROY,
      deadLetterQueue: {
        queue: new Queue(this, 'dartsEventQueue.deadLetterQueue', {
          queueName: 'dartsEventQueue-deadLetterQueue.fifo',
          fifo: true, // Enable FIFO queue to use message groups
          removalPolicy: RemovalPolicy.DESTROY,
        }), maxReceiveCount: 10
      }
    });

    // Create a Lambda function to handle the DynamoDB stream events
    const dartsDynamodbEventToSqsLambda = new Function(this, 'dartsDynamodbEventToSqsLambda', {
      functionName: 'darts-dynamodbEventToSqsLambda',
      description: `Triggered by DynamoDB DartsEventTable stream events and pushes them to SQS for FiFO handling. Deployed at ${new Date().toISOString()}`,
      code: Code.fromAsset(`lambda/eventToQueue`, { assetHash: AssetHashType.SOURCE }),
      runtime: Runtime.NODEJS_18_X,
      handler: 'index.handler',
      environment: {
        SQS_QUEUE_URL: dartsEventSqsQueue.queueUrl,
      },
    });

    // Create a DynamoDB table
    const dartsProjectionTable = new Table(this, 'DartsGameProjectionTable', {
      tableName: 'DartsGameProjectionTable',
      partitionKey: {
        name: 'gameId',
        type: AttributeType.STRING,
      },
      sortKey: {
        name: 'hostId',
        type: AttributeType.STRING,
      },
      billingMode: BillingMode.PAY_PER_REQUEST,
      removalPolicy: RemovalPolicy.DESTROY,
      deletionProtection: false,
    });

    const eventProjectionLambda = new Function(this, 'eventProjectionLambda', {
      functionName: 'darts-eventProjectionLambda',
      description: `Lambda to project events into the DartsProjectionTable. It is triggered by SQS messages. Deployed at ${new Date().toISOString()}`,
      runtime: Runtime.NODEJS_18_X,
      handler: 'index.handler',
      code: Code.fromAsset('lambda/eventProjector'),
      environment: {
        PROJECTION_TABLE_NAME: dartsProjectionTable.tableName,
      }
    });

    dartsDynamodbEventToSqsLambda.applyRemovalPolicy(RemovalPolicy.DESTROY);
    eventProjectionLambda.applyRemovalPolicy(RemovalPolicy.DESTROY);

    dartsProjectionTable.grantReadWriteData(eventProjectionLambda);
    dartsEventSqsQueue.grantSendMessages(dartsDynamodbEventToSqsLambda);

    dartsDynamodbEventToSqsLambda.addEventSource(new DynamoEventSource(props.dartsEventTable, { startingPosition: StartingPosition.TRIM_HORIZON }));
    eventProjectionLambda.addEventSource(new SqsEventSource(dartsEventSqsQueue));
  }
}
