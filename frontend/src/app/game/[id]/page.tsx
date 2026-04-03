'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useAuth } from '@/lib/auth-store';
import { getSocket } from '@/lib/socket';
import { playBuzzerSound } from '@/lib/sounds';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Header } from '@/components/layout/Header';
import { Game, Player, BuzzerState, MatrixState } from '@/types';

export default function GamePage() {
  const router = useRouter();
  const params = useParams();
  const gameId = params.id as string;
  const { user } = useAuth();
  
  const [game, setGame] = useState<Game | null>(null);
  const [role, setRole] = useState<'player' | 'master' | null>(null);
  const [players, setPlayers] = useState<Player[]>([]);
  const [buzzerState, setBuzzerState] = useState<BuzzerState | null>(null);
  const [matrixState, setMatrixState] = useState<MatrixState | null>(null);
  const [hasBuzzed, setHasBuzzed] = useState(false);
  const [isStarted, setIsStarted] = useState(false);
  const [gameFinished, setGameFinished] = useState(false);
  const [finalScores, setFinalScores] = useState<{playerId: string; score: number}[]>([]);

  useEffect(() => {
    if (!user) {
      router.push('/login');
      return;
    }

    const socket = getSocket();

    socket.emit('game:join', { gameId });

    socket.on('game:joined', ({ role: userRole, type, status, hostId, hostUsername, players: playerList }: { 
      role: 'player' | 'master';
      type: 'buzzer' | 'matrix';
      status: string;
      hostId: string;
      hostUsername: string;
      players: Player[];
    }) => {
      setRole(userRole);
      setGame({
        id: gameId,
        type,
        status: status as 'waiting' | 'playing' | 'finished',
        hostId,
        hostUsername,
        players: playerList || []
      });
      setPlayers(playerList || []);
      setIsStarted(status === 'playing');
    });

    socket.on('game:started', () => {
      setIsStarted(true);
    });

    socket.on('game:players:update', (playerList: Player[]) => {
      setPlayers(playerList);
    });

    socket.on('buzzer:question', (state: BuzzerState) => {
      setBuzzerState(state);
      setHasBuzzed(false);
    });

    socket.on('buzzer:buzzed', ({ playerId, username, first }: any) => {
      if (first) {
        setBuzzerState((prev) =>
          prev ? { ...prev, buzzedPlayer: { id: playerId, username, score: 0, socketId: '' } } : prev
        );
      }
    });

    socket.on('buzzer:cleared', () => {
      setBuzzerState((prev) =>
        prev ? { ...prev, buzzedPlayer: null, buzzOrder: [] } : prev
      );
      setHasBuzzed(false);
    });

    socket.on('buzzer:score', ({ scores }: any) => {
      setPlayers((prev) =>
        prev.map((p) => ({
          ...p,
          score: scores.find((s: any) => s.playerId === p.id)?.score || p.score,
        }))
      );
    });

    socket.on('matrix:reveal', ({ x, y, question }: any) => {
      setMatrixState((prev) =>
        prev
          ? { ...prev, currentQuestion: { x, y, question } }
          : prev
      );
    });

    socket.on('matrix:scored', ({ playerId, points, x, y }: any) => {
      setMatrixState((prev) =>
        prev
          ? {
              ...prev,
              answeredFields: [...prev.answeredFields, { x, y, playerId, points }],
              currentQuestion: null,
            }
          : prev
      );
      setPlayers((prev) =>
        prev.map((p) => ({
          ...p,
          score: p.id === playerId ? p.score + points : p.score,
        }))
      );
    });

    socket.on('game:finished', ({ scores }: any) => {
      setGameFinished(true);
      setFinalScores(scores);
    });

    socket.on('buzzer:buzzed', ({ playerId, username, first }: any) => {
      if (first) {
        setBuzzerState((prev) =>
          prev ? { ...prev, buzzedPlayer: { id: playerId, username, score: 0, socketId: '' } } : prev
        );
        playBuzzerSound(0.25);
      }
    });

    return () => {
      socket.off('game:joined');
      socket.off('game:started');
      socket.off('game:players:update');
      socket.off('buzzer:question');
      socket.off('buzzer:buzzed');
      socket.off('buzzer:cleared');
      socket.off('buzzer:score');
      socket.off('matrix:reveal');
      socket.off('matrix:scored');
      socket.off('game:finished');
    };
  }, [user, gameId, router]);

  const handleBuzz = () => {
    const socket = getSocket();
    socket.emit('buzzer:buzz', { gameId });
    setHasBuzzed(true);
  };

  const handleStart = () => {
    const socket = getSocket();
    socket.emit('game:start', { gameId });
  };

  const handleNextQuestion = () => {
    const socket = getSocket();
    socket.emit('buzzer:next', { gameId });
  };

  const handleClearBuzzers = () => {
    const socket = getSocket();
    socket.emit('buzzer:clear', { gameId });
  };

  const handleAssignPoints = (playerId: string, points: number) => {
    const socket = getSocket();
    socket.emit('buzzer:points', { gameId, playerId, points });
  };

  const handleMatrixSelect = (x: number, y: number) => {
    const socket = getSocket();
    socket.emit('matrix:select', { gameId, x, y });
  };

  const handleMatrixPoints = (playerId: string, points: number) => {
    const socket = getSocket();
    socket.emit('matrix:points', { gameId, playerId, points });
  };

  if (!user) return null;

  const gameType = game?.type || 'buzzer';

  return (
    <>
      <Header />
      <div className="min-h-screen bg-gradient-to-br from-violet-50 via-purple-50 to-fuchsia-50 p-6 md:p-8">
        <div className="max-w-6xl mx-auto">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
            <div>
              <h1 className="text-3xl font-bold tracking-tight">
                {gameType === 'buzzer' ? 'Buzzer Quiz' : 'Matrix Quiz'}
              </h1>
              <p className="text-muted-foreground font-mono">Game: {gameId.toUpperCase()}</p>
            </div>
            <Badge variant={role === 'master' ? 'default' : 'secondary'} className="text-sm px-3 py-1">
              {role === 'master' ? 'Game Master' : 'Player'}
            </Badge>
          </div>

        {!isStarted && role === 'master' && (
          <Card className="mb-8 shadow-sm">
            <CardContent className="py-8">
              <div className="text-center">
                <p className="mb-4 text-muted-foreground">
                  Waiting for players to join...
                </p>
                <Button size="lg" onClick={handleStart} className="h-11">
                  Start Game
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {!isStarted && role === 'player' && (
          <Card className="mb-8 shadow-sm">
            <CardContent className="py-8 text-center">
              <p className="text-muted-foreground">
                Waiting for the game master to start...
              </p>
            </CardContent>
          </Card>
        )}

        {gameFinished && (
          <ResultsScreen scores={finalScores} players={players} onPlayAgain={() => router.push('/lobby')} />
        )}

        {isStarted && !gameFinished && gameType === 'buzzer' && (
          <div className="grid md:grid-cols-3 gap-6">
            <div className="md:col-span-2">
              {role === 'master' ? (
                <BuzzerMasterView
                  state={buzzerState}
                  players={players}
                  onNextQuestion={handleNextQuestion}
                  onClearBuzzers={handleClearBuzzers}
                  onAssignPoints={handleAssignPoints}
                />
              ) : (
                <BuzzerPlayerView
                  state={buzzerState}
                  onBuzz={handleBuzz}
                  hasBuzzed={hasBuzzed}
                />
              )}
            </div>
            <div>
              <PlayerList players={players} />
            </div>
          </div>
        )}

        {isStarted && gameType === 'matrix' && (
          <div className="grid md:grid-cols-3 gap-6">
            <div className="md:col-span-2">
              {role === 'master' ? (
                <MatrixMasterView
                  state={matrixState}
                  players={players}
                  onAssignPoints={handleMatrixPoints}
                />
              ) : (
                <MatrixPlayerView
                  state={matrixState}
                  players={players}
                  currentUserId={user.id}
                  onSelectField={handleMatrixSelect}
                />
              )}
            </div>
            <div>
              <PlayerList players={players} />
            </div>
          </div>
        )}
      </div>
    </div>
    </>
  );
}

function PlayerList({ players }: { players: Player[] }) {
  return (
    <Card className="shadow-sm">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg font-semibold">Players</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {players.map((player) => (
            <div
              key={player.id}
              className="flex justify-between items-center p-3 bg-muted/50 rounded-lg"
            >
              <span className="font-medium">{player.username}</span>
              <span className="font-bold text-primary">{player.score}</span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

function BuzzerMasterView({
  state,
  players,
  onNextQuestion,
  onClearBuzzers,
  onAssignPoints,
}: {
  state: BuzzerState | null;
  players: Player[];
  onNextQuestion: () => void;
  onClearBuzzers: () => void;
  onAssignPoints: (playerId: string, points: number) => void;
}) {
  if (!state) return null;

  return (
    <Card className="shadow-sm">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg font-semibold">
          Question {state.currentQuestionIndex + 1} of {state.totalQuestions}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="text-xl font-semibold p-4 bg-muted/50 rounded-lg">{state.currentQuestion?.question}</div>
        <div className="grid grid-cols-2 gap-3">
          {state.currentQuestion?.answers.map((answer, idx) => (
            <div
              key={idx}
              className={`p-4 rounded-lg border text-center font-medium ${
                idx === state.currentQuestion?.correctIndex
                  ? 'border-green-500 bg-green-500/10 text-green-700'
                  : 'border-border bg-muted/30'
              }`}
            >
              {answer}
            </div>
          ))}
        </div>

        {state.buzzedPlayer && (
          <div className="p-4 bg-yellow-100 border border-yellow-400 rounded-lg">
            <p className="font-bold text-lg text-yellow-800">{state.buzzedPlayer.username} buzzed first!</p>
            <div className="flex gap-2 mt-3 flex-wrap">
              <Button size="sm" onClick={() => onAssignPoints(state.buzzedPlayer!.id, 5)}>+5</Button>
              <Button size="sm" onClick={() => onAssignPoints(state.buzzedPlayer!.id, 3)}>+3</Button>
              <Button size="sm" onClick={() => onAssignPoints(state.buzzedPlayer!.id, 1)}>+1</Button>
              <Button variant="destructive" size="sm" onClick={() => onAssignPoints(state.buzzedPlayer!.id, -1)}>
                -1
              </Button>
            </div>
          </div>
        )}

        <div className="flex gap-3">
          <Button variant="outline" onClick={onClearBuzzers} className="h-10">
            Clear Buzzers
          </Button>
          <Button onClick={onNextQuestion} className="h-10">
            Next Question
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function BuzzerPlayerView({
  state,
  onBuzz,
  hasBuzzed,
}: {
  state: BuzzerState | null;
  onBuzz: () => void;
  hasBuzzed: boolean;
}) {
  if (!state) return null;

  return (
    <Card className="shadow-sm">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg font-semibold">
          Question {state.currentQuestionIndex + 1} of {state.totalQuestions}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="text-xl font-semibold p-4 bg-muted/50 rounded-lg">{state.currentQuestion?.question}</div>
        <div className="grid grid-cols-2 gap-3">
          {state.currentQuestion?.answers.map((answer, idx) => (
            <div key={idx} className="p-4 rounded-lg border border-border bg-muted/30 text-center font-medium">
              {answer}
            </div>
          ))}
        </div>

        <Button
          size="lg"
          className="w-full h-24 text-2xl"
          onClick={onBuzz}
          disabled={hasBuzzed || state.questionLocked}
        >
          {hasBuzzed ? 'Waiting...' : 'BUZZ!'}
        </Button>

        {state.buzzedPlayer && (
          <div className="text-center text-yellow-600 font-bold p-3 bg-yellow-100 rounded-lg">
            {state.buzzedPlayer.username} buzzed first!
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function MatrixMasterView({
  state,
  players,
  onAssignPoints,
}: {
  state: MatrixState | null;
  players: Player[];
  onAssignPoints: (playerId: string, points: number) => void;
}) {
  if (!state) return null;

  return (
    <Card className="shadow-sm">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg font-semibold">Matrix Quiz - Master View</CardTitle>
      </CardHeader>
      <CardContent>
        {state.currentQuestion ? (
          <div className="space-y-4">
            <div className="text-xl font-semibold p-4 bg-muted/50 rounded-lg">{state.currentQuestion.question.question}</div>
            <div className="text-muted-foreground p-3 bg-muted/30 rounded-lg">Answer: {state.currentQuestion.question.answer}</div>
            <div className="flex gap-2 flex-wrap">
              {players.map((player) => (
                <Button 
                  key={player.id} 
                  size="sm" 
                  onClick={() => onAssignPoints(player.id, state.difficulties[state.currentQuestion!.y])}
                  className="h-9"
                >
                  {player.username} (+{state.difficulties[state.currentQuestion!.y]})
                </Button>
              ))}
            </div>
          </div>
        ) : (
          <div className="text-center text-muted-foreground py-8">Waiting for player to select a field...</div>
        )}
      </CardContent>
    </Card>
  );
}

function MatrixPlayerView({
  state,
  players,
  currentUserId,
  onSelectField,
}: {
  state: MatrixState | null;
  players: Player[];
  currentUserId: string;
  onSelectField: (x: number, y: number) => void;
}) {
  if (!state) return null;

  const isMyTurn = state.currentTurn === currentUserId;

  return (
    <Card className="shadow-sm">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg font-semibold">Matrix Quiz</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="mb-4 text-center p-3 rounded-lg bg-muted/50">
          {isMyTurn ? (
            <span className="text-green-600 font-bold">Your turn! Select a field</span>
          ) : (
            <span className="text-muted-foreground">
              {players.find((p) => p.id === state.currentTurn)?.username}&apos;s turn
            </span>
          )}
        </div>

        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr>
                <th className="p-2"></th>
                {state.categories.map((cat) => (
                  <th key={cat} className="p-2 text-center font-semibold">
                    {cat}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {state.difficulties.map((points, y) => (
                <tr key={y}>
                  <td className="p-2 font-bold text-center">{points}</td>
                  {state.categories.map((_, x) => {
                    const answered = state.answeredFields.find((f) => f.x === x && f.y === y);
                    const isCurrent = state.currentQuestion?.x === x && state.currentQuestion?.y === y;
                    const answeredPlayer = players.find((p) => p.id === answered?.playerId);
                    const isPlayer1 = answeredPlayer?.id === players[0]?.id;

                    return (
                      <td key={x} className="p-2">
                        <button
                          className={`w-full h-14 rounded-lg font-semibold transition-all text-sm ${
                            answered
                              ? isPlayer1
                                ? 'bg-green-200 text-green-800 border-2 border-green-400'
                                : 'bg-blue-200 text-blue-800 border-2 border-blue-400'
                              : isCurrent
                              ? 'bg-yellow-200 text-yellow-800 border-2 border-yellow-400'
                              : isMyTurn
                              ? 'bg-primary/20 hover:bg-primary/30 text-primary border-2 border-primary'
                              : 'bg-muted/50 text-muted-foreground border border-border'
                          }`}
                          onClick={() => isMyTurn && !answered && onSelectField(x, y)}
                          disabled={!isMyTurn || !!answered}
                        >
                          {answered ? (
                            <span className="truncate">{answeredPlayer?.username}</span>
                          ) : (
                            <span>{points}</span>
                          )}
                        </button>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {state.currentQuestion && (
          <div className="mt-6 p-4 bg-muted/50 rounded-lg">
            <div className="text-lg font-semibold">{state.currentQuestion.question.question}</div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function ResultsScreen({ 
  scores, 
  players, 
  onPlayAgain 
}: { 
  scores: {playerId: string; score: number}[]; 
  players: Player[];
  onPlayAgain: () => void;
}) {
  const sortedScores = [...scores].sort((a, b) => b.score - a.score);
  
  return (
    <Card className="shadow-lg max-w-md mx-auto">
      <CardHeader className="text-center pb-4">
        <CardTitle className="text-3xl font-bold tracking-tight">Game Over!</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-3">
          {sortedScores.map((score, index) => {
            const player = players.find(p => p.id === score.playerId);
            const isWinner = index === 0;
            
            return (
              <div 
                key={score.playerId} 
                className={`flex items-center justify-between p-4 rounded-lg ${
                  isWinner ? 'bg-yellow-100 border-2 border-yellow-400' : 'bg-muted/50'
                }`}
              >
                <div className="flex items-center gap-3">
                  <span className={`text-2xl font-bold ${isWinner ? 'text-yellow-600' : 'text-muted-foreground'}`}>
                    #{index + 1}
                  </span>
                  <span className="font-semibold">{player?.username || 'Unknown'}</span>
                  {isWinner && <span className="text-2xl">🏆</span>}
                </div>
                <span className={`text-xl font-bold ${isWinner ? 'text-yellow-600' : ''}`}>
                  {score.score} pts
                </span>
              </div>
            );
          })}
        </div>
        
        <Button onClick={onPlayAgain} className="w-full h-12 text-lg mt-4">
          Back to Lobby
        </Button>
      </CardContent>
    </Card>
  );
}