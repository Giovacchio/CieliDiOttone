# Cieli di Ottone — documento di design

Versione 0.1 · 15 novembre 2026 · titolo provvisorio

Gioco tattico a turni su griglia, ispirato ai tattici classici (Radiant Dawn, Three Houses) per le meccaniche, con un mondo, una storia e personaggi **completamente originali**. Il cast è ispirato agli amici di Giova. Si gioca nel browser, da PC e da telefono, e si condivide con un link.

---

## 1. Pilastri

1. **Personaggi prima di tutto.** Ogni unità ha una voce, un passato e legami con gli altri. I supporti sono il cuore emotivo del gioco.
2. **Nessuna fazione pulita.** Tre poteri, tre ragioni credibili, tre modi di sbagliare. Il giocatore sceglie da che parte stare, e la scelta costa.
3. **Tattica leggibile.** Tutto ciò che decide un combattimento si vede prima di attaccare: danno, precisione, critico, contrattacco.
4. **Niente morte permanente.** Chi cade si ritira ferito e torna al capitolo dopo. Si perde solo se cade il protagonista.

## 2. Mondo

**Valdaria**, un continente dove la magia e l'industria vivono della stessa risorsa: l'**etere**, un cristallo luminoso che cresce lentamente nelle **Radici**, foreste antichissime.

| Fazione | Chi sono | Cosa vogliono | Il loro torto |
|---|---|---|---|
| **Corona di Ottone** | Impero industriale: fonderie, ferrovie, dirigibili | Portare luce, medicine e trasporti a tutti | Estraggono etere distruggendo le Radici e sfruttando i lavoratori |
| **Concilio delle Radici** | Teocrazia di etermanti che custodisce le foreste | Proteggere le Radici e l'equilibrio del mondo | Tengono l'etere per sé, negano cure e progresso a chi non si inchina |
| **Leghe Libere** | Città mercantili e compagnie di ventura | Commerciare, restare indipendenti | Vendono a entrambe le parti, chiunque paghi |

**Il segreto (svelato a metà gioco):** i cristalli di etere sono vivi. Si formano dove muoiono persone legate alle Radici, e dentro ogni cristallo resta un'eco di chi era. Sia la Corona sia il Concilio lo sanno.

**I protagonisti:** la **Compagnia della Brace**, un gruppo di mercenari delle Leghe Libere. Amici prima che soldati.

## 3. Trama (struttura in 5 atti, circa 20 capitoli)

| Atto | Capitoli | Cosa succede |
|---|---|---|
| I · La Brace | Prologo – 4 | La Compagnia ruba un carico di etere dalla fonderia di Corvara per conto di un committente misterioso. Prime missioni nelle Leghe |
| II · Le Radici | 5 – 8 | Il committente è il Concilio. Nelle foreste la Compagnia vede i metodi del Concilio e inizia a dubitare |
| III · Il cristallo che respira | 9 – 12 | Scoprono la verità sull'etere. La Compagnia si divide: **scelta di rotta** (Corona, Concilio o nessuno dei due) |
| IV · Cieli di ottone | 13 – 17 | Guerra aperta. Capitoli diversi in base alla rotta, battaglie sui dirigibili |
| V · L'ultima brace | 18 – 20 | Finale diverso per rotta, epilogo per ogni personaggio in base ai supporti |

### Capitoli già scritti e giocabili (nel prototipo, array `CHAPTERS`)

