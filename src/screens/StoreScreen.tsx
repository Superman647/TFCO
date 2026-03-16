import React, { useState } from 'react';
import { Player } from '../types';
import { generateRandomPlayer } from '../data/players';
import PlayerCard from '../components/PlayerCard';
import { useAudio } from '../contexts/AudioContext';

interface Props { coins:number; setCoins:React.Dispatch<React.SetStateAction<number>>; inventory:Player[]; setInventory:React.Dispatch<React.SetStateAction<Player[]>>; }

const PACKS = [
  { id:'BRONZE',          name:'BRONZE PACK',  cost:200,   img:'🥉', desc:'Cầu thủ OVR 55-72',     color:'#b87333', bg:'linear-gradient(155deg,#b07a40,#5a2e10)',  border:'#c08040' },
  { id:'SILVER',          name:'SILVER PACK',  cost:500,   img:'🥈', desc:'Cầu thủ OVR 70-82',     color:'#b0c0d0', bg:'linear-gradient(155deg,#ccdde8,#445566)',  border:'#aabbcc' },
  { id:'GOLD',            name:'GOLD PACK',    cost:1200,  img:'🥇', desc:'Cầu thủ OVR 80-92',     color:'#ffcd3c', bg:'linear-gradient(155deg,#ffe066,#7a5010)',  border:'#ffe066' },
  { id:'SUPER_LEGENDARY', name:'LEGEND PACK',  cost:5000,  img:'💎', desc:'Cầu thủ OVR 93-99',     color:'#b060ff', bg:'linear-gradient(155deg,#9040e0,#2e1060)',  border:'#a060e0' },
  { id:'LUCKY',           name:'LUCKY PACK',   cost:777,   img:'🎰', desc:'Ngẫu nhiên – may mắn!', color:'#ff6b9d', bg:'linear-gradient(155deg,#ff6b9d,#c62a47)',  border:'#ff6b9d' },
];

