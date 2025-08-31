import type { StrategyInfo } from './types';

// Payoff Matrix: (Terminal A's Payoff, Terminal B's Payoff)
// Based on the provided Python script.
// Action 0: Cooperate (Limit capacity, stabilize prices)
// Action 1: Defect (Aggressively poach customers)
export const PAYOFFS: { [key: string]: [number, number] } = {
  '0,0': [75, 45], // Both Cooperate
  '0,1': [40, 60], // A Cooperates, B Defects
  '1,0': [90, 30], // A Defects, B Cooperates
  '1,1': [50, 25], // Both Defect
};

export const STRATEGIES: StrategyInfo[] = [
  { id: 'TFT', name: 'Tit-for-Tat', description: 'Starts by cooperating, then copies the opponent\'s previous move. A classic reciprocal strategy.' },
  { id: 'TFT_Defect', name: 'Aggressive Tit-for-Tat', description: 'Starts by defecting, then copies the opponent\'s previous move. Signals initial toughness.' },
  { id: 'AlwaysCooperate', name: 'Always Cooperate', description: 'Always cooperates, regardless of the opponent\'s actions. A consistently passive strategy.' },
  { id: 'AlwaysDefect', name: 'Always Defect', description: 'Always defects, regardless of the opponent\'s actions. A consistently aggressive strategy.' },
  { id: 'Random', name: 'Random', description: 'Chooses to cooperate or defect with a 50/50 probability each round. Unpredictable.' },
  { id: 'GrimTrigger', name: 'Grim Trigger', description: 'Cooperates until the opponent defects once, then defects for all subsequent rounds. Unforgiving.' },
  { id: 'ForgivingTFT', name: 'Forgiving Tit-for-Tat', description: 'Like Tit-for-Tat, but will revert to cooperation even if the opponent defects twice in a row.' },
  { id: 'CaseSpecific', name: 'Profit-Driven', description: 'Defects if its average profit per round falls below 50M, otherwise cooperates. A reactive, goal-oriented strategy.' },
  { id: 'Manual', name: 'Manual Control', description: 'Allows you to choose the action for this terminal each round. (Only available in Interactive mode).' },
];
