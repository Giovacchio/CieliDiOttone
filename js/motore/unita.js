// Costruzione delle unità a partire dai dati (capitoli e Compagnia).
export const STAT = ["hp", "for", "mag", "abi", "vel", "fort", "def", "res"];
export const ETICHETTE = { hp: "PV", for: "For", mag: "Mag", abi: "Abi", vel: "Vel", fort: "Fort", def: "Dif", res: "Res" };
export const clona = (o) => JSON.parse(JSON.stringify(o));
export const distanza = (a, b) => Math.abs(a.x - b.x) + Math.abs(a.y - b.y);

// Statistiche di un nemico "di classe": base della classe + crescita media per livello + eventuale bonus.
export function statDiClasse(classe, lv, bonus) {
  const st = {};
  for (const k of STAT) st[k] = classe.stat[k] + Math.floor((classe.crescita[k] || 0) * (lv - 1) + 0.5) + ((bonus && bonus[k]) || 0);
  return st;
}

// Unità descritta in un capitolo (nemico, ospite o rinforzo).
export function creaUnita(dati, d, idAutomatico) {
  const C = d.classe ? dati.classi[d.classe] : null;
  const stat = d.stat ? { ...d.stat } : statDiClasse(C, d.lv, d.bonus);
  const arma = d.arma ?? C?.arma;
  return {
    id: d.id ?? idAutomatico,
    nome: d.nome ?? C?.nome ?? d.titolo ?? "?",
    classe: d.titolo ?? d.classe,
    squadra: d.squadra ?? "nemico",
    lv: d.lv, pe: 0, x: d.x, y: d.y,
    movimento: d.movimento ?? C?.movimento ?? "fanteria",
    mov: d.mov ?? C?.mov ?? 5,
    armi: d.armi ? [...d.armi] : [arma], arma,
    oggetti: clona(d.oggetti ?? []),
    ia: d.ia, sveglia: d.sveglia,
    comandante: !!d.comandante, frase: d.frase, siRitira: !!d.siRitira,
    ospite: !!d.ospite, capo: !!d.capo,
    aspetto: d.aspetto, abilita: d.abilita, crescita: d.crescita,
    stat, pv: stat.hp, agito: false,
  };
}

// Unità di un membro della Compagnia: dati fissi del personaggio + ciò che è cresciuto (livello, statistiche, oggetti).
export function unitaCompagnia(dati, compagnia, id) {
  const b = dati.personaggi[id], p = compagnia[id];
  const P = p.promo != null ? dati.promozioni[id][p.promo] : null;
  return {
    id, nome: b.nome, classe: P ? P.classe : b.classe, squadra: "alleato", compagnia: true, capo: !!b.capo,
    lv: p.lv, pe: p.pe, x: 0, y: 0, promo: p.promo ?? null,
    movimento: P?.movimento ?? b.movimento, mov: b.mov + (P?.mov || 0),
    armi: [...p.armi], arma: p.arma, oggetti: clona(p.oggetti),
    aspetto: b.aspetto, abilita: P ? P.abilita : b.abilita, crescita: b.crescita,
    stat: { ...p.stat }, pv: p.stat.hp, agito: false,
  };
}

export const effetti = (u) => (u && u.abilita && u.abilita.effetti) || [];
export const oggetto = (u, id) => u.oggetti.find((i) => i.id === id && i.q > 0);
