import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Squad, Player, Difficulty } from '../types';
import { generateRandomPlayer } from '../data/players';
import { FORMATION_POSITIONS } from '../constants';
import { useAudio } from '../contexts/AudioContext';

interface Props {
  squad: Squad; onFinish:(coins:number,xp:Record<string,number>,sA?:number,sB?:number,stats?:any)=>void;
  opponentName?:string; opponentColor?:string; userTeamName?:string; userTeamColor?:string;
  forcedDifficulty?:Difficulty; isWorldCup?:boolean; onWorldCupContinue?:()=>void;
  mustHaveWinner?:boolean; mode?:'FULL_MATCH'|'PENALTY_SHOOTOUT'|'TRAINING';
  drillType?:'DRIBBLING'|'PASSING'|'SHOOTING';
  socket?:any; matchId?:string; isHost?:boolean; opponentSquad?:Squad;
}

/* ── Pitch dimensions ── */
const PW=1050, PH=680;
const GOAL_Y1=270, GOAL_Y2=410;
const BALL_R=7, PR=13;
const PDAMP=0.84, BDAMP=0.955, SPEED=0.046;

type Ent={
  id:string; x:number; y:number; vx:number; vy:number;
  tx:number|null; ty:number|null;
  team:'A'|'B'; playerData:Player; hasBall:boolean;
  homeX:number; homeY:number; isSentOff?:boolean;
  lastKickTime?:number; health:number; isInjured?:boolean;
  dir:number; // facing angle
};
type PenState={turn:'A'|'B';round:number;phase:'aiming'|'shooting'|'saving'|'result';timer:number;scoreA:number;scoreB:number;history:{team:'A'|'B';result:'goal'|'miss'}[];shotTarget?:{x:number;y:number};keeperDive?:{x:number;y:number};isSingleKick?:boolean};

const SOUNDS={goal:'https://assets.mixkit.co/active_storage/sfx/2000/2000-preview.mp3',kick:'https://assets.mixkit.co/active_storage/sfx/2092/2092-preview.mp3',whistle:'https://assets.mixkit.co/active_storage/sfx/1003/1003-preview.mp3'};

/* ── POS abbreviations (like image 3) ── */
const POS_LABEL:Record<string,string>={GK:'GK',DF:'CB',MF:'CM',FW:'ST'};
const FULL_POS_LABEL: Record<number, string> = {0:'GK',1:'LB',2:'CB',3:'CB',4:'RB',5:'LCM',6:'CM',7:'RCM',8:'LW',9:'ST',10:'RW'};
const POS_LABEL_B: Record<number, string> = {0:'GK',1:'RB',2:'CB',3:'CB',4:'LB',5:'RCM',6:'CM',7:'LCM',8:'RW',9:'ST',10:'LW'};

/* ── Draw helpers ── */
function drawPitch(ctx: CanvasRenderingContext2D){
  // Grass stripes (image 3 style – horizontal bands)
  const stripeH = PH/8;
  for(let i=0;i<8;i++){
    ctx.fillStyle = i%2===0 ? '#2e8b3a' : '#348f40';
    ctx.fillRect(0, i*stripeH, PW, stripeH);
  }
  // Lines
  ctx.strokeStyle='rgba(255,255,255,0.75)'; ctx.lineWidth=2;
  ctx.strokeRect(8,8,PW-16,PH-16);
  ctx.beginPath(); ctx.moveTo(PW/2,8); ctx.lineTo(PW/2,PH-8); ctx.stroke();
  ctx.beginPath(); ctx.arc(PW/2,PH/2,75,0,Math.PI*2); ctx.stroke();
  ctx.beginPath(); ctx.arc(PW/2,PH/2,4,0,Math.PI*2); ctx.fillStyle='rgba(255,255,255,0.8)'; ctx.fill();
  // Penalty areas
  ctx.strokeRect(8,PH/2-128,148,256);
  ctx.strokeRect(PW-156,PH/2-128,148,256);
  // Goal areas
  ctx.strokeRect(8,PH/2-54,54,108);
  ctx.strokeRect(PW-62,PH/2-54,54,108);
  // Penalty spots
  ctx.fillStyle='rgba(255,255,255,0.85)';
  ctx.beginPath(); ctx.arc(120,PH/2,3,0,Math.PI*2); ctx.fill();
  ctx.beginPath(); ctx.arc(PW-120,PH/2,3,0,Math.PI*2); ctx.fill();
  // Corner arcs
  const cr=12;
  [[8,8,0,Math.PI/2],[PW-8,8,Math.PI/2,Math.PI],[PW-8,PH-8,Math.PI,1.5*Math.PI],[8,PH-8,1.5*Math.PI,2*Math.PI]].forEach(([x,y,s,e])=>{
    ctx.beginPath(); ctx.arc(x as number,y as number,cr,s as number,e as number); ctx.stroke();
  });
  // Goals (white rectangles)
  ctx.fillStyle='rgba(255,255,255,0.9)';
  ctx.fillRect(0,GOAL_Y1,10,GOAL_Y2-GOAL_Y1);
  ctx.fillRect(PW-10,GOAL_Y1,10,GOAL_Y2-GOAL_Y1);
  // Goal posts
  ctx.fillStyle='#ffffff';
  ctx.fillRect(-2,GOAL_Y1-3,12,6); ctx.fillRect(-2,GOAL_Y2-3,12,6);
  ctx.fillRect(PW-10,GOAL_Y1-3,12,6); ctx.fillRect(PW-10,GOAL_Y2-3,12,6);
}

function drawPlayer(ctx:CanvasRenderingContext2D, p:Ent, isControlled:boolean, posLabel:string, idx:number, isTeamA:boolean) {
  const {x,y} = p;
  const circleColor = isTeamA ? '#3399ff' : '#ff6633'; // blue for user, orange for AI (like image 3)
  const shadowColor = isTeamA ? 'rgba(30,100,255,0.6)' : 'rgba(255,80,20,0.6)';

  // Oval shadow/circle under player (image 3 style)
  ctx.save();
  ctx.globalAlpha = isControlled ? 0.85 : 0.65;
  const grad = ctx.createRadialGradient(x,y+3,0,x,y+3,PR+4);
  grad.addColorStop(0, circleColor);
  grad.addColorStop(0.6, circleColor);
  grad.addColorStop(1, 'transparent');
  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.ellipse(x, y+4, PR+5, (PR+5)*0.5, 0, 0, Math.PI*2);
  ctx.fill();
  ctx.globalAlpha = 1;

  // Player body – small circle (image 3 shows compact figures)
  ctx.beginPath();
  ctx.arc(x, y, PR, 0, Math.PI*2);
  const bodyGrad = ctx.createRadialGradient(x-PR*0.3,y-PR*0.3,0,x,y,PR*1.1);
  if(isTeamA){
    bodyGrad.addColorStop(0,'#5bbfff'); bodyGrad.addColorStop(0.5,'#1a7fff'); bodyGrad.addColorStop(1,'#0044aa');
  } else {
    bodyGrad.addColorStop(0,'#ffaa66'); bodyGrad.addColorStop(0.5,'#ff5500'); bodyGrad.addColorStop(1,'#aa2200');
  }
  ctx.fillStyle=bodyGrad; ctx.fill();

  // White outline for controlled player
  if(isControlled){
    ctx.strokeStyle='#ffffff'; ctx.lineWidth=2.5; ctx.stroke();
  } else {
    ctx.strokeStyle='rgba(0,0,0,0.4)'; ctx.lineWidth=1.2; ctx.stroke();
  }

  // OVR number inside circle
  ctx.fillStyle='#ffffff';
  ctx.font=`bold ${PR-1}px 'Exo 2',sans-serif`;
  ctx.textAlign='center'; ctx.textBaseline='middle';
  ctx.fillText(p.playerData.ovr.toString(), x, y+1);
  ctx.restore();

  // ── Labels above player (image 3 style: "LDM Pepe") ──
  ctx.save();
  // Position tag
  const name = p.playerData.name.split(' ').pop() || '';
  const fullLabel = `${posLabel} ${name}`;
  ctx.font = `bold 10px 'Exo 2',sans-serif`;
  ctx.textAlign = 'center'; ctx.textBaseline = 'bottom';
  // Text shadow (black outline)
  ctx.shadowColor='rgba(0,0,0,0.95)'; ctx.shadowBlur=4;
  ctx.fillStyle = isControlled ? '#ffffff' : (isTeamA ? '#b3d9ff' : '#ffd0b0');
  ctx.fillText(fullLabel, x, y-PR-3);
  ctx.shadowBlur=0;

  // Controlled arrow indicator
  if(isControlled){
    ctx.fillStyle='#00e676';
    ctx.beginPath();
    ctx.moveTo(x,y-PR-16); ctx.lineTo(x-5,y-PR-26); ctx.lineTo(x+5,y-PR-26);
    ctx.closePath(); ctx.fill();
  }
  ctx.restore();
}

