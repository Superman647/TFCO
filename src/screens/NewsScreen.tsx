import React, { useState, useEffect } from 'react';
import { Newspaper, Globe, Trophy, ArrowLeft, Calendar, TrendingUp } from 'lucide-react';
import { NewsItem } from '../types';
import { motion, AnimatePresence } from 'framer-motion';

interface NewsScreenProps {
  onBack: () => void;
}

export default function NewsScreen({ onBack }: NewsScreenProps) {
  const [news, setNews] = useState<NewsItem[]>([]);
  const [selectedArticle, setSelectedArticle] = useState<NewsItem | null>(null);

  useEffect(() => {
    const savedNews = localStorage.getItem('fcweb_news');
    if (savedNews) {
      setNews(JSON.parse(savedNews));
    } else {
      const initialNews: NewsItem[] = [
        {
          id: '1',
          title: 'Global Football Market Heats Up',
          content: 'Top clubs are looking for new talents. The transfer window is officially open and scouts are everywhere.',
          date: new Date().toLocaleDateString(),
          type: 'WORLD_NEWS',
          image: 'https://picsum.photos/seed/football1/800/400'
        },
        {
          id: '2',
          title: 'New Training Methods Revolutionize the Game',
          content: 'Sports scientists suggest that high-intensity interval training combined with tactical drills is the key to success.',
          date: new Date().toLocaleDateString(),
          type: 'WORLD_NEWS',
          image: 'https://picsum.photos/seed/training/800/400'
        }
      ];
      setNews(initialNews);
      localStorage.setItem('fcweb_news', JSON.stringify(initialNews));
    }
  }, []);

  return (
    <div className="min-h-screen bg-zinc-950 p-6 overflow-y-auto">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-10">
          <button onClick={onBack} className="p-2 hover:bg-zinc-900 rounded-full transition-colors">
            <ArrowLeft className="w-6 h-6" />
          </button>
          <div className="text-center">
            <h1 className="text-4xl font-black italic tracking-tighter flex items-center gap-3 justify-center">
              <Newspaper className="w-10 h-10 text-emerald-500" />
              FOOTBALL DAILY
            </h1>
            <p className="text-zinc-500 text-sm uppercase tracking-widest mt-1">The pulse of the beautiful game</p>
          </div>
          <div className="w-10" /> {/* Spacer */}
        </div>

        <div className="space-y-8">
          {news.map((item, idx) => (
            <motion.div
              key={item.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.1 }}
              className="bg-zinc-900/50 rounded-3xl border border-zinc-800 overflow-hidden group hover:border-emerald-500/50 transition-colors"
            >
              {item.image && (
                <div className="h-64 overflow-hidden relative">
                  <img 
                    src={item.image} 
                    alt={item.title} 
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    referrerPolicy="no-referrer"
                  />
                  <div className="absolute top-4 left-4">
                    <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${
                      item.type === 'ACHIEVEMENT' ? 'bg-yellow-500 text-black' : 
                      item.type === 'INTERVIEW' ? 'bg-blue-500 text-white' : 'bg-emerald-500 text-white'
                    }`}>
                      {item.type.replace('_', ' ')}
                    </span>
                  </div>
                </div>
              )}
              <div className="p-8">
                <div className="flex items-center gap-4 text-zinc-500 text-xs mb-4">
                  <span className="flex items-center gap-1"><Calendar className="w-3 h-3" /> {item.date}</span>
                  <span className="flex items-center gap-1"><Globe className="w-3 h-3" /> Global Edition</span>
                </div>
                <h2 className="text-2xl font-black italic mb-4 group-hover:text-emerald-400 transition-colors cursor-pointer" onClick={() => setSelectedArticle(item)}>{item.title}</h2>
                <p className="text-zinc-400 leading-relaxed text-lg line-clamp-2">{item.content}</p>
                <button 
                  onClick={() => setSelectedArticle(item)}
                  className="mt-4 text-emerald-500 hover:text-emerald-400 font-bold text-sm uppercase tracking-widest flex items-center gap-1"
                >
                  Read Full Article <ArrowLeft className="w-4 h-4 rotate-180" />
                </button>
              </div>
            </motion.div>
          ))}

          {news.length === 0 && (
            <div className="text-center py-20">
              <Newspaper className="w-20 h-20 text-zinc-800 mx-auto mb-4" />
              <p className="text-zinc-500">No news updates yet. Keep playing to make headlines!</p>
            </div>
          )}
        </div>
      </div>

      {/* Article Modal */}
      <AnimatePresence>
        {selectedArticle && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
            onClick={() => setSelectedArticle(null)}
          >
            <motion.div 
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              className="bg-zinc-900 border border-zinc-800 rounded-3xl max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl"
              onClick={e => e.stopPropagation()}
            >
              <div className="relative">
                {selectedArticle.image && (
                  <div className="h-64 sm:h-80 w-full relative">
                    <img 
                      src={selectedArticle.image} 
                      alt={selectedArticle.title} 
                      className="w-full h-full object-cover"
                      referrerPolicy="no-referrer"
                    />
                  </div>
                )}
                <button 
                  onClick={() => setSelectedArticle(null)}
                  className="absolute top-4 right-4 p-2 bg-black/50 hover:bg-black/80 rounded-full text-white backdrop-blur-md transition-colors z-10"
                >
                  <ArrowLeft className="w-6 h-6 rotate-180" />
                </button>
              </div>
              <div className="p-8">
                <div className="flex items-center gap-4 text-zinc-500 text-xs mb-4">
                  <span className="flex items-center gap-1"><Calendar className="w-3 h-3" /> {selectedArticle.date}</span>
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-widest ${
                    selectedArticle.type === 'ACHIEVEMENT' ? 'bg-yellow-500/20 text-yellow-500' : 
                    selectedArticle.type === 'INTERVIEW' ? 'bg-blue-500/20 text-blue-500' : 'bg-emerald-500/20 text-emerald-500'
                  }`}>
                    {selectedArticle.type.replace('_', ' ')}
                  </span>
                </div>
                <h1 className="text-3xl sm:text-4xl font-black italic mb-6 text-white">{selectedArticle.title}</h1>
                <div className="prose prose-invert prose-emerald max-w-none">
                  {selectedArticle.content.split('\n').map((paragraph, idx) => (
                    <p key={idx} className="text-zinc-300 text-lg leading-relaxed mb-4">
                      {paragraph}
                    </p>
                  ))}
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
