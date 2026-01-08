/**
 * ParticleSystem - Creates and manages particle effects
 * Supports various emitter types for hits, misses, and impacts
 */

import { EventEmitter, GameEvents, getEventBus } from '../utils/EventEmitter.js';
import { ObjectPool } from '../utils/ObjectPool.js';

// ==========================================================================
// Types
// ==========================================================================

/**
 * @typedef {Object} Particle
 * @property {string} id - Unique particle ID
 * @property {Object} position - Current position {x, y, z}
 * @property {Object} velocity - Velocity vector {x, y, z}
 * @property {Object} acceleration - Acceleration vector {x, y, z}
 * @property {number} life - Remaining life (0-1)
 * @property {number} maxLife - Initial life duration (seconds)
 * @property {number} size - Current particle size
 * @property {number} startSize - Initial size
 * @property {number} endSize - Final size
 * @property {string} color - Current color
 * @property {string} startColor - Initial color
 * @property {string} [endColor] - Final color (for gradient)
 * @property {number} alpha - Current opacity
 * @property {number} rotation - Current rotation (radians)
 * @property {number} rotationSpeed - Rotation speed (rad/s)
 * @property {string} type - Particle type (circle, square, spark, etc.)
 * @property {boolean} isActive - Whether particle is alive
 */

/**
 * @typedef {Object} EmitterConfig
 * @property {string} type - Emitter type (point, cone, sphere)
 * @property {Object} position - Emitter position {x, y, z}
 * @property {Object} [direction] - Emission direction {x, y, z}
 * @property {number} [spread] - Spread angle (radians)
 * @property {number} particleCount - Number of particles
 * @property {number} [duration] - Emission duration (seconds), 0 = instant
 * @property {Object} particle - Particle configuration
 */

// ==========================================================================
// Particle Presets
// ==========================================================================

