# 🧠 MEMO — Bolletta Mondiale 2026

> Fonte di verità **operativa** del progetto: setup, struttura, decisioni architetturali (+ il *perché*),
> fatti verificati (datati), trappole risolte, limiti noti. Aggiornare ad ogni cambiamento rilevante.
> Vedi anche `ROADMAP.md` (avanzamento) e `CLAUDE.md` (convenzioni/preferenze).

---

## 1. Obiettivo

Tracciare in tempo (quasi) reale 9 bollette Intralot (antepost Mondiali 2026, mercato
**"Accoppiata Passaggio Turno — Non in Ordine"**) e pubblicare pagine di sola consultazione,
condivisibili via link a chiunque:
- **Tabellone**: le 9 bollette, per ogni scommessa se sta vincendo/perdendo, vincita attuale per bolletta;
- **Gironi**: le 12 classifiche live con evidenziazione favorevole/sfavorevole alle scommesse;
- **Risultati**: le partite della fase a gironi.

> App pubblica: **MundialSystem2026** → https://clemanto.github.io/MundialSystem2026/
> (repo `ClemAnto/MundialSystem2026`). Il nome cartella locale resta `BollettaMondiale2026`.

---

## 2. Architettura (2 parti)

### Parte A — il "motore dati" (Google Sheet + Apps Script), SENZA token
Sfrutta le chiamate gratuite a **football-data.org** per raccogliere classifiche + risultati, costruisce
il JSON e lo scrive **in una cella** (`A1`) di un foglio tecnico `Feed`. Quel foglio è **"Pubblicato sul
web" come CSV**: Google lo serve a chiunque, con letture illimitate. È l'unico componente che consuma API.

```
football-data.org ──(Apps Script, trigger 1 min, chiamate reali solo nelle finestre-partita)──►
   foglio "Feed" cella A1 = JSON  ──"Pubblica sul web (CSV)"──►
      docs.google.com/.../pub?...output=csv   (CORS *, servito da Google, letture illimitate)
```

### Parte B — la webapp (Angular, su GitHub Pages)
Sito **statico** che scarica il CSV del Feed (una cella = il JSON), fa l'**unescape** del CSV e calcola
**client-side** tutta la logica scommesse. I dati statici (bollette/quote/gironi) sono compilati nell'app.

```
   App Angular 21 (GitHub Pages)  ──fetch CSV Feed + unescape──►  LiveData
        │  + dati statici bollette (TS generato dal Python)
        ▼
   Tabellone + Gironi + Risultati   (+ modalità What-if, vedi §11)
```

**Perché "senza token" via Foglio pubblicato**: l'Apps Script possiede già il foglio (ci scrive senza
credenziali esterne) e Google serve il CSV pubblicato con `Access-Control-Allow-Origin: *` e letture
illimitate → niente PAT GitHub, niente commit di dati. Il deploy dell'**app** su Pages è una cosa
separata (GitHub Actions, vedi §8): l'app cambia di rado, i dati ~ogni minuto durante le partite, e restano disaccoppiati.

---

## 3. Stack e versioni (verificato il 2026-06-10 — RIVERIFICARE nel tempo)

| Ambito | Tecnologia | Versione | Note |
|--------|-----------|----------|------|
| Framework | Angular standalone (signals) | **21** (LTS → mag 2027) | CLI locale 21.1.2 |
| UI kit | ng-zorro-antd | **21.3.0** | segue la major di `@angular/core`; **NON** c'è ancora per Angular 22 |
| CSS utility | Tailwind CSS v4 | **4.3** | via `@tailwindcss/postcss`, config in CSS |
| Hosting app | GitHub Pages | — | deploy via GitHub Actions |
| Fonte dati | football-data.org | API v4 | piano free, competizione `WC` |
| Sorgente live (no token) | Google Sheet "Pubblica sul web" (CSV) | — | servito da Google, `access-control-allow-origin: *` (verificato 2026-06-10) |
| Runtime locale | Node / npm | v24.15.0 / 11.10.1 | |

> ⚠️ **Angular 22** è uscito il 2026-06-03, ma ng-zorro non lo supporta ancora → restare su **Angular 21**.
> Stessa logica del blueprint per `@angular/fire`: le UI lib non inseguono subito l'ultima major.

