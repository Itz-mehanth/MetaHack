# SURGE: Hands of Heroes

**A hands-only mixed-reality hero-combat game for Meta Quest, in the browser. No controllers, no install.**

OBLIVAX, the Unmaker, is erasing reality, starting with your room. Aliens tear out of your real walls, and you
fight them with nine heroes whose powers are all made with your bare hands: blasters, hammers, bows, katanas,
webs, telekinesis and a shield.

- **Play it:** https://surge.mehanth.com/
- Built for the **Meta VR Start Developer Competition 2026**, Gaming track, New Experience division.
- Original story, heroes, weapons, music and sound effects. No third-party characters or designs.

## Play it in 30 seconds

| Where | What to do |
|---|---|
| **Meta Quest 3 / 3S** (best) | Open the link in the Quest Browser, put the controllers down, tap **ENTER MR** (your room, passthrough) or **ENTER VR**. |
| **Phone, tablet or computer** | Open the link and tap **PLAY NOW**. Touch, mouse or keys drive the same hero code with a "puppet hand". |

The first headset session plays a short opening movie and a guided prologue that teaches seven heroes. If you
would rather jump straight in, open the pause menu and choose **SKIP TRAINING**. All nine heroes are unlocked
from the start so you can try each of them.

## How your hands work

| Hero | Power | Hand language |
|---|---|---|
| **ARC** | Palm blaster, chest beam | Open palm facing out fires. Palm to chest, then push out: a giant beam. |
| **TALON** | Energy claws | Make a fist and the claws extend. Skewer, slash, throw. |
| **TEMPEST** | Storm hammer | Grab it, throw it, call it back. Hold it overhead for a sky barrage of lightning. |
| **ORION** | Light bow | Pinch and pull a string, release to fire. |
| **WEAVER** | Web bullets | Web pose or palm thrust shoots webs. Whip your hand to hurl a webbed alien. |
| **HAVOC** | Plasma pistol and heavier guns | Grab the pistol, point and fire. Upgrades: shotgun, minigun, homing missiles. |
| **RONIN** | Twin katanas | Each fist lights a blade. Cross both blades for an X-strike. Parry enemy weapons. |
| **PSION** | Telekinesis | Open palm locks on to a prop or alien, close to lift, open to throw. |
| **VANGUARD** | Energy shield | Worn on the off hand: block, deflect shots, then throw it to ricochet. |

Any hero can also close a fist on a creature's head, arm or leg to lift, slam, disarm or trip it, and a clap
spends a full OVERDRIVE meter.

**Menus are made for hands.** Poke a button with a fingertip, or look at it and pinch your thumb and index finger
together (the gaze must rest on the button first, so nothing presses by accident). The menu stays where you put it,
and a handle under the panel lets you pinch and drag it anywhere in the room. Pause with the button on your left
wrist.

## What is in the game

- **27 missions in nine worlds**, a champion at the end of the first two levels of every region, a boss per
  region, a finale (CONVERGENCE) where all nine heroes join the last fight, and a story movie for every hero.
- **Mixed reality that uses your room.** Enemies break through your scanned walls, ragdolls, gibs, thrown props
  and dropped weapons collide with real tables and walls, and the villain's erasure eats the room and grows
  back at the end.
- **Replay:** ENDLESS runs, a DAILY challenge (same world and rule for everyone), per-hero leaderboards, an
  armory with 29 weapons, upgrades, skins and finishes. Open the armory straight from the level screen.
- **30 animated creatures** (small cute swarms up to giants), shielded multi-phase bosses, destructible and
  explosive props, level twists (meteors, lightning, low gravity, blackout, enemies from the ceiling).
- **Fully voiced story** and a synthesised score and sound design, all original.
- **Comfort and access:** seated mode, reduce flashes, aim assist, adjustable gesture sensitivity, a swappable
  bow hand, left-handed layouts, gaze-and-pinch selection.

## How it is built

- **IWSDK** (Immersive Web SDK) on **Three.js r185**, TypeScript, Vite, WebXR hand tracking, plane and mesh
  detection for walls. Deployed on Vercel; it is a web page, so there is nothing to install.
- **Gestures from measurements:** every threshold was taken from real Quest 3 hand-tracking recordings (an in-game
  HAND DEBUG overlay), for example an open palm reads 1.8 to 2.0, a real fist 0.6 to 0.95, and a deliberate
  pinch bottoms out at about 3 cm.
- **Our own physics:** a time-corrected Verlet solver with room colliders built from the scan, pooled ragdolls
  that freeze at rest.
- **Performance:** everything is pooled, no per-frame allocation, hidden scene branches are skipped, shaders are
  compiled while the jump tunnel plays, and a quality governor sheds particles, outlines and crowd size if frames
  slip. The headset is asked for 72 Hz.
- **Tests:** about 200 unit tests cover the pure game logic (waves, progression, physics, gestures, leaderboards,
  menus).

The full project brief and design notes are in [HANDFORGE.md](HANDFORGE.md).

## Run it yourself

```sh
npm install
npm run dev        # dev server with the IWSDK managed browser
npm run typecheck
npm test           # unit tests (Vitest)
npm run build      # production build into dist/
```

A shared world leaderboard is optional. With a Redis database connected (Vercel KV / Upstash over REST:
`KV_REST_API_URL` and `KV_REST_API_TOKEN`; or any Redis over TCP: `REDIS_URL`) the leaderboard screen also shows
a world board served by `api/board.ts`. Without it the board reads as offline and nothing else changes.

On Windows, `scripts/patch-iwsdk-windows.mjs` runs after `npm install` to raise a PowerShell timeout in IWSDK
1.1.0-rc.2.

## Credits and licences

Creature models are Quaternius "Ultimate Monsters" and "Animated Mech Pack" (CC0). Icons are from game-icons.net
by Lorc and Delapouite (CC BY 3.0), recoloured. Textures and HDRI from Poly Haven (CC0). Fonts: Bangers, Orbitron
and Rajdhani (SIL OFL). Voice-over is rendered offline with Kokoro-82M (Apache 2.0); no recordings of real people.
Everything else, including heroes, story, weapons, music and sound effects, is original. The full list is in
[public/CREDITS.txt](public/CREDITS.txt).
