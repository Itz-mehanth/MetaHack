# SURGE win plan (written 2026-11-03)

Deadline: **Nov 18, 2026, 12:00 PM PST** (Nov 19, 1:30 AM IST). Submit **Nov 17**.
Work days left: Nov 3 - Nov 16 (14 days). Code freeze **Nov 13**.

## What the judges score (from Meta's public announcement; verify against the Devpost rules)

- Four equal criteria: **Innovation, Experience Design, Technical Execution, Polish & Presentation**.
- Hard rules: Meta VR Start member; fully usable with hands end-to-end; >= 60 fps on Quest.
- Meta's stated design tests: **airplane-seat** (seated, everything within ~2 ft), **bus-stop** (satisfying in
  <= 10 min, fast cold start, clean pause/resume), **take-it-away** (not a thin wrapper).
- Demo video < 3 min of REAL device gameplay (AI-generated video counts against you).
- Prizes we can plausibly target: Best New Gaming ($100k), First Five Minutes, Boldest Original Concept,
  Reason to Come Back, Accessibility Forward, Judge's Choice ($20k x2). Social/Multiplayer and Agentic
  Interaction are stretch.

## Where we stand

Strong: concept, breadth (10 heroes, 30 creatures, 24 missions, bosses, saga), hands-only, MR room use,
original IP, flat-screen play, 80 unit tests.
Weak or unknown (these lose points in the criteria above):
1. Never measured on a Quest. No fps readout, no quality governor, no foveation / resolution policy.
2. Standing and room-scale first; Meta asks for seated. No seated mode.
3. Hand gestures never validated across different hands, lighting and players.
4. Audio is not spatial (no PannerNode anywhere): enemies do not sound like they are in the room.
5. Not installable (no manifest / service worker); cold start = 3 MB JS + lazy 13 MB creatures.
6. Ten heroes, but a judge sees one per run: the breadth is invisible in a 3-minute session.
7. No reason to come back after the 24 missions (no endless mode, daily challenge or leaderboard).
8. No glasses story (gaze + pinch, narrow FOV) although Meta is pushing glasses.
9. Name clash: a game called "Surge" is already on the Meta Store.

## Phase 0 - gates (today, Nov 3). Nothing else matters if these fail

- [ ] Confirm **Meta VR Start membership** is approved and the Devpost registration is done. (Forum reports
      of the Start application page failing on Oct 25: if not in yet, escalate today.)
- [x] Devpost form seen (2026-11-03): WebXR is accepted ("for WebXR projects provide your hosted URL");
      the demo video may come from a Quest, XR Simulator or an equivalent emulator (YouTube/Vimeo, first
      3 min reviewed); Division NEW qualifies (first commit 2026-10-25). Draft answers are in DEVPOST.md.
- [ ] Still unseen: the exact judging-criteria wording on the Devpost rules page.
- [ ] Run the current deploy on the Quest: note fps (OVR Metrics Tool), cold start time, gesture failures.
- [ ] Check that a Quest screen recording captures passthrough (otherwise film the player with a phone).
- [ ] Decide the name (keep SURGE: Hands of Heroes, or rename to avoid the store clash).

## Phase 1 - bulletproof (Nov 3-5): Technical Execution

1. **[DONE 2026-11-03] Perf HUD + governor** (`?perf=1`, Settings > PERFORMANCE HUD, `?q=0..3` pins a tier, `window.__surgePerf()`; quality.ts, perfhud.ts). Originally: `?perf=1` / palm-up: fps, frame ms, draw calls, triangles, enemies, particles.
   Governor with 3 tiers that drops, in order: creature ink outlines (halves skinned draws), particle caps,
   max enemies alive, ground paint and extra VFX, framebuffer scale. Set foveation and framebuffer scale
   deliberately. Detect Quest 2 and start at tier 2.
2. **Gesture reliability.** 10-second calibration at first launch (open hand, fist, pinch, point) that sets
   `tuning` per player; keep HAND DEBUG; add hysteresis so gestures do not flicker.
3. **Controller-as-hand fallback** (reuse puppet.ts shapes): judges who cannot get hand tracking still
   see the game. "Put your controllers down" prompt when hand tracking is off.
4. **Cold start + PWA**: manifest, icons, service worker, auto-enter XR on launch (skill
   `iwsdk-pwa-packaging`), split the 3 MB bundle, preload only the first world's creatures.
5. **Pause/resume + exit** that always works (visibilitychange, XR session end, the EXIT button).
6. Error-proofing: no-plane fallback ring (exists), no-hand fallback, WebGL context loss message.

## Phase 2 - Meta-aligned design (Nov 5-8): Experience Design + Accessibility

