/**
 * Unit tests for SceneManager
 * Tests building generation, town layout, safe spawn positions, and scene setup
 */

import {
  SceneManager,
  DEFAULT_BUILDING_CONFIGS,
  DEFAULT_WALL_CONFIGS,
  DEFAULT_BARREL_POSITIONS,
  DEFAULT_CRATE_POSITIONS,
  SCENE_CONFIG,
} from '@scene/SceneManager.js';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

/**
 * Create a mock Three.js library
 */
function createMockThree() {
  // Mock geometry classes
  class PlaneGeometry {
    constructor(width, height) {
      this.parameters = { width, height };
    }
  }

  class SphereGeometry {
    constructor(radius, widthSegments, heightSegments) {
      this.parameters = { radius, widthSegments, heightSegments };
    }
  }

  class BoxGeometry {
    constructor(width, height, depth) {
      this.parameters = { width, height, depth };
    }
  }

  class CylinderGeometry {
    constructor(radiusTop, radiusBottom, height, radialSegments) {
      this.parameters = { radiusTop, radiusBottom, height, radialSegments };
    }
  }

  // Mock material classes
  class MeshLambertMaterial {
    constructor(options = {}) {
      Object.assign(this, options);
    }
  }

  class MeshBasicMaterial {
    constructor(options = {}) {
      Object.assign(this, options);
    }
  }

  // Mock Mesh
  class Mesh {
    constructor(geometry, material) {
      this.geometry = geometry;
      this.material = material;
      this.position = {
        x: 0,
        y: 0,
        z: 0,
        set: function (x, y, z) {
          this.x = x;
          this.y = y;
          this.z = z;
        },
      };
      this.rotation = { x: 0, y: 0, z: 0 };
      this.castShadow = false;
      this.receiveShadow = false;
      this.userData = {};
      this.children = [];
    }
    add(child) {
      this.children.push(child);
    }
  }

  // Mock Lights
  class AmbientLight {
    constructor(color, intensity) {
      this.color = color;
      this.intensity = intensity;
    }
  }

  class DirectionalLight {
    constructor(color, intensity) {
      this.color = color;
      this.intensity = intensity;
      this.position = {
        x: 0,
        y: 0,
        z: 0,
        set: function (x, y, z) {
          this.x = x;
          this.y = y;
          this.z = z;
        },
      };
      this.castShadow = false;
      this.shadow = {
        mapSize: { width: 0, height: 0 },
        camera: { near: 0, far: 0, left: 0, right: 0, top: 0, bottom: 0 },
      };
    }
  }

  class PointLight {
    constructor(color, intensity, distance) {
      this.color = color;
      this.intensity = intensity;
      this.distance = distance;
      this.position = {
        x: 0,
        y: 0,
        z: 0,
        set: function (x, y, z) {
          this.x = x;
          this.y = y;
          this.z = z;
        },
      };
    }
  }

  // Mock Fog
  class Fog {
    constructor(color, near, far) {
      this.color = color;
      this.near = near;
      this.far = far;
    }
  }

  return {
    PlaneGeometry,
    SphereGeometry,
    BoxGeometry,
    CylinderGeometry,
    MeshLambertMaterial,
    MeshBasicMaterial,
    Mesh,
    AmbientLight,
    DirectionalLight,
    PointLight,
    Fog,
    BackSide: 1,
  };
}

/**
 * Create a mock physics world
 */
function createMockPhysicsWorld() {
  return {
    groundBody: null,
    addGround: vi.fn(function () {
      this.groundBody = { type: 'ground' };
      return this.groundBody;
    }),
    addBuilding: vi.fn(() => ({ type: 'building' })),
    addWall: vi.fn(() => ({ type: 'wall' })),
    addProp: vi.fn(() => ({ type: 'prop' })),
  };
}

/**
 * Create a mock scene
 */
