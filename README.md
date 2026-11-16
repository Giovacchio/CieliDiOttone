# Cieli di Ottone

Gioco tattico a turni su griglia, nel browser, da PC e da telefono. Mondo fantasy con magia ed etere, macchine a vapore e dirigibili; personaggi ispirati agli amici di Giova.

**Gioca:** https://giovacchio.github.io/CieliDiOttone/

## Stato

- **Prologo giocabile** (prototipo): movimento, combattimento con previsione, due triangoli delle armi, livelli, abilità uniche, IA nemica, dialoghi.
- **Prossimo passo:** il motore definitivo a moduli con dati in JSON (vedi `MESSAGGIO_PER_FABLE.md`).

## File

| File | Cosa contiene |
|---|---|
| `index.html` | Il gioco (per ora tutto in un file) |
| `GDD.md` | Documento di design: mondo, trama, cast, classi, formule, supporti, accampamento |
| `MESSAGGIO_PER_FABLE.md` | Istruzioni per costruire il motore definitivo |

## Compagnia della Brace

Giova (Stratega), Wata (Etermante delle Radici), Lethy (Spadaccina), Mars (Druida alchimista).

## Crediti

- Icone delle armi: [game-icons.net](https://game-icons.net) (Lorc, Delapouite, Skoll), CC BY 3.0.

## Strumenti

- `strumenti/controlla_mappe.js`: controlla che unità e obiettivi di ogni capitolo stiano su caselle valide e raggiungibili (`node strumenti/controlla_mappe.js`).
- `strumenti/simula_campagna.js`: fa giocare la campagna a un bot e stampa vittorie, turni e livelli per capitolo (`node strumenti/simula_campagna.js 5`). Richiedono Playwright.
