# HandForge — project brief

Meta VR Start Developer Competition 2026 · Gaming track · New Experience division.
Submission deadline: **Nov 18, 2026, 12:00 PM PST (Nov 19, 1:30 AM IST)**. Aim to submit by Nov 17.

## The game
A seated, hands-first spatial puzzle. A 3D target structure floats above a table;
the player grabs loose pieces with their hands, rotates and positions them, and
snaps them into place. A correct placement gives a satisfying visual + audio
payoff. A full session takes 10 minutes or less.

## Hard requirements
- Every core interaction works **without controllers** (hand tracking only).
  Controllers may work too, but never be required.
- Seated, small physical space, no locomotion.
- MR (passthrough, puzzle on a real table) is the headline mode; a reliable
  fallback must exist when plane detection / hit test is unavailable.
- Judges must be able to open the deployed URL, understand it, and finish a level within minutes.

## MVP scope
| Feature | Status |
|---|---|
| Hand grab, rotate, place, snap | Required |
| One complete puzzle with a win condition | Required |
| Tutorial + restart | Required |
| Works on Quest via deployed HTTPS URL | Required |
| MR table placement | Target — validate on device early |
| Three polished levels | After level 1 is solid |
| Accounts, cloud saves, multiplayer, AI content, backend | Out of scope |

## Architecture
- **Presentation** — UIKitML spatial panels (`public/ui/*.uikitml`): level select, tutorial, progress, pause/restart. Large text, hand-friendly targets.
- **Gameplay** — pure TypeScript, no Three.js or input imports: puzzle definitions (piece ids, target position/rotation, snap tolerance), placement validation, progression, scoring. Unit-testable on its own.
- **Interaction** — ECS systems that bridge IWSDK grabbing/hand input to gameplay: release → validate → snap or return, plus feedback.
- **Runtime** — IWSDK (`iwsdk.config.json` is the project authority).

Puzzle definitions start as local data in `src/puzzles/`. No backend.

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
- Oct 24–26 Foundation (done: scaffold, typecheck, build, starter renders)
- Oct 27–30 First playable puzzle: grab, snap, win
- Oct 31–Nov 4 Tutorial, progression, pause/restart, feedback
- Nov 5–8 MR table placement on Quest + fallback
- Nov 9–12 Polish, performance, comfort
- Nov 13–15 Release candidate, feature freeze
- Nov 16–17 Video (<3 min, public YouTube/Vimeo), screenshots, Devpost text
- Nov 18 Submit early; no updates during judging

## Windows setup notes
- Start the dev server with `start-dev.bat` (5-minute startup limit; output goes to `dev-log.txt`). Keep that window open while working; closing it stops the server.
- `scripts/patch-iwsdk-windows.mjs` (runs on `postinstall`) raises the PowerShell timeout in IWSDK 1.1.0-rc.2 from 1.5 s to 15 s. Without it, startup fails with "Cannot establish this process birth identity". Remove it once a fixed IWSDK release is installed.
