// Carica tutti i file JSON di dati/ e controlla che siano coerenti tra loro.
// "leggi" è una funzione che, dato un percorso relativo a dati/, restituisce l'oggetto JSON:
// nel browser usa fetch, nei test legge dal disco.
import { NON_SI_PASSA } from "./motore/movimento.js";
import { chiaveCoppia } from "./motore/supporti.js";

const FILE = ["campagna", "regole", "terreni", "armi", "oggetti", "classi", "aspetti", "icone", "personaggi", "png", "promozioni", "pasti", "mercato", "epilogo"];

export async function caricaDati(leggi) {
  const dati = {};
  await Promise.all(FILE.map(async (f) => { dati[f] = await leggi(f + ".json"); }));
  dati.capitoli = {};
  await Promise.all(dati.campagna.capitoli.map(async (id) => { dati.capitoli[id] = await leggi(`capitoli/${id}.json`); }));
  dati.supporti = {}; dati.coppie = [];
  await Promise.all(dati.campagna.supporti.map(async (nome, i) => {
    const s = await leggi(`supporti/${nome}.json`);
    dati.coppie[i] = s.coppia;
    dati.supporti[chiaveCoppia(...s.coppia)] = s;
  }));
  return dati;
}

export const leggiDalWeb = (base = "dati/") => async (percorso) => {
  let r;
  try { r = await fetch(base + percorso, { cache: "no-cache" }); }
  catch (e) { throw new Error(`Non riesco a scaricare dati/${percorso}: controlla la connessione e ricarica la pagina.`); }
  if (!r.ok) throw new Error(`Non trovo il file dati/${percorso}`);
  try { return await r.json(); } catch (e) { throw new Error(`Il file dati/${percorso} non è un JSON valido: ${e.message}`); }
};

