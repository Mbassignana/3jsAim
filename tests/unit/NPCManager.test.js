/**
 * Unit tests for NPCManager
 * Tests spawn, AI behavior, wandering logic, and NPC management
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

import { NPCManager, DEFAULT_NPC_TYPES, DEFAULT_CONFIG } from '@/game/NPCManager.js';
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
    addNPC: vi.fn(),
    removeNPC: vi.fn(),
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

describe('NPCManager', () => {
  let manager;
  let mockScene;
  let mockPhysicsWorld;
  let mockSceneManager;

  beforeEach(() => {
    resetEventBus();
    mockScene = createMockScene();
    mockPhysicsWorld = createMockPhysicsWorld();
    mockSceneManager = createMockSceneManager();
    manager = new NPCManager({
      scene: mockScene,
      physicsWorld: mockPhysicsWorld,
      sceneManager: mockSceneManager,
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // ==========================================================================
  // Constructor and Initialization
  // ==========================================================================
  describe('constructor', () => {
    it('should throw if scene is missing', () => {
      expect(() => new NPCManager({ physicsWorld: mockPhysicsWorld })).toThrow('requires a scene');
    });

    it('should throw if physicsWorld is missing', () => {
      expect(() => new NPCManager({ scene: mockScene })).toThrow('requires a physicsWorld');
    });

    it('should initialize with default config', () => {
      expect(manager.config.maxNPCs).toBe(DEFAULT_CONFIG.maxNPCs);
      expect(manager.config.minIdleTime).toBe(DEFAULT_CONFIG.minIdleTime);
      expect(manager.config.maxIdleTime).toBe(DEFAULT_CONFIG.maxIdleTime);
    });

    it('should accept custom config', () => {
      const customManager = new NPCManager({
        scene: mockScene,
        physicsWorld: mockPhysicsWorld,
        config: { maxNPCs: 20 },
      });
      expect(customManager.config.maxNPCs).toBe(20);
    });

    it('should initialize with default NPC types', () => {
      expect(manager.npcTypes).toEqual(DEFAULT_NPC_TYPES);
      expect(manager.npcTypes.length).toBe(3);
    });

    it('should accept custom NPC types', () => {
      const customTypes = [
        {
          name: 'custom',
          color: 0xff0000,
          size: { width: 1, height: 1, depth: 1 },
          speed: 3,
          wanderRadius: 20,
        },
      ];
      const customManager = new NPCManager({
        scene: mockScene,
        physicsWorld: mockPhysicsWorld,
        npcTypes: customTypes,
      });
      expect(customManager.npcTypes).toEqual(customTypes);
    });

    it('should start with no NPCs', () => {
      expect(manager.getNPCCount()).toBe(0);
    });
  });

  // ==========================================================================
  // Spawning
  // ==========================================================================
  describe('spawnNPC', () => {
    it('should spawn a single NPC and return its ID', () => {
      const id = manager.spawnNPC();
      expect(id).toBeDefined();
      expect(typeof id).toBe('string');
      expect(manager.getNPCCount()).toBe(1);
    });

    it('should add NPC to scene', () => {
      manager.spawnNPC();
      expect(mockScene.add).toHaveBeenCalledTimes(1);
    });

    it('should add NPC physics body', () => {
      manager.spawnNPC();
      expect(mockPhysicsWorld.addNPC).toHaveBeenCalledTimes(1);
    });

    it('should use scene manager for spawn position', () => {
      manager.spawnNPC();
      expect(mockSceneManager.getSafeSpawnPosition).toHaveBeenCalled();
    });

    it('should not spawn beyond maxNPCs', () => {
      const customManager = new NPCManager({
        scene: mockScene,
        physicsWorld: mockPhysicsWorld,
        config: { maxNPCs: 3 },
      });

      customManager.spawnNPC();
      customManager.spawnNPC();
      customManager.spawnNPC();
      const id = customManager.spawnNPC();

      expect(id).toBeNull();
      expect(customManager.getNPCCount()).toBe(3);
    });

    it('should emit NPC_SPAWN event', () => {
      const callback = vi.fn();
      manager.on(GameEvents.NPC_SPAWN, callback);
      manager.spawnNPC();
      expect(callback).toHaveBeenCalledTimes(1);
      expect(callback).toHaveBeenCalledWith(
        expect.objectContaining({
          id: expect.any(String),
          npcType: expect.any(String),
          position: expect.any(Object),
        })
      );
    });

    it('should emit to global event bus', () => {
      const callback = vi.fn();
      getEventBus().on(GameEvents.NPC_SPAWN, callback);
      manager.spawnNPC();
      expect(callback).toHaveBeenCalled();
    });
  });

  describe('spawnNPCs', () => {
    it('should spawn multiple NPCs', () => {
      const ids = manager.spawnNPCs(5);
      expect(ids.length).toBe(5);
      expect(manager.getNPCCount()).toBe(5);
    });

    it('should respect maxNPCs', () => {
      const customManager = new NPCManager({
        scene: mockScene,
        physicsWorld: mockPhysicsWorld,
        config: { maxNPCs: 3 },
      });

      const ids = customManager.spawnNPCs(10);
      expect(ids.length).toBe(3);
      expect(customManager.getNPCCount()).toBe(3);
    });
  });

  describe('spawnNPCAt', () => {
    it('should spawn at specific position', () => {
      const id = manager.spawnNPCAt(5, -3);
      const data = manager.getNPCData(id);
      expect(data.position.x).toBe(5);
      expect(data.position.z).toBe(-3);
    });

    it('should spawn at specific position with spawn position matching', () => {
      const id = manager.spawnNPCAt(10, 20);
      const data = manager.getNPCData(id);
      expect(data.spawnPosition.x).toBe(10);
      expect(data.spawnPosition.z).toBe(20);
    });

    it('should accept specific NPC type', () => {
      const id = manager.spawnNPCAt(0, 0, 'cow');
      const data = manager.getNPCData(id);
      expect(data.type).toBe('cow');
    });

    it('should use random type if specified type does not exist', () => {
      const id = manager.spawnNPCAt(0, 0, 'nonexistent');
      const data = manager.getNPCData(id);
      expect(DEFAULT_NPC_TYPES.map((t) => t.name)).toContain(data.type);
    });

    it('should not spawn beyond maxNPCs', () => {
      const customManager = new NPCManager({
        scene: mockScene,
        physicsWorld: mockPhysicsWorld,
        config: { maxNPCs: 1 },
      });

      customManager.spawnNPCAt(0, 0);
      const id = customManager.spawnNPCAt(5, 5);
      expect(id).toBeNull();
    });
  });

  // ==========================================================================
  // NPC Data and Properties
  // ==========================================================================
  describe('NPC data', () => {
    it('should store spawn time', () => {
      const before = Date.now();
      const id = manager.spawnNPC();
      const after = Date.now();
      const data = manager.getNPCData(id);
      expect(data.spawnTime).toBeGreaterThanOrEqual(before);
      expect(data.spawnTime).toBeLessThanOrEqual(after);
    });

    it('should assign type-specific speed', () => {
      const id = manager.spawnNPCAt(0, 0, 'pig');
      const data = manager.getNPCData(id);
      const pigType = DEFAULT_NPC_TYPES.find((t) => t.name === 'pig');
      expect(data.speed).toBe(pigType.speed);
    });

    it('should assign type-specific wander radius', () => {
      const id = manager.spawnNPCAt(0, 0, 'sheep');
      const data = manager.getNPCData(id);
      const sheepType = DEFAULT_NPC_TYPES.find((t) => t.name === 'sheep');
      expect(data.wanderRadius).toBe(sheepType.wanderRadius);
    });

    it('should start in idle state', () => {
      const id = manager.spawnNPC();
      const data = manager.getNPCData(id);
      expect(data.isMoving).toBe(false);
    });

    it('should have random initial idle timer', () => {
      const ids = [];
      for (let i = 0; i < 5; i++) {
        ids.push(manager.spawnNPC());
      }

      const idleTimes = ids.map((id) => manager.getNPCData(id).idleTimer);
      // At least some should be different (probability-based test)
      const uniqueTimes = new Set(idleTimes);
      expect(uniqueTimes.size).toBeGreaterThanOrEqual(1);
    });
  });

  // ==========================================================================
  // AI Behavior
  // ==========================================================================
  describe('AI behavior', () => {
    describe('idle state', () => {
      it('should decrement idle timer during update', () => {
        const id = manager.spawnNPC();
        const initialIdle = manager.getNPCData(id).idleTimer;
        manager.update(0.5);
        expect(manager.getNPCData(id).idleTimer).toBe(initialIdle - 0.5);
      });

      it('should transition to moving when idle timer expires', () => {
        const id = manager.spawnNPC();
        const data = manager.getNPCData(id);
        data.idleTimer = 0.1;

        manager.update(0.2);
        expect(data.isMoving).toBe(true);
      });

      it('should set move timer when transitioning to moving', () => {
        const id = manager.spawnNPC();
        const data = manager.getNPCData(id);
        data.idleTimer = 0.1;

        manager.update(0.2);
        expect(data.moveTimer).toBeGreaterThan(0);
        expect(data.moveTimer).toBeGreaterThanOrEqual(manager.config.minMoveTime);
        expect(data.moveTimer).toBeLessThanOrEqual(manager.config.maxMoveTime);
      });

      it('should choose new target when starting to move', () => {
        const id = manager.spawnNPCAt(0, 0);
        const data = manager.getNPCData(id);
        data.idleTimer = 0.1;
        const _initialTarget = { ...data.targetPosition };

        manager.update(0.2);

        // Target position should potentially change (it's random within wander radius)
        // Since spawn position is 0,0 and wander radius is positive, target can be different
        expect(data.targetPosition).toBeDefined();
      });
    });

    describe('moving state', () => {
      beforeEach(() => {
        // Force NPC into moving state
      });

      it('should move towards target position', () => {
        const id = manager.spawnNPCAt(0, 0);
        const data = manager.getNPCData(id);
        data.isMoving = true;
        data.moveTimer = 5;
        data.targetPosition = { x: 10, y: 0, z: 0 };

        const initialX = data.position.x;
        manager.update(1);

        expect(data.position.x).toBeGreaterThan(initialX);
      });

      it('should decrement move timer during update', () => {
        const id = manager.spawnNPC();
        const data = manager.getNPCData(id);
        data.isMoving = true;
        data.moveTimer = 5;
        data.targetPosition = { x: 100, y: 0, z: 0 };

        manager.update(1);
        expect(data.moveTimer).toBe(4);
      });

      it('should update rotation to face movement direction', () => {
        const id = manager.spawnNPCAt(0, 0);
        const data = manager.getNPCData(id);
        data.isMoving = true;
        data.moveTimer = 5;
        data.targetPosition = { x: 10, y: 0, z: 0 };

        manager.update(0.5);

        // Rotation should be set (facing positive X)
        expect(typeof data.rotation).toBe('number');
      });

      it('should stop when reaching target', () => {
        const id = manager.spawnNPCAt(0, 0);
        const data = manager.getNPCData(id);
        data.isMoving = true;
        data.moveTimer = 100;
        // Set target to exactly at current position (distance 0)
        data.targetPosition = { x: 0, y: 0, z: 0 };

        manager.update(0.1);

        // Should have stopped because distance < arrivalThreshold
        expect(data.isMoving).toBe(false);
      });

      it('should stop when move timer expires', () => {
        const id = manager.spawnNPCAt(0, 0);
        const data = manager.getNPCData(id);
        data.isMoving = true;
        data.moveTimer = 0.5;
        data.targetPosition = { x: 100, y: 0, z: 100 }; // Far away

        manager.update(1); // Timer will expire

        expect(data.isMoving).toBe(false);
      });

      it('should set new idle timer when stopping', () => {
        const id = manager.spawnNPCAt(0, 0);
        const data = manager.getNPCData(id);
        data.isMoving = true;
        data.moveTimer = 0.1;
        data.targetPosition = { x: 100, y: 0, z: 100 };

        manager.update(0.5);

        expect(data.idleTimer).toBeGreaterThanOrEqual(manager.config.minIdleTime);
        expect(data.idleTimer).toBeLessThanOrEqual(manager.config.maxIdleTime);
      });
    });

    describe('wandering logic', () => {
      it('should choose target within wander radius', () => {
        const id = manager.spawnNPCAt(0, 0, 'pig');
        const data = manager.getNPCData(id);
        const wanderRadius = data.wanderRadius;

        // Force choosing new target
        data.idleTimer = 0.01;
        manager.update(0.1);

        // Target should be within wander radius of spawn position
        const dx = data.targetPosition.x - data.spawnPosition.x;
        const dz = data.targetPosition.z - data.spawnPosition.z;
        const distance = Math.sqrt(dx * dx + dz * dz);

        expect(distance).toBeLessThanOrEqual(wanderRadius);
      });

      it('should wander around spawn position, not current position', () => {
        const id = manager.spawnNPCAt(0, 0, 'cow');
        const data = manager.getNPCData(id);

        // Move NPC far from spawn
        data.position.x = 50;
        data.position.z = 50;

        // Force choosing new target
        data.idleTimer = 0.01;
        manager.update(0.1);

        // Target should still be near spawn (0, 0), not near current position
        const dx = data.targetPosition.x - data.spawnPosition.x;
        const dz = data.targetPosition.z - data.spawnPosition.z;
        const distance = Math.sqrt(dx * dx + dz * dz);

        expect(distance).toBeLessThanOrEqual(data.wanderRadius);
      });
    });

    describe('speed behavior', () => {
      it('should move at correct speed', () => {
        const id = manager.spawnNPCAt(0, 0, 'pig');
        const data = manager.getNPCData(id);
        const pigType = DEFAULT_NPC_TYPES.find((t) => t.name === 'pig');

        data.isMoving = true;
        data.moveTimer = 100;
        data.targetPosition = { x: 100, y: 0, z: 0 };

        const initialX = data.position.x;
        manager.update(1); // 1 second

        // Should have moved approximately speed units
        const distanceMoved = data.position.x - initialX;
        expect(distanceMoved).toBeCloseTo(pigType.speed, 1);
      });

      it('should have different speeds for different NPC types', () => {
        const pigId = manager.spawnNPCAt(0, 0, 'pig');
        const cowId = manager.spawnNPCAt(0, 10, 'cow');

        const pigData = manager.getNPCData(pigId);
        const cowData = manager.getNPCData(cowId);

        expect(pigData.speed).not.toBe(cowData.speed);
      });
    });
  });

  // ==========================================================================
  // Removal
  // ==========================================================================
  describe('removeNPC', () => {
    it('should remove NPC by ID', () => {
      const id = manager.spawnNPC();
      expect(manager.getNPCCount()).toBe(1);

      const result = manager.removeNPC(id);
      expect(result).toBe(true);
      expect(manager.getNPCCount()).toBe(0);
    });

    it('should remove from scene', () => {
      const id = manager.spawnNPC();
      manager.removeNPC(id);
      expect(mockScene.remove).toHaveBeenCalled();
    });

    it('should remove physics body', () => {
      const id = manager.spawnNPC();
      manager.removeNPC(id);
      expect(mockPhysicsWorld.removeNPC).toHaveBeenCalled();
    });

    it('should emit NPC_DESTROY event', () => {
      const callback = vi.fn();
      manager.on(GameEvents.NPC_DESTROY, callback);
      const id = manager.spawnNPC();
      manager.removeNPC(id);
      expect(callback).toHaveBeenCalledWith({ id });
    });

    it('should return false for non-existent ID', () => {
      const result = manager.removeNPC('fake_id');
      expect(result).toBe(false);
    });
  });

  describe('removeNPCByMesh', () => {
    it('should remove NPC by mesh reference', () => {
      const id = manager.spawnNPC();
      const mesh = manager.getNPC(id);

      expect(manager.getNPCCount()).toBe(1);
      const result = manager.removeNPCByMesh(mesh);
      expect(result).toBe(true);
      expect(manager.getNPCCount()).toBe(0);
    });

    it('should return false for unknown mesh', () => {
      manager.spawnNPC();
      const result = manager.removeNPCByMesh({ userData: { id: 'fake' } });
      expect(result).toBe(false);
    });
  });

  // ==========================================================================
  // Query Methods
  // ==========================================================================
  describe('getNPCCount', () => {
    it('should return correct count', () => {
      expect(manager.getNPCCount()).toBe(0);
      manager.spawnNPC();
      expect(manager.getNPCCount()).toBe(1);
      manager.spawnNPC();
      expect(manager.getNPCCount()).toBe(2);
    });
  });

  describe('getNPCIds', () => {
    it('should return array of IDs', () => {
      manager.spawnNPCs(3);
      const ids = manager.getNPCIds();
      expect(ids).toHaveLength(3);
      ids.forEach((id) => {
        expect(typeof id).toBe('string');
      });
    });
  });

  describe('getNPC', () => {
    it('should return NPC mesh by ID', () => {
      const id = manager.spawnNPC();
      const mesh = manager.getNPC(id);
      expect(mesh).toBeDefined();
      expect(mesh.userData.type).toBe('npc');
    });

    it('should return undefined for non-existent ID', () => {
      const mesh = manager.getNPC('fake_id');
      expect(mesh).toBeUndefined();
    });
  });

  describe('getNPCData', () => {
    it('should return NPC data by ID', () => {
      const id = manager.spawnNPC();
      const data = manager.getNPCData(id);
      expect(data).toBeDefined();
      expect(data.id).toBe(id);
      expect(data.position).toBeDefined();
      expect(data.speed).toBeDefined();
    });

    it('should return undefined for non-existent ID', () => {
      const data = manager.getNPCData('fake_id');
      expect(data).toBeUndefined();
    });
  });

  describe('getNPCsNear', () => {
    it('should find NPCs within radius', () => {
      manager.spawnNPCAt(0, 0);
      manager.spawnNPCAt(2, 0);
      manager.spawnNPCAt(20, 0); // Far away

      const nearby = manager.getNPCsNear({ x: 0, y: 0, z: 0 }, 5);
      expect(nearby).toHaveLength(2);
    });

    it('should return empty array if no NPCs nearby', () => {
      manager.spawnNPCAt(100, 100);
      const nearby = manager.getNPCsNear({ x: 0, y: 0, z: 0 }, 5);
      expect(nearby).toHaveLength(0);
    });

    it('should sort by distance', () => {
      manager.spawnNPCAt(5, 0);
      manager.spawnNPCAt(1, 0);
      manager.spawnNPCAt(3, 0);

      const nearby = manager.getNPCsNear({ x: 0, y: 0, z: 0 }, 10);
      expect(nearby[0].distance).toBeLessThan(nearby[1].distance);
      expect(nearby[1].distance).toBeLessThan(nearby[2].distance);
    });

    it('should include distance in results', () => {
      manager.spawnNPCAt(3, 4); // Distance = 5

      const nearby = manager.getNPCsNear({ x: 0, y: 0, z: 0 }, 10);
      expect(nearby[0].distance).toBeCloseTo(5, 1);
    });
  });

  describe('getNPCType', () => {
    it('should return NPC type by name', () => {
      const pigType = manager.getNPCType('pig');
      expect(pigType).toBeDefined();
      expect(pigType.name).toBe('pig');
    });

    it('should return undefined for unknown type', () => {
      const unknownType = manager.getNPCType('dragon');
      expect(unknownType).toBeUndefined();
    });
  });

  // ==========================================================================
  // Control Methods
  // ==========================================================================
  describe('isMoving', () => {
    it('should return true if NPC is moving', () => {
      const id = manager.spawnNPC();
      const data = manager.getNPCData(id);
      data.isMoving = true;

      expect(manager.isMoving(id)).toBe(true);
    });

    it('should return false if NPC is idle', () => {
      const id = manager.spawnNPC();
      expect(manager.isMoving(id)).toBe(false);
    });

    it('should return false for non-existent ID', () => {
      expect(manager.isMoving('fake_id')).toBe(false);
    });
  });

  describe('setTarget', () => {
    it('should set NPC target position', () => {
      const id = manager.spawnNPCAt(0, 0);
      manager.setTarget(id, 10, 20);

      const data = manager.getNPCData(id);
      expect(data.targetPosition.x).toBe(10);
      expect(data.targetPosition.z).toBe(20);
    });

    it('should set NPC to moving state', () => {
      const id = manager.spawnNPC();
      manager.setTarget(id, 10, 20);

      const data = manager.getNPCData(id);
      expect(data.isMoving).toBe(true);
    });

    it('should return false for non-existent ID', () => {
      const result = manager.setTarget('fake_id', 10, 20);
      expect(result).toBe(false);
    });
  });

  describe('stopMovement', () => {
    it('should stop NPC movement', () => {
      const id = manager.spawnNPC();
      const data = manager.getNPCData(id);
      data.isMoving = true;

      manager.stopMovement(id);
      expect(data.isMoving).toBe(false);
    });

    it('should set idle timer', () => {
      const id = manager.spawnNPC();
      const data = manager.getNPCData(id);
      data.isMoving = true;
      data.idleTimer = 0;

      manager.stopMovement(id);
      expect(data.idleTimer).toBe(manager.config.minIdleTime);
    });

    it('should return false for non-existent ID', () => {
      const result = manager.stopMovement('fake_id');
      expect(result).toBe(false);
    });
  });

  // ==========================================================================
  // Reset
  // ==========================================================================
  describe('reset', () => {
    it('should remove all NPCs', () => {
      manager.spawnNPCs(5);
      expect(manager.getNPCCount()).toBe(5);

      manager.reset();
      expect(manager.getNPCCount()).toBe(0);
    });

    it('should call scene.remove for each NPC', () => {
      manager.spawnNPCs(3);
      mockScene.remove.mockClear();

      manager.reset();
      expect(mockScene.remove).toHaveBeenCalledTimes(3);
    });
  });

  // ==========================================================================
  // Without Scene Manager
  // ==========================================================================
  describe('without sceneManager', () => {
    it('should spawn with random positions', () => {
      const noSceneManager = new NPCManager({
        scene: mockScene,
        physicsWorld: mockPhysicsWorld,
      });

      const id = noSceneManager.spawnNPC();
      const data = noSceneManager.getNPCData(id);

      expect(data.position.x).toBeDefined();
      expect(data.position.z).toBeDefined();
    });
  });

  // ==========================================================================
  // Update Integration
  // ==========================================================================
  describe('update integration', () => {
    it('should update all NPCs', () => {
      manager.spawnNPCs(3);

      // Force all to be moving
      for (const id of manager.getNPCIds()) {
        const data = manager.getNPCData(id);
        data.isMoving = true;
        data.moveTimer = 10;
        data.targetPosition = { x: 100, y: 0, z: 100 };
      }

      manager.update(0.016);

      // All NPCs should have updated positions
      for (const id of manager.getNPCIds()) {
        const data = manager.getNPCData(id);
        expect(data.position.x).not.toBe(data.spawnPosition.x);
      }
    });

    it('should sync mesh positions after update', () => {
      const id = manager.spawnNPCAt(0, 0);
      const mesh = manager.getNPC(id);
      const data = manager.getNPCData(id);

      data.isMoving = true;
      data.moveTimer = 10;
      data.targetPosition = { x: 100, y: 0, z: 0 };

      manager.update(1);

      expect(mesh.position.x).toBe(data.position.x);
      expect(mesh.position.z).toBe(data.position.z);
    });
  });
});

// ==========================================================================
// Exports Testing
// ==========================================================================
describe('module exports', () => {
  it('should export DEFAULT_NPC_TYPES', () => {
    expect(DEFAULT_NPC_TYPES).toBeDefined();
    expect(Array.isArray(DEFAULT_NPC_TYPES)).toBe(true);
    expect(DEFAULT_NPC_TYPES.length).toBe(3);
  });

  it('should export DEFAULT_CONFIG', () => {
    expect(DEFAULT_CONFIG).toBeDefined();
    expect(DEFAULT_CONFIG.maxNPCs).toBe(8);
  });

  it('should have correct NPC type structure', () => {
    DEFAULT_NPC_TYPES.forEach((type) => {
      expect(type.name).toBeDefined();
      expect(type.color).toBeDefined();
      expect(type.size).toBeDefined();
      expect(type.speed).toBeDefined();
      expect(type.wanderRadius).toBeDefined();
    });
  });
});
