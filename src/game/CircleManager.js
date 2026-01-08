/**
 * CircleManager - Manages spawning, animations, and destruction of target circles
 * ES6 modular version with event emitter integration
 */

import { GameConfig } from './GameConfig.js';
import { EventEmitter, GameEvents, getEventBus } from '../utils/EventEmitter.js';
import { randomRange, randomInt } from '../utils/math';

/**
 * @typedef {Object} CircleData
 * @property {string} id - Unique identifier
 * @property {number} colorIndex - Index into colors array
 * @property {number} spawnTime - Timestamp when spawned
 * @property {number} floatOffset - Animation offset
 * @property {number} floatSpeed - Animation speed
 * @property {number} floatAmplitude - Animation amplitude
 * @property {number} rotationSpeed - Rotation animation speed
 * @property {{x: number, y: number, z: number}} position - 3D position
 */

export class CircleManager extends EventEmitter {
  /**
   * @param {Object} options
   * @param {Object} options.scene - Three.js scene (or mock)
   * @param {Object} options.physicsWorld - Physics world (or mock)
   * @param {Object} [options.sceneManager] - Scene manager for safe spawn positions
   * @param {Object} [options.config] - Custom config overrides
   */
  constructor({ scene, physicsWorld, sceneManager = null, config = {} }) {
    super();

    if (!scene) {
      throw new Error('CircleManager requires a scene');
    }
    if (!physicsWorld) {
      throw new Error('CircleManager requires a physicsWorld');
    }

    this.scene = scene;
    this.physicsWorld = physicsWorld;
    this.sceneManager = sceneManager;

    // Merge config with defaults
    this.config = {
      ...GameConfig.circles,
      circleLifetime: GameConfig.timing.circleLifetime,
      ...config,
    };

    /** @type {Map<string, Object>} */
    this.circles = new Map();

    /** @type {Map<string, CircleData>} */
    this.circleData = new Map();

    this._nextId = 0;
    this._initialized = false;

    // Track particle groups for cleanup
    this._particleGroups = [];
  }

  /**
   * Initialize the circle manager
   * Creates shared geometries and materials for performance
   */
  init() {
    if (this._initialized) {
      return;
    }

    // These would be Three.js objects in production
    // For testing, we just track that init was called
    this._geometry = this._createGeometry();
    this._materials = this._createMaterials();
    this._initialized = true;
  }

  /**
   * Create shared geometry for circles
   * @returns {Object} Geometry object
   */
  _createGeometry() {
    // In production: new THREE.TorusGeometry(radius, tubeRadius, 8, 16)
    return {
      type: 'TorusGeometry',
      radius: this.config.radius,
      tubeRadius: this.config.tubeRadius,
    };
  }

  /**
   * Create materials for each color
   * @returns {Object[]} Array of materials
   */
  _createMaterials() {
    return this.config.colors.map((color) => ({
      type: 'MeshLambertMaterial',
      color,
      emissive: color,
      emissiveIntensity: 0.2,
    }));
  }

  /**
   * Generate a unique ID for a circle
   * @returns {string}
   */
  _generateId() {
    return `circle_${this._nextId++}_${Date.now()}`;
  }

  /**
   * Get a safe spawn position
   * @returns {{x: number, y: number, z: number}}
   */
  _getSpawnPosition() {
    let x, z;

    if (this.sceneManager && typeof this.sceneManager.getSafeSpawnPosition === 'function') {
      const pos = this.sceneManager.getSafeSpawnPosition();
      x = pos.x;
      z = pos.z;
    } else {
      // Default random position within world bounds
      const worldHalf = GameConfig.scene.worldSize / 2;
      x = randomRange(-worldHalf, worldHalf);
      z = randomRange(-worldHalf, worldHalf);
    }

    const y = randomRange(this.config.minHeight, this.config.maxHeight);

    return { x, y, z };
  }

