import { type HeroId, HEROES, PLAYABLE } from './heroes.js';
import type { PanelContent, PanelEvent, Widget } from './panel-ui.js';
import {
  buySkin,
  buyUpgrade,
  type Difficulty,
  equippedColor,
  levelsCleared,
  isStageUnlocked,
  MAX_UPGRADE,
  nextUpgradeCost,
  type Profile,
  type Reward,
  SKINS,
  type Stage,
  STAGES,
  upgradeCap,
  upgradeLevel,
  weaponTier,
  UPGRADES,
} from './progression.js';
import { chapterFor, type Speaker } from './story.js';
import { ANCHORS_TO_FINALE, anchorsRecovered, finaleUnlocked, PROLOGUE_DONE } from './saga.js';
import { TWIST_INFO, twistFor } from './twists.js';
import { dailyBestToday, dailyChallenge, dayKey, liveStreak } from './endless.js';
import { type BoardEntry, cleanName, entriesFor, KEY_ROWS, typeKey } from './leaderboard.js';
import { buyFinish, buyWeapon, equippedWeapon, FINISHES, finishFor, ownsFinish, ownsWeapon, weaponById, weaponsFor, weaponUnlocked } from './arsenal.js';

export type Screen = 'main' | 'galaxy' | 'heroes' | 'map' | 'transmission' | 'garage' | 'settings' | 'howto' | 'pause' | 'results' | 'board' | 'name';

/** What the transmission screen shows: one line of dialogue. */
export interface TransmissionView {
  speaker: Speaker;
  name: string;
  title: string;
  color: string;
  text: string;
  index: number;
  total: number;
  /** 0..1 hologram glitch on the portrait, high when a line starts. */
  glitch: number;
}

/** Breaks `text` into lines of at most `width` characters. */
export function wrap(text: string, width: number): string {
  const lines: string[] = [];
  let line = '';
  for (const word of text.split(' ')) {
    if (line && line.length + word.length + 1 > width) {
      lines.push(line);
      line = word;
    } else line = line ? `${line} ${word}` : word;
  }
  if (line) lines.push(line);
  return lines.join('\n');
}

export interface MenuActions {
  play(hero: HeroId, stage: Stage): void;
  resume(): void;
  restart(): void;
  quit(): void;
  /** Profile changed (purchase, setting): persist and re-apply. */
  changed(): void;
  /** Recolour the world behind the menu while browsing stages. */
  preview(worldId: string): void;
  /** Feedback for a refused action (not enough coins, locked). */
  denied(): void;
  /** Feedback for a purchase. */
  bought(): void;
  /** Carousel focus moved to hero `index`. */
  focus(index: number): void;
  /** Map node selected. */
  mapSelect(index: number): void;
  txNext(): void;
  txSkip(): void;
  resetProgress(): void;
  /** Starts an endless run in the hero's home world, or today's daily challenge. */
  endless(hero: HeroId, daily: boolean): void;
  /** Starts the prologue. */
  story(): void;
  /** Plays the opening movie. */
  movie(): void;
  /** Starts the finale, CONVERGENCE. */
  finale(): void;
  /** Leaves the headset session (or returns to the home page on a screen). */
  exit(): void;
  /** Asks the headset to scan the room (walls and furniture). */
  scanRoom(): void;
  /** The leaderboard screen opened on `hero`: fetch the shared board for it. */
  board(hero: HeroId): void;
  /** Plays the hero's story movie (the road to their boss). */
  chapterMovie(hero: HeroId): void;
}

export interface ResultInfo {
  won: boolean;
  stage: Stage;
  reward: Reward;
  score: number;
  kills: number;
  bestCombo: number;
  saved: number;
  hostages: number;
  /** Set for an endless or daily run. */
  endless?: { mode: 'endless' | 'daily'; waves: number; best: number; streak: number; bestStreak: number };
  /** Place earned on the hero's leaderboard (1 to 10), 0 if the score missed it. */
  rank?: number;
}

/** What the shared (online) board holds for a hero. */
export interface NetView {
  hero: HeroId;
  state: 'loading' | 'off' | 'ready';
  entries: readonly BoardEntry[];
}

const BACK: Widget = { id: 'back', x: 1236, y: 150, w: 300, h: 70, label: 'BACK', size: 32 };
const DIFFICULTIES: Difficulty[] = ['easy', 'normal', 'hard'];

function totalStars(profile: Profile): number {
  return Object.values(profile.stars).reduce((a, b) => a + b, 0);
}

/**
 * Screen flow and content for the spatial menu. Owns no rendering: it turns
 * the profile into `PanelContent` and turns panel events into actions.
 */
export class GameMenus {
  screen: Screen = 'main';
  hero: HeroId = 'arc';
  /** Played on a flat screen (taps instead of pokes and wrist buttons). */
  flat = false;
  /** Hero under the carousel spotlight. */
  heroFocus = 0;
  /** Planet (hero index) selected on the galaxy map. */
  galaxyIndex = 0;
  /** Selected level on the campaign map (0-based). */
  mapLevel = 0;
  transmission: TransmissionView | null = null;
  private garageHero: HeroId = 'arc';
  private garageTab: 'weapons' | 'upgrades' | 'skins' = 'weapons';
  /** Where the garage's BACK goes: the main menu, or the level screen it was opened from (so a weapon can be changed without leaving the level choice). */
  private garageReturn: Screen = 'main';
  /** Weapon shown on the armory projector (null: the equipped one). */
  private garageWeapon: string | null = null;

  /** Weapon id the armory hologram should show. */
  get garageWeaponId(): string {
    const w = this.garageWeapon ? weaponById(this.garageWeapon) : undefined;
    return w && w.hero === this.garageHero ? w.id : equippedWeapon(this.profile, this.garageHero).id;
  }

  /** Hero whose weapon the garage armory is showing. */
  get garageHeroId(): HeroId {
    return this.garageHero;
  }
  private confirmReset = false;
  private settingsReturn: Screen = 'main';
  private result: ResultInfo | null = null;
  /** Leaderboard screen: whose board, which board, and what the online board returned. */
  boardHero: HeroId = 'arc';
  private boardScope: 'global' | 'local' = 'global';
  boardNet: NetView | null = null;
  /** Name keyboard: the name being typed and what to do when it is done. */
  private nameDraft = '';
  private nameThen: (() => void) | null = null;

