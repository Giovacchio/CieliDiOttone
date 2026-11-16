// Suoni e musica generati dal codice (Web Audio), senza file audio: effetti brevi per ogni azione
// e un sottofondo calmo che cambia tra titolo, accampamento e battaglia.
// Il browser lascia partire l'audio solo dopo il primo clic o tasto: fino ad allora tutto resta muto.
let ctx = null, uscita = null, canaleFx = null, canaleMus = null, rumoreBuf = null;
let volFx = 0.7, volMus = 0.35, brano = null, orologio = null, prossima = 0, passoN = 0;

export function volumi() { return { effetti: volFx, musica: volMus }; }
export function impostaVolumi({ effetti, musica }) {
  if (effetti != null) volFx = effetti;
  if (musica != null) volMus = musica;
  if (canaleFx) canaleFx.gain.value = volFx;
  if (canaleMus) canaleMus.gain.setTargetAtTime(volMus * 0.5, ctx.currentTime, 0.2);
}
export function avviaAudio() {
  try {
    if (!ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return;
      ctx = new AC();
      uscita = ctx.createDynamicsCompressor(); uscita.connect(ctx.destination);
      canaleFx = ctx.createGain(); canaleFx.gain.value = volFx; canaleFx.connect(uscita);
      canaleMus = ctx.createGain(); canaleMus.gain.value = volMus * 0.5; canaleMus.connect(uscita);
      rumoreBuf = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
      const d = rumoreBuf.getChannelData(0);
      for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    }
    if (ctx.state === "suspended") ctx.resume();
    if (brano && !orologio) avviaOrologio();
  } catch (e) { ctx = null; }
}

function tono(f0, f1, dur, { tipo = "sine", vol = 0.3, ritardo = 0, attacco = 0.005, dove = canaleFx, filtro = 0 } = {}) {
  const t = ctx.currentTime + ritardo, o = ctx.createOscillator(), g = ctx.createGain();
  o.type = tipo; o.frequency.setValueAtTime(f0, t);
  if (f1 && f1 !== f0) o.frequency.exponentialRampToValueAtTime(Math.max(20, f1), t + dur);
  g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + attacco); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  let nodo = o;
  if (filtro) { const fl = ctx.createBiquadFilter(); fl.type = "lowpass"; fl.frequency.value = filtro; o.connect(fl); nodo = fl; }
  nodo.connect(g); g.connect(dove);
  o.start(t); o.stop(t + dur + 0.02);
}
function soffio(dur, { tipo = "bandpass", f0 = 1000, f1 = 0, q = 1, vol = 0.3, ritardo = 0, dove = canaleFx } = {}) {
  const t = ctx.currentTime + ritardo, s = ctx.createBufferSource(), fl = ctx.createBiquadFilter(), g = ctx.createGain();
  s.buffer = rumoreBuf; s.loop = true;
  fl.type = tipo; fl.Q.value = q; fl.frequency.setValueAtTime(f0, t);
  if (f1) fl.frequency.exponentialRampToValueAtTime(f1, t + dur);
  g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + 0.01); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  s.connect(fl); fl.connect(g); g.connect(dove);
  s.start(t, Math.random() * 0.5); s.stop(t + dur + 0.02);
}
const nota = (n) => 440 * Math.pow(2, (n - 69) / 12);   // numero MIDI → frequenza

