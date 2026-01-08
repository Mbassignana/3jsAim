/**
 * CanvasFPSGame - Core game logic for the Canvas 2D FPS game
 * Extracted from index.html for testability
 *
 * This module handles:
 * - Game state management (menu, playing, ended)
 * - Scoring system
 * - Timer/countdown
 * - Player state
 * - Circle and NPC spawning logic
 * - Collision detection and shooting
 */

import { EventEmitter, GameEvents } from '../utils/EventEmitter.js';
import {
  TargetingSystem,
  Canvas2DRaycastStrategy,
  TargetType,
  TargetCategory,
} from './TargetingSystem.js';

/**
 * @typedef {Object} PlayerState
 * @property {number} x - X position
 * @property {number} y - Y position
 * @property {number} angle - Horizontal look angle (radians)
 * @property {number} pitch - Vertical look angle (radians)
 * @property {number} speed - Movement speed
 * @property {number} turnSpeed - Turn speed
 */

/**
 * @typedef {Object} Circle
 * @property {number} x - X position
 * @property {number} y - Y position
 * @property {string} color - Color hex string
 * @property {number} radius - Circle radius
 * @property {number} floatOffset - Animation offset
 * @property {number} floatY - Current float Y offset
 * @property {number} spawnTime - Timestamp when spawned
 */

/**
 * @typedef {Object} NPC
 * @property {number} x - X position
 * @property {number} y - Y position
 * @property {string} type - NPC type (pig, sheep, cow)
 * @property {string} color - Color hex string
 * @property {number} size - NPC size
 * @property {number} moveAngle - Current movement direction
 * @property {number} moveTimer - Time since last direction change
 * @property {number} spawnTime - Timestamp when spawned
 */

/**
 * @typedef {Object} GameConfig
 * @property {number} gameTime - Initial game duration in seconds
 * @property {number} maxCircles - Maximum number of circles
 * @property {number} maxNPCs - Maximum number of NPCs
 * @property {number} mapSize - Size of each map cell
 * @property {number} spawnInterval - Seconds between spawns
 * @property {number} circleLifetime - Milliseconds before circle despawns
 * @property {number} circleHitPoints - Points for hitting a circle
 * @property {number} npcHitPenalty - Points lost for hitting an NPC
 * @property {number} shootRange - Maximum shooting range
 * @property {number} shootConeAngle - Shooting cone angle (radians)
 */

/** Default game configuration */
export const DEFAULT_CONFIG = {
  gameTime: 120,
  maxCircles: 8,
  maxNPCs: 5,
  mapSize: 64,
  spawnInterval: 30,
  circleLifetime: 60000,
  circleHitPoints: 10,
  npcHitPenalty: 1,
  shootRange: 300,
  shootConeAngle: 0.1, // ~6 degrees
};

