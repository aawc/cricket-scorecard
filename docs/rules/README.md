# ICC Men's One Day International Playing Conditions - Reference & Compliance Standard

This directory houses the authoritative governing playing conditions for the **Cricket Scorecard PWA** project. All application logic, state transitions, scoring calculations, and future code additions MUST strictly comply with the rules established in the official **ICC Men's One Day International Playing Conditions**.

---

## 1. Official Document Reference

- **Official Title**: ICC Men's One Day International Playing Conditions
- **Governing Body**: International Cricket Council (ICC)
- **Source Publication**: *ICC Playing Handbook (Section 04: ICC Men's One Day International Playing Conditions, pp. 66–125)*
- **Repository Reference File**: [`docs/rules/icc_mens_odi_playing_conditions.pdf`](file:///usr/local/google/home/vakh/git/hub/aawc/cricket-scorecard-pwa/docs/rules/icc_mens_odi_playing_conditions.pdf)
- **Original Source URL**: `https://images.icc-cricket.com/image/upload/prd/xxc5orswsnf0sz3uo9xu.pdf`

---

## 2. Core ODI Rules & State Machine Compliance Matrix

The table below maps official ICC ODI Playing Conditions clauses to the implementation modules
in this codebase. The **Status** column is deliberate: this project scores social and shortened
matches, and several clauses of the full ODI standard are not implemented. A clause marked
`[NOT IMPLEMENTED]` is documented here so the gap is visible, not because the behaviour exists.

Status legend:

- `[IMPLEMENTED]` — the state machine enforces the clause.
- `[PARTIAL]` — the core of the clause is enforced; the listed sub-rules are not.
- `[NOT IMPLEMENTED]` — no code implements this clause. Scorers must handle it manually.

| ICC ODI Clause | Rule Summary & Statutory Standard | Status | Implementation & Module Reference |
| :--- | :--- | :--- | :--- |
| **Clause 1 (The Players)** | A nominated side with a managed batting order. | `[PARTIAL]` — rosters and batting order are modelled; **substitutes and concussion replacements are not**, and the squad size is not fixed at 11. | [`Team`](file:///usr/local/google/home/vakh/git/hub/aawc/cricket-scorecard-pwa/src/types.ts#L55), [`LiveInnings`](file:///usr/local/google/home/vakh/git/hub/aawc/cricket-scorecard-pwa/src/types.ts#L36) |
| **Clause 12 & 13 (Innings & Overs)** | Innings of a fixed number of overs. A bowler may bowl at most 1/5th of the innings. **No bowler may bowl two consecutive overs.** | `[IMPLEMENTED]` — the over count and per-bowler quota are configurable rather than fixed at 50 and 10. The consecutive-over rule is relaxed, with a visible notice, only when it alone would leave no bowler able to complete the innings; the quota is never relaxed. | [`getEligibleBowlers`](file:///usr/local/google/home/vakh/git/hub/aawc/cricket-scorecard-pwa/src/rules.ts#L29), [`getSelectableBowlers`](file:///usr/local/google/home/vakh/git/hub/aawc/cricket-scorecard-pwa/src/rules.ts#L60), [`CHANGE_BOWLER`](file:///usr/local/google/home/vakh/git/hub/aawc/cricket-scorecard-pwa/src/reducer.ts#L317), [`Settings`](file:///usr/local/google/home/vakh/git/hub/aawc/cricket-scorecard-pwa/src/types.ts#L61) |
| **Clause 16 (The Result)** | Result by runs when batting first, by wickets when chasing; ties recognised. | `[PARTIAL]` — **no Duckworth-Lewis-Stern, no reserve day, no forfeiture handling.** | [`checkMatchOver`](file:///usr/local/google/home/vakh/git/hub/aawc/cricket-scorecard-pwa/src/reducer.ts#L626), [`getMatchOverAlertMessage`](file:///usr/local/google/home/vakh/git/hub/aawc/cricket-scorecard-pwa/src/reducer.ts#L611) |
| **Clause 17 (The Over)** | 6 legal deliveries per over; strike changes at the end of the over; a maiden is an over conceding no bowler-attributed runs. | `[IMPLEMENTED]` | [`checkOverComplete`](file:///usr/local/google/home/vakh/git/hub/aawc/cricket-scorecard-pwa/src/reducer.ts#L546), [`rotateStrike`](file:///usr/local/google/home/vakh/git/hub/aawc/cricket-scorecard-pwa/src/reducer.ts#L476) |
| **Clause 18 & 19 (Scoring Runs & Boundaries)** | Runs credited to the striker; strike rotates on odd runs; boundary 4s and 6s recorded separately. | `[IMPLEMENTED]` | [`ADD_RUNS`](file:///usr/local/google/home/vakh/git/hub/aawc/cricket-scorecard-pwa/src/reducer.ts#L106), [`rotateStrike`](file:///usr/local/google/home/vakh/git/hub/aawc/cricket-scorecard-pwa/src/reducer.ts#L476) |
| **Clause 21 (No Ball)** | Penalty run charged to the bowler; the delivery is not a legal ball of the over; it counts as a ball faced by the striker. | `[IMPLEMENTED]` — the penalty is configurable via `settings.noBallPenalty`. | [`FINALIZE_DELIVERY` no-ball branch](file:///usr/local/google/home/vakh/git/hub/aawc/cricket-scorecard-pwa/src/reducer.ts#L238) |
| **Clause 21.19 (Free Hit After No Ball)** | The delivery following any No Ball is a Free Hit, on which the striker may only be dismissed by Run Out, Obstructing the Field, or Hit the Ball Twice. | `[NOT IMPLEMENTED]` — **nothing in the codebase tracks free-hit state.** A search for `free.?hit` across `src/` returns no matches. Scorers must apply the restriction themselves. | *(none)* |
| **Clause 22 (Wide Ball)** | Penalty run charged to the bowler; the delivery is re-bowled and counts toward neither over balls nor balls faced; additional runs accrue as extras. | `[IMPLEMENTED]` — the penalty is configurable via `settings.widePenalty`. | [`FINALIZE_DELIVERY` wide branch](file:///usr/local/google/home/vakh/git/hub/aawc/cricket-scorecard-pwa/src/reducer.ts#L220) |
| **Clause 23 (Bye and Leg Bye)** | A legal delivery counted for both bowler and striker; runs credited to extras without charging the bowler; odd runs rotate the strike. | `[IMPLEMENTED]` — leg byes can be disabled via `settings.enableLegByes`. | [`bye branch`](file:///usr/local/google/home/vakh/git/hub/aawc/cricket-scorecard-pwa/src/reducer.ts#L276), [`legbye branch`](file:///usr/local/google/home/vakh/git/hub/aawc/cricket-scorecard-pwa/src/reducer.ts#L284) |
| **Clause 28 & Appendix C (Fielding Restrictions & Powerplays)** | Mandatory powerplay phases limiting fielders outside the 30-yard circle. | `[NOT IMPLEMENTED]` — **no fielding positions or powerplay phases are modelled.** A search for `powerplay` across `src/` returns no matches. | *(none)* |
| **Clauses 31-39 (Dismissals)** | Bowled, Caught, Hit the Ball Twice, Hit Wicket, LBW, Obstructing the Field, Run Out, Stumped, Timed Out, with chronological Fall of Wickets. | `[PARTIAL]` — the v2 projection engine models the full set of dismissal kinds and withholds bowler credit correctly; the v1 scoring UI distinguishes only a generic wicket from a run out. | [`DismissalKind`](file:///usr/local/google/home/vakh/git/hub/aawc/cricket-scorecard-pwa/src/v2/types.ts#L12), [`executeRunOutWicket`](file:///usr/local/google/home/vakh/git/hub/aawc/cricket-scorecard-pwa/src/reducer.ts#L730), [`isBowlerWicket`](file:///usr/local/google/home/vakh/git/hub/aawc/cricket-scorecard-pwa/src/v2/stats.ts#L140), [`recordFallOfWicket`](file:///usr/local/google/home/vakh/git/hub/aawc/cricket-scorecard-pwa/src/reducer.ts#L522) |
| **Appendix E (Calculations & Projections)** | Run rate, batting strike rate, bowler economy, net run rate. | `[PARTIAL]` — run rate, strike rate and economy are implemented; **Net Run Rate is not.** | [`calculateRunRate`](file:///usr/local/google/home/vakh/git/hub/aawc/cricket-scorecard-pwa/src/v2/stats.ts#L41), [`calculateStrikeRate`](file:///usr/local/google/home/vakh/git/hub/aawc/cricket-scorecard-pwa/src/v2/stats.ts#L50), [`calculateEconomy`](file:///usr/local/google/home/vakh/git/hub/aawc/cricket-scorecard-pwa/src/v2/stats.ts#L58) |

---

## 3. Standing Governance Rule for Developers & AI Assistants

All future code contributions, feature additions, bug fixes, and state machine enhancements MUST:

1. **Adhere to the ICC ODI Playing Conditions**: Implementations of scoring, extras, bowling quotas, strike rotation, no-ball penalties, free hits, and match conclusions must strictly reflect the official ICC ODI rules.
2. **Preserve User Customizations**: When custom match parameters (such as shorter over formats, custom bowler quotas, single-batsman mode, or disabled leg-byes) are enabled in settings, they must layer cleanly on top of the base ICC ODI state machine without violating baseline scoring logic.
3. **Verify Compliance in Tests**: Every new rule implementation or bug fix must include automated test cases in [`test/test_cases.ts`](file:///usr/local/google/home/vakh/git/hub/aawc/cricket-scorecard-pwa/test/test_cases.ts#L1) and [`test/v2_test_cases.ts`](file:///usr/local/google/home/vakh/git/hub/aawc/cricket-scorecard-pwa/test/v2_test_cases.ts#L1) that validate behavior against the statutory ICC ODI standard.
4. **Never Claim Unimplemented Compliance**: A clause may only be marked `[IMPLEMENTED]` in the matrix above once code enforcing it exists and is covered by a test. Every line anchor in the matrix must be resolved against the file before it is written; do not infer a plausible line number. When a clause is deliberately out of scope, record it as `[NOT IMPLEMENTED]` rather than omitting it, so the gap stays visible.
