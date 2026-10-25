# HandForge — project brief

Meta VR Start Developer Competition 2026 · Gaming track · New Experience division.
Submission deadline: **Nov 18, 2026, 12:00 PM PST (Nov 19, 1:30 AM IST)**. Aim to submit by Nov 17.

## The game (current, 2026-10-25)
**SURGE: Hands of Heroes** - a hands-only MR/VR hero-combat game. Original IP
throughout (no Marvel or other third-party names/designs).

- Saga: OBLIVAX, the Unmaker, has pulled the eight Anchors that hold reality
  together; Warlord VEX is his herald. First XR session auto-starts a 4-min
  guided PROLOGUE (ARC -> RONIN -> PSION relay with coach cards, no damage,
  then OBLIVAX erases the room and leaves). Eight regions, one per hero,
  three levels each; every region boss returns an Anchor (24 missions).
  With 3 Anchors the finale CONVERGENCE opens: hero relay by boss health
  (ARC, RONIN, PSION, TEMPEST), then all eight heroes appear as holograms
  and a clap fires the final volley; the erased room grows back.
  Coach cards (animated hand pictograms) teach each hero at mission start.
  Test hooks: ?autostart=prologue|finale, window.__surgeBoss(f),
  __surgeSkip(), __surgeClear().
  Typewriter "incoming transmission" dialogue (no voices).
- Heroes: ARC palm blaster, TALON energy claws, TEMPEST storm hammer,
  ORION light bow, WEAVER light webs, HAVOC plasma pistol, RONIN, PSION. Hammer, bow and
  pistol are physical: they drop onto the floor or real tables, either hand
  grabs or recalls them. RONIN twin katanas (fist ignites a blade per hand,
  fast swings throw slash waves, crossing both blades fires an X-strike).
  PSION telekinesis (open palm locks onto a prop or alien, close to lift,
  fling and open to throw; impacts blast nearby enemies).
- Enemy bodies: anatomical aliens (merged parts per rigid limb). Hits make
  them flinch and step back; kills topple them (knockback, knees buckle,
  thud, lie, sink). Blade kills sever along the cut: horizontal = waist,
  high = head, else an arm; parts fly as physics gibs with ichor. All
  walkers end in melee: telegraphed wind-up, dodge by stepping back, PARRY
  by meeting their weapon with a sword/claw (stuns, double damage). REAVER
  = energy-sword alien; Stalkers dash. Gunners fire 1-2 volleys then push.
  Player hits: directional blood splatter, low-health pulse.
- Flesh: red blood (normal-blended particles), blood pools on the floor,
  flesh/bone cut faces on severed parts. Sword/claw thrusts IMPALE: the
  body stays skewered on the blade until flung (bodies fly, knock others).
  WEAVER: web shots (web pose or open-palm thrust) splat like bullets;
  whip the hand to throw the webbed enemy (fist + pull still rips).
- Worlds: every level has its own sky (worlds.ts: palette, nebula, planet
  or black hole, rings, stars). VR shows it as the whole sky; MR tears it
  into the room (rift grows at the boss, closes on victory).
- Galaxy map (PLAY): 8 hero planets around OBLIVAX's core, level moons,
  Anchor gems and beams; poke a planet to deploy/unlock, core = finale.
- Gloves: per-hero gauntlet style (finish, trim, extras; HAVOC fingerless).
- Enemies: walking humanoid aliens (Grunt, Brute, Stalker, Colossus) from
  wall portals, plasma shots you dodge or shoot; flying boss mechs.
- Flow: landing page -> 3D hero carousel -> holographic war map -> mission
  -> results. Armory garage with holographic weapons, coin upgrades gated by
  story progress, weapon tiers that change visuals. Saved in localStorage.
- MR: room-scan sweep, enemies from real walls (ahead or all around),
  threat arrows. Debug links: ?autostart=<stage>&hero=<id>&skipstory=1,
  ?menu=garage|heroes|map.

## Hard requirements
- Every core interaction works **without controllers** (hand tracking only).
- Standing play; room-scale walking supported in MR (no artificial locomotion).
- MR passthrough is the headline mode; enemies spawn from detected walls, with
  a fallback ring of spawn points when plane/mesh detection is unavailable.
- Judges open the deployed URL, understand it in seconds, finish a run in minutes.
- Quest 3 at 72 fps: no full-screen post-processing; fake glow with additive
  sprites, instanced/pooled particles, no per-frame allocation.

## MVP scope
| Feature | Status |
|---|---|
| Palm blaster + drone enemy + waves + health/score | Day 1 |
| Energy claws, storm hammer, wrist hero switch, VFX pass | Day 2 |
| Rebound disc, light bow | Day 2-3, cut first |
| Title, 30 s tutorial, restart, perf on Quest, video | Day 3 |
| Accounts, saves, multiplayer, backend | Out of scope |

## Architecture
- **Presentation**: UIKitML panels (`public/ui/*.uikitml`): title, wrist hero switcher, HUD, game over.
- **Gameplay**: pure TypeScript with no Three.js or input imports: wave definitions, enemy stats, damage, scoring. Unit-testable on its own.
- **Interaction**: ECS systems that read hand joints and poses (palm direction, fist, swing speed) and drive powers, enemies and feedback.
- **Runtime**: IWSDK (`iwsdk.config.json` is the project authority).

## How to work
For every feature:
1. Inspect the installed IWSDK API (reference MCP / `node_modules/@iwsdk/core`) and existing code first. Never invent APIs.
2. Plan the smallest change that satisfies the requirement.
3. Implement without touching unrelated files.
4. Run `npm run typecheck` and `npm run build`.
5. Use the IWSDK runtime tools (screenshots, scene/ECS inspection, XR input simulation) to verify behaviour in the emulator.
6. Fix regressions before moving on.
7. Report: files changed, checks that actually passed, and what still needs a real Quest headset.

Do not start the next major feature until the current one passes its checks.

## Schedule
Compressed to 2-3 days from 2026-10-25, pushing to `main` (auto-deployed on
Vercel) after every working step and testing on Quest the same day.

## Windows setup notes
- Start the dev server with `start-dev.bat` (5-minute startup limit; output goes to `dev-log.txt`). Keep that window open while working; closing it stops the server.
- `scripts/patch-iwsdk-windows.mjs` (runs on `postinstall`) raises the PowerShell timeout in IWSDK 1.1.0-rc.2 from 1.5 s to 15 s. Without it, startup fails with "Cannot establish this process birth identity". Remove it once a fixed IWSDK release is installed.
