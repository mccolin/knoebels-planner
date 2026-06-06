# Knoebels Trip Planner

A single-page trip planning tool for [Knoebels Amusement Resort](https://knoebels.com) in Elysburg, PA.

**[Open the planner →](https://mccolin.com/knoebels-planner/)**

## What it does

- **Rides** — Rate each of Knoebels' ~58 rides as Must do / Want to / Maybe / Nope, per person. Filter by category and tier, sort by name or price.
- **Attractions** — Mark attractions (museums, Crystal Pool, Lazer Tag, Mini Golf, etc.) each person is interested in.
- **Games** — Mark midway games each person wants to play.
- **Summary** — Per-person and group cost estimates with configurable assumptions (how many times you'll ride each tier, game plays per game, etc.). Recommends whether to buy the Ride All Day pass or ticket books for rides, and whether to pre-purchase game ticket books.

Supports multiple people.

## Saving and sharing plans

- **Save plan** — downloads the current plan as a `knoebels-plan.json` file.
- **Load plan** — restores a previously saved `.json` file.
- **Share plan** — encodes the plan into the page URL as a hash fragment and copies the link to your clipboard. Anyone who opens the link sees the plan exactly as you left it, with no account or server required.

## Development

No build step. Open `index.html` directly in a browser.
