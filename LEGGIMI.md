# Cieli di Ottone — come continuare i contenuti

Questo file è per chi (persona o modello) aggiunge capitoli, personaggi, supporti e promozioni.
**Non serve toccare il codice**: tutto il contenuto sta nei file JSON della cartella `dati/`.

## Regola d'oro

Dopo ogni modifica ai dati:

```
node strumenti/controlla_dati.js     # trova errori di battitura, caselle sbagliate, chi parla senza esistere
node --test test/*.test.js           # regole e campagna
node strumenti/simula_campagna.js 20 # un bot gioca 20 campagne: vittorie, turni e livelli per capitolo
```

Se i dati hanno un errore, anche il gioco lo dice a schermo, in italiano, invece di partire.
Per provare il gioco sul proprio computer: `node strumenti/servi.js` e poi http://localhost:8080
(aprire `index.html` con un doppio clic **non** funziona: i moduli e i JSON vogliono un indirizzo web).

## Com'è fatto

| Cartella | Cosa contiene |
|---|---|
| `dati/` | Tutto il contenuto: capitoli, supporti, personaggi, classi, armi, terreni, regole |
| `js/motore/` | Le regole, senza grafica: `battaglia.js` (turni, scontri, obiettivi), `combattimento.js` (formule), `movimento.js`, `ia.js` e `ia-tattica.js`, `supporti.js`, `inventario.js` (armi, deposito, mercato), `campagna.js` (tra un capitolo e l'altro) |
| `js/interfaccia/` | Lo schermo: battaglia, dialoghi, accampamento, titolo, mappa dipinta, ritratti, `effetti.js` (particelle e atmosfera delle mappe), `scontro.js` (scena di scontro), `suono.js` (effetti e musica generati dal codice), `menu.js` (opzioni, pausa, come si gioca), `titolo-scena.js` (lo sfondo animato del titolo). Nessuna libreria esterna: tutta la grafica è disegnata dal codice |
| `test/` | Test automatici |
| `strumenti/` | Controllo dei dati, simulatore, collaudo nel browser, confronto con il prototipo |
| `prototipo/` | Il prototipo originale in un file solo: resta come riferimento per il confronto |

Il motore consegna "fatti" (`{tipo:"colpo", ...}`) e l'interfaccia li anima: per questo test e simulatore
girano senza browser, in un paio di secondi.

## Aggiungere un capitolo

1. Crea `dati/capitoli/c14c.json` (l'`id` dentro il file deve essere uguale al nome del file).
2. Aggiungi `"c14c"` a `capitoli` in `dati/campagna.json`, nella posizione giusta. L'ordine della lista è l'ordine della storia;
   i capitoli con `"rotta"` vengono saltati da chi ha scelto un'altra rotta.

```json
{
  "id": "c14c",
  "titolo": "Capitolo 14 · …",
  "atto": "Atto IV · Cieli di ottone",
  "tema": "cielo",
  "rotta": "corona",
  "mappa": [
    "oooooooo",
    "oDDDDDDo",
    "oooooooo"
  ],
  "schieramento": [[1,1],[2,1],[3,1],[4,1]],
  "obiettivo": { "tipo": "comandante", "testo": "Sconfiggi …" },
  "nemici": [
    { "classe": "Lanciere", "lv": 14, "x": 6, "y": 1, "ia": "attacca" },
    { "id": "boss", "classe": "Lama", "titolo": "Capitana", "nome": "Capitana Voss", "lv": 16, "x": 5, "y": 1,
      "ia": "fermo", "comandante": true, "frase": "Detta la prima volta che viene attaccata.", "aspetto": "corona" }
  ],
  "eventi": [
    { "turno": 3, "fase": "nemico", "dialogo": [["giova", "Arrivano!"]],
      "rinforzi": [ { "classe": "Aeronauta", "lv": 14, "x": 0, "y": 1, "ia": "attacca" } ] }
  ],
  "inizio": [["narr", "…"], ["giova", "…"]],
  "vittoria": [["boss", "…"], ["wata", "…"]],
  "ricompensa": { "testo": "Bottino: …", "armi": { "giova": "sciabola" }, "oggetti": [ { "a": "mars", "id": "tonico", "q": 2 } ] },
  "diario": "Una frase per il Diario dell'accampamento."
}
```

- **mappa**: righe di testo tutte lunghe uguali; ogni carattere è un terreno di `dati/terreni.json`
  (`.` pianura, `f` bosco, `r` macerie, `w` canale, `X` muro, `F` fornace, `o` cielo, `D` ponte della nave…).
  Le coordinate partono da 0: `x` è la colonna, `y` la riga.
- L'atmosfera animata dipende da tema e terreni, senza scrivere altro: riflessi sull'acqua, braci sulle fornaci (`F`), scintille sulle vene d'etere (`c`),
  lucciole e lampioni accesi nei temi notturni, nuvole in `campagna` e `cielo`, foglie in `foresta`, pulviscolo in `miniera`.
- **tema** (come viene dipinta): `citta`, `campagna`, `foresta`, `foresta-notte`, `notte`, `miniera`, `cielo`. `"selciato": true` lastrica le strade.
- **schieramento**: le caselle di partenza della Compagnia, nell'ordine di `personaggi.json`.
- **obiettivo.tipo**: `comandante` (batti chi ha `"comandante": true`), `tutti`, `resisti` (con `"turni"`; `"anche": "comandante"` per vincere anche così),
  `raggiungi` (con `"casella": [x,y]`; `"chi"` se non è il capo; `"limite"` per il turno massimo). `"proteggi": "id"` fa perdere se quell'unità cade.
- **nemici / ospiti / rinforzi**: con `"classe"` le statistiche si calcolano da `classi.json` e dal livello (`"bonus"` per ritoccarle);
  oppure si scrivono `"stat"` complete. `"ia"`: `attacca` (avanza), `portata` (aspetta che qualcuno entri nel suo raggio), `fermo`.
  `"sveglia": 4` lo fa avanzare dal turno 4. Gli **ospiti** sono alleati comandati dal giocatore: `"squadra": "alleato", "ospite": true`.
- **dialoghi**: `["chi", "testo"]`, con un terzo elemento facoltativo per l'espressione del ritratto (`["wata", "…", "sorriso"]`).
  "chi" è un personaggio, un nome di `png.json` (`narr` = narratore) o l'`id` di un'unità del capitolo.
- **ricompensa**: `"oro"` (paga della missione, si spende al mercato), `"armi"` (l'arma viene data e impugnata; quella vecchia resta nell'inventario),
  `"oggetti"`, `"testo"` (la frase mostrata a fine capitolo).
- **scelta della rotta**: vedi `c12.json` (`"scelta"`).

## Aggiungere un personaggio alla Compagnia

1. In `dati/personaggi.json` aggiungi la scheda e metti il suo id in `ordine`:

```json
"nuovo": {
  "nome": "Nome", "classe": "Arciere", "movimento": "fanteria", "mov": 5, "arma": "arco",
  "entra": "c14c", "lv": 12,
  "stat": {"hp":28,"for":11,"mag":2,"abi":14,"vel":13,"fort":8,"def":7,"res":5},
  "crescita": {"hp":60,"for":45,"mag":10,"abi":55,"vel":50,"fort":40,"def":25,"res":25},
  "abilita": { "nome": "…", "descrizione": "…", "effetti": [ { "tipo": "bonus", "critico": 10 } ] },
  "oggetti": [ { "id": "tonico", "q": 2 } ],
  "aspetto": { "skin": "#e8bf9c", "hair": "#3a2b22", "style": "short", "coat": "#3b5f8a" }
}
```

- `"usa"`: i tipi di arma che sa portare (`spada`, `lancia`, `ascia`, `arco`, `etere`, `congegni`, `polvere`, `cura`). Una promozione può aggiungerne con `"usa"`.
- `"entra"`: il capitolo in cui si unisce (senza, c'è dall'inizio). `"lv"` e `"stat"` sono quelli con cui arriva; `crescita` è la probabilità (%) di +1 a ogni livello.
- Ricorda di dare al capitolo abbastanza caselle di `schieramento`.
- **Effetti delle abilità** (si possono combinare):
  `aura` (`raggio`, e `precisione`/`schivata`/`critico` a tutta la squadra entro il raggio),
  `bonus` (`precisione`/`schivata`/`critico`/`danno` a sé; `"seArma": {"magica": true}` o `{"efficace": "corazza"}` per limitarlo a un'arma),
  `esperienza` (`"moltiplica": 1.5`), `curaVicini` (`pv` a chi le sta accanto a inizio turno), `curaLarga` (`pv` anche a chi sta accanto a chi viene curato).
  `"gatto": true` mostra Prospy sulla pedina.
- **Aspetto** (ritratto provvisorio): `style` tra `tuft`, `bob`, `longv`, `curly`, `short`, `bald`, `messy`, `hood`, `helm`, `greathelm`, `tricorn`;
  `acc` tra `epaulette`, `jabot`, `leaf`, `vial`; `beard`: `true` o `"full"`; `scar`, `under`, `eye`.
- **Ritratto definitivo**: basta mettere `assets/ritratti/<id>.png` (e, volendo, `<id>_sorriso.png`, `<id>_triste.png`…): sostituisce l'SVG da solo.
  Se il file manca resta l'SVG, niente si rompe.
- Personaggi che parlano soltanto: `dati/png.json`. Classi dei nemici: `dati/classi.json`. Armi: `dati/armi.json`.

## Aggiungere una conversazione di supporto

1. Crea `dati/supporti/nuovo-wata.json`:

```json
{ "coppia": ["nuovo", "wata"],
  "C": [["wata", "…"], ["nuovo", "…"]],
  "B": [["nuovo", "…"]],
  "A": [["wata", "…"]] }
```

2. Aggiungi `"nuovo-wata"` a `supporti` in `dati/campagna.json`.

Soglie dei punti, raggio e bonus stanno in `dati/regole.json` (`supporti`). Solo le coppie con un file guadagnano punti.

## Aggiungere una promozione

In `dati/promozioni.json`, sotto l'id del personaggio, due strade:

```json
"nuovo": [
  { "classe": "Cecchino", "stat": {"abi":3,"for":2,"hp":2}, "mov": 1,
    "abilita": { "nome": "…", "descrizione": "…", "effetti": [ { "tipo": "bonus", "critico": 15 } ] } },
  { "classe": "Ranger", "stat": {"vel":3,"def":2,"hp":3}, "mov": 2, "movimento": "cavallo", "arma": "arcoL",
    "abilita": { "nome": "…", "descrizione": "…", "effetti": [] } }
]
```

`stat` sono i bonus immediati; `mov` si somma al movimento; `movimento` cambia il tipo; `arma` aggiunge un'arma all'inventario.
L'abilità della promozione **sostituisce** quella di base: ripeti gli effetti che devono restare.
Livello richiesto e oggetto (`sigillo`) sono in `dati/regole.json`.

## Armi, oggetti e mercato

- `dati/armi.json`: `tipo` (decide il triangolo e chi può usarla), `potenza`, `precisione`, `critico`, `gittata` `[min, max]`,
  `"magica": true` (usa Mag contro Res), `"efficace": "corazza"` o `"volo"` (potenza ×3), `"cura": 10` per gli strumenti di cura, `icona` (da `icone.json`).
- `dati/oggetti.json`: per ora `tipo` `cura` (con `pv`) e `promozione`.
- `dati/mercato.json`: cosa si vende e a quanto; `"da": "c4"` mette la merce in vendita solo da quel capitolo in poi.
  Si rivende a metà prezzo, e solo ciò che il mercato tratta (le armi uniche della storia non si vendono).
- Ogni personaggio porta fino a 4 armi; il resto sta nel deposito della Compagnia (scheda Armeria).

## IA dei nemici

`"ia"` in `dati/regole.json`: `tattica` (predefinita) o `classica` (quella del prototipo). Il giocatore può cambiarla dal titolo.
I pesi della tattica si ritoccano aggiungendo `"iaTattica": { "sogliaRitirata": 0.25, ... }` a `regole.json` (i nomi sono in cima a `js/motore/ia-tattica.js`).
Per un'IA nuova: scrivi una funzione come `agisciTattica` e registrala con `registraIA("nome", funzione)`.

## Salvataggi

Tre slot nel browser (`js/salvataggi.js`), esportazione e importazione in un file `.json`. La partita si salva da sola nello slot in uso:
tra un capitolo e l'altro e anche a metà battaglia, dopo ogni mossa del giocatore (`partita.sospesa`, scritta da `Battaglia.esporta()` e riletta da `Battaglia.riprendi()`).
Lo schieramento scelto per ogni capitolo resta in `partita.schieramenti`.
Se cambi la forma della partita salvata, alza `VERSIONE` in `js/motore/campagna.js` e scrivi la conversione come è stato fatto per `migraV1`.

## Bilanciamento

- `node strumenti/simula_campagna.js 30 corona` (o `radici`, `libere`): il bot gioca peggio di una persona, quindi i numeri servono a
  confrontare i capitoli tra loro. Un capitolo che il bot vince al primo tentativo meno di una volta su tre è probabilmente troppo duro.
- `node strumenti/confronta_prototipo.js` (richiede Playwright) dimostra che il motore applica le stesse regole del prototipo:
  stesse battaglie, stessi tiri, stessi risultati (il confronto usa sempre l'IA `classica`, qualunque sia quella scelta in `regole.json`).
- `node strumenti/collauda.js` (richiede Playwright) prova il gioco nel browser, su PC e telefono, e salva gli screenshot.
