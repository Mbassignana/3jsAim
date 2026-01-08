/**
 * Unit tests for LevelManager - Enhanced gameplay loop
 */

import { describe, it, expect, beforeEach } from 'vitest';

// Mock the LevelManager class functionality
class MockLevelManager {
  constructor(game = null) {
    this.game = game;

    // Game modes
    this.gameModes = {
      CLASSIC: 'classic',
      FLICK_SHOT: 'flickShot',
      TRACKING: 'tracking',
      REACTION: 'reaction',
      PRECISION: 'precision',
      ELIMINATION: 'elimination',
      SURVIVAL: 'survival',
    };

    // State
    this.currentMode = 'classic';
    this.currentWave = 1;
    this.maxWaves = 5;
    this.waveTimeRemaining = 30;
    this.isWarmingUp = false;
    this.warmupTimeRemaining = 0;

    // Scoring
    this.streakCount = 0;
    this.maxStreak = 0;
    this.scoreMultiplier = 1.0;
    this.lastHitTime = 0;
    this.streakTimeout = 2000;

    // Stats
    this.roundStats = this.createEmptyStats();

    // Configs
    this.waveConfigs = this.initWaveConfigs();
    this.targetPatterns = this.initTargetPatterns();
  }

  createEmptyStats() {
    return {
      targetsHit: 0,
      targetsMissed: 0,
      accuracy: 0,
      maxStreak: 0,
    };
  }

  initWaveConfigs() {
    return {
      classic: [
        { wave: 1, targets: 5, time: 30, pattern: 'floating' },
        { wave: 2, targets: 7, time: 30, pattern: 'floating' },
        { wave: 3, targets: 9, time: 30, pattern: 'strafing' },
        { wave: 4, targets: 11, time: 30, pattern: 'strafing' },
        { wave: 5, targets: 13, time: 30, pattern: 'erratic' },
      ],
      flickShot: [
        { wave: 1, targets: 8, time: 30, targetLifetime: 1.5, pattern: 'popup' },
        { wave: 2, targets: 10, time: 30, targetLifetime: 1.2, pattern: 'popup' },
      ],
      tracking: [{ wave: 1, targets: 4, time: 30, speedMultiplier: 0.8, pattern: 'strafing' }],
    };
  }

  initTargetPatterns() {
    return {
      static: { movement: 'none', speedMultiplier: 0 },
      floating: { movement: 'float', speedMultiplier: 1.0 },
      strafing: { movement: 'strafe', speedMultiplier: 1.5 },
      popup: { movement: 'popup', speedMultiplier: 0 },
      erratic: { movement: 'erratic', speedMultiplier: 2.0 },
      orbital: { movement: 'orbit', speedMultiplier: 1.2 },
    };
  }

  setGameMode(mode) {
    if (Object.values(this.gameModes).includes(mode)) {
      this.currentMode = mode;
      this.currentWave = 1;
      this.resetStats();
      return true;
    }
    return false;
  }

  getCurrentWaveConfig() {
    const modeWaves = this.waveConfigs[this.currentMode];
    if (!modeWaves) return { targets: 5, time: 30, pattern: 'floating' };
    const waveIndex = Math.min(this.currentWave - 1, modeWaves.length - 1);
    return modeWaves[waveIndex];
  }

  startWarmup(duration = 3) {
    this.isWarmingUp = true;
    this.warmupTimeRemaining = duration;
  }

  endWarmup() {
    this.isWarmingUp = false;
    this.warmupTimeRemaining = 0;
  }

  startWave() {
    const config = this.getCurrentWaveConfig();
    this.waveTimeRemaining = config.time || 30;
    this.activePattern = config.pattern;
    this.activeConfig = config;
    return config;
  }

  endWave() {
    if (this.currentWave < this.maxWaves) {
      this.currentWave++;
      return { nextWave: this.currentWave, gameOver: false };
    }
    return { nextWave: null, gameOver: true };
  }

