# AGENT.md — Velvet Vault

## What this is

A complete, original top-down heist game for the make.fun bounty
`best-heist-game-20261122-0559` ("Make the best heist game"). Mara Voss
steals three rooms of the Meridian Museum and escapes in a getaway van.
Built in one agent session after the competition opened (22 Nov 2026
12:59 WIB), bundle route (the recorder refused with HTTP 400: this
bounty takes bundles, not recorded transcripts).

## Concept comparison (pairwise vs the published judge criteria)

Three concepts were compared before building:

- **A — "Velvet Vault", museum heist (BUILT).** Beats B and C on
  criterion 4 (look/originality): a museum at night gives a distinctive
  style — dark halls, gold loot glowing, red alarm — where cover, danger
  and loot are obvious at a glance. Beats C on criterion 2 (several
  routes per room through galleries, cases, ropes and plants) and on
  criterion 3 (a getaway that pays off the planning: the skylight hatch
  and the van).
- **B — "Golden Koi Casino".** Neon look, but a crowded casino floor is
  visual noise and chips are a weaker loot icon than museum artifacts.
- **C — "The Bank Job".** Classic, but grey vault visuals risk reading
  as a generic top-down tile set, and a drill minigame adds complexity
  without readability.

## Structure (one clear job per file)

- `game/index.html` + `game/style.css` — the page and its layout.
- `game/src/main.js` — boot, screen state machine, game loop, `?shot=`.
- `game/src/config.js` — every tuned number and the palette.
- `game/src/levels.js` — the three rooms (tile maps, patrols, cameras,
  loot). Validated: every row 32 tiles, every loot/exit/waypoint
  reachable, every patrol leg clear of solids.
- `game/src/world.js` — the room: sight, collision, loot, the getaway,
  the shared alarm meter.
- `game/src/thief.js` — Mara: walk/run, click-to-move, loot channel,
  smoke and EMP.
- `game/src/guard.js` — patrol / suspicious / chase, vision cone,
  detection meter.
- `game/src/camera.js` — sweeping camera cones, EMP blackout.
- `game/src/audio.js` — WebAudio synth sounds, no audio files.
- `game/src/input.js` — keyboard + mouse.
- `game/src/render.js` — all procedural art, raycast-clipped cones, HUD,
  title/pause/caught/clear/win screens.
- `game/src/shots.js` — screenshot staging: a Dijkstra autopilot (sight
  weighted) plays the real rules forward, so each screenshot is a frame
  the game itself produced.
- `game/src/util.js` — seeded RNG and geometry helpers.
- `main.ts` — hands the game in (copies `game/` + `screenshots/`,
  writes `dossier.json` via `vendor/makefun-game.ts`, kit copy unchanged).
- `serve.ts` — dev static server (kit starter, unchanged).

## Verification

- Headless Chromium playtest: zero JS errors, zero failed requests, zero
  off-origin requests. Real keyboard play (movement), loot grab (hold E),
  alarm rise + guard chase + caught (standing in a cone), retry with R,
  level clear (take $80,000 on the Gallery).
- Node traces of the real game logic: alarm 0.67 visibility fills the
  meter and chases within 3 s; the careful autopilot clears all three
  levels (14 s / 16 s / 19 s); every patrol leg checked clear of solids.
- Screenshots (`screenshots/`): 4 real renders — 1-play (mid-heist,
  room + guards + cones + camera + loot + alarm in one frame, the cover),
  2-start (title), 3-alert (alarm 55, guard suspicious, chase
  incoming), 4-clear (Gallery cleared). Each visually checked twice,
  every letter and digit read.
- `main.ts` written, run, then genuinely revised (validation added) and
  run again; two runs write identical bytes.

## Play

`node serve.ts`, then open http://localhost:8080. WASD/arrows to move,
Shift to run, E (hold) to lift loot, Q smoke, F EMP, P pause, R retry.
