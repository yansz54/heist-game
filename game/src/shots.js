// shots.js — the screenshot scenes behind ?shot=start|play|alert|clear.
// Each one plays the real rules forward from a fresh world, steered by an
// autopilot that pathfinds on the tile grid (Dijkstra, where stepping into
// a tile a guard or camera can see costs extra), so the frame is what a
// short game really looks like and the same seed always gives the same frame.
// The 'alert' pilot weights sight at zero, so it walks into trouble on
// purpose; the 'play' pilot takes small risks, so the alarm meter is alive
// in the frame.
import { LEVELS } from './levels.js';
import { World } from './world.js';
import { STEP, SCREENS, TILE, COLS, ROWS } from './config.js';
import { dist } from './util.js';

function walkableTile(world, tx, ty) {
  if (tx < 0 || ty < 0 || tx >= COLS || ty >= ROWS) return false;
  return '.~TLX'.includes(world.def.map[ty][tx]);
}

function tileCenter(tx, ty) {
  return { x: tx * TILE + TILE / 2, y: ty * TILE + TILE / 2 };
}

// How visible is the point (x,y) to any watcher right now, 0..1?
function visibilityAt(world, x, y) {
  const probe = { x, y, inPlant: world.inPlant(x, y), running: false };
  let vis = 0;
  for (const g of world.guards) vis = Math.max(vis, g.visibilityOf(probe, world));
  for (const c of world.cameras) vis = Math.max(vis, c.visibilityOf(probe, world));
  return vis;
}

function targetOf(world) {
  if (!world.allLootTaken) {
    let best = null, bd = Infinity;
    for (const l of world.loot) {
      if (l.taken) continue;
      const d = dist(world.thief.x, world.thief.y, l.x, l.y);
      if (d < bd) { bd = d; best = l; }
    }
    return best;
  }
  return world.exit;
}

// Dijkstra over the tile grid from the thief's tile to the target tile.
// Entering a tile costs 1 plus visWeight times how visible that tile is.
function findPath(world, visWeight) {
  const target = targetOf(world);
  const startTx = Math.floor(world.thief.x / TILE);
  const startTy = Math.floor(world.thief.y / TILE);
  const goalTx = Math.floor(target.x / TILE);
  const goalTy = Math.floor(target.y / TILE);
  const key = (x, y) => y * COLS + x;
  const cost = new Map([[key(startTx, startTy), 0]]);
  const prev = new Map();
  const open = [[0, startTx, startTy]];
  const visCache = new Map();
  const visOf = (tx, ty) => {
    const k = key(tx, ty);
    if (!visCache.has(k)) {
      const c = tileCenter(tx, ty);
      visCache.set(k, visibilityAt(world, c.x, c.y));
    }
    return visCache.get(k);
  };
  while (open.length) {
    let bi = 0;
    for (let i = 1; i < open.length; i += 1) if (open[i][0] < open[bi][0]) bi = i;
    const [c, x, y] = open.splice(bi, 1)[0];
    if (x === goalTx && y === goalTy) break;
    if (c > (cost.get(key(x, y)) ?? Infinity)) continue;
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const nx = x + dx, ny = y + dy;
      if (!walkableTile(world, nx, ny)) continue;
      const nc = c + 1 + visWeight * visOf(nx, ny);
      if (nc < (cost.get(key(nx, ny)) ?? Infinity)) {
        cost.set(key(nx, ny), nc);
        prev.set(key(nx, ny), [x, y]);
        open.push([nc, nx, ny]);
      }
    }
  }
  if (!cost.has(key(goalTx, goalTy))) return null;
  const path = [];
  let cur = [goalTx, goalTy];
  while (cur[0] !== startTx || cur[1] !== startTy) {
    const c = tileCenter(cur[0], cur[1]);
    path.unshift(c);
    cur = prev.get(key(cur[0], cur[1]));
    if (!cur) break;
  }
  return path;
}

