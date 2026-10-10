# Aim Low — Game Design and Implementation Plan

**Status:** Local arcade implementation and the browser top-10 board are implemented. Current focus is gameplay feedback, not public launch. Balance values remain playtest defaults. See `README.md` for local setup and checks.

## 1. Game pitch

**“Keep it in the bowl. Blast the bugs. Don’t run dry.”**

Aim Low is a short, ridiculous arcade score-chaser. The water jet represents pee: aim into the urinal for points, divert to kill pests before they drain your pressure, and collect fictional drinks that change your stream. Spills cost points. Empty pressure ends the run.

The tone is cartoon bathroom chaos, not realistic anatomy. Fast restarts, readable feedback, funny results, and same-device competition should make it easy to pass around at a party. Sharing should be built in; virality is a goal, not a promised outcome.

### Local prototype scope

- One bathroom arena and one fixed gameplay camera.
- Mouse, touch, and keyboard aiming; continuous emission during play.
- Animated spiders and wasps with timed spawns, health, deaths, and timeout penalties.
- Accurate containment/spill scoring and a pressure-based round timer.
- Two drink power-ups: beer-style and coffee-style.
- Arcade menu, HUD, pause, results, and immediate retry.
- Browser top-10 leaderboard (only ranking runs are recorded) and same-device party play. No database or launch work.
- No OrbitControls in the shipped game.

Do not add multiplayer networking, accounts, an inventory, an ECS, a new physics engine, or realistic fluid simulation. Reuse Svelte, Three.js, Rapier, and the existing test runner.

## 2. Baseline before implementation

This table records the original prototype, verified against its source and GLB animation metadata. It is historical context, not the current implementation status:

| Area                  | Current implementation                                                                                                                                   | Work required                                                                                                                                       |
| --------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| Startup and rendering | `src/lib/App.ts` initializes assets, Rapier, and the renderer; owns teardown.                                                                            | Add round start, pause, reset, and game-over coordination without rebuilding the renderer per retry.                                                |
| UI                    | `src/routes/+page.svelte` has loading, START, and a score display.                                                                                       | Build the menu, HUD, results, settings, and leaderboard screens.                                                                                    |
| Game state            | `src/lib/Utils/Store.ts` stores score and keyboard movement input.                                                                                       | Add typed round state, pressure, statistics, and the active drink.                                                                                  |
| Jet                   | `src/lib/World/Elements/WaterJet.ts` emits Rapier droplets and renders an instanced mesh. Speed is hardcoded to 15; emission is 150 droplets/second.     | Parameterize aim, speed, spread, emission, and color; add droplet identity and terminal outcomes.                                                   |
| Scoring               | Jet collisions currently add 1 for any urinal mesh and subtract 1 for ground/wall contacts.                                                              | Distinguish the inner catch area from the outer shell; prevent repeated scoring from bounces.                                                       |
| Collision routing     | `src/lib/World/Physics.ts` passes mesh references to `src/lib/Utils/CollisionHandler.ts`. Droplet colliders are not mapped to meshes.                    | Preserve collider handles and droplet/enemy identity in collision events. Name-only routing cannot reliably resolve individual droplets or enemies. |
| Bugs                  | `Spider.ts` and `Wasp.ts` instantiate one model each from `Environment.ts`. No health, spawn scheduler, or animation playback.                           | Give each spawn independent state, animation, movement, hit detection, and cleanup. Spider collision events are currently disabled.                 |
| Animation assets      | Both bug GLBs have skins. Spider includes `walk cycle` and `CircleAction`; wasp includes clips ending in `Wasp_Flying`, `Wasp_Attack`, and `Wasp_Death`. | Inspect playback and root motion in-browser. Reuse the clips; provide a procedural spider death if no suitable clip exists.                         |
| Camera                | `src/lib/Camera.ts` creates OrbitControls and updates them every frame.                                                                                  | Replace with an explicitly positioned and aimed camera.                                                                                             |
| Timing                | `World.ts` currently steps physics once per rendered frame using a bounded delta.                                                                        | Use a bounded fixed simulation step for gameplay consistency. The README's claim that physics already runs at 60 Hz is stale.                       |
| Tests                 | `tests/regression.test.ts` uses Node's test runner, including real Rapier simulation.                                                                    | Extend these tests for the new rules; replace the old coarse-scoring assertions.                                                                    |
| Leaderboard           | No leaderboard persistence or server routes currently exist.                                                                                             | Local storage first; add server endpoints and durable storage for the public board.                                                                 |

