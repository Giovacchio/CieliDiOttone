// Collaudo nel browser (richiede Playwright): apre il gioco su PC e su telefono, gioca qualche mossa
// con i comandi veri (clic, menu, Esc, tasto destro) e salva gli screenshot in strumenti/schermate/.
// Uso: node strumenti/collauda.js
import { createRequire } from "node:module";
import { spawn } from "node:child_process";
import { mkdirSync } from "node:fs";
import path from "node:path";
import { RADICE } from "./dati_node.js";

const require = createRequire(import.meta.url);
let chromium;
try { ({ chromium } = require("playwright")); } catch { ({ chromium } = require((process.env.NODE_PATH || "/usr/local/lib/node_modules").split(":")[0] + "/playwright")); }
const PORTA = 8137, dove = path.join(RADICE, "strumenti/schermate");
mkdirSync(dove, { recursive: true });
const server = spawn(process.execPath, [path.join(RADICE, "strumenti/servi.js"), PORTA], { stdio: "ignore" });
await new Promise((r) => setTimeout(r, 500));
const browser = await chromium.launch();
const errori = [];
let problemi = 0;
const nota = (ok, cosa) => { if (!ok) problemi++; console.log((ok ? "  ok  " : "  NO  ") + cosa); };

for (const [nome, viewport, tocco] of [["pc", { width: 1280, height: 800 }, false], ["telefono", { width: 390, height: 844 }, true]]) {
  console.log(nome);
  const contesto = await browser.newContext({ viewport, hasTouch: tocco, isMobile: tocco });
  const p = await contesto.newPage();
  p.on("pageerror", (e) => errori.push(`${nome}: ${e.message}`));
  p.on("console", (m) => { if (m.type() === "error" && !/Failed to load resource|ERR_/.test(m.text())) errori.push(`${nome} console: ${m.text()}`); });
  await p.route("**/*", (r) => r.request().url().includes("localhost") ? r.continue() : r.abort());
  await p.goto(`http://localhost:${PORTA}/`);
  await p.waitForSelector("#tNew", { timeout: 8000 });
  const foto = (n) => p.screenshot({ path: path.join(dove, `${nome}_${n}.png`) });
  await foto("1_titolo");
  await p.evaluate(() => { localStorage.clear(); });
  await p.click("#tNew");
  await p.waitForSelector("#dlg"); await foto("2_dialogo");
  await p.keyboard.press("Escape");
  await p.waitForFunction(() => !document.querySelector(".banner") && !window.__cdo.occupato, null, { timeout: 8000 });
  const stato = () => p.evaluate(() => { const G = window.__cdo; return { lato: G.lato, modo: G.modo, turno: G.b.turno, fase: G.b.fase, giova: (({ x, y, agito, pv }) => ({ x, y, agito, pv }))(G.b.trova("giova")) }; });
  const tocca = async (x, y) => { const s = await stato(), r = await p.locator("#board").boundingBox(); await p.mouse.click(r.x + (x + .5) * s.lato, r.y + (y + .5) * s.lato); await p.waitForTimeout(250); };
  const s0 = await stato();
  nota(s0.lato >= (tocco ? 34 : 22), `caselle da ${s0.lato}px`);
  await p.locator("#board").scrollIntoViewIfNeeded();
  await tocca(s0.giova.x, s0.giova.y);
  nota((await stato()).modo === "scelta", "selezione con caselle blu"); await foto("3_selezione");
  await tocca(s0.giova.x + 2, s0.giova.y);
  nota(await p.locator(".menu").count() === 1, "menu delle azioni"); await foto("4_menu");
  await p.keyboard.press("Escape");
  let s = await stato();
  nota(s.modo === "scelta" && s.giova.x === s0.giova.x, "Esc riporta l'unità al punto di partenza");
  await p.locator("#board").click({ button: "right", position: { x: 5, y: 5 } });
  nota((await stato()).modo === "riposo", "tasto destro annulla la selezione");
  // porta un nemico accanto a Giova per provare previsione e attacco
  const nemico = await p.evaluate(() => { const G = window.__cdo, g = G.b.trova("giova"), e = G.b.vivi("nemico")[0]; e.x = g.x + 1; e.y = g.y; return { x: e.x, y: e.y }; });
  await tocca(s0.giova.x, s0.giova.y); await tocca(s0.giova.x, s0.giova.y);
  await p.locator(".menu button", { hasText: "Attacca" }).click(); await p.waitForTimeout(200);
  await tocca(nemico.x, nemico.y);
  nota(await p.locator(".forecast").count() === 1, "previsione del combattimento"); await foto("5_previsione");
  await p.click("#fcOk");
  for (let i = 0; i < 40; i++) { if (await p.locator("#lvok").count()) await p.click("#lvok"); if (!(await p.evaluate(() => window.__cdo.occupato))) break; await p.waitForTimeout(150); }
  nota((await stato()).giova.agito, "attacco eseguito");
  await p.click("#bDanger"); await foto("6_zone_nemiche");
  await p.click("#bEnd");
  await p.waitForFunction(() => { const G = window.__cdo; if (document.querySelector("#lvok")) document.querySelector("#lvok").click(); if (document.querySelector("#dlg")) document.querySelector("#dlg").click(); return G.chiusa || (G.b.turno === 2 && G.b.fase === "giocatore" && !G.occupato); }, null, { timeout: 30000, polling: 100 });
  nota(true, "fase nemica e ritorno al giocatore"); await foto("7_turno2");
  // accampamento: si conclude il capitolo "a mano" e si apre ogni scheda
  await p.evaluate(async () => {
    const G = window.__cdo, { concludiCapitolo } = await import("./js/motore/campagna.js"), { accampamento } = await import("./js/interfaccia/schermate.js");
    concludiCapitolo(G.dati, G.partita, G.b); G.partita.supporti["giova|wata"] = { punti: 12, livello: "" };
    G.partita.compagnia.giova.lv = 10; G.partita.compagnia.giova.oggetti.push({ id: "sigillo", q: 1 }); G.chiusa = true; accampamento();
  });
  await foto("8_accampamento");
  for (const t of ["sup", "cuc", "dia", "comp"]) { await p.click(`.tab[data-t="${t}"]`); await p.waitForTimeout(100); await foto("9_scheda_" + t); }
  nota(await p.locator(".pbtn").count() === 2, "due strade di promozione");
  await p.click(".pbtn"); nota(await p.evaluate(() => window.__cdo.partita.compagnia.giova.promo === 0), "promozione");
  await p.click('.tab[data-t="sup"]'); await p.click(".sread"); await p.waitForSelector("#dlg"); await p.keyboard.press("Escape"); await p.waitForTimeout(150);
  nota(await p.evaluate(() => window.__cdo.partita.supporti["giova|wata"].livello === "C"), "supporto C letto");
  await p.click("#goNext"); await p.waitForSelector("#dlg"); await p.keyboard.press("Escape");
  await p.waitForFunction(() => !document.querySelector(".banner") && !window.__cdo.occupato);
  nota(await p.evaluate(() => window.__cdo.b.cap.id === "c1"), "capitolo successivo"); await foto("10_capitolo1");
  await contesto.close();
}
await browser.close(); server.kill();
console.log(errori.length ? "ERRORI:\n" + errori.join("\n") : "nessun errore JavaScript");
process.exit(errori.length || problemi ? 1 : 0);
