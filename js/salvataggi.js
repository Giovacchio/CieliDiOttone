// Salvataggio nel browser (localStorage).
import { riallinea, migraV1, VERSIONE } from "./motore/campagna.js";

const CHIAVE = "cieli-di-ottone-v2", PROTOTIPO = "cieli-di-ottone-v1";

export function caricaPartita(dati) {
  try {
    const s = JSON.parse(localStorage.getItem(CHIAVE) || "null");
    if (s && s.v === VERSIONE && s.compagnia) return riallinea(dati, s);
    // partita iniziata con il prototipo: la si porta nel formato nuovo
    const v = JSON.parse(localStorage.getItem(PROTOTIPO) || "null");
    if (v && v.v === 1 && v.party) { const p = riallinea(dati, migraV1(dati, v)); salvaPartita(p); return p; }
  } catch (e) { console.warn("Salvataggio illeggibile:", e); }
  return null;
}
export function salvaPartita(partita) {
  try { localStorage.setItem(CHIAVE, JSON.stringify(partita)); return true; } catch (e) { return false; }
}
export function cancellaPartita() { try { localStorage.removeItem(CHIAVE); localStorage.removeItem(PROTOTIPO); } catch (e) { /* niente */ } }

export function leggiPreferenza(nome) { try { return localStorage.getItem("cdo-" + nome); } catch (e) { return null; } }
export function scriviPreferenza(nome, valore) { try { localStorage.setItem("cdo-" + nome, valore); } catch (e) { /* niente */ } }
