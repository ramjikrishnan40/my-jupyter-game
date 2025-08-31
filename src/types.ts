export type Strategy = 
  | 'TFT'
  | 'TFT_Defect'
  | 'AlwaysCooperate'
  | 'AlwaysDefect'
  | 'Random'
  | 'GrimTrigger'
  | 'ForgivingTFT'
  | 'CaseSpecific'
  | 'Manual';

export type GameMode = 'Batch' | 'Interactive' | 'Tournament';

export type Action = 0 | 1; // 0 for Cooperate, 1 for Defect

export interface RoundResult {
  round: number;
  actionA: Action;
  actionB: Action;
  payoffA: number;
  payoffB: number;
  overrideA?: boolean;
}

export interface TournamentScore {
  strategy: Strategy;
  score: number;
}

export interface StrategyInfo {
  id: Strategy;
  name: string;
  description: string;
}

export interface GameState {
  historyA: Action[];
  historyB: Action[];
  totalPayoffA: number;
  totalPayoffB: number;
  consecutiveDefectsB: number;
  consecutiveDefectsA: number;
  currentRound: number;
  results: RoundResult[];
}
