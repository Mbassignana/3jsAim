/**
 * Unit tests for CircleManager
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { CircleManager } from '@/game/CircleManager.js';
import { GameEvents, resetEventBus, getEventBus } from '@/utils/EventEmitter.js';

// Mock scene
function createMockScene() {
  return {
    add: vi.fn(),
    remove: vi.fn(),
  };
}

// Mock physics world
function createMockPhysicsWorld() {
  return {
    addCircle: vi.fn(),
    removeCircle: vi.fn(),
  };
}

// Mock scene manager
function createMockSceneManager() {
  return {
    getSafeSpawnPosition: vi.fn(() => ({
      x: Math.random() * 20 - 10,
      z: Math.random() * 20 - 10,
    })),
  };
}

describe('CircleManager', () => {
  let manager;
  let mockScene;
  let mockPhysicsWorld;
  let mockSceneManager;

  beforeEach(() => {
    resetEventBus();
    mockScene = createMockScene();
    mockPhysicsWorld = createMockPhysicsWorld();
    mockSceneManager = createMockSceneManager();
    manager = new CircleManager({
      scene: mockScene,
      physicsWorld: mockPhysicsWorld,
      sceneManager: mockSceneManager,
    });
  });

  describe('constructor', () => {
    it('should throw if scene is missing', () => {
      expect(() => new CircleManager({ physicsWorld: mockPhysicsWorld })).toThrow(
        'requires a scene'
      );
    });

    it('should throw if physicsWorld is missing', () => {
      expect(() => new CircleManager({ scene: mockScene })).toThrow(
        'requires a physicsWorld'
      );
    });

    it('should initialize with default config', () => {
      expect(manager.config.maxCount).toBe(12);
      expect(manager.config.colors).toBeDefined();
      expect(manager.config.colors.length).toBeGreaterThan(0);
    });

    it('should accept custom config', () => {
      const customManager = new CircleManager({
        scene: mockScene,
        physicsWorld: mockPhysicsWorld,
        config: { maxCount: 20 },
      });
      expect(customManager.config.maxCount).toBe(20);
    });
  });

  describe('init', () => {
    it('should initialize geometry and materials', () => {
      manager.init();
      expect(manager._geometry).toBeDefined();
      expect(manager._materials).toBeDefined();
      expect(manager._initialized).toBe(true);
    });

    it('should not re-initialize if already initialized', () => {
      manager.init();
      const geometry = manager._geometry;
      manager.init();
      expect(manager._geometry).toBe(geometry);
    });
  });

  describe('spawnCircle', () => {
    it('should spawn a circle and return its ID', () => {
      const id = manager.spawnCircle();
      expect(id).toBeDefined();
      expect(typeof id).toBe('string');
      expect(manager.getCircleCount()).toBe(1);
    });

    it('should add circle to scene', () => {
      manager.spawnCircle();
      expect(mockScene.add).toHaveBeenCalledTimes(1);
    });

    it('should add physics body', () => {
      manager.spawnCircle();
      expect(mockPhysicsWorld.addCircle).toHaveBeenCalledTimes(1);
    });

    it('should use scene manager for spawn position', () => {
      manager.spawnCircle();
      expect(mockSceneManager.getSafeSpawnPosition).toHaveBeenCalled();
    });

    it('should not spawn beyond maxCount', () => {
      const config = { maxCount: 3 };
      manager = new CircleManager({
        scene: mockScene,
        physicsWorld: mockPhysicsWorld,
        config,
      });

      manager.spawnCircle();
      manager.spawnCircle();
      manager.spawnCircle();
      const id = manager.spawnCircle();

      expect(id).toBeNull();
      expect(manager.getCircleCount()).toBe(3);
    });

    it('should emit CIRCLE_SPAWN event', () => {
      const callback = vi.fn();
      manager.on(GameEvents.CIRCLE_SPAWN, callback);
      manager.spawnCircle();
      expect(callback).toHaveBeenCalledTimes(1);
      expect(callback).toHaveBeenCalledWith(
        expect.objectContaining({
          id: expect.any(String),
          position: expect.any(Object),
        })
      );
    });
  });

  describe('spawnCircles', () => {
    it('should spawn multiple circles', () => {
      const ids = manager.spawnCircles(5);
      expect(ids.length).toBe(5);
      expect(manager.getCircleCount()).toBe(5);
    });

    it('should respect maxCount', () => {
      manager = new CircleManager({
        scene: mockScene,
        physicsWorld: mockPhysicsWorld,
        config: { maxCount: 3 },
      });

      const ids = manager.spawnCircles(10);
      expect(ids.length).toBe(3);
      expect(manager.getCircleCount()).toBe(3);
    });
  });

  describe('spawnCircleAt', () => {
    it('should spawn at specific position', () => {
      const id = manager.spawnCircleAt(5, 3, -2);
      const data = manager.getCircleData(id);
      expect(data.position.x).toBe(5);
      expect(data.position.y).toBe(3);
      expect(data.position.z).toBe(-2);
    });

    it('should accept specific color index', () => {
      const id = manager.spawnCircleAt(0, 0, 0, 3);
      const data = manager.getCircleData(id);
      expect(data.colorIndex).toBe(3);
    });
  });

  describe('destroyCircle', () => {
    it('should destroy a circle by ID', () => {
      const id = manager.spawnCircle();
      const result = manager.destroyCircle(id);
      expect(result).toBe(true);
      expect(manager.getCircleCount()).toBe(0);
    });

    it('should remove from scene', () => {
      const id = manager.spawnCircle();
      manager.destroyCircle(id);
      expect(mockScene.remove).toHaveBeenCalled();
    });

    it('should remove physics body', () => {
      const id = manager.spawnCircle();
      manager.destroyCircle(id);
      expect(mockPhysicsWorld.removeCircle).toHaveBeenCalled();
    });

    it('should emit CIRCLE_DESTROY event', () => {
      const callback = vi.fn();
      manager.on(GameEvents.CIRCLE_DESTROY, callback);
      const id = manager.spawnCircle();
      manager.destroyCircle(id);
      expect(callback).toHaveBeenCalledWith({ id });
    });

    it('should return false for non-existent ID', () => {
      const result = manager.destroyCircle('fake_id');
      expect(result).toBe(false);
    });
  });

  describe('destroyCircleByMesh', () => {
    it('should destroy circle by mesh reference', () => {
      const id = manager.spawnCircle();
      const mesh = manager.getCircle(id);
      const result = manager.destroyCircleByMesh(mesh);
      expect(result).toBe(true);
      expect(manager.getCircleCount()).toBe(0);
    });
  });

  describe('update', () => {
    it('should update circle animations', () => {
      const id = manager.spawnCircle();
      const mesh = manager.getCircle(id);
      const initialY = mesh.position.y;

      // Update with some delta time
      manager.update(0.016);

      // Position should have changed slightly due to float animation
      expect(mesh.position.y).not.toBe(initialY);
    });

    it('should auto-despawn expired circles', () => {
      const id = manager.spawnCircleAt(0, 5, 0);
      const data = manager.getCircleData(id);

      // Manually set spawn time to be old
      data.spawnTime = Date.now() - manager.config.circleLifetime - 1000;

      manager.update(0.016);
      expect(manager.getCircleCount()).toBe(0);
    });
  });

  describe('reset', () => {
    it('should remove all circles', () => {
      manager.spawnCircles(5);
      expect(manager.getCircleCount()).toBe(5);
      manager.reset();
      expect(manager.getCircleCount()).toBe(0);
    });

    it('should call scene.remove for each circle', () => {
      manager.spawnCircles(3);
      manager.reset();
      expect(mockScene.remove).toHaveBeenCalledTimes(3);
    });
  });

  describe('getCircleCount', () => {
    it('should return correct count', () => {
      expect(manager.getCircleCount()).toBe(0);
      manager.spawnCircle();
      expect(manager.getCircleCount()).toBe(1);
      manager.spawnCircle();
      expect(manager.getCircleCount()).toBe(2);
    });
  });

  describe('getCircleIds', () => {
    it('should return array of IDs', () => {
      manager.spawnCircles(3);
      const ids = manager.getCircleIds();
      expect(ids).toHaveLength(3);
      ids.forEach((id) => {
        expect(typeof id).toBe('string');
      });
    });
  });

  describe('getCircle', () => {
    it('should return circle mesh by ID', () => {
      const id = manager.spawnCircle();
      const mesh = manager.getCircle(id);
      expect(mesh).toBeDefined();
      expect(mesh.userData.type).toBe('circle');
    });

    it('should return undefined for non-existent ID', () => {
      const mesh = manager.getCircle('fake_id');
      expect(mesh).toBeUndefined();
    });
  });

  describe('getCirclesNear', () => {
    it('should find circles within radius', () => {
      manager.spawnCircleAt(0, 5, 0);
      manager.spawnCircleAt(2, 5, 0);
      manager.spawnCircleAt(10, 5, 0);

      const nearby = manager.getCirclesNear({ x: 0, y: 5, z: 0 }, 5);
      expect(nearby).toHaveLength(2);
    });

    it('should return empty array if no circles nearby', () => {
      manager.spawnCircleAt(100, 5, 100);
      const nearby = manager.getCirclesNear({ x: 0, y: 0, z: 0 }, 5);
      expect(nearby).toHaveLength(0);
    });
  });

  describe('event emission to global bus', () => {
    it('should emit spawn events to global event bus', () => {
      const callback = vi.fn();
      getEventBus().on(GameEvents.CIRCLE_SPAWN, callback);
      manager.spawnCircle();
      expect(callback).toHaveBeenCalled();
    });

    it('should emit destroy events to global event bus', () => {
      const callback = vi.fn();
      getEventBus().on(GameEvents.CIRCLE_DESTROY, callback);
      const id = manager.spawnCircle();
      manager.destroyCircle(id);
      expect(callback).toHaveBeenCalled();
    });
  });

  describe('circle data', () => {
    it('should store animation parameters', () => {
      const id = manager.spawnCircle();
      const data = manager.getCircleData(id);
      expect(data.floatOffset).toBeDefined();
      expect(data.floatSpeed).toBeDefined();
      expect(data.floatAmplitude).toBeDefined();
      expect(data.rotationSpeed).toBeDefined();
    });

    it('should store spawn time', () => {
      const before = Date.now();
      const id = manager.spawnCircle();
      const after = Date.now();
      const data = manager.getCircleData(id);
      expect(data.spawnTime).toBeGreaterThanOrEqual(before);
      expect(data.spawnTime).toBeLessThanOrEqual(after);
    });
  });
});

describe('CircleManager without sceneManager', () => {
  it('should spawn with random positions', () => {
    const manager = new CircleManager({
      scene: createMockScene(),
      physicsWorld: createMockPhysicsWorld(),
    });

    const id = manager.spawnCircle();
    const data = manager.getCircleData(id);
    expect(data.position.x).toBeDefined();
    expect(data.position.y).toBeDefined();
    expect(data.position.z).toBeDefined();
  });
});
