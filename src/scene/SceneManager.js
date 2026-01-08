/**
 * SceneManager - Creates and manages the town environment
 * Handles building generation, lighting, ground, props, and spawn positions
 */

import { EventEmitter } from '../utils/EventEmitter.js';

/**
 * @typedef {Object} BuildingConfig
 * @property {[number, number, number]} pos - Position [x, y, z]
 * @property {[number, number, number]} size - Size [width, height, depth]
 * @property {number} color - Hex color
 */

/**
 * @typedef {Object} WallConfig
 * @property {[number, number, number]} pos - Position [x, y, z]
 * @property {[number, number, number]} size - Size [width, height, depth]
 * @property {number} rotation - Y rotation in radians
 */

/**
 * @typedef {Object} SpawnPosition
 * @property {number} x - X coordinate
 * @property {number} z - Z coordinate
 */

/** Default building configurations */
export const DEFAULT_BUILDING_CONFIGS = [
  { pos: [-30, 0, -30], size: [15, 12, 20], color: 0xb19cd9 },
  { pos: [25, 0, -25], size: [18, 15, 15], color: 0xc4a484 },
  { pos: [-35, 0, 25], size: [20, 10, 18], color: 0xd4c5b0 },
  { pos: [30, 0, 30], size: [16, 14, 22], color: 0xb8a68e },
  { pos: [0, 0, -40], size: [12, 8, 12], color: 0xa0956f },
  { pos: [-15, 0, 0], size: [10, 16, 10], color: 0xc0b283 },
];

/** Default wall configurations */
export const DEFAULT_WALL_CONFIGS = [
  // Perimeter walls
  { pos: [-50, 0, 0], size: [2, 8, 80], rotation: 0 },
  { pos: [50, 0, 0], size: [2, 8, 80], rotation: 0 },
  { pos: [0, 0, -50], size: [80, 8, 2], rotation: 0 },
  { pos: [0, 0, 50], size: [80, 8, 2], rotation: 0 },
  // Internal walls for cover
  { pos: [10, 0, 10], size: [2, 6, 15], rotation: 0 },
  { pos: [-10, 0, -10], size: [15, 6, 2], rotation: 0 },
  { pos: [0, 0, 15], size: [8, 5, 2], rotation: 0 },
];

/** Default barrel positions */
export const DEFAULT_BARREL_POSITIONS = [
  [15, 0, 15],
  [-20, 0, 10],
  [5, 0, -20],
  [-5, 0, 35],
];

/** Default crate positions */
export const DEFAULT_CRATE_POSITIONS = [
  [18, 0, -15],
  [-15, 0, 20],
  [8, 0, 25],
  [-25, 0, -5],
];

/** Scene configuration */
export const SCENE_CONFIG = {
  groundSize: 200,
  groundColor: 0x8b7d6b,
  patchColor: 0x9b8d7b,
  patchCount: 15,
  skyColor: 0x87ceeb,
  skyRadius: 180,
  fogNear: 100,
  fogFar: 200,
  spawnRange: 80,
  spawnMargin: 3,
  maxSpawnAttempts: 50,
  barrelRadius: 1,
  barrelHeight: 3,
  crateSize: 2,
};

/**
 * SceneManager - Core scene management class
 */
export class SceneManager extends EventEmitter {
  /**
   * @param {Object} options
   * @param {Object} options.scene - Three.js scene
   * @param {Object} options.physicsWorld - Physics world instance
   * @param {Object} [options.THREE] - Three.js library (for dependency injection)
   * @param {Object} [options.config] - Custom configuration
   */
  constructor(options = {}) {
    super();

    const { scene, physicsWorld, THREE, config = {} } = options;

    if (!scene) {
      throw new Error('SceneManager requires a scene');
    }
    if (!physicsWorld) {
      throw new Error('SceneManager requires a physicsWorld');
    }

    /** @type {Object} */
    this._scene = scene;

    /** @type {Object} */
    this._physicsWorld = physicsWorld;

    /** @type {Object|null} */
    this._THREE = THREE || null;

    /** @type {Object} */
    this.config = { ...SCENE_CONFIG, ...config };

    /** @type {Array<Object>} */
    this.buildings = [];

    /** @type {Array<Object>} */
    this.walls = [];

    /** @type {Array<Object>} */
    this.props = [];

    /** @type {Object|null} */
    this.ground = null;

    /** @type {Object|null} */
    this.sky = null;

    /** @type {boolean} */
    this._initialized = false;
  }

