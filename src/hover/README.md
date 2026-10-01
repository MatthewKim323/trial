# hover set

Interactive buttons and hovers, built on the Web Animations API (no tween
library), so every animation is seekable with `document.getAnimations()`.

| piece | what it does |
|---|---|
| `PillButton look="fill"` | label rolls (out down, copy in from above), icon swaps sideways, hover colour wipes up from below |
| `PillButton look="border"` | same roll, second outline traces itself clockwise from top center |
| `CircleButton` | icon spins half a turn, disc pulses once, press squeezes |
| `RollLink` + `RollNav` | letters roll up one by one into an italic serif copy |
| `ArrowLink` | text glides right, an arrow slides into the gap (CSS only) |
| `SplitButton` | uppercase text button whose underline splits and slides off both ends (CSS only) |
| `RingCursor` | trailing ring that stretches with speed; shrinks over `data-cursor="hide"`, becomes a pill behind `navItem`s |

```tsx
import "./hover/hover.css"
import { PillButton, CircleButton, RollNav, RollLink, RingCursor } from "./hover"

<RollNav>
  <RollLink href="/" label="Index" />
  <RollLink href="/work" label="Work" />
</RollNav>
<PillButton href="/work" look="fill" tone="light">Enter</PillButton>
<CircleButton label="Open menu" />
<RingCursor />
```

Scale: sizes are rem, tuned for `html { font-size: clamp(14px, 1vw, 38px) }`.
Fonts: set `--hk-sans` and `--hk-serif` (defaults: Inter Tight, Instrument Serif).
Timing: expo in-out label rolls (0.6s out, 0.8s in), 0.5s circ letter rolls with
14ms stagger, 0.83s border trace, 0.5s icon spin. Leaving always plays back from
wherever the hover got to. A runnable gallery is in `../examples/hover.tsx`.
