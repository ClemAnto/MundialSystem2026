/**
 * World Cup 2026 Bets - LIVE standings updater.
 * Paste into: Google Sheet > Extensions > Apps Script.
 *
 * SOURCE: football-data.org (free tier, covers the World Cup).
 *   -> Register for free at https://www.football-data.org/client/register
 *      to receive an API token, then paste it below in API_TOKEN.
 *
 * Note: SofaScore blocks server-side requests from Apps Script (HTTP 403),
 *       so football-data.org is used instead (designed for API access).
 *
 * What it does:
 *  - only works during match windows [kick-off .. kick-off + 155 min] of the
 *    GROUP STAGE; outside those windows it does nothing (saves API calls)
 *  - downloads the group standings and writes W/D/L/GF/GA into "Classifiche"
 *    (columns C..G, rows 4..51)
 *  - if "Config" cell B1 = ON (simulation mode) it does NOT overwrite anything
 *  - writes last-update time in Config!B2 and a human status in Config!B3
 *  - menu + trigger every minute (real API calls happen only inside match windows)
 */

var API_TOKEN     = '8d6827c04a6c42e0b5cad2e9d0a60397';  // free football-data.org token
var COMPETITION   = 'WC';          // World Cup
var SHEET_NAME    = 'Classifiche';
var FIRST_ROW     = 4;
var LAST_ROW      = 51;            // 12 groups x 4 = 48 teams (rows 4..51)
var FIRST_STAT_COL = 3;            // column C (Wins). Then Draws,Losses,GF,GA in C..G
var POS_COL = 20;                  // column T: official position from the API (handles tie-break tables)
var MATCH_WINDOW_MINUTES = 155;    // match length + ~30 min buffer

// source name (English) -> name used in the sheet (Italian). Common aliases included.
var TEAM_NAMES = {
  'Mexico':'Messico','South Africa':'Sudafrica','South Korea':'Corea del Sud','Korea Republic':'Corea del Sud','Czechia':'Rep. Ceca','Czech Republic':'Rep. Ceca',
  'Canada':'Canada','Bosnia & Herzegovina':'Bosnia','Bosnia and Herzegovina':'Bosnia','Bosnia-Herzegovina':'Bosnia','Qatar':'Qatar','Switzerland':'Svizzera',
  'Brazil':'Brasile','Scotland':'Scozia','Morocco':'Marocco','Haiti':'Haiti',
  'USA':'Stati Uniti','United States':'Stati Uniti','Turkey':'Turchia','Türkiye':'Turchia','Paraguay':'Paraguay','Australia':'Australia',
  'Germany':'Germania','Ecuador':'Ecuador',"Côte d'Ivoire":"Costa d'Avorio",'Ivory Coast':"Costa d'Avorio",'Curaçao':'Curaçao','Curacao':'Curaçao',
  'Netherlands':'Olanda','Japan':'Giappone','Sweden':'Svezia','Tunisia':'Tunisia',
  'Belgium':'Belgio','Egypt':'Egitto','Iran':'Iran','IR Iran':'Iran','New Zealand':'Nuova Zelanda',
  'Spain':'Spagna','Uruguay':'Uruguay','Saudi Arabia':'Arabia Saudita','Cabo Verde':'Capo Verde','Cape Verde':'Capo Verde','Cape Verde Islands':'Capo Verde',
  'France':'Francia','Senegal':'Senegal','Norway':'Norvegia','Iraq':'Iraq',
  'Argentina':'Argentina','Austria':'Austria','Algeria':'Algeria','Jordan':'Giordania',
  'Portugal':'Portogallo','Colombia':'Colombia','DR Congo':'Rd Congo','Congo DR':'Rd Congo','Uzbekistan':'Uzbekistan',
  'England':'Inghilterra','Croatia':'Croazia','Ghana':'Ghana','Panama':'Panama'
};

