import React from 'react';
import { useState, useReducer, useEffect } from 'react';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LabelList } from 'recharts';
import type { GameMode, Strategy, Action, RoundResult, TournamentScore, GameState } from './types';
import { STRATEGIES, PAYOFFS } from './constants';
import { getActionForStrategy } from './services/gameLogic';
import { GoogleGenAI } from "@google/genai";

// --- ICONS ---
const GuideIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" /></svg>;
const ChartIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M11 3.055A9.001 9.001 0 1020.945 13H11V3.055z" /><path strokeLinecap="round" strokeLinejoin="round" d="M20.488 9H15V3.512A9.025 9.025 0 0120.488 9z" /></svg>;
const SettingsIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0 3.35a1.724 1.724 0 001.066 2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>;
const OverrideIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 inline-block ml-1 text-yellow-400" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.21 3.03-1.742 3.03H4.42c-1.532 0-2.492-1.696-1.742-3.03l5.58-9.92zM10 13a1 1 0 110-2 1 1 0 010 2zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" /></svg>;
const SparklesIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M5 2a1 1 0 011 1v1h1a1 1 0 010 2H6v1a1 1 0 01-2 0V6H3a1 1 0 010-2h1V3a1 1 0 011-1zm6 0a1 1 0 011 1v1h1a1 1 0 010 2h-1v1a1 1 0 01-2 0V6h-1a1 1 0 010-2h1V3a1 1 0 011-1zM3.293 10.293a1 1 0 010 1.414l-1 1a1 1 0 01-1.414-1.414l1-1a1 1 0 011.414 0zM16 11.5a1.5 1.5 0 11-3 0 1.5 1.5 0 013 0zM6.707 10.293a1 1 0 010 1.414l-1 1a1 1 0 11-1.414-1.414l1-1a1 1 0 011.414 0zM10 15a1 1 0 011 1v1h1a1 1 0 110 2h-1v1a1 1 0 11-2 0v-1h-1a1 1 0 110-2h1v-1a1 1 0 011-1zM13.293 10.293a1 1 0 010 1.414l-1 1a1 1 0 01-1.414-1.414l1-1a1 1 0 011.414 0z" clipRule="evenodd" /></svg>;


// --- TYPES ---
interface ComparisonRun {
    id: string;
    strategyA: Strategy;
    strategyB: Strategy;
    noise: number;
    totalPayoffA: number;
    totalPayoffB: number;
    chartData: any[];
}

// --- REDUCER & INITIAL STATE ---
const gameReducer = (state: GameState, action: any): GameState => {
    switch (action.type) {
        case 'ADVANCE_ROUND': {
            const { actionA, actionB, wasOverride } = action.payload;
            const [payoffA, payoffB] = PAYOFFS[`${actionA},${actionB}`];
            const newResult: RoundResult = { round: state.currentRound + 1, actionA, actionB, payoffA, payoffB, overrideA: wasOverride };
            return {
                ...state,
                historyA: [...state.historyA, actionA],
                historyB: [...state.historyB, actionB],
                totalPayoffA: state.totalPayoffA + payoffA,
                totalPayoffB: state.totalPayoffB + payoffB,
                consecutiveDefectsA: actionA === 1 ? state.consecutiveDefectsA + 1 : 0,
                consecutiveDefectsB: actionB === 1 ? state.consecutiveDefectsB + 1 : 0,
                currentRound: state.currentRound + 1,
                results: [...state.results, newResult],
            };
        }
        case 'RESET_STATE':
            return INITIAL_GAME_STATE;
        case 'SET_STATE': 
            return action.payload;
        default:
            return state;
    }
};

const INITIAL_GAME_STATE: GameState = {
    historyA: [],
    historyB: [],
    totalPayoffA: 0,
    totalPayoffB: 0,
    consecutiveDefectsA: 0,
    consecutiveDefectsB: 0,
    currentRound: 0,
    results: [],
};

