import { Server, Socket } from 'socket.io';
import prisma from '../lib/prisma.js';
import { Game, Player } from '../types/index.js';
import { BuzzerEngine } from '../game-engines/buzzer-engine.js';
import { MatrixEngine } from '../game-engines/matrix-engine.js';

const games = new Map<string, Game>();
const engines = new Map<string, BuzzerEngine | MatrixEngine>();
const socketToUser = new Map<string, { id: string; username: string }>();
const socketToGame = new Map<string, string>();

function generateGameId(): string {
  const chars = 'abcdefghijklmnopqrstuvwxyz123456';
  let id = '';
  for (let i = 0; i < 4; i++) {
    id += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return id;
}

export function setupSocketHandlers(io: Server) {
  io.on('connection', (socket: Socket) => {
    console.log(`Socket connected: ${socket.id}`);

    socket.on('user:identify', (data: { id: string; username: string }) => {
      socketToUser.set(socket.id, data);
    });

    socket.on('lobby:games', () => {
      const gamesList = Array.from(games.values()).filter(
        (g) => g.status !== 'finished'
      );
      socket.emit('lobby:games:list', gamesList);
    });

    socket.on('game:create', async (data: { type: 'buzzer' | 'matrix'; quizId?: string; quizData?: any }) => {
      const user = socketToUser.get(socket.id);
      if (!user) {
        socket.emit('error', { message: 'Not authenticated' });
        return;
      }

      let quizData = data.quizData;

      if (data.quizId) {
        const quiz = await prisma.quiz.findUnique({
          where: { id: data.quizId },
        });
        if (quiz) {
          quizData = quiz.data as any;
        }
      }

      if (!quizData) {
        socket.emit('error', { message: 'No quiz data provided' });
        return;
      }

      const gameId = generateGameId();
      const game: Game = {
        id: gameId,
        type: data.type,
        hostId: user.id,
        hostUsername: user.username,
        status: 'waiting',
        players: [],
        quizData,
      };

      games.set(gameId, game);

      let engine: BuzzerEngine | MatrixEngine;
      if (data.type === 'buzzer') {
        engine = new BuzzerEngine(quizData, user.id);
        console.log('Buzzer engine created with questions:', (quizData as any).questions?.length);
      } else {
        engine = new MatrixEngine(quizData, user.id);
      }
      engines.set(gameId, engine);

      socket.join(gameId);
      socketToGame.set(socket.id, gameId);

      socket.emit('game:created', { gameId, role: 'master', players: game.players });
      io.to(gameId).emit('game:players:update', { gameId, players: game.players });
      io.emit('lobby:games:list', Array.from(games.values()).map(g => ({
        ...g,
        players: g.players.filter(p => p.id !== g.hostId)
      })));
    });

    socket.on('game:join', (data: { gameId: string }) => {
      const user = socketToUser.get(socket.id);
      if (!user) {
        socket.emit('error', { message: 'Not authenticated' });
        return;
      }

      const game = games.get(data.gameId);
      if (!game) {
        socket.emit('error', { message: 'Game not found' });
        return;
      }

      const engine = engines.get(data.gameId);
      if (!engine) {
        socket.emit('error', { message: 'Game engine not found' });
        return;
      }

      const player: Player = {
        id: user.id,
        username: user.username,
        score: 0,
        socketId: socket.id,
        isHost: game.hostId === user.id,
      };

      game.players.push(player);
      engine.addPlayer(player);

      socket.join(data.gameId);
      socketToGame.set(socket.id, data.gameId);

      const role = game.hostId === user.id ? 'master' : 'player';
      socket.emit('game:joined', { 
        gameId: data.gameId, 
        role, 
        players: game.players,
        type: game.type,
        status: game.status,
        hostId: game.hostId,
        hostUsername: game.hostUsername
      });
      io.to(data.gameId).emit('game:players:update', game.players);
      io.emit('lobby:games:list', Array.from(games.values()).map(g => ({
        ...g,
        players: g.players.filter(p => p.id !== g.hostId)
      })));
    });

    socket.on('game:start', (data: { gameId: string }) => {
      console.log('game:start received for gameId:', data.gameId);
      const user = socketToUser.get(socket.id);
      const game = games.get(data.gameId);
      const engine = engines.get(data.gameId) as BuzzerEngine | MatrixEngine;

      console.log('user:', user?.id, 'game:', game?.id, 'engine:', !!engine);

      if (!user || !game || game.hostId !== user.id) {
        socket.emit('error', { message: 'Cannot start game' });
        return;
      }

      game.status = 'playing';
      console.log('Game status set to playing, engine type:', game.type);
      
      if (game.type === 'buzzer' && engine) {
        const buzzerEngine = engine as BuzzerEngine;
        const state = buzzerEngine.getState();
        console.log('Buzzer state:', state.currentQuestionIndex, 'question:', state.currentQuestion?.question);
        io.to(data.gameId).emit('buzzer:question', state);
      }
      
      io.to(data.gameId).emit('game:started', { gameId: data.gameId });
      io.emit('lobby:games:list', Array.from(games.values()).map(g => ({
        ...g,
        players: g.players.filter(p => p.id !== g.hostId)
      })));
    });

    socket.on('buzzer:buzz', (data: { gameId: string }) => {
      const user = socketToUser.get(socket.id);
      const game = games.get(data.gameId);
      const engine = engines.get(data.gameId) as BuzzerEngine;

      if (!user || !game || !engine) {
        return;
      }

      const result = engine.handleBuzz(user.id);

      if (result.success) {
        const player = engine.getPlayers().find((p) => p.id === user.id);
        io.to(data.gameId).emit('buzzer:buzzed', {
          playerId: user.id,
          username: user.username,
          timestamp: Date.now(),
          first: result.first,
        });
      }
    });

    socket.on('buzzer:clear', (data: { gameId: string }) => {
      const user = socketToUser.get(socket.id);
      const game = games.get(data.gameId);
      const engine = engines.get(data.gameId) as BuzzerEngine;

      if (!user || !game || !engine || !engine.isHost(user.id)) {
        return;
      }

      engine.clearBuzzers();
      io.to(data.gameId).emit('buzzer:cleared');
    });

    socket.on('buzzer:points', (data: { gameId: string; playerId: string; points: number }) => {
      const user = socketToUser.get(socket.id);
      const game = games.get(data.gameId);
      const engine = engines.get(data.gameId) as BuzzerEngine;

      if (!user || !game || !engine || !engine.isHost(user.id)) {
        return;
      }

      engine.assignPoints(data.playerId, data.points);
      io.to(data.gameId).emit('buzzer:score', {
        playerId: data.playerId,
        points: data.points,
        scores: engine.getScores(),
      });
    });

    socket.on('buzzer:next', (data: { gameId: string }) => {
      const user = socketToUser.get(socket.id);
      const game = games.get(data.gameId);
      const engine = engines.get(data.gameId) as BuzzerEngine;

      if (!user || !game || !engine || !engine.isHost(user.id)) {
        return;
      }

      const hasNext = engine.nextQuestion();
      if (hasNext) {
        io.to(data.gameId).emit('buzzer:question', engine.getState());
      } else {
        game.status = 'finished';
        io.to(data.gameId).emit('game:finished', { scores: engine.getScores() });
        io.emit('lobby:games:list', Array.from(games.values()));
      }
    });

    socket.on('matrix:select', (data: { gameId: string; x: number; y: number }) => {
      const user = socketToUser.get(socket.id);
      const engine = engines.get(data.gameId) as MatrixEngine;

      if (!user || !engine) {
        return;
      }

      const result = engine.selectField(user.id, data.x, data.y);

      if (result.success) {
        io.to(data.gameId).emit('matrix:reveal', {
          x: data.x,
          y: data.y,
          question: result.question,
        });
      }
    });

    socket.on('matrix:points', (data: { gameId: string; playerId: string; points: number }) => {
      const user = socketToUser.get(socket.id);
      const game = games.get(data.gameId);
      const engine = engines.get(data.gameId) as MatrixEngine;

      if (!user || !game || !engine || !engine.isHost(user.id)) {
        return;
      }

      engine.assignPoints(data.playerId, data.points);
      io.to(data.gameId).emit('matrix:scored', {
        playerId: data.playerId,
        points: data.points,
        x: engine.getState().answeredFields[engine.getState().answeredFields.length - 1]?.x,
        y: engine.getState().answeredFields[engine.getState().answeredFields.length - 1]?.y,
      });
      io.to(data.gameId).emit('game:players:update', engine.getPlayers());
    });

    socket.on('disconnect', () => {
      console.log(`Socket disconnected: ${socket.id}`);

      const gameId = socketToGame.get(socket.id);
      if (gameId) {
        const game = games.get(gameId);
        const engine = engines.get(gameId);

        if (game && engine) {
          const user = socketToUser.get(socket.id);
          if (user) {
            engine.removePlayer(user.id);
            game.players = game.players.filter((p) => p.id !== user.id);
            io.to(gameId).emit('game:players:update', engine.getPlayers());
          }
        }

        socketToGame.delete(socket.id);
      }

      socketToUser.delete(socket.id);
    });
  });
}
