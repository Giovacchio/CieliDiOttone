// Una battaglia: stato (mappa, unità, turno) e regole del turno.
// Nessuna grafica qui dentro. Le azioni sono "generatori": applicano le regole un passo alla volta
// e a ogni passo consegnano un "fatto" ({tipo:"colpo", ...}). L'interfaccia li anima uno per uno,
// i test e il simulatore li scorrono tutti d'un fiato.
import { creaDado } from "./dado.js";
import { STAT, clona, creaUnita, unitaCompagnia, effetti, oggetto, distanza } from "./unita.js";
import { casellaLiberaVicino, inGittata, raggiungibili } from "./movimento.js";
import { previsione, potenzaCura } from "./combattimento.js";
import { aggiungiPunti } from "./supporti.js";
import { agisciNemico } from "./ia.js";
import "./ia-tattica.js";

export class Battaglia {
  // opzioni: dati, capitolo, compagnia, supporti, bandiere, dado, posizioni ({id:[x,y]}), ia ("classica" | "tattica")
  constructor({ dati, capitolo, compagnia, supporti = {}, bandiere = {}, dado = creaDado(), posizioni = null, ia = null }) {
    this.dati = dati; this.cap = capitolo; this.dado = dado;
    this.righe = capitolo.mappa; this.alte = this.righe.length; this.larghe = this.righe[0].length;
    this.supporti = clona(supporti);       // copia: se si perde, i punti della battaglia non restano
    this.tipoIA = ia || dati.regole.ia || "classica";
    this.turno = 1; this.fase = "giocatore"; this.finita = false; this.vinta = false; this.motivo = "";
    this.scattati = new Set(); this.contatore = 0; this.unita = [];

    const pasto = bandiere.pasto && dati.pasti[bandiere.pasto];
    // chi è già nella Compagnia occupa le caselle di schieramento nell'ordine di personaggi.json
    dati.personaggi.ordine.filter((id) => compagnia[id]).forEach((id, k) => {
      const dove = posizioni ? posizioni[id] : capitolo.schieramento[k];
      if (!dove) return;
      const u = unitaCompagnia(dati, compagnia, id);
      u.x = dove[0]; u.y = dove[1];
      if (pasto) { u.pasto = { ...pasto.stat }; for (const [s, v] of Object.entries(pasto.stat)) u.stat[s] += v; }
      this.unita.push(u);
    });
    // un ospite che nel frattempo è entrato nella Compagnia (capitolo rigiocato) non compare due volte
    for (const d of capitolo.ospiti || []) if (!this.unita.some((u) => u.id === d.id)) this.unita.push(this._crea(d));
    for (const d of capitolo.nemici || []) this.unita.push(this._crea(d));
    for (const u of this.unita) u.pv = u.stat.hp;
  }

  _crea(d) { return creaUnita(this.dati, d, "e" + this.contatore++); }

  // --- battaglia sospesa: tutto ciò che serve per riprenderla identica (anche i prossimi tiri di dado)
  esporta() {
    return { cap: this.cap.id, turno: this.turno, fase: this.fase, contatore: this.contatore, ia: this.tipoIA,
      scattati: (this.cap.eventi || []).map((e, i) => this.scattati.has(e) ? i : -1).filter((i) => i >= 0),
      dado: this.dado.stato ? this.dado.stato() : null, supporti: clona(this.supporti), unita: clona(this.unita) };
  }
  static riprendi(dati, s) {
    const cap = dati.capitoli[s.cap];
    if (!cap || !Array.isArray(s.unita)) return null;
    const b = Object.create(Battaglia.prototype);
    Object.assign(b, { dati, cap, dado: creaDado(s.dado ?? undefined), righe: cap.mappa, alte: cap.mappa.length, larghe: cap.mappa[0].length,
      supporti: clona(s.supporti || {}), tipoIA: s.ia || dati.regole.ia || "classica", turno: s.turno, fase: "giocatore",
      finita: false, vinta: false, motivo: "", contatore: s.contatore || 0, unita: clona(s.unita),
      scattati: new Set((s.scattati || []).map((i) => (cap.eventi || [])[i]).filter(Boolean)) });
    // le parti fisse (abilità, aspetto) si rileggono dai dati, così un salvataggio vecchio non blocca una correzione
    for (const u of b.unita) if (u.compagnia && dati.personaggi[u.id]) {
      const base = dati.personaggi[u.id], P = u.promo != null ? dati.promozioni[u.id]?.[u.promo] : null;
      u.abilita = P ? P.abilita : base.abilita; u.aspetto = base.aspetto; u.crescita = base.crescita;
    }
    return b.capo() ? b : null;
  }

