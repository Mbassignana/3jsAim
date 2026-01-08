/**
 * Unit tests for GameEntity abstract base classes
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { GameEntity, EntityManager, EntityState } from '@game/GameEntity.js';
import { getEventBus, resetEventBus, GameEvents } from '@utils/EventEmitter.js';

// ==========================================================================
// Concrete Test Implementations
// ==========================================================================

/**
 * Concrete implementation for testing GameEntity
 */
class TestEntity extends GameEntity {
  constructor(options) {
    super(options);
    this.initCalled = false;
    this.updateCalled = false;
    this.destroyCalled = false;
    this.updateCount = 0;
    this.totalDeltaTime = 0;
  }

  init() {
    this.initCalled = true;
    this.mesh = {
      position: { ...this.position },
      userData: { id: this.id, type: this.type },
    };
  }

  update(deltaTime) {
    this.updateCalled = true;
    this.updateCount++;
    this.totalDeltaTime += deltaTime;
  }

  destroy() {
    this.destroyCalled = true;
    this.mesh = null;
  }
}

/**
 * Concrete implementation for testing EntityManager
 */
class TestEntityManager extends EntityManager {
  constructor(options) {
    super({
      ...options,
      entityType: 'test',
    });
    this.createdEntities = [];
  }

  _createEntity(id, position, options = {}) {
    const entity = new TestEntity({
      id,
      type: 'test',
      position,
      userData: options.userData || {},
    });
    this.createdEntities.push(entity);
    return entity;
  }
}

/**
 * EntityManager with expiration
 */
class ExpiringEntityManager extends TestEntityManager {
  constructor(options) {
    super(options);
    this.maxAge = options.maxAge || 1000;
  }

  _shouldExpire(entity) {
    return entity.getAge() > this.maxAge;
  }
}

// ==========================================================================
// Tests
// ==========================================================================