// --- MAIN APP COMPONENT ---
export default function App() {
    // Core State
    const [mode, setMode] = useState<GameMode>('Batch');
    const [strategyA, setStrategyA] = useState<Strategy>('TFT');
    const [strategyB, setStrategyB] = useState<Strategy>('AlwaysDefect');
    const [numRounds, setNumRounds] = useState<number>(10);
    const [noise, setNoise] = useState<number>(0.0);
    const [tournamentStrategies, setTournamentStrategies] = useState<Strategy[]>(['TFT', 'AlwaysDefect', 'GrimTrigger', 'AlwaysCooperate']);
    
    const [gameState, dispatch] = useReducer(gameReducer, INITIAL_GAME_STATE);
    const [simulationState, setSimulationState] = useState<'idle' | 'running' | 'finished'>('idle');
    const [tournamentResults, setTournamentResults] = useState<TournamentScore[]>([]);

    // New State for Guide, Comparison, and Advanced Mode
    const [isGuideOpen, setIsGuideOpen] = useState(false);
    const [comparisonRuns, setComparisonRuns] = useState<ComparisonRun[]>([]);
    const [view, setView] = useState<'simulation' | 'comparison'>('simulation');
    const [isAdvancedMode, setIsAdvancedMode] = useState(false);


    // Effect to switch view back to simulation when controls change
    useEffect(() => {
        setView('simulation');
    }, [mode, strategyA, strategyB, numRounds, noise]);

    const handleRun = () => {
        handleReset(false); // Soft reset, don't clear comparisons
        setSimulationState('running');
        if (mode === 'Batch') {
             let currentGameState = INITIAL_GAME_STATE;
             for (let i = 0; i < numRounds; i++) {
                 let actionA = getActionForStrategy(strategyA, currentGameState.historyA, currentGameState.historyB, currentGameState.totalPayoffA, currentGameState.consecutiveDefectsB, i);
                 let actionB = getActionForStrategy(strategyB, currentGameState.historyB, currentGameState.historyA, currentGameState.totalPayoffB, currentGameState.consecutiveDefectsA, i);
                 if (Math.random() < noise) actionA = actionA === 1 ? 0 : 1;
                 if (Math.random() < noise) actionB = actionB === 1 ? 0 : 1;
                 const [payoffA, payoffB] = PAYOFFS[`${actionA},${actionB}`];
                 const newResult = { round: i + 1, actionA, actionB, payoffA, payoffB };
                 currentGameState = {
                     historyA: [...currentGameState.historyA, actionA],
                     historyB: [...currentGameState.historyB, actionB],
                     totalPayoffA: currentGameState.totalPayoffA + payoffA,
                     totalPayoffB: currentGameState.totalPayoffB + payoffB,
                     consecutiveDefectsA: actionA === 1 ? currentGameState.consecutiveDefectsA + 1 : 0,
                     consecutiveDefectsB: actionB === 1 ? currentGameState.consecutiveDefectsB + 1 : 0,
                     currentRound: i + 1,
                     results: [...currentGameState.results, newResult],
                 };
             }
             dispatch({type: 'SET_STATE', payload: currentGameState});

        } else if (mode === 'Tournament') {
            const scores: { [key in Strategy]?: number } = {};
            tournamentStrategies.forEach(s => scores[s] = 0);

            for (let i = 0; i < tournamentStrategies.length; i++) {
                for (let j = i + 1; j < tournamentStrategies.length; j++) {
                    const stratA = tournamentStrategies[i];
                    const stratB = tournamentStrategies[j];
                    let game: GameState = { ...INITIAL_GAME_STATE };
                    for (let r = 0; r < numRounds; r++) {
                        let actionA = getActionForStrategy(stratA, game.historyA, game.historyB, game.totalPayoffA, game.consecutiveDefectsB, r);
                        let actionB = getActionForStrategy(stratB, game.historyB, game.historyA, game.totalPayoffB, game.consecutiveDefectsA, r);
                        if (Math.random() < noise) actionA = actionA === 1 ? 0 : 1;
                        if (Math.random() < noise) actionB = actionB === 1 ? 0 : 1;
                        const [payoffA, payoffB] = PAYOFFS[`${actionA},${actionB}`];
                        game = { ...game, historyA: [...game.historyA, actionA], historyB: [...game.historyB, actionB], totalPayoffA: game.totalPayoffA + payoffA, totalPayoffB: game.totalPayoffB + payoffB, consecutiveDefectsA: actionA === 1 ? game.consecutiveDefectsA + 1 : 0, consecutiveDefectsB: actionB === 1 ? game.consecutiveDefectsB + 1 : 0, };
                    }
                    scores[stratA]! += game.totalPayoffA;
                    scores[stratB]! += game.totalPayoffB;
                }
            }
            
            const sortedScores = Object.entries(scores)
                .map(([strategy, score]) => ({ strategy: strategy as Strategy, score: score as number }))
                .sort((a, b) => b.score - a.score);
                
            setTournamentResults(sortedScores);
        }
        setSimulationState('finished');
        setView('simulation');
    };

    const handleReset = (fullReset = true) => {
        dispatch({ type: 'RESET_STATE' });
        setTournamentResults([]);
        if (fullReset) {
          setComparisonRuns([]);
          setIsAdvancedMode(false);
        }
        setSimulationState('idle');
        setView('simulation');
    };
    
    const handleInteractiveStep = (playerAction: Action, wasOverride: boolean = false) => {
        if (gameState.currentRound >= numRounds) return;
        
        let actionA = isAdvancedMode || strategyA === 'Manual' 
            ? playerAction 
            : getActionForStrategy(strategyA, gameState.historyA, gameState.historyB, gameState.totalPayoffA, gameState.consecutiveDefectsB, gameState.currentRound);
        
        if(strategyA !== 'Manual' && !isAdvancedMode && Math.random() < noise) actionA = actionA === 1 ? 0 : 1;

        let actionB = getActionForStrategy(strategyB, gameState.historyB, gameState.historyA, gameState.totalPayoffB, gameState.consecutiveDefectsA, gameState.currentRound);
        if (Math.random() < noise) actionB = actionB === 1 ? 0 : 1;

        dispatch({ type: 'ADVANCE_ROUND', payload: { actionA, actionB, wasOverride } });
        if(gameState.currentRound + 1 >= numRounds){
            setSimulationState('finished');
        }
    };

    const handleAddToComparison = () => {
        if (mode !== 'Batch' || simulationState !== 'finished') return;
        const chartData = gameState.results.reduce<any[]>((acc, res) => {
            const last = acc.length > 0 ? acc[acc.length - 1] : { cumulativeA: 0, cumulativeB: 0 };
            acc.push({ round: res.round, cumulativeA: last.cumulativeA + res.payoffA, cumulativeB: last.cumulativeB + res.payoffB });
            return acc;
        }, []);

        const newRun: ComparisonRun = {
            id: new Date().toISOString(),
            strategyA,
            strategyB,
            noise,
            totalPayoffA: gameState.totalPayoffA,
            totalPayoffB: gameState.totalPayoffB,
            chartData,
        };
        setComparisonRuns(prev => [...prev, newRun]);
        setView('comparison');
    };

    return (
        <div className="min-h-screen flex flex-col">
            <Header onOpenGuide={() => setIsGuideOpen(true)} />
            <GameGuideModal isOpen={isGuideOpen} onClose={() => setIsGuideOpen(false)} />
            <main className="flex-grow container mx-auto p-4">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* Controls Column */}
                    <div className="lg:col-span-1 bg-brand-navy p-6 rounded-lg shadow-lg">
                       <Controls 
                            mode={mode} setMode={setMode}
                            strategyA={strategyA} setStrategyA={setStrategyA}
                            strategyB={strategyB} setStrategyB={setStrategyB}
                            numRounds={numRounds} setNumRounds={setNumRounds}
                            noise={noise} setNoise={setNoise}
                            tournamentStrategies={tournamentStrategies} setTournamentStrategies={setTournamentStrategies}
                            onRun={handleRun} onReset={() => handleReset(true)}
                            simulationState={simulationState}
                            onAddToComparison={handleAddToComparison}
                            comparisonCount={comparisonRuns.length}
                            view={view}
                            setView={setView}
                            isAdvancedMode={isAdvancedMode}
                            setIsAdvancedMode={setIsAdvancedMode}
                        />
                    </div>

                    {/* Results Column */}
                    <div className="lg:col-span-2 bg-brand-navy p-6 rounded-lg shadow-lg min-h-[600px]">
                        {simulationState === 'idle' && <WelcomeMessage />}
                        
                        {simulationState !== 'idle' && view === 'simulation' && (
                            mode === 'Interactive' ? (
                                <InteractiveDisplay
                                    gameState={gameState}
                                    numRounds={numRounds}
                                    strategyA={strategyA}
                                    onStep={handleInteractiveStep}
                                    isAdvancedMode={isAdvancedMode}
                                />
                            ) : (
                                <ResultsDisplay 
                                    mode={mode}
                                    results={gameState.results}
                                    tournamentResults={tournamentResults}
                                    totalPayoffA={gameState.totalPayoffA}
                                    totalPayoffB={gameState.totalPayoffB}
                                />
                            )
                        )}
                         {view === 'comparison' && <ComparisonDisplay runs={comparisonRuns} onClear={() => setComparisonRuns([])} />}

                         {simulationState === 'finished' && view === 'simulation' && gameState.results.length > 0 && 
                            <PostGameReflection 
                                results={gameState.results}
                                strategyA={strategyA}
                                strategyB={strategyB}
                                noise={noise}
                            />
                         }

                    </div>
                </div>
            </main>
        </div>
    );
}

