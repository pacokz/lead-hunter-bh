# Extraction

## Reading the reference

**Tall screenshots must be sliced.** A full-page capture is often 400–600px wide and 10,000–20,000px tall; viewed whole it is unreadable. Slice into 8–10 strips and view each one:

```js
const img = await readImage('reference.png');
const n = 8, h = Math.ceil(img.height / n);
for (let i = 0; i < n; i++) {
  const c = createCanvas(img.width, Math.min(h, img.height - i * h));
  c.getContext('2d').drawImage(img, 0, -i * h);
  await saveFile(`ref/slice-${i}.png`, c);
}
```

Then view all slices in a single batch, not one per turn.

**Source priority:** codebase > Figma > live site > screenshot. Screenshots lose hover states, focus rings, disabled treatments, transitions, and every value below the fold. If a codebase exists, read the stylesheet or token file and take exact values — 5px stays 5px, never snapped to a 4px grid.

**What to write down while reading:**
- Which color appears on the primary action, and whether it appears anywhere else
- Surface count (how many distinct background tones)
- Corner radius on cards vs buttons vs inputs
- Button height and whether actions are full-width
- Whether dark sections use shadow or only tone
- Copy voice: person, casing, sentence length, whether numbers lead

## Color

Aim for **8–12 tokens**, not a 50-swatch ramp. A working set:

| Role | Count | Notes |
|---|---|---|
| Signal / primary action | 1 | The one reserved color. Alerts may share it. |
| Brand | 2–3 | Base, a brighter variant for dark surfaces, a tint for data/badges |
| Neutrals | 3–4 | Darkest ink, card-on-dark, page background, secondary text |
| Semantic | 2–3 | Success, danger, optional warning — only if the UI has states |

Each token gets a `name`, `hex`, and a **use rule** ("Buttons on dark", "Primary CTA and alerts only"). The use rule is the token's real content.

Dark surfaces need their own variants: a brand blue that reads well on white is usually too dim on near-black — lift it (e.g. `#3D56F0` → `#4E66FF`). Borders on dark are `rgba(255,255,255,0.2–0.28)`, not a gray hex.

Derive new colors in `oklch` from the reference's palette rather than inventing hexes.

## Type

One family unless the reference clearly pairs two. Extract a **5-step ladder** and record size / line-height / weight for each:

```
Display  56 / 1.05 / 800   letter-spacing -0.03em
H2       36 / 1.15 / 800   -0.02em
H3       22 / 1.30 / 700
Body     16 / 1.60 / 400
Caption  13 / 1.40 / 500
```

Rules that travel with it: tight tracking on display sizes, airy line-height on body, secondary text one step down in color not size. Show the ladder with real sentences from the reference's domain, each labeled with its token in mono.

## Spacing, radius, elevation

- **Spacing:** 6 steps (4 / 8 / 16 / 24 / 40 / 64). Display as horizontal bars — instantly legible, and reveals the rhythm.
- **Radius:** 3 steps plus pill (8 / 16 / 28 / 999). State which is for what: "cards use lg, all actions are pills."
- **Elevation:** usually only two levels — hairline border (flat) and one overlay shadow (raised). State that dark sections rely on tone rather than shadow, if true.

## Interaction tokens

Easily forgotten, always needed:

- **Hover:** does it darken, lighten, or shift border color? Record the exact resulting value per button variant.
- **Focus:** a 3px ring at ~15% of the brand color is a safe default; keep it consistent across all inputs.
- **Error:** border and background tint from the danger color, plus an inline message with an icon.
- **Transition:** one duration (150–200ms) applied to toggles, chevrons, and hover fills.
