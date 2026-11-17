// La schermata di battaglia: disegna mappa e unità, raccoglie i comandi del giocatore
// e "racconta" con animazioni i fatti che il motore consegna.
import { G, $, $$, h, pausa, velo, chiudiVelo, veloAperto, registro } from "./stato.js";
import { disegnaMappa } from "./disegno-mappa.js";
import { ritratto } from "./ritratti.js";
import { storia } from "./dialoghi.js";
import { Battaglia } from "../motore/battaglia.js";
import { STAT, ETICHETTE, oggetto } from "../motore/unita.js";
import { caselleMinacciate, caselleColpibili, chiave, percorso } from "../motore/movimento.js";
import { salvaSlot } from "../salvataggi.js";
import { triangolo } from "../motore/combattimento.js";
import { livelloNumero, statoCoppia } from "../motore/supporti.js";
import { passaArma, passaOggetto, impugna } from "../motore/inventario.js";
import { vittoria, sconfitta } from "./schermate.js";
import * as FX from "./effetti.js";
import { suona, musica } from "./suono.js";
import { opzioni, aiuto, pausaMenu, confermaFineTurno, schermoIntero } from "./menu.js";
import { scriviPreferenza } from "../salvataggi.js";
import { apriScena, chiudiScena, scenaAssalto, scenaColpo, scenaMancato, scenaAperta } from "./scontro.js";

const tavola = () => $("#board");
const elementi = new Map();   // unità → elemento sulla mappa
const svaniti = new WeakSet();
const alleato = (u) => u.squadra === "alleato";
const armaDi = (u) => G.dati.armi[u.arma];
const gittataTesto = (a) => a.gittata[0] === a.gittata[1] ? a.gittata[0] : a.gittata.join("-");

// ------------------------------------------------------------------ preparazione
export function preparaBattaglia(idCapitolo, opzioni = {}, giaPronta = null) {
  const D = G.dati, cap = D.capitoli[idCapitolo], p = G.partita;
  G.b = giaPronta || new Battaglia({ dati: D, capitolo: cap, compagnia: p.compagnia, supporti: p.supporti, bandiere: p.bandiere, ...opzioni });
  Object.assign(G, { sel: null, origine: null, raggio: null, armaPrima: null, modo: "riposo", occupato: false, pericolo: false, chiusa: false });
  for (const el of elementi.values()) el.remove();
  elementi.clear();
  $("#lFx").innerHTML = ""; $("#lPath").innerHTML = ""; chiudiScena();
  $("#bDanger").classList.remove("on");
  $("#chap").textContent = cap.titolo;
  $("#goalTxt").textContent = cap.obiettivo.testo;
  $("#obTop").textContent = cap.obiettivo.testo; $("#terreno").innerHTML = "";
  G.cur = null; G.anteprima = null;
  $("#capoTxt").textContent = G.b.capo()?.nome || "il capo";
  $("#log").innerHTML = "<div>Il registro della battaglia apparirà qui.</div>";
  chiudiMenu(); aggiornaFase(); adatta(); mostraInfo(null);
}
export async function giocaCapitolo(idCapitolo, opzioni = {}) {
  chiudiVelo();
  G.partita.schieramenti ||= {};
  G.partita.sospesa = null;
  const ricordate = G.partita.schieramenti[idCapitolo];
  preparaBattaglia(idCapitolo, { ...opzioni, ia: G.ia, posizioni: posizioniValide(idCapitolo, ricordate) });
  // chi è appena entrato nella Compagnia si presenta, una volta sola, prima del capitolo
  for (const id of G.partita.arrivi || []) {
    const nuovo = G.dati.personaggi[id];
    if (!nuovo?.arrivo) continue;
    await storia(nuovo.arrivo);
    registro(`<b>${h(nuovo.nome)}</b> è entrato nella Compagnia. Nei preparativi scegli chi schierare.`);
  }
  if (G.partita.arrivi?.length) { G.partita.arrivi = []; salvaSlot(G.slot, G.partita); }
  await cartello(G.b.cap);
  await preparativi();
  await esegui(G.b.inizia());
  sospendi();
}

// ------------------------------------------------------------------ battaglia sospesa
// A ogni mossa del giocatore la battaglia viene annotata nella partita e salvata: chiudendo la pagina si riprende da lì.
export function sospendi() {
  if (!G.b || G.chiusa || G.b.finita || G.b.fase !== "giocatore" || G.modo === "schiera") return;
  G.partita.sospesa = G.b.esporta();
  salvaSlot(G.slot, G.partita);
}
// Riapre la battaglia sospesa. Restituisce false se non c'è o non è più leggibile.
export function riprendiBattaglia() {
  const s = G.partita.sospesa, b = s ? Battaglia.riprendi(G.dati, s) : null;
  if (!b) { G.partita.sospesa = null; return false; }
  chiudiVelo();
  preparaBattaglia(s.cap, {}, b);
  registro(`Battaglia ripresa dal turno ${b.turno}.`);
  inquadra(b.capo());
  return true;
}

// Cartello d'apertura del capitolo: atto e titolo, poi svanisce da solo (o con un tocco).
function cartello(cap) {
  return new Promise((fine) => {
    const [sopra, sotto] = cap.titolo.includes(" · ") ? cap.titolo.split(" · ") : ["", cap.titolo];
    const c = document.createElement("div");
    c.className = "cartello";
    suona("cartello");
    c.innerHTML = `<div><div class="catto">${h(cap.atto || "")}</div><div class="cnum">${h(sopra)}</div><div class="ctit">${h(sotto)}</div><div class="criga"></div></div>`;
    document.body.appendChild(c);
    let chiuso = false;
    const chiudi = () => { if (chiuso) return; chiuso = true; c.classList.add("via"); setTimeout(() => { c.remove(); fine(); }, 350 * G.velocita); };
    c.onclick = chiudi;
    setTimeout(chiudi, 2300 * G.velocita);
  });
}