## 3. Round flow and controls

```text
Loading → Menu → Countdown → Playing → Game Over → Results
                               ↕                     ├→ Retry → Countdown
                             Paused                  ├→ Next player → Countdown
                                                     └→ Menu / Leaderboard
```

1. Players start with **100 pressure**, zero score, no active drink, and no live bugs.
2. A short countdown introduces the controls. No emission, drain, or spawn timers run yet.
3. The stream emits automatically while playing. Players only need to aim.
4. Aim inside the urinal to score. Redirect toward bugs and drink pickups when worthwhile.
5. Pressure drains continuously. Unresolved bugs cause large one-time pressure losses.
6. At zero pressure, gameplay ends immediately. Freeze the final score, stop spawns, and reject further gameplay events.
7. Play a brief cosmetic dribble and “OUT OF JUICE” sting, then show results.
8. Retry or the next party turn starts a completely fresh round without reloading assets.

### Input and camera

- **Mouse:** Move over the canvas to aim; clicking is not required to sustain the stream.
- **Touch:** Drag to aim. Keep the last aim when the finger lifts; the round still runs. Prevent page scrolling only on the gameplay canvas.
- **Keyboard:** Arrow keys/WASD move the reticle. Enter activates focused menu actions; Escape pauses/resumes. Do not intercept typing in name fields.
- Use Pointer Events on the canvas, pointer capture during touch drags, and canvas-relative coordinates rather than global window coordinates.
- Show a small target reticle. Map it to a calibrated aim plane in the fixed camera view; maintain alignment on resize and across supported aspect ratios.
- Remove OrbitControls imports, construction, update, and disposal calls. Remove empty camera lifecycle methods/call sites if no longer needed.
- Set an explicit camera `lookAt` target. Do not rely on the target previously supplied by OrbitControls.
- Keep the urinal, all spawn paths, and pickups reachable within the aim bounds. No free camera, pan, zoom, or character movement in this mode.
- Pause on focus loss/tab hiding and require an explicit resume. Freeze pressure, physics, bugs, drink duration, and gameplay timers together. No background catch-up burst.

## 4. Gameplay rules

### 4.1 Urinal scoring and spills

**Score containment, not contact with anything named `urinal`.**

Add a small catch sensor inside the bowl near the drain. The existing urinal mesh remains physical geometry. A droplet earns points only when it reaches the catch region from the bowl; hitting the outside, rim, or rear surface does not count.

Each logical droplet resolves exactly once:

| Terminal outcome                                           | Result                                                          |
| ---------------------------------------------------------- | --------------------------------------------------------------- |
| Captured inside the bowl                                   | Add containment points; remove the logical droplet.             |
| Hits the floor, external wall, or leaves the playable area | Subtract spill points; remove the logical droplet.              |
| Hits a living bug                                          | Apply damage; consume the droplet without a spill penalty.      |
| Hits a drink pickup                                        | Collect the drink; consume the droplet without a spill penalty. |
| Reaches its gameplay lifetime without another outcome      | Treat as a miss during play.                                    |
| Removed by restart, teardown, or game over                 | No scoring or damage.                                           |

Implementation rules:

