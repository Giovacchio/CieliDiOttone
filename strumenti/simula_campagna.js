const {chromium}=require('playwright');
const CAMPAIGNS=+process.argv[2]||6, FROM=+process.argv[3]||0;
(async()=>{const b=await chromium.launch(); const p=await b.newPage(); const errs=[];
 p.on('pageerror',e=>errs.push(e.message));
 await p.route('**/*', r => r.request().url().startsWith('file:') ? r.continue() : r.abort());
 await p.goto('file://'+require('path').resolve(__dirname,'..','index.html')); await p.waitForTimeout(300);
 const res = await p.evaluate(async ([CAMPAIGNS,FROM])=>{
  SPEED=0; window.story=(l,d)=>{ d&&d(); };
  window.levelUp=u=>{ u.lv++; let any=false; for(const k of STAT_KEYS){ if(Math.random()*100<(u.gr?.[k]||0)){ u.st[k]++; any=true; if(k==="hp") u.hp++; } } if(!any){u.st.hp++;u.hp++;} return Promise.resolve(); };
  const wait=()=>new Promise(r=>setTimeout(r,0));
  const goalDist=()=>{ const g=CH.goal; if(g.type!=="reach") return null; return distField({move:"inf"},[{x:g.tile[0],y:g.tile[1]}]); };
  const isRunner=u=>CH.goal.type==="reach" && u.id===(CH.goal.who||units.find(x=>x.leader).id);
  async function botAct(u, GD){
    if(u.hp<=0||u.acted||ended) return;
    const tonic=u.items.find(i=>i.n==="Tonico"&&i.q>0);
    const R=reachable(u); const foes=alive("enemy");
    if(W(u).staff){ let best=null;
      for(const t of R){ for(const o of alive("ally")){ if(o===u||o.hp>=o.st.hp) continue; const d=Math.abs(t.x-o.x)+Math.abs(t.y-o.y); if(d<W(u).r[0]||d>W(u).r[1]) continue;
        const sc=(o.st.hp-o.hp)+(o.leader?3:0); if(!best||sc>best.sc) best={t,o,sc}; } }
      if(best && best.sc>=5){ u.x=best.t.x; u.y=best.t.y; await doHeal(u,best.o); return; }
    }
    if(tonic && u.hp < u.st.hp*0.4){ tonic.q--; u.hp=Math.min(u.st.hp,u.hp+10); finishAct(u); return; }
    if(isRunner(u) && GD){ const g=CH.goal; if(R.some(t=>t.x===g.tile[0]&&t.y===g.tile[1])){ u.x=g.tile[0]; u.y=g.tile[1]; finishAct(u); return; } }
    let best=null;
    if(!W(u).staff) for(const t of R) for(const e of foes){ if(!inRange(u,t.x,t.y,e.x,e.y)) continue;
      const ox=u.x,oy=u.y; u.x=t.x;u.y=t.y; const fc=forecast(u,e); u.x=ox;u.y=oy;
      const exp=fc.A.hit/100*fc.A.dmg*(fc.A.dbl?2:1), kill=fc.A.dmg*(fc.A.dbl?2:1)>=e.hp?30:0, back=fc.counter?fc.B.hit/100*fc.B.dmg*(fc.B.dbl?2:1):0;
      let sc=exp+kill-back*0.7 + (e.boss?3:0);
      if(u.leader||u.guest){ if(back>=u.hp) sc-=100; } if(isRunner(u) && GD) sc -= (GD.get(t.x+","+t.y)??50)*1.5;
      if(!best||sc>best.sc) best={t,e,sc}; }
    if(best && (best.sc>0 || !u.leader)){ u.x=best.t.x; u.y=best.t.y; await fight(u,best.e); if(!ended && !u.acted && u.hp>0) finishAct(u); return; }
    // muoviti: verso l'obiettivo (Giova) o verso il nemico più vicino; i guaritori restano dietro a Giova
    let D; if(isRunner(u) && GD) D=GD; else if(W(u).staff){ const g=units.find(x=>x.leader); D=distField(u,[g]); } else D=distField(u, foes.length?foes:[units.find(x=>x.leader)]);
    let step=null, sd=1e9; for(const t of R){ let d=D.get(t.x+","+t.y)??1e6; if(W(u).staff && d<2) d=2+ (2-d); if(u.leader && !GD) d = Math.max(d, 3); if(d<sd){sd=d;step=t;} }
    if(step){ u.x=step.x; u.y=step.y; } finishAct(u);
  }
  async function play(i){
    await playChapter(i); const GD=goalDist(); const fallen=new Set();
    while(!ended && turn<=30){
      const order = alive("ally").sort((a,b)=>(W(a).staff?1:0)-(W(b).staff?1:0) || (a.leader?1:0)-(b.leader?1:0));
      for(const u of order){ if(ended) break; await botAct(u,GD); await wait(); }
      if(ended) break;
      const t0=turn; if(phase==="player" && !busy) await endPlayerPhase();
      let guard=0; while(!ended && (phase!=="player" || busy || turn===t0) && guard++<5000) await wait();
      for(const u of units) if(u.team==="ally" && u.hp<=0) fallen.add(u.id);
    }
    for(let k=0;k<50 && !won && ended;k++) await wait();
    await new Promise(r=>setTimeout(r,30));
    return {win:won, turns:turn, fallen:[...fallen], lv: PARTY_ORDER.map(id=>party[id].lv).join("/")};
  }
  const stats={};
  for(let c=0;c<CAMPAIGNS;c++){
    party=freshParty(); flags={route:"corona"}; supports={};
    for(let i=0;i<CHAPTERS.length;i++){
      const s=stats[CHAPTERS[i].id] ||= {first:0, n:0, tries:0, turns:0, fallen:{}, lv:[]};
      s.n++; let ok=false;
      for(let a=0;a<4 && !ok;a++){ const start=clone(party), supStart=clone(supports); const lvStart=PARTY_ORDER.map(id=>party[id].lv).join("/");
        const r=await play(i); s.tries++; r.fallen.forEach(f=>s.fallen[f]=(s.fallen[f]||0)+1);
        for(const [a,b] of SUP_PAIRS){ const S=supGet(a,b), nx=supNext(S); if(nx && S.pts>=SUP_NEED[nx]){ S.lvl=nx; (window.__sup ||= []).push(CHAPTERS[i].id+':'+a+'-'+b+':'+nx); } }
        if(r.win){ ok=true; if(a===0) s.first++; s.turns+=r.turns; s.lv.push(lvStart); } else { party=start; supports=supStart; } }
      if(!ok) break;
    }
  }
  stats.__sup = window.__sup||[]; return stats;
 },[CAMPAIGNS,FROM]);
 const sup=res.__sup; delete res.__sup; console.log('supporti letti:', sup.length, sup.slice(0,40).join(' ')); for(const [id,s] of Object.entries(res)) console.log(id.padEnd(8), `vinto al 1° tentativo ${s.first}/${s.n}`, `tentativi ${s.tries}`, `turni medi ${(s.turns/Math.max(1,s.n)).toFixed(1)}`, `livelli all'inizio ${s.lv.slice(0,3).join(" ")}`, `ritirati`, JSON.stringify(s.fallen));
 console.log(errs.slice(0,5).join("\n")||"nessun errore JS"); await b.close();})();
