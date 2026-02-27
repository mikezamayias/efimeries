# Linear Gov Redesign — Implementation Plan

## Design Spec (from mockup #5)
- **Font:** System native (-apple-system, SF Pro, Roboto)
- **Radius:** 8px
- **Cards:** 1px border + light shadow
- **Chips:** 10% opacity bg + full color text (muted, not loud)
- **Nav:** Backdrop blur, active = accent color
- **Accent:** #0369A1 (deep blue) light / #0EA5E9 dark
- **No emojis** — replace all with Lucide icons

## Color Tokens

### Light
| Token | Value |
|-------|-------|
| bg | #F8FAFC |
| surface | #FFFFFF |
| text | #0F172A |
| text-secondary | #64748B |
| accent | #0369A1 |
| accent-soft | #F0F9FF |
| border | #E2E8F0 |
| weekend-bg | #FFFBEB |
| weekend-text | #92400E |
| danger | #DC2626 |
| success | #059669 |

### Dark
| Token | Value |
|-------|-------|
| bg | #0B1120 |
| surface | #1E293B |
| text | #F8FAFC |
| text-secondary | #94A3B8 |
| accent | #0EA5E9 |
| accent-soft | rgba(14,165,233,0.1) |
| border | #334155 |
| weekend-bg | rgba(146,64,14,0.12) |
| weekend-text | #FB923C |
| danger | #EF4444 |
| success | #10B981 |

## Doctor Colors (10) — muted palette
Chips render as: `background: color/10%, color: color/100%`

| # | Light | Dark |
|---|-------|------|
| 1 | #0369A1 | #38BDF8 |
| 2 | #059669 | #34D399 |
| 3 | #7C3AED | #A78BFA |
| 4 | #DC2626 | #F87171 |
| 5 | #EA580C | #FB923C |
| 6 | #DB2777 | #F472B6 |
| 7 | #0D9488 | #2DD4BF |
| 8 | #CA8A04 | #FACC15 |
| 9 | #4F46E5 | #818CF8 |
| 10 | #BE123C | #FB7185 |

## Files to Change

### 1. `tailwind.config.ts`
- Replace all color tokens with CSS variable references
- Remove DM Serif/DM Sans font families
- Set system font stack
- Radius: 8px default

### 2. `nuxt.config.ts`
- Remove `@nuxtjs/google-fonts` module (system fonts)
- Add `color-scheme` meta tag

### 3. `app/assets/css/main.css`
- Add `:root` and `[data-theme="dark"]` CSS variable blocks
- Remove hardcoded colors
- Update component classes

### 4. `app/app.vue`
- Add theme toggle logic (localStorage + system preference)
- Remove emoji from any visible UI

### 5. `app/components/AppHeader.vue`
- Add theme toggle button (sun/moon icon)

### 6. `app/components/SettingsPanel.vue`
- Replace all emoji section titles with Lucide icons
- Add theme selection setting

### 7. `app/components/CalendarPanel.vue`
- Doctor chips: `bg-{color}/10 text-{color}` pattern
- Remove emoji from bottom sheet

### 8. `app/components/MarksPanel.vue`
- Replace emoji indicators (🚫⭐🎌) with styled dots/icons

### 9. `app/components/ListPanel.vue`
- Replace ⭐ with Lucide Star icon

### 10. `app/components/StatsPanel.vue`
- No emoji changes needed (already clean)

### 11. `app/components/AppToast.vue`
- Remove emoji from toast messages

### 12. `app/composables/useAppState.ts`
- Remove emoji from toast messages
- Add theme state management

### 13. `app/utils/types.ts`
- Update DOCTOR_COLORS to new muted palette

## Order of Operations
1. CSS variables + dark mode infrastructure
2. Tailwind config + nuxt config
3. Update all components (remove emoji, new chip style)
4. Theme toggle UI
5. Test both themes
6. Deploy
