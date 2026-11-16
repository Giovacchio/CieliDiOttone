import test from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync, readdirSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { dati, prova, scorri } from "./aiuti.js";
import { RADICE } from "../strumenti/dati_node.js";
import { controllaDati } from "../js/dati.js";
import { nuovaPartita, concludiCapitolo, capitoloDopo, promuovi, puoPromuovere, migraV1, leggiSupporto, capitoliAperti } from "../js/motore/campagna.js";
import { statoCoppia } from "../js/motore/supporti.js";
import { calcola } from "../js/motore/combattimento.js";
import { simulaCampagna } from "../strumenti/simula_campagna.js";
import { creaDado } from "../js/motore/dado.js";
import { clona } from "../js/motore/unita.js";

test("i dati superano tutti i controlli", () => {
  assert.deepEqual(controllaDati(dati), []);
});

test("il controllo dei dati si accorge degli errori più comuni", () => {
  const rotti = clona(dati);
  rotti.capitoli.c1.nemici[0].classe = "Lancere";
  rotti.capitoli.c1.mappa[2] += ".";
  rotti.capitoli.c2.inizio.push(["pippo", "Ciao"]);
  const E = controllaDati(rotti).join("\n");
  assert.match(E, /la classe "Lancere" non esiste/);
  assert.match(E, /riga 3 della mappa/);
  assert.match(E, /parla "pippo"/);
});

test("storia e bilanciamento sono quelli del prototipo (capitoli, supporti, promozioni)", () => {
  // si riesporta il prototipo in una cartella temporanea e si confronta con dati/
  const tmp = mkdtempSync(path.join(tmpdir(), "cdo-"));
  execFileSync(process.execPath, [path.join(RADICE, "strumenti/esporta_prototipo.cjs")], { env: { ...process.env, CDO_USCITA: tmp }, stdio: "ignore" });
  const leggi = (base, f) => JSON.parse(readFileSync(path.join(base, f), "utf8"));
  const campi = ["titolo", "atto", "tema", "rotta", "mappa", "schieramento", "obiettivo", "ospiti", "nemici", "eventi", "inizio", "vittoria", "scelta", "diario"];
  const file = readdirSync(path.join(tmp, "capitoli"));
  assert.equal(file.length, 16);
  for (const f of file) {
    const a = leggi(tmp, "capitoli/" + f), b = leggi(path.join(RADICE, "dati"), "capitoli/" + f);
    // i capitoli 13 del prototipo finivano con "il resto arriverà presto": ora il resto c'è, quella riga è stata tolta
    if (/arriverà presto/.test(a.vittoria.at(-1)[1])) a.vittoria.pop();
    for (const k of campi) assert.deepEqual(b[k], a[k], `${f}: "${k}" è cambiato rispetto al prototipo`);
    assert.deepEqual(b.ricompensa.armi, a.ricompensa.armi, f); assert.deepEqual(b.ricompensa.oggetti, a.ricompensa.oggetti, f);
  }
  for (const f of readdirSync(path.join(tmp, "supporti"))) assert.deepEqual(leggi(path.join(RADICE, "dati"), "supporti/" + f), leggi(tmp, "supporti/" + f), f);
  for (const f of ["promozioni.json", "classi.json", "armi.json", "terreni.json"]) {
    const a = leggi(tmp, f), b = leggi(path.join(RADICE, "dati"), f);
    const senzaUsa = (v) => Array.isArray(v) ? v.map(({ usa, ...resto }) => resto) : v;   // "usa" è nato con l'inventario
    for (const k of Object.keys(a)) assert.deepEqual(senzaUsa(b[k]), a[k], `${f}: "${k}" è cambiato rispetto al prototipo`);
  }
  const a = leggi(tmp, "personaggi.json"), b = leggi(path.join(RADICE, "dati"), "personaggi.json");
  for (const id of a.ordine) for (const k of ["stat", "crescita", "mov", "movimento", "arma"]) assert.deepEqual(b[id][k], a[id][k], `${id}.${k}`);
});

