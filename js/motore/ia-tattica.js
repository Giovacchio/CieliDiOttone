// IA "tattica": ragiona come un avversario prudente.
//  - sceglie il bersaglio migliore: finisce chi è ferito, dà la caccia ai guaritori e al capo;
//  - pesa il contrattacco e non si butta su un colpo che la ucciderebbe;
//  - conosce le caselle che i personaggi del giocatore possono colpire al prossimo turno e le evita quando può;
//  - chi è ridotto male si ritira verso un guaritore o un terreno che cura (se esistono);
//  - non corre avanti da sola: aspetta al limite della zona pericolosa i compagni che stanno arrivando;
//  - i guaritori seguono il gruppo, curano da dove rischiano meno e scelgono chi ne ha più bisogno.
import { raggiungibili, inGittata, campoDistanze, caselleColpibili, chiave } from "./movimento.js";
import { previsione, calcola, dannoAtteso, dannoPieno, potenzaCura } from "./combattimento.js";
import { comportamento, sposta, registraIA } from "./ia.js";

const P = { // pesi: si possono ritoccare da dati/regole.json → "iaTattica"
  contrattacco: 0.6, pericoloAttacco: 0.2, uccide: 15, uccideProbabile: 25, capo: 4, guaritore: 6, ferito: 4,
  suicidio: 15, sogliaRitirata: 0.35, pericoloAvanzata: 0.1, pericoloDaSolo: 0.6, attesaMassima: 2, raggioGruppo: 3, curaMinima: 3,
};
const pesi = (b) => ({ ...P, ...(b.dati.regole.iaTattica || {}) });
const dist = (a, b) => Math.abs(a.x - b.x) + Math.abs(a.y - b.y);

// Per ogni personaggio del giocatore: le caselle che può colpire al prossimo turno (si ricalcola solo se cambia qualcosa).
function minacce(b) {
  const firma = b.turno + "|" + b.vivi("alleato").map((u) => `${u.id}:${u.x},${u.y}:${u.arma}`).join("|");
  if (b._minacce && b._minacce.firma === firma) return b._minacce.lista;
  const lista = [];
  for (const u of b.vivi("alleato")) {
    const armi = u.armi.map((id) => b.dati.armi[id]).filter((a) => a && a.cura == null);
    if (!armi.length) continue;
    const mosse = raggiungibili(b, u), caselle = new Set();
    for (const a of armi) for (const k of caselleColpibili(b, mosse, a.gittata)) caselle.add(k);
    lista.push({ u, caselle, arma: b.arma(u).cura == null ? b.arma(u) : armi[0] });
  }
  b._minacce = { firma, lista };
  return lista;
}
// Danno che "e" può aspettarsi stando su una casella (somma di chi può arrivarci).
function pericoli(b, e) {
  const quanto = minacce(b).map((m) => ({ caselle: m.caselle, danno: dannoAtteso(calcola(b, m.u, e, m.u.x, m.u.y, m.arma)) }));
  return (t) => { const k = chiave(t.x, t.y); let d = 0; for (const q of quanto) if (q.caselle.has(k)) d += q.danno; return d; };
}

function* guaritore(b, e, ia, dove, pericolo, W) {
  const arma = b.arma(e), cura = potenzaCura(b, e), compagni = b.vivi("nemico").filter((o) => o !== e);
  let m = null;
  for (const t of dove) for (const o of compagni) {
    if (o.pv >= o.stat.hp || !inGittata(arma, t.x, t.y, o.x, o.y)) continue;
    const pv = Math.min(cura, o.stat.hp - o.pv);
    const voto = pv + (o.comandante ? 4 : 0) + (o.pv < o.stat.hp * 0.5 ? 3 : 0) - pericolo(t) * 0.3;
    if (pv >= W.curaMinima && (!m || voto > m.voto)) m = { t, o, pv, voto };
  }
  if (m) {
    yield* sposta(b, e, m.t);
    m.o.pv += m.pv;
    yield { tipo: "cura", u: e, t: m.o, pv: m.pv };
    return;
  }
  if (ia !== "attacca" || !compagni.length) return;
  // nessuno da curare: resta a due passi dal compagno più ferito (o dal più vicino), fuori tiro se può
  const guida = compagni.filter((o) => b.arma(o).cura == null).sort((x, y) => (x.pv / x.stat.hp) - (y.pv / y.stat.hp) || dist(x, e) - dist(y, e))[0];
  if (!guida) return;
  let passo = null, migliore = -1e9;
  for (const t of dove) {
    const voto = -Math.abs(dist(t, guida) - 2) - pericolo(t) * 1.5 + b.terreno(t.x, t.y).schivata * 0.02;
    if (voto > migliore) { migliore = voto; passo = t; }
  }
  if (passo) yield* sposta(b, e, passo);
}

