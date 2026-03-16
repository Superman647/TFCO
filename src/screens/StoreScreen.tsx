import React, { useState, useEffect, useRef } from 'react';
import { Player } from '../types';
import { generateRandomPlayer } from '../data/players';
import PlayerCard from '../components/PlayerCard';
import { useAudio } from '../contexts/AudioContext';

interface Props { coins:number; setCoins:React.Dispatch<React.SetStateAction<number>>; inventory:Player[]; setInventory:React.Dispatch<React.SetStateAction<Player[]>>; }

const PACKS=[
  {id:'BRONZE',          name:'BRONZE PACK',     cost:200,   icon:'🥉', bg:'linear-gradient(155deg,#b07a40,#5a2e10,#2a1008)',  border:'#c08040', glow:'rgba(180,120,60,0.5)',  desc:'OVR 55-72'},
  {id:'SILVER',          name:'SILVER PACK',     cost:500,   icon:'🥈', bg:'linear-gradient(155deg,#ccdde8,#6688aa,#334455)',  border:'#aabbcc', glow:'rgba(170,200,230,0.4)', desc:'OVR 70-82'},
  {id:'GOLD',            name:'GOLD PACK',       cost:1200,  icon:'🥇', bg:'linear-gradient(155deg,#ffe066,#cc9900,#6a4800)',  border:'#ffe066', glow:'rgba(255,220,60,0.6)',  desc:'OVR 80-92'},
  {id:'SUPER_LEGENDARY', name:'LEGEND PACK',     cost:5000,  icon:'💎', bg:'linear-gradient(155deg,#cc66ff,#7700cc,#2a0044)',  border:'#cc66ff', glow:'rgba(200,100,255,0.7)', desc:'OVR 93-99'},
  {id:'MULTICLASS',      name:'MULTI CLASS',     cost:800,   icon:'🃏', bg:'linear-gradient(155deg,#0088ff,#0044aa,#001144)',  border:'#0099ff', glow:'rgba(0,150,255,0.5)',  desc:'Bộ sưu tập'},
  {id:'LUCKY',           name:'LUCKY PACK',      cost:777,   icon:'🎰', bg:'linear-gradient(155deg,#ff4488,#cc0044,#440011)',  border:'#ff4488', glow:'rgba(255,60,120,0.5)',  desc:'May mắn x2'},
];

type Phase='store'|'tunnel'|'reveal';

