import React, { useState } from 'react';
import { Player, Squad, Position } from '../types';
import PlayerCard from '../components/PlayerCard';
import { X, Settings2, Trash2 } from 'lucide-react';
import { FORMATION_POSITIONS } from '../constants';

interface Props {
  squad: Squad;
  setSquad: React.Dispatch<React.SetStateAction<Squad>>;
  inventory: Player[];
  setInventory: React.Dispatch<React.SetStateAction<Player[]>>;
  coins: number;
  setCoins: React.Dispatch<React.SetStateAction<number>>;
}

export default function SquadScreen({ squad, setSquad, inventory, setInventory, coins, setCoins }: Props) {
  const [selectedSlot, setSelectedSlot] = useState<number | null>(null);
  const [showFormations, setShowFormations] = useState(false);

  const handleSelectPlayer = (player: Player) => {
    if (selectedSlot !== null) {
      setSquad(prev => {
        const newLineup = [...prev.lineup];
        newLineup[selectedSlot] = player;
        return { ...prev, lineup: newLineup };
      });
      setSelectedSlot(null);
    }
  };

  const handleSellPlayer = (player: Player) => {
    if (window.confirm(`Are you sure you want to sell ${player.name} for ${getPlayerValue(player)} coins?`)) {
      setCoins(c => c + getPlayerValue(player));
      setInventory(inv => inv.filter(p => p.id !== player.id));
      // If player was in squad, remove them (though this list is usually filtered)
      setSquad(prev => ({
        ...prev,
        lineup: prev.lineup.map(p => p?.id === player.id ? null : p)
      }));
    }
  };

  const getPlayerValue = (player: Player) => {
    const base = Math.pow(player.ovr - 50, 2.5) * 1.5;
    return Math.floor(base);
  };

  const handleFormationChange = (formation: string) => {
    // Keep players if they match the new position type, otherwise remove
    const newPositions = FORMATION_POSITIONS[formation];
    const newLineup = new Array(11).fill(undefined);
    
    squad.lineup.forEach((player, idx) => {
      if (player) {
        // Find a slot in the new formation that matches the player's position
        const matchingSlotIdx = newPositions.findIndex((pos, i) => pos.pos === player.position && !newLineup[i]);
        if (matchingSlotIdx !== -1) {
          newLineup[matchingSlotIdx] = player;
        }
      }
    });

    setSquad({ formation, lineup: newLineup });
    setShowFormations(false);
  };

  const getAvailablePlayers = () => {
    if (selectedSlot === null) return [];
    // Filter out players already in squad
    const squadIds = squad.lineup.filter(Boolean).map(p => p?.id);
    return inventory.filter(p => !squadIds.includes(p.id));
  };

  const renderSlot = (index: number, label: string, positionClasses: string) => {
    const player = squad.lineup[index];
    return (
      <div key={index} className={`absolute ${positionClasses} transform -translate-x-1/2 -translate-y-1/2 flex flex-col items-center`}>
        {player ? (
          <PlayerCard player={player} size="sm" onClick={() => setSelectedSlot(index)} />
        ) : (
          <div 
            onClick={() => setSelectedSlot(index)}
            className="w-16 h-24 border-2 border-dashed border-white/30 rounded-xl flex items-center justify-center cursor-pointer hover:border-white/60 hover:bg-white/5 transition-all backdrop-blur-sm"
          >
            <span className="text-white/50 font-bold text-xs">{label}</span>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="h-full flex relative">
      {/* Pitch Area */}
      <div className="flex-1 bg-green-900/40 backdrop-blur-sm relative overflow-hidden flex items-center justify-center p-8">
        {/* Formation Selector Button */}
        <button 
          onClick={() => setShowFormations(!showFormations)}
          className="absolute top-4 left-4 z-10 bg-zinc-900/80 backdrop-blur border border-zinc-700 px-4 py-2 rounded-lg flex items-center space-x-2 hover:bg-zinc-800 transition-colors"
        >
          <Settings2 className="w-5 h-5 text-emerald-400" />
          <span className="font-bold">Formation: {squad.formation}</span>
        </button>

        {/* Formation Dropdown */}
        {showFormations && (
          <div className="absolute top-16 left-4 z-20 bg-zinc-900 border border-zinc-700 rounded-lg shadow-2xl overflow-hidden">
            {Object.keys(FORMATION_POSITIONS).map(form => (
              <button
                key={form}
                onClick={() => handleFormationChange(form)}
                className={`w-full text-left px-6 py-3 hover:bg-zinc-800 transition-colors border-b border-zinc-800 last:border-0 ${squad.formation === form ? 'text-emerald-400 font-bold bg-zinc-800/50' : 'text-zinc-300'}`}
              >
                {form}
              </button>
            ))}
          </div>
        )}

        {/* Pitch markings */}
        <div className="w-full max-w-4xl aspect-[2/3] md:aspect-[3/2] border-2 border-white/30 relative">
          <div className="absolute top-0 bottom-0 left-1/2 border-l-2 border-white/30" />
          <div className="absolute top-1/2 left-1/2 w-32 h-32 border-2 border-white/30 rounded-full transform -translate-x-1/2 -translate-y-1/2" />
          {/* Penalty boxes */}
          <div className="absolute top-0 left-1/2 w-64 h-32 border-2 border-t-0 border-white/30 transform -translate-x-1/2" />
          <div className="absolute bottom-0 left-1/2 w-64 h-32 border-2 border-b-0 border-white/30 transform -translate-x-1/2" />
          
          {/* Slots - Top down view (attacking upwards) */}
          {FORMATION_POSITIONS[squad.formation].map((pos, idx) => 
            renderSlot(idx, pos.label, pos.classes)
          )}
        </div>
      </div>

      {/* Selection Modal/Sidebar */}
      {selectedSlot !== null && (
        <div className="absolute inset-y-0 right-0 w-80 bg-zinc-950 border-l border-zinc-800 shadow-2xl flex flex-col z-20">
          <div className="p-4 border-b border-zinc-800 flex justify-between items-center bg-zinc-900">
            <h3 className="font-bold text-lg">Select {FORMATION_POSITIONS[squad.formation][selectedSlot].pos}</h3>
            <button onClick={() => setSelectedSlot(null)} className="p-1 hover:bg-zinc-800 rounded-full">
              <X className="w-5 h-5" />
            </button>
          </div>
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {getAvailablePlayers().length === 0 ? (
              <p className="text-zinc-500 text-center mt-8">No available players for this position.</p>
            ) : (
              getAvailablePlayers().map(p => (
                <div key={p.id} className="flex flex-col items-center bg-zinc-900 p-3 rounded-xl border border-zinc-800">
                  <PlayerCard player={p} size="md" onClick={() => handleSelectPlayer(p)} />
                  <button 
                    onClick={() => handleSellPlayer(p)}
                    className="mt-3 w-full flex items-center justify-center space-x-2 bg-red-900/30 text-red-400 hover:bg-red-900/50 py-2 rounded-lg text-xs font-bold transition-colors"
                  >
                    <Trash2 className="w-3 h-3" />
                    <span>SELL ({getPlayerValue(p)})</span>
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
