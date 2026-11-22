// config.js — one place for every number the game tunes by.
// Canvas: 1280x720. The top 80 px are the HUD; below it one whole museum
// room, 32 x 16 tiles of 40 px, so the whole heist is visible in one frame.
export const VIEW = { width: 1280, height: 720, hud: 80 };
export const TILE = 40;
export const COLS = 32;
export const ROWS = 16;
export const STEP = 1 / 60;

export const THIEF = {
  radius: 13,
  walkSpeed: 175,
  runSpeed: 262,
  grabSeconds: 1.2,
  smokeStart: 3,
  empStart: 2,
};

export const GUARD = {
  radius: 13,
  patrolSpeed: 72,
  chaseSpeed: 152,
  coneRange: 235,
  coneHalfAngle: 0.55,
  // Meter fills while the thief is seen; drains in cover.
  meterFill: 1.35,
  meterDrain: 0.45,
  noticeAt: 0.35,
};

export const CAMERA = {
  range: 285,
  halfAngle: 0.42,
  sweepSpeed: 0.55, // radians per second, back and forth
  sweepArc: 0.9, // radians either side of the base angle
  // Alarm per second while the thief is in a live camera cone.
  alarmPerSecond: 30,
  empSeconds: 6,
};

export const ALARM = {
  // Alarm per second from one guard seeing the thief (times visibility 0..1).
  guardPerSecond: 26,
  drainPerSecond: 7,
  caughtAt: 100,
  // Alarm bands the HUD and the music read.
  warnAt: 55,
};

export const SMOKE = {
  seconds: 4,
  radius: 95,
};

export const SCREENS = {
  TITLE: 'title',
  PLAY: 'play',
  PAUSE: 'pause',
  CAUGHT: 'caught',
  CLEAR: 'clear',
  WIN: 'win',
};

// Palette: a museum at night. Warm gold for loot, red for danger, teal night.
export const COLORS = {
  floorA: '#2b2118',
  floorB: '#33291d',
  wall: '#141a26',
  wallTop: '#232c40',
  caseGlass: 'rgba(150, 200, 220, 0.16)',
  caseTrim: '#8a6d2f',
  pillar: '#4a4238',
  rope: '#a3333a',
  plant: '#2e5d3a',
  plantDark: '#24492e',
  lootGlow: '#ffd34d',
  thief: '#7a2e3d',
  thiefTrim: '#e8c96a',
  guard: '#2c3a55',
  guardTrim: '#c8ccd4',
  coneCalm: '255, 220, 90',
  coneWarn: '255, 170, 40',
  coneChase: '255, 64, 64',
  cameraCone: '90, 200, 255',
  exitLocked: '#8a2f2f',
  exitOpen: '#2f8a4a',
  moonlight: 'rgba(140, 180, 255, 0.07)',
};
