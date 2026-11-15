# Messaggio da incollare a Fable

Apri una chat nuova con Fable, allega `index.html` e `GDD.md` (sono in Desktop → Claude → Giochi → Cieli di Ottone) e incolla il testo qui sotto. Il repository è Giovacchio/CieliDiOttone: Fable ci lavora direttamente.

---

Ciao. Sto facendo un gioco tattico a turni nel browser, ispirato ai tattici classici tipo Radiant Dawn per le meccaniche, ma con mondo, storia e personaggi **tutti originali** (il cast è ispirato ai miei amici). Si chiama provvisoriamente **Cieli di Ottone**.

Ti allego:
- `GDD.md`: il documento di design completo (mondo, classi, formule, supporti, accampamento, architettura). Seguilo.
- `index.html`: un prototipo giocabile fatto con un altro modello (una mappa, movimento, combattimento con previsione, IA semplice, livelli, dialoghi). Usalo come riferimento per l'aspetto e le formule; il codice puoi riscriverlo da zero se serve.

**Chi sono:** non so programmare. Tutto deve funzionare senza che io tocchi il codice; se devo fare qualcosa io, spiegamelo passo passo. Il gioco va su GitHub Pages (repository: Giovacchio/CieliDiOttone, già collegato) e deve funzionare bene sia da PC sia da telefono.

**Il tuo compito: costruire il motore definitivo.** Ho poco tempo con te (fino a martedì mattina), quindi priorità alle fondamenta difficili, non ai contenuti:

1. **Architettura a moduli** (moduli ES, nessun build tool) con tutti i dati in JSON separati dal codice: classi, armi, oggetti, personaggi, mappe, capitoli, dialoghi. Aggiungere un capitolo o un personaggio deve voler dire solo scrivere dati.
2. **Regole complete** come da GDD: due triangoli delle armi, tipi di movimento (fanteria, corazza, cavallo, volo), terreno, doppio attacco, critici, tiro con media di due numeri, esperienza e livelli con tassi di crescita, armi con gittate diverse, cure, oggetti.
3. **IA nemica tattica**: comportamenti diversi (attacca, aspetta finché entri in portata, resta fermo, punta al guaritore, si ritira con pochi PV), scelta del bersaglio che tiene conto del contrattacco e della possibilità di sconfiggere, rispetto del terreno.
4. **Promozioni di classe** con due strade e il Sigillo di ottone.
5. **Supporti** C/B/A (e S): punti quando si combatte vicini, bonus in battaglia, conversazioni sbloccate.
6. **Accampamento** tra i capitoli: supporti, mercato, armeria, scelta delle unità e delle posizioni.
7. **Capitoli descritti da dati**: obiettivi diversi (sconfiggi tutti, sconfiggi il comandante, resisti N turni, raggiungi una casella), rinforzi a turni stabiliti, dialoghi prima, durante e dopo la battaglia.
8. **Salvataggi** nel browser con più slot ed esportazione in un file.
9. **Test automatici** per formule, movimento e IA.
10. Riporta il **Prologo** del prototipo nel nuovo motore, così si gioca subito.

**Come lavorare:**
- Prima un piano breve (architettura e cartelle), poi aspetta il mio ok.
- Consegna a tappe, ognuna giocabile, e dimmi in 3 righe cosa provare.
- Interfaccia scura ed elegante come nel prototipo; da telefono le caselle devono essere comode da toccare. Tasto destro o Esc = annulla.
- Alla fine scrivi un `LEGGIMI.md` con: come aggiungere un personaggio, un capitolo e una conversazione di supporto, così un altro modello può continuare i contenuti.
- Se non finisci tutto, dimmi chiaramente cosa manca: lo continuo con un altro modello.

Priorità: regole corrette e motore solido > IA > telefono > grafica.

**Grafica (già decisa):** stile illustrato, niente pixel art. Nel prototipo la mappa è dipinta via codice (`drawMap`: prato a macchie, canali con argini, binari e ponti, mura con finestre accese, fornace luminosa, alberi con ombre) e i ritratti sono SVG con luci e ombre (`portrait`), usati anche sulle pedine. Tienili come base nel nuovo motore, in un modulo grafico separato, così le mappe nuove si disegnano da sole a partire dai dati. I ritratti PNG generati con ComfyUI arriveranno dopo in `assets/ritratti/`: prevedi che sostituiscano gli SVG quando ci sono.
