# ROMA

A 3D Caesar III style city builder that runs in the browser.

**Play it:** https://moai-heads.github.io/roma/

## What's in it

- **Point-to-point servant pathing** — carts spawn at the Marketplace and run A* over the road
  network to a specific household's doorstep, deliver, then A* back. No random walking.
- **Water is a radius, not a cargo** — Well (6), Cistern (12, needs its own supply),
  Aqueduct (18, must touch a well or cistern). Chain them to push water across the map.
- **Soil matters** — a noise-based fertility map. Wheat needs 45%, olives 60%.
  Woodcutters slowly strip the ground around them. Press `F` for the overlay.
- **Goods ladder** — food → pottery → tools → wine/luxury.
  Tent → Hovel → Domus → Townhouse → Mansion.
- **Economy** — households pay tax scaled by tier and desirability, everything costs upkeep,
  deficits decay services and eventually downgrade houses.
- **21 building types**, 72×72 map, 3D via three.js.

## Controls

| Key | Action |
|---|---|
| drag | place building / draw road |
| right-drag | pan |
| shift-drag | orbit |
| wheel | zoom |
| `Q` `E` `X` | road / inspect / demolish |
| `G` | show servant paths |
| `F` | fertile soil overlay |
| `C` | production chain chart |
| `space` | pause |

Built with three.js (inlined) — no build step, no external requests.