- A droplet that enters the bowl but bounces out before reaching the catch sensor remains unresolved and can become a spill.
- Contact-end events, repeated contacts, and cosmetic splash particles never score.
- Track a stable droplet ID through its collider handle. Mark an outcome immediately, then queue physics removals until collision-event draining has finished.
- For multiple eligible contacts in one simulation tick, use one explicit priority: bug hit → pickup → spill → capture, then stable entity ID for ties. Keep trigger regions separate and test edge overlaps; do not add a custom swept-collision solver.
- Accumulate weighted score changes during a simulation step, then publish once. Clamp the total to zero; display whole points while retaining internal fractions.
- Start with **100 points per full-flow second captured** and **100 points lost per full-flow second spilled**. This creates readable scores without tying scoring to the number of visual sprites.
- At the baseline 150 logical droplets/second, each droplet carries `1 / 150` flow units. Low pressure reduces emitted flow; changing rendering quality must not change logical flow, points, or damage.
- Define accuracy as `capturedFlow / (capturedFlow + spilledFlow)`. Exclude bug/pickup hits and cleanup removals; show an em dash when the denominator is zero.

**Acceptance:** A bouncing droplet cannot farm points. Water on the outer shell is not rewarded. Water spilling out loses points once. A higher display refresh rate or visual quality setting does not increase rewards.

### 4.2 Pressure and game over

Pressure is both the run's resource and its time limit.

| Setting                    | Initial value             |
| -------------------------- | ------------------------- |
| Starting/max pressure      | 100                       |
| Passive drain              | 1.25 units/second         |
| Undisturbed round duration | 80 seconds                |
| Low-pressure threshold     | 20                        |
| Spider timeout penalty     | 12 units                  |
| Wasp timeout penalty       | 18 units                  |
| Refill mechanic            | None in the first version |

- Drain only while playing, using simulation time rather than render count.
- Keep normal handling above 20 pressure. Below 20, reduce launch speed and emission progressively so the ending is visible and playable, not a sudden failure.
- Initial low-pressure curve: `p = clamp(pressure / 20, 0, 1)`, speed multiplier `0.35 + 0.65 * p`, emission multiplier `0.2 + 0.8 * p`.
- At zero, override both multipliers to zero for gameplay. A cosmetic dribble may last roughly 0.75 seconds, but it cannot score, damage, collect pickups, or rescue the run.
- Apply bug penalties immediately; clamp pressure to `[0, 100]`. If a penalty empties the gauge, end the run once.
- The HUD shows a gauge, numeric percentage, and low-pressure text/icon. Use sound and color as supporting cues, not the only cues.
- Drinks modify the jet, not stored pressure. They cannot extend a run indefinitely or revive a finished run.

### 4.3 Spiders and wasps

| Property        | Spider                                                           | Wasp                                                                      |
| --------------- | ---------------------------------------------------------------- | ------------------------------------------------------------------------- |
| Movement        | Crawls along visible rim/wall paths toward a marked danger point | Flies through a small readable hover/strafe path, then winds up an attack |
| Animation       | `walk cycle`; inspect `CircleAction` before using it             | Flying, attack, and death clips already present                           |
| Starting health | 60 HP                                                            | 40 HP                                                                     |
| Time to resolve | 8 seconds                                                        | 6 seconds                                                                 |
| Kill reward     | 150 points                                                       | 200 points                                                                |
| Miss penalty    | −12 pressure                                                     | −18 pressure                                                              |

**Spawn schedule**

- First enemy at 5 seconds; alternate spiders and wasps initially.
- Begin with a 6-second interval. Every 20 seconds, shorten it by 1 second, down to a 3-second minimum.
- Maximum 3 active threats. If full, skip that spawn; do not accumulate a delayed burst.
- Use a small, repeatable sequence of spawn positions and paths for the initial arcade ruleset. Keep paths inside the playable view and avoid unfair overlap.
- Show a short arrival cue and a visible deadline indicator. The timer begins when the enemy becomes targetable.

**Lifecycle and damage**

```text
Spawning → Active → Dying → Removed
                 └→ Timed out → Attack/escape feedback → Removed
```

