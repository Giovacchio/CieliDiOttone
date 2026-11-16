// screenshot di ogni capitolo + controllo che unità e obiettivi stiano su caselle valide
const {chromium}=require('playwright');
(async()=>{const b=await chromium.launch(); const p=await b.newPage({viewport:{width:1300,height:800}}); const errs=[];
 p.on('pageerror',e=>errs.push(e.message));
 await p.goto('file://'+require('path').resolve(__dirname,'..','index.html')); await p.waitForTimeout(500);
 await p.screenshot({path:'title.png'});
 const n=await p.evaluate(()=>CHAPTERS.length);
 for(let i=0;i<n;i++){
   const bad=await p.evaluate((i)=>{ closeOverlay(); setupChapter(i); const out=[];
     for(const u of units){ const c=ter(u.x,u.y).c[u.move]; if(c>=99) out.push(u.name+" su casella impraticabile "+u.x+","+u.y); }
     const seen=new Set(); for(const u of units){ const k=u.x+","+u.y; if(seen.has(k)) out.push("due unità su "+k); seen.add(k); }
     const g=CH.goal; if(g.tile && ter(g.tile[0],g.tile[1]).c.inf>=99) out.push("obiettivo impraticabile");
     for(const ev of CH.events||[]) if(ev.spawn) for(const u of ev.spawn()){ if(!inMap(u.x,u.y)) out.push("rinforzo fuori mappa "+u.x+","+u.y); }
     // raggiungibilità a piedi dall'inizio all'obiettivo / ai nemici
     const giova=units.find(u=>u.leader); const D=distField(giova,[giova]);
     if(g.tile && !D.has(g.tile.join(","))) out.push("obiettivo non raggiungibile");
     for(const e of units.filter(u=>u.team==="enemy")) if(!D.has(e.x+","+e.y)) out.push("nemico irraggiungibile: "+e.name+" "+e.x+","+e.y);
     return CH.id+": "+(out.join("; ")||"ok"); }, i);
   console.log(bad); await p.waitForTimeout(200); await p.screenshot({path:`ch${i}.png`});
 }
 console.log(errs.join("\n")||"nessun errore JS"); await b.close();})();