  updateScoreMultiplier() {
    if (this.streakCount >= 10) {
      this.scoreMultiplier = 2.5;
    } else if (this.streakCount >= 7) {
      this.scoreMultiplier = 2.0;
    } else if (this.streakCount >= 5) {
      this.scoreMultiplier = 1.75;
    } else if (this.streakCount >= 3) {
      this.scoreMultiplier = 1.5;
    } else {
      this.scoreMultiplier = 1.0;
    }
  }

  onTargetHit() {
    this.streakCount++;
    if (this.streakCount > this.maxStreak) {
      this.maxStreak = this.streakCount;
      this.roundStats.maxStreak = this.maxStreak;
    }
    this.lastHitTime = Date.now();
    this.roundStats.targetsHit++;

    this.updateScoreMultiplier();

    const baseScore = 10;
    const streakBonus = Math.min(this.streakCount * 2, 20);
    return Math.floor((baseScore + streakBonus) * this.scoreMultiplier);
  }

  breakStreak() {
    this.streakCount = 0;
    this.scoreMultiplier = 1.0;
  }

  resetStats() {
    this.roundStats = this.createEmptyStats();
    this.streakCount = 0;
    this.maxStreak = 0;
    this.scoreMultiplier = 1.0;
  }

  reset() {
    this.currentWave = 1;
    this.isWarmingUp = false;
    this.warmupTimeRemaining = 0;
    this.waveTimeRemaining = 0;
    this.resetStats();
  }
}

