# Devpost submission draft (SURGE: Hands of Heroes)

Items marked **[UPDATE]** describe work not shipped yet: change them before you submit. Items marked
**[YOU]** only you can fill in.

## Project overview

**Project name** (60 max, 22 used)
SURGE: Hands of Heroes

**Elevator pitch** (200 max, 179 used)
Your bare hands become ten heroes. In mixed reality, OBLIVAX is unmaking your real room: blast, slash, grab and hurl alien creatures with hand tracking only. No controllers, ever.

## Project details

### About the project (Markdown)

```markdown
## Inspiration
Hand tracking is the one input everybody already owns, yet most hand games feel like tech demos. I wanted the
opposite: a full action game where your hands *are* the superpower, and the room around you is the battlefield.
So I built a saga: OBLIVAX, the Unmaker, has pulled the ten Anchors that hold reality together, and he starts
by erasing your actual room. Every hero you play fights to put it back.

## What it does
SURGE is a hands-only mixed-reality (and VR) hero-combat game. Ten original heroes, each with a power that
lives in a different hand pose:

- **ARC** fires a palm blaster and a chest-reactor beam you steer with your hand
- **TALON** makes a fist to extend energy claws and skewer enemies
- **TEMPEST** grabs a physical storm hammer, throws it, recalls it and calls lightning from the sky
- **ORION** draws a recurve bow with a pinch
- **WEAVER** shoots web bullets and whips webbed aliens across the room
- **HAVOC** wields a pistol, shotgun, minigun or homing missile launcher
- **RONIN** ignites twin katanas with two fists, parries and cuts enemy blades
- **PSION** lifts props and aliens with telekinesis and hurls them
- **VANGUARD** wears an energy shield on the off hand and throws it to ricochet
- **VESPER**, a sorcerer, casts spells with seven distinct hand gestures

Each mission is fought by a squad of three: swap heroes on the fly by touching your fists together and pulling them apart for a TAG-IN strike and a burst of extra damage. Any hero can also reach out, close a fist on a creature's head, arm or leg, then lift, slam, disarm or trip it.
Enemies are nearly 40 rigged creatures and mechs that walk out of your real walls (found with plane
detection), wind up telegraphed attacks, dodge, flinch, ragdoll and break into gibs. There are 30 missions across
10 worlds, shielded multi-phase bosses, a guided prologue, an armory with weapons, upgrades and finishes, a
galaxy-map campaign and a convergence finale where every hero joins the last strike. After the story, ENDLESS keeps going with escalating waves and a tougher boss every fifth wave, and a DAILY CHALLENGE rolls a new world and rule every UTC day, with a streak to keep. Every hero has a leaderboard (name entry works with bare hands). A 55-second cinematic opens the game around you, ending with the Unmaker's erasure reaching your actual room, and every story line and villain taunt is voiced.

## How I built it
SURGE is a WebXR app built with the Immersive Web SDK (IWSDK), TypeScript, Vite and Three.js. It opens from a
link on Quest with no install. Hand poses are classified from the 25 WebXR hand joints (fist, open palm,
pinch, web pose, sigil pose) with tunable thresholds. Plane detection gives the app your walls, floor and
tables: enemies emerge from real walls, props and a ragdoll solver collide with the room, and a border shows
where the scanned room ends. All music and sound effects are synthesised in code (each of the 40+ weapons has its own sound design); the voice-over is
original dialogue rendered offline with an open-source text-to-speech model and per-character effects; heroes, story and VFX are
original. Creatures come from CC0 packs (credited). Game rules are pure TypeScript with 80+ unit tests, and
the whole game also runs on phones and desktops through a "puppet hand" layer that feeds the same gesture code.

## Challenges
- No haptics on bare hands: I faked weight with hit-stop, sound, flashes and physical recoil.
- Gesture reliability across different hands: thresholds are tunable in Settings, with a live hand-debug readout.
- Keeping a skinned-creature MR game fast: pooling, instanced particles, additive sprites instead of post-processing.

## Accomplishments
Ten heroes that feel different in the hand, a story that uses the player's real room, and a game that is
fully playable end to end without ever touching a controller.

## What's next
Tuning gaze-and-pinch on real Meta VR Glasses hardware (menus already use it), a shared world leaderboard (the code is in; it needs a database connected), and co-op for friends on phones.
```

