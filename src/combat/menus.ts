import { type HeroId, HEROES, PLAYABLE } from './heroes.js';
import type { PanelContent, PanelEvent, Widget } from './panel-ui.js';
import {
  buyHero,
  buySkin,
  buyUpgrade,
  type Difficulty,
  equippedColor,
  HERO_PRICE,
  isStageUnlocked,
  MAX_UPGRADE,
  nextUpgradeCost,
  type Profile,
  type Reward,
  SKINS,
  type Stage,
  STAGES,
  STAGES_PER_WORLD,
  upgradeLevel,
  UPGRADES,
  WORLDS,
} from './progression.js';

export type Screen = 'main' | 'heroes' | 'stages' | 'garage' | 'settings' | 'howto' | 'pause' | 'results';

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
  resetProgress(): void;
}

export interface ResultInfo {
  won: boolean;
  stage: Stage;
  reward: Reward;
  score: number;
  kills: number;
  bestCombo: number;
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
  private worldTab = 0;
  private garageHero: HeroId = 'arc';
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
    if (screen === 'stages') this.actions.preview(WORLDS[this.worldTab].id);
    if (screen === 'heroes') this.heroFocus = Math.max(0, HEROES.findIndex((h) => h.id === this.hero));
    if (screen === 'main' || screen === 'heroes' || screen === 'garage') this.actions.preview('neon-grid');
  }

  showResults(info: ResultInfo): void {
    this.result = info;
    this.open('results');
  }

  /** The first unlocked stage without stars, else the last unlocked one. */
  nextStage(): Stage {
    const open = STAGES.filter((s) => isStageUnlocked(this.profile, s));
    return open.find((s) => !this.profile.stars[s.id]) ?? open[open.length - 1];
  }

  content(): PanelContent {
    const p = this.profile;
    const accent = equippedColor(p, this.hero);
    switch (this.screen) {
      case 'main':
        return this.mainScreen(accent);
      case 'heroes':
        return this.heroesScreen(accent);
      case 'stages':
        return this.stagesScreen();
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
    return {
      title: 'SURGE',
      subtitle: 'Hands of Heroes',
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
        },
        {
          id: 'play',
          x: 640,
          y: 220,
          w: 896,
          h: 200,
          label: 'PLAY',
          sub: `Next: ${next.world.name} ${next.number} - ${next.name}`,
          selected: true,
          color: accent,
          size: 80,
        },
        { id: 'garage', x: 640, y: 450, w: 438, h: 150, label: 'GARAGE', sub: 'Upgrades & skins' },
        { id: 'settings', x: 1098, y: 450, w: 438, h: 150, label: 'SETTINGS', sub: 'Sound & difficulty' },
        { id: 'howto', x: 640, y: 630, w: 438, h: 150, label: 'HOW TO PLAY' },
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
        {
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
      subtitle: 'Swipe your hand sideways, or use the arrows',
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
        },
        { id: 'hero-next', x: 1316, y: 250, w: 220, h: 520, label: '>', size: 110, disabled: this.heroFocus === HEROES.length - 1, color },
        { id: 'hero-pick', x: 310, y: 800, w: 980, h: 140, label: pick, selected: playable, disabled: !playable, color, size: 48 },
      ],
    };
  }

  private stagesScreen(): PanelContent {
    const world = WORLDS[this.worldTab];
    const widgets: Widget[] = [BACK];
    WORLDS.forEach((w, i) => {
      widgets.push({
        id: `world:${i}`,
        x: 64 + i * 296,
        y: 240,
        w: 280,
        h: 90,
        label: w.name,
        size: 26,
        color: w.color,
        selected: i === this.worldTab,
      });
    });
    for (let n = 0; n < STAGES_PER_WORLD; n += 1) {
      const stage = STAGES[this.worldTab * STAGES_PER_WORLD + n];
      const unlocked = isStageUnlocked(this.profile, stage);
      widgets.push({
        id: `stage:${stage.id}`,
        kind: 'tile',
        x: 64 + n * 490,
        y: 360,
        w: 470,
        h: 470,
        label: `STAGE ${stage.number}`,
        sub: stage.name,
        detail: `${stage.objective}\nEnemies: ${world.enemies.join(', ')}`,
        color: world.color,
        stars: unlocked ? (this.profile.stars[stage.id] ?? 0) : undefined,
        badge: unlocked ? 'PLAY' : 'LOCKED',
        disabled: !unlocked,
        size: 48,
      });
    }
    const difficulty = this.profile.settings.difficulty.toUpperCase();
    widgets.push(
      { id: 'difficulty', x: 64, y: 860, w: 520, h: 90, label: `DIFFICULTY: ${difficulty}`, size: 32, color: world.color },
      {
        id: 'stage-hero',
        kind: 'text',
        x: 640,
        y: 880,
        w: 900,
        h: 60,
        label: `Hero: ${HEROES.find((h) => h.id === this.hero)!.name}  |  clear a stage to unlock the next`,
        size: 30,
      },
    );
    return { title: 'STAGES', subtitle: world.name, coins: this.profile.coins, accent: world.color, widgets };
  }

  private garageScreen(): PanelContent {
    const p = this.profile;
    const hero = this.garageHero;
    const accent = equippedColor(p, hero);
    const widgets: Widget[] = [BACK];
    const owned = HEROES.filter((h) => p.heroes.includes(h.id) && PLAYABLE.includes(h.id));
    owned.forEach((h, i) => {
      widgets.push({
        id: `garage-hero:${h.id}`,
        x: 64 + i * 290,
        y: 230,
        w: 270,
        h: 76,
        label: h.name,
        size: 30,
        color: equippedColor(p, h.id),
        selected: h.id === hero,
      });
    });
    const rows = UPGRADES.filter((u) => u.hero === 'all' || u.hero === hero);
    rows.forEach((u, r) => {
      const y = 330 + r * 128;
      const level = upgradeLevel(p, u.id);
      const cost = nextUpgradeCost(p, u.id);
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
          label: cost == null ? 'MAX' : 'UPGRADE',
          sub: cost == null ? undefined : `${cost} C`,
          disabled: cost == null,
          color: cost != null && p.coins >= cost ? accent : '#888899',
          size: 34,
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
      });
    });
    return { title: 'GARAGE', subtitle: `${HEROES.find((h) => h.id === hero)!.name} upgrades & skins`, coins: p.coins, accent, widgets };
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
        {
          id: 'reset',
          x: 64,
          y: 700,
          w: 620,
          h: 110,
          label: this.confirmReset ? 'TAP AGAIN TO ERASE' : 'RESET PROGRESS',
          color: '#FF3B5C',
          size: 34,
        },
        {
          id: 'settings-note',
          kind: 'text',
          x: 740,
          y: 710,
          w: 800,
          h: 100,
          label: 'Progress, coins and settings are saved\non this device.',
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
        { id: 'howto-text', kind: 'text', x: 80, y: 250, w: 1440, h: 500, label: lines, size: 38 },
        {
          id: 'howto-more',
          kind: 'text',
          x: 80,
          y: 720,
          w: 1440,
          h: 200,
          label:
            'Chain kills for a combo multiplier. Earn coins to unlock heroes, upgrades and skins.\nThree stars: finish a stage without losing shield. Left wrist button: pause.',
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
        { id: 'resume', x: 400, y: 230, w: 800, h: 150, label: 'RESUME', selected: true, color: accent, size: 56 },
        { id: 'restart', x: 400, y: 410, w: 800, h: 130, label: 'RESTART STAGE' },
        { id: 'pause-settings', x: 400, y: 570, w: 800, h: 130, label: 'SETTINGS' },
        { id: 'quit', x: 400, y: 730, w: 800, h: 130, label: 'QUIT TO MENU', color: '#FF3B5C' },
      ],
    };
  }

  private resultsScreen(accent: string): PanelContent {
    const r = this.result!;
    const next = STAGES[r.stage.index + 1];
    const canNext = r.won && next != null && isStageUnlocked(this.profile, next);
    const stars = '★'.repeat(r.reward.stars) + '☆'.repeat(3 - r.reward.stars);
    return {
      title: r.won ? 'VICTORY' : 'DEFEATED',
      subtitle: `${r.stage.world.name} ${r.stage.number} - ${r.stage.name}`,
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
          h: 200,
          align: 'center',
          size: 40,
          label: `Score ${r.score.toLocaleString('en-US')}   |   Kills ${r.kills}   |   Best combo x${r.bestCombo}\n+${r.reward.coins} coins${r.reward.newBest ? '   |   NEW BEST!' : ''}`,
        },
        { id: 'next', x: 64, y: 780, w: 470, h: 140, label: 'NEXT STAGE', disabled: !canNext, selected: canNext, color: accent },
        { id: 'retry', x: 565, y: 780, w: 470, h: 140, label: 'RETRY' },
        { id: 'menu', x: 1066, y: 780, w: 470, h: 140, label: 'MENU' },
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
        this.open(this.screen === 'settings' ? this.settingsReturn : 'main');
        return;
      case 'main-hero':
        this.open('heroes');
        return;
      case 'play':
        this.worldTab = WORLDS.indexOf(this.nextStage().world);
        this.open('stages');
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
      case 'hero-prev':
      case 'hero-next':
        if (this.moveFocus(kind === 'hero-prev' ? -1 : 1)) this.actions.focus(this.heroFocus);
        return;
      case 'hero-pick': {
        const id = HEROES[this.heroFocus].id;
        if (!PLAYABLE.includes(id)) return;
        if (id === this.hero && p.heroes.includes(id)) {
          this.handle({ ...event, id: 'play' });
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
      case 'world':
        this.worldTab = Number(arg);
        this.actions.preview(WORLDS[this.worldTab].id);
        return;
      case 'stage': {
        const stage = STAGES.find((s) => s.id === arg);
        if (stage && isStageUnlocked(p, stage)) this.actions.play(this.hero, stage);
        return;
      }
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
        if (next && isStageUnlocked(p, next)) this.actions.play(this.hero, next);
        return;
      }
    }
  }
}
