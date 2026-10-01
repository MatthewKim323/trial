# trial

A small showcase of three motion pieces, each self-contained and dependency light.

## Pieces

- **ASCII** (`#/ascii`): two reaching arms rendered as live ASCII art on a WebGL2 canvas. Glyph ramp `. : - + * % # @` plus an inverted tile for the hottest cells, per-cell color, a touch-and-retreat ping-pong timeline with a spark where the fingers meet. The pointer gently lifts the arms and scrambles nearby glyphs. Arm textures are cut from Michelangelo's public-domain fresco. Add `?t=7` to freeze a frame. Source: `src/AsciiAdam.tsx`.
- **Seam wipe** (`#/wipe`): a full-screen scene-to-scene transition. A wavering seam climbs the screen, zooming the outgoing frame in and the incoming frame out across it, while the new scene rises into place. Work plays it forward, Back plays it in reverse. Source: `src/seam-wipe.ts` (three.js), demo in `src/pages/WipePage.tsx`.
- **Hover set** (`#/hover`): placeholder. Rolling pill buttons, a round icon button, letter-roll nav links, arrow links and a ring cursor land here next.

## Run

```bash
npm i && npm run dev
```

## License

MIT, see [LICENSE](LICENSE). The arm textures in `public/hero/ascii/` are cut from Michelangelo's *Creation of Adam*, which is in the public domain.
