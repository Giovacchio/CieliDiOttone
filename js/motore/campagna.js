// La partita tra un capitolo e l'altro: Compagnia, progressione, ricompense, promozioni.
// "partita" è l'oggetto che viene salvato.
import { clona } from "./unita.js";
import { chiaveCoppia, statoCoppia, prossimoLivello } from "./supporti.js";
import { MAX_ARMI } from "./inventario.js";

export const VERSIONE = 2;

const schedaIniziale = (b) => ({ lv: b.lv || 1, pe: 0, stat: clona(b.stat), oggetti: clona(b.oggetti || []), armi: [b.arma, ...(b.armi || [])], arma: b.arma, promo: null });

// Fa entrare nella Compagnia i personaggi che si uniscono entro il capitolo indicato.
// Un personaggio senza "entra" c'è dall'inizio; con "entra": "c5" arriva quando si sta per giocare il capitolo c5.
// "entra" può essere una lista (un capitolo per rotta): vale il primo che sta sul percorso della partita.
export function aggiornaCompagnia(dati, partita, idCapitolo) {
  const lista = dati.campagna.capitoli, qui = idCapitolo ? lista.indexOf(idCapitolo) : lista.length;
  for (const id of dati.personaggi.ordine) {
    const b = dati.personaggi[id];
    if (partita.compagnia[id] || !b) continue;
    const ingressi = [].concat(b.entra || []);
    const arriva = !ingressi.length || ingressi.some((c) => dati.capitoli[c] && sulPercorso(partita, dati.capitoli[c]) && lista.indexOf(c) <= qui);
    if (arriva) partita.compagnia[id] = schedaIniziale(b);
  }
  return partita;
}
export function nuovaPartita(dati) {
  const p = { v: VERSIONE, prossimo: dati.campagna.capitoli[0], completati: [], compagnia: {},
    bandiere: {}, supporti: {}, oro: 0, deposito: { armi: [], oggetti: [] }, schieramenti: {}, sospesa: null };
  return aggiornaCompagnia(dati, p, p.prossimo);
}

// Un capitolo è "sul percorso" se non appartiene a una rotta, o appartiene a quella scelta.
export const sulPercorso = (partita, cap) => !cap.rotta || cap.rotta === partita.bandiere.rotta;

// Capitolo successivo a "id" lungo il percorso della partita (null se la storia scritta finisce lì).
export function capitoloDopo(dati, partita, id) {
  const lista = dati.campagna.capitoli;
  for (let j = lista.indexOf(id) + 1; j < lista.length; j++) if (sulPercorso(partita, dati.capitoli[lista[j]])) return lista[j];
  return null;
}
// Capitoli che si possono rigiocare dal titolo: quelli completati più quello in corso.
export function capitoliAperti(dati, partita) {
  return dati.campagna.capitoli.filter((id) => sulPercorso(partita, dati.capitoli[id]) && (partita.completati.includes(id) || id === partita.prossimo));
}
// Se sono stati aggiunti capitoli nuovi dopo che la partita era arrivata in fondo, la storia riprende da lì.
export function riallinea(dati, partita) {
  partita.schieramenti ||= {};
  if (partita.sospesa && !dati.capitoli[partita.sospesa.cap]) partita.sospesa = null;
  partita.completati ||= []; partita.bandiere ||= {}; partita.supporti ||= {}; partita.deposito ||= { armi: [], oggetti: [] }; partita.oro ||= 0;
  if (partita.prossimo && dati.capitoli[partita.prossimo]) return aggiornaCompagnia(dati, partita, partita.prossimo);
  const fatti = partita.completati.filter((id) => dati.capitoli[id]);
  const ultimo = fatti.length ? fatti.reduce((a, b) => dati.campagna.capitoli.indexOf(a) > dati.campagna.capitoli.indexOf(b) ? a : b) : null;
  partita.prossimo = ultimo ? capitoloDopo(dati, partita, ultimo) : dati.campagna.capitoli[0];
  return aggiornaCompagnia(dati, partita, partita.prossimo);
}

