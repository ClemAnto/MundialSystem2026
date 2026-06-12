# 🗺️ ROADMAP — Bolletta Mondiale 2026

> Piano a fasi con checklist. Aggiornare ad ogni avanzamento. Vedi `MEMO.md` per i dettagli tecnici.

## Dove eravamo / Prossimo passo

- **Stato (2026-06-10 notte)**: **v0.3.0 pubblicata e verificata live** (commit `41661aa`, run verde
  in 10s, `index.html` live controllato: `data-theme="mundial"` + hash bundle combacianti).
  Include tutto v0.2.0 (What-if completo, sintesi riusabile, countdown, branding, loader) + il
  **sistema di temi** con il tema **mundial** attivo.
- **Sessione 2026-06-10 (sera)**: introdotto il **sistema di temi** (token CSS in
  `client/src/app/styles/themes/`, mapping Tailwind `@theme inline`, ng-zorro su variable.css,
  tema custom "mundial" dai colori del logo). Build verde, verifica visiva OK. **v0.3.0 pubblicata
  col tema mundial attivo.** `PROJECT-BLUEPRINT.md` aggiornato e spostato in `~\claude-config\`.
  Vedi MEMO §12.
- **Sessione 2026-06-11 (sera, prima partita live)**: alla prima partita reale (Messico–Sudafrica,
  11/06 21:00) scoperto che **football-data.org free NON dà aggiornamenti live** (la partita resta
  `TIMED` senza punteggio, `lastUpdated` fermo a prima del kickoff — vedi MEMO §3). Lato app: **v0.4.0**
  — l'header mostra la **partita live** (badge verde, punteggio se presente, altrimenti «vs») al posto
  del countdown quando una partita è in finestra; rilevamento live spostato in `core/live.ts`
  (euristica temporale, condivisa) con orologio reattivo in `DataLoader`; stato header semplificato in
  «Ultimo aggiornamento alle HH:mm»; nella pagina **Incontri** la partita live è evidenziata (riga verde
  + pillola «● LIVE»). Build verde, verifica visiva OK.
- **Sessione 2026-06-11 (tardi): fonte LIVE trovata → v0.5.0.** Integrata l'**API ESPN**
  (`site.api.espn.com/.../fifa.world/scoreboard`, free, no key, CORS aperto, ~real-time) come seconda fonte
  solo per punteggio+minuto live, letta **direttamente dal frontend** (nessun tocco all'Apps Script).
  Header e Incontri ora mostrano risultato e minuto reali (es. «MES 1-0 SUD · 43'»). Overlay solo sul display,
  bollette intatte. Build verde, verifica visiva OK col live reale. Vedi MEMO §3 (ESPN). **v0.5.0 committata
  in locale; da pubblicare su richiesta.**
- **Sessione 2026-06-12: dashboard + calcoli realistici → v0.6.x pubblicate.** What-if **group-wide** (la
  scelta di una coppia si propaga a tutte le bollette; mutua esclusione e ripristino per girone su tutte);
  **box riepilogo** in cima al Tabellone (13 giocatori × 5 €): Bottino potenziale / Pro capite / Netto a testa
  / Max a testa ancora possibile, con **nz-tooltip** esplicativi. Scoperta chiave: **le 9 bollette sono
  mutuamente esclusive → se ne vince al massimo una**, quindi i totali usano il **max, non la somma** (vedi
  MEMO §5). `vmax`/`vmin` formule verificate, `vmin` corretti per b5/b8/b9 (errori OCR). Gironi persi: colore
  da giallo a **rosato** (non confondersi col dorato what-if). Tab rinominati e **rotte allineate**:
  `/dashboard`, `/groups`, `/matches`. Verifica via `npm run build` (l'utente in questa sessione **non voleva
  test col browser**). Pubblicate v0.6.0 (`ee2652a`) e v0.6.1 (`c946aa9`, deploy verde); v0.6.2 = rotte.
- **Prossimo passo**: (1) completare/verificare la mappa nomi ESPN→IT sui 48 nomi dei gironi quando il
  tabellone è definito; (2) sul Foglio installare il trigger 1 min (menu ⚽ Scommesse). Nota cache: dopo un
  deploy i browser possono mostrare la versione precedente per max 10 min (vedi MEMO §8).
- ⚠️ **Regola: niente push/deploy senza richiesta esplicita** (vedi CLAUDE.md).

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
- [x] Incontri: mini-classifica a scomparsa per gruppo (toggle nell'header card, altezza animata,
      icone obbligo) e colonna SINTESI BOLLETTE anche qui (componente riusabile `SintesiBollette`).
- [x] Rifiniture v0.2.0: favicon + logo 40px nell'header (generati dal logo in `assets/` via
      System.Drawing); stepper incontri a box unico `[− 0 +]`; ripristini puntuali ↺ in hover
      (position:absolute, nessuno shift); popconfirm sul reset globale; glow dorato animato sul
      tasto What-if attivo (1.5px); banner info con comparsa animata; 🙁 al posto di ✖ sulle
      bollette perdenti; loader = pallone che rimbalza con squash; versione app 0.2.0 + autore.
- [x] **Sistema di temi**: tutti gli stili in `app/styles/`; token semantici in `themes/default.scss`
      (colori + font/radius/shadow), mapping su utility Tailwind via `@theme inline` (palette di
      default disattivata), ng-zorro agganciato al tema (variable.css + `NzConfigService`); primo
      tema custom `mundial` dal logo, attivabile con `data-theme` su `<html>`. Vedi MEMO §12.
- [x] **Dashboard (ex Bollette)**: box riepilogo montepremi (Bottino potenziale / pro capite / netto /
      max ancora possibile a testa, nz-tooltip); what-if group-wide (scelta propagata a tutte le bollette,
      mutua esclusione, ripristino per girone, evidenza barra dorata sx); footer "Vincita Pot." + "Max";
      evidenza della bolletta col potenziale massimo (+ hover-link dal box); 9 bollette su una riga a ≥1600px.
- [x] Tab + **rotte** rinominati: Dashboard `/dashboard`, Gruppi `/groups`, Incontri `/matches`.
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
