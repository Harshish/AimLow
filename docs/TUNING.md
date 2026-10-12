# Look and feel tuning

These values were set without a browser pass. Tune them while watching the game. Each entry names the file and the code to search for, because line numbers drift. All of them are presentation only: none of them change scoring or rules.

## First check: does it run cleanly?

- [ ] **Console:** no shader errors on High quality, in both the WebGPU and WebGL2 fallback.
- [ ] **Readability:** outer-lane bugs (x ≈ ±8) are easy to read against the darker wall, especially wasps under the cyan wash.
- [ ] **Bloom:** isn't blown out. The bowl, reticle and score popups stay crisp.
- [ ] **God rays:** visible as a diagonal beam. The beam doesn't draw over the urinal's front, and the dust doesn't look blocky or banded.
- [ ] **Frame rate:** steady 60 fps on High on a laptop. Phones default to Low; check that Low is smooth.
- [ ] **Floor tag:** readable in front of the bowl and not hidden by the bottom HUD.
- [ ] **Stream rush:** sounds like water, pleasant over a full run, never gross.

## Symptom → knob

| Symptom                              | Turn this                                               | Direction            |
| ------------------------------------ | ------------------------------------------------------- | -------------------- |
| Bugs too dark                        | Hemisphere fill, then lane-wash intensity               | Up                   |
| Scene feels flat or washed out       | Hemisphere fill                                         | Down                 |
| Everything glows or blurs            | Bloom threshold up, or strength down                    | —                    |
| Stream doesn't glow                  | Stream `GLOW`, or bloom threshold down                  | —                    |
| Beam invisible                       | God-ray strength, then dust density                     | Up                   |
| Beam looks like solid fog            | Dust density, or haze strength                          | Down                 |
| Dust looks blocky                    | Noise `size` (32 → 64)                                  | Up (costs load time) |
| Banding in the beam                  | Haze `steps`, or blur strength                          | Up                   |
| Shadow acne or stripes on the urinal | `hero.shadow.bias`                                      | More negative        |
| Shake feels nauseating               | Shake amounts, or camera amplitude                      | Down                 |
| Kills don't feel punchy              | Kill shake, splat gain, burst counts                    | Up                   |
| Frame drops on High                  | Haze `steps`, volume resolution scale, shadow `mapSize` | Down                 |

## Renderer and post-processing: `src/lib/Renderer.ts`

| Knob               | Search for                         | Now               | Notes                                                              |
| ------------------ | ---------------------------------- | ----------------- | ------------------------------------------------------------------ |
| Exposure           | `toneMappingExposure`              | 1.05              | Global brightness after tone mapping.                              |
| Reflections        | `environmentIntensity`             | 0.35              | Studio reflections on the porcelain and the wet floor.             |
| Bloom              | `bloom(color, …)`                  | 0.5 / 0.35 / 0.62 | Strength / radius / threshold. Lower threshold = more things glow. |
| God-ray strength   | `rays.mul(…)`                      | 1.15              | How bright the beam is when added to the scene.                    |
| God-ray blur       | `gaussianBlur(volume, uniform(…))` | 0.6               | Hides dither noise; too high smears the beam.                      |
| God-ray resolution | `setResolutionScale(…)`            | 0.25              | Fraction of screen resolution. 0.5 is sharper and costs ~4× more.  |
| Vignette           | `.mul(0.95).pow(2)`                | 0.95              | Higher = darker corners.                                           |

## Lighting and set: `src/lib/World/Environment.ts`

| Knob             | Search for                          | Now                                      | Notes                                                                                                            |
| ---------------- | ----------------------------------- | ---------------------------------------- | ---------------------------------------------------------------------------------------------------------------- |
| Fill             | `HemisphereLight(`                  | 0.45                                     | Main dial for overall darkness and bug readability.                                                              |
| Front key        | `DirectionalLight(`                 | 0.4                                      | Lights bug faces from the camera side.                                                                           |
| Hero spotlight   | `this.hero = new THREE.SpotLight(`  | 3200, range 70, cone 0.32, penumbra 0.55 | Intensity / distance / angle / penumbra. Position `(-7, 30, 10)` sets the beam angle and where the shadow falls. |
| Hero shadow      | `shadow.mapSize`, `shadow.bias`     | 1024, −0.0004                            | High quality only.                                                                                               |
| Lane washes      | `new THREE.SpotLight(hex, 2900, …)` | 2900, cone π/7                           | Cyan on the left, magenta on the right.                                                                          |
| Dust density     | `uniform(1.6)`                      | 1.6                                      | Scales the drifting noise inside the beam.                                                                       |
| Haze steps       | `material.steps`                    | 14                                       | Raymarch samples per pixel; the main cost of the god rays.                                                       |
| Haze volume      | `BoxGeometry(18, 28, 12)`           | Centered `(-2, 14, 6.5)`                 | Must contain the beam and stay outside every camera framing.                                                     |
| Noise resolution | `const size = 32`                   | 32³                                      | Built at load time.                                                                                              |
| Floor sheen      | `roughness: 0.42`                   | 0.42                                     | Lower = wetter and shinier.                                                                                      |
| Floor tag        | `color(0xc8f25a)`, `.a.mul(0.85)`   | Lime, 85%                                | Paint color and opacity. Position `(0.2, 0.01, 11.5)`, size 7.                                                   |

