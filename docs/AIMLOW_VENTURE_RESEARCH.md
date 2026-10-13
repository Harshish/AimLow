# Aim Low — Venture Research and Recommendations

**Status:** Research and brainstorm, October 2026. Nothing here is implemented. Prices, fees, and benchmarks change often; re-check anything marked _unverified_ before acting on it.

**Inputs from the owner:** keep the title "Aim Low". Target broad casual players aged 25–55. Side project with under €2k to spend over the next six months. No preferred monetization model yet. Drop the pass-the-device party mode and focus on solo play.

## 1. Conclusions

1. **Keep the mechanic, change the wrapper.** Aiming a continuous water stream is proven mass-market fun: PowerWash Simulator passed 17M players, and Mob Control (aim a continuous stream of units) grossed roughly $100M in 2023. The urinal is what limits reach.
2. **Re-theme to a garden.** A short garden gnome waters thirsty plants at the roots and blasts pests. "Aim low" becomes real gardening advice and a joke about the hero's height, with no toilet humor. The spiders and wasps already in the game become garden pests. The 25–55 casual audience already loves garden games (Gardenscapes, Plants vs. Zombies).
3. **Change the structure from endless runs to a level map.** Add 30–60 handcrafted, star-rated levels with goals, and a garden that grows as you progress. Keep endless play as a seeded **Daily Garden** with a shareable result card.
4. **Launch on the web first, through one portal.** Apply to Poki (Amsterdam-based, curated, 100M+ monthly players, 50/50 ad share, web exclusive). If Poki declines, use CrazyGames (open submission, non-exclusive, allows IAP). Use aimlow.fun as the brand hub. With under €2k, an App Store launch gets no traffic: paid installs cost $1.41–3+ per casual player.
5. **Go to mobile only after the web numbers say so.** Wrap with Capacitor once web retention reaches roughly D1 ≥ 25% and D7 ≥ 7%. Monetize there with rewarded ads, a "remove ads" purchase, and cosmetics.
6. **Avoid the monetization patterns EU regulators target:** loot boxes, multiple virtual currencies, fake countdown timers, energy walls, and purchase prompts at the moment of a near-miss. Regulators are actively enforcing this in 2026, and the Netherlands is pushing for an EU-wide loot box ban.
7. **Use Japanese design for balance, not monetization.** Copy Nintendo's teaching through play and kind-to-beginners difficulty, arcade chain multipliers and tension curves, and Sakurai's risk and reward. Do not copy gacha, stamina systems, or login-bonus treadmills.

## 2. Theme options

All options keep the title, the Rapier water jet, aiming, waves, streak power-ups, and most of `EnemyManager`.

| Concept                   | How "Aim Low" fits                                                                                     | Fit for ages 25–55                               | Code reuse                                               | Hook for marketing                                       |
| ------------------------- | ------------------------------------------------------------------------------------------------------ | ------------------------------------------------ | -------------------------------------------------------- | -------------------------------------------------------- |
| **Garden Gnome** (chosen) | Water at the roots, not the leaves (real gardening advice). The hero is a 30 cm gnome, so he aims low. | Strong: cozy, gardening hobbyists, PvZ nostalgia | Highest: bowl becomes plant, bugs stay pests, tank stays | "Aim low. Grow high." Plants bloom on screen, bugs splat |
| Fire Pup                  | Aim at the base of the fire (standard fire-extinguisher advice)                                        | Medium: skews toward kids and young players      | High, but fire needs new spreading and visual effects    | Heroic rescues (kittens)                                 |
| Archerfish / pond critter | Archerfish really do knock insects off leaves with water jets                                          | Medium: very cute, weaker tie to the title       | High                                                     | Kawaii mascot, nature facts                              |
| Power-wash cleanup        | Scrub the grime down low                                                                               | Strong: satisfying, ASMR-style clips             | Low: needs a surface-coverage (decal/paint) system       | Before/after clips                                       |

The power-wash idea can return later as a garden mode ("clean the patio") once the core game is proven.

### Garden Gnome: replacing each part of the current game

