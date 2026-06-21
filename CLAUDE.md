# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Overview

A multi-file vanilla JS web app for planning a trip to Knoebels amusement park. Users add party members, rate rides by tier, mark attractions and games they want, see cost estimates and purchase recommendations, and track rides actually taken on the day.

No build system, package manager, or test suite. Development is open `index.html` in a browser.

## File structure

| File | Role |
|---|---|
| `index.html` | HTML shell — all views and tab buttons |
| `style.css` | All styles; CSS custom properties in `:root` (`--k-green`, `--k-gold`, `--k-parch`, etc.) |
| `data.js` | Static data: `RIDES`, `ATTRACTIONS`, `GAMES`, `CAT_COLORS`, `TIERS`, pricing constants |
| `state.js` | All mutable state + pure calculation functions (`calcCost`, `recommendBooks`, etc.) |
| `render.js` | All `render*()` and `showView()` functions; imports from `state.js` and `data.js` |
| `main.js` | Event handlers, `addPerson`/`removePerson`, `setTier`, filter/sort setters, plan init IIFE; exposes everything to `window` |
| `share.js` | Save/load/share — compact binary-compressed URL encoding (version 2 format) and JSON file save |

`main.js` is loaded as `<script type="module">` and explicitly assigns all handlers to `window` at the bottom via `Object.assign(window, {...})` so inline `onclick` attributes work.

## Views

Six tabs toggled by `showView(v)` in `render.js`, which sets `display` on each `#view-*` div and calls the relevant render function:

| Tab | View element | Renders |
|---|---|---|
| Party | `#view-party` | Party cards, group summary, ride report, attractions/games report |
| Rides | `#view-rides` | Ride list with tier buttons; category + tier + sort filters |
| Attractions | `#view-attractions` | Attraction list with interest toggles; sort filter |
| Games | `#view-games` | Games list with interest toggles; sort filter |
| Summary | `#view-summary` | Config inputs + per-person cost breakdown + ticket recommendations |
| Checklist | `#view-checklist` | Per-person ride counter (for day-of tracking); tier + sort filters |

Each view except Party and Summary has a `#person-tabs-*` bar; `renderPersonTabs()` renders into all four containers at once.

## State variables (`state.js`)

| Variable | Purpose |
|---|---|
| `persons` | `{name, id}[]` |
| `ratings` | `{[pid]: {[rideIdx]: tier}}` — tier is `"must"` \| `"want"` \| `"maybe"` \| `"nope"` |
| `attractionRatings` | `{[pid]: {[attrIdx]: true}}` |
| `gameRatings` | `{[pid]: {[gameIdx]: true}}` |
| `checklist` | `{[pid]: {[rideIdx]: count}}` — integer ride counts for day-of tracking |
| `activePerson` | ID of the currently viewed person (shared across all tabs) |
| `activeCat` | Rides category filter (`"all"` or category name) |
| `activeTierFilter` | Rides tier filter |
| `activeSort` | Rides sort (`"name"`, `"price-asc"`, `"price-desc"`, `"wanted"`) |
| `activeAttrSort` | Attractions sort (same values minus `"wanted"`, plus `"interested"`) |
| `activeGameSort` | Games sort |
| `activeChecklistTierFilter` | Checklist tier filter (filters by the person's planned tier for each ride) |
| `activeChecklistSort` | Checklist sort (`"name"`, `"price-asc"`, `"price-desc"`, `"most-ridden"`) |
| `mustMult` / `wantMult` / `maybePct` / `gameMult` | Summary config (defaults: 2×, 1×, 50%, 2×) |
| `currentView` | Active tab name |

State mutations always end with a `render*()` call. No reactivity — full re-renders via `innerHTML`.

## Key behaviors

- **`setTier(idx, tier)`** — clicking the active tier removes the rating (toggle off)
- **`toggleAttraction(idx)`** — clears whole `group` first (radio exclusivity), then checks `comboWith`/`comboResult` to auto-upgrade to a combo item
- **`incrementRide(idx)` / `decrementRide(idx)`** — mutate `checklist[activePerson][idx]`; decrement removes the key at zero
- **`calcCost(pid, tierMults)`** — sums `ride.price × tierMults[tier]` for rated rides; `tierMults` is a sparse object so unmatched tiers contribute nothing
- **`recommendBooks(amount)`** — nested loop over `RIDE_BOOK_DENOMS` ($20/$50/$100/$200/$500) to find the minimum-cost covering combination
- **`gameTicketRec(est)`** — floor-based: buy full books whose $21 value will be used, plus one more if the remainder exceeds the $20 book cost

## Data shapes (`data.js`)

- **`RIDES`** — `{name, price, cat}[]` (~58 rides); `cat` matches keys in `CAT_COLORS`
- **`ATTRACTIONS`** — `{name, price, priceType, group?, comboWith?, comboResult?}`; `priceType` is `"free"` | `"fixed"` | `"starting_at"`
- **`GAMES`** — `{name, price, unit, winnerEveryTime?}`

## Plan persistence (`share.js`)

All three mechanisms share the same payload, which now includes `checklist`:

| Mechanism | How |
|---|---|
| **Save** | JSON file download (`knoebels-plan.json`) |
| **Load** | File picker → `FileReader`; validates `persons` array + `ratings` object |
| **Share** | `#plan=<base64>` URL hash; deflate-raw compressed, version 2 compact format |

The compact format (`buildCompact`/`expandCompact`) encodes rides as a fixed-length tier string per person, attractions/games as sorted index arrays, and checklist as `[idx, count]` pairs. Old uncompressed payloads are handled as a fallback in `planFromB64`.

## Checklist tab

The Checklist tab is for day-of use at the park. It shares `activePerson` with the other tabs.

- Each ride row shows the person's planned tier badge (`.ot-tier .ot-must` etc.), ride price, running subtotal (`count × price`), and `−`/`+` counter buttons
- Metrics at the top (unique rides, total rides taken, total spent, pass savings/loss) always reflect unfiltered totals for the person
- **Tier filter** — filters the visible ride list by the person's planned tier rating; useful for "show only my must-do rides"
- **Sort** — Name A–Z, Price High–Low, Price Low–High, Most Ridden (descending by count, then alpha)
