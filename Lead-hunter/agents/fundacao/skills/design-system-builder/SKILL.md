---
name: design-system-builder
description: Use this skill to build a design system from a reference (screenshot, live site, codebase, or Figma) and deliver it as a single-page showcase — tokens plus working components rendered together. Covers token extraction, the component inventory to cover, the one-page layout recipe, and the IP rules for reference-derived work.
user-invocable: true
---

# Design system builder

Turn a reference into a usable design system: **extracted tokens + a component library + one page that displays both.**

The deliverable is a single self-contained HTML page. Tokens are shown as specimens (swatches, type ladder, spacing bars); components are shown live and interactive on the same page, styled only from those tokens. If a value isn't in the token set, it doesn't appear in a component.

## Before anything: check the IP boundary

Reference-derived systems are the common case, and the line matters.

- **Extract the vocabulary, not the identity.** Color relationships, type scale, radii, spacing rhythm, density, button shapes, layout patterns — all fair.
- **Never reproduce** a company's logo, wordmark, proprietary illustrations, distinctive branded UI, or product copy. Never redraw a mark from memory.
- **Rename.** Invent a plausible brand for the system (a fictional product name and a generic geometric mark), and say so in the page footer: "An original design system — not affiliated with any existing brand."
- If the user's own email domain matches the referenced company, their brand assets are fair to use directly.

State this boundary in one sentence at the start of the work, then proceed. Don't stall on it.

## Process

1. **Read the reference properly.** A tall screenshot must be sliced before viewing — a 500×16000px page is illegible whole. Slice into 8–10 horizontal strips and view each (see `reference/extraction.md`). If a codebase or Figma file is available, it is the source of truth and the screenshot is only a guide.
2. **Name the system.** Extract 3–6 observations about its personality first (e.g. "near-black surfaces, one cool blue, warm red reserved for purchase, everything is a pill"). These become the design rules and they get written down on the page.
3. **Extract tokens** — color, type, spacing, radius, elevation. Fewer, decided values beat a complete-looking ramp. See `reference/extraction.md`.
4. **Build the components** in the order given in `reference/inventory.md`. Do not stop at buttons and cards; the sections that get skipped (forms, dialog, states, table) are the ones consumers actually need.
5. **Assemble one page** using `reference/page-recipe.md`. Numbered sections, each with a one-line rule under the heading.
6. **Make the interactive things interactive.** Accordion opens, toggles flip, radios select, the dialog actually opens over a scrim, inputs accept typing. A static picture of a switch teaches nothing about the system's states.
7. **Verify visually, then hand off.** Screenshot the page; check contrast on dark surfaces, that nothing overflows, and that no component introduced an off-token color.

## Non-negotiables

- **One accent has a job.** Reserve exactly one high-energy color for the primary action and alerts, and never use it decoratively. This single rule does more for coherence than any other.
- **Every section states its rule.** A swatch without "Primary CTA and alerts only" is decoration. The prose is the system.
- **Light and dark pairs.** Any component that appears on both surfaces gets shown on both — button borders, badges, and inputs all need different values there.
- **Placeholders over invented art.** Where the reference had product screenshots or illustrations, use a labeled hatched box ("phone · shield screen"). Never hand-draw SVG illustrations or fake logos to fill space.
- **Real copy, in the reference's voice.** Note the reference's tone (second person? benefit-first? sentence case?) and write component copy that way. Lorem ipsum hides type problems.
- **No zebra stripes, no gradient soup, no emoji** unless the reference genuinely uses them.

## Output format

Default to one page. If the user asks for a distributable system afterward, split into `styles.css` + `tokens/*.css` + per-component files and keep the page as the showcase index.

For handing the result to an engineer or to Claude Code, export the source plus a token file (CSS custom properties or a Tailwind config) and a short implementation brief — not a PDF or PPTX.

## Files in this skill

- `reference/extraction.md` — reading references, and how to derive each token family
- `reference/inventory.md` — the 20-section component checklist, in build order
- `reference/page-recipe.md` — page structure, section markup patterns, interactivity notes
- `assets/tokens.example.css` — a completed token set from a real run, as a shape reference
