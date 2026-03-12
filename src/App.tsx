import React, { useState, useEffect } from 'react';
import { Home, ShoppingBag, Users, Play, Trophy, Zap, LogOut, Globe, Dumbbell, Volume2, VolumeX, Target, Newspaper } from 'lucide-react';
import { Player, Squad, Difficulty } from './types';
import { INITIAL_PLAYERS, getInitialSquad, generateStarterSquad } from './data/players';
import StoreScreen from './screens/StoreScreen';
import SquadScreen from './screens/SquadScreen';
import MatchScreen from './screens/MatchScreen';
import UpgradeScreen from './screens/UpgradeScreen';
import OnlineScreen from './screens/OnlineScreen';
import TrainScreen from './screens/TrainScreen';
import TransferMarketScreen from './screens/TransferMarketScreen';
import TutorialScreen from './screens/TutorialScreen';
import PracticeScreen from './screens/PracticeScreen';
import DailyChest from './components/DailyChest';
import WorldCupScreen from './screens/WorldCupScreen';
import LeagueScreen from './screens/LeagueScreen';
import NewsScreen from './screens/NewsScreen';
import InterviewScreen from './screens/InterviewScreen';
import { useAudio } from './contexts/AudioContext';

type Tab = 'HOME' | 'SQUAD' | 'STORE' | 'MATCH' | 'UPGRADE' | 'ONLINE' | 'TRAIN' | 'MARKET' | 'TUTORIAL' | 'WORLDCUP' | 'PRACTICE' | 'LEAGUE' | 'NEWS' | 'INTERVIEW';

