import { SendMessageCommandInput } from '@aws-sdk/client-sqs/dist-types/commands/SendMessageCommand';
import { unmarshall } from '@aws-sdk/util-dynamodb';
import { SendMessageCommand, SQSClient } from '@aws-sdk/client-sqs';
import { DynamoDBStreamEvent } from 'aws-lambda';

export class DartsEventProcessor {
  private sqsClient: SQSClient;
  private queueUrl: string;

  constructor() {
    if (!process.env.SQS_QUEUE_URL) {
      throw new Error('No SQS Queue URL in the environment variables.');
    }

    this.queueUrl = process.env.SQS_QUEUE_URL;
    this.sqsClient = new SQSClient({});
  }

  private createSQSMessages(streamData: DynamoDBStreamEvent): SendMessageCommandInput[] {
    return streamData.Records.map((record: Record<string, any>) => {
      const data: DartsEvent = unmarshall(record.dynamodb.NewImage) as DartsEvent;

      const message: SendMessageCommandInput = {
        QueueUrl: this.queueUrl,
        MessageBody: `${JSON.stringify(data)}`,
        MessageGroupId: data.gameId,
        MessageDeduplicationId: record.eventID,
        MessageAttributes: {
          eventType: {
            DataType: 'String',
            StringValue: data.event.eventType
          }
        }
      };

      return message;
    });
  }

  private async sendMessageToSQS(message: SendMessageCommandInput): Promise<void> {
    try {
      const response = await this.sqsClient.send(new SendMessageCommand(message));
      console.log('Successfully sent message to SQS queue: ', response);
    } catch (err) {
      console.error('Error, cannot send message to SQS queue: ', err);
    }
  }

  public process(streamData: DynamoDBStreamEvent): Promise<void>[] {
    const sqsMessages = this.createSQSMessages(streamData);
    return sqsMessages.map((message) => this.sendMessageToSQS(message));
  }
}

const processor = new DartsEventProcessor();
export const handler = (streamData: DynamoDBStreamEvent) => Promise.all(processor.process(streamData));