| Capitolo | Titolo | Obiettivo | Cosa succede |
|---|---|---|---|
| Prologo | La Fonderia di Corvara | Comandante | Furto del carico di etere; il Capitano Vorn accenna a cosa c'è nei cristalli |
| 1 | Binari nella nebbia | Raggiungi | Fuga verso il confine; entra l'Ispettrice Ferrante (Corona) |
| 2 | Le capre di Merlaia | Resisti 6 turni (di notte) | Difesa del villaggio di Nonna Tessa dai predoni di Gorran; Wata ottiene le Spine, Mars l'elisir di Tessa |
| 3 | I Corvi di Sale | Comandante | Porto Ambra: il Signor Grigio, Brann fa il doppio gioco, "mantello verde"; stocco d'argento per Lethy |
| 4 | Il magazzino delle Lanterne | Comandante | Il committente è Sorella Maelis (Concilio); raid notturno di Ferrante con aeronauti. Fine Atto I |
| 5 | Sentieri di radice | Sconfiggi tutti | Segatrici della Corona nelle Radici; Wata sente il nome "Ilvo" in un cristallo |
| 6 | Fondoscuro | Raggiungi entro il turno 7 | Il Custode Thalen punisce un villaggio che si è curato con i cristalli; la Compagnia combatte il Concilio |
| 7 | Il Pozzo delle Voci | Proteggi Maelis 5 turni | Le voci nei cristalli sono persone |
| 8 | Il tribunale di Lucegrande | Comandante | Thalen si arrende; il Registro delle Radici svela il segreto. Fine Atto II |
| 9 | Le miniere di Cenerossa | Comandante | La Corona fa morire i minatori sopra radici trapiantate; Ferrante scopre la verità |
| 10 | La notte di Corvara | Porta Ferrante all'uscita | Evasione di Ferrante; il Direttore Strand: "fai il conto, stratega" |
| 11 | Il Cuore delle Radici | Comandante | Il Gran Custode Arven voleva spegnere tutto l'etere col Canto del Silenzio |
| 12 | Ritorno a Fossa Grigia | Resisti 6 turni | Corona e Concilio contro la Compagnia; **scelta della rotta**: Ferrante (Corona), Maelis (Concilio) o Leghe Libere |
| 13 | La Sovrana / Lucegrande in fiamme / La piazza di Porto Ambra | per rotta | Primo capitolo dell'Atto IV di ciascuna rotta |

Antagonisti con una ragione credibile: **Strand** (Corona, "ogni lampada salva dieci vite"), **Arven** (Concilio, "il Silenzio è pietà"), **Thalen** (Concilio, "le Radici non sono una farmacia"). Personaggi della storia: Ferrante, Maelis, il Signor Grigio, Nonna Tessa, Brann, Erba.

Da scrivere: capitoli 14-17 per ciascuna rotta (battaglie sui dirigibili, Strand e Arven come boss finali a seconda della rotta) e Atto V (18-20) con finali ed epiloghi.

## 4. Cast

Il cast usa i **nickname** degli amici. Personaggi della Compagnia della Brace già decisi:

| Personaggio | Classe | Carattere | Abilità unica |
|---|---|---|---|
| **Giova** (protagonista) | Stratega · spada | Calmo, organizzato, sceglie sempre la mossa migliore calcolando il rischio | **Calcolo del rischio:** lui e gli alleati entro 2 caselle hanno +10 precisione |
| **Wata** | Etermante delle Radici · magia naturale | Gentilissima, appassionata di magia, parla con le piante | **Famiglio felino:** il suo gatto Prospy la avvisa dei colpi, +10 schivata |
| **Lethy** | Spadaccina · stocco | Rapidissima, di famiglia ricca, un po' fuori dal mondo | **Stoccata:** lo stocco fa danno triplo ai corazzati |
| **Mars** | Druida alchimista · elisir | Curiosa, aperta a ogni esperienza nuova, sperimenta su tutto | **Spirito libero:** ottiene il 50% di PE in più |

### Giova, il protagonista