| Current                            | Garden version                                                                                       |
| ---------------------------------- | ---------------------------------------------------------------------------------------------------- |
| Urinal bowl and inner catch sensor | Thirsty plant or pot. The catch sensor sits at the soil line, so water on the leaves does not count. |
| Score per second in the bowl       | Growth meter: the plant visibly grows and blooms. Seeing it bloom is the main reward.                |
| Spill penalty                      | Wasted water drains the tank faster. A resource cost reads better than losing points.                |
| Pressure tank as the run timer     | Watering can or hose tank. Levels end on a goal, not only when the tank runs dry.                    |
| Spiders and wasps escaping         | Pests reach a plant and nibble it. Add slugs, aphids, caterpillars, and moles popping out of holes.  |
| Foam Party (beer)                  | **Sprinkler Spin**: wide spray. Drop the alcohol reference for a broad audience and age ratings.     |
| Coffee Laser                       | **Jet Nozzle**: precise, fast stream.                                                                |
| Bathroom with graffiti             | Backyard, then allotment, greenhouse, park, and rooftop garden (one per chapter).                    |
| Bangers font, comic lighting       | Keep both. The comic style already suits a cheerful garden.                                          |

## 3. Making it replayable (lessons from Candy Crush and others)

Sources: King at GDC 2024, Deconstructor of Fun, GameRefinery, Game Developer, Duolingo. Full links are in section 9.

What the research shows:

- **Finite, handcrafted levels are the engine.** Candy Crush launched with 65 levels and now has 21,000+. A steady stream of new levels is the main live content.
- **Retention beats difficulty.** King found that very hard levels pay in the short term but cause players to quit. In A/B tests, easier levels kept players longer and they spent more over time. King measures fun as "time to abandon" and rewrites its 100 least-fun levels. Hard levels should also be short.
- **Sawtooth difficulty.** Difficulty peaks, then eases at the start of each new chapter. Never introduce a new mechanic on a hard level.
- **Near-misses drive "one more try".** A narrow miss creates more arousal and urge to replay than a clear loss.
- **Win streaks are the strongest recent casual feature.** Royal Match's streak was linked to +38% month-over-month revenue (third-party estimate).
- **Daily shared seeds.** Everyone plays the same run for 24 hours with one ranked attempt. Daily drop-off is very low, and the mode is cheap to build.
- **Sharing.** Wordle's emoji grid spread without spoilers. Suika Game and Balatro spread through streamers. Survivor.io grew through TikTok clips.
- **Hidden difficulty adjustment.** A 300k-player field test gave easier puzzles to players about to quit; both retention and spending went up. EA saw up to 9% more engagement.
- **First session.** Day 1 loses the most players. Get to real play within about 60 seconds, require no sign-up, and keep it easy.

Recommended mechanics, ranked by value for effort:

1. **Level map with 1–3 stars per level.** Clearing is easy; three stars takes mastery. Ship 30–60 levels at launch, defined as data (wave script, plants, goal, star thresholds).
2. **Daily Garden.** A seeded run, the same for everyone, with one ranked attempt and a share card (e.g. `🌻🌻🌻 🐌💥×14 ⚡0.4s`). Needs a seeded random number generator in `EnemyManager`.
3. **Green Thumb streak.** Clear N levels in a row on the first try and the next level starts with a pre-charged power-up. This extends the existing clean-streak idea. Losing resets the streak; nothing paid is involved.
4. **Near-miss results screen with instant retry.** "40 points from 3 stars" or "1 slug from perfect", then one tap to retry. Do not put a purchase on this screen.
5. **The garden grows as the meta layer.** Each cleared level blooms or decorates your yard. This is a cheap version of Gardenscapes' renovation meta, without a story.
6. **Hidden help.** Easier waves in the first three runs, and for players who fail the same level repeatedly.
7. **Daily streak with streak freezes** (Duolingo), plus cosmetic mastery: gnome hats, nozzle skins, badges for each level.
8. **Later:** pick one of three upgrades between waves in Endless/Daily, async "beat my score" links, and a seasonal pass.

## 4. Japanese design inspiration

Sources: Iwata Asks, Masahiro Sakurai on Creating Games, Game Developer, shmups.wiki. Full links are in section 9.

