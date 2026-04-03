import { Player, MatrixState, MatrixQuizData } from '../types/index.js';

export class MatrixEngine {
  private players: Map<string, Player> = new Map();
  private state: MatrixState;
  private quizData: MatrixQuizData;
  private hostId: string;
  private playerOrder: string[] = [];
  private currentPlayerIndex: number = 0;

  constructor(quizData: MatrixQuizData, hostId: string) {
    this.quizData = quizData;
    this.hostId = hostId;
    this.state = {
      currentQuestion: null,
      currentTurn: '',
      answeredFields: [],
    };
  }

  addPlayer(player: Player): void {
    this.players.set(player.id, player);
    player.score = 0;
    this.playerOrder.push(player.id);
    if (this.playerOrder.length === 1) {
      this.state.currentTurn = player.id;
    }
  }

  removePlayer(playerId: string): void {
    this.players.delete(playerId);
    const index = this.playerOrder.indexOf(playerId);
    if (index > -1) {
      this.playerOrder.splice(index, 1);
    }
  }

  getPlayers(): Player[] {
    return Array.from(this.players.values());
  }

  selectField(playerId: string, x: number, y: number): { success: boolean; question: any } {
    if (playerId !== this.state.currentTurn) {
      return { success: false, question: null };
    }

    const fieldKey = `${this.quizData.categories[x]}-${this.quizData.difficulties[y]}`;
    const question = this.quizData.questions[fieldKey];

    if (!question) {
      return { success: false, question: null };
    }

    const alreadyAnswered = this.state.answeredFields.some(
      (f) => f.x === x && f.y === y
    );

    if (alreadyAnswered) {
      return { success: false, question: null };
    }

    this.state.currentQuestion = { x, y, question };

    return { success: true, question };
  }

  assignPoints(playerId: string, points: number): boolean {
    if (!this.state.currentQuestion) return false;

    const player = this.players.get(playerId);
    if (!player) return false;

    const score = player.score || 0;
    player.score = score + points;
    this.players.set(playerId, player);

    this.state.answeredFields.push({
      x: this.state.currentQuestion.x,
      y: this.state.currentQuestion.y,
      playerId,
      points,
    });

    this.state.currentQuestion = null;

    this.currentPlayerIndex = (this.currentPlayerIndex + 1) % this.playerOrder.length;
    this.state.currentTurn = this.playerOrder[this.currentPlayerIndex];

    return true;
  }

  getAvailableFields(): { x: number; y: number; points: number }[] {
    const fields: { x: number; y: number; points: number }[] = [];

    for (let x = 0; x < this.quizData.categories.length; x++) {
      for (let y = 0; y < this.quizData.difficulties.length; y++) {
        const answered = this.state.answeredFields.some(
          (f) => f.x === x && f.y === y
        );
        if (!answered) {
          fields.push({
            x,
            y,
            points: this.quizData.difficulties[y],
          });
        }
      }
    }

    return fields;
  }

  getState() {
    return {
      currentQuestion: this.state.currentQuestion,
      currentTurn: this.state.currentTurn,
      answeredFields: this.state.answeredFields,
      categories: this.quizData.categories,
      difficulties: this.quizData.difficulties,
      totalFields: this.quizData.categories.length * this.quizData.difficulties.length,
      answeredCount: this.state.answeredFields.length,
    };
  }

  isHost(userId: string): boolean {
    return userId === this.hostId;
  }

  getCurrentTurnPlayer(): Player | null {
    return this.players.get(this.state.currentTurn) || null;
  }
}
