import React, { useState, useEffect } from 'react';
import { Player } from '../types';
import { generateRandomPlayer } from '../data/players';
import PlayerCard from '../components/PlayerCard';
import { motion, AnimatePresence } from 'motion/react';
import { useAudio } from '../contexts/AudioContext';

interface Props {
  coins: number;
  setCoins: React.Dispatch<React.SetStateAction<number>>;
  inventory: Player[];
  setInventory: React.Dispatch<React.SetStateAction<Player[]>>;
}

const PACKS = [
  { id: 'BRONZE', name: 'BRONZE PACK', cost: 100, color: 'from-amber-700 to-amber-900', shadow: 'rgba(180,83,9,0.3)' },
  { id: 'SILVER', name: 'SILVER PACK', cost: 500, color: 'from-zinc-300 to-zinc-500', shadow: 'rgba(161,161,170,0.3)' },
  { id: 'GOLD', name: 'GOLD PACK', cost: 1000, color: 'from-yellow-400 to-yellow-600', shadow: 'rgba(250,204,21,0.3)' },
  { id: 'SUPER_LEGENDARY', name: 'LEGEND PACK', cost: 5000, color: 'from-purple-600 to-indigo-900', shadow: 'rgba(139,92,246,0.4)' },
  { id: 'LUCKY', name: 'LUCKY PACK', cost: 777, color: 'from-red-500 via-green-500 to-blue-500', shadow: 'rgba(255,255,255,0.5)' },
];