// ------------------------------------------------------------------ schieramento prima della battaglia
// Le posizioni ricordate valgono solo se parlano di personaggi che ci sono ancora e di caselle di questo capitolo.
function posizioniValide(idCapitolo, pos) {
  if (!pos) return null;
  const cap = G.dati.capitoli[idCapitolo], caselle = new Set(cap.schieramento.map(([x, y]) => x + "," + y));
  const capo = G.dati.personaggi.ordine.find((id) => G.dati.personaggi[id].capo);
  const ok = Object.entries(pos).every(([id, p]) => G.partita.compagnia[id] && caselle.has(p[0] + "," + p[1]));
  return ok && pos[capo] ? pos : null;
}
const posizioniAttuali = () => Object.fromEntries(G.b.unita.filter((u) => u.compagnia).map((u) => [u.id, [u.x, u.y]]));
function preparativi() {
  return new Promise((pronto) => {
    const D = G.dati, cap = G.b.cap, membri = D.personaggi.ordine.filter((id) => G.partita.compagnia[id]);
    G.modo = "schiera"; G.scambio = null;
    const barra = document.createElement("div");
    barra.className = "prep"; barra.id = "prep";
    document.body.appendChild(barra);
    const ricrea = (pos) => { preparaBattaglia(cap.id, { ia: G.ia, posizioni: pos }); G.modo = "schiera"; disegna(); };
    const disegna = () => {
      const inCampo = new Set(G.b.unita.filter((u) => u.compagnia).map((u) => u.id)), scelta = membri.length > cap.schieramento.length;
      barra.innerHTML = `<div><b>Preparativi</b> Scegli due caselle azzurre per scambiare di posto.${scelta ? ` Posti: ${inCampo.size}/${cap.schieramento.length}.` : ""}</div>
        ${scelta ? `<div class="chips">${membri.map((id) => `<button class="btn chip${inCampo.has(id) ? " on" : ""}" data-id="${id}" ${D.personaggi[id].capo ? "disabled" : ""}>${h(D.personaggi[id].nome)}</button>`).join("")}</div>` : ""}
        <button class="btn primary" id="prepVia">Inizia la battaglia <kbd>Spazio</kbd></button>`;
      barra.querySelectorAll(".chip").forEach((c) => c.onclick = () => {
        const pos = posizioniAttuali(), id = c.dataset.id;
        if (pos[id]) delete pos[id];
        else {
          const libera = cap.schieramento.find(([x, y]) => !Object.values(pos).some((p) => p[0] === x && p[1] === y));
          if (!libera) { registro("Non ci sono posti liberi: togli prima qualcuno."); return; }
          pos[id] = libera;
        }
        ricrea(pos);
      });
      $("#prepVia").onclick = () => {
        G.partita.schieramenti[cap.id] = posizioniAttuali();
        barra.remove(); G.modo = "riposo"; G.scambio = null; disegnaPortate(); pronto();
      };
      disegnaPortate();
    };
    G.toccaSchiera = (x, y) => {
      if (!cap.schieramento.some(([sx, sy]) => sx === x && sy === y)) { const u = G.b.unitaIn(x, y); mostraInfo(u || null); return; }
      const qui = G.b.unitaIn(x, y);
      if (!G.scambio) { G.scambio = { x, y }; mostraInfo(qui || null); disegnaPortate(); return; }
      const la = G.b.unitaIn(G.scambio.x, G.scambio.y);
      if (la) { la.x = x; la.y = y; }
      if (qui) { qui.x = G.scambio.x; qui.y = G.scambio.y; }
      G.scambio = null; disegnaUnita(); disegnaPortate(); disegnaPericolo();
    };
    disegna();
  });
}

// ------------------------------------------------------------------ disegno
export function adatta() {
  if (!G.b) return;
  const involucro = $("#wrap"), stretto = window.innerWidth <= 860;
  const larghezza = involucro.clientWidth - (stretto ? 4 : 28), altezza = stretto ? 9999 : involucro.clientHeight - 28;
  G.stretto = stretto;
  G.lato = Math.max(stretto ? 44 : 22, Math.floor(Math.min(larghezza / G.b.larghe, altezza / G.b.alte, stretto ? 64 : 88)));
  tavola().style.width = G.b.larghe * G.lato + "px";
  tavola().style.height = G.b.alte * G.lato + "px";
  disegnaMappa($("#bg"), G.b.cap, G.lato);
  FX.impostaScena(G.b, G.lato);
  disegnaMeta(); disegnaUnita(); disegnaPortate(); disegnaPericolo();
}
function casella(x, y, classe) {
  const d = document.createElement("div"), T = G.lato;
  d.className = "cell " + classe;
  Object.assign(d.style, { left: x * T + "px", top: y * T + "px", width: T + "px", height: T + "px" });
  return d;
}
function riempi(strato, chiavi, classe) {
  for (const k of chiavi) { const [x, y] = k.split(",").map(Number); strato.appendChild(casella(x, y, classe)); }
}
function disegnaMeta() {
  const L = $("#lGoal"), g = G.b.cap.obiettivo;
  L.innerHTML = "";
  if (g.tipo === "raggiungi") L.appendChild(casella(g.casella[0], g.casella[1], "goal"));
}
const GATTO = '<div class="cat" title="Prospy, il gatto di Wata"><svg viewBox="0 0 24 24"><path d="M4 3l4 5h8l4-5v10c0 5-4 8-8 8s-8-3-8-8z" fill="#e8873a"/><path d="M7 11h3M14 11h3M8 16h8" stroke="#b85c1c" stroke-width="1.2"/><circle cx="9" cy="13" r="1.4" fill="#3a5a2a"/><circle cx="15" cy="13" r="1.4" fill="#3a5a2a"/></svg></div>';
function icona(arma) { return G.dati.icone[arma.icona || arma.tipo] || G.dati.icone.spada; }

export function disegnaUnita() {
  const L = $("#lUnits"), b = G.b, T = G.lato;
  for (const [u, el] of elementi) if (!b.unita.includes(u) || (u.pv <= 0 && svaniti.has(u))) { el.remove(); elementi.delete(u); }
  for (const u of b.unita) {
    if (u.pv <= 0 && !elementi.has(u)) continue;
    let el = elementi.get(u);
    if (!el) { el = document.createElement("div"); el.id = "u_" + u.id; L.appendChild(el); elementi.set(u, el); }
    el.className = `unit ${alleato(u) ? "ally" : "enemy"}${u === G.sel && G.modo !== "nemico" ? " sel" : ""}${u.pv <= u.stat.hp * 0.3 ? " grave" : u.pv <= u.stat.hp * 0.6 ? " ferito" : ""}${u.comandante ? " boss" : ""}${u.agito && alleato(u) && b.fase === "giocatore" && !G.chiusa ? " done" : ""}`;
    Object.assign(el.style, { left: u.x * T + "px", top: u.y * T + "px", width: T + "px", height: T + "px" });
    if (el.dataset.arma !== u.arma) {
      el.dataset.arma = u.arma;
      el.innerHTML = `<div class="tok"><div class="face">${ritratto(G.dati, u, true)}</div><div class="wpn"><svg viewBox="0 0 512 512" fill="currentColor">${icona(armaDi(u))}</svg></div></div>
        <div class="hpb"><i></i></div>${u.abilita?.gatto ? GATTO : ""}`;
    }
    el.querySelector(".hpb i").style.width = Math.max(0, 100 * u.pv / u.stat.hp) + "%";
  }
}

