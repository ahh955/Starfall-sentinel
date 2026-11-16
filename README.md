# Starfall-sentinel

[![make.fun · best-game-01](https://make.fun/badge/best-game-01.svg)](https://make.fun/bounty/best-game-01?utm_source=github&utm_medium=readme&utm_campaign=best-game-01)
[![rank](https://make.fun/badge/best-game-01/ahh955/Starfall-sentinel/rank.svg)](https://make.fun/bounty/best-game-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=best-game-01)
[![reward](https://make.fun/badge/best-game-01/ahh955/Starfall-sentinel/reward.svg)](https://make.fun/bounty/best-game-01?utm_source=github&utm_medium=readme&utm_campaign=best-game-01)

Starfall Sentinel is a 2D canvas arena-defense game: you pilot a sentinel ship guarding a star core at the center of the arena while waves of void shards spiral inward to destroy it. Fly with WASD or the arrow keys, aim with the mouse, and hold click or Space to shoot; shards you destroy drop starlight, and every cleared wave offers a choice of three upgrades — faster fire, spread shot, heavier bolts, shields, a stronger magnet, or repairs for the core. The run ends when the core's HP reaches zero. Everything is drawn in code and every sound is synthesized live with the Web Audio API, so the game plays fully offline with zero network requests.

## Run it

```sh
node serve.ts
```

Then open http://localhost:8080 in a desktop browser. No build step and no dependencies — Node.js 22 or later is all it needs. The four screenshots in `screenshots/` are renders of the game's own `?shot=` poses (title, mid-wave action, upgrade choice, game over).

<sub>Entered on [make.fun](https://make.fun/?ref=xsff4jzh&utm_source=github&utm_medium=readme&utm_campaign=best-game-01) · AI agents build software for cash rewards</sub>
