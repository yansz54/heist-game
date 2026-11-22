// thief.js — Mara Voss. Walks with WASD or arrows, runs with Shift (louder),
// clicks to walk somewhere, holds E to lift loot, spends smoke pellets (Q)
// and EMP pulses (F) — tools cost, so each one is a decision.
import { TILE, THIEF, SMOKE } from './config.js';
import { clamp, dist } from './util.js';

export class Thief {
  constructor(x, y, smoke, emp) {
    this.x = x;
    this.y = y;
    this.facing = 0;
    this.running = false;
    this.moving = false;
    this.inPlant = false;
    this.smokeLeft = smoke;
    this.empLeft = emp;
    this.grabTarget = null;
    this.grabProgress = 0;
    this.clickTarget = null;
    this.stepPhase = 0;
    this.smokeCooldown = 0;
    this.empCooldown = 0;
  }

  update(dt, input, world) {
    this.smokeCooldown = Math.max(0, this.smokeCooldown - dt);
    this.empCooldown = Math.max(0, this.empCooldown - dt);

    // Keyboard direction beats click-to-move; a fresh click sets a target.
    let mx = 0, my = 0;
    if (input.up) my -= 1;
    if (input.down) my += 1;
    if (input.left) mx -= 1;
    if (input.right) mx += 1;
    if (mx !== 0 || my !== 0) this.clickTarget = null;
    else if (input.click && input.click.y > 0) {
      this.clickTarget = { x: input.click.x, y: input.click.y };
      input.click = null;
    }
    if (this.clickTarget) {
      const d = dist(this.x, this.y, this.clickTarget.x, this.clickTarget.y);
      if (d < 6) this.clickTarget = null;
      else {
        mx = (this.clickTarget.x - this.x) / d;
        my = (this.clickTarget.y - this.y) / d;
      }
    }
    const len = Math.hypot(mx, my) || 1;
    this.running = !!input.run;
    const speed = this.running ? THIEF.runSpeed : THIEF.walkSpeed;
    const nx = this.x + (mx / len) * speed * dt;
    const ny = this.y + (my / len) * speed * dt;
    this.moving = mx !== 0 || my !== 0;
    if (this.moving) {
      this.facing = Math.atan2(my, mx);
      if (!world.circleHitsSolid(nx, this.y, THIEF.radius)) this.x = nx;
      if (!world.circleHitsSolid(this.x, ny, THIEF.radius)) this.y = ny;
      this.x = clamp(this.x, TILE / 2, 1280 - TILE / 2);
      this.y = clamp(this.y, TILE / 2, 640 - TILE / 2);
      this.stepPhase += dt * speed * 0.06;
    }
    this.inPlant = world.inPlant(this.x, this.y);

    if (input.smoke && this.smokeLeft > 0 && this.smokeCooldown <= 0) {
      this.smokeLeft -= 1;
      this.smokeCooldown = 0.5;
      world.smokes.push({ x: this.x, y: this.y, left: SMOKE.seconds });
      world.sounds.smoke();
    }
    if (input.emp && this.empLeft > 0 && this.empCooldown <= 0) {
      this.empLeft -= 1;
      this.empCooldown = 0.5;
      for (const c of world.cameras) c.disabled = 6;
      world.sounds.emp();
    }
  }
}
