export interface User {
  id: string;
  username: string;
  role: 'USER' | 'ADMIN';
}

export interface Player {
  id: string;
  username: string;
  score: number;
  socketId: string;
  isHost?: boolean;
}

export interface Game {
  id: string;
  type: 'buzzer' | 'matrix';
  hostId: string;
  hostUsername: string;
  status: 'waiting' | 'playing' | 'finished';
  players: Player[];
  quizId?: string;
  quizData?: QuizData;
}

export interface BuzzerQuizData {
  type: 'buzzer';
  title: string;
  questions: BuzzerQuestion[];
}

export interface BuzzerQuestion {
  question: string;
  answers: string[];
  correctIndex: number;
}

export interface MatrixQuizData {
  type: 'matrix';
  title: string;
  categories: string[];
  difficulties: number[];
  questions: Record<string, MatrixQuestion>;
}

export interface MatrixQuestion {
  question: string;
  answer: string;
}

export type QuizData = BuzzerQuizData | MatrixQuizData;

export interface CreateGamePayload {
  type: 'buzzer' | 'matrix';
  quizId?: string;
  quizData?: QuizData;
}

export interface BuzzerState {
  currentQuestionIndex: number;
  buzzedPlayer: Player | null;
  buzzOrder: Player[];
  questionLocked: boolean;
}

export interface MatrixState {
  currentQuestion: { x: number; y: number; question: MatrixQuestion } | null;
  currentTurn: string;
  answeredFields: { x: number; y: number; playerId: string; points: number }[];
}