describe('GameEntity', () => {
  describe('Abstract class enforcement', () => {
    it('should throw when instantiating GameEntity directly', () => {
      expect(() => new GameEntity({ id: 'test', type: 'test', position: { x: 0, y: 0, z: 0 } })).toThrow(
        'GameEntity is abstract'
      );
    });

    it('should allow instantiation of concrete subclass', () => {
      const entity = new TestEntity({ id: 'test', type: 'test', position: { x: 0, y: 0, z: 0 } });
      expect(entity).toBeInstanceOf(GameEntity);
    });
  });

  describe('constructor', () => {
    let entity;

    beforeEach(() => {
      entity = new TestEntity({
        id: 'entity_1',
        type: 'test_type',
        position: { x: 10, y: 20, z: 30 },
        userData: { custom: 'data' },
      });
    });

    it('should set id', () => {
      expect(entity.id).toBe('entity_1');
    });

    it('should set type', () => {
      expect(entity.type).toBe('test_type');
    });

    it('should copy position', () => {
      expect(entity.position).toEqual({ x: 10, y: 20, z: 30 });
    });

    it('should set spawn time', () => {
      expect(entity.spawnTime).toBeCloseTo(Date.now(), -2);
    });

    it('should start in SPAWNING state', () => {
      expect(entity.state).toBe(EntityState.SPAWNING);
    });

    it('should copy userData', () => {
      expect(entity.userData).toEqual({ custom: 'data' });
    });

    it('should initialize mesh as null', () => {
      expect(entity.mesh).toBeNull();
    });
  });

  describe('distanceTo', () => {
    let entity;

    beforeEach(() => {
      entity = new TestEntity({
        id: 'e1',
        type: 'test',
        position: { x: 0, y: 0, z: 0 },
      });
    });

    it('should calculate 2D distance correctly', () => {
      const distance = entity.distanceTo({ x: 3, y: 0, z: 4 });
      expect(distance).toBe(5);
    });

    it('should calculate 3D distance correctly', () => {
      const distance = entity.distanceTo({ x: 1, y: 2, z: 2 });
      expect(distance).toBe(3);
    });

    it('should handle missing y coordinate', () => {
      const distance = entity.distanceTo({ x: 3, z: 4 });
      expect(distance).toBe(5);
    });

    it('should return 0 for same position', () => {
      const distance = entity.distanceTo({ x: 0, y: 0, z: 0 });
      expect(distance).toBe(0);
    });
  });

  describe('isInRange', () => {
    let entity;

    beforeEach(() => {
      entity = new TestEntity({
        id: 'e1',
        type: 'test',
        position: { x: 0, y: 0, z: 0 },
      });
    });

    it('should return true when within range', () => {
      expect(entity.isInRange({ x: 3, y: 0, z: 4 }, 10)).toBe(true);
    });

    it('should return false when outside range', () => {
      expect(entity.isInRange({ x: 10, y: 0, z: 10 }, 5)).toBe(false);
    });

    it('should return true when exactly at range', () => {
      expect(entity.isInRange({ x: 5, y: 0, z: 0 }, 5)).toBe(true);
    });
  });

  describe('getAge', () => {
    it('should return age in milliseconds', async () => {
      const entity = new TestEntity({
        id: 'e1',
        type: 'test',
        position: { x: 0, y: 0, z: 0 },
      });

      // Wait a bit
      await new Promise((r) => setTimeout(r, 10));

      expect(entity.getAge()).toBeGreaterThanOrEqual(10);
    });
  });

  describe('isActive', () => {
    let entity;

    beforeEach(() => {
      entity = new TestEntity({
        id: 'e1',
        type: 'test',
        position: { x: 0, y: 0, z: 0 },
      });
    });

    it('should return false when SPAWNING', () => {
      entity.state = EntityState.SPAWNING;
      expect(entity.isActive()).toBe(false);
    });

    it('should return true when ACTIVE', () => {
      entity.state = EntityState.ACTIVE;
      expect(entity.isActive()).toBe(true);
    });

    it('should return false when DESTROYING', () => {
      entity.state = EntityState.DESTROYING;
      expect(entity.isActive()).toBe(false);
    });

    it('should return false when DESTROYED', () => {
      entity.state = EntityState.DESTROYED;
      expect(entity.isActive()).toBe(false);
    });
  });

  describe('setPosition', () => {
    let entity;

    beforeEach(() => {
      entity = new TestEntity({
        id: 'e1',
        type: 'test',
        position: { x: 0, y: 0, z: 0 },
      });
      entity.init();
    });

    it('should update entity position', () => {
      entity.setPosition(10, 20, 30);
      expect(entity.position).toEqual({ x: 10, y: 20, z: 30 });
    });

    it('should sync mesh position', () => {
      entity.setPosition(10, 20, 30);
      expect(entity.mesh.position).toEqual({ x: 10, y: 20, z: 30 });
    });
  });

  describe('getBounds', () => {
    it('should return default 1x1x1 bounding box', () => {
      const entity = new TestEntity({
        id: 'e1',
        type: 'test',
        position: { x: 5, y: 10, z: 15 },
      });

      const bounds = entity.getBounds();

      expect(bounds.min).toEqual({ x: 4.5, y: 9.5, z: 14.5 });
      expect(bounds.max).toEqual({ x: 5.5, y: 10.5, z: 15.5 });
    });
  });

  describe('toJSON', () => {
    it('should serialize entity data', () => {
      const entity = new TestEntity({
        id: 'e1',
        type: 'test',
        position: { x: 1, y: 2, z: 3 },
        userData: { foo: 'bar' },
      });
      entity.state = EntityState.ACTIVE;

      const json = entity.toJSON();

      expect(json).toEqual({
        id: 'e1',
        type: 'test',
        position: { x: 1, y: 2, z: 3 },
        spawnTime: expect.any(Number),
        state: EntityState.ACTIVE,
        userData: { foo: 'bar' },
      });
    });
  });

  describe('abstract methods', () => {
    let entity;

    beforeEach(() => {
      entity = new TestEntity({
        id: 'e1',
        type: 'test',
        position: { x: 0, y: 0, z: 0 },
      });
    });

    it('should call init()', () => {
      entity.init();
      expect(entity.initCalled).toBe(true);
    });

    it('should call update()', () => {
      entity.update(0.016);
      expect(entity.updateCalled).toBe(true);
      expect(entity.totalDeltaTime).toBeCloseTo(0.016);
    });

    it('should call destroy()', () => {
      entity.destroy();
      expect(entity.destroyCalled).toBe(true);
    });
  });
});

