import { RemovalPolicy, Stack, StackProps } from 'aws-cdk-lib';
import { Construct } from 'constructs';
import { AttributeType, BillingMode, Table } from 'aws-cdk-lib/aws-dynamodb';
import { Queue } from 'aws-cdk-lib/aws-sqs';
import { Code, Function, Runtime } from 'aws-cdk-lib/aws-lambda';
import { SqsEventSource } from 'aws-cdk-lib/aws-lambda-event-sources';

interface IDartsEventProjectionStackProps extends StackProps {
  dartsEventQueue: Queue;
}

export class DartsEventProjectionStack extends Stack {

  public dartsProjectionTable: Table;

  constructor(scope: Construct, id: string, props: IDartsEventProjectionStackProps) {
    super(scope, id, props);

    // Create a DynamoDB table
    this.dartsProjectionTable = new Table(this, 'DartsProjectionTable', {
      tableName: 'DartsProjectionTable',
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
    });

    const eventProjectionLambda = new Function(this, 'eventProjectionLambda', {
      functionName: 'eventProjectionLambda',
      runtime: Runtime.NODEJS_18_X,
      handler: 'index.handler',
      code: Code.fromAsset('lambda/eventProjector'),
      environment: {
        EVENT_SOURCE_TABLE_NAME: this.dartsProjectionTable.tableName,
      }
    });

    this.dartsProjectionTable.grantReadWriteData(eventProjectionLambda);
    props.dartsEventQueue.grantSendMessages(eventProjectionLambda);

    eventProjectionLambda.addEventSource(new SqsEventSource(props.dartsEventQueue));
  }
}
