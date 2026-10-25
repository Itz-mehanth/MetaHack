# HandForge — project brief

Meta VR Start Developer Competition 2026 · Gaming track · New Experience division.
Submission deadline: **Nov 18, 2026, 12:00 PM PST (Nov 19, 1:30 AM IST)**. Aim to submit by Nov 17.

## The game (pivot, 2026-10-25)
A standing, in-place MR action game. Drones breach the player's real walls in
waves; the player fights with hero powers made from their own hands and
switches hero with a wrist button. Visually loud: emissive bolts, trails,
lightning, dissolve kills, slow-motion on the last kill of a wave.

All heroes and weapons are **original IP** (no Marvel/third-party names or
designs). Powers, in build order (cut from the bottom if time runs out):
1. **Palm blaster**: open palm toward a target fires an energy bolt.
2. **Energy claws**: fist extends knuckle blades; fast swings slash.
3. **Storm hammer**: grab and throw; lightning on hit; open hand recalls it.
4. **Rebound disc**: thrown disc bounces between enemies.
5. **Light bow**: two-hand draw with an invisible string. Stretch goal.

The earlier block-puzzle prototype (`src/gameplay`, `src/puzzles`,
`src/puzzle-system.ts`) is parked, not the product.

## Hard requirements
- Every core interaction works **without controllers** (hand tracking only).
- Standing in place, no locomotion.
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
