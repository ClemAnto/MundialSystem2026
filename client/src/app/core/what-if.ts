import { computed, Injectable, signal } from '@angular/core';

/**
 * Key identifying one bet selection (a group + its pair). Deliberately omits the
 * slip number: a what-if choice ("this pair qualifies in this group") is a fact
 * about the group, so the same override applies to that pair in every slip.
 */
export function selKey(grp: string, t1: string, t2: string): string {
  return `${grp}|${t1}|${t2}`;
}

/** Key identifying one group-stage match (each pair plays once). */
export function matchKey(m: { home: string; away: string }): string {
  return `${m.home}|${m.away}`;
}

export interface MatchScore {
  hs: number;
  as: number;
}

function omit<T>(map: Record<string, T>, key: string): Record<string, T> {
  const { [key]: removed, ...rest } = map;
  return rest;
}

/**
 * "What-if" edit mode: manual overrides of selection outcomes so the user can
 * preview how slips would end up. Overrides live only in memory and are
 * discarded when edit mode is turned off.
 */
@Injectable({ providedIn: 'root' })
export class WhatIf {
  readonly editMode = signal(false);
  /** Manual outcome per selection key; missing key = real (computed) outcome. */
  private readonly overrides = signal<Record<string, boolean>>({});
  /** Custom group rankings: group letter -> teams in the chosen order (1st..4th). */
  private readonly groupOrders = signal<Record<string, string[]>>({});
  /** Custom match results: match key -> imagined score. */
  private readonly matchScores = signal<Record<string, MatchScore>>({});

  /** Overrides fed to the engine (empty when edit mode is off). */
  readonly activeOverrides = computed(() => (this.editMode() ? this.overrides() : {}));
  readonly activeGroupOrders = computed(() => (this.editMode() ? this.groupOrders() : {}));
  readonly activeMatchScores = computed(() => (this.editMode() ? this.matchScores() : {}));

  /** True when any what-if customization is in place. */
  readonly hasChanges = computed(
    () =>
      Object.keys(this.activeOverrides()).length > 0 ||
      Object.keys(this.activeGroupOrders()).length > 0 ||
      Object.keys(this.activeMatchScores()).length > 0,
  );

  toggleEditMode(): void {
    this.editMode.update((on) => !on);
    this.resetChanges();
  }

  /** Force the displayed check of one selection to a specific value. */
  setSel(key: string, value: boolean): void {
    this.overrides.update((m) => ({ ...m, [key]: value }));
  }

  /** Flip the displayed check of one selection. */
  toggleSel(key: string, current: boolean): void {
    this.setSel(key, !current);
  }

  /** Record the dragged ranking of one group. */
  setGroupOrder(letter: string, teams: string[]): void {
    this.groupOrders.update((m) => ({ ...m, [letter]: teams }));
  }

  /** Record the imagined score of one match (goals clamped at 0). */
  setMatchScore(key: string, hs: number, as: number): void {
    this.matchScores.update((m) => ({ ...m, [key]: { hs: Math.max(0, hs), as: Math.max(0, as) } }));
  }

  // per-item restore (the hover ↺ buttons)
  clearSel(key: string): void {
    this.overrides.update((m) => omit(m, key));
  }

  clearGroupOrder(letter: string): void {
    this.groupOrders.update((m) => omit(m, letter));
  }

  clearMatchScore(key: string): void {
    this.matchScores.update((m) => omit(m, key));
  }

  /** Drop every what-if customization, back to real data. */
  resetChanges(): void {
    this.overrides.set({});
    this.groupOrders.set({});
    this.matchScores.set({});
  }
}