function aggiungiOggetto(lista, id, q) {
  const v = lista.find((i) => i.id === id);
  if (v) v.q += q; else lista.push({ id, q });
}

// Dopo una vittoria: la Compagnia porta con sé livelli, statistiche e oggetti; arrivano le ricompense.
export function concludiCapitolo(dati, partita, b) {
  for (const u of b.unita) {
    if (u.squadra !== "alleato" || u.ospite || !partita.compagnia[u.id]) continue;
    const stat = clona(u.stat);
    if (u.pasto) for (const [k, v] of Object.entries(u.pasto)) stat[k] -= v;
    Object.assign(partita.compagnia[u.id], { lv: u.lv, pe: u.pe, stat, oggetti: clona(u.oggetti), armi: [...u.armi], arma: u.arma });
  }
  partita.supporti = clona(b.supporti);
  partita.sospesa = null;
  const pasto = partita.bandiere.pasto ? dati.pasti[partita.bandiere.pasto] : null;
  partita.bandiere.pasto = null;
  const R = b.cap.ricompensa || {};
  for (const [id, arma] of Object.entries(R.armi || {})) {
    const p = partita.compagnia[id];
    if (!p) continue;
    if (!p.armi.includes(arma)) p.armi.unshift(arma);
    p.arma = arma;
    while (p.armi.length > MAX_ARMI) partita.deposito.armi.push(p.armi.pop()); // troppe armi: l'ultima va al deposito
  }
  for (const o of R.oggetti || []) if (partita.compagnia[o.a]) aggiungiOggetto(partita.compagnia[o.a].oggetti, o.id, o.q);
  if (R.oro) partita.oro = (partita.oro || 0) + R.oro;
  if (!partita.completati.includes(b.cap.id)) partita.completati.push(b.cap.id);
  partita.prossimo = capitoloDopo(dati, partita, b.cap.id);
  aggiornaCompagnia(dati, partita, partita.prossimo);
  return { pasto, ricompensa: R };
}

// --- promozioni
export function contaOggetto(partita, id) {
  const somma = (lista) => (lista || []).reduce((n, i) => n + (i.id === id ? i.q : 0), 0);
  let n = somma(partita.deposito?.oggetti);
  for (const p of Object.values(partita.compagnia)) n += somma(p.oggetti);
  return n;
}
function consumaOggetto(dati, partita, id) {
  for (const pid of dati.personaggi.ordine) {
    const v = partita.compagnia[pid]?.oggetti.find((i) => i.id === id && i.q > 0);
    if (v) { v.q--; return true; }
  }
  const d = partita.deposito?.oggetti.find((i) => i.id === id && i.q > 0);
  if (d) { d.q--; return true; }
  return false;
}
export function puoPromuovere(dati, partita, id) {
  const p = partita.compagnia[id], R = dati.regole.promozione;
  return !!dati.promozioni[id] && p.promo == null && p.lv >= R.livello && contaOggetto(partita, R.oggetto) > 0;
}
export function promuovi(dati, partita, id, k) {
  if (!puoPromuovere(dati, partita, id)) return false;
  const p = partita.compagnia[id], P = dati.promozioni[id][k];
  if (!P || !consumaOggetto(dati, partita, dati.regole.promozione.oggetto)) return false;
  for (const [s, v] of Object.entries(P.stat)) p.stat[s] += v;
  p.promo = k;
  if (P.arma && !p.armi.includes(P.arma)) { if (p.armi.length < MAX_ARMI) p.armi.push(P.arma); else partita.deposito.armi.push(P.arma); }
  return true;
}

// --- supporti all'accampamento
export function leggiSupporto(dati, partita, a, b) {
  const s = statoCoppia(partita.supporti, a, b), L = prossimoLivello(dati.regole, s);
  if (L && s.punti >= dati.regole.supporti.soglie[L]) { s.livello = L; return L; }
  return null;
}
export const conversazione = (dati, a, b, livello) => dati.supporti[chiaveCoppia(a, b)][livello];

