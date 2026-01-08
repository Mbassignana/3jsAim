/**
 * LODSystem - Level of Detail management for rendering optimization
 * Automatically switches between detail levels based on distance from camera
 */

import { EventEmitter } from './EventEmitter.js';

// ==========================================================================
// Types
// ==========================================================================

/**
 * @typedef {Object} LODLevel
 * @property {number} distance - Maximum distance for this level
 * @property {string} quality - Quality identifier ('high', 'medium', 'low', 'culled')
 * @property {Object} [representation] - Visual representation for this level
 */

/**
 * @typedef {Object} LODObject
 * @property {string} id - Unique identifier
 * @property {number} x - X position
 * @property {number} y - Y position
 * @property {number} z - Z position
 * @property {string} currentLevel - Current LOD level
 * @property {Object} [mesh] - Associated mesh object
 * @property {Object} [data] - Associated data
 */

// ==========================================================================
// Default LOD Configuration
// ==========================================================================

export const DEFAULT_LOD_LEVELS = [
  { distance: 20, quality: 'high' },
  { distance: 50, quality: 'medium' },
  { distance: 100, quality: 'low' },
  { distance: Infinity, quality: 'culled' },
];

export const LODQuality = {
  HIGH: 'high',
  MEDIUM: 'medium',
  LOW: 'low',
  CULLED: 'culled',
};

// ==========================================================================
// LODSystem Class
// ==========================================================================

/**
 * LODSystem - Manages level of detail for multiple objects
 */
export class LODSystem extends EventEmitter {
  /**
   * @param {Object} [options]
   * @param {LODLevel[]} [options.levels] - LOD level definitions
   * @param {number} [options.updateInterval] - Frames between updates (1 = every frame)
   * @param {number} [options.hysteresis] - Distance buffer to prevent rapid switching
   */
  constructor(options = {}) {
    super();

    /** @type {LODLevel[]} */
    this.levels = options.levels ?? [...DEFAULT_LOD_LEVELS];

    /** @type {number} */
    this.updateInterval = options.updateInterval ?? 1;

    /** @type {number} */
    this.hysteresis = options.hysteresis ?? 2;

    /** @type {Map<string, LODObject>} */
    this._objects = new Map();

    /** @type {{x: number, y: number, z: number}} */
    this._cameraPosition = { x: 0, y: 0, z: 0 };

    /** @type {number} */
    this._frameCounter = 0;

    /** @type {boolean} */
    this._enabled = true;

    // Sort levels by distance
    this.levels.sort((a, b) => a.distance - b.distance);
  }

  /**
   * Register an object with the LOD system
   * @param {string} id - Unique identifier
   * @param {Object} position - Initial position {x, y, z}
   * @param {Object} [options]
   * @param {Object} [options.mesh] - Associated mesh
   * @param {Object} [options.data] - Associated data
   * @returns {LODObject}
   */
  registerObject(id, position, options = {}) {
    const lodObject = {
      id,
      x: position.x ?? 0,
      y: position.y ?? 0,
      z: position.z ?? 0,
      currentLevel: LODQuality.HIGH,
      mesh: options.mesh ?? null,
      data: options.data ?? null,
    };

    this._objects.set(id, lodObject);

    // Calculate initial LOD level
    this._updateObjectLOD(lodObject);

    this.emit('object:registered', { id, lodObject });

    return lodObject;
  }

  /**
   * Unregister an object
   * @param {string} id
   * @returns {boolean} True if removed
   */
  unregisterObject(id) {
    const existed = this._objects.delete(id);
    if (existed) {
      this.emit('object:unregistered', { id });
    }
    return existed;
  }

  /**
   * Update an object's position
   * @param {string} id
   * @param {Object} position - New position {x, y, z}
   */
  updateObjectPosition(id, position) {
    const obj = this._objects.get(id);
    if (obj) {
      obj.x = position.x ?? obj.x;
      obj.y = position.y ?? obj.y;
      obj.z = position.z ?? obj.z;
    }
  }

