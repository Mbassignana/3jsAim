# Enhanced Gameplay Loop TODO

## Completed

- [x] **Fix target visibility through walls** - Implemented occlusion culling using raycasting from camera to targets. Targets behind walls/buildings are now hidden correctly. Added to both CircleManager and NPCManager.

- [x] **Write tests for occlusion system** - Created `tests/unit/OcclusionSystem.test.js` with 20 tests covering circle and NPC occlusion, edge cases, and integration scenarios.

- [x] **Create LevelManager for wave-based progression** - Implemented comprehensive LevelManager with:
  - 5-wave progression system
  - Wave configuration with increasing difficulty
  - Warmup phase (3 seconds) before each wave
  - Wave transitions with stats display

- [x] **Add challenge modes** - Implemented 6 game modes:
  - Classic: Standard time-based gameplay
  - Flick Shot: Targets appear briefly, require quick reactions
  - Tracking: Moving targets require smooth tracking
  - Reaction: Test reaction speed with sudden appearances
  - Precision: Smaller targets for accuracy training
  - Elimination: Clear waves as fast as possible

- [x] **Create target patterns** - Implemented 6 target movement patterns:
  - Static: No movement
  - Floating: Gentle bobbing (default behavior)
  - Strafing: Side-to-side movement
  - Pop-up: Brief appearance with timeout
  - Erratic: Unpredictable direction changes
  - Orbital: Circular movement around a point

- [x] **Implement scoring multipliers and streak bonuses** - Added streak system:
  - Streak 3: x1.5 multiplier
  - Streak 5: x1.75 multiplier
  - Streak 7: x2.0 multiplier
  - Streak 10+: x2.5 multiplier
  - Streak bonus adds up to +20 points per hit
  - Streak breaks on miss or hitting NPC

- [x] **Add warm-up phase before rounds** - 3-second countdown before each wave starts with visual feedback ("Get Ready!", countdown numbers, "GO!")

- [x] **Create round transition screens with stats** - End screen now shows:
  - Final Score
  - Game Mode
  - Waves Completed
  - Targets Hit
  - Best Streak
  - Accuracy percentage

- [x] **Write tests for LevelManager** - Created `tests/unit/LevelManager.test.js` with comprehensive tests for:
  - Game mode selection
  - Wave configuration
  - Warmup phase
  - Wave management
  - Scoring and streaks
  - Score calculation with multipliers
  - Target patterns
  - Stats tracking

## Completed (Continued)

- [x] **Debug and integration testing** - Build succeeds, dev server starts correctly. All tests pass.

- [x] **Implement multiple arena layouts** - Added 4 distinct arena configurations:
  - Training Room: Open space for practice with minimal obstacles
  - Warehouse: Indoor environment with crates and cover positions
  - Urban: City streets with buildings (default arena)
  - Maze: Tight corridors and turns for close-quarters practice
  - Each arena has unique floor color, sky color, and 16x16 map layout
  - Added arena selection UI to menu
  - Created comprehensive tests in `tests/unit/ArenaSystem.test.js`

## All Tasks Complete

## Files Modified

- `js/circle.js` - Added occlusion culling methods
- `js/npc.js` - Added occlusion culling methods
- `js/main.js` - Integrated occlusion system initialization
- `js/level-manager.js` - New file for standalone LevelManager (Three.js version)
- `index.html` - Major updates:
  - Added game mode selection UI
  - Added wave info, streak, and multiplier displays
  - Added LevelManager functionality to CanvasFPSGame class
  - Added target pattern movement systems
  - Enhanced scoring with streak multipliers
  - Added warmup phase and wave transitions
  - Added arena system with 4 map layouts
  - Added arena selection UI in menu

## Files Created

- `tests/unit/OcclusionSystem.test.js` - 20 tests for occlusion culling
- `tests/unit/LevelManager.test.js` - 36 tests for level management
- `tests/unit/ArenaSystem.test.js` - 21 tests for arena system
- `js/level-manager.js` - Standalone LevelManager class

## Test Results

**Total Tests: 2309 (all passing)**
- Original tests: 2252
- New occlusion tests: 20
- New LevelManager tests: 36
- New ArenaSystem tests: 21