// --- epilogo: il finale della rotta, poi una pagina per personaggio.
// Due personaggi con il supporto al livello più alto condividono la pagina (ognuno una volta sola, nell'ordine di campagna.json).
export const storiaCompiuta = (dati, partita) => partita.completati.some((id) => dati.capitoli[id]?.finale && sulPercorso(partita, dati.capitoli[id]));
export function componiEpilogo(dati, partita) {
  const E = dati.epilogo, massimo = dati.regole.supporti.livelli.at(-1), usati = new Set(), pagine = [];
  const ordine = dati.personaggi.ordine.filter((id) => partita.compagnia[id]);
  for (const c of E.coppie || []) {
    const [a, b] = c.coppia, s = partita.supporti[chiaveCoppia(a, b)];
    if (!partita.compagnia[a] || !partita.compagnia[b] || usati.has(a) || usati.has(b) || !s || s.livello !== massimo) continue;
    usati.add(a); usati.add(b);
    pagine.push({ chi: [a, b].sort((x, y) => ordine.indexOf(x) - ordine.indexOf(y)), testo: c.testo });
  }
  for (const id of ordine) if (!usati.has(id) && E.personaggi[id]) pagine.push({ chi: [id], testo: E.personaggi[id] });
  pagine.sort((x, y) => Math.min(...x.chi.map((i) => ordine.indexOf(i))) - Math.min(...y.chi.map((i) => ordine.indexOf(i))));
  return { rotta: E.rotte[partita.bandiere.rotta] || [], pagine, congedo: E.congedo || "" };
}

// Una copia della partita riportata al capitolo della scelta, per provare un'altra rotta con i livelli raggiunti.
// Chi era entrato lungo la rotta esce dalla Compagnia (rientrerà, se la nuova rotta lo prevede) e la sua roba va al deposito.
export function tornaAllaScelta(dati, partita) {
  const p = clona(partita), bivio = dati.campagna.capitoli.find((id) => dati.capitoli[id].scelta);
  if (!bivio) return null;
  p.bandiere.rotta = undefined; p.bandiere.pasto = null; p.sospesa = null;
  p.completati = p.completati.filter((id) => !dati.capitoli[id]?.rotta && id !== bivio);
  p.prossimo = bivio;
  for (const id of Object.keys(p.compagnia)) if (dati.personaggi[id]?.entra) {
    for (const o of p.compagnia[id].oggetti) if (o.q > 0) aggiungiOggetto(p.deposito.oggetti, o.id, o.q);
    delete p.compagnia[id];
  }
  return p;
}

// --- salvataggio del prototipo (versione 1) → formato nuovo
export function migraV1(dati, s) {
  const OGG = { "Tonico": "tonico", "Sigillo di ottone": "sigillo" };
  const p = nuovaPartita(dati), lista = dati.campagna.capitoli;
  aggiornaCompagnia(dati, p, null);
  for (const [id, v] of Object.entries(s.party || {})) {
    if (!p.compagnia[id]) continue;
    const armi = [v.w];
    const P = v.promo != null ? dati.promozioni[id]?.[v.promo] : null;
    if (P?.arma) armi.push(P.arma);
    p.compagnia[id] = { lv: v.lv, pe: v.exp || 0, stat: v.st, armi, arma: v.w, promo: v.promo ?? null,
      oggetti: (v.items || []).filter((i) => OGG[i.n]).map((i) => ({ id: OGG[i.n], q: i.q })) };
  }
  p.bandiere = { rotta: s.flags?.route, pasto: s.flags?.meal || null };
  for (const [k, v] of Object.entries(s.supports || {})) p.supporti[k] = { punti: v.pts || 0, livello: v.lvl || "" };
  const fino = Math.max(s.best || 0, s.next || 0);
  p.completati = lista.filter((id, i) => i < fino && sulPercorso(p, dati.capitoli[id]));
  p.prossimo = s.next < lista.length ? lista[s.next] : null;
  return p;
}
