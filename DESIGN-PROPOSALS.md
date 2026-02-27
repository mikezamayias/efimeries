# Εφημερίες ΕΣΥ — Design Proposals (by Gemini 3.1 Pro)

5 distinct visual directions. Pick one, Mike.

---

## 1. Clinical Precision (Κλινική Ακρίβεια)

**Concept:** Swiss graphic design meets medical charts. Zero decoration — pure typography and data. Strict alignment, whitespace, maximum information density.

| | Light | Dark |
|---|---|---|
| BG | `#FFFFFF` | `#000000` |
| Surface | `#F8F9FA` | `#111827` |
| Text | `#111827` | `#F9FAFB` |
| Accent | `#0F172A` | `#E5E7EB` |
| Border | `#E5E7EB` | `#374151` |

- **Font:** Inter
- **Calendar:** No vertical borders, only horizontal separators. 8px colored dots + doctor initials instead of chips.
- **Nav:** Text-heavy tabs, 3px top border for active state.
- **Cards:** 0px radius. No shadows. 1px dividers only.
- **Mood:** Sharp, sterile, efficient, exact.

---

## 2. Night Shift (Νυχτερινή Βάρδια)

**Concept:** OLED-first, built for dark hospital corridors at 3am. Dark mode is the primary experience. Desaturated glowing accents, gentle on tired eyes.

| | Light | Dark |
|---|---|---|
| BG | `#F1F5F9` | `#020617` (OLED) |
| Surface | `#E2E8F0` | `#0F172A` |
| Text | `#0F172A` | `#F8FAFC` |
| Accent | `#3B82F6` | `#60A5FA` |
| Border | `#CBD5E1` | `#1E293B` |

- **Font:** Fira Sans (condensed, fits narrow screens)
- **Calendar:** Doctor colors as text on 15% opacity tinted pills.
- **Nav:** Floating pill-shaped bar, glowing icons, no text labels.
- **Cards:** 16px radius. Borders instead of shadows in dark mode.
- **Mood:** Calm, technological, gentle, focused.

---

## 3. Structural Utility (Δομική Σαφήνεια)

**Concept:** Hospital signage meets architectural blueprints. Thick borders, rigid compartments, unmistakable touch targets — designed for fast-moving doctors, possibly wearing gloves.

| | Light | Dark |
|---|---|---|
| BG | `#F8FAFC` | `#0F172A` |
| Surface | `#FFFFFF` | `#1E293B` |
| Text | `#020617` | `#F1F5F9` |
| Accent | `#2563EB` | `#3B82F6` |
| Border | `#94A3B8` | `#475569` |

- **Font:** IBM Plex Sans (industrial, distinct numerals)
- **Calendar:** Rigid grid with solid color-block cells. Doctor color fills the entire cell with contrasting text.
- **Nav:** 5 equal rigid segments with vertical dividers. Active = inverted color block.
- **Cards:** 4px radius. 2px borders on interactive elements. Hard drop shadows.
- **Mood:** Robust, undeniable, tactile, structured.

---

## 4. Soft Accessibility (Απαλή Λειτουργικότητα)

**Concept:** Stress reduction through generous spacing, large typography, and soft shapes. Makes complex scheduling data feel digestible, not overwhelming. Medical teal accent.

| | Light | Dark |
|---|---|---|
| BG | `#FAFAFA` | `#18181B` |
| Surface | `#FFFFFF` | `#27272A` |
| Text | `#18181B` | `#FAFAFA` |
| Accent | `#0D9488` (Teal) | `#14B8A6` |
| Border | `#E4E4E7` | `#3F3F46` |

- **Font:** Noto Sans (universal, friendly)
- **Calendar:** Generous padding. Fully rounded soft pills. Thick left-border on list items.
- **Nav:** Oversized icons. Active = soft colored pill behind icon.
- **Cards:** 20px radius. Soft diffuse shadows (20px blur, 5% opacity).
- **Mood:** Friendly, spacious, low-cognitive-load, approachable.

---

## 5. Institutional Authority (Κρατικό Κύρος)

**Concept:** Premium enterprise SaaS meets government authority. Monochromatic deep blue base. Feels like an official tool you can trust with your schedule. Stripe/Linear aesthetic.

| | Light | Dark |
|---|---|---|
| BG | `#F8FAFC` | `#0B1120` |
| Surface | `#FFFFFF` | `#1E293B` |
| Text | `#0F172A` | `#F8FAFC` |
| Accent | `#0369A1` (Deep Blue) | `#0EA5E9` |
| Border | `#E2E8F0` | `#334155` |

- **Font:** System Native (SF Pro / Roboto) — zero learning curve.
- **Calendar:** Subtle grid. 15% opacity chip backgrounds with full-opacity text. Muted pastel doctor colors.
- **Nav:** iOS-style with backdrop blur. Active = deep blue icon + text.
- **Cards:** 8px radius. Both 1px border AND light shadow.
- **Mood:** Trustworthy, official, familiar, authoritative.

---

## Quick Comparison

| # | Name | Vibe | Font | Radius | Best For |
|---|---|---|---|---|---|
| 1 | Clinical Precision | Swiss minimal | Inter | 0px | Data density, speed |
| 2 | Night Shift | OLED-first | Fira Sans | 16px | Night shifts, eye comfort |
| 3 | Structural Utility | Industrial | IBM Plex Sans | 4px | Gloves, fast tapping |
| 4 | Soft Accessibility | Gentle | Noto Sans | 20px | Stress reduction |
| 5 | Institutional Authority | Enterprise | System fonts | 8px | Trust, familiarity |
