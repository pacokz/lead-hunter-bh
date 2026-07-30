# Component inventory

Build in this order. Foundations first (they set the values everything else uses), then actions, then the sections most systems skip.

**If a codebase or Figma file defines the inventory, that inventory wins** — build exactly those families. This list is for from-scratch or screenshot-derived runs.

## Foundations (1–5)

1. **Color** — swatch grid; name, hex, use rule per token
2. **Typography** — the 5-step ladder with mono labels and real sentences
3. **Spacing** — bars, one per step
4. **Radius** — outlined squares at each step + a pill
5. **Elevation** — flat vs raised, with the note about dark surfaces

## Actions and signals (6–7)

6. **Actions** — primary / secondary / outline / link, shown on light **and** dark. Fixed height (52–56px marketing, 40–44px chrome). Include the link-with-affordance pattern and any guarantee microcopy that sits under CTAs.
7. **Status** — badges and pills: success, danger, info, count. Plus any always-visible state strip the product has (connection status, plan tier).

## Content blocks (8–12)

8. **Feature cards** — the hero card. Dark with a directional glow keyed per feature, or whatever the reference's equivalent is. Labeled placeholder for imagery.
9. **Info cards** — light, icon + title + body + link. The workhorse.
10. **Stat cards** — big number dominant, one support line, a small data visual. Never more than one number size per card.
11. **Social proof** — a press quote on brand color and a testimonial on white. Avatar and logo are placeholders.
12. **Offer banner** — full-width promo with the primary CTA and a reassurance line.

## Interaction (13–17)

13. **Accordion / FAQ** — actually expands; one open at a time; chevron rotates.
14. **Forms** — the section most often shortchanged. Cover:
    - text input: default, focused, **error** (red border, tinted background, inline message with icon), with helper text
    - select
    - toggle switch (animated knob, two states shown)
    - radio group (selected ring)
    - checkbox with wrapping label
    - a search field on dark
    - Fields are a consistent height (48px) with a smaller radius than cards (12px).
15. **Dialog** — 24px radius, centered, dimmed scrim with slight blur, one primary action and one quiet escape, close affordance top-right. Show it statically on a hatched backdrop **and** wire a trigger that opens the real overlay.
16. **Navigation** — top nav on dark, active tab as a pill, a status strip above it if the product has one. Include the CTA in the nav.
17. **Feedback** — toasts (success and error, on ink, with an action or dismiss), tooltip with arrow, progress bar, filter chips.

## Commerce and lifecycle (18–20)

18. **Pricing cards** — three tiers, the recommended one visually elevated (dark + colored halo + badge), strikethrough anchor price, feature checklist, per-tier button variant. Sibling cards stay quiet.
19. **Comparison table** — hairline rows, no zebra striping, featured column tinted, em-dash for absent features.
20. **Loading and empty states** — shimmer skeleton (avatar + lines + button shape), a spinner with contextual copy, and an empty state that names the next action. Never a bare "no data".

## Also worth adding when relevant

- **Footer** — closes the page and shows the darkest surface at full width.
- **Avatar / identity chip** — if the product has accounts.
- **Tabs or segmented control** — if the reference uses them for view switching.
- **Data viz primitives** — bar set, ring, dot-glow — if the product shows metrics.

Skip anything the reference gives no evidence for; an invented component is one consumers will trust and designers won't recognize.
