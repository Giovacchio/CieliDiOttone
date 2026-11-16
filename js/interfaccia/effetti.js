// Effetti grafici disegnati dal codice, senza librerie: due tele trasparenti sopra la mappa.
//  - "atmosfera" (sotto le pedine): riflessi sull'acqua, braci delle fornaci, lucciole, nuvole, foglie, pulviscolo;
//  - "colpi" (sopra le pedine): fendenti, frecce, magie, esplosioni, cure, critici, sconfitte.
// Tutto è fatto di particelle semplici; se il dispositivo chiede meno movimento, l'atmosfera resta spenta.
const S = { amb: null, fx: null, T: 48, W: 0, H: 0, sotto: [], sopra: [], sorgenti: [], luci: [], ultimo: 0, giro: false, tempo: 0 };
const pocoMovimento = typeof matchMedia !== "undefined" && matchMedia("(prefers-reduced-motion: reduce)").matches;
let calmo = pocoMovimento;
// Accende o spegne l'atmosfera delle mappe (opzione del giocatore); gli effetti dei colpi restano.
export function impostaAtmosfera(accesa) { calmo = pocoMovimento || !accesa; if (calmo) S.sotto = []; }
const caso = (a, b) => a + Math.random() * (b - a);
const scegli = (l) => l[Math.floor(Math.random() * l.length)];

function misura(c) {
  if (!c) return null;
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  c.width = Math.round(S.W * dpr); c.height = Math.round(S.H * dpr);
  c.style.width = S.W + "px"; c.style.height = S.H + "px";
  const ctx = c.getContext("2d");
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  return ctx;
}

// Da chiamare a ogni nuova mappa o cambio di dimensione delle caselle.
export function impostaScena(b, lato) {
  S.T = lato; S.W = b.larghe * lato; S.H = b.alte * lato;
  S.amb = misura(document.querySelector("#amb")); S.fx = misura(document.querySelector("#fx"));
  S.sotto = []; S.sopra = []; S.sorgenti = []; S.luci = [];
  const dove = {}, tema = b.cap.tema || "citta", notte = /notte/.test(tema);
  b.righe.forEach((r, y) => [...r].forEach((c, x) => (dove[c] ||= []).push({ x, y })));
  const acqua = [...(dove.w || []), ...(dove["~"] || [])], prato = [...(dove["."] || []), ...(dove.f || [])];
  const sorgente = (tipo, caselle, alSecondo, tetto) => { if (caselle && caselle.length) S.sorgenti.push({ tipo, caselle, ritmo: Math.min(tetto, caselle.length * alSecondo), conto: 0 }); };
  sorgente("riflesso", acqua, 0.5, 14);
  sorgente("brace", dove.F, 2.2, 10);
  sorgente("etere", dove.c, 1.2, 10);
  if (notte) sorgente("lucciola", prato, 0.03, 4);
  if (tema === "foresta") sorgente("foglia", dove.f, 0.04, 2.5);
  if (tema === "miniera") sorgente("pulviscolo", [...(dove["."] || []), ...(dove.r || [])], 0.04, 4);
  if (tema === "cielo") sorgente("velo", dove.o, 0.02, 1.2);
  if (tema === "campagna" || tema === "cielo") sorgente("nuvola", [{ x: -3, y: 0 }], 0.12, 0.12);
  if (notte || tema === "miniera") for (const c of [...(dove.L || []), ...(dove.F || [])]) S.luci.push({ x: (c.x + 0.5) * lato, y: (c.y + 0.4) * lato, fase: Math.random() * 6 });
  if (!calmo && (tema === "campagna" || tema === "cielo")) for (let i = 0; i < 2; i++) nasce("nuvola", { x: caso(0, b.larghe), y: 0 });
  if (!S.giro) { S.giro = true; S.ultimo = performance.now(); requestAnimationFrame(ciclo); }
}

