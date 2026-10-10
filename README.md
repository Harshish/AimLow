# Aim Low

**Low aim. High scores.** A local browser arcade party game built with SvelteKit, Three.js, and Rapier.

Test your reactions: snap to animated spiders and wasps for quick burst kills, then return to the bowl. Faster reactions and faster bugs pay more. A clean 2.5-second bowl streak earns a stream power-up. When the tank empties, compare scores and pass the device.

## Run locally

Use **Node.js 22.13+** and pnpm. No database, server API, or cloud account.

```sh
pnpm install
pnpm dev
pnpm test
pnpm check
pnpm build
```

The game includes solo play, 2–8-player same-device party play, leaderboards, instructions, settings, and score cards. Current focus: gameplay iteration. No public-launch or deployment work.

### Controls

- Mouse: move to aim. The stream runs automatically.
- Touch: drag on the arena; lifting your finger keeps the last aim.
- Keyboard: WASD/arrow keys aim; Escape pauses/resumes.
- Switching tabs or losing focus pauses the round. Resume explicitly.
- **Foam Party:** 40% faster, 25% more flow, wide cyan stream.
- **Coffee Laser:** 60% faster, 50% more flow, precise blue stream. Extra flow increases both damage and bowl score.
- Spiders start with 9 health and wasps 6: about 0.2s / 0.13s of direct hits at full pressure. Health rises 6% of base per wave, capped at +80%. Base escape windows are 3s / 2.75s. Bug kills restore 8% pressure.
- Each bug rolls its own pace. Normal bugs run at 0.85–1.15×. From wave 2, fast bugs (1.3–1.6×) glow red: 25% of spawns, rising 10% per wave to a 45% cap. Pace scales movement, animation, and the escape window (a 1.6× spider escapes in ~1.9s), and multiplies the kill reward.
- Quick kills: a kill within 2.5s of a bug appearing earns a bonus of up to +100%, shrinking linearly to zero. Kills within 1.25s show a QUICK KILL banner with its own sound. Every kill notice shows the reaction time; results show your fastest kill.
- A 2.5-second clean bowl streak awards an 8-second power-up plus 15% pressure (capped at 100%). Rewards alternate Foam Party / Coffee Laser. Spills, bug hits, or a sustained gap reset progress; tiny gaps between droplets are tolerated but add no progress. Streaks cannot charge during an active power-up. There are no collectible cans.
- Waves grow from 3 to 10 bugs, with a 3.5-second breather to recharge bowl streaks and at most 4 bugs on screen. Spawn intervals drop by 0.15s per wave, from 2s to a 0.8s minimum. Pressure drain starts at 1.25 per second and rises by 0.25 each wave from wave 2 onward.
- Wave 3 introduces wasps that hold a perch, then dart smoothly to another. Hover windows shorten from 1.17s to a 0.7s minimum as waves advance, divided by the wasp's pace.
- Wave 4 mixes in spiders crawling along Z; wave 7 adds ceiling-drop spiders. Drops take 1.25s after the spawn cue and get a full 3s ground escape window on landing. Their side is reserved while falling so they do not overlap wasps.
- Spiders face their travel direction, including depth crawls. Aim at the visible bug with mouse, touch, or keyboard; the stream adjusts to its depth without snapping sideways.
- Bugs use six randomized ground/air lanes set farther from the urinal. Wider camera framing and aim bounds keep them reachable. Reduced motion disables cosmetic pop/spin, not gameplay movement; the HUD shows streak progress and the active reward.
- Faster shots and keyboard aiming reduce target-switching delay. Low pressure retains enough jet speed and damage for a recovery kill.
- Normal bowl flow earns 100 points per second; Foam Party earns up to 125 and Coffee Laser up to 150. Spills cost 35 per full-flow second. Accuracy includes successful bowl and bug hits.
- Rebalanced waves, bug pace, and kill rewards use the `arcade-8` leaderboard. Older scores remain stored separately.

## Local score storage

Arcade style: type a name, play. At the end of a round the score is recorded only if it makes the top 10; otherwise it is shown and discarded.

- **High scores:** the top 10 for the current rules version, in versioned `localStorage`. If storage is unavailable, the board lives in memory until the page closes.
- **Party standings:** an in-memory ranking for the current group of players.

