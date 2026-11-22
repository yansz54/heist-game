// main.js — boot, the screen state machine, and the game loop. Mara Voss
// steals three rooms of the Meridian Museum and drives off in the getaway
// van. ?shot=start|play|alert|clear stages one screenshot scene instead of
// playing, so the screenshots are frames the real game produced.
import { VIEW, STEP, SCREENS } from './config.js';
import { LEVELS } from './levels.js';
import { World } from './world.js';
import { Input } from './input.js';
import { Sounds } from './audio.js';
import { Renderer } from './render.js';
import { stageShot } from './shots.js';

const canvas = document.getElementById('game');
canvas.width = VIEW.width;
canvas.height = VIEW.height;

export const game = {
  screen: SCREENS.TITLE,
  levelIndex: 0,
  levelCount: LEVELS.length,
  world: null,
  totalTake: 0,
  totalTime: 0,
  bestTake: 0,
  sounds: new Sounds(),
  time: 0,
};
window.__game = game;

const input = new Input(canvas);
input.hudOffset = VIEW.hud;
const renderer = new Renderer(canvas);

function freshWorld(index) {
  game.levelIndex = index;
  game.world = new World(LEVELS[index], index, game.sounds);
}

freshWorld(0);

const params = new URLSearchParams(window.location.search);
const shot = params.get('shot');
if (shot) {
  stageShot(shot, game);
  renderer.draw(game);
} else {
  let last = performance.now();
  function frame(now) {
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    game.time += dt;
    game.sounds.ensure();
    if (game.screen === SCREENS.TITLE) {
      game.world.demo(dt);
      if (input.confirmPressed || input.click) {
        game.sounds.click();
        game.totalTake = 0;
        game.totalTime = 0;
        freshWorld(0);
        game.screen = SCREENS.PLAY;
        input.click = null;
      }
    } else if (game.screen === SCREENS.PLAY) {
      if (input.pausePressed) {
        game.screen = SCREENS.PAUSE;
      } else {
        game.world.update(dt, input);
        if (game.world.status === 'clear') {
          game.totalTake += game.world.lootValue;
          game.totalTime += game.world.clearTime;
          game.screen = SCREENS.CLEAR;
        } else if (game.world.status === 'caught') {
          game.screen = SCREENS.CAUGHT;
        }
      }
    } else if (game.screen === SCREENS.PAUSE) {
      if (input.pausePressed || input.confirmPressed) game.screen = SCREENS.PLAY;
    } else if (game.screen === SCREENS.CAUGHT) {
      if (input.retryPressed) {
        game.sounds.click();
        freshWorld(game.levelIndex);
        game.screen = SCREENS.PLAY;
      }
    } else if (game.screen === SCREENS.CLEAR) {
      if (input.confirmPressed) {
        game.sounds.click();
        if (game.levelIndex + 1 < game.levelCount) {
          freshWorld(game.levelIndex + 1);
          game.screen = SCREENS.PLAY;
        } else {
          game.bestTake = Math.max(game.bestTake, game.totalTake);
          game.sounds.win();
          game.screen = SCREENS.WIN;
        }
      }
    } else if (game.screen === SCREENS.WIN) {
      if (input.confirmPressed) {
        game.sounds.click();
        game.totalTake = 0;
        game.totalTime = 0;
        freshWorld(0);
        game.screen = SCREENS.TITLE;
      }
    }
    input.endFrame();
    renderer.draw(game);
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
}
