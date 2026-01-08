/**
 * WeaponSystem - Manages different weapon types with unique characteristics
 * Each weapon has distinct fire rate, spread, damage, and behavior
 */

import { EventEmitter, getEventBus } from '../utils/EventEmitter.js';

// ==========================================================================
// Types
// ==========================================================================

/**
 * @typedef {Object} WeaponConfig
 * @property {string} id - Unique weapon identifier
 * @property {string} name - Display name
 * @property {string} description - Weapon description
 * @property {string} icon - Weapon icon/emoji
 * @property {number} fireRate - Milliseconds between shots
 * @property {number} damage - Base damage/points per pellet
 * @property {number} pelletCount - Number of pellets per shot
 * @property {number} spread - Spread angle (radians) for pellets
 * @property {number} range - Maximum effective range
 * @property {number} coneAngle - Base accuracy cone angle
 * @property {Object} [ammo] - Ammo configuration
 * @property {number} [ammo.clipSize] - Shots per clip
 * @property {number} [ammo.reserve] - Reserve ammo
 * @property {number} [ammo.reloadTime] - Reload time in ms
 * @property {Object} [recoil] - Recoil configuration
 * @property {number} [recoil.vertical] - Vertical recoil per shot
 * @property {number} [recoil.horizontal] - Horizontal recoil variance
 * @property {number} [recoil.recovery] - Recoil recovery rate
 */

/**
 * @typedef {Object} WeaponState
 * @property {string} weaponId - Current weapon ID
 * @property {number} currentAmmo - Ammo in current clip
 * @property {number} reserveAmmo - Reserve ammo
 * @property {boolean} isReloading - Whether currently reloading
 * @property {number} lastShotTime - Timestamp of last shot
 * @property {number} recoilOffset - Current recoil offset
 */

/**
 * @typedef {Object} ShotResult
 * @property {boolean} canShoot - Whether shot was fired
 * @property {string} [blockReason] - Why shot was blocked
 * @property {Array<{angle: number, distance: number}>} [pellets] - Pellet directions
 * @property {number} damagePerPellet - Damage per pellet
 */

// ==========================================================================
// Weapon Definitions
// ==========================================================================

export const Weapons = {
  PISTOL: {
    id: 'pistol',
    name: 'Pistol',
    description: 'Reliable sidearm with good accuracy',
    icon: '🔫',
    fireRate: 300, // 3.3 shots/sec
    damage: 10,
    pelletCount: 1,
    spread: 0,
    range: 500,
    coneAngle: 0.08, // ~4.5 degrees
    ammo: {
      clipSize: 12,
      reserve: 48,
      reloadTime: 1500,
    },
    recoil: {
      vertical: 0.02,
      horizontal: 0.01,
      recovery: 0.1,
    },
  },

  RIFLE: {
    id: 'rifle',
    name: 'Rifle',
    description: 'High precision with slower fire rate',
    icon: '🎯',
    fireRate: 600, // 1.7 shots/sec
    damage: 25,
    pelletCount: 1,
    spread: 0,
    range: 800,
    coneAngle: 0.03, // ~1.7 degrees (very accurate)
    ammo: {
      clipSize: 5,
      reserve: 25,
      reloadTime: 2500,
    },
    recoil: {
      vertical: 0.05,
      horizontal: 0.02,
      recovery: 0.05,
    },
  },

  SHOTGUN: {
    id: 'shotgun',
    name: 'Shotgun',
    description: 'Devastating spread at close range',
    icon: '💥',
    fireRate: 800, // 1.25 shots/sec
    damage: 8, // Per pellet
    pelletCount: 8,
    spread: 0.15, // ~8.5 degrees spread
    range: 200,
    coneAngle: 0.2, // Wide base cone
    ammo: {
      clipSize: 6,
      reserve: 24,
      reloadTime: 500, // Per shell
    },
    recoil: {
      vertical: 0.08,
      horizontal: 0.04,
      recovery: 0.08,
    },
  },

  SMG: {
    id: 'smg',
    name: 'SMG',
    description: 'Rapid fire with moderate accuracy',
    icon: '⚡',
    fireRate: 100, // 10 shots/sec
    damage: 5,
    pelletCount: 1,
    spread: 0,
    range: 350,
    coneAngle: 0.12, // ~7 degrees
    ammo: {
      clipSize: 30,
      reserve: 120,
      reloadTime: 2000,
    },
    recoil: {
      vertical: 0.015,
      horizontal: 0.015,
      recovery: 0.15,
    },
  },

  SNIPER: {
    id: 'sniper',
    name: 'Sniper',
    description: 'One-shot precision at extreme range',
    icon: '🎯',
    fireRate: 1500, // 0.67 shots/sec
    damage: 100,
    pelletCount: 1,
    spread: 0,
    range: 2000,
    coneAngle: 0.01, // Pinpoint accuracy
    ammo: {
      clipSize: 1,
      reserve: 10,
      reloadTime: 3000,
    },
    recoil: {
      vertical: 0.1,
      horizontal: 0.03,
      recovery: 0.03,
    },
  },
};