// accent-robust matching: "Curaçao" / "Curacao" / decomposed form -> same key
function fold(s) { return (s || '').toString().normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim(); }
var FOLDED_NAMES = (function () { var f = {}; for (var k in TEAM_NAMES) f[fold(k)] = TEAM_NAMES[k]; return f; })();

// kick-off times (ms) of the GROUP STAGE matches, cached 6h (the schedule rarely changes)
function getGroupKickoffs() {
  var cache = CacheService.getScriptCache();
  var cached = cache.get('kickoffs');
  if (cached) return JSON.parse(cached);
  var url = 'https://api.football-data.org/v4/competitions/' + COMPETITION + '/matches';
  var response = UrlFetchApp.fetch(url, { muteHttpExceptions: true, headers: { 'X-Auth-Token': API_TOKEN } });
  if (response.getResponseCode() !== 200) return null;   // unknown -> caller will fail open
  var data = JSON.parse(response.getContentText());
  var times = (data.matches || [])
    .filter(function (m) { return m.stage === 'GROUP_STAGE'; })
    .map(function (m) { return new Date(m.utcDate).getTime(); })
    .filter(function (t) { return !isNaN(t); })
    .sort(function (a, b) { return a - b; });
  cache.put('kickoffs', JSON.stringify(times), 21600);   // 6 hours
  return times;
}

function setStatus(config, text, stampNow) {
  if (!config) return;
  if (stampNow) {
    config.getRange('B2').setValue(new Date());
    config.getRange('B2').setNumberFormat('dd/mm/yyyy HH:mm:ss');
  }
  config.getRange('B3').setValue(text);
}

function updateStandings() {
  var spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
  var config = spreadsheet.getSheetByName('Config');

  // 1) simulation mode -> never overwrite
  if (config && String(config.getRange('B1').getValue()).toUpperCase() === 'ON') {
    setStatus(config, 'Simulazione attiva - dati live in pausa', false);
    publishData();
    Logger.log('Simulation mode active: update skipped.');
    return;
  }

  // 2) only inside a match window [kick-off .. kick-off + 155 min]
  var kickoffs = getGroupKickoffs();
  var now = Date.now();
  var windowMs = MATCH_WINDOW_MINUTES * 60 * 1000;
  var inWindow = (kickoffs === null) ||
    kickoffs.some(function (t) { return now >= t && now <= t + windowMs; });
  if (!inWindow) {
    var upcoming = kickoffs.filter(function (t) { return t > now; });
    var msg = upcoming.length
      ? 'In attesa - prossima partita: ' +
        Utilities.formatDate(new Date(upcoming[0]), Session.getScriptTimeZone(), 'dd/MM HH:mm')
      : 'Fase a gironi terminata - nessun aggiornamento';
    setStatus(config, msg, false);
    publishData();
    Logger.log('No match window. ' + msg);
    return;
  }

  // 3) anti-burst cache: at most one real standings call every 30 seconds
  var cache = CacheService.getScriptCache();
  if (cache.get('recentlyUpdated')) {
    Logger.log('Skipped: standings refreshed less than 30s ago (cache).');
    return;
  }

  var url = 'https://api.football-data.org/v4/competitions/' + COMPETITION + '/standings';
  var response = UrlFetchApp.fetch(url, { muteHttpExceptions: true, headers: { 'X-Auth-Token': API_TOKEN } });
  if (response.getResponseCode() !== 200) {
    setStatus(config, 'Errore HTTP ' + response.getResponseCode(), false);
    Logger.log('HTTP error ' + response.getResponseCode() + ' :: ' + response.getContentText());
    return;
  }
  var data = JSON.parse(response.getContentText());

  // team name -> [Wins, Draws, Losses, GoalsFor, GoalsAgainst]  +  official position
  var stats = {};
  var positions = {};
  var unmapped = [];
  (data.standings || []).forEach(function (block) {
    if (block.type && block.type !== 'TOTAL') return;     // total standings only
    (block.table || []).forEach(function (row) {
      var team = row.team || {};
      var sourceName = team.name || team.shortName || team.tla;
      var sheetName = TEAM_NAMES[sourceName] || FOLDED_NAMES[fold(sourceName)];
      if (!sheetName) { if (sourceName) unmapped.push(sourceName); return; }
      stats[sheetName] = [row.won || 0, row.draw || 0, row.lost || 0, row.goalsFor || 0, row.goalsAgainst || 0];
      positions[sheetName] = row.position || 0;
    });
  });
  if (unmapped.length) Logger.log('Unmapped names (add them to TEAM_NAMES): ' + unmapped.join(', '));

  var sheet = spreadsheet.getSheetByName(SHEET_NAME);
  var rowCount = LAST_ROW - FIRST_ROW + 1;
  var sheetNames = sheet.getRange(FIRST_ROW, 2, rowCount, 1).getValues();              // column B (teams)
  var statValues = sheet.getRange(FIRST_ROW, FIRST_STAT_COL, rowCount, 5).getValues();  // current C..G
  var posValues = sheet.getRange(FIRST_ROW, POS_COL, rowCount, 1).getValues();          // official position (T)
  var updated = 0;
  for (var i = 0; i < rowCount; i++) {
    var teamStats = stats[sheetNames[i][0]];
    if (teamStats) {
      statValues[i] = teamStats;
      posValues[i][0] = positions[sheetNames[i][0]] || 0;
      updated++;
    }
  }
  sheet.getRange(FIRST_ROW, FIRST_STAT_COL, rowCount, 5).setValues(statValues);
  sheet.getRange(FIRST_ROW, POS_COL, rowCount, 1).setValues(posValues);
  setStatus(config, 'Aggiornato - partite in corso (' + updated + ' squadre)', true);
  cache.put('recentlyUpdated', '1', 30);   // block further real fetches for 30s
  colorGironi();
  publishData();
  Logger.log('Updated ' + updated + ' teams. Unmapped: ' + unmapped.length);
}