  // --- domande sullo stato
  dentro(x, y) { return x >= 0 && y >= 0 && x < this.larghe && y < this.alte; }
  terreno(x, y) { return this.dati.terreni[this.righe[y][x]]; }
  unitaIn(x, y) { return this.unita.find((u) => u.pv > 0 && u.x === x && u.y === y); }
  vivi(squadra) { return this.unita.filter((u) => u.pv > 0 && u.squadra === squadra); }
  arma(u) { return this.dati.armi[u.arma]; }
  trova(id) { return this.unita.find((u) => u.id === id); }
  capo() { return this.unita.find((u) => u.capo); }
  raggiungibili(u) { return raggiungibili(this, u); }
  previsione(a, d) { return previsione(this, a, d); }

  // Bersagli dalla casella attuale con una certa arma (quella impugnata se non indicata).
  bersagli(u, idArma = u.arma) {
    const arma = this.dati.armi[idArma];
    if (!arma) return [];
    if (arma.cura) return this.vivi(u.squadra).filter((o) => o !== u && o.pv < o.stat.hp && inGittata(arma, u.x, u.y, o.x, o.y));
    const altri = u.squadra === "alleato" ? "nemico" : "alleato";
    return this.vivi(altri).filter((o) => inGittata(arma, u.x, u.y, o.x, o.y));
  }
  // Armi dell'unità che in questo momento hanno almeno un bersaglio: { attacco:[id...], cura:[id...] }
  armiUtili(u) {
    const r = { attacco: [], cura: [] };
    for (const id of u.armi) if (this.bersagli(u, id).length) (this.dati.armi[id].cura ? r.cura : r.attacco).push(id);
    return r;
  }

  // --- inizio del capitolo
  *inizia() {
    if (this.cap.inizio?.length) yield { tipo: "dialogo", righe: this.cap.inizio };
    yield* this._eventi("giocatore");
    yield { tipo: "fase", fase: "giocatore" };
  }

  // --- azioni del giocatore (l'unità è già sulla casella scelta)
  *attacca(a, d) {
    if (d.frase && !d.fraseDetta) { d.fraseDetta = true; yield { tipo: "dialogo", righe: [[d.id, d.frase]] }; }
    yield* this._scontro(a, d);
    yield* this._fineAzione(a);
  }
  *cura(u, t) {
    const R = this.dati.regole;
    const pv = Math.min(potenzaCura(this, u), t.stat.hp - t.pv);
    t.pv += pv;
    yield { tipo: "cura", u, t, pv };
    for (const e of effetti(u)) if (e.tipo === "curaLarga")
      for (const o of this.vivi(u.squadra)) if (o !== t && o !== u && distanza(o, t) === 1 && o.pv < o.stat.hp) {
        const k = Math.min(e.pv, o.stat.hp - o.pv); o.pv += k;
        yield { tipo: "cura", t: o, pv: k, eco: true };
      }
    yield* this._puntiSupporto(u, t, R.supporti.puntiCura);
    yield* this._esperienza(u, R.esperienza.cura);
    yield* this._fineAzione(u);
  }
  *usaOggetto(u, id) {
    const voce = oggetto(u, id), O = this.dati.oggetti[id];
    if (!voce || O.tipo !== "cura" || u.pv >= u.stat.hp) return;
    voce.q--;
    const pv = Math.min(O.pv, u.stat.hp - u.pv); u.pv += pv;
    yield { tipo: "cura", t: u, pv, oggetto: O };
    yield* this._fineAzione(u);
  }
  *attendi(u) { yield* this._fineAzione(u); }
  tuttiHannoAgito() { return this.vivi("alleato").every((u) => u.agito); }