- **Chi è:** il cuore organizzativo della Compagnia. Ha messo insieme il gruppo, pianifica ogni missione e tiene i conti di tutto, dai turni di guardia alle provviste.
- **Come ragiona:** "scelta ottimale, rischio calcolato". Prima di agire conta i nemici, le vie di fuga e le probabilità, poi decide senza esitare.
- **Cosa lo rende umano:** adora le storie di cavalieri e strateghi del passato, cucina per tutti all'accampamento le ricette della sua famiglia (con un bonus del giorno dopo) e ha un debole per gli animali, al punto che prima della Compagnia faceva il custode di bestie per i mercanti.
- **Arco narrativo:** Giova crede che ogni problema abbia una mossa ottimale. Il segreto dell'etere lo mette davanti a una scelta in cui ogni opzione costa qualcosa, e dovrà imparare a decidere anche quando i numeri non bastano.
- **Promozioni:** Condottiero (spade e lance, migliora le aure) o Tattico d'ottone (spada e congegni, può spostare un alleato).

### Gli altri tre

- **Wata:** cresciuta ai margini delle Radici, usa una magia gentile fatta di rovi, radici e spore. Il gatto **Prospy** (nome provvisorio) la segue ovunque e "sente" l'etere. È lei la prima a capire che i cristalli sono vivi.
- **Lethy:** ultima figlia di una famiglia di banchieri delle Leghe Libere. Ha imparato la scherma con i migliori maestri ma non ha mai visto una battaglia vera; tratta i nemici come avversari di un torneo. Comica, ma il suo stocco è il più veloce della Compagnia.
- **Mars:** druida che ha lasciato il suo circolo perché voleva "provare tutto". Mescola erbe, etere e chimica della Corona in elisir sempre nuovi, quasi sempre funzionanti. All'accampamento sperimenta ricette e pozioni (oggetti casuali, a volte strani).

### Aspetto

| Personaggio | Aspetto |
|---|---|
| Giova | Capelli rossi con un ciuffo, barba leggera; cappotto blu da stratega |
| Wata | Capelli viola lunghi; mantello verde muschio con ricami di foglie; Prospy, gatto arancione |
| Lethy | Caschetto castano con la parte sotto tinta di bianco; giacca da scherma blu e bianca, stocco |
| Mars | Capelli corti, ricci e neri; gilet marrone pieno di tasche e fiale, occhialini |

I prompt per generare i ritratti sono in `ritratti/PROMPT_RITRATTI.md`.

Altri amici si aggiungeranno con la stessa scheda.

### Scheda per ogni amico (da compilare)

| Campo | Esempio |
|---|---|
| Nome nel gioco | (inventato, o derivato dal nome vero) |
| Ispirato a | nome dell'amico |
| Carattere in 3 parole | testardo, leale, ironico |
| Cosa lo rende riconoscibile | una battuta tipica, un hobby, un modo di fare |
| Classe di partenza | vedi sezione 5 |
| Ruolo nella storia | perché è nella Compagnia, cosa cerca |
| Rapporti con gli altri | migliori amici, rivalità, chi lo fa ridere |
| Aspetto | capelli, vestiti, colori, un dettaglio |
| Limite da rispettare | cose che l'amico **non** vorrebbe vedere nel suo personaggio |

**Regola d'oro:** i personaggi sono un omaggio. Si esagera in modo affettuoso, mai in modo che l'amico si possa offendere.

## 5. Classi e promozioni

Livello massimo 20 per le classi base. Dal livello 10 si può promuovere con un **Sigillo di ottone**, scegliendo tra due strade.

| Classe base | Arma | Promozione A | Promozione B |
|---|---|---|---|
| Lama | Spada | Duellante (velocità, critici) | Cavaliere d'ottone (a cavallo meccanico, lance) |
| Lanciere | Lancia | Paladino a vapore (corazza, movimento) | Aeronauta (vola con ali meccaniche) |
| Guerriero | Ascia | Berserker (forza, PV) | Guastatore (asce + congegni, demolisce muri) |
| Arciere | Arco | Cecchino (gittata 2-3) | Ranger (si muove nel bosco senza penalità) |
| Fuciliere | Polvere | Artigliere (danno alto, gittata 3) | Pistolero (gittata 1-2, raddoppia facilmente) |
| Etermante | Etere | Arcanista (danno magico) | Saggio delle Radici (magia + cure) |
| Medico da campo | Kit (cure) | Chirurgo (cure ad area) | Alchimista (cure + bombe) |
| Ingegnere | Congegni | Macchinista (torrette) | Inventore (droni scudo, riparazioni) |
| Esploratore | Pugnale | Infiltrato (apre forzieri, ruba) | Assassino (colpo letale) |
| Corazzato | Lancia | Bastione (protegge gli alleati vicini) | Generale (lance + asce) |