const S: Record<string, React.CSSProperties> = {
  root:     { height:'100%', display:'flex', flexDirection:'column', background:'#05080f', overflow:'hidden' },
  header:   { padding:'18px 24px', borderBottom:'1px solid rgba(0,180,255,0.12)', background:'rgba(5,11,26,0.95)', display:'flex', alignItems:'center', gap:12 },
  body:     { flex:1, overflowY:'auto', padding:'24px' },
  grid:     { display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(200px,1fr))', gap:20, maxWidth:1100, margin:'0 auto' },
  packCard: { borderRadius:16, overflow:'hidden', cursor:'pointer', transition:'transform 0.2s,filter 0.2s', position:'relative', display:'flex', flexDirection:'column' },
  packImg:  { height:260, display:'flex', alignItems:'center', justifyContent:'center', position:'relative' },
  packBot:  { padding:'14px 16px', background:'rgba(0,0,0,0.6)', backdropFilter:'blur(8px)' },
  btn:      { width:'100%', padding:'10px 0', borderRadius:10, fontWeight:800, fontSize:14, cursor:'pointer', border:'none', marginTop:8, transition:'filter 0.15s,transform 0.1s', letterSpacing:1 },
  overlay:  { position:'fixed', inset:0, zIndex:200, background:'rgba(0,0,0,0.95)', backdropFilter:'blur(20px)', display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center' },
};

export default function StoreScreen({ coins, setCoins, inventory, setInventory }: Props) {
  const { playAudio, stopAudio } = useAudio();
  const [phase, setPhase] = useState<'store'|'opening'|'reveal'>('store');
  const [revealedPlayer, setRevealedPlayer] = useState<Player|null>(null);
  const [openingPack, setOpeningPack] = useState<typeof PACKS[0]|null>(null);
  const [step, setStep] = useState(0);
  const [openCount, setOpenCount] = useState(0);

  const openPack = (pack: typeof PACKS[0]) => {
    if (coins < pack.cost) return;
    setCoins(c => c - pack.cost);
    setOpeningPack(pack);
    setPhase('opening');
    setStep(0);
    let pt = pack.id;
    if (pack.id === 'LUCKY') {
      const r = Math.random();
      if (r < 0.35) pt='BRONZE'; else if (r < 0.65) pt='SILVER'; else if (r < 0.88) pt='GOLD'; else pt='SUPER_LEGENDARY';
    }
    const p = generateRandomPlayer(pt as any);
    setTimeout(() => { setStep(1); setTimeout(() => { setStep(2); setTimeout(() => { setRevealedPlayer(p); setInventory(inv => [...inv, p]); setPhase('reveal'); setOpenCount(c=>c+1); }, 1000); }, 1200); }, 1400);
  };

  const isLegend = revealedPlayer && revealedPlayer.ovr >= 90;

  if (phase !== 'store') return (
    <div style={S.overlay}>
      {phase === 'opening' && openingPack && (
        <div style={{ textAlign:'center' }}>
          <div style={{ fontSize:120, marginBottom:20, animation:'bounce 0.4s ease infinite alternate', display:'inline-block' }}>{openingPack.img}</div>
          <div style={{ fontFamily:"'Oxanium',sans-serif", fontWeight:800, fontSize:28, color:'white', letterSpacing:4, marginBottom:8 }}>{step===0?'ĐANG MỞ...':step===1?'SẮP RA...':'CHUẨN BỊ!'}</div>
          <div style={{ display:'flex', gap:8, justifyContent:'center', marginTop:16 }}>
            {[0,1,2].map(i => <div key={i} style={{ width:10, height:10, borderRadius:'50%', background: step>=i ? openingPack.color : 'rgba(255,255,255,0.2)', transition:'background 0.3s' }} />)}
          </div>
        </div>
      )}
      {phase === 'reveal' && revealedPlayer && (
        <div style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:24, animation:'fadeSlideUp 0.4s ease' }}>
          {isLegend && (
            <div style={{ position:'absolute', inset:0, background:'radial-gradient(ellipse 60% 60% at 50% 50%, rgba(180,96,255,0.3),transparent)', pointerEvents:'none' }} />
          )}
          <div style={{ fontFamily:"'Oxanium',sans-serif", fontWeight:800, fontSize:isLegend?42:32, color: isLegend?'#e060ff':'#00e676', letterSpacing:4, textAlign:'center', textShadow: isLegend?'0 0 30px rgba(200,80,255,0.8)':'0 0 20px rgba(0,230,120,0.6)' }}>
            {isLegend ? '✨ LEGENDARY WALKOUT!' : '🎉 NEW PLAYER!'}
          </div>
          <div style={{ transform:'scale(1.15)', filter: isLegend ? 'drop-shadow(0 0 30px rgba(180,96,255,0.6))' : 'drop-shadow(0 0 20px rgba(0,230,120,0.4))' }}>
            <PlayerCard player={revealedPlayer} size="lg" />
          </div>
          <div style={{ display:'flex', gap:12 }}>
            <button onClick={() => { setPhase('store'); setRevealedPlayer(null); }} style={{ padding:'12px 32px', borderRadius:10, background:'rgba(255,255,255,0.08)', border:'1px solid rgba(255,255,255,0.2)', color:'white', fontWeight:800, fontSize:15, cursor:'pointer', letterSpacing:2 }}>XEM KHO</button>
            {openingPack && coins >= openingPack.cost && (
              <button onClick={() => openPack(openingPack)} style={{ padding:'12px 32px', borderRadius:10, background:'linear-gradient(135deg,#0066cc,#00b4ff)', border:'none', color:'white', fontWeight:800, fontSize:15, cursor:'pointer', letterSpacing:2 }}>MỞ TIẾP</button>
            )}
          </div>
          <div style={{ fontSize:13, color:'rgba(255,255,255,0.4)', fontWeight:600 }}>Đã mở {openCount} pack trong phiên này</div>
        </div>
      )}
    </div>
  );

  return (
    <div style={S.root}>
      <div style={S.header}>
        <div style={{ fontFamily:"'Oxanium',sans-serif", fontWeight:800, fontSize:22, letterSpacing:4 }}>🛍️ CỬA HÀNG</div>
        <div style={{ flex:1 }} />
        <div style={{ background:'rgba(255,205,60,0.1)', border:'1px solid rgba(255,205,60,0.3)', borderRadius:20, padding:'4px 14px', fontSize:13, fontWeight:800, color:'#ffcd3c' }}>🪙 {coins.toLocaleString()}</div>
      </div>
      <div style={S.body}>
        <div style={{ textAlign:'center', marginBottom:28 }}>
          <div style={{ fontSize:11, fontWeight:700, letterSpacing:'0.4em', color:'rgba(0,180,255,0.7)', marginBottom:6 }}>MỞ PACK ĐỂ NHẬN CẦU THỦ MỚI</div>
          <div style={{ fontSize:13, color:'rgba(255,255,255,0.4)', fontWeight:600 }}>Mỗi pack chứa 1 cầu thủ ngẫu nhiên với độ hiếm tương ứng</div>
        </div>
        <div style={S.grid}>
          {PACKS.map(pack => {
            const canBuy = coins >= pack.cost;
            return (
              <div key={pack.id} style={S.packCard}
                onMouseEnter={e=>{(e.currentTarget as HTMLElement).style.transform='translateY(-6px)';(e.currentTarget as HTMLElement).style.filter='brightness(1.1)';}}
                onMouseLeave={e=>{(e.currentTarget as HTMLElement).style.transform='none';(e.currentTarget as HTMLElement).style.filter='none';}}>
                <div style={{ ...S.packImg, background:pack.bg, border:`2px solid ${pack.border}44`, borderRadius:'16px 16px 0 0' }}>
                  <div style={{ position:'absolute', inset:0, background:'radial-gradient(ellipse 60% 50% at 50% 30%, rgba(255,255,255,0.08),transparent)' }} />
                  <div style={{ textAlign:'center', position:'relative', zIndex:2 }}>
                    <div style={{ fontSize:80, lineHeight:1, filter:'drop-shadow(0 4px 16px rgba(0,0,0,0.5))' }}>{pack.img}</div>
                    <div style={{ fontFamily:"'Oxanium',sans-serif", fontWeight:800, fontSize:16, color:'white', marginTop:12, letterSpacing:3, textShadow:'0 2px 8px rgba(0,0,0,0.8)' }}>{pack.name}</div>
                    <div style={{ fontSize:11, color:'rgba(255,255,255,0.6)', marginTop:4, fontWeight:600 }}>{pack.desc}</div>
                  </div>
                </div>
                <div style={{ ...S.packBot, borderRadius:'0 0 16px 16px', border:`1px solid ${pack.border}33`, borderTop:'none' }}>
                  <div style={{ textAlign:'center', fontSize:13, color:'rgba(255,255,255,0.5)', marginBottom:4, fontWeight:600 }}>Giá</div>
                  <div style={{ textAlign:'center', fontSize:22, fontWeight:900, color:'#ffcd3c', fontFamily:"'Oxanium',sans-serif" }}>🪙 {pack.cost.toLocaleString()}</div>
                  <button onClick={() => openPack(pack)} disabled={!canBuy} style={{ ...S.btn, background: canBuy ? `linear-gradient(135deg,${pack.color}99,${pack.color})` : 'rgba(255,255,255,0.05)', color: canBuy ? '#000' : 'rgba(255,255,255,0.3)', cursor: canBuy?'pointer':'not-allowed', border:`1px solid ${canBuy?pack.border:'rgba(255,255,255,0.1)'}`, filter: canBuy?'none':'grayscale(1)' }}>
                    {canBuy ? 'MỞ PACK' : 'KHÔNG ĐỦ COINS'}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
        <div style={{ maxWidth:1100, margin:'32px auto 0', padding:'16px 24px', background:'rgba(0,180,255,0.05)', border:'1px solid rgba(0,180,255,0.15)', borderRadius:12 }}>
          <div style={{ fontSize:12, fontWeight:700, color:'rgba(0,180,255,0.7)', letterSpacing:'0.3em', marginBottom:8 }}>💡 MẸO</div>
          <div style={{ fontSize:12, color:'rgba(255,255,255,0.5)', lineHeight:1.8 }}>• Bronze: OVR 55-72 &nbsp;|&nbsp; Silver: OVR 70-82 &nbsp;|&nbsp; Gold: OVR 80-92 &nbsp;|&nbsp; Legend: OVR 93-99<br />• Lucky Pack có xác suất nhận Gold cao hơn với giá ưu đãi</div>
        </div>
      </div>
    </div>
  );
}