export default function StoreScreen({ coins, setCoins, inventory, setInventory }: Props) {
  const { playAudio, stopAudio } = useAudio();
  const [opening, setOpening] = useState<string | null>(null);
  const [revealedPlayer, setRevealedPlayer] = useState<Player | null>(null);
  const [walkoutStage, setWalkoutStage] = useState<number>(0);

  useEffect(() => {
    return () => stopAudio('PACK_OPEN');
  }, []);

  const openPack = (pack: typeof PACKS[0]) => {
    if (coins < pack.cost) return;
    stopAudio('THEME');
    playAudio('PACK_OPEN');
    setCoins(c => c - pack.cost);
    setOpening(pack.id);
    setRevealedPlayer(null);
    setWalkoutStage(0);
    
    let packType = pack.id;
    if (pack.id === 'LUCKY') {
      const rand = Math.random();
      if (rand < 0.4) packType = 'BRONZE';
      else if (rand < 0.7) packType = 'SILVER';
      else if (rand < 0.9) packType = 'GOLD';
      else packType = 'SUPER_LEGENDARY';
    }
    
    const newPlayer = generateRandomPlayer(packType as any);
    
    setTimeout(() => {
      setRevealedPlayer(newPlayer);
      setWalkoutStage(1);
      
      setTimeout(() => {
        setWalkoutStage(2);
        
        setTimeout(() => {
          setWalkoutStage(3);
          setInventory(prev => [...prev, newPlayer]);
        }, 1500);
      }, 1500);
    }, 2000);
  };

  const isLegend = revealedPlayer && revealedPlayer.ovr >= 90;

  return (
    <div className="absolute inset-0 flex flex-col items-center p-8 overflow-y-auto bg-transparent">
      {/* Enhanced Background Removed to show global background */}
      
      <AnimatePresence mode="wait">
        {!revealedPlayer && !opening ? (
          <motion.div 
            key="store-front"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className="flex flex-col items-center w-full max-w-5xl z-10 my-auto"
          >
            <h2 className="text-4xl font-black italic mb-12 text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-500 drop-shadow-[0_0_15px_rgba(59,130,246,0.5)]">STORE</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 w-full pb-8">
              {PACKS.map(pack => (
                <div key={pack.id} className="flex flex-col items-center">
                  <div 
                    className={`w-56 h-80 bg-gradient-to-br ${pack.color} rounded-2xl shadow-[0_0_30px_${pack.shadow}] border border-white/20 flex items-center justify-center mb-6 relative overflow-hidden group cursor-pointer transition-transform hover:scale-105`}
                    onClick={() => openPack(pack)}
                  >
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
                    <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/stardust.png')] opacity-30 mix-blend-overlay" />
                    <h2 className="text-3xl font-black italic text-white z-10 drop-shadow-lg text-center leading-tight">{pack.name.replace(' ', '\n')}</h2>
                  </div>
                  <button 
                    onClick={() => openPack(pack)}
                    disabled={coins < pack.cost}
                    className="px-8 py-4 bg-zinc-800 text-white font-bold rounded-full hover:bg-zinc-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-3 w-full justify-center border border-zinc-700 hover:border-zinc-500 shadow-lg"
                  >
                    <span className="text-lg">BUY</span>
                    <span className="text-zinc-500">|</span>
                    <span className="text-yellow-500 font-mono text-lg">{pack.cost} C</span>
                  </button>
                </div>
              ))}
            </div>
          </motion.div>
        ) : opening && !revealedPlayer ? (
          <div className="fixed inset-0 flex items-center justify-center z-[100]">
            <motion.div 
              key="opening"
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: [0.8, 1.2, 1], opacity: 1, rotateY: [0, 180, 360, 540, 720] }}
              transition={{ duration: 2, ease: "easeInOut" }}
              className={`w-64 h-96 bg-gradient-to-br ${PACKS.find(p => p.id === opening)?.color} rounded-2xl shadow-[0_0_100px_${PACKS.find(p => p.id === opening)?.shadow}]`}
            />
          </div>
        ) : revealedPlayer ? (
          <motion.div 
            key="revealed"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex flex-col items-center justify-center w-full h-full fixed inset-0 bg-black/90 backdrop-blur-xl z-[100]"
          >
            {/* Fireworks for legends */}
            {isLegend && walkoutStage === 3 && (
              <div className="absolute inset-0 pointer-events-none overflow-hidden flex items-center justify-center">
                <div className="absolute w-[800px] h-[800px] bg-yellow-500/20 rounded-full blur-[100px] animate-pulse" />
                {[...Array(30)].map((_, i) => (
                  <motion.div
                    key={i}
                    initial={{ x: '50vw', y: '100vh', scale: 0 }}
                    animate={{ 
                      x: `${Math.random() * 100}vw`, 
                      y: `${Math.random() * 100}vh`,
                      scale: [0, Math.random() * 3 + 1, 0],
                      opacity: [0, 1, 0]
                    }}
                    transition={{ duration: 2.5, repeat: Infinity, delay: Math.random() * 2 }}
                    className="absolute w-3 h-3 rounded-full bg-yellow-400 shadow-[0_0_20px_rgba(250,204,21,1)]"
                  />
                ))}
              </div>
            )}

            {/* Normal particles */}
            {!isLegend && walkoutStage === 3 && (
              <div className="absolute inset-0 pointer-events-none overflow-hidden">
                {[...Array(20)].map((_, i) => (
                  <motion.div
                    key={i}
                    initial={{ y: -50, x: `${Math.random() * 100}vw`, opacity: 0 }}
                    animate={{ y: '100vh', opacity: [0, 1, 0], rotate: 360 }}
                    transition={{ duration: 4, repeat: Infinity, delay: Math.random() * 3 }}
                    className="absolute w-1 h-8 bg-blue-400/40 rounded-full"
                  />
                ))}
              </div>
            )}

            <div className="relative z-10 flex flex-col items-center justify-center h-full w-full">
              {walkoutStage === 1 && (
                <motion.div 
                  initial={{ scale: 0, opacity: 0, y: 50 }}
                  animate={{ scale: 1, opacity: 1, y: 0 }}
                  exit={{ scale: 0, opacity: 0, y: -50 }}
                  className="drop-shadow-[0_0_30px_rgba(255,255,255,0.3)] absolute"
                >
                  <img 
                    src={`https://flagcdn.com/w320/${revealedPlayer.nation.toLowerCase()}.png`} 
                    alt={revealedPlayer.nation} 
                    className="w-64 h-auto rounded-lg shadow-2xl border-4 border-white/10"
                  />
                </motion.div>
              )}
              
              {walkoutStage === 2 && (
                <motion.div 
                  initial={{ scale: 0, opacity: 0, y: 50 }}
                  animate={{ scale: 1, opacity: 1, y: 0 }}
                  exit={{ scale: 0, opacity: 0, y: -50 }}
                  className="text-9xl font-black text-white drop-shadow-[0_0_40px_rgba(255,255,255,0.5)] absolute tracking-tighter"
                >
                  {revealedPlayer.position}
                </motion.div>
              )}

              {walkoutStage === 3 && (
                <motion.div 
                  initial={{ scale: 0.5, opacity: 0, y: 100 }}
                  animate={{ scale: 1, opacity: 1, y: 0 }}
                  transition={{ type: "spring", bounce: 0.4 }}
                  className="flex flex-col items-center justify-center w-full h-full"
                >
                  <h3 className={`text-4xl md:text-5xl font-black mb-8 tracking-widest uppercase text-center ${isLegend ? 'text-transparent bg-clip-text bg-gradient-to-r from-yellow-300 to-yellow-600 drop-shadow-[0_0_30px_rgba(250,204,21,0.8)]' : 'text-white drop-shadow-lg'}`}>
                    {isLegend ? 'LEGENDARY WALKOUT!' : 'PLAYER WALKOUT'}
                  </h3>
                  <div className="scale-110 md:scale-125 mb-12">
                    <PlayerCard player={revealedPlayer} size="lg" className={`${isLegend ? 'shadow-[0_0_100px_rgba(250,204,21,0.4)]' : 'shadow-[0_0_50px_rgba(255,255,255,0.1)]'}`} />
                  </div>
                  <button 
                    onClick={() => { setRevealedPlayer(null); setOpening(null); stopAudio('PACK_OPEN'); playAudio('THEME', true); }}
                    className="px-12 py-4 bg-white text-black font-black rounded-full hover:bg-zinc-200 transition-all text-xl shadow-[0_0_30px_rgba(255,255,255,0.3)] hover:shadow-[0_0_50px_rgba(255,255,255,0.5)] hover:scale-105"
                  >
                    CONTINUE
                  </button>
                </motion.div>
              )}
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}
