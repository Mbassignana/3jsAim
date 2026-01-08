/**
 * Unit tests for PhysicsWorld
 * Tests collision detection, raycasting, body management, and physics simulation
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  PhysicsWorld,
  DEFAULT_CONFIG,
  MATERIAL_PROPERTIES,
  BodyType,
} from '@physics/PhysicsWorld.js';

/**
 * Create a mock CANNON.js library for testing
 */
function createMockCannon() {
  const mockBodies = [];
  const mockContactMaterials = [];

  // Mock Vec3
  class Vec3 {
    constructor(x = 0, y = 0, z = 0) {
      this.x = x;
      this.y = y;
      this.z = z;
    }
    set(x, y, z) {
      this.x = x;
      this.y = y;
      this.z = z;
    }
    distanceTo(other) {
      return Math.sqrt(
        Math.pow(this.x - other.x, 2) +
          Math.pow(this.y - other.y, 2) +
          Math.pow(this.z - other.z, 2)
      );
    }
  }

  // Mock Quaternion
  class Quaternion {
    constructor(x = 0, y = 0, z = 0, w = 1) {
      this.x = x;
      this.y = y;
      this.z = z;
      this.w = w;
    }
    set(x, y, z, w) {
      this.x = x;
      this.y = y;
      this.z = z;
      this.w = w;
    }
    setFromEuler(x, y, z) {
      // Simplified euler conversion
      this.x = x;
      this.y = y;
      this.z = z;
      this.w = 1;
    }
    normalize() {
      // Simplified normalization
      return this;
    }
  }

  // Mock Body
  class Body {
    constructor(options = {}) {
      this.mass = options.mass || 0;
      this.material = options.material || null;
      this.position = new Vec3();
      this.velocity = new Vec3();
      this.angularVelocity = new Vec3();
      this.quaternion = new Quaternion();
      this.shapes = [];
      this.fixedRotation = false;
      this.angularDamping = 0;
      this.linearDamping = 0;
    }
    addShape(shape) {
      this.shapes.push(shape);
    }
    updateMassProperties() {}
  }

  // Mock Shapes
  class Plane {}
  class Cylinder {
    constructor(radiusTop, radiusBottom, height, numSegments) {
      this.radiusTop = radiusTop;
      this.radiusBottom = radiusBottom;
      this.height = height;
      this.numSegments = numSegments;
    }
  }
  class Box {
    constructor(halfExtents) {
      this.halfExtents = halfExtents;
    }
  }
  class Sphere {
    constructor(radius) {
      this.radius = radius;
    }
  }

  // Mock Material
  class Material {
    constructor(name) {
      this.name = name;
    }
  }

  // Mock ContactMaterial
  class ContactMaterial {
    constructor(m1, m2, options = {}) {
      this.materials = [m1, m2];
      this.friction = options.friction || 0;
      this.restitution = options.restitution || 0;
    }
  }

  // Mock RaycastResult
  class RaycastResult {
    constructor() {
      this.hasHit = false;
      this.hitPointWorld = new Vec3();
      this.hitNormalWorld = new Vec3();
      this.body = null;
      this.distance = 0;
    }
  }

  // Mock World
  class World {
    constructor() {
      this.gravity = new Vec3();
      this.broadphase = null;
      this.solver = { iterations: 0 };
      this._bodies = [];
      this._contactMaterials = [];
      this._raycastResult = null;
    }
    addBody(body) {
      this._bodies.push(body);
      mockBodies.push(body);
    }
    removeBody(body) {
      const index = this._bodies.indexOf(body);
      if (index > -1) {
        this._bodies.splice(index, 1);
      }
      const mockIndex = mockBodies.indexOf(body);
      if (mockIndex > -1) {
        mockBodies.splice(mockIndex, 1);
      }
    }
    addContactMaterial(cm) {
      this._contactMaterials.push(cm);
      mockContactMaterials.push(cm);
    }
    step(fixedTimeStep, deltaTime, maxSubSteps) {
      // Simulate physics step
    }
    raycastClosest(from, to, options, result) {
      // Return pre-configured result or default false
      if (this._raycastResult) {
        result.hasHit = this._raycastResult.hasHit;
        result.hitPointWorld = this._raycastResult.hitPointWorld;
        result.hitNormalWorld = this._raycastResult.hitNormalWorld;
        result.body = this._raycastResult.body;
        result.distance = this._raycastResult.distance;
        return this._raycastResult.hasHit;
      }
      return false;
    }
    // Test helper to configure raycast result
    _setRaycastResult(result) {
      this._raycastResult = result;
    }
  }

  // Mock Broadphase
  class NaiveBroadphase {}

  return {
    Vec3,
    Quaternion,
    Body,
    Plane,
    Cylinder,
    Box,
    Sphere,
    Material,
    ContactMaterial,
    RaycastResult,
    World,
    NaiveBroadphase,
    _mockBodies: mockBodies,
    _mockContactMaterials: mockContactMaterials,
  };
}

