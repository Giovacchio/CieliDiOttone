// Esporta i contenuti del prototipo (prototipo/index.html) nei file JSON di dati/.
// È servito una volta sola per il passaggio al motore a moduli: resta qui come prova
// che capitoli, supporti e promozioni sono stati copiati dalla macchina, non a mano.
// Uso: node strumenti/esporta_prototipo.js
const fs = require("fs"), path = require("path");
const radice = path.resolve(__dirname, "..");
process.argv[2] = path.join(radice, "prototipo/index.html");
const P = require("./_leggi_prototipo.cjs");

const MOV = { inf: "fanteria", arm: "corazza", cav: "cavallo", fly: "volo" };
const IA = { attack: "attacca", range: "portata", stay: "fermo" };
const TEMA = { city: "citta", country: "campagna", forest: "foresta", forestnight: "foresta-notte", sky: "cielo", mine: "miniera", night: "notte" };
const OBIETTIVO = { boss: "comandante", rout: "tutti", survive: "resisti", reach: "raggiungi" };
const OGGETTO = { "Tonico": "tonico", "Sigillo di ottone": "sigillo" };
const FASE = { player: "giocatore", enemy: "nemico" };
const uguali = (a, b) => JSON.stringify(a) === JSON.stringify(b);

// --- scrittura JSON leggibile: le liste semplici e gli oggetti piccoli stanno su una riga
function testo(v, rientro = "", chiave = "") {
  const piatto = JSON.stringify(v);
  if (chiave === "mappa") return "[\n" + v.map(r => rientro + "  " + JSON.stringify(r)).join(",\n") + "\n" + rientro + "]";
  const semplice = Array.isArray(v) && v.every(x => x === null || typeof x !== "object");
  if (v === null || typeof v !== "object" || semplice || piatto.length <= 150) return piatto;
  const dentro = rientro + "  ";
  if (Array.isArray(v)) return "[\n" + v.map(x => dentro + testo(x, dentro)).join(",\n") + "\n" + rientro + "]";
  return "{\n" + Object.entries(v).map(([k, x]) => dentro + JSON.stringify(k) + ": " + testo(x, dentro, k)).join(",\n") + "\n" + rientro + "}";
}
function scrivi(file, v) {
  const f = path.join(process.env.CDO_USCITA || path.join(radice, "dati"), file);
  fs.mkdirSync(path.dirname(f), { recursive: true });
  fs.writeFileSync(f, testo(v) + "\n");
}

// --- aspetti
const MODELLI = { corona: P.CROWN(), corvo: P.CORVO, radici: P.ROOT, guardia: P.GUARD };
function aspetto(look) {
  for (const [nome, m] of Object.entries(MODELLI)) {
    if (uguali(look, m)) return nome;
    if (nome === "corona" && uguali({ ...look, coat: m.coat }, m)) return { modello: "corona", coat: look.coat };
  }
  return look;
}

// --- unità
function unita(u) {
  const o = {}, visti = new Set(["__raw", "__foe", "__cls"]);
  const prendi = (k) => { visti.add(k); return u[k]; };
  if (prendi("id") !== undefined) o.id = u.id;
  if (u.__foe) { o.classe = u.__cls; if (prendi("cls")) o.titolo = u.cls; }
  else if (prendi("cls")) o.titolo = u.cls;
  if (prendi("name") !== undefined) o.nome = u.name;
  o.lv = prendi("lv"); o.x = prendi("x"); o.y = prendi("y");
  const squadra = prendi("team");
  if (squadra === "ally") o.squadra = "alleato";
  if (prendi("guest")) o.ospite = true;
  if (prendi("leader")) o.capo = true;
  if (prendi("move")) o.movimento = MOV[u.move];
  if (prendi("mov") !== undefined) o.mov = u.mov;
  if (prendi("w")) o.arma = u.w;
  const ia = prendi("ai");
  if (squadra !== "ally") o.ia = u.__foe ? IA[ia || "attack"] : IA[ia || "range"];
  if (prendi("wake")) o.sveglia = u.wake;
  if (prendi("boss")) o.comandante = true;
  if (prendi("quote")) o.frase = u.quote;
  if (prendi("retreat")) o.siRitira = true;
  if (prendi("st")) o.stat = u.st;
  if (prendi("gr") && Object.keys(u.gr).length) o.crescita = u.gr;
  if (prendi("bonus")) o.bonus = u.bonus;
  if (prendi("look")) o.aspetto = aspetto(u.look);
  if (prendi("skill")) o.abilita = { nome: u.skill.n, descrizione: u.skill.d };
  if (prendi("items")) o.oggetti = u.items.map(i => ({ id: OGGETTO[i.n], q: i.q }));
  for (const k of Object.keys(u)) if (!visti.has(k)) throw new Error("campo non previsto in un'unità: " + k);
  return o;
}

