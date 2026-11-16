// Lo sfondo del titolo: un tramonto d'ottone con nuvole, aeronavi e i camini di Corvara, dipinto e animato dal codice.
export function avviaCielo(tela) {
  const ctx = tela.getContext("2d");
  let seme = 7, W = 0, H = 0, t0 = performance.now();
  const caso = () => { seme = (seme * 1664525 + 1013904223) >>> 0; return seme / 4294967296; };
  const nuvole = Array.from({ length: 26 }, () => ({ x: caso(), y: 0.18 + caso() * 0.5, r: 0.05 + caso() * 0.12, v: 0.002 + caso() * 0.006, a: 0.05 + caso() * 0.12 }));
  const navi = [{ x: 0.15, y: 0.3, s: 1, v: 0.006 }, { x: 0.62, y: 0.2, s: 0.55, v: 0.004 }, { x: 0.85, y: 0.44, s: 0.36, v: 0.003 }];
  const torri = Array.from({ length: 34 }, (_, i) => ({ x: i / 33 + (caso() - 0.5) * 0.02, w: 0.018 + caso() * 0.03, h: 0.05 + caso() * 0.17, camino: caso() < 0.3, luci: Math.floor(caso() * 5), fase: caso() * 6 }));
  const fumi = [];
  const calmo = matchMedia("(prefers-reduced-motion: reduce)").matches;

  function misura() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    W = tela.clientWidth; H = tela.clientHeight;
    tela.width = W * dpr; tela.height = H * dpr; ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }
  function nave(x, y, s, t) {
    const u = H * 0.11 * s;
    y += Math.sin(t * 0.5 + x * 9) * u * 0.06;
    ctx.fillStyle = "#17120e";
    ctx.beginPath(); ctx.ellipse(x, y, u * 1.5, u * 0.42, 0, 0, 7); ctx.fill();                 // pallone
    ctx.beginPath(); ctx.moveTo(x - u * 1.35, y); ctx.lineTo(x - u * 1.95, y - u * 0.4); ctx.lineTo(x - u * 1.75, y); ctx.lineTo(x - u * 1.95, y + u * 0.4); ctx.fill(); // timoni
    ctx.fillRect(x - u * 0.55, y + u * 0.5, u * 1.1, u * 0.2);                                   // gondola
    ctx.strokeStyle = "#17120e"; ctx.lineWidth = Math.max(1, u * 0.02);
    for (const k of [-0.45, 0, 0.45]) { ctx.beginPath(); ctx.moveTo(x + u * k, y + u * 0.38); ctx.lineTo(x + u * k * 0.9, y + u * 0.5); ctx.stroke(); }
    ctx.strokeStyle = "rgba(240,190,110,.55)"; ctx.lineWidth = Math.max(1, u * 0.025);            // filo di luce sul dorso
    ctx.beginPath(); ctx.ellipse(x, y, u * 1.5, u * 0.42, 0, Math.PI * 1.08, Math.PI * 1.75); ctx.stroke();
    ctx.fillStyle = "rgba(255,214,130,.9)";
    for (let i = 0; i < 4; i++) ctx.fillRect(x - u * 0.4 + i * u * 0.24, y + u * 0.56, u * 0.08, u * 0.06);
  }
  function quadro(ora) {
    if (!document.body.contains(tela)) return;
    if (tela.clientWidth !== W || tela.clientHeight !== H) misura();
    const t = calmo ? 0 : (ora - t0) / 1000;
    const g = ctx.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, "#0c1322"); g.addColorStop(0.42, "#253650"); g.addColorStop(0.7, "#9a6a3c"); g.addColorStop(0.86, "#e2a84e"); g.addColorStop(1, "#f4d489");
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    const sx = W * 0.7, sy = H * 0.8, sole = ctx.createRadialGradient(sx, sy, 0, sx, sy, H * 0.75);
    sole.addColorStop(0, "rgba(255,236,170,.95)"); sole.addColorStop(0.12, "rgba(255,205,110,.55)"); sole.addColorStop(1, "rgba(255,190,90,0)");
    ctx.fillStyle = sole; ctx.fillRect(0, 0, W, H);
    for (const n of nuvole) {
      const x = ((n.x + t * n.v) % 1.3 - 0.15) * W, y = n.y * H, r = n.r * W;
      const c = ctx.createRadialGradient(x, y, 0, x, y, r);
      const caldo = n.y > 0.45;
      c.addColorStop(0, caldo ? `rgba(255,214,150,${n.a})` : `rgba(150,170,200,${n.a})`); c.addColorStop(1, "rgba(0,0,0,0)");
      ctx.fillStyle = c; ctx.beginPath(); ctx.ellipse(x, y, r * 2.2, r * 0.45, 0, 0, 7); ctx.fill();
    }
    for (const n of [navi[2], navi[1], navi[0]]) nave(((n.x + t * n.v) % 1.4 - 0.2) * W, n.y * H, n.s, t);
    // la città: sagome scure, finestre accese, fumo dai camini
    const base = H * 0.93;
    ctx.fillStyle = "#120e0b"; ctx.fillRect(0, base, W, H - base);
    for (const k of torri) {
      const x = k.x * W, w = k.w * W, h = k.h * H;
      ctx.fillStyle = "#120e0b"; ctx.fillRect(x, base - h, w, h + 2);
      if (k.camino) { ctx.fillRect(x + w * 0.3, base - h - H * 0.05, w * 0.28, H * 0.05); if (!calmo && Math.random() < 0.03) fumi.push({ x: x + w * 0.44, y: base - h - H * 0.05, r: w * 0.3, a: 0.28, vx: 6 + Math.random() * 6 }); }
      else { ctx.beginPath(); ctx.moveTo(x, base - h); ctx.lineTo(x + w / 2, base - h - w * 0.5); ctx.lineTo(x + w, base - h); ctx.fill(); }
      ctx.fillStyle = `rgba(255,205,120,${0.55 + 0.25 * Math.sin(t * 1.3 + k.fase)})`;
      for (let i = 0; i < k.luci; i++) ctx.fillRect(x + w * 0.25 + (i % 2) * w * 0.35, base - h * (0.25 + 0.18 * i), Math.max(1.5, w * 0.12), Math.max(2, w * 0.16));
    }
    for (let i = fumi.length - 1; i >= 0; i--) {
      const f = fumi[i];
      f.y -= 0.35; f.x += f.vx * 0.016; f.r += 0.12; f.a -= 0.0016;
      if (f.a <= 0) { fumi.splice(i, 1); continue; }
      ctx.fillStyle = `rgba(30,24,20,${f.a})`; ctx.beginPath(); ctx.arc(f.x, f.y, f.r, 0, 7); ctx.fill();
    }
    const ombra = ctx.createLinearGradient(0, 0, W * 0.62, 0);   // il lato del menu resta scuro, per leggere bene
    ombra.addColorStop(0, "rgba(8,10,16,.88)"); ombra.addColorStop(0.55, "rgba(8,10,16,.45)"); ombra.addColorStop(1, "rgba(8,10,16,0)");
    ctx.fillStyle = ombra; ctx.fillRect(0, 0, W, H);
    requestAnimationFrame(quadro);
  }
  misura();
  requestAnimationFrame(quadro);
}
