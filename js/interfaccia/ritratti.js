// Ritratti. Finché non ci sono i PNG definitivi si usano ritratti SVG disegnati dal codice
// (quelli del prototipo, riportati com'erano). Se in assets/ritratti/ c'è un file con il nome giusto
// (per esempio wata.png, wata_sorriso.png) viene mostrato sopra l'SVG; se manca, resta l'SVG.
const LOOKS = {};
const PREDEFINITO = { skin: "#d9b08c", hair: "#222", style: "helm", coat: "#7a2e29" };
const CARTELLA = "assets/ritratti/";
const mancanti = new Set(), presenti = new Set();

export function aspettoDi(dati, u) {
  const a = u.aspetto, M = dati.aspetti.modelli;
  if (typeof a === "string") return M[a] || PREDEFINITO;
  if (a && a.modello) { const { modello, ...resto } = a; return { ...M[modello], ...resto }; }
  return a || dati.aspetti.classi[u.classe] || PREDEFINITO;
}

// Restituisce l'HTML del ritratto. "mini" = medaglione sulla mappa. "espressione" = es. "sorriso".
export function ritratto(dati, u, mini = false, espressione = "") {
  const svg = portrait({ look: aspettoDi(dati, u), team: u.squadra === "nemico" ? "enemy" : "ally", skill: { cat: !!u.abilita?.gatto }, name: u.nome || "" }, mini);
  const id = u.ritratto || ((u.compagnia || dati.personaggi[u.id] || dati.png[u.id]) ? u.id : null);
  if (!id || !/^[a-z0-9_-]+$/i.test(id)) return svg;
  const base = id + ".png", voluto = espressione ? `${id}_${espressione}.png` : base;
  const file = !mancanti.has(voluto) ? voluto : (!mancanti.has(base) ? base : null);
  if (!file) return svg;
  return svg + `<img class="png" alt="" src="${CARTELLA}${file}" data-file="${file}" data-base="${base}"${presenti.has(file) ? "" : ' style="visibility:hidden"'}>`;
}

// Un solo ascoltatore per tutta la pagina: mostra i PNG che esistono, toglie quelli che mancano.
if (typeof document !== "undefined") {
  document.addEventListener("load", (e) => {
    const i = e.target;
    if (i.tagName === "IMG" && i.dataset.file) { presenti.add(i.dataset.file); i.style.visibility = ""; }
  }, true);
  document.addEventListener("error", (e) => {
    const i = e.target;
    if (i.tagName !== "IMG" || !i.dataset.file) return;
    mancanti.add(i.dataset.file);
    if (i.dataset.file !== i.dataset.base && !mancanti.has(i.dataset.base)) { i.dataset.file = i.dataset.base; i.src = CARTELLA + i.dataset.base; }
    else i.remove();
  }, true);
}

let PID = 0;
function shade(hex, f){ const n=parseInt(hex.slice(1),16), t=f<0?0:255, p=Math.abs(f);
  const c=[n>>16,(n>>8)&255,n&255].map(v=>Math.round(v+(t-v)*p)); return "#"+c.map(v=>v.toString(16).padStart(2,"0")).join(""); }
