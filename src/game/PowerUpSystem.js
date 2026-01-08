/**
 * PowerUpSystem - Manages power-up spawning, collection, and effects
 * Provides temporary gameplay enhancements like slow motion, double points, and auto-aim
 */

import { EventEmitter, getEventBus } from '../utils/EventEmitter.js';

// ==========================================================================
// Types
// ==========================================================================

/**
 * @typedef {Object} PowerUpType
 * @property {string} id - Unique type identifier
 * @property {string} name - Display name
 * @property {string} description - Description of effect
 * @property {string} color - Color for rendering
 * @property {number} duration - Effect duration in ms
 * @property {number} spawnWeight - Relative spawn probability (higher = more common)
 * @property {string} icon - Icon character or emoji
 */

/**
 * @typedef {Object} PowerUp
 * @property {string} id - Unique instance ID
 * @property {string} type - PowerUpType ID
 * @property {number} x - X position
 * @property {number} y - Y position
 * @property {number} radius - Pickup radius
 * @property {number} spawnTime - When spawned (ms)
 * @property {number} lifetime - How long before despawn (ms)
 * @property {boolean} collected - Whether picked up
 */

/**
 * @typedef {Object} ActiveEffect
 * @property {string} type - PowerUpType ID
 * @property {number} startTime - When effect started
 * @property {number} duration - Effect duration
 * @property {number} endTime - When effect ends
 */

/**
 * @typedef {Object} PowerUpConfig
 * @property {number} maxPowerUps - Max spawned at once
 * @property {number} spawnInterval - Ms between spawn attempts
 * @property {number} defaultLifetime - Default time before despawn
 * @property {number} pickupRadius - Collision radius for pickup
 * @property {boolean} stackEffects - Whether same effects stack duration
 */

// ==========================================================================
// Power-Up Type Definitions
// ==========================================================================

export const PowerUpTypes = {
  SLOW_MOTION: {
    id: 'slow_motion',
    name: 'Slow Motion',
    description: 'Slows down time for easier targeting',
    color: '#3498db',
    duration: 5000,
    spawnWeight: 30,
    icon: '⏱',
    effect: {
      timeScale: 0.5,
    },
  },

  DOUBLE_POINTS: {
    id: 'double_points',
    name: 'Double Points',
    description: 'Doubles all points earned',
    color: '#f1c40f',
    duration: 8000,
    spawnWeight: 40,
    icon: '×2',
    effect: {
      scoreMultiplier: 2,
    },
  },

  AUTO_AIM: {
    id: 'auto_aim',
    name: 'Auto-Aim Assist',
    description: 'Increases aim accuracy with target magnetism',
    color: '#e74c3c',
    duration: 6000,
    spawnWeight: 20,
    icon: '⊕',
    effect: {
      aimAssist: 0.5, // Strength of aim assist (0-1)
      coneMultiplier: 2.0, // Wider hit cone
    },
  },

  RAPID_FIRE: {
    id: 'rapid_fire',
    name: 'Rapid Fire',
    description: 'Faster shooting with no cooldown',
    color: '#9b59b6',
    duration: 4000,
    spawnWeight: 25,
    icon: '⚡',
    effect: {
      fireRateMultiplier: 3,
    },
  },

  SHIELD: {
    id: 'shield',
    name: 'Shield',
    description: 'Protects from NPC hit penalties',
    color: '#2ecc71',
    duration: 10000,
    spawnWeight: 15,
    icon: '🛡',
    effect: {
      blockPenalty: true,
    },
  },
};

export const DEFAULT_POWERUP_CONFIG = {
  maxPowerUps: 3,
  spawnInterval: 15000, // 15 seconds
  defaultLifetime: 20000, // 20 seconds before despawn
  pickupRadius: 30,
  stackEffects: false,
};

// ==========================================================================
// PowerUpSystem Class
// ==========================================================================

