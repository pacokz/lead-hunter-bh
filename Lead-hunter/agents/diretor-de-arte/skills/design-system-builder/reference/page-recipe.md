# One-page showcase recipe

## Shell

```
max-width 1160px · centered · padding 64px 40px 120px
vertical stack, gap 96px between sections
page background = the neutral "mist" token, not white
```

Sections are numbered (`01 · Color` … `20 · Loading & empty states`), set in the brand color at 13px / 700 / uppercase / 0.12em tracking. Each heading is followed by **one line of rule prose** in secondary text. That prose is the design system; the specimens only illustrate it.

## Header

Brand mark (a simple geometric shape — a conic-gradient disc reads as a mark without imitating one), the system name, a mono version chip, then a display-size headline stating the system's personality and a 2–3 sentence intro naming the actual rules: which color is reserved, what the radii do, what the surfaces are.

## Section patterns

**Specimen sections** (1–5) — no framing titles inside cards; the section heading already labeled it. Show swatches, ladders, and bars directly, each annotated in mono with its token name and value.

**Light/dark pairs** — a two-column grid, white card on the left, `#111218` card on the right, each with a mono `on light` / `on dark` caption. Use for actions and any component whose values change by surface.

**Dark showcase blocks** — full-width rounded block in the darkest ink, holding a small grid of cards. Use for stats and feature cards; it also gives the page rhythm so it isn't 20 white boxes.

**Interactive sections** — say so in the rule line ("Interactive — click to expand"), so a reviewer knows to try it.

## Section rhythm

Alternate density deliberately: three tight foundation columns, then a wide pair, then a full-bleed dark block, then a three-up card grid. Two adjacent sections with identical layout read as one long section.

Cap it at **1–2 background tones** across the whole page beyond the neutrals.

## Implementation notes

- Repeat inline style literals rather than building a class system; the page paints as it streams and every element stays independently editable.
- Data-drive repeated specimens (color swatches, spacing bars, pricing tiers, table rows) from arrays; hand-write the one-off compositions.
- Keyframes are the one thing that can't be inline — a `@keyframes shimmer` and `@keyframes spin` pair covers the loading section.
- Interactive state (accordion index, dialog open, toggle booleans, radio index, input value) lives in one component state object; expose derived style values (`autoBg`, `autoKnob`, `chevronRotation`, `radioRing`) rather than computing them in markup.
- Give the page 2–3 top-level tweakable props — a variant switch (e.g. glow intensity), a density/compact flag — not a color picker for every token.

## Copy

Write component copy in the reference's voice and domain. Real product sentences — "Connected to São Paulo #204", "2 accounts affected — review now", "Must be at least 12 characters" — expose line-wrap, truncation, and type problems that lorem ipsum hides. Keep the numbers plausible and few.

## Verification pass

- Screenshot the full page and scan for: overflow, contrast failures on dark surfaces, any color not in the token set, and specimens that render blank.
- Click every interactive element once.
- Confirm the reserved accent color appears **only** on primary actions and alerts.
- Confirm the footer disclaimer is present if the system was derived from another brand's reference.