export function* agisciTattica(b, e) {
  const bersagli = b.vivi("alleato");
  if (!bersagli.length) return;
  const W = pesi(b), ia = comportamento(b, e), arma = b.arma(e);
  const dove = ia === "fermo" ? [{ x: e.x, y: e.y }] : raggiungibili(b, e);
  const pericolo = pericoli(b, e);
  if (arma.cura != null) { yield* guaritore(b, e, ia, dove, pericolo, W); return; }

  // chi è ridotto male cerca riparo, ma solo se un riparo esiste: un guaritore vivo o un terreno che cura a portata
  const compagni = b.vivi("nemico").filter((o) => o !== e);
  let rifugio = null;
  if (ia !== "fermo" && !e.comandante && e.pv <= e.stat.hp * W.sogliaRitirata) {
    const medici = compagni.filter((o) => b.arma(o).cura != null);
    const curative = dove.filter((t) => b.terreno(t.x, t.y).cura);
    if (medici.length) rifugio = medici; else if (curative.length) rifugio = curative;
  }

  let m = null;
  for (const t of dove) for (const f of bersagli) {
    if (!inGittata(arma, t.x, t.y, f.x, f.y)) continue;
    const p = previsione(b, e, f, t.x, t.y), atteso = dannoAtteso(p.A), pieno = dannoPieno(p.A);
    if (pieno <= 0) continue;                                   // non può fargli niente: inutile esporsi
    const uccide = pieno >= f.pv, subito = p.contrattacco ? dannoAtteso(p.B) : 0, rischio = pericolo(t);
    if (rifugio && !uccide && (subito > 0 || rischio > 0)) continue; // ferito: colpisce solo se uccide o se non rischia nulla
    const terreno = b.terreno(t.x, t.y);
    let voto = atteso + (uccide ? W.uccide + W.uccideProbabile * p.A.precisione / 100 : 0) - subito * W.contrattacco
      + terreno.schivata * 0.05 + terreno.difesa * 0.3 + (f.capo ? W.capo : 0) + (b.arma(f).cura != null ? W.guaritore : 0)
      + W.ferito * (1 - Math.max(0, f.pv - atteso) / f.stat.hp) - rischio * W.pericoloAttacco;
    if (!uccide && p.contrattacco && dannoPieno(p.B) >= e.pv) voto -= W.suicidio;
    if (!m || voto > m.voto) m = { voto, t, f };
  }
  if (m) {
    yield { tipo: "scelta", u: e };
    yield* sposta(b, e, m.t);
    yield* b._scontro(e, m.f);
    yield* b._controllaFine();
    return;
  }

  if (rifugio) { // ritirata: verso il riparo, passando dove si rischia meno
    let passo = null, migliore = 1e9;
    for (const t of dove) {
      const voto = Math.min(...rifugio.map((r) => Math.max(1, dist(t, r)))) + pericolo(t) * 0.5;
      if (voto < migliore) { migliore = voto; passo = t; }
    }
    if (passo) { yield { tipo: "ritirata", u: e }; yield* sposta(b, e, passo); }
    return;
  }
  if (ia !== "attacca") return;

  // avanzata: verso il bersaglio più vicino a piedi, preferendo terreno buono e caselle meno esposte
  const D = campoDistanze(b, e.movimento, bersagli), d = (t) => D.get(chiave(t.x, t.y)) ?? 1e6;
  const sicure = dove.filter((t) => pericolo(t) === 0);
  // da sola in prima linea? se c'è un compagno che sta arrivando, lo aspetta al limite della zona pericolosa (per poco)
  const inArrivo = compagni.some((o) => b.arma(o).cura == null && comportamento(b, o) === "attacca" && d(o) < 1e6 && d(o) > d(e) + 2);
  const vicini = (t) => compagni.filter((o) => b.arma(o).cura == null && dist(o, t) <= W.raggioGruppo).length;
  const pazienza = sicure.length > 0 && (e._attese || 0) < W.attesaMassima;
  const aspetta = inArrivo && pazienza;
  let passo = null, migliore = -1e9, haAspettato = false;
  for (const t of dove) {
    const rischio = pericolo(t), terreno = b.terreno(t.x, t.y), solo = rischio > 0 && vicini(t) === 0;
    if (aspetta && solo) continue;
    if (pazienza && rischio >= e.pv && !e.comandante) continue;             // non si ferma dove può morire, finché ha pazienza
    const voto = -d(t) * 2 + terreno.schivata * 0.03 + terreno.difesa * 0.4 - rischio * (solo && pazienza ? W.pericoloDaSolo : W.pericoloAvanzata);
    if (voto > migliore) { migliore = voto; passo = t; }
  }
  if (pazienza && passo && pericolo(passo) === 0 && dove.some((t) => pericolo(t) > 0 && d(t) < d(passo))) haAspettato = true;
  e._attese = haAspettato ? (e._attese || 0) + 1 : 0;
  if (passo) yield* sposta(b, e, passo);
}

registraIA("tattica", agisciTattica);
