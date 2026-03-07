import React from 'react';
import { Player } from '../types';

interface Props {
  player: Player;
  onClick?: () => void;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export default function PlayerCard({ player, onClick, size = 'md', className = '' }: Props) {
  const getQualityColor = (player: Player) => {
    if (player.rarity === 'SUPER_LEGENDARY') return 'from-purple-600 via-purple-800 to-purple-950 text-purple-100 border-purple-400 shadow-[0_0_15px_rgba(168,85,247,0.5)]';
    if (player.rarity === 'GOLD' || player.ovr >= 80) return 'from-yellow-300 via-yellow-500 to-yellow-700 text-yellow-950 border-yellow-200';
    if (player.rarity === 'SILVER' || (player.ovr >= 70 && player.ovr < 80)) return 'from-zinc-300 via-zinc-400 to-zinc-500 text-zinc-900 border-zinc-200';
    return 'from-amber-700 via-amber-800 to-amber-900 text-amber-100 border-amber-600';
  };

  const bgGradient = getQualityColor(player);
  
  const sizeClasses = {
    sm: 'w-20 h-32 text-[9px]',
    md: 'w-36 h-52 text-xs',
    lg: 'w-48 h-72 text-sm',
  };

  return (
    <div 
      onClick={onClick}
      className={`relative rounded-xl bg-gradient-to-br ${bgGradient} p-1 shadow-xl border cursor-pointer hover:scale-105 transition-transform ${sizeClasses[size]} ${className} overflow-hidden`}
    >
      <div className="absolute top-2 left-2 flex flex-col items-center z-10">
        <span className="font-black text-xl leading-none">{player.ovr}</span>
        <span className="font-bold opacity-80">{player.position}</span>
        {player.nation && (
          <img 
            src={`https://flagcdn.com/w20/${player.nation.toLowerCase()}.png`} 
            alt={player.nation} 
            className="w-4 h-auto mt-1 rounded-sm shadow-sm"
          />
        )}
      </div>
      
      {player.image && (
        <div className="absolute inset-0 flex items-center justify-center opacity-80 mix-blend-luminosity pb-8">
          <img src={player.image} alt={player.name} className="w-3/4 h-3/4 object-contain drop-shadow-2xl" referrerPolicy="no-referrer" />
        </div>
      )}

      <div className="absolute top-2 right-2 bg-black/50 rounded px-1 text-[10px] text-white font-bold z-10">
        +{player.level}
      </div>
      
      <div className="absolute bottom-0 left-0 right-0 p-2 bg-black/40 backdrop-blur-md rounded-b-lg text-white z-10">
        <div className="text-center font-bold uppercase tracking-tighter truncate mb-1">
          {player.name}
        </div>
        <div className="grid grid-cols-2 gap-x-2 gap-y-0.5 opacity-90 text-[0.8em] font-mono">
          <div className="flex justify-between"><span>PAC</span><span className="font-bold">{player.stats.pac}</span></div>
          <div className="flex justify-between"><span>DRI</span><span className="font-bold">{player.stats.dri}</span></div>
          <div className="flex justify-between"><span>SHO</span><span className="font-bold">{player.stats.sho}</span></div>
          <div className="flex justify-between"><span>DEF</span><span className="font-bold">{player.stats.def}</span></div>
          <div className="flex justify-between"><span>PAS</span><span className="font-bold">{player.stats.pas}</span></div>
          <div className="flex justify-between"><span>PHY</span><span className="font-bold">{player.stats.phy}</span></div>
        </div>
      </div>
    </div>
  );
}