### football-data.org (free tier)
- Token attuale in `src/Codice.gs`: `8d6827c04a6c42e0b5cad2e9d0a60397` (registrazione gratuita, **non scade**,
  limite **10 richieste/minuto**, nessun tetto giornaliero). Rigenerabile dal proprio account.
- Endpoint: `/v4/competitions/WC/standings` e `/v4/competitions/WC/matches`.
- **Perché non SofaScore**: blocca le richieste server-side di Apps Script (HTTP 403). `IMPORTHTML` non
  funziona su siti JS (SofaScore/FlashScore/FIFA). I proxy pubblici provati erano giù/bloccati.
- Stagione: WC2026 dall'**11 giugno** al 19 luglio 2026; 72 partite di fase a gironi.

---

## 4. Struttura del repository

| Percorso | Ruolo |
|----------|-------|
| `client/` | **App Angular 21** (webapp di consultazione). Comandi npm si lanciano qui. |
| `src/genera_scommesse.py` | Generatore del file Excel (foglio Google legacy). |
| `src/genera_dati_web.py` | Esporta i dati statici bollette/gironi verso l'app Angular (single source of truth). |
| `src/Codice.gs` | Apps Script: scarica i dati e pubblica il JSON nel foglio `Feed` (poi pubblicato come CSV). |
| `dist/Mondiali2026_Scommesse.xlsx` | Output del generatore Excel. |
| `client/public/data.json` | Esempio statico di dati (per dev/UI). In produzione l'app legge il CSV del Feed. |
| `client/src/app/core/` | Motore (`bet-engine`), caricatore dati (`data-loader`), tipi (`model`), sigle (`team-abbr`), colori condivisi (`colors`), what-if (`what-if`), dati statici generati (`bets-data`). |
| `client/src/app/styles/` | **Tutti i CSS/SCSS**: `styles.css` (entry Tailwind + mapping token→utility), `themes/` (token dei temi), `components/` (stili per-componente, referenziati da `styleUrl`). Vedi §12. |
| `client/src/app/features/sintesi-bollette/` | Componente riusabile "SINTESI BOLLETTE" (usato in Gruppi e Incontri). |
| `.github/workflows/` | Workflow di build & deploy su GitHub Pages. |
| `ref/` | Immagini di riferimento delle bollette giocate (scontrini). |
| `legacy/` | Vecchia web-app statica accantonata + vecchio generatore web. Ignorabile. |
| `MEMO.md` / `ROADMAP.md` / `CLAUDE.md` | Documentazione (questo sistema). |

**Rigenerare l'xlsx** (output in `dist/`): `python src/genera_scommesse.py`
**Rigenerare i dati statici per l'app**: `python src/genera_dati_web.py`

---

## 5. Modello matematico delle bollette (VERIFICATO)

Ogni bolletta è un **sistema integrale**: una selezione di coppie per ciascun girone coperto; numero di
combinazioni = prodotto del numero di selezioni per girone.
- La bolletta **vince solo se in OGNI girone coperto la coppia realmente qualificata è tra quelle giocate**.
- Per girone passa **una sola** coppia (i primi 2) → al massimo una selezione corretta per girone.
- **Vincita** (se vince) = puntata × prodotto delle quote delle selezioni corrette.
- Verificato: combinazioni e vincita massima di tutte e 9 le bollette tornano al centesimo con gli scontrini.

**"Accoppiata Passaggio Turno — Non in Ordine"** = le 2 squadre ai **primi 2 posti** del girone (ordine
irrilevante). Interpretazione adottata: **primi 2**; le migliori terze NON contano (vedi TODO §9).

### Logica calcolata client-side (replica le formule del foglio, già verificate)
Per ogni squadra: `PG=V+N+P`, `Pti=V*3+N`, `DR=GF-GS`, `MaxPti=Pti+(3-PG)*3`.
- **Posizione**: ufficiale dall'API se presente; altrimenti rango per `Pti→DR→GF` con tie-break = ordine in
  tabella → posizioni **sempre distinte 1-4** (a parità le prime 2 sono le prime due della lista).
- **Qualificata** = `Pos ≤ 2`. **Eliminata** = almeno 2 compagne di girone hanno già più punti del suo `MaxPti`.
- **Girone chiuso** = tutte e 4 hanno giocato 3 partite.
- **Selezione vincente** = entrambe le squadre della coppia sono `Pos ≤ 2`.
- **Esito girone (per bolletta)**: `2` vinto def., `-2` perso def., `1` in vincita (provv.), `-1` in perdita.
- **Esito bolletta**: vinta def. se tutti i gironi vinti def.; persa def. se ≥1 girone perso def.; altrimenti
  provvisoria (vincente se tutti i gironi attualmente soddisfatti, sennò perdente).