| Principle                                                                     | Source                                               | How it applies to Aim Low                                                                                                                                                  |
| ----------------------------------------------------------------------------- | ---------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Kishōtenketsu**: introduce, develop, twist, conclude                        | Hayashida, Super Mario 3D Land/World                 | Every chapter introduces one pest or plant behaviour, develops it, twists it (shielded slug, splitting aphid), then combines it with earlier ones. One new idea per level. |
| **Teach through play** (World 1-1)                                            | Miyamoto and Tezuka                                  | No text tutorial. Level 1 has a single plant and no pests; level 2 adds one slow pest heading for the plant.                                                               |
| **Be kind to beginners** and hide depth for veterans                          | Sakurai on Kirby; Rhythm Heaven grading              | Clearing is easy; three stars and S rank are hard.                                                                                                                         |
| **Super Guide**: help appears after 3 failures and never earns the top reward | New Super Mario Bros. Wii; Mario Kart Smart Steering | After 3 failures, offer a "Garden Helper" (slower pests or aim assist) that caps the level at 2 stars.                                                                     |
| **Risk and reward / push and pull**                                           | Sakurai, episode "Risk and Reward"                   | Leaving a plant to snipe a pest costs growth now but builds the multiplier. Make that trade-off visible in the HUD.                                                        |
| **Chain gauge**: kills refill a draining multiplier                           | DoDonPachi                                           | Merge the quick-kill bonus into a combo multiplier that drains over time. Keeps the pace aggressive and gives a ceiling for skilled players.                               |
| **Tension curve**: the last enemies speed up; calm breathers between waves    | Space Invaders; Pac-Man scatter and chase            | The last pests in a wave move faster. Keep the existing 3.25 s breathers.                                                                                                  |
| **Enemy personalities**                                                       | Pac-Man ghosts                                       | Each pest has one readable behaviour: slug slow and tanky, aphid swarms, wasp darts, mole pops up from holes (whack-a-mole).                                               |
| **Hit-stop and juice**                                                        | Sakurai, "Eight Hit Stop Techniques"                 | 2–4 frames of freeze on each kill and a longer freeze on the last pest of a wave. Add to the existing splat, shake, and buzz.                                              |
| **Understandable in five seconds**                                            | WarioWare                                            | Each level's goal fits in one word or icon ("Grow!", "Protect!").                                                                                                          |
| **Cute mascot**: big head, big eyes, soft shapes                              | Kirby, Sanrio, Pokémon                               | A chunky, expressive gnome. The mascot is the brand: icon, thumbnail, and merch.                                                                                           |
| **Mild, absurd humor** that is never crude                                    | Katamari; Sega's Toylet as a cautionary example      | Silly pests, a dramatic gnome, wilting plants. Keep the absurdity and drop the bodily humor.                                                                               |

**Do not copy:** gacha. Japan banned kompu gacha (paying to complete a set for a prize) in 2012, and Belgium treats paid loot boxes as gambling. Also skip stamina systems and login bonuses as the main hooks. These are retention tools, not fun.

**Precedent:** Sega really did sell interactive urinal games ("Toylet", 2011–2016, Japanese bars and stations). The idea works as a novelty but never reached a mass audience.

## 5. Platform: web vs App Store

| Option                                | Cost                  | Who brings the players                      | Revenue                                                     | Verdict for €2k               |
| ------------------------------------- | --------------------- | ------------------------------------------- | ----------------------------------------------------------- | ----------------------------- |
| **Poki**                              | Free, curated (apply) | Poki (100M+ monthly players)                | 50/50 ads on Poki traffic, 100% on your own traffic; no IAP | **First choice**              |
| **CrazyGames**                        | Free, open submission | CrazyGames (50M+ monthly, Tier-1 heavy)     | Ads through their SDK, IAP allowed; split _unverified_      | Fallback; non-exclusive       |
| Own site only (aimlow.fun)            | Hosting only          | You                                         | Your own ads                                                | Hub, not the main channel     |
| App Store / Google Play (Capacitor)   | $99/yr + $25 once     | You (paid installs $1.41–3+ for casual iOS) | IAP and ads; 15% small-business rate                        | Phase 2, gated on web numbers |
| YouTube Playables, Discord Activities | Free                  | Platform                                    | Pilot programs / purchases                                  | Opportunistic later           |

Why web first:

