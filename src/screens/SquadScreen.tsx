import React, { useState } from 'react';
import { Player, Squad } from '../types';
import PlayerCard from '../components/PlayerCard';
import { FORMATION_POSITIONS } from '../constants';

interface Props { squad:Squad; setSquad:React.Dispatch<React.SetStateAction<Squad>>; inventory:Player[]; setInventory:React.Dispatch<React.SetStateAction<Player[]>>; coins:number; setCoins:React.Dispatch<React.SetStateAction<number>>; }

const FORMATIONS=['4-3-3','4-4-2','3-5-2'];
function playerValue(p:Player){ return Math.floor(Math.pow(Math.max(0,p.ovr-50),2.5)*1.5)+50; }
function avgOvr(lineup:(Player|null)[]){ const ps=lineup.filter(Boolean) as Player[]; return ps.length?Math.round(ps.reduce((s,p)=>s+p.ovr,0)/ps.length):0; }
function rarColor(r:string){ return({SUPER_LEGENDARY:'#b060ff',GOLD:'#ffcd3c',SILVER:'#a0b0c0',BRONZE:'#c08040'})[r]||'#888'; }
function ovr2col(v:number){ return v>=90?'#00e676':v>=80?'#69f0ae':v>=70?'#ffcd3c':v>=60?'#ff9800':'#ff5252'; }

