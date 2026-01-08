/**
 * PhysicsWorld - Physics simulation manager using Cannon.js
 * Handles collision detection, raycasting, and body management
 */

import { EventEmitter } from '../utils/EventEmitter.js';

/**
 * @typedef {Object} PhysicsConfig
 * @property {number} gravity - Gravity strength
 * @property {number} solverIterations - Physics solver iterations
 * @property {number} fixedTimeStep - Fixed physics time step
 * @property {number} maxSubSteps - Maximum physics sub-steps per frame
 */

/**
 * @typedef {Object} RaycastResult
 * @property {boolean} hasHit - Whether the ray hit something
 * @property {{ x: number, y: number, z: number }} [point] - Hit point in world space
 * @property {{ x: number, y: number, z: number }} [normal] - Hit normal
 * @property {Object} [body] - The physics body that was hit
 * @property {number} [distance] - Distance to hit point
 */

/**
 * @typedef {Object} ContactMaterialOptions
 * @property {number} friction - Friction coefficient
 * @property {number} restitution - Bounce coefficient
 */

/** Default physics configuration */
export const DEFAULT_CONFIG = {
  gravity: -25,
  solverIterations: 10,
  fixedTimeStep: 1.0 / 60.0,
  maxSubSteps: 3,
};

/** Default material properties */
export const MATERIAL_PROPERTIES = {
  groundPlayer: { friction: 0.4, restitution: 0.0 },
  playerBuilding: { friction: 0.8, restitution: 0.0 },
  groundNPC: { friction: 0.6, restitution: 0.0 },
  npcBuilding: { friction: 0.8, restitution: 0.1 },
};

/** Body type identifiers */
export const BodyType = {
  GROUND: 'ground',
  PLAYER: 'player',
  BUILDING: 'building',
  WALL: 'wall',
  PROP: 'prop',
  CIRCLE: 'circle',
  NPC: 'npc',
};

/**
 * PhysicsWorld - Core physics simulation class
 */
export class PhysicsWorld extends EventEmitter {
  /**
   * @param {Object} [options]
   * @param {Object} [options.CANNON] - Cannon.js library (for dependency injection)
   * @param {Partial<PhysicsConfig>} [options.config] - Custom configuration
   */
  constructor(options = {}) {
    super();

    const { CANNON, config = {} } = options;

    /** @type {PhysicsConfig} */
    this.config = { ...DEFAULT_CONFIG, ...config };

    /** @type {Object|null} */
    this._CANNON = CANNON || null;

    /** @type {Object|null} */
    this.world = null;

    /** @type {Map<string, Object>} */
    this.bodies = new Map();

    /** @type {Object|null} */
    this.groundBody = null;

    /** @type {Object|null} */
    this.playerBody = null;

    /** @type {Object} */
    this.materials = {};

    /** @type {boolean} */
    this._initialized = false;
  }

  /**
   * Initialize the physics world
   */
  init() {
    if (this._initialized) {
      return;
    }

    if (!this._CANNON) {
      console.warn('CANNON.js not available - physics disabled');
      this._initialized = true;
      return;
    }

    // Create physics world
    this.world = new this._CANNON.World();
    this.world.gravity.set(0, this.config.gravity, 0);
    this.world.broadphase = new this._CANNON.NaiveBroadphase();
    this.world.solver.iterations = this.config.solverIterations;

    // Set up materials
    this._setupMaterials();

    this._initialized = true;
    this.emit('physics:init');
  }

  /**
   * Set up physics materials and contact materials
   * @private
   */
  _setupMaterials() {
    if (!this._CANNON) return;

    // Create materials for different object types
    this.materials = {
      ground: new this._CANNON.Material('ground'),
      player: new this._CANNON.Material('player'),
      building: new this._CANNON.Material('building'),
      circle: new this._CANNON.Material('circle'),
      npc: new this._CANNON.Material('npc'),
    };

    // Create contact materials
    const contactMaterials = [
      {
        m1: this.materials.ground,
        m2: this.materials.player,
        ...MATERIAL_PROPERTIES.groundPlayer,
      },
      {
        m1: this.materials.player,
        m2: this.materials.building,
        ...MATERIAL_PROPERTIES.playerBuilding,
      },
      {
        m1: this.materials.ground,
        m2: this.materials.npc,
        ...MATERIAL_PROPERTIES.groundNPC,
      },
      {
        m1: this.materials.npc,
        m2: this.materials.building,
        ...MATERIAL_PROPERTIES.npcBuilding,
      },
    ];

    contactMaterials.forEach(({ m1, m2, friction, restitution }) => {
      const cm = new this._CANNON.ContactMaterial(m1, m2, { friction, restitution });
      this.world.addContactMaterial(cm);
    });
  }

