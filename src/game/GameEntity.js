/**
 * GameEntity - Abstract base class for game entities (circles, NPCs, etc.)
 * Provides common functionality for entity lifecycle, storage, and scene integration
 */

import { EventEmitter, GameEvents, getEventBus } from '../utils/EventEmitter.js';

// ==========================================================================
// Entity State
// ==========================================================================

/**
 * Entity lifecycle states
 */
export const EntityState = {
  SPAWNING: 'spawning',
  ACTIVE: 'active',
  DESTROYING: 'destroying',
  DESTROYED: 'destroyed',
};

// ==========================================================================
// Base Entity Data
// ==========================================================================

/**
 * @typedef {Object} BaseEntityData
 * @property {string} id - Unique entity identifier
 * @property {string} type - Entity type (circle, npc, etc.)
 * @property {{ x: number, y: number, z: number }} position - Current position
 * @property {number} spawnTime - Timestamp when spawned
 * @property {EntityState} state - Current entity state
 */

// ==========================================================================
// Abstract GameEntity Class
// ==========================================================================

/**
 * Abstract base class for all game entities
 * Subclasses must implement specific entity creation and behavior
 */
export class GameEntity {
  /**
   * @param {Object} options
   * @param {string} options.id - Unique identifier
   * @param {string} options.type - Entity type
   * @param {{ x: number, y: number, z: number }} options.position - Initial position
   * @param {Object} [options.userData] - Additional entity data
   */
  constructor({ id, type, position, userData = {} }) {
    if (new.target === GameEntity) {
      throw new Error('GameEntity is abstract and cannot be instantiated directly');
    }

    /** @type {string} */
    this.id = id;

    /** @type {string} */
    this.type = type;

    /** @type {{ x: number, y: number, z: number }} */
    this.position = { ...position };

    /** @type {number} */
    this.spawnTime = Date.now();

    /** @type {EntityState} */
    this.state = EntityState.SPAWNING;

    /** @type {Object} */
    this.userData = { ...userData };

    /** @type {Object|null} */
    this.mesh = null;

    /** @type {Object|null} */
    this.physicsBody = null;
  }

  /**
   * Initialize the entity (create mesh, physics body, etc.)
   * Called after construction
   * @abstract
   */
  init() {
    throw new Error('GameEntity.init() must be implemented by subclass');
  }

  /**
   * Update the entity each frame
   * @param {number} deltaTime - Time since last update in seconds
   * @abstract
   */
  update(_deltaTime) {
    throw new Error('GameEntity.update() must be implemented by subclass');
  }

  /**
   * Clean up entity resources
   * @abstract
   */
  destroy() {
    throw new Error('GameEntity.destroy() must be implemented by subclass');
  }

  /**
   * Get the entity's bounding box for collision detection
   * @returns {{ min: {x: number, y: number, z: number}, max: {x: number, y: number, z: number} }}
   */
  getBounds() {
    // Default 1x1x1 bounding box
    return {
      min: {
        x: this.position.x - 0.5,
        y: this.position.y - 0.5,
        z: this.position.z - 0.5,
      },
      max: {
        x: this.position.x + 0.5,
        y: this.position.y + 0.5,
        z: this.position.z + 0.5,
      },
    };
  }

  /**
   * Calculate distance to another position
   * @param {{ x: number, y: number, z: number }} target - Target position
   * @returns {number} Distance
   */
  distanceTo(target) {
    const dx = target.x - this.position.x;
    const dy = (target.y ?? 0) - (this.position.y ?? 0);
    const dz = (target.z ?? this.position.z) - this.position.z;
    return Math.sqrt(dx * dx + dy * dy + dz * dz);
  }

  /**
   * Check if entity is within range of a position
   * @param {{ x: number, y: number, z: number }} target - Target position
   * @param {number} range - Range to check
   * @returns {boolean}
   */
  isInRange(target, range) {
    return this.distanceTo(target) <= range;
  }

  /**
   * Get entity age in milliseconds
   * @returns {number}
   */
  getAge() {
    return Date.now() - this.spawnTime;
  }

  /**
   * Check if entity is active
   * @returns {boolean}
   */
  isActive() {
    return this.state === EntityState.ACTIVE;
  }

  /**
   * Set entity position
   * @param {number} x
   * @param {number} y
   * @param {number} z
   */
  setPosition(x, y, z) {
    this.position.x = x;
    this.position.y = y;
    this.position.z = z;

    // Sync mesh position if exists
    if (this.mesh?.position) {
      this.mesh.position.x = x;
      this.mesh.position.y = y;
      this.mesh.position.z = z;
    }
  }

  /**
   * Convert entity to plain object (for serialization)
   * @returns {BaseEntityData}
   */
  toJSON() {
    return {
      id: this.id,
      type: this.type,
      position: { ...this.position },
      spawnTime: this.spawnTime,
      state: this.state,
      userData: { ...this.userData },
    };
  }
}

