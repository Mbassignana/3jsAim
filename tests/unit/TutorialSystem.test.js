/**
 * Unit tests for TutorialSystem
 * Tests tutorial progression, action tracking, and practice mode
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  TutorialSystem,
  TutorialActions,
  Tutorials,
  PracticeConfig,
  getTutorialSystem,
  resetTutorialSystem,
} from '@game/TutorialSystem.js';

// Mock localStorage
const localStorageMock = (() => {
  let store = {};
  return {
    getItem: vi.fn((key) => store[key] || null),
    setItem: vi.fn((key, value) => { store[key] = value; }),
    removeItem: vi.fn((key) => { delete store[key]; }),
    clear: vi.fn(() => { store = {}; }),
  };
})();

Object.defineProperty(global, 'localStorage', { value: localStorageMock });

describe('TutorialSystem', () => {
  let tutorial;

  beforeEach(() => {
    localStorageMock.clear();
    tutorial = new TutorialSystem();
  });

  afterEach(() => {
    tutorial.skipTutorial();
    tutorial.endPracticeMode();
  });

  // ==========================================================================
  // Tutorial Definitions
  // ==========================================================================
  describe('Tutorial Definitions', () => {
    it('should have BASICS tutorial defined', () => {
      expect(Tutorials.BASICS).toBeDefined();
      expect(Tutorials.BASICS.id).toBe('basics');
      expect(Tutorials.BASICS.steps.length).toBeGreaterThan(0);
    });

    it('should have ADVANCED tutorial defined', () => {
      expect(Tutorials.ADVANCED).toBeDefined();
      expect(Tutorials.ADVANCED.id).toBe('advanced');
      expect(Tutorials.ADVANCED.prerequisite).toBe('basics');
    });

    it('should have all required step properties', () => {
      for (const tutorialDef of Object.values(Tutorials)) {
        for (const step of tutorialDef.steps) {
          expect(step.id).toBeDefined();
          expect(step.title).toBeDefined();
          expect(step.instruction).toBeDefined();
          expect(step.action).toBeDefined();
        }
      }
    });
  });

  // ==========================================================================
  // Tutorial Actions
  // ==========================================================================
  describe('TutorialActions', () => {
    it('should define all action types', () => {
      expect(TutorialActions.NONE).toBe('none');
      expect(TutorialActions.CLICK).toBe('click');
      expect(TutorialActions.SHOOT).toBe('shoot');
      expect(TutorialActions.HIT_TARGET).toBe('hit_target');
      expect(TutorialActions.MOVE).toBe('move');
      expect(TutorialActions.LOOK).toBe('look');
      expect(TutorialActions.RELOAD).toBe('reload');
      expect(TutorialActions.SWITCH_WEAPON).toBe('switch_weapon');
      expect(TutorialActions.PAUSE).toBe('pause');
      expect(TutorialActions.HIT_STREAK).toBe('hit_streak');
      expect(TutorialActions.SCORE_POINTS).toBe('score_points');
      expect(TutorialActions.CUSTOM).toBe('custom');
    });
  });

  // ==========================================================================
  // Practice Config
  // ==========================================================================
  describe('PracticeConfig', () => {
    it('should have default practice settings', () => {
      expect(PracticeConfig.infiniteTime).toBe(true);
      expect(PracticeConfig.infiniteAmmo).toBe(true);
      expect(PracticeConfig.showStats).toBe(true);
      expect(PracticeConfig.targetRespawn).toBe(true);
      expect(PracticeConfig.respawnDelay).toBeGreaterThan(0);
    });
  });

  // ==========================================================================
  // Constructor & Initial State
  // ==========================================================================
  describe('constructor', () => {
    it('should start inactive', () => {
      expect(tutorial.isActive).toBe(false);
      expect(tutorial.isPracticeMode).toBe(false);
    });

    it('should have no current step', () => {
      expect(tutorial.currentStep).toBeNull();
    });

    it('should have no progress', () => {
      expect(tutorial.progress).toBeNull();
    });

    it('should load progress from localStorage', () => {
      localStorageMock.setItem('tutorial_progress', JSON.stringify({
        completed: ['basics'],
      }));

      const newTutorial = new TutorialSystem();
      expect(newTutorial.getCompletedTutorials()).toContain('basics');
    });
  });

  // ==========================================================================
  // Starting Tutorial
  // ==========================================================================
  describe('startTutorial()', () => {
    it('should start basics tutorial by id', () => {
      const result = tutorial.startTutorial('basics');

      expect(result).toBe(true);
      expect(tutorial.isActive).toBe(true);
    });

    it('should start tutorial by uppercase ID', () => {
      const result = tutorial.startTutorial('BASICS');

      expect(result).toBe(true);
      expect(tutorial.isActive).toBe(true);
    });

    it('should emit tutorial:started event', () => {
      const callback = vi.fn();
      tutorial.on('tutorial:started', callback);

      tutorial.startTutorial('basics');

      expect(callback).toHaveBeenCalledWith({ tutorial: Tutorials.BASICS });
    });

    it('should start at first step', () => {
      tutorial.startTutorial('basics');

      expect(tutorial.currentStep).toBe(Tutorials.BASICS.steps[0]);
      expect(tutorial.progress.currentStep).toBe(0);
    });

    it('should return false for unknown tutorial', () => {
      const result = tutorial.startTutorial('nonexistent');

      expect(result).toBe(false);
      expect(tutorial.isActive).toBe(false);
    });

    it('should return false if prerequisites not met', () => {
      // Advanced requires basics to be completed
      const result = tutorial.startTutorial('advanced');

      expect(result).toBe(false);
    });

    it('should allow advanced after basics completed', () => {
      // Simulate basics completion
      localStorageMock.setItem('tutorial_progress', JSON.stringify({
        completed: ['basics'],
      }));
      const newTutorial = new TutorialSystem();

      const result = newTutorial.startTutorial('advanced');

      expect(result).toBe(true);
    });
  });

  // ==========================================================================
  // Step Navigation
  // ==========================================================================
  describe('step navigation', () => {
    beforeEach(() => {
      tutorial.startTutorial('basics');
    });

    describe('nextStep()', () => {
      it('should advance to next step', () => {
        const initialStep = tutorial.currentStep;
        tutorial.nextStep();

        expect(tutorial.currentStep).not.toBe(initialStep);
        expect(tutorial.progress.currentStep).toBe(1);
      });

      it('should emit step:completed for previous step', () => {
        const callback = vi.fn();
        tutorial.on('step:completed', callback);

        tutorial.nextStep();

        expect(callback).toHaveBeenCalled();
        expect(callback.mock.calls[0][0].step.id).toBe('welcome');
      });

      it('should emit step:started for new step', () => {
        const callback = vi.fn();
        tutorial.on('step:started', callback);

        tutorial.nextStep();

        expect(callback).toHaveBeenCalled();
        expect(callback.mock.calls[0][0].step.id).toBe('look_around');
      });

      it('should complete tutorial when all steps done', () => {
        const completedCallback = vi.fn();
        tutorial.on('tutorial:completed', completedCallback);

        // Advance through all steps
        for (let i = 0; i < Tutorials.BASICS.steps.length; i++) {
          tutorial.nextStep();
        }

        expect(completedCallback).toHaveBeenCalled();
        expect(tutorial.isActive).toBe(false);
      });

      it('should return false when tutorial not active', () => {
        tutorial.skipTutorial();
        const result = tutorial.nextStep();

        expect(result).toBe(false);
      });
    });

    describe('previousStep()', () => {
      it('should go back to previous step', () => {
        tutorial.nextStep(); // Go to step 1
        tutorial.previousStep(); // Back to step 0

        expect(tutorial.progress.currentStep).toBe(0);
      });

      it('should return false at first step', () => {
        const result = tutorial.previousStep();

        expect(result).toBe(false);
        expect(tutorial.progress.currentStep).toBe(0);
      });
    });

    describe('skipStep()', () => {
      it('should skip current step', () => {
        const callback = vi.fn();
        tutorial.on('step:skipped', callback);

        tutorial.skipStep();

        expect(callback).toHaveBeenCalled();
        expect(tutorial.progress.currentStep).toBe(1);
      });
    });

    describe('skipTutorial()', () => {
      it('should end tutorial immediately', () => {
        const callback = vi.fn();
        tutorial.on('tutorial:skipped', callback);

        tutorial.skipTutorial();

        expect(callback).toHaveBeenCalled();
        expect(tutorial.isActive).toBe(false);
      });
    });
  });

  // ==========================================================================
  // Action Registration
  // ==========================================================================
  describe('registerAction()', () => {
    beforeEach(() => {
      tutorial.startTutorial('basics');
    });

    it('should do nothing when not active', () => {
      tutorial.skipTutorial();
      tutorial.registerAction(TutorialActions.CLICK);

      // Should not throw
    });

    it('should complete CLICK step on click action', () => {
      // First step is 'welcome' which requires CLICK
      expect(tutorial.currentStep.action).toBe(TutorialActions.CLICK);

      tutorial.registerAction(TutorialActions.CLICK);

      // Should advance to next step
      expect(tutorial.currentStep.id).toBe('look_around');
    });

    it('should track mouse movement for LOOK action', () => {
      // Advance to look_around step
      tutorial.nextStep();
      expect(tutorial.currentStep.action).toBe(TutorialActions.LOOK);

      // Not enough movement
      tutorial.registerAction(TutorialActions.LOOK, { distance: 50 });
      expect(tutorial.currentStep.id).toBe('look_around');

      // Enough movement
      tutorial.registerAction(TutorialActions.LOOK, { distance: 60 });
      expect(tutorial.currentStep.id).toBe('movement');
    });

    it('should track player movement for MOVE action', () => {
      // Advance to movement step
      tutorial.nextStep(); // look_around
      tutorial.nextStep(); // movement
      expect(tutorial.currentStep.action).toBe(TutorialActions.MOVE);

      tutorial.registerAction(TutorialActions.MOVE, { distance: 3 });
      expect(tutorial.currentStep.id).toBe('movement');

      tutorial.registerAction(TutorialActions.MOVE, { distance: 3 });
      expect(tutorial.currentStep.id).toBe('first_shot');
    });

    it('should track shots fired for SHOOT action', () => {
      // Advance to first_shot step
      tutorial.nextStep(); // look_around
      tutorial.nextStep(); // movement
      tutorial.nextStep(); // first_shot
      expect(tutorial.currentStep.action).toBe(TutorialActions.SHOOT);

      tutorial.registerAction(TutorialActions.SHOOT);
      expect(tutorial.currentStep.id).toBe('hit_target');
    });

    it('should track target hits for HIT_TARGET action', () => {
      // Advance to hit_target step
      for (let i = 0; i < 4; i++) tutorial.nextStep();
      expect(tutorial.currentStep.action).toBe(TutorialActions.HIT_TARGET);

      tutorial.registerAction(TutorialActions.HIT_TARGET);
      expect(tutorial.currentStep.id).toBe('multiple_targets');
    });

    it('should track consecutive hits for HIT_STREAK action', () => {
      // Advance to multiple_targets step
      for (let i = 0; i < 5; i++) tutorial.nextStep();
      expect(tutorial.currentStep.action).toBe(TutorialActions.HIT_STREAK);

      // Need 3 consecutive hits
      tutorial.registerAction(TutorialActions.HIT_TARGET);
      tutorial.registerAction(TutorialActions.HIT_TARGET);
      expect(tutorial.currentStep.id).toBe('multiple_targets');

      tutorial.registerAction(TutorialActions.HIT_TARGET);
      expect(tutorial.currentStep.id).toBe('reload');
    });

    it('should complete RELOAD action', () => {
      // Advance to reload step
      for (let i = 0; i < 6; i++) tutorial.nextStep();
      expect(tutorial.currentStep.action).toBe(TutorialActions.RELOAD);

      tutorial.registerAction(TutorialActions.RELOAD);
      expect(tutorial.currentStep.id).toBe('pause');
    });

    it('should complete PAUSE action', () => {
      // Advance to pause step
      for (let i = 0; i < 7; i++) tutorial.nextStep();
      expect(tutorial.currentStep.action).toBe(TutorialActions.PAUSE);

      tutorial.registerAction(TutorialActions.PAUSE);
      expect(tutorial.currentStep.id).toBe('complete');
    });
  });

  // ==========================================================================
  // Progress Tracking
  // ==========================================================================
  describe('progress tracking', () => {
    it('should return progress object during tutorial', () => {
      tutorial.startTutorial('basics');

      const progress = tutorial.progress;
      expect(progress.tutorialId).toBe('basics');
      expect(progress.currentStep).toBe(0);
      expect(progress.totalSteps).toBe(Tutorials.BASICS.steps.length);
      expect(progress.isComplete).toBe(false);
    });

    it('should save completion to localStorage', () => {
      tutorial.startTutorial('basics');

      // Complete all steps
      for (let i = 0; i < Tutorials.BASICS.steps.length; i++) {
        tutorial.nextStep();
      }

      expect(localStorageMock.setItem).toHaveBeenCalled();
      const saved = JSON.parse(localStorageMock.setItem.mock.calls.at(-1)[1]);
      expect(saved.completed).toContain('basics');
    });

    it('should track step stats', () => {
      tutorial.startTutorial('basics');

      // Wait a bit then advance
      tutorial.nextStep();

      const progress = tutorial.progress;
      expect(progress.stepStats.welcome).toBeDefined();
      expect(progress.stepStats.welcome.timeSpent).toBeGreaterThanOrEqual(0);
    });

    it('should return completed tutorials', () => {
      localStorageMock.setItem('tutorial_progress', JSON.stringify({
        completed: ['basics', 'advanced'],
      }));

      const newTutorial = new TutorialSystem();
      const completed = newTutorial.getCompletedTutorials();

      expect(completed).toContain('basics');
      expect(completed).toContain('advanced');
    });
  });

  // ==========================================================================
  // Tutorial Availability
  // ==========================================================================
  describe('isTutorialAvailable()', () => {
    it('should return true for basics (no prerequisites)', () => {
      expect(tutorial.isTutorialAvailable('basics')).toBe(true);
    });

    it('should return false for advanced without basics', () => {
      expect(tutorial.isTutorialAvailable('advanced')).toBe(false);
    });

    it('should return true for advanced after basics completed', () => {
      localStorageMock.setItem('tutorial_progress', JSON.stringify({
        completed: ['basics'],
      }));

      const newTutorial = new TutorialSystem();
      expect(newTutorial.isTutorialAvailable('advanced')).toBe(true);
    });

    it('should return false for unknown tutorial', () => {
      expect(tutorial.isTutorialAvailable('nonexistent')).toBe(false);
    });
  });

  // ==========================================================================
  // Practice Mode
  // ==========================================================================
  describe('practice mode', () => {
    describe('startPracticeMode()', () => {
      it('should start practice mode', () => {
        tutorial.startPracticeMode();

        expect(tutorial.isPracticeMode).toBe(true);
      });

      it('should emit practice:started event', () => {
        const callback = vi.fn();
        tutorial.on('practice:started', callback);

        tutorial.startPracticeMode();

        expect(callback).toHaveBeenCalled();
        expect(callback.mock.calls[0][0].config).toMatchObject(PracticeConfig);
      });

      it('should accept custom options', () => {
        const callback = vi.fn();
        tutorial.on('practice:started', callback);

        tutorial.startPracticeMode({ infiniteAmmo: false });

        expect(callback.mock.calls[0][0].config.infiniteAmmo).toBe(false);
      });
    });

    describe('endPracticeMode()', () => {
      it('should end practice mode', () => {
        tutorial.startPracticeMode();
        tutorial.endPracticeMode();

        expect(tutorial.isPracticeMode).toBe(false);
      });

      it('should emit practice:ended event', () => {
        const callback = vi.fn();
        tutorial.on('practice:ended', callback);

        tutorial.startPracticeMode();
        tutorial.endPracticeMode();

        expect(callback).toHaveBeenCalled();
      });

      it('should do nothing if not in practice mode', () => {
        const callback = vi.fn();
        tutorial.on('practice:ended', callback);

        tutorial.endPracticeMode();

        expect(callback).not.toHaveBeenCalled();
      });
    });

    describe('getPracticeStats()', () => {
      it('should return practice statistics', () => {
        tutorial.startPracticeMode();

        // Simulate some actions
        tutorial.registerAction(TutorialActions.SHOOT);
        tutorial.registerAction(TutorialActions.SHOOT);
        tutorial.registerAction(TutorialActions.HIT_TARGET);

        const stats = tutorial.getPracticeStats();

        expect(stats.shotsFired).toBe(2);
        expect(stats.targetsHit).toBe(1);
        expect(stats.accuracy).toBe(50);
      });

      it('should handle zero shots', () => {
        tutorial.startPracticeMode();

        const stats = tutorial.getPracticeStats();

        expect(stats.accuracy).toBe(0);
      });
    });
  });

  // ==========================================================================
  // Progress Reset
  // ==========================================================================
  describe('resetProgress()', () => {
    it('should clear all progress', () => {
      localStorageMock.setItem('tutorial_progress', JSON.stringify({
        completed: ['basics'],
      }));

      const newTutorial = new TutorialSystem();
      newTutorial.resetProgress();

      expect(newTutorial.getCompletedTutorials()).toHaveLength(0);
    });

    it('should emit progress:reset event', () => {
      const callback = vi.fn();
      tutorial.on('progress:reset', callback);

      tutorial.resetProgress();

      expect(callback).toHaveBeenCalled();
    });
  });

  // ==========================================================================
  // Static Methods
  // ==========================================================================
  describe('static methods', () => {
    describe('getAvailableTutorials()', () => {
      it('should return all tutorials with metadata', () => {
        const tutorials = TutorialSystem.getAvailableTutorials();

        expect(tutorials.length).toBe(Object.keys(Tutorials).length);
        expect(tutorials[0]).toHaveProperty('id');
        expect(tutorials[0]).toHaveProperty('name');
        expect(tutorials[0]).toHaveProperty('description');
        expect(tutorials[0]).toHaveProperty('stepCount');
      });
    });
  });

  // ==========================================================================
  // Singleton
  // ==========================================================================
  describe('singleton', () => {
    afterEach(() => {
      resetTutorialSystem();
    });

    it('should return same instance', () => {
      const instance1 = getTutorialSystem();
      const instance2 = getTutorialSystem();

      expect(instance1).toBe(instance2);
    });

    it('should reset properly', () => {
      const instance1 = getTutorialSystem();
      instance1.startTutorial('basics');

      resetTutorialSystem();

      const instance2 = getTutorialSystem();
      expect(instance2).not.toBe(instance1);
      expect(instance2.isActive).toBe(false);
    });
  });

  // ==========================================================================
  // Edge Cases
  // ==========================================================================
  describe('edge cases', () => {
    it('should handle localStorage errors gracefully', () => {
      localStorageMock.getItem.mockImplementationOnce(() => {
        throw new Error('localStorage error');
      });

      // Should not throw
      const newTutorial = new TutorialSystem();
      expect(newTutorial.getCompletedTutorials()).toEqual([]);
    });

    it('should handle invalid localStorage data', () => {
      localStorageMock.getItem.mockReturnValueOnce('invalid json');

      // Should not throw
      const newTutorial = new TutorialSystem();
      expect(newTutorial.getCompletedTutorials()).toEqual([]);
    });

    it('should handle step callbacks', () => {
      // Create a tutorial with callbacks
      const onEnter = vi.fn();
      const onComplete = vi.fn();

      const customTutorial = {
        id: 'custom',
        name: 'Custom',
        description: 'Test',
        steps: [
          {
            id: 'step1',
            title: 'Step 1',
            instruction: 'Test',
            action: TutorialActions.CLICK,
            onEnter,
            onComplete,
          },
          {
            id: 'step2',
            title: 'Step 2',
            instruction: 'Test',
            action: TutorialActions.CLICK,
          },
        ],
      };

      // Add to tutorials temporarily
      Tutorials.CUSTOM = customTutorial;

      tutorial.startTutorial('custom');
      expect(onEnter).toHaveBeenCalled();

      tutorial.nextStep();
      expect(onComplete).toHaveBeenCalled();

      // Cleanup
      delete Tutorials.CUSTOM;
    });

    it('should reset action tracking between steps', () => {
      tutorial.startTutorial('basics');

      // Register some shots
      tutorial.registerAction(TutorialActions.SHOOT);
      tutorial.registerAction(TutorialActions.SHOOT);

      // Manually advance (simulating click)
      tutorial.nextStep();

      // Stats should be reset for new step
      const stats = tutorial.getPracticeStats();
      expect(stats.shotsFired).toBe(0);
    });
  });
});
