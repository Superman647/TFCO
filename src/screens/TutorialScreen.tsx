import React, { useState } from 'react';

interface Props { onComplete:()=>void; }

const STEPS=[
  {title:'Chào Mừng đến FC Online!',icon:'⚽',desc:'FC Online là game bóng đá quản lý câu lạc bộ. Bạn sẽ xây dựng đội bóng mơ ước, thi đấu và chinh phục các danh hiệu.',detail:'Hãy cùng tìm hiểu các tính năng cơ bản của game nhé!'},
  {title:'Xây Dựng Đội Hình',icon:'👥',desc:'Vào mục "Đội Hình" để sắp xếp cầu thủ theo vị trí. Chọn đội hình phù hợp: 4-3-3, 4-4-2 hoặc 3-5-2.',detail:'Mỗi cầu thủ có chỉ số OVR – càng cao càng mạnh!'},
  {title:'Mở Pack Cầu Thủ',icon:'🃏',desc:'Vào "Cửa Hàng" để mở các pack nhận cầu thủ mới. Bronze Pack giá rẻ, Legend Pack có xác suất nhận siêu sao.',detail:'Các loại thẻ: Bronze (nâu), Silver (bạc), Gold (vàng), Legend (tím)!'},
  {title:'Thi Đấu',icon:'🥅',desc:'Chơi trận đấu 11vs11 thực chiến! WASD/Mũi tên để di chuyển, J để sút, K/X để chuyền bóng.',detail:'Mobile: Dùng joystick và các nút trên màn hình. Xoay ngang điện thoại để tốt nhất!'},
  {title:'Nâng Cấp & Phát Triển',icon:'⚡',desc:'Chơi trận để kiếm XP và Coins. Dùng mục "Nâng Cấp" để tăng cấp cầu thủ, "Luyện Tập" để cải thiện chỉ số.',detail:'Champions League và World Cup cho thưởng nhiều coins hơn!'},
  {title:'Bạn Đã Sẵn Sàng!',icon:'🏆',desc:'Hãy bắt đầu sự nghiệp quản lý bóng đá của bạn. Xây đội mạnh nhất, vô địch World Cup và trở thành HLV huyền thoại!',detail:'Nhận 800 coins thưởng cho việc hoàn thành hướng dẫn này!'},
];

export default function TutorialScreen({onComplete}:Props){
  const [step,setStep]=useState(0);
  const cur=STEPS[step];
  const isLast=step===STEPS.length-1;

  return (
    <div style={{height:'100%',display:'flex',flexDirection:'column',background:'#05080f',overflow:'hidden',fontFamily:"'Exo 2',sans-serif"}}>
      {/* Progress */}
      <div style={{padding:'16px 24px',borderBottom:'1px solid rgba(0,180,255,0.1)',display:'flex',alignItems:'center',gap:12}}>
        <div style={{fontFamily:"'Oxanium',sans-serif",fontWeight:800,fontSize:16,letterSpacing:3}}>📖 HƯỚNG DẪN</div>
        <div style={{flex:1,height:4,background:'rgba(255,255,255,0.08)',borderRadius:99,overflow:'hidden'}}>
          <div style={{height:'100%',borderRadius:99,background:'linear-gradient(90deg,#0066cc,#00b4ff)',width:`${((step+1)/STEPS.length)*100}%`,transition:'width 0.3s ease'}} />
        </div>
        <div style={{fontSize:12,fontWeight:700,color:'rgba(255,255,255,0.5)'}}>{step+1}/{STEPS.length}</div>
      </div>

      <div style={{flex:1,display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',padding:32,overflowY:'auto'}}>
        <div style={{width:'100%',maxWidth:520,display:'flex',flexDirection:'column',gap:24,animation:'fadeSlideUp 0.35s ease'}}>
          <div style={{textAlign:'center'}}>
            <div style={{fontSize:80,marginBottom:16,filter:'drop-shadow(0 4px 20px rgba(0,0,0,0.5))'}}>{cur.icon}</div>
            <h2 style={{fontFamily:"'Oxanium',sans-serif",fontWeight:800,fontSize:28,letterSpacing:3,marginBottom:12,color:'white'}}>{cur.title}</h2>
          </div>
          <div style={{background:'rgba(0,180,255,0.06)',border:'1px solid rgba(0,180,255,0.2)',borderRadius:16,padding:'20px 24px',fontSize:15,color:'rgba(255,255,255,0.85)',fontWeight:600,lineHeight:1.7}}>{cur.desc}</div>
          <div style={{background:'rgba(255,205,60,0.05)',border:'1px solid rgba(255,205,60,0.2)',borderRadius:12,padding:'14px 18px',fontSize:13,color:'rgba(255,255,255,0.6)',fontWeight:600,display:'flex',gap:10,alignItems:'flex-start'}}>
            <span style={{fontSize:16,flexShrink:0}}>💡</span>
            <span>{cur.detail}</span>
          </div>
          {/* Step dots */}
          <div style={{display:'flex',justifyContent:'center',gap:8}}>
            {STEPS.map((_,i)=>(
              <div key={i} onClick={()=>setStep(i)} style={{width:i===step?28:8,height:8,borderRadius:99,background:i<=step?'#00b4ff':'rgba(255,255,255,0.15)',transition:'all 0.3s',cursor:'pointer'}} />
            ))}
          </div>
          <div style={{display:'flex',gap:12}}>
            {step>0&&(
              <button onClick={()=>setStep(s=>s-1)} style={{flex:1,padding:'12px 0',borderRadius:10,background:'rgba(255,255,255,0.05)',border:'1px solid rgba(255,255,255,0.15)',color:'rgba(255,255,255,0.7)',fontWeight:800,fontSize:14,cursor:'pointer',letterSpacing:1}}>← TRƯỚC</button>
            )}
            <button onClick={isLast?onComplete:()=>setStep(s=>s+1)} style={{flex:2,padding:'14px 0',borderRadius:10,background:isLast?'linear-gradient(135deg,#0d8070,#00d4a0)':'linear-gradient(135deg,#0066cc,#00b4ff)',border:'none',color:isLast?'#001a14':'white',fontWeight:800,fontSize:15,cursor:'pointer',letterSpacing:2,boxShadow:isLast?'0 4px 20px rgba(0,212,160,0.4)':'0 4px 20px rgba(0,100,200,0.4)'}}>
              {isLast?'✅ BẮT ĐẦU (+800 Coins)':'TIẾP THEO →'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
