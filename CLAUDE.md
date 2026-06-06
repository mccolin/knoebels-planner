# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Overview

This is a single-file HTML application (`index.html`) for planning a trip to Knoebels amusement park. Users add people, rate rides by tier, mark attractions and games they're interested in, and see per-person and group cost estimates with purchase recommendations.

There is no build system, package manager, or test suite. Development is open-the-file-in-a-browser. The file is standalone (not embedded) — CSS custom properties are defined in `:root` and the Tabler Icons webfont is loaded from a CDN.

## Architecture

Everything lives in one file with three sections:

1. **`<style>`** — Inline CSS using CSS custom properties defined in `:root` (`--font-sans`, `--border-radius-lg/md`, `--k-green`, `--k-gold`, etc.). Includes responsive breakpoints at `min-width:640px` (desktop font bumps) and `max-width:540px` (mobile ride row wrapping).

2. **HTML** — Four views (`#view-rides`, `#view-attractions`, `#view-games`, `#view-summary`) toggled by `showView()`. The header contains Save/Load plan buttons. Each view except Summary has per-person tab bars sharing the `activePerson` global.

3. **`<script>`** — Vanilla JS, no dependencies. Key data:
   - `RIDES` — static array of `{name, price, cat}` (~58 rides with prices and category)
   - `ATTRACTIONS` — static array of `{name, price, priceType, group?, comboWith?, comboResult?}` (free/fixed/starting_at pricing; `group` enforces radio-style mutual exclusivity within a group; `comboWith`+`comboResult` auto-upgrades selections to a combo item)
   - `GAMES` — static array of `{name, price, unit, winnerEveryTime?}` (~25 midway games with per-play prices and unit descriptions)
   - `CAT_COLORS` — map of ride category → hex color
   - `TIERS` / `TIER_LABELS` — ride rating tier definitions

## State variables

| Variable | Purpose |
|---|---|
| `persons` | `{name, id}[]` — people in the plan |
| `ratings` | `{[pid]: {[rideIdx]: tier}}` — per-person ride tiers |
| `attractionRatings` | `{[pid]: {[attrIdx]: true}}` — per-person attraction selections |
| `gameRatings` | `{[pid]: {[gameIdx]: true}}` — per-person game selections |
| `activePerson` | ID of the currently viewed person |
| `activeCat` | Active ride category filter (`"all"` or category name) |
| `activeTierFilter` | Active tier filter (`"all"`, `"must"`, `"want"`, `"maybe"`, `"nope"`, `"unset"`) |
| `activeSort` | Ride sort order (`"name"`, `"price-asc"`, `"price-desc"`) |
| `activeAttrSort` | Attraction sort order (same values) |
| `activeGameSort` | Game sort order (same values) |
| `mustMult` / `wantMult` / `maybePct` | Ride cost multipliers (defaults: 2×, 1×, 50%) |
| `gameMult` | Game plays-per-game multiplier (default: 2) |
| `currentView` | Active tab (`"rides"`, `"attractions"`, `"games"`, `"summary"`) |

State mutations always end with a `render*()` call. There is no reactivity framework — rendering is full re-renders via `innerHTML`.

## Key functions

- **`setTier(idx, tier)`** — toggles a ride tier; clicking the active tier removes the rating
- **`toggleAttraction(idx)`** — toggles an attraction; clears the whole `group` first (mutual exclusivity), then checks `comboWith`/`comboResult` to auto-upgrade to a combo item
- **`toggleGame(idx)`** — simple boolean toggle for games
- **`calcCost(pid, tierMults)`** — sums `ride.price × mult` for each ride where `tierMults[tier]` is defined; used for ride cost estimates
- **`calcAttractionCost(pid)`** — sums attraction prices for selected items; returns `{total, count, hasVar}` (`hasVar` is true when any `starting_at` item is included)
- **`calcGameCost(pid)`** — sums `game.price × gameMult` for selected games
- **`recommendBooks(amount)`** — finds the minimum-cost combination of ride ticket books ($20/$50/$100/$200/$500) that covers `amount`; uses a nested loop over denominations
- **`gameTicketRec(est)`** — computes how many $20 game ticket books to buy (each worth $21); uses `floor` + one extra book if the remainder exceeds $20; returns null when no books save money
- **`renderPersonTabs()`** — renders person tab bars into all containers: `#person-tabs`, `#person-tabs-attr`, `#person-tabs-games`
- **`renderRides()`** — applies cat/tier/sort filters, renders ride rows with tier buttons
- **`renderAttractions()`** — renders attractions with sort; builds `includedNames` set from active combo results to show "Included" on component items
- **`renderGames()`** — renders games with sort; shows "Prize!" badge for `winnerEveryTime` games
- **`renderSummary()`** — full summary re-render: per-person ride cost metrics + attractions/games subtotals, group totals, ride ticket recommendation (pass vs. books), games ticket recommendation
- **`savePlan()`** — serializes all state to JSON and triggers a `knoebels-plan.json` download
- **`loadPlan(event)`** — reads a JSON file, restores all state including config inputs, re-renders all views
- **`planToB64(data)`** — encodes a plan object to URL-safe base64: `JSON.stringify` → `TextEncoder` → raw binary → `btoa` → swap `+`/`/` → strip `=`
- **`planFromB64(b64)`** — reverses `planToB64`; re-pads before `atob`, decodes bytes via `TextDecoder`
- **`sharePlan(btn)`** — encodes the current plan via `planToB64`, writes `#plan=<encoded>` into the URL with `history.replaceState`, and copies the full URL to the clipboard; briefly changes the button label to "Copied!" as feedback; falls back to `prompt()` if clipboard access is denied

## Summary view config

The Summary tab has a "Ride assumptions" config section with four inputs:
- **Must do** — multiplier for must-do rides (default 2×)
- **Want to** — multiplier for want-to rides (default 1×)
- **Maybe** — probability of riding maybe rides (default 50%)
- **Games** — plays per game (default 2×)

Changing any input calls `renderSummary()` immediately.

## Ride ticket recommendations

`PASS_PRICE = 54` is the cost of a Ride All Day pass. The summary compares each person's estimated ticket spend against the pass price and recommends whichever is cheaper. For groups, it shows optimal mix vs. all-passes vs. all-ticket-books.

## Plan persistence

Three mechanisms share the same serialized payload: `{version, persons, ratings, attractionRatings, gameRatings, config}`.

| Mechanism | How | Notes |
|---|---|---|
| **Save** | JSON file download | Portable; survives page reload |
| **Load** | File picker → `FileReader` | Validates `persons` array + `ratings` object before applying |
| **Share** | URL hash `#plan=<base64>` | On load, an IIFE checks `location.hash` for `#plan=` before the first render; silently ignores malformed hashes |

## Games ticket deal

$20 buys $21 in game tickets (only usable at games). `gameTicketRec` recommends how many books to buy using the floor-based algorithm: only buy books whose full $21 value will be spent, plus one more if the remainder after full books exceeds $20.