// --- terreni, armi, classi, icone
const terreni = {};
for (const [k, t] of Object.entries(P.TER)) {
  terreni[k] = { nome: t.n, costo: Object.fromEntries(Object.entries(t.c).map(([m, c]) => [MOV[m], c])), difesa: t.d, schivata: t.a };
  if (t.heal) terreni[k].cura = t.heal;
}
scrivi("terreni.json", terreni);

const armi = {};
for (const [k, w] of Object.entries(P.WEAP)) {
  const a = { nome: w.n, tipo: w.t };
  if (w.staff) a.cura = w.heal; else { a.potenza = w.mt; a.precisione = w.hit; a.critico = w.cr || 0; }
  a.gittata = w.r;
  if (w.mag) a.magica = true;
  if (w.eff) a.efficace = MOV[w.eff];
  if (w.ic) a.icona = w.ic;
  armi[k] = a;
}
scrivi("armi.json", armi);
scrivi("icone.json", P.ICON);

const classi = {};
for (const [k, c] of Object.entries(P.CLASSES))
  classi[k] = { nome: c.name, arma: c.w, movimento: MOV[c.move], mov: c.mov, stat: c.st, crescita: c.gr };
scrivi("classi.json", classi);
scrivi("aspetti.json", { modelli: MODELLI, classi: P.LOOKS });

// --- personaggi della Compagnia: le abilità diventano dati (effetti)
const EFFETTI = {
  giova: [{ tipo: "aura", raggio: 2, precisione: 10 }],
  lethy: [],
  wata: [{ tipo: "bonus", schivata: 10 }],
  mars: [{ tipo: "esperienza", moltiplica: 1.5 }],
};
const EFFETTI_PROMO = {
  giova: [[{ tipo: "aura", raggio: 3, precisione: 10, schivata: 5 }], [{ tipo: "aura", raggio: 2, precisione: 10, critico: 10 }]],
  lethy: [[{ tipo: "bonus", critico: 15, seArma: { efficace: "corazza" } }], []],
  wata: [[{ tipo: "bonus", schivata: 10 }, { tipo: "bonus", danno: 2, seArma: { magica: true } }],
         [{ tipo: "bonus", schivata: 10 }, { tipo: "curaVicini", pv: 5 }]],
  mars: [[{ tipo: "esperienza", moltiplica: 1.5 }, { tipo: "curaLarga", pv: 5 }], [{ tipo: "esperienza", moltiplica: 1.5 }]],
};
const abilita = (s, effetti) => { const a = { nome: s.n, descrizione: s.d, effetti }; if (s.cat) a.gatto = true; return a; };
const personaggi = { ordine: P.PARTY_ORDER };
for (const id of P.PARTY_ORDER) {
  const b = P.PARTY_BASE[id];
  personaggi[id] = { nome: b.name, classe: b.cls, movimento: MOV[b.move], mov: b.mov, arma: b.w };
  if (b.leader) personaggi[id].capo = true;
  Object.assign(personaggi[id], { stat: b.st, crescita: b.gr, abilita: abilita(b.skill, EFFETTI[id]),
    oggetti: b.items.map(i => ({ id: OGGETTO[i.n], q: i.q })), aspetto: b.look });
}
scrivi("personaggi.json", personaggi);

const png = {};
for (const [id, n] of Object.entries(P.NPC)) {
  png[id] = { nome: n.name };
  if (n.narr) png[id].narratore = true;
  if (n.team) png[id].squadra = n.team === "ally" ? "alleato" : "nemico";
  if (n.cls) png[id].titolo = n.cls;
  if (n.look) png[id].aspetto = aspetto(n.look);
}
scrivi("png.json", png);

const promozioni = {};
for (const [id, due] of Object.entries(P.PROMO))
  promozioni[id] = due.map((p, k) => {
    const o = { classe: p.cls, stat: p.st, mov: p.mov };
    if (p.move) o.movimento = MOV[p.move];
    if (p.w2) o.arma = p.w2;
    o.abilita = abilita(p.skill, EFFETTI_PROMO[id][k]);
    return o;
  });
scrivi("promozioni.json", promozioni);

const pasti = {};
for (const [k, m] of Object.entries(P.MEALS)) {
  pasti[k] = { nome: m.n, descrizione: m.d, stat: m.st };
  if (m.need) pasti[k].richiede = { coppia: [m.need[0], m.need[1]], livello: m.need[2] };
}
scrivi("pasti.json", pasti);

