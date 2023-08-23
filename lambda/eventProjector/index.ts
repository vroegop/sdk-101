import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, PutCommand, QueryCommand } from '@aws-sdk/lib-dynamodb';
import { SQSEvent } from 'aws-lambda';
import { SQSRecord } from 'aws-lambda/trigger/sqs';

class GameHandler {
  private tableName: string;
  private client: DynamoDBClient;
  private dynamo: DynamoDBDocumentClient;

  constructor() {
    if (!process.env.PROJECTION_TABLE_NAME) {
      throw new Error('No event source table name found in the environment variables');
    }

    this.tableName = process.env.PROJECTION_TABLE_NAME;
    this.client = new DynamoDBClient({});
    this.dynamo = DynamoDBDocumentClient.from(this.client, { marshallOptions: { removeUndefinedValues: true } });
  }

  async handleGameEvent(record: SQSRecord) {
    console.log(JSON.stringify(record));
    const { gameId, timestamp, hostId, event } = JSON.parse(record.body) as DartsEvent;
    const { eventType } = event;

    const gameData = await this.queryGame(gameId, hostId);

    const errorGameAlreadyFinished = gameData?.state.status === 'finished';
    const errorGameAlreadyStarted = !!gameData && eventType === 'start-game';
    const startNewGame = !gameData && eventType === 'start-game';
    const throwDarts = !!gameData && eventType === 'throw-darts';

    if (errorGameAlreadyStarted) {
      console.warn('Game already started, ignoring event');
    } else if (errorGameAlreadyFinished) {
      console.warn('Game already finished, ignoring event');
    } else if (startNewGame) {
      const game: Game = {
        gameId: gameId,
        startTime: timestamp,
        hostId,
        state: {
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
          }
        }
      };
      await this.putGame(game);
      console.info('New game created');
    } else if (throwDarts) {
      await this.updateGame(gameData, event);
      console.info('Existing game updated');
    }
  }

  async queryGame(gameId: string, hostId: string) {
    const params = {
      TableName: this.tableName,
      KeyConditionExpression: 'gameId = :gameIdVal AND hostId = :hostIdVal',
      ExpressionAttributeValues: {
        ':gameIdVal': gameId,
        ':hostIdVal': hostId,
      },
      Limit: 1,
    };

    const data = await this.dynamo.send(new QueryCommand(params));
    return data.Items?.[ 0 ] as Game | undefined;
  }

  async putGame(game: Game) {
    const putParams = {
      TableName: this.tableName,
      Item: game,
    };

    await this.dynamo.send(new PutCommand(putParams));
  }

  async updateGame(gameData: Game, event: EventThrowDarts) {
    const player = gameData.state[ event.player as 'player1' | 'player2' ];
    const newThrows = [ +event.score.dart1, +event.score.dart2, +event.score.dart3 ];
    const newScore = newThrows.reduce((a, b) => a + b, 0);

    const totalScore = player.total + newScore;

    if (this.isExactScore(gameData, totalScore)) {
      player.throws.push(...newThrows);
      player.total += newThrows.reduce((a, b) => a + b, 0);
      gameData.state.status = 'finished';
    } else if (this.isOverScoring(gameData, totalScore)) {
      player.throws.push(...newThrows);
      // Add scores to list or throws for historical reasons but don't update total
    } else {
      player.throws.push(...newThrows);
      player.total += newThrows.reduce((a, b) => a + b, 0);
    }

    await this.putGame(gameData);
  }

  isOverScoring(gameData: Game, totalScore: number) {
    return (gameData.state.gameType === 'start-301' && totalScore > 301) || (gameData.state.gameType === 'start-501' && totalScore > 501);
  }

  isExactScore(gameData: Game, totalScore: number) {
    return (gameData.state.gameType === 'start-301' && totalScore === 301) || (gameData.state.gameType === 'start-501' && totalScore === 501);
  }
}

const gameHandler = new GameHandler();
export const handler = async (streamData: SQSEvent) => await Promise.all(streamData.Records.map((gameEvent: any) => gameHandler.handleGameEvent(gameEvent)));