  // --- fine della fase del giocatore: tocca ai nemici, poi nuovo turno
  *fineFaseGiocatore() {
    if (this.finita || this.fase !== "giocatore") return;
    const g = this.cap.obiettivo;
    this.fase = "nemico";
    yield { tipo: "fase", fase: "nemico" };
    yield* this._eventi("nemico");
    yield* this._curaTerreno("nemico");
    for (const e of this.vivi("nemico")) { if (this.finita) break; yield* agisciNemico(this, e); }
    if (this.finita) return;
    if (g.tipo === "resisti" && this.turno >= g.turni) { yield* this._vittoria(); return; }
    if (g.tipo === "raggiungi" && g.limite && this.turno >= g.limite) { yield* this._sconfitta("Troppo tardi: non siete arrivati in tempo."); return; }
    this.turno++; this.fase = "giocatore";
    for (const u of this.unita) u.agito = false;
    yield { tipo: "fase", fase: "giocatore" };
    yield* this._eventi("giocatore");
    yield* this._curaTerreno("alleato");
    yield* this._curaVicini("alleato");
  }

  // --- regole interne
  *_eventi(fase) {
    for (const ev of this.cap.eventi || []) {
      if (ev.turno !== this.turno || ev.fase !== fase || this.scattati.has(ev)) continue;
      this.scattati.add(ev);
      if (ev.dialogo?.length) yield { tipo: "dialogo", righe: ev.dialogo };
      if (ev.rinforzi) {
        const arrivati = [];
        for (const d of ev.rinforzi) {
          const u = this._crea(d), p = casellaLiberaVicino(this, u, u.x, u.y);
          if (!p) continue;
          u.x = p.x; u.y = p.y; this.unita.push(u); arrivati.push(u);
        }
        if (arrivati.length) yield { tipo: "rinforzi", unita: arrivati };
      }
    }
  }
  rinforziInArrivo() { return (this.cap.eventi || []).some((e) => e.rinforzi && !this.scattati.has(e) && e.turno >= this.turno); }

