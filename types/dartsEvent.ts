interface PlayerScore {
  dart1: string;
  dart2: string;
  dart3: string;
}

interface Players {
  player1: string;
  player2: string;
}

interface EventStartGame {
  eventType: 'start-game';
  players: Players;
  gameType: 'start-301' | 'start-501';
}

interface EventThrowDarts {
  eventType: 'throw-darts';
  player: string;
  score: PlayerScore;
}

type GameEvent = EventStartGame | EventThrowDarts;

interface DartsEvent {
  gameId: string;
  timestamp: string;
  hostId: string;
  event: GameEvent;
}
