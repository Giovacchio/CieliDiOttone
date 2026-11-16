// Prova che il motore nuovo applica le stesse regole del prototipo.
// Fa giocare la stessa campagna, con lo stesso bot e gli stessi tiri di dado, al prototipo
// (prototipo/index.html, in un browser senza finestra) e al motore nuovo, poi confronta ogni battaglia:
// esito, turni, chi si è ritirato e i PV finali di ogni unità. Richiede Playwright.
// Uso: node strumenti/confronta_prototipo.js [campagne=6]
import { createRequire } from "node:module";
import path from "node:path";
import { datiDaDisco, RADICE } from "./dati_node.js";
import { simulaCampagna } from "./simula_campagna.js";
import { creaDado } from "../js/motore/dado.js";

const require = createRequire(import.meta.url);
let chromium;
try { ({ chromium } = require("playwright")); } catch { ({ chromium } = require((process.env.NODE_PATH || "/usr/local/lib/node_modules").split(":")[0] + "/playwright")); }
const N = +process.argv[2] || 6;

const browser = await chromium.launch(), pagina = await browser.newPage();
await pagina.route("**/*", (r) => r.request().url().startsWith("file:") ? r.continue() : r.abort());
await pagina.goto("file://" + path.join(RADICE, "prototipo/index.html"));
await pagina.waitForTimeout(300);
const vecchio = await pagina.evaluate(async (N) => {
  /* eslint-disable */
  const dado = (seme) => { let s = seme >>> 0; return () => { s = (s + 0x6D2B79F5) >>> 0; let t = s; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; };
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
    if(best && (best.sc>0 || !u.leader)){ u.x=best.t.x; u.y=best.t.y; await fight(u,best.e); if(!ended && !u.acted) finishAct(u); return; }
    let D; if(isRunner(u) && GD) D=GD; else if(W(u).staff){ const g=units.find(x=>x.leader); D=distField(u,[g]); } else D=distField(u, foes.length?foes:[units.find(x=>x.leader)]);
    let step=null, sd=1e9; for(const t of R){ let d=D.get(t.x+","+t.y)??1e6; if(W(u).staff && d<2) d=2+ (2-d); if(u.leader && !GD) d = Math.max(d, 3); if(d<sd){sd=d;step=t;} }
    if(step){ u.x=step.x; u.y=step.y; } finishAct(u);
  }
  async function play(i){
    await playChapter(i); const GD=goalDist();
    while(!ended && turn<=30){
      const order = alive("ally").sort((a,b)=>(W(a).staff?1:0)-(W(b).staff?1:0) || (a.leader?1:0)-(b.leader?1:0));
      for(const u of order){ if(ended) break; await botAct(u,GD); await wait(); }
      if(ended) break;
      const t0=turn; if(phase==="player" && !busy) await endPlayerPhase();
      let guard=0; while(!ended && (phase!=="player" || busy || turn===t0) && guard++<5000) await wait();
      for(let k=0;k<6;k++) await wait(); // lascia finire eventi e cure di inizio turno prima di muovere
    }
    for(let k=0;k<50 && !won && ended;k++) await wait();
    await new Promise(r=>setTimeout(r,30));
    return {id:CHAPTERS[i].id, vinta:won, turni:turn, caduti:units.filter(u=>u.team==="ally"&&u.hp<=0).map(u=>u.id).sort().join(","), pv:units.map(u=>u.hp).join(","), diario:$("#log").innerText.split("\n").slice(0,14).reverse()};
  }
  const tutte=[];
  for(let c=0;c<N;c++){
    Math.random=dado(1000+c); const registro=[]; tutte.push(registro);
    party=freshParty(); flags={route:"corona"}; supports={};
    for(let i=0;i<CHAPTERS.length;i++){
      let ok=false;
      for(let a=0;a<4 && !ok;a++){ const start=clone(party), supStart=clone(supports);
        const r=await play(i); registro.push(r);
        for(const [a,b] of SUP_PAIRS){ const S=supGet(a,b), nx=supNext(S); if(nx && S.pts>=SUP_NEED[nx]) S.lvl=nx; }
        if(r.vinta) ok=true; else { party=start; supports=supStart; } }
      if(!ok) break;
    }
  }
  return tutte;
}, N);
await browser.close();

const dati = await datiDaDisco();
let diversi = 0, battaglie = 0;
for (let c = 0; c < N; c++) {
  const nuovo = [];
  simulaCampagna(dati, { dado: creaDado(1000 + c), rotta: "corona", ia: "classica", tutteLeRotte: true, registra: (r) => nuovo.push(r) });
  const v = vecchio[c];
  for (let i = 0; i < Math.max(v.length, nuovo.length); i++) {
    battaglie++;
    const dv = v[i]?.diario, dn = nuovo[i]?.diario;
    if (v[i]) delete v[i].diario; if (nuovo[i]) delete nuovo[i].diario;
    if (JSON.stringify(v[i]) !== JSON.stringify(nuovo[i])) {
      if (process.env.DIARIO) console.log("  --- fine del registro del prototipo\n  " + (dv || []).join("\n  ") + "\n  --- fine dei fatti del motore nuovo\n  " + (dn || []).slice(-22).join("\n  "));
      diversi++;
      console.log(`campagna ${c}, battaglia ${i}:\n  prototipo ${JSON.stringify(v[i])}\n  nuovo     ${JSON.stringify(nuovo[i])}`);
      break; // dopo la prima differenza il resto della campagna diverge per forza
    }
  }
}
console.log(diversi ? `DIVERSO: ${diversi} campagne su ${N} si separano dal prototipo.` : `IDENTICO: ${battaglie} battaglie in ${N} campagne, stesso esito, stessi turni, stessi PV finali.`);
process.exit(diversi ? 1 : 0);
