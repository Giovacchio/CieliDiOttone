// Schermate fuori dalla battaglia: titolo, fine capitolo, scelta della rotta, accampamento.
import { G, $, $$, h, velo, chiudiVelo } from "./stato.js";
import { ritratto } from "./ritratti.js";
import { storia } from "./dialoghi.js";
import { giocaCapitolo, preparaBattaglia, schedaStat } from "./battaglia.js";
import { ETICHETTE, unitaCompagnia } from "../motore/unita.js";
import { statoCoppia, prossimoLivello, livelloNumero, prontoDaLeggere } from "../motore/supporti.js";
import { nuovaPartita, concludiCapitolo, capitoliAperti, sulPercorso, contaOggetto, puoPromuovere, promuovi, leggiSupporto, conversazione } from "../motore/campagna.js";
import { tipiUsabili, puoUsare, passaArma, passaOggetto, impugna, merce, compra, vendi, prezzoVendita, MAX_ARMI } from "../motore/inventario.js";
import { elencaSlot, salvaSlot, cancellaSlot, usaSlot, testoEsportazione, leggiEsportazione, scaricaFile, scegliFile, scriviPreferenza } from "../salvataggi.js";

const salva = () => salvaSlot(G.slot, G.partita);
const titoloCapitolo = (id) => G.dati.capitoli[id].titolo;
let scheda = "comp";

function inizia(id) { G.inBattaglia = true; return giocaCapitolo(id); }

// ------------------------------------------------------------------ titolo
const mediaLivelli = (p) => { const l = Object.values(p.compagnia).map((c) => c.lv); return Math.round(l.reduce((a, b) => a + b, 0) / l.length); };
const quando = (ms) => ms ? new Date(ms).toLocaleString("it-IT", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }) : "";

