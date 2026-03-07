import React, { useState, useEffect, useRef } from 'react';
import { Trophy, Target, Zap, Footprints, ArrowLeft } from 'lucide-react';
import { Squad, Player } from '../types';
import MatchScreen from './MatchScreen';

interface Props {
  squad: Squad;
  onBack: () => void;
}

type DrillType = 'DRIBBLING' | 'PASSING' | 'SHOOTING' | 'PENALTY';

export default function PracticeScreen({ squad, onBack }: Props) {
  const [selectedDrill, setSelectedDrill] = useState<DrillType | null>(null);

  if (selectedDrill) {
    return (
      <MatchScreen 
        squad={squad} 
        onFinish={() => setSelectedDrill(null)} 
        forcedDifficulty="MEDIUM"
        mustHaveWinner={selectedDrill === 'PENALTY'}
        opponentName="PRACTICE AI"
        userTeamName="PRACTICE"
        mode={selectedDrill === 'PENALTY' ? 'PENALTY_SHOOTOUT' : 'TRAINING'}
        drillType={selectedDrill === 'PENALTY' ? undefined : selectedDrill}
      />
    );
  }

  // For other drills, we could implement specific mini-games.
  // For now, let's just use MatchScreen with a "Practice" mode flag if we want to customize it.
  // But the user specifically asked for dribbling, passing, shooting.
  
  const drills = [
    { id: 'DRIBBLING', name: 'Dribbling Master', icon: Footprints, color: 'text-emerald-400', desc: 'Navigate through cones and keep close control.' },
    { id: 'PASSING', name: 'Precision Passing', icon: Zap, color: 'text-blue-400', desc: 'Hit moving targets with accurate passes.' },
    { id: 'SHOOTING', name: 'Top Bins', icon: Target, color: 'text-red-400', desc: 'Practice finishing from various distances.' },
    { id: 'PENALTY', name: 'Penalty Shootout', icon: Trophy, color: 'text-yellow-400', desc: 'Test your nerves from the spot.' },
  ];

  return (
    <div className="h-full flex flex-col bg-transparent p-8 overflow-y-auto">
      <div className="flex items-center justify-between mb-12">
        <div className="flex items-center space-x-4">
          <div className="p-3 bg-emerald-500/20 rounded-2xl">
            <Trophy className="w-8 h-8 text-emerald-400" />
          </div>
          <div>
            <h2 className="text-4xl font-black italic tracking-tight">TRAINING GROUND</h2>
            <p className="text-zinc-400 font-medium">Sharpen your skills and master the game</p>
          </div>
        </div>
        <button 
          onClick={onBack}
          className="p-4 bg-zinc-900 border border-zinc-800 rounded-2xl hover:bg-zinc-800 transition-colors"
        >
          <ArrowLeft className="w-6 h-6" />
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-6xl mx-auto w-full">
        {drills.map((drill) => (
          <button
            key={drill.id}
            onClick={() => setSelectedDrill(drill.id as DrillType)}
            className="group relative bg-zinc-900/50 border border-zinc-800 p-8 rounded-[2rem] text-left hover:border-emerald-500/50 transition-all hover:bg-zinc-900 hover:scale-[1.02] overflow-hidden"
          >
            <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:opacity-10 transition-opacity">
              <drill.icon className="w-32 h-32" />
            </div>
            
            <div className={`w-16 h-16 rounded-2xl bg-zinc-800 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform`}>
              <drill.icon className={`w-8 h-8 ${drill.color}`} />
            </div>
            
            <h3 className="text-2xl font-black mb-2 italic">{drill.name}</h3>
            <p className="text-zinc-400 text-sm leading-relaxed max-w-[200px]">
              {drill.desc}
            </p>
            
            <div className="mt-8 flex items-center space-x-2 text-xs font-bold uppercase tracking-widest text-emerald-500 opacity-0 group-hover:opacity-100 transition-opacity">
              <span>Start Training</span>
              <Zap className="w-3 h-3 fill-current" />
            </div>
          </button>
        ))}
      </div>

      <div className="mt-12 p-8 bg-zinc-900/30 border border-zinc-800 rounded-[2rem] max-w-6xl mx-auto w-full">
        <h4 className="text-lg font-bold mb-4 flex items-center space-x-2">
          <Zap className="w-5 h-5 text-yellow-500" />
          <span>Training Tips</span>
        </h4>
        <ul className="grid grid-cols-1 md:grid-cols-3 gap-6 text-sm text-zinc-400">
          <li className="flex space-x-3">
            <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full mt-1.5 shrink-0" />
            <p>Higher <span className="text-white font-bold">DRI</span> stats allow for tighter turns and better ball retention during dribbling.</p>
          </li>
          <li className="flex space-x-3">
            <div className="w-1.5 h-1.5 bg-blue-500 rounded-full mt-1.5 shrink-0" />
            <p>Wait for the right moment to <span className="text-white font-bold">PASS</span>. Accuracy depends on your player's PAS stat.</p>
          </li>
          <li className="flex space-x-3">
            <div className="w-1.5 h-1.5 bg-red-500 rounded-full mt-1.5 shrink-0" />
            <p>When <span className="text-white font-bold">SHOOTING</span>, aim for the corners of the goal to beat the keeper.</p>
          </li>
        </ul>
      </div>
    </div>
  );
}
