/**
 * Integration tests for game flow
 * Tests the interaction between game systems during typical gameplay
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Import game systems
import { HitMarker, resetHitMarker } from '@/effects/HitMarker.js';
import { ScreenShake, resetScreenShake } from '@/effects/ScreenShake.js';
import { resetAudioManager } from '@/game/AudioManager.js';
import { ComboSystem, resetComboSystem } from '@/game/ComboSystem.js';
import {
  DifficultyManager,
  DifficultyLevel,
  DifficultyPresets,
  resetDifficultyManager,
} from '@/game/DifficultyManager.js';
import { GameConfig } from '@/game/GameConfig.js';
import { InputManager, resetInputManager } from '@/game/InputManager.js';
import { Leaderboard, resetLeaderboard } from '@/game/Leaderboard.js';
import { createGameStateMachine, GameStates, GameActions } from '@/game/StateMachine.js';
import { StatsTracker, resetStatsTracker } from '@/game/StatsTracker.js';
import { GameEvents, getEventBus, resetEventBus } from '@/utils/EventEmitter.js';

describe('Game Flow Integration', () => {
  let stateMachine;
  let difficultyManager;
  let comboSystem;
  let statsTracker;
  let leaderboard;
  let inputManager;
  let screenShake;
  let hitMarker;
  let eventBus;

  beforeEach(() => {
    vi.useFakeTimers();

    // Reset all singletons
    resetDifficultyManager();
    resetComboSystem();
    resetStatsTracker();
    resetLeaderboard();
    resetInputManager();
    resetAudioManager();
    resetScreenShake();
    resetHitMarker();
    resetEventBus();

    // Create fresh instances
    eventBus = getEventBus();
    difficultyManager = new DifficultyManager();
    comboSystem = new ComboSystem();
    statsTracker = new StatsTracker();
    leaderboard = new Leaderboard({ storageKey: 'test_integration_leaderboard' });
    inputManager = new InputManager();
    screenShake = new ScreenShake();
    hitMarker = new HitMarker();

    // Create state machine with game context
    stateMachine = createGameStateMachine({
      score: 0,
      timeRemaining: 60,
    });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('State Machine Transitions', () => {
    it('should transition from MENU to PLAYING on START action', () => {
      expect(stateMachine.currentState).toBe(GameStates.MENU);
      stateMachine.transition(GameActions.START);
      expect(stateMachine.currentState).toBe(GameStates.PLAYING);
    });

    it('should transition to PAUSED on PAUSE action', () => {
      stateMachine.transition(GameActions.START);
      stateMachine.transition(GameActions.PAUSE);
      expect(stateMachine.currentState).toBe(GameStates.PAUSED);
    });

    it('should transition back to PLAYING on RESUME', () => {
      stateMachine.transition(GameActions.START);
      stateMachine.transition(GameActions.PAUSE);
      stateMachine.transition(GameActions.RESUME);
      expect(stateMachine.currentState).toBe(GameStates.PLAYING);
    });

    it('should transition to ENDED on END action', () => {
      stateMachine.transition(GameActions.START);
      stateMachine.transition(GameActions.END);
      expect(stateMachine.currentState).toBe(GameStates.ENDED);
    });

    it('should transition from ENDED to MENU on RESTART', () => {
      stateMachine.transition(GameActions.START);
      stateMachine.transition(GameActions.END);
      stateMachine.transition(GameActions.RESTART);
      expect(stateMachine.currentState).toBe(GameStates.MENU);
    });
  });

  describe('Combo and Scoring Integration', () => {
    it('should track hits and update combo', () => {
      statsTracker.recordShot();
      statsTracker.recordHit();
      comboSystem.registerHit();

      const stats = statsTracker.getSessionStats();
      expect(stats.totalHits).toBe(1);
      expect(comboSystem.combo).toBe(1);
    });

    it('should calculate score with combo multiplier', () => {
      const basePoints = GameConfig.circles.hitPoints;

      // Build up combo to reach tier 1 (5+ hits)
      for (let i = 0; i < 5; i++) {
        statsTracker.recordShot();
        statsTracker.recordHit();
        comboSystem.registerHit();
      }

      const multiplier = comboSystem.multiplier;
      const points = Math.floor(basePoints * multiplier);

      expect(multiplier).toBeGreaterThan(1);
      expect(points).toBeGreaterThan(basePoints);
    });

    it('should break combo on miss', () => {
      // Build combo
      for (let i = 0; i < 3; i++) {
        comboSystem.registerHit();
      }
      expect(comboSystem.combo).toBe(3);

      // Miss
      statsTracker.recordShot();
      statsTracker.recordMiss();
      comboSystem.registerMiss();

      expect(comboSystem.combo).toBe(0);
    });

    it('should track accuracy via stats', () => {
      statsTracker.recordShot();
      statsTracker.recordHit();
      statsTracker.recordShot();
      statsTracker.recordHit();
      statsTracker.recordShot();
      statsTracker.recordMiss();
      statsTracker.recordShot();
      statsTracker.recordHit();

      const stats = statsTracker.getSessionStats();
      expect(stats.totalShots).toBe(4);
      expect(stats.totalHits).toBe(3);
      // Accuracy = hits / shots = 3/4 = 75%
      const accuracy = statsTracker.getAccuracy(true);
      expect(accuracy).toBe(75);
    });
  });

  describe('Visual Feedback Integration', () => {
    it('should show hit markers and screen shake on hit', () => {
      hitMarker.showHit();
      screenShake.shake('recoil');

      expect(hitMarker.markerCount).toBe(1);
      expect(screenShake.isShaking).toBe(true);
    });

    it('should show damage numbers with combo bonus', () => {
      for (let i = 0; i < 6; i++) {
        comboSystem.registerHit();
      }

      const baseDamage = 100;
      const multiplier = comboSystem.multiplier;
      const finalDamage = Math.floor(baseDamage * multiplier);

      hitMarker.showDamage(finalDamage, { critical: multiplier >= 2 });

      expect(hitMarker.damageNumberCount).toBe(1);
      const numbers = hitMarker.getDamageNumbers();
      expect(numbers[0].damage).toBe(finalDamage);
    });

    it('should update effects over time', () => {
      screenShake.shake('medium');
      hitMarker.showHit();

      // Update partway
      screenShake.update(50);
      hitMarker.update(50);

      expect(screenShake.isShaking).toBe(true);
      expect(hitMarker.markerCount).toBe(1);

      // Update past duration
      screenShake.update(200);
      hitMarker.update(200);

      expect(screenShake.isShaking).toBe(false);
      expect(hitMarker.markerCount).toBe(0);
    });

    it('should reset effects', () => {
      screenShake.shake('medium');
      hitMarker.showHit();

      screenShake.reset();
      hitMarker.reset();

      expect(screenShake.isShaking).toBe(false);
      expect(hitMarker.markerCount).toBe(0);
    });
  });

  describe('Pause Functionality Integration', () => {
    it('should integrate with InputManager pause', () => {
      inputManager.pause();
      expect(inputManager.isPaused).toBe(true);

      inputManager.resume();
      expect(inputManager.isPaused).toBe(false);
    });

    it('should toggle pause state', () => {
      inputManager.togglePause();
      expect(inputManager.isPaused).toBe(true);

      inputManager.togglePause();
      expect(inputManager.isPaused).toBe(false);
    });
  });

  describe('Leaderboard Integration', () => {
    beforeEach(() => {
      // Clear leaderboard for each test
      leaderboard.clearAll();
    });

    it('should save score to leaderboard', () => {
      const result = leaderboard.addScore({
        name: 'Player',
        score: 1500,
        accuracy: 85,
        difficulty: 'medium',
      });

      expect(result).not.toBeNull();
      expect(result.entry).toBeDefined();
      expect(result.rank).toBeDefined();
    });

    it('should check for high score via potential rank', () => {
      leaderboard.addScore({ name: 'Player1', score: 1000 });

      const rank = leaderboard.getPotentialRank(1500);
      expect(rank).toBe(1); // Higher score should be first (1-indexed)
    });

    it('should rank scores correctly', () => {
      leaderboard.addScore({ name: 'Player1', score: 100 });
      leaderboard.addScore({ name: 'Player2', score: 300 });
      leaderboard.addScore({ name: 'Player3', score: 200 });

      const scores = leaderboard.getScores();
      expect(scores[0].score).toBe(300);
      expect(scores[1].score).toBe(200);
      expect(scores[2].score).toBe(100);
    });
  });

  describe('Difficulty Integration', () => {
    it('should adjust spawn rate by difficulty', () => {
      const easySettings = DifficultyPresets[DifficultyLevel.EASY];
      const hardSettings = DifficultyPresets[DifficultyLevel.HARD];

      expect(hardSettings.spawnInterval).toBeLessThan(easySettings.spawnInterval);
      expect(hardSettings.circleLifetime).toBeLessThan(easySettings.circleLifetime);
    });

    it('should apply score multiplier by difficulty', () => {
      const baseScore = 100;

      difficultyManager.setLevel(DifficultyLevel.EASY);
      const easyMultiplier = difficultyManager.settings.scoreMultiplier;

      difficultyManager.setLevel(DifficultyLevel.EXTREME);
      const extremeMultiplier = difficultyManager.settings.scoreMultiplier;

      expect(extremeMultiplier).toBeGreaterThan(easyMultiplier);
      expect(Math.floor(baseScore * extremeMultiplier)).toBeGreaterThan(
        Math.floor(baseScore * easyMultiplier)
      );
    });
  });

  describe('Event System Integration', () => {
    it('should emit events through event bus', () => {
      const hitCallback = vi.fn();
      eventBus.on(GameEvents.CIRCLE_HIT, hitCallback);

      eventBus.emit(GameEvents.CIRCLE_HIT, { circleId: 'test', points: 100 });

      expect(hitCallback).toHaveBeenCalledWith({ circleId: 'test', points: 100 });
    });

    it('should chain multiple event listeners', () => {
      const callbacks = [vi.fn(), vi.fn(), vi.fn()];

      callbacks.forEach((cb) => eventBus.on(GameEvents.GAME_START, cb));
      eventBus.emit(GameEvents.GAME_START);

      callbacks.forEach((cb) => expect(cb).toHaveBeenCalled());
    });

    it('should handle combo increase events', () => {
      const callback = vi.fn();
      eventBus.on(GameEvents.COMBO_INCREASE, callback);

      comboSystem.registerHit();

      expect(callback).toHaveBeenCalled();
    });

    it('should handle combo reset events', () => {
      const callback = vi.fn();
      eventBus.on(GameEvents.COMBO_RESET, callback);

      comboSystem.registerHit();
      comboSystem.registerHit();
      comboSystem.registerMiss();

      expect(callback).toHaveBeenCalled();
    });
  });

  describe('Complete Game Session', () => {
    it('should run a complete game session', () => {
      // Start from menu
      expect(stateMachine.currentState).toBe(GameStates.MENU);

      // Set difficulty
      difficultyManager.setLevel(DifficultyLevel.MEDIUM);

      // Start game
      stateMachine.transition(GameActions.START);
      expect(stateMachine.currentState).toBe(GameStates.PLAYING);

      // Reset systems for new game
      comboSystem.reset();
      statsTracker.resetSession();

      // Simulate gameplay - 3 successful hits
      for (let round = 0; round < 3; round++) {
        statsTracker.recordShot();
        statsTracker.recordHit();
        comboSystem.registerHit();
        hitMarker.showHit();
        screenShake.shake('recoil');

        // Update effects
        screenShake.update(16);
        hitMarker.update(16);
      }

      // Verify state after gameplay
      const stats = statsTracker.getSessionStats();
      expect(stats.totalHits).toBe(3);
      expect(comboSystem.combo).toBe(3);

      // End game
      stateMachine.transition(GameActions.END);
      expect(stateMachine.currentState).toBe(GameStates.ENDED);

      // Save score
      const result = leaderboard.addScore({
        name: 'TestPlayer',
        score: 300,
        accuracy: statsTracker.getAccuracy(true),
        difficulty: 'medium',
        maxCombo: comboSystem.maxComboReached,
      });
      expect(result).not.toBeNull();

      // Restart
      stateMachine.transition(GameActions.RESTART);
      expect(stateMachine.currentState).toBe(GameStates.MENU);
    });
  });
});

describe('Combo Timeout Integration', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    resetComboSystem();
    resetEventBus();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should emit combo reset on timeout', () => {
    const comboSystem = new ComboSystem();
    const callback = vi.fn();

    const eventBus = getEventBus();
    eventBus.on(GameEvents.COMBO_RESET, callback);

    comboSystem.registerHit();
    comboSystem.registerHit();
    expect(comboSystem.combo).toBe(2);

    // Wait for timeout (combo timeout is 3000ms by default)
    vi.advanceTimersByTime(3500);

    expect(comboSystem.combo).toBe(0);
    expect(callback).toHaveBeenCalled();
  });
});
