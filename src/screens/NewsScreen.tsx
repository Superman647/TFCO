import React from 'react';
interface Props { onBack:()=>void; }
const NEWS=[
  {title:'Mbappe ghi hat-trick trong chiến thắng 5-1',tag:'KẾT QUẢ',time:'2 giờ trước',img:'https://images.unsplash.com/photo-1574629810360-7efbbe195018?q=80&w=400&auto=format',desc:'Tiền đạo người Pháp tỏa sáng rực rỡ với 3 bàn thắng, giúp đội nhà đại thắng.'},
  {title:'Real Madrid dẫn đầu La Liga với 8 điểm',tag:'BẢNG XH',time:'5 giờ trước',img:'https://images.unsplash.com/photo-1556056504-5c7696c4c28d?q=80&w=400&auto=format',desc:'Đội bóng Hoàng gia Tây Ban Nha duy trì phong độ hoàn hảo sau 12 vòng đấu.'},
  {title:'Erling Haaland phá kỷ lục ghi bàn Premier League',tag:'KỶ LỤC',time:'1 ngày trước',img:'https://images.unsplash.com/photo-1606925797300-0b35e9d1794e?q=80&w=400&auto=format',desc:'Chân sút người Na Uy đã vượt qua mốc 50 bàn thắng trong vòng 52 trận.'},
  {title:'Champions League: Kết quả tứ kết đáng kinh ngạc',tag:'C1',time:'2 ngày trước',img:'https://images.unsplash.com/photo-1546519638-68e109498ffc?q=80&w=400&auto=format',desc:'4 trận tứ kết đêm qua chứng kiến nhiều bàn thắng đẹp và bất ngờ.'},
];
export default function NewsScreen({onBack}:Props){
  return(
    <div style={{height:'100%',display:'flex',flexDirection:'column',background:'#05080f',overflow:'hidden',fontFamily:"'Exo 2',sans-serif"}}>
      <div style={{padding:'14px 20px',borderBottom:'1px solid rgba(0,180,255,0.12)',background:'rgba(5,11,26,0.97)',display:'flex',alignItems:'center',gap:12}}>
        <button onClick={onBack} style={{background:'rgba(0,180,255,0.1)',border:'1px solid rgba(0,180,255,0.25)',borderRadius:8,padding:'6px 12px',color:'#00b4ff',fontWeight:800,fontSize:12,cursor:'pointer'}}>← Back</button>
        <div style={{fontFamily:"'Oxanium',sans-serif",fontWeight:800,fontSize:18,letterSpacing:3}}>📰 TIN TỨC BÓNG ĐÁ</div>
      </div>
      <div style={{flex:1,overflowY:'auto',padding:'20px',display:'flex',flexDirection:'column',gap:14,maxWidth:900,margin:'0 auto',width:'100%'}}>
        {NEWS.map((n,i)=>(
          <div key={i} style={{display:'flex',gap:16,background:'rgba(255,255,255,0.03)',border:'1px solid rgba(255,255,255,0.06)',borderRadius:12,overflow:'hidden',cursor:'pointer',transition:'all 0.2s'}}
            onMouseEnter={e=>{(e.currentTarget as HTMLElement).style.background='rgba(0,180,255,0.05)';(e.currentTarget as HTMLElement).style.borderColor='rgba(0,180,255,0.2)';}}
            onMouseLeave={e=>{(e.currentTarget as HTMLElement).style.background='rgba(255,255,255,0.03)';(e.currentTarget as HTMLElement).style.borderColor='rgba(255,255,255,0.06)';}}>
            <img src={n.img} alt="" style={{width:140,height:100,objectFit:'cover',flexShrink:0}} onError={e=>{(e.target as HTMLElement).style.display='none';}} />
            <div style={{padding:'14px 14px 14px 0',flex:1,minWidth:0}}>
              <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:8}}>
                <span style={{fontSize:9,fontWeight:800,background:'rgba(0,180,255,0.2)',color:'#00b4ff',padding:'2px 8px',borderRadius:20,letterSpacing:'0.2em'}}>{n.tag}</span>
                <span style={{fontSize:11,color:'rgba(255,255,255,0.35)',fontWeight:600}}>{n.time}</span>
              </div>
              <div style={{fontWeight:800,fontSize:15,color:'white',marginBottom:6,lineHeight:1.3}}>{n.title}</div>
              <div style={{fontSize:12,color:'rgba(255,255,255,0.5)',fontWeight:600,lineHeight:1.5}}>{n.desc}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
