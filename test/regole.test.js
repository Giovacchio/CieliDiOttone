import test from "node:test";
import assert from "node:assert/strict";
import { dati, prova, scorri, dadoFisso } from "./aiuti.js";
import { calcola, previsione, triangolo } from "../js/motore/combattimento.js";
import { raggiungibili, campoDistanze, chiave } from "../js/motore/movimento.js";
import { dadoDa, creaDado } from "../js/motore/dado.js";

const ha = (caselle, x, y) => caselle.some((t) => t.x === x && t.y === y);
const lanciere = (x, y, o = {}) => ({ classe: "Lanciere", lv: 1, x, y, ia: "attacca", ...o });

test("triangolo del ferro e dell'ingegno", () => {
  const A = dati.armi, R = dati.regole;
  assert.equal(triangolo(R, A.spada, A.ascia), 1);
  assert.equal(triangolo(R, A.ascia, A.lancia), 1);
  assert.equal(triangolo(R, A.lancia, A.spada), 1);
  assert.equal(triangolo(R, A.spada, A.lancia), -1);
  assert.equal(triangolo(R, A.scintilla, A.sega), 1);       // etere > congegni
  assert.equal(triangolo(R, A.sega, A.moschetto), 1);       // congegni > polvere
  assert.equal(triangolo(R, A.moschetto, A.scintilla), 1);  // polvere > etere
  assert.equal(triangolo(R, A.spada, A.scintilla), 0);      // i due triangoli non si incrociano
  assert.equal(triangolo(R, A.arco, A.spada), 0);
});

test("previsione: Giova (spada) contro un lanciere, dalla pianura", () => {
  const { b, u, nemico } = prova({ nemici: [lanciere(1, 0)] });
  const f = previsione(b, u("giova"), nemico());
  // attacco: For 6 + spada 5 - 1 (la lancia batte la spada), contro Dif 4
  assert.equal(f.A.danno, 6 + 5 - 1 - 4);
  // precisione 90 + Abi 8×2 + Fort 6/2 - 15 + 10 (aura di Giova) = 104; schivata 4×2 + 1 = 9
  assert.equal(f.A.precisione, 95);
  assert.equal(f.A.critico, 3);            // Abi 8/2 - Fort 1
  assert.equal(f.A.doppio, false);         // 7 - 4 = 3, ne servono 4
  assert.equal(f.contrattacco, true);
  assert.equal(f.B.danno, 6 + 7 + 1 - 6);  // lanciere: For 6 + lancia 7 + triangolo - Dif 6
  assert.equal(f.B.precisione, 80 + 8 + 0 + 15 - (14 + 6));
});

test("il terreno protegge chi difende", () => {
  const { b, u, nemico } = prova({ mappa: [".f...", "....."], nemici: [lanciere(1, 0)] });
  const piano = prova({ nemici: [lanciere(1, 0)] });
  const bosco = calcola(b, u("giova"), nemico()), aperto = calcola(piano.b, piano.u("giova"), piano.nemico());
  assert.equal(bosco.danno, aperto.danno - 1);
  assert.equal(aperto.precisione - bosco.precisione, 20);
});

test("lo stocco triplica la potenza contro i corazzati, l'arco contro chi vola", () => {
  const { b, u, nemico } = prova({ posizioni: { lethy: [0, 0] }, nemici: [{ classe: "Corazzato", lv: 1, x: 1, y: 0 }, { classe: "Lanciere", lv: 1, x: 0, y: 1 }] });
  const corazzato = calcola(b, u("lethy"), nemico(0)), fante = calcola(b, u("lethy"), nemico(1));
  assert.equal(corazzato.efficace, true);
  assert.equal(corazzato.danno, 5 + 4 * 3 - 1 - 9);   // For 5 + stocco 4×3 - triangolo - Dif 9
  assert.equal(fante.efficace, false);
  const arco = prova({ nemici: [{ classe: "Arciere", lv: 1, x: 2, y: 0 }], ospiti: [{ id: "ala", classe: "Aeronauta", lv: 1, x: 0, y: 1, squadra: "alleato" }] });
  assert.equal(calcola(arco.b, arco.nemico(), arco.u("ala")).efficace, true);
});