export class PowerUpSystem extends EventEmitter {
  /**
   * @param {Partial<PowerUpConfig>} [config]
   */
  constructor(config = {}) {
    super();

    /** @type {PowerUpConfig} */
    this._config = { ...DEFAULT_POWERUP_CONFIG, ...config };

    /** @type {Map<string, PowerUp>} */
    this._powerUps = new Map();

    /** @type {Map<string, ActiveEffect>} */
    this._activeEffects = new Map();

    /** @type {PowerUpType[]} */
    this._enabledTypes = Object.values(PowerUpTypes);

    /** @type {number} */
    this._nextId = 0;

    /** @type {number|null} */
    this._spawnTimerId = null;

    /** @type {boolean} */
    this._enabled = true;

    /** @type {Function|null} */
    this._positionValidator = null;

    // Stats
    /** @type {{spawned: number, collected: number, expired: number}} */
    this.stats = {
      spawned: 0,
      collected: 0,
      expired: 0,
    };
  }

  /**
   * Set a function to validate spawn positions
   * @param {Function} validator - (x, y) => boolean
   */
  setPositionValidator(validator) {
    this._positionValidator = validator;
  }

  /**
   * Set which power-up types are enabled
   * @param {string[]} typeIds - Array of PowerUpType IDs
   */
  setEnabledTypes(typeIds) {
    this._enabledTypes = typeIds
      .map((id) => PowerUpTypes[id.toUpperCase()] || Object.values(PowerUpTypes).find((t) => t.id === id))
      .filter(Boolean);
  }

  /**
   * Start automatic spawning
   */
  startSpawning() {
    this.stopSpawning();
    this._spawnTimerId = setInterval(() => {
      this._trySpawn();
    }, this._config.spawnInterval);
  }

  /**
   * Stop automatic spawning
   */
  stopSpawning() {
    if (this._spawnTimerId) {
      clearInterval(this._spawnTimerId);
      this._spawnTimerId = null;
    }
  }

  /**
   * Spawn a power-up at position
   * @param {string} typeId - PowerUpType ID
   * @param {number} x - X position
   * @param {number} y - Y position
   * @param {Object} [options]
   * @returns {PowerUp|null}
   */
  spawn(typeId, x, y, options = {}) {
    if (!this._enabled) {
      return null;
    }

    if (this._powerUps.size >= this._config.maxPowerUps) {
      return null;
    }

    const type = this._getTypeById(typeId);
    if (!type) {
      return null;
    }

    const id = `powerup_${this._nextId++}`;
    const powerUp = {
      id,
      type: type.id,
      x,
      y,
      radius: this._config.pickupRadius,
      spawnTime: Date.now(),
      lifetime: options.lifetime ?? this._config.defaultLifetime,
      collected: false,
    };

    this._powerUps.set(id, powerUp);
    this.stats.spawned++;

    this.emit('powerup:spawned', { powerUp, type });
    getEventBus().emit('powerup:spawned', { powerUp, type });

    // Set despawn timer
    setTimeout(() => {
      this._despawn(id, 'expired');
    }, powerUp.lifetime);

    return powerUp;
  }

  /**
   * Spawn a random power-up at position
   * @param {number} x - X position
   * @param {number} y - Y position
   * @param {Object} [options]
   * @returns {PowerUp|null}
   */
  spawnRandom(x, y, options = {}) {
    const type = this._selectRandomType();
    if (!type) {
      return null;
    }
    return this.spawn(type.id, x, y, options);
  }

  /**
   * Try to collect a power-up at position
   * @param {number} playerX - Player X position
   * @param {number} playerY - Player Y position
   * @returns {PowerUp|null} Collected power-up or null
   */
  tryCollect(playerX, playerY) {
    for (const powerUp of this._powerUps.values()) {
      if (powerUp.collected) {
        continue;
      }

      const dx = powerUp.x - playerX;
      const dy = powerUp.y - playerY;
      const distance = Math.sqrt(dx * dx + dy * dy);

      if (distance <= powerUp.radius) {
        return this._collect(powerUp);
      }
    }

    return null;
  }

