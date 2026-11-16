// Fa giocare tutta la campagna a un bot e stampa, per capitolo, vittorie, turni e livelli.
// Uso: node strumenti/simula_campagna.js [campagne=20] [rotta=corona] [ia o -] [senza-promozioni]
import { datiDaDisco } from "./dati_node.js";
import { giocaBattaglia } from "./bot.js";
import { Battaglia } from "../js/motore/battaglia.js";
import { creaDado } from "../js/motore/dado.js";
import { nuovaPartita, concludiCapitolo, leggiSupporto, sulPercorso, puoPromuovere, promuovi } from "../js/motore/campagna.js";
import { clona } from "../js/motore/unita.js";

// Una campagna intera. "registra" riceve ogni tentativo: serve al confronto con il prototipo.
// "promuove": il bot usa i Sigilli appena può (prima strada), come farebbe un giocatore.
export function simulaCampagna(dati, { dado, rotta = "corona", ia, tutteLeRotte = false, tentativi = 4, registra = null, promuove = false } = {}) {
  const partita = nuovaPartita(dati);
  partita.bandiere.rotta = rotta;
  const esito = [];
  for (const id of dati.campagna.capitoli) {
    const cap = dati.capitoli[id];
    if (!tutteLeRotte && !sulPercorso(partita, cap)) continue;
    const r = { id, primo: false, tentativi: 0, turni: 0, caduti: [], livelli: dati.personaggi.ordine.filter((p) => partita.compagnia[p]).map((p) => partita.compagnia[p].lv).join("/"), vinto: false };
    for (let t = 0; t < tentativi && !r.vinto; t++) {
      const b = new Battaglia({ dati, capitolo: cap, compagnia: partita.compagnia, supporti: partita.supporti, bandiere: partita.bandiere, dado, ia });
      if (registra) b.diario = [];
      const g = giocaBattaglia(b);
      r.tentativi++; r.caduti.push(...g.caduti);
      if (registra) registra({ id, vinta: g.vinta, turni: g.turni, caduti: g.caduti.sort().join(","), pv: b.unita.map((u) => u.pv).join(","), diario: b.diario });
      if (g.vinta) {
        const prossimo = partita.prossimo;
        concludiCapitolo(dati, partita, b);
        if (tutteLeRotte) partita.prossimo = prossimo;
        for (const [x, y] of dati.coppie) if (partita.compagnia[x] && partita.compagnia[y]) leggiSupporto(dati, partita, x, y);
        if (promuove) for (const id of dati.personaggi.ordine) if (partita.compagnia[id] && puoPromuovere(dati, partita, id)) promuovi(dati, partita, id, 0);
        r.vinto = true; r.primo = t === 0; r.turni = g.turni;
      }
    }
    esito.push(r);
    if (!r.vinto) break;
  }
  return { esito, partita };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const N = +process.argv[2] || 20, rotta = process.argv[3] || "corona", ia = process.argv[4] && process.argv[4] !== "-" ? process.argv[4] : undefined, promuove = process.argv[5] !== "senza-promozioni";
  const dati = await datiDaDisco();
  const S = {};
  let finite = 0;
  for (let c = 0; c < N; c++) {
    const { esito } = simulaCampagna(dati, { dado: creaDado(1000 + c), rotta, ia, promuove });
    if (esito.at(-1).vinto) finite++;
    for (const r of esito) {
      const s = S[r.id] ||= { n: 0, primo: 0, tentativi: 0, turni: 0, vinti: 0, caduti: {}, livelli: [] };
      s.n++; s.tentativi += r.tentativi; if (r.primo) s.primo++;
      if (r.vinto) { s.vinti++; s.turni += r.turni; }
      for (const f of r.caduti) s.caduti[f] = (s.caduti[f] || 0) + 1;
      if (s.livelli.length < 3) s.livelli.push(r.livelli);
    }
  }
  console.log(`Rotta ${rotta}, IA ${ia || dati.regole.ia || "classica"}, ${N} campagne (${finite} arrivate in fondo)`);
  console.log("capitolo  vinto al 1°  tentativi  turni  livelli all'inizio            ritirati");
  for (const [id, s] of Object.entries(S))
    console.log(id.padEnd(9), `${s.primo}/${s.n}`.padEnd(12), (s.tentativi / s.n).toFixed(2).padEnd(10), (s.turni / Math.max(1, s.vinti)).toFixed(1).padEnd(6),
      s.livelli.join(" ").padEnd(29), Object.entries(s.caduti).map(([k, v]) => `${k} ${v}`).join(", "));
}
