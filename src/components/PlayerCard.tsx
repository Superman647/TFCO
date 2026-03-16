import React from 'react';
import { Player } from '../types';

interface Props { player: Player; onClick?: () => void; size?: 'xs'|'sm'|'md'|'lg'; className?: string; selected?: boolean; }

const SF=(id:number)=>`https://cdn.sofifa.net/players/${id}/24_240.png`;
const AV=(n:string)=>`https://ui-avatars.com/api/?name=${encodeURIComponent(n)}&background=1a2a4a&color=7eb3ff&size=128&bold=true`;
const SOFIFA:Record<string,number>={p1:158023,p2:20801,p3:192476,p4:203376,p5:192119,p6:231747,p7:190871,p8:215914,p9:201024,p10:208722,p11:188545,p12:177003,p13:182521,p14:245367,p15:211117,p16:239087,p17:200069,p18:209331,p19:239085,p20:220834,p21:202126,p22:238794,p23:245369,p24:244478,p26:246169,p27:188350,p28:237397,p29:200104,p30:234396};

function getBg(p:Player){
  if(p.rarity==='SUPER_LEGENDARY')return{bg:'linear-gradient(155deg,#7a20cc,#4a0a90,#1e0440)',border:'#9040e0',shadow:'0 0 25px rgba(144,64,224,0.55)'};
  if(p.rarity==='GOLD'&&p.ovr>=90)return{bg:'linear-gradient(155deg,#44ccee,#0066bb,#002255)',border:'#44ccee',shadow:'0 0 20px rgba(68,204,238,0.45)'};
  if(p.rarity==='GOLD')return{bg:'linear-gradient(155deg,#ffe066,#bb8800,#6a4a00)',border:'#ffe066',shadow:'0 0 15px rgba(200,160,0,0.3)'};
  if(p.rarity==='SILVER')return{bg:'linear-gradient(155deg,#ccdde8,#8899b0,#445566)',border:'#aabbcc',shadow:'none'};
  return{bg:'linear-gradient(155deg,#b07a40,#6a3f18,#3a1e08)',border:'#c08040',shadow:'none'};
}
function statColor(v:number){if(v>=90)return'#00e676';if(v>=80)return'#69f0ae';if(v>=70)return'#ffcd3c';if(v>=60)return'#ff9800';return'#ff5252';}
function getImg(p:Player){const id=SOFIFA[p.id];if(id&&id>0)return SF(id);return AV(p.name);}

export default function PlayerCard({player:p,onClick,size='md',className='',selected}:Props){
  const {bg,border,shadow}=getBg(p);
  const w={xs:64,sm:96,md:128,lg:176}[size];
  const h={xs:96,sm:144,md:192,lg:264}[size];
  const ovrSize={xs:16,sm:22,md:28,lg:36}[size];
  return (
    <div onClick={onClick} className={`card-shine ${className}`} style={{width:w,height:h,background:bg,border:`2px solid ${border}`,boxShadow:shadow,borderRadius:12,position:'relative',overflow:'hidden',cursor:'pointer',flexShrink:0,transition:'transform 0.18s,filter 0.18s',userSelect:'none',outline:selected?`2px solid white`:undefined}} onMouseEnter={e=>{(e.currentTarget as HTMLElement).style.transform='scale(1.06)';(e.currentTarget as HTMLElement).style.filter='brightness(1.12)';}} onMouseLeave={e=>{(e.currentTarget as HTMLElement).style.transform='scale(1)';(e.currentTarget as HTMLElement).style.filter='brightness(1)';}}>
      {/* Top left: OVR + POS + Flag */}
      <div style={{position:'absolute',top:5,left:5,zIndex:20,display:'flex',flexDirection:'column',alignItems:'center',gap:1}}>
        <div style={{fontFamily:"'Oxanium',sans-serif",fontWeight:800,fontSize:ovrSize,lineHeight:1,textShadow:'0 1px 4px rgba(0,0,0,0.6)',color:'white'}}>{p.ovr}</div>
        <div style={{fontWeight:800,fontSize:ovrSize*0.38,color:'rgba(255,255,255,0.9)',lineHeight:1}}>{p.position}</div>
        {p.nation&&<img src={`https://flagcdn.com/w20/${p.nation.toLowerCase()}.png`} alt={p.nation} style={{width:16,height:'auto',borderRadius:2,marginTop:2}} onError={e=>{(e.target as HTMLElement).style.display='none';}} />}
      </div>
      {/* Level badge */}
      <div style={{position:'absolute',top:5,right:5,zIndex:20,background:'rgba(0,0,0,0.55)',borderRadius:4,padding:'1px 5px',fontSize:9,fontWeight:900,color:'white'}}>+{p.level}</div>
      {/* Player image */}
      <div style={{position:'absolute',inset:0,display:'flex',alignItems:'center',justifyContent:'center',paddingBottom:'35%',paddingTop:'10%',zIndex:10}}>
        <img src={getImg(p)} alt={p.name} style={{width:'70%',height:'70%',objectFit:'contain',filter:'drop-shadow(0 4px 12px rgba(0,0,0,0.7))'}} onError={e=>{(e.target as HTMLImageElement).src=AV(p.name);}} />
      </div>
      {/* Bottom: name + stats */}
      <div style={{position:'absolute',bottom:0,left:0,right:0,background:'rgba(0,0,0,0.6)',backdropFilter:'blur(4px)',padding:'5px 6px',zIndex:20}}>
        <div style={{textAlign:'center',fontWeight:800,fontSize:size==='xs'?7:size==='sm'?9:size==='md'?11:13,color:'white',textTransform:'uppercase',letterSpacing:0.5,whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis',marginBottom:3,fontFamily:"'Exo 2',sans-serif"}}>{p.name.split(' ').pop()}</div>
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'1px 6px'}}>
          {[['PAC',p.stats.pac],['SHO',p.stats.sho],['PAS',p.stats.pas],['DRI',p.stats.dri],['DEF',p.stats.def],['PHY',p.stats.phy]].map(([l,v])=>(
            <div key={l as string} style={{display:'flex',justifyContent:'space-between',fontSize:size==='xs'?6:size==='sm'?7:8}}>
              <span style={{color:'rgba(255,255,255,0.55)',fontWeight:700}}>{l}</span>
              <span style={{fontWeight:800,color:statColor(v as number)}}>{v}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