  /**
   * Get active effect by type
   * @param {string} typeId - PowerUpType ID
   * @returns {ActiveEffect|null}
   */
  getActiveEffect(typeId) {
    return this._activeEffects.get(typeId) || null;
  }

  /**
   * Check if an effect is active
   * @param {string} typeId - PowerUpType ID
   * @returns {boolean}
   */
  isEffectActive(typeId) {
    const effect = this._activeEffects.get(typeId);
    if (!effect) {
      return false;
    }
    return Date.now() < effect.endTime;
  }

  /**
   * Get remaining time for an effect
   * @param {string} typeId - PowerUpType ID
   * @returns {number} Remaining ms, or 0 if not active
   */
  getEffectTimeRemaining(typeId) {
    const effect = this._activeEffects.get(typeId);
    if (!effect) {
      return 0;
    }
    return Math.max(0, effect.endTime - Date.now());
  }

  /**
   * Get all active effects
   * @returns {ActiveEffect[]}
   */
  getAllActiveEffects() {
    const now = Date.now();
    return Array.from(this._activeEffects.values()).filter((e) => now < e.endTime);
  }

  /**
   * Get current combined effect modifiers
   * @returns {Object}
   */
  getCurrentModifiers() {
    const modifiers = {
      timeScale: 1,
      scoreMultiplier: 1,
      aimAssist: 0,
      coneMultiplier: 1,
      fireRateMultiplier: 1,
      blockPenalty: false,
    };

    const now = Date.now();
    for (const effect of this._activeEffects.values()) {
      if (now >= effect.endTime) {
        continue;
      }

      const type = this._getTypeById(effect.type);
      if (!type?.effect) {
        continue;
      }

      // Apply effect modifiers
      if (type.effect.timeScale !== undefined) {
        modifiers.timeScale = Math.min(modifiers.timeScale, type.effect.timeScale);
      }
      if (type.effect.scoreMultiplier !== undefined) {
        modifiers.scoreMultiplier *= type.effect.scoreMultiplier;
      }
      if (type.effect.aimAssist !== undefined) {
        modifiers.aimAssist = Math.max(modifiers.aimAssist, type.effect.aimAssist);
      }
      if (type.effect.coneMultiplier !== undefined) {
        modifiers.coneMultiplier = Math.max(modifiers.coneMultiplier, type.effect.coneMultiplier);
      }
      if (type.effect.fireRateMultiplier !== undefined) {
        modifiers.fireRateMultiplier = Math.max(modifiers.fireRateMultiplier, type.effect.fireRateMultiplier);
      }
      if (type.effect.blockPenalty) {
        modifiers.blockPenalty = true;
      }
    }

    return modifiers;
  }

  /**
   * Get all spawned power-ups
   * @returns {PowerUp[]}
   */
  getPowerUps() {
    return Array.from(this._powerUps.values()).filter((p) => !p.collected);
  }

  /**
   * Get power-up count
   * @returns {number}
   */
  getPowerUpCount() {
    return this.getPowerUps().length;
  }

  /**
   * Clear all power-ups and effects
   */
  clear() {
    this._powerUps.clear();
    this._activeEffects.clear();
    this.stopSpawning();
  }

  /**
   * Reset system
   */
  reset() {
    this.clear();
    this.stats = { spawned: 0, collected: 0, expired: 0 };
    this._nextId = 0;
  }

  /**
   * Enable/disable the system
   * @param {boolean} enabled
   */
  setEnabled(enabled) {
    this._enabled = enabled;
    if (!enabled) {
      this.stopSpawning();
    }
  }

  /**
   * Check if system is enabled
   * @returns {boolean}
   */
  isEnabled() {
    return this._enabled;
  }