export function titolo(avviso = "") {
  const D = G.dati;
  $("#prep")?.remove();
  G.inBattaglia = false;
  const slot = elencaSlot(D), inUso = slot.find((s) => s.n === G.slot && s.partita) || slot.filter((s) => s.partita).sort((a, b) => b.quando - a.quando)[0];
  if (inUso) { G.slot = inUso.n; usaSlot(G.slot); }
  G.partita = inUso ? inUso.partita : nuovaPartita(D);
  const primo = D.campagna.capitoli[0];
  preparaBattaglia(G.partita.prossimo || primo);
  G.chiusa = true; // la mappa dietro al titolo è solo uno sfondo
  const comuni = D.campagna.capitoli.filter((id) => !D.capitoli[id].rotta).length, conRotte = D.campagna.capitoli.length > comuni;
  const tattica = (G.ia || D.regole.ia || "classica") === "tattica";
  const riga = (s) => {
    const p = s.partita;
    if (!p) return `<div class="slot vuoto"><div class="sn">Slot ${s.n}</div><div class="si muted">Vuoto</div>
      <div class="sb"><button class="btn mini sNuova" data-n="${s.n}">Nuova partita</button><button class="btn mini sImporta" data-n="${s.n}">Importa file</button></div></div>`;
    const dove = p.prossimo ? titoloCapitolo(p.prossimo) : "Storia completata fin qui";
    return `<div class="slot${s.n === G.slot ? " on" : ""}"><div class="sn">Slot ${s.n}</div>
      <div class="si"><b>${h(dove)}</b><br><small>Livello medio ${mediaLivelli(p)} · ${p.oro || 0} oro${p.bandiere.rotta ? " · rotta " + h(D.campagna.rotte[p.bandiere.rotta].nome) : ""} · ${quando(s.quando)}</small></div>
      <div class="sb"><button class="btn mini primary sContinua" data-n="${s.n}">Continua</button><button class="btn mini sCapitoli" data-n="${s.n}">Capitoli</button>
        <button class="btn mini sEsporta" data-n="${s.n}">Esporta</button><button class="btn mini sCopia" data-n="${s.n}">Copia</button><button class="btn mini sCancella" data-n="${s.n}">Cancella</button></div></div>`;
  };
  velo(`<div class="end title" role="dialog" aria-label="Titolo"><div class="kicker">La Compagnia della Brace</div><h2>${h(D.campagna.titolo)}</h2>
    <p>Un gioco tattico a turni. ${comuni} capitoli scritti finora${conRotte ? ", più quelli delle tre rotte" : ""}.</p>
    <div class="slots">${slot.map(riga).join("")}</div>
    <div id="tList"></div>
    <p class="muted small" id="tAvviso">${h(avviso || "La partita si salva da sola nello slot in uso, tra un capitolo e l'altro.")}</p>
    <div class="btns" style="justify-content:center"><button class="btn mini" id="tIA" aria-pressed="${tattica}">Nemici: ${tattica ? "tattici" : "semplici"}</button></div></div>`, true);
  const partitaDi = (n) => slot.find((s) => s.n === +n).partita;
  const attiva = (n) => { G.slot = +n; usaSlot(G.slot); G.partita = partitaDi(n); };
  $$(".sContinua").forEach((b) => b.onclick = () => { attiva(b.dataset.n); const p = G.partita; if (!p.prossimo || p.completati.length) accampamento(); else inizia(p.prossimo); });
  $$(".sCapitoli").forEach((b) => b.onclick = () => {
    attiva(b.dataset.n);
    $("#tList").innerHTML = `<p class="muted small">Slot ${G.slot}: rigioca un capitolo (i livelli restano quelli di adesso).</p>` + capitoliAperti(D, G.partita).map((id) => `<button class="btn chbtn" data-id="${id}">${h(titoloCapitolo(id))}</button>`).join("");
    $$(".chbtn").forEach((c) => c.onclick = () => inizia(c.dataset.id));
  });
  $$(".sNuova").forEach((b) => b.onclick = () => { G.slot = +b.dataset.n; usaSlot(G.slot); G.partita = nuovaPartita(D); salva(); inizia(primo); });
  $$(".sCancella").forEach((b) => b.onclick = () => { if (confirm(`Cancellare la partita dello slot ${b.dataset.n}? Non si può tornare indietro.`)) { cancellaSlot(+b.dataset.n); titolo(`Slot ${b.dataset.n} cancellato.`); } });
  $$(".sEsporta").forEach((b) => b.onclick = () => {
    scaricaFile(`cieli-di-ottone-slot${b.dataset.n}-${new Date().toISOString().slice(0, 10)}.json`, testoEsportazione(partitaDi(b.dataset.n)));
    $("#tAvviso").textContent = "File scaricato: lo trovi tra i download. Per riprenderlo, usa \"Importa file\" su uno slot vuoto.";
  });
  $$(".sCopia").forEach((b) => b.onclick = () => {
    const libero = slot.find((s) => !s.partita);
    if (!libero) { $("#tAvviso").textContent = "Non ci sono slot vuoti: cancellane uno per fare una copia."; return; }
    salvaSlot(libero.n, partitaDi(b.dataset.n)); titolo(`Slot ${b.dataset.n} copiato nello slot ${libero.n}.`);
  });
  $$(".sImporta").forEach((b) => b.onclick = async () => {
    const testo = await scegliFile();
    if (testo == null) return;
    try { salvaSlot(+b.dataset.n, leggiEsportazione(D, testo)); G.slot = +b.dataset.n; usaSlot(G.slot); titolo(`Partita importata nello slot ${b.dataset.n}.`); }
    catch (e) { $("#tAvviso").textContent = e.message; }
  });
  $("#tIA").onclick = () => { G.ia = tattica ? "classica" : "tattica"; scriviPreferenza("ia", G.ia); titolo(tattica ? "Nemici semplici: avanzano e colpiscono, come nel primo prototipo." : "Nemici tattici: si ritirano, proteggono i guaritori, aspettano i compagni."); };
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
    ${ricompensa.testo ? `<p class="reward">${h(ricompensa.testo)}</p>` : ""}${ricompensa.oro ? `<p>Paga della missione: <span class="oro">+${ricompensa.oro} oro</span></p>` : ""}${pasto ? `<p class="muted small">Il piatto di Giova (${h(pasto.nome)}) è finito: domani se ne cucina un altro.</p>` : ""}
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
  const schede = [["comp", "Compagnia"], ["arm", "Armeria"], ["mer", "Mercato"], ["sup", "Supporti"], ["cuc", "Cucina"], ["dia", "Diario"]];
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

  if (scheda === "arm") {
    // armi e oggetti di ognuno, più il deposito comune: tutto si sposta con un tocco
    const tipi = (id) => tipiUsabili(D, id, p.compagnia[id].promo), dep = p.deposito;
    const numeri = (a) => a.cura != null ? `cura ${a.cura}+Mag · gittata ${a.gittata.join("-")}` : `Pot ${a.potenza} · Prec ${a.precisione} · Crit ${a.critico || 0} · gittata ${a.gittata.join("-")}`;
    const chiDa = (cosa, id) => membri.filter((m) => cosa === "o" || (puoUsare(D, tipi(m), id) && p.compagnia[m].armi.length < MAX_ARMI))
      .map((m) => `<button class="btn mini dai" data-c="${cosa}" data-id="${id}" data-a="${m}">a ${h(D.personaggi[m].nome)}</button>`).join("");
    corpo.innerHTML = `<p class="muted">Ogni personaggio porta fino a ${MAX_ARMI} armi e combatte con quella in mano. Il resto sta nel deposito della Compagnia.</p>` + membri.map((id) => {
      const c = p.compagnia[id];
      return `<div class="sez">${h(D.personaggi[id].nome)}</div>` + c.armi.map((a) => `<div class="riga"><div class="nome">${h(D.armi[a].nome)}${a === c.arma ? " <small>· in mano</small>" : ""}<br><small>${numeri(D.armi[a])}</small></div>
          ${a !== c.arma ? `<button class="btn mini imp" data-m="${id}" data-id="${a}">Impugna</button>` : ""}${c.armi.length > 1 ? `<button class="btn mini posa" data-c="a" data-m="${id}" data-id="${a}">Al deposito</button>` : ""}</div>`).join("")
        + c.oggetti.filter((i) => i.q > 0).map((i) => `<div class="riga"><div class="nome">${h(D.oggetti[i.id].nome)} ×${i.q}<br><small>${h(D.oggetti[i.id].descrizione || "")}</small></div><button class="btn mini posa" data-c="o" data-m="${id}" data-id="${i.id}">Al deposito</button></div>`).join("");
    }).join("") + `<div class="sez">Deposito</div>` + (dep.armi.length || dep.oggetti.length ? "" : `<p class="muted">Il deposito è vuoto.</p>`)
      + dep.armi.map((a) => `<div class="riga"><div class="nome">${h(D.armi[a].nome)}<br><small>${numeri(D.armi[a])}</small></div>${chiDa("a", a) || `<small>nessuno può portarla adesso</small>`}</div>`).join("")
      + dep.oggetti.filter((i) => i.q > 0).map((i) => `<div class="riga"><div class="nome">${h(D.oggetti[i.id].nome)} ×${i.q}</div>${chiDa("o", i.id)}</div>`).join("");
    const poi = () => { salva(); accampamento(); };
    $$(".imp").forEach((b) => b.onclick = () => { impugna(p.compagnia[b.dataset.m], b.dataset.id); poi(); });
    $$(".posa").forEach((b) => b.onclick = () => { const c = p.compagnia[b.dataset.m]; if (b.dataset.c === "a") passaArma(D, c, dep, b.dataset.id, null); else passaOggetto(c, dep, b.dataset.id, 1); poi(); });
    $$(".dai").forEach((b) => b.onclick = () => { const c = p.compagnia[b.dataset.a]; if (b.dataset.c === "a") passaArma(D, dep, c, b.dataset.id, tipi(b.dataset.a)); else passaOggetto(dep, c, b.dataset.id, 1); poi(); });
  }

  if (scheda === "mer") {
    const M = merce(D, p), dep = p.deposito;
    const chiUsa = (id) => membri.filter((m) => puoUsare(D, tipiUsabili(D, m, p.compagnia[m].promo), id)).map((m) => D.personaggi[m].nome).join(", ") || "nessuno, per ora";
    const numeri = (a) => a.cura != null ? `cura ${a.cura}+Mag · gittata ${a.gittata.join("-")}` : `Pot ${a.potenza} · Prec ${a.precisione} · Crit ${a.critico || 0} · gittata ${a.gittata.join("-")}`;
    const compraBtn = (tipo, v) => `<button class="btn mini compra" data-t="${tipo}" data-id="${v.id}" ${p.oro < v.prezzo ? "disabled" : ""}>Compra · ${v.prezzo}</button>`;
    const vendibili = [...new Set(dep.armi)].filter((a) => prezzoVendita(D, "armi", a) != null);
    const oggVendibili = dep.oggetti.filter((i) => i.q > 0 && prezzoVendita(D, "oggetti", i.id) != null);
    corpo.innerHTML = `<p>Oro della Compagnia: <span class="oro">${p.oro}</span> <span class="muted">· quello che compri finisce nel deposito: lo distribuisci dall'Armeria. Nuova merce arriva andando avanti nella storia.</span></p>
      <div class="sez">In vendita</div>`
      + M.oggetti.map((v) => `<div class="riga"><div class="nome">${h(D.oggetti[v.id].nome)}<br><small>${h(D.oggetti[v.id].descrizione || "")}</small></div>${compraBtn("oggetti", v)}</div>`).join("")
      + M.armi.map((v) => `<div class="riga"><div class="nome">${h(D.armi[v.id].nome)}<br><small>${numeri(D.armi[v.id])} · la usa: ${h(chiUsa(v.id))}</small></div>${compraBtn("armi", v)}</div>`).join("")
      + `<div class="sez">Vendi dal deposito</div>` + (vendibili.length || oggVendibili.length ? "" : `<p class="muted">Nel deposito non c'è niente che il mercato compri.</p>`)
      + vendibili.map((a) => `<div class="riga"><div class="nome">${h(D.armi[a].nome)} ×${dep.armi.filter((x) => x === a).length}</div><button class="btn mini vendi" data-t="armi" data-id="${a}">Vendi · ${prezzoVendita(D, "armi", a)}</button></div>`).join("")
      + oggVendibili.map((i) => `<div class="riga"><div class="nome">${h(D.oggetti[i.id].nome)} ×${i.q}</div><button class="btn mini vendi" data-t="oggetti" data-id="${i.id}">Vendi · ${prezzoVendita(D, "oggetti", i.id)}</button></div>`).join("");
    $$(".compra").forEach((b) => b.onclick = () => { compra(D, p, b.dataset.t, b.dataset.id); salva(); accampamento(); });
    $$(".vendi").forEach((b) => b.onclick = () => { vendi(D, p, b.dataset.t, b.dataset.id); salva(); accampamento(); });
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
