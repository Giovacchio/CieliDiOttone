# Messaggio da incollare a Fable

Apri una chat nuova con Fable, collega il repository **Giovacchio/CieliDiOttone** (oppure allega `index.html`, `GDD.md` e questo file, che trovi in Desktop → Claude → Giochi → Cieli di Ottone) e incolla tutto il testo qui sotto.

---

Ciao. Sto facendo **Cieli di Ottone**, un gioco tattico a turni nel browser ispirato ai tattici classici per le meccaniche, ma con mondo, storia e personaggi **tutti originali** (il cast è ispirato ai miei amici). Non so programmare: tutto deve funzionare senza che io tocchi il codice, e se devo fare qualcosa io spiegamelo passo passo. Il gioco va su GitHub Pages (repository Giovacchio/CieliDiOttone) e deve funzionare bene da PC e da telefono.

Ho tempo con te **fino a martedì mattina alle 8:59**. I contenuti (capitoli, dialoghi) li continuerà un altro modello dopo di te: il tuo compito è il **motore definitivo**, la parte difficile.

## Cosa trovi già

- `GDD.md`: il documento di design (mondo, cast, classi, formule, supporti, promozioni, accampamento, trama in 5 atti e tabella dei capitoli già scritti). Seguilo.
- `index.html`: un prototipo **completo e giocabile** fatto con un altro modello, tutto in un file (circa 2.300 righe). Contiene:
  - **16 capitoli scritti** nell'array `CHAPTERS`: prologo, capitoli 1-12, scelta della rotta al 12 e il primo capitolo di ognuna delle 3 rotte dell'Atto IV. Ogni capitolo è già un dato: mappa come righe di testo, schieramento, obiettivo, nemici creati con `foe(classe, livello, x, y, opzioni)`, eventi a turno (dialoghi e rinforzi), ospiti, dialoghi iniziali e finali, ricompense.
  - Obiettivi: sconfiggi il comandante, sconfiggi tutti, resisti N turni (anche con vittoria alternativa sul comandante), raggiungi una casella (anche con un'altra unità e con limite di turni), proteggi un personaggio.
  - **Supporti**: 18 conversazioni C/B/A per 6 coppie (`SUPPORTS`), punti quando si combatte vicini, bonus in battaglia.
  - **Accampamento** tra i capitoli (Compagnia, Supporti, Cucina di Giova con bonus al capitolo dopo, Diario), **promozioni** con il Sigillo di ottone (`PROMO`, due strade per personaggio), scelta di rotta salvata, salvataggio automatico.
  - **Grafica** già decisa: mappa dipinta via codice (`drawMap`, temi città/campagna/foresta/notte/miniera/cielo) e ritratti SVG con luci e ombre (`portrait`), usati anche sulle pedine. Icone delle armi da game-icons.net (CC BY 3.0, crediti già nel gioco).
- `strumenti/`: due script Playwright. `controlla_mappe.js` verifica che unità e obiettivi stiano su caselle valide e raggiungibili. `simula_campagna.js` fa giocare tutta la campagna a un bot e stampa vittorie, turni e livelli per capitolo: l'ho usato per bilanciare.

## Su cosa concentrarti, in ordine

1. **Architettura a moduli** (moduli ES, nessun build tool), con tutti i contenuti in **file JSON separati dal codice**: classi, armi, oggetti, personaggi, capitoli, dialoghi, supporti, promozioni. Riporta **tutti i 16 capitoli, i supporti e le promozioni del prototipo senza cambiarne la storia né il bilanciamento**, così si gioca subito tutta la campagna. Aggiungere un capitolo deve voler dire solo scrivere un JSON.
2. **Regole solide e testate**: due triangoli delle armi, movimento per tipo (fanteria, corazza, cavallo, volo), terreno, doppio attacco, critici, tiro con media di due numeri, esperienza, livelli (20 base, 30 dopo la promozione), armi con gittate diverse, cure. Test automatici per formule, movimento e IA, più il simulatore della campagna come test di bilanciamento.
3. **IA nemica tattica**: oggi è semplice. Mancano la ritirata con pochi PV, la priorità vera ai guaritori, il muoversi in gruppo, l'evitare le caselle pericolose, i guaritori nemici più intelligenti. Rispetto del terreno e del contrattacco.
4. **Inventario e accampamento completi**: più armi per unità con scelta in battaglia (oggi c'è un'arma sola, più un trucco per le fiale di Mars), mercato e armeria, scambio di oggetti, **schieramento** (scegliere unità e posizioni prima del capitolo).
5. **Salvataggi** con più slot ed esportazione in un file (oggi solo il salvataggio automatico tra un capitolo e l'altro).
6. **Telefono**: caselle comode da toccare, mappa che scorre bene, menu e previsione leggibili. Tasto destro o Esc = annulla.
7. Solo se avanza tempo: animazioni di attacco e di movimento.

## Punti deboli noti del prototipo

- Tutto in un file con stato globale: va rifatto, non rattoppato.
- Il bilanciamento è fatto col bot, che gioca peggio di una persona. Il Capitolo 10 (scortare Ferrante) è il più duro, i Capitoli 4 e 5 i più facili. Le soglie dei supporti (C 12, B 32, A 60) sono stimate.
- I ritratti definitivi arriveranno come PNG generati con ComfyUI in `assets/ritratti/` (nomi tipo `wata_sorriso.png`): prevedi che sostituiscano gli SVG quando ci sono, senza rompere niente se mancano.
- GitHub Pages non è ancora attivo: dimmi tu come attivarlo, passo passo.

## Come lavorare

- Prima un **piano breve** (cartelle, moduli, formato dei JSON), poi aspetta il mio ok.
- Consegna **a tappe, ognuna giocabile**, e dimmi in 3 righe cosa provare.
- Interfaccia scura ed elegante come nel prototipo.
- Alla fine scrivi un `LEGGIMI.md` con: come aggiungere un capitolo, un personaggio, una conversazione di supporto e una promozione, così un altro modello può continuare i contenuti (capitoli 14-17 di ogni rotta e Atto V).
- Se non finisci tutto, dimmi chiaramente cosa manca: lo continuo con un altro modello.

Priorità: motore solido e contenuti riportati identici > regole e test > IA > inventario e schieramento > salvataggi > telefono > animazioni.