// ==========================================================================
// Entity Manager Base Class
// ==========================================================================

/**
 * @typedef {Object} EntityManagerConfig
 * @property {number} maxEntities - Maximum number of entities
 * @property {number} [spawnCooldown] - Cooldown between spawns in ms
 */

/**
 * Base class for entity managers
 * Handles common entity storage, spawning, and lifecycle management
 */
export class EntityManager extends EventEmitter {
  /**
   * @param {Object} options
   * @param {Object} options.scene - Three.js scene
   * @param {Object} options.physicsWorld - Physics world
   * @param {Object} [options.sceneManager] - Scene manager for spawn positions
   * @param {string} options.entityType - Type of entity this manager handles
   * @param {Partial<EntityManagerConfig>} [options.config] - Configuration
   */
  constructor({ scene, physicsWorld, sceneManager = null, entityType, config = {} }) {
    super();

    if (new.target === EntityManager) {
      throw new Error('EntityManager is abstract and cannot be instantiated directly');
    }

    if (!scene) {
      throw new Error(`${this.constructor.name} requires a scene`);
    }
    if (!physicsWorld) {
      throw new Error(`${this.constructor.name} requires a physicsWorld`);
    }

    /** @type {Object} */
    this.scene = scene;

    /** @type {Object} */
    this.physicsWorld = physicsWorld;

    /** @type {Object|null} */
    this.sceneManager = sceneManager;

    /** @type {string} */
    this.entityType = entityType;

    /** @type {EntityManagerConfig} */
    this.config = {
      maxEntities: 10,
      spawnCooldown: 0,
      ...config,
    };

    /** @type {Map<string, GameEntity>} */
    this._entities = new Map();

    /** @type {number} */
    this._nextId = 0;

    /** @type {number} */
    this._lastSpawnTime = 0;

    /** @type {boolean} */
    this._initialized = false;
  }

  /**
   * Initialize the manager
   */
  init() {
    if (this._initialized) {
      return;
    }
    this._initialized = true;
    this._onInit();
  }

  /**
   * Hook for subclass initialization
   * @protected
   */
  _onInit() {
    // Override in subclass
  }

  /**
   * Generate a unique entity ID
   * @returns {string}
   * @protected
   */
  _generateId() {
    return `${this.entityType}_${this._nextId++}_${Date.now()}`;
  }

  /**
   * Get a safe spawn position
   * @returns {{ x: number, y: number, z: number }}
   * @protected
   */
  _getSpawnPosition() {
    if (this.sceneManager?.getSafeSpawnPosition) {
      const pos = this.sceneManager.getSafeSpawnPosition();
      return { x: pos.x, y: pos.y ?? 0, z: pos.z };
    }
    // Default: random position
    return {
      x: (Math.random() - 0.5) * 40,
      y: 0,
      z: (Math.random() - 0.5) * 40,
    };
  }

  /**
   * Check if spawning is allowed
   * @returns {boolean}
   */
  canSpawn() {
    if (this._entities.size >= this.config.maxEntities) {
      return false;
    }
    if (this.config.spawnCooldown > 0) {
      const elapsed = Date.now() - this._lastSpawnTime;
      if (elapsed < this.config.spawnCooldown) {
        return false;
      }
    }
    return true;
  }

  /**
   * Create an entity instance - must be implemented by subclass
   * @param {string} id - Entity ID
   * @param {{ x: number, y: number, z: number }} position - Spawn position
   * @param {Object} [options] - Additional options
   * @returns {GameEntity}
   * @abstract
   * @protected
   */
  _createEntity(id, position, _options = {}) {
    throw new Error('EntityManager._createEntity() must be implemented by subclass');
  }

  /**
   * Spawn a single entity
   * @param {Object} [options] - Spawn options
   * @returns {string|null} Entity ID or null if couldn't spawn
   */
  spawn(options = {}) {
    if (!this._initialized) {
      this.init();
    }

    if (!this.canSpawn()) {
      return null;
    }

    const id = this._generateId();
    const position = options.position ?? this._getSpawnPosition();

    const entity = this._createEntity(id, position, options);
    entity.init();
    entity.state = EntityState.ACTIVE;

    this._entities.set(id, entity);
    this._lastSpawnTime = Date.now();

    // Add to scene
    if (entity.mesh && this.scene.add) {
      this.scene.add(entity.mesh);
    }

    // Emit events
    this._emitSpawnEvent(entity);

    return id;
  }

  /**
   * Spawn at a specific position
   * @param {number} x - X coordinate
   * @param {number} y - Y coordinate
   * @param {number} z - Z coordinate
   * @param {Object} [options] - Additional options
   * @returns {string|null} Entity ID or null if couldn't spawn
   */
  spawnAt(x, y, z, options = {}) {
    return this.spawn({
      ...options,
      position: { x, y, z },
    });
  }