export const ParticlePresets = {
  WALL_IMPACT: {
    type: 'point',
    particleCount: 15,
    duration: 0,
    particle: {
      type: 'spark',
      minLife: 0.2,
      maxLife: 0.5,
      minSpeed: 50,
      maxSpeed: 150,
      minSize: 2,
      maxSize: 5,
      endSize: 0,
      startColor: '#ffcc00',
      endColor: '#ff6600',
      gravity: 200,
      drag: 0.95,
      fadeOut: true,
    },
  },

  NEAR_MISS: {
    type: 'trail',
    particleCount: 8,
    duration: 0.1,
    particle: {
      type: 'circle',
      minLife: 0.15,
      maxLife: 0.3,
      minSpeed: 20,
      maxSpeed: 40,
      minSize: 3,
      maxSize: 6,
      endSize: 0,
      startColor: '#ffffff',
      endColor: '#aaaaaa',
      gravity: 0,
      drag: 0.9,
      fadeOut: true,
    },
  },

  TARGET_HIT: {
    type: 'cone',
    particleCount: 25,
    duration: 0,
    spread: Math.PI / 4,
    particle: {
      type: 'spark',
      minLife: 0.3,
      maxLife: 0.6,
      minSpeed: 100,
      maxSpeed: 250,
      minSize: 3,
      maxSize: 8,
      endSize: 1,
      startColor: '#ff4444',
      endColor: '#ffff00',
      gravity: 150,
      drag: 0.92,
      fadeOut: true,
    },
  },

  TARGET_DESTROY: {
    type: 'sphere',
    particleCount: 40,
    duration: 0,
    particle: {
      type: 'square',
      minLife: 0.4,
      maxLife: 0.8,
      minSpeed: 80,
      maxSpeed: 200,
      minSize: 4,
      maxSize: 10,
      endSize: 0,
      startColor: '#ff0000',
      endColor: '#660000',
      gravity: 300,
      drag: 0.88,
      fadeOut: true,
      rotationSpeed: 5,
    },
  },

  BULLET_TRAIL: {
    type: 'trail',
    particleCount: 1,
    duration: 0,
    particle: {
      type: 'circle',
      minLife: 0.1,
      maxLife: 0.15,
      minSpeed: 0,
      maxSpeed: 5,
      minSize: 2,
      maxSize: 3,
      endSize: 0,
      startColor: '#ffff88',
      endColor: '#ffaa44',
      gravity: 0,
      drag: 1,
      fadeOut: true,
    },
  },

  MUZZLE_FLASH: {
    type: 'cone',
    particleCount: 10,
    duration: 0,
    spread: Math.PI / 8,
    particle: {
      type: 'spark',
      minLife: 0.05,
      maxLife: 0.1,
      minSpeed: 200,
      maxSpeed: 400,
      minSize: 3,
      maxSize: 6,
      endSize: 1,
      startColor: '#ffffff',
      endColor: '#ff8800',
      gravity: 0,
      drag: 0.8,
      fadeOut: true,
    },
  },

  SHELL_CASING: {
    type: 'point',
    particleCount: 1,
    duration: 0,
    particle: {
      type: 'square',
      minLife: 1.0,
      maxLife: 1.5,
      minSpeed: 30,
      maxSpeed: 60,
      minSize: 3,
      maxSize: 5,
      endSize: 3,
      startColor: '#cc9900',
      endColor: '#996600',
      gravity: 400,
      drag: 0.98,
      fadeOut: false,
      rotationSpeed: 10,
    },
  },

  DUST_CLOUD: {
    type: 'sphere',
    particleCount: 20,
    duration: 0,
    particle: {
      type: 'circle',
      minLife: 0.5,
      maxLife: 1.0,
      minSpeed: 10,
      maxSpeed: 30,
      minSize: 5,
      maxSize: 15,
      endSize: 25,
      startColor: '#888888',
      endColor: '#666666',
      gravity: -20, // Rises slowly
      drag: 0.95,
      fadeOut: true,
    },
  },

  SPARKS: {
    type: 'cone',
    particleCount: 12,
    duration: 0,
    spread: Math.PI / 6,
    particle: {
      type: 'spark',
      minLife: 0.2,
      maxLife: 0.4,
      minSpeed: 150,
      maxSpeed: 300,
      minSize: 1,
      maxSize: 3,
      endSize: 0,
      startColor: '#ffff00',
      endColor: '#ff4400',
      gravity: 400,
      drag: 0.9,
      fadeOut: true,
    },
  },

  BLOOD_SPLATTER: {
    type: 'cone',
    particleCount: 15,
    duration: 0,
    spread: Math.PI / 3,
    particle: {
      type: 'circle',
      minLife: 0.3,
      maxLife: 0.6,
      minSpeed: 80,
      maxSpeed: 180,
      minSize: 3,
      maxSize: 8,
      endSize: 1,
      startColor: '#cc0000',
      endColor: '#660000',
      gravity: 350,
      drag: 0.85,
      fadeOut: true,
    },
  },
};

// ==========================================================================
// Utility Functions
// ==========================================================================

function randomRange(min, max) {
  return Math.random() * (max - min) + min;
}

function lerpColor(color1, color2, t) {
  // Simple hex color lerp
  const r1 = parseInt(color1.slice(1, 3), 16);
  const g1 = parseInt(color1.slice(3, 5), 16);
  const b1 = parseInt(color1.slice(5, 7), 16);

  const r2 = parseInt(color2.slice(1, 3), 16);
  const g2 = parseInt(color2.slice(3, 5), 16);
  const b2 = parseInt(color2.slice(5, 7), 16);

  const r = Math.round(r1 + (r2 - r1) * t);
  const g = Math.round(g1 + (g2 - g1) * t);
  const b = Math.round(b1 + (b2 - b1) * t);

  return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
}

let particleIdCounter = 0;

// ==========================================================================
// ParticleEmitter Class
// ==========================================================================

export class ParticleEmitter {
  /**
   * @param {EmitterConfig} config
   * @param {ObjectPool} [pool]
   */
  constructor(config, pool = null) {
    this.config = config;
    this.pool = pool;
    this.position = { ...config.position };
    this.direction = config.direction || { x: 0, y: 1, z: 0 };

    /** @type {Particle[]} */
    this.particles = [];

    this._elapsed = 0;
    this._particlesEmitted = 0;
    this._isComplete = false;
  }