- Only `Active` enemies take damage or trigger timeout penalties.
- Damage is based on received logical flow: start at **45 HP per full-flow second**. Spider needs about 1.3 seconds of perfect contact; wasp needs about 0.9 seconds.
- Each droplet can damage only one enemy once. Death awards points once and cancels the timeout penalty.
- At each tick, apply valid hits before checking deadlines. An enemy killed on its final eligible tick counts as a kill, not both outcomes.
- A timeout applies its pressure penalty once, then retires the threat. Its attack animation cannot apply a second penalty.
- Show a compact health bar/hit flash and a satisfying death/pop animation. Death visuals are not live colliders and still count toward an explicit visual-effects budget.
- Clone skinned models with Three.js `SkeletonUtils.clone`; do not reuse `gltfAsset.scene` as each new spawn. Give each instance its own `AnimationMixer` and state.
- Move the kinematic Rapier body before stepping physics; let the mesh follow it. Keep skeleton animation local so collider and visual root stay aligned.
- Share immutable geometry/textures. Clone only materials that need per-instance changes; release those materials, mixers, mappings, and bodies on removal without disposing shared assets.
- Handle all enemies through one manager and identity lookup. Do not register one name-based collision handler per instance: the current handler map would overwrite earlier registrations.

### 4.4 Drink power-ups

Use fictional parody labels, not real drink brands. Start with two clear trade-offs:

| Drink                           | Jet change                                                                                | Color/readability                             | Duration  |
| ------------------------------- | ----------------------------------------------------------------------------------------- | --------------------------------------------- | --------- |
| **Foam Party** — beer-style     | 1.4× launch speed; 3× spread. Easier crowd coverage, harder clean containment.            | Bright golden yellow, bubbly pickup icon      | 8 seconds |
| **Coffee Laser** — coffee-style | 1.1× launch speed; 0.25× spread; narrower visual stream. Better precision, less coverage. | Amber/gold with a distinct narrow-stream icon | 8 seconds |

- Normal gameplay uses a pale-yellow pee stream rather than the current blue water appearance.
- “Force” means launch speed/trajectory and stream feel here; it does not increase droplet mass or require a new fluid solver.
- Spawn the first pickup at 12 seconds, then every 15 seconds. Alternate the two drinks; allow only one uncollected pickup at once.
- Place pickups near the rim/side, reachable but outside the default center stream. A valid jet hit collects one; an uncollected pickup expires after 8 seconds without a penalty.
- Only one drink effect is active. The same drink refreshes its duration; a different one replaces it. No stacking or inventory.
- Compute effective jet parameters from baseline × pressure × active drink every update. Never repeatedly multiply mutable values, which causes drift after refreshes.
- Both drinks retain the same nominal logical flow rate. Wider spray distributes that flow; it does not create free damage or score.
- On expiry, restore the baseline automatically. Pause freezes expiry; restart/game over clears the effect.
- Show the active drink icon, effect name, and remaining duration. Pickup audio and a short banner make the change obvious.

## 5. Arcade presentation and party appeal

### Menu

Use a neon bathroom-arcade look: tiled walls, graffiti, high-contrast score digits, and large cabinet-style buttons. Reuse the existing environment as a non-interactive backdrop.

Main actions:

1. **Play** — one run, minimal friction.
2. **Party Play** — enter 2–8 short names and take turns on the same device.
3. **Leaderboard** — top 10 scores in this browser. A run is recorded only if it makes the top 10.
4. **How to Play** — three instructions: “Aim inside. Blast bugs. Watch pressure.”
5. **Settings** — sound/music, sensitivity, reduced motion, and quality.

### HUD and feedback

- Top left: score and personal-best target.
- Top right: pressure gauge and percentage; do not cover enemy paths.
- Secondary area: active drink timer and bug warnings.
- Small score popups, hit flashes, short arcade sounds, and a pressure-loss pulse make causes legible.
- Aggregate droplet feedback into short bursts; never create one DOM element or sound per particle.
- Keep camera shake optional and off under reduced motion. Use DOM buttons with keyboard focus, accessible labels, and large touch targets.
- Audio begins only after the player's start gesture. Muting must work throughout the game.

### Results, competition, and sharing

