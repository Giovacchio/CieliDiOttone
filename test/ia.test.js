import test from "node:test";
import assert from "node:assert/strict";
import { prova, scorri, dadoFisso } from "./aiuti.js";
import { caselleMinacciate, chiave } from "../js/motore/movimento.js";

const stat = (o = {}) => ({ hp: 20, for: 8, mag: 0, abi: 8, vel: 5, fort: 0, def: 4, res: 2, ...o });
const soldato = (x, y, o = {}) => ({ classe: "Lanciere", lv: 1, x, y, ia: "attacca", ...o });
const turnoNemico = (t) => scorri(t.b.fineFaseGiocatore());
const resisti = { tipo: "resisti", turni: 20 };

for (const ia of ["classica", "tattica"]) {
  test(`${ia}: "fermo" non si muove, "portata" aspetta, "attacca" avanza, "sveglia" fa partire`, () => {
    const t = prova({ ia, mappa: ["..........", ".........."], obiettivo: resisti, posizioni: { giova: [0, 0] },
      nemici: [soldato(9, 0, { ia: "fermo" }), soldato(9, 1, { ia: "portata", sveglia: 2 }), soldato(8, 1)] });
    const [fermo, portata, avanti] = t.b.vivi("nemico");
    turnoNemico(t);
    assert.deepEqual([fermo.x, portata.x], [9, 9]);
    assert.ok(avanti.x < 8);
    turnoNemico(t);
    assert.ok(portata.x < 9, "dal turno 2 avanza anche lui");
    assert.equal(fermo.x, 9);
  });
  test(`${ia}: un nemico "fermo" colpisce chi gli arriva a tiro e il guaritore cura`, () => {
    const t = prova({ ia, obiettivo: resisti, posizioni: { giova: [1, 0] }, dado: dadoFisso(0.5),
      nemici: [soldato(2, 0, { ia: "fermo" }), { classe: "Medico", lv: 1, x: 3, y: 1, ia: "attacca" }] });
    t.nemico(0).pv = 12;
    const fatti = turnoNemico(t);
    assert.ok(fatti.some((f) => f.tipo === "colpo" && f.d.id === "giova"));
    assert.ok(fatti.some((f) => f.tipo === "cura" && f.t === t.nemico(0)));
  });
}

test("tattica: tra due bersagli sceglie il guaritore", () => {
  const t = prova({ ia: "tattica", obiettivo: resisti, posizioni: { lethy: [2, 0], mars: [2, 2] }, ospiti: [{ id: "capo", capo: true, classe: "Corazzato", lv: 5, x: 0, y: 1, squadra: "alleato" }],
    nemici: [soldato(4, 1, { stat: stat(), arma: "spada" })], dado: dadoFisso(0.99) });
  const fatti = turnoNemico(t);
  assert.equal(fatti.find((f) => f.tipo === "assalto").d.id, "mars");
});

test("tattica: finisce chi è già ferito invece di graffiare chi è sano", () => {
  const t = prova({ ia: "tattica", obiettivo: resisti, posizioni: { giova: [0, 2], lethy: [2, 0], wata: [2, 2] }, nemici: [soldato(4, 1, { stat: stat(), arma: "arco" })], dado: dadoFisso(0.99) });
  t.u("lethy").pv = 3;
  assert.equal(turnoNemico(t).find((f) => f.tipo === "assalto").d.id, "lethy");
});

test("tattica: non si butta su un contrattacco che la ucciderebbe, se può colpire da lontano", () => {
  const t = prova({ ia: "tattica", mappa: ["......", "......", "......"], obiettivo: resisti, posizioni: { giova: [0, 1] },
    nemici: [soldato(3, 1, { stat: stat({ hp: 4 }), arma: "fiala" })], dado: dadoFisso(0.99) });
  const fatti = turnoNemico(t), e = t.nemico();
  assert.ok(fatti.some((f) => f.tipo === "assalto"));
  assert.equal(Math.abs(e.x - 0) + Math.abs(e.y - 1), 2, "attacca da due caselle, dove la spada non arriva");
});