test("doppio attacco con 4 punti di velocità in più; il guaritore non contrattacca", () => {
  const { b, u, nemico } = prova({ posizioni: { lethy: [0, 0], mars: [0, 1] }, nemici: [lanciere(1, 0), lanciere(1, 1)] });
  assert.equal(calcola(b, u("lethy"), nemico(0)).doppio, true);   // 11 contro 4
  assert.equal(previsione(b, nemico(1), u("mars")).contrattacco, false);
});

test("gittata: chi è a distanza non riceve il contrattacco di chi ha solo armi da mischia", () => {
  const { b, u, nemico } = prova({ posizioni: { wata: [0, 0] }, nemici: [lanciere(2, 0)] });
  const f = previsione(b, u("wata"), nemico());
  assert.equal(f.contrattacco, false);
  assert.equal(b.bersagli(u("wata")).length, 1);
  assert.equal(b.bersagli(nemico()).length, 0);
});

test("tiro con la media di due numeri: 30 e 90 fanno 60", () => {
  const con = (precisioneMinima) => {
    const tiri = [0.30, 0.90, 0.99, 0.99, 0.99, 0.99, 0.99];
    const { b, u, nemico } = prova({ nemici: [lanciere(1, 0, { stat: { hp: 40, for: 0, mag: 0, abi: 0, vel: precisioneMinima, fort: 0, def: 0, res: 0 }, classe: undefined, arma: "lancia" })], dado: dadoDa(() => tiri.shift() ?? 0.99) });
    return { fatti: scorri(b.attacca(u("giova"), nemico())), p: previsione(b, u("giova"), nemico()).A.precisione };
  };
  const facile = con(10), difficile = con(25);     // precisione 84% e 54%
  assert.ok(facile.p > 60 && difficile.p < 60);
  assert.equal(facile.fatti.find((f) => f.a?.id === "giova" && (f.tipo === "colpo" || f.tipo === "mancato")).tipo, "colpo");
  assert.equal(difficile.fatti.find((f) => f.a?.id === "giova" && (f.tipo === "colpo" || f.tipo === "mancato")).tipo, "mancato");
});

test("il critico triplica il danno", () => {
  const { b, u, nemico } = prova({ nemici: [lanciere(1, 0)], dado: dadoFisso(0) });
  const atteso = previsione(b, u("giova"), nemico()).A.danno;
  const colpo = scorri(b.attacca(u("giova"), nemico())).find((f) => f.tipo === "colpo");
  assert.equal(colpo.critico, true);
  assert.equal(colpo.danno, atteso * 3);
});

test("movimento: il bosco costa 2 alla fanteria e 3 alla corazza; chi vola passa sull'acqua", () => {
  const mappa = ["..f....", "..f.w..", "..f...."];
  const { b, u } = prova({ mappa, posizioni: { giova: [0, 1] }, ospiti: [
    { id: "pesante", classe: "Corazzato", lv: 1, x: 0, y: 0, squadra: "alleato" },
    { id: "ala", classe: "Aeronauta", lv: 1, x: 0, y: 2, squadra: "alleato" }] });
  const fante = raggiungibili(b, u("giova")), corazza = raggiungibili(b, u("pesante")), volo = raggiungibili(b, u("ala"));
  assert.ok(ha(fante, 2, 1) && ha(fante, 3, 1) && !ha(fante, 4, 1) && !ha(fante, 5, 1));  // mov 5: 1+2+1 = 4, poi c'è l'acqua
  assert.ok(ha(corazza, 2, 0) && !ha(corazza, 3, 0));                                      // mov 4: 1 + 3 = 4, il bosco lo ferma lì
  assert.ok(ha(volo, 4, 1) && ha(volo, 6, 2));
});

test("movimento: i nemici bloccano il passo, i compagni no (ma non ci si ferma sopra)", () => {
  const { b, u } = prova({ mappa: ["XXXXX", ".....", "XXXXX"], posizioni: { giova: [0, 1], lethy: [1, 1] }, nemici: [lanciere(3, 1)] });
  const r = raggiungibili(b, u("giova"));
  assert.ok(ha(r, 2, 1) && !ha(r, 1, 1) && !ha(r, 3, 1) && !ha(r, 4, 1));
});

