# Velvet Vault — A Night at the Meridian Museum

[![make.fun · best-heist-game-20261122-0559](https://make.fun/badge/best-heist-game-20261122-0559.svg)](https://make.fun/bounty/best-heist-game-20261122-0559?utm_source=github&utm_medium=readme&utm_campaign=best-heist-game-20261122-0559)
[![make.fun · best-heist-game-20261122-0559 · rank](https://make.fun/badge/best-heist-game-20261122-0559/yansz54/heist-game/rank.svg)](https://make.fun/bounty/best-heist-game-20261122-0559/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=best-heist-game-20261122-0559)
[![make.fun · best-heist-game-20261122-0559 · reward](https://make.fun/badge/best-heist-game-20261122-0559/yansz54/heist-game/reward.svg)](https://make.fun/bounty/best-heist-game-20261122-0559?utm_source=github&utm_medium=readme&utm_campaign=best-heist-game-20261122-0559)

**Velvet Vault** is a complete top-down heist game that plays offline in a
desktop browser. Mara Voss breaks into the Meridian Museum at night for
three heists — the Gallery, the Vault Hall, the Rooftop — lifts the loot,
and reaches the getaway without tripping the alarm.

## How it plays

- **Move** with WASD or arrows (Shift to run — louder), or click to walk.
- **Lift loot** by standing by it and holding E. Every piece takes 1.2 s.
- **Guards** patrol with vision cones clipped by the walls. A guard that
  half-sees Mara investigates; a guard that is sure chases, and a touch
  ends the heist.
- **Cameras** sweep their cones across the room. What they see feeds the
  alarm fast.
- **The alarm** is one shared meter (0–100). It rises while anyone sees
  Mara and drains while she hides. At 100% the museum locks down.
- **Tools, at a cost:** Q drops a smoke pellet (4 s of cover), F fires an
  EMP pulse that blacks out the cameras for 6 s. Both are limited per heist.
- **The getaway** opens only when every piece in the room is in the bag.
  Reach it to clear the heist; clear all three to drive off clean.

## The game

- 3 heists with rising difficulty: 2 guards + 1 camera, then 3 + 2, then
  3 + 3, with tighter rooms and more loot per heist.
- Several routes per room: display cases and pillars block sight, velvet
  ropes block walking only, potted plants hide Mara.
- Title, pause, caught, heist-clear and getaway screens; HUD with loot,
  take, alarm meter, timer and tools; WebAudio synth sounds (no audio
  files); procedural night-museum art (no images loaded from anywhere).
- Everything under `game/` is static files — no build step, no network.

## Play it

```sh
node serve.ts        # then open http://localhost:8080
```

## Entry

Built for the [make.fun bounty "Make the best heist game"](https://make.fun/bounty/best-heist-game-20261122-0559)
(`best-heist-game-20261122-0559`). `main.ts` copies `game/` and
`screenshots/` to `/output` and writes `/output/dossier.json`.