  /**
   * Update camera position for LOD calculations
   * @param {number} x
   * @param {number} y
   * @param {number} z
   */
  setCameraPosition(x, y, z) {
    this._cameraPosition.x = x;
    this._cameraPosition.y = y;
    this._cameraPosition.z = z;
  }

  /**
   * Update all object LOD levels
   * Call this every frame or on updateInterval
   */
  update() {
    if (!this._enabled) {
      return;
    }

    this._frameCounter++;

    // Only update on interval
    if (this._frameCounter % this.updateInterval !== 0) {
      return;
    }

    for (const obj of this._objects.values()) {
      this._updateObjectLOD(obj);
    }
  }

  /**
   * Force update all objects regardless of interval
   */
  forceUpdate() {
    for (const obj of this._objects.values()) {
      this._updateObjectLOD(obj);
    }
  }

  /**
   * Update LOD level for a single object
   * @param {LODObject} obj
   * @private
   */
  _updateObjectLOD(obj) {
    const distance = this._calculateDistance(obj);
    const newLevel = this._getLevelForDistance(distance, obj.currentLevel);

    if (newLevel !== obj.currentLevel) {
      const oldLevel = obj.currentLevel;
      obj.currentLevel = newLevel;

      this.emit('lod:changed', {
        id: obj.id,
        oldLevel,
        newLevel,
        distance,
        object: obj,
      });
    }
  }

  /**
   * Calculate distance from camera to object
   * @param {LODObject} obj
   * @returns {number}
   * @private
   */
  _calculateDistance(obj) {
    const dx = obj.x - this._cameraPosition.x;
    const dy = obj.y - this._cameraPosition.y;
    const dz = obj.z - this._cameraPosition.z;
    return Math.sqrt(dx * dx + dy * dy + dz * dz);
  }

  /**
   * Get the LOD level for a given distance
   * @param {number} distance
   * @param {string} [currentLevel] - Current level for hysteresis
   * @returns {string}
   * @private
   */
  _getLevelForDistance(distance, currentLevel = null) {
    // Find the appropriate level
    for (let i = 0; i < this.levels.length; i++) {
      const level = this.levels[i];

      if (distance < level.distance) {
        // Check hysteresis - avoid rapid switching
        if (currentLevel && this.hysteresis > 0) {
          const currentIndex = this.levels.findIndex((l) => l.quality === currentLevel);

          // If transitioning to higher detail, require crossing hysteresis threshold
          if (i < currentIndex) {
            const hysteresisDistance = level.distance - this.hysteresis;
            if (distance > hysteresisDistance) {
              return currentLevel;
            }
          }
          // If transitioning to lower detail, require crossing hysteresis threshold
          else if (i > currentIndex) {
            const hysteresisDistance = this.levels[currentIndex].distance + this.hysteresis;
            if (distance < hysteresisDistance) {
              return currentLevel;
            }
          }
        }

        return level.quality;
      }
    }

    // Default to lowest quality (culled)
    return this.levels[this.levels.length - 1].quality;
  }

  /**
   * Get all objects at a specific LOD level
   * @param {string} quality
   * @returns {LODObject[]}
   */
  getObjectsByLevel(quality) {
    const results = [];
    for (const obj of this._objects.values()) {
      if (obj.currentLevel === quality) {
        results.push(obj);
      }
    }
    return results;
  }

  /**
   * Get visible objects (not culled)
   * @returns {LODObject[]}
   */
  getVisibleObjects() {
    const results = [];
    for (const obj of this._objects.values()) {
      if (obj.currentLevel !== LODQuality.CULLED) {
        results.push(obj);
      }
    }
    return results;
  }

  /**
   * Get objects within a distance
   * @param {number} maxDistance
   * @returns {LODObject[]}
   */
  getObjectsWithinDistance(maxDistance) {
    const results = [];
    for (const obj of this._objects.values()) {
      if (this._calculateDistance(obj) <= maxDistance) {
        results.push(obj);
      }
    }
    return results;
  }

