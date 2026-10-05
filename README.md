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
| `V` | cycle field overlay: desirability / mood / sin / crime |
| `space` | pause |

Built with three.js (inlined) — no build step, no external requests.


## Fields, sin and crime

Four fields: **desirability**, **mood**, **sin**, **crime**. None of them are bitmaps —
each is a list of point influences, and a cached `Float32Array` is only ever a derived
view of that list (invalidated and repainted when the city changes). Two layers:

- **stable** — every building registers a source (`{x,z,amp,radius}`) when placed, and
  unregisters it by identity when demolished. Repainted only on invalidation.
- **decaying** — timed influences (`born` timestamp), amplitude `A·exp(-λ·age)`, culled
  after their lifetime. Robberies, cart thefts and the murder of a prefect all drop
  negative sources onto the desirability field; a criminal killed leaves a *negative*
  influence on the crime field, so the area genuinely clears out for a while.

Nothing depends on the cached value, so there is no term that can diverge.

- `mood` is a lagging state (EMA, τ≈8s) chasing `tanh(desirability/14 − 0.30)` minus
  shortages (no water, no food, deficit, high tax) minus local sin.
- `crime = tanh( sin · (1 − mood)^1.5 · 2.4 )` — negative mood amplifies sin, but sin
  alone is never harmless, and it saturates rather than exploding to infinity.
- Bad mood (below −0.22), or mood under −0.05 with food failing, drives a house back
  down a tier. Bad mood also blocks growth.

**V** cycles the overlay: off / desirability / mood / sin / crime.

### Vice and law

Alehouse, Gambling Den, Brothel and Opium Den project sin and negative desirability, and
pay tax that scales with the sin actually around them times the neighbourhood's
tolerance — a contented, sin-free block pays nothing, and below mood −0.55 the building
is condemned and earns nothing. Sustained high sin evolves an Alehouse into a Gambling
Den and a Brothel into an Opium Den. Temples project negative sin.

Trade has been removed: the Trading Post is gone and the goods ladder is fully local.

**Tax collectors** A\* to the richest household with outstanding tax, take it into an
unbounded purse, then walk it to the market. Tax left uncollected for 4 months is
recovered by the state at 85%. Criminals stand in the street and hit whoever walks into
reach — a collector loses the entire purse, and supply carts get robbed in lawless
corners, which starves the houses they were serving. **Watchtowers** respawn prefects
every 18s; they A\* to the crime the field reports and fight, and they can die.

## The vice / law layer

Four buildings sit in the **Vice** category and pay a cut straight to the treasury,
scaling with how much sin is actually around them and how tolerant the neighbourhood is:

`Alehouse → Gambling Den → Opium Den`, each step gated on sustained local sin.

- **Opium Den that stays in sin > 0.62 for 45s becomes a Lararium** — a shrine the
  district built for itself. It projects **sin −0.55 over r11** (harder than a temple's
  −0.34) and +3 desire, and still pays tax. Two Larariums will scrub a district clean.
- A vice block whose mood falls below **−1.15** is **condemned** and pays nothing.

**Tax collectors** walk the road graph greedily, richest debtor first, up to 16 stops per
circuit, taking each household's whole debt into their purse — there is no purse ceiling,
they carry everything — then deliver it to the Market. If a thief empties the purse the
collector keeps walking the rest of their route with an empty bag.

**Criminals** never hunt. They stand on a road tile chosen by `crime × traffic` and hit
whatever steps on it: a collector loses their **entire** purse, a supply cart is
destroyed. Robberies and cart thefts drop negative desirability sources.

**Prefects** respawn on a fixed 18s timer per Watchtower, A* to the nearest reported
criminal and brawl in attrition combat. A prefect can die. A criminal killed drops a
**negative influence on the crime field** — the area genuinely clears out for a while.
There is no law field and no crime ceiling; the runaway is the point.
