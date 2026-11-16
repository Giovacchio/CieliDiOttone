import test from "node:test";
import assert from "node:assert/strict";
import { dati } from "./aiuti.js";
import { nuovaPartita } from "../js/motore/campagna.js";

// un finto localStorage, perché i test girano senza browser
const memoria = new Map();
globalThis.localStorage = { getItem: (k) => memoria.get(k) ?? null, setItem: (k, v) => memoria.set(k, String(v)), removeItem: (k) => memoria.delete(k) };
const S = await import("../js/salvataggi.js");

test("slot: salvare, rileggere, cancellare; ogni slot è indipendente", () => {
  const p = nuovaPartita(dati);
  p.oro = 321; p.compagnia.giova.lv = 7;
  assert.equal(S.salvaSlot(2, p), true);
  const elenco = S.elencaSlot(dati);
  assert.deepEqual(elenco.map((s) => !!s.partita), [false, true, false]);
  assert.equal(elenco[1].partita.oro, 321);
  assert.equal(elenco[1].partita.compagnia.giova.lv, 7);
  S.cancellaSlot(2);
  assert.equal(S.caricaSlot(dati, 2), null);
  S.usaSlot(3); assert.equal(S.slotInUso(), 3);
});

test("la partita del prototipo finisce nello slot 1, una volta sola", () => {
  memoria.clear();
  memoria.set("cieli-di-ottone-v1", JSON.stringify({ v: 1, next: 2, best: 2, flags: {}, supports: {}, party: { giova: { lv: 3, exp: 5, st: dati.personaggi.giova.stat, items: [], w: "spada" } } }));
  const s = S.caricaSlot(dati, 1);
  assert.equal(s.partita.compagnia.giova.lv, 3);
  assert.equal(s.partita.prossimo, "c2");
  S.cancellaSlot(1);
  assert.equal(S.caricaSlot(dati, 1), null, "cancellata, non ricompare");
});

test("esportazione e importazione: andata e ritorno, e file sbagliati rifiutati con una frase chiara", () => {
  const p = nuovaPartita(dati);
  p.completati = ["prologo", "c1"]; p.prossimo = "c2"; p.oro = 99; p.supporti["giova|wata"] = { punti: 12, livello: "C" };
  const copia = S.leggiEsportazione(dati, S.testoEsportazione(p));
  assert.deepEqual(copia, p);
  assert.equal(copia.sospesa, null);
  assert.throws(() => S.leggiEsportazione(dati, "ciao"), /non è un salvataggio/);
  assert.throws(() => S.leggiEsportazione(dati, JSON.stringify({ v: 99, compagnia: {} })), /non è un salvataggio/);
  const sporco = JSON.parse(S.testoEsportazione(p));
  sporco.partita.compagnia.sconosciuto = { lv: 1 }; sporco.partita.prossimo = "capitolo-che-non-esiste";
  const pulito = S.leggiEsportazione(dati, JSON.stringify(sporco));
  assert.equal(pulito.compagnia.sconosciuto, undefined);
  assert.equal(pulito.prossimo, "c2", "riparte dal primo capitolo non ancora completato");
});

test("battaglia sospesa: ripresa a metà, prosegue esattamente come se non fosse mai stata interrotta", async () => {
  const { Battaglia } = await import("../js/motore/battaglia.js");
  const { creaDado } = await import("../js/motore/dado.js");
  const { mossaBot } = await import("../strumenti/bot.js");
  const scorri = (g) => { for (const _ of g) { /* niente */ } };
  const nuova = () => { const p = nuovaPartita(dati); return new Battaglia({ dati, capitolo: dati.capitoli.c3, compagnia: p.compagnia, dado: creaDado(77), ia: "tattica" }); };
  const turno = (b) => { for (const u of b.vivi("alleato")) if (!b.finita) mossaBot(b, u, null); if (!b.finita) scorri(b.fineFaseGiocatore()); };
  const foto = (b) => JSON.stringify([b.turno, b.finita, b.vinta, b.unita.map((u) => [u.id, u.x, u.y, u.pv, u.lv, u.pe])]);
  const intera = nuova(); scorri(intera.inizia());
  for (let i = 0; i < 6; i++) turno(intera);
  const spezzata = nuova(); scorri(spezzata.inizia());
  for (let i = 0; i < 3; i++) turno(spezzata);
  const salvata = JSON.parse(JSON.stringify(spezzata.esporta()));   // passa dal disco
  const ripresa = Battaglia.riprendi(dati, salvata);
  assert.equal(ripresa.turno, spezzata.turno);
  for (let i = 0; i < 3; i++) turno(ripresa);
  assert.equal(foto(ripresa), foto(intera));
  assert.equal(Battaglia.riprendi(dati, { cap: "non-esiste", unita: [] }), null);
});
