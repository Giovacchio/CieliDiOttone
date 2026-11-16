// Scena di scontro: un riquadro con i due ritratti grandi, le barre dei PV e i numeri del colpo,
// che accompagna l'animazione sulla mappa. Con "Veloce" acceso non compare.
import { G, h } from "./stato.js";
import { ritratto } from "./ritratti.js";

let scena = null, lati = null;

function lato(u, st, classe) {
  const arma = G.dati.armi[u.arma];
  return `<div class="slato ${classe} ${u.squadra === "alleato" ? "al" : "ne"}">
    <div class="sritratto"><div class="portrait">${ritratto(G.dati, u)}</div><div class="sdanno"></div></div>
    <div class="sdati"><div class="snome">${h(u.nome)}</div><div class="sarma">${h(arma.nome)}</div>
      <div class="sbarra"><i style="width:${100 * u.pv / u.stat.hp}%"></i></div>
      <div class="spv"><span class="snum"><b>${u.pv}</b>/${u.stat.hp}</span><span class="sst">${st ? `Danno ${st.danno}${st.doppio ? "×2" : ""} · ${st.precisione}%${st.critico ? ` · crit ${st.critico}%` : ""}` : "non contrattacca"}</span></div></div></div>`;
}
export function apriScena(a, d, f) {
  chiudiScena();
  if (G.velocita < 1) return;
  scena = document.createElement("div");
  scena.className = "scena"; scena.setAttribute("aria-hidden", "true");
  // l'alleato sta sempre a sinistra, qualunque sia chi attacca
  const sinistra = a.squadra === "alleato" ? a : d, destra = sinistra === a ? d : a;
  scena.innerHTML = lato(sinistra, sinistra === a ? f.A : f.B, "sx") + `<div class="svs">contro</div>` + lato(destra, destra === a ? f.A : f.B, "dx");
  document.body.appendChild(scena);
  lati = new Map([[sinistra, scena.querySelector(".sx")], [destra, scena.querySelector(".dx")]]);
}
const scuoti = (el, classe) => { el.classList.remove("attacca", "subisce", "schiva", "critico"); void el.offsetWidth; el.classList.add(classe); };
export function scenaAssalto(a) { if (scena && lati.get(a)) scuoti(lati.get(a), "attacca"); }
export function scenaColpo(d, danno, critico) {
  const el = scena && lati.get(d);
  if (!el) return;
  scuoti(el, critico ? "critico" : "subisce");
  el.querySelector(".sbarra i").style.width = Math.max(0, 100 * d.pv / d.stat.hp) + "%";
  el.querySelector(".spv b").textContent = d.pv;
  const n = el.querySelector(".sdanno");
  n.textContent = critico ? `CRITICO ${danno}` : `-${danno}`; n.className = "sdanno"; void n.offsetWidth; n.classList.add("su", critico ? "oro" : "bianco");
  if (d.pv <= 0) el.classList.add("caduto");
}
export function scenaMancato(d) {
  const el = scena && lati.get(d);
  if (!el) return;
  scuoti(el, "schiva");
  const n = el.querySelector(".sdanno");
  n.textContent = "Mancato"; n.className = "sdanno"; void n.offsetWidth; n.classList.add("su", "grigio");
}
export const scenaAperta = () => !!scena;
export function chiudiScena() { if (scena) { scena.remove(); scena = null; lati = null; } }
