// Mappa dipinta via codice a partire dalle righe di testo del capitolo.
// Il disegno è quello del prototipo, riportato com'è: ogni mappa nuova si disegna da sola.
let MAP = [], ROWS = 0, COLS = 0, T = 48, CH = null, cv = null, ctx = null;
const inMap = (x, y) => x >= 0 && y >= 0 && x < COLS && y < ROWS;
const TEMI = { citta: "city", campagna: "country", foresta: "forest", "foresta-notte": "forestnight", cielo: "sky", miniera: "mine", notte: "night" };

export function disegnaMappa(canvas, capitolo, lato) {
  cv = canvas; ctx = cv.getContext("2d");
  MAP = capitolo.mappa; ROWS = MAP.length; COLS = MAP[0].length; T = lato;
  CH = { theme: TEMI[capitolo.tema] || "city", pave: !!capitolo.selciato };
  drawMap();
}

function rnd(seed){ let s = seed>>>0; return ()=>{ s = (s*1664525+1013904223)>>>0; return s/4294967296; }; }
const K = (x,y) => inMap(x,y) ? MAP[y][x] : null;
const WATER = k => k==="w" || k==="~";
const isWet = (x,y) => { const k=K(x,y); if(WATER(k)) return true;
  if(k==="b") return WATER(K(x,y-1)) || WATER(K(x,y+1));
  if(k==="=") return WATER(K(x,y-1)) || WATER(K(x,y+1)) || WATER(K(x-1,y)) || WATER(K(x+1,y));
  return false; };
const isNatural = (x,y) => K(x,y)==="~" || [[0,1],[0,-1],[1,0],[-1,0]].some(([dx,dy])=>K(x+dx,y+dy)==="~") && K(x,y)!=="w";
const THEMES = {
  city:   {base:"#5c6c3a", blobs:["#73844a","#4e5f33","#808c4f","#46572f","#6a7a40"], blade:"rgba(170,190,110,.28)"},
  country:{base:"#6a7b3e", blobs:["#84964f","#5a6b36","#93a05a","#506232","#7a8a46"], blade:"rgba(200,215,130,.32)"},
  forest: {base:"#33482f", blobs:["#3f5a37","#2a3d27","#4b6a3e","#24352a","#3a5240"], blade:"rgba(140,190,120,.25)", mist:true},
  forestnight:{base:"#33482f", blobs:["#3f5a37","#2a3d27","#4b6a3e","#24352a","#3a5240"], blade:"rgba(140,190,120,.2)", mist:true, night:true},
  sky:    {base:"#7fa6c6", blobs:["#94bbd8","#6f98bc","#a6c8e0","#628cb2","#88b0d0"], blade:"rgba(0,0,0,0)", sky:true},
  mine:   {base:"#4a3e30", blobs:["#56483a","#3e342a","#5e5040","#362e26","#4e4234"], blade:"rgba(0,0,0,0)", night:true, nightColor:"rgba(24,14,6,.5)"},
  night:  {base:"#56663a", blobs:["#6a7a44","#4a5a32","#77844a","#425230","#62723e"], blade:"rgba(170,190,110,.22)", night:true},
};
const isPaved = (x,y) => { const k=K(x,y); return k==="g" || k==="F" || (CH && CH.pave && [".","k","L","r","s"].includes(k)); };
const onDeck = (x,y) => CH && CH.theme==="sky" && ["k","=","X"].includes(K(x,y));
function blob(cx,cy,r,col,a){ const g=ctx.createRadialGradient(cx,cy,0,cx,cy,r); g.addColorStop(0,col); g.addColorStop(1,"rgba(0,0,0,0)");
  ctx.globalAlpha=a; ctx.fillStyle=g; ctx.beginPath(); ctx.arc(cx,cy,r,0,7); ctx.fill(); ctx.globalAlpha=1; }
