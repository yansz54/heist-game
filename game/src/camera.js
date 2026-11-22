// camera.js — a wall-mounted security camera. It sweeps its cone back and
// forth across its arc; anything it sees feeds the alarm fast. An EMP pulse
// knocks it out for a few seconds, and smoke blinds it like everything else.
import { TILE, CAMERA } from './config.js';
import { clamp, dist, angleTo, angleDiff } from './util.js';

export class Camera {
  constructor(def, world) {
    this.world = world;
    const cx = (def.tile[0] + 0.5) * TILE;
    const cy = (def.tile[1] + 0.5) * TILE;
    // The lens sits just off the wall face, inside the room, so its own wall
    // never blocks its sight line.
    this.x = cx + Math.cos(def.baseAngle) * (TILE / 2 + 6);
    this.y = cy + Math.sin(def.baseAngle) * (TILE / 2 + 6);
    this.baseAngle = def.baseAngle;
    this.sweep = def.sweep || CAMERA.sweepArc;
    this.phase = 0;
    this.facing = def.baseAngle;
    this.disabled = 0; // seconds left of EMP blackout
  }

  // Visibility factor 0..1 for the thief right now; 0 when blacked out.
  visibilityOf(player, world) {
    if (this.disabled > 0) return 0;
    if (world.inSmoke(this.x, this.y) || world.inSmoke(player.x, player.y)) return 0;
    const d = dist(this.x, this.y, player.x, player.y);
    if (d > CAMERA.range) return 0;
    const ang = angleTo(this.x, this.y, player.x, player.y);
    if (Math.abs(angleDiff(this.facing, ang)) > CAMERA.halfAngle) return 0;
    if (!world.clearSight(this.x, this.y, player.x, player.y)) return 0;
    let v = 1 - (d / CAMERA.range) * 0.5;
    if (player.inPlant) v *= 0.25;
    return clamp(v, 0.1, 1);
  }

  update(dt, player, world) {
    this.disabled = Math.max(0, this.disabled - dt);
    this.phase += dt * CAMERA.sweepSpeed;
    // Sweep back and forth across the arc, pausing at each end.
    this.facing = this.baseAngle + Math.sin(this.phase) * this.sweep;
  }
}
