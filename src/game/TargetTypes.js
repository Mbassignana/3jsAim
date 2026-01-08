/**
 * TargetTypes - Defines different target behaviors and types
 * Includes moving, shrinking, bonus, split, armored, ghost, and streak targets
 */

import { EventEmitter, GameEvents, getEventBus } from '../utils/EventEmitter.js';

// ==========================================================================
// Types
// ==========================================================================

/**
 * @typedef {Object} TargetConfig
 * @property {string} id - Unique target type identifier
 * @property {string} name - Display name
 * @property {string} description - Target description
 * @property {number} basePoints - Base points when hit
 * @property {number} baseRadius - Base radius in units
 * @property {number} baseHealth - Hits required to destroy
 * @property {string} color - Primary color
 * @property {string} [secondaryColor] - Secondary color for effects
 * @property {Object} behavior - Behavior configuration
 */

/**
 * @typedef {Object} TargetInstance
 * @property {string} id - Unique instance ID
 * @property {string} typeId - Target type ID
 * @property {Object} position - {x, y, z} position
 * @property {number} radius - Current radius
 * @property {number} health - Current health
 * @property {number} points - Points value
 * @property {Object} behaviorState - Type-specific state
 * @property {number} createdAt - Creation timestamp
 * @property {boolean} isActive - Whether target is active
 */

// ==========================================================================
// Target Type Definitions
// ==========================================================================

export const TargetTypes = {
  STANDARD: {
    id: 'standard',
    name: 'Standard',
    description: 'Basic stationary target',
    basePoints: 10,
    baseRadius: 1.0,
    baseHealth: 1,
    color: '#ff4444',
    behavior: {
      type: 'static',
    },
  },

  MOVING: {
    id: 'moving',
    name: 'Moving',
    description: 'Target that moves in patterns',
    basePoints: 20,
    baseRadius: 0.9,
    baseHealth: 1,
    color: '#44ff44',
    behavior: {
      type: 'moving',
      speed: 3.0, // Units per second
      pattern: 'linear', // linear, sine, circular, random
      amplitude: 5.0, // Movement range
      frequency: 1.0, // Oscillation frequency
    },
  },

  SHRINKING: {
    id: 'shrinking',
    name: 'Shrinking',
    description: 'Target that shrinks over time - hit before it disappears!',
    basePoints: 25,
    baseRadius: 1.5,
    baseHealth: 1,
    color: '#ff8844',
    behavior: {
      type: 'shrinking',
      shrinkRate: 0.2, // Radius reduction per second
      minRadius: 0.2, // Minimum before despawn
      bonusMultiplier: 2.0, // Bonus for hitting at small size
    },
  },

  BONUS: {
    id: 'bonus',
    name: 'Bonus',
    description: 'High-value target with limited time',
    basePoints: 50,
    baseRadius: 0.8,
    baseHealth: 1,
    color: '#ffff44',
    secondaryColor: '#ffaa00',
    behavior: {
      type: 'bonus',
      lifetime: 3.0, // Seconds before despawn
      flashRate: 4.0, // Flashes per second when expiring
      flashThreshold: 1.0, // Start flashing at this remaining time
    },
  },

  SPLIT: {
    id: 'split',
    name: 'Split',
    description: 'Splits into smaller targets when hit',
    basePoints: 15,
    baseRadius: 1.2,
    baseHealth: 1,
    color: '#44ffff',
    behavior: {
      type: 'split',
      splitCount: 3, // Number of child targets
      childScale: 0.5, // Scale factor for children
      childPoints: 10, // Points per child
      splitVelocity: 2.0, // Initial velocity of children
      maxSplitDepth: 2, // Maximum split generations
    },
  },

  ARMORED: {
    id: 'armored',
    name: 'Armored',
    description: 'Requires multiple hits to destroy',
    basePoints: 40,
    baseRadius: 1.1,
    baseHealth: 3,
    color: '#888888',
    secondaryColor: '#444444',
    behavior: {
      type: 'armored',
      damageFlash: 0.2, // Flash duration on hit
      weakPointEnabled: false, // No weak point by default
    },
  },

  GHOST: {
    id: 'ghost',
    name: 'Ghost',
    description: 'Fades in and out of visibility',
    basePoints: 30,
    baseRadius: 1.0,
    baseHealth: 1,
    color: '#aa88ff',
    behavior: {
      type: 'ghost',
      visibleDuration: 2.0, // Seconds visible
      invisibleDuration: 1.5, // Seconds invisible
      fadeTime: 0.5, // Transition time
      canHitWhileInvisible: false, // Whether can be hit when invisible
    },
  },

  STREAK: {
    id: 'streak',
    name: 'Streak',
    description: 'Fast-moving target worth bonus points',
    basePoints: 35,
    baseRadius: 0.7,
    baseHealth: 1,
    color: '#ff44ff',
    behavior: {
      type: 'streak',
      speed: 8.0, // Very fast
      trailLength: 5, // Number of trail segments
      direction: null, // Set at spawn (random)
    },
  },
};

