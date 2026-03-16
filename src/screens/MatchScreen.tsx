import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Squad, Player, Difficulty } from '../types';
import { generateRandomPlayer } from '../data/players';
import { FORMATION_POSITIONS } from '../constants';
import { useAudio } from '../contexts/AudioContext';

interface Props {
  squad: Squad; onFinish:(c:number,xp:Record<string,number>,sA?:number,sB?:number,stats?:any)=>void;
  opponentName?:string; opponentColor?:string; userTeamName?:string; userTeamColor?:string;
  forcedDifficulty?:Difficulty; isWorldCup?:boolean; onWorldCupContinue?:()=>void;
  mustHaveWinner?:boolean; mode?:'FULL_MATCH'|'PENALTY_SHOOTOUT'|'TRAINING';
  drillType?:'DRIBBLING'|'PASSING'|'SHOOTING';
  socket?:any; matchId?:string; isHost?:boolean; opponentSquad?:Squad;
}

// ── World dimensions (centimetres)
const PW = 1050, PH = 680;
const GOAL_Y1 = 265, GOAL_Y2 = 415;
const PR = 12, BALL_R = 7;
const PLAYER_DAMP = 0.84, BALL_DAMP = 0.955, SPEED = 0.045;

// ── Camera settings
const CAM_OFFSET_Y  = PH * 0.32;   // camera sits this far behind the ball
const CAM_LERP      = 0.07;        // smoothing speed
const VISIBLE_RANGE = PH * 0.85;   // how much of the pitch is visible vertically
const PERSP_NEAR    = 0.92;        // bottom of screen (y ratio)
const PERSP_FAR     = 0.08;        // top of screen
const PERSP_STRENGTH = 2.2;        // perspective intensity

type Ent = {
  id:string; x:number; y:number; vx:number; vy:number;
  tx:number|null; ty:number|null; team:'A'|'B'; playerData:Player;
  hasBall:boolean; homeX:number; homeY:number; isSentOff?:boolean;
  lastKickTime?:number; health:number; isInjured?:boolean; dir:number;
  animPhase:number; // walking animation
};

type PenState = {
  turn:'A'|'B'; round:number; phase:'aiming'|'shooting'|'saving'|'result';
  timer:number; scoreA:number; scoreB:number;
  history:{team:'A'|'B';result:'goal'|'miss'}[];
  shotTarget?:{x:number;y:number}; keeperDive?:{x:number;y:number}; isSingleKick?:boolean;
};

const SOUNDS = {
  goal:'https://assets.mixkit.co/active_storage/sfx/2000/2000-preview.mp3',
  kick:'https://assets.mixkit.co/active_storage/sfx/2092/2092-preview.mp3',
  whistle:'https://assets.mixkit.co/active_storage/sfx/1003/1003-preview.mp3',
};

// ── PERSPECTIVE PROJECTION ────────────────────────────────────────────────────
function worldToScreen(wx:number, wy:number, camX:number, camY:number, W:number, H:number) {
  // wy relative to camera (negative = behind camera = off screen)
  const relY = wy - camY;
  const t    = (relY + VISIBLE_RANGE * 0.25) / VISIBLE_RANGE; // 0=far, 1=near
  if(t < -0.1 || t > 1.15) return null;

  const tc    = Math.max(0, Math.min(1, t));
  const persp = 1 / (1 + (1 - tc) * PERSP_STRENGTH);
  const halfW = W * 0.48 * persp;

  const relX  = wx - camX;
  const sx    = W * 0.5 + relX * persp;
  const sy    = H * (PERSP_FAR + tc * (PERSP_NEAR - PERSP_FAR));

  return { x:sx, y:sy, scale: persp * 1.6, t:tc };
}

// ── GRASS DRAWING (perspective stripes) ──────────────────────────────────────
function drawPitch3D(ctx:CanvasRenderingContext2D, W:number, H:number, camX:number, camY:number) {
  // Draw horizontal stripes by projecting pitch Y slices
  const STRIPES = 16;
  for(let s=0; s<STRIPES; s++) {
    const y0 = s     / STRIPES * PH;
    const y1 = (s+1) / STRIPES * PH;
    const p0 = worldToScreen(0, y0, camX, camY, W, H);
    const p1 = worldToScreen(PW, y0, camX, camY, W, H);
    const p2 = worldToScreen(PW, y1, camX, camY, W, H);
    const p3 = worldToScreen(0, y1, camX, camY, W, H);
    if(!p0||!p1||!p2||!p3) continue;

    ctx.fillStyle = s%2===0 ? '#2e8a3c' : '#358f44';
    ctx.beginPath();
    ctx.moveTo(p0.x, p0.y); ctx.lineTo(p1.x, p1.y);
    ctx.lineTo(p2.x, p2.y); ctx.lineTo(p3.x, p3.y);
    ctx.closePath(); ctx.fill();
  }

  // Pitch lines
  ctx.strokeStyle = 'rgba(255,255,255,0.78)';
  ctx.lineWidth = 2;
  ctx.setLineDash([]);

  const line = (points:[number,number][]) => {
    const proj = points.map(([x,y]) => worldToScreen(x,y,camX,camY,W,H));
    if(proj.some(p=>!p)) return;
    ctx.beginPath();
    proj.forEach((p,i) => { if(!p) return; i===0 ? ctx.moveTo(p.x,p.y) : ctx.lineTo(p.x,p.y); });
    ctx.stroke();
  };

  // Touchlines & goal lines
  line([[0,0],[PW,0]]); line([[0,PH],[PW,PH]]);
  line([[0,0],[0,PH]]); line([[PW,0],[PW,PH]]);
  // Halfway
  line([[0,PH/2],[PW,PH/2]]);

  // Center circle (approximated with line segments)
  const CX=PW/2, CY=PH/2, CR=85;
  const circPts:[number,number][] = [];
  for(let a=0;a<=64;a++) { const ag=a/64*Math.PI*2; circPts.push([CX+Math.cos(ag)*CR, CY+Math.sin(ag)*CR]); }
  line(circPts);
  // Center dot
  const cd = worldToScreen(CX, CY, camX, camY, W, H);
  if(cd) { ctx.fillStyle='rgba(255,255,255,0.8)'; ctx.beginPath(); ctx.arc(cd.x,cd.y,2.5*cd.scale,0,Math.PI*2); ctx.fill(); }

  // Penalty areas
  const PA_W=165, PA_H=290;
  line([[0,PH/2-PA_H/2],[PA_W,PH/2-PA_H/2],[PA_W,PH/2+PA_H/2],[0,PH/2+PA_H/2],[0,PH/2-PA_H/2]]);
  line([[PW,PH/2-PA_H/2],[PW-PA_W,PH/2-PA_H/2],[PW-PA_W,PH/2+PA_H/2],[PW,PH/2+PA_H/2],[PW,PH/2-PA_H/2]]);

  // Goal areas
  const GA_W=55, GA_H=120;
  line([[0,PH/2-GA_H/2],[GA_W,PH/2-GA_H/2],[GA_W,PH/2+GA_H/2],[0,PH/2+GA_H/2]]);
  line([[PW,PH/2-GA_H/2],[PW-GA_W,PH/2-GA_H/2],[PW-GA_W,PH/2+GA_H/2],[PW,PH/2+GA_H/2]]);

  // Penalty spots
  const psDraw = (x:number) => {
    const ps = worldToScreen(x, PH/2, camX, camY, W, H);
    if(ps) { ctx.fillStyle='rgba(255,255,255,0.8)'; ctx.beginPath(); ctx.arc(ps.x,ps.y,2*ps.scale,0,Math.PI*2); ctx.fill(); }
  };
  psDraw(115); psDraw(PW-115);

  // Penalty arcs
  const arcPts = (cx:number, r:number, a0:number, a1:number):[number,number][] => {
    const pts:[number,number][] = [];
    const steps=20;
    for(let i=0;i<=steps;i++) { const a=a0+(a1-a0)*i/steps; pts.push([cx+Math.cos(a)*r, PH/2+Math.sin(a)*r]); }
    return pts;
  };
  line(arcPts(PA_W, 85, -1.0, 1.0)); line(arcPts(PW-PA_W, 85, Math.PI-1.0, Math.PI+1.0));

  // Corner arcs
  const cornerArc = (cx:number, cy:number, a0:number, a1:number) => {
    const pts:[number,number][] = [];
    for(let i=0;i<=8;i++) { const a=a0+(a1-a0)*i/8; pts.push([cx+Math.cos(a)*22, cy+Math.sin(a)*22]); }
    line(pts);
  };
  cornerArc(0,0,0,Math.PI/2); cornerArc(PW,0,Math.PI/2,Math.PI);
  cornerArc(PW,PH,Math.PI,1.5*Math.PI); cornerArc(0,PH,1.5*Math.PI,2*Math.PI);

  // Goals (3D goal frames)
  drawGoal3D(ctx, 0, camX, camY, W, H, false);
  drawGoal3D(ctx, PW, camX, camY, W, H, true);
}

function drawGoal3D(ctx:CanvasRenderingContext2D, gx:number, camX:number, camY:number, W:number, H:number, isRight:boolean) {
  const DEPTH = isRight ? -25 : 25;
  const posts:[number,number][] = [[gx, GOAL_Y1],[gx, GOAL_Y2]];
  const postProj = posts.map(([x,y]) => worldToScreen(x,y,camX,camY,W,H));
  if(!postProj[0]||!postProj[1]) return;

  // Goal posts (white)
  ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 4;
  ctx.beginPath(); ctx.moveTo(postProj[0].x, postProj[0].y); ctx.lineTo(postProj[1].x, postProj[1].y); ctx.stroke();

  // Crossbar and back
  const back0 = worldToScreen(gx+DEPTH, GOAL_Y1, camX, camY, W, H);
  const back1 = worldToScreen(gx+DEPTH, GOAL_Y2, camX, camY, W, H);
  if(!back0||!back1) return;

  ctx.strokeStyle = 'rgba(255,255,255,0.7)'; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.moveTo(postProj[0].x,postProj[0].y); ctx.lineTo(back0.x,back0.y); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(postProj[1].x,postProj[1].y); ctx.lineTo(back1.x,back1.y); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(back0.x,back0.y); ctx.lineTo(back1.x,back1.y); ctx.stroke();

  // Net (diagonal lines)
  ctx.strokeStyle = 'rgba(255,255,255,0.2)'; ctx.lineWidth = 0.8;
  const steps=6;
  for(let i=0;i<=steps;i++){
    const gy = GOAL_Y1 + (GOAL_Y2-GOAL_Y1)*i/steps;
    const fp = worldToScreen(gx, gy, camX, camY, W, H);
    const bp = worldToScreen(gx+DEPTH, gy, camX, camY, W, H);
    if(fp&&bp){ ctx.beginPath(); ctx.moveTo(fp.x,fp.y); ctx.lineTo(bp.x,bp.y); ctx.stroke(); }
  }
}

