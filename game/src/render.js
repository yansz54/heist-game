// render.js — every pixel is drawn here, procedurally: parquet floor, glass
// display cases, marble pillars, velvet ropes, moonlight pools, and the
// vision cones clipped by the walls with a raycast. No images, no fonts
// loaded from anywhere: system serif for the museum headings, system sans
// for the HUD.
import { VIEW, TILE, COLS, ROWS, COLORS, ALARM, SCREENS } from './config.js';
import { mulberry32, clamp } from './util.js';

const SERIF = 'Georgia, "Times New Roman", serif';
const SANS = 'Arial, Helvetica, sans-serif';

// Distance along the ray (ox,oy)+t*(dx,dy) to the first hit of rect, or Inf.
function rayRect(ox, oy, dx, dy, r) {
  let tmin = 0, tmax = Infinity;
  if (Math.abs(dx) < 1e-9) {
    if (ox < r.x || ox > r.x + r.w) return Infinity;
  } else {
    let t1 = (r.x - ox) / dx, t2 = (r.x + r.w - ox) / dx;
    if (t1 > t2) { const t = t1; t1 = t2; t2 = t; }
    tmin = Math.max(tmin, t1); tmax = Math.min(tmax, t2);
    if (tmin > tmax) return Infinity;
  }
  if (Math.abs(dy) < 1e-9) {
    if (oy < r.y || oy > r.y + r.h) return Infinity;
  } else {
    let t1 = (r.y - oy) / dy, t2 = (r.y + r.h - oy) / dy;
    if (t1 > t2) { const t = t1; t1 = t2; t2 = t; }
    tmin = Math.max(tmin, t1); tmax = Math.min(tmax, t2);
    if (tmin > tmax) return Infinity;
  }
  return tmin;
}

// A cone polygon from (x,y), facing `angle`, half-angle `half`, range `range`,
// each ray cut short by the nearest solid wall.
function conePolygon(x, y, angle, half, range, solids) {
  const steps = 26;
  const pts = [{ x, y }];
  for (let i = 0; i <= steps; i += 1) {
    const a = angle - half + (2 * half * i) / steps;
    const dx = Math.cos(a), dy = Math.sin(a);
    let d = range;
    for (const s of solids) {
      const hit = rayRect(x, y, dx, dy, s);
      if (hit < d) d = hit;
    }
    pts.push({ x: x + dx * d, y: y + dy * d });
  }
  return pts;
}

function drawCone(ctx, x, y, angle, half, range, solids, fill, edge) {
  const pts = conePolygon(x, y, angle, half, range, solids);
  ctx.beginPath();
  ctx.moveTo(pts[0].x, pts[0].y);
  for (let i = 1; i < pts.length; i += 1) ctx.lineTo(pts[i].x, pts[i].y);
  ctx.closePath();
  ctx.fillStyle = `rgba(${fill}, 0.16)`;
  ctx.fill();
  ctx.strokeStyle = `rgba(${edge}, 0.55)`;
  ctx.lineWidth = 1.5;
  ctx.stroke();
}

function fmtTime(t) {
  const m = Math.floor(t / 60), s = Math.floor(t % 60);
  return `${m}:${s < 10 ? '0' : ''}${s}`;
}

