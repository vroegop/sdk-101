interface Player {
  name: string;
  total: number;
  throws: number[];
}

interface Game {
  readonly gameId: string;
  readonly startTime: string;
  readonly hostId: string;
  state: {
    status: 'started' | 'finished';
    gameType: 'start-301' | 'start-501';
    player1: Player;
    player2: Player;
  };
}