## Stream and particles

| Knob                        | Where                                                | Now                        | Notes                                            |
| --------------------------- | ---------------------------------------------------- | -------------------------- | ------------------------------------------------ |
| Stream glow                 | `const GLOW` in `src/lib/World/Elements/WaterJet.ts` | 2.4                        | HDR multiplier that feeds bloom.                 |
| Droplet stretch             | `speed * 0.09` and the `2.4` cap in `syncInstances`  | +2.4× max                  | Length along the direction of travel.            |
| Droplet thickness           | `this.scale.set(0.75, …)`                            | 0.75                       | Width of each stretched droplet.                 |
| Spark pool                  | `MAX_SPARKS` in `src/lib/World/Effects.ts`           | 768                        | Hard cap; new sparks are dropped when it's full. |
| Spark gravity               | `GRAVITY`                                            | 22                         | Higher = snappier, heavier splashes.             |
| Splash, kill, spawn, escape | `splash()`, `kill()`, `spawn()`, `escape()`          | See each `burst(...)` call | Count, speed, life, size and glow per event.     |
| Popup life                  | `POPUP_LIFE`                                         | 0.9 s                      | How long a `+points` popup stays up.             |

## Reactive feedback

| Knob                        | Where                                              | Now                                                                   | Notes                                                                                                                                        |
| --------------------------- | -------------------------------------------------- | --------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------- |
| Hit pulse                   | `this.hitPulse = 0.12` in `src/lib/World/World.ts` | 0.12 s                                                                | Reticle flash and growth while the stream hits a bug.                                                                                        |
| Lock-on size                | `locked ? 0.35 : 0`                                | +35%                                                                  | Reticle growth while hovering over a bug.                                                                                                    |
| Ring charge glow            | `1.2 + charge * 2.8`                               | Up to 4×                                                              | Bowl ring brightness as the streak charges.                                                                                                  |
| Escape alarm                | `this.alarm = 0.6`                                 | 0.6 s                                                                 | How long the red flash on the lane lights lasts.                                                                                             |
| Power-up tint               | `lerp(…, 0.45)`                                    | 45%                                                                   | How far the lane lights shift toward the drink color.                                                                                        |
| Shake decay / size          | `dt * 2.2`, `** 2 * 0.55` in `src/lib/Camera.ts`   | 2.2 /s, 0.55                                                          | Faster decay = shorter shakes.                                                                                                               |
| Shake per event             | `camera.shake(…)` in `src/lib/App.ts`              | Kill 0.28, escape 0.55                                                | Shakes stack and are capped at 1.                                                                                                            |
| Haptics                     | `haptic(…)` in `src/lib/App.ts`                    | Kill 14 ms, escape `[35,40,35]`, drink `[15,30,15,30,40]`             | Vibration in milliseconds. Phones only, and the player can switch it off.                                                                    |
| Stream rush                 | `VOICES` in `src/lib/Game/Audio.ts`                | Low-pass: bowl 1.2 kHz / 0.006, bug 1.3 kHz, spill 0.7 kHz, air 1 kHz | Warm fountain-like rush. Higher cutoff = brighter/hissier; keep under ~2.5 kHz to avoid the urinal tinkle. Swirl: `0.35` Hz, depth `180` Hz. |
| Bowl chord                  | `CHORD`, `CHORD_GAIN` in `Audio.ts`                | C4–G5 chord, Q 90, gain 0.06 → 0.22 with streak charge                | Ringing glass tone. Higher `Q` = purer tone, lower = more water. Full during a drink.                                                        |
| Bowl melody                 | `MELODY` in `Audio.ts`                             | Sine every 0.32 s → 0.18 s, gain 0.006 → 0.012                        | Soft line wandering the pentatonic `SCALE`; speeds up and swells with streak charge.                                                         |
| Streak chimes / combo pling | `SCALE`, `chime()`, `splat()` in `Audio.ts`        | C5 pentatonic, gain 0.03 / 0.035                                      | Rising notes per 0.5 s of clean streak and per kill in a chain.                                                                              |
| Kill splat                  | `setValueAtTime(0.16, now)` in `splat()`           | 0.16                                                                  | Splat volume.                                                                                                                                |

## Quality tiers

- **High:** everything, including god rays and the hero shadow.
- **Low:** bloom, vignette and FXAA only, with pixel ratio capped at 1.
- **Defaults:** phones (coarse pointer) start on Low. A saved choice always wins (`loadSettings` in `src/lib/Game/settings.ts`).
- **No MSAA, on purpose:** WebGPU can't sample an MSAA depth texture for the haze, so anti-aliasing is FXAA after tone mapping.

## Gameplay balance (separate pass)

Balance lives in `src/lib/Game/config.ts`. The values set in the pacing pass:

- `BUG_SPEEDS` and `waveProfile().fastChance`
- `QUICK_KILL_WINDOW`
- `MIN_SPAWN_INTERVAL` and the spawn-interval ramp
- `WAVE_BREAK`
- `BOWL_STREAK_SECONDS`
- `COMBO_STEP` and `MAX_MULTIPLIER` (kill chain: +0.25× per kill, 3× cap; an escape resets it)

Changing them changes scores, so bump `RULES_VERSION` afterwards.
