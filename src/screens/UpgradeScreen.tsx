import React, { useState } from 'react';
import { Player } from '../types';
import PlayerCard from '../components/PlayerCard';

interface Props { inventory:Player[]; setInventory:React.Dispatch<React.SetStateAction<Player[]>>; coins:number; setCoins:React.Dispatch<React.SetStateAction<number>>; }

const STAT_LABELS:Record<string,string>={pac:'Tốc độ',sho:'Sút',pas:'Chuyền',dri:'Rê bóng',def:'Phòng thủ',phy:'Thể lực'};
const STAT_ICONS:Record<string,string>={pac:'⚡',sho:'🎯',pas:'🅿️',dri:'🏃',def:'🛡️',phy:'💪'};

function upgCost(p:Player){ return p.level*150; }
function successRate(l:number){ return Math.max(15, 100-l*10); }

export default function UpgradeScreen({inventory,setInventory,coins,setCoins}:Props){
  const [sel,setSel]=useState<Player|null>(null);
  const [result,setResult]=useState<'success'|'fail'|null>(null);
  const [upgrading,setUpgrading]=useState(false);
  const [search,setSearch]=useState('');
  const [statAnim,setStatAnim]=useState<string|null>(null);

  const cost=sel?upgCost(sel):0;
  const rate=sel?successRate(sel.level):0;
  const canUpgrade=sel&&coins>=cost&&sel.level<10;

  const doUpgrade=()=>{
    if(!canUpgrade||!sel) return;
    setUpgrading(true); setResult(null);
    setTimeout(()=>{
      const success=Math.random()*100<rate;
      if(success){
        const updatedPlayer={...sel,level:sel.level+1,ovr:Math.min(99,sel.ovr+Math.floor(Math.random()*3)+1)};
        setInventory(inv=>inv.map(p=>p.id===sel.id?updatedPlayer:p));
        setSel(updatedPlayer);
      }
      setCoins(c=>c-cost);
      setResult(success?'success':'fail');
      setUpgrading(false);
    },1200);
  };

  const rarColor=(r:string)=>({SUPER_LEGENDARY:'#b060ff',GOLD:'#ffcd3c',SILVER:'#a0b0c0',BRONZE:'#c08040'}[r]||'#888');

  const filtered=inventory.filter(p=>!search||p.name.toLowerCase().includes(search.toLowerCase()));

  return (
    <div style={{height:'100%',display:'flex',background:'#05080f',overflow:'hidden',fontFamily:"'Exo 2',sans-serif"}}>
      {/* Left: player list */}
      <div style={{width:320,background:'rgba(5,11,26,0.97)',borderRight:'1px solid rgba(0,180,255,0.15)',display:'flex',flexDirection:'column'}}>
        <div style={{padding:'16px',borderBottom:'1px solid rgba(0,180,255,0.1)'}}>
          <div style={{fontFamily:"'Oxanium',sans-serif",fontWeight:800,fontSize:16,letterSpacing:3,marginBottom:10}}>⚡ NÂNG CẤP</div>
          <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="🔍 Tìm cầu thủ..." style={{width:'100%',background:'rgba(255,255,255,0.05)',border:'1px solid rgba(0,180,255,0.2)',borderRadius:8,padding:'8px 12px',color:'white',fontSize:13,fontWeight:600,outline:'none',boxSizing:'border-box'}} />
        </div>
        <div style={{flex:1,overflowY:'auto',padding:'8px'}}>
          {filtered.map(p=>(
            <div key={p.id} onClick={()=>{setSel(p);setResult(null);}} style={{display:'flex',alignItems:'center',gap:10,padding:'9px 12px',borderRadius:10,marginBottom:4,cursor:'pointer',border:`1px solid ${sel?.id===p.id?'rgba(0,180,255,0.4)':'rgba(255,255,255,0.06)'}`,background:sel?.id===p.id?'rgba(0,180,255,0.08)':'rgba(255,255,255,0.02)',transition:'all 0.15s'}}
              onMouseEnter={e=>{ if(sel?.id!==p.id){(e.currentTarget as HTMLElement).style.background='rgba(255,255,255,0.04)';} }}
              onMouseLeave={e=>{ if(sel?.id!==p.id){(e.currentTarget as HTMLElement).style.background='rgba(255,255,255,0.02)';} }}>
              <div style={{width:40,height:40,borderRadius:8,display:'flex',alignItems:'center',justifyContent:'center',fontSize:15,fontWeight:900,color:rarColor(p.rarity),background:`${rarColor(p.rarity)}18`,border:`1px solid ${rarColor(p.rarity)}33`,fontFamily:"'Oxanium',sans-serif",flexShrink:0}}>{p.ovr}</div>
              <div style={{flex:1,minWidth:0}}>
                <div style={{fontWeight:800,fontSize:13,whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'}}>{p.name}</div>
                <div style={{fontSize:10,color:'rgba(255,255,255,0.4)'}}>Lv {p.level} · {p.position}</div>
              </div>
              {p.level>=10&&<span style={{fontSize:9,background:'rgba(255,205,60,0.2)',color:'#ffcd3c',padding:'2px 6px',borderRadius:20,fontWeight:800}}>MAX</span>}
            </div>
          ))}
        </div>
      </div>

      {/* Right: upgrade panel */}
      <div style={{flex:1,display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',padding:32,overflowY:'auto'}}>
        {!sel?(
          <div style={{textAlign:'center',color:'rgba(255,255,255,0.3)'}}>
            <div style={{fontSize:64,marginBottom:16}}>⚡</div>
            <div style={{fontFamily:"'Oxanium',sans-serif",fontWeight:800,fontSize:22,letterSpacing:3,marginBottom:8}}>NÂNG CẤP CẦU THỦ</div>
            <div style={{fontSize:14,fontWeight:600}}>Chọn một cầu thủ từ danh sách bên trái</div>
          </div>
        ):(
          <div style={{width:'100%',maxWidth:560,display:'flex',flexDirection:'column',alignItems:'center',gap:24}}>
            {/* Card + result */}
            <div style={{position:'relative'}}>
              {result&&(
                <div style={{position:'absolute',inset:-16,borderRadius:20,zIndex:5,display:'flex',alignItems:'center',justifyContent:'center',background:result==='success'?'rgba(0,200,80,0.15)':'rgba(200,40,40,0.15)',border:`2px solid ${result==='success'?'rgba(0,230,100,0.5)':'rgba(220,50,50,0.5)'}`,pointerEvents:'none',animation:'fadeSlideUp 0.3s ease'}}>
                  <div style={{fontSize:48,fontWeight:900,color:result==='success'?'#00e676':'#ff5555',fontFamily:"'Oxanium',sans-serif",textShadow:result==='success'?'0 0 20px rgba(0,230,100,0.8)':'0 0 20px rgba(220,50,50,0.8)'}}>
                    {result==='success'?'✅ THÀNH CÔNG!':'❌ THẤT BẠI'}
                  </div>
                </div>
              )}
              <div style={{filter:upgrading?'blur(2px)':result==='success'?'drop-shadow(0 0 20px rgba(0,230,100,0.5))':result==='fail'?'drop-shadow(0 0 20px rgba(220,50,50,0.4))':'none',transition:'filter 0.3s'}}>
                <PlayerCard player={sel} size="lg" />
              </div>
            </div>

            {/* Stats */}
            <div style={{width:'100%',background:'rgba(255,255,255,0.03)',border:'1px solid rgba(255,255,255,0.08)',borderRadius:12,padding:'16px 20px'}}>
              <div style={{fontSize:11,fontWeight:800,color:'rgba(0,180,255,0.7)',letterSpacing:'0.3em',marginBottom:12}}>CHỈ SỐ</div>
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8}}>
                {Object.entries(sel.stats).map(([k,v])=>(
                  <div key={k} style={{display:'flex',alignItems:'center',gap:8}}>
                    <span style={{fontSize:14,width:20}}>{STAT_ICONS[k]}</span>
                    <span style={{fontSize:11,fontWeight:700,color:'rgba(255,255,255,0.5)',width:60}}>{STAT_LABELS[k]}</span>
                    <div style={{flex:1,height:6,background:'rgba(255,255,255,0.08)',borderRadius:99,overflow:'hidden'}}>
                      <div style={{height:'100%',borderRadius:99,width:`${v}%`,background:v>=90?'#00e676':v>=75?'#69f0ae':v>=60?'#ffcd3c':'#ff9800',transition:'width 0.5s ease'}} />
                    </div>
                    <span style={{fontSize:12,fontWeight:900,width:26,textAlign:'right',color:v>=90?'#00e676':v>=75?'#69f0ae':v>=60?'#ffcd3c':'#ff9800'}}>{v}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Upgrade info */}
            <div style={{width:'100%',background:'rgba(255,205,60,0.05)',border:'1px solid rgba(255,205,60,0.2)',borderRadius:12,padding:'16px 20px',display:'flex',justifyContent:'space-between',alignItems:'center'}}>
              <div>
                <div style={{fontSize:11,fontWeight:700,color:'rgba(255,255,255,0.4)',letterSpacing:'0.2em',marginBottom:4}}>CHI PHÍ</div>
                <div style={{fontSize:24,fontWeight:900,color:'#ffcd3c',fontFamily:"'Oxanium',sans-serif"}}>🪙 {cost.toLocaleString()}</div>
              </div>
              <div style={{textAlign:'center'}}>
                <div style={{fontSize:11,fontWeight:700,color:'rgba(255,255,255,0.4)',letterSpacing:'0.2em',marginBottom:4}}>TỶ LỆ THÀNH CÔNG</div>
                <div style={{fontSize:24,fontWeight:900,color:rate>=70?'#00e676':rate>=40?'#ffcd3c':'#ff5555',fontFamily:"'Oxanium',sans-serif"}}>{rate}%</div>
              </div>
              <div style={{textAlign:'right'}}>
                <div style={{fontSize:11,fontWeight:700,color:'rgba(255,255,255,0.4)',letterSpacing:'0.2em',marginBottom:4}}>CẤP ĐỘ</div>
                <div style={{fontSize:24,fontWeight:900,color:'white',fontFamily:"'Oxanium',sans-serif"}}>{sel.level}<span style={{fontSize:14,color:'rgba(255,255,255,0.4)'}}>/10</span></div>
              </div>
            </div>

            {/* XP bar */}
            <div style={{width:'100%'}}>
              <div style={{display:'flex',justifyContent:'space-between',fontSize:11,fontWeight:700,color:'rgba(255,255,255,0.5)',marginBottom:6}}>
                <span>XP HIỆN TẠI</span><span>{(sel.xp||0)} / {cost}</span>
              </div>
              <div style={{height:8,background:'rgba(255,255,255,0.08)',borderRadius:99,overflow:'hidden'}}>
                <div style={{height:'100%',borderRadius:99,background:'linear-gradient(90deg,#0066cc,#00b4ff)',width:`${Math.min(100,((sel.xp||0)/cost)*100)}%`,transition:'width 0.3s'}} />
              </div>
              <div style={{fontSize:11,color:'rgba(255,255,255,0.3)',marginTop:4}}>Chơi trận đấu để kiếm XP</div>
            </div>

            {/* Button */}
            {sel.level>=10?(
              <div style={{padding:'14px 0',width:'100%',textAlign:'center',background:'rgba(255,205,60,0.1)',border:'1px solid rgba(255,205,60,0.3)',borderRadius:10,fontWeight:800,fontSize:15,color:'#ffcd3c',letterSpacing:2}}>⭐ CẦU THỦ ĐÃ ĐẠT CẤP TỐI ĐA</div>
            ):(
              <button onClick={doUpgrade} disabled={!canUpgrade||upgrading} style={{width:'100%',padding:'14px 0',borderRadius:10,background:canUpgrade&&!upgrading?'linear-gradient(135deg,#0066cc,#00b4ff)':'rgba(255,255,255,0.06)',border:'1px solid rgba(0,180,255,0.3)',color:canUpgrade&&!upgrading?'white':'rgba(255,255,255,0.3)',fontWeight:800,fontSize:16,cursor:canUpgrade&&!upgrading?'pointer':'not-allowed',letterSpacing:2,transition:'all 0.2s',display:'flex',alignItems:'center',justifyContent:'center',gap:10}}>
                {upgrading?<><span className="anim-spin" style={{width:18,height:18,border:'2px solid rgba(255,255,255,0.3)',borderTopColor:'white',borderRadius:'50%',display:'inline-block'}} /> ĐANG NÂNG CẤP...</>:'⚡ NÂNG CẤP'}
              </button>
            )}
            {!canUpgrade&&sel.level<10&&coins<cost&&<div style={{fontSize:12,color:'#ff5555',fontWeight:700}}>Không đủ coins! Cần thêm 🪙{(cost-coins).toLocaleString()}</div>}
          </div>
        )}
      </div>
    </div>
  );
}