export const DEFAULT_WEAPON = Weapons.PISTOL;

// ==========================================================================
// WeaponSystem Class
// ==========================================================================

export class WeaponSystem extends EventEmitter {
  /**
   * @param {Object} [options]
   * @param {WeaponConfig} [options.defaultWeapon] - Starting weapon
   * @param {boolean} [options.infiniteAmmo=false] - Disable ammo system
   * @param {boolean} [options.recoilEnabled=true] - Enable recoil
   */
  constructor(options = {}) {
    super();

    /** @type {WeaponConfig} */
    this._currentWeapon = options.defaultWeapon ?? DEFAULT_WEAPON;

    /** @type {boolean} */
    this._infiniteAmmo = options.infiniteAmmo ?? false;

    /** @type {boolean} */
    this._recoilEnabled = options.recoilEnabled ?? true;

    /** @type {WeaponState} */
    this._state = this._createInitialState();

    /** @type {number|null} */
    this._reloadTimerId = null;

    /** @type {Map<string, WeaponConfig>} */
    this._unlockedWeapons = new Map();

    // Unlock default weapon
    this._unlockedWeapons.set(this._currentWeapon.id, this._currentWeapon);
  }

  /**
   * Get current weapon
   * @returns {WeaponConfig}
   */
  get currentWeapon() {
    return this._currentWeapon;
  }

  /**
   * Get current state
   * @returns {WeaponState}
   */
  get state() {
    return { ...this._state };
  }

  /**
   * Get current ammo in clip
   * @returns {number}
   */
  get currentAmmo() {
    return this._state.currentAmmo;
  }

  /**
   * Get reserve ammo
   * @returns {number}
   */
  get reserveAmmo() {
    return this._state.reserveAmmo;
  }

  /**
   * Check if currently reloading
   * @returns {boolean}
   */
  get isReloading() {
    return this._state.isReloading;
  }

  /**
   * Get current recoil offset
   * @returns {number}
   */
  get recoilOffset() {
    return this._state.recoilOffset;
  }

  /**
   * Unlock a weapon
   * @param {string|WeaponConfig} weapon - Weapon ID or config
   */
  unlockWeapon(weapon) {
    const config = this._getWeaponConfig(weapon);
    if (config) {
      this._unlockedWeapons.set(config.id, config);
      this.emit('weapon:unlocked', { weapon: config });
    }
  }

  /**
   * Check if weapon is unlocked
   * @param {string} weaponId
   * @returns {boolean}
   */
  isWeaponUnlocked(weaponId) {
    return this._unlockedWeapons.has(weaponId);
  }

  /**
   * Get all unlocked weapons
   * @returns {WeaponConfig[]}
   */
  getUnlockedWeapons() {
    return Array.from(this._unlockedWeapons.values());
  }

  /**
   * Switch to a different weapon
   * @param {string|WeaponConfig} weapon - Weapon ID or config
   * @returns {boolean} True if switched
   */
  switchWeapon(weapon) {
    const config = this._getWeaponConfig(weapon);
    if (!config) {
      return false;
    }

    if (!this._unlockedWeapons.has(config.id)) {
      return false;
    }

    // Cancel any reload in progress
    this._cancelReload();

    const previousWeapon = this._currentWeapon;
    this._currentWeapon = config;
    this._state = this._createInitialState();

    this.emit('weapon:switched', {
      from: previousWeapon,
      to: config,
    });

    return true;
  }