export const DEFAULT_TARGET_TYPE = TargetTypes.STANDARD;

// ==========================================================================
// Movement Patterns
// ==========================================================================

export const MovementPatterns = {
  /**
   * Linear back-and-forth movement
   */
  linear: (time, config, startPos) => {
    const offset = Math.sin(time * config.frequency * Math.PI * 2) * config.amplitude;
    return {
      x: startPos.x + offset,
      y: startPos.y,
      z: startPos.z,
    };
  },

  /**
   * Sine wave movement (vertical)
   */
  sine: (time, config, startPos) => {
    const offsetX = time * config.speed;
    const offsetY = Math.sin(time * config.frequency * Math.PI * 2) * config.amplitude;
    return {
      x: startPos.x + offsetX,
      y: startPos.y + offsetY,
      z: startPos.z,
    };
  },

  /**
   * Circular movement
   */
  circular: (time, config, startPos) => {
    const angle = time * config.frequency * Math.PI * 2;
    return {
      x: startPos.x + Math.cos(angle) * config.amplitude,
      y: startPos.y + Math.sin(angle) * config.amplitude,
      z: startPos.z,
    };
  },

  /**
   * Random walk movement
   */
  random: (time, config, startPos, state) => {
    // Update direction periodically
    if (!state.lastDirectionChange || time - state.lastDirectionChange > 1.0) {
      state.direction = {
        x: (Math.random() - 0.5) * 2,
        y: (Math.random() - 0.5) * 2,
        z: 0,
      };
      state.lastDirectionChange = time;
    }

    // Move in current direction
    const delta = config.speed * 0.016; // Assume 60fps for calculation
    return {
      x: Math.max(
        startPos.x - config.amplitude,
        Math.min(
          startPos.x + config.amplitude,
          (state.currentPos?.x ?? startPos.x) + state.direction.x * delta
        )
      ),
      y: Math.max(
        startPos.y - config.amplitude,
        Math.min(
          startPos.y + config.amplitude,
          (state.currentPos?.y ?? startPos.y) + state.direction.y * delta
        )
      ),
      z: startPos.z,
    };
  },
};

// ==========================================================================
// TargetFactory Class
// ==========================================================================

let targetIdCounter = 0;

export class TargetFactory {
  /**
   * Create a target instance
   * @param {string|TargetConfig} type - Target type ID or config
   * @param {Object} position - Initial position {x, y, z}
   * @param {Object} [options] - Additional options
   * @returns {TargetInstance}
   */
  static create(type, position, options = {}) {
    const config =
      typeof type === 'string'
        ? TargetTypes[type.toUpperCase()] || Object.values(TargetTypes).find((t) => t.id === type)
        : type;

    if (!config) {
      throw new Error(`Unknown target type: ${type}`);
    }

    const id = `target_${++targetIdCounter}`;

    return {
      id,
      typeId: config.id,
      config,
      position: { ...position },
      startPosition: { ...position },
      radius: options.radius ?? config.baseRadius,
      health: options.health ?? config.baseHealth,
      maxHealth: options.health ?? config.baseHealth,
      points: options.points ?? config.basePoints,
      behaviorState: TargetFactory._initBehaviorState(config, options),
      createdAt: Date.now(),
      isActive: true,
    };
  }

  /**
   * Create multiple targets of the same type
   * @param {string|TargetConfig} type
   * @param {Object[]} positions
   * @param {Object} [options]
   * @returns {TargetInstance[]}
   */
  static createMultiple(type, positions, options = {}) {
    return positions.map((pos) => TargetFactory.create(type, pos, options));
  }

