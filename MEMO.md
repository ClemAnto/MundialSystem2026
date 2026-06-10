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

---

## 2. Architettura (2 parti)

### Parte A — il "motore dati" (Google Sheet + Apps Script)
Sfrutta le chiamate gratuite a **football-data.org** per raccogliere classifiche + risultati e
**pubblicarli come `data.json`** su GitHub. È l'unico componente che consuma chiamate API.

```
football-data.org  ──(Apps Script, trigger 15 min, solo finestre-partita)──►  data.json
        │  commit su GitHub (branch main, via REST API contents)
        ▼
   raw.githubusercontent.com   (CDN, CORS *, cache 5 min)
```

### Parte B — la webapp (Angular, su GitHub Pages)
Sito **statico** che legge `data.json` dal CDN (letture illimitate, nessuna chiamata API per i lettori)
e calcola **client-side** tutta la logica scommesse. I dati statici (bollette/quote/gironi) sono
compilati nell'app.

```
   App Angular 21 (GitHub Pages, deploy via GitHub Actions)
        │  fetch data.json  +  dati statici bollette (TS generato dal Python)
        ▼
   Tabellone + Gironi + Risultati
```

**Perché disaccoppiare dati e app**: `data.json` cambia ogni ~15 min, l'app quasi mai. Servendo i dati
da `raw.githubusercontent.com` (con `paths-ignore` sul workflow) i commit del JSON **non** ricostruiscono
il sito. Decoupling = niente rebuild inutili, freschezza ~5 min (cache CDN), tutto gratis.

---

## 3. Stack e versioni (verificato il 2026-06-10 — RIVERIFICARE nel tempo)

| Ambito | Tecnologia | Versione | Note |
|--------|-----------|----------|------|
| Framework | Angular standalone (signals) | **21** (LTS → mag 2027) | CLI locale 21.1.2 |
| UI kit | ng-zorro-antd | **21.3.0** | segue la major di `@angular/core`; **NON** c'è ancora per Angular 22 |
| CSS utility | Tailwind CSS v4 | **4.3** | via `@tailwindcss/postcss`, config in CSS |
| Hosting app | GitHub Pages | — | deploy via GitHub Actions |
| Fonte dati | football-data.org | API v4 | piano free, competizione `WC` |
| CDN dati | raw.githubusercontent.com | — | `access-control-allow-origin: *`, `cache-control: max-age=300` |
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
| `src/Codice.gs` | Apps Script: scarica i dati e pubblica `data.json` su GitHub. |
| `dist/Mondiali2026_Scommesse.xlsx` | Output del generatore Excel. |
| `data.json` | Dati dinamici (classifiche + risultati) scritti dall'Apps Script. Letti dall'app via CDN. |
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
- `publishData()` — costruisce `data.json` (classifiche dal foglio + risultati dall'API) e lo **committa su
  GitHub** via REST API. Token GitHub in **Script Properties** (`GITHUB_TOKEN`), MAI nel codice.
- `colorGironi()` / `onEdit()` — colorazione del foglio Gironi (legacy, vedi §9 trappole).
- DEBUG: `debugSimulateFinished()`, `debugSimulateMidStage()`, `debugSimulateWinning()`, `resetToLive()`.
- `installAutoUpdate()` / `removeAutoUpdate()` — trigger ogni 15 min.

I lettori in sola lettura **non** consumano chiamate API (leggono `data.json` dalla CDN).

---

## 8. Deploy / setup (per l'utente)

> Da completare quando l'app è pronta (vedi `ROADMAP.md`). In sintesi:
1. Repo GitHub **pubblico** (Pages + Actions gratis e illimitati).
2. GitHub Pages: deploy via GitHub Actions (build dell'app Angular in `client/`).
3. Apps Script: incollare `src/Codice.gs`, impostare `GITHUB_TOKEN` (PAT con permesso `contents:write`)
   nelle Script Properties, eseguire `updateStandings` una volta (autorizzare), poi installare il trigger.
4. Condividere il link di GitHub Pages: pubblico, nessun login.

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

- **CORS dati**: `raw.githubusercontent.com` espone `access-control-allow-origin: *` e cache 5 min →
  usabile direttamente dal browser senza proxy. Verificato 2026-06-10.
- **ng-zorro insegue Angular**: usare Angular 21 + ng-zorro 21 (non Angular 22, non ancora supportato).
- **Token segreti**: il `GITHUB_TOKEN` per il commit di `data.json` sta nelle Script Properties di Apps
  Script, mai nel sorgente. Il token football-data è a basso rischio (solo lettura, free) ma idem da non
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
- **Verifica visiva**: per controllare il rendering reale uso screenshot headless di Chrome
  (`chrome --headless=new --force-device-scale-factor=2 --window-size=W,H --screenshot=out.png URL`) e leggo
  il PNG. Più affidabile che dedurre il layout dal CSS.