- Show final score, local best/rank, accuracy, bugs killed, and survival time.
- Use playful result titles such as “Porcelain Pro,” “Floor Manager,” and “Out of Juice.”
- Put **Retry** or **Next Player** first. Party mode shows a session ranking after each turn and a winner after the last player; no networking is needed.
- Add a shareable score card containing the score, a funny title, and the game URL. Use the Web Share API when supported, with image download/copy-link fallbacks.
- Keep share-card artwork in a small 2D canvas/DOM composition rather than depending on a WebGPU screenshot.
- Optional polish after the core loop works: combo streaks, announcer lines, daily challenge seeds, and richer cosmetics. These are not prerequisites for the requested mechanics.

## 6. Leaderboard plan

### Arcade board — top 10 only

The player enters a name and starts. No registration, accounts, or database. A finished run is written only if it ranks in the top 10; otherwise the results screen shows the score to beat.

- Store the top 10 scores in versioned `localStorage`.
- Entry fields: run ID, short display name, integer score, accuracy, kills, active duration, timestamp, and rules version.
- Sort by score descending, then accuracy descending, then achievement time ascending.
- Validate stored data; recover from malformed data and unavailable/full storage. Keep an in-memory board when persistence fails.
- Party session standings are separate from saved personal scores and reset when a new party begins.

## 7. Minimal implementation structure

Preserve the existing constructor-injected ownership model. Do not introduce a global service locator or generic event framework.

| File / location                                                    | Planned responsibility                                                                                                                                                                  |
| ------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `src/lib/App.ts`                                                   | App lifecycle; expose start/pause/resume/retry actions and coordinate round reset.                                                                                                      |
| `src/lib/Camera.ts`                                                | Fixed framing and responsive projection; remove OrbitControls.                                                                                                                          |
| `src/lib/UI/InputController.ts`                                    | Consolidate canvas pointer/touch and keyboard aim; remove duplicate global aim listeners from the jet.                                                                                  |
| `src/lib/Utils/Store.ts`                                           | Typed UI snapshot: phase, score, pressure, duration, statistics, active drink. Keep simulation objects out of stores.                                                                   |
| `src/lib/Game/Session.ts` — new                                    | Small round-rules module: transitions, pressure, scoring, statistics, and immutable final result. Test without WebGPU or DOM.                                                           |
| `src/lib/Game/config.ts` — new                                     | Shared balance constants, drink definitions, and rules version; no configurable rules engine.                                                                                           |
| `src/lib/World/World.ts`                                           | Own session, jet, enemy manager, and pickups; step simulation and perform complete round resets.                                                                                        |
| `src/lib/World/Physics.ts` and `src/lib/Utils/CollisionHandler.ts` | Typed collision identity, capture/pickup sensors, collision masks, and safe body/map removal. Retain simple routing.                                                                    |
| `src/lib/World/Environment.ts`                                     | Static bathroom and catch region; remove one-off enemy construction.                                                                                                                    |
| `src/lib/World/Elements/WaterJet.ts`                               | Parameterized emission, weighted droplet outcomes, bounded rendering, reset/disposal. Report outcomes to session instead of directly owning score rules.                                |
| `src/lib/World/EnemyManager.ts` — new                              | Spawn cadence, active-enemy lookup, health/deadlines, one-time rewards/penalties, cleanup. Implemented with one data-driven `Elements/Enemy.ts`; duplicate Spider/Wasp classes removed. |
| `src/lib/World/Elements/DrinkPickup.ts` — new                      | One simple timed pickup and hit feedback. The session owns the active effect.                                                                                                           |
| `src/routes/+page.svelte` and `src/lib/UI/`                        | Compose menu, HUD, and results. Split components when they have distinct behavior; no UI framework dependency.                                                                          |
| `src/lib/Game/leaderboard.ts` — new                                | Top-10 browser board: validation, sorting, record-only-if-ranked.                                                                                                                       |
| `tests/regression.test.ts`                                         | Rule, collision, timer, reset, and persistence regressions through the current runner.                                                                                                  |

### Timing, reset, and resource rules

