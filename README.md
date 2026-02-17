# Shared Device Chess

Client-side chess webapp for two players sharing one device.

## Features

- Tap-to-move: tap a piece, then tap destination.
- Drag and drop: works with mouse and touch/pointer events.
- Legal move validation with:
  - check/checkmate/stalemate
  - castling
  - en passant
  - auto-queen promotion
- Chess clocks with configurable base time and increment.
- Independent white/black piece-set selectors (default `classic`).
- Included sample custom set: `overknight` (redesigned knight art + extra 3-square orthogonal jumps).
- Included variant set: `bureaucrat` (adds a bureaucrat on `a3`/`h6` that can move to any empty square, cannot capture, and returns from reserve after being captured).
- Included variant set: `racing-pawns` (all pawns may move either one or two squares forward on any move, as long as both path squares are clear for a two-step move).
- Piece sets now define their own piece catalog, rendering, movement rules, and initial placements.
- Supports adding new piece types (for example a 7th type) and placing them on arbitrary squares in the set layout.
- Piece-set selectors lock after the first move or when the clock starts.
- Piece sprite tile map in `assets/tileset.png` with mapping metadata in `assets/pieces-tileset.map.json`.

## Run

Open `index.html` directly or serve the folder with any static server.
