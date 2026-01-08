/**
 * Unit tests for Player class
 * Tests movement, shooting, physics interaction, and player state
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { Player, DEFAULT_CONFIG } from '@/game/Player.js';
import { GameEvents, resetEventBus, getEventBus } from '@/utils/EventEmitter.js';

// Mock camera
function createMockCamera() {
  return {
    position: { x: 0, y: 1.7, z: 5 },
    quaternion: { setFromEuler: vi.fn() },
    add: vi.fn(),
  };
}

// Mock scene
function createMockScene() {
  return {
    add: vi.fn(),
    remove: vi.fn(),
    children: [],
  };
}

// Mock physics world
function createMockPhysicsWorld() {
  return {
    addPlayer: vi.fn(() => ({
      position: { x: 0, y: 1.2, z: 5, set: vi.fn() },
      velocity: { x: 0, y: 0, z: 0, set: vi.fn() },
      angularVelocity: { x: 0, y: 0, z: 0, set: vi.fn() },
      onGround: false,
    })),
    removePlayer: vi.fn(),
  };
}

describe('Player', () => {
  let player;
  let mockCamera;
  let mockScene;
  let mockPhysicsWorld;

  beforeEach(() => {
    resetEventBus();
    mockCamera = createMockCamera();
    mockScene = createMockScene();
    mockPhysicsWorld = createMockPhysicsWorld();
    player = new Player({
      camera: mockCamera,
      scene: mockScene,
      physicsWorld: mockPhysicsWorld,
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // ==========================================================================
  // Constructor and Initialization
  // ==========================================================================
  describe('constructor', () => {
    it('should throw if camera is missing', () => {
      expect(
        () => new Player({ scene: mockScene, physicsWorld: mockPhysicsWorld })
      ).toThrow('requires a camera');
    });

    it('should throw if scene is missing', () => {
      expect(
        () => new Player({ camera: mockCamera, physicsWorld: mockPhysicsWorld })
      ).toThrow('requires a scene');
    });

    it('should throw if physicsWorld is missing', () => {
      expect(
        () => new Player({ camera: mockCamera, scene: mockScene })
      ).toThrow('requires a physicsWorld');
    });

    it('should initialize with default config', () => {
      expect(player.config.moveSpeed).toBe(DEFAULT_CONFIG.moveSpeed);
      expect(player.config.jumpForce).toBe(DEFAULT_CONFIG.jumpForce);
      expect(player.config.fireRate).toBe(DEFAULT_CONFIG.fireRate);
    });

    it('should accept custom config', () => {
      const customPlayer = new Player({
        camera: mockCamera,
        scene: mockScene,
        physicsWorld: mockPhysicsWorld,
        config: { moveSpeed: 20, fireRate: 100 },
      });
      expect(customPlayer.config.moveSpeed).toBe(20);
      expect(customPlayer.config.fireRate).toBe(100);
    });

    it('should initialize with default position', () => {
      expect(player.position.x).toBe(0);
      expect(player.position.y).toBe(1.7);
      expect(player.position.z).toBe(5);
    });

    it('should initialize with zero velocity', () => {
      expect(player.velocity.x).toBe(0);
      expect(player.velocity.y).toBe(0);
      expect(player.velocity.z).toBe(0);
    });

    it('should initialize movement state as inactive', () => {
      expect(player.movement.forward).toBe(false);
      expect(player.movement.backward).toBe(false);
      expect(player.movement.left).toBe(false);
      expect(player.movement.right).toBe(false);
    });

    it('should initialize with zero look angles', () => {
      expect(player.yaw).toBe(0);
      expect(player.pitch).toBe(0);
    });
  });

  describe('init', () => {
    it('should create physics body', () => {
      player.init();
      expect(mockPhysicsWorld.addPlayer).toHaveBeenCalled();
      expect(player.body).toBeDefined();
    });

    it('should emit init event', () => {
      const callback = vi.fn();
      player.on('player:init', callback);
      player.init();
      expect(callback).toHaveBeenCalled();
    });

    it('should not re-initialize', () => {
      player.init();
      player.init();
      expect(mockPhysicsWorld.addPlayer).toHaveBeenCalledTimes(1);
    });
  });

  // ==========================================================================
  // Movement
  // ==========================================================================
  describe('movement', () => {
    describe('setMovement', () => {
      it('should set forward movement', () => {
        player.setMovement('forward', true);
        expect(player.movement.forward).toBe(true);
      });

      it('should set backward movement', () => {
        player.setMovement('backward', true);
        expect(player.movement.backward).toBe(true);
      });

      it('should set left movement', () => {
        player.setMovement('left', true);
        expect(player.movement.left).toBe(true);
      });

      it('should set right movement', () => {
        player.setMovement('right', true);
        expect(player.movement.right).toBe(true);
      });

      it('should deactivate movement', () => {
        player.setMovement('forward', true);
        player.setMovement('forward', false);
        expect(player.movement.forward).toBe(false);
      });

      it('should ignore invalid directions', () => {
        player.setMovement('invalid', true);
        expect(player.movement.invalid).toBeUndefined();
      });
    });

    describe('handleKeyInput', () => {
      it('should set forward on W key', () => {
        player.handleKeyInput('KeyW', true);
        expect(player.movement.forward).toBe(true);
      });

      it('should set backward on S key', () => {
        player.handleKeyInput('KeyS', true);
        expect(player.movement.backward).toBe(true);
      });

      it('should set left on A key', () => {
        player.handleKeyInput('KeyA', true);
        expect(player.movement.left).toBe(true);
      });

      it('should set right on D key', () => {
        player.handleKeyInput('KeyD', true);
        expect(player.movement.right).toBe(true);
      });

      it('should set forward on ArrowUp', () => {
        player.handleKeyInput('ArrowUp', true);
        expect(player.movement.forward).toBe(true);
      });

      it('should set backward on ArrowDown', () => {
        player.handleKeyInput('ArrowDown', true);
        expect(player.movement.backward).toBe(true);
      });

      it('should set left on ArrowLeft', () => {
        player.handleKeyInput('ArrowLeft', true);
        expect(player.movement.left).toBe(true);
      });

      it('should set right on ArrowRight', () => {
        player.handleKeyInput('ArrowRight', true);
        expect(player.movement.right).toBe(true);
      });

      it('should trigger jump on Space when can jump', () => {
        player.canJump = true;
        const jumpSpy = vi.spyOn(player, 'jump');
        player.handleKeyInput('Space', true);
        expect(jumpSpy).toHaveBeenCalled();
      });

      it('should not trigger jump on Space when cannot jump', () => {
        player.canJump = false;
        const jumpSpy = vi.spyOn(player, 'jump');
        player.handleKeyInput('Space', true);
        expect(jumpSpy).not.toHaveBeenCalled();
      });

      it('should clear movement on key release', () => {
        player.handleKeyInput('KeyW', true);
        player.handleKeyInput('KeyW', false);
        expect(player.movement.forward).toBe(false);
      });
    });

    describe('isMoving', () => {
      it('should return true when moving forward', () => {
        player.movement.forward = true;
        expect(player.isMoving()).toBe(true);
      });

      it('should return true when moving backward', () => {
        player.movement.backward = true;
        expect(player.isMoving()).toBe(true);
      });

      it('should return true when moving left', () => {
        player.movement.left = true;
        expect(player.isMoving()).toBe(true);
      });

      it('should return true when moving right', () => {
        player.movement.right = true;
        expect(player.isMoving()).toBe(true);
      });

      it('should return false when not moving', () => {
        expect(player.isMoving()).toBe(false);
      });
    });

    describe('update movement', () => {
      beforeEach(() => {
        player.init();
      });

      it('should update velocity when moving forward', () => {
        player.movement.forward = true;
        player.update(0.016);
        expect(player.velocity.z).not.toBe(0);
      });

      it('should apply damping to velocity', () => {
        player.velocity.x = 10;
        player.update(0.1);
        expect(Math.abs(player.velocity.x)).toBeLessThan(10);
      });

      it('should normalize diagonal movement', () => {
        player.movement.forward = true;
        player.movement.right = true;
        player.update(0.016);

        // Direction should be normalized
        const dirLength = Math.sqrt(
          player.direction.x * player.direction.x + player.direction.z * player.direction.z
        );
        expect(dirLength).toBeCloseTo(1, 1);
      });

      it('should update physics body velocity', () => {
        player.movement.forward = true;
        player.update(0.016);
        expect(player.body.velocity.x !== 0 || player.body.velocity.z !== 0).toBe(true);
      });
    });

    describe('getCurrentSpeed', () => {
      it('should return 0 when stationary', () => {
        expect(player.getCurrentSpeed()).toBe(0);
      });

      it('should return velocity magnitude', () => {
        player.velocity.x = 3;
        player.velocity.z = 4;
        expect(player.getCurrentSpeed()).toBeCloseTo(5, 2);
      });
    });
  });

  // ==========================================================================
  // Mouse Look
  // ==========================================================================
  describe('mouse look', () => {
    describe('handleMouseMove', () => {
      it('should update yaw on horizontal movement', () => {
        player.handleMouseMove(100, 0);
        expect(player.yaw).not.toBe(0);
      });

      it('should update pitch on vertical movement', () => {
        player.handleMouseMove(0, 100);
        expect(player.pitch).not.toBe(0);
      });

      it('should clamp pitch to min value (looking down)', () => {
        // Positive Y movement = looking down = negative pitch
        player.handleMouseMove(0, 10000);
        expect(player.pitch).toBe(player.config.minPitch);
      });

      it('should clamp pitch to max value (looking up)', () => {
        // Negative Y movement = looking up = positive pitch
        player.handleMouseMove(0, -10000);
        expect(player.pitch).toBe(player.config.maxPitch);
      });

      it('should use mouse sensitivity', () => {
        player.handleMouseMove(100, 0);
        expect(player.yaw).toBeCloseTo(-100 * player.config.mouseSensitivity, 5);
      });
    });

    describe('setLookAngles', () => {
      it('should set yaw directly', () => {
        player.setLookAngles(Math.PI, 0);
        expect(player.yaw).toBe(Math.PI);
      });

      it('should set pitch with clamping', () => {
        player.setLookAngles(0, Math.PI);
        expect(player.pitch).toBe(player.config.maxPitch);
      });
    });

    describe('getLookDirection', () => {
      it('should return forward vector when looking straight', () => {
        player.yaw = 0;
        player.pitch = 0;
        const dir = player.getLookDirection();
        expect(dir.x).toBeCloseTo(0, 5);
        expect(dir.y).toBeCloseTo(0, 5);
        expect(dir.z).toBeCloseTo(-1, 5);
      });

      it('should return right vector when yaw is PI/2', () => {
        player.yaw = Math.PI / 2;
        player.pitch = 0;
        const dir = player.getLookDirection();
        expect(dir.x).toBeCloseTo(1, 5);
        expect(dir.z).toBeCloseTo(0, 5);
      });

      it('should include pitch in direction', () => {
        player.yaw = 0;
        player.pitch = Math.PI / 4;
        const dir = player.getLookDirection();
        expect(dir.y).toBeCloseTo(Math.sin(Math.PI / 4), 2);
      });
    });
  });

  // ==========================================================================
  // Jumping
  // ==========================================================================
  describe('jump', () => {
    beforeEach(() => {
      player.init();
    });

    it('should not jump if canJump is false', () => {
      player.canJump = false;
      player.jump();
      expect(player.velocity.y).toBe(0);
    });

    it('should apply jump force when canJump is true', () => {
      player.canJump = true;
      player.jump();
      expect(player.velocity.y).toBe(player.config.jumpForce);
    });

    it('should set canJump to false after jumping', () => {
      player.canJump = true;
      player.jump();
      expect(player.canJump).toBe(false);
    });

    it('should set isOnGround to false after jumping', () => {
      player.canJump = true;
      player.isOnGround = true;
      player.jump();
      expect(player.isOnGround).toBe(false);
    });

    it('should update physics body velocity', () => {
      player.canJump = true;
      player.jump();
      expect(player.body.velocity.y).toBe(player.config.jumpForce);
    });

    it('should emit jump event', () => {
      const callback = vi.fn();
      player.on('player:jump', callback);
      player.canJump = true;
      player.jump();
      expect(callback).toHaveBeenCalled();
    });
  });

  // ==========================================================================
  // Shooting
  // ==========================================================================
  describe('shooting', () => {
    describe('shoot', () => {
      it('should update lastShotTime', () => {
        const before = Date.now();
        player.shoot();
        expect(player.lastShotTime).toBeGreaterThanOrEqual(before);
      });

      it('should emit PLAYER_SHOOT event', () => {
        const callback = vi.fn();
        player.on(GameEvents.PLAYER_SHOOT, callback);
        player.shoot();
        expect(callback).toHaveBeenCalled();
      });

      it('should emit to global event bus', () => {
        const callback = vi.fn();
        getEventBus().on(GameEvents.PLAYER_SHOOT, callback);
        player.shoot();
        expect(callback).toHaveBeenCalled();
      });

      it('should respect fire rate limit', () => {
        player.shoot();
        const result = player.shoot();
        expect(result.rateLimit).toBe(true);
      });

      it('should allow shooting after fire rate elapsed', async () => {
        player.config.fireRate = 10;
        player.shoot();
        await new Promise((r) => setTimeout(r, 20));
        const result = player.shoot();
        expect(result.rateLimit).toBeUndefined();
      });

      it('should call onShoot callback', () => {
        const onShoot = vi.fn(() => ({ hit: true, object: {}, distance: 10 }));
        player.onShoot = onShoot;
        const result = player.shoot();
        expect(onShoot).toHaveBeenCalled();
        expect(result.hit).toBe(true);
      });
    });

    describe('canShoot', () => {
      it('should return true initially', () => {
        expect(player.canShoot()).toBe(true);
      });

      it('should return false immediately after shooting', () => {
        player.shoot();
        expect(player.canShoot()).toBe(false);
      });

      it('should return true after fire rate elapsed', async () => {
        player.config.fireRate = 10;
        player.shoot();
        await new Promise((r) => setTimeout(r, 20));
        expect(player.canShoot()).toBe(true);
      });
    });

    describe('getTimeUntilCanShoot', () => {
      it('should return 0 when can shoot', () => {
        expect(player.getTimeUntilCanShoot()).toBe(0);
      });

      it('should return time remaining when rate limited', () => {
        player.shoot();
        const remaining = player.getTimeUntilCanShoot();
        expect(remaining).toBeGreaterThan(0);
        expect(remaining).toBeLessThanOrEqual(player.config.fireRate);
      });
    });
  });

  // ==========================================================================
  // Position
  // ==========================================================================
  describe('position', () => {
    describe('setPosition', () => {
      beforeEach(() => {
        player.init();
      });

      it('should update player position', () => {
        player.setPosition(10, 5, 20);
        expect(player.position.x).toBe(10);
        expect(player.position.y).toBe(5);
        expect(player.position.z).toBe(20);
      });

      it('should update physics body position', () => {
        player.setPosition(10, 5, 20);
        expect(player.body.position.set).toHaveBeenCalled();
      });
    });
  });

  // ==========================================================================
  // Physics
  // ==========================================================================
  describe('physics', () => {
    beforeEach(() => {
      player.init();
    });

    it('should sync position from physics body', () => {
      player.body.position.x = 15;
      player.body.position.y = 3;
      player.body.position.z = 25;

      player._updatePhysics();

      expect(player.position.x).toBe(15);
      expect(player.position.z).toBe(25);
    });

    it('should add eye height to Y position', () => {
      player.body.position.y = 1;
      player._updatePhysics();
      expect(player.position.y).toBe(1 + player.config.eyeHeight);
    });

    it('should update canJump based on velocity', () => {
      player.body.velocity.y = 0;
      player._updatePhysics();
      expect(player.canJump).toBe(true);
    });

    it('should set canJump false when falling', () => {
      player.body.velocity.y = 5;
      player._updatePhysics();
      expect(player.canJump).toBe(false);
    });
  });

  // ==========================================================================
  // State
  // ==========================================================================
  describe('getState', () => {
    it('should return position', () => {
      player.position = { x: 1, y: 2, z: 3 };
      const state = player.getState();
      expect(state.position).toEqual({ x: 1, y: 2, z: 3 });
    });

    it('should return velocity', () => {
      player.velocity = { x: 1, y: 2, z: 3 };
      const state = player.getState();
      expect(state.velocity).toEqual({ x: 1, y: 2, z: 3 });
    });

    it('should return look angles', () => {
      player.yaw = 1;
      player.pitch = 0.5;
      const state = player.getState();
      expect(state.yaw).toBe(1);
      expect(state.pitch).toBe(0.5);
    });

    it('should return canJump', () => {
      player.canJump = true;
      const state = player.getState();
      expect(state.canJump).toBe(true);
    });

    it('should return canShoot', () => {
      const state = player.getState();
      expect(state.canShoot).toBe(true);
    });

    it('should return movement state', () => {
      player.movement.forward = true;
      const state = player.getState();
      expect(state.movement.forward).toBe(true);
    });

    it('should return copies of objects', () => {
      const state = player.getState();
      state.position.x = 999;
      expect(player.position.x).not.toBe(999);
    });
  });

  // ==========================================================================
  // Reset
  // ==========================================================================
  describe('reset', () => {
    beforeEach(() => {
      player.init();
    });

    it('should reset position to default', () => {
      player.position = { x: 100, y: 100, z: 100 };
      player.reset();
      expect(player.position.x).toBe(0);
      expect(player.position.y).toBe(1.7);
      expect(player.position.z).toBe(5);
    });

    it('should reset position to custom values', () => {
      player.reset(10, 5, 20);
      expect(player.position.x).toBe(10);
      expect(player.position.y).toBe(5);
      expect(player.position.z).toBe(20);
    });

    it('should reset look angles', () => {
      player.yaw = Math.PI;
      player.pitch = 0.5;
      player.reset();
      expect(player.yaw).toBe(0);
      expect(player.pitch).toBe(0);
    });

    it('should reset velocity', () => {
      player.velocity = { x: 10, y: 10, z: 10 };
      player.reset();
      expect(player.velocity.x).toBe(0);
      expect(player.velocity.y).toBe(0);
      expect(player.velocity.z).toBe(0);
    });

    it('should reset movement state', () => {
      player.movement.forward = true;
      player.movement.left = true;
      player.reset();
      expect(player.movement.forward).toBe(false);
      expect(player.movement.left).toBe(false);
    });

    it('should reset shooting state', () => {
      player.lastShotTime = 1000;
      player.isReloading = true;
      player.reset();
      expect(player.lastShotTime).toBe(0);
      expect(player.isReloading).toBe(false);
    });

    it('should reset physics body', () => {
      player.reset();
      expect(player.body.position.set).toHaveBeenCalled();
      expect(player.body.velocity.set).toHaveBeenCalled();
    });

    it('should emit reset event', () => {
      const callback = vi.fn();
      player.on('player:reset', callback);
      player.reset();
      expect(callback).toHaveBeenCalled();
    });
  });

  // ==========================================================================
  // Config
  // ==========================================================================
  describe('custom config', () => {
    it('should use custom move speed', () => {
      const fastPlayer = new Player({
        camera: mockCamera,
        scene: mockScene,
        physicsWorld: mockPhysicsWorld,
        config: { moveSpeed: 30 },
      });
      expect(fastPlayer.config.moveSpeed).toBe(30);
    });

    it('should use custom jump force', () => {
      const highJumper = new Player({
        camera: mockCamera,
        scene: mockScene,
        physicsWorld: mockPhysicsWorld,
        config: { jumpForce: 15 },
      });
      expect(highJumper.config.jumpForce).toBe(15);
    });

    it('should use custom fire rate', () => {
      const fastShooter = new Player({
        camera: mockCamera,
        scene: mockScene,
        physicsWorld: mockPhysicsWorld,
        config: { fireRate: 50 },
      });
      expect(fastShooter.config.fireRate).toBe(50);
    });

    it('should use custom mouse sensitivity', () => {
      const sensitiveMouse = new Player({
        camera: mockCamera,
        scene: mockScene,
        physicsWorld: mockPhysicsWorld,
        config: { mouseSensitivity: 0.005 },
      });
      expect(sensitiveMouse.config.mouseSensitivity).toBe(0.005);
    });
  });
});

// ==========================================================================
// Exports Testing
// ==========================================================================
describe('module exports', () => {
  it('should export DEFAULT_CONFIG', () => {
    expect(DEFAULT_CONFIG).toBeDefined();
    expect(DEFAULT_CONFIG.moveSpeed).toBe(15);
    expect(DEFAULT_CONFIG.jumpForce).toBe(8);
    expect(DEFAULT_CONFIG.fireRate).toBe(200);
  });

  it('should have all expected config properties', () => {
    expect(DEFAULT_CONFIG.shootRange).toBeDefined();
    expect(DEFAULT_CONFIG.mouseSensitivity).toBeDefined();
    expect(DEFAULT_CONFIG.minPitch).toBeDefined();
    expect(DEFAULT_CONFIG.maxPitch).toBeDefined();
    expect(DEFAULT_CONFIG.eyeHeight).toBeDefined();
    expect(DEFAULT_CONFIG.damping).toBeDefined();
  });
});
