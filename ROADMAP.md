# 🗺️ ROADMAP — Bolletta Mondiale 2026

> Piano a fasi con checklist. Aggiornare ad ogni avanzamento. Vedi `MEMO.md` per i dettagli tecnici.

## Dove eravamo / Prossimo passo

- **Stato (2026-06-10 sera)**: **tutto pubblicato** (commit `647d910`, deploy Actions verde, sito
  verificato con screenshot): What-if completo (✔, drag classifiche, punteggi incontri), sintesi
  bollette riusabile, countdown header, mini-classifiche negli Incontri, dati dal Feed.
- **Prossimo passo**: (1) sul Foglio installare il trigger 1 min (menu ⚽ Scommesse); (2) test
  end-to-end alla prima partita (11/06 21:00). Nota cache: dopo un deploy i browser possono mostrare
  la versione precedente per max 10 min (vedi MEMO §8).

---

## Fase 0 — Riorganizzazione e decisioni ✅
- [x] Struttura cartelle (`src/`, `dist/`, `ref/`, `legacy/`).
- [x] Percorsi relativi negli script Python (niente path assoluti).
- [x] Esportatore dati statici `src/genera_dati_web.py` (single source of truth bollette).
- [x] Scelta stack + verifica versioni online (Angular 21, ng-zorro 21.3, Tailwind 4.3).
- [x] Verifica CORS/cache di `raw.githubusercontent.com`.
- [x] Sistema documentazione (MEMO / ROADMAP / CLAUDE).

## Fase 1 — Apps Script: pubblicazione dati (senza token) ✅
- [x] `publishData()` + `buildPayload()` + `getMatchesData()`: JSON (classifiche dal foglio + risultati) in `Feed!A1`.
- [x] Niente GitHub/token: foglio `Feed` "Pubblicato sul web" come CSV; CORS verificato.
- [x] Hook in `updateStandings` (successo/attesa/SIM), debug sims, `onEdit`; voce di menu "Pubblica dati (Feed) ora".
- [x] App collegata al Feed (`DATA_URL` in `data-loader.ts`) con unescape CSV (`parseFeed`).
- [ ] Installare il trigger 1 min sul Foglio (menu) + test in partita.

## Fase 2 — Scaffold app Angular (`client/`) ✅
- [x] `ng new client` (standalone, signals, routing, CSS, zone.js, no SSR).
- [x] Tailwind v4 (`.postcssrc.json` + `@import 'tailwindcss'`), ordine stili (Tailwind → ng-zorro).
- [x] ng-zorro 21 + locale `it_IT` + provider in `app.config.ts` (config manuale; `ng add` rotto).
- [x] Build di produzione verde.
- [ ] `genera_dati_web.py` → emette TS tipizzato dentro `client/src/app/core/`.

## Fase 3 — Logica scommesse (core service) ✅
- [x] Service `BetEngine`: porta la logica verificata (posizioni, qualificazioni, esiti, vincite).
- [x] Service `DataLoader`: fetch `data.json` + signal di stato (aggiornato/errore/sim) + `model` computed.
- [x] Tipi in `core/model.ts` (`Standings`, `MatchInfo`, `TeamState`, `BollettaState`, ...).
- [x] `genera_dati_web.py` emette `client/src/app/core/bets-data.ts` tipizzato.
- [x] `data.json` di esempio (simulato) in `client/public/`.

## Fase 4 — UI (features)
- [x] App shell: header (icona trofeo + titolo) + navigazione `nz-menu` router-aware + 3 route. Build verde.
- [x] `Tabellone`: 9 card bollette, righe per girone, ✔ e colori, footer vincita.
- [x] `Gironi`: 12 card classifiche, colorazione obblighi, icone ✅/⛔/·.
- [x] `Risultati`: elenco partite fase a gironi raggruppate per girone.
- [x] Header: ultimo aggiornamento, stato, badge simulazione. Navigazione tra le viste.
- [x] Responsive (grid 1/2/3-4 colonne con Tailwind).
- [x] Tabellone: sfondo alternato gironi pari/dispari + bordo di chiusura sotto l'ultimo girone.
- [x] **Modalità what-if**: tasto "What-if" nell'header; click su una riga delle bollette per
      forzare/togliere il ✔; drag&drop delle squadre nei Gruppi per riordinare le classifiche
      (card evidenziate + info banner); tastino reset nell'header. Vedi MEMO §11.
- [x] Gruppi: colonna laterale "SINTESI BOLLETTE" (vincente/perdente, n. gironi ko, righe
      espandibili con le selezioni perdenti).
- [x] **Incontri**: editing punteggi what-if con stepper −/+ (il motore "rigioca" le classifiche);
      mini-classifica per gruppo collassabile; "SINTESI BOLLETTE" come componente riusabile.
- [x] Tab rinominati: Bollette / Gruppi / Incontri.
- [x] Titolo app: **MundialSystem2026** (header + `<title>`).
- [x] Header: countdown alla prossima partita (gg hh:mm:ss) o risultato live in corso; "Prossima
      partita X vs Y · orario"; "Aggiornato" + versione app a destra (status "In attesa…" nascosto).
- [x] Bollette: griglia `auto-fill minmax(12rem,1fr)` → righe sempre interamente visibili; footer
      "Vincita Pot.".
- [x] Incontri: in what-if risultati impostabili con −/+ per squadra, righe custom evidenziate;
      classifiche e vincite ricalcolate (drag dei Gruppi mantiene la precedenza). Vedi MEMO §11.
- [x] Terminologia UI: GIRONE → GRUPPO ovunque (card Incontri, "gruppi ko", colonna "Gr").
- [x] Incontri: mini-classifica a scomparsa per gruppo (toggle nell'header card, altezza animata) e
      colonna SINTESI BOLLETTE anche qui (estratta nel componente riusabile `SintesiBollette`).
- [ ] Rifiniture UI dopo feedback visivo (spaziature, mobile, dettagli).

## Fase 5 — Deploy
- [x] Workflow GitHub Actions: build `client/` → deploy su Pages, con `paths-ignore` su `data.json`.
- [x] Repo pubblico `ClemAnto/MundialSystem2026`; link pubblico verificato (screenshot live OK).
- [x] Pages abilitato (source: GitHub Actions); deploy automatico su push.
- [x] App collegata alla sorgente dati live (Feed CSV) in `data-loader.ts`.
- [x] Push per aggiornare il sito live (2026-06-10, commit `647d910`: il sito usa il Feed, verificato).
- [x] Cache post-deploy: bundle con hash + Pages `max-age=600` → al massimo 10 min di versione vecchia,
      poi riallineo automatico; niente service worker (vedi MEMO §8).
- [ ] Test end-to-end: aggiornamento Feed → app aggiornata (prima partita 11/06).

## Fase 6 — Rifiniture (post-lancio)
- [ ] Mappatura nomi squadre: controllare log a inizio torneo.
- [ ] Valutare "migliori terze" (vedi MEMO §9).
- [ ] Eventuale dominio custom / PWA.
