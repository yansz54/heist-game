# HANDOVER — best-heist-game-20261122-0559

Build complete and verified. Parent: publish this dir to GitHub
`yansz54/heist-game`, bundle this session, submit.

## What was built

**Velvet Vault — A Night at the Meridian Museum**: a complete top-down
heist game, 3 levels (The Gallery, The Vault Hall, The Rooftop), in
`~/workspace/makefun/heist-game/`.

- **Thief:** Mara Voss. WASD/arrows + click-to-move, Shift to run (louder),
  hold E 1.2 s to lift loot, Q smoke pellet (4 s cover), F EMP pulse
  (cameras blacked out 6 s). Both tools limited per heist, so each is a
  decision.
- **Watchers:** guards patrol with raycast vision cones clipped by walls
  (patrol → suspicious → chase, detection meter, fair catch by touch);
  wall cameras sweep cones. Both feed one shared **alarm meter 0–100**
  (rises while seen, drains while hidden; 100% = lockdown = caught).
- **Getaway:** the exit stays LOCKED (red) until every piece is bagged,
  then opens green; reach it to clear. 3 heists, rising difficulty
  (2 guards + 1 camera → 3 + 2 → 3 + 3).
- **Depth:** several routes per room — display cases and pillars block
  sight, velvet ropes block walking only, potted plants hide Mara.
- **Polish:** title / pause / caught / clear / win screens, HUD (loot,
  take $, alarm bar, timer, tools), WebAudio synth sounds (no audio
  files), procedural night-museum art (no images, no fonts loaded).

## Concept comparison (pairwise vs judge criteria)

A museum heist beat a casino heist (crowded neon floor = visual noise,
chips a weaker loot icon) and a bank job (grey vault reads as a generic
top-down tile set). Museum wins on criterion 4 (cover/danger/loot obvious
at a glance) and criterion 3 (the getaway pays off the planning).

## Verification (all passed)

- Headless Chromium playtest: **zero JS errors, zero failed requests,
  zero off-origin requests**. Real keyboard play (movement), loot grab
  (hold E, $42,000), alarm rise with a valid line of sight (guard chased
  and caught Mara), retry with R, level clear (take $80,000), smoke
  (3→2, cloud active) and EMP (2→1, camera blacked out 5.6 s).
- Node traces of the real logic: alarm fills and chases within 3 s at
  0.67 visibility; the careful autopilot clears all three levels
  (14 s / 16 s / 19 s); every patrol leg checked clear of solids
  (6 bad routes found and fixed before playtesting).
- Screenshots (`screenshots/`, 1280×720, each ≤70 KB): 1-play (cover:
  mid-heist, room + guards + cones + cameras + loot + alarm 18% in one
  frame), 2-start (title), 3-alert (alarm 55%, guard suspicious,
  "THEY ARE ONTO YOU"), 4-clear (Gallery cleared, $80,000 in 0:13).
  Each visually checked twice, every letter and digit read — no defects.
- `main.ts` written, run, then genuinely revised (pre-flight validation
  added) and run again; two runs write byte-identical output.
  Dossier builds (403,052 bytes, 14 source files, 62,187 text bytes).
- No network references in `game/`, no `fetch`, no font files.
  `vendor/makefun-game.ts` is the kit copy unchanged (sha256 verified
  on copy).

## Route: BUNDLE

`makefun record` refused with HTTP 400 as expected for this bounty
("does not take recorded transcripts"). Quota at check: today 5 of 5
left, hard 40 of 40. Parent bundles this builder session (find it by
this run's agent id — the session file lives under
`/home/hatch/agents/agent-<this-run>/sessions/<this-run>.jsonl`) with
usage file
`~/.makefun/muse-usage-best-heist-game-20261122-0559.jsonl` (parent
writes the usage rows), system prompt
`~/workspace/system/system_prompt.md`, prompt file
`~/workspace/makefun/heist-game-prompt.txt` (verbatim 67-byte user
message). Entries close 23 Nov 00:59 WIB; $50 total, top 10 share.

## Files in this dir

- `main.ts`, `serve.ts`, `LICENSE` (MIT, line 1 SPDX), `README.md`
  (3 link-wrapped live badges), `AGENT.md`, `HANDOVER.md` (this file).
- `game/` (index.html, style.css, src/*.js — 14 files, 61,244 bytes),
  `screenshots/` (4 JPEGs), `vendor/makefun-game.ts` (unchanged).
- No font files. No network at runtime.