/**
 * DEBUG: fills the standings with fake but realistic results, as if the World
 * Cup were already being played, to preview how colours / icons / bet outcomes
 * react. Picks at random which 2 teams qualify in each group.
 * Sets SIM = ON so the live trigger won't overwrite the simulation.
 *   gamesPerTeam = 3 -> finished groups (definitive WON/LOST)
 *   gamesPerTeam = 2 -> mid-stage (provisional winning/losing)
 */
function debugSimulate(gamesPerTeam) {
  var spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
  var config = spreadsheet.getSheetByName('Config');
  var sheet = spreadsheet.getSheetByName(SHEET_NAME);
  if (config) config.getRange('B1').setValue('ON');   // freeze live updates

  // W/D/L templates that give 4 distinct point totals inside each group
  var templates = (gamesPerTeam === 2)
    ? [[2, 0, 0], [1, 1, 0], [0, 1, 1], [0, 0, 2]]      // 6 / 4 / 1 / 0 pts
    : [[3, 0, 0], [2, 0, 1], [1, 0, 2], [0, 0, 3]];     // 9 / 6 / 3 / 0 pts

  var rowCount = LAST_ROW - FIRST_ROW + 1;              // 48 teams, 12 groups of 4
  var out = [];
  for (var g = 0; g < rowCount; g += 4) {
    var order = [0, 1, 2, 3];
    for (var j = 3; j > 0; j--) {                       // shuffle: random qualifiers
      var k = Math.floor(Math.random() * (j + 1));
      var tmp = order[j]; order[j] = order[k]; order[k] = tmp;
    }
    for (var t = 0; t < 4; t++) {
      var wdl = templates[order[t]];
      var W = wdl[0], D = wdl[1], L = wdl[2];
      out.push([W, D, L, 2 * W + D + 1, 2 * L + (W ? 0 : 1)]);  // GF / GA for tie-breaks
    }
  }
  sheet.getRange(FIRST_ROW, FIRST_STAT_COL, rowCount, 5).setValues(out);
  sheet.getRange(FIRST_ROW, POS_COL, rowCount, 1).clearContent();   // no official pos in sim -> use computed rank
  if (config) {
    config.getRange('B2').setValue(new Date());
    config.getRange('B2').setNumberFormat('dd/mm/yyyy HH:mm:ss');
    config.getRange('B3').setValue('DEBUG: scenario simulato (' + gamesPerTeam + ' partite/squadra) - SIM=ON');
  }
  colorGironi();
  publishData();
  Logger.log('Debug simulation written (' + gamesPerTeam + ' games per team).');
}