- Use a 1/60-second simulation step with a bounded accumulator. Keep the existing 100 ms frame-delta bound; cap catch-up work. Render and upload instance matrices once per display frame.
- Tick flow: process aim and existing pressure → move enemies/emit droplets → step Rapier → resolve hits and droplet outcomes → resolve surviving enemy deadlines → drain pressure/update timers → finalize game over or publish the HUD snapshot.
- Use simulation time for all gameplay timers, never independent `setInterval` loops. Freeze gameplay outside `Playing`.
- Do not silently delete unresolved droplets to stay under a visual cap. Current settings imply up to `150 × 3 = 450` live droplets before collisions, but the cap is 300. Size logical capacity for the maximum rate/lifetime, consume terminal droplets promptly, and reduce cosmetic detail rather than change scoring.
- Reset removes all dynamic bodies, enemies, pickups, particle state, deferred collision work, timers, and previous-run effects. Restore pressure, score, aim, and default jet settings.
- Keep loaded assets and the renderer alive across retries. Full unmount still uses the existing disposal path; remove instance-owned resources without freeing shared models prematurely.
- Old network responses must remain associated with their completed run and cannot overwrite the current game's state.

## 8. Delivery milestones

Build in this order. Each milestone should produce something playable or independently testable.

### Milestone 1 — Playable round foundation

- [x] Add typed session state and phase transitions.
- [x] Remove OrbitControls and implement canvas-relative pointer/touch and keyboard aiming with a fixed camera.
- [x] Add bounded fixed-step simulation, pause/resume, and a clean round reset.
- [x] Implement pressure drain, low-pressure jet behavior, game over, and a gauge/results screen.
- [x] Correct the README timing description.

**Exit check:** Start at 100 pressure, play an approximately 80-second undisturbed round, reach one game over, and retry repeatedly without stale input or duplicate loops.

### Milestone 2 — Trustworthy scoring

- [x] Add droplet/collider identity and terminal outcome tracking.
- [x] Add the inner catch sensor; separate shell/rim contacts from containment.
- [x] Implement weighted rewards, spill penalties, accuracy, and batched score updates.
- [x] Handle bounce duplicates, expiry, out-of-bounds droplets, and teardown without accidental rewards.

**Exit check:** Aim into the catch region and score; spill outside and lose points. The same droplet cannot award/penalize twice. Comparable runs at 30/60/120 render FPS produce equivalent rules behavior within declared physics tolerances.

### Milestone 3 — Bugs create the challenge

- [x] Clone and animate each bug independently; inspect playback and physical jet hits in-browser.
- [x] Move spawning out of `Environment` into the enemy manager.
- [x] Add scheduled spawning, movement, health, jet damage, kill rewards, and deadline indicators.
- [x] Add one-time timeout pressure penalties, death/attack feedback, and safe removal.

**Exit check:** Multiple spiders and wasps can coexist. Killing one does not affect another's model or timer. Each death rewards once; each miss drains pressure once; a final-tick kill does not also time out.

### Milestone 4 — Drink variety

- [x] Add timed pickup spawns and hit-to-collect behavior.
- [x] Implement Foam Party and Coffee Laser jet profiles and colors.
- [x] Add effect duration, replacement/refresh rules, and active-drink HUD feedback.

**Exit check:** Beer is visibly stronger, wider, and yellow; coffee is thin and focused. Expiry/replacement restores correct values, low pressure still applies, and neither drink prevents game over.

### Milestone 5 — Party-ready arcade package

- [x] Build the menu, onboarding, settings, HUD, and results.
- [x] Add local top scores and 2–8-player pass-and-play turns.
- [x] Add synthesized audio, restrained effects, funny result titles, and score-card sharing.
- [ ] Verify responsive layouts, keyboard focus, touch targets, mute, and reduced motion.

**Exit check:** A new player understands the goal from the menu, completes a round, sees a saved score, and hands the game to the next player without a page reload.

### Milestone 6 — Local persistence and gameplay iteration

- [x] Arcade top-10 board in versioned `localStorage`; only ranking runs are recorded. SQLite and API routes removed.
- [x] Add validation, ranking, and rules-version separation.
- [x] Test top-10 recording, ranking, corrupt storage, and result bounds.
- [ ] Incorporate the user's next gameplay inputs before expanding scope.