Tipi di movimento: **fanteria**, **corazza** (lenta, penalità nel bosco), **cavallo** (veloce, penalità su macerie e bosco), **volo** (ignora il terreno, debole agli archi).

## 6. Armi e triangoli

**Triangolo del ferro:** spada › ascia › lancia › spada.
**Triangolo dell'ingegno:** etere › congegni › polvere › etere. La magia manda in tilt le macchine, i droni scudo fermano i proiettili, i proiettili interrompono gli incantesimi.

Vantaggio di triangolo: **+15 precisione, +1 danno**; svantaggio il contrario. Gli archi fanno danno triplo alle unità in volo. Le armi hanno potenza, precisione, critico, gittata e (in seguito) durata.

## 7. Statistiche e formule

Statistiche: PV, Forza, Magia, Abilità, Velocità, Fortuna, Difesa, Resistenza, Movimento. Ogni personaggio ha **tassi di crescita** per livello.

| Formula | Calcolo |
|---|---|
| Attacco | Forza (o Magia) + potenza arma ± triangolo |
| Danno | Attacco − Difesa (o Resistenza) del bersaglio − difesa del terreno |
| Precisione | precisione arma + Abilità×2 + Fortuna/2 ± 15 triangolo |
| Schivata | Velocità×2 + Fortuna + schivata del terreno |
| Probabilità di colpire | Precisione − Schivata (tra 0 e 100) |
| Tiro | media di due tiri da 0 a 100: le percentuali alte sono più affidabili di come appaiono |
| Critico | critico arma + Abilità/2 − Fortuna del bersaglio, danno ×3 |
| Doppio attacco | se la Velocità supera quella del nemico di 4 o più |
| Esperienza | 10 per uno scontro, 30 per una sconfitta (+ bonus per livelli e comandanti), 12 per una cura. 100 = livello |

## 8. Terreno

| Terreno | Fanteria | Corazza | Volo | Difesa | Schivata |
|---|---|---|---|---|---|
| Pianura, grata, binari | 1 | 1 | 1 | 0 | 0 |
| Bosco | 2 | 3 | 1 | +1 | +20 |
| Macerie | 2 | 2 | 1 | +1 | +10 |
| Canale | – | – | 1 | 0 | +10 |
| Muro | – | – | – | – | – |
| Fornace | 2 | 2 | 2 | +1 | +15 · cura il 10% |

Più avanti: porte, forzieri, ponti levatoi, nebbia di guerra, rinforzi e piattaforme dei dirigibili.

## 9. Supporti

Due personaggi che combattono vicini (a 1-2 caselle) guadagnano punti di supporto. Livelli **C → B → A** (e **S** per una coppia sola per personaggio, legata ai finali).

- Ogni livello sblocca una **conversazione** da vedere all'accampamento.
- Bonus in battaglia quando sono vicini: precisione, schivata e critico in base al livello.
- Le conversazioni sono scritte pensando agli amici veri: battute, rivalità e momenti seri.

## 10. Accampamento tra i capitoli

- **Supporti:** si leggono le conversazioni sbloccate.
- **Mercato:** armi, tonici, sigilli. Il denaro arriva dalle missioni e dai forzieri.
- **Armeria:** inventario e assegnazione delle armi.
- **Diario:** riassunto della storia e schede dei personaggi.
- **Prepara la battaglia:** scelta dei personaggi e delle posizioni iniziali.

## 11. Direzione artistica

