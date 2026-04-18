
The user is on mobile and students don't see all items in the bottom bar. Looking at AppLayout.tsx, the mobile nav uses `overflow-x-auto scrollbar-hide` with all 8 student links — but the user reports they don't see them. Likely the horizontal scroll isn't discoverable (no visual hint that you can swipe), so students think only the visible 4-5 icons exist.

## Plan: Make all mobile nav items visible without scrolling

Replace the horizontally-scrollable bottom bar with a layout that fits all 8 student links on screen at once on a 375px viewport.

**Changes to `src/components/layout/AppLayout.tsx` (mobile nav only):**

1. Remove `overflow-x-auto` and the scroll container styling.
2. Use `flex w-full justify-between` so all 8 icons distribute evenly across the screen width.
3. Shrink each item: remove `min-w-[58px]`, reduce padding to `px-1 py-1.5`, icon size to `w-[18px] h-[18px]`, label to `text-[9px]`.
4. Truncate long labels (e.g. "Psicometría" → "Psico", "Vocacional" → "Vocac.", "Competencia" → "Compet.", "Mensajes" → "Msj") with a short-label override per link, only used in the mobile bar.
5. Keep the active indicator and unread badge logic intact.
6. On very narrow screens (<360px) the items will still fit because each takes ~12.5% width.

**Math check (375px viewport):** 375 / 8 ≈ 46px per item. With 18px icons + 9px text + 4px gap that fits comfortably.

**Files touched:** `src/components/layout/AppLayout.tsx` only.

**Out of scope:** Desktop sidebar, admin nav, routing, any backend.
