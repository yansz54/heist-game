// world.js — one museum room: the parsed tile map, the actors in it, and the
// rules that join them (sight, collision, loot, the getaway). Coordinates are
// playfield pixels: x 0..1280, y 0..640, tile 40 px. The renderer adds the HUD.
import { TILE, COLS, ROWS, THIEF, ALARM, CAMERA } from './config.js';
import { segmentHitsRect, pointInRects, clamp } from './util.js';
import { Thief } from './thief.js';
import { Guard } from './guard.js';
import { Camera } from './camera.js';

export function tileCenter(tx, ty) {
  return { x: tx * TILE + TILE / 2, y: ty * TILE + TILE / 2 };
}

export class World {
  constructor(def, levelIndex, sounds) {
    this.def = def;
    this.levelIndex = levelIndex;
    this.sounds = sounds;
    this.time = 0;
    this.status = 'play'; // play | clear | caught
    this.alarm = 0;
    this.smokes = []; // {x, y, left}
    this.caughtBy = '';
    this.clearTime = 0;
    this.lootTaken = 0;
    this.lootValue = 0;

    this.solids = []; // walls, cases, pillars: block walk and sight
    this.ropes = []; // velvet ropes: block walk, not sight
    this.plants = []; // potted plants: hide the thief
    this.loot = [];
    for (let y = 0; y < ROWS; y += 1) {
      for (let x = 0; x < COLS; x += 1) {
        const ch = def.map[y][x];
        const r = { x: x * TILE, y: y * TILE, w: TILE, h: TILE };
        if (ch === '#' || ch === 'D' || ch === 'P') this.solids.push(r);
        else if (ch === 'R') this.ropes.push(r);
        else if (ch === '~') this.plants.push(r);
      }
    }
    for (const l of def.loot) {
      const c = tileCenter(l.tile[0], l.tile[1]);
      this.loot.push({ ...l, x: c.x, y: c.y, taken: false });
    }
    const ec = tileCenter(def.exit[0], def.exit[1]);
    this.exit = { x: ec.x, y: ec.y, r: TILE * 0.7 };
    const tc = tileCenter(def.thief[0], def.thief[1]);
    this.thief = new Thief(tc.x, tc.y, def.smoke, def.emp);
    this.guards = def.guards.map((g) => new Guard(g, this));
    this.cameras = def.cameras.map((c) => new Camera(c, this));
  }

  get allLootTaken() {
    return this.lootTaken >= this.loot.length;
  }

  // True when nothing solid stands between the two points.
  clearSight(x1, y1, x2, y2) {
    for (let i = 0; i < this.solids.length; i += 1) {
      if (segmentHitsRect(x1, y1, x2, y2, this.solids[i])) return false;
    }
    return true;
  }

  // A circle of radius r at (x,y) overlaps a solid or a rope.
  circleHitsSolid(x, y, r) {
    const all = this.solids;
    for (let i = 0; i < all.length; i += 1) {
      const s = all[i];
      const cx = clamp(x, s.x, s.x + s.w), cy = clamp(y, s.y, s.y + s.h);
      if ((x - cx) * (x - cx) + (y - cy) * (y - cy) < r * r) return true;
    }
    for (let i = 0; i < this.ropes.length; i += 1) {
      const s = this.ropes[i];
      const cx = clamp(x, s.x, s.x + s.w), cy = clamp(y, s.y, s.y + s.h);
      if ((x - cx) * (x - cx) + (y - cy) * (y - cy) < r * r) return true;
    }
    return false;
  }

  inPlant(x, y) {
    return pointInRects(x, y, this.plants);
  }

  inSmoke(x, y) {
    for (const s of this.smokes) {
      const dx = x - s.x, dy = y - s.y;
      if (dx * dx + dy * dy < 95 * 95) return true;
    }
    return false;
  }

  // Highest visibility any guard or camera has on the thief right now, 0..1,
  // and whether anything at all sees the thief.
  watchers() {
    let seen = false;
    let worst = 0;
    for (const g of this.guards) {
      const v = g.visibilityOf(this.thief, this);
      if (v > 0) { seen = true; worst = Math.max(worst, v); }
    }
    for (const c of this.cameras) {
      const v = c.visibilityOf(this.thief, this);
      if (v > 0) { seen = true; worst = Math.max(worst, v); }
    }
    return { seen, worst };
  }

  // Patrol-only stepping for the title screen: the guards walk their routes
  // while the alarm, loot and thief stay untouched.
  demo(dt) {
    this.time += dt;
    for (const g of this.guards) g.updatePatrol(dt);
    for (const c of this.cameras) c.update(dt, this.thief, this);
  }

  update(dt, input) {
    if (this.status !== 'play') return;
    this.time += dt;
    for (const s of this.smokes) s.left -= dt;
    this.smokes = this.smokes.filter((s) => s.left > 0);

    this.thief.update(dt, input, this);
    for (const g of this.guards) g.update(dt, this.thief, this);
    for (const c of this.cameras) c.update(dt, this.thief, this);

    // The alarm is one shared meter: every watcher that sees the thief fills
    // it, and it drains while nobody does.
    let fill = 0;
    for (const g of this.guards) fill += g.visibilityOf(this.thief, this) * ALARM.guardPerSecond;
    for (const c of this.cameras) fill += c.visibilityOf(this.thief, this) * CAMERA.alarmPerSecond;
    if (fill > 0) this.alarm = clamp(this.alarm + fill * dt, 0, ALARM.caughtAt);
    else this.alarm = clamp(this.alarm - ALARM.drainPerSecond * dt, 0, ALARM.caughtAt);

    if (this.alarm >= ALARM.caughtAt) {
      this.status = 'caught';
      this.caughtBy = 'The alarm hit 100% — lockdown. The museum is crawling with security.';
      this.sounds.caught();
      return;
    }
    for (const g of this.guards) {
      if (g.caught) {
        this.status = 'caught';
        this.caughtBy = 'A guard grabbed Mara. The getaway van drives off without her.';
        this.sounds.caught();
        return;
      }
    }

    // Loot: stand close and hold E; the channel bar fills, then it is yours.
    const near = this.loot.find((l) => !l.taken &&
      Math.hypot(this.thief.x - l.x, this.thief.y - l.y) < TILE * 1.1);
    this.thief.grabTarget = near || null;
    if (near && input.grab) {
      this.thief.grabProgress += dt / THIEF.grabSeconds;
      if (this.thief.grabProgress >= 1) {
        near.taken = true;
        this.lootTaken += 1;
        this.lootValue += near.value;
        this.thief.grabProgress = 0;
        this.sounds.pickup();
      }
    } else {
      this.thief.grabProgress = 0;
    }

    // The getaway opens only when every piece is in the bag.
    if (this.allLootTaken) {
      const d = Math.hypot(this.thief.x - this.exit.x, this.thief.y - this.exit.y);
      if (d < this.exit.r) {
        this.status = 'clear';
        this.clearTime = this.time;
        this.sounds.clear();
      }
    }
  }
}
