import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, PutCommand, QueryCommand } from '@aws-sdk/lib-dynamodb';

const tableName = process.env.PROJECTION_TABLE_NAME;
const client = new DynamoDBClient({});
const dynamo = DynamoDBDocumentClient.from(client, {
  marshallOptions: {
    removeUndefinedValues: true,
  }
});

interface Game {
  gameId: string,
  startTime: string,
  hostId: string,
  game: {
    status: 'started' | 'finished',
    gameType: 'start-301' | 'start-501',
    player1: {
      name: string,
      total: number,
      throws: number[],
    },
    player2: {
      name: string,
      total: number,
      throws: number[],
    },
  }
}

export const handler = async (streamData: any) => {
  const { Records } = streamData;

  const promises = Records.map(async (record: any) => {
    const { gameId, timestamp, hostId, event } = JSON.parse(record.body);
    const { eventType } = event;

    try {
      // Query the DynamoDB table using the gameId as the primary key
      const params = {
        TableName: tableName,
        KeyConditionExpression: 'gameId = :gameIdVal AND hostId = :hostIdVal',
        ExpressionAttributeValues: {
          ':gameIdVal': gameId,
          ':hostIdVal': hostId,
        },
        Limit: 1, // Assuming gameId is unique, so we only need one result
      };

      const data = await dynamo.send(new QueryCommand(params));
      const gameData = data.Items?.[ 0 ] as Game; // Get the first item if available

      if (!gameData && eventType === 'start-game') {
        // If gameData does not exist, perform a conditional write to insert the new item
        const game: Game = {
          gameId,
          startTime: timestamp,
          hostId,
          game: {
            status: 'started',
            gameType: event.gameType,
            player1: {
              name: event.players.player1,
              total: 0,
              throws: [],
            },
            player2: {
              name: event.players.player2,
              total: 0,
              throws: [],
            },
          }
        };

        const putParams = {
          TableName: tableName,
          Item: game,
        };

        await dynamo.send(new PutCommand(putParams));
        console.info('Data inserted successfully:', putParams.Item);
      } else {
        // Data already exists, update the existing item with the new score and timestamp
        if (eventType === 'start-game') {
          console.warn('Game already started, ignoring event');
        } else if (eventType === 'throw-darts') {
          if (gameData.game.status === 'finished') {
            console.warn('Game already finished, ignoring event');
          }

          const currentTotal = +gameData.game[ event.player as 'player1' | 'player2' ].total;
          const newThrows = [ +event.score.dart1, +event.score.dart2, +event.score.dart3 ];
          const newThrowsTotal = newThrows.reduce((acc, curr) => acc + curr, 0);
          const newTotal = currentTotal + newThrowsTotal;

          if (newTotal > 501 || (gameData.game.gameType === 'start-301' && newTotal > 301)) {
            // Invalid score, no throws added to the total, we add three 0 just for show.
            gameData.game[ event.player as 'player1' | 'player2' ].throws.push(0, 0, 0);
          } else {
            gameData.game[ event.player as 'player1' | 'player2' ].throws.push(...newThrows);
            gameData.game[ event.player as 'player1' | 'player2' ].total = newTotal;

            if (newTotal === 501 || (gameData.game.gameType === 'start-301' && newTotal === 301)) {
              gameData.game.status = 'finished';
            }
          }
        }

        const putParams = {
          TableName: tableName,
          Item: gameData,
        };

        await dynamo.send(new PutCommand(putParams));
        console.info('Data updated successfully:', putParams);
      }

    } catch (error) {
      console.error('Error querying DynamoDB:', error);
    }
  });

  await Promise.all(promises);
};
