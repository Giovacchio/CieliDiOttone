// IA dei nemici. "classica" è quella del prototipo, riportata identica: serve da riferimento
// per il bilanciamento. La "tattica" arriva con la Tappa 2 e si sceglie in dati/regole.json ("ia").
import { raggiungibili, inGittata, campoDistanze, chiave } from "./movimento.js";
import { previsione, dannoAtteso, dannoPieno, potenzaCura } from "./combattimento.js";

const TIPI = { classica: agisciClassica };
export function registraIA(nome, fn) { TIPI[nome] = fn; }

export function* agisciNemico(b, e) {
  if (e.pv <= 0) return;
  yield* (TIPI[b.tipoIA] || agisciClassica)(b, e);
}

// Comportamento effettivo: "attacca" (avanza), "portata" (aspetta che qualcuno entri nel suo raggio), "fermo".
export const comportamento = (b, e) => (e.sveglia && b.turno >= e.sveglia) ? "attacca" : e.ia;

export function* agisciClassica(b, e) {
  const bersagli = b.vivi("alleato");
  if (!bersagli.length) return;
  const ia = comportamento(b, e), arma = b.arma(e);
  const dove = ia === "fermo" ? [{ x: e.x, y: e.y }] : raggiungibili(b, e);

  if (arma.cura) { // guaritore: cura il compagno più ferito che riesce a raggiungere
    let m = null;
    for (const t of dove) for (const o of b.vivi("nemico")) {
      if (o === e || o.pv >= o.stat.hp || Math.abs(t.x - o.x) + Math.abs(t.y - o.y) !== 1) continue;
      const manca = o.stat.hp - o.pv;
      if (!m || manca > m.manca) m = { t, o, manca };
    }
    if (m) {
      yield* sposta(b, e, m.t);
      const pv = Math.min(potenzaCura(b, e), m.manca); m.o.pv += pv;
      yield { tipo: "cura", u: e, t: m.o, pv };
    }
    return;
  }

  let m = null;
  for (const t of dove) for (const f of bersagli) {
    if (!inGittata(arma, t.x, t.y, f.x, f.y)) continue;
    const p = previsione(b, e, f, t.x, t.y);
    const uccide = dannoPieno(p.A) >= f.pv ? 40 : 0;
    const subito = p.contrattacco ? dannoAtteso(p.B) : 0;
    const voto = dannoAtteso(p.A) + uccide - subito * 0.6 + b.terreno(t.x, t.y).schivata * 0.05 + (f.capo ? 3 : 0) + (b.arma(f).cura ? 2 : 0);
    if (!m || voto > m.voto) m = { voto, t, f };
  }
  if (!m) {
    if (ia !== "attacca") return;
    // si avvicina al bersaglio più vicino (distanza a piedi, non in linea d'aria)
    const D = campoDistanze(b, e.movimento, bersagli);
    let passo = null, minima = 1e9;
    for (const t of dove) { const d = D.get(chiave(t.x, t.y)) ?? 1e6; if (d < minima) { minima = d; passo = t; } }
    if (passo) yield* sposta(b, e, passo);
    return;
  }
  yield { tipo: "scelta", u: e };
  yield* sposta(b, e, m.t);
  yield* b._scontro(e, m.f);
  yield* b._controllaFine();
}

export function* sposta(b, u, t) {
  if (t.x === u.x && t.y === u.y) return;
  const da = { x: u.x, y: u.y };
  u.x = t.x; u.y = t.y;
  yield { tipo: "muovi", u, da };
}