Scores are casual and client-reported, not a competitive anti-cheat system. Stored entries are validated on load; malformed data is dropped.

## Runtime design

```text
+page.svelte          UI flow, party turns, results and top-10 status
  Hud / Scoreboard   Presentational components
  App                Startup, input/audio wiring, UI snapshots, teardown
    Session          Pure rules: phases, pressure, score, bowl streaks, power-ups, results
    InputController  Canvas-relative pointer/touch + keyboard aim; focus loss
    World            Bounded 60 Hz simulation, complete round reset
      Environment    Static bathroom, inner catch sensor, hero/lane lights, haze volume
      WaterJet       Weighted droplets, one terminal outcome, stretched instanced drawing
      Effects        Cosmetic pooled sparks and score popups; never affects rules
      EnemyManager   Growing waves, free spawn lanes, deadlines, independent enemies
      Physics        Rapier bodies, collider identities, collision outcomes
    AssetLoader      Shared GLTF/texture ownership, cancellation-safe loading
    Camera           Fixed, portrait-aware framing, decaying impact shake; no OrbitControls
    Renderer / Loop  GPU lifecycle, post-processing pipeline, bounded RAF scheduling
```

- Constructor injection, not a singleton, service locator, event bus, or ECS.
- `Session` owns rules; the Svelte store receives snapshots at up to 30 Hz. No particle-level UI updates.
- Physics runs at 60 Hz with at most 100 ms of catch-up. Particle matrices upload once per display frame.
- Droplets retain stable IDs. Contacts resolve once, after Rapier has drained its events. Outer porcelain cannot award points.
- Bugs clone skinned models and own animation mixers/material variants. Geometry and textures stay shared. One data-driven actor replaces duplicate Spider/Wasp classes.
- Retry releases dynamic bodies, actors, sensors, and round state without reloading assets or recreating the renderer.
- Presentation: a shadowed hero spotlight on the bowl, cyan/magenta lane washes, studio reflections, HDR bloom, vignette, and FXAA. High quality adds raymarched god rays through drifting dust (`VolumeNodeMaterial`, quarter resolution, blurred) and the hero shadow; phones default to Low.
- Feel: droplets stretch along their velocity and splash on every terminal contact; kills burst into bug-colored goo with a floating score; spawns and escapes puff; the reticle locks on over bugs and pulses on hits; the bowl ring swells as the streak charges; lane lights tint for power-ups and flash red on escapes; impacts shake the camera (off with reduced motion), splat, and buzz phones (toggle in settings). A soft hiss follows the stream.
- Settings affect presentation and keyboard speed, not scoring. Balance values live in `src/lib/Game/config.ts`.
- The unused character-movement prototype and testing-only OrbitControls were removed.

See [the gameplay plan](docs/AIMLOW_GAME_PLAN.md) for current rules and milestones. Look-and-feel knobs and a browser checklist live in [the tuning guide](docs/TUNING.md). Balance and gameplay remain open for feedback.

## Checks

`pnpm test` runs 33 focused Node tests using the existing esbuild dependency. This includes real Rapier simulation, animated spider grounding, wave growth/reset/pause, varied non-overlapping spawn lanes, outer-lane framing, quick-kill health and reaction windows, per-bug pace and quick-kill rewards, lighting/haze layering, bounded effect pools and popup disposal, camera-shake decay, timed streak rewards at 30/60/120 Hz, streak interruption and cooldown, actual World-to-bowl reward integration, low-pressure shots, top-10-only score recording, and result validation. No new testing framework.

Earlier headless Chrome checks covered desktop/mobile layouts and the round lifecycle. Reaction/streak changes are covered by Node and physics tests; browser visual checks, actual phone/touch-device testing, and gameplay tuning remain separate.

Three.js and Rapier still produce large production chunks. Profile before adding workers, pooling, or custom rendering infrastructure.

## Working on this repository

Read `AGENTS.md`; use `graphify-out/graph.json` for navigation. Application code is under `src/`. Models are plain glTF binaries (no Draco or Meshopt decoder); `spider.glb` uses WebP textures (`EXT_texture_webp`).
