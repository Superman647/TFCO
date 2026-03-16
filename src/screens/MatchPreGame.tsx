import React, { useState } from 'react';
import { Difficulty } from '../types';

interface Props {
  userTeamName: string;
  opponentName: string;
  difficulty: Difficulty;
  onStart: (diff: Difficulty) => void;
  onBack: () => void;
}

const DIFFS: { id: Difficulty; label: string; sub: string; color: string }[] = [
  { id: 'EASY',   label: 'Nghiệp dư 1',    sub: 'AI chậm, ít tấn công',     color: '#00d4a0' },
  { id: 'MEDIUM', label: 'Nghiệp dư 2',    sub: 'Cân bằng, thách thức vừa', color: '#ffcd3c' },
  { id: 'HARD',   label: 'Chuyên nghiệp',  sub: 'AI Pro, phản xạ nhanh',    color: '#ff5555' },
];

const TABS = ['Thông tin đội', 'Chọn độ khó', 'Cài đặt'];

export default function MatchPreGame({ userTeamName, opponentName, onStart, onBack }: Props) {
  const [tab, setTab] = useState(0);
  const [selDiff, setSelDiff] = useState<Difficulty>('MEDIUM');

  return (
    <div style={{ height: '100%', position: 'relative', overflow: 'hidden', display: 'flex', flexDirection: 'column', background: '#050b1a', fontFamily: "'Exo 2',sans-serif" }}>
      {/* Stadium bg */}
      <div style={{ position: 'absolute', inset: 0, backgroundImage: "url('https://images.unsplash.com/photo-1459865264687-595d652de67e?q=80&w=2000')", backgroundSize: 'cover', backgroundPosition: 'center', filter: 'brightness(0.25) saturate(0.6)' }} />
      <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(180deg,rgba(5,8,15,0.4),rgba(5,8,15,0.75))' }} />

      {/* FC Online branding strip */}
      <div style={{ position: 'relative', zIndex: 10, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '6px 24px', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
        {['FC ONLINE', 'EA SPORTS', 'FIFA ONLINE'].map((l, i) => (
          <span key={i} style={{ fontSize: 10, fontWeight: 700, color: 'rgba(255,255,255,0.3)', letterSpacing: 3 }}>{l}</span>
        ))}
      </div>

      {/* Title */}
      <div style={{ position: 'relative', zIndex: 10, textAlign: 'center', padding: '10px 0 2px' }}>
        <div style={{ fontSize: 13, fontWeight: 800, color: 'rgba(255,255,255,0.8)', letterSpacing: 5 }}>Xếp hạng</div>
      </div>

      {/* Tabs */}
      <div style={{ position: 'relative', zIndex: 10, display: 'flex', justifyContent: 'center', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
        {TABS.map((t, i) => (
          <button key={i} onClick={() => setTab(i)} style={{ padding: '8px 22px', background: 'transparent', border: 'none', borderBottom: tab === i ? '2px solid #00b4ff' : '2px solid transparent', color: tab === i ? '#00b4ff' : 'rgba(255,255,255,0.45)', fontFamily: "'Exo 2',sans-serif", fontWeight: 700, fontSize: 13, cursor: 'pointer', transition: 'all 0.15s', letterSpacing: 0.5 }}>{t}</button>
        ))}
      </div>

      {/* Body */}
      <div style={{ flex: 1, position: 'relative', zIndex: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
        {/* Left player */}
        <div style={{ position: 'absolute', left: '3%', bottom: 0, height: '78%', display: 'flex', alignItems: 'flex-end' }}>
          <img src="https://cdn.sofifa.net/players/158023/24_240.png" alt="" style={{ height: '100%', objectFit: 'contain', filter: 'drop-shadow(0 0 20px rgba(0,0,0,0.9))', opacity: 0.9 }} onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }} />
        </div>
        {/* Right player */}
        <div style={{ position: 'absolute', right: '3%', bottom: 0, height: '78%', display: 'flex', alignItems: 'flex-end', transform: 'scaleX(-1)' }}>
          <img src="https://cdn.sofifa.net/players/231747/24_240.png" alt="" style={{ height: '100%', objectFit: 'contain', filter: 'drop-shadow(0 0 20px rgba(0,0,0,0.9))', opacity: 0.9 }} onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }} />
        </div>

        {/* Center panel */}
        <div style={{ background: 'rgba(5,8,15,0.88)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 16, padding: '28px 36px', maxWidth: 460, width: '90%', backdropFilter: 'blur(20px)' }}>

          {/* TAB 0: Team info */}
          {tab === 0 && (
            <>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 28, marginBottom: 24 }}>
                <div style={{ textAlign: 'center', flex: 1 }}>
                  <div style={{ width: 60, height: 60, borderRadius: '50%', background: 'linear-gradient(135deg,#003399,#0055cc)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 10px', border: '2px solid rgba(255,255,255,0.25)', fontSize: 14, fontWeight: 900, fontFamily: "'Oxanium',sans-serif", boxShadow: '0 0 20px rgba(0,80,180,0.5)' }}>{userTeamName.substring(0, 2).toUpperCase()}</div>
                  <div style={{ fontWeight: 800, fontSize: 15, color: 'white', marginBottom: 3 }}>{userTeamName}</div>
                  <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', fontWeight: 600 }}>Chưa đạt Cốc mức xếp hạng 1</div>
                  <div style={{ marginTop: 6, display: 'inline-block', background: 'rgba(255,255,255,0.06)', borderRadius: 20, padding: '2px 12px', fontSize: 10, fontWeight: 700, color: 'rgba(255,255,255,0.6)', border: '1px solid rgba(255,255,255,0.1)' }}>🏅 Nghiệp dư 1</div>
                </div>
                <div style={{ fontFamily: "'Oxanium',sans-serif", fontWeight: 900, fontSize: 26, color: 'rgba(255,255,255,0.2)', letterSpacing: 4 }}>VS</div>
                <div style={{ textAlign: 'center', flex: 1 }}>
                  <div style={{ width: 60, height: 60, borderRadius: '50%', background: 'linear-gradient(135deg,#660000,#cc0000)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 10px', border: '2px solid rgba(255,255,255,0.25)', fontSize: 14, fontWeight: 900, fontFamily: "'Oxanium',sans-serif", boxShadow: '0 0 20px rgba(180,0,0,0.5)' }}>{opponentName.substring(0, 2).toUpperCase()}</div>
                  <div style={{ fontWeight: 800, fontSize: 15, color: 'white', marginBottom: 3 }}>{opponentName}</div>
                  <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', fontWeight: 600 }}>Cốc mức xếp hạng</div>
                </div>
              </div>
              <div style={{ display: 'flex', gap: 10 }}>
                <button onClick={onBack} style={{ flex: 1, padding: '10px 0', borderRadius: 8, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.12)', color: 'rgba(255,255,255,0.6)', fontWeight: 800, fontSize: 13, cursor: 'pointer' }}>← Quay lại</button>
                <button onClick={() => setTab(1)} style={{ flex: 2, padding: '10px 0', borderRadius: 8, background: 'linear-gradient(135deg,#0d6b5a,#00d4a0)', border: 'none', color: '#001a14', fontWeight: 900, fontSize: 14, cursor: 'pointer', letterSpacing: 2 }}>Tiếp theo →</button>
              </div>
            </>
          )}

          {/* TAB 1: Difficulty */}
          {tab === 1 && (
            <>
              <div style={{ fontFamily: "'Oxanium',sans-serif", fontWeight: 800, fontSize: 16, letterSpacing: 3, marginBottom: 18, textAlign: 'center' }}>CHỌN ĐỘ KHÓ</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 20 }}>
                {DIFFS.map(d => (
                  <div key={d.id} onClick={() => setSelDiff(d.id)}
                    style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '12px 16px', borderRadius: 10, cursor: 'pointer', border: `2px solid ${selDiff === d.id ? d.color : 'rgba(255,255,255,0.08)'}`, background: selDiff === d.id ? `${d.color}12` : 'rgba(255,255,255,0.03)', transition: 'all 0.15s' }}>
                    <div style={{ width: 12, height: 12, borderRadius: '50%', background: selDiff === d.id ? d.color : 'rgba(255,255,255,0.2)', border: `2px solid ${d.color}`, flexShrink: 0, boxShadow: selDiff === d.id ? `0 0 8px ${d.color}` : 'none' }} />
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 800, fontSize: 14, color: selDiff === d.id ? d.color : 'white' }}>{d.label}</div>
                      <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.45)', fontWeight: 600 }}>{d.sub}</div>
                    </div>
                  </div>
                ))}
              </div>
              <div style={{ display: 'flex', gap: 10 }}>
                <button onClick={() => setTab(0)} style={{ flex: 1, padding: '10px 0', borderRadius: 8, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.12)', color: 'rgba(255,255,255,0.6)', fontWeight: 800, fontSize: 13, cursor: 'pointer' }}>← Back</button>
                <button onClick={() => onStart(selDiff)} style={{ flex: 2, padding: '11px 0', borderRadius: 8, background: 'linear-gradient(135deg,#0d6b5a,#00d4a0)', border: 'none', color: '#001a14', fontWeight: 900, fontSize: 15, cursor: 'pointer', letterSpacing: 2 }}>⚽ Trận thẳng</button>
              </div>
            </>
          )}

          {/* TAB 2: Settings */}
          {tab === 2 && (
            <>
              <div style={{ fontFamily: "'Oxanium',sans-serif", fontWeight: 800, fontSize: 16, letterSpacing: 3, marginBottom: 18, textAlign: 'center' }}>CÀI ĐẶT TRẬN ĐẤU</div>
              {[['Thời lượng', '90 phút'], ['Thời tiết', 'Nắng đẹp'], ['Sân đấu', 'Wembley'], ['Khán giả', '80,000']].map(([k, v]) => (
                <div key={k} style={{ display: 'flex', justifyContent: 'space-between', padding: '11px 0', borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
                  <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.55)', fontWeight: 600 }}>{k}</span>
                  <span style={{ fontSize: 13, fontWeight: 800, color: 'white' }}>{v}</span>
                </div>
              ))}
              <button onClick={() => onStart(selDiff)} style={{ width: '100%', padding: '12px 0', marginTop: 18, borderRadius: 8, background: 'linear-gradient(135deg,#0d6b5a,#00d4a0)', border: 'none', color: '#001a14', fontWeight: 900, fontSize: 14, cursor: 'pointer', letterSpacing: 2 }}>⚽ Bắt đầu</button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