  /**
   * Attempt to fire the weapon
   * @param {Object} [options]
   * @param {number} [options.currentTime] - Current timestamp (for testing)
   * @returns {ShotResult}
   */
  shoot(options = {}) {
    const currentTime = options.currentTime ?? Date.now();

    // Check reload state
    if (this._state.isReloading) {
      return { canShoot: false, blockReason: 'reloading' };
    }

    // Check fire rate
    if (currentTime - this._state.lastShotTime < this._currentWeapon.fireRate) {
      return { canShoot: false, blockReason: 'fire_rate' };
    }

    // Check ammo
    if (!this._infiniteAmmo && this._state.currentAmmo <= 0) {
      if (this._state.reserveAmmo > 0) {
        this.reload();
        return { canShoot: false, blockReason: 'reloading' };
      }
      return { canShoot: false, blockReason: 'no_ammo' };
    }

    // Fire the weapon
    this._state.lastShotTime = currentTime;

    if (!this._infiniteAmmo) {
      this._state.currentAmmo--;
    }

    // Generate pellet directions
    const pellets = this._generatePellets();

    // Apply recoil
    if (this._recoilEnabled && this._currentWeapon.recoil) {
      this._applyRecoil();
    }

    const result = {
      canShoot: true,
      pellets,
      damagePerPellet: this._currentWeapon.damage,
      totalPotentialDamage: this._currentWeapon.damage * this._currentWeapon.pelletCount,
    };

    this.emit('weapon:fired', {
      weapon: this._currentWeapon,
      result,
      ammoRemaining: this._state.currentAmmo,
    });
    getEventBus().emit('weapon:fired', {
      weaponId: this._currentWeapon.id,
      pelletCount: pellets.length,
    });

    return result;
  }

  /**
   * Start reloading
   * @returns {boolean} True if reload started
   */
  reload() {
    if (this._state.isReloading) {
      return false;
    }

    if (this._infiniteAmmo) {
      return false;
    }

    if (this._state.currentAmmo >= this._currentWeapon.ammo.clipSize) {
      return false; // Already full
    }

    if (this._state.reserveAmmo <= 0) {
      return false; // No reserve
    }

    this._state.isReloading = true;

    this.emit('weapon:reload:start', {
      weapon: this._currentWeapon,
      duration: this._currentWeapon.ammo.reloadTime,
    });

    // Handle shotgun shell-by-shell reload
    if (this._currentWeapon.id === 'shotgun') {
      this._reloadShotgunShell();
    } else {
      this._reloadTimerId = setTimeout(() => {
        this._completeReload();
      }, this._currentWeapon.ammo.reloadTime);
    }

    return true;
  }

  /**
   * Cancel reload in progress
   * @returns {boolean} True if reload was cancelled
   */
  cancelReload() {
    return this._cancelReload();
  }

  /**
   * Update recoil recovery (call each frame)
   * @param {number} deltaTime - Time since last update (seconds)
   */
  updateRecoil(deltaTime) {
    if (!this._recoilEnabled || !this._currentWeapon.recoil) {
      return;
    }

    if (this._state.recoilOffset > 0) {
      this._state.recoilOffset = Math.max(
        0,
        this._state.recoilOffset - this._currentWeapon.recoil.recovery * deltaTime
      );
    }
  }

  /**
   * Get effective accuracy cone including recoil
   * @returns {number}
   */
  getEffectiveConeAngle() {
    return this._currentWeapon.coneAngle + this._state.recoilOffset;
  }

  /**
   * Reset weapon state
   */
  reset() {
    this._cancelReload();
    this._state = this._createInitialState();
  }

  /**
   * Refill all ammo
   */
  refillAmmo() {
    if (!this._infiniteAmmo && this._currentWeapon.ammo) {
      this._state.currentAmmo = this._currentWeapon.ammo.clipSize;
      this._state.reserveAmmo = this._currentWeapon.ammo.reserve;
    }
    this.emit('ammo:refilled');
  }

  /**
   * Add ammo to reserve
   * @param {number} amount
   */
  addAmmo(amount) {
    if (!this._infiniteAmmo && this._currentWeapon.ammo) {
      this._state.reserveAmmo = Math.min(
        this._state.reserveAmmo + amount,
        this._currentWeapon.ammo.reserve
      );
      this.emit('ammo:added', { amount, total: this._state.reserveAmmo });
    }
  }

  /**
   * Get all available weapons
   * @returns {WeaponConfig[]}
   */
  static getAvailableWeapons() {
    return Object.values(Weapons);
  }

  /**
   * Get weapon by ID
   * @param {string} id
   * @returns {WeaponConfig|null}
   */
  static getWeaponById(id) {
    return Weapons[id.toUpperCase()] || Object.values(Weapons).find((w) => w.id === id) || null;
  }

  /**
   * Create initial weapon state
   * @returns {WeaponState}
   * @private
   */
  _createInitialState() {
    return {
      weaponId: this._currentWeapon.id,
      currentAmmo: this._currentWeapon.ammo?.clipSize ?? Infinity,
      reserveAmmo: this._currentWeapon.ammo?.reserve ?? 0,
      isReloading: false,
      lastShotTime: 0,
      recoilOffset: 0,
    };
  }