// ── PLAYER 3D ─────────────────────────────────────────────────────────────────
function drawPlayer3D(ctx:CanvasRenderingContext2D, p:Ent, sx:number, sy:number, scale:number, isCtrl:boolean, posLabel:string) {
  const S = scale * 28;
  const kitColor = p.team === 'A' ? '#1565c0' : '#c62828';
  const shortColor = p.team === 'A' ? '#0d3b86' : '#7a1010';
  const skinColor  = '#d4a574';

  // Ground shadow
  ctx.save();
  ctx.globalAlpha = 0.35;
  ctx.fillStyle = '#000';
  ctx.beginPath();
  ctx.ellipse(sx, sy + S*0.08, S*0.55, S*0.15, 0, 0, Math.PI*2);
  ctx.fill();
  ctx.globalAlpha = 1;

  // Animate walking (legs)
  const phase = p.animPhase;
  const legSwing = Math.sin(phase) * 0.3;
  const moving = Math.hypot(p.vx,p.vy) > 0.3;

  // Left leg
  ctx.fillStyle = shortColor;
  ctx.save();
  ctx.translate(sx - S*0.12, sy - S*0.05);
  ctx.rotate(moving ? legSwing : 0);
  ctx.fillRect(-S*0.08, 0, S*0.16, S*0.45);
  // Sock (white)
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(-S*0.07, S*0.3, S*0.14, S*0.15);
  ctx.restore();

  // Right leg
  ctx.fillStyle = shortColor;
  ctx.save();
  ctx.translate(sx + S*0.12, sy - S*0.05);
  ctx.rotate(moving ? -legSwing : 0);
  ctx.fillRect(-S*0.08, 0, S*0.16, S*0.45);
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(-S*0.07, S*0.3, S*0.14, S*0.15);
  ctx.restore();

  // Body/jersey
  const bodyGrd = ctx.createLinearGradient(sx-S*0.3, sy-S*1.05, sx+S*0.3, sy-S*0.1);
  bodyGrd.addColorStop(0, lightenColor(kitColor, 50));
  bodyGrd.addColorStop(1, kitColor);
  ctx.fillStyle = bodyGrd;
  ctx.beginPath();
  ctx.roundRect?.(sx - S*0.28, sy - S*1.05, S*0.56, S*0.62, S*0.1) ?? ctx.rect(sx-S*0.28, sy-S*1.05, S*0.56, S*0.62);
  ctx.fill();
  // Jersey number stripe
  ctx.fillStyle = 'rgba(255,255,255,0.15)';
  ctx.fillRect(sx-S*0.1, sy-S*0.7, S*0.2, S*0.08);

  // Neck
  ctx.fillStyle = skinColor;
  ctx.fillRect(sx - S*0.08, sy - S*1.15, S*0.16, S*0.14);

  // Head
  const headGrd = ctx.createRadialGradient(sx-S*0.05, sy-S*1.38, 0, sx, sy-S*1.3, S*0.22);
  headGrd.addColorStop(0, lightenColor(skinColor, 30));
  headGrd.addColorStop(1, skinColor);
  ctx.fillStyle = headGrd;
  ctx.beginPath();
  ctx.arc(sx, sy - S*1.3, S*0.22, 0, Math.PI*2);
  ctx.fill();

  // Hair color based on player name
  const hairColors = ['#1a1206','#8B4513','#DAA520','#2a1a1a','#cc8800'];
  ctx.fillStyle = hairColors[Math.abs((p.playerData.name.charCodeAt(0)||65)) % hairColors.length];
  ctx.beginPath();
  ctx.arc(sx, sy - S*1.35, S*0.22, Math.PI, Math.PI*2);
  ctx.fill();

  // Arms
  ctx.fillStyle = kitColor;
  ctx.save();
  ctx.translate(sx - S*0.32, sy - S*0.95);
  ctx.rotate(moving ? -legSwing*0.5 : -0.15);
  ctx.fillRect(-S*0.08, 0, S*0.16, S*0.4);
  ctx.fillStyle = skinColor; ctx.fillRect(-S*0.07, S*0.3, S*0.14, S*0.12);
  ctx.restore();
  ctx.fillStyle = kitColor;
  ctx.save();
  ctx.translate(sx + S*0.32, sy - S*0.95);
  ctx.rotate(moving ? legSwing*0.5 : 0.15);
  ctx.fillRect(-S*0.08, 0, S*0.16, S*0.4);
  ctx.fillStyle = skinColor; ctx.fillRect(-S*0.07, S*0.3, S*0.14, S*0.12);
  ctx.restore();

  // Controlled player indicator: red downward triangle (like Image 3)
  if(isCtrl) {
    ctx.fillStyle = '#e53935';
    ctx.beginPath();
    ctx.moveTo(sx, sy - S*1.7);
    ctx.lineTo(sx - S*0.18, sy - S*1.95);
    ctx.lineTo(sx + S*0.18, sy - S*1.95);
    ctx.closePath(); ctx.fill();
  }

  // Name tag (like Image 3: "F. Ribéry" in white above player)
  if(scale > 0.55) {
    const shortName = p.playerData.name.split(' ').slice(-1)[0] || p.playerData.name;
    const label = posLabel ? `${posLabel} ${shortName}` : shortName;
    ctx.font = `bold ${Math.max(9, S*0.45)}px 'Exo 2',sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'bottom';
    const tw = ctx.measureText(label).width;
    // bg pill
    ctx.fillStyle = 'rgba(0,0,0,0.55)';
    ctx.beginPath();
    ctx.roundRect?.(sx - tw/2 - 3, sy - S*2.0 - 14, tw + 6, 15, 3) ?? ctx.rect(sx-tw/2-3, sy-S*2.0-14, tw+6, 15);
    ctx.fill();
    ctx.fillStyle = '#ffffff';
    ctx.fillText(label, sx, sy - S*2.0);
  }

  // OVR small badge
  if(scale > 0.7) {
    ctx.font = `bold ${Math.max(7,S*0.35)}px 'Exo 2',sans-serif`;
    ctx.fillStyle = p.team==='A' ? '#60aaff' : '#ff7070';
    ctx.fillText(p.playerData.ovr.toString(), sx, sy - S*2.15);
  }

  ctx.restore?.();
}

function lightenColor(hex:string, amt:number): string {
  const r = Math.min(255, parseInt(hex.slice(1,3),16)+amt);
  const g = Math.min(255, parseInt(hex.slice(3,5),16)+amt);
  const b = Math.min(255, parseInt(hex.slice(5,7),16)+amt);
  return `#${r.toString(16).padStart(2,'0')}${g.toString(16).padStart(2,'0')}${b.toString(16).padStart(2,'0')}`;
}

// ── BALL 3D ──────────────────────────────────────────────────────────────────
function drawBall3D(ctx:CanvasRenderingContext2D, sx:number, sy:number, scale:number, spin:number) {
  const r = Math.max(4, BALL_R * scale * 1.4);
  ctx.save();
  // Shadow
  ctx.globalAlpha = 0.4;
  ctx.fillStyle = '#000';
  ctx.beginPath(); ctx.ellipse(sx, sy+r*0.5, r*1.1, r*0.35, 0, 0, Math.PI*2); ctx.fill();
  ctx.globalAlpha = 1;
  // Ball
  const g = ctx.createRadialGradient(sx-r*0.3, sy-r*0.3, 0, sx, sy, r);
  g.addColorStop(0,'#ffffff'); g.addColorStop(0.6,'#dddddd'); g.addColorStop(1,'#888888');
  ctx.fillStyle = g;
  ctx.beginPath(); ctx.arc(sx, sy, r, 0, Math.PI*2); ctx.fill();
  // Panels
  ctx.save(); ctx.translate(sx,sy); ctx.rotate(spin);
  ctx.strokeStyle = '#222'; ctx.lineWidth = 0.7;
  for(let i=0;i<5;i++) {
    ctx.save(); ctx.rotate(i/5*Math.PI*2);
    ctx.beginPath();
    ctx.moveTo(0,-r*0.45); ctx.lineTo(r*0.28,-r*0.12); ctx.lineTo(r*0.17,r*0.28); ctx.lineTo(-r*0.17,r*0.28); ctx.lineTo(-r*0.28,-r*0.12);
    ctx.closePath(); ctx.stroke(); ctx.restore();
  }
  ctx.restore(); ctx.restore();
}

// ── MINIMAP ───────────────────────────────────────────────────────────────────
function drawMinimap(ctx:CanvasRenderingContext2D, players:Ent[], ball:{x:number;y:number}, ctrlId:string|null, W:number, H:number) {
  const MW=140, MH=88, MX=(W-MW)/2, MY=H-MH-8;
  ctx.save();
  // BG
  ctx.fillStyle='rgba(0,0,0,0.7)'; ctx.strokeStyle='rgba(255,255,255,0.3)'; ctx.lineWidth=1;
  ctx.beginPath(); ctx.roundRect?.(MX,MY,MW,MH,4) ?? ctx.rect(MX,MY,MW,MH); ctx.fill(); ctx.stroke();
  // Pitch lines
  ctx.strokeStyle='rgba(255,255,255,0.35)'; ctx.lineWidth=0.7;
  ctx.strokeRect(MX+4,MY+4,MW-8,MH-8);
  ctx.beginPath(); ctx.moveTo(MX+MW/2,MY+4); ctx.lineTo(MX+MW/2,MY+MH-4); ctx.stroke();
  ctx.beginPath(); ctx.arc(MX+MW/2,MY+MH/2,MH*0.18,0,Math.PI*2); ctx.stroke();
  // Players
  players.forEach(p=>{
    if(p.isSentOff) return;
    const px=MX+4+(p.x/PW)*(MW-8);
    const py=MY+4+(p.y/PH)*(MH-8);
    ctx.fillStyle = p.team==='A' ? (p.id===ctrlId ? '#ffcd3c' : '#4499ff') : '#ff6644';
    ctx.beginPath(); ctx.arc(px,py,p.id===ctrlId?3.5:2.5,0,Math.PI*2); ctx.fill();
    if(p.id===ctrlId){ ctx.strokeStyle='#fff'; ctx.lineWidth=0.8; ctx.stroke(); }
  });
  // Ball (yellow cross like Image 3)
  const bx=MX+4+(ball.x/PW)*(MW-8);
  const by=MY+4+(ball.y/PH)*(MH-8);
  ctx.strokeStyle='#ffcd3c'; ctx.lineWidth=1.5;
  ctx.beginPath(); ctx.moveTo(bx-4,by); ctx.lineTo(bx+4,by); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(bx,by-4); ctx.lineTo(bx,by+4); ctx.stroke();
  ctx.restore();
}

// ── MAIN COMPONENT ────────────────────────────────────────────────────────────
export default function MatchScreen({squad,onFinish,opponentName,userTeamName,forcedDifficulty,isWorldCup,onWorldCupContinue,mustHaveWinner,mode='FULL_MATCH',drillType,socket,matchId,isHost,opponentSquad}:Props){
  const {playAudio,stopAudio}=useAudio();
  const canvasRef=useRef<HTMLCanvasElement>(null);
  const [score,setScore]=useState({A:0,B:0});
  const [timeLeft,setTimeLeft]=useState(0);
  const [half,setHalf]=useState<1|2|3|4>(1);
  const [isFinished,setIsFinished]=useState(false);
  const [uiState,setUiState]=useState<'intro'|'playing'|'halftime'|'extratime_break'|'penalties'|'finished'>('intro');
  const [difficulty,setDifficulty]=useState<Difficulty>(forcedDifficulty||'MEDIUM');
  const [introTimer,setIntroTimer]=useState(6);
  const [isPaused,setIsPaused]=useState(false);
  const [activeLog,setActiveLog]=useState<string|null>(null);
  const [logQueue,setLogQueue]=useState<string[]>([]);
  const [penState,setPenState]=useState<PenState>({turn:'A',round:1,phase:'aiming',timer:0,scoreA:0,scoreB:0,history:[]});
  const [matchStats,setMatchStats]=useState<{goals:{playerId:string;minute:number;team:'A'|'B'}[];ratings:Record<string,number>}>({goals:[],ratings:{}});
  const [isMobile,setIsMobile]=useState(false);
  const [orientation,setOrientation]=useState<'portrait'|'landscape'>('landscape');
  const [joystick,setJoystick]=useState({x:0,y:0,active:false});
  const [goalAnim,setGoalAnim]=useState<{team:'A'|'B';scorer:string}|null>(null);
  const [shotPower,setShotPower]=useState(0);
  const [showPower,setShowPower]=useState(false);

  const keys=useRef<Record<string,boolean>>({});
  const ctrlId=useRef<string|null>(null);
  const mouseTarget=useRef<{x:number;y:number}|null>(null);
  const joyRef=useRef<{sx:number;sy:number}|null>(null);
  const joyStateRef=useRef({x:0,y:0,active:false});
  const audioRefs=useRef<Record<string,HTMLAudioElement>>({});
  const aiTeamRef=useRef<Player[]|null>(null);
  const initHalfRef=useRef(0);
  const ballSpinRef=useRef(0);
  const shotChargeRef=useRef(0);
  const shotChargingRef=useRef(false);
  const camRef=useRef({x:PW/2, y:PH/2}); // smooth camera position

  const gs=useRef({
    ball:{x:PW/2,y:PH/2,vx:0,vy:0},
    players:[] as Ent[],
    score:{A:0,B:0},
    state:'INTRO' as 'INTRO'|'PLAYING'|'GOAL'|'HALFTIME'|'EXTRATIME_BREAK'|'PENALTIES'|'FINISHED'|'PAUSED',
    timer:0, kickOffTeam:'A' as 'A'|'B', kickOffInv:0,
    penState:{turn:'A',round:1,phase:'aiming',timer:0,scoreA:0,scoreB:0,history:[]} as PenState,
    passTargetId:null as string|null, passTime:0,
  });

  const POS_LABELS: Record<number,string> = {0:'GK',1:'LB',2:'CB',3:'CB',4:'RB',5:'LM',6:'CM',7:'RM',8:'LW',9:'ST',10:'RW'};
  const POS_LABELS_B: Record<number,string> = {0:'GK',1:'RB',2:'CB',3:'CB',4:'LB',5:'RM',6:'CM',7:'LM',8:'RW',9:'ST',10:'LW'};

  useEffect(()=>{const c=()=>{setIsMobile(/Android|webOS|iPhone|iPad|iPod/i.test(navigator.userAgent)||window.innerWidth<1024);setOrientation(window.innerHeight>window.innerWidth?'portrait':'landscape');};c();window.addEventListener('resize',c);return()=>window.removeEventListener('resize',c);},[]);

  useEffect(()=>{
    Object.entries(SOUNDS).forEach(([k,url])=>{const a=new Audio(url);audioRefs.current[k]=a;});
    playAudio('MATCH_AMBIENT',true);
    const dn=(e:KeyboardEvent)=>{keys.current[e.code]=true;if(['Space','ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(e.code))e.preventDefault();};
    const up=(e:KeyboardEvent)=>{keys.current[e.code]=false;};
    window.addEventListener('keydown',dn);window.addEventListener('keyup',up);
    return()=>{window.removeEventListener('keydown',dn);window.removeEventListener('keyup',up);Object.values(audioRefs.current).forEach(a=>{a.pause();a.src='';});stopAudio('MATCH_AMBIENT');};
  },[]);

  const snd=(k:keyof typeof SOUNDS)=>{const a=audioRefs.current[k];if(a){a.currentTime=0;a.play().catch(()=>{});}};
  const addLog=(m:string)=>setLogQueue(p=>[...p,`${Math.floor(gs.current.timer)}' ${m}`]);
  useEffect(()=>{if(activeLog){const t=setTimeout(()=>setActiveLog(null),2800);return()=>clearTimeout(t);}},[ activeLog]);
  useEffect(()=>{if(!activeLog&&logQueue.length>0){setActiveLog(logQueue[0]);setLogQueue(p=>p.slice(1));}},[activeLog,logQueue]);

  useEffect(()=>{
    if(uiState!=='intro') return;
    const init:Record<string,number>={};
    squad.lineup.forEach(p=>{if(p)init[p.id]=6.5;});
    setMatchStats(prev=>({...prev,ratings:init}));
    const iv=setInterval(()=>{setIntroTimer(prev=>{if(prev<=1){setUiState('playing');gs.current.state='PLAYING';return 0;}return prev-1;});},1000);
    return()=>clearInterval(iv);
  },[uiState]);

  const resetPos=useCallback((ko:'A'|'B'='A')=>{
    gs.current.ball={x:PW/2,y:PH/2,vx:0,vy:0};
    gs.current.kickOffTeam=ko;gs.current.kickOffInv=3000;
    gs.current.players.forEach(p=>{if(p.isSentOff)return;p.x=p.homeX;p.y=p.homeY;p.vx=0;p.vy=0;p.tx=null;p.ty=null;p.hasBall=false;});
    mouseTarget.current=null;
  },[half]);

  useEffect(()=>{
    if(uiState==='intro'&&uiState!=='playing') return;
    if(!aiTeamRef.current){
      let pt:'BRONZE'|'SILVER'|'GOLD'|'SUPER_LEGENDARY'='SILVER';
      if(difficulty==='EASY')pt='BRONZE';if(difficulty==='MEDIUM')pt='GOLD';if(difficulty==='HARD')pt='SUPER_LEGENDARY';
      aiTeamRef.current=Array(11).fill(null).map(()=>generateRandomPlayer(pt));
    }
    if(squad.lineup.filter(Boolean).length<11){setTimeout(()=>onFinish(0,{}),100);return;}

    if(initHalfRef.current!==half){
      const ai=aiTeamRef.current!;
      const aiPos=FORMATION_POSITIONS['4-3-3'];
      ai.forEach((p,i)=>{p.position=aiPos[i]?.pos||'MF';});
      const formA=FORMATION_POSITIONS[squad.formation]||FORMATION_POSITIONS['4-3-3'];
      const swapped=(half===2||half===4)&&mode!=='TRAINING';
      const pl:Ent[]=[];
      squad.lineup.slice(0,11).forEach((p,i)=>{
        if(!p||!formA[i])return;
        const bx=formA[i].matchX;const fx=swapped?(1-bx):bx;
        pl.push({id:`a_${i}`,x:fx*PW,y:formA[i].matchY*PH,vx:0,vy:0,tx:null,ty:null,team:'A',playerData:p,hasBall:false,homeX:fx*PW,homeY:formA[i].matchY*PH,health:100,dir:0,animPhase:Math.random()*Math.PI*2});
      });
      ai.forEach((p,i)=>{
        const bx=1-aiPos[i].matchX;const fx=swapped?(1-bx):bx;
        pl.push({id:`b_${i}`,x:fx*PW,y:aiPos[i].matchY*PH,vx:0,vy:0,tx:null,ty:null,team:'B',playerData:p,hasBall:false,homeX:fx*PW,homeY:aiPos[i].matchY*PH,health:100,dir:Math.PI,animPhase:Math.random()*Math.PI*2});
      });
      gs.current.players=pl;initHalfRef.current=half;
      ctrlId.current=pl.find(p=>p.team==='A')?.id||null;
      if(half>1)resetPos(half%2===0?'B':'A');
    }

    let raf:number;let last=performance.now();

    const update=(dt:number)=>{
      const g=gs.current;
      if(g.state==='PAUSED'||isPaused) return;

      // Animate players
      g.players.forEach(p=>{ if(Math.hypot(p.vx,p.vy)>0.3) p.animPhase+=dt*0.012; });
      ballSpinRef.current+=Math.hypot(g.ball.vx,g.ball.vy)*0.04;

      // Smooth camera: follow controlled player / ball
      const ctrl=g.players.find(p=>p.id===ctrlId.current)||g.players.find(p=>p.team==='A');
      const targetCamX = Math.max(PW*0.3, Math.min(PW*0.7, g.ball.x));
      const targetCamY = Math.max(PH*0.3, Math.min(PH*0.7, g.ball.y + CAM_OFFSET_Y));
      camRef.current.x += (targetCamX - camRef.current.x) * CAM_LERP;
      camRef.current.y += (targetCamY - camRef.current.y) * CAM_LERP;

      if(g.state==='PENALTIES'){
        const ps=g.penState;
        if(ps.phase==='shooting'){
          ps.timer+=dt;
          const prog=Math.min(1,ps.timer/420);
          const ox=ps.turn==='A'?PW-140:140;
          if(!ps.shotTarget)ps.shotTarget={x:ps.turn==='A'?PW:0,y:(GOAL_Y1+GOAL_Y2)/2+(Math.random()-0.5)*100};
          g.ball.x=ox+(ps.shotTarget.x-ox)*prog;g.ball.y=PH/2+(ps.shotTarget.y-PH/2)*prog;
          if(ps.timer>580){
            let goal=false;const sy=ps.shotTarget.y;
            if(ps.turn==='A'){if(!ps.keeperDive)ps.keeperDive={x:PW-20,y:(GOAL_Y1+GOAL_Y2)/2+(Math.random()-0.5)*100};if(Math.abs(sy-ps.keeperDive.y)>42&&sy>GOAL_Y1&&sy<GOAL_Y2)goal=true;}
            else{const dy=ps.keeperDive?.y||PH/2;if(Math.abs(sy-dy)>42&&sy>GOAL_Y1&&sy<GOAL_Y2)goal=true;}
            const nh=[...ps.history,{team:ps.turn,result:goal?'goal':'miss'} as const];
            const nA=ps.scoreA+(ps.turn==='A'&&goal?1:0);const nB=ps.scoreB+(ps.turn==='B'&&goal?1:0);
            if(goal)snd('goal');else snd('whistle');
            if(ps.isSingleKick){if(goal){if(ps.turn==='A')setScore(s=>({...s,A:s.A+1}));else setScore(s=>({...s,B:s.B+1}));}setTimeout(()=>{setUiState('playing');g.state='PLAYING';resetPos(ps.turn==='A'?'B':'A');},1500);ps.phase='result';ps.timer=0;setPenState({...ps});return;}
            let winner=null;if(ps.turn==='B'&&ps.round>=5&&nA!==nB)winner=nA>nB?'A':'B';if(ps.round>5&&ps.turn==='B'&&nA!==nB)winner=nA>nB?'A':'B';
            if(winner){setScore({A:g.score.A+nA,B:g.score.B+nB});setUiState('finished');setIsFinished(true);finalizeMatch();return;}
            ps.phase='result';ps.timer=0;ps.scoreA=nA;ps.scoreB=nB;ps.history=nh;setPenState({...ps});
          }
        } else if(ps.phase==='result'){ps.timer+=dt;if(ps.timer>1400){const nt=ps.turn==='A'?'B':'A';const nr=nt==='A'?ps.round+1:ps.round;g.ball.x=nt==='A'?PW-140:140;g.ball.y=PH/2;ps.turn=nt;ps.round=nr;ps.phase=nt==='A'?'aiming':'saving';ps.timer=0;ps.shotTarget=undefined;ps.keeperDive=undefined;setPenState({...ps});}}
        return;
      }
      if(g.state!=='PLAYING') return;
      if(g.kickOffInv>0)g.kickOffInv-=dt;

      const mpms=(half<=2?45:15)/((half<=2?30:15)*1000);
      g.timer+=dt*mpms;setTimeLeft(Math.floor(g.timer));

      if(half===1&&g.timer>=45){g.state='HALFTIME';setUiState('halftime');return;}
      if(half===2&&g.timer>=90){if(score.A===score.B&&mustHaveWinner){g.state='EXTRATIME_BREAK';setUiState('extratime_break');}else{g.state='FINISHED';setUiState('finished');setIsFinished(true);finalizeMatch();}return;}
      if(half===3&&g.timer>=105){g.state='EXTRATIME_BREAK';setUiState('extratime_break');return;}
      if(half===4&&g.timer>=120){if(score.A===score.B){g.state='PENALTIES';setUiState('penalties');}else{g.state='FINISHED';setUiState('finished');setIsFinished(true);finalizeMatch();}return;}

      const {ball,players}=g;
      const swapped=(half===2||half===4)&&mode!=='TRAINING';

      ball.x+=ball.vx;ball.y+=ball.vy;ball.vx*=BALL_DAMP;ball.vy*=BALL_DAMP;
      if(Math.abs(ball.vx)<0.04)ball.vx=0;if(Math.abs(ball.vy)<0.04)ball.vy=0;
      if(ball.y<8){ball.y=8;ball.vy*=-0.65;}if(ball.y>PH-8){ball.y=PH-8;ball.vy*=-0.65;}

      const checkGoal=(side:'left'|'right')=>{
        const isGoal=ball.y>GOAL_Y1&&ball.y<GOAL_Y2;
        if(!isGoal){if(side==='left'){ball.x=8;ball.vx*=-0.65;}else{ball.x=PW-8;ball.vx*=-0.65;}return;}
        if(mode==='TRAINING'){ball.x=PW/2;ball.y=PH/2;ball.vx=0;ball.vy=0;return;}
        const teamScored:'A'|'B'=(side==='right'&&!swapped)||(side==='left'&&swapped)?'A':'B';
        g.score[teamScored]++;setScore({...g.score});g.state='GOAL';snd('goal');
        const scorer=teamScored==='A'?(players.find(p=>p.id===ctrlId.current&&p.team==='A')||players.find(p=>p.team==='A')):null;
        const sname=scorer?.playerData.name||(teamScored==='A'?(userTeamName||'Home'):(opponentName||'Away'));
        setGoalAnim({team:teamScored,scorer:sname});setTimeout(()=>setGoalAnim(null),3200);
        setMatchStats(prev=>({...prev,goals:[...prev.goals,{playerId:scorer?.playerData.id||'ai',minute:Math.floor(g.timer),team:teamScored}],ratings:scorer?{...prev.ratings,[scorer.playerData.id]:(prev.ratings[scorer.playerData.id]||6.5)+1.5}:prev.ratings}));
        addLog(`⚽ ${sname} GHI BÀN!`);
        setTimeout(()=>{g.state='PLAYING';resetPos(teamScored==='A'?'B':'A');},3200);
      };
      if(ball.x<8)checkGoal('left');else if(ball.x>PW-8)checkGoal('right');

      const teamA=players.filter(p=>p.team==='A'&&!p.isSentOff);
      const ballOwner=players.find(p=>!p.isSentOff&&Math.hypot(ball.x-p.x,ball.y-p.y)<PR+BALL_R+7);
      if(ballOwner?.team==='A'){ctrlId.current=ballOwner.id;}
      else if(teamA.length>0){
        const cl=teamA.reduce((a,b)=>Math.hypot(ball.x-a.x,ball.y-a.y)<Math.hypot(ball.x-b.x,ball.y-b.y)?a:b);
        const cu=teamA.find(p=>p.id===ctrlId.current);
        if(cu){const dc=Math.hypot(ball.x-cu.x,ball.y-cu.y);if(Math.hypot(ball.x-cl.x,ball.y-cl.y)<dc*0.75)ctrlId.current=cl.id;}
        else ctrlId.current=cl.id;
      }
      if(keys.current['KeyQ']||keys.current['Tab']){keys.current['KeyQ']=false;keys.current['Tab']=false;if(teamA.length>1){const idx=teamA.findIndex(p=>p.id===ctrlId.current);ctrlId.current=teamA[(idx+1)%teamA.length].id;}}

      const active=players.filter(p=>!p.isSentOff);
      for(let i=0;i<active.length;i++)for(let j=i+1;j<active.length;j++){
        const p1=active[i],p2=active[j];const d=Math.hypot(p1.x-p2.x,p1.y-p2.y);
        if(d<PR*2&&d>0){const a=Math.atan2(p1.y-p2.y,p1.x-p2.x);const ov=PR*2-d;p1.x+=Math.cos(a)*ov*0.5;p1.y+=Math.sin(a)*ov*0.5;p2.x-=Math.cos(a)*ov*0.5;p2.y-=Math.sin(a)*ov*0.5;}
      }

      if(keys.current['Space']||keys.current['KeyJ']){
        if(!shotChargingRef.current){shotChargingRef.current=true;shotChargeRef.current=0;}
        shotChargeRef.current=Math.min(100,shotChargeRef.current+dt*0.12);setShotPower(shotChargeRef.current);setShowPower(true);
      } else if(shotChargingRef.current){
        shotChargingRef.current=false;setShowPower(false);
        const p=players.find(pl=>pl.id===ctrlId.current&&pl.team==='A');
        if(p&&p.hasBall){const now=Date.now();if(!p.lastKickTime||now-p.lastKickTime>250){p.lastKickTime=now;const power=(shotChargeRef.current/100)*p.playerData.stats.sho*0.35+8;const gx=swapped?0:PW;const err=(100-p.playerData.stats.sho)*0.004*(Math.random()-0.5);const ang=Math.atan2(PH/2-p.y,gx-p.x)+err;ball.vx=Math.cos(ang)*power;ball.vy=Math.sin(ang)*power;p.hasBall=false;addLog(`🎯 ${p.playerData.name} SÚT!`);snd('kick');}}
        shotChargeRef.current=0;
      }

      players.forEach(p=>{
        if(p.isSentOff)return;
        const now=Date.now();const distBall=Math.hypot(ball.x-p.x,ball.y-p.y);
        const recentKick=p.lastKickTime&&(now-p.lastKickTime<340);
        const isPT=g.passTargetId===p.id&&(now-g.passTime<2000);
        let grace=p.id===ctrlId.current?24:14;if(isPT)grace=46;
        p.hasBall=!recentKick&&distBall<PR+BALL_R+grace;
        if(p.hasBall&&isPT)g.passTargetId=null;

        if(p.id===ctrlId.current&&p.team==='A'){
          const sprint=keys.current['ShiftLeft']||keys.current['ShiftRight']||keys.current['KeyL'];
          const speed=p.playerData.stats.pac*SPEED*(sprint?1.55:1.0);
          let mx=0,my=0;
          if(keys.current['ArrowUp']||keys.current['KeyW'])my-=1;
          if(keys.current['ArrowDown']||keys.current['KeyS'])my+=1;
          if(keys.current['ArrowLeft']||keys.current['KeyA'])mx-=1;
          if(keys.current['ArrowRight']||keys.current['KeyD'])mx+=1;
          const jst=joyStateRef.current;
          if(jst.active&&(Math.abs(jst.x)>5||Math.abs(jst.y)>5)){mx=jst.x/40;my=jst.y/40;}
          if(mouseTarget.current&&mx===0&&my===0){const dx=mouseTarget.current.x-p.x;const dy=mouseTarget.current.y-p.y;const d=Math.hypot(dx,dy);if(d>6){mx=dx/d;my=dy/d;}else mouseTarget.current=null;}
          if(mx!==0||my!==0){const mg=Math.hypot(mx,my);p.vx+=(mx/mg)*speed*0.22;p.vy+=(my/mg)*speed*0.22;p.dir=Math.atan2(my,mx);}

          const passKey=keys.current['KeyX']||keys.current['KeyK'];
          const canKick=!p.lastKickTime||now-p.lastKickTime>270;
          if(passKey&&canKick){
            keys.current['KeyX']=false;keys.current['KeyK']=false;p.lastKickTime=now;
            if(p.hasBall){
              const tms=players.filter(t=>t.team==='A'&&t.id!==p.id&&!t.isSentOff);
              const gx=swapped?0:PW;let best:Ent|null=null,bs=-Infinity;
              tms.forEach(t=>{const dt=Math.hypot(t.x-p.x,t.y-p.y);if(dt>400)return;const atg=Math.atan2(PH/2-p.y,gx-p.x);const att=Math.atan2(t.y-p.y,t.x-p.x);const al=Math.cos(att-atg);const sc=al*500+(Math.hypot(gx-p.x,PH/2-p.y)-Math.hypot(gx-t.x,PH/2-t.y))*2;if(sc>bs){bs=sc;best=t;}});
              if(best){const t=best as Ent;const ang=Math.atan2(t.y-p.y,t.x-p.x);const err=(100-p.playerData.stats.pas)*0.003*(Math.random()-0.5);const pwr=Math.min(16,Math.hypot(t.x-p.x,t.y-p.y)*0.04+5);ball.vx=Math.cos(ang+err)*pwr;ball.vy=Math.sin(ang+err)*pwr;ctrlId.current=t.id;g.passTargetId=t.id;g.passTime=now;mouseTarget.current=null;addLog(`🅿️ ${p.playerData.name} → ${t.playerData.name}`);snd('kick');}
            } else {
              const tr=p.playerData.stats.def*0.4+18;if(distBall<tr){const cd=p.team==='A'?(swapped?-1:1):(swapped?1:-1);ball.vx=(Math.random()*6+7)*cd;ball.vy=(Math.random()-0.5)*12;snd('kick');addLog(`${p.playerData.name} tắc bóng!`);}
            }
          }
          if(p.hasBall&&!recentKick){const da=Math.atan2(p.vy,p.vx)||p.dir;const ds=p.playerData.stats.dri;const dd=PR+BALL_R+(100-ds)*0.04;ball.x+=(p.x+Math.cos(da)*dd-ball.x)*0.9;ball.y+=(p.y+Math.sin(da)*dd-ball.y)*0.9;ball.vx=p.vx+(Math.random()-0.5)*(100-ds)*0.04;ball.vy=p.vy+(Math.random()-0.5)*(100-ds)*0.04;}
        } else {
          const tms=players.filter(t=>t.team===p.team&&!t.isSentOff);
          const cl=tms.reduce((a,b)=>Math.hypot(ball.x-a.x,ball.y-a.y)<Math.hypot(ball.x-b.x,ball.y-b.y)?a:b);
          const ck=!p.lastKickTime||now-p.lastKickTime>380;
          if(p.hasBall){
            const gx=p.team==='A'?(swapped?0:PW):(swapped?PW:0);const dg=Math.hypot(gx-p.x,PH/2-p.y);
            const ats=players.filter(t=>t.team===p.team&&t.id!==p.id&&!t.isSentOff);
            let bp:Ent|null=null,bps=-Infinity;
            ats.forEach(t=>{const dt=Math.hypot(t.x-p.x,t.y-p.y);const tdg=Math.hypot(gx-t.x,PH/2-t.y);if(tdg<dg-40&&dt<320){const sc=(dg-tdg)*2-dt*0.08;if(sc>bps){bps=sc;bp=t;}}});
            const danger=p.team==='A'?(swapped?p.x>PW-160:p.x<160):(swapped?p.x<160:p.x>PW-160);
            let dm=1;if(difficulty==='EASY')dm=0.7;if(difficulty==='HARD')dm=1.25;
            if(danger&&ck){snd('kick');const ca=p.team==='A'?(swapped?Math.PI+(Math.random()-0.5)*0.5:(Math.random()-0.5)*0.5):(swapped?(Math.random()-0.5)*0.5:Math.PI+(Math.random()-0.5)*0.5);ball.vx=Math.cos(ca)*14;ball.vy=Math.sin(ca)*14;p.hasBall=false;p.lastKickTime=now;}
            else if(bp&&Math.random()<0.52&&ck){const t=bp as Ent;const a=Math.atan2(t.y-p.y,t.x-p.x);const pw=Math.min(14,Math.hypot(t.x-p.x,t.y-p.y)*0.044+4);ball.vx=Math.cos(a)*pw;ball.vy=Math.sin(a)*pw;p.hasBall=false;p.lastKickTime=now;}
            else if(dg<260&&ck){snd('kick');const pw=p.playerData.stats.sho*0.22*dm;const ia=(100-p.playerData.stats.sho)*0.012;const a=Math.atan2(PH/2-p.y+(Math.random()-0.5)*ia*100,gx-p.x);ball.vx=Math.cos(a)*pw;ball.vy=Math.sin(a)*pw;p.hasBall=false;p.lastKickTime=now;addLog(`${p.playerData.name} sút!`);}
            else{const a=Math.atan2(PH/2-p.y,gx-p.x);ball.x=p.x+Math.cos(a)*(PR+BALL_R);ball.y=p.y+Math.sin(a)*(PR+BALL_R);ball.vx=p.vx;ball.vy=p.vy;}
          } else if(p.playerData.position==='GK'){
            p.vx+=(p.homeX-p.x)*0.04;p.vy+=(Math.max(GOAL_Y1+18,Math.min(GOAL_Y2-18,ball.y))-p.y)*0.07;
            if(distBall<22&&g.kickOffInv<=0){const cd=p.team==='A'?(swapped?-1:1):(swapped?1:-1);ball.vx+=(Math.random()*8+8)*cd;ball.vy+=(Math.random()-0.5)*12;snd('kick');p.lastKickTime=now;}
          } else if(cl.id===p.id){
            p.vx+=(ball.x-p.x)*0.016;p.vy+=(ball.y-p.y)*0.016;
            if(p.team==='B'&&distBall<20&&g.kickOffInv<=0){let dm=1;if(difficulty==='EASY')dm=0.5;if(difficulty==='HARD')dm=1.3;if(Math.random()<0.022*dm){const cd=swapped?1:-1;ball.vx+=(Math.random()*6+6)*cd;ball.vy+=(Math.random()-0.5)*10;snd('kick');p.lastKickTime=now;}}
          } else {
            const bf=(ball.x-PW/2)*0.28;const bfy=(ball.y-PH/2)*0.28;
            p.vx+=(p.homeX+(p.team==='A'?bf:-bf)-p.x)*0.012;p.vy+=(p.homeY+bfy-p.y)*0.012;
          }
          let dm=1;if(difficulty==='EASY')dm=0.7;if(difficulty==='HARD')dm=1.25;
          const spd=p.playerData.stats.pac*SPEED*(p.team==='B'?0.72*dm:1);
          const cs=Math.hypot(p.vx,p.vy);if(cs>spd){p.vx=(p.vx/cs)*spd;p.vy=(p.vy/cs)*spd;}
        }
        p.vx*=PLAYER_DAMP;p.vy*=PLAYER_DAMP;p.x+=p.vx;p.y+=p.vy;
        p.x=Math.max(PR,Math.min(PW-PR,p.x));p.y=Math.max(PR,Math.min(PH-PR,p.y));
        if(Math.hypot(p.vx,p.vy)>0.2)p.dir=Math.atan2(p.vy,p.vx);
      });
    };

    const draw=(ctx:CanvasRenderingContext2D,W:number,H:number)=>{
      const g=gs.current;
      const camX=camRef.current.x;
      const camY=camRef.current.y;

      // Sky gradient at top
      const sky=ctx.createLinearGradient(0,0,0,H*0.15);
      sky.addColorStop(0,'#87CEEB');sky.addColorStop(1,'#c8e8f0');
      ctx.fillStyle=sky;ctx.fillRect(0,0,W,H*0.15);

      // Crowd/stadium behind far side (subtle)
      ctx.fillStyle='rgba(40,35,30,0.6)';ctx.fillRect(0,H*0.08,W,H*0.1);

      // Pitch
      drawPitch3D(ctx,W,H,camX,camY);

      // Sort players by world Y (far drawn first)
      const sorted=[...g.players.filter(p=>!p.isSentOff)].sort((a,b)=>a.y-b.y);

      // Pass target indicator
      if(g.passTargetId){
        const pt=g.players.find(p=>p.id===g.passTargetId);
        if(pt){const proj=worldToScreen(pt.x,pt.y,camX,camY,W,H);if(proj){ctx.strokeStyle='rgba(0,230,120,0.8)';ctx.lineWidth=2;ctx.setLineDash([4,3]);ctx.beginPath();ctx.arc(proj.x,proj.y+proj.scale*5,proj.scale*22,0,Math.PI*2);ctx.stroke();ctx.setLineDash([]);}}
      }

      // Ball (draw when behind players)
      const ballProj=worldToScreen(g.ball.x,g.ball.y,camX,camY,W,H);

      // Draw players + ball in Y-sorted order
      let ballDrawn=false;
      sorted.forEach(p=>{
        if(!ballDrawn&&ballProj&&g.ball.y<p.y-20){drawBall3D(ctx,ballProj.x,ballProj.y,ballProj.scale,ballSpinRef.current);ballDrawn=true;}
        const proj=worldToScreen(p.x,p.y,camX,camY,W,H);
        if(!proj)return;
        const idx=parseInt(p.id.split('_')[1]||'0');
        const lbl=p.team==='A'?(POS_LABELS[idx]||''):(POS_LABELS_B[idx]||'');
        drawPlayer3D(ctx,p,proj.x,proj.y,proj.scale,p.id===ctrlId.current&&p.team==='A',lbl);
      });
      if(!ballDrawn&&ballProj)drawBall3D(ctx,ballProj.x,ballProj.y,ballProj.scale,ballSpinRef.current);

      // GOAL overlay
      if(g.state==='GOAL'){
        ctx.fillStyle='rgba(0,0,0,0.45)';ctx.fillRect(0,0,W,H);
        ctx.save();
        ctx.font=`bold 88px 'Oxanium',sans-serif`;ctx.textAlign='center';ctx.textBaseline='middle';
        ctx.shadowColor='#00e676';ctx.shadowBlur=40;ctx.fillStyle='#00ff88';
        ctx.fillText('GOL!',W/2,H/2);ctx.shadowBlur=0;ctx.restore();
      }

      // Minimap
      drawMinimap(ctx,g.players,g.ball,ctrlId.current,W,H);

      // Bottom player indicator (left and right, like Image 3)
      if(ctrlId.current){
        const cp=g.players.find(p=>p.id===ctrlId.current);
        if(cp){
          // Left: position badge (like "| RCB" in Image 3)
          const idx=parseInt(ctrlId.current.split('_')[1]||'0');
          const pos=POS_LABELS[idx]||cp.playerData.position;
          ctx.fillStyle='rgba(0,0,0,0.75)';ctx.fillRect(0,H-32,90,32);
          ctx.fillStyle='rgba(0,200,100,0.9)';ctx.fillRect(0,H-32,4,32);
          ctx.fillStyle='white';ctx.font=`bold 12px 'Exo 2',sans-serif`;ctx.textAlign='left';ctx.textBaseline='middle';
          ctx.fillText(`| ${pos}   ${cp.playerData.name.split(' ').pop()}`,8,H-16);
          // Right: stamina bar
          ctx.fillStyle='rgba(0,0,0,0.75)';ctx.fillRect(W-80,H-32,80,32);
          ctx.fillStyle='rgba(0,180,255,0.5)';ctx.fillRect(W-76,H-26,(cp.health||100)/100*72,10);
          ctx.strokeStyle='rgba(255,255,255,0.3)';ctx.strokeRect(W-76,H-26,72,10);
        }
      }
    };

    const loop=(time:number)=>{
      if(!canvasRef.current){raf=requestAnimationFrame(loop);return;}
      const dt=Math.min(50,time-last);last=time;
      update(dt);
      const canvas=canvasRef.current;
      const ctx=canvas.getContext('2d');
      if(ctx){ctx.clearRect(0,0,canvas.width,canvas.height);draw(ctx,canvas.width,canvas.height);}
      raf=requestAnimationFrame(loop);
    };
    raf=requestAnimationFrame(loop);
    return()=>cancelAnimationFrame(raf);
  },[squad,half,uiState,difficulty,isPaused]);

  const finalizeMatch=()=>{playAudio('WHISTLE_END');setMatchStats(prev=>{const r={...prev.ratings};if(score.A>score.B)Object.keys(r).forEach(id=>{r[id]=(r[id]||6.5)+0.8;});return{...prev,ratings:r};});};
  const handleFinish=()=>{
    const xp:Record<string,number>={};const mvp=Object.entries(matchStats.ratings).sort(([,a],[,b])=>b-a)[0];
    squad.lineup.forEach(p=>{if(p){let g=65;if(matchStats.ratings[p.id])g+=Math.floor(matchStats.ratings[p.id]*8);if(mvp&&p.id===mvp[0])g+=120;xp[p.id]=g;}});
    const fA=mode==='PENALTY_SHOOTOUT'?penState.scoreA:score.A;const fB=mode==='PENALTY_SHOOTOUT'?penState.scoreB:score.B;
    onFinish(fA>fB?600:fA===fB?250:120,xp,fA,fB,{score:`${fA}-${fB}`,opponent:opponentName||'AI',isWinner:fA>fB,competition:isWorldCup?'World Cup':'Match'});
  };

  // Canvas click → world coordinates via inverse perspective
  const canvasClick=(e:React.MouseEvent<HTMLCanvasElement>)=>{
    if(isMobile) return;
    const rect=canvasRef.current?.getBoundingClientRect();if(!rect)return;
    const sx=(e.clientX-rect.left)*(canvasRef.current!.width/rect.width);
    const sy=(e.clientY-rect.top)*(canvasRef.current!.height/rect.height);
    const W=canvasRef.current!.width, H=canvasRef.current!.height;
    const camX=camRef.current.x, camY=camRef.current.y;
    // Inverse: find t from sy
    const t=(sy/H-PERSP_FAR)/(PERSP_NEAR-PERSP_FAR);
    if(t<0||t>1) return;
    const persp=1/(1+(1-t)*PERSP_STRENGTH);
    const relX=(sx-W*0.5)/persp;
    const wx=relX+camX;
    const relY=t*VISIBLE_RANGE-VISIBLE_RANGE*0.25;
    const wy=relY+camY;
    mouseTarget.current={x:Math.max(0,Math.min(PW,wx)), y:Math.max(0,Math.min(PH,wy))};
  };

  const joyStart=(e:React.TouchEvent)=>{e.preventDefault();const t=e.touches[0];joyRef.current={sx:t.clientX,sy:t.clientY};const j={x:0,y:0,active:true};setJoystick(j);joyStateRef.current=j;};
  const joyMove=(e:React.TouchEvent)=>{e.preventDefault();if(!joyRef.current)return;const t=e.touches[0];const jx=Math.max(-42,Math.min(42,t.clientX-joyRef.current.sx));const jy=Math.max(-42,Math.min(42,t.clientY-joyRef.current.sy));const j={x:jx,y:jy,active:true};setJoystick(j);joyStateRef.current=j;};
  const joyEnd=(e:React.TouchEvent)=>{e.preventDefault();joyRef.current=null;const j={x:0,y:0,active:false};setJoystick(j);joyStateRef.current=j;mouseTarget.current=null;};

  const getMVP=()=>{const e=Object.entries(matchStats.ratings).sort(([,a],[,b])=>b-a)[0];return e?squad.lineup.find(p=>p?.id===e[0]):null;};

  const gameTimeStr=()=>{const m=Math.floor(timeLeft);const s=0;return `${m.toString().padStart(2,'0')}:${s.toString().padStart(2,'0')}`;};

  return(
    <div style={{height:'100%',display:'flex',flexDirection:'column',background:'#000',overflow:'hidden',userSelect:'none',touchAction:'none',fontFamily:"'Exo 2',sans-serif"}}>
      {isMobile&&orientation==='portrait'&&(<div style={{position:'fixed',inset:0,zIndex:999,background:'#050b1a',display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',textAlign:'center',padding:32}}><div style={{fontSize:64,marginBottom:16}}>↻</div><div style={{fontFamily:"'Oxanium',sans-serif",fontWeight:800,fontSize:28,letterSpacing:3}}>XOAY NGANG MÀN HÌNH</div></div>)}

      {/* ── FC Online Scoreboard (Image 3 style: top-left corner) ── */}
      {uiState==='playing'&&mode!=='TRAINING'&&(
        <div style={{position:'absolute',top:8,left:8,zIndex:50,display:'flex',alignItems:'center',gap:0,fontFamily:"'Oxanium',sans-serif",fontWeight:900}}>
          <div style={{background:'rgba(0,0,0,0.85)',border:'1px solid rgba(255,255,255,0.2)',borderRadius:6,padding:'4px 12px',display:'flex',alignItems:'center',gap:8,fontSize:22,color:'white'}}>
            <span>{score.A}</span>
            <span style={{width:1,height:22,background:'rgba(255,255,255,0.3)',display:'inline-block'}}/>
            <span>{score.B}</span>
          </div>
          <div style={{background:'rgba(0,0,0,0.8)',borderRadius:6,padding:'4px 10px',marginLeft:4,fontSize:13,fontWeight:800,color:'white',display:'flex',alignItems:'center',gap:6}}>
            <span style={{fontSize:14,filter:'drop-shadow(0 0 4px rgba(255,200,0,0.8))'}}>⭐</span>
            <span>{(opponentName||'AI').substring(0,6).toUpperCase()}</span>
          </div>
          <div style={{background:'rgba(0,0,0,0.85)',borderRadius:6,padding:'4px 12px',marginLeft:4,fontSize:16,fontWeight:900,color:'white',fontVariantNumeric:'tabular-nums'}}>
            {gameTimeStr()}
          </div>
        </div>
      )}

      {/* Half indicator */}
      {uiState==='playing'&&(
        <div style={{position:'absolute',top:8,right:8,zIndex:50,background:'rgba(0,0,0,0.7)',borderRadius:6,padding:'3px 10px',fontSize:11,fontWeight:800,color:'rgba(255,255,255,0.7)'}}>
          {half<=2?(half===1?'H1':'H2'):'ET'} {difficulty==='HARD'?'⭐⭐⭐':difficulty==='MEDIUM'?'⭐⭐':'⭐'}
        </div>
      )}

      {/* CANVAS */}
      <div style={{flex:1,position:'relative'}}>
        <canvas ref={canvasRef} width={1280} height={720}
          onClick={canvasClick}
          onTouchEnd={e=>{e.preventDefault();const t=e.changedTouches[0];const rect=canvasRef.current?.getBoundingClientRect();if(!rect)return;const sx=(t.clientX-rect.left)*(1280/rect.width);const sy=(t.clientY-rect.top)*(720/rect.height);const W=1280,H=720;const t2=(sy/H-PERSP_FAR)/(PERSP_NEAR-PERSP_FAR);if(t2<0||t2>1)return;const persp=1/(1+(1-t2)*PERSP_STRENGTH);const wx=(sx-W*0.5)/persp+camRef.current.x;const wy=t2*VISIBLE_RANGE-VISIBLE_RANGE*0.25+camRef.current.y;mouseTarget.current={x:Math.max(0,Math.min(PW,wx)),y:Math.max(0,Math.min(PH,wy))};}}
          style={{width:'100%',height:'100%',objectFit:'cover',touchAction:'none',cursor:'crosshair',display:'block'}}
        />

        {/* Goal flash */}
        {goalAnim&&(<div style={{position:'absolute',inset:0,zIndex:40,pointerEvents:'none',display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center'}}><div style={{position:'absolute',inset:0,background:goalAnim.team==='A'?'rgba(0,200,100,0.06)':'rgba(255,80,0,0.06)'}}/>  <div style={{textAlign:'center',animation:'bounceIn 0.5s cubic-bezier(0.175,0.885,0.32,1.275)'}}><div style={{fontFamily:"'Oxanium',sans-serif",fontWeight:800,fontSize:96,lineHeight:1,color:'#00ff88',textShadow:'0 0 40px #00e676,0 0 80px #00c851'}}>GOL!</div><div style={{fontWeight:800,fontSize:22,color:'white',letterSpacing:3,fontFamily:"'Exo 2',sans-serif"}}>{goalAnim.scorer}</div></div></div>)}

        {/* Shot power */}
        {showPower&&(<div style={{position:'absolute',bottom:100,left:'50%',transform:'translateX(-50%)',zIndex:50,display:'flex',flexDirection:'column',alignItems:'center',gap:4}}><div style={{fontSize:9,fontWeight:800,color:'rgba(255,255,255,0.7)',letterSpacing:'0.3em'}}>SỨC MẠNH</div><div style={{width:120,height:10,background:'rgba(255,255,255,0.15)',borderRadius:99,overflow:'hidden',border:'1px solid rgba(255,255,255,0.2)'}}><div style={{height:'100%',borderRadius:99,transition:'width 0.05s',width:`${shotPower}%`,background:shotPower>80?'#ff4444':shotPower>50?'#ffcd3c':'#00e676'}}/></div></div>)}

        {/* Log */}
        {uiState==='playing'&&activeLog&&(<div style={{position:'absolute',bottom:110,left:'50%',transform:'translateX(-50%)',zIndex:50,pointerEvents:'none',background:'rgba(5,11,26,0.8)',border:'1px solid rgba(0,180,255,0.3)',backdropFilter:'blur(12px)',borderRadius:30,padding:'6px 20px',fontSize:13,fontWeight:700,whiteSpace:'nowrap',color:'white'}}>{activeLog}</div>)}

        {/* Desktop controls hint */}
        {uiState==='playing'&&!isMobile&&(<div style={{position:'absolute',top:50,left:8,zIndex:30,background:'rgba(0,0,0,0.65)',backdropFilter:'blur(8px)',border:'1px solid rgba(255,255,255,0.1)',borderRadius:8,padding:'8px 12px',pointerEvents:'none',fontSize:10,maxWidth:160}}><div style={{fontWeight:800,color:'#00b4ff',letterSpacing:'0.3em',marginBottom:6,fontSize:9}}>ĐIỀU KHIỂN</div>{[['WASD / ↑↓←→','Di chuyển'],['J / Space','Sút (giữ)'],['K / X','Chuyền/Tắc'],['Shift','Sprint'],['Q','Đổi cầu thủ'],['Click','Di chuyển']].map(([k,v])=>(<div key={k} style={{display:'flex',gap:6,marginBottom:3,alignItems:'center'}}><span style={{background:'rgba(0,180,255,0.15)',border:'1px solid rgba(0,180,255,0.25)',borderRadius:3,padding:'1px 5px',fontFamily:"monospace",fontSize:9,color:'#60aaff',whiteSpace:'nowrap'}}>{k}</span><span style={{color:'rgba(255,255,255,0.4)',fontSize:10}}>{v}</span></div>))}</div>)}

        {/* Pause */}
        {isPaused&&(<div style={{position:'absolute',inset:0,zIndex:40,background:'rgba(5,11,26,0.92)',backdropFilter:'blur(24px)',display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',gap:24}}><h2 style={{fontFamily:"'Oxanium',sans-serif",fontWeight:800,fontSize:64,color:'white',letterSpacing:6}}>TẠM DỪNG</h2><button style={{padding:'14px 48px',borderRadius:10,background:'linear-gradient(135deg,#0066cc,#00b4ff)',border:'none',color:'white',fontWeight:800,fontSize:18,cursor:'pointer',letterSpacing:2}} onClick={()=>setIsPaused(false)}>TIẾP TỤC</button><button onClick={handleFinish} style={{color:'rgba(255,255,255,0.35)',background:'none',border:'none',cursor:'pointer',fontSize:13,fontWeight:600}}>Kết thúc trận</button></div>)}

        {/* Pause button */}
        {uiState==='playing'&&(<button onClick={()=>setIsPaused(p=>!p)} style={{position:'absolute',top:8,left:'50%',transform:'translateX(-50%)',zIndex:30,background:'rgba(0,0,0,0.5)',border:'1px solid rgba(255,255,255,0.1)',borderRadius:6,color:'white',padding:'3px 12px',cursor:'pointer',fontSize:14}}>⏸</button>)}

        {/* Mobile controls */}
        {isMobile&&uiState==='playing'&&(<div style={{position:'absolute',inset:0,pointerEvents:'none',zIndex:30}}>
          <div style={{position:'absolute',bottom:30,left:24,pointerEvents:'auto'}} onTouchStart={joyStart} onTouchMove={joyMove} onTouchEnd={joyEnd}>
            <div style={{width:96,height:96,borderRadius:'50%',background:'rgba(255,255,255,0.06)',border:'2px solid rgba(255,255,255,0.18)',backdropFilter:'blur(8px)',position:'relative',display:'flex',alignItems:'center',justifyContent:'center',touchAction:'none'}}>
              <div style={{width:38,height:38,borderRadius:'50%',background:'radial-gradient(circle at 35% 35%,#1a8fff,#0055bb)',boxShadow:'0 4px 16px rgba(0,100,220,0.6)',border:'2px solid rgba(0,180,255,0.4)',position:'absolute',transform:`translate(${joystick.x}px,${joystick.y}px)`,touchAction:'none'}}/>
            </div>
          </div>
          <div style={{position:'absolute',bottom:30,right:24,display:'flex',flexDirection:'column',gap:10,pointerEvents:'auto'}}>
            <div style={{display:'flex',gap:10,justifyContent:'flex-end'}}>
              <div style={{width:54,height:54,borderRadius:'50%',display:'flex',alignItems:'center',justifyContent:'center',background:'rgba(0,100,220,0.85)',border:'2px solid rgba(0,180,255,0.6)',color:'white',fontWeight:800,fontSize:13,cursor:'pointer',touchAction:'none'}} onTouchStart={()=>{keys.current['KeyK']=true;}} onTouchEnd={()=>{keys.current['KeyK']=false;}}>K</div>
              <div style={{width:60,height:60,borderRadius:'50%',display:'flex',alignItems:'center',justifyContent:'center',background:'rgba(220,50,50,0.85)',border:'2px solid rgba(255,100,100,0.6)',color:'white',fontWeight:800,fontSize:13,cursor:'pointer',touchAction:'none'}} onTouchStart={()=>{keys.current['Space']=true;}} onTouchEnd={()=>{keys.current['Space']=false;}}>J</div>
            </div>
            <div style={{display:'flex',gap:10,justifyContent:'flex-end'}}>
              <div style={{width:44,height:44,borderRadius:'50%',display:'flex',alignItems:'center',justifyContent:'center',background:'rgba(255,205,60,0.85)',border:'2px solid rgba(255,220,100,0.6)',color:'#1a0e00',fontWeight:800,fontSize:13,cursor:'pointer',touchAction:'none'}} onTouchStart={()=>{keys.current['KeyQ']=true;setTimeout(()=>{keys.current['KeyQ']=false;},100);}}>Q</div>
              <div style={{width:44,height:44,borderRadius:'50%',display:'flex',alignItems:'center',justifyContent:'center',background:'rgba(0,200,80,0.85)',border:'2px solid rgba(0,230,100,0.6)',color:'white',fontWeight:800,fontSize:13,cursor:'pointer',touchAction:'none'}} onTouchStart={()=>{keys.current['ShiftLeft']=true;}} onTouchEnd={()=>{keys.current['ShiftLeft']=false;}}>⚡</div>
            </div>
          </div>
        </div>)}

        {/* Intro */}
        {uiState==='intro'&&(<div style={{position:'absolute',inset:0,zIndex:50,background:'#000',display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',overflow:'hidden'}}><div style={{position:'absolute',inset:0,background:'radial-gradient(ellipse 80% 60% at 50% 40%,rgba(0,100,200,0.3),transparent)'}}/><div style={{position:'relative',zIndex:10,textAlign:'center'}}><div style={{fontSize:10,fontWeight:800,letterSpacing:'0.5em',color:'#00b4ff',marginBottom:16}}>FC ONLINE · MATCH DAY</div><h1 style={{fontFamily:"'Oxanium',sans-serif",fontWeight:800,fontSize:72,color:'white',letterSpacing:8,marginBottom:32,textShadow:'0 0 40px rgba(0,180,255,0.4)'}}>TRẬN ĐẤU</h1><div style={{display:'flex',alignItems:'center',gap:40,marginBottom:32,justifyContent:'center'}}><div style={{textAlign:'center'}}><div style={{width:80,height:80,borderRadius:16,background:'linear-gradient(135deg,#1565c0,#0044aa)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:20,fontWeight:900,margin:'0 auto 10px',boxShadow:'0 0 30px rgba(0,100,200,0.5)',fontFamily:"'Oxanium',sans-serif"}}>{(userTeamName||'YOU').substring(0,3).toUpperCase()}</div><div style={{fontWeight:800,fontSize:18,fontFamily:"'Oxanium',sans-serif"}}>{userTeamName||'HOME'}</div></div><div style={{fontSize:40,fontWeight:800,color:'rgba(255,255,255,0.2)',fontFamily:"'Oxanium',sans-serif"}}>VS</div><div style={{textAlign:'center'}}><div style={{width:80,height:80,borderRadius:16,background:'linear-gradient(135deg,#c62828,#aa2200)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:20,fontWeight:900,margin:'0 auto 10px',boxShadow:'0 0 30px rgba(200,40,40,0.5)',fontFamily:"'Oxanium',sans-serif"}}>{(opponentName||'AI').substring(0,3).toUpperCase()}</div><div style={{fontWeight:800,fontSize:18,fontFamily:"'Oxanium',sans-serif"}}>{opponentName||'AWAY'}</div></div></div><div style={{color:'rgba(255,255,255,0.5)',fontWeight:600,fontSize:14}}>Bắt đầu sau <span style={{color:'#00b4ff',fontWeight:900,fontSize:20}}>{introTimer}s</span></div></div></div>)}

        {/* Halftime */}
        {uiState==='halftime'&&(<div style={{position:'absolute',inset:0,zIndex:40,background:'rgba(5,11,26,0.95)',backdropFilter:'blur(24px)',display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',gap:20}}><div style={{fontSize:10,fontWeight:800,letterSpacing:'0.4em',color:'#00d4a0'}}>HẾT HIỆP 1</div><h2 style={{fontFamily:"'Oxanium',sans-serif",fontWeight:800,fontSize:64,color:'white',letterSpacing:6}}>NGHỈ GIỮA HIỆP</h2><div style={{fontSize:44,fontWeight:800,color:'#ffcd3c',fontFamily:"'Oxanium',sans-serif"}}>{score.A} - {score.B}</div><button style={{padding:'14px 48px',borderRadius:12,background:'linear-gradient(135deg,#0066cc,#00b4ff)',border:'none',color:'white',fontWeight:800,fontSize:18,cursor:'pointer',letterSpacing:2}} onClick={()=>{setHalf(2);setUiState('playing');gs.current.state='PLAYING';gs.current.timer=45;resetPos('B');}}>BẮT ĐẦU HIỆP 2</button></div>)}

        {/* Extra time */}
        {uiState==='extratime_break'&&(<div style={{position:'absolute',inset:0,zIndex:40,background:'rgba(5,11,26,0.95)',backdropFilter:'blur(24px)',display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',gap:20}}><h2 style={{fontFamily:"'Oxanium',sans-serif",fontWeight:800,fontSize:60,color:'white',letterSpacing:4}}>HIỆP PHỤ</h2><div style={{fontSize:40,fontWeight:800,color:'#ffcd3c',fontFamily:"'Oxanium',sans-serif"}}>{score.A} - {score.B}</div><button style={{padding:'14px 48px',borderRadius:12,background:'linear-gradient(135deg,#0066cc,#00b4ff)',border:'none',color:'white',fontWeight:800,fontSize:18,cursor:'pointer'}} onClick={()=>{const nh=half===2?3:4 as any;setHalf(nh);setUiState('playing');gs.current.state='PLAYING';gs.current.timer=nh===3?90:105;resetPos('A');}}>BẮT ĐẦU</button></div>)}

        {/* Penalties */}
        {uiState==='penalties'&&(<div style={{position:'absolute',inset:0,top:0,zIndex:40,pointerEvents:'none',display:'flex',flexDirection:'column',alignItems:'center',paddingTop:16}}><div style={{background:'rgba(5,11,26,0.92)',backdropFilter:'blur(16px)',border:'1px solid rgba(0,180,255,0.25)',borderRadius:16,padding:'16px 32px',pointerEvents:'auto',textAlign:'center'}}><div style={{fontSize:10,fontWeight:800,letterSpacing:'0.4em',color:'#00b4ff',marginBottom:12}}>ĐÁ PHẠT ĐỀN</div><div style={{display:'flex',alignItems:'center',gap:24}}><div style={{textAlign:'center'}}><div style={{fontSize:10,color:'rgba(255,255,255,0.4)',fontWeight:700,marginBottom:4}}>BẠN</div><div style={{fontSize:48,fontWeight:900,color:'#00e676',fontFamily:"'Oxanium',sans-serif"}}>{penState.scoreA}</div></div><div style={{fontSize:28,color:'rgba(255,255,255,0.2)'}}>-</div><div style={{textAlign:'center'}}><div style={{fontSize:10,color:'rgba(255,255,255,0.4)',fontWeight:700,marginBottom:4}}>AI</div><div style={{fontSize:48,fontWeight:900,color:'#ff5555',fontFamily:"'Oxanium',sans-serif"}}>{penState.scoreB}</div></div></div><div style={{display:'flex',gap:8,justifyContent:'center',marginTop:12}}>{penState.history.map((h,i)=>(<div key={i} style={{width:18,height:18,borderRadius:'50%',background:h.result==='goal'?'#00e676':'#ff5555'}}/>))}{Array.from({length:Math.max(0,5-penState.history.length)}).map((_,i)=>(<div key={i} style={{width:18,height:18,borderRadius:'50%',background:'rgba(255,255,255,0.1)',border:'1px solid rgba(255,255,255,0.2)'}}/>))}</div></div><div style={{marginTop:16,pointerEvents:'auto'}}>{penState.phase==='aiming'&&penState.turn==='A'&&<div style={{background:'#00c851',color:'black',fontWeight:800,padding:'10px 24px',borderRadius:10,fontSize:15}}>CLICK VÀO KHUNG THÀNH ĐỂ SÚT!</div>}{penState.phase==='saving'&&penState.turn==='B'&&<div style={{background:'#0066cc',color:'white',fontWeight:800,padding:'10px 24px',borderRadius:10,fontSize:15}}>CLICK ĐỂ BẮT BÓNG!</div>}{penState.phase==='result'&&<div style={{fontSize:60,fontWeight:900,color:penState.history[penState.history.length-1]?.result==='goal'?'#00ff88':'#ff5555',fontFamily:"'Oxanium',sans-serif"}}>{penState.history[penState.history.length-1]?.result==='goal'?'GOL! ⚽':'CỨU! 🧤'}</div>}</div></div>)}

        {/* Full time */}
        {uiState==='finished'&&(<div style={{position:'absolute',inset:0,zIndex:50,background:'rgba(5,11,26,0.97)',backdropFilter:'blur(24px)',overflowY:'auto',display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',padding:24}}><div style={{width:'100%',maxWidth:600}}><div style={{textAlign:'center',marginBottom:24}}><div style={{fontSize:10,fontWeight:800,letterSpacing:'0.4em',color:'#00b4ff',marginBottom:8}}>HẾT GIỜ</div><h2 style={{fontFamily:"'Oxanium',sans-serif",fontWeight:800,fontSize:64,color:'white',marginBottom:4,letterSpacing:4}}>{score.A>score.B?'CHIẾN THẮNG':score.A<score.B?'THẤT BẠI':'HÒA'}</h2><div style={{fontSize:40,fontWeight:900,fontFamily:"'Oxanium',sans-serif",color:score.A>score.B?'#00e676':score.A<score.B?'#ff5555':'#ffcd3c'}}>{score.A} - {score.B}</div></div><div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:14,marginBottom:20}}><div style={{background:'rgba(255,255,255,0.04)',border:'1px solid rgba(255,255,255,0.08)',borderRadius:12,padding:'16px 20px'}}><div style={{fontSize:10,fontWeight:800,color:'rgba(255,255,255,0.4)',letterSpacing:'0.3em',marginBottom:12}}>NGƯỜI GHI BÀN</div>{matchStats.goals.filter(g=>g.team==='A').length>0?matchStats.goals.filter(g=>g.team==='A').map((g,i)=><div key={i} style={{display:'flex',justifyContent:'space-between',color:'#00e676',fontWeight:700,fontSize:13,marginBottom:4}}><span>⚽ {squad.lineup.find(p=>p?.id===g.playerId)?.name||'Cầu thủ'}</span><span style={{color:'rgba(255,255,255,0.3)'}}>{g.minute}'</span></div>):<div style={{color:'rgba(255,255,255,0.25)',fontSize:12,fontStyle:'italic'}}>Chưa có bàn thắng</div>}</div><div style={{background:'rgba(255,205,60,0.05)',border:'1px solid rgba(255,205,60,0.15)',borderRadius:12,padding:'16px 20px',display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center'}}><div style={{fontSize:10,fontWeight:800,color:'#ffcd3c',letterSpacing:'0.3em',marginBottom:8}}>MVP</div>{getMVP()?<><div style={{fontFamily:"'Oxanium',sans-serif",fontWeight:800,fontSize:22,color:'white'}}>{getMVP()?.name.split(' ').pop()?.toUpperCase()}</div><div style={{fontSize:12,color:'#ffcd3c',fontWeight:700,marginTop:4}}>Rating {matchStats.ratings[getMVP()?.id||'']?.toFixed(1)}</div></>:<div style={{color:'rgba(255,255,255,0.25)',fontSize:12}}>N/A</div>}</div></div><div style={{background:'rgba(255,205,60,0.08)',border:'1px solid rgba(255,205,60,0.2)',borderRadius:12,padding:'16px',textAlign:'center',marginBottom:20}}><div style={{fontSize:10,fontWeight:800,color:'#ffcd3c',letterSpacing:'0.3em',marginBottom:6}}>PHẦN THƯỞNG</div><div style={{fontFamily:"'Oxanium',sans-serif",fontWeight:800,fontSize:40,color:'#ffcd3c'}}>+{score.A>score.B?600:score.A===score.B?250:120} <span style={{fontSize:20}}>FC Coins</span></div></div><button style={{width:'100%',padding:'14px 0',fontSize:18,borderRadius:12,background:'linear-gradient(135deg,#0066cc,#00b4ff)',border:'none',color:'white',fontWeight:800,cursor:'pointer',letterSpacing:2}} onClick={handleFinish}>{isWorldCup?'TIẾP THEO':'TIẾP TỤC'}</button></div></div>)}
      </div>
    </div>
  );
}