**Exit check:** Top-10 scores survive a page reload. Non-ranking runs leave the board untouched. Storage failure does not interrupt play.

## 9. Gameplay validation checklist

### Automated checks

Reuse `pnpm test` and the current Node/esbuild setup. Add focused cases for:

- Pressure drain, clamping, pause, reset, and exactly-once game over.
- One terminal droplet outcome, bowl-versus-shell handling, repeated collisions, and no score changes after game over.
- Frame-rate-independent emission, pressure, spawn cadence, damage, and drink expiry.
- Enemy clone independence, active caps, single kill/timeout outcomes, same-tick hit/deadline order, and cleanup of collider mappings.
- Drink refresh/replacement, pressure composition, and restoration without multiplier drift.
- Local leaderboard validation/sorting, corrupt storage, and unavailable storage.
- Top-10-only recording and rules-version boundaries.

Run at each implementation milestone:

```sh
pnpm test
pnpm check
pnpm build
```

### Browser and playtest checks

- [ ] Outer urinal surfaces never count as the inside; escaping water is penalized.
- [ ] The reticle matches reachable jet aim across supported screen sizes.
- [ ] Bug paths, wing/leg animations, colliders, deadlines, and drink colors are readable during play.
- [ ] Desktop pointer, touch drag, and keyboard aiming work without accidental scrolling or camera orbiting.
- [ ] Pause/tab switching causes no pressure loss, spawn burst, or stuck input.
- [ ] Restart at least 20 times: dynamic-body/listener counts return to baseline and GPU memory does not grow continually.
- [ ] Target 60 FPS on the chosen reference laptop and at least 30 FPS on the chosen reference phone. Record device/browser names; measure rather than assume.
- [ ] Check actual Three.js renderer support/fallback on target browsers; show a useful unsupported-device error instead of a blank canvas.
- [ ] Loading failures, storage failures, and network failures have recoverable UI.
- [ ] Names render as text; malformed requests cannot overwrite saved scores.
- [ ] New players understand the goal within one short attempt. Tune toward roughly 45–80-second early runs, with missed bugs making the pressure trade-off obvious.

## 10. Decisions and risks to resolve during implementation

1. **Camera/catch geometry:** Calibrate in-browser before polishing scoring. The urinal asset alone does not define a reliable gameplay catch region.
2. **Animation quality:** Clips exist, but playback, root motion, and reuse across cloned skeletons still need visual verification. Spider death can be procedural.
3. **Balance:** All numeric values are proposals. Tune spill severity, bug health/deadlines, pressure drain, and beer spread together; wide spray must feel risky, not unusable.
4. **Target devices:** Desktop and mobile browsers are planned, but define the actual test matrix before performance sign-off.
5. **Gameplay feedback:** Wait for the user's next inputs before adding mechanics or expanding infrastructure.
6. **Storage scope:** Browser top 10 only. No database, public-launch, or cloud work.

## 11. Original-request coverage

| Request                                                                     | Planned delivery              |
| --------------------------------------------------------------------------- | ----------------------------- |
| 1. Animate/spawn spiders and wasps; jet damage, death, score                | Section 4.3; Milestone 3      |
| 2. Score inside the urinal; penalize particles falling out                  | Section 4.1; Milestone 2      |
| 3. Full starting gauge, gradual pressure loss, weak/empty stream, game over | Section 4.2; Milestone 1      |
| 4. Beer/coffee-style power-ups change force, spread, and color              | Section 4.4; Milestone 4      |
| 5. Unresolved bugs significantly reduce pressure                            | Sections 4.2–4.3; Milestone 3 |
| 6. Pee-themed party game with a strong menu and shareability                | Sections 1 and 5; Milestone 5 |
| 7. Arcade game with leaderboard                                             | Sections 5–6; Milestones 5–6  |
| 8. Remove testing-only orbital controls                                     | Section 3; Milestone 1        |