describe('PhysicsWorld', () => {
  let physics;
  let mockCannon;

  beforeEach(() => {
    mockCannon = createMockCannon();
    physics = new PhysicsWorld({ CANNON: mockCannon });
  });

  afterEach(() => {
    physics = null;
    mockCannon = null;
  });

  // ==========================================================================
  // Constructor and Initialization
  // ==========================================================================
  describe('constructor', () => {
    it('should create with default configuration', () => {
      expect(physics.config).toEqual(DEFAULT_CONFIG);
    });

    it('should accept custom configuration', () => {
      const customConfig = { gravity: -10, solverIterations: 5 };
      const customPhysics = new PhysicsWorld({ CANNON: mockCannon, config: customConfig });

      expect(customPhysics.config.gravity).toBe(-10);
      expect(customPhysics.config.solverIterations).toBe(5);
      expect(customPhysics.config.fixedTimeStep).toBe(DEFAULT_CONFIG.fixedTimeStep);
    });

    it('should initialize with no world', () => {
      expect(physics.world).toBeNull();
      expect(physics.isAvailable()).toBe(false);
    });

    it('should have empty bodies map', () => {
      expect(physics.bodies.size).toBe(0);
    });

    it('should have null ground and player bodies', () => {
      expect(physics.groundBody).toBeNull();
      expect(physics.playerBody).toBeNull();
    });
  });

  describe('init', () => {
    it('should create physics world on init', () => {
      physics.init();
      expect(physics.world).not.toBeNull();
      expect(physics.world).toBeInstanceOf(mockCannon.World);
    });

    it('should set gravity', () => {
      physics.init();
      expect(physics.world.gravity.y).toBe(DEFAULT_CONFIG.gravity);
    });

    it('should set solver iterations', () => {
      physics.init();
      expect(physics.world.solver.iterations).toBe(DEFAULT_CONFIG.solverIterations);
    });

    it('should create broadphase', () => {
      physics.init();
      expect(physics.world.broadphase).not.toBeNull();
    });

    it('should set up materials', () => {
      physics.init();
      expect(physics.materials.ground).toBeInstanceOf(mockCannon.Material);
      expect(physics.materials.player).toBeInstanceOf(mockCannon.Material);
      expect(physics.materials.building).toBeInstanceOf(mockCannon.Material);
      expect(physics.materials.circle).toBeInstanceOf(mockCannon.Material);
      expect(physics.materials.npc).toBeInstanceOf(mockCannon.Material);
    });

    it('should create contact materials', () => {
      physics.init();
      expect(mockCannon._mockContactMaterials.length).toBeGreaterThan(0);
    });

    it('should emit init event', () => {
      const callback = vi.fn();
      physics.on('physics:init', callback);
      physics.init();
      expect(callback).toHaveBeenCalled();
    });

    it('should not reinitialize if already initialized', () => {
      physics.init();
      const world = physics.world;
      physics.init();
      expect(physics.world).toBe(world);
    });

    it('should set initialized flag', () => {
      expect(physics.isInitialized()).toBe(false);
      physics.init();
      expect(physics.isInitialized()).toBe(true);
    });
  });

  describe('init without CANNON', () => {
    it('should gracefully handle missing CANNON library', () => {
      const noCannonPhysics = new PhysicsWorld();
      noCannonPhysics.init();

      expect(noCannonPhysics.world).toBeNull();
      expect(noCannonPhysics.isAvailable()).toBe(false);
      expect(noCannonPhysics.isInitialized()).toBe(true);
    });
  });

  // ==========================================================================
  // Ground Body
  // ==========================================================================
  describe('addGround', () => {
    beforeEach(() => {
      physics.init();
    });

    it('should create ground body', () => {
      const ground = physics.addGround();
      expect(ground).not.toBeNull();
      expect(physics.groundBody).toBe(ground);
    });

    it('should create static ground (mass 0)', () => {
      const ground = physics.addGround();
      expect(ground.mass).toBe(0);
    });

    it('should use ground material', () => {
      const ground = physics.addGround();
      expect(ground.material).toBe(physics.materials.ground);
    });

    it('should add plane shape', () => {
      const ground = physics.addGround();
      expect(ground.shapes.length).toBe(1);
      expect(ground.shapes[0]).toBeInstanceOf(mockCannon.Plane);
    });

    it('should rotate to be horizontal', () => {
      const ground = physics.addGround();
      expect(ground.quaternion.x).toBe(-Math.PI / 2);
    });

    it('should emit addBody event', () => {
      const callback = vi.fn();
      physics.on('physics:addBody', callback);
      physics.addGround();
      expect(callback).toHaveBeenCalledWith(
        expect.objectContaining({ type: BodyType.GROUND })
      );
    });

    it('should return null if not initialized', () => {
      const uninitPhysics = new PhysicsWorld({ CANNON: mockCannon });
      expect(uninitPhysics.addGround()).toBeNull();
    });
  });

  // ==========================================================================
  // Player Body
  // ==========================================================================
  describe('addPlayer', () => {
    beforeEach(() => {
      physics.init();
    });

    it('should create player body', () => {
      const player = physics.addPlayer(0, 2, 5);
      expect(player).not.toBeNull();
      expect(physics.playerBody).toBe(player);
    });

    it('should set player position', () => {
      const player = physics.addPlayer(10, 5, -3);
      expect(player.position.x).toBe(10);
      expect(player.position.y).toBe(5);
      expect(player.position.z).toBe(-3);
    });

    it('should use default mass of 80', () => {
      const player = physics.addPlayer(0, 2, 5);
      expect(player.mass).toBe(80);
    });

    it('should accept custom mass', () => {
      const player = physics.addPlayer(0, 2, 5, { mass: 100 });
      expect(player.mass).toBe(100);
    });

    it('should use player material', () => {
      const player = physics.addPlayer(0, 2, 5);
      expect(player.material).toBe(physics.materials.player);
    });

    it('should add cylinder shape', () => {
      const player = physics.addPlayer(0, 2, 5);
      expect(player.shapes.length).toBe(1);
      expect(player.shapes[0]).toBeInstanceOf(mockCannon.Cylinder);
    });

    it('should use default dimensions', () => {
      const player = physics.addPlayer(0, 2, 5);
      const cylinder = player.shapes[0];
      expect(cylinder.radiusTop).toBe(0.5);
      expect(cylinder.height).toBe(1.8);
    });

    it('should accept custom dimensions', () => {
      const player = physics.addPlayer(0, 2, 5, { radius: 0.3, height: 2.0 });
      const cylinder = player.shapes[0];
      expect(cylinder.radiusTop).toBe(0.3);
      expect(cylinder.height).toBe(2.0);
    });

    it('should have fixed rotation', () => {
      const player = physics.addPlayer(0, 2, 5);
      expect(player.fixedRotation).toBe(true);
    });

    it('should emit addBody event', () => {
      const callback = vi.fn();
      physics.on('physics:addBody', callback);
      physics.addPlayer(0, 2, 5);
      expect(callback).toHaveBeenCalledWith(
        expect.objectContaining({ type: BodyType.PLAYER })
      );
    });
  });

  // ==========================================================================
  // Static Box Bodies (Building, Wall, Prop)
  // ==========================================================================
  describe('addStaticBox', () => {
    beforeEach(() => {
      physics.init();
    });

    it('should create static box body', () => {
      const body = physics.addStaticBox('building', 0, 5, 0, 10, 10, 10);
      expect(body).not.toBeNull();
      expect(body.mass).toBe(0);
    });

    it('should set position', () => {
      const body = physics.addStaticBox('building', 5, 10, 15, 1, 1, 1);
      expect(body.position.x).toBe(5);
      expect(body.position.y).toBe(10);
      expect(body.position.z).toBe(15);
    });

    it('should add box shape with half extents', () => {
      const body = physics.addStaticBox('building', 0, 0, 0, 4, 6, 8);
      expect(body.shapes.length).toBe(1);
      expect(body.shapes[0]).toBeInstanceOf(mockCannon.Box);
      expect(body.shapes[0].halfExtents.x).toBe(2);
      expect(body.shapes[0].halfExtents.y).toBe(3);
      expect(body.shapes[0].halfExtents.z).toBe(4);
    });

    it('should store body in map with correct key', () => {
      physics.addStaticBox('building', 1, 2, 3, 1, 1, 1);
      expect(physics.bodies.has('building_1_2_3')).toBe(true);
    });

    it('should emit addBody event', () => {
      const callback = vi.fn();
      physics.on('physics:addBody', callback);
      physics.addStaticBox('wall', 0, 0, 0, 1, 1, 1);
      expect(callback).toHaveBeenCalledWith(
        expect.objectContaining({ type: 'wall', key: 'wall_0_0_0' })
      );
    });
  });

  describe('addBuilding', () => {
    beforeEach(() => {
      physics.init();
    });

    it('should create building body', () => {
      const body = physics.addBuilding(0, 5, 0, 10, 20, 10);
      expect(body).not.toBeNull();
    });

    it('should store with building prefix', () => {
      physics.addBuilding(5, 0, 10, 1, 1, 1);
      expect(physics.bodies.has('building_5_0_10')).toBe(true);
    });
  });

  describe('addWall', () => {
    beforeEach(() => {
      physics.init();
    });

    it('should create wall body', () => {
      const body = physics.addWall(0, 2, 0, 20, 4, 0.5);
      expect(body).not.toBeNull();
    });

    it('should store with wall prefix', () => {
      physics.addWall(10, 5, 20, 1, 1, 1);
      expect(physics.bodies.has('wall_10_5_20')).toBe(true);
    });
  });

  describe('addProp', () => {
    beforeEach(() => {
      physics.init();
    });

    it('should create prop body', () => {
      const body = physics.addProp(5, 0.5, 5, 1, 1, 1);
      expect(body).not.toBeNull();
    });

    it('should store with prop prefix', () => {
      physics.addProp(3, 1, 7, 1, 1, 1);
      expect(physics.bodies.has('prop_3_1_7')).toBe(true);
    });
  });

  // ==========================================================================
  // Circle Bodies
  // ==========================================================================
  describe('addCircle', () => {
    beforeEach(() => {
      physics.init();
    });

    it('should create circle body', () => {
      const body = physics.addCircle(5, 2, 10, 0.5);
      expect(body).not.toBeNull();
    });

    it('should be static (mass 0)', () => {
      const body = physics.addCircle(0, 0, 0, 1);
      expect(body.mass).toBe(0);
    });

    it('should use circle material', () => {
      const body = physics.addCircle(0, 0, 0, 1);
      expect(body.material).toBe(physics.materials.circle);
    });

    it('should add sphere shape', () => {
      const body = physics.addCircle(0, 0, 0, 0.5);
      expect(body.shapes.length).toBe(1);
      expect(body.shapes[0]).toBeInstanceOf(mockCannon.Sphere);
      expect(body.shapes[0].radius).toBe(0.5);
    });

    it('should set position', () => {
      const body = physics.addCircle(5, 3, 8, 1);
      expect(body.position.x).toBe(5);
      expect(body.position.y).toBe(3);
      expect(body.position.z).toBe(8);
    });

    it('should store with timestamp key', () => {
      physics.addCircle(1, 2, 3, 0.5);
      const keys = Array.from(physics.bodies.keys());
      const circleKey = keys.find((k) => k.startsWith('circle_1_2_3_'));
      expect(circleKey).toBeDefined();
    });

    it('should emit addBody event', () => {
      const callback = vi.fn();
      physics.on('physics:addBody', callback);
      physics.addCircle(0, 0, 0, 1);
      expect(callback).toHaveBeenCalledWith(
        expect.objectContaining({ type: BodyType.CIRCLE })
      );
    });
  });

  // ==========================================================================
  // NPC Bodies
  // ==========================================================================
  describe('addNPC', () => {
    beforeEach(() => {
      physics.init();
    });

    it('should create NPC body', () => {
      const body = physics.addNPC(0, 1, 0, 0.8, 1.6, 0.8);
      expect(body).not.toBeNull();
    });

    it('should use default mass of 50', () => {
      const body = physics.addNPC(0, 0, 0, 1, 1, 1);
      expect(body.mass).toBe(50);
    });

    it('should accept custom mass', () => {
      const body = physics.addNPC(0, 0, 0, 1, 1, 1, { mass: 75 });
      expect(body.mass).toBe(75);
    });

    it('should use npc material', () => {
      const body = physics.addNPC(0, 0, 0, 1, 1, 1);
      expect(body.material).toBe(physics.materials.npc);
    });

    it('should add box shape', () => {
      const body = physics.addNPC(0, 0, 0, 2, 3, 2);
      expect(body.shapes.length).toBe(1);
      expect(body.shapes[0]).toBeInstanceOf(mockCannon.Box);
    });

    it('should set damping values', () => {
      const body = physics.addNPC(0, 0, 0, 1, 1, 1);
      expect(body.angularDamping).toBe(0.9);
      expect(body.linearDamping).toBe(0.1);
    });

    it('should store with timestamp key', () => {
      physics.addNPC(5, 1, 10, 1, 2, 1);
      const keys = Array.from(physics.bodies.keys());
      const npcKey = keys.find((k) => k.startsWith('npc_5_1_10_'));
      expect(npcKey).toBeDefined();
    });

    it('should emit addBody event', () => {
      const callback = vi.fn();
      physics.on('physics:addBody', callback);
      physics.addNPC(0, 0, 0, 1, 1, 1);
      expect(callback).toHaveBeenCalledWith(
        expect.objectContaining({ type: BodyType.NPC })
      );
    });
  });

  // ==========================================================================
  // Body Removal
  // ==========================================================================
  describe('removeBody', () => {
    beforeEach(() => {
      physics.init();
    });

    it('should remove body by key', () => {
      physics.addBuilding(0, 0, 0, 1, 1, 1);
      expect(physics.bodies.has('building_0_0_0')).toBe(true);

      const result = physics.removeBody('building_0_0_0');
      expect(result).toBe(true);
      expect(physics.bodies.has('building_0_0_0')).toBe(false);
    });

    it('should return false for non-existent key', () => {
      const result = physics.removeBody('nonexistent_key');
      expect(result).toBe(false);
    });

    it('should emit removeBody event', () => {
      physics.addWall(5, 0, 10, 1, 1, 1);
      const callback = vi.fn();
      physics.on('physics:removeBody', callback);

      physics.removeBody('wall_5_0_10');
      expect(callback).toHaveBeenCalledWith({ key: 'wall_5_0_10' });
    });
  });

  describe('removeCircle', () => {
    beforeEach(() => {
      physics.init();
    });

    it('should remove circle by position', () => {
      physics.addCircle(5, 2, 10, 0.5);
      expect(physics.bodies.size).toBe(1);

      const result = physics.removeCircle({ position: { x: 5, y: 2, z: 10 } });
      expect(result).toBe(true);
      expect(physics.bodies.size).toBe(0);
    });

    it('should handle small position tolerance', () => {
      physics.addCircle(5, 2, 10, 0.5);

      // Position slightly off (within 0.1 tolerance)
      const result = physics.removeCircle({ position: { x: 5.05, y: 2.02, z: 10.01 } });
      expect(result).toBe(true);
    });

    it('should return false if no matching circle', () => {
      physics.addCircle(5, 2, 10, 0.5);

      const result = physics.removeCircle({ position: { x: 100, y: 100, z: 100 } });
      expect(result).toBe(false);
    });

    it('should return false if position is null', () => {
      const result = physics.removeCircle({ position: null });
      expect(result).toBe(false);
    });
  });

  describe('removeNPC', () => {
    beforeEach(() => {
      physics.init();
    });

    it('should remove NPC by position', () => {
      physics.addNPC(10, 1, 20, 1, 2, 1);
      expect(physics.bodies.size).toBe(1);

      const result = physics.removeNPC({ position: { x: 10, y: 1, z: 20 } });
      expect(result).toBe(true);
      expect(physics.bodies.size).toBe(0);
    });

    it('should handle larger position tolerance for NPCs', () => {
      physics.addNPC(10, 1, 20, 1, 2, 1);

      // NPCs can move, so larger tolerance (1.0)
      const result = physics.removeNPC({ position: { x: 10.5, y: 1.2, z: 20.2 } });
      expect(result).toBe(true);
    });

    it('should return false if no matching NPC', () => {
      physics.addNPC(10, 1, 20, 1, 2, 1);

      const result = physics.removeNPC({ position: { x: 0, y: 0, z: 0 } });
      expect(result).toBe(false);
    });
  });

  // ==========================================================================
  // Physics Update
  // ==========================================================================
  describe('update', () => {
    beforeEach(() => {
      physics.init();
    });

    it('should step physics world', () => {
      const stepSpy = vi.spyOn(physics.world, 'step');
      physics.update(0.016);
      expect(stepSpy).toHaveBeenCalled();
    });

    it('should use correct time parameters', () => {
      const stepSpy = vi.spyOn(physics.world, 'step');
      physics.update(0.016);
      expect(stepSpy).toHaveBeenCalledWith(
        DEFAULT_CONFIG.fixedTimeStep,
        0.016,
        DEFAULT_CONFIG.maxSubSteps
      );
    });

    it('should emit update event', () => {
      const callback = vi.fn();
      physics.on('physics:update', callback);
      physics.update(0.016);
      expect(callback).toHaveBeenCalledWith({ deltaTime: 0.016 });
    });

    it('should not crash if not initialized', () => {
      const uninitPhysics = new PhysicsWorld({ CANNON: mockCannon });
      expect(() => uninitPhysics.update(0.016)).not.toThrow();
    });
  });

  describe('NPC constraint updates', () => {
    beforeEach(() => {
      physics.init();
    });

    it('should correct tipped NPCs', () => {
      const npc = physics.addNPC(0, 1, 0, 1, 2, 1);
      npc.quaternion.x = 0.5; // Tipped over

      physics.update(0.016);

      expect(npc.quaternion.x).toBe(0);
    });

    it('should keep NPCs above ground', () => {
      const npc = physics.addNPC(0, 0.2, 0, 1, 2, 1); // Below 0.5
      npc.position.y = 0.2;
      npc.velocity.y = -5;

      physics.update(0.016);

      expect(npc.position.y).toBe(0.5);
      expect(npc.velocity.y).toBe(0);
    });
  });

  // ==========================================================================
  // Raycasting
  // ==========================================================================
  describe('raycast', () => {
    beforeEach(() => {
      physics.init();
    });

    it('should return hasHit false when no hit', () => {
      const result = physics.raycast({ x: 0, y: 0, z: 0 }, { x: 10, y: 0, z: 0 });
      expect(result.hasHit).toBe(false);
    });

    it('should return hit information when ray hits', () => {
      // Configure mock to return a hit
      physics.world._setRaycastResult({
        hasHit: true,
        hitPointWorld: { x: 5, y: 0, z: 0 },
        hitNormalWorld: { x: -1, y: 0, z: 0 },
        body: { id: 'test' },
        distance: 5,
      });

      const result = physics.raycast({ x: 0, y: 0, z: 0 }, { x: 10, y: 0, z: 0 });

      expect(result.hasHit).toBe(true);
      expect(result.point).toEqual({ x: 5, y: 0, z: 0 });
      expect(result.normal).toEqual({ x: -1, y: 0, z: 0 });
      expect(result.distance).toBe(5);
      expect(result.body).toBeDefined();
    });

    it('should return hasHit false if not initialized', () => {
      const uninitPhysics = new PhysicsWorld({ CANNON: mockCannon });
      const result = uninitPhysics.raycast({ x: 0, y: 0, z: 0 }, { x: 10, y: 0, z: 0 });
      expect(result.hasHit).toBe(false);
    });
  });

  // ==========================================================================
  // Position Validation
  // ==========================================================================
  describe('isPositionValid', () => {
    beforeEach(() => {
      physics.init();
    });

    it('should return true for open space', () => {
      expect(physics.isPositionValid(0, 0, 0)).toBe(true);
    });

    it('should return false near buildings', () => {
      physics.addBuilding(5, 5, 5, 4, 4, 4);

      // Position inside building bounds
      expect(physics.isPositionValid(5, 5, 5)).toBe(false);
    });

    it('should return false near walls', () => {
      physics.addWall(10, 2, 10, 20, 4, 0.5);

      expect(physics.isPositionValid(10, 2, 10)).toBe(false);
    });

    it('should return true if not initialized', () => {
      const uninitPhysics = new PhysicsWorld({ CANNON: mockCannon });
      expect(uninitPhysics.isPositionValid(0, 0, 0)).toBe(true);
    });

    it('should accept custom radius', () => {
      physics.addBuilding(5, 5, 5, 2, 2, 2);

      // With small radius, position outside but near building
      expect(physics.isPositionValid(8, 5, 5, 0.1)).toBe(true);
    });
  });

  describe('getGroundHeight', () => {
    beforeEach(() => {
      physics.init();
    });

    it('should return 0 for flat ground', () => {
      expect(physics.getGroundHeight(0, 0)).toBe(0);
      expect(physics.getGroundHeight(100, 50)).toBe(0);
      expect(physics.getGroundHeight(-50, -100)).toBe(0);
    });
  });

  // ==========================================================================
  // Body Queries
  // ==========================================================================
  describe('getBodiesOfType', () => {
    beforeEach(() => {
      physics.init();
      physics.addBuilding(0, 0, 0, 1, 1, 1);
      physics.addBuilding(5, 0, 5, 1, 1, 1);
      physics.addWall(10, 0, 0, 10, 2, 0.5);
      physics.addCircle(2, 1, 2, 0.5);
      physics.addNPC(3, 1, 3, 1, 2, 1);
    });

    it('should return all buildings', () => {
      const buildings = physics.getBodiesOfType('building');
      expect(buildings.length).toBe(2);
    });

    it('should return all walls', () => {
      const walls = physics.getBodiesOfType('wall');
      expect(walls.length).toBe(1);
    });

    it('should return empty array for no matches', () => {
      const props = physics.getBodiesOfType('prop');
      expect(props.length).toBe(0);
    });

    it('should include key and body in results', () => {
      const buildings = physics.getBodiesOfType('building');
      expect(buildings[0]).toHaveProperty('key');
      expect(buildings[0]).toHaveProperty('body');
    });
  });

  describe('getBodyCounts', () => {
    beforeEach(() => {
      physics.init();
    });

    it('should return zero counts initially', () => {
      const counts = physics.getBodyCounts();
      expect(counts.building).toBe(0);
      expect(counts.wall).toBe(0);
      expect(counts.prop).toBe(0);
      expect(counts.circle).toBe(0);
      expect(counts.npc).toBe(0);
      expect(counts.total).toBe(0);
    });

    it('should count bodies correctly', () => {
      physics.addBuilding(0, 0, 0, 1, 1, 1);
      physics.addBuilding(5, 0, 0, 1, 1, 1);
      physics.addWall(0, 0, 10, 10, 2, 0.5);
      physics.addCircle(1, 1, 1, 0.5);
      physics.addCircle(2, 1, 2, 0.5);
      physics.addCircle(3, 1, 3, 0.5);
      physics.addNPC(10, 1, 10, 1, 2, 1);

      const counts = physics.getBodyCounts();
      expect(counts.building).toBe(2);
      expect(counts.wall).toBe(1);
      expect(counts.prop).toBe(0);
      expect(counts.circle).toBe(3);
      expect(counts.npc).toBe(1);
      expect(counts.total).toBe(7);
    });
  });

  // ==========================================================================
  // Reset
  // ==========================================================================
  describe('reset', () => {
    beforeEach(() => {
      physics.init();
      physics.addGround();
      physics.addPlayer(0, 2, 5);
      physics.addBuilding(10, 5, 10, 5, 10, 5);
      physics.addCircle(5, 1, 5, 0.5);
      physics.addCircle(6, 1, 6, 0.5);
      physics.addNPC(20, 1, 20, 1, 2, 1);
    });

    it('should remove circle bodies', () => {
      expect(physics.getBodyCounts().circle).toBe(2);
      physics.reset();
      expect(physics.getBodyCounts().circle).toBe(0);
    });

    it('should remove NPC bodies', () => {
      expect(physics.getBodyCounts().npc).toBe(1);
      physics.reset();
      expect(physics.getBodyCounts().npc).toBe(0);
    });

    it('should keep building bodies', () => {
      expect(physics.getBodyCounts().building).toBe(1);
      physics.reset();
      expect(physics.getBodyCounts().building).toBe(1);
    });

    it('should reset player position', () => {
      physics.playerBody.position.set(100, 50, 100);
      physics.reset();

      expect(physics.playerBody.position.x).toBe(0);
      expect(physics.playerBody.position.y).toBe(2);
      expect(physics.playerBody.position.z).toBe(5);
    });

    it('should reset player velocity', () => {
      physics.playerBody.velocity.set(10, 5, 10);
      physics.reset();

      expect(physics.playerBody.velocity.x).toBe(0);
      expect(physics.playerBody.velocity.y).toBe(0);
      expect(physics.playerBody.velocity.z).toBe(0);
    });

    it('should emit reset event', () => {
      const callback = vi.fn();
      physics.on('physics:reset', callback);
      physics.reset();
      expect(callback).toHaveBeenCalled();
    });

    it('should not crash without initialized world', () => {
      const uninitPhysics = new PhysicsWorld({ CANNON: mockCannon });
      expect(() => uninitPhysics.reset()).not.toThrow();
    });
  });

  // ==========================================================================
  // State
  // ==========================================================================
  describe('getState', () => {
    it('should return uninitialized state', () => {
      const state = physics.getState();

      expect(state.initialized).toBe(false);
      expect(state.available).toBe(false);
      expect(state.hasGround).toBe(false);
      expect(state.hasPlayer).toBe(false);
      expect(state.playerPosition).toBeNull();
    });

    it('should return initialized state', () => {
      physics.init();
      physics.addGround();
      physics.addPlayer(5, 2, 10);
      physics.addBuilding(0, 0, 0, 1, 1, 1);

      const state = physics.getState();

      expect(state.initialized).toBe(true);
      expect(state.available).toBe(true);
      expect(state.hasGround).toBe(true);
      expect(state.hasPlayer).toBe(true);
      expect(state.playerPosition).toEqual({ x: 5, y: 2, z: 10 });
      expect(state.bodyCounts.building).toBe(1);
    });
  });

  // ==========================================================================
  // Constants Export
  // ==========================================================================
  describe('exported constants', () => {
    it('should export DEFAULT_CONFIG', () => {
      expect(DEFAULT_CONFIG).toBeDefined();
      expect(DEFAULT_CONFIG.gravity).toBe(-25);
      expect(DEFAULT_CONFIG.solverIterations).toBe(10);
    });

    it('should export MATERIAL_PROPERTIES', () => {
      expect(MATERIAL_PROPERTIES).toBeDefined();
      expect(MATERIAL_PROPERTIES.groundPlayer).toBeDefined();
      expect(MATERIAL_PROPERTIES.groundPlayer.friction).toBe(0.4);
    });

    it('should export BodyType', () => {
      expect(BodyType).toBeDefined();
      expect(BodyType.GROUND).toBe('ground');
      expect(BodyType.PLAYER).toBe('player');
      expect(BodyType.BUILDING).toBe('building');
      expect(BodyType.WALL).toBe('wall');
      expect(BodyType.PROP).toBe('prop');
      expect(BodyType.CIRCLE).toBe('circle');
      expect(BodyType.NPC).toBe('npc');
    });
  });
});