  constructor(
    private profile: Profile,
    private readonly actions: MenuActions,
  ) {}

  setProfile(profile: Profile): void {
    this.profile = profile;
    if (!profile.heroes.includes(this.hero)) this.hero = 'arc';
  }

  open(screen: Screen): void {
    this.screen = screen;
    this.confirmReset = false;
    if (screen === 'map') {
      const stages = this.chapterStages();
      const next = stages.findIndex((st) => isStageUnlocked(this.profile, st) && !this.profile.stars[st.id]);
      this.mapLevel = next >= 0 ? next : stages.filter((st) => isStageUnlocked(this.profile, st)).length - 1;
      this.actions.preview(chapterFor(this.hero).worldId);
    }
    if (screen === 'heroes') this.heroFocus = Math.max(0, HEROES.findIndex((h) => h.id === this.hero));
    if (screen === 'main' || screen === 'heroes' || screen === 'garage') this.actions.preview('neon-grid');
  }

  showResults(info: ResultInfo): void {
    this.result = info;
    this.open('results');
  }

  /** The selected hero's three campaign stages. */
  chapterStages(hero: HeroId = this.hero): Stage[] {
    const worldId = chapterFor(hero).worldId;
    return STAGES.filter((st) => st.world.id === worldId);
  }

  /** The hero's first unlocked level without stars, else their last unlocked one. */
  nextStage(): Stage {
    const stages = this.chapterStages();
    const open = stages.filter((st) => isStageUnlocked(this.profile, st));
    return open.find((st) => !this.profile.stars[st.id]) ?? open[open.length - 1];
  }

  get mapStage(): Stage {
    return this.chapterStages()[this.mapLevel];
  }

  content(): PanelContent {
    const p = this.profile;
    const accent = equippedColor(p, this.hero);
    switch (this.screen) {
      case 'main':
        return this.mainScreen(accent);
      case 'galaxy':
        return this.galaxyScreen();
      case 'heroes':
        return this.heroesScreen(accent);
      case 'map':
        return this.mapScreen();
      case 'transmission':
        return this.transmissionScreen();
      case 'garage':
        return this.garageScreen();
      case 'settings':
        return this.settingsScreen(accent);
      case 'howto':
        return this.howtoScreen(accent);
      case 'pause':
        return this.pauseScreen(accent);
      case 'results':
        return this.resultsScreen(accent);
      case 'board':
        return this.boardScreen(accent);
      case 'name':
        return this.nameScreen(accent);
    }
  }

  private mainScreen(accent: string): PanelContent {
    const hero = HEROES.find((h) => h.id === this.hero)!;
    const next = this.nextStage();
    const begun = this.profile.unlocks.includes(PROLOGUE_DONE);
    const anchors = anchorsRecovered(this.profile).length;
    const finale = finaleUnlocked(this.profile);
    const play: Widget = begun
      ? {
          id: 'play',
          x: 640,
          y: 220,
          w: 896,
          h: 200,
          label: 'PLAY',
          icon: 'play',
          sub: `${chapterFor(this.hero).region}: ${chapterFor(this.hero).levels[next.number - 1].location}`,
          selected: true,
          color: accent,
          size: 80,
        }
      : { id: 'story', x: 640, y: 220, w: 896, h: 200, label: 'START STORY', icon: 'play', sub: 'PROLOGUE: learn seven hero powers', selected: true, color: '#FF4FD8', size: 72 };
    return {
      title: 'SURGE',
      subtitle: begun ? `OBLIVAX is unmaking reality. Win back the Anchors. ${anchors}/${HEROES.length}   |   Stars ${totalStars(this.profile)}/${STAGES.length * 3}` : 'Hands of Heroes',
      coins: this.profile.coins,
      accent,
      widgets: [
        {
          id: 'main-hero',
          kind: 'tile',
          x: 64,
          y: 220,
          w: 520,
          h: 700,
          label: hero.name,
          sub: hero.power.toUpperCase(),
          detail: `${hero.how}\n\nTap to change hero`,
          color: accent,
          badge: 'CHANGE',
          size: 64,
          icon: hero.id,
        },
        play,
        { id: 'garage', x: 640, y: 450, w: 438, h: 150, label: 'GARAGE', sub: 'Upgrades & skins', icon: 'garage' },
        { id: 'settings', x: 1098, y: 450, w: 438, h: 150, label: 'SETTINGS', sub: 'Sound & difficulty', icon: 'settings' },
        { id: 'howto', x: 640, y: 630, w: 280, h: 150, label: 'HOW TO PLAY', icon: 'map', size: 34 },
        { id: 'endless', x: 936, y: 630, w: 280, h: 150, label: 'ENDLESS', sub: this.profile.arcade.endlessBest > 0 ? `Best wave ${this.profile.arcade.endlessBest}` : 'A boss every 5 waves', icon: 'skull', size: 40 },
        { id: 'daily', x: 1232, y: 630, w: 304, h: 150, label: 'DAILY', sub: this.dailySub(), icon: 'timer', color: '#FFD23F', size: 40 },
        { id: 'exit', x: 1236, y: 150, w: 300, h: 70, label: this.flat ? 'HOME' : 'EXIT', sub: this.flat ? undefined : 'Back to the site', size: 32, color: '#FF3B5C' },
        { id: 'board', x: 920, y: 150, w: 300, h: 70, label: 'LEADERBOARD', size: 26 },
        begun
          ? {
              id: 'finale',
              x: 640,
              y: 800,
              w: 896,
              h: 120,
              label: finale ? 'CONVERGENCE: FACE OBLIVAX' : `ANCHORS ${anchors} / ${HEROES.length}`,
              sub: finale ? 'The final battle. Every hero, one fight.' : `Beat ${ANCHORS_TO_FINALE - anchors} more region bosses to face OBLIVAX`,
              icon: finale ? 'skull' : 'lock',
              color: '#FF4FD8',
              selected: finale,
              disabled: !finale,
              size: 40,
            }
          : {
              id: 'tip',
              kind: 'text',
              x: 640,
              y: 830,
              w: 896,
              h: 80,
              label: this.flat ? 'Tap the buttons. The II button pauses a fight.' : 'Poke a button, or look at it and pinch. Left wrist button pauses a fight.',
              size: 30,
              color: 'rgba(233,252,255,0.6)',
            },
      ],
    };
  }

