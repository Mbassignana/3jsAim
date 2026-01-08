/**
 * Player - FPS player controller with movement, shooting, and physics
 * Handles movement input, shooting mechanics, and physics interaction
 */

import { EventEmitter, GameEvents, getEventBus } from '../utils/EventEmitter.js';

/**
 * @typedef {Object} PlayerConfig
 * @property {number} moveSpeed - Movement speed
 * @property {number} jumpForce - Jump velocity
 * @property {number} fireRate - Milliseconds between shots
 * @property {number} shootRange - Maximum shooting range
 * @property {number} mouseSensitivity - Mouse look sensitivity
 * @property {number} minPitch - Minimum vertical look angle
 * @property {number} maxPitch - Maximum vertical look angle
 * @property {number} eyeHeight - Camera height offset from body
 * @property {number} damping - Movement damping factor
 */

/**
 * @typedef {Object} Vector3
 * @property {number} x
 * @property {number} y
 * @property {number} z
 */

/**
 * @typedef {Object} MovementState
 * @property {boolean} forward
 * @property {boolean} backward
 * @property {boolean} left
 * @property {boolean} right
 */

/** Default player configuration */
export const DEFAULT_CONFIG = {
  moveSpeed: 15,
  jumpForce: 8,
  fireRate: 200, // milliseconds
  shootRange: 100,
  mouseSensitivity: 0.002,
  minPitch: -Math.PI / 2,
  maxPitch: Math.PI / 2,
  eyeHeight: 0.5,
  damping: 10.0,
};

/**
 * Player - Core player controller class
 */
export class Player extends EventEmitter {
  /**
   * @param {Object} options
   * @param {Object} options.camera - Three.js camera
   * @param {Object} options.scene - Three.js scene
   * @param {Object} options.physicsWorld - Physics world
   * @param {Partial<PlayerConfig>} [options.config] - Custom configuration
   */
  constructor(options = {}) {
    super();

    const { camera, scene, physicsWorld, config = {} } = options;

    if (!camera) {
      throw new Error('Player requires a camera');
    }
    if (!scene) {
      throw new Error('Player requires a scene');
    }
    if (!physicsWorld) {
      throw new Error('Player requires a physicsWorld');
    }

    /** @type {Object} */
    this._camera = camera;

    /** @type {Object} */
    this._scene = scene;

    /** @type {Object} */
    this._physicsWorld = physicsWorld;

    /** @type {PlayerConfig} */
    this.config = { ...DEFAULT_CONFIG, ...config };

    // Position and rotation
    /** @type {Vector3} */
    this.position = { x: 0, y: 1.7, z: 5 };

    /** @type {number} */
    this.yaw = 0; // Horizontal look angle

    /** @type {number} */
    this.pitch = 0; // Vertical look angle

    // Velocity
    /** @type {Vector3} */
    this.velocity = { x: 0, y: 0, z: 0 };

    /** @type {Vector3} */
    this.direction = { x: 0, y: 0, z: 0 };

    // Movement state
    /** @type {MovementState} */
    this.movement = {
      forward: false,
      backward: false,
      left: false,
      right: false,
    };

    /** @type {boolean} */
    this.canJump = false;

    /** @type {boolean} */
    this.isOnGround = false;

    // Shooting state
    /** @type {number} */
    this.lastShotTime = 0;

    /** @type {boolean} */
    this.isReloading = false;

    // Physics body reference
    /** @type {Object|null} */
    this.body = null;

    // Shoot callback (for game integration)
    /** @type {Function|null} */
    this.onShoot = null;

    this._initialized = false;
  }

  /**
   * Initialize player (create physics body, etc.)
   */
  init() {
    if (this._initialized) {
      return;
    }

    // Create physics body
    this.body = this._physicsWorld.addPlayer(this.position.x, this.position.y, this.position.z);

    this._initialized = true;
    this.emit('player:init');
  }

  /**
   * Set movement state for a direction
   * @param {'forward'|'backward'|'left'|'right'} direction - Movement direction
   * @param {boolean} active - Whether movement is active
   */
  setMovement(direction, active) {
    if (Object.hasOwn(this.movement, direction)) {
      this.movement[direction] = active;
    }
  }

  /**
   * Handle keyboard input
   * @param {string} key - Key code
   * @param {boolean} pressed - Whether key is pressed
   */
  handleKeyInput(key, pressed) {
    switch (key) {
      case 'ArrowUp':
      case 'KeyW':
        this.movement.forward = pressed;
        break;
      case 'ArrowDown':
      case 'KeyS':
        this.movement.backward = pressed;
        break;
      case 'ArrowLeft':
      case 'KeyA':
        this.movement.left = pressed;
        break;
      case 'ArrowRight':
      case 'KeyD':
        this.movement.right = pressed;
        break;
      case 'Space':
        if (pressed && this.canJump) {
          this.jump();
        }
        break;
    }
  }