function nasce(tipo, c) {
  const T = S.T, x = (c.x + Math.random()) * T, y = (c.y + Math.random()) * T, P = S.sotto;
  if (tipo === "riflesso") P.push({ f: "tratto", x, y, vx: caso(4, 10), vy: 0, vita: caso(0.9, 1.6), r: caso(T * 0.08, T * 0.2), col: "255,255,255", a: 0.5, onda: true });
  else if (tipo === "brace") P.push({ f: "punto", x: (c.x + caso(0.25, 0.75)) * T, y: (c.y + 0.5) * T, vx: caso(-6, 6), vy: caso(-34, -16), vita: caso(0.8, 1.6), r: caso(1, 2.2), col: scegli(["255,170,70", "255,120,50", "255,210,120"]), a: 0.9, onda: true, luce: true });
  else if (tipo === "etere") P.push({ f: "punto", x, y, vx: caso(-3, 3), vy: caso(-16, -7), vita: caso(1.2, 2.2), r: caso(1, 2.4), col: "140,240,200", a: 0.8, onda: true, luce: true });
  else if (tipo === "lucciola") P.push({ f: "punto", x, y, vx: caso(-8, 8), vy: caso(-6, 6), vita: caso(3, 5.5), r: caso(1.2, 2), col: "220,240,130", a: 0.9, onda: true, luce: true, vaga: caso(0, 6) });
  else if (tipo === "foglia") P.push({ f: "foglia", x, y, vx: caso(10, 22), vy: caso(8, 16), vita: caso(2.5, 4), r: caso(2.5, 4), col: scegli(["120,160,70", "160,150,60", "90,140,70"]), a: 0.8, onda: true, rot: caso(0, 6), giro: caso(-3, 3) });
  else if (tipo === "pulviscolo") P.push({ f: "punto", x, y, vx: caso(-4, 4), vy: caso(-5, 2), vita: caso(2.5, 5), r: caso(0.8, 1.6), col: "230,215,180", a: 0.35, onda: true });
  else if (tipo === "velo") P.push({ f: "nube", x: -T * 2, y, vx: caso(14, 26), vy: 0, vita: S.W / 14 + 6, r: caso(T * 1.2, T * 2.4), col: "255,255,255", a: 0.07, onda: true });
  else if (tipo === "nuvola") P.push({ f: "nube", x: c.x * T, y: caso(0, S.H), vx: caso(7, 12), vy: caso(-1, 1), vita: (S.W + T * 8) / 7, r: caso(T * 2, T * 3.6), col: "0,0,0", a: 0.13, onda: true });
}

function ciclo(ora) {
  const dt = Math.min(0.05, (ora - S.ultimo) / 1000);
  S.ultimo = ora; S.tempo += dt;
  if (!S.amb || !S.fx || !document.body.contains(S.fx.canvas)) { S.giro = false; return; }
  if (!calmo && !document.hidden) for (const s of S.sorgenti) {
    s.conto += s.ritmo * dt;
    while (s.conto >= 1) { s.conto--; if (S.sotto.length < 260) nasce(s.tipo, scegli(s.caselle)); }
  }
  dipingi(S.amb, S.sotto, dt, true);
  dipingi(S.fx, S.sopra, dt, false);
  requestAnimationFrame(ciclo);
}

