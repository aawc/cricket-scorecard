import { LiveInnings, Settings } from './types.js';

/**
 * Bowler eligibility rules from the ICC Men's ODI Playing Conditions.
 *
 * These are pure predicates over a live innings. They live outside the reducer
 * so that the state machine and the view can share one definition without the
 * view having to import the state machine.
 */

/** Balls a bowler is permitted to bowl in the innings. */
function quotaBalls(settings: Settings): number {
    return settings.maxOversPerBowler * 6;
}

function ballsBowled(live: LiveInnings, player: string): number {
    return live.bowlers[player] ? live.bowlers[player].balls : 0;
}

/**
 * Bowlers who may legally start the next over under a strict reading of
 * Clause 12/13: under the per-bowler over quota, and not the bowler of the
 * previous over.
 *
 * This is the authoritative statement of the rule. It is deliberately strict
 * and may return an empty list; see getSelectableBowlers for what to offer a
 * scorer when that happens.
 */
export function getEligibleBowlers(
    live: LiveInnings,
    bowlingTeamPlayers: string[],
    settings: Settings
): string[] {
    const max = quotaBalls(settings);
    return bowlingTeamPlayers.filter(
        p => p !== live.previousBowler && ballsBowled(live, p) < max
    );
}

/**
 * Bowlers the scorer may actually be offered, and whether offering them
 * required relaxing a rule.
 *
 * A legal bowling rotation is not always reachable by greedy selection. With
 * the default 8-over innings, a 2-over quota and the minimum 4-man attack that
 * startMatch permits, the sequence C D E C D E F leaves F as the only bowler
 * under quota and also the bowler of the previous over. Under strict Clause
 * 12/13 nobody may bowl the final over, the dropdown is empty, and because
 * scoring controls are disabled while no bowler is set the innings cannot be
 * completed at all.
 *
 * When that happens the consecutive-over rule is relaxed, and only that rule.
 * The over quota is a hard statutory cap and is never relaxed: if no player is
 * under quota the innings genuinely cannot continue and the caller must end it
 * rather than permit unlimited overs from one bowler.
 *
 * `relaxed` is true when the returned list departs from Clause 12/13, so the
 * caller can tell the scorer that the scorecard no longer conforms.
 */
export function getSelectableBowlers(
    live: LiveInnings,
    bowlingTeamPlayers: string[],
    settings: Settings
): { bowlers: string[]; relaxed: boolean } {
    const eligible = getEligibleBowlers(live, bowlingTeamPlayers, settings);
    if (eligible.length > 0) {
        return { bowlers: eligible, relaxed: false };
    }

    const max = quotaBalls(settings);
    const underQuota = bowlingTeamPlayers.filter(p => ballsBowled(live, p) < max);
    return { bowlers: underQuota, relaxed: underQuota.length > 0 };
}

/**
 * Whether the bowling resource is genuinely exhausted: a roster exists, but
 * every player in it has reached the over quota.
 *
 * An empty selectable set is ambiguous on its own. It is also what an empty
 * roster produces, which is the state of a freshly loaded app before any team
 * has been entered. Callers that treat the two alike will tell the scorer that
 * every bowler has bowled their maximum before a match exists. This predicate
 * exists so that the distinction is stated once rather than reproduced at each
 * call site, where the two copies would eventually disagree.
 */
export function isBowlingResourceExhausted(
    live: LiveInnings,
    bowlingTeamPlayers: string[],
    settings: Settings
): boolean {
    if (bowlingTeamPlayers.length === 0) return false;
    return getSelectableBowlers(live, bowlingTeamPlayers, settings).bowlers.length === 0;
}

/** A pair of consecutive overs bowled by the same player, contrary to Clause 12/13. */
export interface ConsecutiveOverBreach {
    bowler: string;
    /** 1-based number of the second over of the pair, the one that broke the rule. */
    over: number;
}

/**
 * Clause 12/13 breaches recovered from the ordered over log.
 *
 * The relaxation that keeps a trapped innings completable is deliberate, but
 * it used to leave no trace: it was announced in the bowler dropdown at the
 * moment of selection and then dropped, so a finished scorecard could not be
 * told apart from one that never departed from the playing conditions.
 *
 * Reading `overs` at render time, rather than recording breaches as they
 * occur, leaves the stored schema untouched. Matches saved by earlier versions
 * report their breaches too.
 *
 * Both names must be recorded bowlers for the innings. An over archived with
 * no bowler set, and an over midway through, each record a string that is not
 * a bowler name, and two of those in succession say nothing about who bowled.
 * Requiring membership of the innings bowling figures rejects them without
 * this function having to know which string each caller writes.
 */
export function findConsecutiveOverBreaches(
    overs: Array<{ bowler: string; balls: string[] }>,
    knownBowlers: string[]
): ConsecutiveOverBreach[] {
    const breaches: ConsecutiveOverBreach[] = [];
    for (let i = 1; i < overs.length; i++) {
        const previous = overs[i - 1] ? overs[i - 1].bowler : '';
        const current = overs[i] ? overs[i].bowler : '';
        if (!previous || previous !== current) continue;
        if (!knownBowlers.includes(current)) continue;
        breaches.push({ bowler: current, over: i + 1 });
    }
    return breaches;
}