### Composizione gironi ufficiale (combacia con le bollette)
La 4ª squadra di ogni girone (in *corsivo*) non è mai giocata = "non deve passare".

A: Messico, Sudafrica, Corea del Sud, *Rep. Ceca* · B: Canada, Bosnia, Qatar, *Svizzera* ·
C: Brasile, Scozia, Marocco, *Haiti* · D: Stati Uniti, Turchia, Paraguay, *Australia* ·
E: Germania, Ecuador, Costa d'Avorio, *Curaçao* · F: Olanda, Giappone, Svezia, *Tunisia* ·
G: Belgio, Egitto, Iran, *Nuova Zelanda* · H: Spagna, Uruguay, Arabia Saudita, *Capo Verde* ·
I: Francia, Senegal, Norvegia, *Iraq* · J: Argentina, Austria, Algeria, *Giordania* ·
K: Portogallo, Colombia, Rd Congo, *Uzbekistan* · L: Inghilterra, Croazia, Ghana, *Panama*

> Nota: quota Belgio/Nuova Zelanda della **Bolletta 1** stimata a 2,50 (era illeggibile sullo scontrino).
> Nella Bolletta 1 le quote di Iran (7,50) e Nuova Zelanda (2,50) risultano invertite rispetto alle altre.

---

## 6. Regole di colore (palette tenue, identica al foglio)

`verde D9F2E1` · `rosa FBD9E6` · `giallo FCF1B8` · `rosso F9D6D6`

> Dal 2026-06-10 questi hex vivono SOLO in `client/src/app/styles/themes/default.scss` come token
> `--outcome-*`; `core/colors.ts` espone `var(--outcome-…)` (vedi §12). Non reintrodurre hex nei componenti.

**Gironi** (verde = favorevole alle scommesse, rosa = sfavorevole):
- ✅ DEVE passare (in tutte le coppie del girone): verde se Pos ≤ 2, rosa se Pos > 2.
- ⛔ NON deve passare (4ª, mai giocata): verde se Pos > 2, rosa se Pos ≤ 2.
- · contesa / nessun obbligo: neutro.

**Tabellone**:
- ✔ solo sulla riga che vince davvero (coppia con entrambe nei primi 2).
- Sfondo per girone: verde = definitivo con vincente; rosa = definitivo senza vincenti;
  giallo = aperto senza vincenti; neutro = aperto con una già in vincita.
- Footer: ✔/✖ + vincita attuale; sfondo verde/rosso solo se la bolletta è definitiva.

---

## 7. Apps Script (`src/Codice.gs`)

Funzioni principali (vedi commenti nel file):
- `updateStandings()` — scarica le classifiche e le scrive nel foglio. Solo se SIM=OFF e dentro una
  finestra-partita `[inizio .. +155 min]`; cache anti-raffica (max 1 chiamata reale / 30s). Poi `publishData()`.
- `publishData()` — costruisce il JSON (classifiche dal foglio + risultati da `/matches`) e lo scrive in
  `Feed!A1` (crea il foglio `Feed` se manca). Il foglio `Feed` va "Pubblicato sul web" come CSV; l'app legge
  quell'URL. **Nessun token.** Durante SIM non chiama l'API dei risultati (matches = []). Agganciato a
  `updateStandings` (successo/attesa/SIM), alle simulazioni debug e a `onEdit`, così il Feed resta sincronizzato.
- `colorGironi()` / `onEdit()` — colorazione del foglio Gironi (legacy, vedi §9 trappole).
- DEBUG: `debugSimulateFinished()`, `debugSimulateMidStage()`, `debugSimulateWinning()`, `resetToLive()`.
- `installAutoUpdate()` / `removeAutoUpdate()` — trigger **ogni minuto** (vedi §10 per cadenza/quota).

I lettori in sola lettura **non** consumano chiamate API (leggono il **Feed** = CSV pubblicato).

---

## 8. Deploy / hosting (FATTO per l'app, in corso per i dati)