function debugSimulateFinished() { debugSimulate(3); }   // gironi conclusi
function debugSimulateMidStage() { debugSimulate(2); }   // 2 giornate giocate

/**
 * DEBUG: forces a WINNING scenario for a chosen bet slip. For every group it
 * makes the slip's first pair qualify (finished groups), so you can preview the
 * green "VINCENTE (def.)" state and the estimated payout. Sets SIM = ON.
 */
function debugSimulateWinning() {
  var ui = SpreadsheetApp.getUi();
  var resp = ui.prompt('DEBUG', 'Numero bolletta da far VINCERE (1-9):', ui.ButtonSet.OK_CANCEL);
  if (resp.getSelectedButton() !== ui.Button.OK) return;
  var n = parseInt(resp.getResponseText(), 10);
  if (!(n >= 1 && n <= 9)) { ui.alert('Numero non valido (usa 1-9).'); return; }

  var spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
  var config = spreadsheet.getSheetByName('Config');
  var betSheet = spreadsheet.getSheetByName('Scommesse');
  var sheet = spreadsheet.getSheetByName(SHEET_NAME);
  if (config) config.getRange('B1').setValue('ON');

  // teams that must qualify = first pair of each group in bet slip n
  var bets = betSheet.getRange(2, 1, betSheet.getLastRow() - 1, 5).getValues();  // A..E
  var qualify = {}, seenGroup = {};
  bets.forEach(function (r) {
    if (r[0] !== n) return;
    if (seenGroup[r[2]]) return;       // only the first selection of each group
    seenGroup[r[2]] = true;
    qualify[r[3]] = true; qualify[r[4]] = true;
  });

  var tmpl = [[3, 0, 0], [2, 0, 1], [1, 0, 2], [0, 0, 3]];
  var rowCount = LAST_ROW - FIRST_ROW + 1;
  var teams = sheet.getRange(FIRST_ROW, 2, rowCount, 1).getValues();   // column B
  var out = [];
  for (var i = 0; i < rowCount; i += 4) {
    var winners = [], others = [];
    for (var t = 0; t < 4; t++) (qualify[teams[i + t][0]] ? winners : others).push(t);
    var order = winners.concat(others);                 // winners first -> top of the table
    var assigned = [];
    for (var p = 0; p < 4; p++) assigned[order[p]] = tmpl[p];
    for (var t2 = 0; t2 < 4; t2++) {
      var w = assigned[t2];
      out.push([w[0], w[1], w[2], 2 * w[0] + w[1] + 1, 2 * w[2] + (w[0] ? 0 : 1)]);
    }
  }
  sheet.getRange(FIRST_ROW, FIRST_STAT_COL, rowCount, 5).setValues(out);
  sheet.getRange(FIRST_ROW, POS_COL, rowCount, 1).clearContent();   // no official pos in sim -> use computed rank
  if (config) {
    config.getRange('B2').setValue(new Date());
    config.getRange('B2').setNumberFormat('dd/mm/yyyy HH:mm:ss');
    config.getRange('B3').setValue('DEBUG: scenario costruito per far vincere la Bolletta ' + n + ' - SIM=ON');
  }
  colorGironi();
  publishData();
  ui.alert('Scenario creato: la Bolletta ' + n + ' ora risulta VINCENTE. Apri Riepilogo/Scommesse.');
}