  /**
   * Create child targets for split behavior
   * @param {TargetInstance} parent - Parent target that was destroyed
   * @returns {TargetInstance[]}
   */
  static createSplitChildren(parent) {
    const config = parent.config;
    const behavior = config.behavior;
    const currentDepth = parent.behaviorState.splitDepth || 0;

    if (currentDepth >= behavior.maxSplitDepth) {
      return [];
    }

    const children = [];
    const angleStep = (Math.PI * 2) / behavior.splitCount;

    for (let i = 0; i < behavior.splitCount; i++) {
      const angle = angleStep * i + Math.random() * 0.5;
      const velocity = {
        x: Math.cos(angle) * behavior.splitVelocity,
        y: Math.sin(angle) * behavior.splitVelocity,
        z: 0,
      };

      const child = TargetFactory.create(config, parent.position, {
        radius: parent.radius * behavior.childScale,
        points: behavior.childPoints,
      });

      child.behaviorState.velocity = velocity;
      child.behaviorState.splitDepth = currentDepth + 1;
      child.behaviorState.isChild = true;

      children.push(child);
    }

    return children;
  }

  /**
   * Initialize behavior state for a target
   * @param {TargetConfig} config
   * @param {Object} options
   * @returns {Object}
   * @private
   */
  static _initBehaviorState(config, options) {
    const state = {
      elapsedTime: 0,
    };

    switch (config.behavior.type) {
      case 'moving':
        state.pattern = options.pattern ?? config.behavior.pattern;
        state.currentPos = null;
        state.direction = null;
        state.lastDirectionChange = 0;
        break;

      case 'shrinking':
        state.currentRadius = config.baseRadius;
        break;

      case 'bonus':
        state.isFlashing = false;
        state.visible = true;
        break;

      case 'split':
        state.splitDepth = options.splitDepth ?? 0;
        state.velocity = options.velocity ?? { x: 0, y: 0, z: 0 };
        state.isChild = false;
        break;

      case 'armored':
        state.isFlashing = false;
        state.flashEndTime = 0;
        break;

      case 'ghost':
        state.opacity = 1.0;
        state.isVisible = true;
        state.phaseTime = 0;
        break;

      case 'streak': {
        state.direction = options.direction ?? {
          x: (Math.random() - 0.5) * 2,
          y: (Math.random() - 0.5) * 2,
          z: 0,
        };
        // Normalize direction
        const mag = Math.sqrt(
          state.direction.x ** 2 + state.direction.y ** 2 + state.direction.z ** 2
        );
        if (mag > 0) {
          state.direction.x /= mag;
          state.direction.y /= mag;
          state.direction.z /= mag;
        }
        state.trail = [];
        break;
      }
    }

    return state;
  }

  /**
   * Reset the target ID counter (for testing)
   */
  static resetIdCounter() {
    targetIdCounter = 0;
  }
}

// ==========================================================================
// TargetBehaviorManager Class
// ==========================================================================

export class TargetBehaviorManager extends EventEmitter {
  constructor() {
    super();

    /** @type {Map<string, TargetInstance>} */
    this._targets = new Map();

    /** @type {number} */
    this._lastUpdateTime = 0;
  }

  /**
   * Add a target to be managed
   * @param {TargetInstance} target
   */
  addTarget(target) {
    this._targets.set(target.id, target);
    this.emit('target:added', { target });
  }

  /**
   * Remove a target
   * @param {string} targetId
   */
  removeTarget(targetId) {
    const target = this._targets.get(targetId);
    if (target) {
      this._targets.delete(targetId);
      this.emit('target:removed', { target });
    }
  }

  /**
   * Get a target by ID
   * @param {string} targetId
   * @returns {TargetInstance|undefined}
   */
  getTarget(targetId) {
    return this._targets.get(targetId);
  }

  /**
   * Get all active targets
   * @returns {TargetInstance[]}
   */
  getActiveTargets() {
    return Array.from(this._targets.values()).filter((t) => t.isActive);
  }

  /**
   * Get targets by type
   * @param {string} typeId
   * @returns {TargetInstance[]}
   */
  getTargetsByType(typeId) {
    return Array.from(this._targets.values()).filter((t) => t.typeId === typeId);
  }