// Caselle blu (movimento), rosse (attacco), verdi (cura) dell'unità selezionata.
export function disegnaPortate() {
  const L = $("#lRange"), b = G.b, u = G.sel;
  L.innerHTML = "";
  for (const [v, el] of elementi) el.classList.toggle("sel", v === G.sel && G.modo !== "nemico" && G.modo !== "occupato");
  if (G.modo === "schiera") {
    for (const [x, y] of b.cap.schieramento) L.appendChild(casella(x, y, G.scambio && G.scambio.x === x && G.scambio.y === y ? "hl" : "mv"));
    return;
  }
  if (!u) { // nessuna selezione: anteprima di chi sta sotto il cursore (fin dove arriva, cosa può colpire)
    const v = G.anteprima;
    if (v && v.pv > 0 && G.modo === "riposo" && libero()) {
      if (alleato(v) && !v.agito) {
        const mosse = b.raggiungibili(v), blu = new Set(mosse.map((t) => chiave(t.x, t.y))), rosse = new Set();
        for (const id of v.armi) { const a = G.dati.armi[id]; if (a.cura == null) for (const k of caselleColpibili(b, mosse, a.gittata)) if (!blu.has(k)) rosse.add(k); }
        riempi(L, blu, "mv pre"); riempi(L, rosse, "at pre");
      } else if (!alleato(v)) riempi(L, caselleMinacciate(b, v), "at pre");
    }
    return;
  }
  if (G.modo === "scelta" && G.raggio) {
    const mosse = new Set(G.raggio.map((t) => chiave(t.x, t.y)));
    riempi(L, mosse, "mv");
    const rosse = new Set(), verdi = new Set();
    for (const id of u.armi) {
      const a = G.dati.armi[id];
      for (const k of caselleColpibili(b, G.raggio, a.gittata)) if (!mosse.has(k)) (a.cura ? verdi : rosse).add(k);
    }
    riempi(L, rosse, "at");
    riempi(L, [...verdi].filter((k) => !rosse.has(k)), "hl");
  }
  if (G.modo === "bersaglio" || G.modo === "cura")
    for (const t of b.bersagli(u)) L.appendChild(casella(t.x, t.y, G.modo === "cura" ? "hl" : "at"));
  if (G.modo === "nemico") riempi(L, caselleMinacciate(b, u), "at");
}
export function disegnaPericolo() {
  const L = $("#lDanger");
  L.innerHTML = "";
  if (!G.pericolo) return;
  const tutte = new Set();
  for (const e of G.b.vivi("nemico")) for (const k of caselleMinacciate(G.b, e)) tutte.add(k);
  riempi(L, tutte, "dz");
}
function ridisegna() { disegnaUnita(); disegnaPortate(); disegnaPericolo(); }

export function aggiornaFase() {
  const p = $("#phase"), b = G.b, g = b.cap.obiettivo, limite = g.tipo === "resisti" ? g.turni : g.limite;
  p.className = "phase " + (b.fase === "giocatore" ? "p" : "e");
  p.textContent = `Turno ${b.turno}${limite ? "/" + limite : ""} · ${b.fase === "giocatore" ? "Giocatore" : "Nemico"}`;
}
async function striscione(testo, classe) {
  const s = document.createElement("div");
  s.className = "banner " + classe; s.textContent = testo;
  document.body.appendChild(s);
  await pausa(1150);
  s.remove();
}
function numeroVolante(u, testo, colore) {
  const d = document.createElement("div"), T = G.lato;
  d.className = "float"; d.textContent = testo; d.style.color = colore;
  d.style.left = (u.x * T + T * 0.3) + "px"; d.style.top = (u.y * T) + "px";
  $("#lFx").appendChild(d);
  setTimeout(() => d.remove(), 950);
}

// ------------------------------------------------------------------ pannello dell'unità
function rigaArma(u, id) {
  const a = G.dati.armi[id];
  const numeri = a.cura != null ? `cura ${a.cura}+Mag · Gittata ${gittataTesto(a)}` : `Pot ${a.potenza} · Prec ${a.precisione} · Crit ${a.critico || 0} · Gittata ${gittataTesto(a)}`;
  return `<div class="${id === u.arma ? "imp" : ""}">${h(a.nome)} <small>${numeri}</small></div>`;
}
export function schedaStat(u, conPV) {
  return STAT.filter((k) => conPV || k !== "hp").map((k) => `<div><span>${ETICHETTE[k]}</span>${u.stat[k]}</div>`).join("") + `<div><span>Mov</span>${u.mov}</div>`;
}
export function rigaOggetti(u) {
  return u.oggetti.filter((i) => i.q > 0).map((i) => { const O = G.dati.oggetti[i.id]; return `${h(O.nome)} ×${i.q} <small>(${h(O.descrizione || "")})</small>`; }).join(" · ");
}
// Porta un'unità (o una casella) al centro della parte visibile della mappa: serve sul telefono, dove la mappa scorre.
export function inquadra(c) {
  const w = $("#wrap"), T = G.lato;
  if (!c || (w.scrollWidth <= w.clientWidth + 2 && w.scrollHeight <= w.clientHeight + 2)) return;
  const x = c.x * T + T / 2, y = c.y * T + T / 2, margine = T * 1.5;
  if (x < w.scrollLeft + margine || x > w.scrollLeft + w.clientWidth - margine || y < w.scrollTop + margine || y > w.scrollTop + w.clientHeight - margine)
    w.scrollTo({ left: x - w.clientWidth / 2, top: y - w.clientHeight / 2, behavior: "smooth" });
}
function mostraMini(u) {
  const m = $("#mini");
  if (!u) { m.innerHTML = `<b>Obiettivo</b> ${h(G.b.cap.obiettivo.testo)}`; return; }
  const a = armaDi(u), t = G.b.terreno(u.x, u.y);
  m.innerHTML = `<b class="${alleato(u) ? "al" : "ne"}">${h(u.nome)}</b> Lv ${u.lv} · PV ${u.pv}/${u.stat.hp} · ${h(a.nome)}${t.difesa || t.schivata ? ` · ${h(t.nome)} +${t.difesa}/+${t.schivata}` : ""}`;
}
export function mostraInfo(u) {
  const box = $("#info");
  mostraMini(u);
  if (!u) { box.innerHTML = '<div class="empty">Tocca un\'unità per vedere le sue statistiche. Le tue sono blu, i nemici rossi.</div>'; return; }
  const b = G.b, D = G.dati, t = b.terreno(u.x, u.y);
  let legami = "";
  if (u.compagnia) {
    const l = D.personaggi.ordine.filter((o) => o !== u.id && livelloNumero(D.regole, b.supporti, u.id, o)).map((o) => `${D.personaggi[o].nome} ${statoCoppia(b.supporti, u.id, o).livello}`);
    if (l.length) legami = `<div class="weap"><small>Supporti: ${h(l.join(" · "))}</small></div>`;
  }
  const oggetti = rigaOggetti(u);
  box.innerHTML = `<div class="uhead"><div class="portrait">${ritratto(D, u)}</div><div style="min-width:0;flex:1">
    <div class="uname">${h(u.nome)}</div><div class="uclass">${h(u.classe || "")} · Lv ${u.lv}${alleato(u) ? ` · PE ${u.pe}` : ""}</div>
    <div style="font-variant-numeric:tabular-nums;margin-top:6px">PV ${u.pv}/${u.stat.hp}</div><div class="bar"><i style="width:${100 * u.pv / u.stat.hp}%"></i></div>
    ${alleato(u) ? `<div class="bar exp"><i style="width:${u.pe}%"></i></div>` : ""}</div></div>
    <div class="stats">${schedaStat(u, false)}</div>
    <div class="armi">${u.armi.map((id) => rigaArma(u, id)).join("")}</div>
    ${u.abilita ? `<div class="skill"><b>${h(u.abilita.nome)}</b> · ${h(u.abilita.descrizione)}</div>` : ""}
    ${oggetti ? `<div class="weap">${oggetti}</div>` : ""}${legami}
    <div class="weap"><small>Terreno: ${h(t.nome)}${t.difesa || t.schivata ? ` · Dif +${t.difesa} · Schivata +${t.schivata}` : ""}${t.cura ? " · cura il 10% a inizio fase" : ""}</small></div>`;
}

