import React, { useState, useEffect } from 'react';
import { WORLD_CUP_TEAMS, WorldCupTeam } from '../data/worldCupData';
import { generateRandomPlayer } from '../data/players';
import MatchScreen from './MatchScreen';
import { Player, Squad, Position } from '../types';
import { Trophy, Globe, Users, Play, ChevronRight, Shield } from 'lucide-react';
import { useAudio } from '../contexts/AudioContext';

type Stage = 'SELECT' | 'DRAW' | 'GROUPS' | 'KNOCKOUT' | 'MATCH' | 'CHAMPION';

interface Props {
  onBack: () => void;
}

interface GroupData {
  name: string;
  teams: WorldCupTeam[];
  matches: {
    id: number;
    teamA: string;
    teamB: string;
    scoreA: number | null;
    scoreB: number | null;
    played: boolean;
  }[];
}

interface KnockoutMatch {
  id: string;
  round: 'R16' | 'QF' | 'SF' | 'FINAL' | '3RD';
  teamA: string | null;
  teamB: string | null;
  scoreA: number | null;
  scoreB: number | null;
  winner: string | null;
  played: boolean;
  penaltyA?: number;
  penaltyB?: number;
}

export default function WorldCupScreen({ onBack }: Props) {
  const { playAudio, stopAudio } = useAudio();
  const [stage, setStage] = useState<Stage>('SELECT');
  const [selectedTeamId, setSelectedTeamId] = useState<string | null>(null);

  // Audio Logic
  useEffect(() => {
    if (stage === 'MATCH') {
      stopAudio('WORLDCUP_THEME');
    } else {
      playAudio('WORLDCUP_THEME', true);
    }
    return () => stopAudio('WORLDCUP_THEME');
  }, [stage]);

  const [groups, setGroups] = useState<GroupData[]>([]);
  const [knockoutMatches, setKnockoutMatches] = useState<KnockoutMatch[]>([]);
  const [currentMatch, setCurrentMatch] = useState<{
    opponentId: string;
    isKnockout: boolean;
    matchId: string | number;
    round?: string;
  } | null>(null);
  
  // Squad for match
  const [matchSquad, setMatchSquad] = useState<Squad | null>(null);

  // --- 1. Team Selection ---
  const handleSelectTeam = (id: string) => {
    setSelectedTeamId(id);
    // Generate squad for the selected team
    const team = WORLD_CUP_TEAMS.find(t => t.id === id);
    if (team) {
      // Create a squad of players based on team rating
      const positions = ['GK', 'LB', 'CB', 'CB', 'RB', 'CM', 'CM', 'CAM', 'LW', 'ST', 'RW'];
      const getPositionType = (pos: string): Position => {
        if (pos === 'GK') return 'GK';
        if (['LB', 'CB', 'RB'].includes(pos)) return 'DF';
        if (['CM', 'CAM'].includes(pos)) return 'MF';
        return 'FW';
      };

      const players: Player[] = Array(11).fill(null).map((_, i) => ({
        id: `${id}_${i}`,
        name: `${team.code} Player ${i+1}`,
        position: getPositionType(positions[i]),
        ovr: Math.floor(team.rating + (Math.random() * 6 - 3)),
        stats: {
          pac: Math.floor(team.rating + (Math.random() * 10 - 5)),
          sho: Math.floor(team.rating + (Math.random() * 10 - 5)),
          pas: Math.floor(team.rating + (Math.random() * 10 - 5)),
          dri: Math.floor(team.rating + (Math.random() * 10 - 5)),
          def: Math.floor(team.rating + (Math.random() * 10 - 5)),
          phy: Math.floor(team.rating + (Math.random() * 10 - 5)),
        },
        rarity: 'GOLD',
        image: `https://ui-avatars.com/api/?name=${team.code}+${i}&background=${team.color.replace('#', '')}&color=fff`,
        level: 1,
        xp: 0,
        nation: team.name
      }));
      
      setMatchSquad({
        formation: '4-3-3',
        lineup: players
      });
    }
  };

  const startDraw = () => {
    if (!selectedTeamId) return;
    setStage('DRAW');
    
    // Simulate Draw
    setTimeout(() => {
      const shuffled = [...WORLD_CUP_TEAMS].sort(() => Math.random() - 0.5);
      const newGroups: GroupData[] = [];
      const letters = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'];
      
      for (let i = 0; i < 8; i++) {
        const groupTeams = shuffled.slice(i * 4, (i + 1) * 4);
        
        // Generate fixtures
        const matches = [
          { id: i*10+1, teamA: groupTeams[0].id, teamB: groupTeams[1].id, scoreA: null, scoreB: null, played: false },
          { id: i*10+2, teamA: groupTeams[2].id, teamB: groupTeams[3].id, scoreA: null, scoreB: null, played: false },
          { id: i*10+3, teamA: groupTeams[0].id, teamB: groupTeams[2].id, scoreA: null, scoreB: null, played: false },
          { id: i*10+4, teamA: groupTeams[1].id, teamB: groupTeams[3].id, scoreA: null, scoreB: null, played: false },
          { id: i*10+5, teamA: groupTeams[0].id, teamB: groupTeams[3].id, scoreA: null, scoreB: null, played: false },
          { id: i*10+6, teamA: groupTeams[1].id, teamB: groupTeams[2].id, scoreA: null, scoreB: null, played: false },
        ];

        newGroups.push({
          name: `Group ${letters[i]}`,
          teams: groupTeams,
          matches
        });
      }
      setGroups(newGroups);
      
      // Delay to show draw result then go to groups
      setTimeout(() => setStage('GROUPS'), 2000);
    }, 1000);
  };

  // --- 2. Group Stage Logic ---
  const simulateGroupMatch = (groupIndex: number, matchIndex: number) => {
    const group = groups[groupIndex];
    const match = group.matches[matchIndex];
    if (match.played) return;

    const teamA = WORLD_CUP_TEAMS.find(t => t.id === match.teamA)!;
    const teamB = WORLD_CUP_TEAMS.find(t => t.id === match.teamB)!;

    // Sim logic
    const diff = teamA.rating - teamB.rating;
    let sA = Math.max(0, Math.floor(Math.random() * 3 + 1 + (diff/20)));
    let sB = Math.max(0, Math.floor(Math.random() * 3 + 1 - (diff/20)));
    
    // Update groups state
    const newGroups = [...groups];
    newGroups[groupIndex].matches[matchIndex] = { ...match, scoreA: sA, scoreB: sB, played: true };
    setGroups(newGroups);
  };

  const playUserMatch = (groupIndex: number, matchIndex: number) => {
    const match = groups[groupIndex].matches[matchIndex];
    const opponentId = match.teamA === selectedTeamId ? match.teamB : match.teamA;
    setCurrentMatch({ opponentId, isKnockout: false, matchId: `${groupIndex}-${matchIndex}` });
    setStage('MATCH');
  };

  const getDifficulty = (opponentId: string, isKnockout: boolean, round?: string): 'EASY' | 'MEDIUM' | 'HARD' => {
     const opponent = WORLD_CUP_TEAMS.find(t => t.id === opponentId);
     if (!opponent) return 'MEDIUM';
     
     if (isKnockout) {
        // Knockout matches are much harder
        if (round === 'FINAL' || round === 'SF') return 'HARD';
        if (opponent.rating >= 82) return 'HARD';
        return 'MEDIUM'; 
     } else {
        // Group stage
        if (opponent.rating >= 85) return 'HARD';
        if (opponent.rating >= 78) return 'MEDIUM';
        return 'EASY';
     }
  };

  const handleMatchFinish = (scoreA: number = 0, scoreB: number = 0) => {
    if (!currentMatch) return;

    if (!currentMatch.isKnockout) {
      // Group Match
      const [gIdx, mIdx] = currentMatch.matchId.toString().split('-').map(Number);
      const newGroups = [...groups];
      const match = newGroups[gIdx].matches[mIdx];
      
      if (match.teamA === selectedTeamId) {
        match.scoreA = scoreA;
        match.scoreB = scoreB;
      } else {
        match.scoreA = scoreB;
        match.scoreB = scoreA;
      }
      match.played = true;
      
      // Auto-simulate other matches in this "round"
      const round = Math.floor(mIdx / 2);
      const updatedGroups = newGroups.map((g) => {
        const roundMatchIndices = [round * 2, round * 2 + 1];
        const updatedMatches = g.matches.map((m, idx) => {
          if (roundMatchIndices.includes(idx) && !m.played) {
            if (m.teamA === selectedTeamId || m.teamB === selectedTeamId) return m;
            const teamA = WORLD_CUP_TEAMS.find(t => t.id === m.teamA)!;
            const teamB = WORLD_CUP_TEAMS.find(t => t.id === m.teamB)!;
            const diff = teamA.rating - teamB.rating;
            return {
              ...m,
              scoreA: Math.max(0, Math.floor(Math.random() * 3 + (diff/20))),
              scoreB: Math.max(0, Math.floor(Math.random() * 3 - (diff/20))),
              played: true
            };
          }
          return m;
        });
        return { ...g, matches: updatedMatches };
      });

      setGroups(updatedGroups);
      setStage('GROUPS');
    } else {
      // Knockout Match
      const matchIndex = knockoutMatches.findIndex(m => m.id === currentMatch.matchId);
      if (matchIndex !== -1) {
        const newMatches = [...knockoutMatches];
        const match = newMatches[matchIndex];
        
        if (match.teamA === selectedTeamId) {
          match.scoreA = scoreA;
          match.scoreB = scoreB;
        } else {
          match.scoreA = scoreB;
          match.scoreB = scoreA;
        }
        match.played = true;
        
        if (match.scoreA! > match.scoreB!) {
          match.winner = match.teamA;
        } else if (match.scoreB! > match.scoreA!) {
          match.winner = match.teamB;
        } else {
          // Penalties logic (if draw in knockout)
          match.penaltyA = Math.floor(Math.random() * 5) + 3;
          match.penaltyB = Math.floor(Math.random() * 5) + 3;
          while (match.penaltyA === match.penaltyB) match.penaltyA++;
          match.winner = match.penaltyA > match.penaltyB ? match.teamA : match.teamB;
        }

        // Auto-simulate rest of the round
        const currentRound = match.round;
        newMatches.forEach(m => {
          if (m.round === currentRound && !m.played && m.teamA && m.teamB) {
            if (m.teamA === selectedTeamId || m.teamB === selectedTeamId) return;
            const teamA = WORLD_CUP_TEAMS.find(t => t.id === m.teamA)!;
            const teamB = WORLD_CUP_TEAMS.find(t => t.id === m.teamB)!;
            const diff = teamA.rating - teamB.rating;
            let sA = Math.max(0, Math.floor(Math.random() * 3 + (diff/20)));
            let sB = Math.max(0, Math.floor(Math.random() * 3 - (diff/20)));
            if (sA === sB) {
               m.penaltyA = Math.floor(Math.random() * 5) + 3;
               m.penaltyB = Math.floor(Math.random() * 5) + 3;
               while (m.penaltyA === m.penaltyB) m.penaltyA++;
               m.winner = m.penaltyA > m.penaltyB ? m.teamA : m.teamB;
            } else {
               m.winner = sA > sB ? m.teamA : m.teamB;
            }
            m.scoreA = sA; m.scoreB = sB; m.played = true;
          }
        });

        setKnockoutMatches(newMatches);
        
        // Check if round is complete to auto-advance
        const roundMatches = newMatches.filter(m => m.round === currentRound);
        if (roundMatches.every(m => m.played)) {
           if (currentRound === 'FINAL') {
              if (match.winner === selectedTeamId) {
                 setStage('CHAMPION');
              } else {
                 setStage('KNOCKOUT');
              }
           } else {
              // Auto-advance to next round
              advanceKnockoutStage(newMatches);
              setStage('KNOCKOUT');
           }
        } else {
           setStage('KNOCKOUT');
        }
      }
    }
    setCurrentMatch(null);
  };

  const advanceToKnockouts = () => {
    // 1. Get qualified teams
    const qualified: { group: string, winner: string, runnerUp: string }[] = [];
    groups.forEach(g => {
      const standings = getStandings(g);
      qualified.push({
        group: g.name.split(' ')[1],
        winner: standings[0].id,
        runnerUp: standings[1].id
      });
    });

    // 2. Create R16 Fixtures
    // Standard bracket: A1 vs B2, C1 vs D2, etc.
    const fixtures: KnockoutMatch[] = [];
    const pairs = [
      ['A', 'B'], ['C', 'D'], ['E', 'F'], ['G', 'H']
    ];

    let matchId = 1;
    pairs.forEach(([g1, g2]) => {
      const g1Data = qualified.find(q => q.group === g1)!;
      const g2Data = qualified.find(q => q.group === g2)!;

      // Match 1: Winner G1 vs Runner G2
      fixtures.push({
        id: `R16_${matchId++}`, round: 'R16',
        teamA: g1Data.winner, teamB: g2Data.runnerUp,
        scoreA: null, scoreB: null, winner: null, played: false
      });

      // Match 2: Winner G2 vs Runner G1
      fixtures.push({
        id: `R16_${matchId++}`, round: 'R16',
        teamA: g2Data.winner, teamB: g1Data.runnerUp,
        scoreA: null, scoreB: null, winner: null, played: false
      });
    });

    setKnockoutMatches(fixtures);
    setStage('KNOCKOUT');
  };

  const simulateKnockoutRound = () => {
    // Simulate all unplayed matches in current round
    const currentRound = knockoutMatches.find(m => !m.played)?.round;
    if (!currentRound) return;

    const newMatches = [...knockoutMatches];
    newMatches.forEach(m => {
      if (m.round === currentRound && !m.played && m.teamA && m.teamB) {
        // Check if user is in this match
        if (m.teamA === selectedTeamId || m.teamB === selectedTeamId) return;

        const teamA = WORLD_CUP_TEAMS.find(t => t.id === m.teamA)!;
        const teamB = WORLD_CUP_TEAMS.find(t => t.id === m.teamB)!;
        
        const diff = teamA.rating - teamB.rating;
        let sA = Math.max(0, Math.floor(Math.random() * 3 + 1 + (diff/20)));
        let sB = Math.max(0, Math.floor(Math.random() * 3 + 1 - (diff/20)));
        
        if (sA === sB) {
           // Penalties
           m.penaltyA = Math.floor(Math.random() * 5) + 3;
           m.penaltyB = Math.floor(Math.random() * 5) + 3;
           while (m.penaltyA === m.penaltyB) m.penaltyA++;
           m.winner = m.penaltyA > m.penaltyB ? m.teamA : m.teamB;
        } else {
           m.winner = sA > sB ? m.teamA : m.teamB;
        }
        
        m.scoreA = sA;
        m.scoreB = sB;
        m.played = true;
      }
    });
    setKnockoutMatches(newMatches);
  };

  const advanceKnockoutStage = (existingMatches?: KnockoutMatch[]) => {
    const matchesToUse = existingMatches || knockoutMatches;
    // Check if current round is complete
    const currentRound = matchesToUse[matchesToUse.length - 1].round;
    const roundMatches = matchesToUse.filter(m => m.round === currentRound);
    if (roundMatches.some(m => !m.played)) return; // Not finished

    // Create next round
    let nextRound: 'QF' | 'SF' | 'FINAL' | null = null;
    if (currentRound === 'R16') nextRound = 'QF';
    else if (currentRound === 'QF') nextRound = 'SF';
    else if (currentRound === 'SF') nextRound = 'FINAL';

    if (nextRound) {
      const newMatches = [...matchesToUse];
      const winners = roundMatches.filter(m => m.round !== '3RD').map(m => m.winner!);
      
      for (let i = 0; i < winners.length; i += 2) {
        newMatches.push({
          id: `${nextRound}_${newMatches.length + 1}`,
          round: nextRound,
          teamA: winners[i],
          teamB: winners[i+1],
          scoreA: null, scoreB: null, winner: null, played: false
        });
      }
      
      // 3rd Place (if SF just finished)
      if (currentRound === 'SF') {
         const losers = roundMatches.map(m => m.winner === m.teamA ? m.teamB! : m.teamA!);
         newMatches.push({
          id: `3RD_1`, round: '3RD',
          teamA: losers[0], teamB: losers[1],
          scoreA: null, scoreB: null, winner: null, played: false
        });
      }

      setKnockoutMatches(newMatches);
    }
  };

  const playKnockoutMatch = (match: KnockoutMatch) => {
    const opponentId = match.teamA === selectedTeamId ? match.teamB! : match.teamA!;
    setCurrentMatch({ opponentId, isKnockout: true, matchId: match.id, round: match.round });
    setStage('MATCH');
  };

  // Helper to get standings
  const getStandings = (group: GroupData) => {
    const stats: Record<string, { pts: number, gf: number, ga: number, gd: number, played: number }> = {};
    group.teams.forEach(t => stats[t.id] = { pts: 0, gf: 0, ga: 0, gd: 0, played: 0 });

    group.matches.forEach(m => {
      if (!m.played) return;
      stats[m.teamA].played++;
      stats[m.teamB].played++;
      stats[m.teamA].gf += m.scoreA!;
      stats[m.teamB].gf += m.scoreB!;
      stats[m.teamA].ga += m.scoreB!;
      stats[m.teamB].ga += m.scoreA!;
      
      if (m.scoreA! > m.scoreB!) stats[m.teamA].pts += 3;
      else if (m.scoreB! > m.scoreA!) stats[m.teamB].pts += 3;
      else { stats[m.teamA].pts += 1; stats[m.teamB].pts += 1; }
    });

    Object.keys(stats).forEach(id => {
      stats[id].gd = stats[id].gf - stats[id].ga;
    });

    return group.teams.sort((a, b) => {
      const sA = stats[a.id];
      const sB = stats[b.id];
      if (sB.pts !== sA.pts) return sB.pts - sA.pts;
      if (sB.gd !== sA.gd) return sB.gd - sA.gd;
      return sB.gf - sA.gf;
    }).map(t => ({ ...t, ...stats[t.id] }));
  };

  // --- RENDER ---

  if (stage === 'CHAMPION') {
    const championId = selectedTeamId;
    const team = WORLD_CUP_TEAMS.find(t => t.id === championId);
    
    return (
      <div className="fixed inset-0 bg-black flex flex-col items-center justify-center overflow-hidden z-50">
        {/* Background Effects */}
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-yellow-600/40 via-black to-black" />
        
        {/* Fireworks & Fire Particles */}
        {[...Array(40)].map((_, i) => (
           <div key={`fw-${i}`} className="absolute w-1.5 h-1.5 bg-yellow-400 rounded-full animate-ping" style={{
              top: `${Math.random() * 80}%`, left: `${Math.random() * 100}%`,
              animationDuration: `${Math.random() * 1.5 + 0.5}s`,
              animationDelay: `${Math.random() * 3}s`
           }} />
        ))}
        {[...Array(30)].map((_, i) => (
           <div key={`fire-${i}`} className="absolute w-8 h-16 bg-gradient-to-t from-orange-600 via-yellow-500 to-transparent rounded-full blur-2xl animate-bounce" style={{
              bottom: '-20px', left: `${Math.random() * 100}%`,
              animationDuration: `${Math.random() * 0.8 + 0.4}s`,
              animationDelay: `${Math.random() * 1}s`,
              opacity: 0.6
           }} />
        ))}
        {[...Array(15)].map((_, i) => (
           <div key={`spark-${i}`} className="absolute w-1 h-1 bg-white rounded-full animate-pulse" style={{
              bottom: `${Math.random() * 40}%`, left: `${Math.random() * 100}%`,
              animationDuration: `${Math.random() * 0.5 + 0.2}s`,
           }} />
        ))}

        {/* Scrolling Text */}
        <div className="absolute top-12 left-0 right-0 overflow-hidden h-16 flex items-center">
           <div className="animate-marquee whitespace-nowrap text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 via-white to-yellow-400">
              WORLD CUP CHAMPIONS {team?.name.toUpperCase()} • WORLD CUP CHAMPIONS {team?.name.toUpperCase()} • WORLD CUP CHAMPIONS {team?.name.toUpperCase()} • WORLD CUP CHAMPIONS {team?.name.toUpperCase()} • 
           </div>
        </div>

        {/* Trophy & Content */}
        <div className="relative z-10 text-center flex flex-col items-center">
           <div className="relative mb-8 group">
              <div className="absolute inset-0 bg-yellow-400 blur-3xl opacity-20 group-hover:opacity-40 transition-opacity" />
              <Trophy className="w-72 h-72 text-yellow-400 drop-shadow-[0_0_50px_rgba(250,204,21,0.8)] animate-bounce-slow relative z-10" />
           </div>
           
           <h1 className="text-9xl font-black italic text-white mb-2 tracking-tighter drop-shadow-[0_10px_10px_rgba(0,0,0,0.5)]">
              {team?.flag}
           </h1>
           <h2 className="text-6xl font-black italic text-white mb-8 tracking-tighter uppercase">
              {team?.name}
           </h2>
           
           <div className="max-w-2xl text-zinc-400 text-xl font-medium mb-12 animate-pulse">
              Lead your nation to the pinnacle of football glory. History has been written.
           </div>

           <button 
             onClick={onBack}
             className="px-16 py-5 bg-white text-black font-black rounded-full hover:bg-yellow-400 hover:scale-110 transition-all text-2xl shadow-[0_0_50px_rgba(255,255,255,0.3)]"
           >
             RETURN TO MENU
           </button>
        </div>

        <style>{`
          @keyframes marquee {
            0% { transform: translateX(0); }
            100% { transform: translateX(-50%); }
          }
          .animate-marquee {
            animation: marquee 20s linear infinite;
          }
        `}</style>
      </div>
    );
  }

  if (stage === 'SELECT') {
    return (
      <div className="min-h-screen bg-transparent p-8 text-white">
        <div className="max-w-7xl mx-auto">
          <button onClick={onBack} className="mb-8 text-zinc-400 hover:text-white flex items-center">
            <ChevronRight className="rotate-180 mr-2" /> Back
          </button>
          
          <h1 className="text-5xl font-black italic mb-2">SELECT YOUR NATION</h1>
          <p className="text-zinc-400 mb-8">Choose a team to lead to World Cup glory.</p>

          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
            {WORLD_CUP_TEAMS.map(team => (
              <button
                key={team.id}
                onClick={() => handleSelectTeam(team.id)}
                className={`p-4 rounded-xl border-2 transition-all hover:scale-105 ${
                  selectedTeamId === team.id 
                    ? 'border-emerald-500 bg-emerald-500/20' 
                    : 'border-zinc-800 bg-zinc-900 hover:border-zinc-600'
                }`}
              >
                <div className="text-4xl mb-2">{team.flag}</div>
                <div className="font-bold">{team.name}</div>
                <div className="text-xs text-zinc-500">OVR: {team.rating}</div>
              </button>
            ))}
          </div>

          {selectedTeamId && (
            <div className="fixed bottom-8 left-0 right-0 flex justify-center">
              <button 
                onClick={startDraw}
                className="px-12 py-4 bg-emerald-600 text-white font-black text-xl rounded-full shadow-2xl hover:bg-emerald-500 transition-transform hover:scale-105"
              >
                CONFIRM SELECTION
              </button>
            </div>
          )}
        </div>
      </div>
    );
  }

  if (stage === 'DRAW') {
    return (
      <div className="min-h-screen bg-transparent flex flex-col items-center justify-center text-white">
        <Globe className="w-24 h-24 text-emerald-500 animate-spin-slow mb-8" />
        <h2 className="text-4xl font-black italic">DRAWING GROUPS...</h2>
      </div>
    );
  }

  if (stage === 'MATCH' && currentMatch && matchSquad) {
    const opponent = WORLD_CUP_TEAMS.find(t => t.id === currentMatch.opponentId);
    const userTeam = WORLD_CUP_TEAMS.find(t => t.id === selectedTeamId);
    const difficulty = getDifficulty(currentMatch.opponentId, currentMatch.isKnockout);

    return (
      <MatchScreen 
        squad={matchSquad} 
        onFinish={(coins, xp, scoreA, scoreB) => {
           // Pass scores to handler
           handleMatchFinish(scoreA || 0, scoreB || 0);
        }}
        // @ts-ignore - Temporary until MatchScreen is updated
        onMatchEnd={(scoreA, scoreB) => handleMatchFinish(scoreA, scoreB)}
        opponentName={opponent?.name}
        opponentColor={opponent?.color}
        userTeamName={userTeam?.name}
        userTeamColor={userTeam?.color}
        forcedDifficulty={difficulty}
        isWorldCup={true}
        mustHaveWinner={currentMatch.isKnockout}
        onWorldCupContinue={() => {
           // This will be called after handleFinish inside MatchScreen
           // We don't need to do anything extra here as handleMatchFinish updates the stage
        }}
      />
    );
  }

  if (stage === 'GROUPS') {
    // Find user's group
    const userGroupIndex = groups.findIndex(g => g.teams.some(t => t.id === selectedTeamId));
    const userGroup = groups[userGroupIndex];
    const standings = getStandings(userGroup);
    
    // Find next match
    const nextMatchIndex = userGroup.matches.findIndex(m => !m.played && (m.teamA === selectedTeamId || m.teamB === selectedTeamId));
    const nextMatch = userGroup.matches[nextMatchIndex];

    return (
      <div className="min-h-screen bg-transparent p-8 text-white overflow-y-auto">
        <div className="max-w-7xl mx-auto">
          <div className="flex justify-between items-center mb-8">
            <h1 className="text-4xl font-black italic">GROUP STAGE</h1>
            <button onClick={onBack} className="text-zinc-400 hover:text-white">Exit Tournament</button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Left: Standings */}
            <div className="lg:col-span-2 space-y-8">
              <div className="bg-zinc-900/60 backdrop-blur-md rounded-2xl border border-zinc-800 p-6">
                <h3 className="text-xl font-bold mb-4 flex items-center">
                  <span className="w-8 h-8 bg-emerald-500 rounded-lg flex items-center justify-center mr-3 text-black font-black">{userGroup.name.split(' ')[1]}</span>
                  Your Group
                </h3>
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-zinc-500 border-b border-zinc-800">
                      <th className="text-left py-2">Team</th>
                      <th className="text-center py-2">MP</th>
                      <th className="text-center py-2">GF</th>
                      <th className="text-center py-2">GA</th>
                      <th className="text-center py-2">GD</th>
                      <th className="text-center py-2">Pts</th>
                    </tr>
                  </thead>
                  <tbody>
                    {standings.map((t, i) => (
                      <tr key={t.id} className={`border-b border-zinc-800/50 ${t.id === selectedTeamId ? 'bg-emerald-500/10' : ''}`}>
                        <td className="py-3 flex items-center font-bold">
                          <span className="mr-2">{i+1}.</span>
                          <span className="mr-2 text-xl">{t.flag}</span>
                          {t.name}
                        </td>
                        <td className="text-center text-zinc-400">{t.played}</td>
                        <td className="text-center text-zinc-400">{t.gf}</td>
                        <td className="text-center text-zinc-400">{t.ga}</td>
                        <td className="text-center text-zinc-400">{t.gd}</td>
                        <td className="text-center font-black text-white">{t.pts}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Other Groups Summary (Simplified) */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                 {groups.map((g, i) => {
                   if (i === userGroupIndex) return null;
                   const std = getStandings(g);
                   return (
                     <div key={g.name} className="bg-zinc-900/50 rounded-xl border border-zinc-800 p-4">
                       <div className="font-bold text-zinc-400 mb-2">{g.name}</div>
                       {std.slice(0, 2).map((t, idx) => (
                         <div key={t.id} className="flex justify-between text-xs mb-1">
                           <span>{idx+1}. {t.flag} {t.name}</span>
                           <span className="font-bold">{t.pts}</span>
                         </div>
                       ))}
                     </div>
                   );
                 })}
              </div>
            </div>

            {/* Right: Next Match */}
            <div className="space-y-6">
              <div className="bg-gradient-to-br from-zinc-900/80 to-black/80 backdrop-blur-md rounded-3xl border border-zinc-800 p-8 shadow-2xl relative overflow-hidden">
                <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/10 rounded-full blur-3xl" />
                
                <h3 className="text-zinc-400 font-bold uppercase tracking-widest text-sm mb-6">Next Match</h3>
                
                {nextMatch ? (
                  <>
                    <div className="flex justify-between items-center mb-8">
                      <div className="text-center">
                        <div className="text-6xl mb-2">{WORLD_CUP_TEAMS.find(t => t.id === nextMatch.teamA)?.flag}</div>
                        <div className="font-bold text-xl">{WORLD_CUP_TEAMS.find(t => t.id === nextMatch.teamA)?.code}</div>
                      </div>
                      <div className="text-2xl font-black italic text-zinc-600">VS</div>
                      <div className="text-center">
                        <div className="text-6xl mb-2">{WORLD_CUP_TEAMS.find(t => t.id === nextMatch.teamB)?.flag}</div>
                        <div className="font-bold text-xl">{WORLD_CUP_TEAMS.find(t => t.id === nextMatch.teamB)?.code}</div>
                      </div>
                    </div>

                    <button 
                      onClick={() => playUserMatch(userGroupIndex, nextMatchIndex)}
                      className="w-full py-4 bg-emerald-600 hover:bg-emerald-500 text-white font-black rounded-xl shadow-lg transition-all hover:scale-105 flex items-center justify-center"
                    >
                      <Play className="w-5 h-5 mr-2 fill-current" /> PLAY MATCH
                    </button>
                  </>
                ) : (
                  <div className="text-center py-8">
                    <p className="text-xl font-bold mb-4">Group Stage Complete</p>
                    <button 
                      onClick={advanceToKnockouts}
                      className="px-6 py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-bold shadow-lg transition-transform hover:scale-105"
                    >
                      Proceed to Knockouts
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (stage === 'KNOCKOUT') {
    const rounds = ['R16', 'QF', 'SF', 'FINAL'];
    // Filter matches for the current active round (the latest round in the list)
    const currentRound = knockoutMatches.length > 0 ? knockoutMatches[knockoutMatches.length - 1].round : 'R16';
    const currentRoundMatches = knockoutMatches.filter(m => m.round === currentRound && !m.played);
    
    // Find user's match in the current round
    const userMatch = knockoutMatches.find(m => m.round === currentRound && !m.played && (m.teamA === selectedTeamId || m.teamB === selectedTeamId));
    // Check elimination: User played in a previous round but didn't win, OR played in current round and lost
    const userLastMatch = [...knockoutMatches].reverse().find(m => (m.teamA === selectedTeamId || m.teamB === selectedTeamId) && m.played);
    const isUserEliminated = userLastMatch && userLastMatch.winner !== selectedTeamId;
    
    if (isUserEliminated) {
       return (
         <div className="fixed inset-0 bg-black/95 flex flex-col items-center justify-center z-50 p-8 text-center">
            <Shield className="w-32 h-32 text-zinc-700 mb-8" />
            <h2 className="text-6xl font-black text-red-500 mb-4 tracking-tighter">ELIMINATED</h2>
            <p className="text-2xl text-zinc-400 mb-12 max-w-lg">
               Your World Cup journey has come to an end. Better luck next time!
            </p>
            <div className="flex space-x-4">
               <button 
                 onClick={onBack}
                 className="px-8 py-4 bg-zinc-800 text-white font-bold rounded-full hover:bg-zinc-700 transition-colors"
               >
                 EXIT TOURNAMENT
               </button>
            </div>
         </div>
       );
    }

    return (
      <div className="min-h-screen bg-transparent p-8 text-white overflow-y-auto">
        <div className="max-w-7xl mx-auto">
          <div className="flex justify-between items-center mb-8">
            <h1 className="text-4xl font-black italic">KNOCKOUT STAGE</h1>
            <button onClick={onBack} className="text-zinc-400 hover:text-white">Exit Tournament</button>
          </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              <div className="lg:col-span-2 space-y-4">
                {['R16', 'QF', 'SF', 'FINAL', '3RD'].map(r => {
                  const matches = knockoutMatches.filter(m => m.round === r);
                  if (matches.length === 0) return null;
                  return (
                    <div key={r} className="bg-zinc-900/60 backdrop-blur-md rounded-2xl border border-zinc-800 p-6">
                      <h3 className="text-xl font-bold mb-4 text-zinc-400">
                        {r === 'R16' ? 'Round of 16' : r === 'QF' ? 'Quarter Finals' : r === 'SF' ? 'Semi Finals' : r === '3RD' ? '3rd Place Playoff' : 'Final'}
                      </h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {matches.map(m => {
                          const tA = WORLD_CUP_TEAMS.find(t => t.id === m.teamA);
                          const tB = WORLD_CUP_TEAMS.find(t => t.id === m.teamB);
                          return (
                            <div key={m.id} className={`p-3 rounded-xl border ${m.played ? 'bg-zinc-950 border-zinc-800' : 'bg-zinc-800 border-zinc-700'}`}>
                              <div className="flex justify-between items-center mb-1">
                                <div className={`flex items-center ${m.winner === m.teamA ? 'text-emerald-400 font-bold' : ''}`}>
                                  <span className="mr-2">{tA?.flag}</span>
                                  <span>{tA?.code}</span>
                                </div>
                                <span className="font-mono font-bold">{m.scoreA ?? '-'}</span>
                              </div>
                              <div className="flex justify-between items-center">
                                <div className={`flex items-center ${m.winner === m.teamB ? 'text-emerald-400 font-bold' : ''}`}>
                                  <span className="mr-2">{tB?.flag}</span>
                                  <span>{tB?.code}</span>
                                </div>
                                <span className="font-mono font-bold">{m.scoreB ?? '-'}</span>
                              </div>
                              {m.penaltyA !== undefined && (
                                <div className="text-[10px] text-zinc-500 text-center mt-1">
                                  Pen: {m.penaltyA} - {m.penaltyB}
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="space-y-6">
                 <div className="bg-gradient-to-br from-zinc-900/80 to-black/80 backdrop-blur-md rounded-3xl border border-zinc-800 p-8 shadow-2xl relative overflow-hidden">
                    {userMatch ? (
                       <>
                          <h3 className="text-zinc-400 font-bold uppercase tracking-widest text-sm mb-6">Your Match</h3>
                          <div className="flex justify-between items-center mb-8">
                            <div className="text-center">
                              <div className="text-5xl mb-2">{WORLD_CUP_TEAMS.find(t => t.id === userMatch.teamA)?.flag}</div>
                              <div className="font-bold">{WORLD_CUP_TEAMS.find(t => t.id === userMatch.teamA)?.code}</div>
                            </div>
                            <div className="text-xl font-black italic text-zinc-600">VS</div>
                            <div className="text-center">
                              <div className="text-5xl mb-2">{WORLD_CUP_TEAMS.find(t => t.id === userMatch.teamB)?.flag}</div>
                              <div className="font-bold">{WORLD_CUP_TEAMS.find(t => t.id === userMatch.teamB)?.code}</div>
                            </div>
                          </div>
                          <button 
                            onClick={() => playKnockoutMatch(userMatch)}
                            className="w-full py-4 bg-emerald-600 hover:bg-emerald-500 text-white font-black rounded-xl shadow-lg transition-all hover:scale-105 flex items-center justify-center"
                          >
                            <Play className="w-5 h-5 mr-2 fill-current" /> PLAY MATCH
                          </button>
                       </>
                    ) : (
                       <div className="text-center py-4">
                          <h3 className="text-xl font-bold text-white mb-2 italic uppercase">ROUND COMPLETE</h3>
                          <p className="text-zinc-400 text-sm mb-6">All matches have been played. Ready for the next stage.</p>
                          <button 
                             onClick={() => advanceKnockoutStage()}
                             className="w-full py-4 bg-blue-600 hover:bg-blue-500 text-white font-black rounded-xl shadow-lg transition-all hover:scale-105"
                           >
                             NEXT ROUND
                           </button>
                       </div>
                    )}
                 </div>
              </div>
            </div>
        </div>
      </div>
    );
  }

  return <div>Coming Soon</div>;
}
