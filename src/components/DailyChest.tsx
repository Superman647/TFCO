import React, { useState, useEffect } from 'react';
import { Gift, Clock } from 'lucide-react';
import { Player } from '../types';
import { generateRandomPlayer } from '../data/players';
import PlayerCard from './PlayerCard';
import { motion, AnimatePresence } from 'motion/react';

interface Props {
  onClaim: (coins: number, player: Player) => void;
}

export default function DailyChest({ onClaim }: Props) {
  const [lastClaimed, setLastClaimed] = useState<number>(() => {
    const saved = localStorage.getItem('fcweb_last_chest');
    return saved ? parseInt(saved, 10) : 0;
  });
  const [timeLeft, setTimeLeft] = useState<number>(0);
  const [showReward, setShowReward] = useState<{ coins: number, player: Player } | null>(null);

  const COOLDOWN = 24 * 60 * 60 * 1000; // 24 hours

  useEffect(() => {
    const checkTime = () => {
      const now = Date.now();
      const timeSinceClaim = now - lastClaimed;
      if (timeSinceClaim < COOLDOWN) {
        setTimeLeft(COOLDOWN - timeSinceClaim);
      } else {
        setTimeLeft(0);
      }
    };

    checkTime();
    const interval = setInterval(checkTime, 1000);
    return () => clearInterval(interval);
  }, [lastClaimed]);

  const handleClaim = () => {
    if (timeLeft > 0) return;

    const rewardCoins = Math.floor(Math.random() * 500) + 500; // 500 - 1000 coins
    const rewardPlayer = generateRandomPlayer('GOLD'); // Guaranteed Gold player

    const now = Date.now();
    setLastClaimed(now);
    localStorage.setItem('fcweb_last_chest', now.toString());

    setShowReward({ coins: rewardCoins, player: rewardPlayer });
    onClaim(rewardCoins, rewardPlayer);
  };

  const formatTime = (ms: number) => {
    const hours = Math.floor(ms / (1000 * 60 * 60));
    const minutes = Math.floor((ms % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((ms % (1000 * 60)) / 1000);
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  };

  return (
    <>
      <button 
        onClick={handleClaim}
        disabled={timeLeft > 0}
        className={`group relative overflow-hidden rounded-2xl bg-zinc-900 border ${timeLeft > 0 ? 'border-zinc-800 opacity-75 cursor-not-allowed' : 'border-yellow-500/50 hover:border-yellow-400'} p-8 transition-all`}
      >
        <div className={`absolute inset-0 bg-gradient-to-br from-yellow-500/10 to-transparent opacity-0 ${timeLeft === 0 ? 'group-hover:opacity-100' : ''} transition-opacity`} />
        
        <div className="flex justify-between items-start mb-4">
          <Gift className={`w-12 h-12 ${timeLeft > 0 ? 'text-zinc-600' : 'text-yellow-400 drop-shadow-[0_0_15px_rgba(250,204,21,0.5)]'}`} />
          {timeLeft > 0 && (
            <div className="flex items-center space-x-2 text-zinc-400 bg-zinc-950 px-3 py-1 rounded-full text-sm font-mono border border-zinc-800">
              <Clock className="w-4 h-4" />
              <span>{formatTime(timeLeft)}</span>
            </div>
          )}
        </div>
        
        <h2 className={`text-2xl font-bold mb-2 ${timeLeft > 0 ? 'text-zinc-500' : 'text-white'}`}>Daily Chest</h2>
        <p className="text-zinc-400 text-sm">
          {timeLeft > 0 ? 'Come back tomorrow for more rewards.' : 'Open now for coins and a random player!'}
        </p>
      </button>

      <AnimatePresence>
        {showReward && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-sm p-4"
          >
            <motion.div 
              initial={{ scale: 0.8, y: 50 }}
              animate={{ scale: 1, y: 0 }}
              className="bg-zinc-900 border border-yellow-500/30 p-8 rounded-3xl max-w-md w-full flex flex-col items-center text-center shadow-[0_0_50px_rgba(250,204,21,0.1)]"
            >
              <h2 className="text-4xl font-black italic text-transparent bg-clip-text bg-gradient-to-r from-yellow-300 to-yellow-600 mb-8">
                DAILY REWARD
              </h2>
              
              <div className="flex flex-col items-center space-y-8 w-full">
                <div className="bg-zinc-950 w-full rounded-2xl p-6 border border-zinc-800 flex flex-col items-center">
                  <span className="text-zinc-400 font-medium mb-2">Coins Received</span>
                  <span className="text-5xl font-black text-yellow-400">+{showReward.coins}</span>
                </div>
                
                <div className="flex flex-col items-center">
                  <span className="text-zinc-400 font-medium mb-4">Player Received</span>
                  <PlayerCard player={showReward.player} size="md" className="shadow-[0_0_30px_rgba(255,255,255,0.1)]" />
                </div>
              </div>

              <button 
                onClick={() => setShowReward(null)}
                className="mt-10 w-full py-4 bg-yellow-500 text-black font-black rounded-xl hover:bg-yellow-400 transition-colors text-lg"
              >
                CLAIM
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
