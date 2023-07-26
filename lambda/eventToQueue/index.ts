import { SendMessageCommandInput } from '@aws-sdk/client-sqs/dist-types/commands/SendMessageCommand';

const { unmarshall } = require('@aws-sdk/util-dynamodb');
import { SendMessageCommand, SQSClient } from '@aws-sdk/client-sqs';

const queueUrl = process.env.SQS_QUEUE_URL;
const sqsClient = new SQSClient({});

export const handler = (streamData: any) => {
  const sqsMessages = streamData.Records.map((record: any) => {
    const data = unmarshall(record.dynamodb.NewImage);
    const eventId = record.eventID;
    const messageGroupId = data.gameId;

    const messageInput: SendMessageCommandInput = {
      QueueUrl: queueUrl,
      MessageBody: `${JSON.stringify(data)}`,
      MessageGroupId: messageGroupId,
      MessageDeduplicationId: eventId,
      MessageAttributes: {
        eventType: {
          DataType: 'String',
          StringValue: data.event.eventType
        }
      }
    };

    return messageInput;
  });

  return sqsMessages.map((message: SendMessageCommandInput) => {
    console.log('Sending message: ', message);
    return sqsClient.send(new SendMessageCommand(message))
      .then(response => console.log('Successfully send message: ', response))
      .catch(err => console.log('An error occured: ', err));
  })
};
