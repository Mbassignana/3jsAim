/**
 * TargetingSystem - Unified raycasting and target detection
 * Abstracts the common targeting logic for both Three.js and Canvas 2D renderers
 */

import { EventEmitter } from '../utils/EventEmitter.js';

// ==========================================================================
// Target Types
// ==========================================================================

/**
 * @typedef {Object} TargetableObject
 * @property {string} type - Type of target ('circle', 'npc', etc.)
 * @property {number} x - X position
 * @property {number} y - Y position
 * @property {number} [z] - Z position (for 3D)
 * @property {number} [radius] - Collision radius
 */

/**
 * @typedef {Object} RaycastHit
 * @property {string} type - Target type
 * @property {number} index - Index in source array
 * @property {number} distance - Distance from origin
 * @property {TargetableObject} object - The hit object
 * @property {Object} [point] - Hit point coordinates
 */

/**
 * @typedef {Object} RaycastOrigin
 * @property {number} x - Origin X
 * @property {number} y - Origin Y
 * @property {number} [z] - Origin Z (for 3D)
 * @property {number} angle - Direction angle (radians)
 * @property {number} [pitch] - Vertical angle (for 3D)
 */

// ==========================================================================
// Target Categories
// ==========================================================================

export const TargetType = {
  CIRCLE: 'circle',
  NPC: 'npc',
  BUILDING: 'building',
  WALL: 'wall',
  PROP: 'prop',
};

export const TargetCategory = {
  SHOOTABLE: [TargetType.CIRCLE, TargetType.NPC],
  OBSTACLE: [TargetType.BUILDING, TargetType.WALL],
  INTERACTIVE: [TargetType.CIRCLE, TargetType.NPC, TargetType.PROP],
};

// ==========================================================================
// Base Raycast Strategy Interface
// ==========================================================================

/**
 * Base class for raycast strategies
 * Implement this for different rendering backends
 */
export class RaycastStrategy {
  /**
   * Cast a ray and find intersections
   * @param {RaycastOrigin} origin - Ray origin
   * @param {Array<TargetableObject>} targets - Targets to check
   * @param {Object} options - Raycast options
   * @returns {Array<RaycastHit>} Hits sorted by distance
   */
  cast(origin, targets, _options = {}) {
    throw new Error('RaycastStrategy.cast() must be implemented');
  }

  /**
   * Check if a single target is hit
   * @param {RaycastOrigin} origin - Ray origin
   * @param {TargetableObject} target - Target to check
   * @param {Object} options - Options
   * @returns {RaycastHit|null}
   */
  checkTarget(origin, target, _options = {}) {
    throw new Error('RaycastStrategy.checkTarget() must be implemented');
  }
}

// ==========================================================================
// Canvas 2D Cone-based Raycast Strategy
// ==========================================================================

/**
 * 2D cone-based targeting for Canvas renderer
 * Uses angle difference and distance checks
 */
export class Canvas2DRaycastStrategy extends RaycastStrategy {
  /**
   * @param {Object} [config]
   * @param {number} [config.maxRange=1000] - Maximum detection range
   * @param {number} [config.coneAngle=0.1] - Shoot cone half-angle (radians)
   */
  constructor(config = {}) {
    super();
    this.maxRange = config.maxRange ?? 1000;
    this.coneAngle = config.coneAngle ?? 0.1;
  }

  /**
   * Cast ray and find all hits within cone
   * @param {RaycastOrigin} origin
   * @param {Array<TargetableObject>} targets
   * @param {Object} [options]
   * @returns {Array<RaycastHit>}
   */
  cast(origin, targets, options = {}) {
    const maxRange = options.maxRange ?? this.maxRange;
    const coneAngle = options.coneAngle ?? this.coneAngle;
    const hits = [];

    targets.forEach((target, index) => {
      const hit = this.checkTarget(origin, target, {
        index,
        maxRange,
        coneAngle,
      });
      if (hit) {
        hits.push(hit);
      }
    });

    // Sort by distance (closest first)
    return hits.sort((a, b) => a.distance - b.distance);
  }