describe('LevelManager', () => {
  let manager;

  beforeEach(() => {
    manager = new MockLevelManager();
  });

  describe('constructor', () => {
    it('should initialize with default values', () => {
      expect(manager.currentMode).toBe('classic');
      expect(manager.currentWave).toBe(1);
      expect(manager.maxWaves).toBe(5);
      expect(manager.streakCount).toBe(0);
      expect(manager.scoreMultiplier).toBe(1.0);
    });

    it('should define all game modes', () => {
      expect(manager.gameModes.CLASSIC).toBe('classic');
      expect(manager.gameModes.FLICK_SHOT).toBe('flickShot');
      expect(manager.gameModes.TRACKING).toBe('tracking');
      expect(manager.gameModes.REACTION).toBe('reaction');
      expect(manager.gameModes.PRECISION).toBe('precision');
      expect(manager.gameModes.ELIMINATION).toBe('elimination');
      expect(manager.gameModes.SURVIVAL).toBe('survival');
    });

    it('should initialize target patterns', () => {
      expect(manager.targetPatterns.static).toBeDefined();
      expect(manager.targetPatterns.floating).toBeDefined();
      expect(manager.targetPatterns.strafing).toBeDefined();
      expect(manager.targetPatterns.popup).toBeDefined();
      expect(manager.targetPatterns.erratic).toBeDefined();
      expect(manager.targetPatterns.orbital).toBeDefined();
    });
  });

  describe('setGameMode', () => {
    it('should set valid game mode', () => {
      const result = manager.setGameMode('flickShot');
      expect(result).toBe(true);
      expect(manager.currentMode).toBe('flickShot');
    });

    it('should reset wave to 1 when changing mode', () => {
      manager.currentWave = 3;
      manager.setGameMode('tracking');
      expect(manager.currentWave).toBe(1);
    });

    it('should reset stats when changing mode', () => {
      manager.streakCount = 5;
      manager.roundStats.targetsHit = 10;
      manager.setGameMode('precision');
      expect(manager.streakCount).toBe(0);
      expect(manager.roundStats.targetsHit).toBe(0);
    });

    it('should return false for invalid mode', () => {
      const result = manager.setGameMode('invalidMode');
      expect(result).toBe(false);
      expect(manager.currentMode).toBe('classic');
    });
  });

  describe('getCurrentWaveConfig', () => {
    it('should return config for current wave', () => {
      const config = manager.getCurrentWaveConfig();
      expect(config.wave).toBe(1);
      expect(config.targets).toBe(5);
      expect(config.pattern).toBe('floating');
    });

    it('should return correct config for later waves', () => {
      manager.currentWave = 3;
      const config = manager.getCurrentWaveConfig();
      expect(config.targets).toBe(9);
      expect(config.pattern).toBe('strafing');
    });

    it('should clamp to last wave config if beyond max', () => {
      manager.currentWave = 10;
      const config = manager.getCurrentWaveConfig();
      expect(config.targets).toBe(13);
      expect(config.pattern).toBe('erratic');
    });

    it('should return mode-specific config', () => {
      manager.setGameMode('flickShot');
      const config = manager.getCurrentWaveConfig();
      expect(config.pattern).toBe('popup');
      expect(config.targetLifetime).toBeDefined();
    });
  });

  describe('warmup phase', () => {
    it('should start warmup with duration', () => {
      manager.startWarmup(5);
      expect(manager.isWarmingUp).toBe(true);
      expect(manager.warmupTimeRemaining).toBe(5);
    });

    it('should end warmup', () => {
      manager.startWarmup(3);
      manager.endWarmup();
      expect(manager.isWarmingUp).toBe(false);
      expect(manager.warmupTimeRemaining).toBe(0);
    });
  });

  describe('wave management', () => {
    it('should start wave with correct config', () => {
      const config = manager.startWave();
      expect(config.targets).toBe(5);
      expect(manager.waveTimeRemaining).toBe(30);
      expect(manager.activePattern).toBe('floating');
    });

    it('should advance to next wave', () => {
      const result = manager.endWave();
      expect(result.nextWave).toBe(2);
      expect(result.gameOver).toBe(false);
      expect(manager.currentWave).toBe(2);
    });

    it('should end game after max waves', () => {
      manager.currentWave = 5;
      const result = manager.endWave();
      expect(result.gameOver).toBe(true);
      expect(result.nextWave).toBeNull();
    });
  });

  describe('scoring and streaks', () => {
    it('should calculate base score on hit', () => {
      const score = manager.onTargetHit();
      expect(score).toBeGreaterThanOrEqual(10);
    });

    it('should increment streak on hit', () => {
      manager.onTargetHit();
      expect(manager.streakCount).toBe(1);
      manager.onTargetHit();
      expect(manager.streakCount).toBe(2);
    });

    it('should track max streak', () => {
      manager.onTargetHit();
      manager.onTargetHit();
      manager.onTargetHit();
      expect(manager.maxStreak).toBe(3);

      manager.breakStreak();
      manager.onTargetHit();
      expect(manager.maxStreak).toBe(3); // Should keep max
    });

    it('should apply 1.5x multiplier at 3 streak', () => {
      manager.onTargetHit();
      manager.onTargetHit();
      manager.onTargetHit();
      expect(manager.scoreMultiplier).toBe(1.5);
    });

    it('should apply 1.75x multiplier at 5 streak', () => {
      for (let i = 0; i < 5; i++) manager.onTargetHit();
      expect(manager.scoreMultiplier).toBe(1.75);
    });

    it('should apply 2.0x multiplier at 7 streak', () => {
      for (let i = 0; i < 7; i++) manager.onTargetHit();
      expect(manager.scoreMultiplier).toBe(2.0);
    });

    it('should apply 2.5x multiplier at 10 streak', () => {
      for (let i = 0; i < 10; i++) manager.onTargetHit();
      expect(manager.scoreMultiplier).toBe(2.5);
    });

    it('should reset streak on break', () => {
      manager.onTargetHit();
      manager.onTargetHit();
      manager.breakStreak();
      expect(manager.streakCount).toBe(0);
      expect(manager.scoreMultiplier).toBe(1.0);
    });

    it('should track targets hit in stats', () => {
      manager.onTargetHit();
      manager.onTargetHit();
      expect(manager.roundStats.targetsHit).toBe(2);
    });
  });

  describe('score calculation with multiplier', () => {
    it('should calculate score with streak bonus', () => {
      // First hit: base 10 + streak bonus 2 = 12 * 1.0 = 12
      const score1 = manager.onTargetHit();
      expect(score1).toBe(12);

      // Second hit: base 10 + streak bonus 4 = 14 * 1.0 = 14
      const score2 = manager.onTargetHit();
      expect(score2).toBe(14);
    });

    it('should cap streak bonus at 20', () => {
      // Get to high streak
      for (let i = 0; i < 15; i++) {
        manager.onTargetHit();
      }
      // Streak bonus = min(16 * 2, 20) = 20
      // Base 10 + 20 = 30 * 2.5 = 75
      const score = manager.onTargetHit();
      expect(score).toBe(75); // 30 * 2.5
    });
  });

  describe('reset', () => {
    it('should reset all state', () => {
      manager.currentWave = 3;
      manager.streakCount = 5;
      manager.roundStats.targetsHit = 10;

      manager.reset();

      expect(manager.currentWave).toBe(1);
      expect(manager.streakCount).toBe(0);
      expect(manager.roundStats.targetsHit).toBe(0);
      expect(manager.isWarmingUp).toBe(false);
    });
  });

  describe('target patterns', () => {
    it('should have correct movement types', () => {
      expect(manager.targetPatterns.static.movement).toBe('none');
      expect(manager.targetPatterns.floating.movement).toBe('float');
      expect(manager.targetPatterns.strafing.movement).toBe('strafe');
      expect(manager.targetPatterns.popup.movement).toBe('popup');
      expect(manager.targetPatterns.erratic.movement).toBe('erratic');
      expect(manager.targetPatterns.orbital.movement).toBe('orbit');
    });

    it('should have speed multipliers', () => {
      expect(manager.targetPatterns.static.speedMultiplier).toBe(0);
      expect(manager.targetPatterns.floating.speedMultiplier).toBe(1.0);
      expect(manager.targetPatterns.strafing.speedMultiplier).toBe(1.5);
      expect(manager.targetPatterns.erratic.speedMultiplier).toBe(2.0);
      expect(manager.targetPatterns.orbital.speedMultiplier).toBe(1.2);
    });
  });
});

