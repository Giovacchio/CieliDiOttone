// Supporti: punti guadagnati combattendo vicini, livelli C/B/A letti all'accampamento, bonus in battaglia.
// "supporti" è un oggetto { "giova|wata": { punti, livello } } salvato con la partita.
export const chiaveCoppia = (a, b) => [a, b].sort().join("|");

export function statoCoppia(supporti, a, b) {
  return supporti[chiaveCoppia(a, b)] ||= { punti: 0, livello: "" };
}
export function prossimoLivello(regole, s) {
  const L = regole.supporti.livelli;
  return L[s.livello ? L.indexOf(s.livello) + 1 : 0] || null;
}
export function livelloNumero(regole, supporti, a, b) {
  const s = supporti[chiaveCoppia(a, b)];
  return s && s.livello ? regole.supporti.livelli.indexOf(s.livello) + 1 : 0;
}
// La coppia ha una conversazione scritta? (solo le coppie elencate in campagna.json)
export const coppiaEsiste = (dati, a, b) => !!dati.supporti[chiaveCoppia(a, b)];

// Aggiunge punti; restituisce il livello appena diventato leggibile, oppure null.
export function aggiungiPunti(dati, supporti, a, b, n) {
  if (a === b || !coppiaEsiste(dati, a, b)) return null;
  const R = dati.regole, s = statoCoppia(supporti, a, b), prossimo = prossimoLivello(R, s);
  if (!prossimo) return null;
  const soglia = R.supporti.soglie[prossimo], prima = s.punti;
  s.punti = Math.min(soglia, s.punti + n);
  return prima < soglia && s.punti >= soglia ? prossimo : null;
}

export const prontoDaLeggere = (regole, s) => {
  const p = prossimoLivello(regole, s);
  return p && s.punti >= regole.supporti.soglie[p] ? p : null;
};

// Bonus in battaglia: per ogni compagno entro il raggio, tanti "gradini" quanti i livelli letti.
export function bonusSupporto(b, u, x, y) {
  const zero = { precisione: 0, schivata: 0, critico: 0 };
  if (!u.compagnia) return zero;
  const R = b.dati.regole.supporti;
  let n = 0;
  for (const o of b.unita)
    if (o !== u && o.pv > 0 && o.compagnia && Math.abs(o.x - x) + Math.abs(o.y - y) <= R.raggio)
      n += livelloNumero(b.dati.regole, b.supporti, u.id, o.id);
  const B = R.bonusPerLivello;
  return { precisione: n * B.precisione, schivata: n * B.schivata, critico: n * B.critico };
}