  /**
   * Initialize the scene with all elements
   */
  init() {
    if (this._initialized) {
      return;
    }

    this.setupLighting();
    this.createGround();
    this.createTownLayout();
    this.setupSkybox();

    this._initialized = true;
    this.emit('scene:init');
  }

  // ==========================================================================
  // Lighting
  // ==========================================================================

  /**
   * Set up scene lighting
   */
  setupLighting() {
    if (!this._THREE) return;

    // Ambient light
    const ambientLight = new this._THREE.AmbientLight(0x404040, 0.4);
    this._scene.add(ambientLight);

    // Directional light (sun)
    const directionalLight = new this._THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(50, 100, 50);
    directionalLight.castShadow = true;

    // Configure shadow camera
    directionalLight.shadow.mapSize.width = 2048;
    directionalLight.shadow.mapSize.height = 2048;
    directionalLight.shadow.camera.near = 0.5;
    directionalLight.shadow.camera.far = 200;
    directionalLight.shadow.camera.left = -100;
    directionalLight.shadow.camera.right = 100;
    directionalLight.shadow.camera.top = 100;
    directionalLight.shadow.camera.bottom = -100;

    this._scene.add(directionalLight);

    // Point lights for atmosphere
    const pointLight1 = new this._THREE.PointLight(0xffa500, 0.5, 30);
    pointLight1.position.set(-20, 10, -20);
    this._scene.add(pointLight1);

    const pointLight2 = new this._THREE.PointLight(0xffa500, 0.5, 30);
    pointLight2.position.set(20, 10, 20);
    this._scene.add(pointLight2);

    this.emit('scene:lighting');
  }

  // ==========================================================================
  // Skybox
  // ==========================================================================

  /**
   * Set up skybox and fog
   */
  setupSkybox() {
    if (!this._THREE) return;

    // Set up fog
    this._scene.fog = new this._THREE.Fog(
      this.config.skyColor,
      this.config.fogNear,
      this.config.fogFar
    );

    // Create sky sphere
    const skyGeometry = new this._THREE.SphereGeometry(this.config.skyRadius, 32, 32);
    const skyMaterial = new this._THREE.MeshBasicMaterial({
      color: this.config.skyColor,
      side: this._THREE.BackSide,
      fog: false,
    });
    this.sky = new this._THREE.Mesh(skyGeometry, skyMaterial);
    this._scene.add(this.sky);

    this.emit('scene:skybox');
  }

  // ==========================================================================
  // Ground
  // ==========================================================================

  /**
   * Create the ground plane
   */
  createGround() {
    if (!this._THREE) {
      // Still add physics ground even without THREE
      this._physicsWorld.addGround();
      this.emit('scene:ground');
      return;
    }

    const groundGeometry = new this._THREE.PlaneGeometry(
      this.config.groundSize,
      this.config.groundSize
    );
    const groundMaterial = new this._THREE.MeshLambertMaterial({
      color: this.config.groundColor,
      transparent: true,
      opacity: 0.9,
    });

    this.ground = new this._THREE.Mesh(groundGeometry, groundMaterial);
    this.ground.rotation.x = -Math.PI / 2;
    this.ground.receiveShadow = true;
    this.ground.userData.type = 'ground';
    this._scene.add(this.ground);

    // Add physics body
    this._physicsWorld.addGround();

    // Add ground details
    this._createGroundDetails();

    this.emit('scene:ground');
  }

