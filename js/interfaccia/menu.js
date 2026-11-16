// Menu di gioco: opzioni, pausa, "come si gioca". Sono finestre sopra il gioco; "poi" dice dove tornare.
import { G, $, $$, h, velo, chiudiVelo } from "./stato.js";
import { suona, volumi, impostaVolumi, musica } from "./suono.js";
import { impostaAtmosfera } from "./effetti.js";
import { leggiPreferenza, scriviPreferenza } from "../salvataggi.js";

// Preferenze salvate nel browser (valgono per tutti gli slot).
export function caricaPreferenze() {
  const num = (k, base) => { const v = parseFloat(leggiPreferenza(k)); return Number.isFinite(v) ? Math.min(1, Math.max(0, v)) : base; };
  impostaVolumi({ effetti: num("vol-fx", 0.7), musica: num("vol-mus", 0.35) });
  G.velocita = leggiPreferenza("fast") === "1" ? 0.4 : 1;
  G.scene = leggiPreferenza("scene") !== "0";
  G.atmosfera = leggiPreferenza("atmosfera") !== "0";
  G.ia = ["classica", "tattica"].includes(leggiPreferenza("ia")) ? leggiPreferenza("ia") : null;
  impostaAtmosfera(G.atmosfera);
}
export function schermoIntero() {
  const d = document;
  if (d.fullscreenElement) d.exitFullscreen?.(); else d.documentElement.requestFullscreen?.().catch(() => {});
}
// Frecce su/giù tra i pulsanti di una finestra, come in un menu di gioco.
export function frecce(contenitore) {
  const voci = () => [...contenitore.querySelectorAll("button:not([disabled]), input")];
  contenitore.addEventListener("keydown", (e) => {
    if (e.key !== "ArrowDown" && e.key !== "ArrowUp") return;
    if (e.target.tagName === "INPUT" && e.target.type === "range") return;
    const l = voci(), i = l.indexOf(document.activeElement);
    e.preventDefault(); e.stopPropagation();
    l[(i + (e.key === "ArrowDown" ? 1 : -1) + l.length) % l.length]?.focus();
    suona("sfiora");
  });
}

export function opzioni(poi) {
  const tattica = (G.ia || G.dati.regole.ia || "classica") === "tattica", v = volumi();
  const scelta = (id, testo, acceso, nota) => `<label class="orig"><span>${testo}<small>${nota}</small></span><button class="btn interr${acceso ? " on" : ""}" id="${id}" role="switch" aria-checked="${acceso}">${acceso ? "Sì" : "No"}</button></label>`;
  velo(`<div class="pannello" role="dialog" aria-label="Opzioni"><h2>Opzioni</h2>
    <label class="orig"><span>Volume degli effetti</span><input type="range" id="oFx" min="0" max="100" value="${Math.round(v.effetti * 100)}"></label>
    <label class="orig"><span>Volume della musica</span><input type="range" id="oMus" min="0" max="100" value="${Math.round(v.musica * 100)}"></label>
    ${scelta("oScene", "Scene di scontro", G.scene, "Il riquadro con i ritratti a ogni attacco.")}
    ${scelta("oAtm", "Atmosfera delle mappe", G.atmosfera, "Lucciole, braci, nuvole. Spegnila se il gioco rallenta.")}
    ${scelta("oVel", "Gioco veloce", G.velocita < 1, "Animazioni più rapide, niente scene di scontro.")}
    ${scelta("oIA", "Nemici tattici", tattica, "Si ritirano, proteggono i guaritori, aspettano i compagni.")}
    <div class="btns" style="justify-content:space-between;margin-top:14px"><button class="btn" id="oSchermo">Schermo intero</button><button class="btn primary" id="oOk">Fatto</button></div></div>`, true);
  const P = $(".pannello");
  frecce(P);
  $("#oFx").oninput = (e) => { impostaVolumi({ effetti: e.target.value / 100 }); scriviPreferenza("vol-fx", String(e.target.value / 100)); };
  $("#oFx").onchange = () => suona("conferma");
  $("#oMus").oninput = (e) => { impostaVolumi({ musica: e.target.value / 100 }); scriviPreferenza("vol-mus", String(e.target.value / 100)); };
  const cambia = (id, fn) => { $(id).onclick = () => { fn(); suona("clic"); opzioni(poi); $(id)?.focus(); }; };
  cambia("#oScene", () => { G.scene = !G.scene; scriviPreferenza("scene", G.scene ? "1" : "0"); });
  cambia("#oAtm", () => { G.atmosfera = !G.atmosfera; scriviPreferenza("atmosfera", G.atmosfera ? "1" : "0"); impostaAtmosfera(G.atmosfera); });
  cambia("#oVel", () => { G.velocita = G.velocita < 1 ? 1 : 0.4; scriviPreferenza("fast", G.velocita < 1 ? "1" : "0"); G.aggiornaVeloce?.(); });
  cambia("#oIA", () => { G.ia = tattica ? "classica" : "tattica"; scriviPreferenza("ia", G.ia); });
  $("#oSchermo").onclick = schermoIntero;
  const chiudi = () => { suona("annulla"); chiudiVelo(); poi?.(); };
  $("#oOk").onclick = chiudi;
  P.addEventListener("keydown", (e) => { if (e.key === "Escape") { e.stopPropagation(); chiudi(); } });
  $("#oOk").focus();
}