function drawBall(ctx:CanvasRenderingContext2D, x:number, y:number, spin:number){
  // Shadow
  ctx.save();
  ctx.globalAlpha=0.35;
  ctx.fillStyle='#000';
  ctx.beginPath(); ctx.ellipse(x,y+BALL_R+2,BALL_R+2,(BALL_R+2)*0.35,0,0,Math.PI*2); ctx.fill();
  ctx.globalAlpha=1;
  // Ball
  const g=ctx.createRadialGradient(x-BALL_R*0.25,y-BALL_R*0.25,0,x,y,BALL_R);
  g.addColorStop(0,'#ffffff'); g.addColorStop(0.55,'#dddddd'); g.addColorStop(1,'#888888');
  ctx.fillStyle=g; ctx.beginPath(); ctx.arc(x,y,BALL_R,0,Math.PI*2); ctx.fill();
  // Panels
  ctx.save(); ctx.translate(x,y); ctx.rotate(spin);
  ctx.strokeStyle='#222'; ctx.lineWidth=0.7;
  for(let i=0;i<5;i++){
    ctx.save(); ctx.rotate((i/5)*Math.PI*2);
    ctx.beginPath();
    ctx.moveTo(0,-BALL_R*0.45); ctx.lineTo(BALL_R*0.3,-BALL_R*0.15);
    ctx.lineTo(BALL_R*0.18,BALL_R*0.3); ctx.lineTo(-BALL_R*0.18,BALL_R*0.3);
    ctx.lineTo(-BALL_R*0.3,-BALL_R*0.15); ctx.closePath(); ctx.stroke();
    ctx.restore();
  }
  ctx.restore(); ctx.restore();
}