function createMockScene() {
  return {
    fog: null,
    children: [],
    add: vi.fn(function (child) {
      this.children.push(child);
    }),
  };
}

describe('SceneManager', () => {
  let sceneManager;
  let mockScene;
  let mockPhysicsWorld;
  let mockThree;

  beforeEach(() => {
    mockScene = createMockScene();
    mockPhysicsWorld = createMockPhysicsWorld();
    mockThree = createMockThree();

    sceneManager = new SceneManager({
      scene: mockScene,
      physicsWorld: mockPhysicsWorld,
      THREE: mockThree,
    });
  });

  afterEach(() => {
    sceneManager = null;
    mockScene = null;
    mockPhysicsWorld = null;
    mockThree = null;
  });

  // ==========================================================================
  // Constructor
  // ==========================================================================
  describe('constructor', () => {
    it('should create with required dependencies', () => {
      expect(sceneManager).toBeDefined();
    });

    it('should throw if scene is missing', () => {
      expect(() => {
        new SceneManager({ physicsWorld: mockPhysicsWorld });
      }).toThrow('SceneManager requires a scene');
    });

    it('should throw if physicsWorld is missing', () => {
      expect(() => {
        new SceneManager({ scene: mockScene });
      }).toThrow('SceneManager requires a physicsWorld');
    });

    it('should use default configuration', () => {
      expect(sceneManager.config).toMatchObject(SCENE_CONFIG);
    });

    it('should accept custom configuration', () => {
      const customManager = new SceneManager({
        scene: mockScene,
        physicsWorld: mockPhysicsWorld,
        THREE: mockThree,
        config: { groundSize: 100, spawnRange: 50 },
      });

      expect(customManager.config.groundSize).toBe(100);
      expect(customManager.config.spawnRange).toBe(50);
      expect(customManager.config.groundColor).toBe(SCENE_CONFIG.groundColor);
    });

    it('should initialize empty arrays', () => {
      expect(sceneManager.buildings).toEqual([]);
      expect(sceneManager.walls).toEqual([]);
      expect(sceneManager.props).toEqual([]);
    });

    it('should initialize null references', () => {
      expect(sceneManager.ground).toBeNull();
      expect(sceneManager.sky).toBeNull();
    });

    it('should not be initialized by default', () => {
      expect(sceneManager.isInitialized()).toBe(false);
    });
  });

  // ==========================================================================
  // Initialization
  // ==========================================================================
  describe('init', () => {
    it('should initialize scene', () => {
      sceneManager.init();
      expect(sceneManager.isInitialized()).toBe(true);
    });

    it('should emit init event', () => {
      const callback = vi.fn();
      sceneManager.on('scene:init', callback);
      sceneManager.init();
      expect(callback).toHaveBeenCalled();
    });

    it('should set up lighting', () => {
      sceneManager.init();
      // Should have added lights to scene
      const lights = mockScene.children.filter(
        (c) =>
          c instanceof mockThree.AmbientLight ||
          c instanceof mockThree.DirectionalLight ||
          c instanceof mockThree.PointLight
      );
      expect(lights.length).toBeGreaterThan(0);
    });

    it('should create ground', () => {
      sceneManager.init();
      expect(sceneManager.ground).not.toBeNull();
      expect(mockPhysicsWorld.addGround).toHaveBeenCalled();
    });

    it('should create buildings', () => {
      sceneManager.init();
      expect(sceneManager.buildings.length).toBe(DEFAULT_BUILDING_CONFIGS.length);
    });

    it('should create walls', () => {
      sceneManager.init();
      expect(sceneManager.walls.length).toBe(DEFAULT_WALL_CONFIGS.length);
    });

    it('should create props', () => {
      sceneManager.init();
      const expectedProps = DEFAULT_BARREL_POSITIONS.length + DEFAULT_CRATE_POSITIONS.length;
      expect(sceneManager.props.length).toBe(expectedProps);
    });

    it('should create skybox', () => {
      sceneManager.init();
      expect(sceneManager.sky).not.toBeNull();
    });

    it('should not reinitialize', () => {
      sceneManager.init();
      const buildingCount = sceneManager.buildings.length;
      sceneManager.init();
      expect(sceneManager.buildings.length).toBe(buildingCount);
    });
  });

  // ==========================================================================
  // Lighting
  // ==========================================================================
  describe('setupLighting', () => {
    it('should add ambient light', () => {
      sceneManager.setupLighting();
      const ambientLights = mockScene.children.filter((c) => c instanceof mockThree.AmbientLight);
      expect(ambientLights.length).toBe(1);
    });

    it('should add directional light', () => {
      sceneManager.setupLighting();
      const directionalLights = mockScene.children.filter(
        (c) => c instanceof mockThree.DirectionalLight
      );
      expect(directionalLights.length).toBe(1);
    });

    it('should configure shadow on directional light', () => {
      sceneManager.setupLighting();
      const dirLight = mockScene.children.find((c) => c instanceof mockThree.DirectionalLight);
      expect(dirLight.castShadow).toBe(true);
    });

    it('should add point lights', () => {
      sceneManager.setupLighting();
      const pointLights = mockScene.children.filter((c) => c instanceof mockThree.PointLight);
      expect(pointLights.length).toBe(2);
    });

    it('should emit lighting event', () => {
      const callback = vi.fn();
      sceneManager.on('scene:lighting', callback);
      sceneManager.setupLighting();
      expect(callback).toHaveBeenCalled();
    });
  });

  // ==========================================================================
  // Skybox
  // ==========================================================================
  describe('setupSkybox', () => {
    it('should create fog', () => {
      sceneManager.setupSkybox();
      expect(mockScene.fog).toBeInstanceOf(mockThree.Fog);
    });

    it('should set fog parameters', () => {
      sceneManager.setupSkybox();
      expect(mockScene.fog.color).toBe(SCENE_CONFIG.skyColor);
      expect(mockScene.fog.near).toBe(SCENE_CONFIG.fogNear);
      expect(mockScene.fog.far).toBe(SCENE_CONFIG.fogFar);
    });

    it('should create sky sphere', () => {
      sceneManager.setupSkybox();
      expect(sceneManager.sky).not.toBeNull();
      expect(sceneManager.sky.geometry).toBeInstanceOf(mockThree.SphereGeometry);
    });

    it('should emit skybox event', () => {
      const callback = vi.fn();
      sceneManager.on('scene:skybox', callback);
      sceneManager.setupSkybox();
      expect(callback).toHaveBeenCalled();
    });
  });

  // ==========================================================================
  // Ground
  // ==========================================================================
  describe('createGround', () => {
    it('should create ground mesh', () => {
      sceneManager.createGround();
      expect(sceneManager.ground).not.toBeNull();
    });

    it('should use correct geometry', () => {
      sceneManager.createGround();
      expect(sceneManager.ground.geometry).toBeInstanceOf(mockThree.PlaneGeometry);
      expect(sceneManager.ground.geometry.parameters.width).toBe(SCENE_CONFIG.groundSize);
    });

    it('should rotate to be horizontal', () => {
      sceneManager.createGround();
      expect(sceneManager.ground.rotation.x).toBe(-Math.PI / 2);
    });

    it('should enable shadow receiving', () => {
      sceneManager.createGround();
      expect(sceneManager.ground.receiveShadow).toBe(true);
    });

    it('should add physics body', () => {
      sceneManager.createGround();
      expect(mockPhysicsWorld.addGround).toHaveBeenCalled();
    });

    it('should emit ground event', () => {
      const callback = vi.fn();
      sceneManager.on('scene:ground', callback);
      sceneManager.createGround();
      expect(callback).toHaveBeenCalled();
    });

    it('should work without THREE', () => {
      const noThreeManager = new SceneManager({
        scene: mockScene,
        physicsWorld: mockPhysicsWorld,
      });
      noThreeManager.createGround();
      expect(mockPhysicsWorld.addGround).toHaveBeenCalled();
    });
  });

  // ==========================================================================
  // Buildings
  // ==========================================================================
  describe('createMainBuildings', () => {
    it('should create buildings from default config', () => {
      sceneManager.createMainBuildings();
      expect(sceneManager.buildings.length).toBe(DEFAULT_BUILDING_CONFIGS.length);
    });

    it('should accept custom building configs', () => {
      const customConfigs = [
        { pos: [0, 0, 0], size: [10, 10, 10], color: 0xff0000 },
        { pos: [20, 0, 20], size: [5, 5, 5], color: 0x00ff00 },
      ];
      sceneManager.createMainBuildings(customConfigs);
      expect(sceneManager.buildings.length).toBe(2);
    });

    it('should add physics bodies for each building', () => {
      sceneManager.createMainBuildings();
      expect(mockPhysicsWorld.addBuilding).toHaveBeenCalledTimes(DEFAULT_BUILDING_CONFIGS.length);
    });
  });

  describe('createBuilding', () => {
    it('should create building mesh', () => {
      const building = sceneManager.createBuilding(0, 0, 10, 20, 10, 0xff0000);
      expect(building).not.toBeNull();
      expect(building).toBeInstanceOf(mockThree.Mesh);
    });

    it('should position building at correct height', () => {
      const building = sceneManager.createBuilding(5, 10, 10, 20, 10, 0xff0000);
      expect(building.position.x).toBe(5);
      expect(building.position.y).toBe(10); // height/2
      expect(building.position.z).toBe(10);
    });

    it('should use correct geometry', () => {
      const building = sceneManager.createBuilding(0, 0, 10, 20, 15, 0xff0000);
      expect(building.geometry).toBeInstanceOf(mockThree.BoxGeometry);
      expect(building.geometry.parameters.width).toBe(10);
      expect(building.geometry.parameters.height).toBe(20);
      expect(building.geometry.parameters.depth).toBe(15);
    });

    it('should enable shadows', () => {
      const building = sceneManager.createBuilding(0, 0, 10, 10, 10, 0xff0000);
      expect(building.castShadow).toBe(true);
      expect(building.receiveShadow).toBe(true);
    });

    it('should set userData type', () => {
      const building = sceneManager.createBuilding(0, 0, 10, 10, 10, 0xff0000);
      expect(building.userData.type).toBe('building');
    });

    it('should add to buildings array', () => {
      sceneManager.createBuilding(0, 0, 10, 10, 10, 0xff0000);
      expect(sceneManager.buildings.length).toBe(1);
    });

    it('should add physics body', () => {
      sceneManager.createBuilding(5, 10, 10, 20, 15, 0xff0000);
      expect(mockPhysicsWorld.addBuilding).toHaveBeenCalledWith(5, 10, 10, 10, 20, 15);
    });

    it('should emit buildingCreated event', () => {
      const callback = vi.fn();
      sceneManager.on('scene:buildingCreated', callback);
      sceneManager.createBuilding(0, 0, 10, 10, 10, 0xff0000);
      expect(callback).toHaveBeenCalledWith(
        expect.objectContaining({ building: expect.anything() })
      );
    });

    it('should add window details', () => {
      const building = sceneManager.createBuilding(0, 0, 12, 12, 10, 0xff0000);
      // Building should have window children
      expect(building.children.length).toBeGreaterThan(0);
    });
  });

  // ==========================================================================
  // Walls
  // ==========================================================================
  describe('createWalls', () => {
    it('should create walls from default config', () => {
      sceneManager.createWalls();
      expect(sceneManager.walls.length).toBe(DEFAULT_WALL_CONFIGS.length);
    });

    it('should accept custom wall configs', () => {
      const customConfigs = [{ pos: [0, 0, 0], size: [10, 5, 1], rotation: 0 }];
      sceneManager.createWalls(customConfigs);
      expect(sceneManager.walls.length).toBe(1);
    });

    it('should add physics bodies for each wall', () => {
      sceneManager.createWalls();
      expect(mockPhysicsWorld.addWall).toHaveBeenCalledTimes(DEFAULT_WALL_CONFIGS.length);
    });
  });

  describe('createWall', () => {
    it('should create wall mesh', () => {
      const wall = sceneManager.createWall(0, 0, 0, 10, 5, 1);
      expect(wall).not.toBeNull();
    });

    it('should position wall correctly', () => {
      const wall = sceneManager.createWall(5, 0, 10, 10, 8, 1);
      expect(wall.position.x).toBe(5);
      expect(wall.position.y).toBe(4); // y + height/2
      expect(wall.position.z).toBe(10);
    });

    it('should set userData type', () => {
      const wall = sceneManager.createWall(0, 0, 0, 10, 5, 1);
      expect(wall.userData.type).toBe('wall');
    });

    it('should add to walls array', () => {
      sceneManager.createWall(0, 0, 0, 10, 5, 1);
      expect(sceneManager.walls.length).toBe(1);
    });

    it('should emit wallCreated event', () => {
      const callback = vi.fn();
      sceneManager.on('scene:wallCreated', callback);
      sceneManager.createWall(0, 0, 0, 10, 5, 1);
      expect(callback).toHaveBeenCalled();
    });
  });

  // ==========================================================================
  // Props
  // ==========================================================================
  describe('createBarrels', () => {
    it('should create barrels from default positions', () => {
      sceneManager.createBarrels();
      expect(sceneManager.props.length).toBe(DEFAULT_BARREL_POSITIONS.length);
    });

    it('should accept custom positions', () => {
      sceneManager.createBarrels([
        [0, 0, 0],
        [10, 0, 10],
      ]);
      expect(sceneManager.props.length).toBe(2);
    });

    it('should add physics bodies', () => {
      sceneManager.createBarrels();
      expect(mockPhysicsWorld.addProp).toHaveBeenCalledTimes(DEFAULT_BARREL_POSITIONS.length);
    });

    it('should use cylinder geometry', () => {
      sceneManager.createBarrels([[5, 0, 5]]);
      const barrel = sceneManager.props[0];
      expect(barrel.geometry).toBeInstanceOf(mockThree.CylinderGeometry);
    });
  });

  describe('createCrates', () => {
    it('should create crates from default positions', () => {
      sceneManager.createCrates();
      expect(sceneManager.props.length).toBe(DEFAULT_CRATE_POSITIONS.length);
    });

    it('should accept custom positions', () => {
      sceneManager.createCrates([[0, 0, 0]]);
      expect(sceneManager.props.length).toBe(1);
    });

    it('should add physics bodies', () => {
      sceneManager.createCrates();
      expect(mockPhysicsWorld.addProp).toHaveBeenCalledTimes(DEFAULT_CRATE_POSITIONS.length);
    });

    it('should use box geometry', () => {
      sceneManager.createCrates([[5, 0, 5]]);
      const crate = sceneManager.props[0];
      expect(crate.geometry).toBeInstanceOf(mockThree.BoxGeometry);
    });
  });

  // ==========================================================================
  // Safe Spawn Positions
  // ==========================================================================
  describe('getSafeSpawnPosition', () => {
    beforeEach(() => {
      sceneManager.init();
    });

    it('should return position with x and z', () => {
      const pos = sceneManager.getSafeSpawnPosition();
      expect(typeof pos.x).toBe('number');
      expect(typeof pos.z).toBe('number');
    });

    it('should return position within spawn range', () => {
      for (let i = 0; i < 20; i++) {
        const pos = sceneManager.getSafeSpawnPosition();
        expect(Math.abs(pos.x)).toBeLessThanOrEqual(SCENE_CONFIG.spawnRange / 2);
        expect(Math.abs(pos.z)).toBeLessThanOrEqual(SCENE_CONFIG.spawnRange / 2);
      }
    });

    it('should return fallback position after max attempts', () => {
      // Fill entire spawn area with buildings
      for (let x = -40; x <= 40; x += 5) {
        for (let z = -40; z <= 40; z += 5) {
          sceneManager.buildings.push({
            position: { x, y: 5, z },
            size: { width: 10, height: 10, depth: 10 },
          });
        }
      }

      const pos = sceneManager.getSafeSpawnPosition();
      expect(pos).toEqual({ x: 0, z: 0 });
    });
  });

  describe('isPositionSafe', () => {
    beforeEach(() => {
      sceneManager.createBuilding(0, 0, 10, 10, 10, 0xffffff);
    });

    it('should return false for position inside building', () => {
      expect(sceneManager.isPositionSafe(0, 0)).toBe(false);
    });

    it('should return false for position within margin of building', () => {
      // Building is 10x10 at origin, so extends from -5 to 5
      // With margin of 3, unsafe area is -8 to 8
      expect(sceneManager.isPositionSafe(7, 0)).toBe(false);
    });

    it('should return true for position outside building and margin', () => {
      expect(sceneManager.isPositionSafe(20, 20)).toBe(true);
    });

    it('should check all buildings', () => {
      sceneManager.createBuilding(50, 50, 10, 10, 10, 0xffffff);

      expect(sceneManager.isPositionSafe(50, 50)).toBe(false);
      expect(sceneManager.isPositionSafe(0, 0)).toBe(false);
      expect(sceneManager.isPositionSafe(25, 25)).toBe(true);
    });
  });

  describe('getSafeSpawnPositions', () => {
    beforeEach(() => {
      sceneManager.init();
    });

    it('should return requested number of positions', () => {
      const positions = sceneManager.getSafeSpawnPositions(5);
      expect(positions.length).toBe(5);
    });

    it('should return valid positions', () => {
      const positions = sceneManager.getSafeSpawnPositions(10);
      positions.forEach((pos) => {
        expect(typeof pos.x).toBe('number');
        expect(typeof pos.z).toBe('number');
      });
    });
  });

  // ==========================================================================
  // State
  // ==========================================================================
  describe('getState', () => {
    it('should return uninitialized state', () => {
      const state = sceneManager.getState();

      expect(state.initialized).toBe(false);
      expect(state.buildingCount).toBe(0);
      expect(state.wallCount).toBe(0);
      expect(state.propCount).toBe(0);
      expect(state.hasGround).toBe(false);
      expect(state.hasSky).toBe(false);
    });

    it('should return initialized state', () => {
      sceneManager.init();
      const state = sceneManager.getState();

      expect(state.initialized).toBe(true);
      expect(state.buildingCount).toBe(DEFAULT_BUILDING_CONFIGS.length);
      expect(state.wallCount).toBe(DEFAULT_WALL_CONFIGS.length);
      expect(state.propCount).toBe(
        DEFAULT_BARREL_POSITIONS.length + DEFAULT_CRATE_POSITIONS.length
      );
      expect(state.hasGround).toBe(true);
      expect(state.hasSky).toBe(true);
    });
  });

  describe('getBuildingPositions', () => {
    beforeEach(() => {
      sceneManager.createBuilding(10, 20, 8, 12, 6, 0xffffff);
      sceneManager.createBuilding(-5, 15, 10, 10, 10, 0xffffff);
    });

    it('should return all building positions', () => {
      const positions = sceneManager.getBuildingPositions();
      expect(positions.length).toBe(2);
    });

    it('should include x, z, width, depth', () => {
      const positions = sceneManager.getBuildingPositions();

      expect(positions[0]).toHaveProperty('x');
      expect(positions[0]).toHaveProperty('z');
      expect(positions[0]).toHaveProperty('width');
      expect(positions[0]).toHaveProperty('depth');
    });

    it('should return correct values', () => {
      const positions = sceneManager.getBuildingPositions();

      expect(positions[0].x).toBe(10);
      expect(positions[0].z).toBe(20);
      expect(positions[0].width).toBe(8);
      expect(positions[0].depth).toBe(6);
    });
  });

  // ==========================================================================
  // Without Three.js
  // ==========================================================================
  describe('without THREE', () => {
    let noThreeManager;

    beforeEach(() => {
      noThreeManager = new SceneManager({
        scene: mockScene,
        physicsWorld: mockPhysicsWorld,
      });
    });

    it('should still create building data', () => {
      noThreeManager.createBuilding(0, 0, 10, 10, 10, 0xffffff);
      expect(noThreeManager.buildings.length).toBe(1);
    });

    it('should store building data as plain object', () => {
      noThreeManager.createBuilding(5, 10, 8, 12, 6, 0xff0000);
      const building = noThreeManager.buildings[0];

      expect(building.position).toEqual({ x: 5, y: 6, z: 10 });
      expect(building.size).toEqual({ width: 8, height: 12, depth: 6 });
      expect(building.color).toBe(0xff0000);
    });

    it('should still add physics bodies', () => {
      noThreeManager.createBuilding(0, 0, 10, 10, 10, 0xffffff);
      expect(mockPhysicsWorld.addBuilding).toHaveBeenCalled();
    });

    it('should still check spawn positions', () => {
      noThreeManager.createBuilding(0, 0, 10, 10, 10, 0xffffff);
      expect(noThreeManager.isPositionSafe(0, 0)).toBe(false);
      expect(noThreeManager.isPositionSafe(20, 20)).toBe(true);
    });

    it('should create wall data', () => {
      noThreeManager.createWall(0, 0, 0, 10, 5, 1);
      expect(noThreeManager.walls.length).toBe(1);
      expect(noThreeManager.walls[0].position).toBeDefined();
    });

    it('should create prop data', () => {
      noThreeManager.createBarrels([[5, 0, 5]]);
      expect(noThreeManager.props.length).toBe(1);
      expect(noThreeManager.props[0].type).toBe('barrel');
    });
  });

  // ==========================================================================
  // Exported Constants
  // ==========================================================================
  describe('exported constants', () => {
    it('should export DEFAULT_BUILDING_CONFIGS', () => {
      expect(DEFAULT_BUILDING_CONFIGS).toBeDefined();
      expect(Array.isArray(DEFAULT_BUILDING_CONFIGS)).toBe(true);
      expect(DEFAULT_BUILDING_CONFIGS.length).toBe(6);
    });

    it('should export DEFAULT_WALL_CONFIGS', () => {
      expect(DEFAULT_WALL_CONFIGS).toBeDefined();
      expect(Array.isArray(DEFAULT_WALL_CONFIGS)).toBe(true);
      expect(DEFAULT_WALL_CONFIGS.length).toBe(7);
    });

    it('should export DEFAULT_BARREL_POSITIONS', () => {
      expect(DEFAULT_BARREL_POSITIONS).toBeDefined();
      expect(Array.isArray(DEFAULT_BARREL_POSITIONS)).toBe(true);
    });

    it('should export DEFAULT_CRATE_POSITIONS', () => {
      expect(DEFAULT_CRATE_POSITIONS).toBeDefined();
      expect(Array.isArray(DEFAULT_CRATE_POSITIONS)).toBe(true);
    });

    it('should export SCENE_CONFIG', () => {
      expect(SCENE_CONFIG).toBeDefined();
      expect(SCENE_CONFIG.groundSize).toBe(200);
      expect(SCENE_CONFIG.spawnRange).toBe(80);
      expect(SCENE_CONFIG.maxSpawnAttempts).toBe(50);
    });
  });
});