- The game is already a browser game.
- Portals bring the players for free.
- Portal analytics give real retention and level-funnel data before you spend on mobile.
- Poki is Dutch, which may help with local events and contacts.

Portal technical requirements (check against the current build):

- **Download size.** Initial download ≤ 20 MB for the CrazyGames mobile homepage (≤ 15 MB is safest for YouTube Playables). Current models, textures, and fonts total about 3 MB plus JS and Rapier WASM. Keep it that way: compress GLBs (Draco/meshopt, KTX2 textures) as purchased assets arrive.
- **Load time.** Gameplay within 10 s (Poki) or 20 s (CrazyGames).
- **Rendering.** WebGL2 must work. `WebGPURenderer` falls back to WebGL2 automatically. Test Safari and a 4 GB Chromebook.
- **Poki restrictions.** No external requests or CDNs. Ads only through their SDK; place breaks at level end and use rewarded ads for "second watering can". Web exclusivity: ask Poki how a copy on aimlow.fun works under exclusivity before hosting one separately.
- **Thumbnail and icon.** These drive portal clicks, so budget for good key art.

Mobile later:

- Capacitor wraps the same build.
- Apple guideline 4.2 rejects apps that are just a repackaged website. Add offline play, haptics, and app-style features.
- iOS can silently kill the WebKit GPU process under memory pressure. The app needs its own detection and recovery.
- New personal Google Play accounts need a 12-tester, 14-day closed test before release.

## 6. Monetization

**Phase 1 (web):**

- Portal ads only: level-end interstitials, plus rewarded ads for one extra watering can per level or double garden coins.
- No IAP on Poki.

**Phase 2 (mobile):**

- Rewarded ads, plus a "remove forced ads" purchase (€2–4).
- Cosmetic purchases: gnome outfits, nozzle skins, garden decorations.
- Later, a premium seasonal garden pass.
- At most one soft currency, and every purchase shown in real money.

**Benchmarks (third-party, approximate):**

| Metric                      | Figure                                          |
| --------------------------- | ----------------------------------------------- |
| Rewarded-ad eCPM, Q4 2024   | ~$13.6 iOS, ~$9.0 Android                       |
| Casual CPI, global          | $1.41 iOS, $0.14 Android                        |
| Retention, top quartile     | D1 26.5–27.7%                                   |
| Retention, median           | D7 3.4–3.9%                                     |
| Revenue mix (US/Japan)      | IAP is 77–90% of mobile game revenue            |
| Poki studio earnings (2024) | Top studios $50k–$1M a year; most earn far less |

**EU rules to design around:**

- **CPC principles (March 2025):** show real-money prices, avoid confusing currencies, let players buy only what they need, honour the 14-day withdrawal right, and protect children.
- **Enforcement:** reported in October 2026 against 11 games, including Candy Crush and Gardenscapes, over fake timers, false scarcity, and pressure on children.
- **Digital Fairness Act:** expected to be proposed in Q4 2026, covering dark patterns and possibly virtual currencies and loot boxes.

Designing clean now avoids rework later.

## 7. Positioning

- **Category:** casual arcade with a cozy garden meta, in 60–90 second levels.
- **Elevator pitch:** "Plants vs. Zombies meets PowerWash: water your garden, splat the pests, grow something ridiculous."
- **Tagline options:** "Aim low. Grow high." · "Low aim. High scores." (current) · "Water the roots. Blast the bugs."
- **Audience:** casual players aged 25–55 who play during short breaks and in the evening, like cozy themes and visible progress, and avoid twitch-heavy shooters. Clearing levels stays easy; stars are for the competitive players.
- **What sets it apart:**
  - Real physics water: the stream splashes and arcs, which flat 2D match-3 games can't show.
  - Arcade skill under a cozy surface.
  - A garden that visibly grows.
- **Brand voice:** a deadpan, self-deprecating gnome ("Aim low. It's working for me."). The title reads as a wink, not a toilet joke.
- **Marketing channels (€0):**
  - 10–20 second vertical clips of satisfying water, splats, and blooms on TikTok, Reels, and Shorts.
  - Daily Garden share cards.
  - A devlog.
  - r/WebGames and r/IndieGaming.
  - Dutch indie events (Indigo, Dutch Game Garden).
  - The portal's own front page.