  /**
   * Check if a single target is within the cone
   * @param {RaycastOrigin} origin
   * @param {TargetableObject} target
   * @param {Object} [options]
   * @returns {RaycastHit|null}
   */
  checkTarget(origin, target, options = {}) {
    const maxRange = options.maxRange ?? this.maxRange;
    const coneAngle = options.coneAngle ?? this.coneAngle;
    const index = options.index ?? 0;

    // Calculate vector to target
    const dx = target.x - origin.x;
    const dy = target.y - origin.y;
    const distance = Math.sqrt(dx * dx + dy * dy);

    // Range check
    if (distance > maxRange) {
      return null;
    }

    // Calculate angle to target
    const targetAngle = Math.atan2(dy, dx);
    let angleDiff = targetAngle - origin.angle;

    // Normalize angle to [-PI, PI]
    angleDiff = this._normalizeAngle(angleDiff);

    // Cone check
    if (Math.abs(angleDiff) <= coneAngle) {
      return {
        type: target.type,
        index,
        distance,
        object: target,
        point: { x: target.x, y: target.y },
        angleDiff,
      };
    }

    return null;
  }

  /**
   * Normalize angle to [-PI, PI]
   * @param {number} angle
   * @returns {number}
   * @private
   */
  _normalizeAngle(angle) {
    while (angle > Math.PI) angle -= 2 * Math.PI;
    while (angle < -Math.PI) angle += 2 * Math.PI;
    return angle;
  }
}

// ==========================================================================
// Three.js Raycast Strategy (Adapter)
// ==========================================================================

/**
 * Three.js raycast strategy adapter
 * Wraps THREE.Raycaster for use with the unified system
 */
export class ThreeJSRaycastStrategy extends RaycastStrategy {
  /**
   * @param {Object} [deps] - Dependencies
   * @param {Object} [deps.THREE] - Three.js module
   * @param {Object} [deps.raycaster] - Existing raycaster instance
   */
  constructor(deps = {}) {
    super();
    this.THREE = deps.THREE;
    this.raycaster = deps.raycaster;
  }

  /**
   * Cast ray using Three.js raycaster
   * @param {RaycastOrigin} origin - Contains camera
   * @param {Array} targets - Scene children or specific objects
   * @param {Object} [options]
   * @returns {Array<RaycastHit>}
   */
  cast(origin, targets, options = {}) {
    if (!this.raycaster || !this.THREE) {
      return [];
    }

    const camera = options.camera;
    const scene = options.scene;
    const targetTypes = options.targetTypes ?? TargetCategory.SHOOTABLE;

    // Set up raycaster from camera center
    this.raycaster.setFromCamera(new this.THREE.Vector2(0, 0), camera);

    // Get intersections
    const objectsToCheck = scene ? scene.children : targets;
    const intersects = this.raycaster.intersectObjects(objectsToCheck, true);

    // Filter and convert to unified format
    const hits = [];
    intersects.forEach((intersect, index) => {
      const object = intersect.object;
      const type = object.userData?.type;

      if (type && targetTypes.includes(type)) {
        hits.push({
          type,
          index,
          distance: intersect.distance,
          object: object,
          point: intersect.point
            ? { x: intersect.point.x, y: intersect.point.y, z: intersect.point.z }
            : null,
        });
      }
    });

    return hits;
  }

  /**
   * Check single target (not optimized for Three.js, prefer cast())
   */
  checkTarget(origin, target, options = {}) {
    const hits = this.cast(origin, [target], options);
    return hits.length > 0 ? hits[0] : null;
  }
}

// ==========================================================================
// Targeting System
// ==========================================================================

/**
 * Unified targeting system that works with any raycast strategy
 */
export class TargetingSystem extends EventEmitter {
  /**
   * @param {Object} [config]
   * @param {RaycastStrategy} [config.strategy] - Raycast strategy
   * @param {number} [config.maxRange=1000] - Default max range
   * @param {number} [config.fireRate=100] - Min ms between shots
   */
  constructor(config = {}) {
    super();

    /** @type {RaycastStrategy} */
    this.strategy = config.strategy ?? new Canvas2DRaycastStrategy();

    /** @type {number} */
    this.maxRange = config.maxRange ?? 1000;

    /** @type {number} */
    this.fireRate = config.fireRate ?? 100;

    /** @type {number} */
    this._lastShotTime = 0;

    /** @type {Map<string, Array>} */
    this._targetGroups = new Map();
  }

  /**
   * Set the raycast strategy
   * @param {RaycastStrategy} strategy
   */
  setStrategy(strategy) {
    this.strategy = strategy;
  }

  /**
   * Register a group of targets
   * @param {string} groupName - Group identifier
   * @param {Array<TargetableObject>} targets - Target objects
   */
  registerTargets(groupName, targets) {
    this._targetGroups.set(groupName, targets);
  }

  /**
   * Unregister a target group
   * @param {string} groupName
   */
  unregisterTargets(groupName) {
    this._targetGroups.delete(groupName);
  }