test("abilità come dati: aura di Giova, Prospy, promozioni", () => {
  const nemico = { classe: "Lanciere", lv: 1, x: 4, y: 0, ia: "fermo" };
  let t = prova({ mappa: ["....f", ".....", "....."], posizioni: { giova: [0, 0], lethy: [2, 0], wata: [3, 2] }, nemici: [nemico, { ...nemico, x: 4, y: 2 }] });
  const vicino = calcola(t.b, t.u("lethy"), t.nemico()).precisione;
  t.u("giova").x = 0; t.u("giova").y = 2; t.u("lethy").y = 0;   // Giova a 4 caselle: niente aura
  assert.equal(vicino - calcola(t.b, t.u("lethy"), t.nemico()).precisione, 10);
  // Prospy: +10 schivata per Wata
  const senza = clona(dati); senza.personaggi.wata.abilita.effetti = [];
  const conGatto = calcola(t.b, t.nemico(1), t.u("wata")).precisione;
  t.b.dati = senza; t.u("wata").abilita = senza.personaggi.wata.abilita;
  assert.equal(calcola(t.b, t.nemico(1), t.u("wata")).precisione - conGatto, 10);
  // promozioni
  const p = nuovaPartita(dati);
  assert.equal(puoPromuovere(dati, p, "wata"), false);
  p.compagnia.wata.lv = 10; p.compagnia.giova.oggetti.push({ id: "sigillo", q: 1 });
  const magPrima = p.compagnia.wata.stat.mag;
  assert.equal(promuovi(dati, p, "wata", 0), true);
  assert.equal(p.compagnia.wata.stat.mag, magPrima + 3);
  assert.equal(promuovi(dati, p, "wata", 1), false, "non ci si promuove due volte");
  t = prova({ partita: p, posizioni: { wata: [0, 0] }, nemici: [{ ...nemico, x: 1, y: 0 }] });
  assert.equal(t.u("wata").classe, "Arcanista");
  const base = prova({ posizioni: { wata: [0, 0] }, nemici: [{ ...nemico, x: 1, y: 0 }] });
  assert.equal(calcola(t.b, t.u("wata"), t.nemico()).danno - calcola(base.b, base.u("wata"), base.nemico()).danno, 3 + 2);
  // Alchimista: Mars riceve le fiale e può attaccare
  p.compagnia.mars.lv = 10; p.compagnia.giova.oggetti.push({ id: "sigillo", q: 1 });
  promuovi(dati, p, "mars", 1);
  assert.deepEqual(p.compagnia.mars.armi, ["elisir", "fiala"]);
  t = prova({ partita: p, posizioni: { mars: [0, 0] }, nemici: [{ ...nemico, x: 2, y: 0 }] });
  assert.deepEqual(t.b.armiUtili(t.u("mars")), { attacco: ["fiala"], cura: [] });
});

test("supporti: punti combattendo vicini, livello letto, bonus in battaglia", () => {
  const debole = { classe: "Lanciere", lv: 1, x: 1, y: 0, ia: "fermo", stat: { hp: 99, for: 0, mag: 0, abi: 0, vel: 0, fort: 0, def: 99, res: 0 } };
  const t = prova({ posizioni: { giova: [0, 0], wata: [0, 2] }, nemici: [debole, { ...debole, x: 4, y: 2 }] });
  for (let i = 0; i < 12; i++) { t.u("giova").agito = false; scorri(t.b.attacca(t.u("giova"), t.nemico())); }
  assert.equal(statoCoppia(t.b.supporti, "giova", "wata").punti, 12, "si ferma alla soglia finché non si legge");
  assert.equal(statoCoppia(t.partita.supporti, "giova", "wata").punti, 0, "la partita non cambia finché il capitolo non è vinto");
  t.partita.supporti = t.b.supporti;
  assert.equal(leggiSupporto(dati, t.partita, "giova", "wata"), "C");
  const prima = calcola(prova({ posizioni: { giova: [0, 0], wata: [0, 2] }, nemici: [debole] }).b, t.u("giova"), t.nemico()).precisione;
  const dopo = prova({ partita: t.partita, posizioni: { giova: [0, 0], wata: [0, 2] }, nemici: [{ ...debole, stat: { ...debole.stat, vel: 30 } }] });
  const senza = prova({ posizioni: { giova: [0, 0], wata: [0, 2] }, nemici: [{ ...debole, stat: { ...debole.stat, vel: 30 } }] });
  assert.equal(calcola(dopo.b, dopo.u("giova"), dopo.nemico()).precisione - calcola(senza.b, senza.u("giova"), senza.nemico()).precisione, 5);
  assert.ok(prima >= 0);
});