describe('EntityState', () => {
  it('should define all states', () => {
    expect(EntityState.SPAWNING).toBe('spawning');
    expect(EntityState.ACTIVE).toBe('active');
    expect(EntityState.DESTROYING).toBe('destroying');
    expect(EntityState.DESTROYED).toBe('destroyed');
  });
});

describe('EntityManager', () => {
  let manager;
  let mockScene;
  let mockPhysics;

  beforeEach(() => {
    resetEventBus();
    mockScene = {
      add: vi.fn(),
      remove: vi.fn(),
    };
    mockPhysics = {};
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Abstract class enforcement', () => {
    it('should throw when instantiating EntityManager directly', () => {
      expect(
        () =>
          new EntityManager({
            scene: mockScene,
            physicsWorld: mockPhysics,
            entityType: 'test',
          })
      ).toThrow('EntityManager is abstract');
    });
  });

  describe('constructor', () => {
    it('should throw without scene', () => {
      expect(
        () =>
          new TestEntityManager({
            physicsWorld: mockPhysics,
          })
      ).toThrow('requires a scene');
    });

    it('should throw without physicsWorld', () => {
      expect(
        () =>
          new TestEntityManager({
            scene: mockScene,
          })
      ).toThrow('requires a physicsWorld');
    });

    it('should accept valid options', () => {
      manager = new TestEntityManager({
        scene: mockScene,
        physicsWorld: mockPhysics,
      });
      expect(manager).toBeInstanceOf(EntityManager);
    });

    it('should set default config', () => {
      manager = new TestEntityManager({
        scene: mockScene,
        physicsWorld: mockPhysics,
      });
      expect(manager.config.maxEntities).toBe(10);
    });

    it('should merge custom config', () => {
      manager = new TestEntityManager({
        scene: mockScene,
        physicsWorld: mockPhysics,
        config: { maxEntities: 20 },
      });
      expect(manager.config.maxEntities).toBe(20);
    });
  });

  describe('spawn', () => {
    beforeEach(() => {
      manager = new TestEntityManager({
        scene: mockScene,
        physicsWorld: mockPhysics,
        config: { maxEntities: 5 },
      });
    });

    it('should spawn entity and return ID', () => {
      const id = manager.spawn();
      expect(id).toMatch(/^test_/);
    });

    it('should add entity to internal map', () => {
      const id = manager.spawn();
      expect(manager.has(id)).toBe(true);
    });

    it('should initialize entity', () => {
      const id = manager.spawn();
      const entity = manager.get(id);
      expect(entity.initCalled).toBe(true);
    });

    it('should set entity state to ACTIVE', () => {
      const id = manager.spawn();
      const entity = manager.get(id);
      expect(entity.state).toBe(EntityState.ACTIVE);
    });

    it('should add mesh to scene', () => {
      manager.spawn();
      expect(mockScene.add).toHaveBeenCalled();
    });

    it('should emit spawn event', () => {
      const handler = vi.fn();
      manager.on('test:spawn', handler);

      manager.spawn();

      expect(handler).toHaveBeenCalledWith(
        expect.objectContaining({
          id: expect.any(String),
          type: 'test',
          position: expect.any(Object),
        })
      );
    });

    it('should emit to global event bus', () => {
      const handler = vi.fn();
      getEventBus().on('test:spawn', handler);

      manager.spawn();

      expect(handler).toHaveBeenCalled();
    });

    it('should return null when at max entities', () => {
      for (let i = 0; i < 5; i++) {
        manager.spawn();
      }
      const id = manager.spawn();
      expect(id).toBeNull();
    });

    it('should respect spawn cooldown', () => {
      manager.config.spawnCooldown = 100;
      manager.spawn();
      const id = manager.spawn();
      expect(id).toBeNull();
    });
  });

  describe('spawnAt', () => {
    beforeEach(() => {
      manager = new TestEntityManager({
        scene: mockScene,
        physicsWorld: mockPhysics,
      });
    });

    it('should spawn at specific position', () => {
      const id = manager.spawnAt(10, 20, 30);
      const entity = manager.get(id);
      expect(entity.position).toEqual({ x: 10, y: 20, z: 30 });
    });
  });

  describe('spawnMultiple', () => {
    beforeEach(() => {
      manager = new TestEntityManager({
        scene: mockScene,
        physicsWorld: mockPhysics,
        config: { maxEntities: 5 },
      });
    });

    it('should spawn requested count', () => {
      const ids = manager.spawnMultiple(3);
      expect(ids).toHaveLength(3);
    });

    it('should stop at max entities', () => {
      const ids = manager.spawnMultiple(10);
      expect(ids).toHaveLength(5);
    });
  });

  describe('destroy', () => {
    beforeEach(() => {
      manager = new TestEntityManager({
        scene: mockScene,
        physicsWorld: mockPhysics,
      });
    });

    it('should destroy entity by ID', () => {
      const id = manager.spawn();
      const result = manager.destroy(id);
      expect(result).toBe(true);
      expect(manager.has(id)).toBe(false);
    });

    it('should return false for non-existent ID', () => {
      const result = manager.destroy('non_existent');
      expect(result).toBe(false);
    });

    it('should remove mesh from scene', () => {
      const id = manager.spawn();
      manager.destroy(id);
      expect(mockScene.remove).toHaveBeenCalled();
    });

    it('should call entity.destroy()', () => {
      const id = manager.spawn();
      const entity = manager.get(id);
      manager.destroy(id);
      expect(entity.destroyCalled).toBe(true);
    });

    it('should set state to DESTROYED', () => {
      const id = manager.spawn();
      const entity = manager.get(id);
      manager.destroy(id);
      expect(entity.state).toBe(EntityState.DESTROYED);
    });

    it('should emit destroy event', () => {
      const handler = vi.fn();
      manager.on('test:destroy', handler);

      const id = manager.spawn();
      manager.destroy(id);

      expect(handler).toHaveBeenCalledWith({ id });
    });
  });

  describe('destroyByMesh', () => {
    beforeEach(() => {
      manager = new TestEntityManager({
        scene: mockScene,
        physicsWorld: mockPhysics,
      });
    });

    it('should destroy entity by mesh reference', () => {
      const id = manager.spawn();
      const mesh = manager.getMesh(id);
      const result = manager.destroyByMesh(mesh);
      expect(result).toBe(true);
      expect(manager.has(id)).toBe(false);
    });

    it('should return false for unknown mesh', () => {
      const result = manager.destroyByMesh({ userData: { id: 'unknown' } });
      expect(result).toBe(false);
    });
  });

  describe('update', () => {
    beforeEach(() => {
      manager = new TestEntityManager({
        scene: mockScene,
        physicsWorld: mockPhysics,
      });
    });

    it('should update all active entities', () => {
      const id1 = manager.spawn();
      const id2 = manager.spawn();

      manager.update(0.016);

      expect(manager.get(id1).updateCalled).toBe(true);
      expect(manager.get(id2).updateCalled).toBe(true);
    });

    it('should pass deltaTime to entities', () => {
      const id = manager.spawn();
      manager.update(0.5);
      expect(manager.get(id).totalDeltaTime).toBeCloseTo(0.5);
    });
  });

  describe('update with expiration', () => {
    it('should remove expired entities', async () => {
      const expiringManager = new ExpiringEntityManager({
        scene: mockScene,
        physicsWorld: mockPhysics,
        maxAge: 10, // 10ms
      });

      const id = expiringManager.spawn();

      // Wait for entity to expire
      await new Promise((r) => setTimeout(r, 15));

      expiringManager.update(0.016);

      expect(expiringManager.has(id)).toBe(false);
    });
  });

  describe('reset', () => {
    beforeEach(() => {
      manager = new TestEntityManager({
        scene: mockScene,
        physicsWorld: mockPhysics,
      });
    });

    it('should destroy all entities', () => {
      manager.spawnMultiple(3);
      expect(manager.getCount()).toBe(3);

      manager.reset();

      expect(manager.getCount()).toBe(0);
    });
  });

  describe('getters', () => {
    beforeEach(() => {
      manager = new TestEntityManager({
        scene: mockScene,
        physicsWorld: mockPhysics,
      });
    });

    it('get() should return entity by ID', () => {
      const id = manager.spawn();
      const entity = manager.get(id);
      expect(entity).toBeInstanceOf(TestEntity);
    });

    it('getMesh() should return mesh by ID', () => {
      const id = manager.spawn();
      const mesh = manager.getMesh(id);
      expect(mesh.userData.id).toBe(id);
    });

    it('getCount() should return entity count', () => {
      manager.spawnMultiple(3);
      expect(manager.getCount()).toBe(3);
    });

    it('getIds() should return all IDs', () => {
      const id1 = manager.spawn();
      const id2 = manager.spawn();
      const ids = manager.getIds();
      expect(ids).toContain(id1);
      expect(ids).toContain(id2);
    });

    it('getAll() should return all entities', () => {
      manager.spawnMultiple(2);
      const entities = manager.getAll();
      expect(entities).toHaveLength(2);
      expect(entities[0]).toBeInstanceOf(TestEntity);
    });

    it('has() should check existence', () => {
      const id = manager.spawn();
      expect(manager.has(id)).toBe(true);
      expect(manager.has('unknown')).toBe(false);
    });
  });

  describe('getEntitiesNear', () => {
    beforeEach(() => {
      manager = new TestEntityManager({
        scene: mockScene,
        physicsWorld: mockPhysics,
      });
    });

    it('should find entities within radius', () => {
      manager.spawnAt(0, 0, 0);
      manager.spawnAt(5, 0, 0);
      manager.spawnAt(20, 0, 0);

      const near = manager.getEntitiesNear({ x: 0, y: 0, z: 0 }, 10);

      expect(near).toHaveLength(2);
    });

    it('should sort by distance', () => {
      manager.spawnAt(10, 0, 0);
      manager.spawnAt(5, 0, 0);
      manager.spawnAt(15, 0, 0);

      const near = manager.getEntitiesNear({ x: 0, y: 0, z: 0 }, 20);

      expect(near[0].position.x).toBe(5);
      expect(near[1].position.x).toBe(10);
      expect(near[2].position.x).toBe(15);
    });
  });

  describe('forEach', () => {
    beforeEach(() => {
      manager = new TestEntityManager({
        scene: mockScene,
        physicsWorld: mockPhysics,
      });
    });

    it('should iterate over all entities', () => {
      manager.spawnMultiple(3);
      const visited = [];

      manager.forEach((entity, id) => {
        visited.push(id);
      });

      expect(visited).toHaveLength(3);
    });
  });

  describe('canSpawn', () => {
    beforeEach(() => {
      manager = new TestEntityManager({
        scene: mockScene,
        physicsWorld: mockPhysics,
        config: { maxEntities: 2, spawnCooldown: 0 },
      });
    });

    it('should return true when under limit', () => {
      expect(manager.canSpawn()).toBe(true);
    });

    it('should return false when at limit', () => {
      manager.spawnMultiple(2);
      expect(manager.canSpawn()).toBe(false);
    });
  });

  describe('sceneManager integration', () => {
    it('should use sceneManager for spawn positions', () => {
      const mockSceneManager = {
        getSafeSpawnPosition: vi.fn(() => ({ x: 100, y: 0, z: 200 })),
      };

      manager = new TestEntityManager({
        scene: mockScene,
        physicsWorld: mockPhysics,
        sceneManager: mockSceneManager,
      });

      const id = manager.spawn();
      const entity = manager.get(id);

      expect(mockSceneManager.getSafeSpawnPosition).toHaveBeenCalled();
      expect(entity.position.x).toBe(100);
      expect(entity.position.z).toBe(200);
    });
  });
});

describe('GameEvents', () => {
  it('should define entity events', () => {
    expect(GameEvents.ENTITY_SPAWN).toBe('entity:spawn');
    expect(GameEvents.ENTITY_DESTROY).toBe('entity:destroy');
    expect(GameEvents.ENTITY_UPDATE).toBe('entity:update');
  });
});
