/**
 * Unit tests for TargetingSystem
 * Tests unified raycasting and target detection
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import {
  TargetingSystem,
  Canvas2DRaycastStrategy,
  ThreeJSRaycastStrategy,
  RaycastStrategy,
  TargetType,
  TargetCategory,
  createCanvas2DTargeting,
  createThreeJSTargeting,
} from '@game/TargetingSystem.js';

describe('TargetingSystem', () => {
  describe('TargetType', () => {
    it('should define all target types', () => {
      expect(TargetType.CIRCLE).toBe('circle');
      expect(TargetType.NPC).toBe('npc');
      expect(TargetType.BUILDING).toBe('building');
      expect(TargetType.WALL).toBe('wall');
      expect(TargetType.PROP).toBe('prop');
    });
  });

  describe('TargetCategory', () => {
    it('should define shootable targets', () => {
      expect(TargetCategory.SHOOTABLE).toContain('circle');
      expect(TargetCategory.SHOOTABLE).toContain('npc');
      expect(TargetCategory.SHOOTABLE).not.toContain('building');
    });

    it('should define obstacle targets', () => {
      expect(TargetCategory.OBSTACLE).toContain('building');
      expect(TargetCategory.OBSTACLE).toContain('wall');
    });

    it('should define interactive targets', () => {
      expect(TargetCategory.INTERACTIVE).toContain('circle');
      expect(TargetCategory.INTERACTIVE).toContain('npc');
      expect(TargetCategory.INTERACTIVE).toContain('prop');
    });
  });

  describe('RaycastStrategy (base class)', () => {
    it('should throw on cast() call', () => {
      const strategy = new RaycastStrategy();
      expect(() => strategy.cast({}, [])).toThrow('must be implemented');
    });

    it('should throw on checkTarget() call', () => {
      const strategy = new RaycastStrategy();
      expect(() => strategy.checkTarget({}, {})).toThrow('must be implemented');
    });
  });

  describe('Canvas2DRaycastStrategy', () => {
    let strategy;

    beforeEach(() => {
      strategy = new Canvas2DRaycastStrategy({
        maxRange: 500,
        coneAngle: 0.2, // ~11.5 degrees half-angle
      });
    });

    describe('constructor', () => {
      it('should use default values', () => {
        const defaultStrategy = new Canvas2DRaycastStrategy();
        expect(defaultStrategy.maxRange).toBe(1000);
        expect(defaultStrategy.coneAngle).toBe(0.1);
      });

      it('should accept custom config', () => {
        expect(strategy.maxRange).toBe(500);
        expect(strategy.coneAngle).toBe(0.2);
      });
    });

    describe('checkTarget', () => {
      it('should detect target directly in front', () => {
        const origin = { x: 0, y: 0, angle: 0 }; // Facing right (+x)
        const target = { x: 100, y: 0, type: 'circle' };

        const hit = strategy.checkTarget(origin, target);

        expect(hit).not.toBeNull();
        expect(hit.type).toBe('circle');
        expect(hit.distance).toBe(100);
      });

      it('should detect target within cone angle', () => {
        const origin = { x: 0, y: 0, angle: 0 };
        // Target slightly off-center (within 0.2 radians)
        const target = { x: 100, y: 10, type: 'circle' };

        const hit = strategy.checkTarget(origin, target);

        expect(hit).not.toBeNull();
        expect(hit.angleDiff).toBeLessThan(0.2);
      });

      it('should miss target outside cone angle', () => {
        const origin = { x: 0, y: 0, angle: 0 };
        // Target far off-center (outside 0.2 radians)
        const target = { x: 100, y: 50, type: 'circle' };

        const hit = strategy.checkTarget(origin, target);

        expect(hit).toBeNull();
      });

      it('should miss target beyond max range', () => {
        const origin = { x: 0, y: 0, angle: 0 };
        const target = { x: 600, y: 0, type: 'circle' }; // Beyond 500 range

        const hit = strategy.checkTarget(origin, target);

        expect(hit).toBeNull();
      });

      it('should detect target behind when facing backward', () => {
        const origin = { x: 0, y: 0, angle: Math.PI }; // Facing left (-x)
        const target = { x: -100, y: 0, type: 'circle' };

        const hit = strategy.checkTarget(origin, target);

        expect(hit).not.toBeNull();
        expect(hit.distance).toBe(100);
      });

      it('should handle diagonal angles correctly', () => {
        const origin = { x: 0, y: 0, angle: Math.PI / 4 }; // Facing 45 degrees
        const target = { x: 70.7, y: 70.7, type: 'npc' }; // ~100 units at 45 degrees

        const hit = strategy.checkTarget(origin, target);

        expect(hit).not.toBeNull();
        expect(Math.abs(hit.angleDiff)).toBeLessThan(0.01);
      });

      it('should include hit point', () => {
        const origin = { x: 10, y: 20, angle: 0 };
        const target = { x: 110, y: 20, type: 'circle' };

        const hit = strategy.checkTarget(origin, target);

        expect(hit.point).toEqual({ x: 110, y: 20 });
      });
    });

    describe('cast', () => {
      it('should return empty array for no targets', () => {
        const origin = { x: 0, y: 0, angle: 0 };
        const hits = strategy.cast(origin, []);

        expect(hits).toEqual([]);
      });

      it('should find all targets in range and cone', () => {
        const origin = { x: 0, y: 0, angle: 0 };
        const targets = [
          { x: 100, y: 0, type: 'circle' },
          { x: 200, y: 0, type: 'npc' },
          { x: 300, y: 0, type: 'circle' },
        ];

        const hits = strategy.cast(origin, targets);

        expect(hits).toHaveLength(3);
      });

      it('should sort by distance (closest first)', () => {
        const origin = { x: 0, y: 0, angle: 0 };
        const targets = [
          { x: 300, y: 0, type: 'circle' },
          { x: 100, y: 0, type: 'npc' },
          { x: 200, y: 0, type: 'circle' },
        ];

        const hits = strategy.cast(origin, targets);

        expect(hits[0].distance).toBe(100);
        expect(hits[1].distance).toBe(200);
        expect(hits[2].distance).toBe(300);
      });

      it('should include index in results', () => {
        const origin = { x: 0, y: 0, angle: 0 };
        const targets = [
          { x: 300, y: 0, type: 'circle' },
          { x: 100, y: 0, type: 'npc' },
        ];

        const hits = strategy.cast(origin, targets);

        // Index refers to original array position
        expect(hits.find((h) => h.distance === 100).index).toBe(1);
        expect(hits.find((h) => h.distance === 300).index).toBe(0);
      });

      it('should filter out targets outside range', () => {
        const origin = { x: 0, y: 0, angle: 0 };
        const targets = [
          { x: 100, y: 0, type: 'circle' },
          { x: 600, y: 0, type: 'circle' }, // Out of range
        ];

        const hits = strategy.cast(origin, targets);

        expect(hits).toHaveLength(1);
        expect(hits[0].distance).toBe(100);
      });

      it('should respect options.maxRange override', () => {
        const origin = { x: 0, y: 0, angle: 0 };
        const targets = [
          { x: 100, y: 0, type: 'circle' },
          { x: 300, y: 0, type: 'circle' },
        ];

        const hits = strategy.cast(origin, targets, { maxRange: 200 });

        expect(hits).toHaveLength(1);
      });

      it('should respect options.coneAngle override', () => {
        const origin = { x: 0, y: 0, angle: 0 };
        const targets = [
          { x: 100, y: 0, type: 'circle' }, // Dead center
          { x: 100, y: 15, type: 'circle' }, // Slightly off
        ];

        // Very narrow cone
        const hits = strategy.cast(origin, targets, { coneAngle: 0.05 });

        expect(hits).toHaveLength(1);
      });
    });

    describe('_normalizeAngle', () => {
      it('should normalize positive angles > PI', () => {
        const result = strategy._normalizeAngle(Math.PI + 1);
        expect(result).toBeCloseTo(-Math.PI + 1);
      });

      it('should normalize negative angles < -PI', () => {
        const result = strategy._normalizeAngle(-Math.PI - 1);
        expect(result).toBeCloseTo(Math.PI - 1);
      });

      it('should not change angles within range', () => {
        const result = strategy._normalizeAngle(Math.PI / 2);
        expect(result).toBeCloseTo(Math.PI / 2);
      });
    });
  });

  describe('ThreeJSRaycastStrategy', () => {
    let mockTHREE;
    let mockRaycaster;
    let strategy;

    beforeEach(() => {
      mockRaycaster = {
        setFromCamera: vi.fn(),
        intersectObjects: vi.fn(() => []),
      };

      mockTHREE = {
        Vector2: vi.fn((x, y) => ({ x, y })),
      };

      strategy = new ThreeJSRaycastStrategy({
        THREE: mockTHREE,
        raycaster: mockRaycaster,
      });
    });

    describe('constructor', () => {
      it('should store dependencies', () => {
        expect(strategy.THREE).toBe(mockTHREE);
        expect(strategy.raycaster).toBe(mockRaycaster);
      });
    });

    describe('cast', () => {
      it('should return empty array without raycaster', () => {
        const emptyStrategy = new ThreeJSRaycastStrategy({});
        const hits = emptyStrategy.cast({}, []);
        expect(hits).toEqual([]);
      });

      it('should set raycaster from camera center', () => {
        const mockCamera = { type: 'camera' };
        const mockScene = { children: [] };

        strategy.cast({}, [], { camera: mockCamera, scene: mockScene });

        expect(mockRaycaster.setFromCamera).toHaveBeenCalledWith({ x: 0, y: 0 }, mockCamera);
      });

      it('should intersect scene children', () => {
        const mockCamera = { type: 'camera' };
        const mockScene = { children: [{ name: 'obj1' }, { name: 'obj2' }] };

        strategy.cast({}, [], { camera: mockCamera, scene: mockScene });

        expect(mockRaycaster.intersectObjects).toHaveBeenCalledWith(mockScene.children, true);
      });

      it('should filter by target types', () => {
        const mockCamera = { type: 'camera' };
        const mockScene = { children: [] };

        mockRaycaster.intersectObjects.mockReturnValue([
          { object: { userData: { type: 'circle' } }, distance: 100 },
          { object: { userData: { type: 'building' } }, distance: 50 },
          { object: { userData: { type: 'npc' } }, distance: 150 },
        ]);

        const hits = strategy.cast({}, [], {
          camera: mockCamera,
          scene: mockScene,
          targetTypes: ['circle', 'npc'],
        });

        expect(hits).toHaveLength(2);
        expect(hits.map((h) => h.type)).toContain('circle');
        expect(hits.map((h) => h.type)).toContain('npc');
        expect(hits.map((h) => h.type)).not.toContain('building');
      });

      it('should convert intersect results to unified format', () => {
        const mockCamera = { type: 'camera' };
        const mockScene = { children: [] };
        const mockPoint = { x: 10, y: 20, z: 30 };

        mockRaycaster.intersectObjects.mockReturnValue([
          {
            object: { userData: { type: 'circle' } },
            distance: 100,
            point: mockPoint,
          },
        ]);

        const hits = strategy.cast({}, [], { camera: mockCamera, scene: mockScene });

        expect(hits[0]).toMatchObject({
          type: 'circle',
          distance: 100,
          point: { x: 10, y: 20, z: 30 },
        });
      });
    });

    describe('checkTarget', () => {
      it('should use cast internally', () => {
        const mockCamera = { type: 'camera' };
        const mockScene = { children: [] };
        const target = { userData: { type: 'circle' } };

        mockRaycaster.intersectObjects.mockReturnValue([
          { object: target, distance: 50 },
        ]);

        const hit = strategy.checkTarget({}, target, { camera: mockCamera, scene: mockScene });

        expect(hit).not.toBeNull();
        expect(hit.distance).toBe(50);
      });

      it('should return null for no hit', () => {
        mockRaycaster.intersectObjects.mockReturnValue([]);

        const hit = strategy.checkTarget({}, {}, {});

        expect(hit).toBeNull();
      });
    });
  });

  describe('TargetingSystem', () => {
    let system;

    beforeEach(() => {
      system = new TargetingSystem({
        maxRange: 500,
        fireRate: 100,
      });
    });

    afterEach(() => {
      vi.restoreAllMocks();
    });

    describe('constructor', () => {
      it('should use default Canvas2D strategy', () => {
        expect(system.strategy).toBeInstanceOf(Canvas2DRaycastStrategy);
      });

      it('should accept custom config', () => {
        expect(system.maxRange).toBe(500);
        expect(system.fireRate).toBe(100);
      });

      it('should initialize empty target groups', () => {
        expect(system._targetGroups.size).toBe(0);
      });
    });

    describe('setStrategy', () => {
      it('should allow strategy replacement', () => {
        const newStrategy = new Canvas2DRaycastStrategy({ maxRange: 200 });
        system.setStrategy(newStrategy);
        expect(system.strategy).toBe(newStrategy);
      });
    });

    describe('registerTargets', () => {
      it('should register target groups', () => {
        const circles = [{ x: 0, y: 0, type: 'circle' }];
        system.registerTargets('circles', circles);

        expect(system._targetGroups.get('circles')).toBe(circles);
      });

      it('should allow multiple groups', () => {
        system.registerTargets('circles', []);
        system.registerTargets('npcs', []);

        expect(system._targetGroups.size).toBe(2);
      });

      it('should overwrite existing group', () => {
        system.registerTargets('circles', [{ id: 1 }]);
        system.registerTargets('circles', [{ id: 2 }]);

        expect(system._targetGroups.get('circles')).toEqual([{ id: 2 }]);
      });
    });

    describe('unregisterTargets', () => {
      it('should remove target group', () => {
        system.registerTargets('circles', []);
        system.unregisterTargets('circles');

        expect(system._targetGroups.has('circles')).toBe(false);
      });
    });

    describe('getAllTargets', () => {
      beforeEach(() => {
        system.registerTargets('circles', [
          { x: 0, y: 0, type: 'circle' },
          { x: 10, y: 10, type: 'circle' },
        ]);
        system.registerTargets('npcs', [{ x: 20, y: 20, type: 'npc' }]);
      });

      it('should return all targets from all groups', () => {
        const targets = system.getAllTargets();
        expect(targets).toHaveLength(3);
      });

      it('should include group and index info', () => {
        const targets = system.getAllTargets();
        expect(targets[0]).toHaveProperty('group');
        expect(targets[0]).toHaveProperty('index');
      });

      it('should filter by groups if specified', () => {
        const targets = system.getAllTargets(['circles']);
        expect(targets).toHaveLength(2);
        expect(targets.every((t) => t.group === 'circles')).toBe(true);
      });
    });

    describe('getObjectsInCrosshair', () => {
      beforeEach(() => {
        system.registerTargets('circles', [
          { x: 100, y: 0, type: 'circle' },
          { x: 200, y: 0, type: 'circle' },
        ]);
        system.registerTargets('npcs', [{ x: 150, y: 0, type: 'npc' }]);
      });

      it('should find targets in crosshair', () => {
        const origin = { x: 0, y: 0, angle: 0 };
        const hits = system.getObjectsInCrosshair(origin);

        expect(hits).toHaveLength(3);
      });

      it('should filter by target types', () => {
        const origin = { x: 0, y: 0, angle: 0 };
        const hits = system.getObjectsInCrosshair(origin, {
          targetTypes: ['circle'],
        });

        expect(hits).toHaveLength(2);
        expect(hits.every((h) => h.type === 'circle')).toBe(true);
      });

      it('should sort by distance', () => {
        const origin = { x: 0, y: 0, angle: 0 };
        const hits = system.getObjectsInCrosshair(origin);

        expect(hits[0].distance).toBe(100);
        expect(hits[1].distance).toBe(150);
        expect(hits[2].distance).toBe(200);
      });

      it('should include group info in hits', () => {
        const origin = { x: 0, y: 0, angle: 0 };
        const hits = system.getObjectsInCrosshair(origin);

        expect(hits.some((h) => h.group === 'circles')).toBe(true);
        expect(hits.some((h) => h.group === 'npcs')).toBe(true);
      });

      it('should include original index in hits', () => {
        const origin = { x: 0, y: 0, angle: 0 };
        const hits = system.getObjectsInCrosshair(origin);

        const circleHits = hits.filter((h) => h.type === 'circle');
        expect(circleHits.some((h) => h.originalIndex === 0)).toBe(true);
        expect(circleHits.some((h) => h.originalIndex === 1)).toBe(true);
      });
    });

    describe('shoot', () => {
      beforeEach(() => {
        system.registerTargets('circles', [{ x: 100, y: 0, type: 'circle' }]);
      });

      it('should return hit when target is in crosshair', () => {
        const origin = { x: 0, y: 0, angle: 0 };
        const result = system.shoot(origin);

        expect(result.canShoot).toBe(true);
        expect(result.hit).not.toBeNull();
        expect(result.hit.type).toBe('circle');
      });

      it('should return null hit when no target', () => {
        const origin = { x: 0, y: 0, angle: Math.PI }; // Facing away
        const result = system.shoot(origin);

        expect(result.canShoot).toBe(true);
        expect(result.hit).toBeNull();
      });

      it('should respect fire rate', () => {
        const origin = { x: 0, y: 0, angle: 0 };

        const first = system.shoot(origin);
        const second = system.shoot(origin);

        expect(first.canShoot).toBe(true);
        expect(second.canShoot).toBe(false);
        expect(second.blocked).toBe('rate_limit');
      });

      it('should allow shooting after fire rate expires', async () => {
        system.fireRate = 10; // Short for testing
        const origin = { x: 0, y: 0, angle: 0 };

        system.shoot(origin);
        await new Promise((r) => setTimeout(r, 15));
        const result = system.shoot(origin);

        expect(result.canShoot).toBe(true);
      });

      it('should emit shoot event', () => {
        const handler = vi.fn();
        system.on('shoot', handler);
        const origin = { x: 0, y: 0, angle: 0 };

        system.shoot(origin);

        expect(handler).toHaveBeenCalledWith(
          expect.objectContaining({ origin, hits: expect.any(Array) })
        );
      });

      it('should emit shoot:miss on miss', () => {
        const handler = vi.fn();
        system.on('shoot:miss', handler);
        const origin = { x: 0, y: 0, angle: Math.PI };

        system.shoot(origin);

        expect(handler).toHaveBeenCalled();
      });

      it('should emit shoot:hit on hit', () => {
        const handler = vi.fn();
        system.on('shoot:hit', handler);
        const origin = { x: 0, y: 0, angle: 0 };

        system.shoot(origin);

        expect(handler).toHaveBeenCalledWith(expect.objectContaining({ hit: expect.any(Object) }));
      });
    });

    describe('canShoot', () => {
      it('should return true initially', () => {
        expect(system.canShoot()).toBe(true);
      });

      it('should return false after shooting', () => {
        system.shoot({ x: 0, y: 0, angle: 0 });
        expect(system.canShoot()).toBe(false);
      });
    });

    describe('resetFireRate', () => {
      it('should allow immediate shooting after reset', () => {
        system.shoot({ x: 0, y: 0, angle: 0 });
        expect(system.canShoot()).toBe(false);

        system.resetFireRate();
        expect(system.canShoot()).toBe(true);
      });
    });

    describe('getClosestTarget', () => {
      beforeEach(() => {
        system.registerTargets('circles', [
          { x: 200, y: 0, type: 'circle' },
          { x: 100, y: 0, type: 'circle' },
        ]);
      });

      it('should return closest target', () => {
        const origin = { x: 0, y: 0, angle: 0 };
        const target = system.getClosestTarget(origin);

        expect(target.distance).toBe(100);
      });

      it('should return null when no target in range', () => {
        const origin = { x: 0, y: 0, angle: Math.PI };
        const target = system.getClosestTarget(origin);

        expect(target).toBeNull();
      });
    });

    describe('hasTargetInRange', () => {
      beforeEach(() => {
        system.registerTargets('circles', [{ x: 100, y: 0, type: 'circle' }]);
      });

      it('should return true when target exists', () => {
        const origin = { x: 0, y: 0, angle: 0 };
        expect(system.hasTargetInRange(origin)).toBe(true);
      });

      it('should return false when no target', () => {
        const origin = { x: 0, y: 0, angle: Math.PI };
        expect(system.hasTargetInRange(origin)).toBe(false);
      });
    });
  });

  describe('Factory Functions', () => {
    describe('createCanvas2DTargeting', () => {
      it('should create targeting system with Canvas2D strategy', () => {
        const system = createCanvas2DTargeting();
        expect(system).toBeInstanceOf(TargetingSystem);
        expect(system.strategy).toBeInstanceOf(Canvas2DRaycastStrategy);
      });

      it('should pass config to strategy', () => {
        const system = createCanvas2DTargeting({ maxRange: 800, coneAngle: 0.3 });
        expect(system.strategy.maxRange).toBe(800);
        expect(system.strategy.coneAngle).toBe(0.3);
      });
    });

    describe('createThreeJSTargeting', () => {
      it('should create targeting system with ThreeJS strategy', () => {
        const mockTHREE = { Vector2: vi.fn() };
        const system = createThreeJSTargeting({ THREE: mockTHREE });

        expect(system).toBeInstanceOf(TargetingSystem);
        expect(system.strategy).toBeInstanceOf(ThreeJSRaycastStrategy);
      });

      it('should pass dependencies to strategy', () => {
        const mockTHREE = { Vector2: vi.fn() };
        const mockRaycaster = {};
        const system = createThreeJSTargeting({
          THREE: mockTHREE,
          raycaster: mockRaycaster,
        });

        expect(system.strategy.THREE).toBe(mockTHREE);
        expect(system.strategy.raycaster).toBe(mockRaycaster);
      });
    });
  });

  describe('Edge Cases', () => {
    let system;

    beforeEach(() => {
      system = new TargetingSystem();
    });

    it('should handle empty target groups', () => {
      const origin = { x: 0, y: 0, angle: 0 };
      const hits = system.getObjectsInCrosshair(origin);
      expect(hits).toEqual([]);
    });

    it('should handle targets at origin', () => {
      system.registerTargets('test', [{ x: 0, y: 0, type: 'circle' }]);
      const origin = { x: 0, y: 0, angle: 0 };

      const hits = system.getObjectsInCrosshair(origin);
      expect(hits[0].distance).toBe(0);
    });

    it('should handle very small distances', () => {
      system.registerTargets('test', [{ x: 0.001, y: 0, type: 'circle' }]);
      const origin = { x: 0, y: 0, angle: 0 };

      const hits = system.getObjectsInCrosshair(origin);
      expect(hits).toHaveLength(1);
    });

    it('should handle targets exactly at max range', () => {
      system = new TargetingSystem({ maxRange: 100 });
      system.registerTargets('test', [{ x: 100, y: 0, type: 'circle' }]);
      const origin = { x: 0, y: 0, angle: 0 };

      const hits = system.getObjectsInCrosshair(origin);
      expect(hits).toHaveLength(1);
    });

    it('should handle targets just beyond max range', () => {
      system = new TargetingSystem({ maxRange: 100 });
      system.registerTargets('test', [{ x: 100.01, y: 0, type: 'circle' }]);
      const origin = { x: 0, y: 0, angle: 0 };

      const hits = system.getObjectsInCrosshair(origin);
      expect(hits).toHaveLength(0);
    });

    it('should handle angle wraparound at PI boundary', () => {
      system.registerTargets('test', [{ x: -100, y: 0, type: 'circle' }]);
      const origin = { x: 0, y: 0, angle: Math.PI }; // Facing -x

      const hits = system.getObjectsInCrosshair(origin);
      expect(hits).toHaveLength(1);
    });

    it('should handle angle wraparound at -PI boundary', () => {
      system.registerTargets('test', [{ x: -100, y: 0, type: 'circle' }]);
      const origin = { x: 0, y: 0, angle: -Math.PI }; // Facing -x

      const hits = system.getObjectsInCrosshair(origin);
      expect(hits).toHaveLength(1);
    });

    it('should handle negative coordinates', () => {
      system.registerTargets('test', [{ x: -50, y: -50, type: 'circle' }]);
      const origin = { x: 0, y: 0, angle: -Math.PI * 0.75 }; // Facing -x,-y direction

      const hits = system.getObjectsInCrosshair(origin);
      expect(hits).toHaveLength(1);
    });
  });

  describe('Integration with EventEmitter', () => {
    it('should support all EventEmitter methods', () => {
      const system = new TargetingSystem();

      expect(typeof system.on).toBe('function');
      expect(typeof system.off).toBe('function');
      expect(typeof system.emit).toBe('function');
      expect(typeof system.once).toBe('function');
    });

    it('should emit events during shoot sequence', () => {
      const system = new TargetingSystem();
      system.registerTargets('test', [{ x: 100, y: 0, type: 'circle' }]);

      const events = [];
      system.on('shoot', () => events.push('shoot'));
      system.on('shoot:hit', () => events.push('hit'));

      system.shoot({ x: 0, y: 0, angle: 0 });

      expect(events).toContain('shoot');
      expect(events).toContain('hit');
    });
  });
});
