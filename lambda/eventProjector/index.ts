const { unmarshall } = require('@aws-sdk/util-dynamodb');
import { SendMessageCommand, SQSClient } from '@aws-sdk/client-sqs';

const queueUrl = process.env.SQS_QUEUE_URL;
const sqsClient = new SQSClient({});

export const handler = async (streamData: any) => {
  streamData.Records.forEach((record: any) => {
    const eventId = record.eventID;
    const data = unmarshall(record.dynamodb.NewImage);
    const messageGroupId = data.gameId;

    const message = new SendMessageCommand({
      QueueUrl: queueUrl,
      MessageAttributes: data,
      MessageBody: `Updates for the dartgame ${eventId}: ${data.eventType}`,
      MessageGroupId: messageGroupId,
      MessageDeduplicationId: eventId,
    });

    sqsClient.send(message)
      .then(response => console.log('Successfully send message: ', response))
      .catch(err => console.log('An error occured: ', err));
  });
};
