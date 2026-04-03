import { Player, BuzzerState, BuzzerQuizData } from '../types/index.js';

export class BuzzerEngine {
  private players: Map<string, Player> = new Map();
  private state: BuzzerState;
  private quizData: BuzzerQuizData;
  private hostId: string;
  private scores: Map<string, number> = new Map();

  constructor(quizData: BuzzerQuizData, hostId: string) {
    this.quizData = quizData;
    this.hostId = hostId;
    this.state = {
      currentQuestionIndex: 0,
      buzzedPlayer: null,
      buzzOrder: [],
      questionLocked: false,
    };
  }

  addPlayer(player: Player): void {
    this.players.set(player.id, player);
    this.scores.set(player.id, 0);
  }

  removePlayer(playerId: string): void {
    this.players.delete(playerId);
    this.scores.delete(playerId);
  }

  getPlayers(): Player[] {
    return Array.from(this.players.values());
  }

  getCurrentQuestion() {
    if (this.state.currentQuestionIndex >= this.quizData.questions.length) {
      return null;
    }
    return this.quizData.questions[this.state.currentQuestionIndex];
  }

  handleBuzz(playerId: string): { success: boolean; first: boolean } {
    if (this.state.questionLocked) {
      return { success: false, first: false };
    }

    const player = this.players.get(playerId);
    if (!player) {
      return { success: false, first: false };
    }

    const isFirst = this.state.buzzOrder.length === 0;

    if (!this.state.buzzedPlayer) {
      this.state.buzzedPlayer = player;
      this.state.questionLocked = true;
    }

    this.state.buzzOrder.push(player);

    return { success: true, first: isFirst };
  }

  clearBuzzers(): void {
    this.state.buzzedPlayer = null;
    this.state.buzzOrder = [];
    this.state.questionLocked = false;
  }

  assignPoints(playerId: string, points: number): boolean {
    const player = this.players.get(playerId);
    if (!player) return false;

    const currentScore = this.scores.get(playerId) || 0;
    this.scores.set(playerId, currentScore + points);

    player.score = currentScore + points;
    this.players.set(playerId, player);

    return true;
  }

  nextQuestion(): boolean {
    if (this.state.currentQuestionIndex >= this.quizData.questions.length - 1) {
      return false;
    }

    this.state.currentQuestionIndex++;
    this.clearBuzzers();
    return true;
  }

  getState() {
    return {
      ...this.state,
      currentQuestion: this.getCurrentQuestion(),
      totalQuestions: this.quizData.questions.length,
    };
  }

  getScores(): { playerId: string; score: number }[] {
    return Array.from(this.scores.entries()).map(([playerId, score]) => ({
      playerId,
      score,
    }));
  }

  isHost(userId: string): boolean {
    return userId === this.hostId;
  }
}
