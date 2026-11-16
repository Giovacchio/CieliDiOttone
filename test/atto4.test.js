import test from "node:test";
import assert from "node:assert/strict";
import { dati } from "./aiuti.js";
import { nuovaPartita, aggiornaCompagnia, capitoloDopo } from "../js/motore/campagna.js";
import { Battaglia } from "../js/motore/battaglia.js";
import { simulaCampagna } from "../strumenti/simula_campagna.js";
import { creaDado } from "../js/motore/dado.js";

const membri = (p) => Object.keys(p.compagnia).sort().join(",");

test("i nuovi personaggi entrano al capitolo 14, ognuno sulla sua rotta", () => {
  const inizio = nuovaPartita(dati);
  assert.equal(membri(inizio), "giova,lethy,mars,wata", "all'inizio la Compagnia è di quattro");
  for (const [rotta, terzo] of [["corona", "ferrante"], ["radici", "maelis"], ["libere", "brann"]]) {
    const p = nuovaPartita(dati);
    p.bandiere.rotta = rotta;
    aggiornaCompagnia(dati, p, "c13" + rotta[0]);
    assert.equal(membri(p), "giova,lethy,mars,wata", `${rotta}: al capitolo 13 nessuno è ancora arrivato`);
    aggiornaCompagnia(dati, p, capitoloDopo(dati, p, "c13" + rotta[0]));
    assert.equal(membri(p), ["giova", "lethy", "mars", "wata", "nives", "tullo", terzo].sort().join(","), rotta);
    assert.equal(p.compagnia.nives.lv, 13);
    if (terzo === "maelis") assert.deepEqual(p.compagnia.maelis.armi, ["giudizio", "kit"]);
  }
});

test("ogni capitolo dell'Atto IV schiera tutti e sette, e un ospite già arruolato non compare due volte", () => {
  const p = nuovaPartita(dati);
  p.bandiere.rotta = "corona";
  aggiornaCompagnia(dati, p, "c14c");
  for (const id of ["c14c", "c15c", "c16c", "c17c"]) {
    const b = new Battaglia({ dati, capitolo: dati.capitoli[id], compagnia: p.compagnia });
    assert.equal(b.unita.filter((u) => u.compagnia).length, 7, id);
  }
  const vecchio = new Battaglia({ dati, capitolo: dati.capitoli.c13c, compagnia: p.compagnia });
  assert.equal(vecchio.unita.filter((u) => u.id === "ferrante").length, 1);
});

test("ogni nuovo personaggio ha due promozioni e almeno un filo di supporti completo", () => {
  for (const id of ["nives", "tullo", "ferrante", "maelis", "brann"]) {
    assert.equal(dati.promozioni[id].length, 2, id);
    const coppie = dati.coppie.filter((c) => c.includes(id));
    assert.ok(coppie.length >= 1, id);
    for (const [a, b] of coppie) for (const L of ["C", "B", "A"]) {
      const righe = dati.supporti[[a, b].sort().join("|")][L];
      assert.ok(righe.length >= 7 && righe.length <= 14, `${a}-${b} ${L}: ${righe.length} battute`);
      assert.ok(righe.every((r) => r[0] === a || r[0] === b), `${a}-${b} ${L}: parla qualcun altro`);
    }
  }
});

test("il bot, promuovendo, arriva alla fine dell'Atto IV su tutte e tre le rotte", () => {
  for (const rotta of ["corona", "radici", "libere"]) {
    let finite = 0;
    for (let s = 0; s < 8; s++) {
      const esito = simulaCampagna(dati, { dado: creaDado(900 + s), rotta, promuove: true }).esito;
      if (esito.at(-1).vinto && esito.at(-1).id === "c17" + rotta[0]) finite++;
    }
    assert.ok(finite >= 3, `${rotta}: solo ${finite} campagne su 8 arrivano al capitolo 17`);
  }
});