// ------------------------------------------------------------------ racconto dei fatti del motore
export async function esegui(generatore) {
  G.occupato = true;
  try { for (const f of generatore) await racconta(f); }
  finally { G.occupato = false; }
  if (G.b.finita && !G.chiusa) await chiudiBattaglia();
}
async function racconta(f) {
  const b = G.b;
  switch (f.tipo) {
    case "dialogo": await storia(f.righe); break;
    case "fase":
      aggiornaFase(); ridisegna();
      suona(f.fase === "giocatore" ? "faseGiocatore" : "faseNemico"); musica(f.fase === "giocatore" ? "battaglia" : "nemico");
      if (f.fase === "giocatore") inquadra(b.capo());
      await striscione(f.fase === "giocatore" ? "Fase del giocatore" : "Fase nemica", f.fase === "giocatore" ? "p" : "e");
      break;
    case "rinforzi":
      registro(`<b>Rinforzi${f.unita.every((u) => !alleato(u)) ? " nemici" : ""}:</b> ${f.unita.length}.`);
      ridisegna(); inquadra(f.unita[0]); suona("rinforzi");
      for (const u of f.unita) { effetto(u, "arrivo"); FX.arrivo(u); }
      await pausa(500); break;
    case "scelta": mostraInfo(f.u); inquadra(f.u); break;
    case "ritirata": registro(`${h(f.u.nome)} si ritira.`); break;
    case "muovi": inquadra(f.u); await cammina(f.u, f.da); await pausa(120); break;
    case "scontro": inquadra(f.d); apriScena(f.a, f.d, f.previsione); if (scenaAperta()) await pausa(380); break;
    case "fineScontro": if (scenaAperta()) { await pausa(520); chiudiScena(); } break;
    case "assalto": {
      const el = elementi.get(f.a), T = G.lato;
      scenaAssalto(f.a);
      if (!el) break;
      el.classList.add("lunge");
      el.style.transform = `translate(${Math.sign(f.d.x - f.a.x) * T * .25}px,${Math.sign(f.d.y - f.a.y) * T * .25}px)`;
      await pausa(140); el.style.transform = ""; await pausa(120); el.classList.remove("lunge");
      break;
    }
    case "colpo":
      numeroVolante(f.d, f.critico ? `CRITICO ${f.danno}` : String(f.danno), f.critico ? "#ffcf5a" : "#fff");
      effetto(f.d, f.critico ? "critico" : "colpito");
      FX.colpo(armaDi(f.a), f.a, f.d, f.critico); scenaColpo(f.d, f.danno, f.critico);
      suona(armaDi(f.a).tipo); suona(f.critico ? "critico" : "impatto");
      if (f.critico) { tavola().classList.remove("scossa"); void tavola().offsetWidth; tavola().classList.add("scossa"); }
      registro(`${h(f.a.nome)} colpisce ${h(f.d.nome)}${f.critico ? " con un critico" : ""}: ${f.danno} danni.`);
      disegnaUnita(); await pausa(scenaAperta() ? 430 : 260); break;
    case "mancato":
      numeroVolante(f.d, "Mancato", "#9aa"); effetto(f.d, "schiva"); FX.mancato(f.a, f.d); scenaMancato(f.d); suona("mancato");
      registro(`${h(f.a.nome)} manca ${h(f.d.nome)}.`);
      await pausa(scenaAperta() ? 430 : 260); break;
    case "sconfitta": {
      const el = elementi.get(f.u);
      if (el) { el.style.transition = "opacity .5s"; el.style.opacity = "0"; }
      FX.sconfitta(f.u); suona("sconfitta");
      await pausa(450);
      svaniti.add(f.u);
      registro(alleato(f.u) ? `<b>${h(f.u.nome)}</b> è ferito e si ritira dalla battaglia.` : (f.u.siRitira ? `<b>${h(f.u.nome)}</b> è battuto e si ritira.` : `${h(f.u.nome)} è sconfitto.`));
      disegnaUnita(); disegnaPericolo(); break;
    }
    case "pe": registro(`${h(f.u.nome)} ottiene ${f.quanti} PE.`); break;
    case "livello": FX.livello(f.u); suona("livello"); await pausa(350); await mostraLivello(f.u, f.aumenti); break;
    case "cura":
      numeroVolante(f.t, "+" + f.pv, "#8de08f"); effetto(f.t, "curato"); FX.cura(f.t); if (!f.eco) suona("cura");
      if (f.oggetto) registro(`${h(f.t.nome)} usa ${h(f.oggetto.nome)}: +${f.pv} PV.`);
      else if (f.u) registro(`${h(f.u.nome)} cura ${h(f.t.nome)}: +${f.pv} PV.`);
      disegnaUnita();
      if (!f.eco) await pausa(300);
      break;
    case "supportoPronto":
      registro(`<b>Supporto ${f.livello} pronto:</b> ${h(f.a.nome)} e ${h(f.b.nome)}. Leggetelo all'accampamento.`); break;
    case "fine": break; // se ne occupa esegui(), a racconto finito
  }
}
// Fa camminare una pedina casella per casella lungo il percorso, invece di farla scivolare in linea retta.
async function cammina(u, da) {
  const el = elementi.get(u), T = G.lato, passi = el ? percorso(G.b, u, da.x, da.y, u.x, u.y) : [];
  if (passi.length < 2) { disegnaUnita(); await pausa(passi.length ? 150 : 0); return; }
  el.style.transition = "left .08s linear, top .08s linear";
  for (const p of passi) { el.style.left = p.x * T + "px"; el.style.top = p.y * T + "px"; FX.passo(p.x, p.y); suona("passo"); await pausa(80); }
  el.style.transition = "";
  disegnaUnita();
}
// Piccola animazione su una pedina (colpo, critico, schivata, cura, arrivo): è solo una classe CSS a tempo.
function effetto(u, classe) {
  const el = elementi.get(u);
  if (!el) return;
  el.classList.remove("colpito", "critico", "schiva", "curato", "arrivo");
  void el.offsetWidth;
  el.classList.add(classe);
  setTimeout(() => el.classList.remove(classe), 600);
}
function mostraLivello(u, aumenti) {
  return new Promise((fine) => {
    const righe = STAT.map((k) => `<div>${ETICHETTE[k]} <span class="${aumenti[k] ? "up" : ""}">${u.stat[k]}${aumenti[k] ? " +1" : ""}</span></div>`).join("");
    velo(`<div class="lvl sale" role="dialog" aria-label="Livello superiore"><div class="lvtesta"><div class="portrait">${ritratto(G.dati, u)}</div><h3>${h(u.nome)}<br><small>sale al livello ${u.lv}</small></h3></div><div class="g">${righe}</div>
      <div style="margin-top:12px"><button class="btn primary" id="lvok">Continua</button></div></div>`, true);
    $("#lvok").focus();
    $("#lvok").onclick = () => { chiudiVelo(); fine(); };
  });
}
async function chiudiBattaglia() {
  G.chiusa = true; G.sel = null; G.modo = "riposo"; chiudiMenu(); disegnaPortate();
  await pausa(500);
  if (G.b.vinta) { await storia(G.b.cap.vittoria); vittoria(); }
  else { G.partita.sospesa = null; salvaSlot(G.slot, G.partita); sconfitta(G.b.motivo); }
}

