import React, { useEffect, useMemo, useState } from 'react';
import { Home, ShoppingBag, Users, Play, Trophy, Zap, LogOut, Globe, Dumbbell, Volume2, VolumeX, Target, Newspaper, Shield, Gamepad2, Sparkles, ChevronRight, Swords } from 'lucide-react';
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

const quickModes: { key: Tab; title: string; description: string; icon: React.ElementType; accent: string }[] = [
  { key: 'MATCH', title: 'Exhibition Match', description: 'Đá ngay một trận giao hữu với nhịp độ nhanh, dễ vào trận.', icon: Swords, accent: 'from-emerald-500/20 to-cyan-500/10' },
  { key: 'LEAGUE', title: 'Career League', description: 'Leo bảng xếp hạng, kiếm tiền thưởng và mở rộng đội hình.', icon: Trophy, accent: 'from-yellow-500/20 to-amber-500/10' },
  { key: 'ONLINE', title: 'Online PvP', description: 'Đối đầu người chơi khác với điều khiển thời gian thực.', icon: Globe, accent: 'from-sky-500/20 to-indigo-500/10' },
  { key: 'PRACTICE', title: 'Training Arena', description: 'Luyện rê bóng, chuyền và dứt điểm bằng bàn phím hoặc mobile.', icon: Target, accent: 'from-fuchsia-500/20 to-rose-500/10' },
];

