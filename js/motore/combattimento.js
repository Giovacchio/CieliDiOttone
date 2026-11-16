// Formule del combattimento. Tutto ciò che decide uno scontro passa da qui,
// così la previsione mostrata al giocatore e il risultato usano gli stessi numeri.
import { effetti } from "./unita.js";
import { inGittata } from "./movimento.js";
import { bonusSupporto } from "./supporti.js";

// Vantaggio del triangolo: +1 se l'arma di chi attacca batte quella di chi difende, -1 al contrario.
export function triangolo(regole, armaA, armaD) {
  if (!armaA || !armaD) return 0;
  if (regole.triangoli[armaA.tipo] === armaD.tipo) return 1;
  if (regole.triangoli[armaD.tipo] === armaA.tipo) return -1;
  return 0;
}

const armaSoddisfa = (arma, se) => !se || Object.entries(se).every(([k, v]) => arma[k] === v);

// Bonus "personali" delle abilità (tipo "bonus"), eventualmente legati all'arma usata.
function bonusPersonali(u, arma) {
  const t = { precisione: 0, schivata: 0, critico: 0, danno: 0 };
  for (const e of effetti(u)) if (e.tipo === "bonus" && armaSoddisfa(arma, e.seArma))
    for (const k of Object.keys(t)) t[k] += e[k] || 0;
  return t;
}

// Aure: bonus dati dai compagni di squadra vivi entro il raggio (chi ha l'aura la riceve anche lui).
function aure(b, u, x, y) {
  const t = { precisione: 0, schivata: 0, critico: 0 };
  for (const o of b.unita) {
    if (o.pv <= 0 || o.squadra !== u.squadra) continue;
    for (const e of effetti(o)) {
      if (e.tipo !== "aura") continue;
      const ox = o === u ? x : o.x, oy = o === u ? y : o.y;
      if (Math.abs(ox - x) + Math.abs(oy - y) <= e.raggio) for (const k of Object.keys(t)) t[k] += e[k] || 0;
    }
  }
  return t;
}

// Numeri di un attacco di "a" contro "d", con "a" sulla casella (ax, ay).
export function calcola(b, a, d, ax = a.x, ay = a.y, arma = b.arma(a)) {
  const R = b.dati.regole, armaD = b.arma(d), tD = b.terreno(d.x, d.y), t = triangolo(R, arma, armaD);
  const pa = bonusPersonali(a, arma), pd = bonusPersonali(d, armaD);
  const efficace = arma.efficace && arma.efficace === d.movimento;
  const potenza = efficace ? arma.potenza * R.moltiplicatoreEfficace : arma.potenza;
  const attacco = (arma.magica ? a.stat.mag : a.stat.for) + potenza + t * R.triangolo.danno + pa.danno;
  const difesa = (arma.magica ? d.stat.res : d.stat.def) + tD.difesa;
  const aa = aure(b, a, ax, ay), ad = aure(b, d, d.x, d.y);
  const sa = bonusSupporto(b, a, ax, ay), sd = bonusSupporto(b, d, d.x, d.y);
  const precisione = arma.precisione + a.stat.abi * 2 + Math.floor(a.stat.fort / 2) + t * R.triangolo.precisione + aa.precisione + sa.precisione + pa.precisione;
  const schivata = d.stat.vel * 2 + d.stat.fort + tD.schivata + pd.schivata + sd.schivata + ad.schivata;
  const critico = Math.max(0, (arma.critico || 0) + Math.floor(a.stat.abi / 2) - d.stat.fort + sa.critico + aa.critico + pa.critico);
  return {
    danno: Math.max(0, attacco - difesa),
    precisione: Math.max(0, Math.min(100, precisione - schivata)),
    critico: Math.min(100, critico),
    doppio: a.stat.vel - d.stat.vel >= R.doppioAttacco,
    triangolo: t, efficace: !!efficace,
  };
}

// Chi difende risponde solo se ha un'arma vera e l'attaccante è nella sua gittata.
export function puoContrattaccare(b, dif, ax, ay) {
  const arma = b.arma(dif);
  if (!arma || arma.cura) return false;
  return inGittata(arma, dif.x, dif.y, ax, ay);
}

// Previsione completa: A = chi attacca, B = il contrattacco (null se non c'è).
export function previsione(b, a, d, ax = a.x, ay = a.y) {
  const vx = a.x, vy = a.y;
  a.x = ax; a.y = ay; // l'attaccante "prova" la casella: così anche il contrattacco vede la posizione giusta
  const A = calcola(b, a, d);
  const contrattacco = puoContrattaccare(b, d, ax, ay);
  const B = contrattacco ? calcola(b, d, a) : null;
  a.x = vx; a.y = vy;
  return { A, B, contrattacco };
}

// Danno medio atteso di un attacco (precisione × danno × colpi): usato dall'IA e dal bot.
export const dannoAtteso = (st) => st ? (st.precisione / 100) * st.danno * (st.doppio ? 2 : 1) : 0;
export const dannoPieno = (st) => st ? st.danno * (st.doppio ? 2 : 1) : 0;

// Quanto cura un'arma da cura in mano a "u".
export const potenzaCura = (b, u, arma = b.arma(u)) => arma.cura + u.stat.mag;