// Controlli: restituisce una lista di frasi che descrivono ogni problema trovato (vuota = tutto a posto).
export function controllaDati(dati) {
  const E = [], err = (dove, cosa) => E.push(`${dove}: ${cosa}`);
  const movimenti = ["fanteria", "corazza", "cavallo", "volo"];
  const STAT = ["hp", "for", "mag", "abi", "vel", "fort", "def", "res"];
  const R = dati.regole;

  for (const [k, t] of Object.entries(dati.terreni)) {
    if (k.length !== 1) err(`terreni.json "${k}"`, "il simbolo di un terreno deve essere un solo carattere");
    for (const m of movimenti) if (typeof t.costo?.[m] !== "number") err(`terreni.json "${k}"`, `manca il costo per "${m}"`);
  }
  for (const [k, a] of Object.entries(dati.armi)) {
    const dove = `armi.json "${k}"`;
    if (!a.nome) err(dove, "manca il nome");
    if (!Array.isArray(a.gittata) || a.gittata.length !== 2) err(dove, "la gittata deve essere [minima, massima]");
    if (a.cura == null && (typeof a.potenza !== "number" || typeof a.precisione !== "number")) err(dove, "servono potenza e precisione (oppure cura)");
    if (a.efficace && !movimenti.includes(a.efficace)) err(dove, `"efficace" deve essere uno tra ${movimenti.join(", ")}`);
    if (a.icona && !dati.icone[a.icona]) err(dove, `l'icona "${a.icona}" non esiste in icone.json`);
  }
  const stat = (dove, st) => { for (const k of STAT) if (typeof st?.[k] !== "number") err(dove, `manca la statistica "${k}"`); };
  for (const [k, c] of Object.entries(dati.classi)) {
    const dove = `classi.json "${k}"`;
    stat(dove, c.stat);
    if (!dati.armi[c.arma]) err(dove, `l'arma "${c.arma}" non esiste`);
    if (!movimenti.includes(c.movimento)) err(dove, `movimento "${c.movimento}" sconosciuto`);
  }
  const effettiNoti = ["aura", "bonus", "esperienza", "curaVicini", "curaLarga"];
  const abilita = (dove, a) => { for (const e of a?.effetti || []) if (!effettiNoti.includes(e.tipo)) err(dove, `effetto "${e.tipo}" sconosciuto (validi: ${effettiNoti.join(", ")})`); };
  const aspetto = (dove, a) => {
    if (typeof a === "string" && !dati.aspetti.modelli[a]) err(dove, `l'aspetto "${a}" non esiste in aspetti.json`);
    if (a && typeof a === "object" && a.modello && !dati.aspetti.modelli[a.modello]) err(dove, `il modello "${a.modello}" non esiste in aspetti.json`);
  };
  const oggetti = (dove, l) => { for (const o of l || []) if (!dati.oggetti[o.id]) err(dove, `l'oggetto "${o.id}" non esiste`); };

  const ordine = dati.personaggi.ordine || [];
  for (const id of ordine) {
    const p = dati.personaggi[id], dove = `personaggi.json "${id}"`;
    if (!p) { err(dove, "è in \"ordine\" ma la scheda non c'è"); continue; }
    stat(dove, p.stat); stat(dove + " (crescita)", p.crescita);
    if (!dati.armi[p.arma]) err(dove, `l'arma "${p.arma}" non esiste`);
    else if (p.usa && !p.usa.includes(dati.armi[p.arma].tipo)) err(dove, `"usa" non comprende il tipo della sua arma (${dati.armi[p.arma].tipo})`);
    for (const c of [].concat(p.entra || [])) if (!dati.campagna.capitoli.includes(c)) err(dove, `"entra": il capitolo "${c}" non è in campagna.json`);
    if (!movimenti.includes(p.movimento)) err(dove, `movimento "${p.movimento}" sconosciuto`);
    abilita(dove, p.abilita); oggetti(dove, p.oggetti);
    for (const [k, P] of (dati.promozioni[id] || []).entries()) {
      const dp = `promozioni.json "${id}" strada ${k + 1}`;
      if (!P.classe) err(dp, "manca il nome della classe");
      if (P.arma && !dati.armi[P.arma]) err(dp, `l'arma "${P.arma}" non esiste`);
      if (P.movimento && !movimenti.includes(P.movimento)) err(dp, `movimento "${P.movimento}" sconosciuto`);
      abilita(dp, P.abilita);
    }
  }
  if (!ordine.some((id) => dati.personaggi[id]?.capo)) err("personaggi.json", "nessun personaggio ha \"capo\": true");
  for (const tipo of ["armi", "oggetti"]) for (const v of dati.mercato[tipo] || []) {
    if (!dati[tipo][v.id]) err("mercato.json", `"${v.id}" non esiste in ${tipo}.json`);
    if (typeof v.prezzo !== "number") err("mercato.json", `"${v.id}" non ha un prezzo`);
    if (v.da && !dati.campagna.capitoli.includes(v.da)) err("mercato.json", `"${v.id}": il capitolo "${v.da}" non è in campagna.json`);
  }
  for (const r of Object.keys(dati.epilogo.rotte || {})) if (!dati.campagna.rotte[r]) err("epilogo.json", `la rotta "${r}" non esiste in campagna.json`);
  for (const id of Object.keys(dati.epilogo.personaggi || {})) if (!dati.personaggi[id]) err("epilogo.json", `"${id}" non è un personaggio`);
  for (const c of dati.epilogo.coppie || []) if (!dati.supporti[chiaveCoppia(...c.coppia)]) err("epilogo.json", `la coppia ${c.coppia.join(" e ")} non ha supporti`);
  for (const [id, n] of Object.entries(dati.png)) aspetto(`png.json "${id}"`, n.aspetto);
  for (const [k, m] of Object.entries(dati.pasti)) if (m.richiede && !dati.supporti[chiaveCoppia(...m.richiede.coppia)]) err(`pasti.json "${k}"`, "la coppia richiesta non ha supporti");

  const chiParla = (dove, righe, presenti) => {
    for (const r of righe || []) {
      if (!Array.isArray(r) || typeof r[1] !== "string") { err(dove, "ogni battuta deve essere [\"chi\", \"testo\"]"); continue; }
      if (!dati.personaggi[r[0]] && !dati.png[r[0]] && !(presenti && presenti.has(r[0]))) err(dove, `parla "${r[0]}", che non è né un personaggio, né un png, né un'unità del capitolo`);
    }
  };
  for (const [k, s] of Object.entries(dati.supporti)) {
    for (const id of s.coppia) if (!dati.personaggi[id]) err(`supporti "${k}"`, `"${id}" non è un personaggio`);
    for (const L of R.supporti.livelli) { if (!s[L]) err(`supporti "${k}"`, `manca la conversazione ${L}`); chiParla(`supporti "${k}" ${L}`, s[L]); }
  }

  const tipi = ["comandante", "tutti", "resisti", "raggiungi"], ia = ["attacca", "portata", "fermo"];
  for (const id of dati.campagna.capitoli) {
    const C = dati.capitoli[id], dove = `capitolo "${id}"`;
    if (C.id !== id) err(dove, `dentro il file l'id è "${C.id}": deve essere uguale al nome del file`);
    if (C.rotta && !dati.campagna.rotte[C.rotta]) err(dove, `la rotta "${C.rotta}" non esiste in campagna.json`);
    const righe = C.mappa || [];
    if (!righe.length) { err(dove, "manca la mappa"); continue; }
    const larga = righe[0].length;
    righe.forEach((r, y) => {
      if (r.length !== larga) err(dove, `la riga ${y + 1} della mappa è lunga ${r.length}, le altre ${larga}`);
      for (const c of r) if (!dati.terreni[c]) err(dove, `la riga ${y + 1} della mappa usa il simbolo "${c}", che non è in terreni.json`);
    });
    const dentro = (x, y) => Number.isInteger(x) && Number.isInteger(y) && x >= 0 && y >= 0 && y < righe.length && x < larga;
    const costo = (x, y, m) => dati.terreni[righe[y][x]]?.costo[m] ?? NON_SI_PASSA;
    const occupate = new Map();
    (C.schieramento || []).forEach(([x, y], i) => {
      if (!dentro(x, y)) return err(dove, `la casella di schieramento ${i + 1} (${x},${y}) è fuori dalla mappa`);
      if (costo(x, y, "fanteria") >= NON_SI_PASSA) err(dove, `la casella di schieramento ${i + 1} (${x},${y}) non è praticabile`);
      occupate.set(x + "," + y, "schieramento");
    });
    if ((C.schieramento || []).length < 1) err(dove, "serve almeno una casella di schieramento");
    const presenti = new Set();
    const unita = (u, cosa, fisso) => {
      const du = `${dove}, ${cosa} "${u.nome || u.classe || u.id}" (${u.x},${u.y})`;
      if (u.id) presenti.add(u.id);
      if (u.classe && !dati.classi[u.classe]) err(du, `la classe "${u.classe}" non esiste in classi.json`);
      if (!u.classe && !u.stat) err(du, "serve \"classe\" oppure \"stat\" complete");
      if (u.stat) stat(du, u.stat);
      if (typeof u.lv !== "number") err(du, "manca il livello (lv)");
      const arma = u.arma ?? dati.classi[u.classe]?.arma, mov = u.movimento ?? dati.classi[u.classe]?.movimento ?? "fanteria";
      if (!dati.armi[arma]) err(du, `l'arma "${arma}" non esiste`);
      if (!movimenti.includes(mov)) err(du, `movimento "${mov}" sconosciuto`);
      if (u.ia && !ia.includes(u.ia)) err(du, `ia "${u.ia}" sconosciuta (valide: ${ia.join(", ")})`);
      aspetto(du, u.aspetto); abilita(du, u.abilita); oggetti(du, u.oggetti);
      if (!dentro(u.x, u.y)) return err(du, "è fuori dalla mappa");
      if (fisso) {
        if (costo(u.x, u.y, mov) >= NON_SI_PASSA) err(du, "sta su una casella dove non può stare");
        const k = u.x + "," + u.y;
        if (occupate.has(k)) err(du, `la casella è già occupata (${occupate.get(k)})`);
        occupate.set(k, u.nome || u.classe);
      }
    };
    for (const u of C.ospiti || []) unita(u, "ospite", true);
    for (const u of C.nemici || []) unita(u, "nemico", true);
    for (const ev of C.eventi || []) {
      if (!["giocatore", "nemico"].includes(ev.fase)) err(dove, `evento al turno ${ev.turno}: "fase" deve essere "giocatore" o "nemico"`);
      for (const u of ev.rinforzi || []) unita(u, `rinforzo del turno ${ev.turno}`, false);
    }
    const g = C.obiettivo || {};
    if (!tipi.includes(g.tipo)) err(dove, `obiettivo "${g.tipo}" sconosciuto (validi: ${tipi.join(", ")})`);
    if (g.tipo === "resisti" && !g.turni) err(dove, "l'obiettivo \"resisti\" vuole \"turni\"");
    if (g.tipo === "raggiungi" && (!g.casella || !dentro(...g.casella) || costo(g.casella[0], g.casella[1], "fanteria") >= NON_SI_PASSA)) err(dove, "l'obiettivo \"raggiungi\" vuole una \"casella\" praticabile dentro la mappa");
    if ((g.tipo === "comandante" || g.anche === "comandante") && ![...(C.nemici || []), ...(C.eventi || []).flatMap((e) => e.rinforzi || [])].some((u) => u.comandante)) err(dove, "l'obiettivo è sconfiggere il comandante, ma nessun nemico ha \"comandante\": true");
    for (const k of ["chi", "proteggi"]) if (g[k] && !presenti.has(g[k]) && !dati.personaggi[g[k]]) err(dove, `obiettivo: "${g[k]}" non è un'unità del capitolo`);
    chiParla(dove + " (inizio)", C.inizio, presenti); chiParla(dove + " (vittoria)", C.vittoria, presenti);
    for (const ev of C.eventi || []) chiParla(`${dove} (evento del turno ${ev.turno})`, ev.dialogo, presenti);
    const Ri = C.ricompensa || {};
    for (const [p, a] of Object.entries(Ri.armi || {})) { if (!dati.personaggi[p]) err(dove, `ricompensa: "${p}" non è un personaggio`); if (!dati.armi[a]) err(dove, `ricompensa: l'arma "${a}" non esiste`); }
    for (const o of Ri.oggetti || []) { if (!dati.personaggi[o.a]) err(dove, `ricompensa: "${o.a}" non è un personaggio`); if (!dati.oggetti[o.id]) err(dove, `ricompensa: l'oggetto "${o.id}" non esiste`); }
    for (const o of C.scelta?.opzioni || []) if (!dati.campagna.rotte[o.id]) err(dove, `scelta: la rotta "${o.id}" non esiste in campagna.json`);
  }
  return E;
}