export class Renderer {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
  }

  draw(game) {
    const { ctx } = this;
    const world = game.world;
    ctx.clearRect(0, 0, VIEW.width, VIEW.height);
    ctx.save();
    ctx.translate(0, VIEW.hud);
    this.drawRoom(ctx, world, game.time);
    ctx.restore();
    this.drawHud(ctx, game);
    if (game.screen === SCREENS.TITLE) this.drawTitle(ctx, game);
    else if (game.screen === SCREENS.PAUSE) this.drawCenter(ctx, 'PAUSED', 'Press P to keep sneaking', '#e8dcc0');
    else if (game.screen === SCREENS.CAUGHT) this.drawCaught(ctx, game);
    else if (game.screen === SCREENS.CLEAR) this.drawClear(ctx, game);
    else if (game.screen === SCREENS.WIN) this.drawWin(ctx, game);
  }

  drawRoom(ctx, world, time) {
    const def = world.def;
    // Parquet floor.
    for (let y = 0; y < ROWS; y += 1) {
      for (let x = 0; x < COLS; x += 1) {
        ctx.fillStyle = (x + y) % 2 === 0 ? COLORS.floorA : COLORS.floorB;
        ctx.fillRect(x * TILE, y * TILE, TILE, TILE);
      }
    }
    // Moonlight pools from the skylights.
    const rng = mulberry32(100 + world.levelIndex * 7);
    for (let i = 0; i < 4; i += 1) {
      const px = 120 + rng() * 1040, py = 60 + rng() * 520, pr = 90 + rng() * 70;
      const g = ctx.createRadialGradient(px, py, 10, px, py, pr);
      g.addColorStop(0, COLORS.moonlight);
      g.addColorStop(1, 'rgba(140, 180, 255, 0)');
      ctx.fillStyle = g;
      ctx.fillRect(px - pr, py - pr, pr * 2, pr * 2);
    }
    // Plants: dark green cover the thief can hide in.
    for (const p of world.plants) {
      ctx.fillStyle = COLORS.plantDark;
      ctx.beginPath();
      ctx.arc(p.x + 20, p.y + 20, 17, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = COLORS.plant;
      ctx.beginPath();
      ctx.arc(p.x + 14, p.y + 16, 10, 0, Math.PI * 2);
      ctx.arc(p.x + 26, p.y + 24, 9, 0, Math.PI * 2);
      ctx.arc(p.x + 24, p.y + 13, 8, 0, Math.PI * 2);
      ctx.fill();
    }
    // Velvet ropes: red bars on brass posts, between floor tiles.
    for (const r of world.ropes) {
      ctx.fillStyle = '#6b5a2a';
      ctx.beginPath();
      ctx.arc(r.x + 6, r.y + 20, 3, 0, Math.PI * 2);
      ctx.arc(r.x + 34, r.y + 20, 3, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = COLORS.rope;
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(r.x + 6, r.y + 20);
      ctx.quadraticCurveTo(r.x + 20, r.y + 28, r.x + 34, r.y + 20);
      ctx.stroke();
    }
    // Display cases, pillars and walls.
    for (let y = 0; y < ROWS; y += 1) {
      for (let x = 0; x < COLS; x += 1) {
        const ch = def.map[y][x];
        const px = x * TILE, py = y * TILE;
        if (ch === '#') {
          ctx.fillStyle = COLORS.wall;
          ctx.fillRect(px, py, TILE, TILE);
          ctx.fillStyle = COLORS.wallTop;
          ctx.fillRect(px, py, TILE, 4);
        } else if (ch === 'D') {
          ctx.fillStyle = '#1c2436';
          ctx.fillRect(px + 3, py + 3, TILE - 6, TILE - 6);
          ctx.fillStyle = COLORS.caseGlass;
          ctx.fillRect(px + 6, py + 6, TILE - 12, TILE - 12);
          ctx.strokeStyle = COLORS.caseTrim;
          ctx.lineWidth = 2;
          ctx.strokeRect(px + 3, py + 3, TILE - 6, TILE - 6);
          ctx.fillStyle = 'rgba(255, 211, 77, 0.5)';
          ctx.beginPath();
          ctx.arc(px + 20, py + 20, 4, 0, Math.PI * 2);
          ctx.fill();
        } else if (ch === 'P') {
          ctx.fillStyle = COLORS.pillar;
          ctx.fillRect(px + 5, py + 5, TILE - 10, TILE - 10);
          ctx.fillStyle = '#5d5346';
          ctx.fillRect(px + 9, py + 9, TILE - 18, TILE - 18);
        }
      }
    }
    // Framed paintings on the top and bottom walls.
    const prng = mulberry32(500 + world.levelIndex * 13);
    const paints = ['#7a4a3a', '#3a5a7a', '#5a7a3a', '#8a6d2f', '#6a3a6a'];
    for (let x = 2; x < COLS - 2; x += 5) {
      const c = paints[Math.floor(prng() * paints.length)];
      ctx.fillStyle = '#8a6d2f';
      ctx.fillRect(x * TILE + 6, 6, 28, 24);
      ctx.fillStyle = c;
      ctx.fillRect(x * TILE + 9, 9, 22, 18);
      ctx.fillStyle = '#8a6d2f';
      ctx.fillRect(x * TILE + 6, 640 - 30, 28, 24);
      ctx.fillStyle = c;
      ctx.fillRect(x * TILE + 9, 640 - 27, 22, 18);
    }
    // Loot: gold, glowing, labelled when Mara is close.
    for (const l of world.loot) {
      if (l.taken) continue;
      const pulse = 0.5 + 0.3 * Math.sin(time * 3 + l.x);
      const g = ctx.createRadialGradient(l.x, l.y, 4, l.x, l.y, 34);
      g.addColorStop(0, `rgba(255, 211, 77, ${0.45 * pulse + 0.2})`);
      g.addColorStop(1, 'rgba(255, 211, 77, 0)');
      ctx.fillStyle = g;
      ctx.fillRect(l.x - 34, l.y - 34, 68, 68);
      ctx.fillStyle = COLORS.lootGlow;
      ctx.strokeStyle = '#8a6d2f';
      ctx.lineWidth = 2;
      ctx.beginPath();
      if (l.kind === 'gem' || l.kind === 'falcon' || l.kind === 'crown') {
        ctx.moveTo(l.x, l.y - 11);
        ctx.lineTo(l.x + 10, l.y);
        ctx.lineTo(l.x, l.y + 11);
        ctx.lineTo(l.x - 10, l.y);
        ctx.closePath();
      } else {
        ctx.rect(l.x - 10, l.y - 8, 20, 16);
      }
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = '#1c2436';
      ctx.font = `bold 11px ${SANS}`;
      ctx.textAlign = 'center';
      ctx.fillText(l.kind === 'gem' ? '◆' : '$', l.x, l.y + 4);
    }
    // The getaway: locked red until every piece is bagged, then green.
    const ex = world.exit;
    ctx.fillStyle = world.allLootTaken ? COLORS.exitOpen : COLORS.exitLocked;
    ctx.beginPath();
    ctx.arc(ex.x, ex.y, ex.r, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = world.allLootTaken ? '#b8ffce' : '#ffb8b8';
    ctx.lineWidth = 3;
    ctx.stroke();
    ctx.fillStyle = '#ffffff';
    ctx.font = `bold 11px ${SANS}`;
    ctx.textAlign = 'center';
    ctx.fillText(world.allLootTaken ? 'GETAWAY' : 'LOCKED', ex.x, ex.y - ex.r - 8);
    ctx.font = `bold 16px ${SANS}`;
    ctx.fillText(world.allLootTaken ? '»' : '×', ex.x, ex.y + 6);

    // Vision cones: cameras first (cyan), then guards.
    for (const c of world.cameras) {
      if (c.disabled > 0) {
        ctx.save();
        ctx.setLineDash([4, 4]);
        drawCone(ctx, c.x, c.y, c.facing, 0.42, 285, world.solids, '120, 120, 120', '160, 160, 160');
        ctx.restore();
      } else {
        drawCone(ctx, c.x, c.y, c.facing, 0.42, 285, world.solids, COLORS.cameraCone, '150, 220, 255');
      }
    }
    for (const g of world.guards) {
      const s = g.coneStyle();
      drawCone(ctx, g.x, g.y, g.facing, 0.55, 235, world.solids, s.fill, s.edge);
    }
    // Smoke clouds.
    for (const s of world.smokes) {
      const g2 = ctx.createRadialGradient(s.x, s.y, 8, s.x, s.y, 95);
      g2.addColorStop(0, 'rgba(200, 200, 210, 0.55)');
      g2.addColorStop(1, 'rgba(200, 200, 210, 0)');
      ctx.fillStyle = g2;
      ctx.fillRect(s.x - 95, s.y - 95, 190, 190);
    }
    // Cameras on the walls.
    for (const c of world.cameras) {
      ctx.save();
      ctx.translate(c.x, c.y);
      ctx.rotate(c.facing);
      ctx.fillStyle = c.disabled > 0 ? '#555' : '#c8ccd4';
      ctx.fillRect(-4, -6, 12, 12);
      ctx.fillStyle = c.disabled > 0 ? '#333' : '#ff4040';
      ctx.beginPath();
      ctx.arc(10, 0, 3, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
    // Guards: dark suit, cap, facing tick, ? / ! and a meter ring.
    for (const g of world.guards) {
      const bob = Math.sin(g.stepPhase) * 1.5;
      ctx.fillStyle = COLORS.guard;
      ctx.beginPath();
      ctx.arc(g.x, g.y + bob * 0.3, 13, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = COLORS.guardTrim;
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.fillStyle = '#1a2233';
      ctx.beginPath();
      ctx.arc(g.x, g.y - 4 + bob * 0.3, 7, Math.PI, 0);
      ctx.fill();
      ctx.strokeStyle = '#e8e8e8';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(g.x, g.y + bob * 0.3);
      ctx.lineTo(g.x + Math.cos(g.facing) * 18, g.y + Math.sin(g.facing) * 18 + bob * 0.3);
      ctx.stroke();
      const s = g.coneStyle();
      if (s.label) {
        ctx.fillStyle = s.label === '!' ? '#ff4040' : '#ffb020';
        ctx.font = `bold 20px ${SANS}`;
        ctx.textAlign = 'center';
        ctx.fillText(s.label, g.x, g.y - 20);
      }
      if (g.meter > 0.05 && g.meter < 1) {
        ctx.strokeStyle = g.meter > 0.35 ? '#ffb020' : '#ffe05a';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(g.x, g.y, 18, -Math.PI / 2, -Math.PI / 2 + g.meter * Math.PI * 2);
        ctx.stroke();
      }
    }
    // Mara: burgundy hood, gold trim, mask.
    const t = world.thief;
    const bob = t.moving ? Math.sin(t.stepPhase) * 1.5 : 0;
    ctx.fillStyle = t.inPlant ? 'rgba(122, 46, 61, 0.85)' : COLORS.thief;
    ctx.beginPath();
    ctx.arc(t.x, t.y + bob * 0.3, 13, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = COLORS.thiefTrim;
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.fillStyle = '#1c1216';
    ctx.beginPath();
    ctx.arc(t.x + Math.cos(t.facing) * 5, t.y + Math.sin(t.facing) * 5 + bob * 0.3, 6, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#e8c96a';
    ctx.beginPath();
    ctx.arc(t.x + Math.cos(t.facing) * 8, t.y + Math.sin(t.facing) * 8 + bob * 0.3, 2, 0, Math.PI * 2);
    ctx.fill();
    // Loot-grab channel bar.
    if (t.grabTarget && t.grabProgress > 0) {
      ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
      ctx.fillRect(t.x - 22, t.y - 30, 44, 7);
      ctx.fillStyle = COLORS.lootGlow;
      ctx.fillRect(t.x - 21, t.y - 29, 42 * t.grabProgress, 5);
      ctx.fillStyle = '#ffffff';
      ctx.font = `bold 10px ${SANS}`;
      ctx.textAlign = 'center';
      ctx.fillText(t.grabTarget.name.toUpperCase(), t.x, t.y - 34);
    }
    // Dust motes drifting in the moonlight.
    const drng = mulberry32(42);
    ctx.fillStyle = 'rgba(220, 230, 255, 0.25)';
    for (let i = 0; i < 24; i += 1) {
      const mx = drng() * 1280;
      const my = (drng() * 640 + time * 6) % 640;
      ctx.fillRect(mx, my, 2, 2);
    }
    // Vignette: the room is dark at the edges.
    const vg = ctx.createRadialGradient(640, 320, 280, 640, 320, 760);
    vg.addColorStop(0, 'rgba(0, 0, 0, 0)');
    vg.addColorStop(1, 'rgba(0, 0, 0, 0.45)');
    ctx.fillStyle = vg;
    ctx.fillRect(0, 0, 1280, 640);
  }

  drawHud(ctx, game) {
    const world = game.world;
    ctx.fillStyle = '#0e1420';
    ctx.fillRect(0, 0, VIEW.width, VIEW.hud);
    ctx.fillStyle = '#2a3348';
    ctx.fillRect(0, VIEW.hud - 2, VIEW.width, 2);
    // Level name, left.
    ctx.textAlign = 'left';
    ctx.fillStyle = '#e8dcc0';
    ctx.font = `bold 20px ${SERIF}`;
    ctx.fillText(world.def.name, 16, 28);
    ctx.fillStyle = '#9aa5b8';
    ctx.font = `13px ${SANS}`;
    ctx.fillText(world.def.sub, 16, 48);
    // Loot, centre.
    ctx.textAlign = 'center';
    ctx.fillStyle = COLORS.lootGlow;
    ctx.font = `bold 18px ${SANS}`;
    ctx.fillText(`LOOT  ${world.lootTaken}/${world.loot.length}   $${world.lootValue.toLocaleString('en-US')}`, 640, 26);
    ctx.fillStyle = '#9aa5b8';
    ctx.font = `12px ${SANS}`;
    ctx.fillText(`TIME ${fmtTime(world.time)}`, 640, 48);
    // Tools, right.
    ctx.textAlign = 'right';
    ctx.fillStyle = '#e8dcc0';
    ctx.font = `15px ${SANS}`;
    ctx.fillText(`SMOKE ×${world.thief.smokeLeft} [Q]    EMP ×${world.thief.empLeft} [F]`, 1264, 26);
    ctx.fillStyle = '#9aa5b8';
    ctx.font = `12px ${SANS}`;
    ctx.fillText('WASD move · SHIFT run · E lift loot · click to walk', 1264, 48);
    // Alarm bar, full width at the bottom of the HUD.
    const aw = VIEW.width - 32;
    const frac = clamp(world.alarm / 100, 0, 1);
    const col = frac < 0.55 ? '#3fae5a' : frac < 0.85 ? '#ffb020' : '#ff4040';
    ctx.fillStyle = '#1a2233';
    ctx.fillRect(16, 58, aw, 14);
    ctx.fillStyle = col;
    ctx.fillRect(16, 58, aw * frac, 14);
    ctx.strokeStyle = '#3a4358';
    ctx.lineWidth = 1;
    ctx.strokeRect(16, 58, aw, 14);
    ctx.fillStyle = '#ffffff';
    ctx.font = `bold 11px ${SANS}`;
    ctx.textAlign = 'left';
    ctx.fillText(`ALARM  ${Math.floor(world.alarm)}%`, 22, 69);
    if (world.alarm >= ALARM.warnAt) {
      ctx.fillStyle = '#ff8080';
      ctx.textAlign = 'right';
      ctx.fillText(world.alarm >= 85 ? 'LOCKDOWN IMMINENT' : 'THEY ARE ONTO YOU', 1264, 69);
    }
  }

  drawCenter(ctx, big, small, color) {
    ctx.fillStyle = 'rgba(8, 10, 18, 0.72)';
    ctx.fillRect(0, 0, VIEW.width, VIEW.height);
    ctx.textAlign = 'center';
    ctx.fillStyle = color;
    ctx.font = `bold 54px ${SERIF}`;
    ctx.fillText(big, 640, 330);
    ctx.fillStyle = '#e8dcc0';
    ctx.font = `20px ${SANS}`;
    ctx.fillText(small, 640, 375);
  }

  drawTitle(ctx, game) {
    ctx.fillStyle = 'rgba(8, 10, 18, 0.78)';
    ctx.fillRect(0, 0, VIEW.width, VIEW.height);
    ctx.textAlign = 'center';
    ctx.fillStyle = '#e8c96a';
    ctx.font = `16px ${SANS}`;
    ctx.fillText('A NIGHT AT THE MERIDIAN MUSEUM', 640, 150);
    ctx.fillStyle = '#f4ead2';
    ctx.font = `bold 76px ${SERIF}`;
    ctx.fillText('VELVET VAULT', 640, 235);
    ctx.fillStyle = '#c8ccd4';
    ctx.font = `20px ${SANS}`;
    ctx.fillText('Three heists. One getaway van. Do not get caught.', 640, 280);
    ctx.fillStyle = '#e8dcc0';
    ctx.font = `17px ${SANS}`;
    const lines = [
      'WASD / arrows — move    ·    SHIFT — run (louder)',
      'E (hold) — lift the loot    ·    Q — smoke pellet    ·    F — EMP pulse',
      'Click — walk there    ·    P — pause',
      'Guards and cameras feed the ALARM. At 100% the museum locks down.',
      'The getaway opens only when every piece is in the bag.',
    ];
    lines.forEach((l, i) => ctx.fillText(l, 640, 340 + i * 30));
    ctx.fillStyle = '#ffd34d';
    ctx.font = `bold 22px ${SANS}`;
    ctx.fillText('Press ENTER or click to begin', 640, 540);
    if (game.bestTake > 0) {
      ctx.fillStyle = '#9aa5b8';
      ctx.font = `15px ${SANS}`;
      ctx.fillText(`Best take so far: $${game.bestTake.toLocaleString('en-US')}`, 640, 575);
    }
  }

  drawCaught(ctx, game) {
    ctx.fillStyle = 'rgba(40, 4, 8, 0.78)';
    ctx.fillRect(0, 0, VIEW.width, VIEW.height);
    ctx.textAlign = 'center';
    ctx.fillStyle = '#ff6060';
    ctx.font = `bold 64px ${SERIF}`;
    ctx.fillText('SPOTTED!', 640, 300);
    ctx.fillStyle = '#f4ead2';
    ctx.font = `19px ${SANS}`;
    const msg = game.world.caughtBy || 'The heist is over.';
    ctx.fillText(msg, 640, 345);
    ctx.fillStyle = '#9aa5b8';
    ctx.font = `16px ${SANS}`;
    ctx.fillText(`Loot in the bag: $${game.world.lootValue.toLocaleString('en-US')} — the rest stays in the museum.`, 640, 380);
    ctx.fillStyle = '#ffd34d';
    ctx.font = `bold 22px ${SANS}`;
    ctx.fillText('Press R to retry the heist', 640, 450);
  }

  drawClear(ctx, game) {
    ctx.fillStyle = 'rgba(8, 18, 10, 0.75)';
    ctx.fillRect(0, 0, VIEW.width, VIEW.height);
    ctx.textAlign = 'center';
    ctx.fillStyle = '#7be495';
    ctx.font = `bold 60px ${SERIF}`;
    ctx.fillText('HEIST COMPLETE', 640, 290);
    ctx.fillStyle = '#f4ead2';
    ctx.font = `20px ${SANS}`;
    ctx.fillText(`${game.world.def.name} — take $${game.world.lootValue.toLocaleString('en-US')} in ${fmtTime(game.world.clearTime)}.`, 640, 335);
    ctx.fillStyle = '#ffd34d';
    ctx.font = `bold 22px ${SANS}`;
    ctx.fillText(game.levelIndex + 1 < game.levelCount ? 'Press ENTER for the next heist' : 'Press ENTER for the getaway', 640, 410);
  }

  drawWin(ctx, game) {
    ctx.fillStyle = 'rgba(8, 10, 18, 0.8)';
    ctx.fillRect(0, 0, VIEW.width, VIEW.height);
    ctx.textAlign = 'center';
    ctx.fillStyle = '#ffd34d';
    ctx.font = `bold 60px ${SERIF}`;
    ctx.fillText('THE GETAWAY — CLEAN', 640, 280);
    ctx.fillStyle = '#f4ead2';
    ctx.font = `21px ${SANS}`;
    ctx.fillText(`Three museums. One van. Total take $${game.totalTake.toLocaleString('en-US')} in ${fmtTime(game.totalTime)}.`, 640, 330);
    ctx.fillStyle = '#c8ccd4';
    ctx.font = `17px ${SANS}`;
    ctx.fillText('Mara Voss is already three cities away. The Meridian Museum never saw her.', 640, 365);
    ctx.fillStyle = '#ffd34d';
    ctx.font = `bold 22px ${SANS}`;
    ctx.fillText('Press ENTER to plan the next job', 640, 440);
  }
}
