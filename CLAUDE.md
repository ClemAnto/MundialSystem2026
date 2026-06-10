# 📐 CLAUDE.md — convenzioni e preferenze (Bolletta Mondiale 2026)

> Come si lavora su questo progetto. Deriva da `PROJECT-BLUEPRINT.md` (guida generale), qui adattato.
> Leggere insieme a `MEMO.md` (tecnico) e `ROADMAP.md` (avanzamento).

## Quando leggere quale `.md`

| Serve… | File |
|--------|------|
| Setup, struttura, decisioni tecniche + perché, fatti verificati, trappole | `MEMO.md` |
| A che punto siamo, prossimo passo, checklist per fase | `ROADMAP.md` |
| Convenzioni di lavoro, preferenze utente, come decidere | `CLAUDE.md` (questo) |
| Guida generale riusabile su altri progetti | `PROJECT-BLUEPRINT.md` |

## Preferenze dell'utente (guidano ogni decisione)

- **Gratis e senza carta di credito.** Preferire sempre alternative free; segnalare se un servizio inizia a
  richiedere pagamento/carta.
- **Semplicità, niente over-engineering.** Codice che si legge come quello già presente.
- **Pianificare prima di codare.** Sviscerare alternative/costi/rischi *prima*; chiedere all'utente le
  decisioni di architettura. Niente fretta di scrivere codice.
- **Verificare i fatti online**, non a memoria — soprattutto versioni, limiti dei piani free, comportamento
  di servizi esterni. Datare i fatti verificati.
- **Utente principiante sul backend** → spiegare in modo elementare, con analogie, dicendo sempre il *perché*.
- **Segnalare refusi/errori grammaticali** (IT ed EN) in codice, stringhe, commenti, doc — anche fuori dal
  task. Non correggerli d'ufficio senza chiedere, salvo che sia parte del task.

## Regola lingua (ferrea)

| Dove | Lingua |
|------|--------|
| Codice, commenti, log, identificatori | **Inglese** sempre |
| Testi UI visibili all'utente | **Italiano** |
| Documentazione (`.md`) | **Italiano** |

## Convenzioni di codice (Angular)

- **Standalone** + signals (`signal`/`computed`/`.set`/`.update`); **mai** NgModule.
- **DI con `inject()`** nei campi della classe.
- Visibilità: usato solo dal template → `protected readonly`; dipendenze interne → `private readonly`;
  API pubbliche del service → `readonly`.
- Template control flow nativo: `@if` / `@for` / `@else`.
- Nomi **camelCase puliti**, niente `@`/`_`/`$`; observable senza suffisso `$` (nomi espliciti).
- Componenti con nome classe semplice (`Tabellone`, non `TabelloneComponent`); selettore `app-<nome>`.
- Layout con utility **Tailwind**; componenti con **ng-zorro**. Tailwind importato PRIMA di ng-zorro.
- Icone ng-zorro: registrarle una per una in `app.config.ts`.
- Locale `it_IT`.
- **Elementi interattivi: sempre `cursor-pointer`** (eccezione: `cursor-grab` per il drag&drop).
  Ricorda che il preflight di Tailwind v4 NON mette `pointer` sui `<button>`.
- **Override su tag stilizzati da ng-zorro** (`h1..h6`, `a`, `th`, ...): le utility Tailwind v4 vivono in un
  layer a bassa priorità e perdono contro le regole per-tag (non-layered) di ng-zorro. Per vincere, usare
  una **classe non-layered** in `styles.css` (es. `.app-title`) o, in subordine, l'important modifier. Vedi MEMO §10.
- **Palette/colori condivisi** in `core/colors.ts` (es. `obbligoRowBg`): non duplicare gli hex nei componenti.
- **Animazioni espandi/collassa** riusabili: classi `.expand-wrap`/`.expand-open`/`.expand-panel` in
  `styles.css` (trick `grid-template-rows: 0fr → 1fr` per animare verso `height:auto`).

## Regola deploy (ferrea)

- **MAI pushare/deployare senza richiesta esplicita dell'utente.** Il push su `main` avvia da solo
  il deploy su Pages (GitHub Actions) → anche il semplice `git push` conta come deploy.
  Commit locali liberi; push solo quando l'utente lo chiede.

## Prima di consegnare una modifica

1. `npm run build` deve passare (in `client/`).
2. Se tocchi i test: `npm test`.
3. Aggiornare i `.md` pertinenti (decisioni → MEMO, avanzamento → ROADMAP).
4. Verificare di non aver introdotto refusi (e segnalare quelli incontrati).
5. Per modifiche all'aspetto: **verifica visiva** via screenshot headless di Chrome (vedi MEMO §10),
   non dedurre il risultato dal solo CSS.

## Rituale «chiudo»

Quando l'utente scrive **`chiudo`**, PRIMA di rispondere:
1. Analizza la chat ed estrai ciò che servirà al *te* futuro: decisioni prese + perché, opzioni scartate +
   motivo, preferenze/stile emersi, fatti verificati (datati), trappole + come evitarle.
2. Scrivi nei file giusti senza duplicare: `MEMO.md` (tecnico), `ROADMAP.md` (avanzamento/prossimi passi),
   `CLAUDE.md` (convenzioni/preferenze).
3. Riassumi in chat cosa hai scritto e dove.

> Obiettivo: ogni sessione lascia il progetto più "pronto" della precedente.
