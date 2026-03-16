import React, { useState } from 'react';
import { Player, Squad, Position } from '../types';
import PlayerCard from '../components/PlayerCard';
import { FORMATION_POSITIONS } from '../constants';

interface Props { squad:Squad; setSquad:React.Dispatch<React.SetStateAction<Squad>>; inventory:Player[]; setInventory:React.Dispatch<React.SetStateAction<Player[]>>; coins:number; setCoins:React.Dispatch<React.SetStateAction<number>>; }

const FORMATIONS = ['4-3-3','4-4-2','3-5-2'];

function getPlayerValue(p:Player){ return Math.floor(Math.pow(Math.max(0,p.ovr-50),2.5)*1.5)+50; }

function avgOvr(lineup:(Player|null)[]){
  const ps=lineup.filter(Boolean) as Player[];
  return ps.length?Math.round(ps.reduce((s,p)=>s+p.ovr,0)/ps.length):0;
}

export default function SquadScreen({squad,setSquad,inventory,setInventory,coins,setCoins}:Props){
  const [sel,setSel]=useState<number|null>(null);
  const [showForm,setShowForm]=useState(false);
  const [search,setSearch]=useState('');
  const [confirmSell,setConfirmSell]=useState<Player|null>(null);

  const changeFormation=(f:string)=>{ const np=FORMATION_POSITIONS[f]; const nl=new Array(11).fill(null); squad.lineup.forEach(p=>{ if(p){ const mi=np.findIndex((pos,i)=>pos.pos===p.position&&!nl[i]); if(mi!==-1)nl[mi]=p; } }); setSquad({formation:f,lineup:nl}); setShowForm(false); };
  const selectPlayer=(p:Player)=>{ if(sel===null)return; setSquad(prev=>{const nl=[...prev.lineup];nl[sel]=p;return{...prev,lineup:nl};}); setSel(null); };
  const removeFromSlot=(idx:number)=>{ setSquad(prev=>{const nl=[...prev.lineup];nl[idx]=null;return{...prev,lineup:nl};}); };
  const availPlayers=()=>{ const ids=new Set(squad.lineup.filter(Boolean).map(p=>p!.id)); return inventory.filter(p=>!ids.has(p.id)).filter(p=>!search||p.name.toLowerCase().includes(search.toLowerCase())); };
  const sellPlayer=(p:Player)=>{ setCoins(c=>c+getPlayerValue(p)); setInventory(inv=>inv.filter(x=>x.id!==p.id)); setSquad(prev=>({...prev,lineup:prev.lineup.map(x=>x?.id===p.id?null:x)})); setConfirmSell(null); };

  const fPositions=FORMATION_POSITIONS[squad.formation]||FORMATION_POSITIONS['4-3-3'];
  const teamOvr=avgOvr(squad.lineup);

  const rarityColor=(r:string)=>({SUPER_LEGENDARY:'#b060ff',GOLD:'#ffcd3c',SILVER:'#aabbcc',BRONZE:'#c08040'}[r]||'#aaa');

  return (
    <div style={{height:'100%',display:'flex',background:'#05080f',overflow:'hidden',fontFamily:"'Exo 2',sans-serif"}}>
      {/* ── PITCH AREA ── */}
      <div style={{flex:1,position:'relative',overflow:'hidden',display:'flex',flexDirection:'column'}}>
        {/* Pitch bg */}
        <div style={{position:'absolute',inset:0,background:'linear-gradient(180deg,#1c7a2a 0%,#217830 50%,#1c7a2a 100%)'}}>
          {[0,1,2,3,4,5,6,7].map(i=><div key={i} style={{position:'absolute',top:`${i*12.5}%`,left:0,right:0,height:'12.5%',background:i%2===0?'rgba(0,0,0,0.06)':'rgba(255,255,255,0.03)'}} />)}
        </div>
        {/* Pitch lines */}
        <svg style={{position:'absolute',inset:0,width:'100%',height:'100%'}} preserveAspectRatio="none">
          <rect x="3%" y="3%" width="94%" height="94%" fill="none" stroke="rgba(255,255,255,0.5)" strokeWidth="2"/>
          <line x1="50%" y1="3%" x2="50%" y2="97%" stroke="rgba(255,255,255,0.4)" strokeWidth="1.5"/>
          <circle cx="50%" cy="50%" r="12%" fill="none" stroke="rgba(255,255,255,0.4)" strokeWidth="1.5"/>
          <circle cx="50%" cy="50%" r="1%" fill="rgba(255,255,255,0.7)"/>
          <rect x="3%" y="33%" width="14%" height="34%" fill="none" stroke="rgba(255,255,255,0.35)" strokeWidth="1.5"/>
          <rect x="83%" y="33%" width="14%" height="34%" fill="none" stroke="rgba(255,255,255,0.35)" strokeWidth="1.5"/>
          <rect x="3%" y="41%" width="5%" height="18%" fill="none" stroke="rgba(255,255,255,0.3)" strokeWidth="1"/>
          <rect x="92%" y="41%" width="5%" height="18%" fill="none" stroke="rgba(255,255,255,0.3)" strokeWidth="1"/>
        </svg>

        {/* Top controls */}
        <div style={{position:'relative',zIndex:10,display:'flex',alignItems:'center',gap:10,padding:'12px 16px'}}>
          <div style={{position:'relative'}}>
            <button onClick={()=>setShowForm(s=>!s)} style={{background:'rgba(5,11,26,0.85)',border:'1px solid rgba(0,180,255,0.3)',borderRadius:8,padding:'7px 14px',color:'white',fontWeight:800,fontSize:13,cursor:'pointer',display:'flex',alignItems:'center',gap:6,backdropFilter:'blur(8px)'}}>
              ⚙ Đội hình: {squad.formation} ▾
            </button>
            {showForm&&(
              <div style={{position:'absolute',top:'100%',left:0,marginTop:4,background:'rgba(5,11,26,0.98)',border:'1px solid rgba(0,180,255,0.25)',borderRadius:8,overflow:'hidden',zIndex:20,minWidth:140,boxShadow:'0 8px 32px rgba(0,0,0,0.6)'}}>
                {FORMATIONS.map(f=>(
                  <div key={f} onClick={()=>changeFormation(f)} style={{padding:'10px 16px',cursor:'pointer',fontWeight:800,fontSize:13,color:squad.formation===f?'#00b4ff':'rgba(255,255,255,0.7)',background:squad.formation===f?'rgba(0,180,255,0.1)':'transparent',borderBottom:'1px solid rgba(255,255,255,0.05)'}}
                    onMouseEnter={e=>{if(squad.formation!==f)(e.currentTarget as HTMLElement).style.background='rgba(255,255,255,0.05)';}}
                    onMouseLeave={e=>{if(squad.formation!==f)(e.currentTarget as HTMLElement).style.background='transparent';}}>
                    {f}
                  </div>
                ))}
              </div>
            )}
          </div>
          <div style={{background:'rgba(5,11,26,0.75)',border:'1px solid rgba(255,205,60,0.2)',borderRadius:8,padding:'6px 12px',fontSize:12,fontWeight:800,color:'#ffcd3c',backdropFilter:'blur(8px)'}}>
            OVR ⌀ {teamOvr}
          </div>
          <div style={{background:'rgba(5,11,26,0.75)',border:'1px solid rgba(255,255,255,0.1)',borderRadius:8,padding:'6px 12px',fontSize:12,fontWeight:700,color:'rgba(255,255,255,0.6)',backdropFilter:'blur(8px)'}}>
            {squad.lineup.filter(Boolean).length}/11 cầu thủ
          </div>
          <div style={{flex:1}} />
          <div style={{fontSize:11,color:'rgba(255,255,255,0.4)',fontWeight:600}}>Click vào ô để chọn cầu thủ</div>
        </div>

        {/* Player slots on pitch */}
        <div style={{flex:1,position:'relative'}}>
          {fPositions.map((pos,idx)=>{
            const player=squad.lineup[idx];
            // Convert matchX/matchY (0-1) to screen % – note: matchX is left-right, matchY is top-bottom
            // Formation is set up as left=GK, right=FW. We display vertically (top=FW, bottom=GK)
            const left=`${pos.matchY*100}%`;
            const top=`${(1-pos.matchX)*100}%`;
            return (
              <div key={idx} style={{position:'absolute',left,top,transform:'translate(-50%,-50%)',display:'flex',flexDirection:'column',alignItems:'center',gap:4,zIndex:5,cursor:'pointer'}}>
                {player ? (
                  <div style={{position:'relative'}} onClick={()=>setSel(idx)}>
                    <PlayerCard player={player} size="sm" selected={sel===idx} />
                    <button onClick={e=>{e.stopPropagation();removeFromSlot(idx);}} style={{position:'absolute',top:-6,right:-6,width:18,height:18,borderRadius:'50%',background:'#c62828',border:'1px solid rgba(255,100,100,0.5)',color:'white',fontSize:10,fontWeight:900,cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',zIndex:10}}>×</button>
                  </div>
                ) : (
                  <div onClick={()=>setSel(idx)} style={{width:52,height:74,border:`2px dashed ${sel===idx?'#00b4ff':'rgba(255,255,255,0.3)'}`,borderRadius:8,display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',background:sel===idx?'rgba(0,180,255,0.1)':'rgba(0,0,0,0.3)',backdropFilter:'blur(4px)',transition:'all 0.2s'}}>
                    <div style={{fontSize:9,fontWeight:800,color:sel===idx?'#00b4ff':'rgba(255,255,255,0.4)',letterSpacing:1}}>{pos.label}</div>
                    <div style={{fontSize:18,marginTop:2,opacity:0.5}}>+</div>
                  </div>
                )}
                <div style={{fontSize:9,fontWeight:800,color:'rgba(255,255,255,0.7)',textShadow:'0 1px 4px rgba(0,0,0,0.9)',letterSpacing:1}}>{pos.label}</div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── RIGHT PANEL: Player list ── */}
      <div style={{width:300,background:'rgba(5,11,26,0.97)',borderLeft:'1px solid rgba(0,180,255,0.15)',display:'flex',flexDirection:'column',overflow:'hidden'}}>
        <div style={{padding:'14px 16px',borderBottom:'1px solid rgba(0,180,255,0.1)'}}>
          <div style={{fontFamily:"'Oxanium',sans-serif",fontWeight:800,fontSize:14,letterSpacing:3,marginBottom:10}}>
            {sel!==null?`CHỌN CHO ${fPositions[sel]?.label}`:'KHO CẦU THỦ'}
          </div>
          <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="🔍 Tìm kiếm..." style={{width:'100%',background:'rgba(255,255,255,0.05)',border:'1px solid rgba(0,180,255,0.2)',borderRadius:8,padding:'8px 12px',color:'white',fontSize:13,fontWeight:600,outline:'none',boxSizing:'border-box'}} />
        </div>
        <div style={{flex:1,overflowY:'auto',padding:'8px'}}>
          {availPlayers().length===0?(
            <div style={{padding:'32px 16px',textAlign:'center',color:'rgba(255,255,255,0.3)',fontSize:13}}>
              {sel!==null?'Không có cầu thủ phù hợp':'Tất cả đã vào đội'}
            </div>
          ):availPlayers().map(p=>(
            <div key={p.id} style={{display:'flex',alignItems:'center',gap:10,padding:'8px 10px',borderRadius:10,marginBottom:4,background:'rgba(255,255,255,0.03)',border:'1px solid rgba(255,255,255,0.06)',cursor:'pointer',transition:'all 0.15s'}}
              onClick={()=>sel!==null?selectPlayer(p):undefined}
              onMouseEnter={e=>{(e.currentTarget as HTMLElement).style.background='rgba(0,180,255,0.07)';(e.currentTarget as HTMLElement).style.borderColor='rgba(0,180,255,0.25)';}}
              onMouseLeave={e=>{(e.currentTarget as HTMLElement).style.background='rgba(255,255,255,0.03)';(e.currentTarget as HTMLElement).style.borderColor='rgba(255,255,255,0.06)';}}>
              <div style={{width:36,height:36,borderRadius:8,background:`${rarityColor(p.rarity)}22`,border:`1px solid ${rarityColor(p.rarity)}44`,display:'flex',alignItems:'center',justifyContent:'center',fontSize:14,fontWeight:900,color:rarityColor(p.rarity),fontFamily:"'Oxanium',sans-serif",flexShrink:0}}>{p.ovr}</div>
              <div style={{flex:1,minWidth:0}}>
                <div style={{fontWeight:800,fontSize:13,color:'white',whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'}}>{p.name}</div>
                <div style={{fontSize:10,color:'rgba(255,255,255,0.45)',fontWeight:600}}>{p.position} · Lv{p.level}</div>
              </div>
              <button onClick={e=>{e.stopPropagation();setConfirmSell(p);}} style={{width:28,height:28,borderRadius:6,background:'rgba(198,40,40,0.15)',border:'1px solid rgba(198,40,40,0.3)',color:'#ff5555',fontSize:12,cursor:'pointer',flexShrink:0,display:'flex',alignItems:'center',justifyContent:'center'}}>🗑</button>
            </div>
          ))}
        </div>
        {sel!==null&&(
          <div style={{padding:'10px 12px',borderTop:'1px solid rgba(0,180,255,0.1)',background:'rgba(0,180,255,0.05)'}}>
            <button onClick={()=>setSel(null)} style={{width:'100%',padding:'9px',borderRadius:8,background:'rgba(255,255,255,0.06)',border:'1px solid rgba(255,255,255,0.15)',color:'white',fontWeight:800,fontSize:13,cursor:'pointer'}}>Hủy chọn</button>
          </div>
        )}
      </div>

      {/* Confirm sell modal */}
      {confirmSell&&(
        <div style={{position:'fixed',inset:0,zIndex:100,background:'rgba(0,0,0,0.8)',backdropFilter:'blur(12px)',display:'flex',alignItems:'center',justifyContent:'center'}}>
          <div style={{background:'#0d1424',border:'1px solid rgba(0,180,255,0.2)',borderRadius:16,padding:'28px 32px',maxWidth:340,textAlign:'center'}}>
            <div style={{fontSize:32,marginBottom:12}}>🗑️</div>
            <div style={{fontFamily:"'Oxanium',sans-serif",fontWeight:800,fontSize:20,marginBottom:6}}>BÁN CẦU THỦ?</div>
            <div style={{fontSize:14,color:'rgba(255,255,255,0.7)',marginBottom:16}}>{confirmSell.name} (OVR {confirmSell.ovr})</div>
            <div style={{fontSize:18,fontWeight:800,color:'#ffcd3c',marginBottom:20}}>+🪙 {getPlayerValue(confirmSell).toLocaleString()} coins</div>
            <div style={{display:'flex',gap:10}}>
              <button onClick={()=>setConfirmSell(null)} style={{flex:1,padding:'10px 0',borderRadius:8,background:'rgba(255,255,255,0.06)',border:'1px solid rgba(255,255,255,0.15)',color:'white',fontWeight:800,cursor:'pointer'}}>Hủy</button>
              <button onClick={()=>sellPlayer(confirmSell)} style={{flex:1,padding:'10px 0',borderRadius:8,background:'rgba(198,40,40,0.7)',border:'1px solid rgba(255,80,80,0.4)',color:'white',fontWeight:800,cursor:'pointer'}}>Bán</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
