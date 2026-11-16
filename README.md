# Cieli di Ottone

Gioco tattico a turni su griglia, nel browser, da PC e da telefono. Mondo fantasy con magia ed etere, macchine a vapore e dirigibili; personaggi ispirati agli amici di Giova.

**Gioca:** https://giovacchio.github.io/CieliDiOttone/

## Stato

- **Storia completa, 37 capitoli**: prologo, capitoli 1-12, scelta della rotta, poi otto capitoli diversi per ognuna delle tre rotte (13-20), con finale ed epiloghi dei personaggi in base ai supporti.
- **Nove personaggi giocabili**: Giova, Lethy, Wata e Mars dall'inizio; dal capitolo 14 Nives e Tullo, più Ferrante, Maelis o Brann a seconda della rotta.
- Motore a moduli con tutti i contenuti in file JSON (`dati/`): aggiungere un capitolo vuol dire scrivere un JSON.
- Supporti, promozioni, accampamento con armeria, mercato e cucina, schieramento prima di ogni capitolo.
- Su PC si gioca anche tutto da tastiera (frecce o WASD, Invio, Esc, Tab, E per il fine turno); suoni e musica sono generati dal gioco, senza file audio.
- Nemici con IA tattica (o semplice, a scelta), tre slot di salvataggio con esportazione in un file, comandi pensati anche per il telefono.

## File

| File | Cosa contiene |
|---|---|
| `index.html`, `css/`, `js/` | Il gioco |
| `dati/` | Capitoli, dialoghi, personaggi, classi, armi, regole |
| `LEGGIMI.md` | Come aggiungere capitoli, personaggi, supporti e promozioni |
| `GDD.md` | Documento di design: mondo, trama, cast, classi, formule |
| `prototipo/` | Il primo prototipo in un file solo (riferimento) |

## Compagnia della Brace

Giova (Stratega), Wata (Etermante delle Radici), Lethy (Spadaccina), Mars (Druida alchimista).

## Crediti

- Icone delle armi: [game-icons.net](https://game-icons.net) (Lorc, Delapouite, Skoll), CC BY 3.0.

## Strumenti

Vedi `LEGGIMI.md`: controllo dei dati, test, simulatore della campagna, collaudo nel browser.