function dipingi(ctx, P, dt, conLuci) {
  ctx.clearRect(0, 0, S.W, S.H);
  if (conLuci && !calmo) for (const l of S.luci) { // alone tremolante di lampioni e fornaci
    const forza = 0.16 + 0.05 * Math.sin(S.tempo * 5 + l.fase) + 0.03 * Math.sin(S.tempo * 13 + l.fase), r = S.T * 1.7;
    const g = ctx.createRadialGradient(l.x, l.y, 0, l.x, l.y, r);
    g.addColorStop(0, `rgba(255,190,110,${forza})`); g.addColorStop(1, "rgba(255,190,110,0)");
    ctx.fillStyle = g; ctx.fillRect(l.x - r, l.y - r, r * 2, r * 2);
  }
  for (let i = P.length - 1; i >= 0; i--) {
    const p = P[i];
    p.eta = (p.eta || 0) + dt;
    if (p.eta < 0) continue;                       // particella in attesa (effetti in sequenza)
    if (p.eta >= p.vita) { P.splice(i, 1); continue; }
    const k = p.eta / p.vita;
    if (p.vaga != null) { p.vx += Math.cos(S.tempo * 1.3 + p.vaga) * 14 * dt; p.vy += Math.sin(S.tempo * 1.7 + p.vaga) * 14 * dt; }
    p.vy += (p.peso || 0) * dt; p.vx *= 1 - (p.freno || 0) * dt; p.vy *= 1 - (p.freno || 0) * dt;
    p.x += p.vx * dt; p.y += p.vy * dt;
    if (p.giro) p.rot += p.giro * dt;
    const alfa = p.a * (p.onda ? Math.sin(Math.PI * k) : 1 - k);
    ctx.globalCompositeOperation = p.luce ? "lighter" : "source-over";
    if (p.f === "punto") {
      const r = p.r * (p.cresce ? 1 + k * p.cresce : 1);
      if (p.luce) { ctx.fillStyle = `rgba(${p.col},${alfa * 0.25})`; ctx.beginPath(); ctx.arc(p.x, p.y, r * 3, 0, 7); ctx.fill(); }
      ctx.fillStyle = `rgba(${p.col},${alfa})`; ctx.beginPath(); ctx.arc(p.x, p.y, r, 0, 7); ctx.fill();
    } else if (p.f === "tratto") {
      const v = Math.hypot(p.vx, p.vy) || 1, l = p.lungo || p.r;
      ctx.strokeStyle = `rgba(${p.col},${alfa})`; ctx.lineWidth = p.spesso || 1.3; ctx.lineCap = "round";
      ctx.beginPath(); ctx.moveTo(p.x - p.vx / v * l, p.y - p.vy / v * l); ctx.lineTo(p.x, p.y); ctx.stroke();
    } else if (p.f === "anello") {
      ctx.strokeStyle = `rgba(${p.col},${alfa})`; ctx.lineWidth = (p.spesso || 3) * (1 - k);
      ctx.beginPath(); ctx.arc(p.x, p.y, p.r * (0.2 + k), 0, 7); ctx.stroke();
    } else if (p.f === "arco") {                    // fendente: una falce che si apre
      const da = p.rot - 1.2 + k * 0.5, a = p.rot - 1.2 + Math.min(1, k * 2.2) * 2.4;
      ctx.strokeStyle = `rgba(${p.col},${alfa})`; ctx.lineWidth = p.spesso * (1 - k * 0.6); ctx.lineCap = "round";
      ctx.beginPath(); ctx.arc(p.x, p.y, p.r, da, a); ctx.stroke();
      ctx.strokeStyle = `rgba(255,255,255,${alfa})`; ctx.lineWidth = Math.max(1, p.spesso * 0.35 * (1 - k));
      ctx.beginPath(); ctx.arc(p.x, p.y, p.r, da, a); ctx.stroke();
    } else if (p.f === "foglia") {
      ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.rot); ctx.fillStyle = `rgba(${p.col},${alfa})`;
      ctx.beginPath(); ctx.ellipse(0, 0, p.r, p.r * 0.45, 0, 0, 7); ctx.fill(); ctx.restore();
    } else if (p.f === "nube") {
      const g = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.r);
      g.addColorStop(0, `rgba(${p.col},${alfa})`); g.addColorStop(1, `rgba(${p.col},0)`);
      ctx.fillStyle = g; ctx.beginPath(); ctx.ellipse(p.x, p.y, p.r * 1.5, p.r, 0, 0, 7); ctx.fill();
    } else if (p.f === "lampo") {
      ctx.fillStyle = `rgba(${p.col},${alfa})`; ctx.fillRect(0, 0, S.W, S.H);
    }
  }
  ctx.globalCompositeOperation = "source-over";
}

// ------------------------------------------------------------------ effetti dei colpi (coordinate in caselle)
const centro = (u) => ({ x: (u.x + 0.5) * S.T, y: (u.y + 0.42) * S.T });
const su = (p) => { if (S.sopra.length < 400) S.sopra.push(p); };
function scintille(c, n, col, forza = 1, ritardo = 0) {
  for (let i = 0; i < n; i++) {
    const a = caso(0, 6.3), v = caso(40, 150) * forza;
    su({ f: "tratto", x: c.x, y: c.y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, vita: caso(0.2, 0.45), r: 5, lungo: caso(4, 9) * forza, spesso: 1.6, col, a: 1, freno: 3, peso: 160, luce: true, eta: -ritardo });
  }
}
const COLORI = { spada: "235,240,255", lancia: "220,235,255", ascia: "255,215,160", arco: "240,225,190", polvere: "255,200,120", etere: "150,225,255", congegni: "255,165,80", cura: "141,224,143" };

