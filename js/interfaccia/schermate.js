// Schermate fuori dalla battaglia: titolo, fine capitolo, scelta della rotta, accampamento.
import { G, $, $$, h, velo, chiudiVelo } from "./stato.js";
import { ritratto } from "./ritratti.js";
import { storia } from "./dialoghi.js";
import { giocaCapitolo, preparaBattaglia, schedaStat } from "./battaglia.js";
import { ETICHETTE, unitaCompagnia } from "../motore/unita.js";
import { statoCoppia, prossimoLivello, livelloNumero, prontoDaLeggere } from "../motore/supporti.js";
import { nuovaPartita, concludiCapitolo, capitoliAperti, sulPercorso, contaOggetto, puoPromuovere, promuovi, leggiSupporto, conversazione } from "../motore/campagna.js";
import { caricaPartita, salvaPartita, cancellaPartita } from "../salvataggi.js";

const salva = () => salvaPartita(G.partita);
const titoloCapitolo = (id) => G.dati.capitoli[id].titolo;
let scheda = "comp";

function inizia(id) { G.inBattaglia = true; return giocaCapitolo(id); }

// ------------------------------------------------------------------ titolo
export function titolo() {
  const D = G.dati;
  G.inBattaglia = false;
  const salvata = caricaPartita(D);
  G.partita = salvata || nuovaPartita(D);
  const p = G.partita, finita = salvata && !p.prossimo, primo = D.campagna.capitoli[0];
  preparaBattaglia(p.prossimo || primo);
  G.chiusa = true; // la mappa dietro al titolo è solo uno sfondo
  const comuni = D.campagna.capitoli.filter((id) => !D.capitoli[id].rotta).length, conRotte = D.campagna.capitoli.length > comuni;
  velo(`<div class="end title" role="dialog" aria-label="Titolo"><div class="kicker">La Compagnia della Brace</div><h2>${h(D.campagna.titolo)}</h2>
    <p>Un gioco tattico a turni. ${comuni} capitoli scritti finora${conRotte ? ", più quelli delle tre rotte" : ""}.</p>
    <div class="tbtns">
      ${salvata && !finita ? `<button class="btn primary" id="tCont">Continua${p.completati.length ? " dall'accampamento" : ""} · ${h(titoloCapitolo(p.prossimo))}</button>` : ""}
      ${finita ? `<p class="reward">Hai completato tutti i capitoli scritti finora. Il seguito è in arrivo.</p><button class="btn primary" id="tCamp">Torna all'accampamento</button>` : ""}
      <button class="btn ${salvata ? "" : "primary"}" id="tNew">Nuova partita</button>
      ${salvata ? `<button class="btn" id="tSel">Scegli capitolo</button>` : ""}
    </div><div id="tList"></div></div>`, true);
  if ($("#tCont")) $("#tCont").onclick = () => p.completati.length ? accampamento() : inizia(p.prossimo);
  if ($("#tCamp")) $("#tCamp").onclick = () => accampamento();
  $("#tNew").onclick = () => {
    if (salvata && p.completati.length && !confirm("Cominciare una nuova partita? Quella salvata verrà sostituita.")) return;
    cancellaPartita(); G.partita = nuovaPartita(D); salva(); inizia(primo);
  };
  if ($("#tSel")) $("#tSel").onclick = () => {
    $("#tList").innerHTML = capitoliAperti(D, p).map((id) => `<button class="btn chbtn" data-id="${id}">${h(titoloCapitolo(id))}</button>`).join("");
    $$(".chbtn").forEach((b) => b.onclick = () => inizia(b.dataset.id));
  };
}

// ------------------------------------------------------------------ fine della battaglia
export function sconfitta(motivo) {
  velo(`<div class="end" role="dialog"><h2>Sconfitta</h2><p>${h(motivo || "")}<br>Nessun problema: si riprova il capitolo con i livelli di prima.</p>
    <div class="btns" style="justify-content:center"><button class="btn primary" id="again">Riprova il capitolo</button><button class="btn" id="goTitle">Titolo</button></div></div>`, true);
  $("#again").onclick = () => inizia(G.b.cap.id);
  $("#goTitle").onclick = () => titolo();
}
export function vittoria() {
  const D = G.dati, p = G.partita, b = G.b, cap = b.cap;
  if (cap.scelta && !p.bandiere.rotta) return sceltaRotta();
  const turni = b.turno;
  const { pasto, ricompensa } = concludiCapitolo(D, p, b);
  salva();
  G.inBattaglia = false;
  const righe = D.personaggi.ordine.filter((id) => p.compagnia[id]).map((id) => {
    const c = p.compagnia[id];
    return `<tr><td>${h(D.personaggi[id].nome)}</td><td>Lv ${c.lv}</td><td>PV ${c.stat.hp}</td><td>${h(D.armi[c.arma].nome)}</td></tr>`;
  }).join("");
  velo(`<div class="end" role="dialog" aria-label="Capitolo completato"><h2>Capitolo completato</h2>
    <p>${h(cap.titolo)}<br>Turni impiegati: ${turni}</p>
    ${ricompensa.testo ? `<p class="reward">${h(ricompensa.testo)}</p>` : ""}${pasto ? `<p class="muted small">Il piatto di Giova (${h(pasto.nome)}) è finito: domani se ne cucina un altro.</p>` : ""}
    <table class="party">${righe}</table>
    <div class="btns" style="justify-content:center;margin-top:14px">
      <button class="btn primary" id="goCamp">All'accampamento</button>
      <button class="btn" id="goTitle">Titolo</button></div></div>`, true);
  $("#goCamp").onclick = () => accampamento();
  $("#goTitle").onclick = () => titolo();
}
function sceltaRotta() {
  const S = G.b.cap.scelta;
  velo(`<div class="end choice" role="dialog" aria-label="Scelta"><h2>Una scelta</h2><p>${h(S.domanda)}</p>
    <div class="tbtns">${S.opzioni.map((o) => `<button class="btn opt" data-id="${h(o.id)}"><b>${h(o.titolo)}</b><br><small>${h(o.descrizione)}</small></button>`).join("")}</div></div>`, true);
  $$(".opt").forEach((b) => b.onclick = () => { G.partita.bandiere.rotta = b.dataset.id; vittoria(); });
}

// ------------------------------------------------------------------ accampamento
export function accampamento() {
  const D = G.dati, p = G.partita, R = D.regole, prossimo = p.prossimo;
  G.inBattaglia = false;
  const schede = [["comp", "Compagnia"], ["sup", "Supporti"], ["cuc", "Cucina"], ["dia", "Diario"]];
  const pronti = D.coppie.filter(([a, b]) => p.compagnia[a] && p.compagnia[b] && prontoDaLeggere(R, statoCoppia(p.supporti, a, b))).length;
  const rotta = p.bandiere.rotta ? " " + D.campagna.rotte[p.bandiere.rotta].nome : "";
  velo(`<div class="camp" role="dialog" aria-label="Accampamento">
    <div class="camphead"><h2>Accampamento</h2><div class="tabs" role="tablist">${schede.map(([k, l]) => `<button class="tab${scheda === k ? " on" : ""}" data-t="${k}" role="tab">${l}${k === "sup" && pronti ? ` <span class="dot">${pronti}</span>` : ""}</button>`).join("")}</div></div>
    <div class="campbody" id="campBody"></div>
    <div class="campfoot">${prossimo ? `<button class="btn primary" id="goNext">${h(titoloCapitolo(prossimo))}</button>` : `<span class="muted">La storia continua${h(rotta)} nei prossimi capitoli.</span>`}
      <button class="btn" id="goTitle">Titolo</button></div></div>`, true);
  $$(".tab").forEach((b) => b.onclick = () => { scheda = b.dataset.t; accampamento(); });
  if (prossimo) $("#goNext").onclick = () => inizia(prossimo);
  $("#goTitle").onclick = () => titolo();
  const corpo = $("#campBody"), membri = D.personaggi.ordine.filter((id) => p.compagnia[id]);

  if (scheda === "comp") {
    const sigilli = contaOggetto(p, R.promozione.oggetto), nomeSigillo = D.oggetti[R.promozione.oggetto].nome;
    corpo.innerHTML = `<p class="muted">${h(nomeSigillo)} della Compagnia: <b>${sigilli}</b>. Dal livello ${R.promozione.livello} un personaggio può essere promosso.</p><div class="cards">` + membri.map((id) => {
      const u = unitaCompagnia(D, p.compagnia, id), strade = D.promozioni[id] || [];
      let promo = "";
      if (u.promo == null && strade.length) promo = puoPromuovere(D, p, id)
        ? `<div class="promo"><b>Promozione</b>${strade.map((P, k) => `<button class="btn pbtn" data-id="${id}" data-k="${k}"><b>${h(P.classe)}</b><br><small>${h(P.abilita.descrizione)} ${Object.entries(P.stat).map(([s, v]) => `${ETICHETTE[s]} +${v}`).join(", ")}${P.mov ? `, Mov +${P.mov}` : ""}</small></button>`).join("")}</div>`
        : `<div class="muted small">Promozione: ${u.lv < R.promozione.livello ? `dal livello ${R.promozione.livello}` : `serve un ${h(nomeSigillo)}`} (${h(strade.map((P) => P.classe).join(" o "))}).</div>`;
      const oggetti = u.oggetti.filter((i) => i.q > 0).map((i) => `${h(D.oggetti[i.id].nome)} ×${i.q}`).join(" · ") || "Nessun oggetto";
      return `<div class="pcard"><div class="uhead"><div class="portrait">${ritratto(D, u)}</div><div><div class="uname">${h(u.nome)}</div><div class="uclass">${h(u.classe)} · Lv ${u.lv} · PE ${u.pe}</div></div></div>
        <div class="stats">${schedaStat(u, true)}</div><div class="weap">${u.armi.map((a) => h(D.armi[a].nome)).join(" · ")}</div>
        <div class="skill"><b>${h(u.abilita.nome)}</b> · ${h(u.abilita.descrizione)}</div>
        <div class="weap"><small>${oggetti}</small></div>${promo}</div>`;
    }).join("") + `</div>`;
    $$(".pbtn").forEach((b) => b.onclick = () => { promuovi(D, p, b.dataset.id, +b.dataset.k); salva(); accampamento(); });
  }

  if (scheda === "sup") {
    const B = R.supporti.bonusPerLivello, L = R.supporti.livelli;
    corpo.innerHTML = `<p class="muted">Combattere vicini (entro ${R.supporti.raggio} caselle) fa crescere il legame. Ogni livello letto dà, a chi sta vicino, +${B.precisione} precisione, +${B.schivata} schivata e +${B.critico} critico.</p>` + D.coppie.filter(([a, b]) => p.compagnia[a] && p.compagnia[b]).map(([a, b]) => {
      const s = statoCoppia(p.supporti, a, b), nx = prossimoLivello(R, s), soglie = R.supporti.soglie;
      const serve = nx ? soglie[nx] : soglie[L.at(-1)], prima = s.livello ? soglie[s.livello] : 0;
      const pct = nx ? Math.round(100 * (s.punti - prima) / (serve - prima)) : 100;
      return `<div class="suprow"><div class="supnames">${h(D.personaggi[a].nome)} e ${h(D.personaggi[b].nome)}</div>
        <div class="suplv">${L.map((l) => `<span class="${s.livello && L.indexOf(l) <= L.indexOf(s.livello) ? "got" : ""}">${l}</span>`).join("")}</div>
        <div class="bar exp" style="flex:1;min-width:80px"><i style="width:${Math.max(0, pct)}%"></i></div>
        ${nx && s.punti >= serve ? `<button class="btn primary sread" data-a="${a}" data-b="${b}" data-l="${nx}">Leggi ${nx}</button>` : `<span class="muted small">${nx ? "in crescita" : "completo"}</span>`}
        ${s.livello ? `<button class="btn sreplay" data-a="${a}" data-b="${b}">Rileggi</button>` : ""}</div>`;
    }).join("");
    $$(".sread").forEach((b) => b.onclick = async () => {
      const { a, b: c, l } = b.dataset;
      await storia(conversazione(D, a, c, l));
      leggiSupporto(D, p, a, c); salva(); accampamento();
    });
    $$(".sreplay").forEach((b) => b.onclick = async () => {
      const { a, b: c } = b.dataset, s = statoCoppia(p.supporti, a, c), righe = [];
      for (const l of L) { righe.push(["narr", `Supporto ${l}`], ...conversazione(D, a, c, l)); if (l === s.livello) break; }
      await storia(righe); accampamento();
    });
  }

  if (scheda === "cuc") {
    const cuoco = D.personaggi[D.personaggi.ordine.find((id) => D.personaggi[id].capo)].nome;
    corpo.innerHTML = `<p class="muted">${h(cuoco)} cucina per tutti la sera prima della battaglia. Il piatto scelto vale solo per il prossimo capitolo.</p><div class="meals">` + Object.entries(D.pasti).map(([k, m]) => {
      const q = m.richiede, chiuso = q && livelloNumero(R, p.supporti, ...q.coppia) < R.supporti.livelli.indexOf(q.livello) + 1;
      const come = q ? `Si sblocca con il supporto ${q.livello} tra ${D.personaggi[q.coppia[0]].nome} e ${D.personaggi[q.coppia[1]].nome}.` : "";
      return `<button class="btn meal${p.bandiere.pasto === k ? " on" : ""}" data-k="${k}" ${chiuso ? "disabled" : ""}><b>${h(m.nome)}</b><br><small>${h(chiuso ? come : m.descrizione)}</small></button>`;
    }).join("") + `</div>`;
    $$(".meal").forEach((b) => b.onclick = () => { p.bandiere.pasto = p.bandiere.pasto === b.dataset.k ? null : b.dataset.k; salva(); accampamento(); });
  }

  if (scheda === "dia") {
    const fatti = D.campagna.capitoli.filter((id) => p.completati.includes(id) && sulPercorso(p, D.capitoli[id]));
    corpo.innerHTML = fatti.length ? `<ol class="diary">${fatti.map((id) => `<li><b>${h(titoloCapitolo(id))}</b><br>${h(D.capitoli[id].diario || "")}</li>`).join("")}</ol>` : `<p class="muted">Il diario è ancora vuoto.</p>`;
  }
}
