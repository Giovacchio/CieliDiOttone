// Punto di partenza: carica i dati, li controlla e apre il titolo.
import { caricaDati, leggiDalWeb, controllaDati } from "./dati.js";
import { G, h, velo } from "./interfaccia/stato.js";
import { collegaComandi } from "./interfaccia/battaglia.js";
import { titolo } from "./interfaccia/schermate.js";
import { leggiPreferenza, scriviPreferenza } from "./salvataggi.js";

function mostraErrori(errori) {
  velo(`<div class="errori" role="alert"><h2>C'è un problema nei dati del gioco</h2>
    <p class="muted">Il gioco non parte finché questi punti non sono sistemati nei file della cartella <b>dati/</b>.</p>
    <ul>${errori.slice(0, 40).map((e) => `<li>${h(e)}</li>`).join("")}</ul>
    ${errori.length > 40 ? `<p class="muted">…e altri ${errori.length - 40}.</p>` : ""}</div>`, true);
}

try {
  G.dati = await caricaDati(leggiDalWeb());
  const errori = controllaDati(G.dati);
  if (errori.length) mostraErrori(errori);
  else {
    collegaComandi({ alTitolo: titolo, velocita: leggiPreferenza("fast") === "1", cambiaVelocita: (si) => scriviPreferenza("fast", si ? "1" : "0") });
    titolo();
  }
} catch (e) {
  console.error(e);
  mostraErrori([location.protocol === "file:"
    ? "Il gioco non funziona aprendo il file con un doppio clic: va aperto dal suo indirizzo web (GitHub Pages)."
    : (e && e.message) || String(e)]);
}
window.__cdo = G; // per i collaudi automatici
