import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, PutCommand } from '@aws-sdk/lib-dynamodb';

const tableName = process.env.EVENT_SOURCE_TABLE_NAME;
const client = new DynamoDBClient({});
const dynamo = DynamoDBDocumentClient.from(client);

export const handler = async (requestBody: any) => {
  const headers = { 'Content-Type': 'application/json' };

  try {
    const requestJSON = JSON.parse(requestBody.body);
    const dartsEvent = requestJSON.command;

    await dynamo.send(
      new PutCommand({
        TableName: tableName,
        Item: JSON.parse(JSON.stringify(dartsEvent)),
      })
    );

    return {
      statusCode: 200,
      body: `{ "result": "Successfully executed ${dartsEvent.eventType}"}`,
      headers
    };
  } catch (err) {
    return {
      statusCode: 400,
      body: JSON.stringify(err),
      headers
    };
  }
};
