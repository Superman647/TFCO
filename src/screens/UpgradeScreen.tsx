import React, { useState } from 'react';
import { Player } from '../types';
import PlayerCard from '../components/PlayerCard';
import { ArrowRight, Zap } from 'lucide-react';

interface Props {
  inventory: Player[];
  setInventory: React.Dispatch<React.SetStateAction<Player[]>>;
  coins: number;
  setCoins: React.Dispatch<React.SetStateAction<number>>;
}

export default function UpgradeScreen({ inventory, setInventory, coins, setCoins }: Props) {
  const [selectedPlayer, setSelectedPlayer] = useState<Player | null>(null);
  const [isUpgrading, setIsUpgrading] = useState(false);
  const [upgradeResult, setUpgradeResult] = useState<'success' | 'failed' | null>(null);

  const upgradeCost = selectedPlayer ? selectedPlayer.level * 100 : 0;
  const canUpgrade = selectedPlayer && (selectedPlayer.xp || 0) >= upgradeCost && selectedPlayer.level < 10;

  // Success rate decreases as level increases
  const getSuccessRate = (level: number) => {
    const rates: Record<number, number> = {
      1: 100, 2: 90, 3: 80, 4: 70, 5: 60, 6: 50, 7: 40, 8: 30, 9: 20
    };
    return rates[level] || 10;
  };

  const handleUpgrade = () => {
    if (!canUpgrade || !selectedPlayer) return;
    
    setIsUpgrading(true);
    setUpgradeResult(null);

    setTimeout(() => {
      const successRate = getSuccessRate(selectedPlayer.level);
      const isSuccess = Math.random() * 100 < successRate;

      if (isSuccess) {
        setInventory(prev => prev.map(p => {
          if (p.id === selectedPlayer.id) {
            const upgraded = {
              ...p,
              level: p.level + 1,
              xp: (p.xp || 0) - upgradeCost,
              ovr: p.ovr + 1,
              stats: {
                pac: p.stats.pac + 1,
                sho: p.stats.sho + 1,
                pas: p.stats.pas + 1,
                dri: p.stats.dri + 1,
                def: p.stats.def + 1,
                phy: p.stats.phy + 1,
              }
            };
            setSelectedPlayer(upgraded);
            return upgraded;
          }
          return p;
        }));
        setUpgradeResult('success');
      } else {
        // Failed: Deduct half XP as penalty
        setInventory(prev => prev.map(p => {
          if (p.id === selectedPlayer.id) {
            const failed = {
              ...p,
              xp: (p.xp || 0) - Math.floor(upgradeCost / 2),
            };
            setSelectedPlayer(failed);
            return failed;
          }
          return p;
        }));
        setUpgradeResult('failed');
      }
      setIsUpgrading(false);
    }, 1500);
  };

  return (
    <div className="h-full flex flex-col md:flex-row bg-transparent">
      {/* Inventory List */}
      <div className="w-full md:w-1/3 border-r border-zinc-800 flex flex-col h-full">
        <div className="p-4 border-b border-zinc-800 bg-zinc-900/60 backdrop-blur-md">
          <h2 className="font-bold text-xl">Select Player</h2>
        </div>
        <div className="flex-1 overflow-y-auto p-4 grid grid-cols-2 gap-4 content-start">
          {inventory.map(p => (
            <div key={p.id} className="flex justify-center">
              <PlayerCard 
                player={p} 
                size="sm" 
                onClick={() => setSelectedPlayer(p)} 
                className={selectedPlayer?.id === p.id ? 'ring-2 ring-emerald-500' : ''}
              />
            </div>
          ))}
        </div>
      </div>

      {/* Upgrade Area */}
      <div className="flex-1 flex flex-col items-center justify-center p-8 relative">
        
        {selectedPlayer ? (
          <div className="flex flex-col items-center w-full max-w-2xl">
            <h2 className="text-3xl font-black italic mb-12 text-emerald-400">UPGRADE PLAYER</h2>
            
            <div className="flex items-center justify-center space-x-12 mb-12 w-full">
              <div className={`transition-transform duration-500 ${isUpgrading ? 'scale-110 blur-sm' : ''}`}>
                <PlayerCard player={selectedPlayer} size="lg" />
              </div>
              
              <div className="flex flex-col items-center text-zinc-500">
                <ArrowRight className={`w-12 h-12 mb-2 ${isUpgrading ? 'text-emerald-500 animate-pulse' : ''}`} />
                <span className="font-bold">LEVEL UP</span>
              </div>

              <div className={`transition-all duration-500 ${isUpgrading ? 'scale-110 blur-sm' : 'opacity-50'}`}>
                <PlayerCard 
                  player={{
                    ...selectedPlayer,
                    level: selectedPlayer.level + 1,
                    ovr: selectedPlayer.ovr + 1,
                    stats: {
                      pac: selectedPlayer.stats.pac + 1,
                      sho: selectedPlayer.stats.sho + 1,
                      pas: selectedPlayer.stats.pas + 1,
                      dri: selectedPlayer.stats.dri + 1,
                      def: selectedPlayer.stats.def + 1,
                      phy: selectedPlayer.stats.phy + 1,
                    }
                  }} 
                  size="lg" 
                />
              </div>
            </div>

            {selectedPlayer.level >= 10 ? (
              <div className="text-xl font-bold text-yellow-500">MAX LEVEL REACHED</div>
            ) : (
              <div className="flex flex-col items-center">
                <div className="mb-4 flex items-center space-x-2">
                  <span className="text-zinc-400 text-sm">Success Rate:</span>
                  <span className={`font-bold ${getSuccessRate(selectedPlayer.level) > 50 ? 'text-emerald-400' : 'text-yellow-400'}`}>
                    {getSuccessRate(selectedPlayer.level)}%
                  </span>
                </div>
                
                <button 
                  onClick={handleUpgrade}
                  disabled={!canUpgrade || isUpgrading}
                  className="px-8 py-4 bg-emerald-600 text-white font-bold rounded-full hover:bg-emerald-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-3 text-lg relative overflow-hidden"
                >
                  {isUpgrading && (
                    <div className="absolute inset-0 bg-emerald-500/50 animate-pulse" />
                  )}
                  <Zap className="w-5 h-5" />
                  <span>UPGRADE</span>
                  <span className="text-emerald-200">|</span>
                  <span className="font-mono">{upgradeCost} XP</span>
                </button>

                {upgradeResult && (
                  <div className={`mt-6 text-2xl font-black italic animate-bounce ${upgradeResult === 'success' ? 'text-emerald-400' : 'text-red-500'}`}>
                    {upgradeResult === 'success' ? 'UPGRADE SUCCESSFUL!' : 'UPGRADE FAILED! (Lost half XP)'}
                  </div>
                )}
              </div>
            )}
            
            {!canUpgrade && selectedPlayer.level < 10 && (
              <p className="text-red-400 mt-4 text-sm">Not enough XP (Have: {selectedPlayer.xp || 0})</p>
            )}
          </div>
        ) : (
          <div className="text-zinc-500 text-xl font-medium">Select a player from your inventory to upgrade</div>
        )}
      </div>
    </div>
  );
}