export default function StoreScreen({coins,setCoins,inventory,setInventory}:Props){
  const {playAudio,stopAudio}=useAudio();
  const [phase,setPhase]=useState<Phase>('store');
  const [curPack,setCurPack]=useState<typeof PACKS[0]|null>(null);
  const [revPlayer,setRevPlayer]=useState<Player|null>(null);
  const [tunnelStep,setTunnelStep]=useState(0); // 0=entering, 1=sparks, 2=card
  const [openCount,setOpenCount]=useState(0);
  const canvasRef=useRef<HTMLCanvasElement>(null);
  const animRef=useRef<number>(0);
  const timeRef=useRef(0);

  // Tunnel animation
  useEffect(()=>{
    if(phase!=='tunnel') return;
    const canvas=canvasRef.current; if(!canvas) return;
    const ctx=canvas.getContext('2d'); if(!ctx) return;
    canvas.width=canvas.offsetWidth; canvas.height=canvas.offsetHeight;
    let t=0;

    const drawTunnel=(time:number)=>{
      const W=canvas.width, H=canvas.height;
      ctx.clearRect(0,0,W,H);
      const speed=time*0.0015;

      // Dark bg
      ctx.fillStyle='#000508'; ctx.fillRect(0,0,W,H);

      // Tunnel lines converging to center
      const cx=W/2, cy=H/2;
      const numLines=16;
      for(let i=0;i<numLines;i++){
        const angle=(i/numLines)*Math.PI*2;
        const len=Math.max(W,H);
        const ex=cx+Math.cos(angle)*len;
        const ey=cy+Math.sin(angle)*len;
        // Animate depth
        const alpha=0.08+0.06*Math.sin(speed*2+i);
        ctx.strokeStyle=`rgba(180,180,40,${alpha})`;
        ctx.lineWidth=1.5;
        ctx.beginPath(); ctx.moveTo(cx,cy); ctx.lineTo(ex,ey); ctx.stroke();
      }

      // Rectangular tunnel frames going toward center
      for(let f=0;f<8;f++){
        const progress=((speed*0.5+f/8)%1);
        const size=(1-progress)*Math.min(W,H)*0.9;
        const alpha=progress*0.6;
        ctx.strokeStyle=`rgba(200,200,40,${alpha})`;
        ctx.lineWidth=2;
        ctx.strokeRect(cx-size/2,cy-size/2,size,size);
      }

      // Fire particles on sides
      const numParticles=30;
      for(let i=0;i<numParticles;i++){
        const side=i%2===0?1:-1;
        const px=cx+side*(W*0.38+Math.sin(speed*3+i)*20);
        const py=H*(0.2+((speed*0.8+i/numParticles)%1)*0.6);
        const r=3+Math.sin(speed*4+i*1.3)*2;
        const colors=['rgba(255,100,0,0.8)','rgba(255,200,0,0.7)','rgba(255,50,0,0.6)'];
        const g=ctx.createRadialGradient(px,py,0,px,py,r*3);
        g.addColorStop(0,colors[i%3]);
        g.addColorStop(1,'transparent');
        ctx.fillStyle=g; ctx.beginPath(); ctx.arc(px,py,r*3,0,Math.PI*2); ctx.fill();
      }

      // Center glow
      const cg=ctx.createRadialGradient(cx,cy,0,cx,cy,80);
      cg.addColorStop(0,`rgba(255,255,180,${0.12+0.08*Math.sin(speed*3)})`);
      cg.addColorStop(1,'transparent');
      ctx.fillStyle=cg; ctx.fillRect(0,0,W,H);

      animRef.current=requestAnimationFrame(drawTunnel);
    };
    animRef.current=requestAnimationFrame(drawTunnel);
    const timer=setTimeout(()=>{
      cancelAnimationFrame(animRef.current);
      setPhase('reveal');
    },2200);
    return()=>{ cancelAnimationFrame(animRef.current); clearTimeout(timer); };
  },[phase]);

  const openPack=(pack:typeof PACKS[0])=>{
    if(coins<pack.cost) return;
    stopAudio('THEME');
    setCoins(c=>c-pack.cost);
    setCurPack(pack);
    let pt=pack.id;
    if(pt==='LUCKY'){const r=Math.random();if(r<0.35)pt='BRONZE';else if(r<0.65)pt='SILVER';else if(r<0.88)pt='GOLD';else pt='SUPER_LEGENDARY';}
    if(pt==='MULTICLASS')pt='GOLD';
    const p=generateRandomPlayer(pt as any);
    setRevPlayer(p);
    setInventory(inv=>[...inv,p]);
    setOpenCount(c=>c+1);
    setPhase('tunnel');
  };

  const close=()=>{ setPhase('store'); setRevPlayer(null); setCurPack(null); playAudio('THEME',true); };

  const isLegend=revPlayer&&revPlayer.ovr>=93;

  return(
    <div style={{height:'100%',display:'flex',flexDirection:'column',background:'#05080f',overflow:'hidden',fontFamily:"'Exo 2',sans-serif"}}>
      {/* ── TUNNEL ANIMATION ── */}
      {phase==='tunnel'&&(
        <div style={{position:'fixed',inset:0,zIndex:200,background:'#000'}}>
          <canvas ref={canvasRef} style={{width:'100%',height:'100%',display:'block'}}/>
          <div style={{position:'absolute',inset:0,display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',pointerEvents:'none'}}>
            <div style={{fontFamily:"'Oxanium',sans-serif",fontWeight:800,fontSize:32,color:'rgba(255,220,0,0.9)',letterSpacing:6,textShadow:'0 0 30px rgba(255,200,0,0.8)',animation:'pulse 0.4s ease-in-out infinite'}}>ĐANG MỞ...</div>
          </div>
        </div>
      )}

      {/* ── CARD REVEAL (Image 6 style) ── */}
      {phase==='reveal'&&revPlayer&&curPack&&(
        <div style={{position:'fixed',inset:0,zIndex:200,overflow:'hidden'}}>
          {/* Stadium bg */}
          <div style={{position:'absolute',inset:0,backgroundImage:"url('https://images.unsplash.com/photo-1459865264687-595d652de67e?q=80&w=2000')",backgroundSize:'cover',backgroundPosition:'center',filter:'brightness(0.3) saturate(0.5)'}}/>
          {/* Color overlay matching pack */}
          <div style={{position:'absolute',inset:0,background:`radial-gradient(ellipse 80% 70% at 50% 60%, ${curPack.glow}, transparent)`}}/>
          {/* Top zigzag arrows like Image 5 */}
          <div style={{position:'absolute',top:0,left:0,right:0,height:80,overflow:'hidden',opacity:0.6}}>
            {[0,1,2,3].map(i=>(
              <div key={i} style={{position:'absolute',top:`${i*18}px`,left:0,right:0,display:'flex',justifyContent:'center',gap:4}}>
                {Array.from({length:20}).map((_,j)=>(
                  <div key={j} style={{width:0,height:0,borderLeft:'8px solid transparent',borderRight:'8px solid transparent',borderTop:`12px solid rgba(180,180,0,${0.4-i*0.1})`}}/>
                ))}
              </div>
            ))}
          </div>

          {/* Sparkle rays */}
          <div style={{position:'absolute',inset:0,display:'flex',alignItems:'center',justifyContent:'center',pointerEvents:'none'}}>
            {Array.from({length:12}).map((_,i)=>(
              <div key={i} style={{position:'absolute',width:3,background:`linear-gradient(${curPack.border},transparent)`,transformOrigin:'bottom center',transform:`rotate(${i*30}deg)`,height:'50%',bottom:'50%',opacity:0.5,animation:`pulse ${0.8+i*0.1}s ease-in-out infinite alternate`}}/>
            ))}
          </div>

          {/* Main content */}
          <div style={{position:'relative',zIndex:10,height:'100%',display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',gap:20,padding:24}}>
            {/* OVR display sides (like Image 6) */}
            <div style={{display:'flex',alignItems:'center',gap:0,width:'100%',maxWidth:700,justifyContent:'center'}}>
              {/* Left OVR */}
              <div style={{textAlign:'center',minWidth:100}}>
                <div style={{fontFamily:"'Oxanium',sans-serif",fontWeight:900,fontSize:52,color:'#ffcd3c',textShadow:'0 0 20px rgba(255,200,0,0.8)',lineHeight:1}}>{revPlayer.ovr}</div>
                <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:2,marginTop:8}}>
                  {[['Tốc độ',revPlayer.stats.pac],['Sút',revPlayer.stats.sho],['Chuyền',revPlayer.stats.pas]].map(([l,v])=>(
                    <div key={l} style={{fontSize:10,fontWeight:700,color:'rgba(255,255,255,0.7)'}}>{l}: <b style={{color:'#ffcd3c'}}>{v}</b></div>
                  ))}
                </div>
              </div>

              {/* Center: BIG CARD */}
              <div style={{margin:'0 24px',transform:'scale(1.1)',filter:`drop-shadow(0 0 30px ${curPack.glow}) drop-shadow(0 0 60px ${curPack.glow})`}}>
                <PlayerCard player={revPlayer} size="lg"/>
              </div>

              {/* Right stats */}
              <div style={{textAlign:'center',minWidth:100}}>
                <div style={{fontFamily:"'Oxanium',sans-serif",fontWeight:900,fontSize:52,color:'#ffcd3c',textShadow:'0 0 20px rgba(255,200,0,0.8)',lineHeight:1}}>{revPlayer.ovr}</div>
                <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:2,marginTop:8}}>
                  {[['Rê bóng',revPlayer.stats.dri],['Thể lực',revPlayer.stats.phy],['Phòng thủ',revPlayer.stats.def]].map(([l,v])=>(
                    <div key={l} style={{fontSize:10,fontWeight:700,color:'rgba(255,255,255,0.7)'}}>{l}: <b style={{color:'#ffcd3c'}}>{v}</b></div>
                  ))}
                </div>
              </div>
            </div>

            {/* Player name big */}
            <div style={{textAlign:'center'}}>
              {isLegend&&<div style={{fontFamily:"'Oxanium',sans-serif",fontWeight:800,fontSize:16,color:'#ffcd3c',letterSpacing:6,marginBottom:6,textShadow:'0 0 20px rgba(255,200,0,0.8)',animation:'pulse 1s ease-in-out infinite'}}>✨ LEGENDARY WALKOUT!</div>}
              <div style={{fontFamily:"'Oxanium',sans-serif",fontWeight:900,fontSize:28,color:'white',letterSpacing:4}}>{revPlayer.name.toUpperCase()}</div>
              <div style={{fontSize:13,color:'rgba(255,255,255,0.5)',fontWeight:600,marginTop:4}}>{revPlayer.position} · {revPlayer.nation} · {revPlayer.rarity}</div>
            </div>

            {/* Price display bottom (like Image 6: 41,300B) */}
            <div style={{display:'flex',alignItems:'center',gap:8,background:'rgba(0,0,0,0.5)',padding:'6px 20px',borderRadius:20,border:'1px solid rgba(255,205,60,0.3)'}}>
              <span style={{fontSize:14,fontWeight:900,color:'#ffcd3c',fontFamily:"'Oxanium',sans-serif"}}>🪙 {(revPlayer.ovr*450).toLocaleString()}B</span>
              <span style={{fontSize:11,color:'rgba(255,255,255,0.4)'}}>Giá trị thị trường</span>
            </div>

            {/* Bottom action buttons */}
            <div style={{display:'flex',gap:12}}>
              <button onClick={close} style={{padding:'12px 28px',borderRadius:10,background:'rgba(255,255,255,0.08)',border:'1px solid rgba(255,255,255,0.2)',color:'white',fontWeight:800,fontSize:14,cursor:'pointer',letterSpacing:1}}>VÀO KHO</button>
              {curPack&&coins>=curPack.cost&&(
                <button onClick={()=>openPack(curPack)} style={{padding:'12px 28px',borderRadius:10,background:'linear-gradient(135deg,#0066cc,#00b4ff)',border:'none',color:'white',fontWeight:800,fontSize:14,cursor:'pointer',letterSpacing:1}}>MỞ TIẾP ({openCount})</button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── STORE FRONT (Image 4 style) ── */}
      {phase==='store'&&(
        <>
          <div style={{padding:'14px 20px',borderBottom:'1px solid rgba(0,180,255,0.12)',background:'rgba(5,11,26,0.97)',display:'flex',alignItems:'center',gap:12}}>
            <div style={{fontFamily:"'Oxanium',sans-serif",fontWeight:800,fontSize:20,letterSpacing:4}}>🛍️ CỬA HÀNG PACK</div>
            <div style={{flex:1}}/>
            <div style={{background:'rgba(255,205,60,0.1)',border:'1px solid rgba(255,205,60,0.3)',borderRadius:20,padding:'4px 14px',fontSize:13,fontWeight:800,color:'#ffcd3c'}}>🪙 {coins.toLocaleString()}</div>
          </div>
          <div style={{flex:1,overflowY:'auto',padding:'20px 24px'}}>
            <div style={{fontSize:11,fontWeight:700,letterSpacing:'0.4em',color:'rgba(0,180,255,0.7)',marginBottom:6}}>ĐÃI RÁC TÌM VÀNG 😜</div>
            <div style={{fontSize:13,color:'rgba(255,255,255,0.4)',fontWeight:600,marginBottom:24}}>Mở pack để khám phá cầu thủ mới — may mắn chờ bạn!</div>
            {/* Pack grid - Image 4 style with big pack images */}
            <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(190px,1fr))',gap:16,maxWidth:1100,margin:'0 auto'}}>
              {PACKS.map(pack=>{
                const canBuy=coins>=pack.cost;
                return(
                  <div key={pack.id} onClick={()=>canBuy&&openPack(pack)}
                    style={{borderRadius:16,overflow:'hidden',cursor:canBuy?'pointer':'not-allowed',opacity:canBuy?1:0.6,transition:'transform 0.2s,filter 0.2s',position:'relative',border:`2px solid ${pack.border}44`}}
                    onMouseEnter={e=>{if(canBuy){(e.currentTarget as HTMLElement).style.transform='translateY(-6px)';(e.currentTarget as HTMLElement).style.filter=`drop-shadow(0 8px 20px ${pack.glow})`;(e.currentTarget as HTMLElement).style.borderColor=pack.border;}}}
                    onMouseLeave={e=>{(e.currentTarget as HTMLElement).style.transform='none';(e.currentTarget as HTMLElement).style.filter='none';(e.currentTarget as HTMLElement).style.borderColor=`${pack.border}44`;}}>
                    {/* Pack visual (Image 4 style) */}
                    <div style={{height:240,background:pack.bg,display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',position:'relative',overflow:'hidden'}}>
                      {/* Shine effect */}
                      <div style={{position:'absolute',inset:0,background:'radial-gradient(ellipse 60% 50% at 50% 30%,rgba(255,255,255,0.1),transparent)'}}/>
                      {/* MULTI CLASS style label */}
                      <div style={{position:'absolute',top:10,left:10,right:10,textAlign:'center',zIndex:2}}>
                        <div style={{background:'rgba(0,0,0,0.5)',borderRadius:6,padding:'3px 8px',fontSize:9,fontWeight:800,color:'rgba(255,255,255,0.8)',letterSpacing:2,display:'inline-block',border:`1px solid ${pack.border}44`}}>MULTI CLASS</div>
                      </div>
                      {/* Pack icon */}
                      <div style={{fontSize:72,zIndex:2,filter:`drop-shadow(0 4px 16px ${pack.glow})`}}>{pack.icon}</div>
                      {/* OVR badge */}
                      <div style={{position:'absolute',bottom:10,right:10,background:'rgba(0,0,0,0.7)',borderRadius:6,padding:'3px 8px',fontSize:12,fontWeight:900,color:pack.border,fontFamily:"'Oxanium',sans-serif",border:`1px solid ${pack.border}44`}}>+{pack.id==='BRONZE'?'72':pack.id==='SILVER'?'82':pack.id==='GOLD'?'92':pack.id==='SUPER_LEGENDARY'?'99':'102'}</div>
                      <div style={{position:'absolute',bottom:10,left:10,fontSize:10,color:'rgba(255,255,255,0.5)',fontWeight:700}}>{pack.id==='LUCKY'?'99 món':pack.id==='MULTICLASS'?'99 món':'1 cầu thủ'}</div>
                    </div>
                    {/* Bottom info */}
                    <div style={{background:'rgba(5,8,18,0.95)',padding:'12px 14px',borderTop:`1px solid ${pack.border}22`}}>
                      <div style={{fontFamily:"'Oxanium',sans-serif",fontWeight:800,fontSize:13,color:'white',marginBottom:2,whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'}}>{pack.name}</div>
                      <div style={{fontSize:10,color:'rgba(255,255,255,0.4)',marginBottom:8,fontWeight:600}}>{pack.desc}</div>
                      <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',gap:8}}>
                        <div style={{fontFamily:"'Oxanium',sans-serif",fontWeight:900,fontSize:16,color:'#ffcd3c'}}>🪙 {pack.cost.toLocaleString()}</div>
                        <div style={{fontSize:10,fontWeight:800,padding:'3px 10px',borderRadius:20,background:canBuy?`${pack.border}22`:'rgba(255,255,255,0.05)',color:canBuy?pack.border:'rgba(255,255,255,0.3)',border:`1px solid ${canBuy?pack.border+'44':'rgba(255,255,255,0.08)'}`}}>
                          {canBuy?'MỞ NGAY':'HẾT TIỀN'}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
