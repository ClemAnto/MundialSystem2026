import { MatchInfo } from './model';

/** Kick-off .. +155 min: the same match window the feed (Apps Script) uses. */
export const MATCH_WINDOW_MS = 155 * 60_000;

/**
 * Whether a match is currently being played. An explicit live status wins; otherwise a
 * non-finished match inside its kick-off window counts as in progress, because the free
 * football-data.org feed never reports IN_PLAY/PAUSED nor a live score during play.
 */
export function isLiveMatch(m: MatchInfo, nowMs: number): boolean {
  if (m.status === 'IN_PLAY' || m.status === 'PAUSED') return true;
  if (m.status === 'FINISHED') return false;
  const k = new Date(m.utc ?? '').getTime();
  return !isNaN(k) && nowMs >= k && nowMs <= k + MATCH_WINDOW_MS;
}
