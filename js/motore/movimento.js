// Movimento e portata. "b" è la battaglia: offre dentro(x,y), terreno(x,y), unitaIn(x,y).
const PASSI = [[1, 0], [-1, 0], [0, 1], [0, -1]];
export const NON_SI_PASSA = 99;
export const chiave = (x, y) => x + "," + y;

// Caselle dove l'unità può fermarsi: costo del terreno per tipo di movimento; i nemici bloccano il passo,
// i compagni si attraversano ma non ci si può fermare sopra.
export function raggiungibili(b, u, daX = u.x, daY = u.y, mov = u.mov) {
  const migliore = new Map([[chiave(daX, daY), 0]]);
  const coda = [[daX, daY, 0]];
  while (coda.length) {
    coda.sort((p, q) => p[2] - q[2]);
    const [x, y, c] = coda.shift();
    for (const [dx, dy] of PASSI) {
      const nx = x + dx, ny = y + dy;
      if (!b.dentro(nx, ny)) continue;
      const nc = c + b.terreno(nx, ny).costo[u.movimento];
      if (nc > mov) continue;
      const o = b.unitaIn(nx, ny);
      if (o && o.squadra !== u.squadra) continue;
      const k = chiave(nx, ny);
      if (!migliore.has(k) || migliore.get(k) > nc) { migliore.set(k, nc); coda.push([nx, ny, nc]); }
    }
  }
  const caselle = [];
  for (const k of migliore.keys()) {
    const [x, y] = k.split(",").map(Number);
    const o = b.unitaIn(x, y);
    if (!o || o === u) caselle.push({ x, y });
  }
  return caselle;
}

// Il cammino più breve, casella per casella, da (daX,daY) a (aX,aY) per quell'unità: serve all'animazione.
export function percorso(b, u, daX, daY, aX, aY) {
  const costo = new Map([[chiave(daX, daY), 0]]), prima = new Map(), coda = [[daX, daY, 0]];
  while (coda.length) {
    coda.sort((p, q) => p[2] - q[2]);
    const [x, y, c] = coda.shift();
    if (x === aX && y === aY) break;
    for (const [dx, dy] of PASSI) {
      const nx = x + dx, ny = y + dy;
      if (!b.dentro(nx, ny)) continue;
      const nc = c + b.terreno(nx, ny).costo[u.movimento];
      if (nc >= NON_SI_PASSA) continue;
      const o = b.unitaIn(nx, ny);
      if (o && o !== u && o.squadra !== u.squadra) continue;
      const k = chiave(nx, ny);
      if (!costo.has(k) || costo.get(k) > nc) { costo.set(k, nc); prima.set(k, [x, y]); coda.push([nx, ny, nc]); }
    }
  }
  const passi = [];
  let k = chiave(aX, aY);
  if (!prima.has(k)) return [{ x: aX, y: aY }];
  for (let p = [aX, aY]; p; p = prima.get(chiave(p[0], p[1]))) { passi.unshift({ x: p[0], y: p[1] }); if (p[0] === daX && p[1] === daY) break; }
  return passi.slice(1);
}

export function inGittata(arma, fx, fy, tx, ty) {
  const d = Math.abs(fx - tx) + Math.abs(fy - ty);
  return d >= arma.gittata[0] && d <= arma.gittata[1];
}

// Caselle colpibili da un insieme di posizioni con una certa gittata.
export function caselleColpibili(b, posizioni, gittata) {
  const insieme = new Set(), [min, max] = gittata;
  for (const t of posizioni)
    for (let dx = -max; dx <= max; dx++)
      for (let dy = -max; dy <= max; dy++) {
        const d = Math.abs(dx) + Math.abs(dy);
        if (d < min || d > max) continue;
        const x = t.x + dx, y = t.y + dy;
        if (b.dentro(x, y)) insieme.add(chiave(x, y));
      }
  return insieme;
}

// Tutte le caselle che un'unità può colpire in questo turno (muovendosi, se la sua IA lo permette).
export function caselleMinacciate(b, u) {
  const arma = b.arma(u);
  if (!arma || arma.cura) return new Set();
  const dove = u.ia === "fermo" ? [{ x: u.x, y: u.y }] : raggiungibili(b, u);
  return caselleColpibili(b, dove, arma.gittata);
}

// Distanza di cammino da ogni casella al bersaglio più vicino (ignora le unità, rispetta il terreno).
export function campoDistanze(b, movimento, bersagli) {
  const D = new Map(), coda = [];
  for (const t of bersagli) { D.set(chiave(t.x, t.y), 0); coda.push([t.x, t.y, 0]); }
  while (coda.length) {
    coda.sort((p, q) => p[2] - q[2]);
    const [x, y, c] = coda.shift();
    if (c > (D.get(chiave(x, y)) ?? 1e9)) continue;
    const costo = b.terreno(x, y).costo[movimento];
    if (costo >= NON_SI_PASSA) continue;
    for (const [dx, dy] of PASSI) {
      const nx = x + dx, ny = y + dy;
      if (!b.dentro(nx, ny)) continue;
      const nc = c + costo, k = chiave(nx, ny);
      if (nc < (D.get(k) ?? 1e9)) { D.set(k, nc); coda.push([nx, ny, nc]); }
    }
  }
  return D;
}

// Prima casella libera e praticabile attorno a (x,y): usata per i rinforzi.
export function casellaLiberaVicino(b, u, x, y) {
  for (let r = 0; r < 8; r++)
    for (let dx = -r; dx <= r; dx++) {
      const resto = r - Math.abs(dx);
      for (const dy of resto ? [resto, -resto] : [0]) {
        const nx = x + dx, ny = y + dy;
        if (b.dentro(nx, ny) && b.terreno(nx, ny).costo[u.movimento] < NON_SI_PASSA && !b.unitaIn(nx, ny)) return { x: nx, y: ny };
      }
    }
  return null;
}