  /**
   * Create ground detail patches
   * @private
   */
  _createGroundDetails() {
    if (!this._THREE) return;

    const patchGeometry = new this._THREE.PlaneGeometry(8, 8);
    const patchMaterial = new this._THREE.MeshLambertMaterial({
      color: this.config.patchColor,
      transparent: true,
      opacity: 0.7,
    });

    for (let i = 0; i < this.config.patchCount; i++) {
      const patch = new this._THREE.Mesh(patchGeometry, patchMaterial);
      patch.rotation.x = -Math.PI / 2;
      patch.position.set(
        (Math.random() - 0.5) * (this.config.groundSize - 20),
        0.01,
        (Math.random() - 0.5) * (this.config.groundSize - 20)
      );
      patch.receiveShadow = true;
      this._scene.add(patch);
    }
  }

  // ==========================================================================
  // Town Layout
  // ==========================================================================

  /**
   * Create the complete town layout
   */
  createTownLayout() {
    this.createMainBuildings();
    this.createWalls();
    this.createProps();

    this.emit('scene:townLayout');
  }

  /**
   * Create main buildings from configuration
   * @param {BuildingConfig[]} [configs] - Building configurations
   */
  createMainBuildings(configs = DEFAULT_BUILDING_CONFIGS) {
    configs.forEach((config) => {
      this.createBuilding(
        config.pos[0],
        config.pos[2],
        config.size[0],
        config.size[1],
        config.size[2],
        config.color
      );
    });
  }

  /**
   * Create a single building
   * @param {number} x - X position
   * @param {number} z - Z position
   * @param {number} width - Building width
   * @param {number} height - Building height
   * @param {number} depth - Building depth
   * @param {number} color - Hex color
   * @returns {Object|null} The created building mesh
   */
  createBuilding(x, z, width, height, depth, color) {
    const y = height / 2;

    // Add physics body regardless of THREE
    this._physicsWorld.addBuilding(x, y, z, width, height, depth);

    // Track building bounds for spawn checking (even without visual)
    const buildingData = {
      position: { x, y, z },
      size: { width, height, depth },
      color,
    };

    if (!this._THREE) {
      this.buildings.push(buildingData);
      this.emit('scene:buildingCreated', { building: buildingData });
      return null;
    }

    const geometry = new this._THREE.BoxGeometry(width, height, depth);
    const material = new this._THREE.MeshLambertMaterial({ color });

    const building = new this._THREE.Mesh(geometry, material);
    building.position.set(x, y, z);
    building.castShadow = true;
    building.receiveShadow = true;
    building.userData.type = 'building';
    building.userData.size = { width, height, depth };

    this._scene.add(building);
    this.buildings.push(building);

    // Add window details
    this._addBuildingDetails(building, width, height, depth);

    this.emit('scene:buildingCreated', { building });

    return building;
  }

  /**
   * Add window details to a building
   * @param {Object} building - Building mesh
   * @param {number} width - Building width
   * @param {number} height - Building height
   * @param {number} depth - Building depth
   * @private
   */
  _addBuildingDetails(building, width, height, depth) {
    if (!this._THREE) return;

    const windowGeometry = new this._THREE.PlaneGeometry(1.5, 2);
    const windowMaterial = new this._THREE.MeshBasicMaterial({
      color: 0x4a4a4a,
      transparent: true,
      opacity: 0.8,
    });

    // Front windows
    for (let i = 0; i < Math.floor(width / 4); i++) {
      for (let j = 1; j < Math.floor(height / 3); j++) {
        const window = new this._THREE.Mesh(windowGeometry, windowMaterial);
        window.position.set(
          (i - Math.floor(width / 8)) * 3,
          (j - height / 6) * 3,
          depth / 2 + 0.01
        );
        building.add(window);
      }
    }
  }