test("fine capitolo: livelli e ricompense passano alla partita, il pasto vale un capitolo solo", () => {
  const p = nuovaPartita(dati);
  p.bandiere.pasto = "arepas";
  const t = prova({ partita: p, posizioni: { giova: [0, 0], wata: [0, 1] }, nemici: [{ classe: "Lanciere", lv: 1, x: 4, y: 2 }] });
  assert.equal(t.u("giova").stat.def, 6 + 2);
  t.u("giova").lv = 3;
  t.b.cap = { ...t.b.cap, id: "c2", ricompensa: dati.capitoli.c2.ricompensa };
  concludiCapitolo(dati, p, t.b);
  assert.equal(p.compagnia.giova.lv, 3);
  assert.equal(p.compagnia.giova.stat.def, 6, "il bonus del pasto non resta");
  assert.equal(p.bandiere.pasto, null);
  assert.equal(p.compagnia.wata.arma, "spine");
  assert.deepEqual(p.compagnia.wata.armi, ["spine", "rovo"]);
  assert.equal(p.prossimo, "c3");
});

test("rotte: dopo il capitolo 12 si prosegue solo sulla rotta scelta", () => {
  const p = nuovaPartita(dati);
  p.bandiere.rotta = "radici";
  assert.equal(capitoloDopo(dati, p, "c12"), "c13r");
  assert.equal(capitoloDopo(dati, p, "c13r"), "c14r");
  assert.equal(capitoloDopo(dati, p, "c17r"), "c18r");
  assert.equal(capitoloDopo(dati, p, "c20r"), null);
  p.completati = ["prologo", "c1"]; p.prossimo = "c2";
  assert.deepEqual(capitoliAperti(dati, p), ["prologo", "c1", "c2"]);
});

test("un salvataggio del prototipo viene portato nel formato nuovo", () => {
  const vecchio = { v: 1, next: 9, best: 9, flags: { route: undefined, meal: "zuppa" }, supports: { "giova|wata": { pts: 32, lvl: "C" } },
    party: { giova: { lv: 11, exp: 40, st: { hp: 30, for: 10, mag: 3, abi: 12, vel: 11, fort: 9, def: 9, res: 5 }, items: [{ n: "Tonico", q: 4 }, { n: "Sigillo di ottone", q: 1 }], w: "spadaA" },
      mars: { lv: 10, exp: 0, st: { hp: 25, for: 4, mag: 12, abi: 9, vel: 10, fort: 8, def: 5, res: 10 }, items: [], w: "elisirF", promo: 1 } } };
  const p = migraV1(dati, vecchio);
  assert.equal(p.prossimo, "c9");
  assert.equal(p.completati.length, 9);
  assert.deepEqual(p.compagnia.giova.oggetti, [{ id: "tonico", q: 4 }, { id: "sigillo", q: 1 }]);
  assert.equal(p.compagnia.giova.pe, 40);
  assert.deepEqual(p.compagnia.mars.armi, ["elisirF", "fiala"]);
  assert.deepEqual(p.supporti["giova|wata"], { punti: 32, livello: "C" });
  assert.equal(p.bandiere.pasto, "zuppa");
  assert.ok(p.compagnia.lethy && p.compagnia.wata, "chi mancava nel vecchio salvataggio parte dal livello 1");
});

test("bilanciamento: il bot arriva in fondo alla campagna, sempre allo stesso modo con lo stesso seme", () => {
  const una = (seme) => simulaCampagna(dati, { dado: creaDado(seme), rotta: "corona", ia: "classica" }).esito.map((r) => `${r.id}:${r.tentativi}:${r.turni}`).join(" ");
  assert.equal(una(7), una(7));
  let finite = 0;
  for (let s = 0; s < 12; s++) for (const rotta of ["corona", "radici", "libere"]) if (simulaCampagna(dati, { dado: creaDado(500 + s), rotta, ia: "classica", promuove: true }).esito.at(-1).vinto) finite++;
  assert.ok(finite >= 18, `solo ${finite} campagne su 36 arrivano in fondo: qualcosa è diventato troppo difficile`);
  let tattiche = 0;
  for (let s = 0; s < 12; s++) for (const rotta of ["corona", "radici", "libere"]) if (simulaCampagna(dati, { dado: creaDado(500 + s), rotta, ia: "tattica", promuove: true }).esito.at(-1).vinto) tattiche++;
  assert.ok(tattiche >= 18, `con l'IA tattica solo ${tattiche} campagne su 36 arrivano in fondo`);
});