  /** The DAILY button's second line: today's twist, plus the streak or today's best. */
  private dailySub(): string {
    const day = dayKey(new Date());
    const today = dailyChallenge(day);
    const best = dailyBestToday(this.profile, day);
    const streak = liveStreak(this.profile, day);
    const name = TWIST_INFO[today.twist].name;
    if (best > 0) return `Best ${best}${streak > 1 ? ` | ${streak} day streak` : ''}`;
    return streak > 0 ? `${name} | ${streak} day streak` : name;
  }

  private galaxyScreen(): PanelContent {
    const p = this.profile;
    const hero = HEROES[this.galaxyIndex] ?? HEROES[0];
    const chapter = chapterFor(hero.id);
    const cleared = chapter.levels.filter((_, i) => (p.stars[`${chapter.worldId}-${i + 1}`] ?? 0) > 0).length;
    const anchors = anchorsRecovered(p).length;
    const finale = finaleUnlocked(p);
    const color = equippedColor(p, hero.id);
    return {
      title: 'THE ANCHOR WAR',
      subtitle: `Anchors ${anchors}/${HEROES.length}. ${this.flat ? 'Tap' : 'Poke'} a planet below to choose a front.`,
      coins: p.coins,
      accent: color,
      widgets: [
        { id: 'back', x: 1236, y: 150, w: 300, h: 70, label: 'BACK', size: 32 },
        {
          id: 'galaxy-info',
          kind: 'text',
          x: 80,
          y: 250,
          w: 1440,
          h: 160,
          label: `${hero.name}  |  ${chapter.region}  vs  ${chapter.villain.name}\n${cleared}/3 levels cleared  |  Anchor: ${cleared >= 3 ? 'SECURED' : 'held by ' + chapter.villain.name}`,
          size: 44,
          color: '#FFFFFF',
        },
        {
          id: 'galaxy-go',
          x: 64,
          y: 440,
          w: 900,
          h: 150,
          label: `DEPLOY ${hero.name}`,
          sub: `${chapter.region}: ${chapter.levels[Math.min(2, cleared)].location}`,
          icon: hero.id,
          selected: true,
          color,
          size: 56,
        },
        {
          id: 'galaxy-finale',
          x: 996,
          y: 440,
          w: 540,
          h: 150,
          label: 'CONVERGENCE',
          sub: finale ? 'Face OBLIVAX' : `Needs 3 Anchors (${anchors})`,
          icon: finale ? 'skull' : 'lock',
          color: '#FF4FD8',
          disabled: !finale,
          size: 44,
        },
      ],
    };
  }

  /** Status line for a hero in the carousel. */
  heroStatus(id: HeroId): string {
    if (!PLAYABLE.includes(id)) return 'COMING SOON';
    if (id === this.hero) return 'SELECTED';
    return 'READY';
  }

  /** Moves the carousel focus; returns true if it changed. */
  moveFocus(direction: number): boolean {
    const next = Math.max(0, Math.min(HEROES.length - 1, this.heroFocus + direction));
    if (next === this.heroFocus) return false;
    this.heroFocus = next;
    return true;
  }

  private heroesScreen(_accent: string): PanelContent {
    const hero = HEROES[this.heroFocus];
    const color = equippedColor(this.profile, hero.id);
    const playable = PLAYABLE.includes(hero.id);
    const pick = !playable ? 'COMING SOON' : hero.id === this.hero ? 'SELECTED - TAP TO PLAY' : 'SELECT HERO';
    return {
      title: 'CHOOSE YOUR HERO',
      subtitle: this.flat ? 'Tap the arrows to meet each hero' : 'Swipe an open hand sideways (one hero per swipe), or poke the arrows',
      coins: this.profile.coins,
      accent: color,
      widgets: [
        BACK,
        { id: 'hero-prev', x: 64, y: 250, w: 220, h: 520, label: '<', size: 110, disabled: this.heroFocus === 0, color },
        {
          id: 'hero-info',
          kind: 'tile',
          x: 310,
          y: 250,
          w: 980,
          h: 520,
          label: hero.name,
          sub: hero.power.toUpperCase(),
          detail: `${hero.how}\n\n${this.heroStatus(hero.id)}`,
          color,
          size: 84,
          icon: hero.id,
        },
        { id: 'hero-next', x: 1316, y: 250, w: 220, h: 520, label: '>', size: 110, disabled: this.heroFocus === HEROES.length - 1, color },
        { id: 'hero-pick', x: 310, y: 800, w: 980, h: 140, label: pick, selected: playable, disabled: !playable, color, size: 48, icon: 'play' },
      ],
    };
  }

  private mapScreen(): PanelContent {
    const chapter = chapterFor(this.hero);
    const stages = this.chapterStages();
    const accent = equippedColor(this.profile, this.hero);
    const stage = stages[this.mapLevel];
    const story = chapter.levels[this.mapLevel];
    const boss = this.mapLevel === stages.length - 1;
    const widgets: Widget[] = [BACK];
    stages.forEach((st, i) => {
      const unlocked = isStageUnlocked(this.profile, st);
      const stars = this.profile.stars[st.id] ?? 0;
      widgets.push({
        id: `map-level:${i}`,
        x: 64 + i * 500,
        y: 240,
        w: 470,
        h: 100,
        label: `${i + 1}. ${chapter.levels[i].location}`,
        sub: unlocked ? '\u2605'.repeat(stars) + '\u2606'.repeat(3 - stars) : 'LOCKED',
        size: 30,
        color: i === stages.length - 1 ? chapter.villain.color : accent,
        selected: i === this.mapLevel,
        disabled: !unlocked,
        icon: !unlocked ? 'lock' : i === stages.length - 1 ? 'skull' : 'radar',
      });
    });
    const unlocked = this.profile.unlocks.includes(story.reward.id);
    widgets.push(
      {
        id: 'brief',
        kind: 'text',
        x: 80,
        y: 380,
        w: 1440,
        h: 300,
        label: `${boss ? 'BOSS: ' : ''}${story.location}\n${wrap(story.blurb, 70)}`,
        size: 38,
        color: '#FFFFFF',
      },
      {
        id: 'brief-info',
        kind: 'text',
        x: 80,
        y: 600,
        w: 1440,
        h: 150,
        label: `${TWIST_INFO[twistFor(stage.id)].name ? `TWIST: ${TWIST_INFO[twistFor(stage.id)].name}   |   ` : ''}Hostages: ${story.hostages}   |   ${stage.objective}\nReward: ${story.reward.name}${unlocked ? ' (earned)' : ''} - ${story.reward.description}`,
        size: 32,
        color: accent,
      },
      { id: 'start', x: 64, y: 790, w: 620, h: 150, label: boss ? 'FACE THE BOSS' : 'START MISSION', selected: true, color: accent, size: 56, icon: boss ? 'skull' : 'play' },
      { id: 'map-garage', x: 704, y: 790, w: 320, h: 150, label: 'ARMORY', sub: `${HEROES.find((h) => h.id === this.hero)!.name}: weapons, upgrades`, color: accent, size: 44, icon: 'garage' },
      { id: 'difficulty', x: 1056, y: 790, w: 480, h: 150, label: 'DIFFICULTY', sub: this.profile.settings.difficulty.toUpperCase(), color: accent },
      { id: 'chapter-movie', x: 1056, y: 698, w: 480, h: 80, label: 'WATCH STORY', size: 32 },
    );
    return {
      title: chapter.region,
      subtitle: `${HEROES.find((h) => h.id === this.hero)!.name} vs ${chapter.villain.name}  |  Boss holds an ANCHOR (${anchorsRecovered(this.profile).length}/${HEROES.length} recovered)`,
      coins: this.profile.coins,
      accent,
      widgets,
    };
  }

