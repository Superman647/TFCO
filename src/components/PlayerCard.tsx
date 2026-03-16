import React from 'react';
import { Player } from '../types';

interface Props {
  player: Player;
  onClick?: () => void;
  size?: 'xs' | 'sm' | 'md' | 'lg';
  className?: string;
  selected?: boolean;
}

const SOFIFA_IDS: Record<string, number> = {
  'sl1': 0, 'sl2': 0, 'sl3': 0, 'sl4': 0, 'sl5': 0, 'sl6': 0,
  'p1': 158023, 'p2': 20801, 'p3': 192476, 'p4': 203376, 'p5': 192119,
  'p6': 231747, 'p7': 190871, 'p8': 215914, 'p9': 201024, 'p10': 208722,
  'p11': 188545, 'p12': 177003, 'p13': 182521, 'p14': 245367, 'p15': 211117,
  'p16': 239087, 'p17': 200069, 'p18': 209331, 'p19': 239085, 'p20': 220834,
  'p21': 202126, 'p22': 238794, 'p23': 245369, 'p24': 244478, 'p25': 0,
  'p26': 246169, 'p27': 188350, 'p28': 237397, 'p29': 200104, 'p30': 234396,
};

function getCardClass(player: Player): string {
  if (player.rarity === 'SUPER_LEGENDARY') return 'card-legend';
  if (player.rarity === 'GOLD' && player.ovr >= 90) return 'card-toty';
  if (player.rarity === 'GOLD') return 'card-gold';
  if (player.rarity === 'SILVER') return 'card-silver';
  return 'card-bronze';
}

function getOvrColor(player: Player): string {
  if (player.rarity === 'SUPER_LEGENDARY') return 'text-purple-200';
  if (player.rarity === 'GOLD' && player.ovr >= 90) return 'text-cyan-200';
  if (player.rarity === 'GOLD') return 'text-yellow-900';
  if (player.rarity === 'SILVER') return 'text-gray-800';
  return 'text-amber-200';
}

function getStatColor(val: number): string {
  if (val >= 90) return '#00e676';
  if (val >= 80) return '#69f0ae';
  if (val >= 70) return '#e8b84b';
  if (val >= 60) return '#ff9800';
  return '#f44336';
}

function getPlayerImage(player: Player): string {
  const sofifaId = SOFIFA_IDS[player.id];
  if (sofifaId && sofifaId > 0) {
    return `https://cdn.sofifa.net/players/${sofifaId}/24_240.png`;
  }
  // Football-style avatar fallback
  return `https://ui-avatars.com/api/?name=${encodeURIComponent(player.name)}&background=1a2a4a&color=7eb3ff&size=128&bold=true&format=png`;
}

export default function PlayerCard({ player, onClick, size = 'md', className = '', selected }: Props) {
  const cardClass = getCardClass(player);
  const ovrColor = getOvrColor(player);
  
  const sizes = {
    xs: { card: 'w-16 h-24', ovr: 'text-base', pos: 'text-[8px]', name: 'text-[7px]', stats: 'text-[6px]', img: 'w-8 h-8' },
    sm: { card: 'w-24 h-36', ovr: 'text-xl', pos: 'text-[9px]', name: 'text-[9px]', stats: 'text-[8px]', img: 'w-12 h-12' },
    md: { card: 'w-32 h-48', ovr: 'text-2xl', pos: 'text-xs', name: 'text-xs', stats: 'text-[10px]', img: 'w-16 h-16' },
    lg: { card: 'w-44 h-64', ovr: 'text-3xl', pos: 'text-sm', name: 'text-sm', stats: 'text-xs', img: 'w-20 h-20' },
  }[size];

  const stats = [
    { label: 'PAC', val: player.stats.pac },
    { label: 'SHO', val: player.stats.sho },
    { label: 'PAS', val: player.stats.pas },
    { label: 'DRI', val: player.stats.dri },
    { label: 'DEF', val: player.stats.def },
    { label: 'PHY', val: player.stats.phy },
  ];

  const imgUrl = getPlayerImage(player);

  return (
    <div
      onClick={onClick}
      className={`
        relative ${sizes.card} ${cardClass} card-shine
        border-2 rounded-xl overflow-hidden
        cursor-pointer select-none
        transition-all duration-200
        ${selected ? 'ring-2 ring-white scale-105' : ''}
        hover:scale-105 hover:brightness-110
        shadow-xl
        ${className}
      `}
      style={{ fontFamily: "'Rajdhani', sans-serif" }}
    >
      {/* Top section: OVR + POS */}
      <div className="absolute top-1.5 left-1.5 flex flex-col items-center z-20 drop-shadow-lg">
        <span className={`font-black leading-none ${sizes.ovr} ${ovrColor}`} style={{ fontFamily: "'Bebas Neue', sans-serif", textShadow: '0 1px 4px rgba(0,0,0,0.5)' }}>
          {player.ovr}
        </span>
        <span className={`font-black ${sizes.pos} ${ovrColor} opacity-90 leading-none mt-0.5`}>
          {player.position}
        </span>
        {player.nation && (
          <img
            src={`https://flagcdn.com/w20/${player.nation.toLowerCase()}.png`}
            alt={player.nation}
            className="w-4 h-auto mt-1 rounded-sm shadow"
            onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }}
          />
        )}
      </div>

      {/* Level badge */}
      <div className="absolute top-1.5 right-1.5 z-20 bg-black/50 rounded px-1 text-white text-[9px] font-black">
        +{player.level}
      </div>

      {/* Player image */}
      <div className="absolute inset-0 flex items-center justify-center pb-10 pt-4 z-10">
        <img
          src={imgUrl}
          alt={player.name}
          className={`${sizes.img} object-contain drop-shadow-xl`}
          style={{ filter: 'drop-shadow(0 4px 12px rgba(0,0,0,0.6))' }}
          onError={e => {
            const el = e.target as HTMLImageElement;
            el.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(player.name)}&background=1a2a4a&color=7eb3ff&size=128&bold=true`;
          }}
        />
      </div>

      {/* Bottom section: name + stats */}
      <div className="absolute bottom-0 left-0 right-0 bg-black/55 backdrop-blur-sm px-1.5 pb-1.5 pt-1 z-20">
        <div className={`text-center font-black ${sizes.name} text-white uppercase tracking-tight truncate mb-1 leading-none`}>
          {player.name.split(' ').pop()}
        </div>
        <div className="grid grid-cols-3 gap-x-1 gap-y-0">
          {stats.map(s => (
            <div key={s.label} className={`flex justify-between items-center ${sizes.stats}`}>
              <span className="text-white/60 font-bold">{s.label}</span>
              <span className="font-black" style={{ color: getStatColor(s.val) }}>{s.val}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Rarity glow overlay */}
      {player.rarity === 'SUPER_LEGENDARY' && (
        <div className="absolute inset-0 rounded-xl pointer-events-none z-0"
          style={{ background: 'radial-gradient(ellipse at 50% 30%, rgba(155,89,182,0.3) 0%, transparent 70%)' }} />
      )}
    </div>
  );
}
