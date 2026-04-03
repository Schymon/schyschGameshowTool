import { BuzzerEngine } from './buzzer-engine.js';
import { MatrixEngine } from './matrix-engine.js';

export interface BaseEngine {
  getPlayers(): any[];
  isHost(userId: string): boolean;
}

export const gameRegistry = new Map<string, any>();

gameRegistry.set('buzzer', BuzzerEngine);
gameRegistry.set('matrix', MatrixEngine);

export function createEngine(type: string, quizData: any, hostId: string) {
  const Engine = gameRegistry.get(type);
  if (!Engine) {
    throw new Error(`Unknown game type: ${type}`);
  }
  return new Engine(quizData, hostId);
}