  private transmissionScreen(): PanelContent {
    const tx = this.transmission;
    if (tx == null) return { title: 'TRANSMISSION', accent: '#FFFFFF', widgets: [] };
    return {
      title: 'INCOMING TRANSMISSION',
      subtitle: `${tx.name}${tx.title ? ` - ${tx.title}` : ''}`,
      accent: tx.color,
      widgets: [
        { id: 'portrait', kind: 'portrait', x: 64, y: 220, w: 420, h: 560, label: tx.speaker, color: tx.color, value: tx.glitch },
        { id: 'tx-text', kind: 'text', x: 530, y: 260, w: 1000, h: 480, label: tx.text, size: 54, color: '#FFFFFF' },
        { id: 'tx-count', kind: 'text', x: 530, y: 720, w: 1000, h: 40, label: `${tx.index + 1} / ${tx.total}`, size: 30, color: tx.color },
        { id: 'tx-next', x: 530, y: 800, w: 480, h: 130, label: tx.index + 1 < tx.total ? 'NEXT' : 'CONTINUE', selected: true, color: tx.color },
        { id: 'tx-skip', x: 1050, y: 800, w: 480, h: 130, label: 'SKIP' },
      ],
    };
  }

  private garageScreen(): PanelContent {
    const p = this.profile;
    const hero = this.garageHero;
    const accent = equippedColor(p, hero);
    const widgets: Widget[] = [BACK];
    const owned = HEROES.filter((h) => p.heroes.includes(h.id) && PLAYABLE.includes(h.id));
    // One row of hero tabs, sized to fit however many are owned.
    const tab = Math.min(270, (1472 - (owned.length - 1) * 12) / Math.max(1, owned.length));
    owned.forEach((h, i) => {
      widgets.push({
        id: `garage-hero:${h.id}`,
        x: 64 + i * (tab + 12),
        y: 230,
        w: tab,
        h: 76,
        label: h.name,
        size: tab < 200 ? 26 : 30,
        color: equippedColor(p, h.id),
        selected: h.id === hero,
      });
    });
    (['weapons', 'upgrades', 'skins'] as const).forEach((tab, i) => {
      widgets.push({ id: `garage-tab:${tab}`, x: 64 + i * 250, y: 150, w: 235, h: 70, label: tab.toUpperCase(), size: 30, selected: this.garageTab === tab, color: accent });
    });
    if (this.garageTab === 'weapons') {
      // The arsenal: every weapon for this hero, equip / buy / locked.
      const list = weaponsFor(hero);
      const equipped = equippedWeapon(p, hero).id;
      const shown = this.garageWeaponId;
      const w = (1472 - (list.length - 1) * 16) / list.length;
      list.forEach((weapon, i) => {
        const owned = ownsWeapon(p, weapon.id);
        const open = weaponUnlocked(p, weapon);
        const status = weapon.id === equipped ? 'EQUIPPED' : owned ? 'TAP TO EQUIP' : !open ? `CLEAR LEVEL ${weapon.requires}` : `${weapon.price} C`;
        widgets.push({
          id: `weapon:${weapon.id}`,
          kind: 'tile',
          x: 64 + i * (w + 16),
          y: 330,
          w,
          h: 600,
          label: weapon.name,
          sub: status,
          detail: wrap(weapon.tagline, Math.floor(w / 22)),
          color: !owned && !open ? '#666677' : weapon.color ?? accent,
          badge: weapon.id === shown ? 'VIEWING' : undefined,
          selected: weapon.id === equipped,
          size: w < 360 ? 40 : 48,
          icon: owned ? hero : open ? 'coins' : 'lock',
        });
      });
    }
    const rows = this.garageTab === 'upgrades' ? UPGRADES.filter((u) => u.hero === 'all' || u.hero === hero) : [];
    rows.forEach((u, r) => {
      const y = 330 + r * 128;
      const level = upgradeLevel(p, u.id);
      const cost = nextUpgradeCost(p, u.id);
      const capped = cost != null && level >= upgradeCap(p, u.id);
      const pips = '■'.repeat(level) + '□'.repeat(MAX_UPGRADE - level);
      widgets.push(
        { id: `up-name:${u.id}`, kind: 'text', x: 80, y: y + 4, w: 700, h: 40, label: u.name, size: 40, color: '#FFFFFF' },
        { id: `up-desc:${u.id}`, kind: 'text', x: 80, y: y + 58, w: 700, h: 40, label: u.description, size: 30 },
        { id: `up-pips:${u.id}`, kind: 'text', x: 820, y: y + 28, w: 300, h: 50, label: pips, size: 44, color: accent },
        {
          id: `upgrade:${u.id}`,
          x: 1200,
          y: y + 6,
          w: 336,
          h: 104,
          label: cost == null ? 'MAX' : capped ? 'LOCKED' : 'UPGRADE',
          sub: cost == null ? undefined : capped ? `Clear ${chapterFor(hero).region} ${levelsCleared(p, hero) + 1}` : `${cost} C`,
          disabled: cost == null || capped,
          color: cost != null && !capped && p.coins >= cost ? accent : '#888899',
          size: 34,
          icon: u.hero === 'all' ? 'shield' : u.hero,
        },
      );
    });
    (this.garageTab === 'skins' ? SKINS.filter((s) => s.hero === hero) : []).forEach((skin, i) => {
      const ownedSkin = p.skins.includes(skin.id);
      const equipped = equippedColor(p, hero) === skin.color;
      widgets.push({
        id: `skin:${skin.id}`,
        x: 64 + i * 490,
        y: 360,
        w: 470,
        h: 200,
        label: skin.name,
        sub: equipped ? 'EQUIPPED' : ownedSkin ? 'EQUIP' : `${skin.price} C`,
        color: skin.color,
        selected: equipped,
        size: 32,
        icon: hero,
      });
    });
    if (this.garageTab === 'skins') {
      // Weapon finishes: a full restyle of the hero's weapon.
      const current = finishFor(p, hero).id;
      widgets.push({ id: 'finish-title', kind: 'text', x: 80, y: 600, w: 1440, h: 50, label: 'WEAPON FINISH', size: 40, color: '#FFFFFF' });
      const w = (1472 - 4 * 16) / 5;
      FINISHES.forEach((finish, i) => {
        const owned = ownsFinish(p, hero, finish.id);
        widgets.push({
          id: `finish:${finish.id}`,
          x: 64 + i * (w + 16),
          y: 680,
          w,
          h: 200,
          label: finish.name,
          sub: finish.id === current ? 'EQUIPPED' : owned ? 'EQUIP' : `${finish.price} C`,
          color: finish.energy ?? accent,
          selected: finish.id === current,
          size: 34,
        });
      });
    }
    const tier = weaponTier(p, hero);
    widgets.push({ id: 'tier', kind: 'text', x: 830, y: 166, w: 380, h: 40, label: `${HEROES.find((h) => h.id === hero)!.name}  TIER ${tier}/5`, size: 34, color: accent });
    return {
      title: 'ARMORY',
      coins: p.coins,
      accent,
      widgets,
    };
  }