/** Default map layout */
export const DEFAULT_MAP = [
  [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
  [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
  [1, 0, 2, 2, 0, 0, 0, 0, 0, 0, 2, 2, 2, 0, 0, 1],
  [1, 0, 2, 2, 0, 0, 0, 0, 0, 0, 0, 0, 2, 0, 0, 1],
  [1, 0, 0, 0, 0, 0, 0, 2, 2, 0, 0, 0, 0, 0, 0, 1],
  [1, 0, 0, 0, 0, 0, 0, 2, 2, 0, 0, 0, 0, 0, 0, 1],
  [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
  [1, 0, 0, 2, 2, 0, 0, 0, 0, 0, 0, 2, 0, 0, 0, 1],
  [1, 0, 0, 2, 2, 0, 0, 0, 0, 0, 0, 2, 0, 0, 0, 1],
  [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
  [1, 0, 0, 0, 0, 0, 2, 2, 2, 0, 0, 0, 0, 0, 0, 1],
  [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
  [1, 0, 2, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 2, 0, 1],
  [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
  [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
  [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
];

/** Available circle colors */
export const CIRCLE_COLORS = [
  '#FF0000',
  '#00FF00',
  '#0000FF',
  '#FFFF00',
  '#FF00FF',
  '#00FFFF',
  '#FF8000',
  '#8000FF',
];

/** NPC types with colors */
export const NPC_TYPES = [
  { type: 'pig', color: '#FFB6C1' },
  { type: 'sheep', color: '#F5F5DC' },
  { type: 'cow', color: '#654321' },
];

/**
 * Game state enumeration
 */
export const GameState = {
  MENU: 'menu',
  PLAYING: 'playing',
  ENDED: 'ended',
};

/**
 * CanvasFPSGame - Core game logic class
 */
export class CanvasFPSGame extends EventEmitter {
  /**
   * @param {Partial<GameConfig>} [config] - Game configuration
   * @param {number[][]} [map] - Custom map layout
   */
  constructor(config = {}, map = DEFAULT_MAP) {
    super();

    /** @type {GameConfig} */
    this.config = { ...DEFAULT_CONFIG, ...config };

    /** @type {number[][]} */
    this.map = map;

    /** @type {string} */
    this.gameState = GameState.MENU;

    /** @type {number} */
    this.gameTime = this.config.gameTime;

    /** @type {number} */
    this.score = 0;

    /** @type {boolean} */
    this.isRunning = false;

    /** @type {PlayerState} */
    this.player = this._createDefaultPlayer();

    /** @type {Circle[]} */
    this.circles = [];

    /** @type {NPC[]} */
    this.npcs = [];

    /** @type {number} */
    this.spawnTimer = 0;

    /** @type {Object<string, boolean>} */
    this.keys = {};

    /** @type {number} */
    this.lastTime = 0;

    // Initialize targeting system
    this._initTargetingSystem();
  }

  /**
   * Initialize the targeting system with Canvas 2D strategy
   * @private
   */
  _initTargetingSystem() {
    const strategy = new Canvas2DRaycastStrategy({
      maxRange: this.config.shootRange,
      coneAngle: this.config.shootConeAngle,
    });

    /** @type {TargetingSystem} */
    this.targetingSystem = new TargetingSystem({
      strategy,
      maxRange: this.config.shootRange,
    });

    // Forward targeting events
    this.targetingSystem.on('shoot:hit', (data) => {
      this.emit('targeting:hit', data);
    });

    this.targetingSystem.on('shoot:miss', (data) => {
      this.emit('targeting:miss', data);
    });
  }

  /**
   * Sync targets with the targeting system
   * Call this after circles or NPCs change
   * @private
   */
  _syncTargets() {
    // Add type property to circles for targeting system
    const circleTargets = this.circles.map((circle) => ({
      ...circle,
      type: TargetType.CIRCLE,
    }));

    // Add type property to NPCs for targeting system
    const npcTargets = this.npcs.map((npc) => ({
      ...npc,
      type: TargetType.NPC,
    }));

    this.targetingSystem.registerTargets('circles', circleTargets);
    this.targetingSystem.registerTargets('npcs', npcTargets);
  }

  /**
   * Create default player state
   * @returns {PlayerState}
   * @private
   */
  _createDefaultPlayer() {
    return {
      x: 512, // Center of 16x16 map (8 * 64)
      y: 512,
      angle: 0,
      pitch: 0,
      speed: 0.1,
      turnSpeed: 0.03,
    };
  }

  /**
   * Start the game
   */
  startGame() {
    this.gameState = GameState.PLAYING;
    this.gameTime = this.config.gameTime;
    this.score = 0;
    this.isRunning = true;
    this.spawnTimer = 0;

    // Reset player position
    this.player = this._createDefaultPlayer();

    // Clear existing objects
    this.circles = [];
    this.npcs = [];

    // Spawn initial objects
    this.spawnCircles(5);
    this.spawnNPCs(3);

    this.emit(GameEvents.GAME_START, {
      gameTime: this.gameTime,
      score: this.score,
    });
  }

  /**
   * End the game
   */
  endGame() {
    this.gameState = GameState.ENDED;
    this.isRunning = false;

    this.emit(GameEvents.GAME_END, {
      finalScore: this.score,
      timeRemaining: Math.max(0, this.gameTime),
    });
  }

  /**
   * Restart the game (go to menu)
   */
  restartGame() {
    this.gameState = GameState.MENU;
    this.isRunning = false;
    this.score = 0;
    this.gameTime = this.config.gameTime;

    this.emit('game:restart');
  }

  /**
   * Update game state
   * @param {number} deltaTime - Time since last update in seconds
   */
  update(deltaTime) {
    if (this.gameState !== GameState.PLAYING || !this.isRunning) {
      return;
    }

    // Update player movement
    this.updatePlayer(deltaTime);

    // Update game objects
    this.updateCircles(deltaTime);
    this.updateNPCs(deltaTime);

    // Update spawn timer
    this.spawnTimer += deltaTime;
    if (this.spawnTimer >= this.config.spawnInterval) {
      this.spawnCircles(2);
      this.spawnTimer = 0;
    }

    // Update game timer
    this.gameTime -= deltaTime;

    this.emit('game:tick', {
      gameTime: this.gameTime,
      score: this.score,
      circleCount: this.circles.length,
      npcCount: this.npcs.length,
    });

    // Check for game over
    if (this.gameTime <= 0) {
      this.endGame();
    }
  }

  /**
   * Update player position based on key states
   * @param {number} deltaTime - Time since last update in seconds
   */
  updatePlayer(deltaTime) {
    const moveSpeed = 50 * deltaTime;

    if (this.keys['w']) {
      const newX = this.player.x + Math.cos(this.player.angle) * moveSpeed;
      const newY = this.player.y + Math.sin(this.player.angle) * moveSpeed;
      if (!this.isWall(newX, this.player.y)) this.player.x = newX;
      if (!this.isWall(this.player.x, newY)) this.player.y = newY;
    }
    if (this.keys['s']) {
      const newX = this.player.x - Math.cos(this.player.angle) * moveSpeed;
      const newY = this.player.y - Math.sin(this.player.angle) * moveSpeed;
      if (!this.isWall(newX, this.player.y)) this.player.x = newX;
      if (!this.isWall(this.player.x, newY)) this.player.y = newY;
    }
    if (this.keys['a']) {
      const newX =
        this.player.x + Math.cos(this.player.angle - Math.PI / 2) * moveSpeed;
      const newY =
        this.player.y + Math.sin(this.player.angle - Math.PI / 2) * moveSpeed;
      if (!this.isWall(newX, this.player.y)) this.player.x = newX;
      if (!this.isWall(this.player.x, newY)) this.player.y = newY;
    }
    if (this.keys['d']) {
      const newX =
        this.player.x + Math.cos(this.player.angle + Math.PI / 2) * moveSpeed;
      const newY =
        this.player.y + Math.sin(this.player.angle + Math.PI / 2) * moveSpeed;
      if (!this.isWall(newX, this.player.y)) this.player.x = newX;
      if (!this.isWall(this.player.x, newY)) this.player.y = newY;
    }
  }

  /**
   * Check if a position is inside a wall
   * @param {number} x - X position
   * @param {number} y - Y position
   * @returns {boolean}
   */
  isWall(x, y) {
    const mapX = Math.floor(x / this.config.mapSize);
    const mapY = Math.floor(y / this.config.mapSize);

    if (
      mapX < 0 ||
      mapX >= this.map[0].length ||
      mapY < 0 ||
      mapY >= this.map.length
    ) {
      return true;
    }

    return this.map[mapY][mapX] !== 0;
  }

  /**
   * Spawn circles at random valid positions
   * @param {number} count - Number of circles to spawn
   * @returns {Circle[]} Array of spawned circles
   */
  spawnCircles(count) {
    const spawned = [];

    for (
      let i = 0;
      i < count && this.circles.length < this.config.maxCircles;
      i++
    ) {
      const circle = this._createCircle();

      if (!this.isWall(circle.x, circle.y)) {
        this.circles.push(circle);
        spawned.push(circle);

        this.emit(GameEvents.CIRCLE_SPAWN, { circle });
      }
    }

    return spawned;
  }

  /**
   * Create a new circle object
   * @returns {Circle}
   * @private
   */
  _createCircle() {
    return {
      x: Math.random() * 800 + 100,
      y: Math.random() * 800 + 100,
      color: CIRCLE_COLORS[Math.floor(Math.random() * CIRCLE_COLORS.length)],
      radius: 20,
      floatOffset: Math.random() * Math.PI * 2,
      floatY: 0,
      spawnTime: Date.now(),
    };
  }

  /**
   * Spawn NPCs at random valid positions
   * @param {number} count - Number of NPCs to spawn
   * @returns {NPC[]} Array of spawned NPCs
   */
  spawnNPCs(count) {
    const spawned = [];

    for (let i = 0; i < count && this.npcs.length < this.config.maxNPCs; i++) {
      const npc = this._createNPC();

      if (!this.isWall(npc.x, npc.y)) {
        this.npcs.push(npc);
        spawned.push(npc);

        this.emit('npc:spawn', { npc });
      }
    }

    return spawned;
  }

  /**
   * Create a new NPC object
   * @returns {NPC}
   * @private
   */
  _createNPC() {
    const typeIndex = Math.floor(Math.random() * NPC_TYPES.length);
    const npcType = NPC_TYPES[typeIndex];

    return {
      x: Math.random() * 800 + 100,
      y: Math.random() * 800 + 100,
      type: npcType.type,
      color: npcType.color,
      size: 15,
      moveAngle: Math.random() * Math.PI * 2,
      moveTimer: 0,
      spawnTime: Date.now(),
    };
  }

  /**
   * Update circle animations and remove expired circles
   * @param {number} deltaTime - Time since last update in seconds
   */
  updateCircles(deltaTime) {
    const now = Date.now();

    // Update floating animation
    this.circles.forEach((circle) => {
      const time = now * 0.001;
      circle.floatY = Math.sin(time + circle.floatOffset) * 5;
    });

    // Remove expired circles
    const initialCount = this.circles.length;
    this.circles = this.circles.filter((circle) => {
      return now - circle.spawnTime < this.config.circleLifetime;
    });

    const removed = initialCount - this.circles.length;
    if (removed > 0) {
      this.emit('circles:expired', { count: removed });
    }
  }

  /**
   * Update NPC movement
   * @param {number} deltaTime - Time since last update in seconds
   */
  updateNPCs(deltaTime) {
    this.npcs.forEach((npc) => {
      npc.moveTimer += deltaTime;

      // Change direction every 2 seconds
      if (npc.moveTimer > 2) {
        npc.moveAngle = Math.random() * Math.PI * 2;
        npc.moveTimer = 0;
      }

      const moveSpeed = 20 * deltaTime;
      const newX = npc.x + Math.cos(npc.moveAngle) * moveSpeed;
      const newY = npc.y + Math.sin(npc.moveAngle) * moveSpeed;

      if (!this.isWall(newX, newY)) {
        npc.x = newX;
        npc.y = newY;
      } else {
        // Bounce off walls
        npc.moveAngle += Math.PI;
      }
    });
  }

  /**
   * Perform a shoot action
   * @returns {{ hit: boolean, type: string|null, points: number, message: string }}
   */
  shoot() {
    if (this.gameState !== GameState.PLAYING) {
      return { hit: false, type: null, points: 0, message: 'Not playing' };
    }

    const objectsInRange = this.getObjectsInCrosshair();

    if (objectsInRange.length === 0) {
      this.emit('shoot:miss');
      return { hit: false, type: null, points: 0, message: 'Miss!' };
    }

    const hit = objectsInRange[0];

    if (hit.type === 'circle') {
      this.score += this.config.circleHitPoints;
      this.circles.splice(hit.index, 1);

      this.emit(GameEvents.CIRCLE_HIT, {
        circle: hit.object,
        points: this.config.circleHitPoints,
        newScore: this.score,
      });

      return {
        hit: true,
        type: 'circle',
        points: this.config.circleHitPoints,
        message: `+${this.config.circleHitPoints} Points!`,
      };
    } else if (hit.type === 'npc') {
      this.score -= this.config.npcHitPenalty;

      this.emit('npc:hit', {
        npc: hit.object,
        penalty: this.config.npcHitPenalty,
        newScore: this.score,
      });

      return {
        hit: true,
        type: 'npc',
        points: -this.config.npcHitPenalty,
        message: `-${this.config.npcHitPenalty} Point`,
      };
    }

    return { hit: false, type: null, points: 0, message: 'Miss!' };
  }

  /**
   * Get objects in the player's crosshair/line of fire
   * Delegates to TargetingSystem for unified raycasting logic
   * @returns {Array<{type: string, index: number, distance: number, object: Circle|NPC}>}
   */
  getObjectsInCrosshair() {
    // Sync current targets with targeting system
    this._syncTargets();

    // Get player origin for raycasting
    const origin = {
      x: this.player.x,
      y: this.player.y,
      angle: this.player.angle,
    };

    // Get hits from targeting system
    const hits = this.targetingSystem.getObjectsInCrosshair(origin, {
      targetTypes: TargetCategory.SHOOTABLE,
    });

    // Convert to original format for backward compatibility
    return hits.map((hit) => ({
      type: hit.type,
      index: hit.originalIndex,
      distance: hit.distance,
      object: hit.type === TargetType.CIRCLE
        ? this.circles[hit.originalIndex]
        : this.npcs[hit.originalIndex],
    }));
  }

  /**
   * Check if an object is in the crosshair
   * @param {Circle|NPC} obj - Object to check
   * @param {number} index - Index in array
   * @param {string} type - Object type
   * @returns {Object|null}
   * @private
   * @deprecated Use getObjectsInCrosshair() instead - kept for backward compatibility
   */
  _checkObjectInCrosshair(obj, index, type) {
    const dx = obj.x - this.player.x;
    const dy = obj.y - this.player.y;
    const distance = Math.sqrt(dx * dx + dy * dy);

    if (distance > this.config.shootRange) {
      return null;
    }

    const objAngle = Math.atan2(dy, dx);
    let angleDiff = objAngle - this.player.angle;

    // Normalize angle to [-PI, PI]
    while (angleDiff > Math.PI) angleDiff -= 2 * Math.PI;
    while (angleDiff < -Math.PI) angleDiff += 2 * Math.PI;

    if (Math.abs(angleDiff) < this.config.shootConeAngle) {
      return {
        type,
        index,
        distance,
        object: obj,
      };
    }

    return null;
  }

  /**
   * Set a key state
   * @param {string} key - Key name
   * @param {boolean} pressed - Whether key is pressed
   */
  setKey(key, pressed) {
    this.keys[key.toLowerCase()] = pressed;
  }

  /**
   * Set player look angle
   * @param {number} movementX - Mouse X movement
   * @param {number} movementY - Mouse Y movement
   * @param {number} sensitivity - Mouse sensitivity
   */
  setPlayerLook(movementX, movementY, sensitivity = 0.002) {
    this.player.angle += movementX * sensitivity;
    this.player.pitch -= movementY * sensitivity;

    // Clamp pitch
    this.player.pitch = Math.max(
      -Math.PI / 2,
      Math.min(Math.PI / 2, this.player.pitch)
    );
  }

  /**
   * Add points to score
   * @param {number} points - Points to add (can be negative)
   */
  addScore(points) {
    this.score += points;
    this.emit(GameEvents.SCORE_CHANGE, { score: this.score, change: points });
  }

  /**
   * Get current game state snapshot
   * @returns {Object}
   */
  getState() {
    return {
      gameState: this.gameState,
      gameTime: this.gameTime,
      score: this.score,
      isRunning: this.isRunning,
      player: { ...this.player },
      circleCount: this.circles.length,
      npcCount: this.npcs.length,
    };
  }

  /**
   * Get formatted time string
   * @returns {string}
   */
  getFormattedTime() {
    const time = Math.max(0, this.gameTime);
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  }

  /**
   * Reset the game to initial state
   */
  reset() {
    this.gameState = GameState.MENU;
    this.gameTime = this.config.gameTime;
    this.score = 0;
    this.isRunning = false;
    this.player = this._createDefaultPlayer();
    this.circles = [];
    this.npcs = [];
    this.spawnTimer = 0;
    this.keys = {};
    this.lastTime = 0;
  }
}

export default CanvasFPSGame;
