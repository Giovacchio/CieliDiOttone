// Inventario: armi e oggetti di ogni personaggio, deposito comune della Compagnia, mercato.
// Un "portatore" è qualsiasi cosa con { armi:[id], arma:id, oggetti:[{id,q}] }: la scheda di un personaggio,
// un'unità in battaglia, oppure il deposito (che non ha "arma" e non ha limiti).
export const MAX_ARMI = 4;

// Tipi di arma che un personaggio sa usare: quelli di personaggi.json più quelli aggiunti dalla promozione.
export function tipiUsabili(dati, id, promo) {
  const b = dati.personaggi[id];
  if (!b) return [];
  const tipi = new Set(b.usa || [dati.armi[b.arma].tipo]);
  const P = promo != null ? dati.promozioni[id]?.[promo] : null;
  for (const t of P?.usa || []) tipi.add(t);
  if (P?.arma) tipi.add(dati.armi[P.arma].tipo);
  return [...tipi];
}
export const puoUsare = (dati, tipi, idArma) => !!dati.armi[idArma] && tipi.includes(dati.armi[idArma].tipo);
const eDeposito = (p) => p.arma === undefined;

export function impugna(portatore, idArma) {
  if (!portatore.armi.includes(idArma)) return false;
  portatore.arma = idArma;
  return true;
}
// Sposta un'arma. "tipiA" = tipi usabili da chi riceve (null se è il deposito). Restituisce "" o il motivo del rifiuto.
export function passaArma(dati, da, a, idArma, tipiA) {
  const i = da.armi.indexOf(idArma);
  if (i < 0) return "Quest'arma non c'è.";
  if (!eDeposito(da) && da.armi.length <= 1) return "Non si può restare senza armi.";
  if (!eDeposito(a)) {
    if (!puoUsare(dati, tipiA || [], idArma)) return "Non sa usare quest'arma.";
    if (a.armi.length >= MAX_ARMI) return `Porta già ${MAX_ARMI} armi.`;
  }
  da.armi.splice(i, 1);
  a.armi.push(idArma);
  if (!eDeposito(da) && !da.armi.includes(da.arma)) da.arma = da.armi[0];
  return "";
}
export function passaOggetto(da, a, id, q = 1) {
  const v = da.oggetti.find((o) => o.id === id && o.q >= q);
  if (!v) return "Quest'oggetto non c'è.";
  v.q -= q;
  da.oggetti = da.oggetti.filter((o) => o.q > 0);
  const w = a.oggetti.find((o) => o.id === id);
  if (w) w.q += q; else a.oggetti.push({ id, q });
  return "";
}

// --- mercato: la merce si sblocca man mano che la storia avanza ("da": id del capitolo)
export function avanzamento(dati, partita) {
  const lista = dati.campagna.capitoli;
  return Math.max(-1, ...[...partita.completati, partita.prossimo].filter(Boolean).map((id) => lista.indexOf(id)));
}
export function merce(dati, partita) {
  const fin = avanzamento(dati, partita), lista = dati.campagna.capitoli;
  const aperta = (v) => !v.da || (lista.indexOf(v.da) >= 0 && lista.indexOf(v.da) <= fin);
  return { armi: dati.mercato.armi.filter(aperta), oggetti: dati.mercato.oggetti.filter(aperta) };
}
export function prezzo(dati, tipo, id) {
  return dati.mercato[tipo].find((v) => v.id === id)?.prezzo ?? null;
}
export const prezzoVendita = (dati, tipo, id) => { const p = prezzo(dati, tipo, id); return p == null ? null : Math.floor(p / 2); };

// Compra: la merce finisce nel deposito. Restituisce "" o il motivo del rifiuto.
export function compra(dati, partita, tipo, id) {
  const voce = merce(dati, partita)[tipo].find((v) => v.id === id);
  if (!voce) return "Il mercato non lo vende.";
  if ((partita.oro || 0) < voce.prezzo) return "Non basta l'oro.";
  partita.oro -= voce.prezzo;
  if (tipo === "armi") partita.deposito.armi.push(id);
  else { const w = partita.deposito.oggetti.find((o) => o.id === id); if (w) w.q++; else partita.deposito.oggetti.push({ id, q: 1 }); }
  return "";
}
// Vende dal deposito (si vende solo ciò che il mercato tratta).
export function vendi(dati, partita, tipo, id) {
  const p = prezzoVendita(dati, tipo, id);
  if (p == null) return "Il mercato non lo compra.";
  if (tipo === "armi") {
    const i = partita.deposito.armi.indexOf(id);
    if (i < 0) return "Non è nel deposito.";
    partita.deposito.armi.splice(i, 1);
  } else {
    const v = partita.deposito.oggetti.find((o) => o.id === id && o.q > 0);
    if (!v) return "Non è nel deposito.";
    v.q--; partita.deposito.oggetti = partita.deposito.oggetti.filter((o) => o.q > 0);
  }
  partita.oro = (partita.oro || 0) + p;
  return "";
}
