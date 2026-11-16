// Controlla tutti i file di dati/: classi, armi, mappe, unità, dialoghi.
// Uso: node strumenti/controlla_dati.js
import { datiDaDisco } from "./dati_node.js";
import { controllaDati } from "../js/dati.js";
import { Battaglia } from "../js/motore/battaglia.js";
import { nuovaPartita } from "../js/motore/campagna.js";
import { campoDistanze, chiave } from "../js/motore/movimento.js";

const dati = await datiDaDisco();
const errori = controllaDati(dati);
// raggiungibilità: dal capo si deve poter arrivare a piedi all'obiettivo e a ogni nemico che non vola
for (const id of dati.campagna.capitoli) {
  if (errori.some((e) => e.includes(`"${id}"`))) continue;
  const p = nuovaPartita(dati), b = new Battaglia({ dati, capitolo: dati.capitoli[id], compagnia: p.compagnia });
  const capo = b.capo(), D = campoDistanze(b, "fanteria", [capo]), g = b.cap.obiettivo;
  if (g.casella && !D.has(chiave(...g.casella))) errori.push(`capitolo "${id}": l'obiettivo non è raggiungibile a piedi`);
  for (const e of b.vivi("nemico")) if (!D.has(chiave(e.x, e.y))) errori.push(`capitolo "${id}": nemico irraggiungibile a piedi: ${e.nome} (${e.x},${e.y})`);
}
if (errori.length) { console.log(errori.join("\n")); console.log(`\n${errori.length} problemi.`); process.exit(1); }
console.log(`Dati a posto: ${dati.campagna.capitoli.length} capitoli, ${dati.coppie.length} coppie di supporto.`);
