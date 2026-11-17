import test from "node:test";
import assert from "node:assert/strict";
import { dati, prova, scorri } from "./aiuti.js";
import { nuovaPartita, concludiCapitolo } from "../js/motore/campagna.js";
import { tipiUsabili, passaArma, passaOggetto, impugna, compra, vendi, merce, MAX_ARMI } from "../js/motore/inventario.js";
import { previsione } from "../js/motore/combattimento.js";

test("armi: ognuno usa solo i suoi tipi, porta al massimo 4 armi e non resta mai senza", () => {
  const p = nuovaPartita(dati), g = p.compagnia.giova, w = p.compagnia.wata, dep = p.deposito;
  assert.deepEqual(tipiUsabili(dati, "giova", null), ["spada"]);
  assert.deepEqual(tipiUsabili(dati, "mars", 1).sort(), ["congegni", "cura"]);
  dep.armi.push("spadaA", "scintilla", "spada", "spada", "spada");
  assert.match(passaArma(dati, dep, g, "scintilla", tipiUsabili(dati, "giova", null)), /Non sa usare/);
  assert.equal(passaArma(dati, dep, w, "scintilla", tipiUsabili(dati, "wata", null)), "");
  for (const a of ["spadaA", "spada", "spada"]) assert.equal(passaArma(dati, dep, g, a, ["spada"]), "");
  assert.equal(g.armi.length, MAX_ARMI);
  assert.match(passaArma(dati, dep, g, "spada", ["spada"]), /già 4/);
  assert.equal(impugna(g, "spadaA"), true);
  assert.equal(passaArma(dati, g, dep, "spadaA", null), "");
  assert.equal(g.arma, "spada", "posata l'arma in mano, ne impugna un'altra");
  const l = p.compagnia.lethy;
  assert.match(passaArma(dati, l, dep, "stocco", null), /senza armi/);
});

test("in battaglia: l'arma impugnata decide attacco e contrattacco; lo scambio passa oggetti", () => {
  const p = nuovaPartita(dati);
  p.compagnia.wata.armi.push("scintilla");
  const t = prova({ partita: p, posizioni: { wata: [0, 0], giova: [0, 1] }, nemici: [{ classe: "Lanciere", lv: 1, x: 2, y: 0, ia: "fermo" }] });
  const wata = t.u("wata"), prima = previsione(t.b, wata, t.nemico()).A.danno;
  impugna(wata, "scintilla");
  assert.equal(previsione(t.b, wata, t.nemico()).A.danno, prima);   // stessa potenza del rovo
  assert.equal(passaOggetto(t.u("giova"), wata, "tonico", 1), "");
  assert.equal(wata.oggetti.find((o) => o.id === "tonico").q, 2);
  assert.equal(t.u("giova").oggetti.find((o) => o.id === "tonico").q, 2);
  concludiCapitolo(dati, p, t.b);
  assert.equal(p.compagnia.wata.arma, "scintilla", "l'arma in mano resta quella scelta");
  assert.equal(p.compagnia.wata.oggetti.find((o) => o.id === "tonico").q, 2);
});

test("mercato: l'oro arriva dalle missioni, la merce si sblocca con la storia, si vende a metà prezzo", () => {
  const p = nuovaPartita(dati);
  assert.match(compra(dati, p, "oggetti", "tonico"), /oro/);
  const t = prova({ partita: p, nemici: [{ classe: "Lanciere", lv: 1, x: 4, y: 2 }] });
  t.b.cap = dati.capitoli.prologo;
  concludiCapitolo(dati, p, t.b);
  assert.equal(p.oro, dati.capitoli.prologo.ricompensa.oro);
  assert.ok(!merce(dati, p).armi.some((v) => v.id === "spadaA"), "la spada d'acciaio non è ancora in vendita");
  assert.match(compra(dati, p, "armi", "spadaA"), /non lo vende/);
  p.oro = 1000;
  assert.equal(compra(dati, p, "oggetti", "tonico"), "");
  assert.equal(compra(dati, p, "armi", "spada"), "");
  assert.equal(p.oro, 1000 - 120 - 300);
  assert.deepEqual(p.deposito, { armi: ["spada"], oggetti: [{ id: "tonico", q: 1 }] });
  assert.equal(vendi(dati, p, "armi", "spada"), "");
  assert.equal(p.oro, 1000 - 120 - 300 + 150);
  p.deposito.armi.push("stoccoA");
  assert.match(vendi(dati, p, "armi", "stoccoA"), /non lo compra/);
  p.completati.push("c1", "c2", "c3"); p.prossimo = "c4";
  assert.ok(merce(dati, p).armi.some((v) => v.id === "spadaA"));
});

test("schieramento: posizioni scelte e personaggi lasciati all'accampamento", () => {
  const p = nuovaPartita(dati), cap = dati.capitoli.c1;
  const [a, b] = cap.schieramento;
  const t = prova({ partita: p, posizioni: { giova: b, wata: a }, nemici: [{ classe: "Lanciere", lv: 1, x: 4, y: 2 }] });
  assert.deepEqual(t.b.vivi("alleato").map((u) => u.id), ["giova", "wata"]);
  assert.deepEqual([t.u("giova").x, t.u("giova").y], b);
  t.u("giova").lv = 5;
  concludiCapitolo(dati, p, t.b);
  assert.equal(p.compagnia.giova.lv, 5);
  assert.equal(p.compagnia.lethy.lv, 2, "chi resta all'accampamento sale fino a un livello sotto la media di chi ha combattuto");
  assert.equal(p.compagnia.lethy.stat.hp, dati.personaggi.lethy.stat.hp + Math.round(dati.personaggi.lethy.crescita.hp / 100));
  assert.equal(p.compagnia.mars.lv, 2);
});
