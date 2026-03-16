import React, { useState } from 'react';
import { Player } from '../types';
import { generateRandomPlayer } from '../data/players';

interface Props { onClaim:(coins:number,player:Player)=>void; }

export default function DailyChest({onClaim}:Props){
  const today=new Date().toDateString();
  const claimed=localStorage.getItem('daily_chest_date')===today;
  const [opening,setOpening]=useState(false);
  const [done,setDone]=useState(claimed);

  const claim=()=>{
    if(done||opening) return;
    setOpening(true);
    setTimeout(()=>{
      const coins=Math.floor(Math.random()*400)+200;
      const pt=Math.random()>0.85?'GOLD':Math.random()>0.5?'SILVER':'BRONZE';
      const p=generateRandomPlayer(pt as any);
      onClaim(coins,p);
      localStorage.setItem('daily_chest_date',today);
      setOpening(false);
      setDone(true);
    },800);
  };

  return (
    <div onClick={done?undefined:claim} style={{background:done?'rgba(255,255,255,0.03)':'rgba(255,205,60,0.06)',border:`1px solid ${done?'rgba(255,255,255,0.08)':'rgba(255,205,60,0.3)'}`,borderRadius:12,padding:'12px 14px',cursor:done?'default':'pointer',transition:'all 0.2s',display:'flex',alignItems:'center',gap:12}}
      onMouseEnter={e=>{if(!done)(e.currentTarget as HTMLElement).style.background='rgba(255,205,60,0.1)';}}
      onMouseLeave={e=>{if(!done)(e.currentTarget as HTMLElement).style.background='rgba(255,205,60,0.06)';}}>
      <div style={{fontSize:28,flexShrink:0}}>{opening?'✨':done?'📭':'🎁'}</div>
      <div style={{flex:1,minWidth:0}}>
        <div style={{fontWeight:800,fontSize:13,color:done?'rgba(255,255,255,0.4)':'white',marginBottom:2}}>Rương Hàng Ngày</div>
        <div style={{fontSize:11,color:'rgba(255,255,255,0.4)',fontWeight:600}}>{done?'Đã nhận hôm nay':'Nhận coins + cầu thủ miễn phí!'}</div>
      </div>
      <div style={{fontSize:11,fontWeight:800,padding:'4px 10px',borderRadius:20,background:done?'rgba(255,255,255,0.06)':'rgba(255,205,60,0.2)',color:done?'rgba(255,255,255,0.3)':'#ffcd3c',whiteSpace:'nowrap',border:`1px solid ${done?'rgba(255,255,255,0.08)':'rgba(255,205,60,0.3)'}`}}>
        {opening?'..':done?'ĐÃ NHẬN':'NHẬN NGAY'}
      </div>
    </div>
  );
}