- **Stile:** illustrato moderno. Mappe dipinte con toni caldi (ottone, rame verderame, fuliggine), interfaccia scura ed elegante, ritratti grandi nei dialoghi.
- **Ritratti:** da generare con il workflow ComfyUI di Giova (SDXL Illustrious). Ogni personaggio ha un **ritratto base** più tre espressioni (normale, sorriso, arrabbiato o triste) con la stessa posa, sfondo trasparente, mezzo busto.
- **Prompt di base per i ritratti:** `half body portrait, [descrizione del personaggio], fantasy steampunk mercenary outfit, brass and leather details, soft painterly shading, clean lineart, neutral grey background, facing slightly left, game character portrait`. Si aggiungono capelli, vestiti, colori e un dettaglio riconoscibile dalla scheda dell'amico.
- **Mappa (fatto nel prototipo):** dipinta via codice a partire dai dati: prato a macchie morbide, selciato della fonderia con cordoli, canali con argini di pietra, binari con curve e ponti, mura con tetti di ardesia e finestre accese, fornace luminosa, alberi con ombre, luce calda da sinistra e vignettatura. Ogni mappa nuova si disegna da sola.
- **Unità sulla mappa (fatto nel prototipo):** medaglioni con il volto del personaggio, bordo del colore della squadra e piccola icona dell'arma; il boss ha il bordo d'ottone. I nemici hanno un aspetto per classe (elmo, tricorno, cappuccio, elmo chiuso).
- **Ritratti provvisori (fatti nel prototipo):** SVG con luci e ombre e un dettaglio per personaggio (spalline d'ottone per Giova, jabot per Lethy, spilla a foglia e Prospy per Wata, fiala verde per Mars). Restano finché non arrivano i PNG di ComfyUI.
- **Crediti:** icone delle armi da game-icons.net (Lorc, Delapouite, Skoll), CC BY 3.0. La grafica di RPG Maker non si può usare (solo per giochi fatti con RPG Maker); materiale libero utilizzabile in `RISORSE_GRAFICHE.md`.

## 12. Architettura tecnica (per lo sviluppo)

- **Sito statico** su GitHub Pages, niente server. HTML, CSS e JavaScript moderni (moduli ES).
- **Dati separati dal codice:** classi, armi, oggetti, personaggi, capitoli, mappe e dialoghi in file JSON. Così aggiungere contenuti non tocca il motore.
- **Motore diviso in moduli:** mappa e terreno, movimento e portata, combattimento e formule, IA nemica, turni ed eventi, interfaccia, salvataggi, scene di dialogo.
- **Capitoli descritti da dati:** mappa, unità, rinforzi a un certo turno, obiettivi (sconfiggi tutti, sconfiggi il comandante, resisti N turni, raggiungi una casella), dialoghi prima, durante e dopo.
- **Salvataggio** nel browser (localStorage) con più slot ed esportazione del salvataggio in un file.
- **Test automatici** per formule e IA: lo sviluppo procede senza rompere ciò che funziona.

## 13. Piano di lavoro

| Fase | Chi | Cosa |
|---|---|---|
| 0 · Prototipo | Opus (fatto) | Una mappa giocabile: movimento, combattimento con previsione, IA semplice, livelli, dialoghi, PC e telefono |
| 1 · Motore | **Fable** | Architettura a moduli e dati JSON, tutte le formule, IA tattica migliore, promozioni, supporti, accampamento, salvataggi, eventi dei capitoli, test |
| 2 · Contenuti | Opus | Schede degli amici, dialoghi, capitoli dell'atto I, mappe, bilanciamento |
| 3 · Arte | Giova + ComfyUI | Ritratti e illustrazioni |
| 4 · Atti II-V | Opus (Fable per i problemi del motore) | Il resto della campagna |

## 14. Domande aperte

- Schede degli altri amici.
- Titolo definitivo del gioco.
- Quante rotte nell'atto III: tre, o due più un finale segreto?
- Musica: brani liberi da diritti da aggiungere in seguito.
