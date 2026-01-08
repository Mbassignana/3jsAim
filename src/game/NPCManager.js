/**
 * NPCManager - Manages NPC entities with AI behavior and wandering logic
 * Handles spawning, movement AI, animations, and lifecycle management
 */

import { EventEmitter, GameEvents, getEventBus } from '../utils/EventEmitter.js';

/**
 * @typedef {Object} NPCType
 * @property {string} name - NPC type name
 * @property {number} color - Color as hex number
 * @property {{ width: number, height: number, depth: number }} size - NPC dimensions
 * @property {number} speed - Movement speed
 * @property {number} wanderRadius - Maximum wander distance from spawn
 */

/**
 * @typedef {Object} NPCData
 * @property {string} id - Unique NPC identifier
 * @property {string} type - NPC type name
 * @property {{ x: number, y: number, z: number }} position - Current position
 * @property {{ x: number, y: number, z: number }} spawnPosition - Original spawn position
 * @property {{ x: number, y: number, z: number }} targetPosition - Movement target
 * @property {number} speed - Movement speed
 * @property {number} wanderRadius - Wander radius
 * @property {boolean} isMoving - Whether NPC is currently moving
 * @property {number} moveTimer - Time remaining in current move
 * @property {number} idleTimer - Time remaining in idle state
 * @property {number} spawnTime - Timestamp when spawned
 * @property {number} rotation - Current Y rotation (radians)
 */

/** Default NPC types configuration */
export const DEFAULT_NPC_TYPES = [
  {
    name: 'pig',
    color: 0xffb6c1,
    size: { width: 1.2, height: 0.8, depth: 1.6 },
    speed: 2,
    wanderRadius: 15,
  },
  {
    name: 'sheep',
    color: 0xf5f5dc,
    size: { width: 1.0, height: 1.0, depth: 1.4 },
    speed: 1.5,
    wanderRadius: 12,
  },
  {
    name: 'cow',
    color: 0x654321,
    size: { width: 1.5, height: 1.2, depth: 2.0 },
    speed: 1,
    wanderRadius: 10,
  },
];

/** Default configuration */
export const DEFAULT_CONFIG = {
  maxNPCs: 8,
  minIdleTime: 1, // seconds
  maxIdleTime: 5, // seconds
  minMoveTime: 2, // seconds
  maxMoveTime: 5, // seconds
  arrivalThreshold: 0.5, // distance to consider "arrived" at target
};

/**
 * Generate a unique ID
 * @returns {string}
 */
