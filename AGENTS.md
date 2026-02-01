# AGENTS.md - HACKER'S BASE (Shield Stage Breach Tetris)

This file provides persistent project context for coding agents.

## 1) Workflow (must follow)
- Before changing any code, summarize the plan and ask for approval.
- Read relevant files first; make minimal, targeted edits.
- After changes, explain what changed and why, and call out any manual test steps.

## 2) Encoding / Language Rules
- Use English only in code comments and identifiers to avoid mojibake.
- Avoid non-ASCII in new comments or docstrings.
- UI strings may remain as-is; ask before altering localized text.

## 3) Project Snapshot
- Game: Stage-based defense + breach-triggered Tetris defense + territory conquest.
- Tech: Vanilla JS (ES modules), Three.js, HTML5 Canvas, PWA.

## 4) Entry Points
- `index.html` - app shell, UI layers, PWA links.
- `js/main.js` - bootstraps GameManager, SW update manager, mobile optimizer.
- `js/modules/` - core systems (GameManager, DefenseGame, TetrisGame, TerminalUI, etc).

## 5) Core Gameplay Loop
1. Start in Safe Zone.
2. Open map (terminal) and move to a stage.
3. Defense mode: survive max pages.
4. Conquer prompt appears; start breach.
5. Tetris mode: clear required lines + survive reinforcement pages.
6. On success, stage is conquered and allies remain.

## 6) Logging / Debug Rules
- Do not use `console.log` directly for gameplay logs.
- Use `window.debugLog`, `debugWarn`, `debugError` with tags.
- Prefer existing tags (e.g., Defense, AllyMovement, Synergy, Enemy, GameManager, TerminalUI, Item, Combat, Boss, Tetris, Canvas, Conquest).
- Debug panel toggles logging; respect that pipeline.

## 7) Mobile & Performance
- Mobile-first behavior is required for all features.
- Avoid heavy per-frame allocations and excessive DOM churn.
- Respect deltaTime caps and visibility change recovery paths.
- Keep touch gestures responsive and prevent accidental scroll.

## 8) Modularity Rule
- Keep features separated into modules and files.
- Prefer new focused modules over adding large blocks to existing files.
- Avoid "everything in one file" patterns; split by responsibility.

## 9) UI Layering (z-index)
- `#game-container` (3D Tetris) below defense canvas and terminal overlays.
- Terminal layer must stay above defense UI, CRT overlay at top.

## 10) PWA / Updates
- Service worker update flow is in `js/main.js`.
- If modifying caching or SW logic, ensure update notification still works.

## 11) Storage
- Progress and resources persist via localStorage.
- Be careful not to reset saved values unintentionally.

## 12) Files to Check First (common tasks)
- Defense behavior: `js/modules/DefenseGame.js`
- Tetris behavior: `js/modules/TetrisGame.js`
- Game flow & state: `js/modules/GameManager.js`
- Terminal UX: `js/modules/TerminalUI.js`
- Inventory/equipment: `js/modules/InventoryManager.js`, `EquipmentManager.js`
- Boss logic: `js/modules/BossManager.js`

## 13) Versioning Rules (PWA)
- Keep version strings in sync: `index.html` title, CSS/JS cache-busting query, and in-UI protocol label.
- If you update versions, also update `manifest.json` and `sw.js` cache keys.
- Preserve the SW update notification flow in `js/main.js`.

## 14) Terminal Commands Cheat Sheet
- `/map` - open map and choose a stage
- `/inventory` - inventory and equipment UI
- `/debug` - toggle debug panel (desktop and mobile)
- `/reset` - reset all progress (danger)
- `>>> CONQUER THIS SECTOR <<<` - start conquest breach