  private settingsScreen(accent: string): PanelContent {
    const s = this.profile.settings;
    return {
      title: 'SETTINGS',
      coins: this.profile.coins,
      accent,
      widgets: [
        BACK,
        { id: 'music', kind: 'slider', x: 64, y: 230, w: 1000, h: 110, label: 'MUSIC', value: s.music },
        { id: 'sfx', kind: 'slider', x: 64, y: 370, w: 1000, h: 110, label: 'SOUND EFFECTS', value: s.sfx },
        { id: 'gestures', x: 1100, y: 230, w: 436, h: 110, label: 'GESTURES', sub: s.gestures === 'high' ? 'VERY SENSITIVE' : s.gestures === 'low' ? 'STRICT' : 'NORMAL', selected: s.gestures !== 'normal' },
        { id: 'handdebug', x: 1100, y: 370, w: 436, h: 110, label: 'HAND DEBUG', sub: s.handDebug ? 'ON: VALUES ON HANDS' : 'OFF', selected: s.handDebug },
        { id: 'aim', x: 64, y: 530, w: 460, h: 110, label: 'AIM ASSIST', sub: s.aimAssist ? 'ON' : 'OFF', selected: s.aimAssist },
        { id: 'difficulty', x: 544, y: 530, w: 460, h: 110, label: 'DIFFICULTY', sub: s.difficulty.toUpperCase() },
        { id: 'lefty', x: 1024, y: 530, w: 512, h: 110, label: 'BOW HAND', sub: s.leftHanded ? 'RIGHT HAND' : 'LEFT HAND' },
        { id: 'scan', x: 1284, y: 690, w: 252, h: 110, label: 'SCAN ROOM', size: 30 },
        { id: 'spawns', x: 704, y: 690, w: 560, h: 110, label: 'ENEMIES COME FROM', sub: s.allAround ? 'ALL AROUND (ROOM-SCALE)' : 'AHEAD', selected: s.allAround },
        {
          id: 'reset',
          x: 64,
          y: 690,
          w: 620,
          h: 110,
          label: this.confirmReset ? 'TAP AGAIN TO ERASE' : 'RESET PROGRESS',
          color: '#FF3B5C',
          size: 34,
        },
        { id: 'seat', x: 64, y: 850, w: 500, h: 80, label: 'PLAY STYLE', sub: s.seated === 'on' ? 'SEATED' : s.seated === 'off' ? 'STANDING' : 'AUTO (BY HEIGHT)', selected: s.seated === 'on', size: 30 },
        { id: 'calm', x: 584, y: 850, w: 500, h: 80, label: 'REDUCE FLASHES', sub: s.calm ? 'ON: NO SLOW-MO OR STROBES' : 'OFF', selected: s.calm, size: 30 },
        { id: 'perfhud', x: 1104, y: 850, w: 432, h: 80, label: 'PERF HUD', sub: s.perfHud ? 'ON' : 'OFF', selected: s.perfHud, size: 30 },
        {
          id: 'settings-note',
          kind: 'text',
          x: 64,
          y: 942,
          w: 1470,
          h: 56,
          label: 'Progress, coins and settings are saved on this device. Subtitles always show.',
          size: 30,
        },
      ],
    };
  }

  private howtoScreen(accent: string): PanelContent {
    const lines = HEROES.map((h) => `${h.name.padEnd(8)} ${h.power} - ${this.flat ? h.tap : h.how}`).join('\n');
    return {
      title: 'HOW TO PLAY',
      subtitle: 'Enemies breach your space. Stop them before they reach you.',
      coins: this.profile.coins,
      accent,
      widgets: [
        BACK,
        { id: 'howto-text', kind: 'text', x: 80, y: 250, w: 1440, h: 500, label: lines, size: 34 },
        { id: 'story', x: 1036, y: 150, w: 180, h: 70, label: 'PROLOGUE', size: 26 },
        { id: 'movie', x: 1236, y: 150, w: 300, h: 70, label: 'WATCH INTRO', size: 26 },
        {
          id: 'howto-more',
          kind: 'text',
          x: 80,
          y: 720,
          w: 1440,
          h: 200,
          label:
            `Chain kills for a combo multiplier. Free hostages and keep your shield for 3 stars.\n${this.flat ? 'II button: pause. Press CLAP! when OVERDRIVE is full.' : 'Left wrist button: pause. Clap when OVERDRIVE is full.'}\nIcons: game-icons.net (Lorc, Delapouite), CC BY 3.0.`,
          size: 32,
          color: 'rgba(233,252,255,0.7)',
        },
      ],
    };
  }

