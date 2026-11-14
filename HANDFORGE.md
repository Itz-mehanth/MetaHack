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
  cuts land only where the blade touches; crossing both blades is an X-strike that cuts everything in reach).
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
- Arsenal (arsenal.ts): 2-4 weapons per hero, unlocked by clearing that
  hero's levels and bought in the ARMORY (tabs WEAPONS / UPGRADES / SKINS);
  the projector shows the real weapon model. HAVOC pistol/SMG/shotgun/
  minigun; ARC repulsor/proton beam/swarm rockets; TALON steel/molten/phase;
  TEMPEST thunder/inferno/godbreaker; ORION longbow/volley/blast/storm;
  WEAVER silk/electro/burst; RONIN katana/flame/void; PSION mind/inferno.
  Burn and shock damage-over-time; explosions; quake rings.
  Weapon models use role-named forge materials (scene-assets/lib/forge.ts:
  metal, trim, dark, energy, core); FINISHES (STANDARD, GILDED, CRYSTAL,
  INFERNAL, VOID) restyle the real weapon in hand and in the armory
  (bought per hero in the SKINS tab).
- Physics (physics.ts, pure + tested): Room colliders from MR planes
  (walls, tables; infinite floor) and a time-corrected Verlet solver. Deaths
  are ragdolls (15 points, pooled x8, frozen when settled; scripted fall is
  the fallback), pushed by the killing blow's force (markHit force: shotgun,
  explosions, Godbreaker send bodies flying into real walls). Gibs, dropped
  alien weapons, PSION props, thrown aliens, the shield (ricochets) and the
  hammer (bounces) collide with the real room. Heavy hits knock living
  aliens back metres (stopped by walls). Hit-stop on blade/hammer/shield hits.
- Destructible props (every level; PSION gets all 8 to throw): crates,
  barrels, boulders (break), girders (never), EXPLOSIVE barrels (short fuse,
  fireball, burning aliens, hurt the player within 1.6 m, chain-react).
  Bullets, blades, hammer, shield, punches, meteors, explosions and thrown
  props damage them; non-lethal hits shove them; shards bounce off the real
  room; destroyed props rebuild after 6-10 s. Hook: __surgeProp(kind).
- Creatures (creatures.ts, creature.ts): 30 rigged, animated CC0 monsters
  (Quaternius "Ultimate Monsters", see CREDITS) replace the humanoid aliens
  in most worlds (ROSTER: species per world and role). Roles: drone/armored/
  blade/titan use the "big" family, swarmer the "blob" family, and the new
  FLYER kind (flying family) circles overhead, spits plasma and dive-bombs.
  Models are public/creatures/<id>.glb (clips idle/walk/run/attack/hit/
  death), loaded lazily per world while the map or jump tunnel plays and
  pooled; each has an ink outline, species-coloured ichor and a death clip
  (flyers tumble out of the sky). Champions become giant creatures. Hooks:
  __surgeSpawn(kind, n), enemies listed as kind/species in __surge().
- Duels and weapons: RONIN (and every blade) clashes with ANY enemy's
  weapon (virtual swing arm for creatures), deflects plasma shots back,
  cuts leave straight bright streaks, duellists sometimes block. ORION's
  bow is a recurve with armoured limbs, blade tips, fletched arrow and a
  draw glow (same model in the armory). HAVOC's HELLFIRE LAUNCHER fires
  homing missiles (lock-on cone, back-blast, big blast). ARC's PROTON BEAM
  and UNI-BEAM (palm to chest, push out; 3.5 s, follows the hand) use
  beamfx.ts. VANGUARD's shield is smaller, has a real inside (lining,
  straps), ripples on blocks, trails when thrown and is caught with a pop.
  haptics.ts rumbles controllers/phones on hits (a headset has no motor).
- Power-ups (RAPID = OVERCLOCK, POWER = POWER UP): collecting one recolours
  the gauntlets and weapon energy, adds two tiers of rings/sparks/flames,
  sprays motes off the hands, bursts a ring and the name, and POWER makes
  shots bigger (damage x2). Crowd control: waves are small (3 to 15), a
  per-wave cap on enemies alive at once (Run waits for room), smaller swarm
  bursts, and each wave ends on an ELITE (size x1.25, hp x2.2) that always
  drops a power-up (others drop 22%).
- VESPER, the sorcerer (10th hero, region THE VEIL / VEIL SANCTUM, villain
  MORVETH): two fingers out (isSigilPose) fire runic darts (variants: ASTRAL
  homes, VOID SIGILS burst). Defeated enemies drop rune orbs (only for him);
  an orb loads a random spell (spells.ts), cast with its gesture before 20 s
  run out (CAST button on screens): MANDALA SHIELD (open palm), RIFT PORTAL
  (both palms out), TIME BUBBLE (cup hands, open), BINDING SIGILS (fist, snap
  open), ASTRAL TWINS (spread hands), METEOR SIGIL (raise, slam), HEALING
  ANKH (palms to chest). Visuals in spellfx.ts. Hook: __surgeSpell(id).
