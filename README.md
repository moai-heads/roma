# ROMA

A Caesar III style 3D city builder that runs in a browser.

## Run it

Open `index.html`. That's it — the entire game is that one file: three.js, CSS,
markup and game code are all inlined. No server, no build step, no dependencies.

Or play it live: <https://moai-heads.github.io/roma/>

## Controls

| | |
|---|---|
| drag / `WASD` | pan camera |
| wheel | zoom |
| click a card | arm a build tool (click again to disarm) |
| `Esc` / right-click / `N` | back to neutral (click to inspect a building) |
| `V` | cycle field overlays: off, desire, mood, sin, crime |
| `C` | production chains |
| `R` | rotate before placing |
| `X` | bulldoze |
| space | pause / unpause |
| `1` `2` `3` | game speed |

## Editing

`index.html` is the source of truth. There is no generated copy and no build
script — edit it directly.

## Tests

Tests live in `t/` and are run from the repo root, e.g. `node t/verify.mjs`.
They load the same `index.html` the browser serves, and `t/verify.mjs` asserts
the page is genuinely self-contained so it can't quietly grow a second file
again.