function drawMap(){
  const dpr = Math.min(2, window.devicePixelRatio||1), MW = COLS*T, MH = ROWS*T;
  cv.width = MW*dpr; cv.height = MH*dpr; cv.style.width = MW+"px"; cv.style.height = MH+"px";
  ctx.setTransform(dpr,0,0,dpr,0,0); ctx.lineCap="round"; ctx.lineJoin="round";
  const tiles = (fn) => { for(let y=0;y<ROWS;y++) for(let x=0;x<COLS;x++) fn(x,y,MAP[y][x],x*T,y*T,rnd(x*928371+y*12345+7)); };

  const TH = THEMES[(CH&&CH.theme)||"city"], lights=[];
  // 1. prato dipinto: base + macchie morbide che sfumano tra le caselle
  ctx.fillStyle=TH.base; ctx.fillRect(0,0,MW,MH);
  tiles((x,y,k,X,Y,r)=>{ for(let i=0;i<4;i++) blob(X+r()*T, Y+r()*T, T*(.45+r()*.55), TH.blobs[Math.floor(r()*5)], .5); });
  // strade sterrate
  tiles((x,y,k,X,Y,r)=>{ if(k!=="s" && k!=="L") return; const road=(a,b)=>["s","L","="].includes(K(a,b));
    if(k==="L" && ![[1,0],[-1,0],[0,1],[0,-1]].some(([dx,dy])=>road(x+dx,y+dy))) return;
    ctx.fillStyle="#86704d"; ctx.beginPath(); ctx.arc(X+T/2,Y+T/2,T*.4,0,7); ctx.fill();
    if(road(x-1,y)||x===0) ctx.fillRect(X,Y+T*.1,T/2,T*.8); if(road(x+1,y)||x===COLS-1) ctx.fillRect(X+T/2,Y+T*.1,T/2,T*.8);
    if(road(x,y-1)||y===0) ctx.fillRect(X+T*.1,Y,T*.8,T/2); if(road(x,y+1)||y===ROWS-1) ctx.fillRect(X+T*.1,Y+T/2,T*.8,T/2);
    for(let i=0;i<10;i++){ ctx.fillStyle=r()<.5?"rgba(60,45,25,.25)":"rgba(220,200,150,.18)"; ctx.fillRect(X+T*.15+r()*T*.7, Y+T*.15+r()*T*.7, 2, 2); }
    ctx.strokeStyle="rgba(60,45,25,.18)"; ctx.lineWidth=1.2; ctx.beginPath(); ctx.moveTo(X+T*.3,Y+T*.2); ctx.lineTo(X+T*.32,Y+T*.8); ctx.moveTo(X+T*.7,Y+T*.2); ctx.lineTo(X+T*.68,Y+T*.8); ctx.stroke(); });
  tiles((x,y,k,X,Y,r)=>{ if(k==="s") return; ctx.strokeStyle=TH.blade; ctx.lineWidth=1;
    for(let i=0;i<6;i++){ const gx=X+r()*T, gy=Y+r()*T; ctx.beginPath(); ctx.moveTo(gx,gy); ctx.lineTo(gx+(r()-.5)*3, gy-3-r()*3); ctx.stroke(); } });

  // 2. selciato del quartiere della fonderia
  tiles((x,y,k,X,Y,r)=>{ if(!isPaved(x,y)) return;
    ctx.fillStyle="#3c3f47"; ctx.fillRect(X,Y,T,T);
    const s=T/2; for(let i=0;i<2;i++) for(let j=0;j<2;j++){ const sx=X+i*s+1, sy=Y+j*s+1, v=Math.floor(r()*14);
      ctx.fillStyle=`rgb(${74+v},${77+v},${86+v})`; ctx.fillRect(sx,sy,s-2,s-2);
      ctx.fillStyle="rgba(255,255,255,.08)"; ctx.fillRect(sx,sy,s-2,1.5); ctx.fillRect(sx,sy,1.5,s-2);
      ctx.fillStyle="rgba(0,0,0,.18)"; ctx.fillRect(sx,sy+s-3.5,s-2,1.5);
      if(r()<.25){ ctx.strokeStyle="rgba(20,20,24,.5)"; ctx.lineWidth=1; ctx.beginPath(); ctx.moveTo(sx+r()*s,sy+2); ctx.lineTo(sx+r()*s,sy+s*.6); ctx.stroke(); } }
    if(k==="g" && r()<.35){ ctx.fillStyle="#26282e"; ctx.fillRect(X+T*.3,Y+T*.3,T*.4,T*.4); ctx.strokeStyle="#5d616b"; ctx.lineWidth=1;
      for(let i=1;i<4;i++){ const gx=X+T*.3+i*T*.1; ctx.beginPath(); ctx.moveTo(gx,Y+T*.32); ctx.lineTo(gx,Y+T*.68); ctx.stroke(); } }
    // cordolo verso il prato
    [[0,-1,X,Y,T,3],[0,1,X,Y+T-3,T,3],[-1,0,X,Y,3,T],[1,0,X+T-3,Y,3,T]].forEach(([dx,dy,a,b,w,h])=>{
      const n=K(x+dx,y+dy); if(n && !isPaved(x+dx,y+dy) && n!=="X"){ ctx.fillStyle="#8e8a80"; ctx.fillRect(a,b,w,h); } }); });

  // 3. canali con argini di pietra
  tiles((x,y,k,X,Y,r)=>{ if(!isWet(x,y)) return;
    const nat=isNatural(x,y), g=ctx.createLinearGradient(X,Y,X,Y+T);
    if(nat){ g.addColorStop(0,"#2a5a5a"); g.addColorStop(.5,"#346c68"); g.addColorStop(1,"#2b5e5c"); } else { g.addColorStop(0,"#21474f"); g.addColorStop(.5,"#2c5d66"); g.addColorStop(1,"#23505a"); }
    ctx.fillStyle=g; ctx.fillRect(X,Y,T,T);
    for(let i=0;i<3;i++){ const yy=Y+T*(.22+i*.28)+r()*4, xx=X+r()*T*.4; ctx.strokeStyle=`rgba(180,235,230,${.18+r()*.2})`; ctx.lineWidth=1.4;
      ctx.beginPath(); ctx.moveTo(xx,yy); ctx.quadraticCurveTo(xx+T*.15,yy-3,xx+T*.3,yy); ctx.quadraticCurveTo(xx+T*.45,yy+3,xx+T*.55,yy); ctx.stroke(); }
    const E=T*.14;
    [[0,-1],[0,1],[-1,0],[1,0]].forEach(([dx,dy])=>{ if(!inMap(x+dx,y+dy) || isWet(x+dx,y+dy)) return;
      const hz=dy!==0, ex = dx===1 ? X+T-E : X, ey = dy===1 ? Y+T-E : Y, w = hz?T:E, h = hz?E:T;
      const sg = hz ? ctx.createLinearGradient(0,dy<0?Y+E:Y+T-E,0,dy<0?Y+E*2.5:Y+T-E*2.5) : ctx.createLinearGradient(dx<0?X+E:X+T-E,0,dx<0?X+E*2.5:X+T-E*2.5,0);
      sg.addColorStop(0,"rgba(0,0,0,.45)"); sg.addColorStop(1,"rgba(0,0,0,0)"); ctx.fillStyle=sg; ctx.fillRect(X,Y,T,T);
      if(isNatural(x,y)){ ctx.fillStyle="#6e5b3c"; ctx.fillRect(ex,ey,w,h); ctx.fillStyle="rgba(120,150,70,.6)"; for(let i=0;i<5;i++) hz ? ctx.fillRect(ex+r()*w,ey+(dy<0?0:h-3),3,3) : ctx.fillRect(ex+(dx<0?0:w-3),ey+r()*h,3,3); return; }
      ctx.fillStyle="#7b776d"; ctx.fillRect(ex,ey,w,h);
      ctx.fillStyle="rgba(255,255,255,.18)"; hz ? ctx.fillRect(ex,ey,w,1.5) : ctx.fillRect(ex,ey,1.5,h);
      ctx.strokeStyle="rgba(40,36,30,.6)"; ctx.lineWidth=1;
      for(let i=1;i<4;i++){ ctx.beginPath(); if(hz){ ctx.moveTo(ex+i*T/4+(dy*3),ey); ctx.lineTo(ex+i*T/4+(dy*3),ey+h); } else { ctx.moveTo(ex,ey+i*T/4); ctx.lineTo(ex+w,ey+i*T/4); } ctx.stroke(); } }); });

  // 4. macerie
  tiles((x,y,k,X,Y,r)=>{ if(k!=="r") return;
    blob(X+T/2,Y+T/2,T*.62,"#6f5f49",.75);
    for(let i=0;i<5;i++){ const cx=X+T*(.18+r()*.64), cy=Y+T*(.2+r()*.6), s=T*(.07+r()*.09), n=5+Math.floor(r()*2), pts=[];
      for(let j=0;j<n;j++){ const a=j/n*6.283+r()*.5, d=s*(.7+r()*.5); pts.push([cx+Math.cos(a)*d, cy+Math.sin(a)*d*.8]); }
      const poly=(ox,oy)=>{ ctx.beginPath(); pts.forEach(([px,py],j)=>j?ctx.lineTo(px+ox,py+oy):ctx.moveTo(px+ox,py+oy)); ctx.closePath(); };
      ctx.fillStyle="rgba(0,0,0,.35)"; poly(2,2.5); ctx.fill();
      const v=Math.floor(r()*20); ctx.fillStyle=`rgb(${128+v},${120+v},${108+v})`; poly(0,0); ctx.fill();
      ctx.fillStyle="rgba(255,255,255,.22)"; ctx.beginPath(); ctx.moveTo(pts[0][0],pts[0][1]); ctx.lineTo(cx,cy); ctx.lineTo(pts[n-1][0],pts[n-1][1]); ctx.closePath(); ctx.fill(); }
    if(r()<.5){ ctx.strokeStyle="#9a7b3c"; ctx.lineWidth=2; ctx.beginPath(); const bx=X+T*(.2+r()*.5), by=Y+T*(.3+r()*.4); ctx.moveTo(bx,by); ctx.lineTo(bx+T*.25,by+T*.08); ctx.stroke(); } });



  // 4g. cielo e ponti della nave
  if(TH.sky){ const rr=rnd(7); tiles((x,y,k,X,Y,r)=>{ if(k!=="o") return; if(r()<.5) blob(X+r()*T, Y+r()*T, T*(.5+r()*.6), "#ffffff", .35); });
    tiles((x,y,k,X,Y,r)=>{ if(k!=="D" && k!=="k" && k!=="X" && k!=="=") return; blob(X+T/2+T*.25, Y+T/2+T*.5, T*.8, "#2a3a4a", .35); }); }
  tiles((x,y,k,X,Y,r)=>{ if(k!=="D") return;
    ctx.fillStyle="#8a6a46"; ctx.fillRect(X,Y,T,T);
    ctx.strokeStyle="rgba(40,26,14,.5)"; ctx.lineWidth=1; for(let i=1;i<4;i++){ ctx.beginPath(); ctx.moveTo(X,Y+i*T/4); ctx.lineTo(X+T,Y+i*T/4); ctx.stroke(); }
    for(let i=0;i<4;i++){ ctx.fillStyle=`rgba(255,230,180,${r()*.1})`; ctx.fillRect(X,Y+i*T/4+1,T,T/4-2); ctx.fillStyle="rgba(40,26,14,.4)"; ctx.fillRect(X+r()*T,Y+i*T/4,1,T/4); }
    ctx.fillStyle="#c9a24f";
    if(K(x,y-1)==="o"||y===0) ctx.fillRect(X,Y,T,3); if(K(x,y+1)==="o"||y===ROWS-1) ctx.fillRect(X,Y+T-3,T,3);
    if(K(x-1,y)==="o") ctx.fillRect(X,Y,3,T); if(K(x+1,y)==="o") ctx.fillRect(X+T-3,Y,3,T); });

  // 4b. pontili di legno
  tiles((x,y,k,X,Y,r)=>{ if(k!=="=") return; const hz = K(x-1,y)==="=" || K(x+1,y)==="=" || !(K(x,y-1)==="=" || K(x,y+1)==="=") && !WATER(K(x-1,y));
    const wet=isWet(x,y);
    if(wet){ ctx.fillStyle="rgba(0,0,0,.35)"; ctx.fillRect(X+3,Y+4,T,T); }
    ctx.fillStyle="#7a5a3c"; ctx.fillRect(X,Y,T,T);
    ctx.strokeStyle="rgba(35,22,12,.55)"; ctx.lineWidth=1;
    for(let i=1;i<6;i++){ ctx.beginPath(); if(hz){ ctx.moveTo(X+i*T/6,Y); ctx.lineTo(X+i*T/6,Y+T); } else { ctx.moveTo(X,Y+i*T/6); ctx.lineTo(X+T,Y+i*T/6); } ctx.stroke(); }
    for(let i=0;i<6;i++){ ctx.fillStyle=`rgba(255,230,180,${r()*.08})`; hz ? ctx.fillRect(X+i*T/6+1,Y,T/6-2,T) : ctx.fillRect(X,Y+i*T/6+1,T,T/6-2); }
    if(wet){ ctx.fillStyle="#4a3424"; [[.08,.08],[.92,.08],[.08,.92],[.92,.92]].forEach(([a,b])=>{ ctx.beginPath(); ctx.arc(X+a*T,Y+b*T,T*.06,0,7); ctx.fill(); }); } });

  // 4c. rocce
  tiles((x,y,k,X,Y,r)=>{ if(k!=="m") return;
    blob(X+T/2,Y+T*.6,T*.6,"#3a3a32",.6);
    for(let i=0;i<3;i++){ const cx=X+T*(.25+r()*.5), cy=Y+T*(.3+r()*.45), s=T*(.2+r()*.12), n=6, pts=[];
      for(let j=0;j<n;j++){ const a=j/n*6.283+r()*.4, d=s*(.75+r()*.35); pts.push([cx+Math.cos(a)*d, cy+Math.sin(a)*d*.75]); }
      const poly=(ox,oy)=>{ ctx.beginPath(); pts.forEach(([px,py],j)=>j?ctx.lineTo(px+ox,py+oy):ctx.moveTo(px+ox,py+oy)); ctx.closePath(); };
      ctx.fillStyle="rgba(0,0,0,.4)"; poly(3,4); ctx.fill(); ctx.fillStyle="#77736a"; poly(0,0); ctx.fill();
      ctx.fillStyle="#9a958a"; ctx.beginPath(); ctx.moveTo(pts[3][0],pts[3][1]); ctx.lineTo(pts[4][0],pts[4][1]); ctx.lineTo(pts[5][0],pts[5][1]); ctx.lineTo(cx,cy); ctx.closePath(); ctx.fill();
      ctx.fillStyle="#565249"; ctx.beginPath(); ctx.moveTo(pts[0][0],pts[0][1]); ctx.lineTo(pts[1][0],pts[1][1]); ctx.lineTo(pts[2][0],pts[2][1]); ctx.lineTo(cx,cy); ctx.closePath(); ctx.fill();
      ctx.fillStyle="rgba(110,140,70,.5)"; ctx.fillRect(cx-s*.3,cy-s*.55,3,2); } });

  // 4d. casse del porto
  tiles((x,y,k,X,Y,r)=>{ if(k!=="k") return; if(onDeck(x,y)){ ctx.fillStyle="#8a6a46"; ctx.fillRect(X,Y,T,T); }
    const box=(bx,by,s)=>{ ctx.fillStyle="rgba(0,0,0,.4)"; ctx.fillRect(bx+3,by+4,s,s);
      ctx.fillStyle="#9a7346"; ctx.fillRect(bx,by,s,s); ctx.strokeStyle="#5a3e22"; ctx.lineWidth=2; ctx.strokeRect(bx+1,by+1,s-2,s-2);
      ctx.beginPath(); ctx.moveTo(bx+2,by+2); ctx.lineTo(bx+s-2,by+s-2); ctx.stroke();
      ctx.fillStyle="rgba(255,235,190,.18)"; ctx.fillRect(bx+2,by+2,s-4,2); };
    box(X+T*.1,Y+T*.38,T*.46); box(X+T*.46,Y+T*.12,T*.4); if(r()<.5) box(X+T*.52,Y+T*.56,T*.34); });

  // 4e. cristalli d'etere
  tiles((x,y,k,X,Y,r)=>{ if(k!=="c") return;
    blob(X+T/2,Y+T*.6,T*.55,"#2e4a48",.7);
    for(let i=0;i<4;i++){ const bx=X+T*(.22+r()*.56), by=Y+T*(.55+r()*.3), h=T*(.22+r()*.25), w=T*(.07+r()*.05), lean=(r()-.5)*T*.15;
      ctx.fillStyle="rgba(0,0,0,.3)"; ctx.beginPath(); ctx.ellipse(bx+3,by+2,w*1.4,w*.6,0,0,7); ctx.fill();
      ctx.fillStyle="#3fb8b0"; ctx.beginPath(); ctx.moveTo(bx-w,by); ctx.lineTo(bx-w+lean,by-h); ctx.lineTo(bx+lean,by-h-w*1.4); ctx.lineTo(bx+w+lean,by-h); ctx.lineTo(bx+w,by); ctx.closePath(); ctx.fill();
      ctx.fillStyle="#a8fff4"; ctx.beginPath(); ctx.moveTo(bx-w,by); ctx.lineTo(bx-w+lean,by-h); ctx.lineTo(bx+lean,by-h-w*1.4); ctx.lineTo(bx+lean*.5,by); ctx.closePath(); ctx.fill(); }
    lights.push([X+T/2,Y+T*.5,T*1.1,"#60f0e0",.3]); });

  // 4f. lampioni
  tiles((x,y,k,X,Y,r)=>{ if(k!=="L") return; const px=X+T*.78, py=Y+T*.2;
    ctx.fillStyle="rgba(0,0,0,.35)"; ctx.beginPath(); ctx.ellipse(px+4,Y+T*.86,T*.1,T*.04,0,0,7); ctx.fill();
    ctx.fillStyle="#2a2620"; ctx.fillRect(px-1.5,py,3,T*.66); ctx.fillStyle="#c9a24f"; ctx.fillRect(px-4,py-2,8,3);
    ctx.fillStyle="#ffe49a"; ctx.beginPath(); ctx.arc(px,py-6,4.5,0,7); ctx.fill(); ctx.strokeStyle="#5a4a2a"; ctx.lineWidth=1; ctx.stroke();
    lights.push([px,py-6,T*1.4,"#ffc060",.4]); });

  // 5. binari e ponti
  tiles((x,y,k,X,Y,r)=>{ if(k!=="b") return;
    const c={L:K(x-1,y)==="b"||x===0, R:K(x+1,y)==="b"||x===COLS-1, U:K(x,y-1)==="b", D:K(x,y+1)==="b"};
    if(isWet(x,y)){ ctx.fillStyle="rgba(0,0,0,.35)"; ctx.fillRect(X,Y+T*.16,T,T*.8);
      ctx.fillStyle="#6b4e34"; ctx.fillRect(X,Y+T*.12,T,T*.76);
      ctx.strokeStyle="rgba(30,20,10,.5)"; ctx.lineWidth=1; for(let i=1;i<6;i++){ ctx.beginPath(); ctx.moveTo(X+i*T/6,Y+T*.12); ctx.lineTo(X+i*T/6,Y+T*.88); ctx.stroke(); }
      [Y+T*.08, Y+T*.82].forEach(gy=>{ ctx.fillStyle="#8a7650"; ctx.fillRect(X,gy,T,T*.1); ctx.fillStyle="#c9a45a"; ctx.fillRect(X,gy,T,1.5);
        ctx.fillStyle="#3a3024"; for(let i=0;i<4;i++){ ctx.beginPath(); ctx.arc(X+T*(.12+i*.25),gy+T*.05,1.3,0,7); ctx.fill(); } }); }
    let seg;
    if((c.U||c.D) && !(c.L&&c.R) && (c.L||c.R)){
      const cx = c.L ? X : X+T, cy = c.U ? Y : Y+T;
      const a0 = c.L ? (c.U?0:-Math.PI/2) : (c.U?Math.PI/2:Math.PI);
      seg={arc:true,cx,cy,a0,a1:a0+Math.PI/2};
    } else if((c.U||c.D) && !(c.L||c.R)) seg={v:true}; else seg={h:true};
    const along=(fn)=>{ if(seg.arc){ for(let i=0;i<=4;i++){ const a=seg.a0+(seg.a1-seg.a0)*(i+.5)/5; fn(a); } } };
    const path=(off)=>{ ctx.beginPath();
      if(seg.arc) ctx.arc(seg.cx,seg.cy,T/2+off,seg.a0,seg.a1);
      else if(seg.v){ ctx.moveTo(X+T/2+off,Y); ctx.lineTo(X+T/2+off,Y+T); }
      else { ctx.moveTo(X,Y+T/2+off); ctx.lineTo(X+T,Y+T/2+off); } };
    if(!isWet(x,y)){ ctx.strokeStyle="rgba(95,88,78,.9)"; ctx.lineWidth=T*.6; ctx.lineCap="butt"; path(0); ctx.stroke(); }
    ctx.strokeStyle="#5a4128"; ctx.lineWidth=T*.08; ctx.lineCap="butt";
    if(seg.arc) along(a=>{ ctx.beginPath(); ctx.moveTo(seg.cx+Math.cos(a)*T*.2,seg.cy+Math.sin(a)*T*.2); ctx.lineTo(seg.cx+Math.cos(a)*T*.8,seg.cy+Math.sin(a)*T*.8); ctx.stroke(); });
    else for(let i=0;i<5;i++){ const p=(i+.5)*T/5; ctx.beginPath(); if(seg.v){ ctx.moveTo(X+T*.2,Y+p); ctx.lineTo(X+T*.8,Y+p); } else { ctx.moveTo(X+p,Y+T*.2); ctx.lineTo(X+p,Y+T*.8); } ctx.stroke(); }
    [-T*.19,T*.19].forEach(o=>{ ctx.strokeStyle="#2b2d31"; ctx.lineWidth=3.2; path(o); ctx.stroke(); ctx.strokeStyle="#c3c8cd"; ctx.lineWidth=1.6; path(o); ctx.stroke(); });
    ctx.lineCap="round"; });

  // 6. mura con tetti di ardesia, fronte in mattoni e finestre accese
  tiles((x,y,k,X,Y,r)=>{ if(k!=="X") return;
    const front = K(x,y+1)!=="X", fh = front ? T*.36 : 0;
    ctx.fillStyle="#3b3842"; ctx.fillRect(X,Y,T,T-fh);
    for(let row=0; row*T/5 < T-fh; row++){ const ry=Y+row*T/5; ctx.fillStyle=row%2?"#4f4a58":"#575262"; ctx.fillRect(X,ry,T,T/5-1);
      ctx.fillStyle="rgba(0,0,0,.25)"; for(let i=(row%2)*T/8;i<T;i+=T/4) ctx.fillRect(X+i,ry,1,T/5-1); }
    ctx.fillStyle="#9c7c42"; if(K(x,y-1)!=="X") ctx.fillRect(X,Y,T,2.5); if(K(x-1,y)!=="X") ctx.fillRect(X,Y,2.5,T-fh); if(K(x+1,y)!=="X") ctx.fillRect(X+T-2.5,Y,2.5,T-fh);
    if(K(x-1,y)!=="X"){ ctx.fillStyle="rgba(255,255,255,.1)"; ctx.fillRect(X+2.5,Y,2,T-fh); }
    if(K(x+1,y)!=="X"){ ctx.fillStyle="rgba(0,0,0,.3)"; ctx.fillRect(X+T-3,Y,3,T-fh); }
    if(front){ const fy=Y+T-fh; ctx.fillStyle="#6b4536"; ctx.fillRect(X,fy,T,fh);
      ctx.fillStyle="rgba(30,15,10,.45)"; for(let row=0;row<3;row++){ ctx.fillRect(X,fy+row*fh/3,T,1); for(let i=(row%2)*T/8;i<T;i+=T/4) ctx.fillRect(X+i,fy+row*fh/3,1,fh/3); }
      ctx.fillStyle="#b08d4a"; ctx.fillRect(X,fy,T,2.5);
      const wx=X+T*.36, wy=fy+fh*.28; ctx.fillStyle="#2a1c14"; ctx.fillRect(wx-1,wy-1,T*.28+2,fh*.5+2);
      const wg=ctx.createLinearGradient(0,wy,0,wy+fh*.5); wg.addColorStop(0,"#ffd98a"); wg.addColorStop(1,"#e0892e"); ctx.fillStyle=wg; ctx.fillRect(wx,wy,T*.28,fh*.5);
      lights.push([wx+T*.14, wy+fh*.3, T*.7, "#ffb050", .3]); } });


  // 6b. case con tetto di coppi
  tiles((x,y,k,X,Y,r)=>{ if(k!=="H") return;
    const front = K(x,y+1)!=="H", fh = front ? T*.4 : 0, roofH=T-fh;
    const g=ctx.createLinearGradient(0,Y,0,Y+roofH); g.addColorStop(0,"#a24a32"); g.addColorStop(.5,"#8a3b28"); g.addColorStop(1,"#6a2c1e");
    ctx.fillStyle=g; ctx.fillRect(X,Y,T,roofH);
    ctx.strokeStyle="rgba(40,12,6,.35)"; ctx.lineWidth=1;
    for(let row=0; row*T/6<roofH; row++){ ctx.beginPath(); ctx.moveTo(X,Y+row*T/6); ctx.lineTo(X+T,Y+row*T/6); ctx.stroke();
      for(let i=(row%2)*T/10;i<T;i+=T/5){ ctx.beginPath(); ctx.moveTo(X+i,Y+row*T/6); ctx.lineTo(X+i,Y+row*T/6+T/6); ctx.stroke(); } }
    if(K(x,y-1)!=="H"){ ctx.fillStyle="#c66a4a"; ctx.fillRect(X,Y,T,2.5); }
    if(K(x-1,y)!=="H"){ ctx.fillStyle="rgba(255,255,255,.12)"; ctx.fillRect(X,Y,2,roofH); }
    if(K(x+1,y)!=="H"){ ctx.fillStyle="rgba(0,0,0,.3)"; ctx.fillRect(X+T-3,Y,3,roofH); }
    if(front){ const fy=Y+roofH; ctx.fillStyle="#cdbb92"; ctx.fillRect(X,fy,T,fh);
      ctx.fillStyle="#5a3e26"; ctx.fillRect(X,fy,T,3); ctx.fillRect(X,fy+fh-3,T,3); ctx.fillRect(X+2,fy,3,fh); ctx.fillRect(X+T-5,fy,3,fh);
      if((x+y)%2===0){ ctx.fillStyle="#4a2e1a"; ctx.fillRect(X+T*.4,fy+fh*.25,T*.22,fh*.75-3); }
      else { const wx=X+T*.32, wy=fy+fh*.28, ww=T*.34, wh=fh*.42; ctx.fillStyle="#3a2414"; ctx.fillRect(wx-1,wy-1,ww+2,wh+2);
        ctx.fillStyle=TH.night?"#ffd27a":"#9fc2cf"; ctx.fillRect(wx,wy,ww,wh); ctx.fillStyle="#3a2414"; ctx.fillRect(wx+ww/2-.5,wy,1,wh);
        if(TH.night) lights.push([wx+ww/2,wy+wh/2,T*.9,"#ffb050",.35]); } } });
  tiles((x,y,k,X,Y)=>{ if(k!=="H") return;
    if(K(x+1,y)!=="H" && inMap(x+1,y)){ const g=ctx.createLinearGradient(X+T,0,X+T*1.3,0); g.addColorStop(0,"rgba(0,0,0,.35)"); g.addColorStop(1,"rgba(0,0,0,0)"); ctx.fillStyle=g; ctx.fillRect(X+T,Y+T*.15,T*.3,T); }
    if(K(x,y+1)!=="H" && inMap(x,y+1)){ const g=ctx.createLinearGradient(0,Y+T,0,Y+T*1.25); g.addColorStop(0,"rgba(0,0,0,.35)"); g.addColorStop(1,"rgba(0,0,0,0)"); ctx.fillStyle=g; ctx.fillRect(X+T*.1,Y+T,T,T*.25); } });

  // 6c. radici giganti
  tiles((x,y,k,X,Y,r)=>{ if(k!=="T") return;
    const cx=X+T/2, cy=Y+T/2;
    ctx.strokeStyle="#3a2a1e"; ctx.lineWidth=T*.16;
    [[1,0],[-1,0],[0,1],[0,-1]].forEach(([dx,dy])=>{ if(K(x+dx,y+dy)==="T"){ ctx.beginPath(); ctx.moveTo(cx,cy); ctx.lineTo(cx+dx*T,cy+dy*T); ctx.stroke(); } });
    ctx.fillStyle="rgba(0,0,0,.45)"; ctx.beginPath(); ctx.ellipse(cx+4,cy+6,T*.5,T*.42,0,0,7); ctx.fill();
    const g=ctx.createRadialGradient(cx-T*.15,cy-T*.15,2,cx,cy,T*.5); g.addColorStop(0,"#7a5a3e"); g.addColorStop(.7,"#5a4030"); g.addColorStop(1,"#3a2a1e");
    ctx.fillStyle=g; ctx.beginPath();
    for(let j=0;j<10;j++){ const a=j/10*6.283, d=T*(.42+r()*.1); j?ctx.lineTo(cx+Math.cos(a)*d,cy+Math.sin(a)*d):ctx.moveTo(cx+Math.cos(a)*d,cy+Math.sin(a)*d); } ctx.closePath(); ctx.fill();
    ctx.strokeStyle="rgba(30,18,10,.5)"; ctx.lineWidth=1.2; for(let i=0;i<4;i++){ ctx.beginPath(); ctx.arc(cx,cy,T*(.1+i*.08),r()*3,r()*3+2.5); ctx.stroke(); }
    ctx.fillStyle="rgba(110,160,80,.7)"; for(let i=0;i<5;i++){ ctx.beginPath(); ctx.arc(cx+(r()-.5)*T*.6, cy-T*.2+(r()-.5)*T*.3, T*(.04+r()*.04),0,7); ctx.fill(); }
    if(r()<.4){ ctx.fillStyle="#8ff5ea"; ctx.beginPath(); ctx.arc(cx+T*.25,cy+T*.2,2,0,7); ctx.fill(); lights.push([cx+T*.25,cy+T*.2,T*.5,"#60f0e0",.25]); } });


  // 6d. pareti di roccia
  tiles((x,y,k,X,Y,r)=>{ if(k!=="#") return;
    const g=ctx.createLinearGradient(X,Y,X+T,Y+T); g.addColorStop(0,"#5a4c3e"); g.addColorStop(1,"#2e2620"); ctx.fillStyle=g; ctx.fillRect(X,Y,T,T);
    for(let i=0;i<3;i++){ ctx.fillStyle=`rgba(255,230,190,${.04+r()*.05})`; ctx.beginPath(); const cx=X+r()*T, cy=Y+r()*T; ctx.moveTo(cx,cy); ctx.lineTo(cx+T*.3,cy+T*.05); ctx.lineTo(cx+T*.15,cy+T*.25); ctx.closePath(); ctx.fill(); }
    ctx.strokeStyle="rgba(0,0,0,.4)"; ctx.lineWidth=1; ctx.beginPath(); ctx.moveTo(X+r()*T,Y); ctx.lineTo(X+r()*T,Y+T*.6); ctx.stroke();
    ctx.fillStyle="#9a8466"; if(K(x,y+1) && K(x,y+1)!=="#") ctx.fillRect(X,Y+T-3,T,3); if(K(x+1,y) && K(x+1,y)!=="#") ctx.fillRect(X+T-2,Y,2,T); if(K(x-1,y) && K(x-1,y)!=="#") ctx.fillRect(X,Y,2,T);
    if(K(x,y+1) && K(x,y+1)!=="#"){ const sg=ctx.createLinearGradient(0,Y+T,0,Y+T*1.3); sg.addColorStop(0,"rgba(0,0,0,.45)"); sg.addColorStop(1,"rgba(0,0,0,0)"); ctx.fillStyle=sg; ctx.fillRect(X,Y+T,T,T*.3); } });

  // 7. ombre portate (luce da in alto a sinistra)
  tiles((x,y,k,X,Y)=>{ if(k!=="X") return;
    if(K(x+1,y)!=="X" && inMap(x+1,y)){ const g=ctx.createLinearGradient(X+T,0,X+T*1.3,0); g.addColorStop(0,"rgba(0,0,0,.38)"); g.addColorStop(1,"rgba(0,0,0,0)"); ctx.fillStyle=g; ctx.fillRect(X+T,Y+T*.15,T*.3,T); }
    if(K(x,y+1)!=="X" && inMap(x,y+1)){ const g=ctx.createLinearGradient(0,Y+T,0,Y+T*1.28); g.addColorStop(0,"rgba(0,0,0,.4)"); g.addColorStop(1,"rgba(0,0,0,0)"); ctx.fillStyle=g; ctx.fillRect(X+T*.1,Y+T,T,T*.28); } });

  // 8. fornace
  tiles((x,y,k,X,Y,r)=>{ if(k!=="F") return;
    const cx=X+T/2, cy=Y+T*.55, R=T*.38;
    ctx.fillStyle="rgba(0,0,0,.4)"; ctx.beginPath(); ctx.ellipse(cx+3,cy+4,R,R*.9,0,0,7); ctx.fill();
    ctx.fillStyle="#5b3527"; ctx.beginPath(); ctx.arc(cx,cy,R,0,7); ctx.fill();
    ctx.strokeStyle="rgba(25,12,8,.55)"; ctx.lineWidth=1; for(let i=1;i<4;i++){ ctx.beginPath(); ctx.arc(cx,cy,R*i/4+R*.1,0,7); ctx.stroke(); }
    ctx.strokeStyle="#c9a24f"; ctx.lineWidth=2.5; ctx.beginPath(); ctx.arc(cx,cy,R,0,7); ctx.stroke();
    const g=ctx.createRadialGradient(cx,cy+R*.1,1,cx,cy,R*.55); g.addColorStop(0,"#fff1b0"); g.addColorStop(.4,"#ffad3d"); g.addColorStop(1,"#a8361c");
    ctx.fillStyle=g; ctx.beginPath(); ctx.arc(cx,cy,R*.52,0,7); ctx.fill();
    for(let i=0;i<4;i++){ ctx.fillStyle=`rgba(120,115,110,${.35-i*.07})`; ctx.beginPath(); ctx.arc(cx+T*(.12+i*.1), Y+T*(.12-i*.06)+4, T*(.09+i*.04), 0, 7); ctx.fill(); }
    lights.push([cx,cy,T*1.5,"#ff8a2a",.32]); });

  // 9. alberi, ordinati dall'alto in basso per la profondità
  const trees=[]; tiles((x,y,k,X,Y,r)=>{ if(k!=="f") return; const n=2+(r()<.6?1:0);
    for(let i=0;i<n;i++) trees.push({x:X+T*(.22+r()*.56), y:Y+T*(.28+r()*.5), s:T*(.2+r()*.09), r:rnd(x*31+y*977+i*13)}); });
  trees.sort((a,b)=>a.y-b.y).forEach(t=>{ const {x:cx,y:cy,s,r}=t;
    ctx.fillStyle="rgba(10,20,8,.38)"; ctx.beginPath(); ctx.ellipse(cx+s*.35,cy+s*.85,s*1.05,s*.55,0,0,7); ctx.fill();
    ctx.fillStyle="#4a3424"; ctx.fillRect(cx-s*.12,cy+s*.2,s*.24,s*.6);
    const parts=[[0,0,1],[-.55,.15,.72],[.55,.12,.72],[-.2,-.45,.7],[.25,-.4,.66]].map(([dx,dy,k])=>[cx+dx*s,cy+dy*s,s*k*(.9+r()*.2)]);
    ctx.fillStyle="#1d2e1a"; parts.forEach(([px,py,pr])=>{ ctx.beginPath(); ctx.arc(px,py,pr+1.6,0,7); ctx.fill(); });
    ctx.fillStyle="#36552f"; parts.forEach(([px,py,pr])=>{ ctx.beginPath(); ctx.arc(px,py,pr,0,7); ctx.fill(); });
    ctx.fillStyle="#4f7a40"; parts.forEach(([px,py,pr])=>{ ctx.beginPath(); ctx.arc(px-pr*.18,py-pr*.2,pr*.72,0,7); ctx.fill(); });
    ctx.fillStyle="#76a356"; parts.forEach(([px,py,pr])=>{ ctx.beginPath(); ctx.arc(px-pr*.35,py-pr*.38,pr*.32,0,7); ctx.fill(); });
    ctx.fillStyle="rgba(200,230,150,.35)"; ctx.beginPath(); ctx.arc(cx-s*.5,cy-s*.7,s*.12,0,7); ctx.fill(); });

  // 9b. nebbia della foresta e raggi di luce
  if(TH.mist){ const rr=rnd(99); for(let i=0;i<COLS*ROWS/6;i++) blob(rr()*MW, rr()*MH, T*(1+rr()*1.5), "#cfe8d0", .07);
    ctx.globalCompositeOperation="lighter"; for(let i=0;i<4;i++){ const bx=rr()*MW; const g=ctx.createLinearGradient(bx,0,bx+MH*.5,MH); g.addColorStop(0,"rgba(255,240,180,.10)"); g.addColorStop(1,"rgba(255,240,180,0)");
      ctx.fillStyle=g; ctx.beginPath(); ctx.moveTo(bx,0); ctx.lineTo(bx+T*1.2,0); ctx.lineTo(bx+T*1.2+MH*.5,MH); ctx.lineTo(bx+MH*.5,MH); ctx.closePath(); ctx.fill(); } ctx.globalCompositeOperation="source-over"; }
  if(TH.night){ ctx.fillStyle=TH.nightColor||"rgba(10,16,44,.55)"; ctx.fillRect(0,0,MW,MH); }
  ctx.globalCompositeOperation="lighter"; lights.forEach(([lx,ly,lr,lc,la])=>blob(lx,ly,lr,lc,TH.night?la*1.6:la)); ctx.globalCompositeOperation="source-over";
  // 10. luce calda da sinistra, ombra fredda a destra, vignettatura
  const lg=ctx.createLinearGradient(0,0,MW,MH); lg.addColorStop(0,"rgba(255,214,150,.12)"); lg.addColorStop(.55,"rgba(0,0,0,0)"); lg.addColorStop(1,"rgba(15,25,55,.25)");
  ctx.fillStyle=lg; ctx.fillRect(0,0,MW,MH);
  const vg=ctx.createRadialGradient(MW/2,MH/2,Math.min(MW,MH)*.35,MW/2,MH/2,Math.max(MW,MH)*.72); vg.addColorStop(0,"rgba(0,0,0,0)"); vg.addColorStop(1,"rgba(0,0,0,.4)");
  ctx.fillStyle=vg; ctx.fillRect(0,0,MW,MH);

  // 11. griglia appena visibile
  ctx.strokeStyle="rgba(0,0,0,.13)"; ctx.lineWidth=1;
  for(let x=0;x<=COLS;x++){ ctx.beginPath(); ctx.moveTo(x*T+.5,0); ctx.lineTo(x*T+.5,MH); ctx.stroke(); }
  for(let y=0;y<=ROWS;y++){ ctx.beginPath(); ctx.moveTo(0,y*T+.5); ctx.lineTo(MW,y*T+.5); ctx.stroke(); }
}
