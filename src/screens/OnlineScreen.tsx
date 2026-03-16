import React from 'react';
import { Squad } from '../types';

interface Props { username:string; squad:Squad; onMatchComplete:(coins:number,xp:Record<string,number>,sA?:number,sB?:number,stats?:any)=>void; }

export default function OnlineScreen({username,squad,onMatchComplete}:Props){
  return(
    <div style={{height:'100%',display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',background:'#05080f',fontFamily:"'Exo 2',sans-serif",gap:20}}>
      <div style={{fontSize:64,marginBottom:8}}>🌐</div>
      <div style={{fontFamily:"'Oxanium',sans-serif",fontWeight:800,fontSize:28,letterSpacing:4}}>ONLINE PVP</div>
      <div style={{color:'rgba(255,255,255,0.4)',fontSize:14,fontWeight:600,textAlign:'center',maxWidth:360,lineHeight:1.6}}>Chế độ đấu online đang được phát triển.<br/>Vui lòng thử lại sau!</div>
      <button onClick={()=>onMatchComplete(0,{})} style={{padding:'12px 32px',borderRadius:10,background:'rgba(255,255,255,0.05)',border:'1px solid rgba(255,255,255,0.15)',color:'rgba(255,255,255,0.6)',fontWeight:800,fontSize:13,cursor:'pointer',letterSpacing:2}}>← QUAY LẠI</button>
    </div>
  );
}
