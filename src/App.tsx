import React, { useState, useEffect, useRef } from 'react';
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
import { useAudio } from './contexts/AudioContext';

type Tab = 'HOME' | 'SQUAD' | 'STORE' | 'MATCH' | 'UPGRADE' | 'ONLINE' | 'TRAIN' | 'MARKET' | 'TUTORIAL' | 'WORLDCUP' | 'PRACTICE' | 'LEAGUE' | 'NEWS' | 'INTERVIEW';

// ── FC Online Icon SVG components
const Icon = ({ d, size = 22 }: { d: string; size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d={d} />
  </svg>
);

// ── Nav Item
const NavBtn = ({ label, icon, active, onClick, badge }: { label: string; icon: React.ReactNode; active?: boolean; onClick: () => void; badge?: number }) => (
  <button onClick={onClick}
    className={`relative flex flex-col items-center gap-0.5 px-3 py-2 rounded-xl transition-all duration-150 font-bold text-[10px] tracking-widest uppercase cursor-pointer select-none
      ${active
        ? 'text-[#0b8fff] bg-[#0b5fce]/20'
        : 'text-white/40 hover:text-white/70 hover:bg-white/5'
      }`}>
    {icon}
    <span style={{ fontFamily: "'Rajdhani', sans-serif", fontSize: 9, fontWeight: 700 }}>{label}</span>
    {badge !== undefined && badge > 0 && (
      <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-[#ef4444] rounded-full text-[9px] font-black flex items-center justify-center text-white">{badge}</span>
    )}
  </button>
);

// ── Home card
const HomeCard = ({ icon, title, desc, color, onClick }: { icon: string; title: string; desc: string; color: string; onClick: () => void }) => (
  <button onClick={onClick} className="fc-home-card p-6 flex flex-col gap-3 text-left w-full group transition-all">
    <div className="text-3xl">{icon}</div>
    <div>
      <div className="font-black text-white text-lg leading-tight" style={{ fontFamily: "'Rajdhani', sans-serif" }}>{title}</div>
      <div className="text-xs text-white/50 mt-1 font-medium leading-tight">{desc}</div>
    </div>
    <div className="mt-auto flex items-center gap-1 text-xs font-black tracking-widest uppercase opacity-0 group-hover:opacity-100 transition-opacity" style={{ color }}>
      <span>CHƠI NGAY</span>
      <span>→</span>
    </div>
  </button>
);

// ── Login Screen
function LoginScreen({ onLogin }: { onLogin: (username: string, teamName: string) => void }) {
  const [uname, setUname] = useState('');
  const [tname, setTname] = useState('');
  const [loading, setLoading] = useState(false);
  const [focused, setFocused] = useState<'u' | 't' | null>(null);
  const particlesRef = useRef<HTMLDivElement>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!uname.trim()) return;
    setLoading(true);
    setTimeout(() => onLogin(uname.trim(), tname.trim() || `${uname.trim()}'s FC`), 800);
  };

  return (
    <div className="min-h-screen relative flex flex-col overflow-hidden" style={{ background: '#05080f' }}>
      {/* Animated pitch background */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute inset-0" style={{
          backgroundImage: `url('https://images.unsplash.com/photo-1574629810360-7efbbe195018?q=80&w=2070&auto=format&fit=crop')`,
          backgroundSize: 'cover', backgroundPosition: 'center', filter: 'brightness(0.25) saturate(0.6)',
        }} />
        {/* Green field glow */}
        <div className="absolute inset-0" style={{ background: 'radial-gradient(ellipse 80% 50% at 50% 100%, rgba(0,100,30,0.3), transparent)' }} />
        {/* Blue top light */}
        <div className="absolute inset-0" style={{ background: 'radial-gradient(ellipse 100% 60% at 50% -20%, rgba(11,95,206,0.35), transparent)' }} />
        {/* Grid lines decoration */}
        <div className="absolute inset-0 opacity-5" style={{
          backgroundImage: 'linear-gradient(rgba(255,255,255,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.5) 1px, transparent 1px)',
          backgroundSize: '60px 60px',
        }} />
      </div>

      {/* Top bar */}
      <div className="relative z-10 flex items-center justify-between px-8 py-5">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#0b5fce] flex items-center justify-center text-white font-black text-lg" style={{ fontFamily: "'Bebas Neue'" }}>FC</div>
          <div>
            <div className="font-black text-white text-base leading-none" style={{ fontFamily: "'Bebas Neue'", letterSpacing: 3 }}>FC ONLINE</div>
            <div className="text-[9px] text-[#0b8fff] font-bold tracking-[0.3em]">FOOTBALL MANAGER</div>
          </div>
        </div>
        <div className="text-[10px] text-white/30 font-bold tracking-widest uppercase">Season 2024/25</div>
      </div>

      {/* Main content */}
      <div className="relative z-10 flex-1 flex flex-col items-center justify-center px-4 py-8">
        <div className="w-full max-w-sm">
          {/* Logo area */}
          <div className="text-center mb-10">
            <div className="text-[10px] font-black tracking-[0.5em] text-[#0b8fff] uppercase mb-4">WELCOME TO</div>
            <h1 className="text-8xl font-black text-white leading-none mb-1" style={{ fontFamily: "'Bebas Neue'", letterSpacing: 6 }}>FC</h1>
            <h1 className="text-5xl font-black text-white leading-none mb-4" style={{ fontFamily: "'Bebas Neue'", letterSpacing: 4 }}>ONLINE</h1>
            <div className="w-16 h-0.5 mx-auto" style={{ background: 'linear-gradient(90deg, transparent, #0b8fff, transparent)' }} />
          </div>

          {/* Login form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-[10px] font-black tracking-[0.3em] text-[#a0aec0] uppercase mb-2">Tên HLV</label>
              <input
                className="fc-input"
                type="text"
                placeholder="Nhập tên của bạn..."
                value={uname}
                onChange={e => setUname(e.target.value)}
                maxLength={24}
                required
              />
            </div>
            <div>
              <label className="block text-[10px] font-black tracking-[0.3em] text-[#a0aec0] uppercase mb-2">Tên CLB</label>
              <input
                className="fc-input"
                type="text"
                placeholder="Tên câu lạc bộ..."
                value={tname}
                onChange={e => setTname(e.target.value)}
                maxLength={30}
              />
            </div>
            <button
              type="submit"
              disabled={!uname.trim() || loading}
              className="btn-fc-primary w-full py-4 rounded-xl text-xl font-black disabled:opacity-50 disabled:cursor-not-allowed mt-2"
              style={{ fontFamily: "'Bebas Neue'", letterSpacing: 4 }}
            >
              {loading ? (
                <span className="flex items-center justify-center gap-3">
                  <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ĐANG VÀO...
                </span>
              ) : 'BẮT ĐẦU SỰ NGHIỆP'}
            </button>
          </form>

          {/* Features */}
          <div className="mt-8 grid grid-cols-3 gap-3">
            {[['⚽', 'Trận Đấu', 'PvE & PvP'], ['🏆', 'Giải Đấu', 'League & WC'], ['🃏', 'Cầu Thủ', '100+ Cards']].map(([icon, title, sub]) => (
              <div key={title} className="text-center p-3 rounded-xl bg-white/5 border border-white/8">
                <div className="text-2xl mb-1">{icon}</div>
                <div className="text-[10px] font-black text-white">{title}</div>
                <div className="text-[9px] text-white/40 font-medium">{sub}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Bottom */}
      <div className="relative z-10 text-center py-4 text-[10px] text-white/20 font-medium">
        FC Online Web Edition · All rights reserved
      </div>
    </div>
  );
}

// ── Main App
export default function App() {
  const { playAudio, stopAudio, stopAll, setVolume, volume } = useAudio();
  const [username, setUsername] = useState<string | null>(null);
  const [teamName, setTeamName] = useState('My FC');
  const [teamLogo, setTeamLogo] = useState('');
  const [activeTab, setActiveTab] = useState<Tab>('HOME');
  const [coins, setCoins] = useState(2500);
  const [gems, setGems] = useState(50);
  const [inventory, setInventory] = useState<Player[]>(INITIAL_PLAYERS.slice(0, 15));
  const [squad, setSquad] = useState<Squad>({ formation: '4-3-3', lineup: getInitialSquad(INITIAL_PLAYERS) });
  const [trophies, setTrophies] = useState<string[]>([]);
  const [leagueOpponent, setLeagueOpponent] = useState<string | null>(null);
  const [leagueDifficulty, setLeagueDifficulty] = useState<Difficulty>('MEDIUM');
  const [lastMatchResult, setLastMatchResult] = useState<any>(null);
  const [muted, setMuted] = useState(false);
  const [showCoinsAnim, setShowCoinsAnim] = useState(false);

  // Load from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('fcweb_user');
    if (saved) {
      setUsername(saved);
      const data = localStorage.getItem(`fcweb_data_${saved}`);
      if (data) {
        try {
          const p = JSON.parse(data);
          if (p.coins !== undefined) setCoins(p.coins);
          if (p.gems !== undefined) setGems(p.gems);
          if (p.inventory) setInventory(p.inventory);
          if (p.squad?.formation) setSquad(p.squad);
          if (p.teamName) setTeamName(p.teamName);
          if (p.teamLogo) setTeamLogo(p.teamLogo);
          if (p.trophies) setTrophies(p.trophies);
        } catch {}
      }
    }
  }, []);

  // Save
  useEffect(() => {
    if (username) {
      localStorage.setItem(`fcweb_data_${username}`, JSON.stringify({ coins, gems, inventory, squad, teamName, teamLogo, trophies }));
    }
  }, [coins, gems, inventory, squad, teamName, teamLogo, username, trophies]);

  // Audio
  useEffect(() => {
    if (!username) { stopAll(); return; }
    if (activeTab === 'MATCH' || activeTab === 'WORLDCUP' || activeTab === 'ONLINE' || activeTab === 'PRACTICE') {
      stopAudio('THEME');
    } else {
      stopAudio('MATCH_AMBIENT');
      if (!muted) playAudio('THEME', true);
    }
  }, [activeTab, username, muted]);

  const handleLogin = (uname: string, tName: string) => {
    setUsername(uname);
    setTeamName(tName);
    setTeamLogo(`https://ui-avatars.com/api/?name=${encodeURIComponent(tName)}&background=1565c0&color=fff&size=64&bold=true`);
    localStorage.setItem('fcweb_user', uname);
    const data = localStorage.getItem(`fcweb_data_${uname}`);
    if (data) {
      try {
        const p = JSON.parse(data);
        if (p.coins !== undefined) setCoins(p.coins);
        if (p.gems !== undefined) setGems(p.gems);
        if (p.inventory) setInventory(p.inventory);
        if (p.squad?.formation) setSquad(p.squad);
        if (p.teamName) setTeamName(p.teamName);
        if (p.teamLogo) setTeamLogo(p.teamLogo);
        if (p.trophies) setTrophies(p.trophies);
      } catch {}
    } else {
      setCoins(2500); setGems(50); setTrophies([]);
      const starter = generateStarterSquad();
      setInventory(starter);
      setSquad({ formation: '4-3-3', lineup: getInitialSquad(starter) });
      setTimeout(() => setActiveTab('TUTORIAL'), 300);
    }
  };

  const handleLogout = () => {
    setUsername(null);
    stopAll();
    localStorage.removeItem('fcweb_user');
  };

  const handleMatchFinish = (reward: number, xpGains: Record<string, number>, scoreA?: number, scoreB?: number, stats?: any) => {
    setCoins(c => c + reward);
    if (reward > 200) { setShowCoinsAnim(true); setTimeout(() => setShowCoinsAnim(false), 2000); }
    setInventory(prev => prev.map(p => xpGains[p.id] ? { ...p, xp: (p.xp || 0) + xpGains[p.id] } : p));
    setSquad(prev => ({ ...prev, lineup: prev.lineup.map(p => p && xpGains[p.id] ? { ...p, xp: (p.xp || 0) + xpGains[p.id] } : p) }));
    if (stats) setLastMatchResult(stats);
    setLeagueOpponent(null);
    setActiveTab('HOME');
  };

  if (!username) return <LoginScreen onLogin={handleLogin} />;

  const isMatchActive = ['MATCH', 'WORLDCUP', 'ONLINE', 'PRACTICE', 'TRAIN'].includes(activeTab);

  const renderContent = () => {
    switch (activeTab) {
      case 'TUTORIAL': return <TutorialScreen onComplete={() => { setCoins(c => c + 800); setActiveTab('HOME'); }} />;
      case 'STORE': return <StoreScreen coins={coins} setCoins={setCoins} inventory={inventory} setInventory={setInventory} />;
      case 'SQUAD': return <SquadScreen squad={squad} setSquad={setSquad} inventory={inventory} setInventory={setInventory} coins={coins} setCoins={setCoins} />;
      case 'UPGRADE': return <UpgradeScreen inventory={inventory} setInventory={setInventory} coins={coins} setCoins={setCoins} />;
      case 'TRAIN': return <TrainScreen inventory={inventory} setInventory={setInventory} coins={coins} setCoins={setCoins} />;
      case 'MARKET': return <TransferMarketScreen coins={coins} onBuy={(player, cost) => { setCoins(c => c - cost); setInventory(inv => [...inv, player]); }} />;
      case 'MATCH': return (
        <MatchScreen squad={squad} onFinish={handleMatchFinish}
          opponentName={leagueOpponent || undefined}
          userTeamName={teamName}
          forcedDifficulty={leagueOpponent ? leagueDifficulty : undefined} />
      );
      case 'ONLINE': return <OnlineScreen username={username} squad={squad} onMatchComplete={handleMatchFinish} />;
      case 'WORLDCUP': return (
        <WorldCupScreen
          onBack={() => setActiveTab('HOME')}
          onWin={() => { setTrophies(prev => [...prev, 'World Cup']); }}
          onMatchComplete={(coins, xp, scoreA, scoreB) => {
            setCoins(c => c + coins);
            setInventory(prev => prev.map(p => xp[p.id] ? { ...p, xp: (p.xp || 0) + xp[p.id] } : p));
            setSquad(prev => ({ ...prev, lineup: prev.lineup.map(p => p && xp[p.id] ? { ...p, xp: (p.xp || 0) + xp[p.id] } : p) }));
          }}
        />
      );
      case 'PRACTICE': return <PracticeScreen squad={squad} onBack={() => setActiveTab('HOME')} />;
      case 'LEAGUE': return (
        <LeagueScreen teamName={teamName} onBack={() => setActiveTab('HOME')}
          onStartMatch={(opponent, diff) => { setLeagueOpponent(opponent); setLeagueDifficulty(diff); setActiveTab('MATCH'); }} />
      );
      case 'NEWS': return <NewsScreen onBack={() => setActiveTab('HOME')} />;
      case 'HOME':
      default:
        return <HomeScreen
          username={username} teamName={teamName} teamLogo={teamLogo}
          coins={coins} gems={gems} trophies={trophies}
          onNavigate={setActiveTab}
          onClaim={(rc, rp) => { setCoins(c => c + rc); setInventory(inv => [...inv, rp]); }}
        />;
    }
  };

  return (
    <div className="h-screen flex flex-col overflow-hidden bg-[#05080f] text-white" style={{ fontFamily: "'Rajdhani', sans-serif" }}>
      {/* ── Top Header ── */}
      {!isMatchActive && (
        <header className="fc-header flex items-center justify-between px-4 py-2 shrink-0 z-50">
          {/* Left: Team */}
          <button onClick={() => setActiveTab('HOME')} className="flex items-center gap-3 group">
            <img src={teamLogo || `https://ui-avatars.com/api/?name=${teamName}&background=1565c0&color=fff&size=64&bold=true`}
              alt="" className="w-9 h-9 rounded-xl border border-white/10" />
            <div className="hidden sm:block">
              <div className="font-black text-sm text-white leading-none group-hover:text-[#0b8fff] transition-colors" style={{ fontFamily: "'Bebas Neue'", letterSpacing: 2 }}>{teamName.toUpperCase()}</div>
              <div className="text-[10px] text-white/40 font-bold">{username}</div>
            </div>
            {trophies.length > 0 && (
              <div className="flex gap-0.5">
                {trophies.slice(0, 3).map((_, i) => <span key={i} className="text-base">🏆</span>)}
              </div>
            )}
          </button>

          {/* Center: Main nav tabs */}
          <nav className="hidden md:flex items-center gap-1">
            {[
              { id: 'HOME', label: 'Home', icon: '🏠' },
              { id: 'MATCH', label: 'Trận', icon: '⚽' },
              { id: 'SQUAD', label: 'Đội', icon: '👥' },
              { id: 'STORE', label: 'Cửa Hàng', icon: '🛍️' },
              { id: 'LEAGUE', label: 'Giải Đấu', icon: '🏆' },
            ].map(item => (
              <button key={item.id} onClick={() => setActiveTab(item.id as Tab)}
                className={`px-4 py-1.5 rounded-lg text-sm font-bold transition-all
                  ${activeTab === item.id ? 'bg-[#0b5fce]/30 text-[#0b8fff]' : 'text-white/50 hover:text-white/80 hover:bg-white/5'}`}
                style={{ fontFamily: "'Rajdhani', sans-serif" }}>
                {item.label}
              </button>
            ))}
          </nav>

          {/* Right: Coins + controls */}
          <div className="flex items-center gap-2">
            {/* Gems */}
            <div className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-[#7c3aed]/40 bg-[#7c3aed]/10">
              <span className="text-sm">💎</span>
              <span className="font-black text-sm text-[#a78bfa]" style={{ fontFamily: "'Bebas Neue'" }}>{gems.toLocaleString()}</span>
            </div>
            {/* Coins */}
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-[#e8b84b]/40 bg-[#e8b84b]/10">
              <span className="text-sm">🪙</span>
              <span className="font-black text-sm text-[#e8b84b]" style={{ fontFamily: "'Bebas Neue'" }}>{coins.toLocaleString()}</span>
            </div>
            {/* Mute */}
            <button onClick={() => { setMuted(m => !m); setVolume(muted ? 0.3 : 0); }}
              className="w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center text-sm transition-all">
              {muted ? '🔇' : '🔊'}
            </button>
            {/* Logout */}
            <button onClick={handleLogout}
              className="w-8 h-8 rounded-full bg-white/5 hover:bg-red-500/20 flex items-center justify-center text-sm transition-all">
              🚪
            </button>
          </div>
        </header>
      )}

      {/* ── Content ── */}
      <main className="flex-1 overflow-hidden relative">
        {renderContent()}
      </main>

      {/* ── Mobile Bottom Nav ── */}
      {!isMatchActive && (
        <nav className="md:hidden fc-header flex items-center justify-around px-2 py-1.5 shrink-0 z-50">
          {[
            { id: 'HOME', label: 'Home', e: '🏠' },
            { id: 'MATCH', label: 'Trận', e: '⚽' },
            { id: 'SQUAD', label: 'Đội', e: '👥' },
            { id: 'STORE', label: 'Shop', e: '🛍️' },
            { id: 'LEAGUE', label: 'Giải', e: '🏆' },
            { id: 'NEWS', label: 'Tin', e: '📰' },
          ].map(item => (
            <button key={item.id} onClick={() => setActiveTab(item.id as Tab)}
              className={`flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-xl transition-all
                ${activeTab === item.id ? 'text-[#0b8fff] bg-[#0b5fce]/20' : 'text-white/40'}`}>
              <span className="text-xl">{item.e}</span>
              <span className="text-[9px] font-black tracking-widest" style={{ fontFamily: "'Rajdhani'" }}>{item.label}</span>
            </button>
          ))}
        </nav>
      )}

      {/* Coins anim */}
      {showCoinsAnim && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-[999] pointer-events-none text-2xl font-black text-[#e8b84b] animate-bounce" style={{ fontFamily: "'Bebas Neue'" }}>
          +COINS! 🪙
        </div>
      )}
    </div>
  );
}

// ── Home Screen Component
function HomeScreen({ username, teamName, teamLogo, coins, gems, trophies, onNavigate, onClaim }: {
  username: string; teamName: string; teamLogo: string; coins: number; gems: number;
  trophies: string[]; onNavigate: (tab: Tab) => void; onClaim: (coins: number, player: Player) => void;
}) {
  return (
    <div className="h-full overflow-y-auto fc-home-bg" style={{ paddingBottom: '4rem' }}>
      <div className="max-w-6xl mx-auto px-4 py-6">
        {/* Welcome banner */}
        <div className="mb-6 relative overflow-hidden rounded-2xl p-6 border border-[#0b5fce]/30"
          style={{ background: 'linear-gradient(135deg, rgba(11,95,206,0.2) 0%, rgba(5,8,15,0.8) 100%)' }}>
          <div className="absolute inset-0 opacity-10"
            style={{ backgroundImage: "url('https://images.unsplash.com/photo-1574629810360-7efbbe195018?q=80&w=800&auto=format')", backgroundSize: 'cover', backgroundPosition: 'center' }} />
          <div className="relative z-10 flex items-center justify-between">
            <div>
              <div className="text-xs font-bold text-[#0b8fff] uppercase tracking-widest mb-1">Chào mừng trở lại,</div>
              <div className="text-4xl font-black text-white" style={{ fontFamily: "'Bebas Neue'", letterSpacing: 4 }}>{username.toUpperCase()}</div>
              <div className="text-sm text-white/60 font-medium mt-1">{teamName}</div>
            </div>
            <div className="text-right">
              <div className="text-6xl">⚽</div>
              {trophies.length > 0 && <div className="text-sm text-[#e8b84b] font-bold mt-1">{trophies.length} Trophy</div>}
            </div>
          </div>
        </div>

        {/* Daily chest */}
        <div className="mb-6">
          <DailyChest onClaim={onClaim} />
        </div>

        {/* Main game modes */}
        <div className="mb-4">
          <h2 className="text-sm font-black text-white/50 uppercase tracking-widest mb-3" style={{ fontFamily: "'Bebas Neue'", letterSpacing: 4 }}>Chế Độ Chơi</h2>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
            <HomeCard icon="⚽" title="Thi Đấu" desc="Trận đấu 11vs11 với AI" color="#0b8fff" onClick={() => onNavigate('MATCH')} />
            <HomeCard icon="🌐" title="Online PvP" desc="Đấu với người chơi khác" color="#00c851" onClick={() => onNavigate('ONLINE')} />
            <HomeCard icon="🏆" title="Champions League" desc="Chinh phục bảng xếp hạng" color="#e8b84b" onClick={() => onNavigate('LEAGUE')} />
            <HomeCard icon="🌍" title="World Cup" desc="Dẫn dắt đội tuyển quốc gia" color="#f5d57a" onClick={() => onNavigate('WORLDCUP')} />
          </div>
        </div>

        {/* Team management */}
        <div className="mb-4">
          <h2 className="text-sm font-black text-white/50 uppercase tracking-widest mb-3" style={{ fontFamily: "'Bebas Neue'", letterSpacing: 4 }}>Quản Lý Đội Bóng</h2>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
            <HomeCard icon="👥" title="Đội Hình" desc="Sắp xếp chiến thuật" color="#0b8fff" onClick={() => onNavigate('SQUAD')} />
            <HomeCard icon="🛍️" title="Cửa Hàng" desc="Mở pack nhận cầu thủ mới" color="#a78bfa" onClick={() => onNavigate('STORE')} />
            <HomeCard icon="🔄" title="Chợ Chuyển Nhượng" desc="Mua bán cầu thủ" color="#0b8fff" onClick={() => onNavigate('MARKET')} />
            <HomeCard icon="⚡" title="Nâng Cấp" desc="Tăng chỉ số cầu thủ" color="#e8b84b" onClick={() => onNavigate('UPGRADE')} />
          </div>
        </div>

        {/* Extra */}
        <div>
          <h2 className="text-sm font-black text-white/50 uppercase tracking-widest mb-3" style={{ fontFamily: "'Bebas Neue'", letterSpacing: 4 }}>Khác</h2>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
            <HomeCard icon="🏋️" title="Tập Luyện" desc="Nâng cao kỹ năng cầu thủ" color="#00c851" onClick={() => onNavigate('TRAIN')} />
            <HomeCard icon="🎯" title="Chế Độ Luyện Tập" desc="Sút phạt, rê bóng, chuyền bóng" color="#00c851" onClick={() => onNavigate('PRACTICE')} />
            <HomeCard icon="📰" title="Tin Tức" desc="Cập nhật bóng đá mới nhất" color="#0b8fff" onClick={() => onNavigate('NEWS')} />
            <HomeCard icon="📖" title="Hướng Dẫn" desc="Học cách chơi cơ bản" color="#a78bfa" onClick={() => onNavigate('TUTORIAL')} />
          </div>
        </div>
      </div>
    </div>
  );
}