scrivi("oggetti.json", {
  tonico: { nome: "Tonico", tipo: "cura", pv: 10, descrizione: "cura 10 PV" },
  sigillo: { nome: "Sigillo di ottone", tipo: "promozione", descrizione: "promuove un personaggio dal livello 10" },
});

scrivi("regole.json", {
  triangoli: P.BEATS,
  triangolo: { precisione: 15, danno: 1 },
  doppioAttacco: 4,
  moltiplicatoreCritico: 3,
  moltiplicatoreEfficace: 3,
  livelloMassimo: { base: 20, promosso: 30 },
  promozione: { livello: 10, oggetto: "sigillo" },
  esperienza: { perLivello: 100, scontro: 10, scontroPerLivello: 2, mancato: 1, sconfitta: 30, sconfittaPerLivello: 4, comandante: 30, cura: 20 },
  supporti: { livelli: ["C", "B", "A"], soglie: P.SUP_NEED, raggio: 2, puntiScontro: 1, puntiCura: 2,
    bonusPerLivello: { precisione: 5, schivata: 5, critico: 2 } },
});

// --- supporti: un file per coppia
const coppie = [];
for (const [a, b] of P.SUP_PAIRS) {
  const chiave = [a, b].sort().join("|"), nome = a + "-" + b;
  coppie.push(nome);
  scrivi(`supporti/${nome}.json`, { coppia: [a, b], ...P.SUPPORTS[chiave] });
}

// --- capitoli: un file per capitolo
const idCapitoli = [];
for (const C of P.CHAPTERS) {
  const visti = new Set();
  const prendi = (k) => { visti.add(k); return C[k]; };
  const o = { id: prendi("id"), titolo: prendi("title"), atto: prendi("act"), tema: TEMA[prendi("theme")] };
  if (prendi("route")) o.rotta = C.route;
  if (prendi("pave")) o.selciato = true;
  o.mappa = prendi("map");
  o.schieramento = prendi("deploy");
  const g = C.goal; visti.add("goal");
  o.obiettivo = { tipo: OBIETTIVO[g.type] };
  if (g.tile) o.obiettivo.casella = g.tile;
  if (g.who) o.obiettivo.chi = g.who;
  if (g.turns) o.obiettivo.turni = g.turns;
  if (g.limit) o.obiettivo.limite = g.limit;
  if (g.alt) o.obiettivo.anche = OBIETTIVO[g.alt];
  if (g.protect) o.obiettivo.proteggi = g.protect;
  o.obiettivo.testo = g.text;
  for (const k of Object.keys(g)) if (!["type", "tile", "who", "turns", "limit", "alt", "protect", "text"].includes(k)) throw new Error("obiettivo: " + k);
  if (prendi("guests")) o.ospiti = C.guests().map(unita);
  o.nemici = prendi("enemies")().map(unita);
  if (prendi("events")) o.eventi = C.events.map(ev => {
    const e = { turno: ev.turn, fase: FASE[ev.phase] };
    if (ev.lines && ev.lines.length) e.dialogo = ev.lines;
    if (ev.spawn) e.rinforzi = ev.spawn().map(unita);
    for (const k of Object.keys(ev)) if (!["turn", "phase", "lines", "spawn"].includes(k)) throw new Error("evento: " + k);
    return e;
  });
  o.inizio = prendi("intro");
  o.vittoria = prendi("victory");
  if (prendi("choice")) o.scelta = { domanda: C.choice.prompt, opzioni: C.choice.options.map(x => ({ id: x.id, titolo: x.label, descrizione: x.desc })) };
  const R = prendi("reward") || {};
  o.ricompensa = {};
  if (R.text) o.ricompensa.testo = R.text;
  if (R.w) o.ricompensa.armi = R.w;
  if (R.items) o.ricompensa.oggetti = R.items.map(([a, n, q]) => ({ a, id: OGGETTO[n], q }));
  if (P.DIARY[C.id]) o.diario = P.DIARY[C.id];
  for (const k of Object.keys(C)) if (!visti.has(k)) throw new Error("capitolo " + C.id + ": campo non previsto " + k);
  idCapitoli.push(C.id);
  scrivi(`capitoli/${C.id}.json`, o);
}

scrivi("campagna.json", {
  titolo: "Cieli di Ottone",
  capitoli: idCapitoli,
  rotte: { corona: { nome: "con Ferrante" }, radici: { nome: "con Maelis" }, libere: { nome: "con le Leghe Libere" } },
  supporti: coppie,
});
console.log("Esportati", idCapitoli.length, "capitoli e", coppie.length, "coppie di supporto.");
