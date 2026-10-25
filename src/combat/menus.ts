import { type HeroId, HEROES, PLAYABLE } from './heroes.js';
import type { PanelContent, PanelEvent, Widget } from './panel-ui.js';
import {
  buyHero,
  buySkin,
  buyUpgrade,
  type Difficulty,
  equippedColor,
  HERO_PRICE,
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

export type Screen = 'main' | 'galaxy' | 'heroes' | 'map' | 'transmission' | 'garage' | 'settings' | 'howto' | 'pause' | 'results';

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
  /** Starts the prologue. */
  story(): void;
  /** Starts the finale, CONVERGENCE. */
  finale(): void;
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
  /** Hero under the carousel spotlight. */
  heroFocus = 0;
  /** Planet (hero index) selected on the galaxy map. */
  galaxyIndex = 0;
  /** Selected level on the campaign map (0-based). */
  mapLevel = 0;
  transmission: TransmissionView | null = null;
  private garageHero: HeroId = 'arc';

  /** Hero whose weapon the garage armory is showing. */
  get garageHeroId(): HeroId {
    return this.garageHero;
  }
  private confirmReset = false;
  private settingsReturn: Screen = 'main';
  private result: ResultInfo | null = null;

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
      : { id: 'story', x: 640, y: 220, w: 896, h: 200, label: 'START STORY', icon: 'play', sub: 'PROLOGUE: learn your powers in 4 minutes', selected: true, color: '#FF4FD8', size: 72 };
    return {
      title: 'SURGE',
      subtitle: begun ? `OBLIVAX is unmaking reality. Win back the Anchors. ${anchors}/8` : 'Hands of Heroes',
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
        { id: 'howto', x: 640, y: 630, w: 438, h: 150, label: 'HOW TO PLAY', icon: 'map' },
        {
          id: 'stats',
          kind: 'text',
          x: 1120,
          y: 650,
          w: 400,
          h: 120,
          label: `Stars ${totalStars(this.profile)}/${STAGES.length * 3}\nHeroes ${this.profile.heroes.length}/${HEROES.length}`,
          size: 36,
        },
        begun
          ? {
              id: 'finale',
              x: 640,
              y: 800,
              w: 896,
              h: 120,
              label: finale ? 'CONVERGENCE: FACE OBLIVAX' : `ANCHORS ${anchors} / 8`,
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
              label: 'Poke buttons with a fingertip. Left wrist button pauses a fight.',
              size: 30,
              color: 'rgba(233,252,255,0.6)',
            },
      ],
    };
  }

  private galaxyScreen(): PanelContent {
    const p = this.profile;
    const hero = HEROES[this.galaxyIndex] ?? HEROES[0];
    const chapter = chapterFor(hero.id);
    const owned = p.heroes.includes(hero.id);
    const cleared = chapter.levels.filter((_, i) => (p.stars[`${chapter.worldId}-${i + 1}`] ?? 0) > 0).length;
    const anchors = anchorsRecovered(p).length;
    const finale = finaleUnlocked(p);
    const color = equippedColor(p, hero.id);
    return {
      title: 'THE ANCHOR WAR',
      subtitle: `Anchors ${anchors}/8. Poke a planet below to choose a front.`,
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
          label: owned ? `DEPLOY ${hero.name}` : `UNLOCK ${hero.name}`,
          sub: owned ? `${chapter.region}: ${chapter.levels[Math.min(2, cleared)].location}` : `${HERO_PRICE[hero.id]} coins`,
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
    return this.profile.heroes.includes(id) ? 'READY' : `UNLOCK ${HERO_PRICE[id]} C`;
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
    const owned = this.profile.heroes.includes(hero.id);
    const playable = PLAYABLE.includes(hero.id);
    const price = HERO_PRICE[hero.id];
    const pick = !playable ? 'COMING SOON' : hero.id === this.hero ? 'SELECTED - TAP TO PLAY' : owned ? 'SELECT HERO' : `UNLOCK FOR ${price} C`;
    return {
      title: 'CHOOSE YOUR HERO',
      subtitle: 'Swipe an open hand sideways (one hero per swipe), or poke the arrows',
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
        { id: 'hero-pick', x: 310, y: 800, w: 980, h: 140, label: pick, selected: playable, disabled: !playable, color, size: 48, icon: owned ? 'play' : 'coins' },
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
      { id: 'start', x: 64, y: 790, w: 960, h: 150, label: boss ? 'FACE THE BOSS' : 'START MISSION', selected: true, color: accent, size: 56, icon: boss ? 'skull' : 'play' },
      { id: 'difficulty', x: 1056, y: 790, w: 480, h: 150, label: 'DIFFICULTY', sub: this.profile.settings.difficulty.toUpperCase(), color: accent },
    );
    return {
      title: chapter.region,
      subtitle: `${HEROES.find((h) => h.id === this.hero)!.name} vs ${chapter.villain.name}  |  Boss holds an ANCHOR (${anchorsRecovered(this.profile).length}/8 recovered)`,
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
    const rows = UPGRADES.filter((u) => u.hero === 'all' || u.hero === hero);
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
    SKINS.filter((s) => s.hero === hero).forEach((skin, i) => {
      const ownedSkin = p.skins.includes(skin.id);
      const equipped = equippedColor(p, hero) === skin.color;
      widgets.push({
        id: `skin:${skin.id}`,
        x: 64 + i * 330,
        y: 860,
        w: 310,
        h: 100,
        label: skin.name,
        sub: equipped ? 'EQUIPPED' : ownedSkin ? 'EQUIP' : `${skin.price} C`,
        color: skin.color,
        selected: equipped,
        size: 32,
        icon: hero,
      });
    });
    const tier = weaponTier(p, hero);
    return {
      title: 'ARMORY',
      subtitle: `${HEROES.find((h) => h.id === hero)!.name} - weapon tier ${tier}/5 - every 3 upgrades powers up its look`,
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
        { id: 'aim', x: 64, y: 530, w: 460, h: 110, label: 'AIM ASSIST', sub: s.aimAssist ? 'ON' : 'OFF', selected: s.aimAssist },
        { id: 'difficulty', x: 544, y: 530, w: 460, h: 110, label: 'DIFFICULTY', sub: s.difficulty.toUpperCase() },
        { id: 'lefty', x: 1024, y: 530, w: 512, h: 110, label: 'BOW HAND', sub: s.leftHanded ? 'RIGHT HAND' : 'LEFT HAND' },
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
        {
          id: 'settings-note',
          kind: 'text',
          x: 64,
          y: 850,
          w: 1470,
          h: 80,
          label: 'Progress, coins and settings are saved on this device. Subtitles always show.',
          size: 30,
        },
      ],
    };
  }

  private howtoScreen(accent: string): PanelContent {
    const lines = HEROES.map((h) => `${h.name.padEnd(8)} ${h.power} - ${h.how}`).join('\n');
    return {
      title: 'HOW TO PLAY',
      subtitle: 'Enemies breach your space. Stop them before they reach you.',
      coins: this.profile.coins,
      accent,
      widgets: [
        BACK,
        { id: 'howto-text', kind: 'text', x: 80, y: 250, w: 1440, h: 500, label: lines, size: 34 },
        { id: 'story', x: 1036, y: 150, w: 180, h: 70, label: 'PROLOGUE', size: 26 },
        {
          id: 'howto-more',
          kind: 'text',
          x: 80,
          y: 720,
          w: 1440,
          h: 200,
          label:
            'Chain kills for a combo multiplier. Free hostages and keep your shield for 3 stars.\nLeft wrist button: pause. Clap when OVERDRIVE is full.\nIcons: game-icons.net (Lorc, Delapouite), CC BY 3.0.',
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
      ],
    };
  }

  private resultsScreen(accent: string): PanelContent {
    const r = this.result!;
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
          label: `Score ${r.score.toLocaleString('en-US')}   |   Kills ${r.kills}   |   Best combo x${r.bestCombo}\n${r.hostages > 0 ? `Hostages saved ${r.saved}/${r.hostages}   |   ` : ''}+${r.reward.coins} coins${r.reward.newBest ? '   |   NEW BEST!' : ''}${unlockedLine}`,
        },
        { id: 'next', x: 64, y: 780, w: 470, h: 140, label: 'NEXT MISSION', disabled: !canNext, selected: canNext, color: accent, icon: 'play' },
        { id: 'retry', x: 565, y: 780, w: 470, h: 140, label: 'RETRY', icon: 'timer' },
        { id: 'menu', x: 1066, y: 780, w: 470, h: 140, label: 'WAR MAP', icon: 'map' },
      ],
    };
  }

  // ---------------------------------------------------------------- events

  handle(event: PanelEvent): void {
    const p = this.profile;
    const [kind, arg] = event.id.split(':');
    if (event.id !== 'reset') this.confirmReset = false;
    switch (kind) {
      case 'back':
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
        if (!p.heroes.includes(id)) {
          if (!buyHero(p, id)) {
            this.actions.denied();
            return;
          }
          this.actions.bought();
        }
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
        if (id === this.hero && p.heroes.includes(id)) {
          this.open('map');
          return;
        }
        if (!p.heroes.includes(id)) {
          if (!buyHero(p, id)) {
            this.actions.denied();
            return;
          }
          this.actions.bought();
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
      case 'garage-hero':
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
      case 'spawns':
        p.settings.allAround = !p.settings.allAround;
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
        const next = r ? STAGES[r.stage.index + 1] : undefined;
        if (r && next && next.world.id === r.stage.world.id && isStageUnlocked(p, next)) this.actions.play(this.hero, next);
        return;
      }
    }
  }
}