export default function App() {
  const { playAudio, stopAudio, stopAll, setVolume, volume } = useAudio();
  const [username, setUsername] = useState<string | null>(null);
  const [teamName, setTeamName] = useState<string>('My Team');
  const [teamLogo, setTeamLogo] = useState<string>('https://ui-avatars.com/api/?name=MT&background=0f172a&color=22c55e');
  const [activeTab, setActiveTab] = useState<Tab>('HOME');
  const [coins, setCoins] = useState(2500);
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

  const teamOvr = useMemo(() => {
    const valid = squad.lineup.filter(Boolean) as Player[];
    return valid.length ? Math.round(valid.reduce((sum, p) => sum + p.ovr, 0) / valid.length) : 0;
  }, [squad]);

  const attackScore = useMemo(() => {
    const valid = squad.lineup.filter(Boolean) as Player[];
    return valid.length ? Math.round(valid.reduce((sum, p) => sum + (p.stats.sho + p.stats.pac + p.stats.dri) / 3, 0) / valid.length) : 0;
  }, [squad]);

  const balanceScore = useMemo(() => {
    const valid = squad.lineup.filter(Boolean) as Player[];
    return valid.length ? Math.round(valid.reduce((sum, p) => sum + (p.stats.pas + p.stats.def + p.stats.phy) / 3, 0) / valid.length) : 0;
  }, [squad]);

  const toggleMute = () => {
    if (volume > 0) {
      setVolume(0);
    } else {
      setVolume(0.3);
      if (!['MATCH', 'WORLDCUP'].includes(activeTab)) playAudio('THEME', true);
    }
  };

  useEffect(() => {
    if (!username) {
      stopAll();
      return;
    }
    if (activeTab === 'MATCH') {
      stopAudio('THEME');
      stopAudio('WORLDCUP_THEME');
    } else if (activeTab === 'WORLDCUP') {
      stopAudio('THEME');
    } else {
      stopAudio('WORLDCUP_THEME');
      stopAudio('MATCH_AMBIENT');
      playAudio('THEME', true);
    }
  }, [activeTab, username]);

  useEffect(() => {
    const savedUser = localStorage.getItem('fcweb_user');
    if (savedUser) {
      setUsername(savedUser);
      const data = localStorage.getItem(`fcweb_data_${savedUser}`);
      if (data) {
        const parsed = JSON.parse(data);
        setCoins(parsed.coins ?? 2500);
        setInventory(parsed.inventory ?? INITIAL_PLAYERS.slice(0, 15));
        setSquad(parsed.squad?.formation ? parsed.squad : { formation: '4-3-3', lineup: getInitialSquad(INITIAL_PLAYERS) });
        if (parsed.teamName) setTeamName(parsed.teamName);
        if (parsed.teamLogo) setTeamLogo(parsed.teamLogo);
        if (parsed.trophies) setTrophies(parsed.trophies);
        setTutorialCompleted(Boolean(parsed.tutorialCompleted));
      }
    }
  }, []);

  useEffect(() => {
    if (!username) return;
    localStorage.setItem(`fcweb_data_${username}`, JSON.stringify({
      coins, inventory, squad, teamName, teamLogo, tutorialCompleted, trophies
    }));
  }, [coins, inventory, squad, teamName, teamLogo, username, tutorialCompleted, trophies]);

  const handleLogin = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const name = String(formData.get('username') || '').trim();
    const tName = String(formData.get('teamName') || 'My Team').trim();
    if (!name) return;

    setUsername(name);
    setTeamName(tName || 'My Team');
    setTeamLogo(`https://ui-avatars.com/api/?name=${encodeURIComponent(tName || 'My Team')}&background=0f172a&color=22c55e&bold=true`);
    localStorage.setItem('fcweb_user', name);

    const data = localStorage.getItem(`fcweb_data_${name}`);
    if (data) {
      const parsed = JSON.parse(data);
      setCoins(parsed.coins ?? 2500);
      setInventory(parsed.inventory ?? INITIAL_PLAYERS.slice(0, 15));
      setSquad(parsed.squad?.formation ? parsed.squad : { formation: '4-3-3', lineup: getInitialSquad(INITIAL_PLAYERS) });
      if (parsed.teamName) setTeamName(parsed.teamName);
      if (parsed.teamLogo) setTeamLogo(parsed.teamLogo);
      if (parsed.trophies) setTrophies(parsed.trophies);
      setTutorialCompleted(Boolean(parsed.tutorialCompleted));
      return;
    }

    const starterPlayers = generateStarterSquad();
    setCoins(2500);
    setTrophies([]);
    setInventory(starterPlayers);
    setSquad({ formation: '4-3-3', lineup: getInitialSquad(starterPlayers) });
    setTutorialCompleted(false);
    setActiveTab('TUTORIAL');
  };

  const handleLogout = () => {
    setUsername(null);
    localStorage.removeItem('fcweb_user');
  };

  const getBackgroundClass = () => {
    if (!username) return 'bg-auth-stadium';
    switch (activeTab) {
      case 'WORLDCUP': return 'bg-game-worldcup';
      case 'TRAIN': return 'bg-game-training';
      default: return 'bg-game-default';
    }
  };

  const handleMatchFinish = (reward: number, xpGains: Record<string, number>, scoreA?: number, scoreB?: number, stats?: any) => {
    setCoins(c => c + reward);
    setInventory(prev => prev.map(p => xpGains[p.id] ? { ...p, xp: (p.xp || 0) + xpGains[p.id] } : p));
    setSquad(prev => ({ ...prev, lineup: prev.lineup.map(p => p && xpGains[p.id] ? { ...p, xp: (p.xp || 0) + xpGains[p.id] } : p) }));

    const payload = stats || {
      score: `${scoreA ?? 0}-${scoreB ?? 0}`,
      opponent: leagueOpponent || 'Opponent',
      isWinner: (scoreA ?? 0) > (scoreB ?? 0),
      competition: leagueOpponent ? 'League Match' : 'Friendly'
    };
    setLastMatchResult(payload);

    if (leagueOpponent && leagueDifficulty === 'HARD') {
      setActiveTab('INTERVIEW');
    } else {
      setLeagueOpponent(null);
      setActiveTab('HOME');
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
    localStorage.setItem('fcweb_news', JSON.stringify([newItem, ...news].slice(0, 20)));
  };

  const renderTab = () => {
    switch (activeTab) {
      case 'TUTORIAL':
        return <TutorialScreen onComplete={() => { setTutorialCompleted(true); setCoins(c => c + 500); setActiveTab('HOME'); }} />;
      case 'STORE':
        return <StoreScreen coins={coins} setCoins={setCoins} inventory={inventory} setInventory={setInventory} />;
      case 'SQUAD':
        return <SquadScreen squad={squad} setSquad={setSquad} inventory={inventory} setInventory={setInventory} coins={coins} setCoins={setCoins} />;
      case 'UPGRADE':
        return <UpgradeScreen inventory={inventory} setInventory={setInventory} coins={coins} setCoins={setCoins} />;
      case 'TRAIN':
        return <TrainScreen inventory={inventory} setInventory={setInventory} coins={coins} setCoins={setCoins} />;
      case 'MARKET':
        return <TransferMarketScreen coins={coins} onBuy={(player, cost) => { setCoins(c => c - cost); setInventory(inv => [...inv, player]); }} />;
      case 'MATCH':
        return <MatchScreen squad={squad} onFinish={handleMatchFinish} opponentName={leagueOpponent || undefined} forcedDifficulty={leagueOpponent ? leagueDifficulty : undefined} userTeamName={teamName} />;
      case 'ONLINE':
        return <OnlineScreen username={username!} squad={squad} onMatchComplete={handleMatchFinish} />;
      case 'WORLDCUP':
        return <WorldCupScreen onBack={() => setActiveTab('HOME')} onWin={() => { addNews('World Cup Glory!', `${teamName} has won the World Cup after a thrilling final!`, 'ACHIEVEMENT'); setTrophies(prev => [...prev, 'World Cup']); }} onMatchComplete={(c, xp, scoreA, scoreB, round) => {
          setCoins(prev => prev + c);
          setInventory(prev => prev.map(p => xp[p.id] ? { ...p, xp: (p.xp || 0) + xp[p.id] } : p));
          setSquad(prev => ({ ...prev, lineup: prev.lineup.map(p => p && xp[p.id] ? { ...p, xp: (p.xp || 0) + xp[p.id] } : p) }));
          if (round && ['R16', 'QF', 'SF', 'FINAL'].includes(round)) {
            setLastMatchResult({ score: `${scoreA}-${scoreB}`, opponent: 'World Cup Opponent', isWinner: (scoreA || 0) > (scoreB || 0), competition: `World Cup ${round}`, returnTab: 'WORLDCUP' });
            setActiveTab('INTERVIEW');
          }
        }} />;
      case 'PRACTICE':
        return <PracticeScreen squad={squad} onBack={() => setActiveTab('HOME')} />;
      case 'LEAGUE':
        return <LeagueScreen teamName={teamName} onBack={() => setActiveTab('HOME')} onStartMatch={(opponent, diff) => { setLeagueOpponent(opponent); setLeagueDifficulty(diff); setActiveTab('MATCH'); }} />;
      case 'NEWS':
        return <NewsScreen onBack={() => setActiveTab('HOME')} />;
      case 'INTERVIEW':
        return <InterviewScreen matchResult={{ score: lastMatchResult?.score || '0-0', opponent: lastMatchResult?.opponent || 'Opponent', competition: lastMatchResult?.competition || 'Post Match', isWinner: Boolean(lastMatchResult?.isWinner), playerPerformance: 'Đội bóng duy trì nhịp độ tốt và tạo ra nhiều khoảnh khắc đáng chú ý.' }} onFinish={(summary) => {
          if (summary) addNews('Manager Speaks Out', summary, 'INTERVIEW');
          setLeagueOpponent(null);
          setActiveTab(lastMatchResult?.returnTab || 'HOME');
        }} />;
      case 'HOME':
      default:
        return (
          <div className="p-4 md:p-6 xl:p-8 overflow-y-auto">
            <div className="max-w-7xl mx-auto space-y-6 md:space-y-8">
              <section className="hero-shell p-6 md:p-8 xl:p-10">
                <div className="grid xl:grid-cols-[1.2fr_0.8fr] gap-6 items-stretch">
                  <div className="space-y-5">
                    <div className="ui-kicker">Ultimate football club</div>
                    <h1 className="text-4xl md:text-6xl font-black leading-none tracking-tight max-w-3xl">
                      Xây dựng đội bóng theo phong cách <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-300 to-cyan-300">console football</span> với giao diện hiện đại hơn.
                    </h1>
                    <p className="text-zinc-300 max-w-2xl text-sm md:text-base leading-7">
                      Mình đã đẩy phần giao diện theo hướng đậm chất game bóng đá: dashboard dạng thẻ, chỉ số đội hình rõ hơn, cảm giác menu hiện đại hơn và sẵn sàng cho cả PC lẫn mobile.
                    </p>
                    <div className="flex flex-wrap gap-3">
                      <button onClick={() => setActiveTab('MATCH')} className="primary-cta">
                        <Play className="w-5 h-5" />
                        Vào trận ngay
                      </button>
                      <button onClick={() => setActiveTab('SQUAD')} className="secondary-cta">
                        <Users className="w-5 h-5" />
                        Chỉnh đội hình
                      </button>
                    </div>
                    <div className="grid sm:grid-cols-3 gap-3 pt-2">
                      <div className="stat-chip"><span>Team OVR</span><strong>{teamOvr}</strong></div>
                      <div className="stat-chip"><span>Attack</span><strong>{attackScore}</strong></div>
                      <div className="stat-chip"><span>Balance</span><strong>{balanceScore}</strong></div>
                    </div>
                  </div>
                  <div className="glass-panel p-5 md:p-6 flex flex-col justify-between">
                    <div>
                      <div className="ui-kicker mb-3">Club snapshot</div>
                      <div className="flex items-center gap-4">
                        <img src={teamLogo} alt={teamName} className="w-16 h-16 rounded-2xl border border-white/15 object-cover" />
                        <div>
                          <div className="text-2xl font-black">{teamName}</div>
                          <div className="text-zinc-400 text-sm">Manager: {username}</div>
                        </div>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3 mt-5">
                      <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                        <div className="text-zinc-400 text-xs uppercase tracking-[0.2em]">Formation</div>
                        <div className="text-2xl font-black mt-2">{squad.formation}</div>
                      </div>
                      <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                        <div className="text-zinc-400 text-xs uppercase tracking-[0.2em]">Trophies</div>
                        <div className="text-2xl font-black mt-2">{trophies.length}</div>
                      </div>
                    </div>
                    <div className="mt-5 rounded-2xl border border-emerald-400/15 bg-emerald-500/10 p-4 text-sm text-emerald-100 leading-6">
                      PC: dùng <strong>WASD</strong> để di chuyển, <strong>S</strong> để sút, <strong>C</strong> để chuyền, <strong>Shift</strong> để tăng tốc. Mobile có joystick và phím nổi ngay trên sân.
                    </div>
                  </div>
                </div>
              </section>

              <section className="grid xl:grid-cols-[1.15fr_0.85fr] gap-6">
                <div className="space-y-6">
                  <div className="grid md:grid-cols-2 gap-4">
                    {quickModes.map((mode) => {
                      const Icon = mode.icon;
                      return (
                        <button key={mode.key} onClick={() => setActiveTab(mode.key)} className={`mode-card bg-gradient-to-br ${mode.accent}`}>
                          <div className="flex items-start justify-between gap-4">
                            <div>
                              <div className="ui-kicker mb-2">Game mode</div>
                              <h3 className="text-2xl font-black">{mode.title}</h3>
                              <p className="text-zinc-300 text-sm mt-2 leading-6">{mode.description}</p>
                            </div>
                            <div className="w-12 h-12 rounded-2xl border border-white/15 bg-white/10 flex items-center justify-center shrink-0">
                              <Icon className="w-6 h-6" />
                            </div>
                          </div>
                          <div className="inline-flex items-center gap-2 text-emerald-300 text-sm font-semibold mt-6">Mở chế độ <ChevronRight className="w-4 h-4" /></div>
                        </button>
                      );
                    })}
                  </div>

                  <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4">
                    {[
                      ['SQUAD', 'Đội hình', 'Sắp xếp XI chính, thay người, cân đội hình.', Users],
                      ['STORE', 'Store', 'Mở pack và tìm cầu thủ chất lượng cao.', ShoppingBag],
                      ['MARKET', 'Market', 'Săn cầu thủ phù hợp chiến thuật đội bóng.', Globe],
                      ['UPGRADE', 'Upgrade', 'Nâng cấp thẻ, tăng độ bá của đội hình.', Zap],
                      ['TRAIN', 'Training', 'Rèn stat theo mục tiêu rõ ràng hơn.', Dumbbell],
                      ['NEWS', 'News', 'Theo dõi tin tức và thành tích gần đây.', Newspaper],
                    ].map(([tab, title, desc, Icon]: any) => (
                      <button key={tab} onClick={() => setActiveTab(tab)} className="glass-panel p-5 text-left hover:-translate-y-0.5 transition-transform">
                        <Icon className="w-7 h-7 text-emerald-300 mb-4" />
                        <h3 className="text-xl font-black">{title}</h3>
                        <p className="text-sm text-zinc-400 mt-2 leading-6">{desc}</p>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-6">
                  <DailyChest onClaim={(rewardCoins, rewardPlayer) => { setCoins(c => c + rewardCoins); setInventory(inv => [...inv, rewardPlayer]); }} />
                  <div className="glass-panel p-6">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="w-10 h-10 rounded-2xl bg-cyan-500/10 border border-cyan-400/20 flex items-center justify-center"><Gamepad2 className="w-5 h-5 text-cyan-300" /></div>
                      <div>
                        <div className="ui-kicker">Gameplay direction</div>
                        <h3 className="text-xl font-black">Tối ưu PC & Mobile</h3>
                      </div>
                    </div>
                    <div className="space-y-3 text-sm text-zinc-300 leading-7">
                      <p>Điều khiển bàn phím đã giữ kiểu arcade rõ ràng hơn, trong khi mobile dùng joystick ảo và nút hành động lớn để thao tác dễ hơn.</p>
                      <p>Toàn bộ menu, header, dashboard và thẻ cầu thủ đã được làm lại theo hướng đậm chất game bóng đá online hiện đại.</p>
                    </div>
                  </div>
                  <div className="glass-panel p-6">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="w-10 h-10 rounded-2xl bg-yellow-500/10 border border-yellow-400/20 flex items-center justify-center"><Sparkles className="w-5 h-5 text-yellow-300" /></div>
                      <div>
                        <div className="ui-kicker">Visual refresh</div>
                        <h3 className="text-xl font-black">Đồ họa giao diện mới</h3>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="stat-chip"><span>Menu</span><strong>Glass UI</strong></div>
                      <div className="stat-chip"><span>Cards</span><strong>Player Photos</strong></div>
                      <div className="stat-chip"><span>Pitch</span><strong>Mobile HUD</strong></div>
                      <div className="stat-chip"><span>UX</span><strong>Responsive</strong></div>
                    </div>
                  </div>
                </div>
              </section>
            </div>
          </div>
        );
    }
  };

  const isMatchTab = ['MATCH', 'WORLDCUP', 'ONLINE', 'PRACTICE', 'TRAIN'].includes(activeTab);

  if (!username) {
    return (
      <div className={`min-h-screen text-white flex items-center justify-center p-4 ${getBackgroundClass()}`}>
        <div className="w-full max-w-5xl grid lg:grid-cols-[1.05fr_0.95fr] rounded-[28px] overflow-hidden border border-white/10 shadow-[0_40px_100px_rgba(0,0,0,0.45)]">
          <div className="p-8 md:p-12 bg-[linear-gradient(180deg,rgba(5,10,15,0.55),rgba(5,10,15,0.88))] backdrop-blur-md">
            <div className="ui-kicker mb-4">Next-gen football experience</div>
            <h1 className="text-4xl md:text-6xl font-black leading-none tracking-tight max-w-xl">Khởi đầu sự nghiệp HLV với giao diện bóng đá hiện đại hơn.</h1>
            <p className="text-zinc-300 mt-5 max-w-xl leading-7">
              Giao diện đăng nhập được làm lại theo phong cách sân vận động ban đêm, nhấn mạnh cảm giác premium và gần hơn với các game bóng đá online hiện đại.
            </p>
            <div className="grid sm:grid-cols-3 gap-3 mt-8">
              <div className="stat-chip"><span>UI</span><strong>Stadium Intro</strong></div>
              <div className="stat-chip"><span>Controls</span><strong>PC + Mobile</strong></div>
              <div className="stat-chip"><span>Cards</span><strong>Photo Ready</strong></div>
            </div>
          </div>
          <div className="p-8 md:p-10 bg-zinc-950/90 backdrop-blur-xl">
            <div className="flex items-center gap-3 mb-8">
              <div className="w-14 h-14 rounded-2xl bg-emerald-500/15 border border-emerald-400/20 flex items-center justify-center">
                <Shield className="w-8 h-8 text-emerald-300" />
              </div>
              <div>
                <div className="ui-kicker">Club access</div>
                <div className="text-3xl font-black">Ultimate Club</div>
              </div>
            </div>
            <form onSubmit={handleLogin} className="space-y-4">
              <input type="text" name="username" placeholder="Tên HLV" required className="auth-input" />
              <input type="text" name="teamName" placeholder="Tên CLB" required className="auth-input" />
              <button type="submit" className="primary-cta w-full justify-center py-4 text-base">
                <Play className="w-5 h-5" />
                Bắt đầu sự nghiệp
              </button>
            </form>
            <div className="mt-6 text-sm text-zinc-400 leading-6">
              Mục tiêu lần chỉnh này là tạo phiên bản mang cảm giác gần với game bóng đá online nổi tiếng ở phần bố cục, nhịp điều hướng và độ bóng bẩy của UI, nhưng vẫn giữ tài nguyên an toàn để bạn tiếp tục phát triển.
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen text-white font-sans flex flex-col ${getBackgroundClass()}`}>
      <header className={`h-16 md:h-20 border-b border-white/10 bg-zinc-950/70 backdrop-blur-xl flex items-center justify-between px-4 md:px-6 shrink-0 z-50 ${isMatchTab ? 'hidden md:flex' : 'flex'}`}>
        <div className="flex items-center gap-3 cursor-pointer" onClick={() => setActiveTab('HOME')}>
          <img src={teamLogo} alt="Team Logo" className="w-10 h-10 rounded-2xl border border-white/10 object-cover" />
          <div>
            <div className="text-lg md:text-xl font-black tracking-tight">{teamName}</div>
            <div className="text-xs text-zinc-400">OVR {teamOvr} · {squad.formation}</div>
          </div>
          {trophies.length > 0 && <div className="hidden md:flex items-center ml-3 gap-1">{trophies.map((_, i) => <Trophy key={i} className="w-4 h-4 text-yellow-400" />)}</div>}
        </div>
        <div className="flex items-center gap-2 md:gap-4">
          <div className="hidden sm:flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm font-semibold">
            <span className="text-yellow-300">🪙</span>{coins.toLocaleString()}
          </div>
          <button onClick={toggleMute} className="icon-btn" title={volume > 0 ? 'Mute' : 'Unmute'}>{volume > 0 ? <Volume2 className="w-5 h-5" /> : <VolumeX className="w-5 h-5" />}</button>
          <button onClick={() => setActiveTab('HOME')} className="icon-btn"><Home className="w-5 h-5" /></button>
          <button onClick={handleLogout} className="icon-btn"><LogOut className="w-5 h-5" /></button>
        </div>
      </header>
      <main className="flex-1 min-h-0">{renderTab()}</main>
    </div>
  );
}