// ------------------------------------------------------------------ comandi del giocatore
const libero = () => !G.occupato && !G.chiusa && G.modo !== "schiera" && G.b && G.b.fase === "giocatore";

function chiudiMenu() { $$(".menu").forEach((m) => m.remove()); }
function menu(u, voci) {
  chiudiMenu();
  const m = document.createElement("div"), T = G.lato;
  m.className = "menu"; m.setAttribute("role", "menu");
  for (const [testo, azione, nota] of voci) {
    if (!azione) { const t = document.createElement("div"); t.className = "sub"; t.textContent = testo; m.appendChild(t); continue; }
    const p = document.createElement("button");
    p.innerHTML = h(testo) + (nota ? `<small>${h(nota)}</small>` : "");
    p.setAttribute("role", "menuitem");
    p.onclick = (e) => { e.stopPropagation(); suona("clic"); azione(); };
    m.appendChild(p);
  }
  tavola().appendChild(m);
  const sinistra = Math.min((u.x + 1) * T + 4, G.b.larghe * T - 150), alto = Math.min(u.y * T, G.b.alte * T - (voci.length * 38 + 10));
  m.style.left = Math.max(0, sinistra) + "px"; m.style.top = Math.max(0, alto) + "px";
  m.querySelector("button")?.focus({ preventScroll: true });
  if (G.stretto) m.scrollIntoView({ block: "nearest", inline: "nearest" });
}
function apriMenu(u) {
  const b = G.b, D = G.dati, utili = b.armiUtili(u), voci = [];
  const impugna = (id, modo) => { G.armaPrima = u.arma; u.arma = id; G.modo = modo; chiudiMenu(); disegnaUnita(); disegnaPortate(); mostraInfo(u); };
  const scegli = (lista, modo, titolo) => {
    if (lista.length === 1) return impugna(lista[0], modo);
    menu(u, [[titolo], ...lista.map((id) => { const a = D.armi[id]; return [a.nome, () => impugna(id, modo), a.cura != null ? `cura ${a.cura}+Mag` : `Pot ${a.potenza} · ${gittataTesto(a)}`]; })]);
  };
  const etichetta = (lista, verbo) => lista.length === 1 && lista[0] !== u.arma ? `${verbo} · ${D.armi[lista[0]].nome}` : verbo;
  if (utili.attacco.length) voci.push([etichetta(utili.attacco, "Attacca"), () => scegli(utili.attacco, "bersaglio", "Con quale arma?")]);
  if (utili.cura.length) voci.push([etichetta(utili.cura, "Cura"), () => scegli(utili.cura, "cura", "Con cosa?")]);
  for (const i of u.oggetti) {
    const O = D.oggetti[i.id];
    if (i.q > 0 && O.tipo === "cura" && u.pv < u.stat.hp) voci.push([O.nome, () => agisci(u, b.usaOggetto(u, i.id)), `×${i.q}`]);
  }
  if (u.armi.length > 1) voci.push(["Impugna", () => menu(u, [["Quale arma tieni in mano?"], ...u.armi.map((id) => [D.armi[id].nome, () => { impugna(u, id); disegnaUnita(); mostraInfo(u); apriMenu(u); }, id === u.arma ? "in mano" : ""])])]);
  const vicini = u.compagnia ? b.vivi("alleato").filter((o) => o !== u && o.compagnia && Math.abs(o.x - u.x) + Math.abs(o.y - u.y) === 1) : [];
  if (vicini.length) voci.push(["Scambia", () => vicini.length === 1 ? apriScambio(u, vicini[0]) : menu(u, [["Con chi?"], ...vicini.map((o) => [o.nome, () => apriScambio(u, o)])])]);
  voci.push(["Attendi", () => agisci(u, b.attendi(u))]);
  menu(u, voci);
}
// Scambio di armi e oggetti tra due personaggi vicini: non consuma il turno.
function apriScambio(u, o) {
  const D = G.dati;
  chiudiMenu();
  let avviso = "";
  const colonna = (chi, altro) => `<div class="scol"><div class="uname">${h(chi.nome)}</div>
    ${chi.armi.map((id) => `<button class="btn sarma" data-da="${chi.id}" data-id="${id}">${h(D.armi[id].nome)}${id === chi.arma ? " <small>in mano</small>" : ""}</button>`).join("")}
    ${chi.oggetti.filter((i) => i.q > 0).map((i) => `<button class="btn sogg" data-da="${chi.id}" data-id="${i.id}">${h(D.oggetti[i.id].nome)} ×${i.q}</button>`).join("")}
    <div class="muted small">Tocca per dare a ${h(altro.nome)}</div></div>`;
  const mostra = () => {
    velo(`<div class="lvl scambio" role="dialog" aria-label="Scambio"><h3>Scambio</h3><div class="scols">${colonna(u, o)}${colonna(o, u)}</div>
      <div class="muted small" style="min-height:1.2em">${h(avviso)}</div><div style="margin-top:10px"><button class="btn primary" id="scOk">Fatto</button></div></div>`, true);
    const passa = (tipo) => (e) => {
      const da = e.currentTarget.dataset.da === u.id ? u : o, a = da === u ? o : u, id = e.currentTarget.dataset.id;
      avviso = tipo === "arma" ? passaArma(D, da, a, id, a.usa) : passaOggetto(da, a, id, 1);
      if (!avviso) G.haScambiato = true;
      mostra();
    };
    $$(".sarma").forEach((p) => p.onclick = passa("arma"));
    $$(".sogg").forEach((p) => p.onclick = passa("oggetto"));
    $("#scOk").onclick = () => { chiudiVelo(); disegnaUnita(); mostraInfo(u); apriMenu(u); };
  };
  mostra();
}
function mostraPrevisione(a, d) {
  const b = G.b, f = b.previsione(a, d), R = G.dati.regole;
  const lato = (st) => st ? `${st.danno}${st.doppio ? " ×2" : ""}` : "–";
  const t = triangolo(R, armaDi(a), armaDi(d));
  velo(`<div class="forecast" role="dialog" aria-label="Previsione del combattimento">
    <div class="fc">
      <div class="l nm ally">${h(a.nome)}</div><div class="mid">contro</div><div class="nm enemy">${h(d.nome)}</div>
      <div class="l big">${a.pv}</div><div class="mid">PV</div><div class="big">${d.pv}</div>
      <div class="l big">${lato(f.A)}</div><div class="mid">Danno</div><div class="big">${lato(f.B)}</div>
      <div class="l">${f.A.precisione}%</div><div class="mid">Precisione</div><div>${f.B ? f.B.precisione + "%" : "–"}</div>
      <div class="l">${f.A.critico}%</div><div class="mid">Critico</div><div>${f.B ? f.B.critico + "%" : "–"}</div>
      <div class="l"><small>${h(armaDi(a).nome)}${t > 0 ? " ▲" : t < 0 ? " ▼" : ""}${f.A.efficace ? " · efficace ×3" : ""}</small></div><div class="mid"></div><div><small>${h(armaDi(d).nome)}${!f.contrattacco ? " · non contrattacca" : ""}</small></div>
    </div>
    <div class="btns" style="margin-top:12px;justify-content:flex-end"><button class="btn" id="fcNo">Indietro</button><button class="btn primary" id="fcOk">Attacca</button></div>
  </div>`);
  $("#fcOk").focus();
  $("#fcNo").onclick = () => chiudiVelo();
  $("#fcOk").onclick = () => { suona("conferma"); chiudiVelo(); agisci(a, b.attacca(a, d)); };
}
// Esegue un'azione del giocatore, poi controlla se la fase è finita.
async function agisci(u, generatore) {
  G.modo = "occupato"; G.armaPrima = null; chiudiMenu(); disegnaPortate(); disegnaPercorso(null);
  await esegui(generatore);
  Object.assign(G, { sel: null, origine: null, raggio: null, modo: "riposo" });
  if (G.chiusa) return;
  ridisegna(); mostraInfo(u.pv > 0 ? u : null);
  sospendi();
  if (G.b.tuttiHannoAgito()) { await pausa(350); fineTurno(); }
}
export async function fineTurno() {
  if (!libero()) return;
  Object.assign(G, { sel: null, origine: null, raggio: null, modo: "riposo" });
  chiudiMenu(); disegnaPortate();
  await esegui(G.b.fineFaseGiocatore());
  if (!G.chiusa) { aggiornaFase(); ridisegna(); sospendi(); }
}
export function annulla() {
  if (G.modo === "schiera") { G.scambio = null; disegnaPortate(); return; }
  if (!libero()) return;
  if (veloAperto() || G.modo !== "riposo") suona("annulla");
  if (veloAperto()) { chiudiVelo(); if (G.modo === "mosso" && G.sel) apriMenu(G.sel); return; }
  const u = G.sel;
  if (G.modo === "bersaglio" || G.modo === "cura") {
    if (G.armaPrima) { u.arma = G.armaPrima; G.armaPrima = null; }
    G.modo = "mosso"; disegnaUnita(); disegnaPortate(); mostraInfo(u); apriMenu(u); return;
  }
  if (G.modo === "mosso") {
    if (G.haScambiato) { apriMenu(u); return; }   // dopo uno scambio la mossa non si ritira più
    u.x = G.origine.x; u.y = G.origine.y; chiudiMenu();
    G.modo = "scelta"; G.raggio = G.b.raggiungibili(u);
    disegnaUnita(); disegnaPortate(); mostraInfo(u); return;
  }
  G.sel = null; G.modo = "riposo"; G.raggio = null; chiudiMenu(); disegnaPortate();
}
async function suCasella(x, y) {
  if (G.modo === "schiera") { G.toccaSchiera(x, y); return; }
  if (!libero()) return;
  const b = G.b, u = b.unitaIn(x, y);
  const seleziona = (v) => { suona("seleziona"); G.sel = v; G.origine = { x: v.x, y: v.y }; G.modo = "scelta"; G.raggio = b.raggiungibili(v); G.haScambiato = false; };
  if (G.modo === "riposo" || G.modo === "nemico") {
    if (u && alleato(u) && !u.agito) seleziona(u);
    else if (u) { G.sel = u; G.modo = "nemico"; G.raggio = null; }
    else { G.sel = null; G.modo = "riposo"; }
    disegnaPortate(); mostraInfo(u || null); return;
  }
  if (G.modo === "scelta") {
    if (u && u !== G.sel && alleato(u) && !u.agito) { seleziona(u); disegnaPortate(); mostraInfo(u); return; }
    if (G.raggio.some((t) => t.x === x && t.y === y)) {
      const v = G.sel;
      v.x = x; v.y = y; G.modo = "mosso";
      disegnaPercorso(null); disegnaPortate(); mostraInfo(v);
      await cammina(v, G.origine);
      if (G.modo === "mosso" && G.sel === v) apriMenu(v);
      return;
    }
    annulla(); return;
  }
  if (G.modo === "mosso") { annulla(); return; }   // tocco fuori dal menu = torna indietro
  if (G.modo === "bersaglio") { const t = b.bersagli(G.sel).find((o) => o.x === x && o.y === y); if (t) mostraPrevisione(G.sel, t); return; }
  if (G.modo === "cura") { const t = b.bersagli(G.sel).find((o) => o.x === x && o.y === y); if (t) agisci(G.sel, b.cura(G.sel, t)); return; }
}

