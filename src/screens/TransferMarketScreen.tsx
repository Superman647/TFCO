import React, { useState, useEffect } from 'react';
import { Player } from '../types';
import { generateRandomPlayer } from '../data/players';
import PlayerCard from '../components/PlayerCard';
import { Coins, Search, Filter, TrendingUp } from 'lucide-react';

interface Props {
  coins: number;
  onBuy: (player: Player, cost: number) => void;
}

interface MarketItem {
  id: string;
  player: Player;
  price: number;
}

export default function TransferMarketScreen({ coins, onBuy }: Props) {
  const [marketPlayers, setMarketPlayers] = useState<MarketItem[]>([]);

  useEffect(() => {
    // Generate some initial market players
    const generateMarket = () => {
      const items: MarketItem[] = [];
      for (let i = 0; i < 12; i++) {
        const type = Math.random() > 0.85 ? 'GOLD' : Math.random() > 0.4 ? 'SILVER' : 'BRONZE';
        const player = generateRandomPlayer(type as any);
        // Calculate price based on OVR exponentially
        const basePrice = Math.floor(Math.pow(player.ovr - 50, 2.5) * 2) + 100;
        // Add some randomness to price
        const price = Math.floor(basePrice * (0.9 + Math.random() * 0.2));
        items.push({ id: Math.random().toString(), player, price });
      }
      setMarketPlayers(items.sort((a, b) => b.player.ovr - a.player.ovr));
    };
    generateMarket();
  }, []);

  const handleBuy = (item: MarketItem) => {
    if (coins >= item.price) {
      onBuy(item.player, item.price);
      setMarketPlayers(prev => prev.filter(p => p.id !== item.id));
    }
  };

  return (
    <div className="h-full flex flex-col bg-transparent p-6 overflow-y-auto">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-4xl font-black italic text-white mb-2 flex items-center">
            <TrendingUp className="w-8 h-8 mr-3 text-blue-500" />
            TRANSFER MARKET
          </h1>
          <p className="text-zinc-400">Scout and sign new talents for your squad</p>
        </div>
        <div className="flex items-center space-x-2 bg-zinc-900/60 backdrop-blur-md px-6 py-3 rounded-full border border-zinc-800">
          <Coins className="text-yellow-500 w-6 h-6" />
          <span className="text-2xl font-bold text-white">{coins.toLocaleString()}</span>
        </div>
      </div>

      <div className="flex space-x-4 mb-8">
        <div className="flex-1 bg-zinc-900/60 backdrop-blur-md border border-zinc-800 rounded-xl flex items-center px-4 py-3">
          <Search className="text-zinc-500 w-5 h-5 mr-3" />
          <input 
            type="text" 
            placeholder="Search players by name..." 
            className="bg-transparent border-none outline-none text-white w-full"
          />
        </div>
        <button className="bg-zinc-900/60 backdrop-blur-md border border-zinc-800 px-6 py-3 flex items-center text-white hover:bg-zinc-800 transition-colors">
          <Filter className="w-5 h-5 mr-2" />
          Filters
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6 pb-20">
        {marketPlayers.map(item => (
          <div key={item.id} className="bg-zinc-900/50 rounded-2xl p-4 border border-zinc-800/50 flex flex-col items-center relative group hover:bg-zinc-900 hover:border-zinc-700 transition-all">
            <PlayerCard player={item.player} size="md" className="group-hover:scale-105 transition-transform duration-300" />
            
            <div className="mt-6 w-full flex flex-col space-y-3">
              <div className="flex justify-between items-center px-2 bg-black/30 py-2 rounded-lg">
                <span className="text-zinc-400 text-xs font-bold uppercase tracking-wider">Buy Now</span>
                <div className="flex items-center space-x-1">
                  <Coins className="w-4 h-4 text-yellow-500" />
                  <span className="text-white font-black text-lg">{item.price.toLocaleString()}</span>
                </div>
              </div>
              
              <button 
                onClick={() => handleBuy(item)}
                disabled={coins < item.price}
                className={`w-full py-3 rounded-xl font-bold transition-all ${
                  coins >= item.price 
                    ? 'bg-blue-600 hover:bg-blue-500 text-white shadow-[0_0_15px_rgba(37,99,235,0.2)] hover:shadow-[0_0_20px_rgba(37,99,235,0.4)]' 
                    : 'bg-zinc-800 text-zinc-500 cursor-not-allowed'
                }`}
              >
                {coins >= item.price ? 'SIGN PLAYER' : 'TOO EXPENSIVE'}
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