  private pauseScreen(accent: string): PanelContent {
    return {
      title: 'PAUSED',
      coins: this.profile.coins,
      accent,
      widgets: [
        { id: 'resume', x: 400, y: 230, w: 800, h: 150, label: 'RESUME', selected: true, color: accent, size: 56, icon: 'play' },
        { id: 'restart', x: 400, y: 410, w: 800, h: 130, label: 'RESTART STAGE', icon: 'timer' },
        { id: 'pause-settings', x: 400, y: 570, w: 800, h: 130, label: 'SETTINGS', icon: 'settings' },
        { id: 'quit', x: 400, y: 730, w: 800, h: 130, label: 'QUIT TO WAR MAP', color: '#FF3B5C', icon: 'map' },
        { id: 'exit', x: 1236, y: 150, w: 300, h: 70, label: this.flat ? 'HOME' : 'EXIT', size: 32, color: '#FF3B5C' },
      ],
    };
  }

  private resultsScreen(accent: string): PanelContent {
    const r = this.result!;
    if (r.endless) return this.endlessResults(r, r.endless, accent);
    const next = STAGES[r.stage.index + 1];
    const canNext = r.won && next != null && next.world.id === r.stage.world.id && isStageUnlocked(this.profile, next);
    const story = chapterFor(this.hero).levels[r.stage.number - 1];
    const unlockedLine = r.reward.unlocked && story ? `\nNEW POWER UNLOCKED: ${story.reward.name} - ${story.reward.description}` : '';
    const stars = '★'.repeat(r.reward.stars) + '☆'.repeat(3 - r.reward.stars);
    return {
      title: r.won ? 'VICTORY' : 'DEFEATED',
      subtitle: story ? `${chapterFor(this.hero).region} - ${story.location}` : r.stage.name,
      coins: this.profile.coins,
      accent: r.won ? accent : '#FF3B5C',
      widgets: [
        { id: 'res-stars', kind: 'text', x: 80, y: 250, w: 1440, h: 120, label: stars, size: 110, align: 'center', color: '#FFD23F' },
        {
          id: 'res-stats',
          kind: 'text',
          x: 80,
          y: 420,
          w: 1440,
          h: 300,
          align: 'center',
          size: 38,
          label: `Score ${r.score.toLocaleString('en-US')}   |   Kills ${r.kills}   |   Best combo x${r.bestCombo}\n${r.hostages > 0 ? `Hostages saved ${r.saved}/${r.hostages}   |   ` : ''}+${r.reward.coins} coins${r.reward.newBest ? '   |   NEW BEST!' : ''}${unlockedLine}${this.rankLine(r)}`,
        },
        { id: 'next', x: 64, y: 780, w: 470, h: 140, label: 'NEXT MISSION', disabled: !canNext, selected: canNext, color: accent, icon: 'play' },
        { id: 'retry', x: 565, y: 780, w: 470, h: 140, label: 'RETRY', icon: 'timer' },
        { id: 'menu', x: 1066, y: 780, w: 470, h: 140, label: 'WAR MAP', icon: 'map' },
      ],
    };
  }

  /** Results for an endless or daily run: waves cleared, best, streak. */
  private endlessResults(r: ResultInfo, e: NonNullable<ResultInfo['endless']>, accent: string): PanelContent {
    const daily = e.mode === 'daily';
    const lines = [
      `Score ${r.score.toLocaleString('en-US')}   |   Kills ${r.kills}   |   Best combo x${r.bestCombo}`,
      `+${r.reward.coins} coins${r.reward.newBest ? `   |   NEW ${daily ? "TODAY'S " : ''}BEST!` : `   |   ${daily ? "Today's best" : 'Best'} ${e.best}`}`,
    ];
    if (daily && e.streak > 0) lines.push(`${e.streak} day streak${e.bestStreak > e.streak ? `   |   best ${e.bestStreak}` : ''}   |   Come back tomorrow for a new world`);
    const placed = this.rankLine(r).trim();
    if (placed) lines.push(placed);
    return {
      title: r.won ? 'LEGENDARY' : 'RUN OVER',
      subtitle: `${daily ? 'DAILY CHALLENGE' : 'ENDLESS'} - ${r.stage.world.name}`,
      coins: this.profile.coins,
      accent: r.won ? accent : '#FF3B5C',
      widgets: [
        { id: 'res-waves', kind: 'text', x: 80, y: 220, w: 1440, h: 90, label: 'WAVES CLEARED', size: 44, align: 'center', color: 'rgba(233,252,255,0.75)' },
        { id: 'res-stars', kind: 'text', x: 80, y: 300, w: 1440, h: 180, label: String(e.waves), size: 170, align: 'center', color: '#FFD23F' },
        { id: 'res-stats', kind: 'text', x: 80, y: 500, w: 1440, h: 240, align: 'center', size: 38, label: lines.join('\n') },
        { id: 'retry', x: 64, y: 780, w: 700, h: 140, label: 'RUN AGAIN', selected: true, color: accent, icon: 'play' },
        { id: 'back', x: 836, y: 780, w: 700, h: 140, label: 'MAIN MENU', icon: 'map' },
      ],
    };
  }

  // ---------------------------------------------------------------- leaderboard

  /** " | LEADERBOARD #3" for a score that made the hero's board. */
  private rankLine(r: ResultInfo): string {
    return r.rank != null && r.rank > 0 ? `\nLEADERBOARD #${r.rank}   |   ${this.profile.name || 'PLAYER'}` : '';
  }

  /** Prepares the name keyboard; `then` runs when the player is done (or cancels). */
  beginName(then: () => void): void {
    this.nameDraft = this.profile.name;
    this.nameThen = then;
  }