- **Repo**: https://github.com/ClemAnto/MundialSystem2026 (pubblico). Utente GitHub: `ClemAnto`.
- **Sito live**: https://clemanto.github.io/MundialSystem2026/
- **Deploy app**: GitHub Actions ([.github/workflows/deploy.yml]) builda `client/` e pubblica su Pages.
  Usa il **token integrato** di Actions (`pages: write` + `id-token: write`) → **nessun PAT**. `base-href`
  impostato a `/<repo>/`; fallback SPA `404.html`. `paths-ignore: data.json` → i dati non ribuildano il sito.
  Pages abilitato in modalità "GitHub Actions" (`gh api -X POST .../pages -f build_type=workflow`).
- `gh` CLI è autenticato sul PC dell'utente come `ClemAnto` (scope `repo`, `workflow`): permette create/push/deploy
  senza inserire credenziali. **Non** utilizzabile da Apps Script (gira su server Google).
- **Dati live (senza token)**: l'app legge il **Feed** = foglio `Feed` pubblicato come CSV
  (`docs.google.com/spreadsheets/d/e/.../pub?gid=1925420550&single=true&output=csv`). L'URL è in
  `client/src/app/core/data-loader.ts` (`DATA_URL`); CORS verificato. Per il dev locale si può rimettere
  `DATA_URL = 'data.json'`.
- **Pubblicato il 2026-06-10** — ultimo deploy: **v0.2.0**, commit `a60bc3a`, run verde,
  `index.html` live verificato (bundle hash + favicon). Prima pubblicazione (commit `647d910`):
  il sito live usa il Feed e tutte le feature (What-if, countdown, sintesi).
- **Cache browser dopo un deploy** (verificato 2026-06-10): GitHub Pages serve TUTTO con
  `Cache-Control: max-age=600` + ETag, **non configurabile**. I bundle JS/CSS hanno l'hash nel nome →
  mai stantii; solo `index.html` può restare in cache fino a **10 minuti** dopo un deploy, poi si
  riallinea da solo (revalidation ETag). Il Feed dati non è mai cacheato (fetch `no-store` + `?t=`).
  Garanzia istantanea richiederebbe un service worker → scartato per semplicità (10 min accettabili).

---

## 9. Punti aperti / TODO

- [ ] **Migliori terze**: il modello considera "passa il turno" = primi 2. Nel format 2026 avanzano anche le
      **8 migliori terze**. Se il mercato Intralot conta una terza come "passaggio turno", va esteso
      (confronto delle 12 terze → top 8). Da decidere dopo aver letto il regolamento Intralot ufficiale
      (sito blocca i bot; aprirlo loggati: https://www.intralot.it/InfoGioco/Regolamenti-Scommesse-Quotate/Calcio.aspx).
- [ ] A inizio torneo: controllare eventuali "Nomi non mappati" nei log Apps Script (aggiungere alias a
      `TEAM_NAMES`) o errori HTTP.
- [ ] Foglio Google "Gironi": la colorazione via CF non veniva importata → si colora via Apps Script
      (`colorGironi`). Con la webapp Angular questo problema **sparisce** (i colori li calcola il client).

---

## 10. Trappole risolte / decisioni tecniche (non rifare gli stessi errori)

- **Sorgente dati: scelto Foglio Google pubblicato (CSV), SENZA token.** Scartato `raw.githubusercontent.com`
  (avrebbe richiesto un PAT GitHub in Apps Script per committare `data.json`). Il Foglio pubblicato è
  scrivibile dall'Apps Script senza credenziali esterne e servito da Google. (Per cronaca: anche
  `raw.githubusercontent.com` ha CORS `*` + cache 5 min, verificato 2026-06-10, ma non lo usiamo.)
- **ng-zorro insegue Angular**: usare Angular 21 + ng-zorro 21 (non Angular 22, non ancora supportato).
- **Niente token GitHub**: i dati NON si committano su GitHub → nessun `GITHUB_TOKEN` in Apps Script.
  Resta solo il token football-data (in `Codice.gs`): basso rischio (sola lettura, free), ma da non
  diffondere oltre il necessario.
- **Console Windows (cp1252)** non stampa emoji: nei `print` di test Python usare
  `print(... .encode('unicode_escape').decode())` per evitare `UnicodeEncodeError` (innocui).
- **Single source of truth dati bollette**: `src/genera_dati_web.py` esegue solo il blocco-dati di
  `genera_scommesse.py` (niente openpyxl) ed emette il TS per l'app → foglio Excel e webapp non divergono.