- Galaxy map (galaxy.ts): a big spiral-galaxy table with a black-hole core,
  textured planets, lanes and Anchor light columns, tilted to the viewer.
- Room-scale MR: roomborder.ts draws the scanned walls' border (red near
  them); the VR arena follows the player; cages and props spread around the
  walls (roomgeo.ts, tested).
- Skill: shots hit the body (creature hit areas ~60% of their size), a
  shot through the head does x1.8 (HEADSHOT!), walkers sidestep incoming
  shots (normal 30%, hard 55%, elites more; never giants), and aim assist and
  homing narrow with difficulty (easy full, normal reduced, hard none for
  plain bolts; missiles, rockets and astral darts keep guidance).
- Grabs (updateGrabs): every hero except PSION can close a free fist on a creature's head, arm or leg bone (flash marks the zone): head = lift, squeeze, slam; arm = disarm + stun; leg = trip. Pull down hard to slam, open the hand to throw.
- Bosses: entrance lockout + title, SHIELD UP at each phase until the adds fall, floor BARRAGE circles, orb fans, chained death blasts; OBLIVAX finale has 6x health.
- Ground (ground.ts): in MR the scanned floor polygons are repainted per world (grid, lava, rock, ice, void, sand, garden, moss, plate, rune); walls and furniture stay passthrough.
- Tag team (squad.ts): each mission fights with a squad of three (lead, owned heroes, then heroes lent to a new player). Swap by pinching a hero's portrait on the strip below your view (thumbstick on controllers, Q or the TAG IN button on screens; a fists gesture was dropped because RONIN and TALON cross their fists to fight): a TAG-IN quake ring and 4 s of x1.6 damage. Strip at the bottom of the view shows the squad.
- Endless and Daily (endless.ts): main menu ENDLESS (the hero's home world) and DAILY (world and twist rolled from the UTC date, same for everyone). 40 generated waves, a boss every 5th (tougher each time), a named champion on waves 3, 8, 13..., a patch-up after each wave, coin payout at half the campaign rate. Records and the daily streak live in `profile.arcade`. Hooks: `?autostart=endless|daily&day=YYYY-MM-DD`, `__surgeHurt(n)`.
- Gaze and pinch menus (gaze.ts, `updateGaze`): with hands tracked, a reticle follows where you look (the headset's eye-gaze input source when it reports one, else head direction) and a pinch of either hand presses the button under it; poking still works. Built for Meta VR Glasses (gaze + pinch), never run on glasses hardware.
- Opening movie (cinema.ts, cinema-script.ts): a 55 s cinematic that plays all around the player, in a headset or on a screen, before the prologue (first visit only; WATCH INTRO on the how-to-play screen replays it, `?movie=1` plays it at once, `__surgeMovie(t)` scrubs the clock for screenshots). Ten Anchors, OBLIVAX as a black sun with slit eyes, shattering worlds, the Hollow Legion's ship and drop pods, the erasure reaching the real room (it drives the Erasure sphere), ten heroes rising, the title. Captions and a narrator, OBLIVAX, VEX and ECHO speak. Skippable: a firm pinch (under 3.6 cm) that begins during the movie, after the hand has been open for a moment, held for 0.8 s (a fist, or the pinch that pressed START STORY, does not count; gaze.ts SkipPinch), a controller button, Esc/Space/Enter, or the SKIP button (a stray tap does nothing). One sky shader, a few additive meshes, no per-frame allocation.
- Hero story movies (chapter-script.ts, chaptercinema.ts, cinema-kit.ts): the first time a hero's level 1 starts, a ~60 s movie plays all around the player: the region as it was (its skyline of towers, spires or floating ruins), the boss arriving as a black sun with its own eye pattern, the boss's declaration (the recorded level-3 line), the skyline crumbling and the Anchor torn up into the sun, then THE ROAD: three gates lit in turn, the two LORDS (the level 1 and 2 champions) and the boss, each with its place, and the hero rising. Before level 2 and level 3 a short recap plays (the fallen lords in green, the next trial, the boss waiting). Narration is public/vo/ch_<hero>_<n>.mp3, and the pacing follows the recorded lengths. WATCH STORY on the campaign map replays it. Hooks: `?chapter=<hero>&level=1..3`, `__surgeMovie(t)`.
- Voice-over (voice.ts, scripts/vo): 214 spoken lines (the movie, every story panel, every villain taunt) are public/vo/<id>.mp3, rendered offline by Kokoro-82M (Apache 2.0) with an ffmpeg effect chain per character (pitch, tremolo, bit-crush, echo, radio). `node scripts/vo/render.mjs [prefix]` re-renders (see its header for setup); file ids come from voice.ts for both the game and the renderer, and voice.test.ts fails if a line has no file. Sfx.loadVoice/speak play them over a ducked music bus; story text types at the voice's pace.
- Weapon sounds (weaponsfx.ts): every weapon in the arsenal has its own synthesised sound design (fire, draw, swing, hit parts: FM bells, waveshaped grit, tremolo hums, layered thumps; VESPER's runes play a pentatonic scale). `?sounds=1` opens an audition page. Cinema hits (boom, riser, drone, stinger, glass, passby) are in sfx.ts.
- Leaderboards (leaderboard.ts, netboard.ts, api/board.ts): every finished run is filed on its hero's board with the player's name (a poke-able letter keyboard, or a real keyboard on screens; asked once, after the first score). This device keeps each hero's best ten; the LEADERBOARD button on the main menu shows them. With a Redis database connected to the project (Vercel KV / Upstash over REST: env KV_REST_API_URL + KV_REST_API_TOKEN; or any Redis such as Redis Cloud over TCP: env REDIS_URL = redis://default:password@host:port, or rediss:// for TLS) the same screen also shows a shared world board (best score per name); without it the world board reads as offline and nothing else changes. Hooks: `?menu=board|name`, `__surgeScore(hero, name, score)`.
- Shield feedback (vitals.ts, shieldgauge.ts, `updateVitals`): the shield (health, 5 cells) is a gauge always in the lower part of the view, just above the squad strip, labelled SHIELD 4/5 (a child of the camera, redrawn only while it changes), because the bar on the floating HUD board went unnoticed. A hit shakes and swells it, flashes the lost cell white then drains it red with a crack, and plays a glass-break over the hurt thud and a stronger red flash; a restore sweeps green along the cells (SHIELD UP) with rising bells; at 40% or less it turns amber with a SHIELD LOW! pop and a two-note alarm, on the last cell red with LAST SHIELD!, a three-note alarm and a faint ringing; while low the screen edges pulse red, a lub-dub heartbeat plays (every 1.05 s, 0.62 s on the last cell) and the music is low-passed (sfx.muffle). REDUCE FLASHES turns off the shake and swell. The pure state (what was lost, when it ran low, the beat clock) is unit tested in vitals.test.ts; `__surgeHurt(n)` (negative n restores) drives it in tests.
- Comfort and access: SEATED play (AUTO by head height, or forced in Settings): front-arc spawns, lean 15 cm to dodge a melee strike, no room-scale layout. REDUCE FLASHES: no slow-motion or hit-stop, weak lightning and damage flashes. Aim assist, gesture sensitivity and a swappable bow hand already exist.
- Controller fallback (pad.ts): with no hands tracked for 0.7 s and a controller in use, the pointing ray is the flat-screen pointer (trigger attack, grip or A special, B pause, thumbstick tag-in) and the pilot plays the hero's real hand poses.
- Performance (quality.ts, perfhud.ts): `?perf=1` or Settings > PERF HUD shows fps, frame time, the game's own JS time per frame ("game js": if it is small the GPU or engine is the limit), draw calls and the quality tier; `?scale=0.75` renders fewer pixels in a headset, `?lean=1` starts MR without the room-mesh, hit-test and anchor features, `?idle=1` runs none of the game (only the frame counter: the headset's and renderer's own cost) and `?off=ground,particles,ink,auras` turns those parts off, for A/B tests. A CPU profile (V8 sampler over CDP, run headless) found the menu already cost over a third of its JS time in Three's matrix updates: the scene holds about 8,700 objects (pooled enemies, hero models, the carousel, the galaxy...), nearly all hidden, and Three visits every one each frame. sceneperf.ts `skipHiddenBranches` makes the Combat root skip hidden children (`?allnodes=1` turns that off to compare; `__surgeNodes()` lists the nodes by branch), and IWSDK's `spatialUI` feature is off in iwsdk.config.json (its panel system walked the whole scene and allocated a Set every frame, and the game draws its own canvas panels); `warmShaders` compiles every material, hidden pools included, while the jump tunnel plays and when a session starts, so no shader is built in the middle of a fight (`__surgeWarmMs`); a governor drops ink outlines, particles, crowd size, auras and the painted ground when frames run slow and recovers after 30 clean seconds (`?q=0..3` pins a tier). The headset is asked for 72 Hz.
- Look (scenery.ts, ground.ts, holo.ts, decals.ts, shadows.ts): each world has a painted ground and a skyline in VR and on screens; creatures glow at the edges in the world's accent; heroes in the select screen are holograms; blasts light and scorch the floor, portals crack real walls, enemies spread out and show a red ring before a strike; flyers, bosses and props cast contact shadows.
- Audio: enemy wind-ups, shots, portals and blasts are positional (HRTF panners in sfx.ts).
- Suit (suit.ts): armoured forearm sleeves toward an estimated elbow and a
  chest emblem when looking down; no helmet/torso/legs by design.
- Hands push the world: a fast palm slaps enemy shots back at the aliens
  (SLAP!); free hands shove aliens (knockback) and props.
- WEAVER's webs are bullets (webshot.ts): a spinning web net per shot, fired
  as fast as the pose is held (0.17 s), splatting on aliens (snare), props,
  walls and floor; no rope. Whip the hand to throw a webbed alien, fist and
  pull to rip it.
- TEMPEST is a storm (updateStorm): arcs leap from the hammer to nearby
  aliens in hand and in flight; hold it overhead for STORM CALL (sky
  barrage, 8 s cooldown; STORM button on screens). Lightning (lightning.ts)
  is glowing camera-facing ribbons with forks. updateAuras: every hero's
  hands carry motes, sparks, arcs and speed streaks.
- Tuning on device: Settings > GESTURES (NORMAL / VERY SENSITIVE / STRICT:
  fist and open-palm ratios, swing/throw speed multiplier, gestures.ts
  `tuning`), Settings > HAND DEBUG (finger ratios I/M/R/P, detected gesture,
  palm speed and pinch distance floating over each wrist; it also names SIGIL).
  Measured on a Quest 3 from a HAND DEBUG recording (2026-11-14): open palm reads
  1.8-2.0 on every finger, a real fist 0.6-0.95 (1.3 on the index with the thumb
  over it), a relaxed hand rests at 1.4-1.65 (right on the old fist line, so a
  fist now also needs the four fingers to average under line minus 0.25), and a
  deliberate pinch bottoms out at 3 cm between the thumb and index tips (a tight
  fist reads 1 cm), so a pinch counts at once under 3 cm, or under 3.7 cm once it has stayed closed for 0.07 s (a line at 4 cm clicked while the fingers were still closing, gaze.ts PinchEdge), and lets go past 4.5 cm (a wider gap latched a loose hand as "still pinching").
  A pinch with the palm facing you also opens the Meta system menu, which blurs the
  app: the frame loop and all sound freeze (sfx.hold) and carry on when it closes.
- Audio: cinematic synthesised score (music.ts: drums, sub bass, strings,
  brass, choir, bells, per-track lead melody, reverb + echo, 16-bar songs,
  intensity 0 calm / 1 combat / 2 boss) and layered SFX with a hall reverb.
- Heroes also include VANGUARD (energy shield: worn on the off-hand,
  blocks blades, deflects shots, swing + open hand throws it to ricochet).
- Travel: before every level a 4 s jump tunnel (transit.ts: hyperspace
  warp, wormhole, black hole, jet flight through clouds, fire) in the
  destination world's colours; fully covers the room in MR.
- Every level has a boss: levels 1-2 end with a named CHAMPION (giant
  elite, health bar), level 3 the region boss. Both are announced by a
  siren, WARNING banner and red pulses before they arrive.
- Twists (twists.ts): each level adds a rule: METEOR RAIN / LIGHTNING
  STORM (warning circles, impacts hurt aliens and the player), LOW GRAVITY
  (bodies and gibs float), BLACKOUT (lights + HDRI dimmed, palm light only),
  FROM ABOVE (aliens drop through ceiling portals), FRENZY (faster, denser
  spawns). Every boss level has one; shown on the map brief and level intro.
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
- Screen play (phones, tablets, computers; no headset): puppet.ts builds
  full WebXR hand poses from a hand shape (unit tested against gestures.ts);
  pilot.ts choreographs them from taps, holds and swipes (screen-input.ts:
  look pad, gyro, right-drag/keys, pause, special = X-strike or CLAP), so
  every hero runs its real gesture code. Menus are framed for a flat view
  and tapped; SCREEN_TIPS replace the hand coach; portrait shows a rotate
  prompt. Tests: ?dtmax=0.2 (real-time steps on slow renderers),
  __surgeTargets(), __surgeWidget(id), __surgeBolts().
- Landing page (landing.ts): cinematic overlay on a live attract reel
  (attract.ts): a bot plays each hero with its flashiest weapon in its own
  world while a director moves the camera and OBLIVAX looms on the horizon;
  live NOW PLAYING card, glitch cuts, ENTER MR / ENTER VR / PLAY NOW (primary
  chosen per device), sound toggle; HOME returns from the menus. The reel
  never saves and the hero cannot be hurt; ?reel=0 turns it off.

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