// Freccia che mostra il cammino dell'unità selezionata fino alla casella sotto il puntatore.
let ultimoPercorso = "";
function disegnaPercorso(u, x, y) {
  const firma = u ? `${u.id}:${u.x},${u.y}>${x},${y}:${G.lato}` : "";
  if (firma === ultimoPercorso) return;
  ultimoPercorso = firma;
  const L = $("#lPath"), T = G.lato;
  if (!u || (u.x === x && u.y === y)) { L.innerHTML = ""; return; }
  const punti = [{ x: u.x, y: u.y }, ...percorso(G.b, u, u.x, u.y, x, y)].map((p) => `${(p.x + 0.5) * T},${(p.y + 0.5) * T}`);
  const [px, py] = punti.at(-2).split(",").map(Number), [fx, fy] = punti.at(-1).split(",").map(Number), ang = Math.atan2(fy - py, fx - px) * 180 / Math.PI;
  L.setAttribute("viewBox", `0 0 ${G.b.larghe * T} ${G.b.alte * T}`);
  L.innerHTML = `<polyline points="${punti.join(" ")}" fill="none" stroke="#0b0d12" stroke-opacity=".55" stroke-width="${T * 0.26}" stroke-linecap="round" stroke-linejoin="round"/>
    <polyline points="${punti.join(" ")}" fill="none" stroke="#dfeeff" stroke-width="${T * 0.13}" stroke-linecap="round" stroke-linejoin="round"/>
    <path d="M${-T * 0.02},${-T * 0.22} L${T * 0.26},0 L${-T * 0.02},${T * 0.22} Z" fill="#dfeeff" stroke="#0b0d12" stroke-opacity=".55" stroke-width="2" transform="translate(${fx},${fy}) rotate(${ang})"/>`;
}