  /**
   * Update active effects (call each frame to clean up expired)
   */
  update() {
    const now = Date.now();

    // Clean up expired effects
    for (const [typeId, effect] of this._activeEffects.entries()) {
      if (now >= effect.endTime) {
        this._activeEffects.delete(typeId);
        this.emit('effect:expired', { typeId, effect });
        getEventBus().emit('effect:expired', { typeId, effect });
      }
    }
  }

  /**
   * Get type by ID
   * @param {string} typeId
   * @returns {PowerUpType|null}
   * @private
   */
  _getTypeById(typeId) {
    return (
      PowerUpTypes[typeId.toUpperCase()] ||
      Object.values(PowerUpTypes).find((t) => t.id === typeId) ||
      null
    );
  }

  /**
   * Select random type based on weights
   * @returns {PowerUpType|null}
   * @private
   */
  _selectRandomType() {
    if (this._enabledTypes.length === 0) {
      return null;
    }

    const totalWeight = this._enabledTypes.reduce((sum, t) => sum + t.spawnWeight, 0);
    let random = Math.random() * totalWeight;

    for (const type of this._enabledTypes) {
      random -= type.spawnWeight;
      if (random <= 0) {
        return type;
      }
    }

    return this._enabledTypes[0];
  }

  /**
   * Try to spawn a random power-up
   * @private
   */
  _trySpawn() {
    if (!this._enabled || this._powerUps.size >= this._config.maxPowerUps) {
      return;
    }

    // Generate random position
    const x = Math.random() * 800 - 400;
    const y = Math.random() * 800 - 400;

    // Validate position if validator exists
    if (this._positionValidator && !this._positionValidator(x, y)) {
      return;
    }

    this.spawnRandom(x, y);
  }

  /**
   * Collect a power-up
   * @param {PowerUp} powerUp
   * @returns {PowerUp}
   * @private
   */
  _collect(powerUp) {
    powerUp.collected = true;
    this._powerUps.delete(powerUp.id);
    this.stats.collected++;

    const type = this._getTypeById(powerUp.type);

    // Activate effect
    this._activateEffect(type);

    this.emit('powerup:collected', { powerUp, type });
    getEventBus().emit('powerup:collected', { powerUp, type });

    return powerUp;
  }

  /**
   * Despawn a power-up
   * @param {string} id
   * @param {string} reason
   * @private
   */
  _despawn(id, reason) {
    const powerUp = this._powerUps.get(id);
    if (!powerUp || powerUp.collected) {
      return;
    }

    this._powerUps.delete(id);

    if (reason === 'expired') {
      this.stats.expired++;
    }

    this.emit('powerup:despawned', { powerUp, reason });
  }

  /**
   * Activate an effect
   * @param {PowerUpType} type
   * @private
   */
  _activateEffect(type) {
    const now = Date.now();
    const existing = this._activeEffects.get(type.id);

    let duration = type.duration;
    const startTime = now;

    // Stack duration if enabled and effect already active
    if (existing && this._config.stackEffects && now < existing.endTime) {
      duration = existing.endTime - now + type.duration;
    }

    const effect = {
      type: type.id,
      startTime,
      duration,
      endTime: startTime + duration,
    };

    this._activeEffects.set(type.id, effect);

    this.emit('effect:activated', { type, effect });
    getEventBus().emit('effect:activated', { type, effect });

    // Set effect expiration
    setTimeout(() => {
      this.update(); // Clean up in update
    }, duration + 10);
  }
}

// ==========================================================================
// Singleton
// ==========================================================================

let powerUpSystemInstance = null;

/**
 * Get the singleton power-up system instance
 * @returns {PowerUpSystem}
 */
export function getPowerUpSystem() {
  if (!powerUpSystemInstance) {
    powerUpSystemInstance = new PowerUpSystem();
  }
  return powerUpSystemInstance;
}

/**
 * Reset the power-up system instance
 */
export function resetPowerUpSystem() {
  if (powerUpSystemInstance) {
    powerUpSystemInstance.reset();
    powerUpSystemInstance.removeAllListeners();
    powerUpSystemInstance = null;
  }
}

export default PowerUpSystem;
