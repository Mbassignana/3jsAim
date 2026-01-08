/**
 * Unit tests for StatsTracker
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

import {
  StatsTracker,
  getStatsTracker,
  resetStatsTracker,
} from '@/game/StatsTracker.js';

// Mock localStorage
function createMockStorage() {
  const store = {};
  return {
    getItem: vi.fn((key) => store[key] || null),
    setItem: vi.fn((key, value) => {
      store[key] = value;
    }),
    removeItem: vi.fn((key) => {
      delete store[key];
    }),
    clear: vi.fn(() => {
      Object.keys(store).forEach((key) => delete store[key]);
    }),
  };
}

describe('StatsTracker', () => {
  let tracker;
  let mockStorage;

  beforeEach(() => {
    resetStatsTracker();
    mockStorage = createMockStorage();
    tracker = new StatsTracker({ storage: mockStorage });
  });

  describe('constructor', () => {
    it('should initialize with zero stats', () => {
      expect(tracker.getAllStats().totalHits).toBe(0);
      expect(tracker.getAllStats().gamesPlayed).toBe(0);
    });

    it('should load existing stats', () => {
      const existingStats = { totalHits: 100, gamesPlayed: 5 };
      mockStorage.getItem.mockReturnValueOnce(JSON.stringify(existingStats));
      const loadedTracker = new StatsTracker({ storage: mockStorage });
      expect(loadedTracker.getAllStats().totalHits).toBe(100);
    });
  });

  describe('recordShot', () => {
    it('should increment total shots', () => {
      tracker.recordShot();
      tracker.recordShot();
      expect(tracker.getAllStats().totalShots).toBe(2);
    });

    it('should track session shots', () => {
      tracker.recordShot();
      expect(tracker.getSessionStats().totalShots).toBe(1);
    });

    it('should emit shot event', () => {
      const callback = vi.fn();
      tracker.on('shot', callback);
      tracker.recordShot();
      expect(callback).toHaveBeenCalled();
    });
  });

  describe('recordHit', () => {
    it('should increment hits', () => {
      tracker.recordHit();
      expect(tracker.getAllStats().totalHits).toBe(1);
    });

    it('should track circle destroyed', () => {
      tracker.recordHit({ targetType: 'circle' });
      expect(tracker.getAllStats().circlesDestroyed).toBe(1);
    });

    it('should track NPC hits', () => {
      tracker.recordHit({ targetType: 'npc' });
      expect(tracker.getAllStats().npcsHit).toBe(1);
    });

    it('should accumulate score', () => {
      tracker.recordHit({ points: 10 });
      tracker.recordHit({ points: 20 });
      expect(tracker.getAllStats().totalScore).toBe(30);
    });

    it('should update best combo', () => {
      tracker.recordHit({ combo: 5 });
      tracker.recordHit({ combo: 10 });
      tracker.recordHit({ combo: 3 });
      expect(tracker.getAllStats().bestCombo).toBe(10);
    });

    it('should track reaction times', () => {
      tracker.recordShot();
      // Simulate delay
      vi.spyOn(Date, 'now').mockReturnValueOnce(Date.now() + 500);
      tracker.recordHit();
      expect(tracker.getAllStats().reactionTimes.length).toBe(1);
    });

    it('should emit hit event', () => {
      const callback = vi.fn();
      tracker.on('hit', callback);
      tracker.recordHit({ targetType: 'circle', points: 10 });
      expect(callback).toHaveBeenCalledWith(
        expect.objectContaining({ targetType: 'circle', points: 10 })
      );
    });
  });

  describe('recordMiss', () => {
    it('should increment misses', () => {
      tracker.recordMiss();
      expect(tracker.getAllStats().totalMisses).toBe(1);
    });

    it('should track session misses', () => {
      tracker.recordMiss();
      expect(tracker.getSessionStats().totalMisses).toBe(1);
    });
  });

  describe('recordGameComplete', () => {
    it('should increment games played', () => {
      tracker.recordGameComplete({ score: 100, playTime: 60 });
      expect(tracker.getAllStats().gamesPlayed).toBe(1);
    });

    it('should accumulate play time', () => {
      tracker.recordGameComplete({ score: 100, playTime: 60 });
      tracker.recordGameComplete({ score: 100, playTime: 90 });
      expect(tracker.getAllStats().totalPlayTime).toBe(150);
    });

    it('should update high score', () => {
      tracker.recordGameComplete({ score: 100, playTime: 60 });
      tracker.recordGameComplete({ score: 200, playTime: 60 });
      tracker.recordGameComplete({ score: 150, playTime: 60 });
      expect(tracker.getAllStats().highScore).toBe(200);
    });

    it('should emit newHighScore event', () => {
      const callback = vi.fn();
      tracker.on('newHighScore', callback);
      tracker.recordGameComplete({ score: 100, playTime: 60 });
      expect(callback).toHaveBeenCalledWith({ score: 100 });
    });

    it('should track per-difficulty stats', () => {
      tracker.recordGameComplete({ score: 100, playTime: 60, difficulty: 'hard' });
      tracker.recordGameComplete({ score: 150, playTime: 30, difficulty: 'hard' });

      const hardStats = tracker.getDifficultyStats('hard');
      expect(hardStats.gamesPlayed).toBe(2);
      expect(hardStats.highScore).toBe(150);
      expect(hardStats.totalPlayTime).toBe(90);
    });

    it('should save to storage', () => {
      tracker.recordGameComplete({ score: 100, playTime: 60 });
      expect(mockStorage.setItem).toHaveBeenCalled();
    });
  });

  describe('startSession', () => {
    it('should reset session stats', () => {
      tracker.recordHit();
      tracker.recordMiss();
      tracker.startSession();

      expect(tracker.getSessionStats().totalHits).toBe(0);
      expect(tracker.getSessionStats().totalMisses).toBe(0);
    });

    it('should not affect overall stats', () => {
      tracker.recordHit();
      tracker.startSession();
      expect(tracker.getAllStats().totalHits).toBe(1);
    });
  });

  describe('getAccuracy', () => {
    it('should return 0 for no shots', () => {
      expect(tracker.getAccuracy()).toBe(0);
    });

    it('should calculate accuracy correctly', () => {
      tracker.recordHit();
      tracker.recordHit();
      tracker.recordMiss();
      expect(tracker.getAccuracy()).toBeCloseTo(66.67, 1);
    });

    it('should return session accuracy when specified', () => {
      tracker.recordHit();
      tracker.recordMiss();
      tracker.startSession();
      tracker.recordHit();
      tracker.recordHit();

      expect(tracker.getAccuracy(true)).toBe(100);
      expect(tracker.getAccuracy(false)).toBeCloseTo(75, 1);
    });
  });

  describe('getAverageReactionTime', () => {
    it('should return 0 with no data', () => {
      expect(tracker.getAverageReactionTime()).toBe(0);
    });

    it('should calculate average', () => {
      tracker._stats.reactionTimes = [100, 200, 300];
      expect(tracker.getAverageReactionTime()).toBe(200);
    });
  });

  describe('getBestReactionTime', () => {
    it('should return 0 with no data', () => {
      expect(tracker.getBestReactionTime()).toBe(0);
    });

    it('should return minimum time', () => {
      tracker._stats.reactionTimes = [300, 150, 250];
      expect(tracker.getBestReactionTime()).toBe(150);
    });
  });

  describe('getSummary', () => {
    it('should return summary object', () => {
      const summary = tracker.getSummary();
      expect(summary.gamesPlayed).toBeDefined();
      expect(summary.highScore).toBeDefined();
      expect(summary.bestAccuracy).toBeDefined();
    });
  });

  describe('getSessionSummary', () => {
    it('should return session summary', () => {
      tracker.recordHit({ points: 10 });
      tracker.recordMiss();

      const summary = tracker.getSessionSummary();
      expect(summary.hits).toBe(1);
      expect(summary.misses).toBe(1);
      expect(summary.accuracy).toBe(50);
    });
  });

  describe('resetAll', () => {
    it('should reset all stats', () => {
      tracker.recordHit();
      tracker.recordGameComplete({ score: 100, playTime: 60 });
      tracker.resetAll();

      expect(tracker.getAllStats().totalHits).toBe(0);
      expect(tracker.getAllStats().gamesPlayed).toBe(0);
    });

    it('should emit reset event', () => {
      const callback = vi.fn();
      tracker.on('reset', callback);
      tracker.resetAll();
      expect(callback).toHaveBeenCalled();
    });
  });

  describe('export/import', () => {
    it('should export as JSON', () => {
      tracker.recordHit();
      const exported = tracker.export();
      expect(() => JSON.parse(exported)).not.toThrow();
    });

    it('should import JSON', () => {
      const data = { totalHits: 500, highScore: 9999 };
      const result = tracker.import(JSON.stringify(data));
      expect(result).toBe(true);
      expect(tracker.getAllStats().totalHits).toBe(500);
    });

    it('should return false for invalid JSON', () => {
      const result = tracker.import('invalid');
      expect(result).toBe(false);
    });
  });

  describe('getHitsPerMinute', () => {
    it('should return 0 with no play time', () => {
      expect(tracker.getHitsPerMinute()).toBe(0);
    });

    it('should calculate correctly', () => {
      tracker._stats.totalHits = 60;
      tracker._stats.totalPlayTime = 120; // 2 minutes
      expect(tracker.getHitsPerMinute()).toBe(30);
    });
  });

  describe('getAverageScore', () => {
    it('should return 0 with no games', () => {
      expect(tracker.getAverageScore()).toBe(0);
    });

    it('should calculate average', () => {
      tracker._stats.totalScore = 300;
      tracker._stats.gamesPlayed = 3;
      expect(tracker.getAverageScore()).toBe(100);
    });
  });

  describe('without storage', () => {
    it('should work without storage', () => {
      const noStorageTracker = new StatsTracker({ storage: null });
      noStorageTracker.recordHit();
      expect(noStorageTracker.getAllStats().totalHits).toBe(1);
    });
  });
});

describe('Global StatsTracker', () => {
  beforeEach(() => {
    resetStatsTracker();
  });

  it('should return same instance', () => {
    const t1 = getStatsTracker();
    const t2 = getStatsTracker();
    expect(t1).toBe(t2);
  });

  it('should reset properly', () => {
    const t1 = getStatsTracker();
    t1.recordHit();
    resetStatsTracker();
    const t2 = getStatsTracker();
    expect(t2).not.toBe(t1);
    expect(t2.getAllStats().totalHits).toBe(0);
  });
});
