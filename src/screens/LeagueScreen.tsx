import React, { useState, useEffect } from 'react';
import { Difficulty } from '../types';

interface Props { teamName:string; onBack:()=>void; onStartMatch:(opp:string,diff:Difficulty)=>void; }
interface TeamEntry { name:string; played:number; won:number; drawn:number; lost:number; gf:number; ga:number; points:number; isUser?:boolean; form:string[]; }

const AI_TEAMS=['FC Barcelona','Real Madrid','Manchester City','Bayern Munich','PSG','Juventus','AC Milan','Liverpool','Chelsea','Arsenal'];
const FORMS=['W','W','D','L','W'];

function generateLeague(teamName:string):TeamEntry[]{
  const t:TeamEntry[]=[{name:teamName,played:0,won:0,drawn:0,lost:0,gf:0,ga:0,points:0,isUser:true,form:[]}];
  AI_TEAMS.forEach(n=>{ const w=Math.floor(Math.random()*8); const d=Math.floor(Math.random()*4); const l=8-w-d; const gf=w*2+d+Math.floor(Math.random()*5); const ga=l*2+d+Math.floor(Math.random()*5); t.push({name:n,played:w+d+l,won:w,drawn:d,lost:Math.max(0,l),gf,ga,points:w*3+d,isUser:false,form:Array.from({length:5},()=>Math.random()>0.4?'W':Math.random()>0.5?'D':'L')}); });
  return t.sort((a,b)=>b.points-a.points||(b.gf-b.ga)-(a.gf-a.ga));
}