const EFFETTI = {
  clic: () => tono(900, 600, 0.05, { tipo: "triangle", vol: 0.12 }),
  sfiora: () => tono(1400, 1400, 0.025, { tipo: "sine", vol: 0.04 }),
  seleziona: () => { tono(660, 660, 0.06, { tipo: "triangle", vol: 0.16 }); tono(990, 990, 0.09, { tipo: "triangle", vol: 0.14, ritardo: 0.06 }); },
  conferma: () => { tono(520, 520, 0.07, { tipo: "triangle", vol: 0.18 }); tono(780, 780, 0.12, { tipo: "triangle", vol: 0.18, ritardo: 0.07 }); },
  annulla: () => tono(520, 300, 0.12, { tipo: "triangle", vol: 0.15 }),
  errore: () => { tono(180, 150, 0.12, { tipo: "square", vol: 0.08 }); tono(150, 130, 0.14, { tipo: "square", vol: 0.08, ritardo: 0.12 }); },
  passo: () => soffio(0.06, { tipo: "lowpass", f0: 500, vol: 0.12 }),
  pagina: () => soffio(0.05, { tipo: "highpass", f0: 3000, vol: 0.04 }),
  spada: () => { soffio(0.14, { f0: 2500, f1: 6000, q: 2, vol: 0.25 }); tono(1800, 900, 0.1, { tipo: "sawtooth", vol: 0.05, ritardo: 0.05 }); },
  lancia: () => soffio(0.1, { f0: 1500, f1: 4500, q: 3, vol: 0.25 }),
  ascia: () => { soffio(0.12, { f0: 900, f1: 2200, q: 1.5, vol: 0.25 }); tono(140, 50, 0.22, { tipo: "sine", vol: 0.45, ritardo: 0.06 }); },
  arco: () => { tono(300, 180, 0.08, { tipo: "triangle", vol: 0.2 }); soffio(0.16, { f0: 3000, f1: 1500, q: 4, vol: 0.14, ritardo: 0.03 }); },
  polvere: () => { soffio(0.22, { tipo: "lowpass", f0: 3000, f1: 300, vol: 0.5 }); tono(120, 40, 0.2, { vol: 0.4 }); },
  etere: () => { tono(500, 1500, 0.3, { tipo: "sine", vol: 0.14 }); tono(750, 2250, 0.3, { tipo: "sine", vol: 0.08, ritardo: 0.04 }); soffio(0.25, { f0: 5000, q: 6, vol: 0.06, ritardo: 0.2 }); },
  congegni: () => { soffio(0.3, { tipo: "lowpass", f0: 2000, f1: 200, vol: 0.5 }); tono(90, 35, 0.3, { vol: 0.5 }); },
  impatto: () => { soffio(0.09, { tipo: "lowpass", f0: 1200, vol: 0.35 }); tono(160, 60, 0.14, { tipo: "sine", vol: 0.4 }); },
  critico: () => { soffio(0.16, { tipo: "lowpass", f0: 2500, vol: 0.45 }); tono(220, 50, 0.3, { vol: 0.5 }); tono(1320, 1320, 0.5, { tipo: "triangle", vol: 0.12, ritardo: 0.02 }); tono(1980, 1980, 0.5, { tipo: "sine", vol: 0.07, ritardo: 0.02 }); },
  mancato: () => soffio(0.18, { f0: 800, f1: 2400, q: 1, vol: 0.12 }),
  cura: () => [72, 76, 79, 84].forEach((n, i) => tono(nota(n), nota(n), 0.28, { tipo: "sine", vol: 0.13, ritardo: i * 0.07 })),
  sconfitta: () => { tono(300, 70, 0.5, { tipo: "sawtooth", vol: 0.14, filtro: 900 }); soffio(0.4, { tipo: "lowpass", f0: 800, f1: 150, vol: 0.2 }); },
  pe: () => tono(880, 1320, 0.12, { tipo: "sine", vol: 0.07 }),
  livello: () => [72, 76, 79, 84, 88].forEach((n, i) => tono(nota(n), nota(n), i === 4 ? 0.6 : 0.16, { tipo: "triangle", vol: 0.2, ritardo: i * 0.09 })),
  faseGiocatore: () => [62, 69, 74].forEach((n, i) => tono(nota(n), nota(n), 0.35, { tipo: "sawtooth", vol: 0.1, ritardo: i * 0.1, filtro: 1400 })),
  faseNemico: () => [62, 61, 57].forEach((n, i) => tono(nota(n - 12), nota(n - 12), 0.4, { tipo: "sawtooth", vol: 0.14, ritardo: i * 0.12, filtro: 900 })),
  rinforzi: () => { tono(nota(57), nota(57), 0.25, { tipo: "square", vol: 0.07, filtro: 1200 }); tono(nota(57), nota(57), 0.4, { tipo: "square", vol: 0.07, ritardo: 0.3, filtro: 1200 }); },
  vittoria: () => [[62, 0], [66, 0.14], [69, 0.28], [74, 0.42], [78, 0.62], [81, 0.62], [86, 0.62]].forEach(([n, r]) => tono(nota(n), nota(n), r > 0.5 ? 1.2 : 0.2, { tipo: "triangle", vol: 0.18, ritardo: r })),
  disfatta: () => [[62, 0], [60, 0.3], [57, 0.6], [50, 0.9]].forEach(([n, r]) => tono(nota(n), nota(n), r > 0.8 ? 1.4 : 0.35, { tipo: "triangle", vol: 0.16, ritardo: r })),
  moneta: () => { tono(1568, 1568, 0.08, { tipo: "square", vol: 0.06 }); tono(2093, 2093, 0.25, { tipo: "square", vol: 0.06, ritardo: 0.08 }); },
  cartello: () => { tono(nota(50), nota(50), 1.6, { tipo: "sawtooth", vol: 0.1, filtro: 500, attacco: 0.3 }); tono(nota(57), nota(57), 1.6, { tipo: "sawtooth", vol: 0.07, filtro: 700, attacco: 0.4 }); },
  promozione: () => [60, 64, 67, 72, 76, 79, 84].forEach((n, i) => tono(nota(n), nota(n), 0.5, { tipo: "triangle", vol: 0.14, ritardo: i * 0.07 })),
};
export function suona(nome) {
  if (!ctx || ctx.state !== "running" || volFx <= 0) return;
  try { (EFFETTI[nome] || EFFETTI.clic)(); } catch (e) { /* un suono mancato non deve fermare il gioco */ }
}

