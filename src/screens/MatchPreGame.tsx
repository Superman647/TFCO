import React, { useState } from 'react';
import { Difficulty } from '../types';

interface Props { userTeamName:string; opponentName:string; difficulty:Difficulty; onStart:()=>void; onBack:()=>void; }

const DIFF_LABELS:Record<Difficulty,string>={EASY:'Nghiệp dư 1',MEDIUM:'Nghiệp dư 2',HARD:'Chuyên nghiệp'};
const DIFF_COLORS:Record<Difficulty,string>={EASY:'#00d4a0',MEDIUM:'#ffcd3c',HARD:'#ff5555'};

const TABS=['Thông tin đội','Chọn áo','Cài đặt thêm giờ'] as const;

export default function MatchPreGame({userTeamName,opponentName,difficulty,onStart,onBack}:Props){
  const [tab,setTab]=useState(0);

  return(
    <div style={{height:'100dvh',position:'relative',overflow:'hidden',display:'flex',flexDirection:'column',background:'#050b1a',fontFamily:"'Exo 2',sans-serif"}}>
      {/* Stadium bg */}
      <div style={{position:'absolute',inset:0,backgroundImage:"url('https://images.unsplash.com/photo-1459865264687-595d652de67e?q=80&w=2000')",backgroundSize:'cover',backgroundPosition:'center',filter:'brightness(0.25) saturate(0.6)'}}/>
      <div style={{position:'absolute',inset:0,background:'linear-gradient(180deg,rgba(5,8,15,0.3),rgba(5,8,15,0.7))'}}/>

      {/* FC Online top bar */}
      <div style={{position:'relative',zIndex:10,display:'flex',alignItems:'center',justifyContent:'space-between',padding:'8px 16px',borderBottom:'1px solid rgba(255,255,255,0.08)'}}>
        <div style={{display:'flex',gap:16}}>
          {['FC ONLINE','EA SPORTS'].map((l,i)=><span key={i} style={{fontSize:11,fontWeight:700,color:'rgba(255,255,255,0.4)',letterSpacing:2}}>{l}</span>)}
        </div>
        <div style={{display:'flex',gap:16}}>
          {['FC ONLINE','EA SPORTS'].map((l,i)=><span key={i} style={{fontSize:11,fontWeight:700,color:'rgba(255,255,255,0.4)',letterSpacing:2}}>{l}</span>)}
        </div>
      </div>

      {/* XẾP HẠNG label */}
      <div style={{position:'relative',zIndex:10,textAlign:'center',padding:'12px 0 4px'}}>
        <div style={{fontSize:14,fontWeight:800,color:'rgba(255,255,255,0.85)',letterSpacing:4}}>Xếp hạng</div>
      </div>

      {/* Tabs */}
      <div style={{position:'relative',zIndex:10,display:'flex',justifyContent:'center',gap:0,borderBottom:'1px solid rgba(255,255,255,0.1)',marginBottom:24}}>
        {TABS.map((t,i)=>(
          <button key={i} onClick={()=>setTab(i)} style={{padding:'8px 20px',background:tab===i?'rgba(0,180,255,0.15)':'transparent',border:'none',borderBottom:tab===i?'2px solid #00b4ff':'2px solid transparent',color:tab===i?'#00b4ff':'rgba(255,255,255,0.5)',fontFamily:"'Exo 2',sans-serif",fontWeight:700,fontSize:13,cursor:'pointer',transition:'all 0.15s',letterSpacing:0.5}}>{t}</button>
        ))}
      </div>

      {/* Players standing on sides + center content */}
      <div style={{flex:1,position:'relative',zIndex:10,display:'flex',alignItems:'center',justifyContent:'center',overflow:'hidden'}}>
        {/* Left player */}
        <div style={{position:'absolute',left:'5%',bottom:0,height:'80%',display:'flex',alignItems:'flex-end'}}>
          <img src="https://cdn.sofifa.net/players/158023/24_240.png" alt="" style={{height:'100%',objectFit:'contain',filter:'drop-shadow(0 0 20px rgba(0,0,0,0.8))',opacity:0.9}} onError={e=>{(e.target as HTMLImageElement).style.display='none';}}/>
        </div>
        {/* Right player */}
        <div style={{position:'absolute',right:'5%',bottom:0,height:'80%',display:'flex',alignItems:'flex-end',transform:'scaleX(-1)'}}>
          <img src="https://cdn.sofifa.net/players/231747/24_240.png" alt="" style={{height:'100%',objectFit:'contain',filter:'drop-shadow(0 0 20px rgba(0,0,0,0.8))',opacity:0.9}} onError={e=>{(e.target as HTMLImageElement).style.display='none';}}/>
        </div>

        {/* Center card */}
        {tab===0&&(
          <div style={{background:'rgba(5,8,15,0.88)',border:'1px solid rgba(255,255,255,0.12)',borderRadius:16,padding:'28px 40px',maxWidth:480,width:'100%',textAlign:'center',backdropFilter:'blur(20px)'}}>
            {/* Teams */}
            <div style={{display:'flex',alignItems:'center',justifyContent:'center',gap:32,marginBottom:24}}>
              {/* User team */}
              <div style={{flex:1,textAlign:'center'}}>
                <div style={{width:64,height:64,borderRadius:'50%',background:'linear-gradient(135deg,#003399,#0055cc)',display:'flex',alignItems:'center',justifyContent:'center',margin:'0 auto 10px',border:'2px solid rgba(255,255,255,0.3)',fontSize:16,fontWeight:900,fontFamily:"'Oxanium',sans-serif"}}>{userTeamName.substring(0,2).toUpperCase()}</div>
                <div style={{fontWeight:800,fontSize:16,color:'white',marginBottom:4}}>{userTeamName}</div>
                <div style={{fontSize:11,color:'rgba(255,255,255,0.5)',fontWeight:600}}>Chua đạt Cốc mức xếp hạng 1</div>
                <div style={{display:'inline-flex',alignItems:'center',gap:6,marginTop:6,background:'rgba(255,255,255,0.06)',borderRadius:20,padding:'3px 12px',border:'1px solid rgba(255,255,255,0.1)'}}>
                  <span style={{fontSize:10}}>🏅</span>
                  <span style={{fontSize:11,fontWeight:700,color:'rgba(255,255,255,0.7)'}}>{DIFF_LABELS[difficulty]}</span>
                </div>
              </div>

              {/* VS */}
              <div style={{display:'flex',flexDirection:'column',alignItems:'center',gap:4}}>
                <div style={{fontFamily:"'Oxanium',sans-serif",fontWeight:900,fontSize:28,color:'rgba(255,255,255,0.25)',letterSpacing:4}}>VS</div>
              </div>

              {/* Opponent */}
              <div style={{flex:1,textAlign:'center'}}>
                <div style={{width:64,height:64,borderRadius:'50%',background:'linear-gradient(135deg,#660000,#cc0000)',display:'flex',alignItems:'center',justifyContent:'center',margin:'0 auto 10px',border:'2px solid rgba(255,255,255,0.3)',fontSize:16,fontWeight:900,fontFamily:"'Oxanium',sans-serif"}}>{opponentName.substring(0,2).toUpperCase()}</div>
                <div style={{fontWeight:800,fontSize:16,color:'white',marginBottom:4}}>{opponentName}</div>
                <div style={{fontSize:11,color:'rgba(255,255,255,0.5)',fontWeight:600}}>Cốc mức xếp hạng</div>
              </div>
            </div>

            {/* Difficulty badge */}
            <div style={{display:'flex',justifyContent:'center',marginBottom:20}}>
              <div style={{background:`${DIFF_COLORS[difficulty]}18`,border:`1px solid ${DIFF_COLORS[difficulty]}44`,borderRadius:20,padding:'4px 16px',fontSize:12,fontWeight:800,color:DIFF_COLORS[difficulty],letterSpacing:2}}>{DIFF_LABELS[difficulty].toUpperCase()}</div>
            </div>

            {/* Action buttons */}
            <div style={{display:'flex',gap:10,justifyContent:'center'}}>
              <button onClick={onBack} style={{padding:'10px 24px',borderRadius:8,background:'rgba(255,255,255,0.06)',border:'1px solid rgba(255,255,255,0.15)',color:'rgba(255,255,255,0.7)',fontWeight:800,fontSize:13,cursor:'pointer',letterSpacing:1}}>← Quay lại</button>
              <button onClick={onStart} style={{padding:'10px 32px',borderRadius:8,background:'linear-gradient(135deg,#1a9e8a,#00d4a0)',border:'none',color:'#001a14',fontWeight:900,fontSize:14,cursor:'pointer',letterSpacing:2,boxShadow:'0 4px 20px rgba(0,200,140,0.4)',transition:'all 0.2s'}}
                onMouseEnter={e=>{(e.currentTarget as HTMLElement).style.filter='brightness(1.1)';(e.currentTarget as HTMLElement).style.transform='translateY(-1px)';}}
                onMouseLeave={e=>{(e.currentTarget as HTMLElement).style.filter='none';(e.currentTarget as HTMLElement).style.transform='none';}}>
                Trận thẳng ⚽
              </button>
            </div>
          </div>
        )}

        {tab===1&&(
          <div style={{background:'rgba(5,8,15,0.88)',border:'1px solid rgba(255,255,255,0.12)',borderRadius:16,padding:'28px 40px',maxWidth:480,width:'100%',backdropFilter:'blur(20px)'}}>
            <div style={{fontFamily:"'Oxanium',sans-serif",fontWeight:800,fontSize:18,letterSpacing:3,marginBottom:20,textAlign:'center'}}>CHỌN MÀU ÁO</div>
            <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:12}}>
              {[['#1565c0','Xanh navy'],['#c62828','Đỏ'],['#1b5e20','Xanh lá'],['#4a148c','Tím'],['#e65100','Cam'],['#f9a825','Vàng'],['#263238','Đen xám'],['#ffffff','Trắng']].map(([c,n])=>(
                <div key={c} style={{textAlign:'center',cursor:'pointer'}}>
                  <div style={{width:48,height:60,background:c,borderRadius:8,margin:'0 auto 6px',border:'2px solid rgba(255,255,255,0.2)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:20}}>⚽</div>
                  <div style={{fontSize:10,fontWeight:600,color:'rgba(255,255,255,0.6)'}}>{n}</div>
                </div>
              ))}
            </div>
            <button onClick={onStart} style={{width:'100%',padding:'12px 0',marginTop:20,borderRadius:8,background:'linear-gradient(135deg,#1a9e8a,#00d4a0)',border:'none',color:'#001a14',fontWeight:900,fontSize:14,cursor:'pointer',letterSpacing:2}}>Xác nhận & Thi đấu</button>
          </div>
        )}

        {tab===2&&(
          <div style={{background:'rgba(5,8,15,0.88)',border:'1px solid rgba(255,255,255,0.12)',borderRadius:16,padding:'28px 40px',maxWidth:480,width:'100%',backdropFilter:'blur(20px)'}}>
            <div style={{fontFamily:"'Oxanium',sans-serif",fontWeight:800,fontSize:18,letterSpacing:3,marginBottom:20,textAlign:'center'}}>CÀI ĐẶT TRẬN ĐẤU</div>
            {[['Thời lượng','90 phút'],['Thời tiết','Nắng đẹp'],['Sân nhà','Wembley Stadium'],['Khán giả','80,000 người']].map(([k,v])=>(
              <div key={k} style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'12px 0',borderBottom:'1px solid rgba(255,255,255,0.07)'}}>
                <span style={{fontSize:13,fontWeight:600,color:'rgba(255,255,255,0.6)'}}>{k}</span>
                <span style={{fontSize:13,fontWeight:800,color:'white'}}>{v}</span>
              </div>
            ))}
            <button onClick={onStart} style={{width:'100%',padding:'12px 0',marginTop:20,borderRadius:8,background:'linear-gradient(135deg,#1a9e8a,#00d4a0)',border:'none',color:'#001a14',fontWeight:900,fontSize:14,cursor:'pointer',letterSpacing:2}}>Bắt đầu</button>
          </div>
        )}
      </div>
    </div>
  );
}