- Posizioni a parità: servono **distinte 1-4** (tie-break per ordine in tabella), altrimenti a 0-0 erano
  tutte 1ª o tutte 4ª (entrambe sbagliate).
- **ng-zorro 21.3.1 `ng add` rotto** (`exports is not defined in ES module scope`, bug packaging ESM):
  configurare a mano → CSS in `angular.json` (dopo `styles.css`), provider in `app.config.ts`. Il pacchetto
  va comunque installato (`npm i ng-zorro-antd`). Verificato 2026-06-10.
- **ng-zorro 21 non richiede `@angular/animations`** (animazioni native): nessun `provideAnimations`.
- **Budget build**: il CSS completo di ng-zorro è 627 kB raw (≈57 kB gzip). Alzato il budget `initial` di
  produzione a 1.5MB/2.5MB in `angular.json` per non far fallire la build.
- **Tailwind v4 layer vs ng-zorro (IMPORTANTE, ricorrente)**: le utility Tailwind v4 vivono in un cascade
  layer a priorità bassa; ng-zorro stila i tag nudi (`h1..h6`, `a`, ...) con regole **non-layered** che le
  battono sempre (a prescindere dalla specificità). Sintomo: `text-white`/`m-0`/`leading-none` su un `<h1>`
  vengono ignorate (titolo scuro, margine residuo → disallineato). Fix: scrivere una **classe non-layered**
  in `styles.css` (es. `.app-title`) che vince per specificità sui selettori-tag di ng-zorro. Verificato
  2026-06-10 con screenshot headless (`chrome --headless --screenshot`).
  Colpisce anche i **`<button>`**: `ml-auto` e `text-*` ignorati (successo 3 volte in questa sessione) →
  classe nel CSS di componente (`.whatif-btn` in `app.css`, `.standings-toggle` in `risultati.css`).
- **Drag&drop con tabelle HTML**: i `<tr>` trascinati col CDK perdono l'impaginazione (il drag preview
  vive fuori dalla `<table>`) → le card dei Gruppi usano righe `<div>` con CSS grid invece della tabella.
- **Verifica visiva**: per controllare il rendering reale uso screenshot headless di Chrome
  (`chrome --headless=new --force-device-scale-factor=2 --window-size=W,H --screenshot=out.png URL`) e leggo
  il PNG. Più affidabile che dedurre il layout dal CSS. (Se lancio più istanze headless in parallelo può
  servire un `--user-data-dir` dedicato per evitare lock. Se lo screenshot non viene scritto senza errori
  visibili, riprovare con un `--user-data-dir` NUOVO: capita un fallimento transitorio da profilo sporco.)
- **`ng serve` in background da PowerShell: MAI in pipe** (`| Select-Object -First N` & simili): quando
  la pipeline si chiude il processo serve viene terminato (il server "muore" silenziosamente dopo poco).
  Lanciarlo nudo in background e leggere l'output dal file del task.
- **Feed CSV (no token)**: "Pubblica sul web → CSV" mette il JSON in una cella → la risposta è il JSON con
  le virgolette **raddoppiate** e racchiuso tra `"`. L'app fa l'unescape (`parseFeed` in `data-loader.ts`:
  togli BOM, togli i `"` esterni, `""`→`"`, poi `JSON.parse`). L'URL 307-redirige a googleusercontent; la
  risposta finale ha `access-control-allow-origin: *` → fetch cross-origin OK da browser normale.
- **Template reference variables e blocchi `@if`/`@for`**: i ref (`#sintesi`) non attraversano gli
  scope dei blocchi → da un blocco fratello non si vedono. Fix: `viewChild` signal query nel componente
  (`sintesi = viewChild.required(SintesiBollette)` → `sintesi().hoveredGroup()` nel template).
