import React, { useState, useEffect } from 'react';
import { Trophy, ArrowLeft, Play, Save, RotateCcw } from 'lucide-react';
import { LeagueTableEntry, Squad } from '../types';
import { motion, AnimatePresence } from 'motion/react';

interface LeagueScreenProps {
  onBack: () => void;
  onStartMatch: (opponent: string, difficulty: 'EASY' | 'MEDIUM' | 'HARD') => void;
  teamName: string;
}

const TEAMS = [
  'Manchester City', 'Real Madrid', 'Bayern Munich', 'Liverpool', 
  'PSG', 'Arsenal', 'Inter Milan', 'Barcelona', 'Bayer Leverkusen', 'Atletico Madrid'
];

export default function LeagueScreen({ onBack, onStartMatch, teamName }: LeagueScreenProps) {
  const [table, setTable] = useState<LeagueTableEntry[]>([]);
  const [season, setSeason] = useState(1);
  const [matchDay, setMatchDay] = useState(1);

  useEffect(() => {
    const saved = localStorage.getItem(`league_data_${teamName}`);
    if (saved) {
      const parsed = JSON.parse(saved);
      setTable(parsed.table);
      setSeason(parsed.season);
      setMatchDay(parsed.matchDay);
    } else {
      resetLeague();
    }
  }, [teamName]);

  const resetLeague = () => {
    const initialTable: LeagueTableEntry[] = [
      { teamName, played: 0, won: 0, drawn: 0, lost: 0, gf: 0, ga: 0, points: 0, isUser: true },
      ...TEAMS.map(name => ({ teamName: name, played: 0, won: 0, drawn: 0, lost: 0, gf: 0, ga: 0, points: 0 }))
    ].sort((a, b) => b.points - a.points);
    setTable(initialTable);
    setSeason(1);
    setMatchDay(1);
    saveLeague(initialTable, 1, 1);
  };

  const saveLeague = (newTable: LeagueTableEntry[], s: number, m: number) => {
    localStorage.setItem(`league_data_${teamName}`, JSON.stringify({
      table: newTable,
      season: s,
      matchDay: m
    }));
  };

  const handleSimulateOthers = () => {
    const newTable = [...table].map(entry => {
      if (entry.isUser) return entry;
      
      // Simulate a match for other teams
      const goalsFor = Math.floor(Math.random() * 4);
      const goalsAgainst = Math.floor(Math.random() * 4);
      
      let won = entry.won;
      let drawn = entry.drawn;
      let lost = entry.lost;
      let points = entry.points;

      if (goalsFor > goalsAgainst) {
        won++;
        points += 3;
      } else if (goalsFor === goalsAgainst) {
        drawn++;
        points += 1;
      } else {
        lost++;
      }

      return {
        ...entry,
        played: entry.played + 1,
        won,
        drawn,
        lost,
        gf: entry.gf + goalsFor,
        ga: entry.ga + goalsAgainst,
        points
      };
    }).sort((a, b) => {
      if (b.points !== a.points) return b.points - a.points;
      return (b.gf - b.ga) - (a.gf - a.ga);
    });

    setTable(newTable);
    setMatchDay(m => m + 1);
    saveLeague(newTable, season, matchDay + 1);
  };

  const nextOpponent = TEAMS[(matchDay - 1) % TEAMS.length];

  const getDifficulty = (team: string): 'EASY' | 'MEDIUM' | 'HARD' => {
    const hardTeams = ['Real Madrid', 'Manchester City', 'Bayern Munich', 'Liverpool'];
    const mediumTeams = ['PSG', 'Arsenal', 'Inter Milan', 'Barcelona'];
    if (hardTeams.includes(team)) return 'HARD';
    if (mediumTeams.includes(team)) return 'MEDIUM';
    return 'EASY';
  };

  return (
    <div className="min-h-screen bg-zinc-950 p-6 overflow-y-auto">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <button onClick={onBack} className="p-2 hover:bg-zinc-900 rounded-full transition-colors">
            <ArrowLeft className="w-6 h-6" />
          </button>
          <div className="text-center">
            <h1 className="text-3xl font-black italic text-emerald-500">CHAMPIONS LEAGUE</h1>
            <p className="text-zinc-400">Season {season} • Matchday {matchDay}/38</p>
          </div>
          <button onClick={resetLeague} className="p-2 hover:bg-zinc-900 rounded-full transition-colors text-red-500" title="Reset Season">
            <RotateCcw className="w-6 h-6" />
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Standings */}
          <div className="lg:col-span-2 bg-zinc-900/50 rounded-2xl border border-zinc-800 overflow-hidden">
            <div className="p-4 border-b border-zinc-800 bg-zinc-900/80 flex items-center justify-between">
              <h2 className="font-bold flex items-center gap-2">
                <Trophy className="w-5 h-5 text-yellow-500" />
                League Standings
              </h2>
            </div>
            <table className="w-full text-left">
              <thead>
                <tr className="text-zinc-500 text-xs uppercase border-b border-zinc-800">
                  <th className="px-4 py-3">Pos</th>
                  <th className="px-4 py-3">Team</th>
                  <th className="px-4 py-3 text-center">P</th>
                  <th className="px-4 py-3 text-center">W</th>
                  <th className="px-4 py-3 text-center">D</th>
                  <th className="px-4 py-3 text-center">L</th>
                  <th className="px-4 py-3 text-center">GD</th>
                  <th className="px-4 py-3 text-center">Pts</th>
                </tr>
              </thead>
              <tbody>
                {table.map((entry, idx) => (
                  <tr key={entry.teamName} className={`border-b border-zinc-800/50 ${entry.isUser ? 'bg-emerald-500/10' : ''}`}>
                    <td className="px-4 py-3 font-mono text-zinc-400">{idx + 1}</td>
                    <td className={`px-4 py-3 font-bold ${entry.isUser ? 'text-emerald-400' : 'text-white'}`}>
                      {entry.teamName}
                    </td>
                    <td className="px-4 py-3 text-center text-zinc-300">{entry.played}</td>
                    <td className="px-4 py-3 text-center text-zinc-300">{entry.won}</td>
                    <td className="px-4 py-3 text-center text-zinc-300">{entry.drawn}</td>
                    <td className="px-4 py-3 text-center text-zinc-300">{entry.lost}</td>
                    <td className="px-4 py-3 text-center text-zinc-300">{entry.gf - entry.ga}</td>
                    <td className="px-4 py-3 text-center font-bold text-emerald-500">{entry.points}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Next Match */}
          <div className="space-y-6">
            <div className="bg-zinc-900/50 rounded-2xl border border-zinc-800 p-6">
              <h2 className="text-zinc-400 text-sm uppercase font-bold mb-4">Next Match</h2>
              <div className="flex items-center justify-between mb-6">
                <div className="text-center flex-1">
                  <div className="w-16 h-16 bg-emerald-500/20 rounded-full flex items-center justify-center mx-auto mb-2 border border-emerald-500/30">
                    <span className="text-2xl font-black italic text-emerald-500">{teamName[0]}</span>
                  </div>
                  <p className="text-sm font-bold truncate">{teamName}</p>
                </div>
                <div className="px-4 text-zinc-500 font-black italic">VS</div>
                <div className="text-center flex-1">
                  <div className="w-16 h-16 bg-zinc-800 rounded-full flex items-center justify-center mx-auto mb-2 border border-zinc-700">
                    <span className="text-2xl font-black italic text-zinc-400">{nextOpponent[0]}</span>
                  </div>
                  <p className="text-sm font-bold truncate">{nextOpponent}</p>
                </div>
              </div>
              <button 
                onClick={() => onStartMatch(nextOpponent, getDifficulty(nextOpponent))}
                className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-4 rounded-xl transition-all flex items-center justify-center gap-2 shadow-lg shadow-emerald-900/20"
              >
                <Play className="w-5 h-5 fill-current" />
                PLAY MATCHDAY {matchDay}
              </button>
            </div>

            <div className="bg-zinc-900/50 rounded-2xl border border-zinc-800 p-6">
              <h2 className="text-zinc-400 text-sm uppercase font-bold mb-4">League Info</h2>
              <ul className="space-y-3 text-sm">
                <li className="flex justify-between">
                  <span className="text-zinc-500">Format</span>
                  <span className="text-white">Double Round Robin</span>
                </li>
                <li className="flex justify-between">
                  <span className="text-zinc-500">Total Teams</span>
                  <span className="text-white">11</span>
                </li>
                <li className="flex justify-between">
                  <span className="text-zinc-500">Reward</span>
                  <span className="text-emerald-400 font-bold">5000 Coins (Winner)</span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
