/**
 * Unit tests for Leaderboard
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  Leaderboard,
  getLeaderboard,
  resetLeaderboard,
} from '@/game/Leaderboard.js';

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

describe('Leaderboard', () => {
  let board;
  let mockStorage;

  beforeEach(() => {
    resetLeaderboard();
    mockStorage = createMockStorage();
    board = new Leaderboard({ storage: mockStorage });
  });

  describe('constructor', () => {
    it('should create empty leaderboard', () => {
      expect(board.getTotalEntries()).toBe(0);
    });

    it('should load existing data', () => {
      const existingData = {
        default_medium: [
          { name: 'Test', score: 100, timestamp: Date.now() },
        ],
      };
      mockStorage.getItem.mockReturnValueOnce(JSON.stringify(existingData));
      const loadedBoard = new Leaderboard({ storage: mockStorage });
      expect(loadedBoard.getTotalEntries()).toBe(1);
    });
  });

  describe('addScore', () => {
    it('should add a score entry', () => {
      const result = board.addScore({ name: 'Player1', score: 100 });
      expect(result.rank).toBe(1);
      expect(result.isHighScore).toBe(true);
      expect(result.entry.name).toBe('Player1');
    });

    it('should sort by score descending', () => {
      board.addScore({ name: 'Low', score: 50 });
      board.addScore({ name: 'High', score: 150 });
      board.addScore({ name: 'Mid', score: 100 });

      const scores = board.getScores();
      expect(scores[0].name).toBe('High');
      expect(scores[1].name).toBe('Mid');
      expect(scores[2].name).toBe('Low');
    });

    it('should return correct rank', () => {
      board.addScore({ name: 'First', score: 100 });
      const result = board.addScore({ name: 'Second', score: 50 });
      expect(result.rank).toBe(2);
      expect(result.isHighScore).toBe(false);
    });

    it('should respect maxEntriesPerMode', () => {
      const smallBoard = new Leaderboard({
        storage: mockStorage,
        maxEntriesPerMode: 3,
      });

      smallBoard.addScore({ name: 'A', score: 100 });
      smallBoard.addScore({ name: 'B', score: 80 });
      smallBoard.addScore({ name: 'C', score: 60 });
      smallBoard.addScore({ name: 'D', score: 40 });

      const scores = smallBoard.getScores();
      expect(scores.length).toBe(3);
      expect(scores.map((s) => s.name)).not.toContain('D');
    });

    it('should truncate long names', () => {
      const result = board.addScore({
        name: 'A'.repeat(50),
        score: 100,
      });
      expect(result.entry.name.length).toBe(20);
    });

    it('should emit scoreAdded event', () => {
      const callback = vi.fn();
      board.on('scoreAdded', callback);
      board.addScore({ name: 'Test', score: 100 });
      expect(callback).toHaveBeenCalledWith(
        expect.objectContaining({
          isHighScore: true,
          rank: 1,
        })
      );
    });

    it('should save to storage', () => {
      board.addScore({ name: 'Test', score: 100 });
      expect(mockStorage.setItem).toHaveBeenCalled();
    });

    it('should store accuracy and maxCombo', () => {
      const result = board.addScore({
        name: 'Test',
        score: 100,
        accuracy: 85.555,
        maxCombo: 15,
      });
      expect(result.entry.accuracy).toBe(85.56);
      expect(result.entry.maxCombo).toBe(15);
    });
  });

  describe('getScores', () => {
    it('should return empty array for new mode', () => {
      const scores = board.getScores('newMode', 'hard');
      expect(scores).toEqual([]);
    });

    it('should return copy of scores', () => {
      board.addScore({ name: 'Test', score: 100 });
      const scores1 = board.getScores();
      const scores2 = board.getScores();
      expect(scores1).not.toBe(scores2);
    });

    it('should separate by difficulty', () => {
      board.addScore({ name: 'Easy', score: 100, difficulty: 'easy' });
      board.addScore({ name: 'Hard', score: 100, difficulty: 'hard' });

      const easy = board.getScores('default', 'easy');
      const hard = board.getScores('default', 'hard');

      expect(easy.length).toBe(1);
      expect(hard.length).toBe(1);
      expect(easy[0].name).toBe('Easy');
      expect(hard[0].name).toBe('Hard');
    });

    it('should separate by game mode', () => {
      board.addScore({ name: 'Survival', score: 100, gameMode: 'survival' });
      board.addScore({ name: 'Default', score: 100, gameMode: 'default' });

      const survival = board.getScores('survival');
      const def = board.getScores('default');

      expect(survival.length).toBe(1);
      expect(def.length).toBe(1);
    });
  });

  describe('getHighScore', () => {
    it('should return null for empty board', () => {
      expect(board.getHighScore()).toBeNull();
    });

    it('should return highest score', () => {
      board.addScore({ name: 'Low', score: 50 });
      board.addScore({ name: 'High', score: 150 });
      const high = board.getHighScore();
      expect(high.name).toBe('High');
      expect(high.score).toBe(150);
    });
  });

  describe('wouldMakeLeaderboard', () => {
    it('should return true for empty board', () => {
      expect(board.wouldMakeLeaderboard(1)).toBe(true);
    });

    it('should return true if would beat lowest', () => {
      const smallBoard = new Leaderboard({
        storage: mockStorage,
        maxEntriesPerMode: 3,
      });

      smallBoard.addScore({ name: 'A', score: 100 });
      smallBoard.addScore({ name: 'B', score: 80 });
      smallBoard.addScore({ name: 'C', score: 60 });

      expect(smallBoard.wouldMakeLeaderboard(70)).toBe(true);
      expect(smallBoard.wouldMakeLeaderboard(50)).toBe(false);
    });
  });

  describe('getPotentialRank', () => {
    it('should return 1 for empty board', () => {
      expect(board.getPotentialRank(100)).toBe(1);
    });

    it('should return correct rank', () => {
      board.addScore({ name: 'A', score: 100 });
      board.addScore({ name: 'B', score: 50 });
      expect(board.getPotentialRank(75)).toBe(2);
      expect(board.getPotentialRank(150)).toBe(1);
    });

    it('should return null if would not make board', () => {
      const smallBoard = new Leaderboard({
        storage: mockStorage,
        maxEntriesPerMode: 2,
      });

      smallBoard.addScore({ name: 'A', score: 100 });
      smallBoard.addScore({ name: 'B', score: 80 });

      expect(smallBoard.getPotentialRank(50)).toBeNull();
    });
  });

  describe('getAvailableModes', () => {
    it('should return empty for new board', () => {
      expect(board.getAvailableModes()).toEqual([]);
    });

    it('should list all used modes', () => {
      board.addScore({ name: 'A', score: 100, difficulty: 'easy' });
      board.addScore({ name: 'B', score: 100, difficulty: 'hard' });
      board.addScore({ name: 'C', score: 100, gameMode: 'survival' });

      const modes = board.getAvailableModes();
      expect(modes.length).toBe(3);
    });
  });

  describe('clearMode', () => {
    it('should clear specific mode', () => {
      board.addScore({ name: 'Easy', score: 100, difficulty: 'easy' });
      board.addScore({ name: 'Hard', score: 100, difficulty: 'hard' });

      board.clearMode('default', 'easy');

      expect(board.getScores('default', 'easy')).toEqual([]);
      expect(board.getScores('default', 'hard').length).toBe(1);
    });

    it('should emit cleared event', () => {
      const callback = vi.fn();
      board.on('cleared', callback);
      board.addScore({ name: 'A', score: 100 });
      board.clearMode();
      expect(callback).toHaveBeenCalled();
    });
  });

  describe('clearAll', () => {
    it('should clear entire board', () => {
      board.addScore({ name: 'A', score: 100, difficulty: 'easy' });
      board.addScore({ name: 'B', score: 100, difficulty: 'hard' });
      board.clearAll();
      expect(board.getTotalEntries()).toBe(0);
    });
  });

  describe('export/import', () => {
    it('should export as JSON', () => {
      board.addScore({ name: 'Test', score: 100 });
      const exported = board.export();
      expect(() => JSON.parse(exported)).not.toThrow();
    });

    it('should import JSON', () => {
      const data = {
        default_medium: [
          { name: 'Imported', score: 999, timestamp: Date.now() },
        ],
      };
      const result = board.import(JSON.stringify(data));
      expect(result).toBe(true);
      expect(board.getHighScore().score).toBe(999);
    });

    it('should return false for invalid JSON', () => {
      const result = board.import('not valid json');
      expect(result).toBe(false);
    });
  });

  describe('without storage', () => {
    it('should work without storage', () => {
      const noStorageBoard = new Leaderboard({ storage: null });
      const result = noStorageBoard.addScore({ name: 'Test', score: 100 });
      expect(result.rank).toBe(1);
    });
  });
});

describe('Global Leaderboard', () => {
  beforeEach(() => {
    resetLeaderboard();
  });

  it('should return same instance', () => {
    const b1 = getLeaderboard();
    const b2 = getLeaderboard();
    expect(b1).toBe(b2);
  });

  it('should reset properly', () => {
    const b1 = getLeaderboard();
    resetLeaderboard();
    const b2 = getLeaderboard();
    expect(b1).not.toBe(b2);
  });
});
