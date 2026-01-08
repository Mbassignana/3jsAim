/**
 * Unit tests for TargetTypes system
 * Tests target type definitions, factory, and behavior management
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  TargetTypes,
  DEFAULT_TARGET_TYPE,
  MovementPatterns,
  TargetFactory,
  TargetBehaviorManager,
  getTargetBehaviorManager,
  resetTargetBehaviorManager,
} from '@game/TargetTypes.js';

describe('TargetTypes', () => {
  // ==========================================================================
  // Target Type Definitions
  // ==========================================================================
  describe('Target Type Definitions', () => {
    it('should define all 8 target types', () => {
      expect(Object.keys(TargetTypes)).toHaveLength(8);
      expect(TargetTypes.STANDARD).toBeDefined();
      expect(TargetTypes.MOVING).toBeDefined();
      expect(TargetTypes.SHRINKING).toBeDefined();
      expect(TargetTypes.BONUS).toBeDefined();
      expect(TargetTypes.SPLIT).toBeDefined();
      expect(TargetTypes.ARMORED).toBeDefined();
      expect(TargetTypes.GHOST).toBeDefined();
      expect(TargetTypes.STREAK).toBeDefined();
    });

    it('should have required properties for each type', () => {
      for (const type of Object.values(TargetTypes)) {
        expect(type.id).toBeDefined();
        expect(type.name).toBeDefined();
        expect(type.description).toBeDefined();
        expect(type.basePoints).toBeGreaterThan(0);
        expect(type.baseRadius).toBeGreaterThan(0);
        expect(type.baseHealth).toBeGreaterThanOrEqual(1);
        expect(type.color).toBeDefined();
        expect(type.behavior).toBeDefined();
        expect(type.behavior.type).toBeDefined();
      }
    });

    it('should set STANDARD as default target type', () => {
      expect(DEFAULT_TARGET_TYPE).toBe(TargetTypes.STANDARD);
    });

    describe('STANDARD target', () => {
      it('should have static behavior', () => {
        expect(TargetTypes.STANDARD.behavior.type).toBe('static');
      });

      it('should have base stats', () => {
        expect(TargetTypes.STANDARD.basePoints).toBe(10);
        expect(TargetTypes.STANDARD.baseRadius).toBe(1.0);
        expect(TargetTypes.STANDARD.baseHealth).toBe(1);
      });
    });

    describe('MOVING target', () => {
      it('should have moving behavior with pattern config', () => {
        expect(TargetTypes.MOVING.behavior.type).toBe('moving');
        expect(TargetTypes.MOVING.behavior.speed).toBeGreaterThan(0);
        expect(TargetTypes.MOVING.behavior.pattern).toBeDefined();
        expect(TargetTypes.MOVING.behavior.amplitude).toBeGreaterThan(0);
      });

      it('should be worth more than standard', () => {
        expect(TargetTypes.MOVING.basePoints).toBeGreaterThan(TargetTypes.STANDARD.basePoints);
      });
    });

    describe('SHRINKING target', () => {
      it('should have shrinking behavior with shrink rate', () => {
        expect(TargetTypes.SHRINKING.behavior.type).toBe('shrinking');
        expect(TargetTypes.SHRINKING.behavior.shrinkRate).toBeGreaterThan(0);
        expect(TargetTypes.SHRINKING.behavior.minRadius).toBeGreaterThan(0);
        expect(TargetTypes.SHRINKING.behavior.bonusMultiplier).toBeGreaterThan(1);
      });

      it('should start larger than standard', () => {
        expect(TargetTypes.SHRINKING.baseRadius).toBeGreaterThan(TargetTypes.STANDARD.baseRadius);
      });
    });

    describe('BONUS target', () => {
      it('should have bonus behavior with lifetime', () => {
        expect(TargetTypes.BONUS.behavior.type).toBe('bonus');
        expect(TargetTypes.BONUS.behavior.lifetime).toBeGreaterThan(0);
        expect(TargetTypes.BONUS.behavior.flashRate).toBeGreaterThan(0);
        expect(TargetTypes.BONUS.behavior.flashThreshold).toBeGreaterThan(0);
      });

      it('should be worth the most points', () => {
        expect(TargetTypes.BONUS.basePoints).toBe(50);
      });

      it('should have secondary color for effects', () => {
        expect(TargetTypes.BONUS.secondaryColor).toBeDefined();
      });
    });

    describe('SPLIT target', () => {
      it('should have split behavior config', () => {
        expect(TargetTypes.SPLIT.behavior.type).toBe('split');
        expect(TargetTypes.SPLIT.behavior.splitCount).toBeGreaterThan(1);
        expect(TargetTypes.SPLIT.behavior.childScale).toBeGreaterThan(0);
        expect(TargetTypes.SPLIT.behavior.childScale).toBeLessThan(1);
        expect(TargetTypes.SPLIT.behavior.maxSplitDepth).toBeGreaterThanOrEqual(1);
      });
    });

    describe('ARMORED target', () => {
      it('should have multiple health', () => {
        expect(TargetTypes.ARMORED.baseHealth).toBeGreaterThan(1);
      });

      it('should have armored behavior', () => {
        expect(TargetTypes.ARMORED.behavior.type).toBe('armored');
        expect(TargetTypes.ARMORED.behavior.damageFlash).toBeGreaterThan(0);
      });
    });

    describe('GHOST target', () => {
      it('should have ghost behavior with visibility cycle', () => {
        expect(TargetTypes.GHOST.behavior.type).toBe('ghost');
        expect(TargetTypes.GHOST.behavior.visibleDuration).toBeGreaterThan(0);
        expect(TargetTypes.GHOST.behavior.invisibleDuration).toBeGreaterThan(0);
        expect(TargetTypes.GHOST.behavior.fadeTime).toBeGreaterThan(0);
        expect(typeof TargetTypes.GHOST.behavior.canHitWhileInvisible).toBe('boolean');
      });
    });

    describe('STREAK target', () => {
      it('should have streak behavior with high speed', () => {
        expect(TargetTypes.STREAK.behavior.type).toBe('streak');
        expect(TargetTypes.STREAK.behavior.speed).toBeGreaterThan(TargetTypes.MOVING.behavior.speed);
        expect(TargetTypes.STREAK.behavior.trailLength).toBeGreaterThan(0);
      });

      it('should be smaller than standard', () => {
        expect(TargetTypes.STREAK.baseRadius).toBeLessThan(TargetTypes.STANDARD.baseRadius);
      });
    });
  });

  // ==========================================================================
  // Movement Patterns
  // ==========================================================================
  describe('MovementPatterns', () => {
    const startPos = { x: 0, y: 0, z: 0 };
    const config = { speed: 1, amplitude: 5, frequency: 1 };

    describe('linear pattern', () => {
      it('should oscillate back and forth on x-axis', () => {
        const pos1 = MovementPatterns.linear(0, config, startPos);
        const pos2 = MovementPatterns.linear(0.25, config, startPos);
        const pos3 = MovementPatterns.linear(0.5, config, startPos);

        expect(pos1.x).toBeCloseTo(0, 1);
        expect(pos2.x).toBeCloseTo(config.amplitude, 1);
        expect(pos3.x).toBeCloseTo(0, 1);

        // Y and Z should stay at start
        expect(pos1.y).toBe(startPos.y);
        expect(pos1.z).toBe(startPos.z);
      });
    });

    describe('sine pattern', () => {
      it('should move forward while oscillating vertically', () => {
        const pos1 = MovementPatterns.sine(0, config, startPos);
        const pos2 = MovementPatterns.sine(1, config, startPos);

        expect(pos2.x).toBeGreaterThan(pos1.x); // Moving forward
        expect(pos1.z).toBe(startPos.z);
      });
    });

    describe('circular pattern', () => {
      it('should move in a circle', () => {
        const pos0 = MovementPatterns.circular(0, config, startPos);
        const pos25 = MovementPatterns.circular(0.25, config, startPos);
        const pos50 = MovementPatterns.circular(0.5, config, startPos);
        const pos75 = MovementPatterns.circular(0.75, config, startPos);

        // At time 0, should be at (amplitude, 0)
        expect(pos0.x).toBeCloseTo(config.amplitude, 1);
        expect(pos0.y).toBeCloseTo(0, 1);

        // At time 0.25 (quarter turn), should be at (0, amplitude)
        expect(pos25.x).toBeCloseTo(0, 1);
        expect(pos25.y).toBeCloseTo(config.amplitude, 1);

        // At time 0.5 (half turn), should be at (-amplitude, 0)
        expect(pos50.x).toBeCloseTo(-config.amplitude, 1);
        expect(pos50.y).toBeCloseTo(0, 1);
      });
    });

    describe('random pattern', () => {
      it('should update position based on direction', () => {
        const state = {};
        const pos1 = MovementPatterns.random(0, config, startPos, state);
        const pos2 = MovementPatterns.random(0.016, config, startPos, state);

        // Should have set direction
        expect(state.direction).toBeDefined();
        expect(state.direction.x).toBeDefined();
        expect(state.direction.y).toBeDefined();
      });

      it('should change direction periodically', () => {
        const state = { lastDirectionChange: 0 };
        MovementPatterns.random(0, config, startPos, state);
        const dir1 = { ...state.direction };

        MovementPatterns.random(2, config, startPos, state); // After 2 seconds
        // Direction should have changed
        expect(state.lastDirectionChange).toBeGreaterThan(0);
      });
    });
  });

  // ==========================================================================
  // TargetFactory
  // ==========================================================================
  describe('TargetFactory', () => {
    beforeEach(() => {
      TargetFactory.resetIdCounter();
    });

    describe('create()', () => {
      it('should create target with unique ID', () => {
        const target1 = TargetFactory.create('standard', { x: 0, y: 0, z: 0 });
        const target2 = TargetFactory.create('standard', { x: 1, y: 0, z: 0 });

        expect(target1.id).toBe('target_1');
        expect(target2.id).toBe('target_2');
      });

      it('should create target by type string (lowercase)', () => {
        const target = TargetFactory.create('moving', { x: 0, y: 0, z: 0 });

        expect(target.typeId).toBe('moving');
        expect(target.config).toBe(TargetTypes.MOVING);
      });

      it('should create target by type string (uppercase)', () => {
        const target = TargetFactory.create('SHRINKING', { x: 0, y: 0, z: 0 });

        expect(target.typeId).toBe('shrinking');
      });

      it('should create target from config object', () => {
        const target = TargetFactory.create(TargetTypes.BONUS, { x: 5, y: 10, z: 0 });

        expect(target.typeId).toBe('bonus');
        expect(target.position).toEqual({ x: 5, y: 10, z: 0 });
      });

      it('should throw for unknown type', () => {
        expect(() => TargetFactory.create('nonexistent', { x: 0, y: 0, z: 0 }))
          .toThrow('Unknown target type: nonexistent');
      });

      it('should set correct initial properties', () => {
        const target = TargetFactory.create('armored', { x: 1, y: 2, z: 3 });

        expect(target.position).toEqual({ x: 1, y: 2, z: 3 });
        expect(target.startPosition).toEqual({ x: 1, y: 2, z: 3 });
        expect(target.radius).toBe(TargetTypes.ARMORED.baseRadius);
        expect(target.health).toBe(TargetTypes.ARMORED.baseHealth);
        expect(target.maxHealth).toBe(TargetTypes.ARMORED.baseHealth);
        expect(target.points).toBe(TargetTypes.ARMORED.basePoints);
        expect(target.isActive).toBe(true);
        expect(target.createdAt).toBeDefined();
      });

      it('should allow custom options', () => {
        const target = TargetFactory.create('standard', { x: 0, y: 0, z: 0 }, {
          radius: 2.0,
          health: 5,
          points: 100,
        });

        expect(target.radius).toBe(2.0);
        expect(target.health).toBe(5);
        expect(target.points).toBe(100);
      });

      it('should initialize behavior state for moving target', () => {
        const target = TargetFactory.create('moving', { x: 0, y: 0, z: 0 });

        expect(target.behaviorState.pattern).toBe('linear');
        expect(target.behaviorState.elapsedTime).toBe(0);
      });

      it('should initialize behavior state for ghost target', () => {
        const target = TargetFactory.create('ghost', { x: 0, y: 0, z: 0 });

        expect(target.behaviorState.opacity).toBe(1.0);
        expect(target.behaviorState.isVisible).toBe(true);
        expect(target.behaviorState.phaseTime).toBe(0);
      });

      it('should initialize behavior state for streak target with direction', () => {
        const target = TargetFactory.create('streak', { x: 0, y: 0, z: 0 });

        expect(target.behaviorState.direction).toBeDefined();
        expect(target.behaviorState.trail).toEqual([]);

        // Direction should be normalized
        const dir = target.behaviorState.direction;
        const mag = Math.sqrt(dir.x ** 2 + dir.y ** 2 + dir.z ** 2);
        expect(mag).toBeCloseTo(1.0, 2);
      });
    });

    describe('createMultiple()', () => {
      it('should create multiple targets', () => {
        const positions = [
          { x: 0, y: 0, z: 0 },
          { x: 1, y: 0, z: 0 },
          { x: 2, y: 0, z: 0 },
        ];

        const targets = TargetFactory.createMultiple('standard', positions);

        expect(targets).toHaveLength(3);
        expect(targets[0].position).toEqual(positions[0]);
        expect(targets[1].position).toEqual(positions[1]);
        expect(targets[2].position).toEqual(positions[2]);
      });
    });

    describe('createSplitChildren()', () => {
      it('should create child targets from split parent', () => {
        const parent = TargetFactory.create('split', { x: 5, y: 5, z: 0 });
        const children = TargetFactory.createSplitChildren(parent);

        expect(children).toHaveLength(TargetTypes.SPLIT.behavior.splitCount);

        for (const child of children) {
          expect(child.radius).toBe(parent.radius * TargetTypes.SPLIT.behavior.childScale);
          expect(child.points).toBe(TargetTypes.SPLIT.behavior.childPoints);
          expect(child.behaviorState.isChild).toBe(true);
          expect(child.behaviorState.splitDepth).toBe(1);
          expect(child.behaviorState.velocity).toBeDefined();
        }
      });

      it('should not create children at max depth', () => {
        const parent = TargetFactory.create('split', { x: 0, y: 0, z: 0 });
        parent.behaviorState.splitDepth = TargetTypes.SPLIT.behavior.maxSplitDepth;

        const children = TargetFactory.createSplitChildren(parent);

        expect(children).toHaveLength(0);
      });

      it('should increment split depth for children', () => {
        const parent = TargetFactory.create('split', { x: 0, y: 0, z: 0 });
        parent.behaviorState.splitDepth = 1;

        const children = TargetFactory.createSplitChildren(parent);

        expect(children[0].behaviorState.splitDepth).toBe(2);
      });
    });
  });

  // ==========================================================================
  // TargetBehaviorManager
  // ==========================================================================
  describe('TargetBehaviorManager', () => {
    let manager;

    beforeEach(() => {
      TargetFactory.resetIdCounter();
      manager = new TargetBehaviorManager();
    });

    describe('target management', () => {
      it('should add and retrieve targets', () => {
        const target = TargetFactory.create('standard', { x: 0, y: 0, z: 0 });
        manager.addTarget(target);

        expect(manager.getTarget(target.id)).toBe(target);
        expect(manager.count).toBe(1);
      });

      it('should emit event on target add', () => {
        const callback = vi.fn();
        manager.on('target:added', callback);

        const target = TargetFactory.create('standard', { x: 0, y: 0, z: 0 });
        manager.addTarget(target);

        expect(callback).toHaveBeenCalledWith({ target });
      });

      it('should remove targets', () => {
        const target = TargetFactory.create('standard', { x: 0, y: 0, z: 0 });
        manager.addTarget(target);
        manager.removeTarget(target.id);

        expect(manager.getTarget(target.id)).toBeUndefined();
        expect(manager.count).toBe(0);
      });

      it('should emit event on target remove', () => {
        const callback = vi.fn();
        manager.on('target:removed', callback);

        const target = TargetFactory.create('standard', { x: 0, y: 0, z: 0 });
        manager.addTarget(target);
        manager.removeTarget(target.id);

        expect(callback).toHaveBeenCalledWith({ target });
      });

      it('should get active targets only', () => {
        const target1 = TargetFactory.create('standard', { x: 0, y: 0, z: 0 });
        const target2 = TargetFactory.create('standard', { x: 1, y: 0, z: 0 });
        target2.isActive = false;

        manager.addTarget(target1);
        manager.addTarget(target2);

        const active = manager.getActiveTargets();
        expect(active).toHaveLength(1);
        expect(active[0]).toBe(target1);
      });

      it('should get targets by type', () => {
        const standard = TargetFactory.create('standard', { x: 0, y: 0, z: 0 });
        const moving = TargetFactory.create('moving', { x: 1, y: 0, z: 0 });

        manager.addTarget(standard);
        manager.addTarget(moving);

        const movingTargets = manager.getTargetsByType('moving');
        expect(movingTargets).toHaveLength(1);
        expect(movingTargets[0]).toBe(moving);
      });

      it('should clear all targets', () => {
        manager.addTarget(TargetFactory.create('standard', { x: 0, y: 0, z: 0 }));
        manager.addTarget(TargetFactory.create('moving', { x: 1, y: 0, z: 0 }));

        manager.clear();

        expect(manager.count).toBe(0);
      });
    });

    describe('update() - static targets', () => {
      it('should not move static targets', () => {
        const target = TargetFactory.create('standard', { x: 5, y: 5, z: 0 });
        manager.addTarget(target);

        manager.update(1.0);

        expect(target.position).toEqual({ x: 5, y: 5, z: 0 });
      });
    });

    describe('update() - moving targets', () => {
      it('should update position based on pattern', () => {
        const target = TargetFactory.create('moving', { x: 0, y: 0, z: 0 });
        manager.addTarget(target);

        manager.update(0.25); // Quarter cycle

        expect(target.position.x).not.toBe(0);
      });

      it('should track elapsed time', () => {
        const target = TargetFactory.create('moving', { x: 0, y: 0, z: 0 });
        manager.addTarget(target);

        manager.update(0.5);
        manager.update(0.5);

        expect(target.behaviorState.elapsedTime).toBeCloseTo(1.0, 2);
      });
    });

    describe('update() - shrinking targets', () => {
      it('should reduce radius over time', () => {
        const target = TargetFactory.create('shrinking', { x: 0, y: 0, z: 0 });
        const initialRadius = target.radius;
        manager.addTarget(target);

        manager.update(1.0);

        expect(target.radius).toBeLessThan(initialRadius);
      });

      it('should remove target when too small', () => {
        const target = TargetFactory.create('shrinking', { x: 0, y: 0, z: 0 });
        manager.addTarget(target);

        const callback = vi.fn();
        manager.on('target:expired', callback);

        // Update until target shrinks past minimum
        const shrinkTime = (target.radius - TargetTypes.SHRINKING.behavior.minRadius) /
          TargetTypes.SHRINKING.behavior.shrinkRate + 0.1;
        manager.update(shrinkTime);

        expect(callback).toHaveBeenCalled();
        expect(manager.count).toBe(0);
      });
    });

    describe('update() - bonus targets', () => {
      it('should remove after lifetime expires', () => {
        const target = TargetFactory.create('bonus', { x: 0, y: 0, z: 0 });
        manager.addTarget(target);

        const callback = vi.fn();
        manager.on('target:expired', callback);

        manager.update(TargetTypes.BONUS.behavior.lifetime + 0.1);

        expect(callback).toHaveBeenCalled();
        expect(manager.count).toBe(0);
      });

      it('should start flashing near expiration', () => {
        const target = TargetFactory.create('bonus', { x: 0, y: 0, z: 0 });
        manager.addTarget(target);

        // Update to just before flash threshold
        const flashTime = TargetTypes.BONUS.behavior.lifetime -
          TargetTypes.BONUS.behavior.flashThreshold + 0.1;
        manager.update(flashTime);

        expect(target.behaviorState.isFlashing).toBe(true);
      });
    });

    describe('update() - split targets', () => {
      it('should apply velocity to child targets', () => {
        const parent = TargetFactory.create('split', { x: 0, y: 0, z: 0 });
        const children = TargetFactory.createSplitChildren(parent);

        for (const child of children) {
          manager.addTarget(child);
        }

        const initialPositions = children.map((c) => ({ ...c.position }));
        manager.update(0.5);

        // Children should have moved
        for (let i = 0; i < children.length; i++) {
          const moved = children[i].position.x !== initialPositions[i].x ||
            children[i].position.y !== initialPositions[i].y;
          expect(moved).toBe(true);
        }
      });
    });

    describe('update() - ghost targets', () => {
      it('should cycle visibility', () => {
        const target = TargetFactory.create('ghost', { x: 0, y: 0, z: 0 });
        manager.addTarget(target);

        // Start visible
        expect(target.behaviorState.isVisible).toBe(true);

        // Update past visible duration + fade
        const visibleEnd = TargetTypes.GHOST.behavior.visibleDuration + 0.1;
        manager.update(visibleEnd);

        expect(target.behaviorState.isVisible).toBe(false);
        expect(target.behaviorState.opacity).toBe(0);
      });

      it('should fade in and out', () => {
        const target = TargetFactory.create('ghost', { x: 0, y: 0, z: 0 });
        manager.addTarget(target);

        // During fade in (just started)
        manager.update(0.1);
        const fadeInOpacity = target.behaviorState.opacity;

        // Should be partially visible during fade
        expect(fadeInOpacity).toBeGreaterThan(0);
        expect(fadeInOpacity).toBeLessThanOrEqual(1);
      });
    });

    describe('update() - streak targets', () => {
      it('should move fast in direction', () => {
        const target = TargetFactory.create('streak', { x: 0, y: 0, z: 0 });
        manager.addTarget(target);

        const initialPos = { ...target.position };
        manager.update(0.5);

        // Should have moved significantly
        const distance = Math.sqrt(
          (target.position.x - initialPos.x) ** 2 +
          (target.position.y - initialPos.y) ** 2,
        );
        expect(distance).toBeGreaterThan(0);
      });

      it('should build trail', () => {
        const target = TargetFactory.create('streak', { x: 0, y: 0, z: 0 });
        manager.addTarget(target);

        manager.update(0.1);
        manager.update(0.1);
        manager.update(0.1);

        expect(target.behaviorState.trail.length).toBeGreaterThan(0);
      });

      it('should limit trail length', () => {
        const target = TargetFactory.create('streak', { x: 0, y: 0, z: 0 });
        manager.addTarget(target);

        // Update many times
        for (let i = 0; i < 20; i++) {
          manager.update(0.1);
        }

        expect(target.behaviorState.trail.length).toBeLessThanOrEqual(
          TargetTypes.STREAK.behavior.trailLength,
        );
      });
    });

    describe('update() - armored targets', () => {
      it('should clear flash state after duration', () => {
        const target = TargetFactory.create('armored', { x: 0, y: 0, z: 0 });
        manager.addTarget(target);

        // Simulate a hit
        target.behaviorState.isFlashing = true;
        target.behaviorState.flashEndTime = 0.2;

        manager.update(0.3);

        expect(target.behaviorState.isFlashing).toBe(false);
      });
    });

    describe('processHit()', () => {
      it('should return no effect for non-existent target', () => {
        const result = manager.processHit('nonexistent');

        expect(result.destroyed).toBe(false);
        expect(result.points).toBe(0);
      });

      it('should return no effect for inactive target', () => {
        const target = TargetFactory.create('standard', { x: 0, y: 0, z: 0 });
        target.isActive = false;
        manager.addTarget(target);

        const result = manager.processHit(target.id);

        expect(result.destroyed).toBe(false);
        expect(result.points).toBe(0);
      });

      it('should destroy standard target in one hit', () => {
        const target = TargetFactory.create('standard', { x: 0, y: 0, z: 0 });
        manager.addTarget(target);

        const callback = vi.fn();
        manager.on('target:destroyed', callback);

        const result = manager.processHit(target.id);

        expect(result.destroyed).toBe(true);
        expect(result.points).toBe(TargetTypes.STANDARD.basePoints);
        expect(callback).toHaveBeenCalled();
      });

      it('should damage but not destroy armored target', () => {
        const target = TargetFactory.create('armored', { x: 0, y: 0, z: 0 });
        manager.addTarget(target);

        const callback = vi.fn();
        manager.on('target:damaged', callback);

        const result = manager.processHit(target.id);

        expect(result.destroyed).toBe(false);
        expect(target.health).toBe(TargetTypes.ARMORED.baseHealth - 1);
        expect(callback).toHaveBeenCalledWith({
          target,
          remainingHealth: TargetTypes.ARMORED.baseHealth - 1,
        });
      });

      it('should destroy armored target after multiple hits', () => {
        const target = TargetFactory.create('armored', { x: 0, y: 0, z: 0 });
        manager.addTarget(target);

        for (let i = 0; i < TargetTypes.ARMORED.baseHealth - 1; i++) {
          manager.processHit(target.id);
        }

        const result = manager.processHit(target.id);

        expect(result.destroyed).toBe(true);
        expect(result.points).toBe(TargetTypes.ARMORED.basePoints);
      });

      it('should apply custom damage', () => {
        const target = TargetFactory.create('armored', { x: 0, y: 0, z: 0 });
        manager.addTarget(target);

        manager.processHit(target.id, { damage: 2 });

        expect(target.health).toBe(TargetTypes.ARMORED.baseHealth - 2);
      });

      it('should trigger flash on armored hit', () => {
        const target = TargetFactory.create('armored', { x: 0, y: 0, z: 0 });
        manager.addTarget(target);

        manager.processHit(target.id);

        expect(target.behaviorState.isFlashing).toBe(true);
      });

      it('should create children when split target destroyed', () => {
        const target = TargetFactory.create('split', { x: 0, y: 0, z: 0 });
        manager.addTarget(target);

        const result = manager.processHit(target.id);

        expect(result.destroyed).toBe(true);
        expect(result.newTargets).toHaveLength(TargetTypes.SPLIT.behavior.splitCount);
        expect(manager.count).toBe(TargetTypes.SPLIT.behavior.splitCount);
      });

      it('should give bonus points for small shrinking target', () => {
        const target = TargetFactory.create('shrinking', { x: 0, y: 0, z: 0 });
        manager.addTarget(target);

        // Shrink target to less than half size
        target.radius = target.config.baseRadius * 0.4;

        const result = manager.processHit(target.id);

        const expectedPoints = Math.round(
          TargetTypes.SHRINKING.basePoints * TargetTypes.SHRINKING.behavior.bonusMultiplier,
        );
        expect(result.points).toBe(expectedPoints);
      });

      it('should not hit invisible ghost target by default', () => {
        const target = TargetFactory.create('ghost', { x: 0, y: 0, z: 0 });
        target.behaviorState.isVisible = false;
        manager.addTarget(target);

        const result = manager.processHit(target.id);

        expect(result.destroyed).toBe(false);
        expect(result.points).toBe(0);
      });

      it('should hit ghost target when visible', () => {
        const target = TargetFactory.create('ghost', { x: 0, y: 0, z: 0 });
        target.behaviorState.isVisible = true;
        manager.addTarget(target);

        const result = manager.processHit(target.id);

        expect(result.destroyed).toBe(true);
        expect(result.points).toBe(TargetTypes.GHOST.basePoints);
      });
    });
  });

  // ==========================================================================
  // Singleton Functions
  // ==========================================================================
  describe('Singleton Functions', () => {
    afterEach(() => {
      resetTargetBehaviorManager();
    });

    it('should return singleton instance', () => {
      const instance1 = getTargetBehaviorManager();
      const instance2 = getTargetBehaviorManager();

      expect(instance1).toBe(instance2);
    });

    it('should reset singleton properly', () => {
      const instance1 = getTargetBehaviorManager();
      instance1.addTarget(TargetFactory.create('standard', { x: 0, y: 0, z: 0 }));

      resetTargetBehaviorManager();

      const instance2 = getTargetBehaviorManager();
      expect(instance2).not.toBe(instance1);
      expect(instance2.count).toBe(0);
    });
  });
});
