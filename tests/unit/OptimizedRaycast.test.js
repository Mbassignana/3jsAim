/**
 * Tests for OptimizedRaycast - Raycasting with spatial partitioning
 */

import { describe, it, expect, beforeEach } from 'vitest';

import {
  createBoundsFromCircle,
  createRayBounds,
  boundsIntersect,
  pointInBounds,
  rayCircleIntersection,
  isInCone,
  OptimizedRaycaster,
  OptimizedCanvas2DRaycastStrategy,
  createOptimizedRaycaster,
  createOptimizedCanvas2DStrategy,
} from '@/utils/OptimizedRaycast.js';

describe('OptimizedRaycast', () => {
  // ==========================================================================
  // Bounding Box Utilities
  // ==========================================================================

  describe('createBoundsFromCircle', () => {
    it('should create bounds from center and radius', () => {
      const bounds = createBoundsFromCircle(10, 20, 5);
      expect(bounds).toEqual({
        minX: 5,
        minY: 15,
        maxX: 15,
        maxY: 25,
      });
    });

    it('should handle zero radius', () => {
      const bounds = createBoundsFromCircle(10, 20, 0);
      expect(bounds).toEqual({
        minX: 10,
        minY: 20,
        maxX: 10,
        maxY: 20,
      });
    });

    it('should handle negative coordinates', () => {
      const bounds = createBoundsFromCircle(-10, -20, 5);
      expect(bounds).toEqual({
        minX: -15,
        minY: -25,
        maxX: -5,
        maxY: -15,
      });
    });
  });

  describe('createRayBounds', () => {
    it('should create bounds for ray pointing right', () => {
      const bounds = createRayBounds({
        x: 0,
        y: 0,
        angle: 0,
        maxRange: 100,
      });
      expect(bounds.minX).toBe(0);
      expect(bounds.minY).toBe(0);
      expect(bounds.maxX).toBe(100);
      expect(bounds.maxY).toBe(0);
    });

    it('should create bounds for ray pointing up', () => {
      const bounds = createRayBounds({
        x: 0,
        y: 0,
        angle: Math.PI / 2,
        maxRange: 100,
      });
      expect(bounds.minX).toBeCloseTo(0, 5);
      expect(bounds.maxX).toBeCloseTo(0, 5);
      expect(bounds.minY).toBe(0);
      expect(bounds.maxY).toBeCloseTo(100, 5);
    });

    it('should create bounds for ray pointing diagonally', () => {
      const bounds = createRayBounds({
        x: 0,
        y: 0,
        angle: Math.PI / 4,
        maxRange: 100,
      });
      // At 45 degrees, x and y components are equal
      const expected = 100 * Math.cos(Math.PI / 4);
      expect(bounds.maxX).toBeCloseTo(expected, 5);
      expect(bounds.maxY).toBeCloseTo(expected, 5);
    });

    it('should expand bounds for cone angle', () => {
      const narrowBounds = createRayBounds({
        x: 0,
        y: 0,
        angle: 0,
        maxRange: 100,
        coneAngle: 0,
      });

      const wideBounds = createRayBounds({
        x: 0,
        y: 0,
        angle: 0,
        maxRange: 100,
        coneAngle: Math.PI / 4,
      });

      // Wide cone should have larger y bounds
      expect(wideBounds.maxY).toBeGreaterThan(narrowBounds.maxY);
      expect(wideBounds.minY).toBeLessThan(narrowBounds.minY);
    });
  });

  describe('boundsIntersect', () => {
    it('should detect overlapping bounds', () => {
      const a = { minX: 0, minY: 0, maxX: 10, maxY: 10 };
      const b = { minX: 5, minY: 5, maxX: 15, maxY: 15 };
      expect(boundsIntersect(a, b)).toBe(true);
    });

    it('should detect non-overlapping bounds', () => {
      const a = { minX: 0, minY: 0, maxX: 10, maxY: 10 };
      const b = { minX: 20, minY: 20, maxX: 30, maxY: 30 };
      expect(boundsIntersect(a, b)).toBe(false);
    });

    it('should detect touching bounds', () => {
      const a = { minX: 0, minY: 0, maxX: 10, maxY: 10 };
      const b = { minX: 10, minY: 0, maxX: 20, maxY: 10 };
      expect(boundsIntersect(a, b)).toBe(true);
    });

    it('should detect contained bounds', () => {
      const a = { minX: 0, minY: 0, maxX: 20, maxY: 20 };
      const b = { minX: 5, minY: 5, maxX: 15, maxY: 15 };
      expect(boundsIntersect(a, b)).toBe(true);
    });
  });

  describe('pointInBounds', () => {
    const bounds = { minX: 0, minY: 0, maxX: 10, maxY: 10 };

    it('should detect point inside', () => {
      expect(pointInBounds(5, 5, bounds)).toBe(true);
    });

    it('should detect point outside', () => {
      expect(pointInBounds(15, 15, bounds)).toBe(false);
    });

    it('should detect point on edge', () => {
      expect(pointInBounds(0, 5, bounds)).toBe(true);
      expect(pointInBounds(10, 5, bounds)).toBe(true);
    });

    it('should detect point on corner', () => {
      expect(pointInBounds(0, 0, bounds)).toBe(true);
      expect(pointInBounds(10, 10, bounds)).toBe(true);
    });
  });

  // ==========================================================================
  // Ray-Circle Intersection
  // ==========================================================================

  describe('rayCircleIntersection', () => {
    it('should detect ray hitting circle directly', () => {
      const ray = { x: 0, y: 0, angle: 0, maxRange: 100 };
      const circle = { x: 50, y: 0, radius: 10 };
      const result = rayCircleIntersection(ray, circle);

      expect(result.hit).toBe(true);
      expect(result.distance).toBeCloseTo(40, 5); // 50 - 10 = 40
      expect(result.point.x).toBeCloseTo(40, 5);
      expect(result.point.y).toBeCloseTo(0, 5);
    });

    it('should detect ray missing circle', () => {
      const ray = { x: 0, y: 0, angle: 0, maxRange: 100 };
      const circle = { x: 50, y: 20, radius: 5 };
      const result = rayCircleIntersection(ray, circle);

      expect(result.hit).toBe(false);
    });

    it('should detect ray hitting circle at angle', () => {
      const ray = { x: 0, y: 0, angle: Math.PI / 4, maxRange: 100 };
      const circle = { x: 50, y: 50, radius: 10 };
      const result = rayCircleIntersection(ray, circle);

      expect(result.hit).toBe(true);
      // Distance to center is sqrt(50^2 + 50^2) = 70.7, minus radius
      expect(result.distance).toBeCloseTo(70.71 - 10, 1);
    });

    it('should respect maxRange', () => {
      const ray = { x: 0, y: 0, angle: 0, maxRange: 30 };
      const circle = { x: 50, y: 0, radius: 10 };
      const result = rayCircleIntersection(ray, circle);

      expect(result.hit).toBe(false);
    });

    it('should handle ray starting inside circle', () => {
      const ray = { x: 50, y: 0, angle: 0, maxRange: 100 };
      const circle = { x: 50, y: 0, radius: 10 };
      const result = rayCircleIntersection(ray, circle);

      expect(result.hit).toBe(true);
      expect(result.distance).toBe(10); // Exit point
    });

    it('should handle zero radius (point)', () => {
      const ray = { x: 0, y: 0, angle: 0, maxRange: 100 };
      const circle = { x: 50, y: 0, radius: 0 };
      const result = rayCircleIntersection(ray, circle);

      // Point exactly on ray line
      expect(result.hit).toBe(true);
      expect(result.distance).toBe(50);
    });

    it('should handle circle behind ray', () => {
      const ray = { x: 0, y: 0, angle: 0, maxRange: 100 };
      const circle = { x: -50, y: 0, radius: 10 };
      const result = rayCircleIntersection(ray, circle);

      expect(result.hit).toBe(false);
    });
  });

  // ==========================================================================
  // Cone Detection
  // ==========================================================================

  describe('isInCone', () => {
    it('should detect target in cone', () => {
      const ray = { x: 0, y: 0, angle: 0, maxRange: 100, coneAngle: 0.1 };
      const target = { x: 50, y: 2 }; // Slightly off-center
      const result = isInCone(ray, target);

      expect(result.inCone).toBe(true);
      expect(result.distance).toBeCloseTo(50.04, 1);
    });

    it('should detect target outside cone angle', () => {
      const ray = { x: 0, y: 0, angle: 0, maxRange: 100, coneAngle: 0.1 };
      const target = { x: 50, y: 20 }; // Far off-center
      const result = isInCone(ray, target);

      expect(result.inCone).toBe(false);
    });

    it('should detect target outside range', () => {
      const ray = { x: 0, y: 0, angle: 0, maxRange: 30, coneAngle: 0.1 };
      const target = { x: 50, y: 0 };
      const result = isInCone(ray, target);

      expect(result.inCone).toBe(false);
      expect(result.distance).toBe(50);
    });

    it('should handle target at edge of cone', () => {
      const ray = { x: 0, y: 0, angle: 0, maxRange: 100, coneAngle: 0.1 };
      // Target at exactly coneAngle
      const targetY = 50 * Math.tan(0.1);
      const target = { x: 50, y: targetY };
      const result = isInCone(ray, target);

      // Should be just at the edge (included)
      expect(result.inCone).toBe(true);
    });

    it('should handle wrapped angles correctly', () => {
      // Ray pointing left (PI), target also to the left
      const ray = { x: 0, y: 0, angle: Math.PI, maxRange: 100, coneAngle: 0.1 };
      const target = { x: -50, y: 0 };
      const result = isInCone(ray, target);

      expect(result.inCone).toBe(true);
    });
  });

  // ==========================================================================
  // OptimizedRaycaster Class
  // ==========================================================================

  describe('OptimizedRaycaster', () => {
    let raycaster;

    beforeEach(() => {
      raycaster = new OptimizedRaycaster({
        worldSize: 1000,
        useQuadtree: true,
      });
    });

    describe('target management', () => {
      it('should set targets', () => {
        const targets = [
          { x: 10, y: 0 },
          { x: 20, y: 0 },
        ];
        raycaster.setTargets(targets);
        expect(raycaster.getTargetCount()).toBe(2);
      });

      it('should add target', () => {
        raycaster.addTarget({ x: 10, y: 0 });
        raycaster.addTarget({ x: 20, y: 0 });
        expect(raycaster.getTargetCount()).toBe(2);
      });

      it('should remove target', () => {
        const target = { x: 10, y: 0 };
        raycaster.addTarget(target);
        expect(raycaster.removeTarget(target)).toBe(true);
        expect(raycaster.getTargetCount()).toBe(0);
      });

      it('should return false for non-existent target removal', () => {
        const target = { x: 10, y: 0 };
        expect(raycaster.removeTarget(target)).toBe(false);
      });

      it('should clear targets', () => {
        raycaster.setTargets([{ x: 10, y: 0 }, { x: 20, y: 0 }]);
        raycaster.clearTargets();
        expect(raycaster.getTargetCount()).toBe(0);
      });
    });

    describe('ray casting', () => {
      beforeEach(() => {
        raycaster.setTargets([
          { x: 50, y: 0, radius: 5 },
          { x: 100, y: 0, radius: 5 },
          { x: 50, y: 50, radius: 5 },
        ]);
      });

      it('should find hits along ray', () => {
        const hits = raycaster.cast({
          x: 0,
          y: 0,
          angle: 0,
          maxRange: 200,
        });

        expect(hits.length).toBe(2);
        expect(hits[0].distance).toBeLessThan(hits[1].distance);
      });

      it('should return hits sorted by distance', () => {
        const hits = raycaster.cast({
          x: 0,
          y: 0,
          angle: 0,
          maxRange: 200,
        });

        for (let i = 1; i < hits.length; i++) {
          expect(hits[i].distance).toBeGreaterThanOrEqual(hits[i - 1].distance);
        }
      });

      it('should support early exit with firstOnly', () => {
        const hits = raycaster.cast(
          {
            x: 0,
            y: 0,
            angle: 0,
            maxRange: 200,
          },
          { firstOnly: true }
        );

        expect(hits.length).toBe(1);
        expect(hits[0].distance).toBeCloseTo(45, 1); // 50 - 5 radius
      });

      it('should respect maxRange', () => {
        const hits = raycaster.cast({
          x: 0,
          y: 0,
          angle: 0,
          maxRange: 40,
        });

        expect(hits.length).toBe(0);
      });

      it('should include target and index in hits', () => {
        const hits = raycaster.cast({
          x: 0,
          y: 0,
          angle: 0,
          maxRange: 200,
        });

        expect(hits[0].target).toBeDefined();
        expect(hits[0].index).toBeDefined();
        expect(typeof hits[0].index).toBe('number');
      });
    });

    describe('cone casting', () => {
      beforeEach(() => {
        raycaster.setTargets([
          { x: 50, y: 0 },
          { x: 50, y: 3 }, // atan(3/50) ≈ 0.06 rad, within 0.15
          { x: 50, y: 20 }, // atan(20/50) ≈ 0.38 rad, outside 0.15
        ]);
      });

      it('should find targets in cone', () => {
        const hits = raycaster.castCone({
          x: 0,
          y: 0,
          angle: 0,
          maxRange: 100,
          coneAngle: 0.15,
        });

        // First two targets should be in cone, third is too far off
        expect(hits.length).toBe(2);
      });

      it('should use default cone angle', () => {
        const hits = raycaster.castCone({
          x: 0,
          y: 0,
          angle: 0,
          maxRange: 100,
        });

        expect(hits.length).toBeGreaterThanOrEqual(1);
      });
    });

    describe('findClosest', () => {
      beforeEach(() => {
        raycaster.setTargets([
          { x: 100, y: 0, radius: 5 },
          { x: 50, y: 0, radius: 5 },
        ]);
      });

      it('should return closest hit', () => {
        const closest = raycaster.findClosest({
          x: 0,
          y: 0,
          angle: 0,
          maxRange: 200,
        });

        expect(closest).not.toBeNull();
        expect(closest.target.x).toBe(50);
      });

      it('should return null if no hits', () => {
        const closest = raycaster.findClosest({
          x: 0,
          y: 0,
          angle: Math.PI / 2,
          maxRange: 200,
        });

        expect(closest).toBeNull();
      });
    });

    describe('hasHit', () => {
      beforeEach(() => {
        raycaster.setTargets([{ x: 50, y: 0, radius: 5 }]);
      });

      it('should return true when target is hit', () => {
        const result = raycaster.hasHit({
          x: 0,
          y: 0,
          angle: 0,
          maxRange: 100,
        });

        expect(result).toBe(true);
      });

      it('should return false when no target hit', () => {
        const result = raycaster.hasHit({
          x: 0,
          y: 0,
          angle: Math.PI,
          maxRange: 100,
        });

        expect(result).toBe(false);
      });
    });

    describe('filtering', () => {
      beforeEach(() => {
        raycaster.setTargets([
          { x: 50, y: 0, radius: 5, type: 'enemy' },
          { x: 60, y: 0, radius: 5, type: 'ally' },
          { x: 70, y: 0, radius: 5, type: 'enemy' },
        ]);
      });

      it('should apply filter function', () => {
        const hits = raycaster.cast(
          {
            x: 0,
            y: 0,
            angle: 0,
            maxRange: 200,
          },
          {
            filter: (target) => target.type === 'enemy',
          }
        );

        expect(hits.length).toBe(2);
        hits.forEach((hit) => {
          expect(hit.target.type).toBe('enemy');
        });
      });
    });

    describe('quadtree optimization', () => {
      it('should work with quadtree disabled', () => {
        const noQuadtreeRaycaster = new OptimizedRaycaster({
          useQuadtree: false,
        });

        noQuadtreeRaycaster.setTargets([
          { x: 50, y: 0, radius: 5 },
          { x: 100, y: 0, radius: 5 },
        ]);

        const hits = noQuadtreeRaycaster.cast({
          x: 0,
          y: 0,
          angle: 0,
          maxRange: 200,
        });

        expect(hits.length).toBe(2);
      });

      it('should track stats', () => {
        raycaster.setTargets([
          { x: 50, y: 0, radius: 5 },
          { x: 100, y: 0, radius: 5 },
        ]);

        raycaster.resetStats();

        raycaster.cast({
          x: 0,
          y: 0,
          angle: 0,
          maxRange: 200,
        });

        expect(raycaster.stats.checks).toBeGreaterThan(0);
        expect(raycaster.stats.hits).toBeGreaterThan(0);
      });

      it('should reset stats', () => {
        raycaster.stats.checks = 100;
        raycaster.stats.hits = 50;
        raycaster.resetStats();

        expect(raycaster.stats.checks).toBe(0);
        expect(raycaster.stats.hits).toBe(0);
      });
    });

    describe('dirty state', () => {
      it('should mark dirty when targets change', () => {
        raycaster.setTargets([{ x: 50, y: 0 }]);

        // Force rebuild
        raycaster.cast({ x: 0, y: 0, angle: 0, maxRange: 100 });

        // Add target should mark dirty
        raycaster.addTarget({ x: 100, y: 0 });

        // Next cast should rebuild quadtree
        const hits = raycaster.cast({ x: 0, y: 0, angle: 0, maxRange: 200 });
        expect(hits.length).toBeGreaterThan(0);
      });

      it('should support manual markDirty', () => {
        raycaster.setTargets([{ x: 50, y: 0, radius: 5 }]);
        raycaster.cast({ x: 0, y: 0, angle: 0, maxRange: 100 });

        // Manually modify target position (keep within world bounds)
        raycaster._targets[0].x = 80;
        raycaster.markDirty();

        // Quadtree should be rebuilt with new position
        const hits = raycaster.cast({
          x: 0,
          y: 0,
          angle: 0,
          maxRange: 150,
        });

        expect(hits.length).toBeGreaterThan(0);
        expect(hits[0].target.x).toBe(80);
      });
    });
  });

  // ==========================================================================
  // OptimizedCanvas2DRaycastStrategy
  // ==========================================================================

  describe('OptimizedCanvas2DRaycastStrategy', () => {
    let strategy;

    beforeEach(() => {
      strategy = new OptimizedCanvas2DRaycastStrategy({
        maxRange: 1000,
        coneAngle: 0.1,
      });
    });

    describe('cast', () => {
      it('should find targets in cone', () => {
        const targets = [
          { x: 50, y: 0, type: 'enemy' },
          { x: 50, y: 3, type: 'enemy' }, // atan(3/50) ≈ 0.06 rad, within 0.15
          { x: 50, y: 50, type: 'enemy' }, // atan(50/50) ≈ 0.79 rad, outside
        ];

        const hits = strategy.cast(
          { x: 0, y: 0, angle: 0 },
          targets,
          { coneAngle: 0.15 }
        );

        expect(hits.length).toBe(2);
      });

      it('should return hits in expected format', () => {
        const targets = [{ x: 50, y: 0, type: 'enemy' }];

        const hits = strategy.cast({ x: 0, y: 0, angle: 0 }, targets);

        expect(hits[0]).toHaveProperty('type');
        expect(hits[0]).toHaveProperty('index');
        expect(hits[0]).toHaveProperty('distance');
        expect(hits[0]).toHaveProperty('object');
        expect(hits[0]).toHaveProperty('point');
      });

      it('should use default options', () => {
        const targets = [{ x: 50, y: 0, type: 'enemy' }];
        const hits = strategy.cast({ x: 0, y: 0, angle: 0 }, targets);

        expect(hits.length).toBe(1);
      });
    });

    describe('checkTarget', () => {
      it('should check single target', () => {
        const target = { x: 50, y: 0, type: 'enemy' };
        const result = strategy.checkTarget(
          { x: 0, y: 0, angle: 0 },
          target,
          { index: 5 }
        );

        expect(result).not.toBeNull();
        expect(result.index).toBe(5);
      });

      it('should return null for missed target', () => {
        const target = { x: 50, y: 50, type: 'enemy' };
        const result = strategy.checkTarget(
          { x: 0, y: 0, angle: 0 },
          target
        );

        expect(result).toBeNull();
      });
    });

    describe('stats', () => {
      it('should expose stats', () => {
        const targets = [{ x: 50, y: 0, type: 'enemy' }];
        strategy.cast({ x: 0, y: 0, angle: 0 }, targets);

        const stats = strategy.getStats();
        expect(stats).toHaveProperty('checks');
        expect(stats).toHaveProperty('hits');
      });

      it('should reset stats', () => {
        const targets = [{ x: 50, y: 0, type: 'enemy' }];
        strategy.cast({ x: 0, y: 0, angle: 0 }, targets);
        strategy.resetStats();

        const stats = strategy.getStats();
        expect(stats.checks).toBe(0);
        expect(stats.hits).toBe(0);
      });
    });
  });

  // ==========================================================================
  // Factory Functions
  // ==========================================================================

  describe('factory functions', () => {
    it('should create optimized raycaster', () => {
      const raycaster = createOptimizedRaycaster({ worldSize: 500 });
      expect(raycaster).toBeInstanceOf(OptimizedRaycaster);
      expect(raycaster.worldSize).toBe(500);
    });

    it('should create optimized Canvas2D strategy', () => {
      const strategy = createOptimizedCanvas2DStrategy({ maxRange: 500 });
      expect(strategy).toBeInstanceOf(OptimizedCanvas2DRaycastStrategy);
      expect(strategy.maxRange).toBe(500);
    });
  });

  // ==========================================================================
  // Performance Scenarios
  // ==========================================================================

  describe('performance scenarios', () => {
    it('should handle many targets efficiently', () => {
      const raycaster = createOptimizedRaycaster({ useQuadtree: true });

      // Create 1000 targets spread around
      const targets = [];
      for (let i = 0; i < 1000; i++) {
        targets.push({
          x: (Math.random() - 0.5) * 2000,
          y: (Math.random() - 0.5) * 2000,
          radius: 5,
        });
      }

      raycaster.setTargets(targets);
      raycaster.resetStats();

      // Cast multiple rays
      for (let i = 0; i < 10; i++) {
        raycaster.cast({
          x: 0,
          y: 0,
          angle: (Math.PI * 2 * i) / 10,
          maxRange: 500,
        });
      }

      // Should check far fewer than all targets
      expect(raycaster.stats.checks).toBeLessThan(targets.length * 10);
    });

    it('should benefit from early exit', () => {
      const raycaster = createOptimizedRaycaster();

      // Create targets in a line
      const targets = [];
      for (let i = 1; i <= 100; i++) {
        targets.push({ x: i * 10, y: 0, radius: 3 });
      }

      raycaster.setTargets(targets);
      raycaster.resetStats();

      // With firstOnly, should stop after first hit
      raycaster.cast(
        { x: 0, y: 0, angle: 0, maxRange: 2000 },
        { firstOnly: true }
      );

      const firstOnlyChecks = raycaster.stats.checks;
      raycaster.resetStats();

      // Without firstOnly, checks all
      raycaster.cast(
        { x: 0, y: 0, angle: 0, maxRange: 2000 },
        { firstOnly: false }
      );

      const allChecks = raycaster.stats.checks;

      // First only should check fewer (or equal if quadtree returns same set)
      expect(firstOnlyChecks).toBeLessThanOrEqual(allChecks);
    });

    it('should work without quadtree for small target counts', () => {
      const raycaster = createOptimizedRaycaster({ useQuadtree: false });

      raycaster.setTargets([
        { x: 50, y: 0, radius: 5 },
        { x: 100, y: 0, radius: 5 },
      ]);

      const hits = raycaster.cast({
        x: 0,
        y: 0,
        angle: 0,
        maxRange: 200,
      });

      expect(hits.length).toBe(2);
    });
  });
});