export function aiuto(poi) {
  const tasto = (t) => `<kbd>${t}</kbd>`;
  velo(`<div class="pannello largo" role="dialog" aria-label="Come si gioca"><h2>Come si gioca</h2>
    <div class="due">
      <div><h3>Il turno</h3>
        <p>Scegli un tuo personaggio, spostalo su una casella azzurra, poi decidi: attaccare, curare, usare un oggetto o attendere. Quando tutti hanno agito tocca ai nemici.</p>
        <p>Se ${h(G.b?.capo()?.nome || "il capo")} cade la missione fallisce. Gli altri, se cadono, si ritirano e tornano al capitolo dopo.</p>
        <h3>Le armi</h3>
        <p><b>Ferro:</b> spada batte ascia, ascia batte lancia, lancia batte spada.<br><b>Ingegno:</b> etere batte congegni, congegni battono polvere, polvere batte etere.</p>
        <p>Chi ha il vantaggio colpisce meglio e un po' più forte. Bosco, macerie e mura proteggono chi ci sta sopra.</p></div>
      <div><h3>Comandi</h3>
        <table class="tasti">
          <tr><td>${tasto("Clic")} ${tasto("Invio")}</td><td>scegli, conferma</td></tr>
          <tr><td>${tasto("Tasto destro")} ${tasto("Esc")}</td><td>torna indietro; a mani vuote apre il menu</td></tr>
          <tr><td>${tasto("↑")}${tasto("↓")}${tasto("←")}${tasto("→")} ${tasto("WASD")}</td><td>muovi il cursore sulla mappa</td></tr>
          <tr><td>${tasto("Tab")}</td><td>prossimo personaggio che deve ancora agire</td></tr>
          <tr><td>${tasto("E")}</td><td>fine turno</td></tr>
          <tr><td>${tasto("Q")}</td><td>mostra le zone che i nemici possono colpire</td></tr>
          <tr><td>${tasto("F")}</td><td>gioco veloce</td></tr>
          <tr><td>${tasto("H")}</td><td>questa pagina</td></tr>
          <tr><td>${tasto("F11")}</td><td>schermo intero</td></tr>
        </table>
        <p class="muted small">Passa il mouse su un'unità per vedere fin dove arriva. Sul telefono: tocca per scegliere, tieni premuto per tornare indietro.</p></div>
    </div>
    <p class="muted small">Icone delle armi: game-icons.net (Lorc, Delapouite, Skoll), CC BY 3.0. Caratteri: Marcellus SC e Barlow Semi Condensed. Suoni e musica generati dal gioco.</p>
    <div class="btns" style="justify-content:flex-end"><button class="btn primary" id="aOk">Ho capito</button></div></div>`, true);
  const chiudi = () => { suona("annulla"); chiudiVelo(); poi?.(); };
  $("#aOk").onclick = chiudi; $("#aOk").focus();
  $(".pannello").addEventListener("keydown", (e) => { if (e.key === "Escape") { e.stopPropagation(); chiudi(); } });
}

// Menu di pausa in battaglia.
export function pausaMenu({ alTitolo }) {
  const b = G.b, riapri = () => pausaMenu({ alTitolo });
  velo(`<div class="pannello stretto" role="dialog" aria-label="Menu"><h2>${h(b.cap.titolo.split(" · ").pop())}</h2>
    <p class="muted">${h(b.cap.obiettivo.testo)}</p>
    <div class="colonna"><button class="btn primary" id="pRiprendi">Riprendi</button><button class="btn" id="pAiuto">Come si gioca</button><button class="btn" id="pOpzioni">Opzioni</button>
      <button class="btn" id="pTitolo">Torna al titolo<small>La battaglia resta salvata: la riprendi con Continua.</small></button></div></div>`, true);
  frecce($(".pannello"));
  const chiudi = () => { suona("annulla"); chiudiVelo(); };
  $("#pRiprendi").onclick = chiudi;
  $("#pAiuto").onclick = () => { suona("clic"); aiuto(riapri); };
  $("#pOpzioni").onclick = () => { suona("clic"); opzioni(riapri); };
  $("#pTitolo").onclick = () => { suona("clic"); musica("titolo"); alTitolo(); };
  $(".pannello").addEventListener("keydown", (e) => { if (e.key === "Escape") { e.stopPropagation(); chiudi(); } });
  $("#pRiprendi").focus();
}

// Chiede conferma quando si chiude il turno con personaggi che non hanno ancora agito.
export function confermaFineTurno(quanti, siFa) {
  velo(`<div class="pannello stretto" role="dialog" aria-label="Fine turno"><h2>Finire il turno?</h2>
    <p>${quanti === 1 ? "Un personaggio non ha" : quanti + " personaggi non hanno"} ancora agito.</p>
    <div class="btns" style="justify-content:flex-end"><button class="btn" id="cNo">Torna alla mappa</button><button class="btn primary" id="cSi">Fine turno</button></div></div>`, true);
  $("#cNo").onclick = () => { suona("annulla"); chiudiVelo(); };
  $("#cSi").onclick = () => { suona("conferma"); chiudiVelo(); siFa(); };
  $(".pannello").addEventListener("keydown", (e) => { if (e.key === "Escape") { e.stopPropagation(); chiudiVelo(); } if (e.key === "ArrowLeft" || e.key === "ArrowRight") (document.activeElement === $("#cSi") ? $("#cNo") : $("#cSi")).focus(); });
  $("#cSi").focus();
}