  /**
   * Check if physics is available
   * @returns {boolean}
   */
  isAvailable() {
    return this._initialized && this.world !== null;
  }

  // ==========================================================================
  // Body Creation
  // ==========================================================================

  /**
   * Add ground plane to the physics world
   * @returns {Object|null} The ground body
   */
  addGround() {
    if (!this.world) return null;

    const groundShape = new this._CANNON.Plane();
    this.groundBody = new this._CANNON.Body({
      mass: 0,
      material: this.materials.ground,
    });
    this.groundBody.addShape(groundShape);
    this.groundBody.quaternion.setFromEuler(-Math.PI / 2, 0, 0);

    this.world.addBody(this.groundBody);
    this.emit('physics:addBody', { type: BodyType.GROUND, body: this.groundBody });

    return this.groundBody;
  }

  /**
   * Add player physics body
   * @param {number} x - X position
   * @param {number} y - Y position
   * @param {number} z - Z position
   * @param {Object} [options] - Additional options
   * @returns {Object|null} The player body
   */
  addPlayer(x, y, z, options = {}) {
    if (!this.world) return null;

    const { mass = 80, radius = 0.5, height = 1.8 } = options;

    const playerShape = new this._CANNON.Cylinder(radius, radius, height, 8);
    this.playerBody = new this._CANNON.Body({
      mass,
      material: this.materials.player,
    });
    this.playerBody.addShape(playerShape);
    this.playerBody.position.set(x, y, z);
    this.playerBody.fixedRotation = true;
    this.playerBody.updateMassProperties();

    this.world.addBody(this.playerBody);
    this.emit('physics:addBody', { type: BodyType.PLAYER, body: this.playerBody });

    return this.playerBody;
  }

  /**
   * Add a static box body (building, wall, prop)
   * @param {string} type - Body type (building, wall, prop)
   * @param {number} x - X position
   * @param {number} y - Y position
   * @param {number} z - Z position
   * @param {number} width - Box width
   * @param {number} height - Box height
   * @param {number} depth - Box depth
   * @returns {Object|null} The created body
   */
  addStaticBox(type, x, y, z, width, height, depth) {
    if (!this.world) return null;

    const boxShape = new this._CANNON.Box(
      new this._CANNON.Vec3(width / 2, height / 2, depth / 2)
    );
    const body = new this._CANNON.Body({
      mass: 0,
      material: this.materials.building,
    });
    body.addShape(boxShape);
    body.position.set(x, y, z);

    this.world.addBody(body);

    const key = `${type}_${x}_${y}_${z}`;
    this.bodies.set(key, body);
    this.emit('physics:addBody', { type, body, key });

    return body;
  }

  /**
   * Add building physics body
   */
  addBuilding(x, y, z, width, height, depth) {
    return this.addStaticBox(BodyType.BUILDING, x, y, z, width, height, depth);
  }

  /**
   * Add wall physics body
   */
  addWall(x, y, z, width, height, depth) {
    return this.addStaticBox(BodyType.WALL, x, y, z, width, height, depth);
  }

  /**
   * Add prop physics body
   */
  addProp(x, y, z, width, height, depth) {
    return this.addStaticBox(BodyType.PROP, x, y, z, width, height, depth);
  }

  /**
   * Add circle (target) physics body
   * @param {number} x - X position
   * @param {number} y - Y position
   * @param {number} z - Z position
   * @param {number} radius - Sphere radius
   * @returns {Object|null} The circle body
   */
  addCircle(x, y, z, radius) {
    if (!this.world) return null;

    const circleShape = new this._CANNON.Sphere(radius);
    const circleBody = new this._CANNON.Body({
      mass: 0,
      material: this.materials.circle,
    });
    circleBody.addShape(circleShape);
    circleBody.position.set(x, y, z);

    this.world.addBody(circleBody);

    const key = `circle_${x}_${y}_${z}_${Date.now()}`;
    this.bodies.set(key, circleBody);
    this.emit('physics:addBody', { type: BodyType.CIRCLE, body: circleBody, key });

    return circleBody;
  }