// Il colpo che va a segno: l'effetto dipende dal tipo di arma.
export function colpo(arma, a, d, critico) {
  if (!S.fx) return;
  const T = S.T, da = centro(a), c = centro(d), ang = Math.atan2(c.y - da.y, c.x - da.x);
  const natura = arma.icona === "leaf", col = natura ? "150,235,140" : (COLORI[arma.tipo] || "255,255,255");
  const lontano = Math.abs(a.x - d.x) + Math.abs(a.y - d.y) > 1;
  let ritardo = 0;
  if (lontano || arma.tipo === "arco" || arma.tipo === "polvere") { // qualcosa vola dall'attaccante al bersaglio
    const dist = Math.hypot(c.x - da.x, c.y - da.y), tempo = 0.14, v = dist / tempo;
    su({ f: arma.magica ? "punto" : "tratto", x: da.x, y: da.y, vx: Math.cos(ang) * v, vy: Math.sin(ang) * v, vita: tempo, r: arma.magica ? T * 0.1 : 6, lungo: T * 0.4, spesso: 2.4, col, a: 1, luce: true, onda: false });
    if (arma.tipo === "polvere") for (let i = 0; i < 6; i++) su({ f: "punto", x: da.x + Math.cos(ang) * T * 0.3, y: da.y + Math.sin(ang) * T * 0.3, vx: Math.cos(ang) * caso(10, 40) + caso(-12, 12), vy: Math.sin(ang) * caso(10, 40) - caso(5, 25), vita: caso(0.4, 0.8), r: caso(3, 6), col: "200,200,200", a: 0.4, cresce: 1.5 });
    ritardo = tempo;
  }
  if (arma.magica) {
    for (let i = 0; i < 12; i++) { const an = caso(0, 6.3), r = caso(T * 0.3, T * 0.6); su({ f: natura ? "foglia" : "punto", x: c.x + Math.cos(an) * r, y: c.y + Math.sin(an) * r, vx: -Math.cos(an) * r * 3, vy: -Math.sin(an) * r * 3, vita: 0.33, r: caso(2, 3.6), col, a: 1, luce: !natura, rot: an, giro: 8, eta: -ritardo }); }
    su({ f: "anello", x: c.x, y: c.y, vx: 0, vy: 0, vita: 0.4, r: T * 0.55, spesso: 4, col, a: 0.9, luce: true, eta: -ritardo - 0.2 });
    scintille(c, 6, col, 0.7, ritardo + 0.2);
  } else if (arma.tipo === "congegni") {
    su({ f: "anello", x: c.x, y: c.y, vx: 0, vy: 0, vita: 0.35, r: T * 0.6, spesso: 5, col, a: 1, luce: true, eta: -ritardo });
    for (let i = 0; i < 8; i++) su({ f: "punto", x: c.x, y: c.y, vx: caso(-50, 50), vy: caso(-60, 20), vita: caso(0.4, 0.7), r: caso(3, 7), col: scegli(["255,150,60", "255,210,120", "120,120,120"]), a: 0.8, cresce: 1.2, freno: 2, eta: -ritardo });
    scintille(c, 8, col, 1, ritardo);
  } else if (arma.tipo === "ascia") {
    su({ f: "arco", x: c.x, y: c.y, vx: 0, vy: 0, vita: 0.28, r: T * 0.42, spesso: 7, col, a: 1, rot: ang + 1.2, luce: true });
    su({ f: "anello", x: c.x, y: c.y + T * 0.2, vx: 0, vy: 0, vita: 0.35, r: T * 0.5, spesso: 3, col: "200,180,150", a: 0.7, eta: -0.08 });
    scintille(c, 9, col, 1.1, 0.06);
  } else if (arma.tipo === "lancia") {
    const v = T * 9;
    su({ f: "tratto", x: c.x - Math.cos(ang) * T * 0.6, y: c.y - Math.sin(ang) * T * 0.6, vx: Math.cos(ang) * v, vy: Math.sin(ang) * v, vita: 0.12, r: 6, lungo: T * 0.7, spesso: 3, col, a: 1, luce: true });
    scintille(c, 6, col, 0.9, 0.05);
  } else if (arma.tipo === "arco" || arma.tipo === "polvere") {
    scintille(c, 7, col, 0.9, ritardo);
  } else { // spade e stocchi
    su({ f: "arco", x: c.x, y: c.y, vx: 0, vy: 0, vita: 0.24, r: T * 0.4, spesso: 5, col, a: 1, rot: ang + 0.6, luce: true });
    scintille(c, 5, col, 0.8, 0.05);
  }
  if (critico) {
    su({ f: "lampo", x: 0, y: 0, vx: 0, vy: 0, vita: 0.22, col: "255,235,170", a: 0.28, eta: -ritardo });
    su({ f: "anello", x: c.x, y: c.y, vx: 0, vy: 0, vita: 0.5, r: T * 0.95, spesso: 6, col: "255,207,90", a: 1, luce: true, eta: -ritardo });
    scintille(c, 18, "255,215,110", 1.5, ritardo);
  }
}
export function mancato(a, d) {
  if (!S.fx) return;
  const c = centro(d), da = centro(a), ang = Math.atan2(c.y - da.y, c.x - da.x), v = S.T * 7;
  su({ f: "tratto", x: c.x - Math.cos(ang) * S.T * 0.5, y: c.y - Math.sin(ang) * S.T * 0.5 - S.T * 0.25, vx: Math.cos(ang) * v, vy: Math.sin(ang) * v, vita: 0.16, r: 6, lungo: S.T * 0.5, spesso: 1.5, col: "200,205,215", a: 0.7 });
}
export function cura(u) {
  if (!S.fx) return;
  const c = centro(u), T = S.T;
  su({ f: "anello", x: c.x, y: c.y + T * 0.2, vx: 0, vy: 0, vita: 0.6, r: T * 0.55, spesso: 3, col: COLORI.cura, a: 0.8, luce: true });
  for (let i = 0; i < 10; i++) su({ f: "punto", x: c.x + caso(-T * 0.3, T * 0.3), y: c.y + caso(0, T * 0.35), vx: caso(-4, 4), vy: caso(-55, -25), vita: caso(0.5, 0.9), r: caso(1.4, 2.6), col: COLORI.cura, a: 1, luce: true, onda: true, eta: -i * 0.03 });
}
export function sconfitta(u) {
  if (!S.fx) return;
  const c = centro(u), T = S.T;
  for (let i = 0; i < 16; i++) su({ f: "punto", x: c.x + caso(-T * 0.25, T * 0.25), y: c.y + caso(-T * 0.25, T * 0.25), vx: caso(-20, 20), vy: caso(-50, -10), vita: caso(0.5, 1), r: caso(2, 5), col: scegli(["60,62,70", "110,112,120", "30,30,36"]), a: 0.75, cresce: 0.8, freno: 1.5 });
}
export function arrivo(u) {
  if (!S.fx) return;
  const c = centro(u), T = S.T;
  su({ f: "anello", x: c.x, y: c.y + T * 0.25, vx: 0, vy: 0, vita: 0.5, r: T * 0.6, spesso: 3, col: "220,200,160", a: 0.7 });
  for (let i = 0; i < 6; i++) su({ f: "punto", x: c.x + caso(-T * 0.3, T * 0.3), y: c.y + T * 0.35, vx: caso(-25, 25), vy: caso(-18, -4), vita: caso(0.4, 0.7), r: caso(3, 6), col: "190,175,150", a: 0.4, cresce: 1 });
}
export function livello(u) {
  if (!S.fx) return;
  const c = centro(u), T = S.T;
  su({ f: "anello", x: c.x, y: c.y, vx: 0, vy: 0, vita: 0.7, r: T * 0.8, spesso: 4, col: "255,207,90", a: 1, luce: true });
  for (let i = 0; i < 14; i++) su({ f: "punto", x: c.x + caso(-T * 0.35, T * 0.35), y: c.y + T * 0.3, vx: caso(-6, 6), vy: caso(-80, -35), vita: caso(0.6, 1.1), r: caso(1.4, 2.8), col: "255,215,110", a: 1, luce: true, onda: true, eta: -i * 0.025 });
}
// Polvere sotto i piedi mentre una pedina cammina.
export function passo(x, y) {
  if (!S.fx || calmo) return;
  const T = S.T;
  for (let i = 0; i < 2; i++) su({ f: "punto", x: (x + 0.5) * T + caso(-4, 4), y: (y + 0.82) * T, vx: caso(-10, 10), vy: caso(-10, -2), vita: caso(0.3, 0.5), r: caso(2, 3.5), col: "200,190,170", a: 0.3, cresce: 1 });
}