- **Check before investing in the brand:** run an EUIPO/BOIP trademark search for "Aim Low" in classes 9 and 41.

## 8. Plan for six months (side project, < €2k)

| Month | Goal                                                                                                             | Exit check                                                                  |
| ----- | ---------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------- |
| 1     | Garden vertical slice: one backyard, plant target, gnome, spider/wasp/slug, 10 levels with stars, hit-stop       | 10 non-gamer playtesters aged 25–55 finish level 5 unaided and ask for more |
| 2     | 30 levels across 3 chapters, garden-grows meta, Daily Garden and share card, compressed assets                   | Initial load ≤ 20 MB, playable in < 10 s on a mid-range phone               |
| 3     | Poki submission (fallback: CrazyGames Basic Launch), integrate ads SDK                                           | Live on a portal                                                            |
| 4–5   | Tune levels using the funnel ("time to abandon"), add weekly levels, run a seasonal garden event (autumn/winter) | D1 ≥ 25%, D7 ≥ 7%, no level loses > 15% of the players who reach it         |
| 6     | If the numbers hold: Capacitor build, Android closed test, rewarded ads, remove-ads purchase, cosmetics          | Soft launch on Android                                                      |

**Rough budget (estimates; verify current prices and licences):**

| Item                                                                                             | Estimate  |
| ------------------------------------------------------------------------------------------------ | --------- |
| Commissioned stylized gnome mascot, rigged, 4–6 animations (biggest brand asset)                 | €300–700  |
| Key art, icon, portal thumbnail                                                                  | €100–300  |
| Environment: free CC0 packs (Quaternius, Kenney), or a Synty pack or subscription (~$30/month)\* | €0–200    |
| Extra pests (slug, aphid, caterpillar, mole) from Fab, Sketchfab, or CGTrader                    | €50–200   |
| Sound effects and music                                                                          | €50–200   |
| Reserve, including store accounts in month 6 ($99 + $25)                                         | remainder |

\* Check what the Synty licence allows after a subscription ends.

**Metrics to track from day one:**

- D1, D7, and D30 retention
- level funnel and time to abandon
- sessions per day
- share-card rate
- ad views per daily user

## 9. Sources

**Market and platforms**

- Poki developer guide and requirements: https://developers.poki.com/guide/working-with-poki · https://developers.poki.com/guide/requirements-quality
- Poki audience and Dutch Game Awards: https://poki.com/blog/poki-wins-dutch-game-awards-2025 · earnings: https://techfundingnews.com/browser-gaming-website-poki-won-big-at-the-dutch-game-awards-celebrating-hitting-1-billion-monthly-plays/
- CrazyGames FAQ and technical requirements: https://docs.crazygames.com/faq/ · https://docs.crazygames.com/requirements/technical
- YouTube Playables: https://developers.google.com/youtube/gaming/playables/certification/requirements_stability · https://developers.google.com/youtube/gaming/playables/reference/monetization
- Discord Activities: https://gamesbeat.com/discord-opens-activities-in-app-games-and-features-to-all-developers/
- Safari 26 WebGPU: https://webkit.org/blog/16993/news-from-wwdc25-web-technology-coming-this-fall-in-safari-26-beta/
- Three.js plus Capacitor on the App Store: https://raxxo.shop/blogs/lab/shipping-a-three-js-game-to-the-ios-app-store
- App Review Guidelines: https://developer.apple.com/app-store/review/guidelines/
- Google Play testing requirement: https://support.google.com/googleplay/android-developer/answer/14151465
- Apple EU changes (Oct 2026): https://www.apple.com/newsroom/2026/08/apple-announces-changes-for-apps-in-the-european-union/
- US external-purchase fee: https://mjtsai.com/blog/2026/08/17/apple-proposes-15-external-purchase-fee/ · https://thenextweb.com/news/supreme-court-apple-epic-contempt-app-store-commission
- Hybrid-casual Q1 2025: https://gameindustrylibrary.com/documents/hybdrid-casual-games-in-q1-2025
- eCPM: https://appodeal.com/the-mobile-ecpm-report-updated-q4-2024-view
- CPI: https://liftoff.ai/?p=34267
- Retention benchmarks: https://gamedevreports.substack.com/p/gameanalytics-mobile-gaming-benchmarks
- Mob Control and Voodoo: https://en.wikipedia.org/wiki/Voodoo_(company) · https://www.pocketgamer.biz/comment-and-opinion/79857/mob-control-hybridising-a-hypercasual-hit/
- PowerWash Simulator 17M players: https://www.pcgamesinsider.biz/news/75072/powerwash-simulator-reaches-17m-players/
- Synty store: https://syntystore.com/products/polygon-town-pack