- **`ng serve` ascolta solo su IPv6**: per gli screenshot headless usare `http://localhost:PORT`
  (con `127.0.0.1` → connection refused). E se si tocca `tsconfig.json` va **riavviato** (l'overlay
  d'errore HMR resta stantio anche dopo il fix).
- **Versione app nell'header**: letta da `package.json` via `import` (richiede `resolveJsonModule: true`
  in `tsconfig.json`) → sempre sincronizzata, niente costanti duplicate. **Bumpare la versione**
  a ogni rilascio percepibile (l'utente la usa per verificare che il deploy sia arrivato).
  Dopo il bump allineare il lockfile con `npm install --package-lock-only` (non editarlo a mano).
- **Immagini senza ImageMagick**: favicon (128px) e logo header (40px) generati da
  `assets/MundialSystem2026_logo.png` con **System.Drawing in PowerShell** (Bitmap + Graphics,
  interpolazione HighQualityBicubic). Niente dipendenze esterne.
- **Diagnostica IDE spesso stantia** dopo edit rapidi a coppie .ts/.html (falsi errori su viewChild,
  imports, elementi sconosciuti): la verità è `npm run build`. Idem l'overlay HMR di `ng serve`.
- **Una sola `transform` per elemento**: per comporre due animazioni transform (es. rimbalzo +
  squash del pallone-loader, `.ball-loader` in `styles.css`) servono **due elementi annidati**.
- **Cadenza aggiornamento = 1 minuto** (deciso 2026-06-10). I trigger Apps Script non scendono sotto 1 min
  (valori ammessi 1/5/10/15/30); i 30 s richiederebbero un `sleep`-hack che brucia la quota runtime durante
  le partite (~90 min/giorno su Gmail free; ~6 h su Workspace, e `@quadronica.com` è verosimilmente Workspace).
  1 min è il "floor" economico e basta per il calcio. Chiamate reali solo nelle finestre-partita; cache
  risultati 60 s; anti-raffica classifiche 30 s.

---

## 11. Modalità "What-if" (client-side, in memoria)

Tasto **What-if** nell'header: attiva una simulazione locale che **non tocca i dati reali** e si azzera
uscendo. Implementata in `client/src/app/core/what-if.ts` (signal `editMode`, `overrides`, `groupOrders`)
e applicata dal motore `BetEngine.computeAll(...)` (override ✔, ordini-gruppo da drag, punteggi-partita).
- **Bollette**: click su una riga → forza/toglie il ✔ di quella selezione (chiave `n|girone|t1|t2`);
  esiti e vincite si ricalcolano. Semantica: override `true` vince anche su squadre eliminate
  (`dead=false`); override `false` = mancato passaggio reale. La vincita usa il `bothQual` calcolato.
  Hover: anteprima del ✔ al 50% di opacità + velatura blu sulla riga.
- **Gruppi**: drag&drop delle squadre (Angular CDK `cdkDropList`/`cdkDrag`) per riordinare la classifica
  ipotetica; il motore forza `pos`, `qual = pos ≤ 2`, `elim = false`. Il gruppo modificato mostra ring
  ambra + badge **WHAT-IF** (`GironeView.custom`); info banner "trascina le squadre…" quando attivo.
- Sidebar "SINTESI BOLLETTE" (componente riusabile `features/sintesi-bollette`, usato in Gruppi e
  Incontri; la pagina host legge `hoveredGroup` via `viewChild` per evidenziare la card del gruppo):
  vincente/perdente per bolletta (con importo `vincita`
  se vincente) + footer "Totale vincite" (somma delle sole bollette in vincita); n. "gruppi ko"; click
  su una riga perdente → espande l'elenco delle selezioni perdenti per girone (altezza animata col trick
  `grid-template-rows: 0fr → 1fr`, lettera del gruppo in un cerchio blu); hover su una selezione perdente
  → evidenzia la card del gruppo correlato (ring blu; ring ambra = gruppo con classifica custom).
- Tastino **reset** (icona reload) nell'header, visibile solo con modifiche attive: azzera tutto
  **previa conferma** (nz-popconfirm "Azzerare tutte le modifiche what-if?"; icona
  `ExclamationCircleFill` registrata; overlay ng-zorro ≈ +13 kB gzip).
- **Ripristino puntuale**: ogni informazione customizzata mostra in hover un tastino **↺**
  (classe globale `.reset-btn`, rivelata da `.group:hover`): selezione forzata (cella ✔ delle
  bollette), classifica trascinata (header card gruppo, variante `.on-dark`), risultato custom
  (riga incontro). Service: `clearSel` / `clearGroupOrder` / `clearMatchScore`.
  ⚠️ Il ↺ è in **position:absolute** ancorato DENTRO l'elemento `.group` (mai fuori dai suoi
  bordi, o l'hover si perde prima di raggiungerlo) così non sposta mai il layout; ciò che copre
  (✔, badge WHAT-IF) sfuma con `group-hover:opacity-0`, mai con `display:none` (shift).
