import test from "node:test";
import assert from "node:assert/strict";
import { dati } from "./aiuti.js";
import { nuovaPartita, aggiornaCompagnia, componiEpilogo, storiaCompiuta } from "../js/motore/campagna.js";

const partita = (rotta) => { const p = nuovaPartita(dati); p.bandiere.rotta = rotta; aggiornaCompagnia(dati, p, "c20" + rotta[0]); return p; };
const AMICI = ["diego", "francine", "fasty", "giorgio"];
const nomi = (E) => E.pagine.map((x) => x.chi.join("+")).filter((n) => !AMICI.includes(n));

test("ogni rotta ha il suo finale e l'ultimo capitolo chiude la storia", () => {
  for (const rotta of ["corona", "radici", "libere"]) {
    const p = partita(rotta), E = componiEpilogo(dati, p);
    assert.ok(E.rotta.length >= 4, rotta);
    assert.ok(dati.capitoli["c20" + rotta[0]].finale, rotta);
    assert.equal(storiaCompiuta(dati, p), false);
    p.completati.push("c20" + rotta[0]);
    assert.equal(storiaCompiuta(dati, p), true);
  }
  assert.notDeepEqual(componiEpilogo(dati, partita("corona")).rotta, componiEpilogo(dati, partita("radici")).rotta);
});

test("senza supporti ognuno ha la sua pagina, nell'ordine della Compagnia", () => {
  assert.deepEqual(nomi(componiEpilogo(dati, partita("corona"))), ["giova", "lethy", "wata", "mars", "nives", "tullo", "ferrante"]);
  assert.deepEqual(nomi(componiEpilogo(dati, partita("libere"))).at(-1), "brann");
});

test("due personaggi con il supporto A condividono la pagina, e ognuno compare una volta sola", () => {
  const p = partita("radici");
  p.supporti["giova|wata"] = { punti: 60, livello: "A" };
  p.supporti["maelis|wata"] = { punti: 60, livello: "A" };   // Wata è già con Giova: Maelis resta da sola
  p.supporti["lethy|nives"] = { punti: 60, livello: "A" };
  p.supporti["mars|tullo"] = { punti: 32, livello: "B" };     // B non basta
  const E = componiEpilogo(dati, p);
  assert.deepEqual(nomi(E), ["giova+wata", "lethy+nives", "mars", "tullo", "maelis"]);
  const tutti = E.pagine.flatMap((x) => x.chi);
  assert.equal(new Set(tutti).size, tutti.length);
  assert.equal(tutti.length, 11);
  assert.match(E.pagine[0].testo, /Prospy/);
});

test("ogni personaggio e ogni coppia con supporti ha un epilogo scritto", () => {
  for (const id of dati.personaggi.ordine) assert.ok(dati.epilogo.personaggi[id]?.length > 40, id);
  const scritte = new Set(dati.epilogo.coppie.map((c) => [...c.coppia].sort().join("|")));
  for (const c of dati.coppie) assert.ok(scritte.has([...c].sort().join("|")), c.join("-"));
});

test("provare un'altra rotta: la copia torna al bivio con i livelli raggiunti, senza chi era entrato dopo", async () => {
  const { tornaAllaScelta, capitoloDopo } = await import("../js/motore/campagna.js");
  const p = partita("corona");
  p.completati = dati.campagna.capitoli.filter((id) => !dati.capitoli[id].rotta || dati.capitoli[id].rotta === "corona");
  p.prossimo = null; p.compagnia.giova.lv = 25; p.compagnia.nives.oggetti = [{ id: "tonico", q: 3 }];
  const c = tornaAllaScelta(dati, p);
  assert.equal(c.prossimo, "c12");
  assert.equal(c.bandiere.rotta, undefined);
  assert.equal(c.compagnia.giova.lv, 25);
  assert.deepEqual(Object.keys(c.compagnia).sort(), ["diego", "fasty", "francine", "giorgio", "giova", "lethy", "mars", "wata"], "gli amici entrati prima del bivio restano");
  assert.ok(!c.completati.includes("c12") && !c.completati.includes("c14c") && c.completati.includes("c11"));
  assert.equal(c.deposito.oggetti.find((o) => o.id === "tonico").q >= 3, true);
  assert.equal(p.bandiere.rotta, "corona", "la partita originale non cambia");
  c.bandiere.rotta = "radici";
  assert.equal(capitoloDopo(dati, c, "c12"), "c13r");
});