  /**
   * Check if emitter is complete
   * @returns {boolean}
   */
  get isComplete() {
    return this._isComplete && this.particles.every((p) => !p.isActive);
  }

  /**
   * Get active particle count
   * @returns {number}
   */
  get activeCount() {
    return this.particles.filter((p) => p.isActive).length;
  }

  /**
   * Emit particles
   * @param {number} [count] - Override particle count
   */
  emit(count = null) {
    const toEmit = count ?? this.config.particleCount;
    const particleConfig = this.config.particle;

    for (let i = 0; i < toEmit; i++) {
      const particle = this._createParticle(particleConfig);
      this.particles.push(particle);
    }

    this._particlesEmitted += toEmit;

    if (this.config.duration === 0 ||
        this._particlesEmitted >= this.config.particleCount) {
      this._isComplete = true;
    }
  }

  /**
   * Update emitter and particles
   * @param {number} deltaTime - Time since last update (seconds)
   */
  update(deltaTime) {
    // Update emission
    if (!this._isComplete && this.config.duration > 0) {
      this._elapsed += deltaTime;

      const rate = this.config.particleCount / this.config.duration;
      const shouldEmit = Math.floor(this._elapsed * rate) - this._particlesEmitted;

      if (shouldEmit > 0) {
        this.emit(shouldEmit);
      }

      if (this._elapsed >= this.config.duration) {
        this._isComplete = true;
      }
    }

    // Update particles
    for (const particle of this.particles) {
      if (!particle.isActive) continue;

      this._updateParticle(particle, deltaTime);
    }
  }

  /**
   * Create a particle
   * @param {Object} config
   * @returns {Particle}
   * @private
   */
  _createParticle(config) {
    const velocity = this._getEmissionVelocity(config);
    const life = randomRange(config.minLife, config.maxLife);
    const size = randomRange(config.minSize, config.maxSize);

    return {
      id: `particle_${++particleIdCounter}`,
      position: { ...this.position },
      velocity,
      acceleration: { x: 0, y: -config.gravity || 0, z: 0 },
      life: 1.0,
      maxLife: life,
      size,
      startSize: size,
      endSize: config.endSize ?? size,
      color: config.startColor,
      startColor: config.startColor,
      endColor: config.endColor,
      alpha: 1.0,
      rotation: 0,
      rotationSpeed: config.rotationSpeed ? randomRange(-config.rotationSpeed, config.rotationSpeed) : 0,
      drag: config.drag ?? 1,
      fadeOut: config.fadeOut ?? true,
      type: config.type || 'circle',
      isActive: true,
    };
  }

  /**
   * Get emission velocity based on emitter type
   * @param {Object} config
   * @returns {Object}
   * @private
   */
  _getEmissionVelocity(config) {
    const speed = randomRange(config.minSpeed, config.maxSpeed);
    const spread = this.config.spread || 0;

    switch (this.config.type) {
    case 'point': {
      // Random direction
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      return {
        x: Math.sin(phi) * Math.cos(theta) * speed,
        y: Math.sin(phi) * Math.sin(theta) * speed,
        z: Math.cos(phi) * speed,
      };
    }

    case 'cone': {
      // Direction with spread
      const baseAngle = Math.atan2(this.direction.y, this.direction.x);
      const angle = baseAngle + randomRange(-spread / 2, spread / 2);
      const upAngle = randomRange(-spread / 4, spread / 4);
      return {
        x: Math.cos(angle) * Math.cos(upAngle) * speed,
        y: Math.sin(angle) * Math.cos(upAngle) * speed,
        z: Math.sin(upAngle) * speed,
      };
    }

    case 'sphere': {
      // Random direction (same as point)
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      return {
        x: Math.sin(phi) * Math.cos(theta) * speed,
        y: Math.sin(phi) * Math.sin(theta) * speed,
        z: Math.cos(phi) * speed,
      };
    }

    case 'trail': {
      // Small random offset from direction
      const variance = 0.2;
      return {
        x: (this.direction.x + randomRange(-variance, variance)) * speed,
        y: (this.direction.y + randomRange(-variance, variance)) * speed,
        z: (this.direction.z + randomRange(-variance, variance)) * speed,
      };
    }

    default:
      return { x: 0, y: speed, z: 0 };
    }
  }