  /**
   * Update all target behaviors
   * @param {number} deltaTime - Time since last update in seconds
   */
  update(deltaTime) {
    const targetsToRemove = [];
    const targetsToAdd = [];

    for (const target of this._targets.values()) {
      if (!target.isActive) continue;

      target.behaviorState.elapsedTime += deltaTime;

      const result = this._updateTargetBehavior(target, deltaTime);

      if (result.shouldRemove) {
        targetsToRemove.push(target.id);
      }

      if (result.newTargets) {
        targetsToAdd.push(...result.newTargets);
      }
    }

    // Remove expired targets
    for (const id of targetsToRemove) {
      const target = this._targets.get(id);
      target.isActive = false;
      this.emit('target:expired', { target });
      this._targets.delete(id);
    }

    // Add new targets (from splits, etc.)
    for (const target of targetsToAdd) {
      this.addTarget(target);
    }
  }

  /**
   * Process a hit on a target
   * @param {string} targetId
   * @param {Object} [hitData] - Additional hit data
   * @returns {{destroyed: boolean, points: number, newTargets: TargetInstance[]}}
   */
  processHit(targetId, hitData = {}) {
    const target = this._targets.get(targetId);
    if (!target || !target.isActive) {
      return { destroyed: false, points: 0, newTargets: [] };
    }

    // Check if ghost target can be hit
    if (target.config.behavior.type === 'ghost') {
      if (!target.config.behavior.canHitWhileInvisible && !target.behaviorState.isVisible) {
        return { destroyed: false, points: 0, newTargets: [] };
      }
    }

    // Apply damage
    const damage = hitData.damage ?? 1;
    target.health -= damage;

    // Calculate points
    let points = target.points;

    // Shrinking bonus
    if (target.config.behavior.type === 'shrinking') {
      const sizeRatio = target.radius / target.config.baseRadius;
      if (sizeRatio < 0.5) {
        points = Math.round(points * target.config.behavior.bonusMultiplier);
      }
    }

    // Check if destroyed
    if (target.health <= 0) {
      target.isActive = false;

      let newTargets = [];

      // Handle split
      if (target.config.behavior.type === 'split') {
        newTargets = TargetFactory.createSplitChildren(target);
        for (const child of newTargets) {
          this.addTarget(child);
        }
      }

      this.emit('target:destroyed', { target, points, newTargets });
      getEventBus().emit(GameEvents.TARGET_HIT, { target, points });

      this._targets.delete(targetId);

      return { destroyed: true, points, newTargets };
    }

    // Target damaged but not destroyed (armored)
    if (target.config.behavior.type === 'armored') {
      target.behaviorState.isFlashing = true;
      target.behaviorState.flashEndTime =
        target.behaviorState.elapsedTime + target.config.behavior.damageFlash;
    }

    this.emit('target:damaged', { target, remainingHealth: target.health });

    return { destroyed: false, points: 0, newTargets: [] };
  }

  /**
   * Clear all targets
   */
  clear() {
    this._targets.clear();
    this.emit('targets:cleared');
  }

  /**
   * Get target count
   * @returns {number}
   */
  get count() {
    return this._targets.size;
  }

  /**
   * Update a single target's behavior
   * @param {TargetInstance} target
   * @param {number} deltaTime
   * @returns {{shouldRemove: boolean, newTargets?: TargetInstance[]}}
   * @private
   */
  _updateTargetBehavior(target, deltaTime) {
    const behavior = target.config.behavior;

    switch (behavior.type) {
      case 'static':
        // No updates needed
        return { shouldRemove: false };

      case 'moving':
        return this._updateMovingTarget(target, deltaTime);

      case 'shrinking':
        return this._updateShrinkingTarget(target, deltaTime);

      case 'bonus':
        return this._updateBonusTarget(target, deltaTime);

      case 'split':
        return this._updateSplitTarget(target, deltaTime);

      case 'armored':
        return this._updateArmoredTarget(target, deltaTime);

      case 'ghost':
        return this._updateGhostTarget(target, deltaTime);

      case 'streak':
        return this._updateStreakTarget(target, deltaTime);

      default:
        return { shouldRemove: false };
    }
  }

  /**
   * Update moving target
   * @private
   */
  _updateMovingTarget(target, _deltaTime) {
    const behavior = target.config.behavior;
    const state = target.behaviorState;
    const pattern = MovementPatterns[state.pattern] || MovementPatterns.linear;

    const newPos = pattern(state.elapsedTime, behavior, target.startPosition, state);
    state.currentPos = newPos;
    target.position = { ...newPos };

    return { shouldRemove: false };
  }