- Tasto What-if attivo: **bordo dorato animato** = wrapper `.whatif-wrap` leggermente più largo del
  bottone con `conic-gradient` rotante (`@property --whatif-angle`). ⚠️ Lo stesso effetto con
  `::before` a `z-index:-1` NON funziona: con stacking context sul bottone il pseudo copre il
  background; senza, finisce dietro lo sfondo dell'header.
- **Incontri**: stepper a box unico `[− 0 +]` per lato (`.score-stepper`, ambra se custom) per
  impostare il risultato di ogni partita (`matchScores`: chiave `home|away`). Il motore "rigioca"
  i punteggi custom sopra le classifiche reali (`applyMatchScores`): sottrae il risultato reale
  solo se già conteggiato (status `FINISHED`) e ignora la posizione ufficiale API nei gruppi
  toccati (diventa stantia → rango calcolato). Righe custom evidenziate in ambra (niente badge,
  solo ↺ in hover). Mini-classifiche con icone obbligo ✅/⛔/· come nei Gruppi.
- Precedenze: classifiche custom (drag) > punteggi custom (incontri) > dati reali; il click sulla
  selezione (✔) vince comunque sul `bothQual` derivato da tutto il resto.
- Dipendenza aggiunta: **`@angular/cdk`** (drag-drop), ora diretta in `package.json`.

---

## 12. Sistema di temi (2026-06-10)

Tutti gli stili vivono in `client/src/app/styles/`; **nessun colore hardcoded** fuori dai temi.

**Architettura (pattern standard a 2 livelli, stile shadcn/ui):**
- `themes/default.scss` — i **token** (CSS custom properties su `:root`): colori semantici
  (`--primary`, `--accent`, `--success`, `--danger*`, `--info`, `--surface*`, `--border*`,
  `--foreground*`), palette outcome del foglio (`--outcome-*`, vedi §6), tipografia
  (`--font-app`, `--font-size-base`), forma (`--radius-badge/control/card`, `--shadow-card/drag`).
- `themes/mundial.scss` — primo tema custom, colori campionati dal logo (`assets/…_logo.png`
  via System.Drawing: navy `#14264a`, oro `#f0b00a`, verde `#417d13`). Scope
  `[data-theme='mundial']`: **override solo dei token che cambiano**, il resto eredita da `:root`.
  Si attiva con `<html data-theme="mundial">` in `index.html` — **è il tema attivo dalla v0.3.0**.
- `styles.css` — entry Tailwind: `@theme { --color-*: initial }` **disattiva la palette di default**
  (un `bg-amber-50` residuo non genera nulla → si vede subito), poi `@theme inline` mappa i token
  sulle utility (`bg-primary`, `text-success`, `border-border`, `ring-info`, …). `inline` fa sì che
  l'utility risolva `var(--token)` al punto d'uso → il cambio tema a runtime funziona. Verificato
  su doc Tailwind v4 il 2026-06-10.
- `components/*.css` — stili per-componente (spostati qui, `styleUrl` aggiornati), usano solo `var(--…)`.
- I temi vanno **elencati in `angular.json`** dopo `styles.css` (gli `.scss` compilano da soli).

**ng-zorro segue il tema**: in `angular.json` si usa `ng-zorro-antd.variable.min.css` (build a CSS
variables, supportata in v21 — verificato 2026-06-10) e in `app.config.ts` un `provideAppInitializer`
legge il `--primary` computato e chiama `NzConfigService.set('theme', { primaryColor })` → ng-zorro
deriva da solo tutta la palette ant (menu, popconfirm, focus). Default `#1890ff` sovrascritto a runtime.

**Trappole:**
- I token runtime NON devono chiamarsi come i namespace `@theme` di Tailwind (`--font-sans`,
  `--radius-sm`…): dentro `@theme inline` il mapping `--font-sans: var(--font-sans)` sarebbe
  auto-referente. Per questo i token si chiamano `--font-app`, `--radius-badge/control/card`.
- Le opacity-modifier sulle utility tokenizzate funzionano (`bg-primary-foreground/15` →
  `color-mix(in oklab, …)`); per i tint in CSS puro usare `color-mix(in srgb, var(--token) N%, transparent)`.
- `[style.background]` con `var(--…)` funziona normalmente (gli inline style risolvono le custom property).