### Built with (25 max, 19 used)
TypeScript, Vite, IWSDK, Immersive Web SDK, WebXR, Three.js, WebXR Hand Input, WebXR Plane Detection,
Passthrough AR, Web Audio API, WebGL, glTF, Vercel, Vitest, Playwright, Node.js, Meta Quest, Canvas 2D, ECS

### "Try it out" links
- **[YOU]** Hosted game URL (the Vercel production URL)
- **[YOU]** GitHub repo (https://github.com/Itz-mehanth/MetaHack): make sure it is public before submitting, or
  leave it out

### Media
- Up to 15 images, JPG/PNG/GIF, 5 MB max, 3:2 ratio. Suggested: landing page, hero carousel, galaxy map, ARC
  beam, RONIN duel, TEMPEST storm, PSION throw, a boss with shield, MR room with enemies in the walls, armory.
- Video: YouTube or Vimeo, public or unlisted, **under 3 minutes (only the first 3 are reviewed)**. Footage from a
  Meta VR device, XR Simulator or an equivalent emulator is allowed, so real Quest capture is best but an
  emulator capture is an acceptable fallback.

## Additional info (judges only)

| Field | Answer |
|---|---|
| Submitter type | **[YOU]** (Individual, unless you have teammates) |
| Country | **[YOU]** |
| Start membership email | **[YOU]** the email on your Meta VR Start membership |
| Team / organization name | **[YOU]** |
| Track | **Gaming** |
| Division | **New.** The first commit is dated 2026-10-25, after the Sep 24 start, so it qualifies as built from scratch during the competition |
| Adapted-updates summary | Leave blank (New division) |
| Build path | The **WebXR / Immersive Web SDK** option (pick whichever entry mentions Web) |
| Release channel URL | **[YOU]** the hosted Vercel URL (the form says WebXR projects give their hosted URL) |
| Meta VR capabilities | Hand tracking (WebXR hand input, 25 joints per hand), passthrough mixed reality (immersive AR), plane detection (walls, floor, tables), Space Setup / room capture request, hands-only input end to end |
| Target launch date | It is live now as a web app. Suggested: "Horizon Store PWA submission Q1 2027, ahead of Meta VR Glasses" **[YOU confirm]** |
| Four checkboxes (member, age, jurisdiction, not an employee) | **[YOU]** only tick what is true |

### Describe how Hand Interactions are implemented

```text
The whole game is controller-free. Every pose is classified from the 25 WebXR hand joints per hand, with
tunable thresholds and a live debug readout.
- Open palm facing out: ARC palm blaster and PSION telekinesis lock-on
- Fist: TALON claws, RONIN blade ignition, TEMPEST hammer grip, grabbing any enemy by head, arm or leg
- Pinch (with the off hand): ORION bow draw; in menus, look at a button and pinch to press it (head or eye gaze), or poke it with the index finger
- Web pose / two-finger sigil: WEAVER web bullets, VESPER runic darts; seven spell gestures for VESPER
- Palm to chest, then push out: ARC chest beam. Clap: overdrive and the finale volley
- Swings are measured by tip and palm velocity: slashes, parries against enemy weapons, slaps that return
  shots, hammer and shield throws, slam-downs
TAG-IN: touch both fists together, then pull them apart to swap to the next hero in your squad.
Physical weapons (hammer, bow, pistol, shield) can be dropped, land on real tables or the floor, and are
re-grabbed or recalled by either hand. A flat-screen "puppet hand" layer feeds the same gesture code on phones
and desktops. Menus are poked with a finger or pressed with look-and-pinch; nothing ever requires a controller.
```

### What makes you excited about the future of VR? (150 words max, 79 used)

```text
Hand tracking is the future because it removes the last barrier: nothing to pick up, pair or charge. Your hands
are the interface, and with passthrough the whole room becomes the stage. I am most excited for Meta VR Glasses:
lightweight, controller-free, always with you. When anyone can open a link and become a hero in their own living
room, VR stops being a destination and becomes an everyday superpower. I want to build for that world.
```

## Submit-day checklist

- [ ] Video is public/unlisted, under 3:00, real gameplay, no AI-generated footage
- [ ] URL opens from a Quest browser on a clean profile and reaches ENTER MR in under 30 s
- [ ] README or Devpost text tells judges: "Open in Quest Browser, put controllers down, press ENTER MR"
- [ ] Re-read "What's next" and "About" against what actually shipped
- [ ] Edit window stays open until the deadline, but submit by Nov 17