  /**
   * Update a single particle
   * @param {Particle} particle
   * @param {number} deltaTime
   * @private
   */
  _updateParticle(particle, deltaTime) {
    // Update life
    particle.life -= deltaTime / particle.maxLife;

    if (particle.life <= 0) {
      particle.isActive = false;
      return;
    }

    const lifeProgress = 1 - particle.life;

    // Apply acceleration
    particle.velocity.x += particle.acceleration.x * deltaTime;
    particle.velocity.y += particle.acceleration.y * deltaTime;
    particle.velocity.z += particle.acceleration.z * deltaTime;

    // Apply drag
    particle.velocity.x *= particle.drag;
    particle.velocity.y *= particle.drag;
    particle.velocity.z *= particle.drag;

    // Update position
    particle.position.x += particle.velocity.x * deltaTime;
    particle.position.y += particle.velocity.y * deltaTime;
    particle.position.z += particle.velocity.z * deltaTime;

    // Update rotation
    particle.rotation += particle.rotationSpeed * deltaTime;

    // Update size
    particle.size = particle.startSize + (particle.endSize - particle.startSize) * lifeProgress;

    // Update color
    if (particle.endColor) {
      particle.color = lerpColor(particle.startColor, particle.endColor, lifeProgress);
    }

    // Update alpha
    if (particle.fadeOut) {
      particle.alpha = particle.life;
    }
  }

  /**
   * Get all active particles
   * @returns {Particle[]}
   */
  getActiveParticles() {
    return this.particles.filter((p) => p.isActive);
  }

  /**
   * Reset the emitter
   */
  reset() {
    this.particles = [];
    this._elapsed = 0;
    this._particlesEmitted = 0;
    this._isComplete = false;
  }
}

// ==========================================================================
// ParticleSystem Class
// ==========================================================================

export class ParticleSystem extends EventEmitter {
  /**
   * @param {Object} [options]
   * @param {number} [options.maxParticles=1000] - Maximum particles
   * @param {boolean} [options.autoCleanup=true] - Auto remove completed emitters
   */
  constructor(options = {}) {
    super();

    this._maxParticles = options.maxParticles ?? 1000;
    this._autoCleanup = options.autoCleanup ?? true;

    /** @type {ParticleEmitter[]} */
    this._emitters = [];

    /** @type {ObjectPool} */
    this._particlePool = new ObjectPool({
      factory: () => ({}),
      reset: (p) => { p.isActive = false; },
      maxSize: this._maxParticles,
    });

    this._setupEventListeners();
  }

  /**
   * Get total active particle count
   * @returns {number}
   */
  get particleCount() {
    return this._emitters.reduce((sum, e) => sum + e.activeCount, 0);
  }

  /**
   * Get emitter count
   * @returns {number}
   */
  get emitterCount() {
    return this._emitters.length;
  }

  /**
   * Create an emitter from a preset
   * @param {string} presetName - Preset name
   * @param {Object} position - Emission position {x, y, z}
   * @param {Object} [options] - Override options
   * @returns {ParticleEmitter|null}
   */
  createFromPreset(presetName, position, options = {}) {
    const preset = ParticlePresets[presetName];
    if (!preset) {
      console.warn(`Particle preset not found: ${presetName}`);
      return null;
    }

    const config = {
      ...preset,
      position: { ...position },
      ...options,
    };

    return this.createEmitter(config);
  }

  /**
   * Create an emitter
   * @param {EmitterConfig} config
   * @returns {ParticleEmitter}
   */
  createEmitter(config) {
    const emitter = new ParticleEmitter(config, this._particlePool);
    this._emitters.push(emitter);

    // Emit immediately if instant duration
    if (config.duration === 0) {
      emitter.emit();
    }

    this.emit('emitter:created', { emitter });
    return emitter;
  }

