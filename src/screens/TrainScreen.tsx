import React, { useState, useEffect } from 'react';
import { Player, PlayerStats } from '../types';
import PlayerCard from '../components/PlayerCard';
import { Dumbbell, Clock, ArrowUpRight, CheckCircle2, Zap } from 'lucide-react';

interface Props {
  inventory: Player[];
  setInventory: React.Dispatch<React.SetStateAction<Player[]>>;
  coins: number;
  setCoins: React.Dispatch<React.SetStateAction<number>>;
}

export default function TrainScreen({ inventory, setInventory, coins, setCoins }: Props) {
  const [selectedPlayerId, setSelectedPlayerId] = useState<string | null>(null);
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    const interval = setInterval(() => {
      setNow(Date.now());
      
      // Check for completed training
      setInventory(prev => {
        let changed = false;
        const newInventory = prev.map(p => {
          if (p.training && p.training.endTime <= Date.now()) {
            changed = true;
            const statToUpgrade = p.training.stat;
            return {
              ...p,
              stats: {
                ...p.stats,
                [statToUpgrade]: Math.min(99, p.stats[statToUpgrade] + 1)
              },
              ovr: Math.min(99, p.ovr + 1), // simplified OVR increase
              training: undefined
            };
          }
          return p;
        });
        return changed ? newInventory : prev;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [setInventory]);

  const selectedPlayer = inventory.find(p => p.id === selectedPlayerId);

  const getTrainingCost = (currentStat: number) => {
    return Math.floor(currentStat * 5); // Example: stat 80 costs 400 coins
  };

  const startTraining = (stat: keyof PlayerStats) => {
    if (!selectedPlayer || selectedPlayer.training) return;
    
    const currentStat = selectedPlayer.stats[stat];
    if (currentStat >= 99) return;
    
    const cost = getTrainingCost(currentStat);
    if (coins < cost) {
      return;
    }

    setCoins(c => c - cost);

    // Training time: 10 seconds per stat point
    const durationMs = currentStat * 10 * 1000;
    const endTime = Date.now() + durationMs;

    setInventory(prev => prev.map(p => 
      p.id === selectedPlayer.id 
        ? { ...p, training: { stat, endTime } }
        : p
    ));
  };

  const getSpeedUpCost = (endTime: number) => {
    const remainingMs = Math.max(0, endTime - Date.now());
    const remainingSeconds = Math.ceil(remainingMs / 1000);
    return Math.max(10, Math.floor(remainingSeconds * 2)); // 2 coins per second remaining
  };

  const speedUpTraining = () => {
    if (!selectedPlayer || !selectedPlayer.training) return;
    
    const cost = getSpeedUpCost(selectedPlayer.training.endTime);
    if (coins < cost) {
      return;
    }

    setCoins(c => c - cost);
    
    // Finish immediately
    setInventory(prev => prev.map(p => {
      if (p.id === selectedPlayer.id && p.training) {
        const statToUpgrade = p.training.stat;
        return {
          ...p,
          stats: {
            ...p.stats,
            [statToUpgrade]: Math.min(99, p.stats[statToUpgrade] + 1)
          },
          ovr: Math.min(99, p.ovr + 1),
          training: undefined
        };
      }
      return p;
    }));
  };

  const formatTime = (ms: number) => {
    if (ms <= 0) return '00:00';
    const totalSeconds = Math.floor(ms / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  };

  return (
    <div className="h-full flex flex-col md:flex-row bg-transparent p-4 md:p-8 gap-8 overflow-y-auto">
      {/* Left: Player Selection */}
      <div className="w-full md:w-1/3 flex flex-col bg-zinc-900/60 backdrop-blur-md border border-zinc-800 rounded-2xl p-6">
        <div className="flex items-center space-x-3 mb-6">
          <Dumbbell className="w-8 h-8 text-emerald-500" />
          <h2 className="text-2xl font-black italic">TRAINING CENTER</h2>
        </div>
        
        <div className="flex-1 overflow-y-auto space-y-3 pr-2">
          {inventory.map(player => (
            <div 
              key={player.id}
              onClick={() => setSelectedPlayerId(player.id)}
              className={`flex items-center p-3 rounded-xl cursor-pointer transition-colors border ${
                selectedPlayerId === player.id 
                  ? 'bg-emerald-900/30 border-emerald-500' 
                  : 'bg-zinc-950 border-zinc-800 hover:border-zinc-600'
              }`}
            >
              <div className="w-12 h-12 bg-zinc-800 rounded-full overflow-hidden mr-4 border border-zinc-700">
                {player.image && <img src={player.image} alt={player.name} className="w-full h-full object-cover" />}
              </div>
              <div className="flex-1">
                <div className="font-bold text-white">{player.name}</div>
                <div className="text-xs text-zinc-400 font-mono">OVR {player.ovr} | {player.position}</div>
              </div>
              {player.training && (
                <div className="flex items-center text-emerald-400 text-xs font-bold bg-emerald-900/50 px-2 py-1 rounded">
                  <Clock className="w-3 h-3 mr-1" />
                  TRAINING
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Right: Training Details */}
      <div className="w-full md:w-2/3 flex flex-col items-center justify-center bg-zinc-900/60 backdrop-blur-md border border-zinc-800 rounded-2xl p-6 relative overflow-hidden">
        {!selectedPlayer ? (
          <div className="text-zinc-500 flex flex-col items-center">
            <Dumbbell className="w-16 h-16 mb-4 opacity-50" />
            <p className="text-xl font-medium">Select a player to train</p>
          </div>
        ) : (
          <div className="w-full max-w-2xl flex flex-col items-center">
            <PlayerCard player={selectedPlayer} size="lg" className="mb-8" />
            
            {selectedPlayer.training ? (
              <div className="w-full bg-zinc-950 border border-emerald-500/50 rounded-2xl p-8 text-center relative overflow-hidden flex flex-col items-center">
                <div className="absolute inset-0 bg-emerald-500/10 animate-pulse" />
                <h3 className="text-2xl font-black italic text-emerald-400 mb-2 relative z-10">TRAINING IN PROGRESS</h3>
                <p className="text-zinc-400 mb-6 relative z-10">
                  Improving <span className="text-white font-bold uppercase">{selectedPlayer.training.stat}</span>
                </p>
                
                <div className="flex flex-col items-center relative z-10 mb-6">
                  <div className="text-5xl font-mono font-bold text-white mb-2">
                    {formatTime(selectedPlayer.training.endTime - now)}
                  </div>
                  <p className="text-sm text-zinc-500">Time remaining</p>
                </div>

                <button 
                  onClick={speedUpTraining}
                  className="relative z-10 px-6 py-3 bg-yellow-500 text-black font-bold rounded-full hover:bg-yellow-400 transition-colors flex items-center space-x-2"
                >
                  <Zap className="w-5 h-5" />
                  <span>SPEED UP</span>
                  <span className="text-black/50">|</span>
                  <span className="font-mono">{getSpeedUpCost(selectedPlayer.training.endTime)} C</span>
                </button>
              </div>
            ) : (
              <div className="w-full grid grid-cols-2 md:grid-cols-3 gap-4">
                {(Object.keys(selectedPlayer.stats) as Array<keyof PlayerStats>).map(stat => {
                  const val = selectedPlayer.stats[stat];
                  const isMax = val >= 99;
                  const durationMs = val * 10 * 1000;
                  const cost = getTrainingCost(val);
                  
                  return (
                    <button
                      key={stat}
                      onClick={() => startTraining(stat)}
                      disabled={isMax || coins < cost}
                      className="flex flex-col items-center bg-zinc-950 border border-zinc-800 p-4 rounded-xl hover:border-emerald-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed group relative overflow-hidden"
                    >
                      <div className="text-lg font-black text-zinc-400 group-hover:text-white transition-colors uppercase mb-2">{stat}</div>
                      <div className="text-3xl font-bold text-white mb-2">{val}</div>
                      
                      {isMax ? (
                        <div className="flex items-center text-emerald-500 text-sm font-bold mt-2">
                          <CheckCircle2 className="w-4 h-4 mr-1" /> MAX
                        </div>
                      ) : (
                        <div className="w-full flex flex-col mt-2 pt-2 border-t border-zinc-800 space-y-1">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center text-emerald-400 text-sm font-bold">
                              <ArrowUpRight className="w-4 h-4 mr-1" /> +1
                            </div>
                            <div className="flex items-center text-zinc-400 text-sm font-mono">
                              <Clock className="w-3 h-3 mr-1" />
                              {formatTime(durationMs)}
                            </div>
                          </div>
                          <div className="flex items-center justify-center text-yellow-500 text-sm font-bold mt-1 bg-yellow-500/10 rounded py-1">
                            {cost} Coins
                          </div>
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