  /**
   * Get all registered targets
   * @param {Array<string>} [groups] - Specific groups to include
   * @returns {Array<{target: TargetableObject, group: string, index: number}>}
   */
  getAllTargets(groups = null) {
    const allTargets = [];

    this._targetGroups.forEach((targets, groupName) => {
      if (!groups || groups.includes(groupName)) {
        targets.forEach((target, index) => {
          allTargets.push({ target, group: groupName, index });
        });
      }
    });

    return allTargets;
  }

  /**
   * Find objects in crosshair/line of fire
   * @param {RaycastOrigin} origin - Player/camera position and direction
   * @param {Object} [options]
   * @param {Array<string>} [options.targetTypes] - Types to check
   * @param {number} [options.maxRange] - Override max range
   * @returns {Array<RaycastHit>}
   */
  getObjectsInCrosshair(origin, options = {}) {
    const targetTypes = options.targetTypes ?? TargetCategory.SHOOTABLE;
    const maxRange = options.maxRange ?? this.maxRange;

    // Collect all targets of the specified types
    const targets = [];
    this._targetGroups.forEach((groupTargets, groupName) => {
      groupTargets.forEach((target, index) => {
        if (targetTypes.includes(target.type)) {
          targets.push({ ...target, _index: index, _group: groupName });
        }
      });
    });

    // Cast ray
    const hits = this.strategy.cast(origin, targets, {
      ...options,
      maxRange,
    });

    // Enhance hits with group info
    return hits.map((hit) => ({
      ...hit,
      group: hit.object._group,
      originalIndex: hit.object._index,
    }));
  }

  /**
   * Perform a shot and return hit result
   * @param {RaycastOrigin} origin
   * @param {Object} [options]
   * @returns {{canShoot: boolean, hit: RaycastHit|null, blocked: string|null}}
   */
  shoot(origin, options = {}) {
    // Fire rate check
    const currentTime = Date.now();
    if (currentTime - this._lastShotTime < this.fireRate) {
      return { canShoot: false, hit: null, blocked: 'rate_limit' };
    }

    this._lastShotTime = currentTime;

    // Get objects in crosshair
    const hits = this.getObjectsInCrosshair(origin, {
      ...options,
      targetTypes: TargetCategory.SHOOTABLE,
    });

    // Emit shot event
    this.emit('shoot', { origin, hits });

    if (hits.length === 0) {
      this.emit('shoot:miss', { origin });
      return { canShoot: true, hit: null, blocked: null };
    }

    const hit = hits[0];
    this.emit('shoot:hit', { origin, hit });

    return { canShoot: true, hit, blocked: null };
  }

  /**
   * Check if shooting is allowed (rate limit check only)
   * @returns {boolean}
   */
  canShoot() {
    return Date.now() - this._lastShotTime >= this.fireRate;
  }

  /**
   * Reset fire rate timer
   */
  resetFireRate() {
    this._lastShotTime = 0;
  }

  /**
   * Get closest target of specific types
   * @param {RaycastOrigin} origin
   * @param {Array<string>} [targetTypes]
   * @returns {RaycastHit|null}
   */
  getClosestTarget(origin, targetTypes = TargetCategory.SHOOTABLE) {
    const hits = this.getObjectsInCrosshair(origin, { targetTypes });
    return hits.length > 0 ? hits[0] : null;
  }

  /**
   * Check if any target is in range
   * @param {RaycastOrigin} origin
   * @param {Array<string>} [targetTypes]
   * @returns {boolean}
   */
  hasTargetInRange(origin, targetTypes = TargetCategory.SHOOTABLE) {
    return this.getClosestTarget(origin, targetTypes) !== null;
  }
}

// ==========================================================================
// Factory Functions
// ==========================================================================

/**
 * Create a targeting system for Canvas 2D games
 * @param {Object} [config]
 * @returns {TargetingSystem}
 */
export function createCanvas2DTargeting(config = {}) {
  const strategy = new Canvas2DRaycastStrategy({
    maxRange: config.maxRange ?? 1000,
    coneAngle: config.coneAngle ?? 0.1,
  });

  return new TargetingSystem({
    ...config,
    strategy,
  });
}

/**
 * Create a targeting system for Three.js games
 * @param {Object} deps - Dependencies
 * @param {Object} deps.THREE - Three.js module
 * @param {Object} [deps.raycaster] - Existing raycaster
 * @param {Object} [config]
 * @returns {TargetingSystem}
 */
export function createThreeJSTargeting(deps, config = {}) {
  const strategy = new ThreeJSRaycastStrategy(deps);

  return new TargetingSystem({
    ...config,
    strategy,
  });
}

export default TargetingSystem;