  /**
   * Create wall impact effect
   * @param {Object} position - Impact position {x, y, z}
   * @param {Object} [normal] - Surface normal {x, y, z}
   */
  createWallImpact(position, normal = null) {
    const direction = normal || { x: 0, y: 1, z: 0 };
    return this.createFromPreset('WALL_IMPACT', position, { direction });
  }

  /**
   * Create near miss effect
   * @param {Object} position - Effect position {x, y, z}
   */
  createNearMiss(position) {
    return this.createFromPreset('NEAR_MISS', position);
  }

  /**
   * Create target hit effect
   * @param {Object} position - Hit position {x, y, z}
   * @param {Object} [direction] - Impact direction
   * @param {string} [color] - Override particle color
   */
  createTargetHit(position, direction = null, color = null) {
    const options = {};
    if (direction) {
      options.direction = direction;
    }
    if (color) {
      options.particle = {
        ...ParticlePresets.TARGET_HIT.particle,
        startColor: color,
      };
    }
    return this.createFromPreset('TARGET_HIT', position, options);
  }

  /**
   * Create target destroy effect
   * @param {Object} position - Destroy position {x, y, z}
   * @param {string} [color] - Override particle color
   */
  createTargetDestroy(position, color = null) {
    const options = {};
    if (color) {
      options.particle = {
        ...ParticlePresets.TARGET_DESTROY.particle,
        startColor: color,
      };
    }
    return this.createFromPreset('TARGET_DESTROY', position, options);
  }

  /**
   * Create muzzle flash effect
   * @param {Object} position - Gun position {x, y, z}
   * @param {Object} direction - Shooting direction {x, y, z}
   */
  createMuzzleFlash(position, direction) {
    return this.createFromPreset('MUZZLE_FLASH', position, { direction });
  }

  /**
   * Create shell casing effect
   * @param {Object} position - Ejection position {x, y, z}
   * @param {Object} direction - Ejection direction {x, y, z}
   */
  createShellCasing(position, direction) {
    return this.createFromPreset('SHELL_CASING', position, { direction });
  }

  /**
   * Update all emitters
   * @param {number} deltaTime - Time since last update (seconds)
   */
  update(deltaTime) {
    // Update all emitters
    for (const emitter of this._emitters) {
      emitter.update(deltaTime);
    }

    // Cleanup completed emitters
    if (this._autoCleanup) {
      this._emitters = this._emitters.filter((e) => !e.isComplete);
    }
  }

  /**
   * Get all active particles from all emitters
   * @returns {Particle[]}
   */
  getAllParticles() {
    const particles = [];
    for (const emitter of this._emitters) {
      particles.push(...emitter.getActiveParticles());
    }
    return particles;
  }

  /**
   * Clear all particles and emitters
   */
  clear() {
    this._emitters = [];
    this.emit('system:cleared');
  }

  /**
   * Set up event listeners for game events
   * @private
   */
  _setupEventListeners() {
    const eventBus = getEventBus();

    eventBus.on(GameEvents.TARGET_HIT, (data) => {
      if (data.position) {
        this.createTargetHit(data.position, data.direction, data.targetColor);
      }
    });

    eventBus.on(GameEvents.TARGET_MISS, (data) => {
      if (data.impactPosition) {
        this.createWallImpact(data.impactPosition, data.normal);
      }
      if (data.nearMissPosition) {
        this.createNearMiss(data.nearMissPosition);
      }
    });
  }
}

// ==========================================================================
// Singleton
// ==========================================================================

let particleSystemInstance = null;

/**
 * Get the singleton particle system instance
 * @returns {ParticleSystem}
 */
export function getParticleSystem() {
  if (!particleSystemInstance) {
    particleSystemInstance = new ParticleSystem();
  }
  return particleSystemInstance;
}

/**
 * Reset the particle system instance
 */
export function resetParticleSystem() {
  if (particleSystemInstance) {
    particleSystemInstance.clear();
    particleSystemInstance.removeAllListeners();
    particleSystemInstance = null;
  }
}

export default ParticleSystem;
