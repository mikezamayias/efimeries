# Efimeries Development Plans

## Track 1: UI Redesign (Gemini 3.1 Pro)

**Status:** In Progress — awaiting 5 design concepts from Gemini

**Goal:** Get 5 distinct visual design directions for the app. Mike picks one, then we implement.

**Constraints:**
- Mobile-first (used inside hospital on phone)
- Greek UI throughout
- Must support light + dark theme
- Fewer emojis, more professional/serious aesthetic
- Keep all existing functionality intact
- Calendar starts Monday

**Process:**
1. Send full codebase + screenshot to Gemini 3.1 Pro
2. Get back 5 design concepts (color palette, typography, layout changes, component styling)
3. Mike reviews and picks one
4. Implement chosen design
5. Deploy

---

## Track 2: Dark Theme

**Status:** Blocked on Track 1 (implement after design is chosen)

**Plan:**
1. Add CSS custom properties for all colors (light/dark variants)
2. Add toggle in Settings panel (persist in localStorage)
3. Use `prefers-color-scheme` as default
4. Update `theme-color` meta tag dynamically
5. Test all components in both themes

---

## Track 3: Auto-Regenerate Schedule

**Status:** Ready to implement

**Goal:** Automatically re-run the CSP solver whenever any input changes that affects the schedule.

**What triggers regeneration:**
- Marks change (blocks, wants, holidays)
- Doctor added/removed/type changed
- Constraints changed (minGap, maxShifts)
- Month changed (already clears schedule — keep this behavior OR auto-generate for new month)
- Manual day assignment does NOT trigger (that's an override)

**Implementation Plan:**
1. Add a `watchEffect` or `watch` in `useAppState.ts` that monitors `doctors`, `marks`, `constraints`
2. Debounce the regeneration (300ms) to avoid rapid re-runs during bulk changes
3. Only auto-regenerate if a schedule already exists (don't auto-generate on first load)
4. Show a subtle "Ενημέρωση..." indicator during regeneration
5. Preserve manual overrides where possible (if a manually assigned day still satisfies constraints, keep it)

**Edge cases:**
- If doctor is removed mid-schedule → their days become null → re-run fills them
- If marks change makes current schedule invalid → full re-run
- If constraints tighten → may need full re-run

**Files to modify:**
- `app/composables/useAppState.ts` — add watch + debounced generate
- `app/components/CalendarPanel.vue` — add loading indicator (optional)