// --- SUB-COMPONENTS ---

const InfoTooltip: React.FC<{ text: string, children: React.ReactNode }> = ({ text, children }) => {
    return (
        <div className="relative group flex items-center">
            {children}
            <div className="absolute bottom-full mb-2 w-64 p-2 text-sm text-white bg-gray-800 rounded-md shadow-lg opacity-0 group-hover:opacity-100 transition-opacity duration-300 z-10 pointer-events-none">
                {text}
            </div>
        </div>
    );
};

const Header: React.FC<{ onOpenGuide: () => void }> = ({ onOpenGuide }) => (
    <header className="text-center p-4 md:p-6 border-b-2 border-brand-steel relative">
        <h1 className="text-3xl md:text-4xl font-bold text-white">Terminal Coopetition</h1>
        <p className="text-brand-silver mt-2 max-w-3xl mx-auto">
            A strategic simulation based on the IIM case study. As CEO of Terminal A, you face a new competitor, Terminal B. 
            Will you <span className="text-green-400 font-semibold">Cooperate</span> to stabilize the market, or <span className="text-red-400 font-semibold">Compete</span> aggressively to gain an edge?
        </p>
        <button onClick={onOpenGuide} className="absolute top-4 right-4 flex items-center bg-brand-steel hover:bg-brand-silver text-white font-bold py-2 px-4 rounded-md transition-colors">
            <GuideIcon />
            Game Guide
        </button>
    </header>
);