// One autopilot step: follow the planned path, or hold E by the loot.
export function autopilotStep(world, visWeight, sounds) {
  const t = world.thief;
  const nearLoot = world.loot.find((l) => !l.taken &&
    Math.hypot(t.x - l.x, t.y - l.y) < TILE * 1.1);
  const input = {
    up: false, down: false, left: false, right: false,
    run: false, grab: !!nearLoot, smoke: false, emp: false,
    pausePressed: false, confirmPressed: false, retryPressed: false,
    click: null, anyKey: false,
  };
  if (nearLoot) {
    world.update(STEP, input);
    return;
  }
  const target = targetOf(world);
  const targetKey = `${target.x},${target.y},${world.lootTaken}`;
  let plan = world._shotPlan;
  if (!plan || plan.targetKey !== targetKey || plan.age > 90) {
    plan = { targetKey, path: findPath(world, visWeight) || [], age: 0 };
    world._shotPlan = plan;
  }
  plan.age += 1;
  while (plan.path.length && dist(t.x, t.y, plan.path[0].x, plan.path[0].y) < 10) {
    plan.path.shift();
  }
  const next = plan.path[0];
  if (next) {
    const dx = next.x - t.x, dy = next.y - t.y;
    const len = Math.hypot(dx, dy) || 1;
    input.left = dx < -4; input.right = dx > 4;
    input.up = dy < -4; input.down = dy > 4;
    if (Math.abs(dx) <= 4 && Math.abs(dy) <= 4) {
      input.left = dx < 0; input.right = dx > 0;
      input.up = dy < 0; input.down = dy > 0;
    }
    void len;
  }
  world.update(STEP, input);
}

/**
 * Set `game` to the named scene and return the screen to draw over it.
 * start: title over the gallery, guards mid-patrol.
 * play: mid-heist in the vault hall, alarm alive, loot in sight.
 * alert: the same hall, reckless pilot — a guard is chasing, alarm high.
 * clear: the gallery cleared, take and time on screen.
 */
export function stageShot(name, game) {
  const sounds = game.sounds;
  if (name === 'play' || name === 'alert') {
    game.levelIndex = 1;
    game.world = new World(LEVELS[1], 1, sounds);
    const reckless = name === 'alert';
    const weight = reckless ? 0 : 2.5;
    const stopAt = reckless ? 55 : 18;
    for (let i = 0; i < 45 * 60; i += 1) {
      if (game.world.status !== 'play') break;
      if (!reckless && game.world.alarm >= stopAt) break;
      if (reckless && (game.world.alarm >= stopAt ||
        game.world.guards.some((g) => g.state === 'chase'))) break;
      autopilotStep(game.world, weight, sounds);
    }
    if (reckless && game.world.alarm < stopAt &&
      !game.world.guards.some((g) => g.state === 'chase')) {
      // The reckless run never got spotted (the shortest path dodged every
      // cone, or it cleared the room). Stage the chase instead: a fresh
      // room, Mara in front of the nearest guard, the alarm primed, and
      // the real rules run forward from there.
      if (game.world.status !== 'play') {
        game.world = new World(LEVELS[1], 1, sounds);
      }
      const w = game.world;
      let g = w.guards[0];
      for (const other of w.guards) {
        if (dist(other.x, other.y, w.thief.x, w.thief.y) <
          dist(g.x, g.y, w.thief.x, w.thief.y)) g = other;
      }
      for (const d of [110, 150, 80, 190]) {
        const nx = g.x + Math.cos(g.facing) * d;
        const ny = g.y + Math.sin(g.facing) * d;
        if (!w.circleHitsSolid(nx, ny, 13) && nx > 40 && nx < 1240 && ny > 40 && ny < 600) {
          w.thief.x = nx; w.thief.y = ny;
          break;
        }
      }
      w.alarm = 45;
      for (let i = 0; i < 12 * 60; i += 1) {
        if (w.status !== 'play') break;
        if (w.alarm >= stopAt || w.guards.some((gg) => gg.state === 'chase')) break;
        w.update(STEP, {
          up: false, down: false, left: false, right: false, run: true,
          grab: false, smoke: false, emp: false, click: null,
        });
      }
    }
    game.screen = SCREENS.PLAY;
    return game.screen;
  }
  if (name === 'clear') {
    game.levelIndex = 0;
    game.world = new World(LEVELS[0], 0, sounds);
    for (let i = 0; i < 150 * 60; i += 1) {
      if (game.world.status !== 'play') break;
      autopilotStep(game.world, 10, sounds);
    }
    if (game.world.status === 'clear') {
      game.totalTake = game.world.lootValue;
      game.totalTime = game.world.clearTime;
      game.screen = SCREENS.CLEAR;
    } else {
      game.screen = SCREENS.PLAY;
    }
    return game.screen;
  }
  // start (and anything else): title over the gallery, 5 seconds in.
  game.levelIndex = 0;
  game.world = new World(LEVELS[0], 0, sounds);
  for (let i = 0; i < 5 / STEP; i += 1) game.world.demo(STEP);
  game.screen = SCREENS.TITLE;
  return game.screen;
}
