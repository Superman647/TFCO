import React, { useState, useEffect } from 'react';
import { Player, PlayerStats } from '../types';
import PlayerCard from '../components/PlayerCard';

interface Props { inventory:Player[]; setInventory:React.Dispatch<React.SetStateAction<Player[]>>; coins:number; setCoins:React.Dispatch<React.SetStateAction<number>>; }

const STAT_META:{key:keyof PlayerStats;label:string;icon:string;time:number;cost:number}[]=[
  {key:'pac',label:'Tốc độ',icon:'⚡',time:30,cost:50},
  {key:'sho',label:'Sút',icon:'🎯',time:45,cost:80},
  {key:'pas',label:'Chuyền',icon:'🅿️',time:35,cost:60},
  {key:'dri',label:'Rê bóng',icon:'🏃',time:40,cost:70},
  {key:'def',label:'Phòng thủ',icon:'🛡️',time:50,cost:90},
  {key:'phy',label:'Thể lực',icon:'💪',time:55,cost:100},
];

function rarColor(r:string){ return({SUPER_LEGENDARY:'#b060ff',GOLD:'#ffcd3c',SILVER:'#a0b0c0',BRONZE:'#c08040'})[r]||'#888'; }

export default function TrainScreen({inventory,setInventory,coins,setCoins}:Props){
  const [sel,setSel]=useState<Player|null>(null);
  const [now,setNow]=useState(Date.now());
  const [search,setSearch]=useState('');

  useEffect(()=>{
    const iv=setInterval(()=>{
      setNow(Date.now());
      setInventory(prev=>{
        let changed=false;
        const next=prev.map(p=>{
          if(p.training&&p.training.endTime<=Date.now()){
            changed=true;
            const s=p.training.stat;
            return{...p,stats:{...p.stats,[s]:Math.min(99,p.stats[s]+1)},training:undefined};
          }
          return p;
        });
        if(changed&&sel){ const updated=next.find(p=>p.id===sel.id); if(updated)setSel(updated); }
        return changed?next:prev;
      });
    },1000);
    return()=>clearInterval(iv);
  },[]);

  const startTrain=(stat:keyof PlayerStats,time:number,cost:number)=>{
    if(!sel||coins<cost)return;
    if(sel.training)return;
    setCoins(c=>c-cost);
    const end=Date.now()+time*1000;
    const updated={...sel,training:{stat,endTime:end}};
    setInventory(prev=>prev.map(p=>p.id===sel.id?updated:p));
    setSel(updated);
  };

  const filtered=inventory.filter(p=>!search||p.name.toLowerCase().includes(search.toLowerCase()));

  return (
    <div style={{height:'100%',display:'flex',background:'#05080f',overflow:'hidden',fontFamily:"'Exo 2',sans-serif"}}>
      {/* Left: player list */}
      <div style={{width:300,background:'rgba(5,11,26,0.97)',borderRight:'1px solid rgba(0,180,255,0.12)',display:'flex',flexDirection:'column'}}>
        <div style={{padding:'14px 16px',borderBottom:'1px solid rgba(0,180,255,0.1)'}}>
          <div style={{fontFamily:"'Oxanium',sans-serif",fontWeight:800,fontSize:16,letterSpacing:3,marginBottom:10}}>🏋️ TRUNG TÂM LUYỆN TẬP</div>
          <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="🔍 Tìm kiếm..." style={{width:'100%',background:'rgba(255,255,255,0.05)',border:'1px solid rgba(0,180,255,0.2)',borderRadius:8,padding:'8px 12px',color:'white',fontSize:13,fontWeight:600,outline:'none',boxSizing:'border-box'}} />
        </div>
        <div style={{flex:1,overflowY:'auto',padding:'8px'}}>
          {filtered.map(p=>{
            const isTraining=!!p.training;
            const remaining=p.training?Math.max(0,Math.ceil((p.training.endTime-now)/1000)):0;
            return(
              <div key={p.id} onClick={()=>{setSel(p);}} style={{display:'flex',alignItems:'center',gap:10,padding:'9px 12px',borderRadius:10,marginBottom:4,cursor:'pointer',border:`1px solid ${sel?.id===p.id?'rgba(0,180,255,0.4)':'rgba(255,255,255,0.06)'}`,background:sel?.id===p.id?'rgba(0,180,255,0.08)':'rgba(255,255,255,0.02)',transition:'all 0.15s'}}>
                <div style={{width:40,height:40,borderRadius:8,display:'flex',alignItems:'center',justifyContent:'center',fontSize:15,fontWeight:900,color:rarColor(p.rarity),background:`${rarColor(p.rarity)}18`,border:`1px solid ${rarColor(p.rarity)}33`,fontFamily:"'Oxanium',sans-serif",flexShrink:0}}>{p.ovr}</div>
                <div style={{flex:1,minWidth:0}}>
                  <div style={{fontWeight:800,fontSize:13,whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'}}>{p.name}</div>
                  <div style={{fontSize:10,color:isTraining?'#00e676':'rgba(255,255,255,0.4)',fontWeight:700}}>
                    {isTraining?`⏳ ${remaining}s còn lại`:`${p.position} · Lv${p.level}`}
                  </div>
                </div>
                {isTraining&&<div style={{width:8,height:8,borderRadius:'50%',background:'#00e676',animation:'pulse 1s ease-in-out infinite'}} />}
              </div>
            );
          })}
        </div>
      </div>

      {/* Right: train options */}
      <div style={{flex:1,display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',padding:32,overflowY:'auto'}}>
        {!sel?(
          <div style={{textAlign:'center',color:'rgba(255,255,255,0.3)'}}>
            <div style={{fontSize:64,marginBottom:16}}>🏋️</div>
            <div style={{fontFamily:"'Oxanium',sans-serif",fontWeight:800,fontSize:22,letterSpacing:3,marginBottom:8}}>TRUNG TÂM LUYỆN TẬP</div>
            <div style={{fontSize:14,fontWeight:600}}>Chọn một cầu thủ để bắt đầu luyện tập</div>
          </div>
        ):(
          <div style={{width:'100%',maxWidth:600,display:'flex',flexDirection:'column',gap:20,alignItems:'center'}}>
            <PlayerCard player={sel} size="lg" />
            {sel.training?(
              <div style={{width:'100%',background:'rgba(0,200,80,0.08)',border:'1px solid rgba(0,200,80,0.3)',borderRadius:12,padding:'20px',textAlign:'center'}}>
                <div style={{fontSize:14,fontWeight:700,color:'rgba(255,255,255,0.6)',marginBottom:8}}>Đang luyện tập</div>
                <div style={{fontFamily:"'Oxanium',sans-serif",fontWeight:800,fontSize:32,color:'#00e676',marginBottom:8}}>
                  ⏳ {Math.max(0,Math.ceil((sel.training.endTime-now)/1000))}s
                </div>
                <div style={{fontSize:13,color:'rgba(255,255,255,0.5)'}}>
                  Chỉ số <b style={{color:'#00e676'}}>{STAT_META.find(s=>s.key===sel.training!.stat)?.label}</b> sẽ tăng 1 khi xong
                </div>
                <div style={{marginTop:12,height:6,background:'rgba(255,255,255,0.1)',borderRadius:99,overflow:'hidden'}}>
                  <div style={{height:'100%',borderRadius:99,background:'linear-gradient(90deg,#00b4ff,#00e676)',width:`${Math.max(0,100-((sel.training.endTime-now)/((STAT_META.find(s=>s.key===sel.training!.stat)?.time||30)*1000))*100)}%`,transition:'width 1s linear'}} />
                </div>
              </div>
            ):(
              <div style={{width:'100%'}}>
                <div style={{fontSize:11,fontWeight:700,color:'rgba(0,180,255,0.7)',letterSpacing:'0.3em',marginBottom:12,textAlign:'center'}}>CHỌN CHỈ SỐ ĐỂ LUYỆN TẬP</div>
                <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10}}>
                  {STAT_META.map(sm=>{
                    const canTrain=coins>=sm.cost;
                    const curVal=sel.stats[sm.key];
                    return(
                      <button key={sm.key} onClick={()=>startTrain(sm.key,sm.time,sm.cost)} disabled={!canTrain||curVal>=99} style={{padding:'14px 16px',borderRadius:10,background:canTrain&&curVal<99?'rgba(0,180,255,0.08)':'rgba(255,255,255,0.03)',border:`1px solid ${canTrain&&curVal<99?'rgba(0,180,255,0.3)':'rgba(255,255,255,0.07)'}`,cursor:canTrain&&curVal<99?'pointer':'not-allowed',transition:'all 0.15s',textAlign:'left',display:'flex',flexDirection:'column',gap:6}}
                        onMouseEnter={e=>{if(canTrain&&curVal<99)(e.currentTarget as HTMLElement).style.background='rgba(0,180,255,0.15)';}}
                        onMouseLeave={e=>{if(canTrain&&curVal<99)(e.currentTarget as HTMLElement).style.background='rgba(0,180,255,0.08)';}}>
                        <div style={{display:'flex',alignItems:'center',justifyContent:'space-between'}}>
                          <div style={{display:'flex',alignItems:'center',gap:6}}>
                            <span style={{fontSize:20}}>{sm.icon}</span>
                            <span style={{fontWeight:800,fontSize:13,color:canTrain?'white':'rgba(255,255,255,0.4)'}}>{sm.label}</span>
                          </div>
                          <span style={{fontSize:16,fontWeight:900,color:curVal>=90?'#00e676':curVal>=75?'#69f0ae':curVal>=60?'#ffcd3c':'#ff9800',fontFamily:"'Oxanium',sans-serif"}}>{curVal}</span>
                        </div>
                        <div style={{height:4,background:'rgba(255,255,255,0.08)',borderRadius:99,overflow:'hidden'}}>
                          <div style={{height:'100%',borderRadius:99,width:`${curVal}%`,background:curVal>=90?'#00e676':curVal>=75?'#69f0ae':curVal>=60?'#ffcd3c':'#ff9800'}} />
                        </div>
                        <div style={{display:'flex',justifyContent:'space-between',fontSize:10,color:'rgba(255,255,255,0.45)',fontWeight:700}}>
                          <span>🪙 {sm.cost} &nbsp;·&nbsp; ⏱ {sm.time}s</span>
                          <span style={{color:canTrain?'rgba(0,200,100,0.7)':'rgba(255,80,80,0.7)'}}>{canTrain?'+1 sau khi xong':'Không đủ coins'}</span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