  /**
   * Add NPC physics body
   * @param {number} x - X position
   * @param {number} y - Y position
   * @param {number} z - Z position
   * @param {number} width - Box width
   * @param {number} height - Box height
   * @param {number} depth - Box depth
   * @param {Object} [options] - Additional options
   * @returns {Object|null} The NPC body
   */
  addNPC(x, y, z, width, height, depth, options = {}) {
    if (!this.world) return null;

    const { mass = 50 } = options;

    const npcShape = new this._CANNON.Box(
      new this._CANNON.Vec3(width / 2, height / 2, depth / 2)
    );
    const npcBody = new this._CANNON.Body({
      mass,
      material: this.materials.npc,
    });
    npcBody.addShape(npcShape);
    npcBody.position.set(x, y, z);
    npcBody.angularDamping = 0.9;
    npcBody.linearDamping = 0.1;

    this.world.addBody(npcBody);

    const key = `npc_${x}_${y}_${z}_${Date.now()}`;
    this.bodies.set(key, npcBody);
    this.emit('physics:addBody', { type: BodyType.NPC, body: npcBody, key });

    return npcBody;
  }

  // ==========================================================================
  // Body Removal
  // ==========================================================================

  /**
   * Remove a body by its key
   * @param {string} key - Body key
   * @returns {boolean} Whether removal was successful
   */
  removeBody(key) {
    if (!this.world) return false;

    const body = this.bodies.get(key);
    if (!body) return false;

    this.world.removeBody(body);
    this.bodies.delete(key);
    this.emit('physics:removeBody', { key });

    return true;
  }

  /**
   * Remove a circle body by matching position
   * @param {Object} circleObject - Object with position property
   * @returns {boolean} Whether removal was successful
   */
  removeCircle(circleObject) {
    return this._removeBodyByPosition(BodyType.CIRCLE, circleObject.position, 0.1);
  }

  /**
   * Remove an NPC body by matching position
   * @param {Object} npcObject - Object with position property
   * @returns {boolean} Whether removal was successful
   */
  removeNPC(npcObject) {
    return this._removeBodyByPosition(BodyType.NPC, npcObject.position, 1.0);
  }

  /**
   * Remove a body by position matching
   * @param {string} prefix - Body type prefix
   * @param {{ x: number, y: number, z: number }} position - Position to match
   * @param {number} tolerance - Distance tolerance
   * @returns {boolean} Whether removal was successful
   * @private
   */
  _removeBodyByPosition(prefix, position, tolerance) {
    if (!this.world || !position) return false;

    const bodyKey = Array.from(this.bodies.keys()).find((key) => {
      if (key.startsWith(`${prefix}_`)) {
        const body = this.bodies.get(key);
        const distance =
          Math.abs(body.position.x - position.x) +
          Math.abs(body.position.y - position.y) +
          Math.abs(body.position.z - position.z);
        return distance < tolerance;
      }
      return false;
    });

    if (bodyKey) {
      return this.removeBody(bodyKey);
    }

    return false;
  }

  // ==========================================================================
  // Physics Simulation
  // ==========================================================================

  /**
   * Step the physics simulation
   * @param {number} deltaTime - Time since last update in seconds
   */
  update(deltaTime) {
    if (!this.world) return;

    this.world.step(this.config.fixedTimeStep, deltaTime, this.config.maxSubSteps);
    this._updateNPCConstraints();

    this.emit('physics:update', { deltaTime });
  }

  /**
   * Update NPC position constraints
   * @private
   */
  _updateNPCConstraints() {
    this.bodies.forEach((body, key) => {
      if (key.startsWith('npc_') && body.mass > 0) {
        // Reset rotation if NPC tips over too much
        if (Math.abs(body.quaternion.x) > 0.3 || Math.abs(body.quaternion.z) > 0.3) {
          body.quaternion.set(0, body.quaternion.y, 0, body.quaternion.w);
          body.quaternion.normalize();
        }

        // Ensure NPCs don't sink into ground
        if (body.position.y < 0.5) {
          body.position.y = 0.5;
          body.velocity.y = Math.max(0, body.velocity.y);
        }
      }
    });
  }

  // ==========================================================================
  // Raycasting
  // ==========================================================================