test("tattica: chi è ridotto male si ritira verso il guaritore invece di attaccare", () => {
  const mappa = ["..........", "..........", ".........."];
  const nemici = [soldato(3, 1, { stat: stat({ hp: 20 }), arma: "spada" }), { classe: "Medico", lv: 1, x: 9, y: 1, ia: "portata" }];
  const t = prova({ ia: "tattica", mappa, obiettivo: resisti, posizioni: { giova: [1, 1] }, nemici, dado: dadoFisso(0.99) });
  t.nemico(0).pv = 4;
  const fatti = turnoNemico(t);
  assert.ok(fatti.some((f) => f.tipo === "ritirata"));
  assert.ok(!fatti.some((f) => f.tipo === "assalto"));
  assert.ok(t.nemico(0).x > 3);
  // senza guaritori né terreno che cura non c'è dove andare: combatte
  const solo = prova({ ia: "tattica", mappa, obiettivo: resisti, posizioni: { giova: [1, 1] }, nemici: [nemici[0]], dado: dadoFisso(0.99) });
  solo.nemico(0).pv = 4;
  assert.ok(turnoNemico(solo).some((f) => f.tipo === "assalto"));
  // il comandante non si ritira mai
  const boss = prova({ ia: "tattica", mappa, obiettivo: resisti, posizioni: { giova: [1, 1] }, nemici: [{ ...nemici[0], comandante: true }, nemici[1]], dado: dadoFisso(0.99) });
  boss.nemico(0).pv = 4;
  assert.ok(turnoNemico(boss).some((f) => f.tipo === "assalto"));
});

test("tattica: chi è avanti da solo aspetta i compagni al limite della zona pericolosa, ma non per sempre", () => {
  const riga = "....................";
  const t = prova({ ia: "tattica", mappa: [riga, riga, riga], obiettivo: resisti, posizioni: { giova: [0, 1], lethy: [0, 0], wata: [0, 2] },
    nemici: [soldato(9, 1, { stat: stat(), arma: "spada" }), soldato(19, 1, { stat: stat({ }), arma: "spada", mov: 2 })], dado: dadoFisso(0.99) });
  const avanti = t.nemico(0);
  turnoNemico(t);
  const colpibile = () => t.b.vivi("alleato").some((u) => caselleMinacciate(t.b, u).has(chiave(avanti.x, avanti.y)));
  assert.equal(colpibile(), false, "resta fuori tiro mentre il compagno arriva");
  turnoNemico(t); turnoNemico(t);
  assert.equal(colpibile(), true, "dopo due turni di attesa avanza comunque");
});

test("tattica: il guaritore cura da lontano se l'arma lo permette, sceglie chi sta peggio e segue il gruppo", () => {
  const riga = "............";
  const medico = { stat: stat({ mag: 4 }), arma: "elisirF", x: 8, y: 1, lv: 1, ia: "attacca", nome: "Medica" };
  const t = prova({ ia: "tattica", mappa: [riga, riga, riga], obiettivo: resisti, posizioni: { giova: [0, 1] },
    nemici: [soldato(4, 0, { ia: "fermo", stat: stat() }), soldato(4, 2, { ia: "fermo", stat: stat() }), medico], dado: dadoFisso(0.99) });
  t.nemico(0).pv = 15; t.nemico(1).pv = 6;
  const cura = turnoNemico(t).find((f) => f.tipo === "cura");
  assert.equal(cura.t, t.nemico(1));
  const m = t.nemico(2);
  assert.equal(Math.abs(m.x - 4) + Math.abs(m.y - 2), 2, "cura da due caselle, senza mettersi in prima linea");
  const segue = prova({ ia: "tattica", mappa: [riga, riga, riga], obiettivo: resisti, posizioni: { giova: [0, 1] }, nemici: [soldato(5, 1, { ia: "fermo", stat: stat() }), { ...medico, x: 11 }] });
  turnoNemico(segue);
  assert.ok(segue.nemico(1).x < 11, "senza feriti si avvicina ai compagni");
});