function portrait(u, mini){
  const L = u.look || LOOKS[u.cls] || {skin:"#d9b08c", hair:"#222", style:"helm", coat:"#7a2e29"};
  const id = "p"+(PID++), ally = u.team==="ally";
  const hD=shade(L.hair,-.4), hL=shade(L.hair,.38), sD=shade(L.skin,-.2), sL=shade(L.skin,.14), cD=shade(L.coat,-.42), cL=shade(L.coat,.22);
  const eye = L.eye || "#4a3020";
  const H = `url(#${id}h)`;
  const hairTop = {
    short:`<path d="M27 42c0-14 9-22 21-22s21 8 21 22c-4-6-10-9-21-9s-17 3-21 9z" fill="${H}"/>`,
    messy:`<path d="M26 45c-2-16 7-25 22-25s25 9 23 25l-4-7-3 6-4-8-4 7-4-8-4 7-4-8-4 8-3-6z" fill="${H}"/>`,
    helm:`<path d="M25 46c0-17 10-27 23-27s23 10 23 27z" fill="url(#${id}m)"/><rect x="24" y="42" width="48" height="5" rx="1" fill="#4b5058"/><path d="M48 19v23" stroke="#9aa0a8" stroke-width="2"/><circle cx="30" cy="44.5" r="1" fill="#c9a24f"/><circle cx="66" cy="44.5" r="1" fill="#c9a24f"/>`,
    tricorn:`<path d="M27 40c0-12 9-19 21-19s21 7 21 19z" fill="${H}"/><path d="M18 38c8-12 22-18 30-18s22 6 30 18c-8-3-18-4-30-4s-22 1-30 4z" fill="#2a1e1a"/><path d="M18 38c10-3 20-4 30-4s20 1 30 4" stroke="#c9a24f" stroke-width="1.4" fill="none"/>`,
    bald:`<path d="M28 38c2-12 10-18 20-18s18 6 20 18c-6-4-13-6-20-6s-14 2-20 6z" fill="${L.hair}" opacity=".35"/>`,
    tuft:`<path d="M27 43c0-14 9-22 21-22s21 8 21 22c-3-5-7-8-12-9l-4 4-2-5c-4 0-9 1-13 3-4 2-7 5-11 7z" fill="${H}"/><path d="M38 31c1-12 15-18 25-11-7 0-10 3-11 8-4-3-10-2-14 3z" fill="${H}"/><path d="M43 26c6-5 13-4 17 0M33 34c4-4 9-5 13-5" stroke="${hL}" stroke-width="1.4" fill="none" opacity=".7"/>`,
    longv:`<path d="M26 46c0-16 9-25 22-25s22 9 22 25c-3-6-7-10-12-11-3 4-9 6-15 6-6 1-12 3-17 5z" fill="${H}"/><path d="M33 31c5-5 11-6 17-5M56 27c4 1 7 4 9 7" stroke="${hL}" stroke-width="1.5" fill="none" opacity=".6"/>`,
    bob:`<path d="M26 52c-1-4-1-7 0-10 2-14 11-22 22-22s20 8 22 22c1 3 1 6 0 10h-4c0-5-1-9-3-11-2-3-5-5-8-6-1 3-4 5-8 6-4 1-8 3-11 6-2 2-3 3-3 5z" fill="${H}"/><path d="M34 28c5-4 11-5 17-4" stroke="${hL}" stroke-width="1.5" fill="none" opacity=".6"/>`,
    curly:`<g fill="${H}"><circle cx="32" cy="35" r="7"/><circle cx="40" cy="27.5" r="7.5"/><circle cx="49" cy="25.5" r="7.5"/><circle cx="58" cy="28" r="7"/><circle cx="65" cy="35" r="6.5"/><circle cx="29.5" cy="42" r="5"/><circle cx="66.5" cy="43" r="5"/><circle cx="45" cy="31" r="6"/><circle cx="54" cy="31.5" r="6"/></g><g fill="${hL}" opacity=".35"><circle cx="39" cy="25" r="2.5"/><circle cx="48" cy="23" r="2.5"/><circle cx="57" cy="26" r="2.2"/></g>`,
    hood:`<path d="M20 60c0-26 12-42 28-42s28 16 28 42c-3-4-6-6-9-7 0-16-8-25-19-25s-19 9-19 25c-3 1-6 3-9 7z" fill="${L.coat}"/><path d="M29 52c0-15 8-23 19-23s19 8 19 23c-5-6-11-9-19-9s-14 3-19 9z" fill="#0006"/>`,
    greathelm:`<path d="M27 64V42c0-15 9-23 21-23s21 8 21 23v22c-6 4-13 6-21 6s-15-2-21-6z" fill="url(#${id}m)"/><rect x="31" y="43" width="34" height="4" rx="2" fill="#111"/><path d="M48 21v42" stroke="#9aa0a8" stroke-width="1.6"/><path d="M27 52h42" stroke="#c9a24f" stroke-width="1.5"/>${[36,41,55,60].map(x=>`<circle cx="${x}" cy="57" r="1" fill="#222"/>`).join("")}`,
  }[L.style] || "";
  const hairBack = {
    longv:`<path d="M24 46c0-17 10-28 24-28s24 11 24 28v38c-4 0-8-3-9-8V50c0-4-3-8-7-10-1 4-4 6-8 7-5 1-11 3-15 7v22c-1 5-5 8-9 8z" fill="${H}"/>`,
    bob:`<path d="M26.5 62c-2-6-2.5-12-1-19 2-14 11-22 22.5-22s20.5 8 22.5 22c1.5 7 1 13-1 19h-6v-6c0-8-5-13-15.5-13s-15.5 5-15.5 13v6z" fill="${L.under||L.hair}"/>`,
    hood:`<path d="M16 96c2-30 14-48 32-48s30 18 32 48z" fill="${cD}"/>`,
  }[L.style] || "";
  const beard = L.beard==="full"
    ? `<path d="M30 48c0 14 7 22 18 22s18-8 18-22c-2 6-5 9-8 10-3-2-6-3-10-3s-7 1-10 3c-3-1-6-4-8-10z" fill="${L.hair}"/><path d="M42 58c3-1 9-1 12 0" stroke="${hD}" stroke-width="1.5" fill="none"/>`
    : L.beard ? `<path d="M31 48c1 11 7 18 17 18s16-7 17-18c-1 5-3 9-6 11-3-1-7-2-11-2s-8 1-11 2c-3-2-5-6-6-11z" fill="${L.hair}" opacity=".55"/>` : "";
  const covered = L.style==="greathelm";
  const face = covered ? "" : `
    <ellipse cx="30.5" cy="48" rx="3" ry="4.5" fill="${sD}"/><ellipse cx="65.5" cy="48" rx="3" ry="4.5" fill="${sD}"/>
    <ellipse cx="48" cy="45" rx="18" ry="21" fill="url(#${id}s)"/>
    <path d="M62 34c4 6 5 14 3 21" stroke="#ffe8c8" stroke-width="1.6" fill="none" opacity=".35"/>
    <ellipse cx="38.5" cy="53" rx="4" ry="2.3" fill="#e0706a" opacity=".22"/><ellipse cx="57.5" cy="53" rx="4" ry="2.3" fill="#e0706a" opacity=".22"/>
    <path d="M36 40.5q4-2.4 7.5-.6M52.5 39.9q3.5-1.8 7.5.6" stroke="${hD}" stroke-width="1.9" fill="none" stroke-linecap="round"/>
    ${[41,55].map(x=>`<ellipse cx="${x}" cy="46.5" rx="3.4" ry="2.7" fill="#f6efe6"/><circle cx="${x+.3}" cy="46.6" r="2.15" fill="${eye}"/><circle cx="${x+.3}" cy="46.6" r="1" fill="#120c0a"/><circle cx="${x+1}" cy="45.8" r=".7" fill="#fff"/><path d="M${x-3.6} 45.6q3.6-2.6 7.2 0" stroke="#20160f" stroke-width="1.3" fill="none"/>`).join("")}
    <path d="M48 47.5v5.5q-1.5 1.2-3 .4" stroke="${sD}" stroke-width="1.4" fill="none" stroke-linecap="round"/>
    <path d="M43.5 58.5q4.5 2.6 9 0" stroke="#8a4a3c" stroke-width="1.6" fill="none" stroke-linecap="round"/>
    ${L.scar?`<path d="M56 38l6 12" stroke="#8a4a3c" stroke-width="1.4" opacity=".8"/>`:""}`;
  const acc = {
    epaulette:`<path d="M14 82c4-5 9-7 14-7l2 6c-6 0-11 2-16 6z" fill="#c9a24f"/><path d="M82 82c-4-5-9-7-14-7l-2 6c6 0 11 2 16 6z" fill="#c9a24f"/>`,
    jabot:`<path d="M42 70l6 4 6-4-2 10-4 6-4-6z" fill="#f4f0e8"/><path d="M44 76q4 2 8 0M45 80q3 1.6 6 0" stroke="#c8c2b6" stroke-width="1" fill="none"/>`,
    leaf:`<path d="M36 78c4-6 10-6 12-2-3 4-8 5-12 2z" fill="#7fb25a"/><path d="M37 78c3-1 7-2 10-2" stroke="#3f6a2a" stroke-width=".8"/><circle cx="48" cy="77" r="1.8" fill="#c9a24f"/>`,
    vial:`<path d="M48 70v8" stroke="#6a4a2a" stroke-width="1"/><path d="M46 78h4l1.5 6a3.5 3.5 0 0 1-7 0z" fill="#6fd08a" stroke="#d8f0e0" stroke-width=".8"/><path d="M32 30c3-3 7-3 9 0-3 2-6 2-9 0zM55 29c3-3 7-3 9 0-3 2-6 2-9 0z" fill="#6f9a4a"/>`,
  }[L.acc] || "";
  const cat = (!mini && u.skill?.cat) ? `<g transform="translate(66 70)"><path d="M0 26V8l4-8 5 6h10l5-6 4 8v18z" fill="#e8873a"/><path d="M3 9l1-5 3 4zM25 9l-1-5-3 4z" fill="#f6b27a"/><path d="M4 14h4M20 14h4M10 20q4 2 8 0" stroke="#a5521a" stroke-width="1.2" fill="none"/><ellipse cx="9.5" cy="12.5" rx="1.6" ry="2" fill="#3a6a2a"/><ellipse cx="18.5" cy="12.5" rx="1.6" ry="2" fill="#3a6a2a"/><path d="M13 16.5l1 1 1-1" stroke="#7a3a1a" fill="#e07070"/></g>` : "";
  const vb = mini ? "21 14 54 54" : "0 0 96 96";
  return `<svg viewBox="${vb}" width="100%" height="100%" role="img" aria-label="Ritratto di ${u.name}"><defs>
    <radialGradient id="${id}b" cx=".72" cy=".2" r=".95"><stop offset="0" stop-color="${ally?"#3d6290":"#7a3530"}"/><stop offset=".6" stop-color="${ally?"#1d2c42":"#341818"}"/><stop offset="1" stop-color="${ally?"#111a27":"#1a0d0d"}"/></radialGradient>
    <linearGradient id="${id}h" x1="0" y1="0" x2=".3" y2="1"><stop offset="0" stop-color="${hL}"/><stop offset=".45" stop-color="${L.hair}"/><stop offset="1" stop-color="${hD}"/></linearGradient>
    <radialGradient id="${id}s" cx=".38" cy=".34" r=".75"><stop offset="0" stop-color="${sL}"/><stop offset=".6" stop-color="${L.skin}"/><stop offset="1" stop-color="${sD}"/></radialGradient>
    <linearGradient id="${id}c" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${cL}"/><stop offset=".55" stop-color="${L.coat}"/><stop offset="1" stop-color="${cD}"/></linearGradient>
    <linearGradient id="${id}m" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#b7bcc4"/><stop offset=".5" stop-color="#6f747d"/><stop offset="1" stop-color="#3b3f46"/></linearGradient>
  </defs>
    <rect x="0" y="0" width="96" height="96" fill="url(#${id}b)"/>
    ${mini?"":`<path d="M60 0L96 0 96 40z" fill="#fff" opacity=".04"/><path d="M40 0h10L96 60v12z" fill="#fff" opacity=".03"/>`}
    ${hairBack}
    <path d="M10 96c3-19 17-28 38-28s35 9 38 28z" fill="url(#${id}c)"/>
    <path d="M37 69l11 15 11-15" fill="${shade(L.coat,-.2)}"/><path d="M41 68l7 11 7-11z" fill="#e6dccb"/>
    <path d="M37 69l11 15 11-15" stroke="${cD}" stroke-width="1.6" fill="none"/>
    ${[86,92].map(y=>`<circle cx="48" cy="${y}" r="1.4" fill="#d2a24c"/>`).join("")}
    <path d="M42 58h12v12c-2 2-4 3-6 3s-4-1-6-3z" fill="${sD}"/>
    ${face}${beard}${hairTop}${acc}${cat}
  </svg>`;
}