// ------------------------------------------------------------------ collegamento ai comandi della pagina
// Sposta il cursore della mappa (mouse o tastiera): aggiorna il riquadro del terreno e l'anteprima di chi sta lì sotto.
export function spostaCursore(x, y, daTastiera) {
  const b = G.b, c = $("#cursor"), T = G.lato;
  if (!b || !b.dentro(x, y)) { c.hidden = true; return; }
  const nuovo = !G.cur || G.cur.x !== x || G.cur.y !== y;
  G.cur = { x, y };
  c.hidden = false;
  Object.assign(c.style, { left: x * T + "px", top: y * T + "px", width: T + "px", height: T + "px" });
  if (!nuovo) return;
  if (daTastiera) { inquadra(G.cur); suona("sfiora"); }
  const u = b.unitaIn(x, y), t = b.terreno(x, y);
  const costo = t.costo.fanteria >= 99 ? "non si passa a piedi" : `costa ${t.costo.fanteria} a piedi`;
  $("#terreno").innerHTML = `<b>${h(t.nome)}</b> <span>Difesa +${t.difesa} · Schivata +${t.schivata} · ${costo}${t.cura ? " · cura il 10% a inizio fase" : ""}</span>`
    + (u ? `<div class="tunita ${alleato(u) ? "al" : "ne"}"><b>${h(u.nome)}</b> Lv ${u.lv} · PV ${u.pv}/${u.stat.hp} · ${h(armaDi(u).nome)}</div>` : "");
  const prima = G.anteprima;
  G.anteprima = G.modo === "riposo" && u ? u : null;
  if (prima !== G.anteprima) disegnaPortate();
  if (G.modo === "scelta" && G.sel && G.raggio && G.raggio.some((p) => p.x === x && p.y === y)) disegnaPercorso(G.sel, x, y); else disegnaPercorso(null);
}
// Passa al prossimo personaggio che deve ancora agire (Tab).
function prossimaUnita(indietro) {
  if (!libero() || (G.modo !== "riposo" && G.modo !== "scelta" && G.modo !== "nemico")) return;
  const l = G.b.vivi("alleato").filter((u) => !u.agito);
  if (!l.length) return;
  const i = l.indexOf(G.sel), u = l[(i + (indietro ? -1 : 1) + l.length * 2) % l.length] || l[0];
  if (G.modo !== "riposo") annulla();
  spostaCursore(u.x, u.y, true);
  suCasella(u.x, u.y);
}
// Fine turno su richiesta del giocatore: chiede conferma se qualcuno non ha ancora agito.
export function richiediFineTurno() {
  if (!libero()) return;
  for (let i = 0; i < 6 && (veloAperto() || G.modo !== "riposo"); i++) annulla(); // rimette a posto un'unità mossa a metà
  const fermi = G.b.vivi("alleato").filter((u) => !u.agito).length;
  if (fermi) confermaFineTurno(fermi, fineTurno); else fineTurno();
}

