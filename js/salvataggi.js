// Salvataggi nel browser (localStorage): tre slot, salvataggio automatico nello slot in uso,
// esportazione e importazione di un file per fare una copia o cambiare dispositivo.
import { riallinea, migraV1, VERSIONE } from "./motore/campagna.js";

export const SLOT = [1, 2, 3];
const CHIAVE = "cieli-di-ottone-slot", UNICO = "cieli-di-ottone-v2", PROTOTIPO = "cieli-di-ottone-v1";
const leggi = (k) => { try { return JSON.parse(localStorage.getItem(k) || "null"); } catch (e) { return null; } };
const scrivi = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); return true; } catch (e) { return false; } };
const togli = (k) => { try { localStorage.removeItem(k); } catch (e) { /* niente */ } };

export const valida = (s) => !!s && s.v === VERSIONE && !!s.compagnia && typeof s.compagnia === "object";

// Porta nel primo slot le partite salvate con le versioni precedenti (una volta sola).
function migra(dati) {
  if (leggi(CHIAVE + "-migrato")) return;
  const unico = leggi(UNICO), vecchio = leggi(PROTOTIPO);
  let p = null;
  if (valida(unico)) p = unico;
  else if (vecchio && vecchio.v === 1 && vecchio.party) { try { p = migraV1(dati, vecchio); } catch (e) { p = null; } }
  if (p && !leggi(CHIAVE + "1")) scrivi(CHIAVE + "1", { partita: p, quando: Date.now() });
  scrivi(CHIAVE + "-migrato", true);
}

export function caricaSlot(dati, n) {
  migra(dati);
  const s = leggi(CHIAVE + n);
  if (!s || !valida(s.partita)) return null;
  try { return { partita: riallinea(dati, s.partita), quando: s.quando || 0 }; } catch (e) { console.warn("Slot illeggibile:", e); return null; }
}
export const elencaSlot = (dati) => SLOT.map((n) => ({ n, ...(caricaSlot(dati, n) || { partita: null, quando: 0 }) }));
export const salvaSlot = (n, partita) => scrivi(CHIAVE + n, { partita, quando: Date.now() });
export const cancellaSlot = (n) => togli(CHIAVE + n);

export function slotInUso() { const n = +leggiPreferenza("slot"); return SLOT.includes(n) ? n : 1; }
export function usaSlot(n) { scriviPreferenza("slot", String(n)); }

// --- file
export function testoEsportazione(partita) {
  return JSON.stringify({ gioco: "Cieli di Ottone", esportato: new Date().toISOString(), partita }, null, 1);
}
// Legge il testo di un file esportato; restituisce la partita o lancia un errore spiegato in italiano.
export function leggiEsportazione(dati, testo) {
  let o;
  try { o = JSON.parse(testo); } catch (e) { throw new Error("Il file non è un salvataggio di Cieli di Ottone."); }
  const p = o && o.partita ? o.partita : o;
  if (p && p.v === 1 && p.party) return riallinea(dati, migraV1(dati, p));
  if (!valida(p)) throw new Error("Il file non è un salvataggio di Cieli di Ottone (o è di una versione che non conosco).");
  for (const id of Object.keys(p.compagnia)) if (!dati.personaggi[id]) delete p.compagnia[id];
  return riallinea(dati, p);
}
export function scaricaFile(nome, testo) {
  const a = document.createElement("a");
  a.href = URL.createObjectURL(new Blob([testo], { type: "application/json" }));
  a.download = nome;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 2000);
}
export function scegliFile() {
  return new Promise((fatto) => {
    const i = document.createElement("input");
    i.type = "file"; i.accept = ".json,application/json";
    i.onchange = () => { const f = i.files[0]; if (!f) return fatto(null); const r = new FileReader(); r.onload = () => fatto(String(r.result)); r.onerror = () => fatto(null); r.readAsText(f); };
    i.click();
  });
}

export function leggiPreferenza(nome) { try { return localStorage.getItem("cdo-" + nome); } catch (e) { return null; } }
export function scriviPreferenza(nome, valore) { try { localStorage.setItem("cdo-" + nome, valore); } catch (e) { /* niente */ } }
