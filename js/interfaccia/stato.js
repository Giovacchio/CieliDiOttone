// Stato condiviso dell'interfaccia: i dati caricati, la partita in corso, la battaglia sullo schermo.
export const G = {
  dati: null,        // tutto il contenuto di dati/
  partita: null,     // ciò che viene salvato
  b: null,           // la battaglia in corso (motore)
  lato: 48,          // lato di una casella in pixel
  sel: null, origine: null, raggio: null, armaPrima: null,
  modo: "riposo",    // riposo | scelta | mosso | bersaglio | cura | nemico | occupato
  pericolo: false,   // "Zone nemiche" accese
  occupato: false,   // un'animazione o la fase nemica è in corso
  velocita: 1,
  chiusa: true,      // la battaglia sullo schermo è solo uno sfondo (titolo) o è già finita
  inBattaglia: false, // i dialoghi cercano chi parla tra le unità sulla mappa
};

export const $ = (s) => document.querySelector(s);
export const $$ = (s) => [...document.querySelectorAll(s)];
export const pausa = (ms) => new Promise((r) => setTimeout(r, ms * G.velocita));
const SEGNI = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" };
export const h = (t) => String(t ?? "").replace(/[&<>"]/g, (c) => SEGNI[c]);

// Finestra sopra il gioco (dialoghi, previsione, accampamento...). "centro" la mette in mezzo allo schermo.
export function velo(html, centro) { $("#ovl").innerHTML = `<div class="overlay${centro ? " center" : ""}">${html}</div>`; }
export function chiudiVelo() { $("#ovl").innerHTML = ""; }
export const veloAperto = () => !!$("#ovl").innerHTML;

export function registro(html) { $("#log").insertAdjacentHTML("afterbegin", `<div>${html}</div>`); }
