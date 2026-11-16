// Attrezzi comuni ai test: dati veri dal disco e piccole battaglie costruite a mano.
import { datiDaDisco } from "../strumenti/dati_node.js";
import { Battaglia } from "../js/motore/battaglia.js";
import { nuovaPartita } from "../js/motore/campagna.js";
import { dadoDa } from "../js/motore/dado.js";

export const dati = await datiDaDisco();
export const scorri = (gen) => [...gen];
// Dado che restituisce sempre lo stesso numero: 0 = colpisce sempre e fa critico se può, 0.999 = manca sempre.
export const dadoFisso = (n) => dadoDa(() => n);

// Battaglia di prova su una mappa data, con i nemici indicati e la Compagnia nelle posizioni scelte.
export function prova({ mappa = [".....", ".....", "....."], nemici = [], ospiti, posizioni = { giova: [0, 0] }, obiettivo = { tipo: "tutti" }, eventi, dado = dadoFisso(0), partita = nuovaPartita(dati), ia } = {}) {
  const capitolo = { id: "prova", mappa, schieramento: [], obiettivo, nemici, ospiti, eventi };
  const b = new Battaglia({ dati, capitolo, compagnia: partita.compagnia, supporti: partita.supporti, bandiere: partita.bandiere, dado, posizioni, ia });
  return { b, partita, u: (id) => b.trova(id), nemico: (i = 0) => b.vivi("nemico")[i] };
}
