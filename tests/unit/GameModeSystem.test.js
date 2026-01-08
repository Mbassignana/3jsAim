/**
 * Tests for GameModeSystem - Game modes with different rules and scoring
 */

import {
  GameModeSystem,
  GameModes,
  getGameModeSystem,
  resetGameModeSystem,
} from '@game/GameModeSystem.js';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

describe('GameModeSystem', () => {
  let system;

  beforeEach(() => {
    vi.useFakeTimers();
    system = new GameModeSystem();
  });

  afterEach(() => {
    system.end();
    vi.useRealTimers();
    resetGameModeSystem();
  });

  // ==========================================================================
  // Game Modes Definitions
  // ==========================================================================

  describe('GameModes', () => {
    it('should define all expected modes', () => {
      expect(GameModes.TIME_ATTACK).toBeDefined();
      expect(GameModes.SURVIVAL).toBeDefined();
      expect(GameModes.PRECISION).toBeDefined();
      expect(GameModes.ENDURANCE).toBeDefined();
      expect(GameModes.BLITZ).toBeDefined();
    });

    it('should have required properties on each mode', () => {
      const requiredProps = ['id', 'name', 'description', 'icon', 'rules', 'scoring'];

      Object.values(GameModes).forEach((mode) => {
        requiredProps.forEach((prop) => {
          expect(mode[prop], `${mode.id} missing ${prop}`).toBeDefined();
        });
      });
    });

    it('should have unique IDs', () => {
      const ids = Object.values(GameModes).map((m) => m.id);
      const uniqueIds = new Set(ids);
      expect(uniqueIds.size).toBe(ids.length);
    });
  });

  // ==========================================================================
  // Mode Selection
  // ==========================================================================

  describe('mode selection', () => {
    it('should default to TIME_ATTACK', () => {
      expect(system.currentMode.id).toBe('time_attack');
    });

    it('should set mode by ID string', () => {
      system.setMode('survival');
      expect(system.currentMode.id).toBe('survival');
    });

    it('should set mode by uppercase key', () => {
      system.setMode('PRECISION');
      expect(system.currentMode.id).toBe('precision');
    });

    it('should set mode by config object', () => {
      system.setMode(GameModes.ENDURANCE);
      expect(system.currentMode.id).toBe('endurance');
    });

    it('should throw for unknown mode', () => {
      expect(() => system.setMode('unknown_mode')).toThrow('Unknown game mode');
    });

    it('should emit mode changed event', () => {
      const handler = vi.fn();
      system.on('mode:changed', handler);

      system.setMode('blitz');

      expect(handler).toHaveBeenCalledWith(
        expect.objectContaining({
          mode: expect.objectContaining({ id: 'blitz' }),
        })
      );
    });
  });

  // ==========================================================================
  // Game Start
  // ==========================================================================

  describe('game start', () => {
    it('should start the game', () => {
      system.start();
      expect(system.isActive).toBe(true);
    });

    it('should reset score on start', () => {
      system.start();
      system.registerHit();
      system.end();

      system.start();
      expect(system.score).toBe(0);
    });

    it('should set initial time for timed modes', () => {
      system.setMode('time_attack');
      system.start();

      expect(system.timeRemaining).toBe(GameModes.TIME_ATTACK.rules.timeLimit);
    });

    it('should set initial lives for survival mode', () => {
      system.setMode('survival');
      system.start();

      expect(system.lives).toBe(GameModes.SURVIVAL.rules.lives);
    });

    it('should emit game started event', () => {
      const handler = vi.fn();
      system.on('game:started', handler);

      system.start();

      expect(handler).toHaveBeenCalledWith(
        expect.objectContaining({
          mode: expect.objectContaining({ id: 'time_attack' }),
        })
      );
    });
  });

  // ==========================================================================
  // Scoring
  // ==========================================================================

  describe('scoring', () => {
    beforeEach(() => {
      system.start();
    });

    it('should add base points on hit', () => {
      const result = system.registerHit();
      expect(result.points).toBe(GameModes.TIME_ATTACK.scoring.hitBase);
      expect(system.score).toBe(result.points);
    });

    it('should track hits', () => {
      system.registerHit();
      system.registerHit();
      system.registerHit();

      expect(system.state.hits).toBe(3);
    });

    it('should track misses', () => {
      system.registerMiss();
      system.registerMiss();

      expect(system.state.misses).toBe(2);
    });

    it('should calculate accuracy', () => {
      system.registerHit();
      system.registerHit();
      system.registerMiss();
      system.registerMiss();

      expect(system.accuracy).toBe(50);
    });

    it('should return 100% accuracy with no shots', () => {
      expect(system.accuracy).toBe(100);
    });

    it('should apply miss penalty in endurance mode', () => {
      system.setMode('endurance');
      system.start();

      system.registerHit();
      const scoreAfterHit = system.score;

      system.registerMiss();
      expect(system.score).toBe(scoreAfterHit + GameModes.ENDURANCE.scoring.missBase);
    });

    it('should not go below zero score', () => {
      system.setMode('endurance');
      system.start();

      system.registerMiss();
      system.registerMiss();
      system.registerMiss();

      expect(system.score).toBeGreaterThanOrEqual(0);
    });

    it('should apply combo multiplier when enabled', () => {
      system.start();

      const baseResult = system.registerHit();
      const comboResult = system.registerHit({ comboMultiplier: 2 });

      expect(comboResult.points).toBeGreaterThan(baseResult.points);
    });

    it('should not apply combo in precision mode', () => {
      system.setMode('precision');
      system.start();

      const result1 = system.registerHit({ comboMultiplier: 1 });
      const result2 = system.registerHit({ comboMultiplier: 5 });

      // Both should be same base points (combo disabled)
      expect(result1.points).toBe(result2.points);
    });
  });

  // ==========================================================================
  // Time Attack Mode
  // ==========================================================================

  describe('Time Attack mode', () => {
    beforeEach(() => {
      system.setMode('time_attack');
      system.start();
    });

    it('should count down time', () => {
      const initialTime = system.timeRemaining;

      vi.advanceTimersByTime(5000);

      expect(system.timeRemaining).toBe(initialTime - 5);
    });

    it('should end when time runs out', () => {
      const handler = vi.fn();
      system.on('game:ended', handler);

      vi.advanceTimersByTime(GameModes.TIME_ATTACK.rules.timeLimit * 1000 + 100);

      expect(system.isActive).toBe(false);
      expect(handler).toHaveBeenCalledWith(
        expect.objectContaining({ reason: 'time_up' })
      );
    });

    it('should emit timer tick events', () => {
      const handler = vi.fn();
      system.on('timer:tick', handler);

      vi.advanceTimersByTime(3000);

      expect(handler).toHaveBeenCalledTimes(3);
    });

    it('should not end on miss', () => {
      system.registerMiss();
      system.registerMiss();
      system.registerMiss();

      expect(system.isActive).toBe(true);
    });
  });

  // ==========================================================================
  // Survival Mode
  // ==========================================================================

  describe('Survival mode', () => {
    beforeEach(() => {
      system.setMode('survival');
      system.start();
    });

    it('should start with configured lives', () => {
      expect(system.lives).toBe(3);
    });

    it('should lose life on miss', () => {
      system.registerMiss();
      expect(system.lives).toBe(2);
    });

    it('should emit life lost event', () => {
      const handler = vi.fn();
      system.on('life:lost', handler);

      system.registerMiss();

      expect(handler).toHaveBeenCalledWith({ livesRemaining: 2 });
    });

    it('should end when no lives remain', () => {
      system.registerMiss();
      system.registerMiss();
      const result = system.registerMiss();

      expect(result.gameOver).toBe(true);
      expect(system.isActive).toBe(false);
    });

    it('should have no time limit', () => {
      expect(system.timeRemaining).toBe(0);

      vi.advanceTimersByTime(60000);

      expect(system.isActive).toBe(true);
    });

    it('should add time bonus to final score', () => {
      vi.advanceTimersByTime(10000); // 10 seconds

      // Manually trigger end to calculate time bonus
      system.end();

      const stats = system.getStats();
      expect(stats.timeElapsed).toBeGreaterThanOrEqual(10);
    });
  });

  // ==========================================================================
  // Precision Mode
  // ==========================================================================

  describe('Precision mode', () => {
    beforeEach(() => {
      system.setMode('precision');
      system.start();
    });

    it('should end on first miss', () => {
      const result = system.registerMiss();

      expect(result.gameOver).toBe(true);
      expect(system.isActive).toBe(false);
      // Precision mode has 1 life, so end reason is 'no_lives' (lives depleted first)
      expect(system.state.endReason).toBe('no_lives');
    });

    it('should win at target score', () => {
      const handler = vi.fn();
      system.on('game:ended', handler);

      // Hit enough times to reach 100 points
      for (let i = 0; i < 10; i++) {
        system.registerHit();
      }

      expect(handler).toHaveBeenCalledWith(
        expect.objectContaining({ reason: 'target_reached' })
      );
    });

    it('should have one life', () => {
      expect(system.lives).toBe(1);
    });
  });

  // ==========================================================================
  // Endurance Mode
  // ==========================================================================

  describe('Endurance mode', () => {
    beforeEach(() => {
      system.setMode('endurance');
      system.start();
    });

    it('should end when accuracy drops below threshold', () => {
      // Need minimum shots first (10)
      for (let i = 0; i < 4; i++) system.registerHit();
      for (let i = 0; i < 6; i++) system.registerMiss();

      // Now accuracy is 40%, below 50% threshold
      expect(system.accuracy).toBeLessThan(50);
      expect(system.isActive).toBe(false);
    });

    it('should not end early before minimum shots', () => {
      // Only 5 shots, can't fail yet
      system.registerHit();
      system.registerMiss();
      system.registerMiss();
      system.registerMiss();
      system.registerMiss();

      // 5 shots total, accuracy 20%, but need 10 shots minimum
      expect(system.isActive).toBe(true);
    });

    it('should win at target score', () => {
      for (let i = 0; i < 20; i++) {
        system.registerHit();
      }

      expect(system.isActive).toBe(false);
      expect(system.state.endReason).toBe('target_reached');
    });
  });

  // ==========================================================================
  // Blitz Mode
  // ==========================================================================

  describe('Blitz mode', () => {
    beforeEach(() => {
      system.setMode('blitz');
      system.start();
    });

    it('should have 60 second time limit', () => {
      expect(system.timeRemaining).toBe(60);
    });

    it('should have higher base points', () => {
      const result = system.registerHit();
      expect(result.points).toBe(15);
    });

    it('should have small miss penalty', () => {
      system.registerHit(); // Get some score first
      const scoreBefore = system.score;

      system.registerMiss();

      expect(system.score).toBe(scoreBefore - 2);
    });
  });

  // ==========================================================================
  // Pause/Resume
  // ==========================================================================

  describe('pause/resume', () => {
    beforeEach(() => {
      system.setMode('time_attack');
      system.start();
    });

    it('should pause the game', () => {
      system.pause();
      expect(system.isPaused()).toBe(true);
    });

    it('should stop timer when paused', () => {
      const initialTime = system.timeRemaining;

      system.pause();
      vi.advanceTimersByTime(5000);

      expect(system.timeRemaining).toBe(initialTime);
    });

    it('should resume the game', () => {
      system.pause();
      system.resume();

      expect(system.isPaused()).toBe(false);
    });

    it('should resume timer when resumed', () => {
      vi.advanceTimersByTime(2000);
      system.pause();
      vi.advanceTimersByTime(5000);
      system.resume();
      vi.advanceTimersByTime(3000);

      // Should have lost 5 seconds total (2 before pause + 3 after resume)
      expect(system.timeRemaining).toBe(GameModes.TIME_ATTACK.rules.timeLimit - 5);
    });

    it('should emit pause/resume events', () => {
      const pauseHandler = vi.fn();
      const resumeHandler = vi.fn();
      system.on('game:paused', pauseHandler);
      system.on('game:resumed', resumeHandler);

      system.pause();
      system.resume();

      expect(pauseHandler).toHaveBeenCalled();
      expect(resumeHandler).toHaveBeenCalled();
    });

    it('should not pause inactive game', () => {
      system.end();
      system.pause();

      expect(system.isPaused()).toBe(false);
    });
  });

  // ==========================================================================
  // Final Score Calculation
  // ==========================================================================

  describe('final score calculation', () => {
    it('should calculate time bonus for timed modes', () => {
      system.setMode('blitz');
      system.start();
      system.registerHit();
      system.registerHit();

      vi.advanceTimersByTime(30000); // 30 seconds elapsed, 30 remaining

      system.end();
      const finalScores = system.calculateFinalScore();

      expect(finalScores.timeBonus).toBeGreaterThan(0);
    });

    it('should combine all bonuses', () => {
      system.setMode('blitz');
      system.start();
      system.registerHit();

      system.end();
      const finalScores = system.calculateFinalScore();

      expect(finalScores.finalScore).toBe(
        finalScores.baseScore + finalScores.timeBonus + finalScores.accuracyBonus
      );
    });
  });

  // ==========================================================================
  // Game End
  // ==========================================================================

  describe('game end', () => {
    beforeEach(() => {
      system.start();
    });

    it('should end game manually', () => {
      system.end('manual');

      expect(system.isActive).toBe(false);
      expect(system.state.endReason).toBe('manual');
    });

    it('should emit game ended event', () => {
      const handler = vi.fn();
      system.on('game:ended', handler);

      system.end();

      expect(handler).toHaveBeenCalledWith(
        expect.objectContaining({
          reason: 'manual',
          stats: expect.any(Object),
          finalScores: expect.any(Object),
        })
      );
    });

    it('should stop accepting input after end', () => {
      system.end();

      const result = system.registerHit();
      expect(result.points).toBe(0);
      expect(system.state.hits).toBe(0);
    });

    it('should not end twice', () => {
      const handler = vi.fn();
      system.on('game:ended', handler);

      system.end();
      system.end();

      expect(handler).toHaveBeenCalledTimes(1);
    });
  });

  // ==========================================================================
  // Statistics
  // ==========================================================================

  describe('statistics', () => {
    it('should track game stats', () => {
      system.start();
      system.registerHit();
      system.registerHit();
      system.registerMiss();

      vi.advanceTimersByTime(5000);

      const stats = system.getStats();

      expect(stats.mode).toBe('time_attack');
      expect(stats.score).toBeGreaterThan(0);
      expect(stats.hits).toBe(2);
      expect(stats.misses).toBe(1);
      expect(stats.accuracy).toBeCloseTo(66.67, 1);
    });
  });

  // ==========================================================================
  // Static Methods
  // ==========================================================================

  describe('static methods', () => {
    it('should get all available modes', () => {
      const modes = GameModeSystem.getAvailableModes();

      expect(modes.length).toBe(5);
      expect(modes.map((m) => m.id)).toContain('time_attack');
      expect(modes.map((m) => m.id)).toContain('survival');
      expect(modes.map((m) => m.id)).toContain('precision');
    });

    it('should get mode by ID', () => {
      const mode = GameModeSystem.getModeById('survival');
      expect(mode.id).toBe('survival');
    });

    it('should return null for unknown mode', () => {
      const mode = GameModeSystem.getModeById('unknown');
      expect(mode).toBeNull();
    });
  });

  // ==========================================================================
  // Singleton
  // ==========================================================================

  describe('singleton', () => {
    afterEach(() => {
      resetGameModeSystem();
    });

    it('should return same instance', () => {
      const instance1 = getGameModeSystem();
      const instance2 = getGameModeSystem();

      expect(instance1).toBe(instance2);
    });

    it('should create new instance after reset', () => {
      const instance1 = getGameModeSystem();
      resetGameModeSystem();
      const instance2 = getGameModeSystem();

      expect(instance1).not.toBe(instance2);
    });
  });
});