  /**
   * Handle mouse movement
   * @param {number} movementX - Horizontal mouse movement
   * @param {number} movementY - Vertical mouse movement
   */
  handleMouseMove(movementX, movementY) {
    this.yaw -= movementX * this.config.mouseSensitivity;
    this.pitch -= movementY * this.config.mouseSensitivity;

    // Clamp pitch to prevent over-rotation
    this.pitch = Math.max(this.config.minPitch, Math.min(this.config.maxPitch, this.pitch));
  }

  /**
   * Attempt to shoot
   * @returns {{ hit: boolean, object: Object|null, distance: number|null }}
   */
  shoot() {
    const currentTime = Date.now();
    const timeSinceLastShot = currentTime - this.lastShotTime;

    // Check fire rate
    if (timeSinceLastShot < this.config.fireRate) {
      return { hit: false, object: null, distance: null, rateLimit: true };
    }

    this.lastShotTime = currentTime;

    // Emit shoot event
    this.emit(GameEvents.PLAYER_SHOOT, {
      position: { ...this.position },
      direction: this._getForwardDirection(),
    });
    getEventBus().emit(GameEvents.PLAYER_SHOOT, {
      position: { ...this.position },
      direction: this._getForwardDirection(),
    });

    // Call shoot callback if set
    if (this.onShoot) {
      return this.onShoot();
    }

    return { hit: false, object: null, distance: null };
  }

  /**
   * Check if player can shoot (not rate limited)
   * @returns {boolean}
   */
  canShoot() {
    const timeSinceLastShot = Date.now() - this.lastShotTime;
    return timeSinceLastShot >= this.config.fireRate;
  }

  /**
   * Get time until next shot is available
   * @returns {number} Milliseconds until can shoot (0 if ready)
   */
  getTimeUntilCanShoot() {
    const timeSinceLastShot = Date.now() - this.lastShotTime;
    return Math.max(0, this.config.fireRate - timeSinceLastShot);
  }

  /**
   * Perform a jump
   */
  jump() {
    if (!this.canJump) {
      return;
    }

    this.velocity.y = this.config.jumpForce;
    this.canJump = false;
    this.isOnGround = false;

    // Update physics body
    if (this.body) {
      if (typeof this.body.velocity?.y === 'number') {
        this.body.velocity.y = this.config.jumpForce;
      } else if (this.body.velocity) {
        this.body.velocity.y = this.config.jumpForce;
      }
    }

    this.emit('player:jump');
  }

  /**
   * Update player state
   * @param {number} deltaTime - Time since last update in seconds
   */
  update(deltaTime) {
    this._updateMovement(deltaTime);
    this._updatePhysics();
  }

  /**
   * Update movement based on input
   * @param {number} deltaTime - Time delta
   * @private
   */
  _updateMovement(deltaTime) {
    const speed = this.config.moveSpeed;
    const damping = this.config.damping;

    // Apply damping
    this.velocity.x -= this.velocity.x * damping * deltaTime;
    this.velocity.z -= this.velocity.z * damping * deltaTime;

    // Calculate direction from input
    this.direction.z = Number(this.movement.forward) - Number(this.movement.backward);
    this.direction.x = Number(this.movement.right) - Number(this.movement.left);

    // Normalize direction
    const dirLength = Math.sqrt(
      this.direction.x * this.direction.x + this.direction.z * this.direction.z
    );
    if (dirLength > 0) {
      this.direction.x /= dirLength;
      this.direction.z /= dirLength;
    }

    // Apply movement
    if (this.movement.forward || this.movement.backward) {
      this.velocity.z -= this.direction.z * speed * deltaTime;
    }
    if (this.movement.left || this.movement.right) {
      this.velocity.x -= this.direction.x * speed * deltaTime;
    }

    // Calculate world-space movement based on yaw
    const forward = this._getForwardDirection();
    const right = this._getRightDirection();

    const moveX = forward.x * this.velocity.z + right.x * this.velocity.x;
    const moveZ = forward.z * this.velocity.z + right.z * this.velocity.x;

    // Update physics body velocity
    if (this.body) {
      if (this.body.velocity) {
        this.body.velocity.x = moveX;
        this.body.velocity.z = moveZ;
      }
    }
  }