  /**
   * A key from a real keyboard (screens): returns true if the name screen used it,
   * so the caller redraws.
   */
  typeName(key: string): boolean {
    if (this.screen !== 'name') return false;
    if (key === 'Enter') this.finishName();
    else if (key === 'Backspace') this.nameDraft = typeKey(this.nameDraft, 'DEL');
    else if (key === ' ') this.nameDraft = typeKey(this.nameDraft, 'SPACE');
    else if (key.length === 1) this.nameDraft = typeKey(this.nameDraft, key.toUpperCase());
    else return false;
    return true;
  }

  /** Saves the typed name (PLAYER if left empty) and carries on. */
  private finishName(): void {
    this.profile.name = cleanName(this.nameDraft) || 'PLAYER';
    this.actions.changed();
    const then = this.nameThen;
    this.nameThen = null;
    if (then) then();
    else this.open('board');
  }

  /** The online board's answer for `hero` (null: unreachable). Ignored if the player has moved on. */
  setNetBoard(hero: HeroId, value: { enabled: boolean; entries: readonly BoardEntry[] } | null): void {
    if (hero !== this.boardHero) return;
    this.boardNet = { hero, state: value != null && value.enabled ? 'ready' : 'off', entries: value?.entries ?? [] };
  }

  private boardScreen(accent: string): PanelContent {
    const hero = HEROES.find((h) => h.id === this.boardHero) ?? HEROES[0];
    const net = this.boardNet != null && this.boardNet.hero === hero.id ? this.boardNet : null;
    const online = net?.state === 'ready';
    const world = this.boardScope === 'global' && online;
    const list = world ? net!.entries : entriesFor(this.profile.board, hero.id);
    const note = net == null || net.state === 'loading' ? 'Loading the world board...' : net.state === 'off' ? 'The world board is offline: showing this device.' : '';
    const widgets: Widget[] = [
      BACK,
      { id: 'board-prev', x: 64, y: 232, w: 200, h: 80, label: 'PREV', size: 32 },
      { id: 'board-hero', kind: 'text', x: 280, y: 226, w: 1040, h: 92, label: hero.name, size: 64, align: 'center', color: hero.color },
      { id: 'board-next', x: 1336, y: 232, w: 200, h: 80, label: 'NEXT', size: 32 },
    ];
    if (list.length === 0) {
      widgets.push({ id: 'board-empty', kind: 'text', x: 80, y: 400, w: 1440, h: 300, align: 'center', size: 40, color: 'rgba(233,252,255,0.8)', label: `No scores yet for ${hero.name}.\nFinish a mission, an endless run or the daily to take #1.` });
    }
    list.slice(0, 10).forEach((e, i) => {
      const mine = e.name === this.profile.name && this.profile.name !== '';
      widgets.push({
        id: `board-row:${i}`,
        kind: 'text',
        x: 80,
        y: 326 + i * 52,
        w: 1440,
        h: 50,
        size: 32,
        align: 'left',
        color: i === 0 ? '#FFD23F' : mine ? accent : '#FFFFFF',
        label: `${String(i + 1).padStart(2, ' ')}.   ${e.name}   ${e.label}`,
        sub: e.score.toLocaleString('en-US'),
      });
    });
    widgets.push(
      { id: 'board-scope', x: 64, y: 880, w: 700, h: 90, label: world ? 'SHOWING: WORLD BOARD' : 'SHOWING: THIS DEVICE', sub: online ? 'Tap to switch' : undefined, disabled: !online, size: 32 },
      { id: 'board-name', x: 800, y: 880, w: 736, h: 90, label: `NAME: ${this.profile.name || 'TAP TO SET'}`, size: 34, color: accent },
    );
    return { title: 'LEADERBOARD', subtitle: note || (world ? 'Best score per name, from every player' : 'Your best runs on this device'), coins: this.profile.coins, accent, widgets };
  }

  private nameScreen(accent: string): PanelContent {
    const widgets: Widget[] = [
      { id: 'name-cancel', x: 1236, y: 150, w: 300, h: 70, label: 'CANCEL', size: 32 },
      { id: 'name-draft', kind: 'text', x: 80, y: 235, w: 1440, h: 130, label: `${this.nameDraft}_`, size: 96, align: 'center', color: '#FFD23F' },
    ];
    const W = 136;
    const GAP = 12;
    const X0 = 66;
    const Y0 = 392;
    const H = 108;
    KEY_ROWS.forEach((row, r) => row.forEach((k, c) => widgets.push({ id: `key:${k}`, x: X0 + c * (W + GAP), y: Y0 + r * (H + GAP), w: W, h: H, label: k, size: 56 })));
    const y = Y0 + 3 * (H + GAP);
    widgets.push(
      { id: 'key:SPACE', x: X0 + 6 * (W + GAP), y, w: W, h: H, label: 'SPACE', size: 28 },
      { id: 'key:DEL', x: X0 + 7 * (W + GAP), y, w: W, h: H, label: 'DEL', size: 36, color: '#FF3B5C' },
      { id: 'key:DONE', x: X0 + 8 * (W + GAP), y, w: 2 * W + GAP, h: H, label: 'DONE', size: 52, selected: true, color: accent },
    );
    return { title: 'YOUR NAME', subtitle: this.flat ? 'Tap the keys or type, then DONE' : 'Poke the keys, then DONE', coins: this.profile.coins, accent, widgets };
  }

  // ---------------------------------------------------------------- events

