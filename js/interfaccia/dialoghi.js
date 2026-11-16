// Scene di dialogo: una battuta alla volta, con il ritratto di chi parla.
import { G, $, h, velo, chiudiVelo } from "./stato.js";
import { ritratto } from "./ritratti.js";
import { unitaCompagnia } from "../motore/unita.js";

// Chi parla: un'unità della battaglia, un membro della Compagnia, oppure un personaggio di png.json.
export function chiParla(id) {
  const D = G.dati;
  const u = G.b && G.inBattaglia ? G.b.trova(id) : null;
  if (u) return u;
  if (D.personaggi[id] && id !== "ordine") {
    if (G.partita?.compagnia[id]) return unitaCompagnia(D, G.partita.compagnia, id);
    const p = D.personaggi[id];
    return { id, nome: p.nome, squadra: "alleato", aspetto: p.aspetto, abilita: p.abilita, compagnia: true };
  }
  const n = D.png[id];
  if (n) return { id, nome: n.nome, squadra: n.squadra || "alleato", aspetto: n.aspetto, classe: n.titolo, narratore: !!n.narratore };
  return { id, nome: id, squadra: "alleato" };
}

// Mostra le battute ["chi", "testo", "espressione facoltativa"]; la promessa si chiude all'ultima.
// Il testo compare una lettera alla volta: il primo tocco lo completa, il secondo passa alla battuta dopo.
// Gli alleati parlano da sinistra, gli avversari da destra.
export function storia(righe) {
  return new Promise((fine) => {
    if (!righe || !righe.length) return fine();
    let i = 0, timer = null, completa = () => {};
    const chiudi = () => { clearInterval(timer); chiudiVelo(); fine(); };
    const mostra = () => {
      clearInterval(timer);
      if (i >= righe.length) return chiudi();
      const [id, testo, espressione] = righe[i], u = chiParla(id), nemico = u.squadra === "nemico";
      const aiuto = `<div class="hint">Tocca o premi Invio per continuare · Esc per saltare</div>`;
      velo(u.narratore
        ? `<div class="dlg narr" id="dlg" role="dialog" aria-label="Narrazione" tabindex="0"><div style="min-width:0;flex:1"><div class="txt" id="dtxt" aria-label="${h(testo)}"></div>${aiuto}</div></div>`
        : `<div class="dlg ${nemico ? "ne" : "al"}" id="dlg" role="dialog" aria-label="Dialogo" tabindex="0"><div class="portrait">${ritratto(G.dati, u, false, espressione)}</div><div style="min-width:0;flex:1">
            <div class="who">${h(u.nome)}</div><div class="txt" id="dtxt" aria-label="${h(testo)}"></div>${aiuto}</div></div>`);
      const d = $("#dlg"), t = $("#dtxt");
      let n = 0, finito = false;
      completa = () => { clearInterval(timer); t.textContent = testo; finito = true; d.classList.add("pronto"); };
      if (G.velocita < 1 || matchMedia("(prefers-reduced-motion: reduce)").matches) completa();
      else timer = setInterval(() => { n += 2; t.textContent = testo.slice(0, n); if (n >= testo.length) completa(); }, 22);
      const avanti = () => { if (!finito) completa(); else { i++; mostra(); } };
      d.focus();
      d.onclick = avanti;
      d.onkeydown = (e) => {
        if (e.key === "Enter" || e.key === " ") { e.preventDefault(); avanti(); }
        if (e.key === "Escape") { e.stopPropagation(); i = righe.length; mostra(); }
      };
    };
    mostra();
  });
}