/* ══════════════════════ MAIN COMPONENT ══════════════════════ */
export default function MatchScreen({squad,onFinish,opponentName,userTeamName,forcedDifficulty,isWorldCup,onWorldCupContinue,mustHaveWinner,mode='FULL_MATCH',drillType,socket,matchId,isHost,opponentSquad}:Props){
  const {playAudio,stopAudio}=useAudio();
  const canvasRef=useRef<HTMLCanvasElement>(null);
  const [score,setScore]=useState({A:0,B:0});
  const [timeLeft,setTimeLeft]=useState(0);
  const [half,setHalf]=useState<1|2|3|4>(1);
  const [isFinished,setIsFinished]=useState(false);
  const [uiState,setUiState]=useState<'setup'|'intro'|'playing'|'halftime'|'extratime_break'|'penalties'|'finished'>(
    mode==='PENALTY_SHOOTOUT'?'penalties':mode==='TRAINING'?'playing':'intro'
  );
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
  const audioRefs=useRef<Record<string,HTMLAudioElement>>({});
  const aiTeamRef=useRef<Player[]|null>(null);
  const initHalfRef=useRef(0);
  const ballSpinRef=useRef(0);
  const shotChargeRef=useRef(0);
  const shotChargingRef=useRef(false);
  const joystickStateRef=useRef({x:0,y:0,active:false});

  const gs=useRef({
    ball:{x:PW/2,y:PH/2,vx:0,vy:0},
    players:[] as Ent[],
    score:{A:0,B:0},
    state:'INTRO' as 'INTRO'|'PLAYING'|'GOAL'|'HALFTIME'|'EXTRATIME_BREAK'|'PENALTIES'|'FINISHED'|'PAUSED',
    timer:0, kickOffTeam:'A' as 'A'|'B', kickOffInv:0,
    penState:{turn:'A',round:1,phase:'aiming',timer:0,scoreA:0,scoreB:0,history:[]} as PenState,
    passTargetId:null as string|null, passTime:0,
  });

  useEffect(()=>{ const c=()=>{ setIsMobile(/Android|webOS|iPhone|iPad|iPod/i.test(navigator.userAgent)||window.innerWidth<1024); setOrientation(window.innerHeight>window.innerWidth?'portrait':'landscape'); }; c(); window.addEventListener('resize',c); return()=>window.removeEventListener('resize',c); },[]);

  useEffect(()=>{
    Object.entries(SOUNDS).forEach(([k,url])=>{ const a=new Audio(url); audioRefs.current[k]=a; });
    playAudio('MATCH_AMBIENT',true);
    const dn=(e:KeyboardEvent)=>{keys.current[e.code]=true; if(['Space','ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(e.code))e.preventDefault();};
    const up=(e:KeyboardEvent)=>{keys.current[e.code]=false;};
    window.addEventListener('keydown',dn); window.addEventListener('keyup',up);
    return()=>{ window.removeEventListener('keydown',dn); window.removeEventListener('keyup',up); Object.values(audioRefs.current).forEach(a=>{a.pause();a.src='';}); stopAudio('MATCH_AMBIENT'); };
  },[]);

  const snd=(k:keyof typeof SOUNDS)=>{ const a=audioRefs.current[k]; if(a){a.currentTime=0;a.play().catch(()=>{});} };
  const addLog=(m:string)=>setLogQueue(p=>[...p,`${Math.floor(gs.current.timer)}' ${m}`]);
  useEffect(()=>{ if(activeLog){const t=setTimeout(()=>setActiveLog(null),2800);return()=>clearTimeout(t);} },[activeLog]);
  useEffect(()=>{ if(!activeLog&&logQueue.length>0){setActiveLog(logQueue[0]);setLogQueue(p=>p.slice(1));} },[activeLog,logQueue]);

  // Intro
  useEffect(()=>{
    if(uiState!=='intro') return;
    const init:Record<string,number>={};
    squad.lineup.forEach(p=>{if(p)init[p.id]=6.5;});
    setMatchStats(prev=>({...prev,ratings:init}));
    const iv=setInterval(()=>{ setIntroTimer(prev=>{ if(prev<=1){setUiState('playing');gs.current.state='PLAYING';return 0;} return prev-1; }); },1000);
    return()=>clearInterval(iv);
  },[uiState]);

  const resetPos=useCallback((ko:'A'|'B'='A')=>{
    gs.current.ball={x:PW/2,y:PH/2,vx:0,vy:0};
    gs.current.kickOffTeam=ko; gs.current.kickOffInv=3000;
    gs.current.players.forEach(p=>{ if(p.isSentOff)return; p.x=p.homeX;p.y=p.homeY;p.vx=0;p.vy=0;p.tx=null;p.ty=null;p.hasBall=false; });
    mouseTarget.current=null;
  },[half]);

  // Game loop
  useEffect(()=>{
    if(uiState==='setup') return;
    if(!aiTeamRef.current){
      if(opponentSquad){ aiTeamRef.current=opponentSquad.lineup.filter(Boolean) as Player[]; }
      else {
        let pt:'BRONZE'|'SILVER'|'GOLD'|'SUPER_LEGENDARY'='SILVER';
        if(difficulty==='EASY')pt='BRONZE'; if(difficulty==='MEDIUM')pt='GOLD'; if(difficulty==='HARD')pt='SUPER_LEGENDARY';
        aiTeamRef.current=Array(11).fill(null).map(()=>generateRandomPlayer(pt));
      }
    }
    if(squad.lineup.filter(Boolean).length<11){setTimeout(()=>onFinish(0,{}),100);return;}

    if(initHalfRef.current!==half){
      const ai=aiTeamRef.current!;
      const aiPos=FORMATION_POSITIONS['4-3-3'];
      ai.forEach((p,i)=>{p.position=aiPos[i]?.pos||'MF';});
      const formA=FORMATION_POSITIONS[squad.formation]||FORMATION_POSITIONS['4-3-3'];
      const swapped=(half===2||half===4)&&mode!=='TRAINING';
      const players:Ent[]=[];
      squad.lineup.slice(0,11).forEach((p,i)=>{
        if(!p||!formA[i])return;
        const bx=formA[i].matchX; const fx=swapped?(1-bx):bx;
        players.push({id:`a_${i}`,x:fx*PW,y:formA[i].matchY*PH,vx:0,vy:0,tx:null,ty:null,team:'A',playerData:p,hasBall:false,homeX:fx*PW,homeY:formA[i].matchY*PH,health:100,dir:0});
      });
      ai.forEach((p,i)=>{
        const bx=1-aiPos[i].matchX; const fx=swapped?(1-bx):bx;
        players.push({id:`b_${i}`,x:fx*PW,y:aiPos[i].matchY*PH,vx:0,vy:0,tx:null,ty:null,team:'B',playerData:p,hasBall:false,homeX:fx*PW,homeY:aiPos[i].matchY*PH,health:100,dir:Math.PI});
      });
      gs.current.players=players; initHalfRef.current=half;
      ctrlId.current=players.find(p=>p.team==='A')?.id||null;
      if(half>1)resetPos(half%2===0?'B':'A');
    }

    let raf:number; let last=performance.now();

    const update=(dt:number)=>{
      const g=gs.current;
      if(g.state==='PAUSED'||isPaused) return;
      ballSpinRef.current+=Math.hypot(g.ball.vx,g.ball.vy)*0.04;

      // Penalties
      if(g.state==='PENALTIES'){
        const ps=g.penState;
        if(ps.phase==='shooting'){
          ps.timer+=dt;
          const prog=Math.min(1,ps.timer/420);
          const ox=ps.turn==='A'?PW-140:140;
          if(!ps.shotTarget)ps.shotTarget={x:ps.turn==='A'?PW:0,y:(GOAL_Y1+GOAL_Y2)/2+(Math.random()-0.5)*100};
          g.ball.x=ox+(ps.shotTarget.x-ox)*prog;
          g.ball.y=PH/2+(ps.shotTarget.y-PH/2)*prog;
          if(ps.timer>580){
            let goal=false; const sy=ps.shotTarget.y;
            if(ps.turn==='A'){ if(!ps.keeperDive)ps.keeperDive={x:PW-20,y:(GOAL_Y1+GOAL_Y2)/2+(Math.random()-0.5)*100}; if(Math.abs(sy-ps.keeperDive.y)>42&&sy>GOAL_Y1&&sy<GOAL_Y2)goal=true; }
            else{ const dy=ps.keeperDive?.y||PH/2; if(Math.abs(sy-dy)>42&&sy>GOAL_Y1&&sy<GOAL_Y2)goal=true; }
            const nh=[...ps.history,{team:ps.turn,result:goal?'goal':'miss'} as const];
            const nA=ps.scoreA+(ps.turn==='A'&&goal?1:0); const nB=ps.scoreB+(ps.turn==='B'&&goal?1:0);
            if(goal)snd('goal'); else snd('whistle');
            if(ps.isSingleKick){ if(goal){if(ps.turn==='A')setScore(s=>({...s,A:s.A+1}));else setScore(s=>({...s,B:s.B+1}));} setTimeout(()=>{setUiState('playing');g.state='PLAYING';resetPos(ps.turn==='A'?'B':'A');},1500); ps.phase='result';ps.timer=0;setPenState({...ps});return; }
            let winner=null; if(ps.turn==='B'&&ps.round>=5&&nA!==nB)winner=nA>nB?'A':'B'; if(ps.round>5&&ps.turn==='B'&&nA!==nB)winner=nA>nB?'A':'B';
            if(winner){setScore({A:g.score.A+nA,B:g.score.B+nB});setUiState('finished');setIsFinished(true);finalizeMatch();return;}
            ps.phase='result';ps.timer=0;ps.scoreA=nA;ps.scoreB=nB;ps.history=nh;setPenState({...ps});
          }
        } else if(ps.phase==='result'){ ps.timer+=dt; if(ps.timer>1400){const nt=ps.turn==='A'?'B':'A'; const nr=nt==='A'?ps.round+1:ps.round; g.ball.x=nt==='A'?PW-140:140;g.ball.y=PH/2; ps.turn=nt;ps.round=nr;ps.phase=nt==='A'?'aiming':'saving';ps.timer=0;ps.shotTarget=undefined;ps.keeperDive=undefined;setPenState({...ps}); } }
        return;
      }
      if(g.state!=='PLAYING') return;
      if(g.kickOffInv>0)g.kickOffInv-=dt;

      const mpms=(half<=2?45:15)/((half<=2?30:15)*1000);
      g.timer+=dt*mpms; setTimeLeft(Math.floor(g.timer));

      if(half===1&&g.timer>=45){g.state='HALFTIME';setUiState('halftime');return;}
      if(half===2&&g.timer>=90){if(score.A===score.B&&mustHaveWinner){g.state='EXTRATIME_BREAK';setUiState('extratime_break');}else{g.state='FINISHED';setUiState('finished');setIsFinished(true);finalizeMatch();}return;}
      if(half===3&&g.timer>=105){g.state='EXTRATIME_BREAK';setUiState('extratime_break');return;}
      if(half===4&&g.timer>=120){if(score.A===score.B){g.state='PENALTIES';setUiState('penalties');}else{g.state='FINISHED';setUiState('finished');setIsFinished(true);finalizeMatch();}return;}

      const {ball,players}=g;
      const swapped=(half===2||half===4)&&mode!=='TRAINING';

      ball.x+=ball.vx; ball.y+=ball.vy;
      ball.vx*=BDAMP; ball.vy*=BDAMP;
      if(Math.abs(ball.vx)<0.04)ball.vx=0; if(Math.abs(ball.vy)<0.04)ball.vy=0;
      if(ball.y<8){ball.y=8;ball.vy*=-0.65;} if(ball.y>PH-8){ball.y=PH-8;ball.vy*=-0.65;}

      const checkGoal=(side:'left'|'right')=>{
        const isGoal=ball.y>GOAL_Y1&&ball.y<GOAL_Y2;
        if(!isGoal){if(side==='left'){ball.x=8;ball.vx*=-0.65;}else{ball.x=PW-8;ball.vx*=-0.65;}return;}
        if(mode==='TRAINING'){ball.x=PW/2;ball.y=PH/2;ball.vx=0;ball.vy=0;return;}
        const teamScored:'A'|'B'=(side==='right'&&!swapped)||(side==='left'&&swapped)?'A':'B';
        g.score[teamScored]++; setScore({...g.score}); g.state='GOAL'; snd('goal');
        const scorer=teamScored==='A'?(players.find(p=>p.id===ctrlId.current&&p.team==='A')||players.find(p=>p.team==='A')):null;
        const sname=scorer?.playerData.name||(teamScored==='A'?(userTeamName||'Home'):(opponentName||'Away'));
        setGoalAnim({team:teamScored,scorer:sname}); setTimeout(()=>setGoalAnim(null),3200);
        setMatchStats(prev=>({...prev,goals:[...prev.goals,{playerId:scorer?.playerData.id||'ai',minute:Math.floor(g.timer),team:teamScored}],ratings:scorer?{...prev.ratings,[scorer.playerData.id]:(prev.ratings[scorer.playerData.id]||6.5)+1.5}:prev.ratings}));
        addLog(`⚽ ${sname} GHI BÀN!`);
        setTimeout(()=>{g.state='PLAYING';resetPos(teamScored==='A'?'B':'A');},3000);
      };
      if(ball.x<8)checkGoal('left'); else if(ball.x>PW-8)checkGoal('right');

      // Select controlled player
      const teamA=players.filter(p=>p.team==='A'&&!p.isSentOff);
      const ballOwner=players.find(p=>!p.isSentOff&&Math.hypot(ball.x-p.x,ball.y-p.y)<PR+BALL_R+7);
      if(ballOwner?.team==='A'){ctrlId.current=ballOwner.id;}
      else if(teamA.length>0){
        const cl=teamA.reduce((a,b)=>Math.hypot(ball.x-a.x,ball.y-a.y)<Math.hypot(ball.x-b.x,ball.y-b.y)?a:b);
        const cu=teamA.find(p=>p.id===ctrlId.current);
        if(cu){const dc=Math.hypot(ball.x-cu.x,ball.y-cu.y);const dn=Math.hypot(ball.x-cl.x,ball.y-cl.y);if(dn<dc*0.75)ctrlId.current=cl.id;}
        else ctrlId.current=cl.id;
      }
      if(keys.current['KeyQ']||keys.current['Tab']){keys.current['KeyQ']=false;keys.current['Tab']=false; if(teamA.length>1){const idx=teamA.findIndex(p=>p.id===ctrlId.current);ctrlId.current=teamA[(idx+1)%teamA.length].id;}}

      // Collisions
      const active=players.filter(p=>!p.isSentOff);
      for(let i=0;i<active.length;i++) for(let j=i+1;j<active.length;j++){
        const p1=active[i],p2=active[j]; const d=Math.hypot(p1.x-p2.x,p1.y-p2.y);
        if(d<PR*2&&d>0){const a=Math.atan2(p1.y-p2.y,p1.x-p2.x); const ov=PR*2-d; p1.x+=Math.cos(a)*ov*0.5;p1.y+=Math.sin(a)*ov*0.5;p2.x-=Math.cos(a)*ov*0.5;p2.y-=Math.sin(a)*ov*0.5;}
      }

      // Shot charge
      if(keys.current['Space']||keys.current['KeyJ']){
        if(!shotChargingRef.current){shotChargingRef.current=true;shotChargeRef.current=0;}
        shotChargeRef.current=Math.min(100,shotChargeRef.current+dt*0.12);
        setShotPower(shotChargeRef.current); setShowPower(true);
      } else if(shotChargingRef.current){
        shotChargingRef.current=false; setShowPower(false);
        const p=players.find(pl=>pl.id===ctrlId.current&&pl.team==='A');
        if(p&&p.hasBall){
          const now=Date.now(); if(!p.lastKickTime||now-p.lastKickTime>250){
            p.lastKickTime=now;
            const power=(shotChargeRef.current/100)*p.playerData.stats.sho*0.35+8;
            const gx=swapped?0:PW;
            const err=(100-p.playerData.stats.sho)*0.004*(Math.random()-0.5);
            const ang=Math.atan2(PH/2-p.y,gx-p.x)+err;
            ball.vx=Math.cos(ang)*power; ball.vy=Math.sin(ang)*power; p.hasBall=false;
            addLog(`🎯 ${p.playerData.name} SÚT!`); snd('kick');
          }
        }
        shotChargeRef.current=0;
      }

      // Player logic
      players.forEach(p=>{
        if(p.isSentOff)return;
        const now=Date.now();
        const distBall=Math.hypot(ball.x-p.x,ball.y-p.y);
        const recentKick=p.lastKickTime&&(now-p.lastKickTime<340);
        const isPT=g.passTargetId===p.id&&(now-g.passTime<2000);
        let grace=p.id===ctrlId.current?24:14; if(isPT)grace=46;
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
          const jst=joystickStateRef.current; if(jst.active&&(Math.abs(jst.x)>5||Math.abs(jst.y)>5)){mx=jst.x/40;my=jst.y/40;}
          if(mouseTarget.current&&mx===0&&my===0){const dx=mouseTarget.current.x-p.x;const dy=mouseTarget.current.y-p.y;const d=Math.hypot(dx,dy);if(d>6){mx=dx/d;my=dy/d;}else mouseTarget.current=null;}
          if(mx!==0||my!==0){const mg=Math.hypot(mx,my);p.vx+=(mx/mg)*speed*0.22;p.vy+=(my/mg)*speed*0.22;p.dir=Math.atan2(my,mx);}

          // Pass (X / K)
          const passKey=keys.current['KeyX']||keys.current['KeyK'];
          const canKick=!p.lastKickTime||now-p.lastKickTime>270;
          if(passKey&&canKick){
            keys.current['KeyX']=false;keys.current['KeyK']=false; p.lastKickTime=now;
            if(p.hasBall){
              const tms=players.filter(t=>t.team==='A'&&t.id!==p.id&&!t.isSentOff);
              const gx=swapped?0:PW; let best:Ent|null=null,bs=-Infinity;
              tms.forEach(t=>{const dt=Math.hypot(t.x-p.x,t.y-p.y); if(dt>400)return; const atg=Math.atan2(PH/2-p.y,gx-p.x); const att=Math.atan2(t.y-p.y,t.x-p.x); const al=Math.cos(att-atg); const sc=al*500+(Math.hypot(gx-p.x,PH/2-p.y)-Math.hypot(gx-t.x,PH/2-t.y))*2; if(sc>bs){bs=sc;best=t;}});
              if(best){const t=best as Ent; const ang=Math.atan2(t.y-p.y,t.x-p.x); const err=(100-p.playerData.stats.pas)*0.003*(Math.random()-0.5); const pwr=Math.min(16,Math.hypot(t.x-p.x,t.y-p.y)*0.04+5); ball.vx=Math.cos(ang+err)*pwr;ball.vy=Math.sin(ang+err)*pwr; ctrlId.current=t.id;g.passTargetId=t.id;g.passTime=now;mouseTarget.current=null; addLog(`🅿️ ${p.playerData.name} → ${t.playerData.name}`); snd('kick');}
            } else {
              const tr=p.playerData.stats.def*0.4+18;
              if(distBall<tr){const cd=p.team==='A'?(swapped?-1:1):(swapped?1:-1);ball.vx=(Math.random()*6+7)*cd;ball.vy=(Math.random()-0.5)*12;snd('kick');addLog(`${p.playerData.name} tắc bóng!`);}
            }
          }
          // Dribble
          if(p.hasBall&&!recentKick){
            const da=Math.atan2(p.vy,p.vx)||p.dir; const ds=p.playerData.stats.dri; const dd=PR+BALL_R+(100-ds)*0.04;
            ball.x+=(p.x+Math.cos(da)*dd-ball.x)*0.9; ball.y+=(p.y+Math.sin(da)*dd-ball.y)*0.9;
            ball.vx=p.vx+(Math.random()-0.5)*(100-ds)*0.04; ball.vy=p.vy+(Math.random()-0.5)*(100-ds)*0.04;
          }
        } else {
          // AI
          const tms=players.filter(t=>t.team===p.team&&!t.isSentOff);
          const cl=tms.reduce((a,b)=>Math.hypot(ball.x-a.x,ball.y-a.y)<Math.hypot(ball.x-b.x,ball.y-b.y)?a:b);
          const ck=!p.lastKickTime||now-p.lastKickTime>380;
          if(p.hasBall){
            const gx=p.team==='A'?(swapped?0:PW):(swapped?PW:0); const dg=Math.hypot(gx-p.x,PH/2-p.y);
            const ats=players.filter(t=>t.team===p.team&&t.id!==p.id&&!t.isSentOff);
            let bp:Ent|null=null,bps=-Infinity;
            ats.forEach(t=>{const dt=Math.hypot(t.x-p.x,t.y-p.y);const tdg=Math.hypot(gx-t.x,PH/2-t.y);if(tdg<dg-40&&dt<320){const sc=(dg-tdg)*2-dt*0.08;if(sc>bps){bps=sc;bp=t;}}});
            const danger=p.team==='A'?(swapped?p.x>PW-160:p.x<160):(swapped?p.x<160:p.x>PW-160);
            let dm=1; if(difficulty==='EASY')dm=0.7; if(difficulty==='HARD')dm=1.25;
            if(danger&&ck){snd('kick');const ca=p.team==='A'?(swapped?Math.PI+(Math.random()-0.5)*0.5:(Math.random()-0.5)*0.5):(swapped?(Math.random()-0.5)*0.5:Math.PI+(Math.random()-0.5)*0.5);ball.vx=Math.cos(ca)*14;ball.vy=Math.sin(ca)*14;p.hasBall=false;p.lastKickTime=now;}
            else if(bp&&Math.random()<0.52&&ck){const t=bp as Ent;const a=Math.atan2(t.y-p.y,t.x-p.x);const pw=Math.min(14,Math.hypot(t.x-p.x,t.y-p.y)*0.044+4);ball.vx=Math.cos(a)*pw;ball.vy=Math.sin(a)*pw;p.hasBall=false;p.lastKickTime=now;}
            else if(dg<260&&ck){snd('kick');const pw=p.playerData.stats.sho*0.22*dm;const ia=(100-p.playerData.stats.sho)*0.012;const a=Math.atan2(PH/2-p.y+(Math.random()-0.5)*ia*100,gx-p.x);ball.vx=Math.cos(a)*pw;ball.vy=Math.sin(a)*pw;p.hasBall=false;p.lastKickTime=now;addLog(`${p.playerData.name} sút!`);}
            else{const a=Math.atan2(PH/2-p.y,gx-p.x);ball.x=p.x+Math.cos(a)*(PR+BALL_R);ball.y=p.y+Math.sin(a)*(PR+BALL_R);ball.vx=p.vx;ball.vy=p.vy;}
          } else if(p.playerData.position==='GK'){
            p.vx+=(p.homeX-p.x)*0.04; p.vy+=(Math.max(GOAL_Y1+18,Math.min(GOAL_Y2-18,ball.y))-p.y)*0.07;
            if(distBall<22&&g.kickOffInv<=0){const cd=p.team==='A'?(swapped?-1:1):(swapped?1:-1);ball.vx+=(Math.random()*8+8)*cd;ball.vy+=(Math.random()-0.5)*12;snd('kick');p.lastKickTime=now;}
          } else if(cl.id===p.id){
            p.vx+=(ball.x-p.x)*0.016; p.vy+=(ball.y-p.y)*0.016;
            if(p.team==='B'&&distBall<20&&g.kickOffInv<=0){let dm=1;if(difficulty==='EASY')dm=0.5;if(difficulty==='HARD')dm=1.3;if(Math.random()<0.022*dm){const cd=swapped?1:-1;ball.vx+=(Math.random()*6+6)*cd;ball.vy+=(Math.random()-0.5)*10;snd('kick');p.lastKickTime=now;}}
          } else {
            const bf=(ball.x-PW/2)*0.28; const bfy=(ball.y-PH/2)*0.28;
            p.vx+=(p.homeX+(p.team==='A'?bf:-bf)-p.x)*0.012; p.vy+=(p.homeY+bfy-p.y)*0.012;
          }
          let dm=1;if(difficulty==='EASY')dm=0.7;if(difficulty==='HARD')dm=1.25;
          const spd=p.playerData.stats.pac*SPEED*(p.team==='B'?0.72*dm:1);
          const cs=Math.hypot(p.vx,p.vy); if(cs>spd){p.vx=(p.vx/cs)*spd;p.vy=(p.vy/cs)*spd;}
        }
        p.vx*=PDAMP; p.vy*=PDAMP; p.x+=p.vx; p.y+=p.vy;
        p.x=Math.max(PR,Math.min(PW-PR,p.x)); p.y=Math.max(PR,Math.min(PH-PR,p.y));
        if(Math.hypot(p.vx,p.vy)>0.15)p.dir=Math.atan2(p.vy,p.vx);
      });
    };

    const draw=(ctx:CanvasRenderingContext2D,time:number)=>{
      drawPitch(ctx);
      const g=gs.current;

      if(g.state!=='PENALTIES'){
        // Draw all players (Team B first, then A, controlled on top)
        const sorted=[...g.players.filter(p=>!p.isSentOff)].sort((a,_b)=>a.id===ctrlId.current?1:-1);
        sorted.forEach((p,_)=>{
          const i=parseInt(p.id.split('_')[1]||'0');
          const isA=p.team==='A';
          const lbl=isA?(FULL_POS_LABEL[i]||'MF'):(POS_LABEL_B[i]||'MF');
          drawPlayer(ctx,p,p.id===ctrlId.current&&isA,lbl,i,isA);
          // Pass target ring
          if(g.passTargetId===p.id){ ctx.strokeStyle='rgba(0,230,120,0.8)';ctx.lineWidth=2;ctx.setLineDash([4,3]);ctx.beginPath();ctx.arc(p.x,p.y,PR+7,0,Math.PI*2);ctx.stroke();ctx.setLineDash([]); }
        });
        // Mouse target line
        const ctrl=g.players.find(p=>p.id===ctrlId.current);
        if(ctrl&&mouseTarget.current){ ctx.strokeStyle='rgba(80,200,120,0.45)';ctx.lineWidth=1.5;ctx.setLineDash([5,4]);ctx.beginPath();ctx.moveTo(ctrl.x,ctrl.y);ctx.lineTo(mouseTarget.current.x,mouseTarget.current.y);ctx.stroke();ctx.setLineDash([]);ctx.fillStyle='rgba(80,200,120,0.4)';ctx.beginPath();ctx.arc(mouseTarget.current.x,mouseTarget.current.y,4,0,Math.PI*2);ctx.fill(); }
      } else {
        // Penalty scene
        const ps=g.penState;
        const sx=ps.turn==='A'?PW-150:150;
        const shooter=g.players.find(p=>p.team===ps.turn&&p.playerData.position!=='GK')||g.players.find(p=>p.team===ps.turn);
        const keeper=g.players.find(p=>p.team!==ps.turn&&p.playerData.position==='GK')||g.players.find(p=>p.team!==ps.turn);
        const kx=ps.turn==='A'?PW-20:20; const ky=ps.keeperDive?.y||PH/2;
        if(shooter)drawPlayer(ctx,{...shooter,x:sx,y:PH/2},false,ps.turn==='A'?'ST':'GK',0,ps.turn==='A');
        if(keeper)drawPlayer(ctx,{...keeper,x:kx,y:ky},false,'GK',0,ps.turn!=='A');
        if(ps.turn==='A'&&ps.phase==='aiming'){ ctx.fillStyle='rgba(0,220,100,0.18)';ctx.fillRect(PW-38,GOAL_Y1,38,GOAL_Y2-GOAL_Y1);ctx.strokeStyle='#00e676';ctx.lineWidth=2.5;ctx.setLineDash([7,4]);ctx.strokeRect(PW-38,GOAL_Y1,38,GOAL_Y2-GOAL_Y1);ctx.setLineDash([]); }
        if(ps.turn==='B'&&ps.phase==='saving'){ ctx.fillStyle='rgba(0,100,255,0.18)';ctx.fillRect(0,GOAL_Y1,38,GOAL_Y2-GOAL_Y1);ctx.strokeStyle='#0099ff';ctx.lineWidth=2.5;ctx.setLineDash([7,4]);ctx.strokeRect(0,GOAL_Y1,38,GOAL_Y2-GOAL_Y1);ctx.setLineDash([]); }
      }

      drawBall(ctx,g.ball.x,g.ball.y,ballSpinRef.current);

      if(g.state==='GOAL'){
        ctx.fillStyle='rgba(0,0,0,0.45)'; ctx.fillRect(0,0,PW,PH);
        ctx.save(); const sc=0.92+0.08*Math.sin(time*0.012); ctx.translate(PW/2,PH/2); ctx.scale(sc,sc);
        ctx.font='bold 84px Oxanium,sans-serif'; ctx.textAlign='center'; ctx.textBaseline='middle';
        ctx.shadowColor='#00e676'; ctx.shadowBlur=30;
        ctx.fillStyle='#00ff88'; ctx.fillText('GOL!',0,-10);
        ctx.shadowBlur=0; ctx.restore();
      }
    };

    const loop=(time:number)=>{
      if(!canvasRef.current){raf=requestAnimationFrame(loop);return;}
      const dt=Math.min(50,time-last); last=time;
      update(dt);
      const ctx=canvasRef.current.getContext('2d');
      if(ctx)draw(ctx,time);
      raf=requestAnimationFrame(loop);
    };
    raf=requestAnimationFrame(loop);
    return()=>cancelAnimationFrame(raf);
  },[squad,half,uiState,difficulty,isPaused]);

  const finalizeMatch=()=>{ playAudio('WHISTLE_END'); setMatchStats(prev=>{ const r={...prev.ratings}; if(score.A>score.B)Object.keys(r).forEach(id=>{r[id]=(r[id]||6.5)+0.8;}); return{...prev,ratings:r}; }); };

  const handleFinish=()=>{
    const xp:Record<string,number>={};
    const mvp=Object.entries(matchStats.ratings).sort(([,a],[,b])=>b-a)[0];
    squad.lineup.forEach(p=>{if(p){let g=65;if(matchStats.ratings[p.id])g+=Math.floor(matchStats.ratings[p.id]*8);if(mvp&&p.id===mvp[0])g+=120;xp[p.id]=g;}});
    const fA=mode==='PENALTY_SHOOTOUT'?penState.scoreA:score.A;
    const fB=mode==='PENALTY_SHOOTOUT'?penState.scoreB:score.B;
    onFinish(fA>fB?600:fA===fB?250:120,xp,fA,fB,{score:`${fA}-${fB}`,opponent:opponentName||'AI',isWinner:fA>fB,competition:isWorldCup?'World Cup':'Match'});
  };

  const handleCanvasClick=(e:React.MouseEvent<HTMLCanvasElement>)=>{
    if(isMobile)return;
    const rect=canvasRef.current?.getBoundingClientRect(); if(!rect)return;
    const x=(e.clientX-rect.left)*(PW/rect.width); const y=(e.clientY-rect.top)*(PH/rect.height);
    if(gs.current.state==='PENALTIES'){const ps=gs.current.penState;if(ps.turn==='A'&&ps.phase==='aiming'){ps.shotTarget={x:PW,y};ps.phase='shooting';ps.timer=0;setPenState({...ps});}else if(ps.turn==='B'&&ps.phase==='saving'){ps.keeperDive={x:20,y};ps.shotTarget={x:0,y:(GOAL_Y1+GOAL_Y2)/2+(Math.random()-0.5)*100};ps.phase='shooting';ps.timer=0;setPenState({...ps});}return;}
    if(gs.current.state!=='PLAYING')return;
    mouseTarget.current={x,y};
  };
  const onTouchCanvas=(e:React.TouchEvent<HTMLCanvasElement>)=>{ e.preventDefault(); const t=e.changedTouches[0];const rect=canvasRef.current?.getBoundingClientRect();if(!rect)return;const x=(t.clientX-rect.left)*(PW/rect.width);const y=(t.clientY-rect.top)*(PH/rect.height);if(gs.current.state==='PENALTIES'){const ps=gs.current.penState;if(ps.turn==='A'&&ps.phase==='aiming'){ps.shotTarget={x:PW,y};ps.phase='shooting';ps.timer=0;setPenState({...ps});}else if(ps.turn==='B'&&ps.phase==='saving'){ps.keeperDive={x:20,y};ps.shotTarget={x:0,y:(GOAL_Y1+GOAL_Y2)/2+(Math.random()-0.5)*100};ps.phase='shooting';ps.timer=0;setPenState({...ps});}return;}mouseTarget.current={x,y}; };
  const joyStart=(e:React.TouchEvent)=>{e.preventDefault();const t=e.touches[0];joyRef.current={sx:t.clientX,sy:t.clientY};const j={x:0,y:0,active:true};setJoystick(j);joystickStateRef.current=j;};
  const joyMove=(e:React.TouchEvent)=>{e.preventDefault();if(!joyRef.current)return;const t=e.touches[0];const jx=Math.max(-42,Math.min(42,t.clientX-joyRef.current.sx));const jy=Math.max(-42,Math.min(42,t.clientY-joyRef.current.sy));const j={x:jx,y:jy,active:true};setJoystick(j);joystickStateRef.current=j;};
  const joyEnd=(e:React.TouchEvent)=>{e.preventDefault();joyRef.current=null;const j={x:0,y:0,active:false};setJoystick(j);joystickStateRef.current=j;mouseTarget.current=null;};

  const getMVP=()=>{const e=Object.entries(matchStats.ratings).sort(([,a],[,b])=>b-a)[0];return e?squad.lineup.find(p=>p?.id===e[0]):null;};

  const userColor='#3399ff'; const aiColor='#ff6633';

  /* ─────────── RENDER ─────────── */
  return (
    <div id="match-root" style={{height:'100%',display:'flex',flexDirection:'column',background:'#050b1a',overflow:'hidden',userSelect:'none',touchAction:'none'}}>
      {/* Portrait warning */}
      {isMobile&&orientation==='portrait'&&(
        <div style={{position:'fixed',inset:0,zIndex:999,background:'#050b1a',display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',textAlign:'center',padding:32}}>
          <div style={{fontSize:64,marginBottom:16}}>↻</div>
          <div style={{fontFamily:"'Oxanium',sans-serif",fontWeight:800,fontSize:28,letterSpacing:3}}>XOAY NGANG MÀN HÌNH</div>
          <div style={{color:'rgba(255,255,255,0.5)',marginTop:8,fontSize:13}}>Để trải nghiệm trận đấu tốt nhất</div>
        </div>
      )}

      {/* ── SETUP ── */}
      {uiState==='setup'&&(
        <div style={{position:'absolute',inset:0,zIndex:50,background:'rgba(5,11,26,0.97)',backdropFilter:'blur(20px)',display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',gap:32,padding:24}}>
          <div style={{textAlign:'center'}}>
            <div style={{fontSize:11,fontWeight:800,letterSpacing:'0.4em',color:'#00b4ff',marginBottom:12}}>FC ONLINE · CHỌN ĐỘ KHÓ</div>
            <h1 style={{fontFamily:"'Oxanium',sans-serif",fontWeight:800,fontSize:56,color:'white',lineHeight:1,letterSpacing:4}}>KICK OFF</h1>
          </div>
          <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:16,width:'100%',maxWidth:640}}>
            {(['EASY','MEDIUM','HARD'] as Difficulty[]).map((d,i)=>{
              const [c,lbl,desc]=[['#00d4a0','#0a1a14','DỄ'],['#ffcd3c','#1a1400','VỪA'],['#ff5555','#1a0808','KHÓ']][i];
              const descs=['AI thủ thận trọng','Cân bằng thách thức','AI Pro – phản xạ cao'];
              return (
                <button key={d} onClick={()=>{setDifficulty(d);setUiState('intro');}}
                  style={{background:`linear-gradient(160deg,${c}22,${c}08)`,border:`2px solid ${c}55`,borderRadius:16,padding:'24px 16px',cursor:'pointer',transition:'all 0.2s',textAlign:'center'}}
                  onMouseEnter={e=>{(e.currentTarget as HTMLElement).style.borderColor=c;(e.currentTarget as HTMLElement).style.background=`linear-gradient(160deg,${c}33,${c}11)`;}}
                  onMouseLeave={e=>{(e.currentTarget as HTMLElement).style.borderColor=`${c}55`;(e.currentTarget as HTMLElement).style.background=`linear-gradient(160deg,${c}22,${c}08)`;}}
                >
                  <div style={{background:c,borderRadius:12,padding:'8px 16px',display:'inline-block',color:lbl,fontWeight:900,fontSize:20,letterSpacing:2,marginBottom:10,fontFamily:"'Oxanium',sans-serif"}}>{lbl}</div>
                  <div style={{fontWeight:800,color:'white',marginBottom:4,fontSize:13,letterSpacing:2}}>{d}</div>
                  <div style={{fontSize:11,color:'rgba(255,255,255,0.5)'}}>{descs[i]}</div>
                </button>
              );
            })}
          </div>
          <div style={{color:'rgba(255,255,255,0.35)',fontSize:12,fontWeight:600}}>
            <b style={{color:'rgba(255,255,255,0.6)'}}>WASD</b> Di chuyển &nbsp;·&nbsp; <b style={{color:'rgba(255,255,255,0.6)'}}>J/Space</b> Sút &nbsp;·&nbsp; <b style={{color:'rgba(255,255,255,0.6)'}}>K/X</b> Chuyền &nbsp;·&nbsp; <b style={{color:'rgba(255,255,255,0.6)'}}>Shift</b> Sprint &nbsp;·&nbsp; <b style={{color:'rgba(255,255,255,0.6)'}}>Q</b> Đổi cầu thủ
          </div>
        </div>
      )}

      {/* ── INTRO ── */}
      {uiState==='intro'&&(
        <div style={{position:'absolute',inset:0,zIndex:50,background:'#000',display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',overflow:'hidden'}}>
          <div style={{position:'absolute',inset:0,background:'radial-gradient(ellipse 80% 60% at 50% 40%, rgba(0,100,200,0.3),transparent)'}} />
          <div style={{position:'relative',zIndex:10,textAlign:'center'}}>
            <div style={{fontSize:10,fontWeight:800,letterSpacing:'0.5em',color:'#00b4ff',marginBottom:16}}>FC ONLINE · MATCH DAY</div>
            <h1 style={{fontFamily:"'Oxanium',sans-serif",fontWeight:800,fontSize:72,color:'white',letterSpacing:8,marginBottom:32,textShadow:'0 0 40px rgba(0,180,255,0.4)'}}>TRẬN ĐẤU</h1>
            <div style={{display:'flex',alignItems:'center',gap:40,marginBottom:32,justifyContent:'center'}}>
              <div style={{textAlign:'center'}}>
                <div style={{width:80,height:80,borderRadius:16,background:`linear-gradient(135deg,${userColor},#0044aa)`,display:'flex',alignItems:'center',justifyContent:'center',fontSize:20,fontWeight:900,marginBottom:10,boxShadow:`0 0 30px ${userColor}80`,fontFamily:"'Oxanium',sans-serif"}}>{(userTeamName||'YOU').substring(0,3).toUpperCase()}</div>
                <div style={{fontWeight:800,fontSize:18,fontFamily:"'Oxanium',sans-serif"}}>{userTeamName||'HOME'}</div>
              </div>
              <div style={{fontSize:40,fontWeight:800,color:'rgba(255,255,255,0.2)',fontFamily:"'Oxanium',sans-serif"}}>VS</div>
              <div style={{textAlign:'center'}}>
                <div style={{width:80,height:80,borderRadius:16,background:`linear-gradient(135deg,${aiColor},#aa2200)`,display:'flex',alignItems:'center',justifyContent:'center',fontSize:20,fontWeight:900,marginBottom:10,boxShadow:`0 0 30px ${aiColor}80`,fontFamily:"'Oxanium',sans-serif"}}>{(opponentName||'AI').substring(0,3).toUpperCase()}</div>
                <div style={{fontWeight:800,fontSize:18,fontFamily:"'Oxanium',sans-serif"}}>{opponentName||'AWAY'}</div>
              </div>
            </div>
            <div style={{color:'rgba(255,255,255,0.5)',fontWeight:600,fontSize:14}}>Bắt đầu sau <span style={{color:'#00b4ff',fontWeight:900,fontSize:20}}>{introTimer}s</span></div>
          </div>
        </div>
      )}

      {/* ── FC Online SCOREBOARD (Image 3 style) ── */}
      {mode!=='TRAINING'&&(uiState==='playing'||uiState==='halftime'||uiState==='finished')&&(
        <div style={{background:'linear-gradient(90deg,#1a9e8a 0%,#0d8070 50%,#1a9e8a 100%)',borderBottom:'2px solid rgba(0,212,160,0.4)',display:'flex',alignItems:'center',justifyContent:'space-between',padding:'5px 16px',flexShrink:0,fontFamily:"'Exo 2',sans-serif"}}>
          {/* Left: User team */}
          <div style={{display:'flex',alignItems:'center',gap:10}}>
            <div style={{width:28,height:28,borderRadius:6,background:userColor,display:'flex',alignItems:'center',justifyContent:'center',fontSize:10,fontWeight:900,border:'1px solid rgba(255,255,255,0.3)'}}>{(userTeamName||'YOU').substring(0,3).toUpperCase()}</div>
            <span style={{fontWeight:800,fontSize:14,color:'white'}}>{userTeamName||'Home'}</span>
          </div>
          {/* Center: Score + Time */}
          <div style={{display:'flex',alignItems:'center',gap:4}}>
            <div style={{fontSize:28,fontWeight:900,color:'white',minWidth:28,textAlign:'center',fontFamily:"'Oxanium',sans-serif"}}>{score.A}</div>
            <div style={{background:'rgba(0,0,0,0.3)',borderRadius:8,padding:'4px 16px',textAlign:'center',border:'1px solid rgba(255,255,255,0.15)'}}>
              <div style={{fontSize:18,fontWeight:900,color:'white',fontFamily:"'Oxanium',sans-serif",lineHeight:1}}>{String(Math.floor(timeLeft/60)).padStart(2,'0')}:{String(timeLeft%60).padStart(2,'0')}</div>
              <div style={{fontSize:9,color:'rgba(255,255,255,0.6)',fontWeight:700,letterSpacing:'0.2em'}}>{half<=2?(half===1?'1ST HALF':'2ND HALF'):'ET'}</div>
            </div>
            <div style={{fontSize:28,fontWeight:900,color:'white',minWidth:28,textAlign:'center',fontFamily:"'Oxanium',sans-serif"}}>{score.B}</div>
          </div>
          {/* Right: AI team */}
          <div style={{display:'flex',alignItems:'center',gap:10}}>
            <span style={{fontWeight:800,fontSize:14,color:'white'}}>{opponentName||'Away'}</span>
            <div style={{width:28,height:28,borderRadius:6,background:aiColor,display:'flex',alignItems:'center',justifyContent:'center',fontSize:10,fontWeight:900,border:'1px solid rgba(255,255,255,0.3)'}}>{(opponentName||'AI').substring(0,3).toUpperCase()}</div>
            <button onClick={()=>setIsPaused(p=>!p)} style={{background:'rgba(0,0,0,0.3)',border:'1px solid rgba(255,255,255,0.2)',borderRadius:6,color:'white',padding:'4px 8px',cursor:'pointer',fontSize:14}}>⏸</button>
          </div>
        </div>
      )}

      {/* ── PITCH CANVAS ── */}
      <div style={{flex:1,position:'relative',overflow:'hidden'}}>
        <canvas ref={canvasRef} width={PW} height={PH} onClick={handleCanvasClick} onTouchEnd={onTouchCanvas}
          style={{width:'100%',height:'100%',objectFit:'contain',touchAction:'none',cursor:'crosshair',display:'block'}} />

        {/* Goal animation */}
        {goalAnim&&(
          <div style={{position:'absolute',inset:0,zIndex:40,pointerEvents:'none',display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center'}}>
            <div style={{position:'absolute',inset:0,background:goalAnim.team==='A'?'rgba(0,200,100,0.08)':'rgba(255,80,0,0.08)'}} />
            <div className="anim-goal-pop" style={{textAlign:'center'}}>
              <div style={{fontFamily:"'Oxanium',sans-serif",fontWeight:800,fontSize:96,lineHeight:1,color:'#00ff88',textShadow:'0 0 40px #00e676,0 0 80px #00c851'}}>GOL!</div>
              <div style={{fontWeight:800,fontSize:22,color:'white',letterSpacing:3,marginTop:8,fontFamily:"'Exo 2',sans-serif"}}>{goalAnim.scorer}</div>
            </div>
          </div>
        )}

        {/* Shot power bar */}
        {showPower&&(
          <div style={{position:'absolute',bottom:80,left:'50%',transform:'translateX(-50%)',zIndex:50,display:'flex',flexDirection:'column',alignItems:'center',gap:4}}>
            <div style={{fontSize:9,fontWeight:800,color:'rgba(255,255,255,0.7)',letterSpacing:'0.3em'}}>SỨC MẠNH</div>
            <div style={{width:120,height:10,background:'rgba(255,255,255,0.15)',borderRadius:99,overflow:'hidden',border:'1px solid rgba(255,255,255,0.2)'}}>
              <div style={{height:'100%',borderRadius:99,transition:'width 0.05s',width:`${shotPower}%`,background:shotPower>80?'#ff4444':shotPower>50?'#ffcd3c':'#00e676'}} />
            </div>
          </div>
        )}

        {/* Match log */}
        {uiState==='playing'&&activeLog&&(
          <div style={{position:'absolute',bottom:20,left:'50%',transform:'translateX(-50%)',zIndex:50,pointerEvents:'none',background:'rgba(5,11,26,0.8)',border:'1px solid rgba(0,180,255,0.3)',backdropFilter:'blur(12px)',borderRadius:30,padding:'6px 20px',fontSize:13,fontWeight:700,whiteSpace:'nowrap',color:'white',fontFamily:"'Exo 2',sans-serif"}}>
            {activeLog}
          </div>
        )}

        {/* Desktop controls hint */}
        {uiState==='playing'&&!isMobile&&(
          <div style={{position:'absolute',bottom:16,left:16,zIndex:30,background:'rgba(5,11,26,0.75)',backdropFilter:'blur(12px)',border:'1px solid rgba(0,180,255,0.15)',borderRadius:10,padding:'10px 14px',pointerEvents:'none',fontSize:10}}>
            <div style={{fontWeight:800,color:'#00b4ff',letterSpacing:'0.3em',marginBottom:8,fontSize:9}}>ĐIỀU KHIỂN</div>
            {[['WASD / ↑↓←→','Di chuyển'],['J / Space','Sút (giữ = mạnh)'],['K / X','Chuyền / Tắc'],['Shift','Sprint'],['Q','Đổi cầu thủ'],['Click','Di chuyển tới']].map(([k,v])=>(
              <div key={k} style={{display:'flex',gap:8,marginBottom:4,alignItems:'center'}}>
                <span style={{background:'rgba(0,180,255,0.15)',border:'1px solid rgba(0,180,255,0.3)',borderRadius:4,padding:'1px 6px',fontFamily:"'JetBrains Mono',monospace",fontSize:9,color:'#60aaff',whiteSpace:'nowrap'}}>{k}</span>
                <span style={{color:'rgba(255,255,255,0.45)',fontSize:10}}>{v}</span>
              </div>
            ))}
          </div>
        )}

        {/* Pause overlay */}
        {isPaused&&(
          <div style={{position:'absolute',inset:0,zIndex:40,background:'rgba(5,11,26,0.92)',backdropFilter:'blur(24px)',display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',gap:24}}>
            <h2 style={{fontFamily:"'Oxanium',sans-serif",fontWeight:800,fontSize:64,color:'white',letterSpacing:6}}>TẠM DỪNG</h2>
            <button className="btn-fc" style={{padding:'14px 48px',fontSize:18,borderRadius:12}} onClick={()=>setIsPaused(false)}>TIẾP TỤC</button>
            <button onClick={handleFinish} style={{color:'rgba(255,255,255,0.35)',background:'none',border:'none',cursor:'pointer',fontSize:13,fontWeight:600}}>Kết thúc trận</button>
          </div>
        )}

        {/* Mobile controls */}
        {isMobile&&uiState==='playing'&&(
          <div style={{position:'absolute',inset:0,pointerEvents:'none',zIndex:30}}>
            {/* Joystick */}
            <div style={{position:'absolute',bottom:28,left:28,pointerEvents:'auto'}}
              onTouchStart={joyStart} onTouchMove={joyMove} onTouchEnd={joyEnd}>
              <div style={{width:96,height:96,borderRadius:'50%',background:'rgba(255,255,255,0.06)',border:'2px solid rgba(255,255,255,0.18)',backdropFilter:'blur(8px)',position:'relative',display:'flex',alignItems:'center',justifyContent:'center',touchAction:'none'}}>
                <div style={{width:38,height:38,borderRadius:'50%',background:'radial-gradient(circle at 35% 35%,#1a8fff,#0055bb)',boxShadow:'0 4px 16px rgba(0,100,220,0.6)',border:'2px solid rgba(0,180,255,0.4)',position:'absolute',transform:`translate(${joystick.x}px,${joystick.y}px)`,touchAction:'none'}} />
              </div>
            </div>
            {/* Action buttons */}
            <div style={{position:'absolute',bottom:28,right:28,display:'flex',flexDirection:'column',gap:10,pointerEvents:'auto'}}>
              <div style={{display:'flex',gap:10,justifyContent:'flex-end'}}>
                <div className="m-btn" style={{width:54,height:54,background:'rgba(0,100,220,0.85)',borderColor:'rgba(0,180,255,0.6)',color:'white',boxShadow:'0 4px 20px rgba(0,100,200,0.5)'}}
                  onTouchStart={()=>{keys.current['KeyK']=true;}} onTouchEnd={()=>{keys.current['KeyK']=false;}}>K</div>
                <div className="m-btn" style={{width:60,height:60,background:'rgba(220,50,50,0.85)',borderColor:'rgba(255,100,100,0.6)',color:'white',boxShadow:'0 4px 20px rgba(200,50,50,0.5)'}}
                  onTouchStart={()=>{keys.current['Space']=true;}} onTouchEnd={()=>{keys.current['Space']=false;}}>J</div>
              </div>
              <div style={{display:'flex',gap:10,justifyContent:'flex-end'}}>
                <div className="m-btn" style={{width:44,height:44,background:'rgba(255,205,60,0.85)',borderColor:'rgba(255,220,100,0.6)',color:'#1a0e00',boxShadow:'0 4px 16px rgba(200,160,0,0.4)'}}
                  onTouchStart={()=>{keys.current['KeyQ']=true;setTimeout(()=>{keys.current['KeyQ']=false;},120);}}>Q</div>
                <div className="m-btn" style={{width:44,height:44,background:'rgba(0,200,80,0.85)',borderColor:'rgba(0,230,100,0.6)',color:'white',boxShadow:'0 4px 16px rgba(0,180,60,0.4)'}}
                  onTouchStart={()=>{keys.current['ShiftLeft']=true;}} onTouchEnd={()=>{keys.current['ShiftLeft']=false;}}>⚡</div>
              </div>
            </div>
            <div style={{position:'absolute',bottom:8,right:28,display:'flex',gap:18,fontSize:9,color:'rgba(255,255,255,0.3)',fontWeight:700}}>
              <span>CHUYỀN</span><span>SÚT</span>
            </div>
          </div>
        )}

        {/* Halftime */}
        {uiState==='halftime'&&(
          <div style={{position:'absolute',inset:0,zIndex:40,background:'rgba(5,11,26,0.95)',backdropFilter:'blur(24px)',display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',gap:20}}>
            <div style={{fontSize:10,fontWeight:800,letterSpacing:'0.4em',color:'#00d4a0'}}>HẾT HIỆP 1</div>
            <h2 style={{fontFamily:"'Oxanium',sans-serif",fontWeight:800,fontSize:64,color:'white',letterSpacing:6}}>NGHỈ GIỮA HIỆP</h2>
            <div style={{fontSize:44,fontWeight:800,color:'#ffcd3c',fontFamily:"'Oxanium',sans-serif"}}>{score.A} - {score.B}</div>
            <button className="btn-fc" style={{padding:'14px 48px',fontSize:18,borderRadius:12,marginTop:16}}
              onClick={()=>{setHalf(2);setUiState('playing');gs.current.state='PLAYING';gs.current.timer=45;resetPos('B');}}>
              BẮT ĐẦU HIỆP 2
            </button>
          </div>
        )}

        {/* Extra time */}
        {uiState==='extratime_break'&&(
          <div style={{position:'absolute',inset:0,zIndex:40,background:'rgba(5,11,26,0.95)',backdropFilter:'blur(24px)',display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',gap:20}}>
            <h2 style={{fontFamily:"'Oxanium',sans-serif",fontWeight:800,fontSize:60,color:'white',letterSpacing:4}}>HIỆP PHỤ</h2>
            <div style={{fontSize:40,fontWeight:800,color:'#ffcd3c',fontFamily:"'Oxanium',sans-serif"}}>{score.A} - {score.B}</div>
            <button className="btn-fc" style={{padding:'14px 48px',fontSize:18,borderRadius:12}} onClick={()=>{const nh=half===2?3:4;setHalf(nh as any);setUiState('playing');gs.current.state='PLAYING';gs.current.timer=nh===3?90:105;resetPos('A');}}>BẮT ĐẦU</button>
          </div>
        )}

        {/* Penalties UI */}
        {uiState==='penalties'&&(
          <div style={{position:'absolute',inset:0,top:0,zIndex:40,pointerEvents:'none',display:'flex',flexDirection:'column',alignItems:'center',paddingTop:16}}>
            <div style={{background:'rgba(5,11,26,0.92)',backdropFilter:'blur(16px)',border:'1px solid rgba(0,180,255,0.25)',borderRadius:16,padding:'16px 32px',pointerEvents:'auto',textAlign:'center'}}>
              <div style={{fontSize:10,fontWeight:800,letterSpacing:'0.4em',color:'#00b4ff',marginBottom:12}}>ĐÁ PHẠT ĐỀN</div>
              <div style={{display:'flex',alignItems:'center',gap:24}}>
                <div style={{textAlign:'center'}}><div style={{fontSize:10,color:'rgba(255,255,255,0.4)',fontWeight:700,marginBottom:4}}>BẠN</div><div style={{fontSize:48,fontWeight:900,color:'#00e676',fontFamily:"'Oxanium',sans-serif"}}>{penState.scoreA}</div></div>
                <div style={{fontSize:28,color:'rgba(255,255,255,0.2)'}}>-</div>
                <div style={{textAlign:'center'}}><div style={{fontSize:10,color:'rgba(255,255,255,0.4)',fontWeight:700,marginBottom:4}}>AI</div><div style={{fontSize:48,fontWeight:900,color:'#ff5555',fontFamily:"'Oxanium',sans-serif"}}>{penState.scoreB}</div></div>
              </div>
              <div style={{display:'flex',gap:8,justifyContent:'center',marginTop:12}}>
                {penState.history.map((h,i)=>(<div key={i} style={{width:18,height:18,borderRadius:'50%',background:h.result==='goal'?'#00e676':'#ff5555'}}/>))}
                {Array.from({length:Math.max(0,5-penState.history.length)}).map((_,i)=>(<div key={i} style={{width:18,height:18,borderRadius:'50%',background:'rgba(255,255,255,0.1)',border:'1px solid rgba(255,255,255,0.2)'}}/>))}
              </div>
            </div>
            <div style={{marginTop:16,pointerEvents:'auto'}} className="anim-pulse">
              {penState.phase==='aiming'&&penState.turn==='A'&&<div style={{background:'#00c851',color:'black',fontWeight:800,padding:'10px 24px',borderRadius:10,fontSize:15}}>CLICK VÀO KHUNG THÀNH ĐỂ SÚT!</div>}
              {penState.phase==='saving'&&penState.turn==='B'&&<div style={{background:'#0066cc',color:'white',fontWeight:800,padding:'10px 24px',borderRadius:10,fontSize:15}}>CLICK ĐỂ BẮT BÓNG!</div>}
              {penState.phase==='result'&&<div style={{fontSize:60,fontWeight:900,color:penState.history[penState.history.length-1]?.result==='goal'?'#00ff88':'#ff5555',fontFamily:"'Oxanium',sans-serif"}}>{penState.history[penState.history.length-1]?.result==='goal'?'GOL! ⚽':'CỨU! 🧤'}</div>}
            </div>
          </div>
        )}

        {/* Full time */}
        {uiState==='finished'&&(
          <div style={{position:'absolute',inset:0,zIndex:50,background:'rgba(5,11,26,0.97)',backdropFilter:'blur(24px)',overflowY:'auto',display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',padding:24}}>
            <div style={{width:'100%',maxWidth:600}}>
              <div style={{textAlign:'center',marginBottom:24}}>
                <div style={{fontSize:10,fontWeight:800,letterSpacing:'0.4em',color:'#00b4ff',marginBottom:8}}>HẾT GIỜ</div>
                <h2 style={{fontFamily:"'Oxanium',sans-serif",fontWeight:800,fontSize:64,color:'white',marginBottom:4,letterSpacing:4}}>{score.A>score.B?'CHIẾN THẮNG':score.A<score.B?'THẤT BẠI':'HÒA'}</h2>
                <div style={{fontSize:40,fontWeight:900,fontFamily:"'Oxanium',sans-serif",color:score.A>score.B?'#00e676':score.A<score.B?'#ff5555':'#ffcd3c'}}>{score.A} - {score.B}</div>
              </div>
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:14,marginBottom:20}}>
                <div style={{background:'rgba(255,255,255,0.04)',border:'1px solid rgba(255,255,255,0.08)',borderRadius:12,padding:'16px 20px'}}>
                  <div style={{fontSize:10,fontWeight:800,color:'rgba(255,255,255,0.4)',letterSpacing:'0.3em',marginBottom:12}}>NGƯỜI GHI BÀN</div>
                  {matchStats.goals.filter(g=>g.team==='A').length>0
                    ?matchStats.goals.filter(g=>g.team==='A').map((g,i)=><div key={i} style={{display:'flex',justifyContent:'space-between',color:'#00e676',fontWeight:700,fontSize:13,marginBottom:4}}><span>⚽ {squad.lineup.find(p=>p?.id===g.playerId)?.name||'Cầu thủ'}</span><span style={{color:'rgba(255,255,255,0.3)'}}>{g.minute}'</span></div>)
                    :<div style={{color:'rgba(255,255,255,0.25)',fontSize:12,fontStyle:'italic'}}>Chưa có bàn thắng</div>}
                </div>
                <div style={{background:'rgba(255,205,60,0.05)',border:'1px solid rgba(255,205,60,0.15)',borderRadius:12,padding:'16px 20px',display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center'}}>
                  <div style={{fontSize:10,fontWeight:800,color:'#ffcd3c',letterSpacing:'0.3em',marginBottom:8}}>MVP</div>
                  {getMVP()?<><div style={{fontFamily:"'Oxanium',sans-serif",fontWeight:800,fontSize:22,color:'white'}}>{getMVP()?.name.split(' ').pop()?.toUpperCase()}</div><div style={{fontSize:12,color:'#ffcd3c',fontWeight:700,marginTop:4}}>Rating {matchStats.ratings[getMVP()?.id||'']?.toFixed(1)}</div></>:<div style={{color:'rgba(255,255,255,0.25)',fontSize:12}}>Không có</div>}
                </div>
              </div>
              <div style={{background:'rgba(255,205,60,0.08)',border:'1px solid rgba(255,205,60,0.2)',borderRadius:12,padding:'16px',textAlign:'center',marginBottom:20}}>
                <div style={{fontSize:10,fontWeight:800,color:'#ffcd3c',letterSpacing:'0.3em',marginBottom:6}}>PHẦN THƯỞNG</div>
                <div style={{fontFamily:"'Oxanium',sans-serif",fontWeight:800,fontSize:40,color:'#ffcd3c'}}>+{score.A>score.B?600:score.A===score.B?250:120} <span style={{fontSize:20}}>FC Coins</span></div>
              </div>
              <button className="btn-fc" style={{width:'100%',padding:'14px 0',fontSize:18,borderRadius:12}} onClick={handleFinish}>
                {isWorldCup?'TIẾP THEO':'TIẾP TỤC'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