function generateId() {
  return `npc_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * NPCManager - Core NPC management class
 */
export class NPCManager extends EventEmitter {
  /**
   * @param {Object} options
   * @param {Object} options.scene - Three.js scene (required)
   * @param {Object} options.physicsWorld - Physics world (required)
   * @param {Object} [options.sceneManager] - Scene manager for safe spawn positions
   * @param {Partial<typeof DEFAULT_CONFIG>} [options.config] - Custom configuration
   * @param {NPCType[]} [options.npcTypes] - Custom NPC types
   */
  constructor(options = {}) {
    super();

    const { scene, physicsWorld, sceneManager, config = {}, npcTypes } = options;

    if (!scene) {
      throw new Error('NPCManager requires a scene');
    }
    if (!physicsWorld) {
      throw new Error('NPCManager requires a physicsWorld');
    }

    /** @type {Object} */
    this._scene = scene;

    /** @type {Object} */
    this._physicsWorld = physicsWorld;

    /** @type {Object|null} */
    this._sceneManager = sceneManager || null;

    /** @type {typeof DEFAULT_CONFIG} */
    this.config = { ...DEFAULT_CONFIG, ...config };

    /** @type {NPCType[]} */
    this.npcTypes = npcTypes || DEFAULT_NPC_TYPES;

    /** @type {Map<string, { mesh: Object, data: NPCData }>} */
    this._npcs = new Map();

    /** @type {boolean} */
    this._initialized = false;

    this.init();
  }

  /**
   * Initialize NPC manager
   */
  init() {
    if (this._initialized) {
      return;
    }
    this._initialized = true;
  }

  /**
   * Spawn multiple NPCs
   * @param {number} [count=3] - Number of NPCs to spawn
   * @returns {string[]} Array of spawned NPC IDs
   */
  spawnNPCs(count = 3) {
    const ids = [];
    for (let i = 0; i < count && this._npcs.size < this.config.maxNPCs; i++) {
      const id = this.spawnNPC();
      if (id) {
        ids.push(id);
      }
    }
    return ids;
  }

  /**
   * Spawn a single NPC at a random position
   * @returns {string|null} NPC ID or null if couldn't spawn
   */
  spawnNPC() {
    if (this._npcs.size >= this.config.maxNPCs) {
      return null;
    }

    const position = this._sceneManager
      ? this._sceneManager.getSafeSpawnPosition()
      : {
          x: (Math.random() - 0.5) * 40,
          z: (Math.random() - 0.5) * 40,
        };

    const npcType = this.npcTypes[Math.floor(Math.random() * this.npcTypes.length)];
    return this._createNPC(npcType, position.x, position.z);
  }

  /**
   * Spawn an NPC at a specific position
   * @param {number} x - X coordinate
   * @param {number} z - Z coordinate
   * @param {string} [typeName] - NPC type name (random if not specified)
   * @returns {string|null} NPC ID or null if couldn't spawn
   */
  spawnNPCAt(x, z, typeName = null) {
    if (this._npcs.size >= this.config.maxNPCs) {
      return null;
    }

    let npcType;
    if (typeName) {
      npcType = this.npcTypes.find((t) => t.name === typeName);
      if (!npcType) {
        npcType = this.npcTypes[Math.floor(Math.random() * this.npcTypes.length)];
      }
    } else {
      npcType = this.npcTypes[Math.floor(Math.random() * this.npcTypes.length)];
    }

    return this._createNPC(npcType, x, z);
  }

  /**
   * Create an NPC
   * @param {NPCType} npcType - NPC type definition
   * @param {number} x - X coordinate
   * @param {number} z - Z coordinate
   * @returns {string} NPC ID
   * @private
   */
  _createNPC(npcType, x, z) {
    const id = generateId();

    // Create mesh placeholder (actual mesh creation would be Three.js-specific)
    const mesh = {
      position: { x, y: 0, z },
      rotation: { x: 0, y: 0, z: 0 },
      scale: { x: 1, y: 1, z: 1 },
      userData: {
        id,
        type: 'npc',
        npcType: npcType.name,
      },
    };

    /** @type {NPCData} */
    const data = {
      id,
      type: npcType.name,
      position: { x, y: 0, z },
      spawnPosition: { x, y: 0, z },
      targetPosition: { x, y: 0, z },
      speed: npcType.speed,
      wanderRadius: npcType.wanderRadius,
      isMoving: false,
      moveTimer: 0,
      idleTimer: Math.random() * this.config.maxIdleTime, // Random initial idle
      spawnTime: Date.now(),
      rotation: 0,
    };

    this._npcs.set(id, { mesh, data });

    // Add to scene
    this._scene.add(mesh);

    // Add physics body
    this._physicsWorld.addNPC(x, npcType.size.height / 2, z, npcType.size.width, npcType.size.height, npcType.size.depth);

    // Emit events
    this.emit(GameEvents.NPC_SPAWN, { id, npcType: npcType.name, position: { x, z } });
    getEventBus().emit(GameEvents.NPC_SPAWN, { id, npcType: npcType.name, position: { x, z } });

    return id;
  }

  /**
   * Update all NPCs
   * @param {number} deltaTime - Time since last update in seconds
   */
  update(deltaTime) {
    for (const entry of this._npcs.values()) {
      this._updateNPCBehavior(entry.mesh, entry.data, deltaTime);
      this._syncMeshPosition(entry.mesh, entry.data);
    }
  }

  /**
   * Update NPC behavior (AI logic)
   * @param {Object} mesh - Three.js mesh
   * @param {NPCData} data - NPC data
   * @param {number} deltaTime - Time delta
   * @private
   */
  _updateNPCBehavior(mesh, data, deltaTime) {
    if (!data.isMoving) {
      // Idle state - wait before choosing new target
      data.idleTimer -= deltaTime;

      if (data.idleTimer <= 0) {
        // Choose new random target
        this._chooseNewTarget(data);
        data.isMoving = true;
        data.moveTimer =
          this.config.minMoveTime + Math.random() * (this.config.maxMoveTime - this.config.minMoveTime);
      }
    } else {
      // Moving state
      data.moveTimer -= deltaTime;

      // Calculate direction to target
      const dx = data.targetPosition.x - data.position.x;
      const dz = data.targetPosition.z - data.position.z;
      const distance = Math.sqrt(dx * dx + dz * dz);

      if (distance > 0.01) {
        // Normalize direction
        const dirX = dx / distance;
        const dirZ = dz / distance;

        // Apply movement
        const moveDistance = data.speed * deltaTime;
        data.position.x += dirX * moveDistance;
        data.position.z += dirZ * moveDistance;

        // Update rotation to face movement direction
        data.rotation = Math.atan2(dirX, dirZ);
      }

      // Check if reached target or timer expired
      const distanceToTarget = Math.sqrt(
        Math.pow(data.position.x - data.targetPosition.x, 2) + Math.pow(data.position.z - data.targetPosition.z, 2)
      );

      if (distanceToTarget < this.config.arrivalThreshold || data.moveTimer <= 0) {
        data.isMoving = false;
        data.idleTimer =
          this.config.minIdleTime + Math.random() * (this.config.maxIdleTime - this.config.minIdleTime);
      }
    }
  }

  /**
   * Choose a new target position for NPC
   * @param {NPCData} data - NPC data
   * @private
   */
  _chooseNewTarget(data) {
    const angle = Math.random() * Math.PI * 2;
    const distance = Math.random() * data.wanderRadius;

    data.targetPosition.x = data.spawnPosition.x + Math.cos(angle) * distance;
    data.targetPosition.z = data.spawnPosition.z + Math.sin(angle) * distance;
  }

  /**
   * Sync mesh position with data
   * @param {Object} mesh - Three.js mesh
   * @param {NPCData} data - NPC data
   * @private
   */
  _syncMeshPosition(mesh, data) {
    mesh.position.x = data.position.x;
    mesh.position.y = data.position.y;
    mesh.position.z = data.position.z;
    mesh.rotation.y = data.rotation;
  }

  /**
   * Remove an NPC by ID
   * @param {string} id - NPC ID
   * @returns {boolean} True if removed
   */
  removeNPC(id) {
    const npc = this._npcs.get(id);
    if (!npc) {
      return false;
    }

    // Remove from scene
    this._scene.remove(npc.mesh);

    // Remove physics body
    this._physicsWorld.removeNPC(npc.mesh);

    // Remove from map
    this._npcs.delete(id);

    // Emit events
    this.emit(GameEvents.NPC_DESTROY, { id });
    getEventBus().emit(GameEvents.NPC_DESTROY, { id });

    return true;
  }

  /**
   * Remove NPC by mesh reference
   * @param {Object} mesh - Three.js mesh
   * @returns {boolean} True if removed
   */
  removeNPCByMesh(mesh) {
    for (const [id, npc] of this._npcs) {
      if (npc.mesh === mesh || npc.mesh.userData?.id === mesh.userData?.id) {
        return this.removeNPC(id);
      }
    }
    return false;
  }

  /**
   * Get NPC data by ID
   * @param {string} id - NPC ID
   * @returns {NPCData|undefined}
   */
  getNPCData(id) {
    const npc = this._npcs.get(id);
    return npc?.data;
  }

  /**
   * Get NPC mesh by ID
   * @param {string} id - NPC ID
   * @returns {Object|undefined}
   */
  getNPC(id) {
    const npc = this._npcs.get(id);
    return npc?.mesh;
  }

  /**
   * Get count of active NPCs
   * @returns {number}
   */
  getNPCCount() {
    return this._npcs.size;
  }

  /**
   * Get all NPC IDs
   * @returns {string[]}
   */
  getNPCIds() {
    return Array.from(this._npcs.keys());
  }

  /**
   * Get NPCs within a radius of a position
   * @param {{ x: number, y: number, z: number }} position - Center position
   * @param {number} radius - Search radius
   * @returns {Array<{ id: string, mesh: Object, data: NPCData, distance: number }>}
   */
  getNPCsNear(position, radius) {
    const result = [];

    for (const [id, { mesh, data }] of this._npcs) {
      const dx = data.position.x - position.x;
      const dy = (data.position.y || 0) - (position.y || 0);
      const dz = data.position.z - position.z;
      const distance = Math.sqrt(dx * dx + dy * dy + dz * dz);

      if (distance <= radius) {
        result.push({ id, mesh, data, distance });
      }
    }

    return result.sort((a, b) => a.distance - b.distance);
  }

  /**
   * Check if an NPC is currently moving
   * @param {string} id - NPC ID
   * @returns {boolean}
   */
  isMoving(id) {
    const data = this.getNPCData(id);
    return data?.isMoving || false;
  }

  /**
   * Force an NPC to move to a specific position
   * @param {string} id - NPC ID
   * @param {number} x - Target X coordinate
   * @param {number} z - Target Z coordinate
   * @returns {boolean} True if target was set
   */
  setTarget(id, x, z) {
    const npc = this._npcs.get(id);
    if (!npc) {
      return false;
    }

    npc.data.targetPosition.x = x;
    npc.data.targetPosition.z = z;
    npc.data.isMoving = true;
    npc.data.moveTimer = this.config.maxMoveTime;

    return true;
  }

  /**
   * Stop an NPC's movement
   * @param {string} id - NPC ID
   * @returns {boolean} True if stopped
   */
  stopMovement(id) {
    const npc = this._npcs.get(id);
    if (!npc) {
      return false;
    }

    npc.data.isMoving = false;
    npc.data.idleTimer = this.config.minIdleTime;

    return true;
  }

  /**
   * Get NPC type configuration by name
   * @param {string} typeName - Type name
   * @returns {NPCType|undefined}
   */
  getNPCType(typeName) {
    return this.npcTypes.find((t) => t.name === typeName);
  }

  /**
   * Reset the NPC manager
   */
  reset() {
    // Remove all NPCs
    for (const id of this.getNPCIds()) {
      this.removeNPC(id);
    }
  }
}

// Add NPC-specific events
GameEvents.NPC_SPAWN = 'npc:spawn';
GameEvents.NPC_DESTROY = 'npc:destroy';

export default NPCManager;