  /**
   * Update position from physics
   * @private
   */
  _updatePhysics() {
    if (!this.body) {
      return;
    }

    // Sync position from physics body
    if (this.body.position) {
      this.position.x = this.body.position.x;
      this.position.y = this.body.position.y + this.config.eyeHeight;
      this.position.z = this.body.position.z;
    }

    // Check ground state
    if (typeof this.body.velocity?.y === 'number') {
      this.canJump = Math.abs(this.body.velocity.y) < 0.1;
      this.isOnGround = this.canJump;
    } else if (this.body.onGround !== undefined) {
      this.canJump = this.body.onGround;
      this.isOnGround = this.body.onGround;
    }
  }

  /**
   * Get forward direction based on yaw
   * @returns {{ x: number, y: number, z: number }}
   * @private
   */
  _getForwardDirection() {
    return {
      x: Math.sin(this.yaw),
      y: 0,
      z: -Math.cos(this.yaw),
    };
  }

  /**
   * Get right direction based on yaw
   * @returns {{ x: number, y: number, z: number }}
   * @private
   */
  _getRightDirection() {
    return {
      x: Math.cos(this.yaw),
      y: 0,
      z: Math.sin(this.yaw),
    };
  }

  /**
   * Get current look direction including pitch
   * @returns {{ x: number, y: number, z: number }}
   */
  getLookDirection() {
    const cosPitch = Math.cos(this.pitch);
    return {
      x: Math.sin(this.yaw) * cosPitch,
      y: Math.sin(this.pitch),
      z: -Math.cos(this.yaw) * cosPitch,
    };
  }

  /**
   * Set player position
   * @param {number} x
   * @param {number} y
   * @param {number} z
   */
  setPosition(x, y, z) {
    this.position.x = x;
    this.position.y = y;
    this.position.z = z;

    if (this.body?.position) {
      if (typeof this.body.position.set === 'function') {
        this.body.position.set(x, y - this.config.eyeHeight, z);
      } else {
        this.body.position.x = x;
        this.body.position.y = y - this.config.eyeHeight;
        this.body.position.z = z;
      }
    }
  }

  /**
   * Set player look angles
   * @param {number} yaw - Horizontal angle (radians)
   * @param {number} pitch - Vertical angle (radians)
   */
  setLookAngles(yaw, pitch) {
    this.yaw = yaw;
    this.pitch = Math.max(this.config.minPitch, Math.min(this.config.maxPitch, pitch));
  }

  /**
   * Get player state snapshot
   * @returns {Object}
   */
  getState() {
    return {
      position: { ...this.position },
      velocity: { ...this.velocity },
      yaw: this.yaw,
      pitch: this.pitch,
      canJump: this.canJump,
      isOnGround: this.isOnGround,
      canShoot: this.canShoot(),
      movement: { ...this.movement },
    };
  }

  /**
   * Check if player is moving
   * @returns {boolean}
   */
  isMoving() {
    return (
      this.movement.forward || this.movement.backward || this.movement.left || this.movement.right
    );
  }

  /**
   * Get current speed
   * @returns {number}
   */
  getCurrentSpeed() {
    return Math.sqrt(this.velocity.x * this.velocity.x + this.velocity.z * this.velocity.z);
  }

  /**
   * Reset player to default state
   * @param {number} [x=0]
   * @param {number} [y=1.7]
   * @param {number} [z=5]
   */
  reset(x = 0, y = 1.7, z = 5) {
    // Reset position
    this.position = { x, y, z };
    this.yaw = 0;
    this.pitch = 0;

    // Reset velocity
    this.velocity = { x: 0, y: 0, z: 0 };
    this.direction = { x: 0, y: 0, z: 0 };

    // Reset movement state
    this.movement = {
      forward: false,
      backward: false,
      left: false,
      right: false,
    };

    this.canJump = false;
    this.isOnGround = false;
    this.lastShotTime = 0;
    this.isReloading = false;

    // Reset physics body
    if (this.body) {
      if (typeof this.body.position?.set === 'function') {
        this.body.position.set(x, y - this.config.eyeHeight, z);
        if (this.body.velocity?.set) {
          this.body.velocity.set(0, 0, 0);
        }
        if (this.body.angularVelocity?.set) {
          this.body.angularVelocity.set(0, 0, 0);
        }
      } else if (this.body.position) {
        this.body.position.x = x;
        this.body.position.y = y - this.config.eyeHeight;
        this.body.position.z = z;
        if (this.body.velocity) {
          this.body.velocity.x = 0;
          this.body.velocity.y = 0;
          this.body.velocity.z = 0;
        }
      }
    }

    this.emit('player:reset');
  }
}

// Add player-specific events
GameEvents.PLAYER_SHOOT = 'player:shoot';
GameEvents.PLAYER_JUMP = 'player:jump';
GameEvents.PLAYER_HIT = 'player:hit';

export default Player;