  /**
   * Get weapon config from ID or config object
   * @param {string|WeaponConfig} weapon
   * @returns {WeaponConfig|null}
   * @private
   */
  _getWeaponConfig(weapon) {
    if (typeof weapon === 'string') {
      return WeaponSystem.getWeaponById(weapon);
    }
    return weapon;
  }

  /**
   * Generate pellet directions for current weapon
   * @returns {Array<{angle: number, offsetX: number, offsetY: number}>}
   * @private
   */
  _generatePellets() {
    const pellets = [];
    const { pelletCount, spread } = this._currentWeapon;

    for (let i = 0; i < pelletCount; i++) {
      if (pelletCount === 1 && spread === 0) {
        // Single accurate shot
        pellets.push({ angle: 0, offsetX: 0, offsetY: 0 });
      } else {
        // Spread pattern
        const randomAngle = (Math.random() - 0.5) * 2 * spread;
        const randomRadius = Math.random() * spread;
        pellets.push({
          angle: randomAngle,
          offsetX: Math.cos(randomAngle) * randomRadius,
          offsetY: Math.sin(randomAngle) * randomRadius,
        });
      }
    }

    return pellets;
  }

  /**
   * Apply recoil to current state
   * @private
   */
  _applyRecoil() {
    const recoil = this._currentWeapon.recoil;
    const verticalRecoil = recoil.vertical;
    const horizontalVariance = (Math.random() - 0.5) * 2 * recoil.horizontal;

    this._state.recoilOffset += verticalRecoil + Math.abs(horizontalVariance);
  }

  /**
   * Complete the reload process
   * @private
   */
  _completeReload() {
    const ammoNeeded = this._currentWeapon.ammo.clipSize - this._state.currentAmmo;
    const ammoToLoad = Math.min(ammoNeeded, this._state.reserveAmmo);

    this._state.currentAmmo += ammoToLoad;
    this._state.reserveAmmo -= ammoToLoad;
    this._state.isReloading = false;
    this._reloadTimerId = null;

    this.emit('weapon:reload:complete', {
      weapon: this._currentWeapon,
      currentAmmo: this._state.currentAmmo,
      reserveAmmo: this._state.reserveAmmo,
    });
  }

  /**
   * Reload one shotgun shell
   * @private
   */
  _reloadShotgunShell() {
    const reloadOneShell = () => {
      if (!this._state.isReloading) {
        return; // Reload was cancelled
      }

      if (
        this._state.currentAmmo >= this._currentWeapon.ammo.clipSize ||
        this._state.reserveAmmo <= 0
      ) {
        this._state.isReloading = false;
        this.emit('weapon:reload:complete', {
          weapon: this._currentWeapon,
          currentAmmo: this._state.currentAmmo,
          reserveAmmo: this._state.reserveAmmo,
        });
        return;
      }

      this._state.currentAmmo++;
      this._state.reserveAmmo--;

      this.emit('weapon:reload:shell', {
        currentAmmo: this._state.currentAmmo,
        reserveAmmo: this._state.reserveAmmo,
      });

      // Load next shell
      this._reloadTimerId = setTimeout(reloadOneShell, this._currentWeapon.ammo.reloadTime);
    };

    this._reloadTimerId = setTimeout(reloadOneShell, this._currentWeapon.ammo.reloadTime);
  }

  /**
   * Cancel any reload in progress
   * @returns {boolean}
   * @private
   */
  _cancelReload() {
    if (this._reloadTimerId) {
      clearTimeout(this._reloadTimerId);
      this._reloadTimerId = null;
    }

    if (this._state.isReloading) {
      this._state.isReloading = false;
      this.emit('weapon:reload:cancelled');
      return true;
    }

    return false;
  }
}

// ==========================================================================
// Singleton
// ==========================================================================

let weaponSystemInstance = null;

/**
 * Get the singleton weapon system instance
 * @returns {WeaponSystem}
 */
export function getWeaponSystem() {
  if (!weaponSystemInstance) {
    weaponSystemInstance = new WeaponSystem();
  }
  return weaponSystemInstance;
}

/**
 * Reset the weapon system instance
 */
export function resetWeaponSystem() {
  if (weaponSystemInstance) {
    weaponSystemInstance.reset();
    weaponSystemInstance.removeAllListeners();
    weaponSystemInstance = null;
  }
}

export default WeaponSystem;
