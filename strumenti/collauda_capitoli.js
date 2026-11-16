// Collaudo lungo (richiede Playwright): gioca nel browser tutti i capitoli, uno dopo l'altro, con il bot che muove
// la Compagnia e l'interfaccia vera che racconta la fase nemica, i dialoghi, i livelli, la vittoria e l'accampamento.
// Serve a scovare errori che si vedono solo a schermo. La Compagnia è resa fortissima apposta: qui non si misura il bilanciamento.
// Uso: node strumenti/collauda_capitoli.js [telefono]
import { createRequire } from "node:module";
import { spawn } from "node:child_process";
import path from "node:path";
import { RADICE } from "./dati_node.js";

const require = createRequire(import.meta.url);
let chromium;
try { ({ chromium } = require("playwright")); } catch { ({ chromium } = require((process.env.NODE_PATH || "/usr/local/lib/node_modules").split(":")[0] + "/playwright")); }
const PORTA = 8138, telefono = process.argv[2] === "telefono";
const server = spawn(process.execPath, [path.join(RADICE, "strumenti/servi.js"), PORTA], { stdio: "ignore" });
await new Promise((r) => setTimeout(r, 500));
const browser = await chromium.launch();
const contesto = await browser.newContext(telefono ? { viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true } : { viewport: { width: 1280, height: 800 } });
const p = await contesto.newPage(), errori = [];
p.on("pageerror", (e) => errori.push(e.message + "\n" + (e.stack || "").split("\n").slice(0, 3).join("\n")));
p.on("dialog", (d) => d.accept());
await p.route("**/*", (r) => r.request().url().includes("localhost") ? r.continue() : r.abort());
await p.goto(`http://localhost:${PORTA}/`);
await p.waitForSelector("#mNuova");
const esito = await p.evaluate(async () => {
  const G = window.__cdo, { mossaBot } = await import("/strumenti/bot.js"), { campoDistanze } = await import("/js/motore/movimento.js");
  const UI = await import("/js/interfaccia/battaglia.js"), S = await import("/js/interfaccia/schermate.js"), C = await import("/js/motore/campagna.js");
  G.velocita = 0.02;
  const attesa = (ms) => new Promise((r) => setTimeout(r, ms));
  const clicca = setInterval(() => { for (const s of ["#dlg", "#lvok", "#prepVia", ".cartello"]) document.querySelector(s)?.click(); }, 15);
  const righe = [], tentativi = {};
  for (const rotta of ["corona", "radici", "libere"]) {
    G.partita = C.nuovaPartita(G.dati); G.slot = 3;
    for (const c of Object.values(G.partita.compagnia)) { c.lv = 15; for (const k of Object.keys(c.stat)) c.stat[k] += 14; c.stat.hp += 25; }
    let id = G.partita.prossimo;
    while (id) {
      if (rotta !== "corona" && !G.dati.capitoli[id].rotta && id !== "c12") { // i capitoli comuni si giocano una volta sola
        G.partita.completati.push(id); G.partita.prossimo = id = C.capitoloDopo(G.dati, G.partita, id); continue;
      }
      G.inBattaglia = true;
      const partenza = UI.giocaCapitolo(id);
      await partenza;
      const b = G.b, g = b.cap.obiettivo;
      const meta = g.tipo === "raggiungi" ? campoDistanze(b, "fanteria", [{ x: g.casella[0], y: g.casella[1] }]) : null;
      let giri = 0;
      while (!b.finita && giri++ < 40) {
        const ordine = b.vivi("alleato").sort((x, y) => (b.arma(x).cura != null ? 1 : 0) - (b.arma(y).cura != null ? 1 : 0) || (x.capo ? 1 : 0) - (y.capo ? 1 : 0) || (x.ospite ? 1 : 0) - (y.ospite ? 1 : 0));
        for (const u of ordine) { if (b.finita) break; mossaBot(b, u, meta); }
        UI.disegnaUnita();
        if (b.finita) { await UI.esegui((function* () {})()); break; }
        await UI.fineTurno();
        while (G.occupato) await attesa(10);
      }
      await attesa(60);
      const scelta = document.querySelector(`.opt[data-id="${rotta}"]`);
      if (scelta) { scelta.click(); await attesa(30); }
      const vinto = !!document.querySelector("#goCamp");
      righe.push(`${rotta} ${id}: ${vinto ? "vinto" : b.finita ? "PERSO (" + b.motivo + ")" : "NON FINITO"} in ${b.turno} turni`);
      if (!vinto) { // il bot ha perso: si prova la schermata di sconfitta e si riprova (fino a 5 volte)
        tentativi[id] = (tentativi[id] || 0) + 1;
        if (!document.querySelector("#again") || tentativi[id] >= 5) break;
        continue;
      }
      document.querySelector("#goCamp").click(); await attesa(20);
      if (b.cap.finale) { // epilogo: si sfogliano tutte le pagine fino ai titoli di coda
        let pagine = 0;
        for (let k = 0; k < 400 && !document.querySelector("#eCamp"); k++) { const e = document.querySelector(".epi"); if (e) { e.click(); pagine++; } await attesa(15); }
        righe.push(`${rotta} epilogo: ${document.querySelector("#eCamp") ? "vinto" : "NON FINITO"} (${pagine} pagine)`);
        document.querySelector("#eCamp")?.click(); await attesa(20);
      }
      for (const t of ["arm", "mer", "sup", "cuc", "dia", "comp"]) { document.querySelector(`.tab[data-t="${t}"]`).click(); await attesa(5); }
      id = G.partita.prossimo;
    }
  }
  clearInterval(clicca);
  return righe;
});
await browser.close(); server.kill();
console.log(esito.join("\n"));
console.log(errori.length ? "ERRORI:\n" + errori.join("\n") : "nessun errore JavaScript");
const fine = (rotta, ultimo) => esito.some((r) => r.startsWith(`${rotta} ${ultimo}: vinto`));
const complete = fine("corona", "c20c") && fine("radici", "c20r") && fine("libere", "c20l") && ["corona", "radici", "libere"].every((r) => esito.some((x) => x.startsWith(`${r} epilogo: vinto`)));
console.log(complete ? "tutte e tre le rotte giocate fino in fondo" : "ATTENZIONE: qualche rotta non è arrivata in fondo");
process.exit(errori.length || !complete ? 1 : 0);