export function collegaComandi({ alTitolo }) {
  const T = () => G.lato;
  const daEvento = (e) => { const r = tavola().getBoundingClientRect(); return { x: Math.floor((e.clientX - r.left) / T()), y: Math.floor((e.clientY - r.top) / T()) }; };
  tavola().addEventListener("click", (e) => {
    if (e.target.closest(".menu") || !G.b) return;
    const { x, y } = daEvento(e);
    if (G.b.dentro(x, y)) { spostaCursore(x, y, false); suCasella(x, y); }
  });
  // tasto destro = annulla; sul telefono lo stesso gesto è tenere premuto (alcuni telefoni lo traducono già in "tasto destro")
  let timer = null, ultimoAnnulla = 0, saltaClic = false;
  const annullaUnaVolta = () => { const ora = Date.now(); if (ora - ultimoAnnulla > 400) { ultimoAnnulla = ora; annulla(); } };
  tavola().addEventListener("contextmenu", (e) => { e.preventDefault(); annullaUnaVolta(); });
  tavola().addEventListener("touchstart", (e) => {
    clearTimeout(timer);
    if (e.touches.length !== 1 || e.target.closest(".menu")) return;
    timer = setTimeout(() => { saltaClic = true; if (navigator.vibrate) navigator.vibrate(15); annullaUnaVolta(); setTimeout(() => { saltaClic = false; }, 700); }, 550);
  }, { passive: true });
  for (const ev of ["touchend", "touchmove", "touchcancel"]) tavola().addEventListener(ev, () => clearTimeout(timer), { passive: true });
  tavola().addEventListener("click", (e) => { if (saltaClic) { e.stopImmediatePropagation(); saltaClic = false; } }, true);
  tavola().addEventListener("mousemove", (e) => { if (G.b) { const { x, y } = daEvento(e); spostaCursore(x, y, false); } });
  tavola().addEventListener("mouseleave", () => { $("#cursor").hidden = true; disegnaPercorso(null); if (G.anteprima) { G.anteprima = null; disegnaPortate(); } G.cur = null; });

  const zone = () => { G.pericolo = !G.pericolo; $("#bDanger").classList.toggle("on", G.pericolo); suona("clic"); disegnaPericolo(); };
  G.aggiornaVeloce = () => { const si = G.velocita < 1; $("#bFast").classList.toggle("on", si); $("#bFast").setAttribute("aria-pressed", String(si)); };
  const veloce = () => { G.velocita = G.velocita < 1 ? 1 : 0.4; scriviPreferenza("fast", G.velocita < 1 ? "1" : "0"); G.aggiornaVeloce(); suona("clic"); };
  const pausaGioco = () => { if (!G.occupato && !G.chiusa && !veloAperto()) { suona("clic"); pausaMenu({ alTitolo }); } };
  const libera = () => !G.occupato && !veloAperto() && !$(".cartello");
  G.aggiornaVeloce();
  $("#bEnd").onclick = richiediFineTurno;
  $("#bCancel").onclick = () => annulla();
  $("#bDanger").onclick = zone;
  $("#bFast").onclick = veloce;
  $("#bMenu").onclick = pausaGioco;
  $("#bAiuto").onclick = () => { if (libera()) { suona("clic"); aiuto(); } };
  $("#bOpz").onclick = () => { if (libera()) { suona("clic"); opzioni(); } };
  $("#bSchermo").onclick = schermoIntero;

  // tastiera: la mappa si gioca tutta anche senza mouse
  const DIREZIONI = { ArrowUp: [0, -1], ArrowDown: [0, 1], ArrowLeft: [-1, 0], ArrowRight: [1, 0], w: [0, -1], s: [0, 1], a: [-1, 0], d: [1, 0] };
  window.addEventListener("keydown", (e) => {
    if (e.target.tagName === "INPUT" || e.ctrlKey || e.metaKey || e.altKey) return;
    const k = e.key.length === 1 ? e.key.toLowerCase() : e.key;
    if (e.target.tagName === "BUTTON" && !e.target.closest(".menu") && (k === "Enter" || k === " ")) return; // il pulsante fa già il suo
    const cartello = $(".cartello");
    if (cartello) { if (k === "Enter" || k === " " || k === "Escape") { e.preventDefault(); cartello.click(); } return; }
    if (veloAperto()) { if (k === "Escape" && ($(".forecast") || $(".scambio")) && !$(".dlg")) annulla(); return; }
    if (!G.b || G.chiusa) return;
    const menu = $(".menu");
    if (menu) {
      const voci = [...menu.querySelectorAll("button")], i = voci.indexOf(document.activeElement);
      if (k === "ArrowDown" || k === "s") { e.preventDefault(); voci[(i + 1) % voci.length].focus(); suona("sfiora"); }
      else if (k === "ArrowUp" || k === "w") { e.preventDefault(); voci[(i - 1 + voci.length) % voci.length].focus(); suona("sfiora"); }
      else if (/^[1-9]$/.test(k) && voci[+k - 1]) { e.preventDefault(); voci[+k - 1].click(); }
      else if (k === "Escape") annulla();
      return;
    }
    if (DIREZIONI[k]) {
      e.preventDefault();
      const c = G.cur || G.sel || G.b.capo(), [dx, dy] = DIREZIONI[k];
      spostaCursore(Math.max(0, Math.min(G.b.larghe - 1, c.x + dx)), Math.max(0, Math.min(G.b.alte - 1, c.y + dy)), true);
      return;
    }
    if (G.modo === "schiera") {
      if (k === "Enter" && G.cur) { e.preventDefault(); suCasella(G.cur.x, G.cur.y); }
      else if (k === " ") { e.preventDefault(); $("#prepVia")?.click(); }
      else if (k === "Escape") annulla();
      return;
    }
    if (k === "Enter" || k === " ") { e.preventDefault(); const c = G.cur || G.b.capo(); spostaCursore(c.x, c.y, true); suCasella(c.x, c.y); }
    else if (k === "Escape") { if (G.modo === "riposo") pausaGioco(); else annulla(); }
    else if (k === "Tab") { e.preventDefault(); prossimaUnita(e.shiftKey); }
    else if (k === "e") richiediFineTurno();
    else if (k === "q") zone();
    else if (k === "f") veloce();
    else if (k === "h" || k === "F1") { e.preventDefault(); if (libera()) aiuto(); }
  });
  // dopo un clic sui pulsanti a lato, la tastiera torna alla mappa
  document.querySelector("aside").addEventListener("click", (e) => { if (e.target.closest("button")) document.activeElement?.blur(); });
  let attesa;
  window.addEventListener("resize", () => { clearTimeout(attesa); attesa = setTimeout(adatta, 120); });
}