test("distanze a piedi: aggirano i muri", () => {
  const { b } = prova({ mappa: [".X.", ".X.", "..."], posizioni: { giova: [0, 0] } });
  assert.equal(campoDistanze(b, "fanteria", [{ x: 2, y: 0 }]).get(chiave(0, 0)), 6);
});

test("esperienza: 10 per uno scontro, 30 per una sconfitta, +50% per Mars, livello a 100", () => {
  const { b, u, nemico } = prova({ nemici: [lanciere(1, 0)], dado: dadoFisso(0.5) });
  const pe = scorri(b.attacca(u("giova"), nemico())).find((f) => f.tipo === "pe");
  assert.equal(pe.quanti, 10);
  const due = prova({ nemici: [lanciere(1, 0, { stat: { hp: 1, for: 0, mag: 0, abi: 0, vel: 0, fort: 0, def: 0, res: 0 } })], dado: dadoFisso(0.5) });
  due.u("giova").pe = 80;
  const fatti = scorri(due.b.attacca(due.u("giova"), due.nemico()));
  assert.equal(fatti.find((f) => f.tipo === "pe").quanti, 30);
  assert.ok(fatti.some((f) => f.tipo === "livello"));
  assert.equal(due.u("giova").lv, 2);
  assert.equal(due.u("giova").pe, 10);
  const tre = prova({ posizioni: { mars: [0, 0], giova: [1, 0] }, nemici: [lanciere(4, 2)] });
  tre.u("giova").pv = 5;
  assert.equal(scorri(tre.b.cura(tre.u("mars"), tre.u("giova"))).find((f) => f.tipo === "pe").quanti, 30);
  assert.equal(tre.u("giova").pv, 5 + 10 + 6);   // elisir 10 + Mag 6
});

test("livello massimo: 20 per le classi base, 30 dopo la promozione", () => {
  const debole = { stat: { hp: 1, for: 0, mag: 0, abi: 0, vel: 0, fort: 0, def: 0, res: 0 } };
  const base = prova({ nemici: [lanciere(1, 0, debole)] });
  Object.assign(base.u("giova"), { lv: 20, pe: 90 });
  scorri(base.b.attacca(base.u("giova"), base.nemico()));
  assert.deepEqual([base.u("giova").lv, base.u("giova").pe], [20, 0]);
  const promosso = prova({ nemici: [lanciere(1, 0, debole)] });
  Object.assign(promosso.u("giova"), { lv: 20, pe: 90, promo: 0 });
  scorri(promosso.b.attacca(promosso.u("giova"), promosso.nemico()));
  assert.equal(promosso.u("giova").lv, 21);
});