/**
 * Restores normal operation after a DEBUG simulation: clears the fake results,
 * turns simulation mode OFF and reloads real data (fetches live standings if a
 * match is in progress, otherwise shows the "waiting for next match" status).
 */
function resetToLive() {
  var spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
  var config = spreadsheet.getSheetByName('Config');
  var sheet = spreadsheet.getSheetByName(SHEET_NAME);
  var rowCount = LAST_ROW - FIRST_ROW + 1;
  var zeros = [];
  for (var i = 0; i < rowCount; i++) zeros.push([0, 0, 0, 0, 0]);
  sheet.getRange(FIRST_ROW, FIRST_STAT_COL, rowCount, 5).setValues(zeros);
  sheet.getRange(FIRST_ROW, POS_COL, rowCount, 1).clearContent();   // reset official positions too
  if (config) config.getRange('B1').setValue('OFF');   // exit simulation mode
  CacheService.getScriptCache().remove('recentlyUpdated');
  updateStandings();                                    // pull real data if available
  colorGironi();
}

/**
 * Colora le righe della pagina "Gironi" via codice (la formattazione condizionale
 * su quel foglio non viene importata da Google Sheets). Verde = obbligo rispettato,
 * rosa = situazione sfavorevole, bianco = neutro.
 * Layout Gironi: griglia 6x2, card alta 7 righe, larga 6 col; dati 4 righe x 5 col;
 * codice obbligo (helper) in colonna 40+cc.
 */
var G_GREEN = '#d9f2e1', G_PINK = '#fbd9e6', G_NONE = '#ffffff';
function colorGironi() {
  var gv = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Gironi');
  if (!gv) return;
  var TOP = 4, CARDH = 7, CARDW = 6, NCOLS = 5;
  for (var k = 0; k < 12; k++) {
    var cr = Math.floor(k / 6), cc = k % 6;
    var r0 = TOP + cr * CARDH, c0 = 1 + cc * CARDW, helpCol = 40 + cc;
    var codes = gv.getRange(r0 + 2, helpCol, 4, 1).getValues();   // codice obbligo per le 4 posizioni
    var bg = [];
    for (var i = 0; i < 4; i++) {
      var pos = i + 1, code = codes[i][0], color = G_NONE;
      if (code === 1) color = (pos <= 2) ? G_GREEN : G_PINK;        // deve passare
      else if (code === -1) color = (pos <= 2) ? G_PINK : G_GREEN;  // non deve passare
      var rowbg = [];
      for (var j = 0; j < NCOLS; j++) rowbg.push(color);
      bg.push(rowbg);
    }
    gv.getRange(r0 + 2, c0, 4, NCOLS).setBackgrounds(bg);
  }
}

function onEdit(e) {
  try {
    var n = e.range.getSheet().getName();
    if (n === 'Classifiche' || n === 'Config') { colorGironi(); publishData(); }   // ricolora + ripubblica
  } catch (err) {}
}

// ============================================================ DATA FEED (no GitHub token)
// publishData() builds the JSON consumed by the Angular web app (standings from the sheet +
// match results from the API) and writes it as a single string into cell A1 of a technical
// "Feed" sheet. That sheet is then "Published to the web" as CSV; the web app reads that URL.
// No token needed: Google serves the published cell, with unlimited reads.
var FEED_SHEET = 'Feed';