  // Uno scontro: attacco, contrattacco, eventuale secondo colpo di chi è molto più veloce.
  *_scontro(a, d) {
    const R = this.dati.regole, f = previsione(this, a, d);
    let aHaColpito = false;
    const colpi = [[a, d, f.A]];
    if (f.contrattacco) colpi.push([d, a, f.B]);
    if (f.A.doppio) colpi.push([a, d, f.A]); else if (f.contrattacco && f.B.doppio) colpi.push([d, a, f.B]);
    yield { tipo: "scontro", a, d, previsione: f };
    for (const [x, y, st] of colpi) {
      if (x.pv <= 0 || y.pv <= 0) break;
      yield { tipo: "assalto", a: x, d: y };
      // tiro "vero": media di due numeri, così le percentuali alte sono più affidabili
      const tiro = (this.dado.casuale() * 100 + this.dado.casuale() * 100) / 2;
      if (tiro < st.precisione) {
        const critico = this.dado.casuale() * 100 < st.critico;
        const danno = critico ? st.danno * R.moltiplicatoreCritico : st.danno;
        y.pv = Math.max(0, y.pv - danno);
        if (x === a) aHaColpito = true;
        yield { tipo: "colpo", a: x, d: y, danno, critico };
      } else yield { tipo: "mancato", a: x, d: y };
    }
    for (const u of [a, d]) if (u.pv <= 0) yield { tipo: "sconfitta", u };
    yield { tipo: "fineScontro", a, d };
    // esperienza al personaggio alleato coinvolto
    const alleato = a.squadra === "alleato" ? a : (d.squadra === "alleato" ? d : null);
    const nemico = alleato === a ? d : a;
    if (alleato && alleato.pv > 0) {
      const E = R.esperienza, diff = nemico.lv - alleato.lv;
      const pe = nemico.pv <= 0 ? E.sconfitta + Math.max(0, diff * E.sconfittaPerLivello) + (nemico.comandante ? E.comandante : 0)
        : (aHaColpito || alleato === d ? E.scontro + Math.max(0, diff) * E.scontroPerLivello : E.mancato);
      yield* this._esperienza(alleato, pe);
      for (const o of this.vivi("alleato"))
        if (o !== alleato && distanza(o, alleato) <= R.supporti.raggio) yield* this._puntiSupporto(alleato, o, R.supporti.puntiScontro);
    }
  }
  *_puntiSupporto(a, b, n) {
    if (!a.compagnia || !b.compagnia) return;
    const livello = aggiungiPunti(this.dati, this.supporti, a.id, b.id, n);
    if (livello) yield { tipo: "supportoPronto", a, b, livello };
  }
  *_esperienza(u, pe) {
    const R = this.dati.regole;
    for (const e of effetti(u)) if (e.tipo === "esperienza") pe = Math.ceil(pe * e.moltiplica);
    const tetto = u.promo != null ? R.livelloMassimo.promosso : R.livelloMassimo.base;
    if (u.lv >= tetto) { u.pe = 0; return; }
    u.pe += pe;
    yield { tipo: "pe", u, quanti: pe };
    while (u.pe >= R.esperienza.perLivello && u.lv < tetto) {
      u.pe -= R.esperienza.perLivello;
      u.lv++;
      const aumenti = {};
      for (const k of STAT) if (this.dado.casuale() * 100 < ((u.crescita && u.crescita[k]) || 0)) { u.stat[k]++; aumenti[k] = 1; if (k === "hp") u.pv++; }
      if (!Object.keys(aumenti).length) { u.stat.hp++; u.pv++; aumenti.hp = 1; }
      yield { tipo: "livello", u, aumenti };
    }
    if (u.lv >= tetto) u.pe = 0;
  }
  *_curaTerreno(squadra) {
    for (const u of this.vivi(squadra)) {
      const t = this.terreno(u.x, u.y);
      if (t.cura && u.pv < u.stat.hp) {
        const pv = Math.min(Math.ceil(u.stat.hp * t.cura), u.stat.hp - u.pv); u.pv += pv;
        yield { tipo: "cura", t: u, pv, eco: true };
      }
    }
  }
  *_curaVicini(squadra) {
    for (const w of this.vivi(squadra)) for (const e of effetti(w)) if (e.tipo === "curaVicini")
      for (const o of this.vivi(squadra)) if (o !== w && distanza(o, w) === 1 && o.pv < o.stat.hp) {
        const pv = Math.min(e.pv, o.stat.hp - o.pv); o.pv += pv;
        yield { tipo: "cura", t: o, pv, eco: true };
      }
  }
  *_fineAzione(u) {
    u.agito = true;
    yield* this._controllaFine();
  }
  *_vittoria() {
    if (this.finita) return;
    this.finita = true; this.vinta = true;
    yield { tipo: "fine", vittoria: true };
  }
  *_sconfitta(motivo) {
    if (this.finita) return;
    this.finita = true; this.vinta = false; this.motivo = motivo;
    yield { tipo: "fine", vittoria: false, motivo };
  }
  // Vittoria e sconfitta secondo l'obiettivo del capitolo.
  *_controllaFine() {
    if (this.finita) return;
    const g = this.cap.obiettivo, capo = this.capo();
    if (!capo || capo.pv <= 0) { yield* this._sconfitta(`${capo ? capo.nome : "Il capo"} è caduto: la Compagnia si ritira.`); return; }
    if (g.proteggi) {
      const p = this.trova(g.proteggi);
      if (p && p.pv <= 0) { yield* this._sconfitta(`${p.nome} è fuori combattimento: la missione è fallita.`); return; }
    }
    const comandante = this.unita.find((u) => u.comandante);
    let vinto = false;
    if ((g.tipo === "comandante" || g.anche === "comandante") && comandante && comandante.pv <= 0) vinto = true;
    if ((g.tipo === "tutti" || g.tipo === "resisti") && !this.vivi("nemico").length && !this.rinforziInArrivo()) vinto = true;
    if (g.tipo === "raggiungi") {
      const chi = this.trova(g.chi || capo.id);
      if (chi && chi.pv > 0 && chi.x === g.casella[0] && chi.y === g.casella[1]) vinto = true;
    }
    if (vinto) yield* this._vittoria();
  }
}
