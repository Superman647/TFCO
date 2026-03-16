import React, { useState, useEffect } from 'react';
import { Player } from '../types';
import { generateRandomPlayer } from '../data/players';
import PlayerCard from '../components/PlayerCard';

interface Props { coins:number; onBuy:(p:Player,cost:number)=>void; }
interface Item { id:string; player:Player; price:number; seller:string; }

const SELLERS=['FC Barcelona','Man City','Real Madrid','PSG','Bayern','Chelsea','Arsenal','Liverpool','Juventus'];
function price(p:Player){ return Math.floor(Math.pow(Math.max(0,p.ovr-50),2.4)*2.2)+200; }
function rarColor(r:string){ return({SUPER_LEGENDARY:'#b060ff',GOLD:'#ffcd3c',SILVER:'#a0b0c0',BRONZE:'#c08040'})[r]||'#888'; }

export default function TransferMarketScreen({coins,onBuy}:Props){
  const [items,setItems]=useState<Item[]>([]);
  const [filter,setFilter]=useState<'ALL'|'FW'|'MF'|'DF'|'GK'>('ALL');
  const [sort,setSort]=useState<'ovr'|'price'>('ovr');
  const [search,setSearch]=useState('');
  const [buying,setBuying]=useState<string|null>(null);
  const [flash,setFlash]=useState<string|null>(null);

  useEffect(()=>{
    const mk:Item[]=[];
    for(let i=0;i<20;i++){
      const t=Math.random()>0.85?'GOLD':Math.random()>0.5?'SILVER':'BRONZE';
      const p=generateRandomPlayer(t as any);
      mk.push({id:`mk_${i}`,player:p,price:price(p),seller:SELLERS[Math.floor(Math.random()*SELLERS.length)]});
    }
    setItems(mk);
  },[]);

  const buy=(item:Item)=>{
    if(coins<item.price) return;
    setBuying(item.id);
    setTimeout(()=>{
      onBuy(item.player,item.price);
      setItems(prev=>prev.filter(i=>i.id!==item.id));
      setFlash(item.player.name);
      setBuying(null);
      setTimeout(()=>setFlash(null),2500);
    },600);
  };

  const refresh=()=>{
    const mk:Item[]=[];
    for(let i=0;i<20;i++){
      const t=Math.random()>0.85?'GOLD':Math.random()>0.5?'SILVER':'BRONZE';
      const p=generateRandomPlayer(t as any);
      mk.push({id:`mk_r${i}_${Date.now()}`,player:p,price:price(p),seller:SELLERS[Math.floor(Math.random()*SELLERS.length)]});
    }
    setItems(mk);
  };

  const shown=items
    .filter(i=>filter==='ALL'||i.player.position===filter)
    .filter(i=>!search||i.player.name.toLowerCase().includes(search.toLowerCase()))
    .sort((a,b)=>sort==='ovr'?b.player.ovr-a.player.ovr:a.price-b.price);

  return (
    <div style={{height:'100%',display:'flex',flexDirection:'column',background:'#05080f',overflow:'hidden',fontFamily:"'Exo 2',sans-serif"}}>
      {/* Header */}
      <div style={{padding:'14px 20px',borderBottom:'1px solid rgba(0,180,255,0.12)',background:'rgba(5,11,26,0.97)',display:'flex',alignItems:'center',gap:12,flexWrap:'wrap'}}>
        <div style={{fontFamily:"'Oxanium',sans-serif",fontWeight:800,fontSize:18,letterSpacing:3}}>🔄 CHỢ CHUYỂN NHƯỢNG</div>
        <div style={{flex:1}} />
        <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="🔍 Tìm kiếm..." style={{background:'rgba(255,255,255,0.05)',border:'1px solid rgba(0,180,255,0.2)',borderRadius:8,padding:'7px 12px',color:'white',fontSize:13,fontWeight:600,outline:'none',width:180}} />
        <div style={{display:'flex',gap:4}}>
          {(['ALL','FW','MF','DF','GK'] as const).map(f=>(
            <button key={f} onClick={()=>setFilter(f)} style={{padding:'6px 12px',borderRadius:8,background:filter===f?'rgba(0,180,255,0.2)':'rgba(255,255,255,0.04)',border:`1px solid ${filter===f?'rgba(0,180,255,0.4)':'rgba(255,255,255,0.08)'}`,color:filter===f?'#00b4ff':'rgba(255,255,255,0.6)',fontSize:12,fontWeight:800,cursor:'pointer'}}>{f}</button>
          ))}
        </div>
        <select value={sort} onChange={e=>setSort(e.target.value as any)} style={{background:'rgba(255,255,255,0.05)',border:'1px solid rgba(0,180,255,0.2)',borderRadius:8,padding:'7px 10px',color:'white',fontSize:12,outline:'none'}}>
          <option value="ovr">Sắp xếp: OVR</option>
          <option value="price">Sắp xếp: Giá</option>
        </select>
        <button onClick={refresh} style={{padding:'7px 14px',borderRadius:8,background:'rgba(0,180,255,0.1)',border:'1px solid rgba(0,180,255,0.3)',color:'#00b4ff',fontWeight:800,fontSize:12,cursor:'pointer',letterSpacing:1}}>🔄 Làm mới</button>
        <div style={{background:'rgba(255,205,60,0.1)',border:'1px solid rgba(255,205,60,0.3)',borderRadius:20,padding:'5px 14px',fontSize:13,fontWeight:800,color:'#ffcd3c'}}>🪙 {coins.toLocaleString()}</div>
      </div>

      {/* Success flash */}
      {flash&&(
        <div style={{padding:'10px 20px',background:'rgba(0,200,80,0.15)',borderBottom:'1px solid rgba(0,200,80,0.3)',fontSize:13,fontWeight:700,color:'#00e676',display:'flex',alignItems:'center',gap:8}}>
          ✅ Đã mua thành công: <b>{flash}</b>
        </div>
      )}

      {/* Player grid */}
      <div style={{flex:1,overflowY:'auto',padding:'16px 20px'}}>
        {shown.length===0?(
          <div style={{textAlign:'center',padding:'60px 0',color:'rgba(255,255,255,0.3)'}}>
            <div style={{fontSize:48,marginBottom:12}}>🔍</div>
            <div style={{fontWeight:700}}>Không tìm thấy cầu thủ</div>
          </div>
        ):(
          <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(200px,1fr))',gap:14}}>
            {shown.map(item=>{
              const canBuy=coins>=item.price;
              const isLoading=buying===item.id;
              return (
                <div key={item.id} style={{background:'rgba(255,255,255,0.03)',border:`1px solid ${rarColor(item.player.rarity)}22`,borderRadius:14,overflow:'hidden',transition:'transform 0.2s,border-color 0.2s',display:'flex',flexDirection:'column'}}
                  onMouseEnter={e=>{(e.currentTarget as HTMLElement).style.transform='translateY(-3px)';(e.currentTarget as HTMLElement).style.borderColor=`${rarColor(item.player.rarity)}55`;}}
                  onMouseLeave={e=>{(e.currentTarget as HTMLElement).style.transform='none';(e.currentTarget as HTMLElement).style.borderColor=`${rarColor(item.player.rarity)}22`;}}>
                  <div style={{padding:'12px',display:'flex',justifyContent:'center',background:`${rarColor(item.player.rarity)}08`}}>
                    <PlayerCard player={item.player} size="sm" />
                  </div>
                  <div style={{padding:'10px 12px',borderTop:'1px solid rgba(255,255,255,0.06)',flex:1,display:'flex',flexDirection:'column',gap:6}}>
                    <div style={{fontSize:10,color:'rgba(255,255,255,0.4)',fontWeight:600}}>Người bán: {item.seller}</div>
                    <div style={{display:'flex',alignItems:'center',justifyContent:'space-between'}}>
                      <div style={{fontSize:16,fontWeight:900,color:'#ffcd3c',fontFamily:"'Oxanium',sans-serif"}}>🪙 {item.price.toLocaleString()}</div>
                      <div style={{fontSize:10,fontWeight:800,padding:'2px 8px',borderRadius:20,background:`${rarColor(item.player.rarity)}22`,color:rarColor(item.player.rarity)}}>{item.player.rarity}</div>
                    </div>
                    <button onClick={()=>buy(item)} disabled={!canBuy||isLoading} style={{padding:'8px 0',borderRadius:8,background:canBuy&&!isLoading?'linear-gradient(135deg,#0066cc,#00b4ff)':'rgba(255,255,255,0.05)',border:'none',color:canBuy&&!isLoading?'white':'rgba(255,255,255,0.3)',fontWeight:800,fontSize:12,cursor:canBuy&&!isLoading?'pointer':'not-allowed',letterSpacing:1,transition:'all 0.15s'}}>
                      {isLoading?'ĐANG MUA...':canBuy?'MUA NGAY':'KHÔNG ĐỦ COINS'}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