  /**
   * Spawn multiple circles
   * @param {number} [count] - Number of circles to spawn
   * @returns {string[]} IDs of spawned circles
   */
  spawnCircles(count = this.config.initialSpawnCount) {
    if (!this._initialized) {
      this.init();
    }

    const spawned = [];
    for (let i = 0; i < count && this.circles.size < this.config.maxCount; i++) {
      const id = this.spawnCircle();
      if (id) {
        spawned.push(id);
      }
    }
    return spawned;
  }

  /**
   * Spawn a single circle at a random position
   * @returns {string|null} ID of spawned circle, or null if at max
   */
  spawnCircle() {
    if (this.circles.size >= this.config.maxCount) {
      return null;
    }

    const position = this._getSpawnPosition();
    return this.spawnCircleAt(position.x, position.y, position.z);
  }

  /**
   * Spawn a circle at a specific position
   * @param {number} x - X position
   * @param {number} y - Y position
   * @param {number} z - Z position
   * @param {number} [colorIndex] - Optional specific color
   * @returns {string} ID of spawned circle
   */
  spawnCircleAt(x, y, z, colorIndex = null) {
    if (!this._initialized) {
      this.init();
    }

    const id = this._generateId();
    colorIndex = colorIndex ?? randomInt(0, this.config.colors.length - 1);

    // Create circle data
    const data = {
      id,
      colorIndex,
      spawnTime: Date.now(),
      floatOffset: Math.random() * Math.PI * 2,
      floatSpeed: randomRange(this.config.floatSpeed.min, this.config.floatSpeed.max),
      floatAmplitude: randomRange(this.config.floatAmplitude.min, this.config.floatAmplitude.max),
      rotationSpeed: randomRange(this.config.rotationSpeed.min, this.config.rotationSpeed.max),
      position: { x, y, z },
    };

    // Create mesh (in production this would be Three.js)
    const mesh = this._createMesh(data);
    this.circles.set(id, mesh);
    this.circleData.set(id, data);

    // Add to scene
    if (this.scene.add) {
      this.scene.add(mesh);
    }

    // Add physics body
    if (this.physicsWorld.addCircle) {
      this.physicsWorld.addCircle(x, y, z, this.config.radius);
    }

    // Emit event
    this.emit(GameEvents.CIRCLE_SPAWN, { id, position: { x, y, z }, colorIndex });
    getEventBus().emit(GameEvents.CIRCLE_SPAWN, { id, position: { x, y, z }, colorIndex });

    return id;
  }

  /**
   * Create a mesh for a circle
   * @param {CircleData} data - Circle data
   * @returns {Object} Mesh object
   */
  _createMesh(data) {
    const { x, y, z } = data.position;
    return {
      id: data.id,
      geometry: this._geometry,
      material: this._materials[data.colorIndex],
      position: { x, y, z },
      rotation: { x: 0, y: 0, z: 0 },
      castShadow: true,
      userData: {
        type: 'circle',
        colorIndex: data.colorIndex,
        spawnTime: data.spawnTime,
        floatOffset: data.floatOffset,
        floatSpeed: data.floatSpeed,
        floatAmplitude: data.floatAmplitude,
        rotationSpeed: data.rotationSpeed,
      },
    };
  }

  /**
   * Destroy a circle by ID
   * @param {string} id - Circle ID
   * @returns {boolean} True if destroyed
   */
  destroyCircle(id) {
    const mesh = this.circles.get(id);
    const data = this.circleData.get(id);

    if (!mesh || !data) {
      return false;
    }

    // Create destruction effect
    this._createDestructionEffect(mesh, data);

    // Remove from scene
    if (this.scene.remove) {
      this.scene.remove(mesh);
    }

    // Remove physics body
    if (this.physicsWorld.removeCircle) {
      this.physicsWorld.removeCircle(mesh);
    }

    // Remove from tracking
    this.circles.delete(id);
    this.circleData.delete(id);

    // Emit events
    this.emit(GameEvents.CIRCLE_DESTROY, { id });
    getEventBus().emit(GameEvents.CIRCLE_DESTROY, { id });

    return true;
  }