1. **SEATED mode** (default choice on the first screen): front 150-degree arc, enemies within ~3 m,
   lean-to-dodge instead of stepping, no room border, every menu and pickup within arm's reach.
2. **Accessibility pack** (targets the $25k award): seated, one-handed play, left/right hand swap, reduce
   flashes (cap lightning/strobes, no slow-mo), text size and contrast, directional threat cues, toggle
   instead of hold, aim-assist slider, colour-blind-safe telegraphs.
3. **Glasses-ready**: gaze + pinch for menus and a gaze lock-on for ARC / ORION / HAVOC; HUD and threat arrows
   inside 37 deg left/right, 25 up, 43 down (skill `iwsdk-glasses-test`).
4. **First Five Minutes rebuild**: ENTER -> first kill in 20 s -> first hero swap at 60 s -> boss tease at
   2 min -> first mission clear + reward by minute 4-5. Compress the 4-min prologue to ~2.5 min with a skip.
   Play-test with 3 strangers who get no help.

## Phase 3 - signature features (Nov 8-12): Innovation + Boldest Concept + Reason to Come Back

A. **SQUAD / TAG-TEAM** (turns the 10 heroes into the core mechanic, and shows many of them in one run)
   - Bring 3 heroes. Swap with a two-fist pull-apart (reuses equipHero + swapFx from the finale relay).
   - Swap within a combo window = TAG-IN STRIKE (x2 first hit + shock ring) and a rising COMBO multiplier
     when different heroes get kills in sequence.
   - ASSIST: point + pinch calls a hero hologram's signature (TEMPEST sky strike, ARC missile volley, PSION
     slam, ORION volley, RONIN cross-cut) on a cooldown. Mostly reuse of existing effects.
B. **THE ROOM FIGHTS BACK** (the MR showpiece): meshDetection is already on. Use the scene mesh as
   depth-only occluders so aliens disappear behind the real sofa/table, crawl along real walls, and use
   real tables as cover for the player. (Alternative: DepthSensing, skill `iwsdk-depth-occlusion`.)
   Reality-integrity meter: the Unmaker erases the room, your kills restore it.
C. **Spatial audio**: HRTF PannerNode pool (16) for enemy growls, wind-ups, shots and deaths; listener
   follows the head. Cheap and a big realism win in MR.
D. **SURGE endless + DAILY CHALLENGE**: escalating waves, a boss every 5, seeded by UTC date, streak,
   local bests. Optional global leaderboard (Vercel function + free Upstash/KV, ~half a day, needs the
   owner to create the store). Pure wave generator gets unit tests.
E. **AI Director** (invisible): reads accuracy, damage taken and kill speed to adapt pacing; same signals
   feed the governor and the end-of-run summary.

Stretch (only if A-D are done and stable): phone-as-crowd (QR join, spectators spawn power-ups or hazards
over WebRTC/PeerJS) for the Social award; LLM companion for Agentic Interaction (check the rules'
definition first; thin-wrapper penalty and API-key exposure are real risks).

## Phase 4 - freeze and polish (Nov 12-13)

Perf re-measure on device, fix top 10 papercuts from play-tests, no new features after Nov 13.

## Phase 5 - presentation (Nov 13-16): Polish & Presentation

- Demo video < 3 min, REAL device capture + a phone shot of the player in the room:
  0:00 hook (real room unmade) - 0:10 first kills + swap - 0:40 hero montage (grab, duel, storm) -
  1:20 boss + room restored - 2:00 seated / one-hand / glasses proof - 2:30 daily challenge + URL.
- Devpost write-up mapped to the four criteria; 6 screenshots; 1 GIF; QR + short URL; judge instructions
  ("Quest browser -> open URL -> put controllers down -> ENTER MR").
- Final QA on a clean Quest profile (no saved data), Quest 3 and 3S if available.
- Submit Nov 17. Nov 18 is buffer only.

## Cut line (in order, if time runs out)

Stretch items -> E AI Director -> D leaderboard (keep local daily) -> B occlusion (keep room border and
floor paint) -> A assists (keep swap + combo). Never cut Phase 0-2 or Phase 5.

## Freeze list (do not build)

More heroes, more creatures, more worlds, new menus, new story. Depth over breadth from here on.

## Risks

| Risk | Mitigation |
|---|---|
| Not a Start member / web app not accepted | Phase 0 today; PWA/TWA APK path as the fallback |
| < 60 fps on Quest | Governor + HUD in Phase 1, re-measure after every feature |
| Gestures fail for other players | Calibration + controller-as-hand + play-tests |
| 14 days, one dev, slow 7.7 GB machine | Tiers and cut line above; push after every working step |
| Name clash with "Surge" on the store | Decide in Phase 0 |
