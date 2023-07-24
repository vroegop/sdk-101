import { SendMessageCommandInput } from '@aws-sdk/client-sqs/dist-types/commands/SendMessageCommand';

const { unmarshall } = require('@aws-sdk/util-dynamodb');
import { SendMessageCommand, SQSClient } from '@aws-sdk/client-sqs';

const queueUrl = process.env.SQS_QUEUE_URL;
const sqsClient = new SQSClient({});

export const handler = async (streamData: any) => {
  const sqsMessages = streamData.Records.map((record: any) => {
    const eventId = record.eventID;
    const data = unmarshall(record.dynamodb.NewImage);
    const messageGroupId = data.gameId;

    const messageInput: SendMessageCommandInput = {
      QueueUrl: queueUrl,
      MessageAttributes: data,
      MessageBody: `Updates for the dartgame ${eventId}: ${data.eventType}`,
      MessageGroupId: messageGroupId,
      MessageDeduplicationId: eventId,
    };

    return messageInput;
  });

  return sqsMessages.map(async (message: SendMessageCommandInput) => {
    console.log('Sending message: ', message);
    return sqsClient.send(new SendMessageCommand(message))
      .then(response => console.log('Successfully send message: ', response))
      .catch(err => console.log('An error occured: ', err));
  })
};
