/**
 * GameConfig - Unified configuration object for all game constants
 * Centralizes all game settings for easy tuning and modification
 */

export const GameConfig = {
  // Game timing
  timing: {
    defaultGameDuration: 120, // seconds
    spawnInterval: 30, // seconds between spawns
    circleLifetime: 60000, // milliseconds before auto-despawn
    targetTickRate: 60, // target FPS for game logic
  },

  // Player settings
  player: {
    height: 1.7, // eye level in meters
    moveSpeed: 5.0, // units per second
    sprintMultiplier: 1.5,
    jumpForce: 8.0,
    mouseSensitivity: 0.002, // radians per pixel
    minPitch: -Math.PI / 2 + 0.1, // prevent looking straight down
    maxPitch: Math.PI / 2 - 0.1, // prevent looking straight up
  },

  // Circle targets
  circles: {
    maxCount: 12,
    initialSpawnCount: 8,
    respawnCount: 3,
    radius: 1.0,
    tubeRadius: 0.3,
    minHeight: 1,
    maxHeight: 8,
    floatSpeed: { min: 0.5, max: 1.0 },
    floatAmplitude: { min: 0.3, max: 0.7 },
    rotationSpeed: { min: -1.0, max: 1.0 },
    hitPoints: 10,
    colors: [
      0xff0000, // Red
      0x00ff00, // Green
      0x0000ff, // Blue
      0xffff00, // Yellow
      0xff00ff, // Magenta
      0x00ffff, // Cyan
      0xff8000, // Orange
      0x8000ff, // Purple
    ],
  },

  // NPC settings
  npcs: {
    initialSpawnCount: 5,
    moveSpeed: 2.0,
    wanderRadius: 20,
    decisionInterval: 3.0, // seconds between AI decisions
    hitPenalty: 1,
    height: 1.8,
  },

  // Physics
  physics: {
    gravity: -9.82,
    fixedTimeStep: 1 / 60,
    maxSubSteps: 3,
    playerMass: 80,
    defaultFriction: 0.3,
    defaultRestitution: 0.1,
  },

  // Scene / World
  scene: {
    worldSize: 60, // world is 60x60 units
    groundLevel: 0,
    skyColor: 0x87ceeb,
    ambientLightIntensity: 0.6,
    directionalLightIntensity: 0.8,
    shadowMapSize: 2048,
    buildingMinHeight: 3,
    buildingMaxHeight: 12,
    buildingMinSize: 4,
    buildingMaxSize: 12,
    buildingCount: 15,
  },

  // Camera
  camera: {
    fov: 75,
    near: 0.1,
    far: 1000,
    defaultPosition: { x: 0, y: 1.7, z: 5 },
  },

  // UI
  ui: {
    crosshairSize: 20,
    crosshairColor: '#ffffff',
    messageDisplayTime: 1000, // milliseconds
    scoreColors: {
      positive: '#00ff00',
      negative: '#ff0000',
      neutral: '#ffffff',
    },
  },

  // Audio (for future implementation)
  audio: {
    masterVolume: 1.0,
    sfxVolume: 0.8,
    musicVolume: 0.5,
  },

  // Debugging
  debug: {
    enabled: false,
    showFPS: false,
    showPhysics: false,
    showColliders: false,
    logLevel: 'warn', // 'none', 'error', 'warn', 'info', 'debug'
  },
};

/**
 * Creates a deep clone of the config for modifications
 * @returns {typeof GameConfig} A copy of the game config
 */
export function cloneConfig() {
  return JSON.parse(JSON.stringify(GameConfig));
}

/**
 * Validates a config object against the expected structure
 * @param {object} config - Config object to validate
 * @returns {{ valid: boolean, errors: string[] }}
 */
export function validateConfig(config) {
  const errors = [];

  // Validate timing
  if (
    typeof config.timing?.defaultGameDuration !== 'number' ||
    config.timing.defaultGameDuration <= 0
  ) {
    errors.push('timing.defaultGameDuration must be a positive number');
  }

  // Validate player
  if (typeof config.player?.height !== 'number' || config.player.height <= 0) {
    errors.push('player.height must be a positive number');
  }
  if (typeof config.player?.moveSpeed !== 'number' || config.player.moveSpeed <= 0) {
    errors.push('player.moveSpeed must be a positive number');
  }

  // Validate circles
  if (typeof config.circles?.maxCount !== 'number' || config.circles.maxCount <= 0) {
    errors.push('circles.maxCount must be a positive number');
  }
  if (!Array.isArray(config.circles?.colors) || config.circles.colors.length === 0) {
    errors.push('circles.colors must be a non-empty array');
  }

  // Validate physics
  if (typeof config.physics?.gravity !== 'number') {
    errors.push('physics.gravity must be a number');
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Merges custom settings into the default config
 * @param {Partial<typeof GameConfig>} customConfig - Custom config values
 * @returns {typeof GameConfig} Merged config
 */
export function mergeConfig(customConfig) {
  const merged = cloneConfig();

  function deepMerge(target, source) {
    for (const key of Object.keys(source)) {
      if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key])) {
        target[key] = target[key] || {};
        deepMerge(target[key], source[key]);
      } else {
        target[key] = source[key];
      }
    }
    return target;
  }

  return deepMerge(merged, customConfig);
}

export default GameConfig;
