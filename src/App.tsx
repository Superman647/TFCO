import React, { useState, useEffect } from 'react';
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
import MatchPreGame from './screens/MatchPreGame';
import { useAudio } from './contexts/AudioContext';

type Tab = 'HOME'|'SQUAD'|'STORE'|'MATCH'|'PREGAME'|'UPGRADE'|'ONLINE'|'TRAIN'|'MARKET'|
           'TUTORIAL'|'WORLDCUP'|'PRACTICE'|'LEAGUE'|'NEWS'|'INTERVIEW';

/* ─── LOGIN ──────────────────────────────────────────────────────── */
function LoginScreen({onLogin}:{onLogin:(u:string,t:string)=>void}){
  const [u,setU]=useState('');const [t,setT]=useState('');const [loading,setLoading]=useState(false);
  const sub=(e:React.FormEvent)=>{e.preventDefault();if(!u.trim())return;setLoading(true);setTimeout(()=>onLogin(u.trim(),t.trim()||u.trim()+' FC'),700);};
  return(
    <div style={{height:'100dvh',background:'#050b1a',position:'relative',overflow:'hidden',display:'flex',flexDirection:'column'}}>
      <div style={{position:'absolute',inset:0,backgroundImage:"url('https://images.unsplash.com/photo-1574629810360-7efbbe195018?q=80&w=2000')",backgroundSize:'cover',backgroundPosition:'center',filter:'brightness(0.18) saturate(0.5)'}}/>
      <div style={{position:'absolute',inset:0,background:'radial-gradient(ellipse 80% 50% at 50% 0%,rgba(0,100,220,0.35),transparent)'}}/>
      <div style={{position:'absolute',inset:0,opacity:0.04,backgroundImage:'linear-gradient(rgba(0,180,255,0.6) 1px,transparent 1px),linear-gradient(90deg,rgba(0,180,255,0.6) 1px,transparent 1px)',backgroundSize:'48px 48px'}}/>
      <div style={{position:'relative',zIndex:10,display:'flex',alignItems:'center',justifyContent:'space-between',padding:'16px 32px'}}>
        <div style={{display:'flex',alignItems:'center',gap:12}}>
          <div style={{width:44,height:44,borderRadius:10,background:'linear-gradient(135deg,#0066cc,#00b4ff)',display:'flex',alignItems:'center',justifyContent:'center',fontFamily:"'Oxanium',sans-serif",fontWeight:800,fontSize:18,boxShadow:'0 0 20px rgba(0,180,255,0.4)'}}>FC</div>
          <div><div style={{fontFamily:"'Oxanium',sans-serif",fontWeight:800,fontSize:20,letterSpacing:4,color:'white',lineHeight:1}}>FC ONLINE</div><div style={{fontSize:9,fontWeight:700,letterSpacing:'0.4em',color:'#00b4ff',marginTop:2}}>FOOTBALL MANAGER</div></div>
        </div>
        <div style={{fontSize:11,color:'rgba(255,255,255,0.25)',fontWeight:600,letterSpacing:'0.2em'}}>SEASON 2024/25</div>
      </div>
      <div style={{flex:1,display:'flex',alignItems:'center',justifyContent:'center',position:'relative',zIndex:10,padding:16}}>
        <div style={{width:'100%',maxWidth:400}}>
          <div style={{textAlign:'center',marginBottom:36}}>
            <div style={{fontSize:10,fontWeight:800,letterSpacing:'0.5em',color:'#00b4ff',marginBottom:12}}>WELCOME TO</div>
            <div style={{fontFamily:"'Oxanium',sans-serif",fontWeight:800,fontSize:72,lineHeight:0.9,color:'white',letterSpacing:8,textShadow:'0 0 40px rgba(0,180,255,0.4)'}}>FC</div>
            <div style={{fontFamily:"'Oxanium',sans-serif",fontWeight:800,fontSize:40,lineHeight:1,color:'white',letterSpacing:5}}>ONLINE</div>
            <div style={{width:60,height:2,margin:'16px auto 0',background:'linear-gradient(90deg,transparent,#00b4ff,transparent)'}}/>
          </div>
          <form onSubmit={sub} style={{display:'flex',flexDirection:'column',gap:14}}>
            <div><div style={{fontSize:10,fontWeight:800,letterSpacing:'0.3em',color:'rgba(255,255,255,0.5)',marginBottom:8}}>TÊN HLV</div><input className="fc-input" placeholder="Nhập tên của bạn..." value={u} onChange={e=>setU(e.target.value)} maxLength={24} required/></div>
            <div><div style={{fontSize:10,fontWeight:800,letterSpacing:'0.3em',color:'rgba(255,255,255,0.5)',marginBottom:8}}>TÊN CÂU LẠC BỘ</div><input className="fc-input" placeholder="Tên CLB của bạn..." value={t} onChange={e=>setT(e.target.value)} maxLength={30}/></div>
            <button type="submit" disabled={!u.trim()||loading} className="btn-fc" style={{padding:'14px 0',fontSize:16,marginTop:6,borderRadius:10,display:'flex',alignItems:'center',justifyContent:'center',gap:10,opacity:(!u.trim()||loading)?0.5:1}}>
              {loading?<><span className="anim-spin" style={{width:18,height:18,border:'2px solid rgba(255,255,255,0.3)',borderTopColor:'white',borderRadius:'50%',display:'inline-block'}}/> ĐANG VÀO...</>:'BẮT ĐẦU SỰ NGHIỆP'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

/* ─── LOBBY (image 1 style) ───────────────────────────────────────── */
function LobbyScreen({username,teamName,coins,gems,trophies,onNavigate,onClaim,activeMenu,setActiveMenu}:{
  username:string;teamName:string;coins:number;gems:number;trophies:string[];
  onNavigate:(t:Tab)=>void;onClaim:(c:number,p:Player)=>void;
  activeMenu:Tab;setActiveMenu:(t:Tab)=>void;
}){
  const menuItems=[
    {id:'MATCH' as Tab,    label:'Trận XH',       badge:'VS NPL', sub:'Virtual'},
    {id:'ONLINE' as Tab,   label:'XH 2vs2',       badge:'ĐỘI',   sub:'Team'},
    {id:'LEAGUE' as Tab,   label:'Giải Lập XH',   badge:'AUTO'},
    {id:'WORLDCUP' as Tab, label:'Arena',          badge:'MÙA'},
    {id:'PRACTICE' as Tab, label:'Môi Đấu Trí',   badge:'MINI'},
    {id:'SQUAD' as Tab,    label:'Squad Battle',  badge:'MỚI'},
  ];
  const botNav=[
    {id:'SQUAD' as Tab,   label:'Quản lý CT',    icon:'👥'},
    {id:'NEWS' as Tab,    label:'Sự kiện',        icon:'🎯'},
    {id:'UPGRADE' as Tab, label:'Phòng thay đồ', icon:'👕'},
    {id:'TRAIN' as Tab,   label:'TTCN',           icon:'⚡'},
    {id:'MARKET' as Tab,  label:'Theo dõi',       icon:'👁️'},
    {id:'STORE' as Tab,   label:'Vật phẩm',       icon:'🎁'},
    {id:'STORE' as Tab,   label:'Shop',           icon:'🛍️'},
    {id:'LEAGUE' as Tab,  label:'CLB',            icon:'🏛️'},
    {id:'NEWS' as Tab,    label:'Tổng hợp',       icon:'📋'},
  ];

  const handleMenu=(id:Tab)=>{
    setActiveMenu(id);
    onNavigate(id);
  };

  return(
    <div style={{height:'100dvh',display:'flex',flexDirection:'column',background:'#050b1a',overflow:'hidden'}}>
      {/* TOP BAR */}
      <div style={{background:'rgba(4,8,18,0.98)',borderBottom:'1px solid rgba(0,180,255,0.12)',display:'flex',alignItems:'center',justifyContent:'space-between',padding:'6px 16px',flexShrink:0,gap:8}}>
        <div style={{display:'flex',alignItems:'center',gap:8,minWidth:0}}>
          <div style={{width:32,height:32,borderRadius:8,background:'linear-gradient(135deg,#c62828,#ff5252)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:11,fontWeight:900,flexShrink:0,border:'1px solid rgba(255,100,100,0.4)',fontFamily:"'Oxanium',sans-serif"}}>{teamName.substring(0,2).toUpperCase()}</div>
          <div><div style={{fontSize:12,fontWeight:800,color:'white',lineHeight:1}}>{teamName}</div><div style={{fontSize:9,color:'rgba(255,255,255,0.45)',fontWeight:600}}>HLV: {username}</div></div>
        </div>
        <div style={{fontSize:10,color:'#00d4a0',fontWeight:700,background:'rgba(0,212,160,0.1)',padding:'3px 10px',borderRadius:20,border:'1px solid rgba(0,212,160,0.25)',flexShrink:0,cursor:'pointer'}} onClick={()=>onNavigate('NEWS')}>♥ Theo dõi</div>
        <div style={{display:'flex',alignItems:'center',gap:6,flexShrink:0}}>
          <div style={{background:'linear-gradient(135deg,#006bb3,#00b4ff)',borderRadius:20,padding:'3px 10px',fontSize:11,fontWeight:800,display:'flex',alignItems:'center',gap:4,border:'1px solid rgba(0,180,255,0.35)'}}>LV 8</div>
          <div style={{background:'rgba(255,205,60,0.12)',border:'1px solid rgba(255,205,60,0.3)',borderRadius:20,padding:'3px 10px',fontSize:11,fontWeight:800,color:'#ffcd3c',display:'flex',alignItems:'center',gap:4}}>🪙 {coins.toLocaleString()}</div>
          <div style={{background:'rgba(0,100,220,0.15)',border:'1px solid rgba(0,180,255,0.3)',borderRadius:20,padding:'3px 10px',fontSize:11,fontWeight:800,color:'#60aaff',display:'flex',alignItems:'center',gap:4}}>💎 {gems}</div>
          <button className="btn-fc-gold" style={{padding:'4px 12px',fontSize:11,borderRadius:20,cursor:'pointer'}}>Boost</button>
          {trophies.length>0&&<span style={{fontSize:16}}>🏆</span>}
        </div>
      </div>

      {/* BODY */}
      <div style={{flex:1,display:'flex',overflow:'hidden',position:'relative'}}>
        <div style={{position:'absolute',inset:0,backgroundImage:"url('https://images.unsplash.com/photo-1556056504-5c7696c4c28d?q=80&w=2000')",backgroundSize:'cover',backgroundPosition:'center top',filter:'brightness(0.28) saturate(0.7)'}}/>
        <div style={{position:'absolute',inset:0,background:'linear-gradient(90deg,rgba(4,8,18,0.97) 0%,rgba(4,8,18,0.5) 35%,rgba(4,8,18,0.15) 65%,rgba(4,8,18,0.4) 100%)'}}/>

        {/* LEFT PANEL – SAME AS IMAGE 1 */}
        <div style={{width:210,flexShrink:0,position:'relative',zIndex:10,background:'rgba(6,12,24,0.96)',borderRight:'1px solid rgba(0,180,255,0.15)',display:'flex',flexDirection:'column',paddingTop:8}}>
          {menuItems.map(item=>(
            <div key={item.id}
              onClick={()=>handleMenu(item.id)}
              style={{display:'flex',alignItems:'center',gap:10,padding:'12px 16px',cursor:'pointer',transition:'all 0.15s',borderLeft:`3px solid ${activeMenu===item.id?'#00b4ff':'transparent'}`,background:activeMenu===item.id?'rgba(0,180,255,0.15)':'transparent',color:activeMenu===item.id?'#00b4ff':'rgba(255,255,255,0.65)',fontFamily:"'Exo 2',sans-serif",fontWeight:700,fontSize:14}}
              onMouseEnter={e=>{if(activeMenu!==item.id){(e.currentTarget as HTMLElement).style.background='rgba(0,180,255,0.07)';(e.currentTarget as HTMLElement).style.color='white';}}}
              onMouseLeave={e=>{if(activeMenu!==item.id){(e.currentTarget as HTMLElement).style.background='transparent';(e.currentTarget as HTMLElement).style.color='rgba(255,255,255,0.65)';}}}
            >
              <div style={{flex:1}}>
                <div>{item.label}</div>
                {item.sub&&<div style={{fontSize:10,opacity:0.5,fontWeight:600}}>{item.sub}</div>}
              </div>
              {item.badge&&<span style={{background:'#00d4a0',color:'#0a1a14',fontSize:9,fontWeight:900,padding:'2px 6px',borderRadius:99}}>{item.badge}</span>}
            </div>
          ))}
          <div style={{flex:1}}/>
          <div style={{padding:'10px',borderTop:'1px solid rgba(0,180,255,0.1)'}}>
            <DailyChest onClaim={onClaim}/>
          </div>
        </div>

        {/* CENTER */}
        <div style={{flex:1,position:'relative',zIndex:5,display:'flex',flexDirection:'column',alignItems:'flex-end',justifyContent:'flex-end',padding:'16px 24px 16px 0'}}>
          {/* Banners */}
          <div style={{position:'absolute',top:16,right:16,width:220,borderRadius:12,overflow:'hidden',border:'1px solid rgba(0,180,255,0.2)',background:'rgba(4,8,18,0.7)',cursor:'pointer'}} onClick={()=>onNavigate('STORE')}>
            <img src="https://images.unsplash.com/photo-1606925797300-0b35e9d1794e?q=80&w=400&auto=format&fit=crop" alt="" style={{width:'100%',height:100,objectFit:'cover',opacity:0.8}}/>
            <div style={{padding:'8px 12px',fontSize:11,fontWeight:700,color:'#ffcd3c'}}>🎁 SỰ KIỆN MÙA HÈ 2024</div>
          </div>
          <div style={{position:'absolute',top:136,right:16,width:220,borderRadius:12,overflow:'hidden',border:'1px solid rgba(0,180,255,0.2)',background:'rgba(4,8,18,0.7)',cursor:'pointer'}} onClick={()=>onNavigate('STORE')}>
            <img src="https://images.unsplash.com/photo-1546519638-68e109498ffc?q=80&w=400&auto=format&fit=crop" alt="" style={{width:'100%',height:80,objectFit:'cover',opacity:0.7}}/>
            <div style={{padding:'8px 12px',fontSize:11,fontWeight:700,color:'#00d4a0'}}>💎 PACK MỚI: HERO CARDS</div>
          </div>
          {/* Player model */}
          <div style={{position:'absolute',right:260,bottom:0,height:'85%',display:'flex',alignItems:'flex-end'}}>
            <img src="https://cdn.sofifa.net/players/188545/24_240.png" alt="player" style={{height:'90%',objectFit:'contain',filter:'drop-shadow(0 0 30px rgba(0,180,255,0.3)) drop-shadow(0 20px 40px rgba(0,0,0,0.8))',maxHeight:460}} onError={e=>{(e.target as HTMLImageElement).style.display='none';}}/>
          </div>
          {/* Player info */}
          <div style={{background:'rgba(4,8,18,0.85)',border:'1px solid rgba(0,180,255,0.2)',borderRadius:10,padding:'8px 16px',backdropFilter:'blur(12px)',display:'flex',alignItems:'center',gap:12,marginBottom:4}}>
            <div style={{fontSize:10,color:'rgba(255,255,255,0.45)',fontWeight:600,fontFamily:"'Exo 2',sans-serif"}}>Chúc mừng HLV {username} đã nhìn thấy cầu thủ</div>
            <div style={{background:'linear-gradient(135deg,#0066cc,#00b4ff)',borderRadius:6,padding:'3px 10px',fontSize:12,fontWeight:800,color:'white',cursor:'pointer'}} onClick={()=>onNavigate('SQUAD')}>ST R. Lewandowski</div>
            <div style={{fontSize:11,color:'#00d4a0',fontWeight:700,cursor:'pointer'}} onClick={()=>onNavigate('TRAIN')}>+ Luyện Tập Tự Do</div>
          </div>
        </div>
      </div>

      {/* BOTTOM NAV */}
      <div style={{background:'rgba(4,8,18,0.99)',borderTop:'1px solid rgba(0,180,255,0.15)',display:'flex',alignItems:'stretch',flexShrink:0,overflowX:'auto'}}>
        {botNav.map((item,i)=>(
          <div key={i} onClick={()=>onNavigate(item.id)}
            style={{flex:1,display:'flex',flexDirection:'column',alignItems:'center',gap:3,padding:'6px 4px',cursor:'pointer',transition:'all 0.15s',fontFamily:"'Exo 2',sans-serif",fontSize:9,fontWeight:700,color:'rgba(255,255,255,0.45)',borderTop:'2px solid transparent',minWidth:60}}
            onMouseEnter={e=>{(e.currentTarget as HTMLElement).style.color='rgba(255,255,255,0.8)';(e.currentTarget as HTMLElement).style.background='rgba(0,180,255,0.07)';}}
            onMouseLeave={e=>{(e.currentTarget as HTMLElement).style.color='rgba(255,255,255,0.45)';(e.currentTarget as HTMLElement).style.background='transparent';}}>
            <span style={{fontSize:18}}>{item.icon}</span>
            <span style={{whiteSpace:'nowrap'}}>{item.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ─── APP ROOT ──────────────────────────────────────────────────── */
export default function App(){
  const {playAudio,stopAudio,stopAll,setVolume,volume}=useAudio();
  const [username,setUsername]=useState<string|null>(null);
  const [teamName,setTeamName]=useState('My FC');
  const [teamLogo,setTeamLogo]=useState('');
  const [activeTab,setActiveTab]=useState<Tab>('HOME');
  const [activeMenu,setActiveMenu]=useState<Tab>('MATCH');
  const [coins,setCoins]=useState(2500);
  const [gems,setGems]=useState(50);
  const [inventory,setInventory]=useState<Player[]>(INITIAL_PLAYERS.slice(0,15));
  const [squad,setSquad]=useState<Squad>({formation:'4-3-3',lineup:getInitialSquad(INITIAL_PLAYERS)});
  const [trophies,setTrophies]=useState<string[]>([]);
  const [leagueOpponent,setLeagueOpponent]=useState<string|null>(null);
  const [leagueDifficulty,setLeagueDifficulty]=useState<Difficulty>('MEDIUM');
  const [lastMatchResult,setLastMatchResult]=useState<any>(null);
  const [pendingMatch,setPendingMatch]=useState<{opponent?:string;diff?:Difficulty}|null>(null);

  useEffect(()=>{const s=localStorage.getItem('fcweb_user');if(s){setUsername(s);const d=localStorage.getItem(`fcweb_data_${s}`);if(d){try{const p=JSON.parse(d);if(p.coins!==undefined)setCoins(p.coins);if(p.gems!==undefined)setGems(p.gems);if(p.inventory)setInventory(p.inventory);if(p.squad?.formation)setSquad(p.squad);if(p.teamName)setTeamName(p.teamName);if(p.trophies)setTrophies(p.trophies);}catch{}}};},[]);
  useEffect(()=>{if(username)localStorage.setItem(`fcweb_data_${username}`,JSON.stringify({coins,gems,inventory,squad,teamName,teamLogo,trophies}));},[coins,gems,inventory,squad,teamName,teamLogo,username,trophies]);
  useEffect(()=>{if(!username){stopAll();return;}const mt=['MATCH','WORLDCUP','ONLINE','PRACTICE'];if(mt.includes(activeTab)){stopAudio('THEME');}else{stopAudio('MATCH_AMBIENT');if(volume>0)playAudio('THEME',true);}},[activeTab,username]);

  const handleLogin=(u:string,t:string)=>{
    setUsername(u);setTeamName(t);setTeamLogo(`https://ui-avatars.com/api/?name=${encodeURIComponent(t)}&background=0066cc&color=fff&size=64&bold=true`);localStorage.setItem('fcweb_user',u);
    const d=localStorage.getItem(`fcweb_data_${u}`);
    if(d){try{const p=JSON.parse(d);if(p.coins!==undefined)setCoins(p.coins);if(p.gems!==undefined)setGems(p.gems);if(p.inventory)setInventory(p.inventory);if(p.squad?.formation)setSquad(p.squad);if(p.teamName)setTeamName(p.teamName);if(p.trophies)setTrophies(p.trophies);}catch{}}
    else{setCoins(2500);setGems(50);setTrophies([]);const s=generateStarterSquad();setInventory(s);setSquad({formation:'4-3-3',lineup:getInitialSquad(s)});setTimeout(()=>setActiveTab('TUTORIAL'),300);}
  };

  const handleMatchFinish=(reward:number,xpGains:Record<string,number>,scoreA?:number,scoreB?:number,stats?:any)=>{
    setCoins(c=>c+reward);
    setInventory(prev=>prev.map(p=>xpGains[p.id]?{...p,xp:(p.xp||0)+xpGains[p.id]}:p));
    setSquad(prev=>({...prev,lineup:prev.lineup.map(p=>p&&xpGains[p.id]?{...p,xp:(p.xp||0)+xpGains[p.id]}:p)}));
    if(stats)setLastMatchResult(stats);
    setLeagueOpponent(null);setPendingMatch(null);
    if(leagueOpponent&&leagueDifficulty==='HARD')setActiveTab('INTERVIEW');
    else setActiveTab('HOME');
  };

  const startMatch=(opponent?:string,diff?:Difficulty)=>{
    if(opponent)setLeagueOpponent(opponent);
    if(diff)setLeagueDifficulty(diff);
    setPendingMatch({opponent,diff});
    setActiveTab('PREGAME');
  };

  const nav=(tab:Tab)=>{
    setActiveMenu(tab);
    setActiveTab(tab);
  };

  if(!username)return <LoginScreen onLogin={handleLogin}/>;

  const isMatchTab=['MATCH','WORLDCUP','ONLINE','PRACTICE','TRAIN'].includes(activeTab);

  const renderScreen=()=>{
    switch(activeTab){
      case 'HOME':     return null; // handled below
      case 'TUTORIAL': return <TutorialScreen onComplete={()=>{setCoins(c=>c+800);setActiveTab('HOME');}}/>;
      case 'STORE':    return <StoreScreen coins={coins} setCoins={setCoins} inventory={inventory} setInventory={setInventory}/>;
      case 'SQUAD':    return <SquadScreen squad={squad} setSquad={setSquad} inventory={inventory} setInventory={setInventory} coins={coins} setCoins={setCoins}/>;
      case 'UPGRADE':  return <UpgradeScreen inventory={inventory} setInventory={setInventory} coins={coins} setCoins={setCoins}/>;
      case 'TRAIN':    return <TrainScreen inventory={inventory} setInventory={setInventory} coins={coins} setCoins={setCoins}/>;
      case 'MARKET':   return <TransferMarketScreen coins={coins} onBuy={(p,c)=>{setCoins(co=>co-c);setInventory(inv=>[...inv,p]);}}/>;
      case 'PREGAME':  return <MatchPreGame userTeamName={teamName} opponentName={pendingMatch?.opponent||'AI'} difficulty={pendingMatch?.diff||'MEDIUM'} onStart={()=>setActiveTab('MATCH')} onBack={()=>setActiveTab('HOME')}/>;
      case 'MATCH':    return <MatchScreen squad={squad} onFinish={handleMatchFinish} opponentName={leagueOpponent||undefined} userTeamName={teamName} forcedDifficulty={leagueOpponent?leagueDifficulty:undefined}/>;
      case 'ONLINE':   return <OnlineScreen username={username} squad={squad} onMatchComplete={handleMatchFinish}/>;
      case 'WORLDCUP': return <WorldCupScreen onBack={()=>setActiveTab('HOME')} onWin={()=>setTrophies(p=>[...p,'World Cup'])} onMatchComplete={(c,x)=>{setCoins(co=>co+c);setInventory(p=>p.map(pl=>x[pl.id]?{...pl,xp:(pl.xp||0)+x[pl.id]}:pl));}}/>;
      case 'PRACTICE': return <PracticeScreen squad={squad} onBack={()=>setActiveTab('HOME')}/>;
      case 'LEAGUE':   return <LeagueScreen teamName={teamName} onBack={()=>setActiveTab('HOME')} onStartMatch={(opp,diff)=>startMatch(opp,diff)}/>;
      case 'NEWS':     return <NewsScreen onBack={()=>setActiveTab('HOME')}/>;
      case 'INTERVIEW':return <InterviewScreen matchResult={{score:lastMatchResult?.score||'0-0',opponent:lastMatchResult?.opponent||'',competition:'League',isWinner:lastMatchResult?.isWinner||false,playerPerformance:''}} onFinish={()=>{setLeagueOpponent(null);setActiveTab('HOME');}}/>;
      default: return null;
    }
  };

  if(activeTab==='HOME'){
    return <LobbyScreen username={username} teamName={teamName} coins={coins} gems={gems} trophies={trophies}
      onNavigate={nav} onClaim={(rc,rp)=>{setCoins(c=>c+rc);setInventory(inv=>[...inv,rp]);}}
      activeMenu={activeMenu} setActiveMenu={setActiveMenu}/>;
  }

  const screen=renderScreen();
  return(
    <div style={{height:'100dvh',display:'flex',flexDirection:'column',background:'#05080f',overflow:'hidden',fontFamily:"'Exo 2',sans-serif"}}>
      {!isMatchTab&&activeTab!=='PREGAME'&&activeTab!=='MATCH'&&(
        <div style={{background:'rgba(4,8,18,0.98)',borderBottom:'1px solid rgba(0,180,255,0.12)',display:'flex',alignItems:'center',gap:10,padding:'8px 16px',flexShrink:0}}>
          <button onClick={()=>setActiveTab('HOME')} style={{background:'rgba(0,180,255,0.1)',border:'1px solid rgba(0,180,255,0.25)',borderRadius:8,padding:'6px 14px',color:'#00b4ff',fontWeight:800,fontSize:13,cursor:'pointer'}}>← Lobby</button>
          <div style={{fontFamily:"'Oxanium',sans-serif",fontWeight:800,fontSize:16,letterSpacing:3,flex:1}}>
            {({'STORE':'🛍️ CỬA HÀNG','SQUAD':'👥 ĐỘI HÌNH','UPGRADE':'⚡ NÂNG CẤP','TRAIN':'🏋️ LUYỆN TẬP','MARKET':'🔄 CHỢ CT','LEAGUE':'🏆 GIẢI ĐẤU','NEWS':'📰 TIN TỨC','TUTORIAL':'📖 HƯỚNG DẪN','ONLINE':'🌐 ONLINE','WORLDCUP':'🌍 WORLD CUP'} as Record<string,string>)[activeTab]||activeTab}
          </div>
          <div style={{display:'flex',gap:8,alignItems:'center'}}>
            <div style={{fontSize:13,fontWeight:800,color:'#ffcd3c'}}>🪙 {coins.toLocaleString()}</div>
            <div style={{fontSize:13,fontWeight:800,color:'#60aaff'}}>💎 {gems}</div>
          </div>
        </div>
      )}
      <div style={{flex:1,overflow:'hidden'}}>{screen}</div>
    </div>
  );
}