  /**
   * Create walls from configuration
   * @param {WallConfig[]} [configs] - Wall configurations
   */
  createWalls(configs = DEFAULT_WALL_CONFIGS) {
    configs.forEach((config) => {
      this.createWall(
        config.pos[0],
        config.pos[1],
        config.pos[2],
        config.size[0],
        config.size[1],
        config.size[2]
      );
    });
  }

  /**
   * Create a single wall
   * @param {number} x - X position
   * @param {number} y - Y position (ground level)
   * @param {number} z - Z position
   * @param {number} width - Wall width
   * @param {number} height - Wall height
   * @param {number} depth - Wall depth
   * @returns {Object|null} The created wall mesh
   */
  createWall(x, y, z, width, height, depth) {
    const wallY = y + height / 2;

    // Add physics body
    this._physicsWorld.addWall(x, wallY, z, width, height, depth);

    // Track wall data
    const wallData = {
      position: { x, y: wallY, z },
      size: { width, height, depth },
    };

    if (!this._THREE) {
      this.walls.push(wallData);
      this.emit('scene:wallCreated', { wall: wallData });
      return null;
    }

    const geometry = new this._THREE.BoxGeometry(width, height, depth);
    const material = new this._THREE.MeshLambertMaterial({
      color: 0x8b7355,
    });

    const wall = new this._THREE.Mesh(geometry, material);
    wall.position.set(x, wallY, z);
    wall.castShadow = true;
    wall.receiveShadow = true;
    wall.userData.type = 'wall';
    wall.userData.size = { width, height, depth };

    this._scene.add(wall);
    this.walls.push(wall);

    this.emit('scene:wallCreated', { wall });

    return wall;
  }

  /**
   * Create props (barrels and crates)
   */
  createProps() {
    this.createBarrels();
    this.createCrates();
  }

  /**
   * Create barrels
   * @param {Array<[number, number, number]>} [positions] - Barrel positions
   */
  createBarrels(positions = DEFAULT_BARREL_POSITIONS) {
    positions.forEach((pos) => {
      const [x, , z] = pos;
      const y = this.config.barrelHeight / 2;

      // Add physics body
      this._physicsWorld.addProp(
        x,
        y,
        z,
        this.config.barrelRadius,
        this.config.barrelHeight,
        this.config.barrelRadius
      );

      if (!this._THREE) {
        this.props.push({ type: 'barrel', position: { x, y, z } });
        return;
      }

      const geometry = new this._THREE.CylinderGeometry(
        this.config.barrelRadius,
        this.config.barrelRadius,
        this.config.barrelHeight,
        8
      );
      const material = new this._THREE.MeshLambertMaterial({ color: 0x654321 });

      const barrel = new this._THREE.Mesh(geometry, material);
      barrel.position.set(x, y, z);
      barrel.castShadow = true;
      barrel.receiveShadow = true;
      barrel.userData.type = 'prop';

      this._scene.add(barrel);
      this.props.push(barrel);
    });
  }

  /**
   * Create crates
   * @param {Array<[number, number, number]>} [positions] - Crate positions
   */
  createCrates(positions = DEFAULT_CRATE_POSITIONS) {
    positions.forEach((pos) => {
      const [x, , z] = pos;
      const y = this.config.crateSize / 2;

      // Add physics body
      this._physicsWorld.addProp(
        x,
        y,
        z,
        this.config.crateSize,
        this.config.crateSize,
        this.config.crateSize
      );

      if (!this._THREE) {
        this.props.push({ type: 'crate', position: { x, y, z } });
        return;
      }

      const geometry = new this._THREE.BoxGeometry(
        this.config.crateSize,
        this.config.crateSize,
        this.config.crateSize
      );
      const material = new this._THREE.MeshLambertMaterial({ color: 0x8b4513 });

      const crate = new this._THREE.Mesh(geometry, material);
      crate.position.set(x, y, z);
      crate.castShadow = true;
      crate.receiveShadow = true;
      crate.userData.type = 'prop';

      this._scene.add(crate);
      this.props.push(crate);
    });
  }