export default function LeagueScreen({teamName,onBack,onStartMatch}:Props){
  const [table,setTable]=useState<TeamEntry[]>(()=>{
    const saved=localStorage.getItem(`league_${teamName}`);
    return saved?JSON.parse(saved):generateLeague(teamName);
  });
  const [tab,setTab]=useState<'table'|'match'>('table');
  const [diff,setDiff]=useState<Difficulty>('MEDIUM');

  useEffect(()=>{ localStorage.setItem(`league_${teamName}`,JSON.stringify(table)); },[table]);

  const nextOpp=()=>{ const us=table.find(t=>t.isUser); const others=table.filter(t=>!t.isUser); return others[Math.floor(Math.random()*others.length)]; };

  const formColor=(f:string)=>({W:'#00e676',D:'#ffcd3c',L:'#ff5555'})[f]||'#888';

  const reset=()=>{ const t=generateLeague(teamName); setTable(t); localStorage.setItem(`league_${teamName}`,JSON.stringify(t)); };

  const userEntry=table.find(t=>t.isUser);
  const userPos=table.findIndex(t=>t.isUser)+1;

  return (
    <div style={{height:'100%',display:'flex',flexDirection:'column',background:'#05080f',overflow:'hidden',fontFamily:"'Exo 2',sans-serif"}}>
      {/* Header */}
      <div style={{padding:'12px 20px',borderBottom:'1px solid rgba(0,180,255,0.12)',background:'rgba(5,11,26,0.97)',display:'flex',alignItems:'center',gap:12}}>
        <button onClick={onBack} style={{background:'rgba(0,180,255,0.1)',border:'1px solid rgba(0,180,255,0.25)',borderRadius:8,padding:'6px 12px',color:'#00b4ff',fontWeight:800,fontSize:12,cursor:'pointer'}}>← Back</button>
        <div style={{fontFamily:"'Oxanium',sans-serif",fontWeight:800,fontSize:18,letterSpacing:3}}>🏆 CHAMPIONS LEAGUE</div>
        <div style={{flex:1}}/>
        <div style={{display:'flex',gap:4}}>
          {(['table','match'] as const).map(t=>(
            <button key={t} onClick={()=>setTab(t)} style={{padding:'6px 16px',borderRadius:8,background:tab===t?'rgba(0,180,255,0.2)':'rgba(255,255,255,0.04)',border:`1px solid ${tab===t?'rgba(0,180,255,0.4)':'rgba(255,255,255,0.08)'}`,color:tab===t?'#00b4ff':'rgba(255,255,255,0.6)',fontSize:12,fontWeight:800,cursor:'pointer'}}>
              {t==='table'?'Bảng XH':'Thi Đấu'}
            </button>
          ))}
        </div>
        <button onClick={reset} style={{padding:'6px 12px',borderRadius:8,background:'rgba(255,255,255,0.05)',border:'1px solid rgba(255,255,255,0.1)',color:'rgba(255,255,255,0.5)',fontSize:11,fontWeight:700,cursor:'pointer'}}>Reset</button>
      </div>

      <div style={{flex:1,overflowY:'auto',padding:'20px'}}>
        {tab==='table'?(
          <div style={{maxWidth:900,margin:'0 auto'}}>
            {/* User stat cards */}
            {userEntry&&(
              <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:12,marginBottom:24}}>
                {[['Vị trí',`#${userPos}`,'🏅'],[`Điểm số`,`${userEntry.points}pts`,'⚡'],['Hiệu số',`${userEntry.gf-userEntry.ga>0?'+':''}${userEntry.gf-userEntry.ga}`,'⚽'],['Trận đã đấu',`${userEntry.played}`,'📅']].map(([l,v,ic])=>(
                  <div key={l} style={{background:'rgba(0,180,255,0.06)',border:'1px solid rgba(0,180,255,0.15)',borderRadius:12,padding:'14px 16px',textAlign:'center'}}>
                    <div style={{fontSize:20,marginBottom:4}}>{ic}</div>
                    <div style={{fontFamily:"'Oxanium',sans-serif",fontWeight:900,fontSize:22,color:'white'}}>{v}</div>
                    <div style={{fontSize:10,color:'rgba(255,255,255,0.4)',fontWeight:700,letterSpacing:'0.2em',marginTop:2}}>{l}</div>
                  </div>
                ))}
              </div>
            )}

            {/* League table */}
            <div style={{background:'rgba(5,11,26,0.8)',border:'1px solid rgba(0,180,255,0.15)',borderRadius:14,overflow:'hidden'}}>
              <div style={{display:'grid',gridTemplateColumns:'36px 1fr 40px 40px 40px 40px 40px 40px 50px 80px',gap:0,padding:'10px 14px',background:'rgba(0,180,255,0.08)',borderBottom:'1px solid rgba(0,180,255,0.1)',fontSize:10,fontWeight:800,color:'rgba(255,255,255,0.5)',letterSpacing:'0.2em',textAlign:'center'}}>
                <span>#</span><span style={{textAlign:'left'}}>ĐỘI</span><span>TĐ</span><span>T</span><span>H</span><span>B</span><span>GF</span><span>GA</span><span>PTS</span><span>PHONG ĐỘ</span>
              </div>
              {table.map((t,i)=>(
                <div key={t.name} style={{display:'grid',gridTemplateColumns:'36px 1fr 40px 40px 40px 40px 40px 40px 50px 80px',gap:0,padding:'11px 14px',borderBottom:'1px solid rgba(255,255,255,0.04)',background:t.isUser?'rgba(0,180,255,0.07)':'transparent',alignItems:'center',transition:'background 0.15s'}}
                  onMouseEnter={e=>{if(!t.isUser)(e.currentTarget as HTMLElement).style.background='rgba(255,255,255,0.03)';}}
                  onMouseLeave={e=>{if(!t.isUser)(e.currentTarget as HTMLElement).style.background='transparent';}}>
                  <div style={{textAlign:'center',fontSize:13,fontWeight:800,color:i<4?'#00b4ff':i>6?'#ff5555':'rgba(255,255,255,0.5)'}}>{i+1}</div>
                  <div style={{display:'flex',alignItems:'center',gap:8}}>
                    <div style={{width:24,height:24,borderRadius:6,background:t.isUser?'#0066cc':'rgba(255,255,255,0.1)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:9,fontWeight:900,flexShrink:0}}>{t.name.substring(0,2).toUpperCase()}</div>
                    <span style={{fontWeight:t.isUser?800:600,color:t.isUser?'#00b4ff':'white',fontSize:13,whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'}}>{t.name}</span>
                    {t.isUser&&<span style={{fontSize:9,background:'rgba(0,180,255,0.2)',color:'#00b4ff',padding:'1px 5px',borderRadius:20,fontWeight:800}}>BẠN</span>}
                  </div>
                  {[t.played,t.won,t.drawn,t.lost,t.gf,t.ga].map((v,j)=>(
                    <div key={j} style={{textAlign:'center',fontSize:13,fontWeight:600,color:'rgba(255,255,255,0.7)'}}>{v}</div>
                  ))}
                  <div style={{textAlign:'center',fontFamily:"'Oxanium',sans-serif",fontWeight:900,fontSize:15,color:'#ffcd3c'}}>{t.points}</div>
                  <div style={{display:'flex',gap:3,justifyContent:'center'}}>
                    {(t.form.length?t.form:Array.from({length:5},()=>Math.random()>0.4?'W':Math.random()>0.5?'D':'L')).slice(-5).map((f,j)=>(
                      <div key={j} style={{width:14,height:14,borderRadius:4,background:formColor(f),fontSize:7,fontWeight:900,display:'flex',alignItems:'center',justifyContent:'center',color:'rgba(0,0,0,0.8)'}}>{f[0]}</div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
            <div style={{marginTop:12,display:'flex',gap:16,fontSize:11,color:'rgba(255,255,255,0.4)',fontWeight:600}}>
              <span style={{display:'flex',alignItems:'center',gap:4}}><span style={{width:10,height:10,borderRadius:3,background:'#00b4ff',display:'inline-block'}} />Top 4: UEFA Champions League</span>
              <span style={{display:'flex',alignItems:'center',gap:4}}><span style={{width:10,height:10,borderRadius:3,background:'#ff5555',display:'inline-block'}} />Relegation zone</span>
            </div>
          </div>
        ):(
          <div style={{maxWidth:600,margin:'0 auto',display:'flex',flexDirection:'column',gap:20}}>
            <div style={{fontFamily:"'Oxanium',sans-serif",fontWeight:800,fontSize:20,letterSpacing:3,textAlign:'center'}}>THI ĐẤU VÒNG BẢNG</div>
            {/* Difficulty */}
            <div>
              <div style={{fontSize:11,fontWeight:700,color:'rgba(255,255,255,0.5)',letterSpacing:'0.3em',marginBottom:10,textAlign:'center'}}>CHỌN ĐỘ KHÓ</div>
              <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:10}}>
                {(['EASY','MEDIUM','HARD'] as Difficulty[]).map((d,i)=>{
                  const [c,lbl]=[['#00d4a0','DỄ'],['#ffcd3c','VỪA'],['#ff5555','KHÓ']][i];
                  return (
                    <button key={d} onClick={()=>setDiff(d)} style={{padding:'12px 0',borderRadius:10,background:diff===d?`${c}22`:'rgba(255,255,255,0.04)',border:`2px solid ${diff===d?c:'rgba(255,255,255,0.08)'}`,color:diff===d?c:'rgba(255,255,255,0.5)',fontWeight:800,fontSize:14,cursor:'pointer',letterSpacing:2,transition:'all 0.15s'}}>{lbl}</button>
                  );
                })}
              </div>
            </div>
            {/* Match card */}
            <div style={{background:'rgba(5,11,26,0.8)',border:'1px solid rgba(0,180,255,0.2)',borderRadius:16,padding:'24px',textAlign:'center'}}>
              {(()=>{ const opp=nextOpp(); return opp?(
                <>
                  <div style={{fontSize:11,fontWeight:700,color:'rgba(255,255,255,0.4)',letterSpacing:'0.3em',marginBottom:16}}>TRẬN ĐẤU TIẾP THEO</div>
                  <div style={{display:'flex',alignItems:'center',justifyContent:'center',gap:20,marginBottom:20}}>
                    <div style={{textAlign:'center'}}>
                      <div style={{width:56,height:56,borderRadius:12,background:'#0066cc',display:'flex',alignItems:'center',justifyContent:'center',fontSize:14,fontWeight:900,margin:'0 auto 8px',boxShadow:'0 0 20px rgba(0,100,200,0.4)'}}>{teamName.substring(0,2).toUpperCase()}</div>
                      <div style={{fontWeight:800,fontSize:13}}>{teamName}</div>
                    </div>
                    <div style={{fontSize:28,fontWeight:800,color:'rgba(255,255,255,0.2)',fontFamily:"'Oxanium',sans-serif"}}>VS</div>
                    <div style={{textAlign:'center'}}>
                      <div style={{width:56,height:56,borderRadius:12,background:'#c62828',display:'flex',alignItems:'center',justifyContent:'center',fontSize:14,fontWeight:900,margin:'0 auto 8px',boxShadow:'0 0 20px rgba(180,40,40,0.4)'}}>{opp.name.substring(0,2).toUpperCase()}</div>
                      <div style={{fontWeight:800,fontSize:13}}>{opp.name}</div>
                    </div>
                  </div>
                  <button onClick={()=>onStartMatch(opp.name,diff)} style={{padding:'14px 40px',borderRadius:12,background:'linear-gradient(135deg,#0066cc,#00b4ff)',border:'none',color:'white',fontWeight:800,fontSize:16,cursor:'pointer',letterSpacing:2,boxShadow:'0 4px 20px rgba(0,100,200,0.4)',transition:'all 0.2s'}}
                    onMouseEnter={e=>{(e.currentTarget as HTMLElement).style.filter='brightness(1.15)';(e.currentTarget as HTMLElement).style.transform='translateY(-2px)';}}
                    onMouseLeave={e=>{(e.currentTarget as HTMLElement).style.filter='none';(e.currentTarget as HTMLElement).style.transform='none';}}>
                    ⚽ BẮT ĐẦU TRẬN ĐẤU
                  </button>
                </>
              ):null; })()}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