**Retention and ethics**

- King on level quality: https://mobilegamer.biz/how-king-defines-a-good-candy-crush-saga-level-and-why-it-constantly-prunes-the-bad-ones/
- Candy Crush live ops: https://www.globalgamesforum.com/news/inside-live-ops-at-king-how-candy-crush-stays-fresh-after-14-years
- Near-miss study: https://www.ncbi.nlm.nih.gov/pmc/articles/PMC5445157/
- Win streaks: https://liquidandgrit.com/?p=14540 · https://thisweekinliveops.substack.com/p/this-week-in-liveops-royal-matchs
- Habby's hybrid-casual template: https://www.deconstructoroffun.com/blog/2025/7/31/habbys-hybridcasual-empire-the-template-that-built-a-powerhouse
- Daily runs: https://www.gamedeveloper.com/design/the-24-hour-ticket-examining-daily-runs-
- Duolingo streaks: https://blog.duolingo.com/how-duolingo-streak-builds-habit
- Easier games, more revenue: https://business.columbia.edu/research-brief/digital-future/easier-games-more-revenue
- EA difficulty adjustment: https://archives.iw3c2.org/www2017/proceedings/companion/p465.pdf
- Survivor.io and TikTok: https://mobilegamer.biz/tiktok-drives-habbys-survivor-io-past-15m-iap-revenue-12m-downloads/
- CPC virtual-currency principles: https://www.arthurcox.com/insights/eu-consumer-protection-new-principles-for-virtual-currencies-in-video-games/ · https://techinsights.linklaters.com/post/102k6t4/game-changer-eu-introduces-consumer-protection-guidance-for-in-game-virtual-curr
- 2026 enforcement against 11 games: https://decrypt.co/379813/minecraft-candy-crush-among-11-games-in-eu-virtual-currency-crackdown
- Dutch loot box position: https://www.gamblingnews.com/news/dutch-minister-pushes-for-eu-wide-loot-box-ban-to-shield-consumers/
- Digital Fairness Act timeline: https://digital-fairness-act.eu/timeline/

**Japanese design**

- Kishōtenketsu: https://www.gamedeveloper.com/design/the-structure-of-fun-learning-from-i-super-mario-3d-land-i-s-director
- World 1-1: https://gamedeveloper.com/design/how-miyamoto-built-i-super-mario-bros-i-legendary-world-1-1
- Super Guide: https://iwataasks.nintendo.com/interviews/wii/nsmb/0/5
- Splatoon: https://www.nintendo.com/en-gb/Iwata-Asks/Iwata-Asks-Splatoon/Splatoon/5-This-Depth-Has-No-End/5-This-Depth-Has-No-End-1021373.html
- Sakurai, "Risk and Reward": https://destructoid.com/?p=342808
- Sakurai, hit-stop: https://www.youtube.com/watch?v=tycbMSjDDLg
- Sakurai, kind to beginners: https://www.nintendolife.com/news/2023/09/random-kirbys-dream-land-is-all-about-being-kind-to-beginners-says-sakurai
- Pac-Man Dossier: https://www.gamedeveloper.com/design/the-pac-man-dossier
- DoDonPachi chains: https://shmups.wiki/library/DoDonPachi_3
- Battle Garegga rank: https://shmups.wiki/library/Battle_Garegga
- WarioWare: https://iwataasks.nintendo.com/interviews/wii/warioware_smooth_moves/0/1
- Monster Strike: https://www.pocketgamer.biz/monster-strike-surpasses-11bn-in-11-years-with-japanese-dominance
- Suika Game: https://en.wikipedia.org/wiki/Suika_Game
- Kompu gacha ban: https://www.famitsu.com/news/201206/19016474.html
- Toylet: https://en.wikipedia.org/wiki/Interactive_urinal · https://segaretro.org/History_of_Toylets