  /**
   * Get an object by ID
   * @param {string} id
   * @returns {LODObject|undefined}
   */
  getObject(id) {
    return this._objects.get(id);
  }

  /**
   * Get count of objects at each level
   * @returns {Object<string, number>}
   */
  getLevelCounts() {
    const counts = {};

    for (const level of this.levels) {
      counts[level.quality] = 0;
    }

    for (const obj of this._objects.values()) {
      counts[obj.currentLevel] = (counts[obj.currentLevel] || 0) + 1;
    }

    return counts;
  }

  /**
   * Get total object count
   * @returns {number}
   */
  getObjectCount() {
    return this._objects.size;
  }

  /**
   * Clear all objects
   */
  clear() {
    this._objects.clear();
    this.emit('cleared');
  }

  /**
   * Enable/disable LOD updates
   * @param {boolean} enabled
   */
  setEnabled(enabled) {
    this._enabled = enabled;
  }

  /**
   * Check if LOD is enabled
   * @returns {boolean}
   */
  isEnabled() {
    return this._enabled;
  }

  /**
   * Get the LOD level config for a quality
   * @param {string} quality
   * @returns {LODLevel|undefined}
   */
  getLevelConfig(quality) {
    return this.levels.find((l) => l.quality === quality);
  }

  /**
   * Set custom LOD levels
   * @param {LODLevel[]} levels
   */
  setLevels(levels) {
    this.levels = [...levels].sort((a, b) => a.distance - b.distance);
    this.forceUpdate();
  }
}

// ==========================================================================
// LOD Helper - Mesh Representation Switching
// ==========================================================================

/**
 * LODMeshHelper - Helps manage mesh switching based on LOD
 */
export class LODMeshHelper {
  /**
   * @param {Object} [options]
   * @param {Object} [options.scene] - Scene to add/remove meshes
   */
  constructor(options = {}) {
    /** @type {Object|null} */
    this.scene = options.scene ?? null;

    /** @type {Map<string, Object>} */
    this._meshes = new Map();
  }

  /**
   * Register meshes for different LOD levels
   * @param {string} id - Object ID
   * @param {Object} meshes - Meshes by quality level
   */
  registerMeshes(id, meshes) {
    this._meshes.set(id, { ...meshes });
  }

  /**
   * Handle LOD level change
   * @param {Object} event - LOD change event
   * @param {string} event.id
   * @param {string} event.oldLevel
   * @param {string} event.newLevel
   */
  onLODChanged({ id, oldLevel, newLevel }) {
    const meshes = this._meshes.get(id);
    if (!meshes) {
      return;
    }

    const oldMesh = meshes[oldLevel];
    const newMesh = meshes[newLevel];

    // Remove old mesh from scene
    if (oldMesh && this.scene?.remove) {
      this.scene.remove(oldMesh);
      oldMesh.visible = false;
    }

    // Add new mesh to scene
    if (newMesh && this.scene?.add && newLevel !== LODQuality.CULLED) {
      this.scene.add(newMesh);
      newMesh.visible = true;
    }
  }

  /**
   * Get mesh for an object at a specific level
   * @param {string} id
   * @param {string} quality
   * @returns {Object|undefined}
   */
  getMesh(id, quality) {
    return this._meshes.get(id)?.[quality];
  }

  /**
   * Clear all meshes
   */
  clear() {
    this._meshes.clear();
  }
}

// ==========================================================================
// Singleton Instance
// ==========================================================================

let lodSystemInstance = null;

/**
 * Get the singleton LOD system instance
 * @returns {LODSystem}
 */
export function getLODSystem() {
  if (!lodSystemInstance) {
    lodSystemInstance = new LODSystem();
  }
  return lodSystemInstance;
}

/**
 * Reset the LOD system instance (for testing)
 */
export function resetLODSystem() {
  if (lodSystemInstance) {
    lodSystemInstance.clear();
    lodSystemInstance = null;
  }
}

export default LODSystem;