  /**
   * Perform a raycast from one point to another
   * @param {{ x: number, y: number, z: number }} from - Ray origin
   * @param {{ x: number, y: number, z: number }} to - Ray destination
   * @returns {RaycastResult}
   */
  raycast(from, to) {
    if (!this.world) {
      return { hasHit: false };
    }

    const fromVec = new this._CANNON.Vec3(from.x, from.y, from.z);
    const toVec = new this._CANNON.Vec3(to.x, to.y, to.z);

    const result = new this._CANNON.RaycastResult();
    const hasHit = this.world.raycastClosest(fromVec, toVec, {}, result);

    if (hasHit) {
      return {
        hasHit: true,
        point: {
          x: result.hitPointWorld.x,
          y: result.hitPointWorld.y,
          z: result.hitPointWorld.z,
        },
        normal: {
          x: result.hitNormalWorld.x,
          y: result.hitNormalWorld.y,
          z: result.hitNormalWorld.z,
        },
        body: result.body,
        distance: result.distance,
      };
    }

    return { hasHit: false };
  }

  // ==========================================================================
  // Collision Queries
  // ==========================================================================

  /**
   * Check if a position is valid (not inside a building/wall)
   * @param {number} x - X position
   * @param {number} y - Y position
   * @param {number} z - Z position
   * @param {number} [radius=0.5] - Test sphere radius
   * @returns {boolean}
   */
  isPositionValid(x, y, z, radius = 0.5) {
    if (!this.world) return true;

    for (const [key, body] of this.bodies) {
      if (key.startsWith('building_') || key.startsWith('wall_')) {
        const distance = Math.sqrt(
          Math.pow(x - body.position.x, 2) +
            Math.pow(y - body.position.y, 2) +
            Math.pow(z - body.position.z, 2)
        );

        const combinedRadius = radius + 1;
        if (distance < combinedRadius) {
          return false;
        }
      }
    }

    return true;
  }

  /**
   * Get the ground height at a given x,z position
   * @param {number} x - X position
   * @param {number} z - Z position
   * @returns {number} Ground height (currently always 0 for flat ground)
   */
  getGroundHeight(_x, _z) {
    // For now, return 0 since we have a flat ground
    return 0;
  }

  /**
   * Get all bodies of a specific type
   * @param {string} type - Body type prefix
   * @returns {Array<{ key: string, body: Object }>}
   */
  getBodiesOfType(type) {
    const result = [];
    this.bodies.forEach((body, key) => {
      if (key.startsWith(`${type}_`)) {
        result.push({ key, body });
      }
    });
    return result;
  }

  /**
   * Get body count by type
   * @returns {Object} Body counts by type
   */
  getBodyCounts() {
    const counts = {
      building: 0,
      wall: 0,
      prop: 0,
      circle: 0,
      npc: 0,
      total: this.bodies.size,
    };

    this.bodies.forEach((body, key) => {
      if (key.startsWith('building_')) counts.building++;
      else if (key.startsWith('wall_')) counts.wall++;
      else if (key.startsWith('prop_')) counts.prop++;
      else if (key.startsWith('circle_')) counts.circle++;
      else if (key.startsWith('npc_')) counts.npc++;
    });

    return counts;
  }

  // ==========================================================================
  // State Management
  // ==========================================================================

  /**
   * Reset the physics world (remove dynamic bodies, reset player)
   */
  reset() {
    if (!this.world) return;

    // Remove all circle and NPC bodies
    const bodiesToRemove = [];
    this.bodies.forEach((body, key) => {
      if (key.startsWith('circle_') || key.startsWith('npc_')) {
        bodiesToRemove.push(key);
      }
    });

    bodiesToRemove.forEach((key) => {
      this.removeBody(key);
    });

    // Reset player position
    if (this.playerBody) {
      this.playerBody.position.set(0, 2, 5);
      this.playerBody.velocity.set(0, 0, 0);
      this.playerBody.angularVelocity.set(0, 0, 0);
    }

    this.emit('physics:reset');
  }

  /**
   * Get physics world state snapshot
   * @returns {Object}
   */
  getState() {
    return {
      initialized: this._initialized,
      available: this.isAvailable(),
      bodyCounts: this.getBodyCounts(),
      hasGround: this.groundBody !== null,
      hasPlayer: this.playerBody !== null,
      playerPosition: this.playerBody
        ? {
            x: this.playerBody.position.x,
            y: this.playerBody.position.y,
            z: this.playerBody.position.z,
          }
        : null,
    };
  }

  /**
   * Check if physics is initialized
   * @returns {boolean}
   */
  isInitialized() {
    return this._initialized;
  }
}

export default PhysicsWorld;