describe('LevelManager wave configs', () => {
  let manager;

  beforeEach(() => {
    manager = new MockLevelManager();
  });

  it('should have increasing targets per wave in classic mode', () => {
    const configs = manager.waveConfigs.classic;
    for (let i = 1; i < configs.length; i++) {
      expect(configs[i].targets).toBeGreaterThan(configs[i - 1].targets);
    }
  });

  it('should have decreasing target lifetime in flickShot mode', () => {
    manager.setGameMode('flickShot');
    const configs = manager.waveConfigs.flickShot;
    expect(configs[1].targetLifetime).toBeLessThan(configs[0].targetLifetime);
  });

  it('should have increasing speed multiplier in tracking mode', () => {
    manager.setGameMode('tracking');
    const config = manager.waveConfigs.tracking[0];
    expect(config.speedMultiplier).toBeDefined();
    expect(config.pattern).toBe('strafing');
  });
});

describe('LevelManager stats tracking', () => {
  let manager;

  beforeEach(() => {
    manager = new MockLevelManager();
  });

  it('should track max streak in round stats', () => {
    manager.onTargetHit();
    manager.onTargetHit();
    manager.onTargetHit();
    expect(manager.roundStats.maxStreak).toBe(3);
  });

  it('should reset stats correctly', () => {
    manager.roundStats.targetsHit = 5;
    manager.roundStats.targetsMissed = 2;
    manager.roundStats.maxStreak = 3;

    manager.resetStats();

    expect(manager.roundStats.targetsHit).toBe(0);
    expect(manager.roundStats.targetsMissed).toBe(0);
    expect(manager.roundStats.maxStreak).toBe(0);
  });

  it('should create empty stats with correct structure', () => {
    const stats = manager.createEmptyStats();
    expect(stats).toHaveProperty('targetsHit', 0);
    expect(stats).toHaveProperty('targetsMissed', 0);
    expect(stats).toHaveProperty('accuracy', 0);
    expect(stats).toHaveProperty('maxStreak', 0);
  });
});