const Controls: React.FC<{
    mode: GameMode, setMode: (m: GameMode) => void,
    strategyA: Strategy, setStrategyA: (s: Strategy) => void,
    strategyB: Strategy, setStrategyB: (s: Strategy) => void,
    numRounds: number, setNumRounds: (n: number) => void,
    noise: number, setNoise: (n: number) => void,
    tournamentStrategies: Strategy[], setTournamentStrategies: React.Dispatch<React.SetStateAction<Strategy[]>>,
    onRun: () => void, onReset: () => void,
    simulationState: string,
    onAddToComparison: () => void,
    comparisonCount: number,
    view: 'simulation' | 'comparison',
    setView: (view: 'simulation' | 'comparison') => void,
    isAdvancedMode: boolean, setIsAdvancedMode: (b: boolean) => void,
}> = ({ mode, setMode, strategyA, setStrategyA, strategyB, setStrategyB, numRounds, setNumRounds, noise, setNoise, tournamentStrategies, setTournamentStrategies, onRun, onReset, simulationState, onAddToComparison, comparisonCount, view, setView, isAdvancedMode, setIsAdvancedMode }) => {
    
    const handleTournamentSelect = (strategy: Strategy) => {
        setTournamentStrategies(prev => 
            prev.includes(strategy) ? prev.filter(s => s !== strategy) : [...prev, strategy]
        );
    };
    
    useEffect(() => {
        if(mode === 'Interactive'){
            // Don't auto-set to Manual, let the user choose or keep their last strategy for Advanced Mode
        } else {
            if (strategyA === 'Manual') setStrategyA('TFT'); // Default back if not interactive
            setIsAdvancedMode(false); // Disable advanced mode when leaving interactive
        }
    }, [mode, strategyA, setStrategyA, setIsAdvancedMode]);


    return (
        <div className="space-y-6">
            <div className="flex items-center text-2xl font-bold text-white mb-4">
                <SettingsIcon />
                <h2 className="ml-2">Simulation Controls</h2>
            </div>
            <div>
                 <InfoTooltip text="Choose the type of simulation to run. 'Batch' runs automatically, 'Interactive' lets you play as Terminal A, and 'Tournament' pits selected strategies against each other.">
                    <label className="block text-sm font-medium text-brand-silver mb-1">Simulation Mode</label>
                 </InfoTooltip>
                <select value={mode} onChange={e => setMode(e.target.value as GameMode)} className="w-full bg-brand-blue border border-brand-steel rounded-md p-2 text-white">
                    <option value="Batch">Batch Run</option>
                    <option value="Interactive">Interactive (Manual Play)</option>
                    <option value="Tournament">Tournament</option>
                </select>
            </div>

            {mode !== 'Tournament' && (
            <>
                <div>
                    <InfoTooltip text="Select the base strategy for Terminal A. In 'Interactive' mode, you can manually control or use this as a recommendation in Advanced Mode.">
                        <label className="block text-sm font-medium text-brand-silver mb-1">Terminal A Strategy</label>
                    </InfoTooltip>
                    <select value={strategyA} onChange={e => setStrategyA(e.target.value as Strategy)} className="w-full bg-brand-blue border border-brand-steel rounded-md p-2 text-white">
                        {STRATEGIES.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                    </select>
                    <p className="text-xs text-brand-silver mt-1 h-8">{STRATEGIES.find(s=>s.id===strategyA)?.description}</p>
                </div>
                 <div>
                    <InfoTooltip text="Select the automated strategy for the competitor, Terminal B.">
                        <label className="block text-sm font-medium text-brand-silver mb-1">Terminal B Strategy</label>
                    </InfoTooltip>
                    <select value={strategyB} onChange={e => setStrategyB(e.target.value as Strategy)} className="w-full bg-brand-blue border border-brand-steel rounded-md p-2 text-white">
                        {STRATEGIES.filter(s => s.id !== 'Manual').map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                    </select>
                    <p className="text-xs text-brand-silver mt-1 h-8">{STRATEGIES.find(s=>s.id===strategyB)?.description}</p>
                </div>
                 {mode === 'Interactive' && strategyA !== 'Manual' && (
                    <div className="bg-brand-blue p-3 rounded-md border border-brand-steel">
                        <InfoTooltip text="Enable this to see your chosen strategy's recommendation each round and decide whether to follow or override it. This simulates the pressure of a CEO making the final call.">
                            <div className="flex items-center justify-between">
                                 <label htmlFor="advanced-toggle" className="text-sm font-medium text-brand-silver">Advanced Mode (CEO Override)</label>
                                <div className="relative inline-block w-10 mr-2 align-middle select-none transition duration-200 ease-in">
                                    <input type="checkbox" id="advanced-toggle" checked={isAdvancedMode} onChange={e => setIsAdvancedMode(e.target.checked)} className="toggle-checkbox absolute block w-6 h-6 rounded-full bg-white border-4 appearance-none cursor-pointer"/>
                                    <label htmlFor="advanced-toggle" className="toggle-label block overflow-hidden h-6 rounded-full bg-gray-300 cursor-pointer"></label>
                                </div>
                            </div>
                        </InfoTooltip>
                    </div>
                )}
            </>
            )}

            {mode === 'Tournament' && (
                <div>
                    <InfoTooltip text="Select two or more strategies to compete in a round-robin tournament.">
                         <label className="block text-sm font-medium text-brand-silver mb-1">Select Tournament Competitors</label>
                    </InfoTooltip>
                     <div className="grid grid-cols-2 gap-2 mt-2 bg-brand-blue border border-brand-steel p-2 rounded-md max-h-48 overflow-y-auto">
                        {STRATEGIES.filter(s => s.id !== 'Manual').map(s => (
                            <label key={s.id} className="flex items-center space-x-2 text-sm">
                                <input type="checkbox" checked={tournamentStrategies.includes(s.id)} onChange={() => handleTournamentSelect(s.id)} 
                                className="form-checkbox h-4 w-4 rounded bg-brand-steel border-brand-silver text-blue-500 focus:ring-blue-500" />
                                <span>{s.name}</span>
                            </label>
                        ))}
                    </div>
                </div>
            )}
            
            <div>
                 <InfoTooltip text="Set the total number of rounds for each simulation match.">
                    <label className="block text-sm font-medium text-brand-silver mb-1">Number of Rounds ({numRounds})</label>
                 </InfoTooltip>
                <input type="range" min="1" max="50" value={numRounds} onChange={e => setNumRounds(parseInt(e.target.value))} className="w-full h-2 bg-brand-steel rounded-lg appearance-none cursor-pointer" />
            </div>

            <div>
                <InfoTooltip text="Introduce randomness. A 10% noise means there's a 10% chance a terminal's intended move is flipped, simulating miscommunication or unforeseen events.">
                     <label className="block text-sm font-medium text-brand-silver mb-1">Market Noise ({ (noise * 100).toFixed(0) }%)</label>
                </InfoTooltip>
                 <input type="range" min="0" max="0.5" step="0.01" value={noise} onChange={e => setNoise(parseFloat(e.target.value))} className="w-full h-2 bg-brand-steel rounded-lg appearance-none cursor-pointer" />
            </div>
            
            <div className="flex space-x-4">
                <button onClick={onRun} className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-md transition-colors" disabled={simulationState === 'running' || (mode === 'Tournament' && tournamentStrategies.length < 2)}>
                    {simulationState === 'running' ? 'Running...' : 'Run Simulation'}
                </button>
                <button onClick={onReset} className="flex-1 bg-brand-steel hover:bg-brand-silver text-white font-bold py-2 px-4 rounded-md transition-colors">Reset All</button>
            </div>
            
            <div className="border-t border-brand-steel pt-4 space-y-4">
                <div className="flex space-x-4">
                    <button onClick={() => setView('simulation')} disabled={view === 'simulation'} className="flex-1 bg-brand-steel hover:bg-brand-silver text-white font-bold py-2 px-4 rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
                        Latest Run
                    </button>
                    <button onClick={() => setView('comparison')} disabled={view === 'comparison' || comparisonCount === 0} className="flex-1 bg-brand-steel hover:bg-brand-silver text-white font-bold py-2 px-4 rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
                        Compare ({comparisonCount})
                    </button>
                </div>
                <button onClick={onAddToComparison} disabled={mode !== 'Batch' || simulationState !== 'finished'} className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-4 rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
                   Add to Comparison
                </button>
                 <p className="text-xs text-brand-silver text-center">Run a 'Batch' simulation to enable comparison.</p>
            </div>
             <style>{`
                .toggle-checkbox:checked { right: 0; border-color: #4A90E2; }
                .toggle-checkbox:checked + .toggle-label { background-color: #4A90E2; }
             `}</style>
        </div>
    );
};


const WelcomeMessage = () => (
    <div className="flex flex-col items-center justify-center h-full text-center text-brand-silver">
        <ChartIcon />
        <h2 className="text-2xl font-bold text-white my-2">Ready to Strategize?</h2>
        <p>Configure your simulation on the left and click "Run Simulation" to see the outcome.</p>
        <p className="mt-4 text-sm">Use the "Game Guide" button in the top-right for a detailed explanation.</p>
    </div>
);

const ResultsDisplay: React.FC<{
    mode: GameMode,
    results: RoundResult[],
    tournamentResults: TournamentScore[],
    totalPayoffA: number,
    totalPayoffB: number
}> = ({ mode, results, tournamentResults, totalPayoffA, totalPayoffB }) => {
    
    if (mode === 'Tournament') {
        return (
            <div>
                 <h2 className="text-2xl font-bold mb-4 text-white">Tournament Results</h2>
                 <div className="space-y-4">
                     {tournamentResults.map((res, index) => (
                         <div key={res.strategy} className="flex items-center justify-between bg-brand-blue p-3 rounded-md">
                             <div className="flex items-center">
                                 <span className={`text-xl font-bold w-8 text-center ${index < 3 ? 'text-yellow-400' : 'text-brand-silver'}`}>{index + 1}</span>
                                 <span className="ml-4 text-white">{STRATEGIES.find(s => s.id === res.strategy)?.name}</span>
                             </div>
                             <span className="font-semibold text-lg text-green-400">{res.score}M</span>
                         </div>
                     ))}
                 </div>
            </div>
        );
    }
    
    const chartData = results.reduce<any[]>((acc, res) => {
        const last = acc.length > 0 ? acc[acc.length - 1] : { cumulativeA: 0, cumulativeB: 0 };
        acc.push({
            round: res.round,
            cumulativeA: last.cumulativeA + res.payoffA,
            cumulativeB: last.cumulativeB + res.payoffB,
        });
        return acc;
    }, []);

    return (
        <div className="flex flex-col h-full">
            <h2 className="text-2xl font-bold mb-4 text-white">Simulation Outcome</h2>
            <div className="flex-grow h-64 mb-4">
                 <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={chartData} margin={{ top: 5, right: 20, left: -10, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#415A77" />
                        <XAxis dataKey="round" stroke="#E0E1DD" />
                        <YAxis stroke="#E0E1DD" />
                        <Tooltip contentStyle={{ backgroundColor: '#0D1B2A', border: '1px solid #415A77' }}/>
                        <Legend />
                        <Line type="monotone" dataKey="cumulativeA" name="Terminal A" stroke="#3498db" strokeWidth={2} />
                        <Line type="monotone" dataKey="cumulativeB" name="Terminal B" stroke="#e74c3c" strokeWidth={2} />
                    </LineChart>
                </ResponsiveContainer>
            </div>
             <div className="overflow-y-auto max-h-80">
                <table className="w-full text-sm text-left text-brand-silver">
                    <thead className="text-xs text-white uppercase bg-brand-blue sticky top-0">
                        <tr>
                            <th scope="col" className="px-4 py-2">Round</th>
                            <th scope="col" className="px-4 py-2">A Action</th>
                            <th scope="col" className="px-4 py-2">B Action</th>
                            <th scope="col" className="px-4 py-2">A Profit</th>
                            <th scope="col" className="px-4 py-2">B Profit</th>
                        </tr>
                    </thead>
                    <tbody>
                        {results.map(r => (
                             <tr key={r.round} className="border-b border-brand-steel">
                                <td className="px-4 py-2">{r.round}</td>
                                <td className={`px-4 py-2 font-semibold`}>
                                   <div className='flex items-center'>
                                     <span className={r.actionA === 0 ? 'text-green-400' : 'text-red-400'}>
                                        {r.actionA === 0 ? 'Cooperate' : 'Compete'}
                                     </span>
                                     {r.overrideA && (
                                        <InfoTooltip text="CEO Override">
                                            <OverrideIcon />
                                        </InfoTooltip>
                                     )}
                                   </div>
                                </td>
                                <td className={`px-4 py-2 font-semibold ${r.actionB === 0 ? 'text-green-400' : 'text-red-400'}`}>{r.actionB === 0 ? 'Cooperate' : 'Compete'}</td>
                                <td className="px-4 py-2">{r.payoffA}M</td>
                                <td className="px-4 py-2">{r.payoffB}M</td>
                             </tr>
                        ))}
                    </tbody>
                    <tfoot>
                        <tr className="font-bold text-white">
                            <td className="px-4 py-2">Total</td>
                            <td className="px-4 py-2"></td>
                            <td className="px-4 py-2"></td>
                            <td className="px-4 py-2">{totalPayoffA}M</td>
                            <td className="px-4 py-2">{totalPayoffB}M</td>
                        </tr>
                    </tfoot>
                </table>
             </div>
        </div>
    );
};

const InteractiveDisplay: React.FC<{
    gameState: GameState,
    numRounds: number,
    strategyA: Strategy,
    onStep: (action: Action, wasOverride: boolean) => void,
    isAdvancedMode: boolean
}> = ({gameState, numRounds, strategyA, onStep, isAdvancedMode}) => {
    
    const isFinished = gameState.currentRound >= numRounds;
    const lastResult = gameState.results.length > 0 ? gameState.results[gameState.results.length-1] : null;

    let recommendedAction: Action | null = null;
    if (isAdvancedMode && strategyA !== 'Manual' && !isFinished) {
        recommendedAction = getActionForStrategy(
            strategyA,
            gameState.historyA,
            gameState.historyB,
            gameState.totalPayoffA,
            gameState.consecutiveDefectsB,
            gameState.currentRound
        );
    }

    return (
        <div className="flex flex-col h-full">
            <div className="flex justify-between items-center mb-4">
                <h2 className="text-2xl font-bold text-white">Interactive Mode</h2>
                <span className="text-lg font-semibold text-brand-silver">Round {Math.min(gameState.currentRound + 1, numRounds)} / {numRounds}</span>
            </div>
            
            {!isFinished && (
                <div className="bg-brand-blue p-4 rounded-lg border border-brand-steel mb-4">
                     {lastResult && (
                        <div className="mb-4 p-3 bg-brand-blue rounded-md border border-brand-steel">
                            <h4 className="font-semibold text-brand-silver">Last Round's Outcome (Round {lastResult.round}):</h4>
                            <div className="flex justify-around text-sm mt-1">
                                <span>Your Action: <strong className={lastResult.actionA === 0 ? 'text-green-400' : 'text-red-400'}>{lastResult.actionA === 0 ? 'Cooperate' : 'Compete'}</strong></span>
                                <span>Terminal B's Action: <strong className={lastResult.actionB === 0 ? 'text-green-400' : 'text-red-400'}>{lastResult.actionB === 0 ? 'Cooperate' : 'Compete'}</strong></span>
                            </div>
                             <div className="flex justify-around text-sm mt-1">
                                <span>Your Profit: <strong className="text-white">{lastResult.payoffA}M</strong></span>
                                <span>Terminal B's Profit: <strong className="text-white">{lastResult.payoffB}M</strong></span>
                            </div>
                        </div>
                    )}
                    
                    {isAdvancedMode && recommendedAction !== null ? (
                        <div>
                             <h3 className="text-lg font-semibold mb-2">CEO Override Decision</h3>
                             <div className="bg-brand-blue p-3 rounded-md text-center mb-4 border border-yellow-500">
                                <p className="text-sm text-brand-silver">Your chosen strategy, '{STRATEGIES.find(s=>s.id === strategyA)?.name}', recommends you:</p>
                                <p className={`text-xl font-bold ${recommendedAction === 0 ? 'text-green-400' : 'text-red-400'}`}>
                                    {recommendedAction === 0 ? 'COOPERATE' : 'COMPETE'}
                                </p>
                             </div>
                            <p className="text-sm text-brand-silver mb-4">What is your final decision?</p>
                             <div className="flex space-x-4">
                                <button onClick={() => onStep(recommendedAction!, false)} className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-md transition-colors">Follow Recommendation</button>
                                <button onClick={() => onStep(recommendedAction === 0 ? 1 : 0, true)} className="flex-1 bg-yellow-600 hover:bg-yellow-700 text-white font-bold py-2 px-4 rounded-md transition-colors">Override</button>
                            </div>
                        </div>
                    ) : (
                         <div>
                            <h3 className="text-lg font-semibold mb-2">Your Move as Terminal A</h3>
                            <p className="text-sm text-brand-silver mb-4">Choose your action for the current round.</p>
                            <div className="flex space-x-4">
                                <button onClick={() => onStep(0, false)} className="flex-1 bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-4 rounded-md transition-colors">Cooperate</button>
                                <button onClick={() => onStep(1, false)} className="flex-1 bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-4 rounded-md transition-colors">Compete Aggressively</button>
                            </div>
                        </div>
                    )}
                </div>
            )}
            
            {isFinished && (
                 <div className="text-center bg-brand-blue p-6 rounded-lg border border-green-500 mb-4">
                    <h3 className="text-2xl font-bold text-green-400">Simulation Complete!</h3>
                    <p className="text-brand-silver mt-2">Check the final results below.</p>
                </div>
            )}
            
             <ResultsDisplay 
                mode="Batch"
                results={gameState.results}
                tournamentResults={[]}
                totalPayoffA={gameState.totalPayoffA}
                totalPayoffB={gameState.totalPayoffB}
            />
        </div>
    );
}

const ComparisonDisplay: React.FC<{ runs: ComparisonRun[], onClear: () => void }> = ({ runs, onClear }) => {
    if (runs.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center h-full text-center text-brand-silver">
                <h2 className="text-2xl font-bold text-white mb-2">Comparison View</h2>
                <p>Run a 'Batch' simulation and click "Add to Comparison" to get started.</p>
            </div>
        );
    }

    const colors = ['#3498db', '#e74c3c', '#2ecc71', '#f1c40f', '#9b59b6', '#1abc9c', '#e67e22', '#34495e'];
    const barChartData = runs.map((run, index) => ({
        name: `Run ${index + 1}: ${STRATEGIES.find(s=>s.id === run.strategyA)?.name} v ${STRATEGIES.find(s=>s.id === run.strategyB)?.name}`,
        'Terminal A': run.totalPayoffA,
        'Terminal B': run.totalPayoffB,
    }));


    return (
        <div className="flex flex-col h-full space-y-4">
            <div className="flex justify-between items-center">
                <h2 className="text-2xl font-bold text-white">Comparison of Runs</h2>
                <button onClick={onClear} className="bg-red-600 hover:bg-red-700 text-white font-bold py-1 px-3 rounded-md text-sm transition-colors">Clear All</button>
            </div>
            
            {/* Final Totals Bar Chart */}
            <div>
                 <h3 className="text-lg font-semibold text-white mb-2">Final Profit Comparison</h3>
                 <div className="h-48">
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={barChartData} margin={{ top: 20, right: 20, left: -10, bottom: 20 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#415A77" />
                            <XAxis dataKey="name" stroke="#E0E1DD" angle={-25} textAnchor="end" height={50} interval={0} />
                            <YAxis stroke="#E0E1DD" />
                            <Tooltip contentStyle={{ backgroundColor: '#0D1B2A', border: '1px solid #415A77' }}/>
                            <Legend />
                            <Bar dataKey="Terminal A" fill="#3498db">
                               <LabelList dataKey="Terminal A" position="top" style={{ fill: '#E0E1DD', fontSize: '12px' }} formatter={(value: number) => `${value}M`} />
                            </Bar>
                            <Bar dataKey="Terminal B" fill="#e74c3c">
                                <LabelList dataKey="Terminal B" position="top" style={{ fill: '#E0E1DD', fontSize: '12px' }} formatter={(value: number) => `${value}M`} />
                            </Bar>
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            </div>

            {/* Profit Over Time Line Chart */}
             <div>
                <h3 className="text-lg font-semibold text-white mb-2">Profit Over Time</h3>
                <div className="h-48">
                    <ResponsiveContainer width="100%" height="100%">
                        <LineChart margin={{ top: 5, right: 20, left: -10, bottom: 5 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#415A77" />
                            <XAxis dataKey="round" type="number" domain={[1, Math.max(...runs.map(r => r.chartData.length))]} stroke="#E0E1DD" allowDuplicatedCategory={false} />
                            <YAxis stroke="#E0E1DD" />
                            <Tooltip contentStyle={{ backgroundColor: '#0D1B2A', border: '1px solid #415A77' }} />
                            <Legend />
                            {runs.map((run, index) => (
                               <React.Fragment key={run.id}>
                                   <Line data={run.chartData} type="monotone" dataKey="cumulativeA" name={`Run ${index + 1} A`} stroke={colors[index % colors.length]} strokeWidth={2} dot={false} strokeDasharray="5 5" />
                                   <Line data={run.chartData} type="monotone" dataKey="cumulativeB" name={`Run ${index + 1} B`} stroke={colors[index % colors.length]} strokeWidth={2} dot={false} />
                               </React.Fragment>
                            ))}
                        </LineChart>
                    </ResponsiveContainer>
                </div>
             </div>

             <div className="overflow-y-auto flex-shrink">
                <table className="w-full text-sm text-left text-brand-silver">
                    <thead className="text-xs text-white uppercase bg-brand-navy sticky top-0">
                        <tr>
                            <th scope="col" className="px-4 py-2">Run</th>
                            <th scope="col" className="px-4 py-2">A Strategy</th>
                            <th scope="col" className="px-4 py-2">B Strategy</th>
                            <th scope="col" className="px-4 py-2">Noise</th>
                            <th scope="col" className="px-4 py-2">A Total</th>
                            <th scope="col" className="px-4 py-2">B Total</th>
                        </tr>
                    </thead>
                    <tbody>
                        {runs.map((run, index) => (
                             <tr key={run.id} className="border-b border-brand-steel">
                                <td className="px-4 py-2 font-bold" style={{color: colors[index % colors.length]}}>Run {index+1}</td>
                                <td className="px-4 py-2">{STRATEGIES.find(s=>s.id === run.strategyA)?.name}</td>
                                <td className="px-4 py-2">{STRATEGIES.find(s=>s.id === run.strategyB)?.name}</td>
                                <td className="px-4 py-2">{(run.noise * 100).toFixed(0)}%</td>
                                <td className="px-4 py-2 font-semibold">{run.totalPayoffA}M</td>
                                <td className="px-4 py-2 font-semibold">{run.totalPayoffB}M</td>
                             </tr>
                        ))}
                    </tbody>
                </table>
             </div>
        </div>
    );
};

const PostGameReflection: React.FC<{
    results: RoundResult[];
    strategyA: Strategy;
    strategyB: Strategy;
    noise: number;
}> = ({ results, strategyA, strategyB, noise }) => {
    const [analysis, setAnalysis] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');

    const handleGenerateAnalysis = async () => {
        setIsLoading(true);
        setError('');
        setAnalysis('');
        try {
            const ai = new GoogleGenAI({ apiKey: process.env.API_KEY as string });
            const totalPayoffA = results.reduce((sum, r) => sum + r.payoffA, 0);
            const totalPayoffB = results.reduce((sum, r) => sum + r.payoffB, 0);

            // Summarize key events to keep the prompt concise
            const firstDefectionA = results.find(r => r.actionA === 1)?.round;
            const firstDefectionB = results.find(r => r.actionB === 1)?.round;
            const mutualDefections = results.filter(r => r.actionA === 1 && r.actionB === 1).length;
            
            let keyEvents = "The game started with mutual cooperation. ";
            if (firstDefectionA || firstDefectionB) {
                 const firstDefector = firstDefectionA === firstDefectionB 
                    ? "Both terminals" 
                    : (firstDefectionA && (!firstDefectionB || firstDefectionA < firstDefectionB)) ? "Terminal A" : "Terminal B";
                 const firstRound = Math.min(firstDefectionA || Infinity, firstDefectionB || Infinity);
                 keyEvents = `${firstDefector} defected first in round ${firstRound}. There were ${mutualDefections} rounds of mutual competition.`;
            }

            const prompt = `
                You are a game theory expert analyzing a simulation based on the 'Navigating Competition and Complexity of a Container Terminal' case study.

                Here is the summary of a simulation run:
                - Terminal A's Strategy: ${STRATEGIES.find(s => s.id === strategyA)?.name}
                - Terminal B's Strategy: ${STRATEGIES.find(s => s.id === strategyB)?.name}
                - Market Noise: ${(noise * 100).toFixed(0)}%
                - Number of Rounds: ${results.length}
                - Final Score: Terminal A (${totalPayoffA}M), Terminal B (${totalPayoffB}M)
                - Key Events: ${keyEvents}

                IMPORTANT: The "Market Noise" is a critical factor. Explain how a ${ (noise * 100).toFixed(0) }% chance of a move being randomly flipped can cause misunderstandings. For example, a strategy like Tit-for-Tat might intend to cooperate, but noise can flip its move to compete, triggering a cycle of retaliation. Analyze if this happened.

                Based on this outcome, provide a concise, expert analysis (2-3 paragraphs) addressing these key questions for a business student:
                1. Was there a key turning point? What caused it?
                2. How did Terminal A's strategy perform against this specific opponent?
                3. CRITICALLY: How did the ${(noise * 100).toFixed(0)}% market noise affect the outcome? Did it cause any unintended escalations?

                Focus on explaining the 'why' behind the numbers and the core strategic lesson learned. Keep the tone insightful, educational, and easy to understand.
            `;
            
            const response = await ai.models.generateContent({
                model: 'gemini-2.5-flash',
                contents: prompt,
            });

            setAnalysis(response.text);

        } catch (e: any) {
            console.error("Error generating analysis:", e);
            setError("Failed to generate analysis. Please ensure the API key is configured correctly.");
        } finally {
            setIsLoading(false);
        }
    };


    return (
        <div className="mt-8 p-4 bg-brand-blue border-t-4 border-brand-steel rounded-lg shadow-inner">
            <h3 className="text-xl font-bold text-white mb-3">Post-Game Debrief</h3>
            <div className="p-4 bg-brand-navy rounded-md">
                <h4 className="font-semibold text-lg text-brand-light mb-2">Reflection Questions</h4>
                <ul className="list-disc list-inside space-y-2 text-brand-light">
                    <li>Looking at the profit chart, was there a key turning point where one terminal gained a clear advantage? What caused it?</li>
                    <li>How did your chosen strategy perform? Would it have been more or less successful against a different opponent strategy?</li>
                    <li>If you added 'Market Noise', how did it affect the outcome? Does this suggest that simple, forgiving strategies are more robust in the real world?</li>
                </ul>
            </div>
            
            <div className="mt-4 flex justify-center">
                 <button
                    onClick={handleGenerateAnalysis}
                    disabled={isLoading}
                    className="flex items-center justify-center w-full max-w-xs bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-4 rounded-md transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
                >
                    {isLoading ? (
                        <>
                            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-3"></div>
                            <span>Analyzing...</span>
                        </>
                    ) : (
                        <>
                            <SparklesIcon />
                            Kowalski, Analysis!
                        </>
                    )}
                </button>
            </div>

            {error && <p className="mt-4 text-center text-red-400">{error}</p>}

            {analysis && (
                <div className="mt-4 p-4 bg-brand-blue border border-brand-steel rounded-md">
                     <h4 className="font-semibold text-lg text-brand-light mb-2">Expert Analysis</h4>
                     <p className="text-brand-silver whitespace-pre-wrap">{analysis}</p>
                </div>
            )}
        </div>
    );
};


const GameGuideModal: React.FC<{ isOpen: boolean, onClose: () => void }> = ({ isOpen, onClose }) => {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4" onClick={onClose}>
            <div className="bg-brand-navy rounded-lg shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
                <div className="sticky top-0 bg-brand-navy p-4 border-b border-brand-steel flex justify-between items-center">
                    <h2 className="text-2xl font-bold text-white">Game Guide & Concepts</h2>
                    <button onClick={onClose} className="text-white text-2xl">&times;</button>
                </div>
                <div className="p-6 space-y-6 text-brand-light">

                    <GuideSection title="How to Play (Quick Start)">
                         <ol className="list-decimal list-inside space-y-2 pl-4">
                            <li><strong>Select a Mode:</strong> Start with 'Batch Run' to see how different automated strategies compete.</li>
                            <li><strong>Choose Strategies:</strong> Pick a strategy for Terminal A and Terminal B from the dropdowns.</li>
                            <li><strong>Set Parameters:</strong> Adjust the number of rounds and the level of 'Market Noise'.</li>
                            <li><strong>Run Simulation:</strong> Click the "Run Simulation" button to see the results.</li>
                            <li><strong>Analyze & Compare:</strong> Review the profit charts and round-by-round results. Use the "Add to Comparison" button after a Batch run to compare different scenarios side-by-side.</li>
                        </ol>
                    </GuideSection>

                    <GuideSection title="The Scenario">
                        <p>You are the CEO of Terminal A. A new, aggressive competitor, Terminal B, has entered the market, poaching your high-value customers. Your goal is to navigate this competitive landscape to maximize your terminal's profitability over a series of rounds (months).</p>
                    </GuideSection>
                    <GuideSection title="Core Actions">
                        <p><strong className="text-green-400">Cooperate (Share Market):</strong> A less aggressive move. This represents a strategy of stabilizing prices and avoiding a price war. It may lead to predictable, shared profits but risks being exploited if your competitor acts aggressively.</p>
                        <p><strong className="text-red-400">Compete (Aggressively Poach):</strong> A defecting move. This represents undercutting prices or launching aggressive marketing campaigns to steal market share. It can lead to high short-term gains if your competitor cooperates, but risks a mutually destructive price war if they also compete.</p>
                    </GuideSection>
                    <GuideSection title="Simulation Modes">
                       <p><strong>Batch Run:</strong> The primary mode for analysis. You set the strategies for both terminals, and the simulation runs automatically for all rounds. Use this to test how different strategies perform against each other.</p>
                       <p><strong>Interactive:</strong> Puts you in the driver's seat. You manually choose Terminal A's action each round, reacting to Terminal B's moves. This mode helps you develop an intuition for the game's dynamics.</p>
                       <p><strong>Tournament:</strong> A round-robin competition where every selected strategy plays against every other selected strategy. The winner is the one with the highest total profit, proving its robustness in a varied environment.</p>
                    </GuideSection>
                    <GuideSection title="Key Concepts">
                         <p><strong>Strategy:</strong> A pre-defined set of rules that a terminal follows to decide its action each round. For example, 'Tit-for-Tat' is a reactive strategy, while 'Always Defect' is a simple, aggressive one.</p>
                         <p><strong>Number of Rounds:</strong> The duration of the simulation. Longer games allow for more complex interactions and for the long-term consequences of strategies to become apparent.</p>
                         <p><strong>Market Noise:</strong> Simulates real-world uncertainty. A 10% noise level means there is a 10% chance in any given round that a terminal's intended action is flipped (e.g., a planned cooperative move is misinterpreted as aggression). Noise tests a strategy's resilience to error.</p>
                    </GuideSection>
                    <GuideSection title="Strategies Explained">
                        {STRATEGIES.filter(s => s.id !== 'Manual').map(strategy => (
                            <p key={strategy.id}>
                                <strong className="text-white">{strategy.name}:</strong> {strategy.description}
                            </p>
                        ))}
                    </GuideSection>
                     <GuideSection title="Advanced Play: The CEO Override (Interactive Mode)">
                        <p>When playing in Interactive mode with any strategy other than 'Manual', you can enable 'Advanced Mode'. This transforms the game into a realistic leadership simulation.</p>
                        <ul className="list-disc list-inside space-y-2 pl-4">
                          <li><strong>Strategy vs. Instinct:</strong> Each round, the game will show you the action recommended by your chosen strategy.</li>
                          <li><strong>The Final Call:</strong> You then have the final say. Will you trust your long-term strategy and follow the recommendation, or will you override it based on a gut feeling, a short-term opportunity, or pressure from the board?</li>
                          <li><strong>Learning Value:</strong> This mode directly teaches the challenge of strategic discipline. It forces you to weigh the rational, data-driven choice against your own intuition and the temptation to react emotionally, providing powerful insights into real-world executive decision-making.</li>
                        </ul>
                    </GuideSection>
                    <GuideSection title="Interpreting the Outcome">
                       <p>The main goal is to achieve the highest cumulative profit. The line chart visualizes this over time. Observe which strategies lead to stable growth versus those that cause volatile swings. In the results table, analyze round-by-round decisions to understand *why* a strategy succeeded or failed. Did it successfully exploit a passive opponent, or did it get trapped in a costly feud?</p>
                    </GuideSection>
                    <GuideSection title="Strategic Questions to Consider">
                       <details className="p-2 rounded-md bg-brand-blue cursor-pointer">
                           <summary className="font-semibold text-white">Which strategy is best against an 'Always Defect' opponent?</summary>
                           <p className="mt-2 text-sm text-brand-silver">Run 'Tit-for-Tat' vs. 'Always Defect'. Notice that while you can't "win" against a consistent defector, retaliating immediately (like TFT does) minimizes your losses compared to a strategy like 'Always Cooperate', which would be heavily exploited. This teaches the importance of defensive, reciprocal strategies.</p>
                       </details>
                       <details className="p-2 rounded-md bg-brand-blue cursor-pointer">
                           <summary className="font-semibold text-white">How does 'Market Noise' affect cooperative strategies?</summary>
                           <p className="mt-2 text-sm text-brand-silver">Run a 'Tit-for-Tat' vs. 'Tit-for-Tat' game with 0% noise, then run it again with 15% noise. See how a single accidental defection caused by noise can trigger a long cycle of mutual retaliation. This highlights the value of more forgiving strategies in uncertain, real-world environments.</p>
                       </details>
                       <details className="p-2 rounded-md bg-brand-blue cursor-pointer">
                           <summary className="font-semibold text-white">Why is 'Tit-for-Tat' often considered a robust strategy?</summary>
                           <p className="mt-2 text-sm text-brand-silver">Run a Tournament. 'Tit-for-Tat' often performs well because it is nice (starts by cooperating), retaliatory (punishes defection immediately), forgiving (returns to cooperation), and clear (its rules are simple for the opponent to understand). It succeeds by encouraging cooperation while protecting itself from exploitation.</p>
                       </details>
                    </GuideSection>
                </div>
            </div>
        </div>
    );
};

const GuideSection: React.FC<{ title: string, children: React.ReactNode }> = ({ title, children }) => (
    <div>
        <h3 className="text-xl font-semibold text-white border-b-2 border-brand-steel pb-2 mb-2">{title}</h3>
        <div className="space-y-2 text-brand-silver">
            {children}
        </div>
    </div>
);