  // ==========================================================================
  // Safe Spawn Positions
  // ==========================================================================

  /**
   * Get a safe spawn position (away from buildings)
   * @returns {SpawnPosition}
   */
  getSafeSpawnPosition() {
    let attempts = 0;

    while (attempts < this.config.maxSpawnAttempts) {
      const x = (Math.random() - 0.5) * this.config.spawnRange;
      const z = (Math.random() - 0.5) * this.config.spawnRange;

      if (this.isPositionSafe(x, z)) {
        return { x, z };
      }

      attempts++;
    }

    // Fallback to origin
    return { x: 0, z: 0 };
  }

  /**
   * Check if a position is safe (not inside a building)
   * @param {number} x - X coordinate
   * @param {number} z - Z coordinate
   * @returns {boolean}
   */
  isPositionSafe(x, z) {
    for (const building of this.buildings) {
      const bounds = this._getBuildingBounds(building);

      if (
        x > bounds.minX - this.config.spawnMargin &&
        x < bounds.maxX + this.config.spawnMargin &&
        z > bounds.minZ - this.config.spawnMargin &&
        z < bounds.maxZ + this.config.spawnMargin
      ) {
        return false;
      }
    }

    return true;
  }

  /**
   * Get building bounds
   * @param {Object} building - Building mesh or data object
   * @returns {{ minX: number, maxX: number, minZ: number, maxZ: number }}
   * @private
   */
  _getBuildingBounds(building) {
    let bx, bz, width, depth;

    if (building.position && typeof building.position.x === 'number') {
      // Three.js mesh
      bx = building.position.x;
      bz = building.position.z;

      if (building.geometry?.parameters) {
        width = building.geometry.parameters.width;
        depth = building.geometry.parameters.depth;
      } else if (building.userData?.size) {
        width = building.userData.size.width;
        depth = building.userData.size.depth;
      } else {
        width = 10; // Default
        depth = 10;
      }
    } else if (building.position) {
      // Plain data object
      bx = building.position.x;
      bz = building.position.z;
      width = building.size?.width || 10;
      depth = building.size?.depth || 10;
    } else {
      return { minX: 0, maxX: 0, minZ: 0, maxZ: 0 };
    }

    const halfWidth = width / 2;
    const halfDepth = depth / 2;

    return {
      minX: bx - halfWidth,
      maxX: bx + halfWidth,
      minZ: bz - halfDepth,
      maxZ: bz + halfDepth,
    };
  }

  /**
   * Get multiple safe spawn positions
   * @param {number} count - Number of positions to generate
   * @returns {SpawnPosition[]}
   */
  getSafeSpawnPositions(count) {
    const positions = [];

    for (let i = 0; i < count; i++) {
      positions.push(this.getSafeSpawnPosition());
    }

    return positions;
  }

  // ==========================================================================
  // State Management
  // ==========================================================================

  /**
   * Get scene state snapshot
   * @returns {Object}
   */
  getState() {
    return {
      initialized: this._initialized,
      buildingCount: this.buildings.length,
      wallCount: this.walls.length,
      propCount: this.props.length,
      hasGround: this.ground !== null || this._physicsWorld.groundBody !== null,
      hasSky: this.sky !== null,
    };
  }

  /**
   * Check if scene is initialized
   * @returns {boolean}
   */
  isInitialized() {
    return this._initialized;
  }

  /**
   * Get all building positions
   * @returns {Array<{ x: number, z: number, width: number, depth: number }>}
   */
  getBuildingPositions() {
    return this.buildings.map((building) => {
      const bounds = this._getBuildingBounds(building);
      return {
        x: (bounds.minX + bounds.maxX) / 2,
        z: (bounds.minZ + bounds.maxZ) / 2,
        width: bounds.maxX - bounds.minX,
        depth: bounds.maxZ - bounds.minZ,
      };
    });
  }
}

export default SceneManager;
