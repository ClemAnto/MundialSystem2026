# 🗺️ ROADMAP — Bolletta Mondiale 2026

> Piano a fasi con checklist. Aggiornare ad ogni avanzamento. Vedi `MEMO.md` per i dettagli tecnici.

## Dove eravamo / Prossimo passo

- **Stato (2026-06-10)**: stack deciso e scaffold completo. App Angular 21 in `client/` con Tailwind v4 +
  ng-zorro 21 configurati a mano (lo schematic `ng add` è rotto). Build di produzione **verde**.
- **Prossimo passo**: Fase 3 (core service `BetEngine` + `DataLoader`) e Fase 1 (publishData in Apps Script).

---

## Fase 0 — Riorganizzazione e decisioni ✅
- [x] Struttura cartelle (`src/`, `dist/`, `ref/`, `legacy/`).
- [x] Percorsi relativi negli script Python (niente path assoluti).
- [x] Esportatore dati statici `src/genera_dati_web.py` (single source of truth bollette).
- [x] Scelta stack + verifica versioni online (Angular 21, ng-zorro 21.3, Tailwind 4.3).
- [x] Verifica CORS/cache di `raw.githubusercontent.com`.
- [x] Sistema documentazione (MEMO / ROADMAP / CLAUDE).

## Fase 1 — Apps Script: pubblicazione `data.json`
- [ ] `publishData()`: costruisce il JSON (classifiche dal foglio + risultati da `/matches`).
- [ ] `ghPutFile()`: commit su GitHub via REST API (token da Script Properties).
- [ ] Hook in `updateStandings`, debug sims, `resetToLive`.
- [ ] Test: generare un `data.json` di esempio (anche simulato) e validarlo.

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
- [ ] Rifiniture UI dopo feedback visivo (spaziature, mobile, dettagli).

## Fase 5 — Deploy
- [ ] Workflow GitHub Actions: build `client/` → deploy su Pages, con `paths-ignore` su `data.json`.
- [ ] Repo pubblico; verifica link pubblico funzionante.
- [ ] Apps Script: `GITHUB_TOKEN` in Script Properties; trigger 15 min installato.
- [ ] Test end-to-end: simulazione → commit `data.json` → app aggiornata.

## Fase 6 — Rifiniture (post-lancio)
- [ ] Mappatura nomi squadre: controllare log a inizio torneo.
- [ ] Valutare "migliori terze" (vedi MEMO §9).
- [ ] Eventuale dominio custom / PWA.