export default function App() {
  const { playAudio, stopAudio, stopAll, setVolume, volume } = useAudio();
  const [username, setUsername] = useState<string | null>(null);
  const [teamName, setTeamName] = useState<string>('My Team');
  const [teamLogo, setTeamLogo] = useState<string>('https://ui-avatars.com/api/?name=MT&background=random');
  const [activeTab, setActiveTab] = useState<Tab>('HOME');
  const [coins, setCoins] = useState(1000);
  const [tutorialCompleted, setTutorialCompleted] = useState(false);
  const [inventory, setInventory] = useState<Player[]>(INITIAL_PLAYERS.slice(0, 15));
  const [squad, setSquad] = useState<Squad>({
    formation: '4-3-3',
    lineup: getInitialSquad(INITIAL_PLAYERS)
  });
  const [trophies, setTrophies] = useState<string[]>([]);

  const [lastMatchResult, setLastMatchResult] = useState<any>(null);
  const [leagueOpponent, setLeagueOpponent] = useState<string | null>(null);
  const [leagueDifficulty, setLeagueDifficulty] = useState<Difficulty>('MEDIUM');

  const toggleMute = () => {
    if (volume > 0) {
      setVolume(0);
    } else {
      setVolume(0.3);
      // Try to play theme if we are in a menu to ensure audio context is active
      if (activeTab !== 'MATCH' && activeTab !== 'WORLDCUP') {
         playAudio('THEME', true);
      }
    }
  };

  // Audio Management
  useEffect(() => {
    if (!username) {
      stopAll();
      return;
    }

    if (activeTab === 'MATCH') {
      stopAudio('THEME');
      stopAudio('WORLDCUP_THEME');
      // MatchScreen handles its own audio
    } else if (activeTab === 'WORLDCUP') {
      stopAudio('THEME');
      // WorldCupScreen handles WORLDCUP_THEME
    } else {
      stopAudio('WORLDCUP_THEME');
      stopAudio('MATCH_AMBIENT'); // Ensure match audio stops
      playAudio('THEME', true);
    }
  }, [activeTab, username]);

  // Load from localStorage
  useEffect(() => {
    const savedUser = localStorage.getItem('fcweb_user');
    if (savedUser) {
      setUsername(savedUser);
      const data = localStorage.getItem(`fcweb_data_${savedUser}`);
      if (data) {
        const parsed = JSON.parse(data);
        setCoins(parsed.coins);
        setInventory(parsed.inventory);
        if (parsed.squad && parsed.squad.formation) {
          setSquad(parsed.squad);
        } else {
          setSquad({ formation: '4-3-3', lineup: getInitialSquad(INITIAL_PLAYERS) });
        }
        if (parsed.teamName) setTeamName(parsed.teamName);
        if (parsed.teamLogo) setTeamLogo(parsed.teamLogo);
        if (parsed.trophies) setTrophies(parsed.trophies);
      }
    }
  }, []);

  // Save to localStorage
  useEffect(() => {
    if (username) {
      localStorage.setItem(`fcweb_data_${username}`, JSON.stringify({ 
        coins, inventory, squad, teamName, teamLogo, tutorialCompleted, trophies 
      }));
    }
  }, [coins, inventory, squad, teamName, teamLogo, username, tutorialCompleted, trophies]);

  const handleLogin = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const name = formData.get('username') as string;
    const tName = formData.get('teamName') as string || 'My Team';
    
    if (name.trim()) {
      setUsername(name.trim());
      setTeamName(tName.trim());
      setTeamLogo(`https://ui-avatars.com/api/?name=${encodeURIComponent(tName.trim())}&background=random`);
      localStorage.setItem('fcweb_user', name.trim());
      
      // Load existing data if any
      const data = localStorage.getItem(`fcweb_data_${name.trim()}`);
      if (data) {
        const parsed = JSON.parse(data);
        setCoins(parsed.coins);
        setInventory(parsed.inventory);
        if (parsed.squad && parsed.squad.formation) {
          setSquad(parsed.squad);
        } else {
          setSquad({ formation: '4-3-3', lineup: getInitialSquad(INITIAL_PLAYERS) });
        }
        if (parsed.teamName) setTeamName(parsed.teamName);
        if (parsed.teamLogo) setTeamLogo(parsed.teamLogo);
        if (parsed.trophies) setTrophies(parsed.trophies);
        setTutorialCompleted(parsed.tutorialCompleted || false);
      } else {
        // Reset to default for new user
        setCoins(1000);
        setTrophies([]);
        const starterPlayers = generateStarterSquad();
        setInventory(starterPlayers);
        setSquad({
          formation: '4-3-3',
          lineup: getInitialSquad(starterPlayers)
        });
        setTutorialCompleted(false);
        setActiveTab('TUTORIAL');
      }
    }
  };

  const handleLogout = () => {
    setUsername(null);
    localStorage.removeItem('fcweb_user');
  };

  const getBackgroundClass = () => {
    if (!username) return 'bg-game-default';
    switch (activeTab) {
      case 'WORLDCUP':
        return 'bg-game-worldcup';
      case 'TRAIN':
        return 'bg-game-training';
      default:
        return 'bg-game-default';
    }
  };

  if (!username) {
    return (
      <div className={`min-h-screen text-white flex items-center justify-center p-4 ${getBackgroundClass()}`}>
        <div className="w-full max-w-md bg-zinc-900/80 backdrop-blur-xl p-8 rounded-2xl border border-zinc-800 shadow-2xl">
          <div className="flex justify-center mb-8">
            <Trophy className="w-16 h-16 text-emerald-500" />
          </div>
          <h1 className="text-4xl font-black italic text-center mb-2">FC WEB</h1>
          <p className="text-zinc-400 text-center mb-8">Enter your manager name to start your career.</p>
          
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <input 
                type="text" 
                name="username" 
                placeholder="Manager Name" 
                required
                className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-emerald-500 transition-colors mb-4"
              />
              <input 
                type="text" 
                name="teamName" 
                placeholder="Team Name (e.g. Dream FC)" 
                required
                className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-emerald-500 transition-colors"
              />
            </div>
            <button type="submit" className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-3 rounded-xl transition-colors">
              START CAREER
            </button>
          </form>
        </div>
      </div>
    );
  }

  const handleMatchFinish = (reward: number, xpGains: Record<string, number>, scoreA?: number, scoreB?: number, stats?: any) => {
    setCoins(c => c + reward);
    
    // Update XP in Inventory
    setInventory(prev => prev.map(p => {
      if (xpGains[p.id]) {
        return { ...p, xp: (p.xp || 0) + xpGains[p.id] };
      }
      return p;
    }));
    
    // Update XP in Squad
    setSquad(prev => ({
      ...prev,
      lineup: prev.lineup.map(p => {
        if (p && xpGains[p.id]) {
          return { ...p, xp: (p.xp || 0) + xpGains[p.id] };
        }
        return p;
      })
    }));

    if (stats) {
      setLastMatchResult(stats);
      
      // Update League Table if it was a league match
      if (leagueOpponent) {
        const saved = localStorage.getItem(`league_data_${teamName}`);
        if (saved) {
          const data = JSON.parse(saved);
          const newTable = data.table.map((entry: any) => {
            if (entry.isUser) {
              const goalsFor = scoreA || 0;
              const goalsAgainst = scoreB || 0;
              let won = entry.won;
              let drawn = entry.drawn;
              let lost = entry.lost;
              let points = entry.points;

              if (goalsFor > goalsAgainst) { won++; points += 3; }
              else if (goalsFor === goalsAgainst) { drawn++; points += 1; }
              else { lost++; }

              return {
                ...entry,
                played: entry.played + 1,
                won, drawn, lost,
                gf: entry.gf + goalsFor,
                ga: entry.ga + goalsAgainst,
                points
              };
            }
            return entry;
          }).sort((a: any, b: any) => {
            if (b.points !== a.points) return b.points - a.points;
            return (b.gf - b.ga) - (a.gf - a.ga);
          });
          
          localStorage.setItem(`league_data_${teamName}`, JSON.stringify({
            ...data,
            table: newTable,
            matchDay: data.matchDay + 1
          }));
        }
      }
      
      if (leagueOpponent && leagueDifficulty === 'HARD') {
         setActiveTab('INTERVIEW');
      } else {
         setLeagueOpponent(null);
         setActiveTab('HOME');
      }
    } else {
      // Fallback if stats not provided but we have scores
      if (scoreA !== undefined && scoreB !== undefined) {
        setLastMatchResult({
          score: `${scoreA}-${scoreB}`,
          opponent: leagueOpponent || 'Opponent',
          isWinner: scoreA > scoreB
        });
        if (leagueOpponent && leagueDifficulty === 'HARD') {
           setActiveTab('INTERVIEW');
        } else {
           setLeagueOpponent(null);
           setActiveTab('HOME');
        }
      } else {
        setLeagueOpponent(null);
        setActiveTab('HOME');
      }
    }
  };

  const addNews = (title: string, content: string, type: 'ACHIEVEMENT' | 'INTERVIEW' | 'WORLD_NEWS') => {
    const newItem = {
      id: Date.now().toString(),
      title,
      content,
      date: new Date().toLocaleDateString(),
      type,
      image: `https://picsum.photos/seed/${Date.now()}/800/400`
    };
    const savedNews = localStorage.getItem('fcweb_news');
    const news = savedNews ? JSON.parse(savedNews) : [];
    const updatedNews = [newItem, ...news].slice(0, 20);
    localStorage.setItem('fcweb_news', JSON.stringify(updatedNews));
  };

  const renderTab = () => {
    switch (activeTab) {
      case 'TUTORIAL':
        return <TutorialScreen onComplete={() => {
          setTutorialCompleted(true);
          setCoins(c => c + 500); // Bonus for tutorial
          setActiveTab('HOME');
        }} />;
      case 'STORE':
        return <StoreScreen coins={coins} setCoins={setCoins} inventory={inventory} setInventory={setInventory} />;
      case 'SQUAD':
        return <SquadScreen squad={squad} setSquad={setSquad} inventory={inventory} setInventory={setInventory} coins={coins} setCoins={setCoins} />;
      case 'UPGRADE':
        return <UpgradeScreen inventory={inventory} setInventory={setInventory} coins={coins} setCoins={setCoins} />;
      case 'TRAIN':
        return <TrainScreen inventory={inventory} setInventory={setInventory} coins={coins} setCoins={setCoins} />;
      case 'MARKET':
        return <TransferMarketScreen coins={coins} onBuy={(player, cost) => {
          setCoins(c => c - cost);
          setInventory(inv => [...inv, player]);
        }} />;
      case 'MATCH':
        return <MatchScreen 
          squad={squad} 
          onFinish={handleMatchFinish} 
          opponentName={leagueOpponent || undefined} 
          forcedDifficulty={leagueOpponent ? leagueDifficulty : undefined}
        />;
      case 'ONLINE':
        return <OnlineScreen username={username} squad={squad} onMatchComplete={handleMatchFinish} />;
      case 'WORLDCUP':
        return <WorldCupScreen 
          onBack={() => setActiveTab('HOME')} 
          onWin={() => {
            addNews("World Cup Glory!", `${teamName} has won the World Cup after a thrilling final!`, 'ACHIEVEMENT');
            setTrophies(prev => [...prev, 'World Cup']);
          }} 
          onMatchComplete={(coins, xp, scoreA, scoreB, round) => {
            setCoins(c => c + coins);
            // Update XP
            setInventory(prev => prev.map(p => xp[p.id] ? { ...p, xp: (p.xp || 0) + xp[p.id] } : p));
            setSquad(prev => ({
              ...prev,
              lineup: prev.lineup.map(p => p && xp[p.id] ? { ...p, xp: (p.xp || 0) + xp[p.id] } : p)
            }));
            
            // Check if interview is needed
            if (round && ['R16', 'QF', 'SF', 'FINAL'].includes(round)) {
               setLastMatchResult({
                 score: `${scoreA}-${scoreB}`,
                 opponent: 'World Cup Opponent',
                 isWinner: (scoreA || 0) > (scoreB || 0),
                 competition: 'World Cup ' + round,
                 returnTab: 'WORLDCUP'
               });
               setActiveTab('INTERVIEW');
            }
          }} 
        />;
      case 'PRACTICE':
        return <PracticeScreen squad={squad} onBack={() => setActiveTab('HOME')} />;
      case 'LEAGUE':
        return <LeagueScreen teamName={teamName} onBack={() => setActiveTab('HOME')} onStartMatch={(opponent, diff) => {
          setLeagueOpponent(opponent);
          setLeagueDifficulty(diff);
          setActiveTab('MATCH');
        }} />;
      case 'NEWS':
        return <NewsScreen onBack={() => setActiveTab('HOME')} />;
      case 'INTERVIEW':
        return <InterviewScreen 
          matchResult={{
            score: lastMatchResult?.score || '0-0',
            opponent: lastMatchResult?.opponent || 'Opponent',
            competition: lastMatchResult?.competition || (leagueOpponent ? 'Champions League' : 'Friendly'),
            isWinner: lastMatchResult?.isWinner || false,
            playerPerformance: 'The team showed great spirit on the pitch today.'
          }} 
          onFinish={(summary) => {
            if (summary) {
              addNews("Manager Speaks Out", summary, 'INTERVIEW');
            }
            setLeagueOpponent(null);
            if (lastMatchResult?.returnTab) {
               setActiveTab(lastMatchResult.returnTab);
            } else {
               setActiveTab('HOME');
            }
          }} 
        />;
      case 'HOME':
      default:
        return (
          <div className="flex flex-col items-center justify-center h-full space-y-8 p-4 overflow-y-auto">
            <div className="text-center mb-8 mt-8">
              <h2 className="text-xl text-zinc-400 font-medium mb-2">Welcome back,</h2>
              <h1 className="text-6xl font-black italic tracking-tighter text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-cyan-400">
                {username.toUpperCase()}
              </h1>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 w-full max-w-6xl">
              <DailyChest onClaim={(rewardCoins, rewardPlayer) => {
                setCoins(c => c + rewardCoins);
                setInventory(inv => [...inv, rewardPlayer]);
              }} />

              <button onClick={() => setActiveTab('LEAGUE')} className="group relative overflow-hidden rounded-2xl bg-zinc-900/60 backdrop-blur-md border border-zinc-800 p-8 hover:border-emerald-500 transition-colors">
                <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                <Trophy className="w-12 h-12 text-emerald-400 mb-4" />
                <h2 className="text-2xl font-bold text-white mb-2">Champions League</h2>
                <p className="text-zinc-400 text-sm">Climb the league table and win the title.</p>
              </button>

              <button onClick={() => setActiveTab('NEWS')} className="group relative overflow-hidden rounded-2xl bg-zinc-900/60 backdrop-blur-md border border-zinc-800 p-8 hover:border-emerald-500 transition-colors">
                <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                <Newspaper className="w-12 h-12 text-emerald-400 mb-4" />
                <h2 className="text-2xl font-bold text-white mb-2">Football News</h2>
                <p className="text-zinc-400 text-sm">Stay updated with the latest headlines.</p>
              </button>

              <button onClick={() => setActiveTab('WORLDCUP')} className="group relative overflow-hidden rounded-2xl bg-zinc-900/60 backdrop-blur-md border border-zinc-800 p-8 hover:border-yellow-500 transition-colors">
                <div className="absolute inset-0 bg-gradient-to-br from-yellow-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                <Globe className="w-12 h-12 text-yellow-400 mb-4" />
                <h2 className="text-2xl font-bold text-white mb-2">World Cup</h2>
                <p className="text-zinc-400 text-sm">Lead your nation to glory.</p>
              </button>

              <button onClick={() => setActiveTab('MATCH')} className="group relative overflow-hidden rounded-2xl bg-zinc-900/60 backdrop-blur-md border border-zinc-800 p-8 hover:border-emerald-500 transition-colors">
                <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                <Play className="w-12 h-12 text-emerald-400 mb-4" />
                <h2 className="text-2xl font-bold text-white mb-2">Play Match</h2>
                <p className="text-zinc-400 text-sm">Control your team in a 5v5 match.</p>
              </button>
              
              <button onClick={() => setActiveTab('ONLINE')} className="group relative overflow-hidden rounded-2xl bg-zinc-900/60 backdrop-blur-md border border-zinc-800 p-8 hover:border-blue-500 transition-colors">
                <div className="absolute inset-0 bg-gradient-to-br from-blue-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                <Globe className="w-12 h-12 text-blue-400 mb-4" />
                <h2 className="text-2xl font-bold text-white mb-2">Online Multiplayer</h2>
                <p className="text-zinc-400 text-sm">Challenge other managers.</p>
              </button>

              <button onClick={() => setActiveTab('SQUAD')} className="group relative overflow-hidden rounded-2xl bg-zinc-900/60 backdrop-blur-md border border-zinc-800 p-8 hover:border-blue-500 transition-colors">
                <div className="absolute inset-0 bg-gradient-to-br from-blue-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                <Users className="w-12 h-12 text-blue-400 mb-4" />
                <h2 className="text-2xl font-bold text-white mb-2">Club Squad</h2>
                <p className="text-zinc-400 text-sm">Manage your starting lineup.</p>
              </button>
              
              <button onClick={() => setActiveTab('STORE')} className="group relative overflow-hidden rounded-2xl bg-zinc-900/60 backdrop-blur-md border border-zinc-800 p-8 hover:border-purple-500 transition-colors">
                <div className="absolute inset-0 bg-gradient-to-br from-purple-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                <ShoppingBag className="w-12 h-12 text-purple-400 mb-4" />
                <h2 className="text-2xl font-bold text-white mb-2">Store</h2>
                <p className="text-zinc-400 text-sm">Open packs to get new players.</p>
              </button>

              <button onClick={() => setActiveTab('MARKET')} className="group relative overflow-hidden rounded-2xl bg-zinc-900/60 backdrop-blur-md border border-zinc-800 p-8 hover:border-blue-500 transition-colors">
                <div className="absolute inset-0 bg-gradient-to-br from-blue-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                <Globe className="w-12 h-12 text-blue-400 mb-4" />
                <h2 className="text-2xl font-bold text-white mb-2">Transfer Market</h2>
                <p className="text-zinc-400 text-sm">Buy and sell players.</p>
              </button>

              <button onClick={() => setActiveTab('UPGRADE')} className="group relative overflow-hidden rounded-2xl bg-zinc-900/60 backdrop-blur-md border border-zinc-800 p-8 hover:border-yellow-500 transition-colors">
                <div className="absolute inset-0 bg-gradient-to-br from-yellow-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                <Zap className="w-12 h-12 text-yellow-400 mb-4" />
                <h2 className="text-2xl font-bold text-white mb-2">Upgrade</h2>
                <p className="text-zinc-400 text-sm">Level up your players' stats.</p>
              </button>

              <button onClick={() => setActiveTab('TRAIN')} className="group relative overflow-hidden rounded-2xl bg-zinc-900/60 backdrop-blur-md border border-zinc-800 p-8 hover:border-emerald-500 transition-colors">
                <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                <Dumbbell className="w-12 h-12 text-emerald-400 mb-4" />
                <h2 className="text-2xl font-bold text-white mb-2">Training Center</h2>
                <p className="text-zinc-400 text-sm">Train individual stats over time.</p>
              </button>

              <button onClick={() => setActiveTab('PRACTICE')} className="group relative overflow-hidden rounded-2xl bg-zinc-900/60 backdrop-blur-md border border-zinc-800 p-8 hover:border-emerald-500 transition-colors">
                <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                <Target className="w-12 h-12 text-emerald-400 mb-4" />
                <h2 className="text-2xl font-bold text-white mb-2">Practice Mode</h2>
                <p className="text-zinc-400 text-sm">Practice dribbling, shooting, and penalties.</p>
              </button>
            </div>
          </div>
        );
    }
  };

  return (
    <div className={`min-h-screen text-white font-sans flex flex-col ${getBackgroundClass()}`}>
      {/* Header */}
      <header className={`h-16 border-b border-zinc-800 bg-zinc-950/80 backdrop-blur-md flex items-center justify-between px-6 shrink-0 z-50 ${activeTab === 'MATCH' ? 'hidden sm:flex' : 'flex'}`}>
        <div className="flex items-center space-x-2 cursor-pointer" onClick={() => setActiveTab('HOME')}>
          <img src={teamLogo} alt="Team Logo" className="w-8 h-8 rounded-full border border-zinc-700" />
          <span className="text-xl font-bold italic tracking-wider hidden sm:block">{teamName}</span>
          {trophies.length > 0 && (
            <div className="flex items-center ml-4 space-x-1" title="Trophies Won">
              {trophies.map((t, i) => (
                <Trophy key={i} className="w-5 h-5 text-yellow-500" />
              ))}
            </div>
          )}
        </div>
        
        <div className="flex items-center space-x-4">
          <button onClick={toggleMute} className="p-2 hover:bg-zinc-800 rounded-full text-zinc-400 hover:text-white transition-colors" title={volume > 0 ? "Mute" : "Unmute"}>
            {volume > 0 ? <Volume2 className="w-5 h-5" /> : <VolumeX className="w-5 h-5" />}
          </button>

          <div className="flex items-center space-x-2 bg-zinc-900/60 px-4 py-1.5 rounded-full border border-zinc-800">
            <span className="text-yellow-500 font-bold">C</span>
            <span className="font-mono font-medium">{coins.toLocaleString()}</span>
          </div>
          
          <button onClick={handleLogout} className="p-2 hover:bg-zinc-800 rounded-full text-zinc-400 hover:text-white transition-colors" title="Logout">
            <LogOut className="w-5 h-5" />
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 overflow-hidden relative">
        {renderTab()}
      </main>
    </div>
  );
}
