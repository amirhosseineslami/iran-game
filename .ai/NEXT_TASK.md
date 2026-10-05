# Next Task Checkpoint

Last updated: 2026-10-06 (cycle: PostgreSQL production path)

## Current status

- Branch: `feature/game-ui-visual-overhaul`
- Tests: 120/120 passing (incl. backend contract: memory + PostgreSQL + restart survival)
- TypeScript: passing. Production build: passing. Lint: 11 pre-existing errors in UI
  components (react-hooks/set-state-in-effect) + fixture `any`s — none introduced by
  recent work.
- PostgreSQL RUNNING in Docker: container `iran-game-db` (postgis/postgis:16-3.4),
  restart policy `unless-stopped`, ports 127.0.0.1:5432, DBs `iran_game` + `iran_game_test`.
- Live-verified: claim → server restart → claim survives; /api/health reports mode.

## NEXT TASK (start here)

**TASK 02 — COMPLETE QUEST UI** (highest player-visible value; quest system exists in
store but is not rendered).

- quest button + panel in HUD, active/completed quests, progress, rewards, localized
  FA/EN text, mobile-friendly sheet
- tests: quest activation/progress/completion via store + UI rendering
- then browser verification (PRIORITY 2: try installing Playwright — npm registry reachable)

## After that

- Priority 2: Playwright browser verification (`npm i -D @playwright/test && npx playwright install chromium`)
- TASK 01 game state audit, TASK 03 player profile, TASK 04 movement v1 (see conversation roadmap)