  handle(event: PanelEvent): void {
    const p = this.profile;
    const [kind, arg] = event.id.split(':');
    if (event.id !== 'reset') this.confirmReset = false;
    switch (kind) {
      case 'back':
        if (this.screen === 'garage' && this.garageReturn === 'map') {
          // Back to the level choice with the same level still selected.
          const level = this.mapLevel;
          this.open('map');
          this.mapLevel = level;
          this.actions.mapSelect(level);
          return;
        }
        this.open(this.screen === 'settings' ? this.settingsReturn : this.screen === 'map' ? 'galaxy' : 'main');
        return;
      case 'main-hero':
        this.open('heroes');
        return;
      case 'play':
        this.galaxyIndex = Math.max(0, HEROES.findIndex((h) => h.id === this.hero));
        this.open('galaxy');
        return;
      case 'galaxy-go': {
        const id = HEROES[this.galaxyIndex].id;
        this.hero = id;
        this.actions.changed();
        this.open('map');
        return;
      }
      case 'galaxy-finale':
        if (finaleUnlocked(p)) this.actions.finale();
        else this.actions.denied();
        return;
      case 'garage':
        this.garageHero = this.hero;
        this.garageReturn = 'main';
        this.open('garage');
        return;
      case 'map-garage':
        // The armory for the hero about to deploy, straight from the level choice.
        this.garageHero = this.hero;
        this.garageReturn = 'map';
        this.open('garage');
        return;
      case 'settings':
      case 'pause-settings':
        this.settingsReturn = kind === 'settings' ? 'main' : 'pause';
        this.open('settings');
        return;
      case 'howto':
        this.open('howto');
        return;
      case 'movie':
        this.actions.movie();
        return;
      case 'chapter-movie':
        this.actions.chapterMovie(this.hero);
        return;
      case 'board':
        this.boardHero = this.hero;
        this.boardScope = 'global';
        this.open('board');
        this.actions.board(this.boardHero);
        return;
      case 'board-prev':
      case 'board-next': {
        const i = PLAYABLE.indexOf(this.boardHero);
        this.boardHero = PLAYABLE[(i + (kind === 'board-next' ? 1 : PLAYABLE.length - 1)) % PLAYABLE.length];
        this.actions.board(this.boardHero);
        return;
      }
      case 'board-scope':
        this.boardScope = this.boardScope === 'global' ? 'local' : 'global';
        return;
      case 'board-name':
        this.beginName(() => this.open('board'));
        this.open('name');
        return;
      case 'key':
        if (arg === 'DONE') this.finishName();
        else this.nameDraft = typeKey(this.nameDraft, arg);
        return;
      case 'name-cancel':
        this.nameDraft = this.profile.name;
        this.finishName();
        return;
      case 'endless':
      case 'daily':
        this.actions.endless(this.hero, kind === 'daily');
        return;
      case 'story':
        this.actions.story();
        return;
      case 'finale':
        if (finaleUnlocked(p)) this.actions.finale();
        else this.actions.denied();
        return;
      case 'hero-prev':
      case 'hero-next':
        if (this.moveFocus(kind === 'hero-prev' ? -1 : 1)) this.actions.focus(this.heroFocus);
        return;
      case 'hero-pick': {
        const id = HEROES[this.heroFocus].id;
        if (!PLAYABLE.includes(id)) return;
        if (id === this.hero) {
          this.open('map');
          return;
        }
        this.hero = id;
        this.actions.changed();
        return;
      }
      case 'map-level': {
        const index = Number(arg);
        const stage = this.chapterStages()[index];
        if (stage && isStageUnlocked(p, stage)) {
          this.mapLevel = index;
          this.actions.mapSelect(index);
        }
        return;
      }
      case 'start':
        this.actions.play(this.hero, this.mapStage);
        return;
      case 'tx-next':
        this.actions.txNext();
        return;
      case 'tx-skip':
        this.actions.txSkip();
        return;
      case 'difficulty': {
        const i = DIFFICULTIES.indexOf(p.settings.difficulty);
        p.settings.difficulty = DIFFICULTIES[(i + 1) % DIFFICULTIES.length];
        this.actions.changed();
        return;
      }
      case 'finish':
        if (ownsFinish(p, this.garageHero, arg)) p.finish[this.garageHero] = arg;
        else if (buyFinish(p, this.garageHero, arg)) this.actions.bought();
        else {
          this.actions.denied();
          return;
        }
        this.actions.changed();
        return;
      case 'garage-tab':
        this.garageTab = arg as 'weapons' | 'upgrades' | 'skins';
        return;
      case 'weapon': {
        this.garageWeapon = arg;
        if (ownsWeapon(p, arg)) p.loadout[weaponById(arg)!.hero] = arg;
        else if (buyWeapon(p, arg)) this.actions.bought();
        else {
          this.actions.denied();
          return;
        }
        this.actions.changed();
        return;
      }
      case 'garage-hero':
        this.garageWeapon = null;
        this.garageHero = arg as HeroId;
        return;
      case 'upgrade':
        if (buyUpgrade(p, arg)) {
          this.actions.bought();
          this.actions.changed();
        } else this.actions.denied();
        return;
      case 'skin': {
        const skin = SKINS.find((s) => s.id === arg);
        if (skin == null) return;
        if (p.skins.includes(skin.id)) p.equipped[skin.hero] = skin.id;
        else if (buySkin(p, skin.id)) this.actions.bought();
        else {
          this.actions.denied();
          return;
        }
        this.actions.changed();
        return;
      }
      case 'music':
      case 'sfx':
        p.settings[kind] = event.value ?? p.settings[kind];
        this.actions.changed();
        return;
      case 'aim':
        p.settings.aimAssist = !p.settings.aimAssist;
        this.actions.changed();
        return;
      case 'exit':
        this.actions.exit();
        return;
      case 'scan':
        this.actions.scanRoom();
        return;
      case 'spawns':
        p.settings.allAround = !p.settings.allAround;
        this.actions.changed();
        return;
      case 'gestures':
        p.settings.gestures = p.settings.gestures === 'normal' ? 'high' : p.settings.gestures === 'high' ? 'low' : 'normal';
        this.actions.changed();
        return;
      case 'handdebug':
        p.settings.handDebug = !p.settings.handDebug;
        this.actions.changed();
        return;
      case 'seat':
        p.settings.seated = p.settings.seated === 'auto' ? 'on' : p.settings.seated === 'on' ? 'off' : 'auto';
        this.actions.changed();
        return;
      case 'calm':
        p.settings.calm = !p.settings.calm;
        this.actions.changed();
        return;
      case 'perfhud':
        p.settings.perfHud = !p.settings.perfHud;
        this.actions.changed();
        return;
      case 'lefty':
        p.settings.leftHanded = !p.settings.leftHanded;
        this.actions.changed();
        return;
      case 'reset':
        if (this.confirmReset) {
          this.confirmReset = false;
          this.actions.resetProgress();
        } else this.confirmReset = true;
        return;
      case 'resume':
        this.actions.resume();
        return;
      case 'restart':
      case 'retry':
        this.actions.restart();
        return;
      case 'quit':
      case 'menu':
        this.actions.quit();
        return;
      case 'next': {
        const r = this.result;
        const next = r && !r.endless ? STAGES[r.stage.index + 1] : undefined;
        if (r && next && next.world.id === r.stage.world.id && isStageUnlocked(p, next)) this.actions.play(this.hero, next);
        return;
      }
    }
  }
}