  /**
   * Update shrinking target
   * @private
   */
  _updateShrinkingTarget(target, deltaTime) {
    const behavior = target.config.behavior;

    target.radius -= behavior.shrinkRate * deltaTime;

    if (target.radius <= behavior.minRadius) {
      return { shouldRemove: true };
    }

    return { shouldRemove: false };
  }

  /**
   * Update bonus target
   * @private
   */
  _updateBonusTarget(target, _deltaTime) {
    const behavior = target.config.behavior;
    const state = target.behaviorState;
    const timeRemaining = behavior.lifetime - state.elapsedTime;

    // Check for expiration
    if (timeRemaining <= 0) {
      return { shouldRemove: true };
    }

    // Update flashing state
    if (timeRemaining <= behavior.flashThreshold) {
      state.isFlashing = true;
      const flashCycle = (state.elapsedTime * behavior.flashRate) % 1;
      state.visible = flashCycle < 0.5;
    }

    return { shouldRemove: false };
  }

  /**
   * Update split target (handle child velocity)
   * @private
   */
  _updateSplitTarget(target, deltaTime) {
    const state = target.behaviorState;

    // Apply velocity for children
    if (state.isChild && state.velocity) {
      target.position.x += state.velocity.x * deltaTime;
      target.position.y += state.velocity.y * deltaTime;
      target.position.z += state.velocity.z * deltaTime;

      // Decay velocity
      state.velocity.x *= 0.98;
      state.velocity.y *= 0.98;
      state.velocity.z *= 0.98;
    }

    return { shouldRemove: false };
  }

  /**
   * Update armored target
   * @private
   */
  _updateArmoredTarget(target, _deltaTime) {
    const state = target.behaviorState;

    // Update flash state
    if (state.isFlashing && state.elapsedTime >= state.flashEndTime) {
      state.isFlashing = false;
    }

    return { shouldRemove: false };
  }

  /**
   * Update ghost target
   * @private
   */
  _updateGhostTarget(target, deltaTime) {
    const behavior = target.config.behavior;
    const state = target.behaviorState;

    state.phaseTime += deltaTime;

    const cycleDuration = behavior.visibleDuration + behavior.invisibleDuration;
    const cyclePosition = state.phaseTime % cycleDuration;

    if (cyclePosition < behavior.visibleDuration) {
      // Visible phase
      const fadeInEnd = behavior.fadeTime;
      const fadeOutStart = behavior.visibleDuration - behavior.fadeTime;

      if (cyclePosition < fadeInEnd) {
        // Fading in
        state.opacity = cyclePosition / behavior.fadeTime;
      } else if (cyclePosition > fadeOutStart) {
        // Fading out
        state.opacity = (behavior.visibleDuration - cyclePosition) / behavior.fadeTime;
      } else {
        // Fully visible
        state.opacity = 1.0;
      }
      state.isVisible = state.opacity > 0.1;
    } else {
      // Invisible phase
      state.opacity = 0;
      state.isVisible = false;
    }

    return { shouldRemove: false };
  }

  /**
   * Update streak target
   * @private
   */
  _updateStreakTarget(target, deltaTime) {
    const behavior = target.config.behavior;
    const state = target.behaviorState;

    // Store position for trail
    state.trail.unshift({ ...target.position });
    if (state.trail.length > behavior.trailLength) {
      state.trail.pop();
    }

    // Move in direction
    target.position.x += state.direction.x * behavior.speed * deltaTime;
    target.position.y += state.direction.y * behavior.speed * deltaTime;
    target.position.z += state.direction.z * behavior.speed * deltaTime;

    return { shouldRemove: false };
  }
}

// ==========================================================================
// Singleton
// ==========================================================================

let behaviorManagerInstance = null;

/**
 * Get the singleton behavior manager instance
 * @returns {TargetBehaviorManager}
 */
export function getTargetBehaviorManager() {
  if (!behaviorManagerInstance) {
    behaviorManagerInstance = new TargetBehaviorManager();
  }
  return behaviorManagerInstance;
}

/**
 * Reset the behavior manager instance
 */
export function resetTargetBehaviorManager() {
  if (behaviorManagerInstance) {
    behaviorManagerInstance.clear();
    behaviorManagerInstance.removeAllListeners();
    behaviorManagerInstance = null;
  }
}

export default TargetBehaviorManager;