  /**
   * Destroy a circle by mesh reference (for compatibility with old API)
   * @param {Object} mesh - Circle mesh
   * @returns {boolean} True if destroyed
   */
  destroyCircleByMesh(mesh) {
    if (mesh.id) {
      return this.destroyCircle(mesh.id);
    }
    // Fall back to finding by reference
    for (const [id, m] of this.circles) {
      if (m === mesh) {
        return this.destroyCircle(id);
      }
    }
    return false;
  }

  /**
   * Create particle explosion effect
   * @param {Object} mesh - Circle mesh
   * @param {CircleData} data - Circle data
   */
  _createDestructionEffect(mesh, data) {
    // In production, this creates Three.js particles
    // For now, emit an event that UI can listen to
    this.emit('destruction_effect', {
      position: mesh.position,
      color: this.config.colors[data.colorIndex],
    });
  }

  /**
   * Update all circles (animations and auto-despawn)
   * @param {number} deltaTime - Time since last update in seconds
   */
  update(deltaTime) {
    const currentTime = Date.now();
    const toRemove = [];

    this.circles.forEach((mesh, id) => {
      const data = this.circleData.get(id);
      if (!data) {
        return;
      }

      // Check for auto-despawn
      const age = currentTime - data.spawnTime;
      if (age > this.config.circleLifetime) {
        toRemove.push(id);
        return;
      }

      // Update animations
      this._updateAnimation(mesh, data, deltaTime, currentTime);
    });

    // Remove expired circles
    toRemove.forEach((id) => this.destroyCircle(id));
  }

  /**
   * Update circle animation
   * @param {Object} mesh - Circle mesh
   * @param {CircleData} data - Circle data
   * @param {number} deltaTime - Time delta
   * @param {number} currentTime - Current timestamp
   */
  _updateAnimation(mesh, data, deltaTime, currentTime) {
    const time = currentTime * 0.001;

    // Floating animation
    const floatY =
      Math.sin(time * data.floatSpeed + data.floatOffset) * data.floatAmplitude;
    mesh.position.y += floatY * deltaTime;

    // Rotation animation
    mesh.rotation.y += data.rotationSpeed * deltaTime;
    mesh.rotation.x += data.rotationSpeed * 0.5 * deltaTime;

    // Pulsing glow (update material emissiveIntensity)
    const pulseIntensity = 0.2 + Math.sin(time * 3 + data.floatOffset) * 0.1;
    if (mesh.material && typeof mesh.material.emissiveIntensity !== 'undefined') {
      mesh.material.emissiveIntensity = pulseIntensity;
    }
  }

  /**
   * Reset the circle manager
   */
  reset() {
    // Destroy all circles
    const ids = Array.from(this.circles.keys());
    ids.forEach((id) => {
      const mesh = this.circles.get(id);
      if (this.scene.remove) {
        this.scene.remove(mesh);
      }
      if (this.physicsWorld.removeCircle) {
        this.physicsWorld.removeCircle(mesh);
      }
    });

    this.circles.clear();
    this.circleData.clear();
  }

  /**
   * Get the count of active circles
   * @returns {number}
   */
  getCircleCount() {
    return this.circles.size;
  }

  /**
   * Get all circle IDs
   * @returns {string[]}
   */
  getCircleIds() {
    return Array.from(this.circles.keys());
  }

  /**
   * Get a circle by ID
   * @param {string} id - Circle ID
   * @returns {Object|undefined} Circle mesh
   */
  getCircle(id) {
    return this.circles.get(id);
  }

  /**
   * Get circle data by ID
   * @param {string} id - Circle ID
   * @returns {CircleData|undefined}
   */
  getCircleData(id) {
    return this.circleData.get(id);
  }

  /**
   * Get circles within a certain distance of a point
   * @param {{x: number, y: number, z: number}} position - Center position
   * @param {number} radius - Search radius
   * @returns {string[]} IDs of circles within range
   */
  getCirclesNear(position, radius) {
    const results = [];
    this.circleData.forEach((data, id) => {
      const dx = data.position.x - position.x;
      const dy = data.position.y - position.y;
      const dz = data.position.z - position.z;
      const distance = Math.sqrt(dx * dx + dy * dy + dz * dz);
      if (distance <= radius) {
        results.push(id);
      }
    });
    return results;
  }
}

export default CircleManager;
