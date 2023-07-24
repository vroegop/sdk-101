import { Code, Function, Runtime, StartingPosition } from 'aws-cdk-lib/aws-lambda';
import { DynamoEventSource } from 'aws-cdk-lib/aws-lambda-event-sources';
import { Duration, Stack, StackProps } from 'aws-cdk-lib';
import { Queue } from 'aws-cdk-lib/aws-sqs';
import { Table } from 'aws-cdk-lib/aws-dynamodb';
import { Construct } from 'constructs';

interface IDartsEventStreamProps extends StackProps {
  dartsEventTable: Table;
}

export class DartsDynamodbToSqsStack extends Stack {

  public dartsEventSqsQueue: Queue;

  constructor(scope: Construct, id: string, props: IDartsEventStreamProps) {
    super(scope, id, props);

    this.dartsEventSqsQueue = new Queue(this, 'dartsEventQueue', {
      queueName: 'dartsEventQueue.fifo',
      visibilityTimeout: Duration.seconds(30), // Adjust as needed
      fifo: true, // Enable FIFO queue to use message groups
    });

    // Create a Lambda function to handle the DynamoDB stream events
    const lambdaFunction = new Function(this, 'dartsDynamodbEventToSqsLambda', {
      functionName: 'dartsDynamodbEventToSqsLambda',
      code: Code.fromAsset(`lambda/eventToQueue`),
      runtime: Runtime.NODEJS_18_X,
      handler: 'index.handler',
      environment: {
        SQS_QUEUE_URL: this.dartsEventSqsQueue.queueUrl,
      }
    });

    props.dartsEventTable.grantReadData(lambdaFunction);
    const eventSource = new DynamoEventSource(props.dartsEventTable, {
      startingPosition: StartingPosition.LATEST
    });
    lambdaFunction.addEventSource(eventSource);
  }
}