// ------------------------------------------------------------------ musica: accordi lenti, basso e qualche nota pizzicata
const BRANI = {
  titolo:   { bpm: 60, accordi: [[50, 57, 62, 65], [46, 53, 58, 62], [41, 53, 57, 60], [48, 55, 60, 64]], pizzico: 0.35, tamburo: 0, scala: [62, 65, 67, 69, 72, 74, 77] },
  campo:    { bpm: 66, accordi: [[53, 57, 60, 65], [48, 55, 60, 64], [50, 57, 62, 65], [46, 53, 58, 62]], pizzico: 0.5, tamburo: 0, scala: [65, 67, 69, 72, 74, 77, 79] },
  battaglia:{ bpm: 84, accordi: [[50, 57, 62, 65], [50, 57, 62, 65], [46, 53, 58, 62], [48, 55, 60, 64]], pizzico: 0.45, tamburo: 1, scala: [62, 64, 65, 69, 72, 74, 76] },
  nemico:   { bpm: 84, accordi: [[50, 56, 62, 65], [49, 56, 61, 64], [50, 56, 62, 65], [45, 52, 57, 61]], pizzico: 0.2, tamburo: 2, scala: [62, 63, 65, 68, 69, 74] },
};
function battuta() {
  const B = BRANI[brano];
  if (!B || !ctx) return;
  const durata = 60 / B.bpm / 2;                 // ottavi
  while (prossima < ctx.currentTime + 0.25) {
    const quando = prossima - ctx.currentTime, i = passoN % 16, acc = B.accordi[Math.floor(passoN / 16) % B.accordi.length];
    if (volMus > 0) {
      if (i === 0) for (const n of acc) { // tappeto: due onde appena scordate, molto filtrate
        tono(nota(n), nota(n), durata * 16.5, { tipo: "sawtooth", vol: 0.05, ritardo: quando, attacco: durata * 3, dove: canaleMus, filtro: 650 });
        tono(nota(n) * 1.006, nota(n) * 1.006, durata * 16.5, { tipo: "sawtooth", vol: 0.04, ritardo: quando, attacco: durata * 3, dove: canaleMus, filtro: 650 });
      }
      if (i % 8 === 0) tono(nota(acc[0] - 12), nota(acc[0] - 12), durata * 6, { tipo: "triangle", vol: 0.16, ritardo: quando, dove: canaleMus });
      if (i % 2 === 0 ? Math.random() < B.pizzico : Math.random() < B.pizzico * 0.4) {
        const n = B.scala[Math.floor(Math.random() * B.scala.length)] + (Math.random() < 0.25 ? 12 : 0);
        tono(nota(n), nota(n), durata * 2.5, { tipo: "triangle", vol: 0.07, ritardo: quando, dove: canaleMus });
      }
      if (B.tamburo && (i % 8 === 0 || (B.tamburo > 1 && i % 8 === 5))) { tono(90, 45, 0.2, { vol: 0.2, ritardo: quando, dove: canaleMus }); }
      if (B.tamburo && i % 4 === 2) soffio(0.04, { tipo: "highpass", f0: 6000, vol: 0.03, ritardo: quando, dove: canaleMus });
    }
    prossima += durata; passoN++;
  }
}
function avviaOrologio() {
  if (!ctx || orologio) return;
  prossima = ctx.currentTime + 0.1;
  orologio = setInterval(() => { if (ctx.state === "running" && !document.hidden) battuta(); else prossima = ctx.currentTime + 0.1; }, 60);
}
// Cambia il sottofondo: "titolo", "campo", "battaglia", "nemico" oppure null per il silenzio.
export function musica(nome) {
  if (nome === brano) return;
  brano = nome;
  passoN = Math.ceil(passoN / 16) * 16;   // il cambio arriva all'inizio di una misura
  if (ctx && brano) avviaOrologio();
}
