// Il bot che gioca al posto di una persona: serve a misurare il bilanciamento.
// Gioca peggio di un giocatore attento (non pianifica oltre il turno), quindi i suoi risultati
// vanno letti come confronto tra capitoli e tra versioni, non come difficoltà reale.
import { raggiungibili, inGittata, campoDistanze, chiave } from "../js/motore/movimento.js";
import { previsione, dannoAtteso, dannoPieno } from "../js/motore/combattimento.js";
import { oggetto } from "../js/motore/unita.js";

// Scorre un'azione fino in fondo; se la battaglia ha un "diario" (lista), ci annota i fatti.
let diarioCorrente = null;
const nome = (u) => u ? u.nome : "";
function scorri(gen) {
  for (const f of gen) if (diarioCorrente && f.tipo !== "dialogo" && f.tipo !== "assalto")
    diarioCorrente.push(`${f.tipo} ${nome(f.a || f.u)}>${nome(f.d || f.t)} ${f.danno ?? f.pv ?? f.quanti ?? f.fase ?? ""}`.trim());
}

function corridore(b, u) {
  const g = b.cap.obiettivo;
  return g.tipo === "raggiungi" && u.id === (g.chi || b.capo().id);
}

export function mossaBot(b, u, versoMeta) {
  if (u.pv <= 0 || u.agito || b.finita) return;
  const arma = b.arma(u), tonico = oggetto(u, "tonico"), capo = b.capo();
  const R = raggiungibili(b, u), nemici = b.vivi("nemico");
  if (arma.cura) {
    let m = null;
    for (const t of R) for (const o of b.vivi("alleato")) {
      if (o === u || o.pv >= o.stat.hp || !inGittata(arma, t.x, t.y, o.x, o.y)) continue;
      const voto = (o.stat.hp - o.pv) + (o.capo ? 3 : 0);
      if (!m || voto > m.voto) m = { t, o, voto };
    }
    if (m && m.voto >= 5) { u.x = m.t.x; u.y = m.t.y; scorri(b.cura(u, m.o)); return; }
  }
  if (tonico && u.pv < u.stat.hp * 0.4) { scorri(b.usaOggetto(u, "tonico")); return; }
  const g = b.cap.obiettivo, corre = corridore(b, u) && versoMeta;
  if (corre && R.some((t) => t.x === g.casella[0] && t.y === g.casella[1])) { u.x = g.casella[0]; u.y = g.casella[1]; scorri(b.attendi(u)); return; }
  let m = null;
  if (!arma.cura) for (const t of R) for (const e of nemici) {
    if (!inGittata(arma, t.x, t.y, e.x, e.y)) continue;
    const p = previsione(b, u, e, t.x, t.y);
    const subito = p.contrattacco ? dannoAtteso(p.B) : 0;
    let voto = dannoAtteso(p.A) + (dannoPieno(p.A) >= e.pv ? 30 : 0) - subito * 0.7 + (e.comandante ? 3 : 0);
    if ((u.capo || u.ospite) && subito >= u.pv) voto -= 100;
    if (corre) voto -= (versoMeta.get(chiave(t.x, t.y)) ?? 50) * 1.5;
    if (!m || voto > m.voto) m = { t, e, voto };
  }
  if (m && (m.voto > 0 || !u.capo)) { u.x = m.t.x; u.y = m.t.y; scorri(b.attacca(u, m.e)); return; }
  // muoviti: verso l'obiettivo (chi deve arrivarci) o verso il nemico più vicino; i guaritori restano dietro al capo
  const D = corre ? versoMeta : arma.cura ? campoDistanze(b, u.movimento, [capo]) : campoDistanze(b, u.movimento, nemici.length ? nemici : [capo]);
  let passo = null, minima = 1e9;
  for (const t of R) {
    let d = D.get(chiave(t.x, t.y)) ?? 1e6;
    if (arma.cura && d < 2) d = 2 + (2 - d);
    if (u.capo && !versoMeta) d = Math.max(d, 3);
    if (d < minima) { minima = d; passo = t; }
  }
  if (passo) { u.x = passo.x; u.y = passo.y; }
  scorri(b.attendi(u));
}

// Gioca una battaglia intera. Restituisce { vinta, turni, caduti }.
export function giocaBattaglia(b, maxTurni = 30) {
  diarioCorrente = b.diario || null;
  scorri(b.inizia());
  const g = b.cap.obiettivo;
  const versoMeta = g.tipo === "raggiungi" ? campoDistanze(b, "fanteria", [{ x: g.casella[0], y: g.casella[1] }]) : null;
  while (!b.finita && b.turno <= maxTurni) {
    const ordine = b.vivi("alleato").sort((x, y) => (b.arma(x).cura ? 1 : 0) - (b.arma(y).cura ? 1 : 0) || (x.capo ? 1 : 0) - (y.capo ? 1 : 0));
    for (const u of ordine) { if (b.finita) break; mossaBot(b, u, versoMeta); }
    if (b.finita) break;
    scorri(b.fineFaseGiocatore());
  }
  const caduti = b.unita.filter((u) => u.squadra === "alleato" && u.pv <= 0).map((u) => u.id);
  return { vinta: b.vinta, turni: b.turno, caduti };
}