test("obiettivi: comandante, tutti, resisti, raggiungi, proteggi, caduta del capo", () => {
  const debole = { stat: { hp: 1, for: 0, mag: 0, abi: 0, vel: 0, fort: 0, def: 0, res: 0 } };
  const fine = (fatti) => fatti.find((f) => f.tipo === "fine");
  let t = prova({ obiettivo: { tipo: "comandante" }, nemici: [lanciere(1, 0, { ...debole, comandante: true }), lanciere(4, 2)] });
  assert.equal(fine(scorri(t.b.attacca(t.u("giova"), t.nemico()))).vittoria, true);
  t = prova({ obiettivo: { tipo: "tutti" }, nemici: [lanciere(1, 0, debole)], eventi: [{ turno: 3, fase: "nemico", rinforzi: [lanciere(4, 2)] }] });
  assert.equal(fine(scorri(t.b.attacca(t.u("giova"), t.nemico()))), undefined, "con rinforzi in arrivo non è ancora finita");
  t = prova({ obiettivo: { tipo: "resisti", turni: 2 }, nemici: [lanciere(4, 2, { ia: "fermo" })] });
  assert.equal(fine(scorri(t.b.fineFaseGiocatore())), undefined);
  assert.equal(fine(scorri(t.b.fineFaseGiocatore())).vittoria, true);
  t = prova({ obiettivo: { tipo: "raggiungi", casella: [2, 0], limite: 1 }, nemici: [lanciere(4, 2, { ia: "fermo" })] });
  t.u("giova").x = 2;
  assert.equal(fine(scorri(t.b.attendi(t.u("giova")))).vittoria, true);
  t = prova({ obiettivo: { tipo: "raggiungi", casella: [2, 0], limite: 1 }, nemici: [lanciere(4, 2, { ia: "fermo" })] });
  assert.equal(fine(scorri(t.b.fineFaseGiocatore())).vittoria, false);
  const forte = { stat: { hp: 30, for: 50, mag: 0, abi: 30, vel: 30, fort: 0, def: 0, res: 0 } };
  t = prova({ obiettivo: { tipo: "resisti", turni: 5, proteggi: "amica" }, posizioni: { giova: [0, 2] }, ospiti: [{ id: "amica", classe: "Medico", lv: 1, x: 3, y: 0, squadra: "alleato", ospite: true }], nemici: [lanciere(4, 0, forte)] });
  assert.equal(fine(scorri(t.b.fineFaseGiocatore())).vittoria, false);
  t = prova({ nemici: [lanciere(1, 0, forte)] });
  const f = fine(scorri(t.b.fineFaseGiocatore()));
  assert.equal(f.vittoria, false);
  assert.match(f.motivo, /Giova/);
});

test("eventi: i rinforzi arrivano al turno giusto e non finiscono sopra un'altra unità", () => {
  const t = prova({ obiettivo: { tipo: "resisti", turni: 9 }, nemici: [lanciere(4, 2, { ia: "fermo" })], eventi: [{ turno: 2, fase: "giocatore", rinforzi: [lanciere(4, 2), lanciere(4, 2)] }] });
  const fatti = scorri(t.b.fineFaseGiocatore());
  assert.equal(fatti.find((f) => f.tipo === "rinforzi").unita.length, 2);
  const posti = t.b.vivi("nemico").map((e) => chiave(e.x, e.y));
  assert.equal(new Set(posti).size, 3);
});

test("terreno che cura: 10% dei PV a inizio fase", () => {
  const t = prova({ mappa: ["F....", "....."], obiettivo: { tipo: "resisti", turni: 9 }, nemici: [lanciere(4, 1, { ia: "fermo" })] });
  t.u("giova").pv = 10;
  scorri(t.b.fineFaseGiocatore());
  assert.equal(t.u("giova").pv, 13);   // 22 PV massimi → +3
});

test("il dado a seme ripete la stessa sequenza", () => {
  const a = creaDado(42), b = creaDado(42), c = creaDado(43);
  const sa = [a.casuale(), a.casuale(), a.casuale()], sb = [b.casuale(), b.casuale(), b.casuale()];
  assert.deepEqual(sa, sb);
  assert.notEqual(sa[0], c.casuale());
  assert.ok(sa.every((n) => n >= 0 && n < 1));
});

test("percorso: passo dopo passo, aggirando muri e nemici", async () => {
  const { percorso } = await import("../js/motore/movimento.js");
  const { b, u } = prova({ mappa: ["..X..", ".....", "..X.."], posizioni: { giova: [0, 0] }, nemici: [{ classe: "Lanciere", lv: 1, x: 2, y: 1, ia: "fermo" }, { classe: "Lanciere", lv: 1, x: 4, y: 2, ia: "fermo" }] });
  const g = u("giova");
  assert.deepEqual(percorso(b, g, 0, 0, 1, 1), [{ x: 1, y: 0 }, { x: 1, y: 1 }]);
  const lungo = percorso(b, g, 0, 0, 1, 2);
  assert.equal(lungo.length, 3);
  assert.deepEqual(lungo.at(-1), { x: 1, y: 2 });
  for (let i = 1; i < lungo.length; i++) assert.equal(Math.abs(lungo[i].x - lungo[i - 1].x) + Math.abs(lungo[i].y - lungo[i - 1].y), 1);
  assert.deepEqual(percorso(b, g, 0, 0, 0, 0), [{ x: 0, y: 0 }]);
});
