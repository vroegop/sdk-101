const { DynamoDBClient } = require("@aws-sdk/client-dynamodb");
import { DynamoDBDocumentClient, PutCommand } from '@aws-sdk/lib-dynamodb';
const { unmarshall } = require("@aws-sdk/util-dynamodb");

const tableName = process.env.PROJECTION_TABLE_NAME;
const client = new DynamoDBClient({});
const dynamo = DynamoDBDocumentClient.from(client);

export const handler = async (event: any) => {
  event.Records.forEach((record: any) => {

    const event = unmarshall(record.dynamodb.NewImage);

    console.log('Event Id: %s', record.eventID);
    console.log('DynamoDB Record: %j', event);

    dynamo.send(
      new PutCommand({
        TableName: tableName,
        Item: JSON.parse(JSON.stringify(record.dynamodb)),
      })
    );
  });
};