// Group-stage matches from the API, mapped to Italian names. Cached to spare API calls.
function getMatchesData() {
  var cache = CacheService.getScriptCache();
  var cached = cache.get('matchesData');
  if (cached) return JSON.parse(cached);
  var url = 'https://api.football-data.org/v4/competitions/' + COMPETITION + '/matches';
  var response = UrlFetchApp.fetch(url, { muteHttpExceptions: true, headers: { 'X-Auth-Token': API_TOKEN } });
  if (response.getResponseCode() !== 200) return [];
  var data = JSON.parse(response.getContentText());
  var out = (data.matches || [])
    .filter(function (m) { return m.stage === 'GROUP_STAGE'; })
    .map(function (m) {
      var home = (m.homeTeam && m.homeTeam.name) || '';
      var away = (m.awayTeam && m.awayTeam.name) || '';
      var ft = (m.score && m.score.fullTime) || {};
      var entry = {
        group: String(m.group || '').replace('GROUP_', ''),
        home: TEAM_NAMES[home] || FOLDED_NAMES[fold(home)] || home,
        away: TEAM_NAMES[away] || FOLDED_NAMES[fold(away)] || away,
        status: m.status,
        utc: m.utcDate
      };
      if (ft.home != null) entry.hs = ft.home;
      if (ft.away != null) entry.as = ft.away;
      return entry;
    });
  cache.put('matchesData', JSON.stringify(out), 60); // 1 minute (match the trigger cadence)
  return out;
}

// Assembles the payload (same shape as the example client/public/data.json).
function buildPayload() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var config = ss.getSheetByName('Config');
  var sheet = ss.getSheetByName(SHEET_NAME);
  var rowCount = LAST_ROW - FIRST_ROW + 1;
  var names = sheet.getRange(FIRST_ROW, 2, rowCount, 1).getValues();              // column B
  var stats = sheet.getRange(FIRST_ROW, FIRST_STAT_COL, rowCount, 5).getValues(); // C..G
  var posCol = sheet.getRange(FIRST_ROW, POS_COL, rowCount, 1).getValues();       // T (official position)

  var standings = {};
  for (var i = 0; i < rowCount; i++) {
    var name = names[i][0];
    if (!name) continue;
    var s = stats[i];
    standings[name] = {
      w: s[0] || 0, d: s[1] || 0, l: s[2] || 0, gf: s[3] || 0, ga: s[4] || 0, pos: posCol[i][0] || 0
    };
  }

  var sim = config && String(config.getRange('B1').getValue()).toUpperCase() === 'ON';
  var status = config ? String(config.getRange('B3').getValue()) : '';
  return {
    updated: new Date().toISOString(),
    status: status,
    source: 'football-data.org',
    sim: sim,
    standings: standings,
    matches: sim ? [] : getMatchesData()   // during SIM don't hit the matches API
  };
}

// Writes the payload JSON into Feed!A1 (creates the sheet if missing).
function publishData() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var feed = ss.getSheetByName(FEED_SHEET);
  if (!feed) feed = ss.insertSheet(FEED_SHEET);
  feed.getRange('A1').setValue(JSON.stringify(buildPayload()));
}

function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu('⚽ Scommesse')
    .addItem('Ricolora Gironi', 'colorGironi')
    .addItem('Aggiorna dati ora', 'updateStandings')
    .addItem('Pubblica dati (Feed) ora', 'publishData')
    .addItem('Installa aggiornamento automatico (1 min)', 'installAutoUpdate')
    .addItem('Rimuovi aggiornamento automatico', 'removeAutoUpdate')
    .addSeparator()
    .addItem('🔧 DEBUG: simula gironi CONCLUSI', 'debugSimulateFinished')
    .addItem('🔧 DEBUG: simula 2 giornate', 'debugSimulateMidStage')
    .addItem('🔧 DEBUG: fai VINCERE una bolletta...', 'debugSimulateWinning')
    .addItem('♻️ Ripristina dati reali (azzera DEBUG)', 'resetToLive')
    .addToUi();
}

function installAutoUpdate() {
  removeAutoUpdate();
  ScriptApp.newTrigger('updateStandings').timeBased().everyMinutes(1).create();
  SpreadsheetApp.getUi().alert('Aggiornamento automatico attivo: ogni minuto (chiamate reali solo durante le partite).');
}

function removeAutoUpdate() {
  ScriptApp.getProjectTriggers().forEach(function (trigger) {
    if (trigger.getHandlerFunction() === 'updateStandings') ScriptApp.deleteTrigger(trigger);
  });
}
