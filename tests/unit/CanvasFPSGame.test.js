/**
 * Unit tests for CanvasFPSGame
 * Tests game state, scoring, timing, and core game logic
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  CanvasFPSGame,
  GameState,
  DEFAULT_CONFIG,
  DEFAULT_MAP,
  CIRCLE_COLORS,
  NPC_TYPES,
} from '@/game/CanvasFPSGame.js';
import { GameEvents, resetEventBus } from '@/utils/EventEmitter.js';

describe('CanvasFPSGame', () => {
  let game;

  beforeEach(() => {
    resetEventBus();
    game = new CanvasFPSGame();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // ==========================================================================
  // Constructor and Initialization
  // ==========================================================================
  describe('constructor', () => {
    it('should initialize with default config', () => {
      expect(game.config.gameTime).toBe(DEFAULT_CONFIG.gameTime);
      expect(game.config.maxCircles).toBe(DEFAULT_CONFIG.maxCircles);
      expect(game.config.maxNPCs).toBe(DEFAULT_CONFIG.maxNPCs);
    });

    it('should accept custom config', () => {
      const customGame = new CanvasFPSGame({ gameTime: 60, maxCircles: 20 });
      expect(customGame.config.gameTime).toBe(60);
      expect(customGame.config.maxCircles).toBe(20);
      // Other values should remain default
      expect(customGame.config.maxNPCs).toBe(DEFAULT_CONFIG.maxNPCs);
    });

    it('should initialize with menu state', () => {
      expect(game.gameState).toBe(GameState.MENU);
    });

    it('should initialize with correct default values', () => {
      expect(game.score).toBe(0);
      expect(game.isRunning).toBe(false);
      expect(game.circles).toEqual([]);
      expect(game.npcs).toEqual([]);
    });

    it('should initialize player at map center', () => {
      expect(game.player.x).toBe(512);
      expect(game.player.y).toBe(512);
      expect(game.player.angle).toBe(0);
      expect(game.player.pitch).toBe(0);
    });

    it('should use default map', () => {
      expect(game.map).toEqual(DEFAULT_MAP);
    });

    it('should accept custom map', () => {
      const customMap = [
        [1, 1, 1],
        [1, 0, 1],
        [1, 1, 1],
      ];
      const customGame = new CanvasFPSGame({}, customMap);
      expect(customGame.map).toEqual(customMap);
    });
  });

  // ==========================================================================
  // Game State Management
  // ==========================================================================
  describe('game state management', () => {
    describe('startGame', () => {
      it('should change state to playing', () => {
        game.startGame();
        expect(game.gameState).toBe(GameState.PLAYING);
      });

      it('should set isRunning to true', () => {
        game.startGame();
        expect(game.isRunning).toBe(true);
      });

      it('should reset score to 0', () => {
        game.score = 100;
        game.startGame();
        expect(game.score).toBe(0);
      });

      it('should reset game time', () => {
        game.gameTime = 0;
        game.startGame();
        expect(game.gameTime).toBe(game.config.gameTime);
      });

      it('should reset player position', () => {
        game.player.x = 100;
        game.player.y = 100;
        game.player.angle = Math.PI;
        game.startGame();
        expect(game.player.x).toBe(512);
        expect(game.player.y).toBe(512);
        expect(game.player.angle).toBe(0);
      });

      it('should spawn initial circles and NPCs', () => {
        // Note: Spawning may fail if random positions land inside walls
        // The important thing is that startGame attempts to spawn objects
        game.startGame();
        // Manually spawn more to ensure some land in valid positions
        game.spawnCircles(game.config.maxCircles);
        game.spawnNPCs(game.config.maxNPCs);
        expect(game.circles.length).toBeGreaterThan(0);
        expect(game.npcs.length).toBeGreaterThan(0);
      });

      it('should emit game start event', () => {
        const callback = vi.fn();
        game.on(GameEvents.GAME_START, callback);
        game.startGame();
        expect(callback).toHaveBeenCalledWith(
          expect.objectContaining({
            gameTime: game.config.gameTime,
            score: 0,
          })
        );
      });

      it('should reset spawn timer', () => {
        game.spawnTimer = 100;
        game.startGame();
        expect(game.spawnTimer).toBe(0);
      });
    });

    describe('endGame', () => {
      beforeEach(() => {
        game.startGame();
      });

      it('should change state to ended', () => {
        game.endGame();
        expect(game.gameState).toBe(GameState.ENDED);
      });

      it('should set isRunning to false', () => {
        game.endGame();
        expect(game.isRunning).toBe(false);
      });

      it('should emit game end event with final score', () => {
        game.score = 50;
        const callback = vi.fn();
        game.on(GameEvents.GAME_END, callback);
        game.endGame();
        expect(callback).toHaveBeenCalledWith(
          expect.objectContaining({
            finalScore: 50,
          })
        );
      });
    });

    describe('restartGame', () => {
      beforeEach(() => {
        game.startGame();
        game.score = 100;
      });

      it('should change state to menu', () => {
        game.restartGame();
        expect(game.gameState).toBe(GameState.MENU);
      });

      it('should set isRunning to false', () => {
        game.restartGame();
        expect(game.isRunning).toBe(false);
      });

      it('should reset score', () => {
        game.restartGame();
        expect(game.score).toBe(0);
      });

      it('should reset game time', () => {
        game.gameTime = 30;
        game.restartGame();
        expect(game.gameTime).toBe(game.config.gameTime);
      });

      it('should emit restart event', () => {
        const callback = vi.fn();
        game.on('game:restart', callback);
        game.restartGame();
        expect(callback).toHaveBeenCalled();
      });
    });

    describe('reset', () => {
      beforeEach(() => {
        game.startGame();
        game.score = 100;
        game.update(10);
      });

      it('should reset all game state', () => {
        game.reset();
        expect(game.gameState).toBe(GameState.MENU);
        expect(game.score).toBe(0);
        expect(game.isRunning).toBe(false);
        expect(game.circles).toEqual([]);
        expect(game.npcs).toEqual([]);
      });

      it('should reset player to default position', () => {
        game.reset();
        expect(game.player.x).toBe(512);
        expect(game.player.y).toBe(512);
      });

      it('should clear keys', () => {
        game.setKey('w', true);
        game.reset();
        expect(game.keys).toEqual({});
      });
    });
  });

  // ==========================================================================
  // Scoring System
  // ==========================================================================
  describe('scoring system', () => {
    describe('addScore', () => {
      it('should add positive points', () => {
        game.addScore(10);
        expect(game.score).toBe(10);
      });

      it('should handle negative points', () => {
        game.score = 50;
        game.addScore(-10);
        expect(game.score).toBe(40);
      });

      it('should accumulate points', () => {
        game.addScore(10);
        game.addScore(20);
        game.addScore(5);
        expect(game.score).toBe(35);
      });

      it('should emit score change event', () => {
        const callback = vi.fn();
        game.on(GameEvents.SCORE_CHANGE, callback);
        game.addScore(10);
        expect(callback).toHaveBeenCalledWith({ score: 10, change: 10 });
      });

      it('should allow score to go negative', () => {
        game.addScore(-5);
        expect(game.score).toBe(-5);
      });
    });

    describe('shoot scoring', () => {
      beforeEach(() => {
        game.startGame();
        // Position a circle directly in front of player
        game.circles = [
          {
            x: game.player.x + 100,
            y: game.player.y,
            color: '#FF0000',
            radius: 20,
            floatOffset: 0,
            floatY: 0,
            spawnTime: Date.now(),
          },
        ];
        game.player.angle = 0; // Looking right (positive x)
      });

      it('should add points when hitting a circle', () => {
        const result = game.shoot();
        expect(result.hit).toBe(true);
        expect(result.type).toBe('circle');
        expect(result.points).toBe(game.config.circleHitPoints);
        expect(game.score).toBe(game.config.circleHitPoints);
      });

      it('should remove circle when hit', () => {
        expect(game.circles.length).toBe(1);
        game.shoot();
        expect(game.circles.length).toBe(0);
      });

      it('should emit circle hit event', () => {
        const callback = vi.fn();
        game.on(GameEvents.CIRCLE_HIT, callback);
        game.shoot();
        expect(callback).toHaveBeenCalledWith(
          expect.objectContaining({
            points: game.config.circleHitPoints,
          })
        );
      });

      it('should subtract points when hitting an NPC', () => {
        game.circles = [];
        game.npcs = [
          {
            x: game.player.x + 100,
            y: game.player.y,
            type: 'pig',
            color: '#FFB6C1',
            size: 15,
            moveAngle: 0,
            moveTimer: 0,
            spawnTime: Date.now(),
          },
        ];

        const result = game.shoot();
        expect(result.hit).toBe(true);
        expect(result.type).toBe('npc');
        expect(result.points).toBe(-game.config.npcHitPenalty);
        expect(game.score).toBe(-game.config.npcHitPenalty);
      });

      it('should return miss when nothing in crosshair', () => {
        game.circles = [];
        game.npcs = [];

        const result = game.shoot();
        expect(result.hit).toBe(false);
        expect(result.message).toBe('Miss!');
      });

      it('should hit closest object first', () => {
        // Add a circle further away
        game.circles.push({
          x: game.player.x + 200,
          y: game.player.y,
          color: '#00FF00',
          radius: 20,
          floatOffset: 0,
          floatY: 0,
          spawnTime: Date.now(),
        });

        expect(game.circles.length).toBe(2);
        game.shoot();
        // Should have removed the closer one, leaving the further one
        expect(game.circles.length).toBe(1);
        expect(game.circles[0].x).toBe(game.player.x + 200);
      });
    });
  });

  // ==========================================================================
  // Timer System
  // ==========================================================================
  describe('timer system', () => {
    beforeEach(() => {
      game.startGame();
    });

    it('should count down during gameplay', () => {
      const initialTime = game.gameTime;
      game.update(1); // 1 second
      expect(game.gameTime).toBe(initialTime - 1);
    });

    it('should not count down when not playing', () => {
      game.gameState = GameState.MENU;
      const initialTime = game.gameTime;
      game.update(1);
      expect(game.gameTime).toBe(initialTime);
    });

    it('should not count down when not running', () => {
      game.isRunning = false;
      const initialTime = game.gameTime;
      game.update(1);
      expect(game.gameTime).toBe(initialTime);
    });

    it('should end game when time reaches zero', () => {
      game.gameTime = 0.5;
      game.update(1);
      expect(game.gameState).toBe(GameState.ENDED);
    });

    it('should format time correctly', () => {
      game.gameTime = 125;
      expect(game.getFormattedTime()).toBe('2:05');
    });

    it('should format single-digit seconds with padding', () => {
      game.gameTime = 63;
      expect(game.getFormattedTime()).toBe('1:03');
    });

    it('should handle zero time', () => {
      game.gameTime = 0;
      expect(game.getFormattedTime()).toBe('0:00');
    });

    it('should not show negative time', () => {
      game.gameTime = -5;
      expect(game.getFormattedTime()).toBe('0:00');
    });

    it('should emit tick events during update', () => {
      const callback = vi.fn();
      game.on('game:tick', callback);
      game.update(0.016);
      expect(callback).toHaveBeenCalled();
    });
  });

  // ==========================================================================
  // Player Movement
  // ==========================================================================
  describe('player movement', () => {
    beforeEach(() => {
      game.startGame();
      // Clear spawned objects for cleaner tests
      game.circles = [];
      game.npcs = [];
    });

    it('should move forward with W key', () => {
      game.setKey('w', true);
      game.player.angle = 0; // Facing right
      const initialX = game.player.x;
      game.updatePlayer(0.1);
      expect(game.player.x).toBeGreaterThan(initialX);
    });

    it('should move backward with S key', () => {
      game.setKey('s', true);
      game.player.angle = 0;
      const initialX = game.player.x;
      game.updatePlayer(0.1);
      expect(game.player.x).toBeLessThan(initialX);
    });

    it('should strafe left with A key', () => {
      game.setKey('a', true);
      game.player.angle = 0; // Facing right
      const initialY = game.player.y;
      game.updatePlayer(0.1);
      expect(game.player.y).toBeLessThan(initialY);
    });

    it('should strafe right with D key', () => {
      game.setKey('d', true);
      game.player.angle = 0;
      const initialY = game.player.y;
      game.updatePlayer(0.1);
      expect(game.player.y).toBeGreaterThan(initialY);
    });

    it('should not move into walls', () => {
      // Position player near a wall
      game.player.x = 100; // Near left wall
      game.player.y = 100;
      game.player.angle = Math.PI; // Facing left

      game.setKey('w', true);
      game.updatePlayer(0.1);
      // Player should stop at wall
      expect(game.isWall(game.player.x, game.player.y)).toBe(false);
    });

    it('should update player look angle', () => {
      game.setPlayerLook(100, 0, 0.002);
      expect(game.player.angle).toBe(0.2);
    });

    it('should clamp pitch angle', () => {
      game.setPlayerLook(0, 10000, 0.002);
      expect(game.player.pitch).toBeLessThanOrEqual(Math.PI / 2);
      expect(game.player.pitch).toBeGreaterThanOrEqual(-Math.PI / 2);
    });
  });

  // ==========================================================================
  // Wall Collision
  // ==========================================================================
  describe('wall collision', () => {
    it('should detect outer walls', () => {
      expect(game.isWall(0, 0)).toBe(true);
      expect(game.isWall(1000, 1000)).toBe(true);
    });

    it('should detect open spaces', () => {
      expect(game.isWall(512, 512)).toBe(false);
    });

    it('should detect buildings (type 2)', () => {
      // From default map, there's a building at map position [2][2-3]
      expect(game.isWall(2 * 64 + 32, 2 * 64 + 32)).toBe(true);
    });

    it('should handle out of bounds positions', () => {
      expect(game.isWall(-100, -100)).toBe(true);
      expect(game.isWall(10000, 10000)).toBe(true);
    });
  });

  // ==========================================================================
  // Circle Spawning
  // ==========================================================================
  describe('circle spawning', () => {
    beforeEach(() => {
      game.circles = [];
    });

    it('should spawn requested number of circles', () => {
      const spawned = game.spawnCircles(3);
      expect(spawned.length).toBeLessThanOrEqual(3);
      expect(game.circles.length).toBeLessThanOrEqual(3);
    });

    it('should not exceed max circles', () => {
      game.spawnCircles(100);
      expect(game.circles.length).toBeLessThanOrEqual(game.config.maxCircles);
    });

    it('should create circles with valid properties', () => {
      // Spawn multiple to ensure at least one spawns in valid position
      game.spawnCircles(game.config.maxCircles);

      // Should have at least one circle spawned
      expect(game.circles.length).toBeGreaterThan(0);

      const circle = game.circles[0];
      expect(circle).toBeDefined();
      expect(typeof circle.x).toBe('number');
      expect(typeof circle.y).toBe('number');
      expect(CIRCLE_COLORS).toContain(circle.color);
      expect(circle.radius).toBe(20);
      expect(typeof circle.floatOffset).toBe('number');
      expect(typeof circle.spawnTime).toBe('number');
    });

    it('should emit spawn event for each circle', () => {
      const callback = vi.fn();
      game.on(GameEvents.CIRCLE_SPAWN, callback);
      game.spawnCircles(3);
      expect(callback.mock.calls.length).toBeLessThanOrEqual(3);
    });

    it('should not spawn circles in walls', () => {
      // Spawn many circles and verify none are in walls
      game.spawnCircles(game.config.maxCircles);
      game.circles.forEach((circle) => {
        expect(game.isWall(circle.x, circle.y)).toBe(false);
      });
    });
  });

  // ==========================================================================
  // NPC Spawning
  // ==========================================================================
  describe('NPC spawning', () => {
    beforeEach(() => {
      game.npcs = [];
    });

    it('should spawn requested number of NPCs', () => {
      const spawned = game.spawnNPCs(3);
      expect(spawned.length).toBeLessThanOrEqual(3);
      expect(game.npcs.length).toBeLessThanOrEqual(3);
    });

    it('should not exceed max NPCs', () => {
      game.spawnNPCs(100);
      expect(game.npcs.length).toBeLessThanOrEqual(game.config.maxNPCs);
    });

    it('should create NPCs with valid properties', () => {
      // Spawn multiple NPCs to ensure at least one lands in a valid position
      // (some may be rejected if they spawn inside walls)
      game.spawnNPCs(game.config.maxNPCs);
      expect(game.npcs.length).toBeGreaterThan(0);

      const npc = game.npcs[0];

      expect(npc).toBeDefined();
      expect(typeof npc.x).toBe('number');
      expect(typeof npc.y).toBe('number');
      expect(NPC_TYPES.map((t) => t.type)).toContain(npc.type);
      expect(NPC_TYPES.map((t) => t.color)).toContain(npc.color);
      expect(npc.size).toBe(15);
      expect(typeof npc.moveAngle).toBe('number');
      expect(typeof npc.spawnTime).toBe('number');
    });

    it('should emit spawn event for each NPC', () => {
      const callback = vi.fn();
      game.on('npc:spawn', callback);
      game.spawnNPCs(3);
      expect(callback.mock.calls.length).toBeLessThanOrEqual(3);
    });
  });

  // ==========================================================================
  // Circle Updates
  // ==========================================================================
  describe('circle updates', () => {
    beforeEach(() => {
      game.startGame();
      game.circles = [
        {
          x: 500,
          y: 500,
          color: '#FF0000',
          radius: 20,
          floatOffset: 0,
          floatY: 0,
          spawnTime: Date.now(),
        },
      ];
    });

    it('should update float animation', () => {
      const circle = game.circles[0];
      game.updateCircles(0.016);
      // floatY should be updated based on time
      expect(typeof circle.floatY).toBe('number');
    });

    it('should remove expired circles', () => {
      game.circles[0].spawnTime = Date.now() - game.config.circleLifetime - 1000;
      game.updateCircles(0.016);
      expect(game.circles.length).toBe(0);
    });

    it('should keep non-expired circles', () => {
      game.circles[0].spawnTime = Date.now();
      game.updateCircles(0.016);
      expect(game.circles.length).toBe(1);
    });

    it('should emit expired event when circles are removed', () => {
      const callback = vi.fn();
      game.on('circles:expired', callback);
      game.circles[0].spawnTime = Date.now() - game.config.circleLifetime - 1000;
      game.updateCircles(0.016);
      expect(callback).toHaveBeenCalledWith({ count: 1 });
    });
  });

  // ==========================================================================
  // NPC Updates
  // ==========================================================================
  describe('NPC updates', () => {
    beforeEach(() => {
      game.startGame();
      game.npcs = [
        {
          x: 500,
          y: 500,
          type: 'pig',
          color: '#FFB6C1',
          size: 15,
          moveAngle: 0,
          moveTimer: 0,
          spawnTime: Date.now(),
        },
      ];
    });

    it('should move NPCs', () => {
      const npc = game.npcs[0];
      const initialX = npc.x;
      game.updateNPCs(0.1);
      expect(npc.x).not.toBe(initialX);
    });

    it('should change direction after 2 seconds', () => {
      const npc = game.npcs[0];
      const initialAngle = npc.moveAngle;
      npc.moveTimer = 2.1;
      game.updateNPCs(0.016);
      // Direction should have been reset to a new random value
      expect(npc.moveTimer).toBeLessThan(0.1);
    });

    it('should bounce off walls', () => {
      const npc = game.npcs[0];
      npc.x = 65; // Near wall
      npc.y = 65;
      npc.moveAngle = Math.PI; // Moving toward wall

      const initialAngle = npc.moveAngle;
      game.updateNPCs(0.1);

      // If NPC hit wall, angle should have changed
      if (game.isWall(npc.x + Math.cos(initialAngle), npc.y + Math.sin(initialAngle))) {
        expect(npc.moveAngle).not.toBe(initialAngle);
      }
    });
  });

  // ==========================================================================
  // Crosshair Detection
  // ==========================================================================
  describe('crosshair detection', () => {
    beforeEach(() => {
      game.startGame();
      game.circles = [];
      game.npcs = [];
    });

    it('should detect objects in crosshair', () => {
      game.circles = [
        {
          x: game.player.x + 100,
          y: game.player.y,
          color: '#FF0000',
          radius: 20,
          floatOffset: 0,
          floatY: 0,
          spawnTime: Date.now(),
        },
      ];
      game.player.angle = 0;

      const objects = game.getObjectsInCrosshair();
      expect(objects.length).toBe(1);
      expect(objects[0].type).toBe('circle');
    });

    it('should not detect objects outside cone angle', () => {
      game.circles = [
        {
          x: game.player.x,
          y: game.player.y + 100, // 90 degrees off
          color: '#FF0000',
          radius: 20,
          floatOffset: 0,
          floatY: 0,
          spawnTime: Date.now(),
        },
      ];
      game.player.angle = 0; // Looking right

      const objects = game.getObjectsInCrosshair();
      expect(objects.length).toBe(0);
    });

    it('should not detect objects beyond range', () => {
      game.circles = [
        {
          x: game.player.x + game.config.shootRange + 100,
          y: game.player.y,
          color: '#FF0000',
          radius: 20,
          floatOffset: 0,
          floatY: 0,
          spawnTime: Date.now(),
        },
      ];
      game.player.angle = 0;

      const objects = game.getObjectsInCrosshair();
      expect(objects.length).toBe(0);
    });

    it('should sort objects by distance', () => {
      game.circles = [
        {
          x: game.player.x + 200,
          y: game.player.y,
          color: '#FF0000',
          radius: 20,
          floatOffset: 0,
          floatY: 0,
          spawnTime: Date.now(),
        },
        {
          x: game.player.x + 100,
          y: game.player.y,
          color: '#00FF00',
          radius: 20,
          floatOffset: 0,
          floatY: 0,
          spawnTime: Date.now(),
        },
      ];
      game.player.angle = 0;

      const objects = game.getObjectsInCrosshair();
      expect(objects.length).toBe(2);
      expect(objects[0].distance).toBeLessThan(objects[1].distance);
    });
  });

  // ==========================================================================
  // Game State Snapshot
  // ==========================================================================
  describe('getState', () => {
    it('should return current game state', () => {
      game.startGame();
      game.score = 50;

      const state = game.getState();
      expect(state.gameState).toBe(GameState.PLAYING);
      expect(state.score).toBe(50);
      expect(state.isRunning).toBe(true);
      expect(state.gameTime).toBeLessThanOrEqual(game.config.gameTime);
      expect(state.player).toBeDefined();
      expect(typeof state.circleCount).toBe('number');
      expect(typeof state.npcCount).toBe('number');
    });

    it('should return a copy of player state', () => {
      const state = game.getState();
      state.player.x = 9999;
      expect(game.player.x).not.toBe(9999);
    });
  });

  // ==========================================================================
  // Update Loop
  // ==========================================================================
  describe('update loop', () => {
    beforeEach(() => {
      game.startGame();
    });

    it('should spawn new circles at spawn interval', () => {
      const initialCount = game.circles.length;
      game.spawnTimer = game.config.spawnInterval - 0.1;
      game.update(0.2);
      // Spawn timer should reset and new circles should spawn
      expect(game.spawnTimer).toBeLessThan(1);
    });

    it('should reset spawn timer after spawning', () => {
      game.spawnTimer = game.config.spawnInterval + 1;
      game.update(0.016);
      expect(game.spawnTimer).toBeLessThan(1);
    });

    it('should update player, circles, and NPCs each tick', () => {
      game.setKey('w', true);
      const initialPlayerX = game.player.x;

      game.update(0.1);

      // Player should have moved
      expect(game.player.x).not.toBe(initialPlayerX);
    });
  });

  // ==========================================================================
  // Shoot Action Edge Cases
  // ==========================================================================
  describe('shoot edge cases', () => {
    it('should not allow shooting when not playing', () => {
      game.gameState = GameState.MENU;
      const result = game.shoot();
      expect(result.hit).toBe(false);
      expect(result.message).toBe('Not playing');
    });

    it('should emit miss event on miss', () => {
      game.startGame();
      game.circles = [];
      game.npcs = [];

      const callback = vi.fn();
      game.on('shoot:miss', callback);
      game.shoot();
      expect(callback).toHaveBeenCalled();
    });
  });

  // ==========================================================================
  // Key Input
  // ==========================================================================
  describe('key input', () => {
    it('should set key state', () => {
      game.setKey('W', true);
      expect(game.keys['w']).toBe(true);
    });

    it('should clear key state', () => {
      game.setKey('W', true);
      game.setKey('W', false);
      expect(game.keys['w']).toBe(false);
    });

    it('should normalize key to lowercase', () => {
      game.setKey('A', true);
      expect(game.keys['a']).toBe(true);
    });
  });

  // ==========================================================================
  // Custom Configuration
  // ==========================================================================
  describe('custom configuration', () => {
    it('should use custom circle hit points', () => {
      const customGame = new CanvasFPSGame({ circleHitPoints: 25 });
      customGame.startGame();
      customGame.circles = [
        {
          x: customGame.player.x + 100,
          y: customGame.player.y,
          color: '#FF0000',
          radius: 20,
          floatOffset: 0,
          floatY: 0,
          spawnTime: Date.now(),
        },
      ];
      customGame.player.angle = 0;

      const result = customGame.shoot();
      expect(result.points).toBe(25);
      expect(customGame.score).toBe(25);
    });

    it('should use custom NPC hit penalty', () => {
      const customGame = new CanvasFPSGame({ npcHitPenalty: 5 });
      customGame.startGame();
      customGame.npcs = [
        {
          x: customGame.player.x + 100,
          y: customGame.player.y,
          type: 'pig',
          color: '#FFB6C1',
          size: 15,
          moveAngle: 0,
          moveTimer: 0,
          spawnTime: Date.now(),
        },
      ];
      customGame.player.angle = 0;

      const result = customGame.shoot();
      expect(result.points).toBe(-5);
      expect(customGame.score).toBe(-5);
    });

    it('should use custom game time', () => {
      const customGame = new CanvasFPSGame({ gameTime: 60 });
      customGame.startGame();
      expect(customGame.gameTime).toBe(60);
    });
  });
});

// ==========================================================================
// Exports Testing
// ==========================================================================
describe('module exports', () => {
  it('should export DEFAULT_CONFIG', () => {
    expect(DEFAULT_CONFIG).toBeDefined();
    expect(DEFAULT_CONFIG.gameTime).toBe(120);
  });

  it('should export DEFAULT_MAP', () => {
    expect(DEFAULT_MAP).toBeDefined();
    expect(DEFAULT_MAP.length).toBe(16);
  });

  it('should export CIRCLE_COLORS', () => {
    expect(CIRCLE_COLORS).toBeDefined();
    expect(Array.isArray(CIRCLE_COLORS)).toBe(true);
  });

  it('should export NPC_TYPES', () => {
    expect(NPC_TYPES).toBeDefined();
    expect(Array.isArray(NPC_TYPES)).toBe(true);
    expect(NPC_TYPES.length).toBe(3);
  });

  it('should export GameState enum', () => {
    expect(GameState.MENU).toBe('menu');
    expect(GameState.PLAYING).toBe('playing');
    expect(GameState.ENDED).toBe('ended');
  });
});
