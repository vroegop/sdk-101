import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, PutCommand } from '@aws-sdk/lib-dynamodb';
import { APIGatewayEvent } from 'aws-lambda';

class DartsCommandHandler {
  private tableName: string;
  private client: DynamoDBClient;
  private dynamo: DynamoDBDocumentClient;

  constructor() {
    if (!process.env.EVENT_SOURCE_TABLE_NAME) {
      throw new Error('No event source table name found in the environment variables');
    }

    this.tableName = process.env.EVENT_SOURCE_TABLE_NAME;
    this.client = new DynamoDBClient({});
    this.dynamo = DynamoDBDocumentClient.from(this.client, { marshallOptions: { removeUndefinedValues: true } });
  }

  async handleDartsCommand(request: APIGatewayEvent) {
    const headers = { 'Content-Type': 'application/json' };

    try {
      if (!request.body) {
        throw new Error('Expected a darts command, instead no data is received');
      }
      const requestBody = JSON.parse(request.body);
      const dartsEvent = requestBody.command;

      await this.dynamo.send(
        new PutCommand({
          TableName: this.tableName,
          Item: JSON.parse(JSON.stringify(dartsEvent)),
        })
      );

      return {
        statusCode: 200,
        body: `{ "result": "Successfully executed ${dartsEvent.event.eventType} for game ${dartsEvent.gameId}"}`,
        headers
      };
    } catch (err) {
      return {
        statusCode: 400,
        body: JSON.stringify(err),
        headers
      };
    }
  }
}


const eventHandler = new DartsCommandHandler();
export const handler = (request: APIGatewayEvent) => eventHandler.handleDartsCommand(request);