  /**
   * Spawn multiple entities
   * @param {number} count - Number to spawn
   * @param {Object} [options] - Spawn options
   * @returns {string[]} Array of spawned IDs
   */
  spawnMultiple(count, options = {}) {
    const spawned = [];
    for (let i = 0; i < count; i++) {
      const id = this.spawn(options);
      if (id) {
        spawned.push(id);
      }
    }
    return spawned;
  }

  /**
   * Destroy an entity by ID
   * @param {string} id - Entity ID
   * @returns {boolean} True if destroyed
   */
  destroy(id) {
    const entity = this._entities.get(id);
    if (!entity) {
      return false;
    }

    entity.state = EntityState.DESTROYING;

    // Remove from scene
    if (entity.mesh && this.scene.remove) {
      this.scene.remove(entity.mesh);
    }

    // Clean up entity resources
    entity.destroy();
    entity.state = EntityState.DESTROYED;

    this._entities.delete(id);

    // Emit events
    this._emitDestroyEvent(entity);

    return true;
  }

  /**
   * Destroy entity by mesh reference
   * @param {Object} mesh - Entity mesh
   * @returns {boolean} True if destroyed
   */
  destroyByMesh(mesh) {
    for (const [id, entity] of this._entities) {
      if (entity.mesh === mesh || entity.mesh?.userData?.id === mesh?.userData?.id) {
        return this.destroy(id);
      }
    }
    return false;
  }

  /**
   * Update all entities
   * @param {number} deltaTime - Time since last update in seconds
   */
  update(deltaTime) {
    const toRemove = [];

    for (const [id, entity] of this._entities) {
      if (entity.isActive()) {
        // Check for expiration (subclass can override shouldExpire)
        if (this._shouldExpire(entity)) {
          toRemove.push(id);
        } else {
          entity.update(deltaTime);
        }
      }
    }

    // Remove expired entities
    for (const id of toRemove) {
      this.destroy(id);
    }
  }

  /**
   * Check if entity should expire - override in subclass
   * @param {GameEntity} entity
   * @returns {boolean}
   * @protected
   */
  _shouldExpire(_entity) {
    return false; // Default: entities don't expire
  }

  /**
   * Emit spawn event
   * @param {GameEntity} entity
   * @protected
   */
  _emitSpawnEvent(entity) {
    const eventData = {
      id: entity.id,
      type: entity.type,
      position: { ...entity.position },
    };
    this.emit(`${this.entityType}:spawn`, eventData);
    getEventBus().emit(`${this.entityType}:spawn`, eventData);
  }

  /**
   * Emit destroy event
   * @param {GameEntity} entity
   * @protected
   */
  _emitDestroyEvent(entity) {
    const eventData = { id: entity.id };
    this.emit(`${this.entityType}:destroy`, eventData);
    getEventBus().emit(`${this.entityType}:destroy`, eventData);
  }

  /**
   * Reset the manager - destroy all entities
   */
  reset() {
    const ids = Array.from(this._entities.keys());
    for (const id of ids) {
      this.destroy(id);
    }
  }

  /**
   * Get entity by ID
   * @param {string} id
   * @returns {GameEntity|undefined}
   */
  get(id) {
    return this._entities.get(id);
  }

  /**
   * Get entity mesh by ID
   * @param {string} id
   * @returns {Object|undefined}
   */
  getMesh(id) {
    return this._entities.get(id)?.mesh;
  }

  /**
   * Get entity count
   * @returns {number}
   */
  getCount() {
    return this._entities.size;
  }

  /**
   * Get all entity IDs
   * @returns {string[]}
   */
  getIds() {
    return Array.from(this._entities.keys());
  }

  /**
   * Get all entities
   * @returns {GameEntity[]}
   */
  getAll() {
    return Array.from(this._entities.values());
  }

  /**
   * Get entities within range of a position
   * @param {{ x: number, y: number, z: number }} position - Center position
   * @param {number} radius - Search radius
   * @returns {GameEntity[]} Entities sorted by distance
   */
  getEntitiesNear(position, radius) {
    const results = [];

    for (const entity of this._entities.values()) {
      const distance = entity.distanceTo(position);
      if (distance <= radius) {
        results.push({ entity, distance });
      }
    }

    return results
      .sort((a, b) => a.distance - b.distance)
      .map((r) => r.entity);
  }

  /**
   * Check if an entity with the given ID exists
   * @param {string} id
   * @returns {boolean}
   */
  has(id) {
    return this._entities.has(id);
  }

  /**
   * Iterate over all entities
   * @param {(entity: GameEntity, id: string) => void} callback
   */
  forEach(callback) {
    this._entities.forEach((entity, id) => callback(entity, id));
  }
}

// ==========================================================================
// Add common events
// ==========================================================================

GameEvents.ENTITY_SPAWN = 'entity:spawn';
GameEvents.ENTITY_DESTROY = 'entity:destroy';
GameEvents.ENTITY_UPDATE = 'entity:update';

export default { GameEntity, EntityManager, EntityState };
