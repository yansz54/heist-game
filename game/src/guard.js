// guard.js — a museum guard with a vision cone and a three-step mind:
// PATROL the waypoints, SUSPICIOUS when something half-seen pulls it over
// to look, CHASE when it is sure. A detection meter fills while Mara is
// inside the cone with a clear line of sight, faster up close, slower when
// she hides in the plants or walks; it drains in cover. Getting caught ends
// the level, so the meter always gives a way back.
import { TILE, GUARD } from './config.js';
import { clamp, dist, angleTo, angleDiff } from './util.js';

export const GUARD_STATE = { PATROL: 'patrol', SUSPICIOUS: 'suspicious', CHASE: 'chase' };

export class Guard {
  constructor(def, world) {
    this.world = world;
    this.waypoints = def.waypoints.map(([tx, ty]) => ({
      x: (tx + 0.5) * TILE,
      y: (ty + 0.5) * TILE,
    }));
    this.pauseTime = def.pause || 1;
    this.wpIndex = 0;
    this.x = this.waypoints[0].x;
    this.y = this.waypoints[0].y;
    this.facing = 0;
    this.state = GUARD_STATE.PATROL;
    this.meter = 0; // 0..1, 1 = sure
    this.pauseLeft = 0;
    this.lookTimer = 0;
    this.lookAngle = 0;
    this.chaseLost = 0;
    this.investigate = null;
    this.lastSeen = null;
    this.caught = false;
    this.stepPhase = 0;
  }

  // Is Mara visible right now? Returns a visibility factor 0..1.
  visibilityOf(player, world) {
    if (world.inSmoke(this.x, this.y) || world.inSmoke(player.x, player.y)) return 0;
    const d = dist(this.x, this.y, player.x, player.y);
    if (d > GUARD.coneRange) return 0;
    const ang = angleTo(this.x, this.y, player.x, player.y);
    if (Math.abs(angleDiff(this.facing, ang)) > GUARD.coneHalfAngle) return 0;
    if (!world.clearSight(this.x, this.y, player.x, player.y)) return 0;
    // Closer means easier to spot; plants hide well, running is loud.
    let v = 1 - (d / GUARD.coneRange) * 0.65;
    if (player.inPlant) v *= 0.14;
    if (player.running) v *= 1.5;
    return clamp(v, 0.05, 1);
  }

  update(dt, player, world) {
    const vis = this.visibilityOf(player, world);
    const wasMeter = this.meter;
    if (vis > 0) {
      this.meter = clamp(this.meter + vis * GUARD.meterFill * dt, 0, 1);
      this.lastSeen = { x: player.x, y: player.y };
    } else {
      this.meter = clamp(this.meter - GUARD.meterDrain * dt, 0, 1);
    }
    if (wasMeter < GUARD.noticeAt && this.meter >= GUARD.noticeAt && this.state === GUARD_STATE.PATROL) {
      this.state = GUARD_STATE.SUSPICIOUS;
      this.investigate = this.lastSeen ? { ...this.lastSeen } : { x: player.x, y: player.y };
      this.lookTimer = 0;
      world.sounds.noticed();
    }
    if (this.meter >= 1 && this.state !== GUARD_STATE.CHASE) {
      this.state = GUARD_STATE.CHASE;
      this.chaseLost = 0;
      world.sounds.alert();
    }
    if (this.state === GUARD_STATE.PATROL) this.updatePatrol(dt);
    else if (this.state === GUARD_STATE.SUSPICIOUS) this.updateSuspicious(dt);
    else this.updateChase(dt, player);

    // Touching Mara while chasing ends the level.
    if (this.state === GUARD_STATE.CHASE && dist(this.x, this.y, player.x, player.y) < 26) {
      this.caught = true;
    }
  }

  moveToward(tx, ty, speed, dt) {
    const d = dist(this.x, this.y, tx, ty);
    if (d < 2) return true;
    const step = Math.min(d, speed * dt);
    const nx = this.x + ((tx - this.x) / d) * step;
    const ny = this.y + ((ty - this.y) / d) * step;
    this.facing = angleTo(this.x, this.y, tx, ty);
    if (!this.world.circleHitsSolid(nx, this.y, GUARD.radius)) this.x = nx;
    if (!this.world.circleHitsSolid(this.x, ny, GUARD.radius)) this.y = ny;
    this.stepPhase += dt * speed * 0.06;
    return d <= speed * dt + 2;
  }

  updatePatrol(dt) {
    if (this.pauseLeft > 0) {
      this.pauseLeft -= dt;
      this.facing += Math.sin(this.timeNow() / 1400 + this.wpIndex) * 0.35 * dt;
      return;
    }
    const wp = this.waypoints[this.wpIndex];
    if (this.moveToward(wp.x, wp.y, GUARD.patrolSpeed, dt)) {
      this.wpIndex = (this.wpIndex + 1) % this.waypoints.length;
      this.pauseLeft = this.pauseTime;
    }
  }

  timeNow() {
    return this.world ? this.world.time * 1000 : 0;
  }

  updateSuspicious(dt) {
    if (this.investigate) {
      if (this.moveToward(this.investigate.x, this.investigate.y, GUARD.patrolSpeed * 1.25, dt)) {
        this.investigate = null;
        this.lookTimer = 2.2;
        this.lookAngle = this.facing;
      }
      return;
    }
    this.lookTimer -= dt;
    this.facing = this.lookAngle + Math.sin((2.2 - this.lookTimer) * 2.4) * 1.1;
    if (this.lookTimer <= 0) {
      this.state = GUARD_STATE.PATROL;
      this.meter = Math.min(this.meter, 0.3);
    }
  }

  updateChase(dt, player) {
    const vis = this.visibilityOf(player, this.world);
    if (vis > 0) {
      this.chaseLost = 0;
      this.lastSeen = { x: player.x, y: player.y };
    } else {
      this.chaseLost += dt;
    }
    const target = this.lastSeen || { x: player.x, y: player.y };
    this.moveToward(target.x, target.y, GUARD.chaseSpeed, dt);
    if (this.chaseLost > 2.5) {
      this.state = GUARD_STATE.SUSPICIOUS;
      this.investigate = this.lastSeen ? { ...this.lastSeen } : null;
      this.lookTimer = 0;
      this.meter = 0.55;
    }
  }

  // Cone colour and label for the renderer.
  coneStyle() {
    if (this.state === GUARD_STATE.CHASE) return { fill: '255,64,64', edge: '255,120,120', label: '!' };
    if (this.state === GUARD_STATE.SUSPICIOUS || this.meter > GUARD.noticeAt) return { fill: '255,170,40', edge: '255,200,90', label: '?' };
    return { fill: '255,220,90', edge: '255,235,150', label: '' };
  }
}
