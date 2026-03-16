import React from 'react';
import { Player } from '../types';

interface Props {
  player: Player;
  onClick?: () => void;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export default function PlayerCard({ player, onClick, size = 'md', className = '' }: Props) {
  const getCardTheme = (p: Player) => {
    if (p.rarity === 'SUPER_LEGENDARY') return 'from-fuchsia-400 via-violet-600 to-slate-950 border-fuchsia-200/70 shadow-[0_0_30px_rgba(168,85,247,0.35)]';
    if (p.rarity === 'GOLD' || p.ovr >= 86) return 'from-yellow-200 via-amber-400 to-yellow-900 border-yellow-100/70 shadow-[0_0_26px_rgba(250,204,21,0.28)]';
    if (p.rarity === 'SILVER' || p.ovr >= 75) return 'from-slate-200 via-slate-400 to-slate-800 border-slate-100/60 shadow-[0_0_24px_rgba(148,163,184,0.22)]';
    return 'from-amber-500 via-amber-700 to-stone-950 border-amber-200/40 shadow-[0_0_18px_rgba(217,119,6,0.2)]';
  };

  const sizeClasses = {
    sm: 'w-24 h-36 text-[9px]',
    md: 'w-40 h-60 text-xs',
    lg: 'w-52 h-80 text-sm',
  };

  return (
    <button
      type="button"
      onClick={onClick}
      className={`group relative rounded-[22px] bg-gradient-to-br ${getCardTheme(player)} p-[1.5px] text-left transition-all duration-300 hover:-translate-y-1 hover:scale-[1.02] ${sizeClasses[size]} ${className}`}
    >
      <div className="relative w-full h-full rounded-[21px] overflow-hidden bg-[linear-gradient(180deg,rgba(255,255,255,0.18),rgba(10,10,12,0.2)_30%,rgba(7,10,17,0.92)_100%)]">
        <div className="absolute inset-0 opacity-70 bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.38),transparent_35%),linear-gradient(135deg,rgba(255,255,255,0.08),transparent_40%)]" />
        <div className="absolute top-0 right-0 w-24 h-24 bg-white/10 blur-2xl rounded-full" />

        <div className="absolute top-3 left-3 z-10 text-white">
          <div className="text-2xl leading-none font-black drop-shadow">{player.ovr}</div>
          <div className="text-[11px] font-extrabold tracking-[0.25em] mt-1">{player.position}</div>
          {player.nation && (
            <img src={`https://flagcdn.com/w40/${player.nation.toLowerCase()}.png`} alt={player.nation} className="w-5 h-4 object-cover rounded-sm mt-2 border border-white/40" />
          )}
        </div>

        <div className="absolute top-3 right-3 z-10 rounded-full px-2 py-1 text-[10px] font-black bg-black/35 text-white border border-white/10 backdrop-blur-md">
          +{player.level}
        </div>

        <div className="absolute inset-x-0 top-8 bottom-16 flex items-center justify-center z-0">
          <img
            src={player.image}
            alt={player.name}
            referrerPolicy="no-referrer"
            className="h-full w-full object-cover object-top opacity-95 group-hover:scale-105 transition-transform duration-300"
          />
          <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(255,255,255,0.08),transparent_20%,rgba(3,7,18,0.15)_55%,rgba(2,6,23,0.88)_100%)]" />
        </div>

        <div className="absolute bottom-0 inset-x-0 z-10 p-3 bg-[linear-gradient(180deg,rgba(3,7,18,0.1),rgba(3,7,18,0.92)_20%,rgba(3,7,18,0.98)_100%)]">
          <div className="text-center font-black uppercase tracking-tight truncate text-white text-sm mb-2">{player.name}</div>
          <div className="grid grid-cols-3 gap-1.5 text-[10px] font-semibold text-white/90">
            {[
              ['PAC', player.stats.pac],
              ['SHO', player.stats.sho],
              ['PAS', player.stats.pas],
              ['DRI', player.stats.dri],
              ['DEF', player.stats.def],
              ['PHY', player.stats.phy],
            ].map(([label, value]) => (
              <div key={label as string} className="rounded-lg bg-white/8 border border-white/8 px-1.5 py-1 flex items-center justify-between">
                <span className="text-white/70">{label}</span>
                <span className="font-black">{value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </button>
  );
}
