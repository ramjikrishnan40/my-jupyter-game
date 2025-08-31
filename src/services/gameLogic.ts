import type { Strategy, Action, GameState } from '../types';

export function getActionForStrategy(
  strategy: Strategy,
  ownHistory: Action[],
  opponentHistory: Action[],
  ownTotalPayoff: number,
  consecutiveOpponentDefects: number,
  currentRound: number
): Action {
  switch (strategy) {
    case 'TFT':
      return opponentHistory.length > 0 ? opponentHistory[opponentHistory.length - 1] : 0;
    
    case 'TFT_Defect':
      return opponentHistory.length > 0 ? opponentHistory[opponentHistory.length - 1] : 1;
      
    case 'AlwaysCooperate':
      return 0;
      
    case 'AlwaysDefect':
      return 1;
      
    case 'Random':
      return Math.random() < 0.5 ? 0 : 1;
      
    case 'GrimTrigger':
      return opponentHistory.includes(1) ? 1 : 0;
      
    case 'ForgivingTFT':
       if (consecutiveOpponentDefects >= 2) {
         return 0; // Forgive by cooperating
       }
       return opponentHistory.length > 0 ? opponentHistory[opponentHistory.length - 1] : 0;

    case 'CaseSpecific':
      const avgProfit = currentRound > 0 ? ownTotalPayoff / currentRound : 0;
      return avgProfit < 50 ? 1 : 0;
      
    case 'Manual':
      // This case is handled by user input in the UI, but we need a default.
      return 0;

    default:
      throw new Error(`Unknown strategy: ${strategy}`);
  }
}