export default function SquadScreen({squad,setSquad,inventory,setInventory,coins,setCoins}:Props){
  const [selSlot,setSelSlot]=useState<number|null>(null);
  const [showFormDrop,setShowFormDrop]=useState(false);
  const [search,setSearch]=useState('');
  const [confirmSell,setConfirmSell]=useState<Player|null>(null);
  const [hovCard,setHovCard]=useState<Player|null>(null);

  const fPos=FORMATION_POSITIONS[squad.formation]||FORMATION_POSITIONS['4-3-3'];
  const teamOvr=avgOvr(squad.lineup);
  const totalVal=squad.lineup.filter(Boolean).reduce((s,p)=>s+playerValue(p!),0);

  const changeForm=(f:string)=>{
    const np=FORMATION_POSITIONS[f];
    const nl=new Array(11).fill(null);
    squad.lineup.forEach(p=>{ if(p){ const mi=np.findIndex((pos,i)=>pos.pos===p.position&&!nl[i]); if(mi!==-1)nl[mi]=p; } });
    setSquad({formation:f,lineup:nl});
    setShowFormDrop(false);
  };

  const selectPlayer=(p:Player)=>{
    if(selSlot===null)return;
    setSquad(prev=>{const nl=[...prev.lineup];nl[selSlot]=p;return{...prev,lineup:nl};});
    setSelSlot(null);
  };

  const removeSlot=(idx:number)=>{ setSquad(prev=>{const nl=[...prev.lineup];nl[idx]=null;return{...prev,lineup:nl};}); };

  const sellPlayer=(p:Player)=>{
    setCoins(c=>c+playerValue(p));
    setInventory(inv=>inv.filter(x=>x.id!==p.id));
    setSquad(prev=>({...prev,lineup:prev.lineup.map(x=>x?.id===p.id?null:x)}));
    setConfirmSell(null);
    if(selSlot!==null) setSelSlot(null);
  };

  const squadIds=new Set(squad.lineup.filter(Boolean).map(p=>p!.id));
  const available=inventory.filter(p=>!squadIds.has(p.id)).filter(p=>!search||p.name.toLowerCase().includes(search.toLowerCase())||p.position.toLowerCase().includes(search.toLowerCase()));

  return(
    <div style={{height:'100%',display:'flex',background:'#05080f',overflow:'hidden',fontFamily:"'Exo 2',sans-serif"}}>

      {/* ── TOP AREA: formation info like Image 2 ── */}
      {/* ── PITCH AREA (center) ── */}
      <div style={{flex:1,display:'flex',flexDirection:'column',position:'relative',overflow:'hidden'}}>

        {/* TOP BAR – Image 2 style: chiến thuật + đội hình + tổng lương */}
        <div style={{background:'rgba(5,8,18,0.97)',borderBottom:'1px solid rgba(0,180,255,0.12)',padding:'8px 16px',display:'flex',alignItems:'center',gap:10,flexShrink:0,flexWrap:'wrap'}}>
          {/* Formation shortcuts B/C */}
          <div style={{display:'flex',gap:4}}>
            {['B','C'].map(l=><div key={l} style={{width:28,height:28,borderRadius:6,background:'rgba(255,255,255,0.08)',border:'1px solid rgba(255,255,255,0.15)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:12,fontWeight:900,color:'rgba(255,255,255,0.6)',cursor:'pointer'}}>{l}</div>)}
          </div>
          {/* Chiến thuật */}
          <div style={{fontSize:11,color:'rgba(255,255,255,0.5)',fontWeight:700,letterSpacing:1}}>Chiến thuật</div>
          {/* Formation dropdown */}
          <div style={{position:'relative'}}>
            <div onClick={()=>setShowFormDrop(s=>!s)} style={{display:'flex',alignItems:'center',gap:6,background:'rgba(0,180,255,0.1)',border:'1px solid rgba(0,180,255,0.3)',borderRadius:8,padding:'5px 12px',cursor:'pointer',fontSize:13,fontWeight:800,color:'#00b4ff'}}>
              <span style={{fontSize:10,color:'rgba(255,255,255,0.5)'}}>1. KHÔNG CÓ GÌ</span>
              <span style={{fontSize:11,color:'rgba(255,255,255,0.4)'}}>▾</span>
            </div>
            {showFormDrop&&(
              <div style={{position:'absolute',top:'100%',left:0,marginTop:4,background:'rgba(5,8,18,0.99)',border:'1px solid rgba(0,180,255,0.2)',borderRadius:8,overflow:'hidden',zIndex:30,minWidth:140,boxShadow:'0 8px 32px rgba(0,0,0,0.8)'}}>
                {FORMATIONS.map(f=>(
                  <div key={f} onClick={()=>changeForm(f)} style={{padding:'10px 16px',cursor:'pointer',fontWeight:800,fontSize:13,color:squad.formation===f?'#00b4ff':'rgba(255,255,255,0.7)',background:squad.formation===f?'rgba(0,180,255,0.1)':'transparent',borderBottom:'1px solid rgba(255,255,255,0.04)'}}>
                    {f}
                  </div>
                ))}
              </div>
            )}
          </div>
          {/* Đội hình */}
          <div style={{fontSize:11,color:'rgba(255,255,255,0.5)',fontWeight:700,letterSpacing:1}}>Đội hình</div>
          <div style={{display:'flex',alignItems:'center',gap:6,background:'rgba(255,255,255,0.06)',border:'1px solid rgba(255,255,255,0.1)',borderRadius:8,padding:'5px 12px',fontSize:13,fontWeight:800,color:'white'}}>
            {squad.formation} <span style={{fontSize:11,color:'rgba(255,255,255,0.4)'}}>▾</span>
          </div>
          {/* Tổng lương */}
          <div style={{fontSize:11,color:'rgba(255,255,255,0.5)',fontWeight:700,letterSpacing:1}}>Tổng lương</div>
          <div style={{fontSize:13,fontWeight:900,color:'#ffcd3c',fontFamily:"'Oxanium',sans-serif"}}>{teamOvr}<span style={{fontSize:10,color:'rgba(255,255,255,0.4)',marginLeft:2}}>/{Math.min(99,teamOvr+9)}</span></div>
          <div style={{flex:1}}/>
          <button onClick={()=>setShowFormDrop(false)} style={{fontSize:11,color:'rgba(0,180,255,0.7)',background:'rgba(0,180,255,0.08)',border:'1px solid rgba(0,180,255,0.2)',borderRadius:6,padding:'4px 10px',cursor:'pointer',fontWeight:700}}>Đội hình</button>
        </div>

        {/* PITCH (vertical like Image 2 – FW at top, GK at bottom) */}
        <div style={{flex:1,position:'relative',overflow:'hidden'}}>
          {/* Grass */}
          <div style={{position:'absolute',inset:0,background:'linear-gradient(180deg,#1c7a2a 0%,#226030 50%,#1c7a2a 100%)'}}>
            {[0,1,2,3,4,5,6,7,8,9].map(i=><div key={i} style={{position:'absolute',top:`${i*10}%`,left:0,right:0,height:'10%',background:i%2===0?'rgba(0,0,0,0.05)':'rgba(255,255,255,0.02)'}}/>)}
          </div>
          {/* SVG lines */}
          <svg style={{position:'absolute',inset:0,width:'100%',height:'100%'}} preserveAspectRatio="none" viewBox="0 0 100 100">
            <rect x="3" y="2" width="94" height="96" fill="none" stroke="rgba(255,255,255,0.5)" strokeWidth="0.5"/>
            <line x1="3" y1="50" x2="97" y2="50" stroke="rgba(255,255,255,0.4)" strokeWidth="0.4"/>
            <circle cx="50" cy="50" r="12" fill="none" stroke="rgba(255,255,255,0.4)" strokeWidth="0.4"/>
            <circle cx="50" cy="50" r="1" fill="rgba(255,255,255,0.7)"/>
            <rect x="3" y="8" width="20" height="20" fill="none" stroke="rgba(255,255,255,0.3)" strokeWidth="0.4"/>
            <rect x="77" y="8" width="20" height="20" fill="none" stroke="rgba(255,255,255,0.3)" strokeWidth="0.4"/>
            <rect x="3" y="72" width="20" height="20" fill="none" stroke="rgba(255,255,255,0.3)" strokeWidth="0.4"/>
            <rect x="77" y="72" width="20" height="20" fill="none" stroke="rgba(255,255,255,0.3)" strokeWidth="0.4"/>
            <rect x="3" y="15" width="7" height="6" fill="none" stroke="rgba(255,255,255,0.2)" strokeWidth="0.3"/>
            <rect x="77" y="79" width="20" height="6" fill="none" stroke="rgba(255,255,255,0.2)" strokeWidth="0.3"/>
          </svg>

          {/* Player slots – Image 2 style: horizontal layout, FW top */}
          {fPos.map((pos,idx)=>{
            const player=squad.lineup[idx];
            // pos.matchX = 0 (GK side) to 1 (FW side) → convert to vertical: top = (1-matchX)*100%
            // pos.matchY = 0..1 = left to right → horizontal position
            const left=`${pos.matchY*100}%`;
            const top=`${(1-pos.matchX)*93+3}%`;
            const isSel=selSlot===idx;
            return(
              <div key={idx} style={{position:'absolute',left,top,transform:'translate(-50%,-50%)',zIndex:isSel?20:5,display:'flex',flexDirection:'column',alignItems:'center',gap:2}}>
                {player?(
                  <div style={{position:'relative',cursor:'pointer'}} onClick={()=>setSelSlot(idx)} onMouseEnter={()=>setHovCard(player)} onMouseLeave={()=>setHovCard(null)}>
                    <PlayerCard player={player} size="sm" selected={isSel}/>
                    <button onClick={e=>{e.stopPropagation();removeSlot(idx);}} style={{position:'absolute',top:-5,right:-5,width:16,height:16,borderRadius:'50%',background:'#c62828',border:'1px solid rgba(255,80,80,0.5)',color:'white',fontSize:9,fontWeight:900,cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',zIndex:10}}>×</button>
                  </div>
                ):(
                  <div onClick={()=>setSelSlot(idx)} style={{width:50,height:70,border:`2px dashed ${isSel?'#00b4ff':'rgba(255,255,255,0.35)'}`,borderRadius:8,display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',background:isSel?'rgba(0,180,255,0.12)':'rgba(0,0,0,0.35)',backdropFilter:'blur(3px)',cursor:'pointer',transition:'all 0.2s'}}>
                    <div style={{fontSize:9,fontWeight:800,color:isSel?'#00b4ff':'rgba(255,255,255,0.5)',letterSpacing:1}}>{pos.label}</div>
                    <div style={{fontSize:20,color:'rgba(255,255,255,0.3)'}}>+</div>
                  </div>
                )}
                <div style={{fontSize:8,fontWeight:800,color:'white',textShadow:'0 1px 4px rgba(0,0,0,0.9)',letterSpacing:1,pointerEvents:'none'}}>{pos.label}</div>
              </div>
            );
          })}

          {/* Hover card tooltip */}
          {hovCard&&(
            <div style={{position:'absolute',bottom:12,left:'50%',transform:'translateX(-50%)',zIndex:50,background:'rgba(5,8,18,0.95)',border:`1px solid ${rarColor(hovCard.rarity)}44`,borderRadius:12,padding:'10px 16px',pointerEvents:'none',backdropFilter:'blur(16px)',display:'flex',gap:16,alignItems:'center',minWidth:280}}>
              <div style={{fontFamily:"'Oxanium',sans-serif",fontWeight:900,fontSize:28,color:ovr2col(hovCard.ovr)}}>{hovCard.ovr}</div>
              <div>
                <div style={{fontWeight:800,fontSize:14,color:'white'}}>{hovCard.name}</div>
                <div style={{fontSize:11,color:'rgba(255,255,255,0.5)',fontWeight:600}}>{hovCard.position} · Lv{hovCard.level} · {hovCard.nation}</div>
              </div>
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:4,marginLeft:'auto'}}>
                {Object.entries(hovCard.stats).map(([k,v])=>(
                  <div key={k} style={{textAlign:'center',fontSize:10}}>
                    <div style={{fontWeight:700,color:'rgba(255,255,255,0.5)'}}>{k.toUpperCase()}</div>
                    <div style={{fontWeight:900,color:ovr2col(v as number)}}>{v}</div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── RIGHT PANEL ── */}
      <div style={{width:290,background:'rgba(5,8,18,0.97)',borderLeft:'1px solid rgba(0,180,255,0.15)',display:'flex',flexDirection:'column',overflow:'hidden'}}>
        <div style={{padding:'12px 14px',borderBottom:'1px solid rgba(0,180,255,0.1)'}}>
          <div style={{fontFamily:"'Oxanium',sans-serif",fontWeight:800,fontSize:14,letterSpacing:3,marginBottom:8}}>
            {selSlot!==null?`CHỌN ${fPos[selSlot]?.label}`:'KHO CẦU THỦ'}
          </div>
          <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="🔍 Tìm kiếm..." style={{width:'100%',background:'rgba(255,255,255,0.05)',border:'1px solid rgba(0,180,255,0.2)',borderRadius:8,padding:'7px 10px',color:'white',fontSize:12,fontWeight:600,outline:'none',boxSizing:'border-box'}}/>
          {selSlot!==null&&<button onClick={()=>setSelSlot(null)} style={{width:'100%',marginTop:6,padding:'5px 0',borderRadius:6,background:'rgba(255,80,80,0.1)',border:'1px solid rgba(255,80,80,0.25)',color:'rgba(255,100,100,0.9)',fontSize:11,fontWeight:800,cursor:'pointer',letterSpacing:1}}>Hủy chọn slot</button>}
        </div>

        <div style={{flex:1,overflowY:'auto',padding:'6px'}}>
          {available.length===0&&<div style={{padding:'20px',textAlign:'center',color:'rgba(255,255,255,0.3)',fontSize:13}}>{selSlot!==null?'Không có cầu thủ':'Tất cả đã vào đội'}</div>}
          {available.map(p=>(
            <div key={p.id} onClick={()=>selSlot!==null&&selectPlayer(p)}
              style={{display:'flex',alignItems:'center',gap:8,padding:'8px 10px',borderRadius:10,marginBottom:3,cursor:selSlot!==null?'pointer':'default',border:'1px solid rgba(255,255,255,0.05)',background:'rgba(255,255,255,0.02)',transition:'all 0.12s'}}
              onMouseEnter={e=>{(e.currentTarget as HTMLElement).style.background=selSlot!==null?'rgba(0,180,255,0.08)':'rgba(255,255,255,0.04)';(e.currentTarget as HTMLElement).style.borderColor='rgba(0,180,255,0.2)';}}
              onMouseLeave={e=>{(e.currentTarget as HTMLElement).style.background='rgba(255,255,255,0.02)';(e.currentTarget as HTMLElement).style.borderColor='rgba(255,255,255,0.05)';}}>
              {/* OVR badge */}
              <div style={{width:38,height:38,borderRadius:8,display:'flex',alignItems:'center',justifyContent:'center',fontSize:13,fontWeight:900,color:rarColor(p.rarity),background:`${rarColor(p.rarity)}18`,border:`1px solid ${rarColor(p.rarity)}33`,fontFamily:"'Oxanium',sans-serif",flexShrink:0}}>{p.ovr}</div>
              <div style={{flex:1,minWidth:0}}>
                <div style={{fontWeight:800,fontSize:12,color:selSlot!==null?'white':'rgba(255,255,255,0.8)',whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'}}>{p.name}</div>
                <div style={{fontSize:9,color:'rgba(255,255,255,0.4)',fontWeight:600}}>{p.position} · Lv{p.level}</div>
              </div>
              {/* Stat mini bar */}
              <div style={{display:'grid',gridTemplateColumns:'1fr',gap:1,width:36}}>
                {[p.stats.pac,p.stats.sho,p.stats.dri].map((v,i)=>(
                  <div key={i} style={{height:3,background:'rgba(255,255,255,0.08)',borderRadius:99,overflow:'hidden'}}>
                    <div style={{height:'100%',background:ovr2col(v),width:`${v}%`,borderRadius:99}}/>
                  </div>
                ))}
              </div>
              <button onClick={e=>{e.stopPropagation();setConfirmSell(p);}} style={{width:26,height:26,borderRadius:6,background:'rgba(198,40,40,0.12)',border:'1px solid rgba(198,40,40,0.25)',color:'#ff5555',fontSize:11,cursor:'pointer',flexShrink:0,display:'flex',alignItems:'center',justifyContent:'center'}}>🗑</button>
            </div>
          ))}
        </div>

        {/* Team stats footer */}
        <div style={{padding:'10px 14px',borderTop:'1px solid rgba(0,180,255,0.1)',background:'rgba(0,0,0,0.3)',display:'flex',justifyContent:'space-between',alignItems:'center',flexShrink:0}}>
          <div style={{textAlign:'center'}}>
            <div style={{fontSize:9,color:'rgba(255,255,255,0.4)',fontWeight:700,letterSpacing:'0.2em',marginBottom:2}}>OVR TB</div>
            <div style={{fontFamily:"'Oxanium',sans-serif",fontWeight:900,fontSize:20,color:'#ffcd3c'}}>{teamOvr}</div>
          </div>
          <div style={{textAlign:'center'}}>
            <div style={{fontSize:9,color:'rgba(255,255,255,0.4)',fontWeight:700,letterSpacing:'0.2em',marginBottom:2}}>CẦU THỦ</div>
            <div style={{fontFamily:"'Oxanium',sans-serif",fontWeight:900,fontSize:20,color:'white'}}>{squad.lineup.filter(Boolean).length}/11</div>
          </div>
          <div style={{textAlign:'center'}}>
            <div style={{fontSize:9,color:'rgba(255,255,255,0.4)',fontWeight:700,letterSpacing:'0.2em',marginBottom:2}}>GIÁ TRỊ</div>
            <div style={{fontFamily:"'Oxanium',sans-serif",fontWeight:900,fontSize:14,color:'#00d4a0'}}>🪙{(totalVal/1000).toFixed(0)}K</div>
          </div>
        </div>
      </div>

      {/* Confirm sell */}
      {confirmSell&&(
        <div style={{position:'fixed',inset:0,zIndex:100,background:'rgba(0,0,0,0.85)',backdropFilter:'blur(12px)',display:'flex',alignItems:'center',justifyContent:'center'}}>
          <div style={{background:'#0d1424',border:'1px solid rgba(0,180,255,0.2)',borderRadius:16,padding:'28px 32px',maxWidth:320,textAlign:'center'}}>
            <div style={{fontSize:32,marginBottom:12}}>🗑️</div>
            <div style={{fontFamily:"'Oxanium',sans-serif",fontWeight:800,fontSize:20,marginBottom:6}}>BÁN CẦU THỦ?</div>
            <div style={{fontSize:14,color:'rgba(255,255,255,0.7)',marginBottom:8}}>{confirmSell.name}</div>
            <div style={{display:'flex',alignItems:'center',justifyContent:'center',gap:8,marginBottom:20}}>
              <PlayerCard player={confirmSell} size="xs"/>
              <div style={{textAlign:'left'}}>
                <div style={{fontSize:12,color:'rgba(255,255,255,0.5)'}}>OVR: <b style={{color:'#ffcd3c'}}>{confirmSell.ovr}</b></div>
                <div style={{fontSize:18,fontWeight:900,color:'#00e676',fontFamily:"'Oxanium',sans-serif"}}>+🪙{playerValue(confirmSell).toLocaleString()}</div>
              </div>
            </div>
            <div style={{display:'flex',gap:10}}>
              <button onClick={()=>setConfirmSell(null)} style={{flex:1,padding:'10px 0',borderRadius:8,background:'rgba(255,255,255,0.05)',border:'1px solid rgba(255,255,255,0.12)',color:'white',fontWeight:800,cursor:'pointer'}}>Hủy</button>
              <button onClick={()=>sellPlayer(confirmSell)} style={{flex:1,padding:'10px 0',borderRadius:8,background:'rgba(198,40,40,0.7)',border:'1px solid rgba(255,80,80,0.4)',color:'white',fontWeight:800,cursor:'pointer'}}>Bán ngay</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
