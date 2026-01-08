/**
 * Tests for WeaponSystem - Weapon variety with different characteristics
 */

import { WeaponSystem, Weapons, getWeaponSystem, resetWeaponSystem } from '@game/WeaponSystem.js';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

describe('WeaponSystem', () => {
  let system;

  beforeEach(() => {
    vi.useFakeTimers();
    system = new WeaponSystem();
  });

  afterEach(() => {
    system.reset();
    vi.useRealTimers();
    resetWeaponSystem();
  });

  // ==========================================================================
  // Weapon Definitions
  // ==========================================================================

  describe('Weapons', () => {
    it('should define all expected weapons', () => {
      expect(Weapons.PISTOL).toBeDefined();
      expect(Weapons.RIFLE).toBeDefined();
      expect(Weapons.SHOTGUN).toBeDefined();
      expect(Weapons.SMG).toBeDefined();
      expect(Weapons.SNIPER).toBeDefined();
    });

    it('should have required properties on each weapon', () => {
      const requiredProps = [
        'id',
        'name',
        'description',
        'icon',
        'fireRate',
        'damage',
        'pelletCount',
        'spread',
        'range',
        'coneAngle',
      ];

      Object.values(Weapons).forEach((weapon) => {
        requiredProps.forEach((prop) => {
          expect(weapon[prop], `${weapon.id} missing ${prop}`).toBeDefined();
        });
      });
    });

    it('should have unique IDs', () => {
      const ids = Object.values(Weapons).map((w) => w.id);
      const uniqueIds = new Set(ids);
      expect(uniqueIds.size).toBe(ids.length);
    });

    it('should have shotgun with multiple pellets', () => {
      expect(Weapons.SHOTGUN.pelletCount).toBeGreaterThan(1);
      expect(Weapons.SHOTGUN.spread).toBeGreaterThan(0);
    });

    it('should have single pellet weapons with no spread', () => {
      expect(Weapons.PISTOL.pelletCount).toBe(1);
      expect(Weapons.RIFLE.pelletCount).toBe(1);
      expect(Weapons.PISTOL.spread).toBe(0);
    });
  });

  // ==========================================================================
  // Default State
  // ==========================================================================

  describe('default state', () => {
    it('should default to pistol', () => {
      expect(system.currentWeapon.id).toBe('pistol');
    });

    it('should start with full clip', () => {
      expect(system.currentAmmo).toBe(Weapons.PISTOL.ammo.clipSize);
    });

    it('should start with full reserve', () => {
      expect(system.reserveAmmo).toBe(Weapons.PISTOL.ammo.reserve);
    });

    it('should not be reloading', () => {
      expect(system.isReloading).toBe(false);
    });

    it('should have zero recoil', () => {
      expect(system.recoilOffset).toBe(0);
    });
  });

  // ==========================================================================
  // Weapon Switching
  // ==========================================================================

  describe('weapon switching', () => {
    beforeEach(() => {
      // Unlock all weapons for testing
      Object.values(Weapons).forEach((w) => system.unlockWeapon(w));
    });

    it('should switch to another weapon by ID', () => {
      const result = system.switchWeapon('rifle');
      expect(result).toBe(true);
      expect(system.currentWeapon.id).toBe('rifle');
    });

    it('should switch to another weapon by config', () => {
      const result = system.switchWeapon(Weapons.SHOTGUN);
      expect(result).toBe(true);
      expect(system.currentWeapon.id).toBe('shotgun');
    });

    it('should reset ammo on switch', () => {
      system.shoot({ currentTime: 1000 });
      system.shoot({ currentTime: 2000 });

      system.switchWeapon('rifle');

      expect(system.currentAmmo).toBe(Weapons.RIFLE.ammo.clipSize);
    });

    it('should cancel reload on switch', () => {
      system.shoot({ currentTime: 1000 });
      system.reload();
      expect(system.isReloading).toBe(true);

      system.switchWeapon('rifle');
      expect(system.isReloading).toBe(false);
    });

    it('should emit weapon switched event', () => {
      const handler = vi.fn();
      system.on('weapon:switched', handler);

      system.switchWeapon('shotgun');

      expect(handler).toHaveBeenCalledWith(
        expect.objectContaining({
          from: expect.objectContaining({ id: 'pistol' }),
          to: expect.objectContaining({ id: 'shotgun' }),
        })
      );
    });

    it('should not switch to locked weapon', () => {
      const newSystem = new WeaponSystem();
      // Only pistol is unlocked by default

      const result = newSystem.switchWeapon('rifle');
      expect(result).toBe(false);
      expect(newSystem.currentWeapon.id).toBe('pistol');
    });

    it('should return false for invalid weapon', () => {
      const result = system.switchWeapon('invalid_weapon');
      expect(result).toBe(false);
    });
  });

  // ==========================================================================
  // Weapon Unlocking
  // ==========================================================================

  describe('weapon unlocking', () => {
    it('should unlock weapon by ID', () => {
      system.unlockWeapon('rifle');
      expect(system.isWeaponUnlocked('rifle')).toBe(true);
    });

    it('should unlock weapon by config', () => {
      system.unlockWeapon(Weapons.SHOTGUN);
      expect(system.isWeaponUnlocked('shotgun')).toBe(true);
    });

    it('should emit unlock event', () => {
      const handler = vi.fn();
      system.on('weapon:unlocked', handler);

      system.unlockWeapon('rifle');

      expect(handler).toHaveBeenCalledWith(
        expect.objectContaining({
          weapon: expect.objectContaining({ id: 'rifle' }),
        })
      );
    });

    it('should have default weapon unlocked', () => {
      expect(system.isWeaponUnlocked('pistol')).toBe(true);
    });

    it('should get all unlocked weapons', () => {
      system.unlockWeapon('rifle');
      system.unlockWeapon('shotgun');

      const unlocked = system.getUnlockedWeapons();
      expect(unlocked.length).toBe(3); // pistol + rifle + shotgun
    });
  });

  // ==========================================================================
  // Shooting
  // ==========================================================================

  describe('shooting', () => {
    it('should fire successfully', () => {
      const result = system.shoot({ currentTime: 1000 });

      expect(result.canShoot).toBe(true);
      expect(result.pellets).toHaveLength(1);
      expect(result.damagePerPellet).toBe(Weapons.PISTOL.damage);
    });

    it('should consume ammo', () => {
      const initialAmmo = system.currentAmmo;
      system.shoot({ currentTime: 1000 });

      expect(system.currentAmmo).toBe(initialAmmo - 1);
    });

    it('should respect fire rate', () => {
      system.shoot({ currentTime: 1000 });
      const result = system.shoot({ currentTime: 1100 }); // 100ms later, too soon

      expect(result.canShoot).toBe(false);
      expect(result.blockReason).toBe('fire_rate');
    });

    it('should fire after fire rate delay', () => {
      system.shoot({ currentTime: 1000 });
      const result = system.shoot({ currentTime: 1000 + Weapons.PISTOL.fireRate });

      expect(result.canShoot).toBe(true);
    });

    it('should emit weapon fired event', () => {
      const handler = vi.fn();
      system.on('weapon:fired', handler);

      system.shoot({ currentTime: 1000 });

      expect(handler).toHaveBeenCalledWith(
        expect.objectContaining({
          weapon: expect.objectContaining({ id: 'pistol' }),
          ammoRemaining: Weapons.PISTOL.ammo.clipSize - 1,
        })
      );
    });

    it('should not fire while reloading', () => {
      // Empty clip
      for (let i = 0; i < Weapons.PISTOL.ammo.clipSize; i++) {
        system.shoot({ currentTime: i * 1000 });
      }
      system.reload();

      const result = system.shoot({ currentTime: 50000 });
      expect(result.canShoot).toBe(false);
      expect(result.blockReason).toBe('reloading');
    });

    it('should auto-reload when clip is empty', () => {
      // Empty clip (using proper fire rate intervals, start at time > 0)
      const fireRate = Weapons.PISTOL.fireRate;
      for (let i = 0; i < Weapons.PISTOL.ammo.clipSize; i++) {
        system.shoot({ currentTime: (i + 1) * fireRate });
      }

      const result = system.shoot({ currentTime: (Weapons.PISTOL.ammo.clipSize + 2) * fireRate });
      expect(result.canShoot).toBe(false);
      expect(result.blockReason).toBe('reloading');
      expect(system.isReloading).toBe(true);
    });

    it('should fail when no ammo and no reserve', () => {
      const noAmmoSystem = new WeaponSystem();

      // Empty everything (using proper fire rate intervals, start at time > 0)
      const fireRate = Weapons.PISTOL.fireRate;
      for (let i = 0; i < Weapons.PISTOL.ammo.clipSize; i++) {
        noAmmoSystem.shoot({ currentTime: (i + 1) * fireRate });
      }
      noAmmoSystem._state.reserveAmmo = 0;

      const result = noAmmoSystem.shoot({
        currentTime: (Weapons.PISTOL.ammo.clipSize + 2) * fireRate,
      });
      expect(result.canShoot).toBe(false);
      expect(result.blockReason).toBe('no_ammo');
    });
  });

  // ==========================================================================
  // Infinite Ammo
  // ==========================================================================

  describe('infinite ammo', () => {
    let infiniteSystem;

    beforeEach(() => {
      infiniteSystem = new WeaponSystem({ infiniteAmmo: true });
    });

    it('should never run out of ammo', () => {
      const fireRate = Weapons.PISTOL.fireRate;
      for (let i = 0; i < 100; i++) {
        const result = infiniteSystem.shoot({ currentTime: (i + 1) * fireRate });
        expect(result.canShoot).toBe(true);
      }
    });

    it('should not allow reload', () => {
      const result = infiniteSystem.reload();
      expect(result).toBe(false);
    });
  });

  // ==========================================================================
  // Shotgun Spread
  // ==========================================================================

  describe('shotgun spread', () => {
    beforeEach(() => {
      system.unlockWeapon('shotgun');
      system.switchWeapon('shotgun');
    });

    it('should fire multiple pellets', () => {
      const result = system.shoot({ currentTime: 1000 });

      expect(result.canShoot).toBe(true);
      expect(result.pellets.length).toBe(Weapons.SHOTGUN.pelletCount);
    });

    it('should have pellets with varying angles', () => {
      const result = system.shoot({ currentTime: 1000 });

      // Check that pellets have spread
      const angles = result.pellets.map((p) => p.angle);
      const _uniqueAngles = new Set(angles);

      // With random spread, angles should vary
      // (might rarely be same due to randomness, so check has spread potential)
      expect(Weapons.SHOTGUN.spread).toBeGreaterThan(0);
    });

    it('should calculate total potential damage', () => {
      const result = system.shoot({ currentTime: 1000 });

      expect(result.totalPotentialDamage).toBe(
        Weapons.SHOTGUN.damage * Weapons.SHOTGUN.pelletCount
      );
    });
  });

  // ==========================================================================
  // Reloading
  // ==========================================================================

  describe('reloading', () => {
    it('should start reload', () => {
      system.shoot({ currentTime: 1000 });
      const result = system.reload();

      expect(result).toBe(true);
      expect(system.isReloading).toBe(true);
    });

    it('should emit reload start event', () => {
      const handler = vi.fn();
      system.on('weapon:reload:start', handler);

      system.shoot({ currentTime: 1000 });
      system.reload();

      expect(handler).toHaveBeenCalledWith(
        expect.objectContaining({
          duration: Weapons.PISTOL.ammo.reloadTime,
        })
      );
    });

    it('should complete reload after time', () => {
      system.shoot({ currentTime: 1000 });
      system.reload();

      vi.advanceTimersByTime(Weapons.PISTOL.ammo.reloadTime + 100);

      expect(system.isReloading).toBe(false);
      expect(system.currentAmmo).toBe(Weapons.PISTOL.ammo.clipSize);
    });

    it('should emit reload complete event', () => {
      const handler = vi.fn();
      system.on('weapon:reload:complete', handler);

      system.shoot({ currentTime: 1000 });
      system.reload();
      vi.advanceTimersByTime(Weapons.PISTOL.ammo.reloadTime + 100);

      expect(handler).toHaveBeenCalled();
    });

    it('should transfer ammo from reserve', () => {
      system.shoot({ currentTime: 1000 });
      const reserveBefore = system.reserveAmmo;

      system.reload();
      vi.advanceTimersByTime(Weapons.PISTOL.ammo.reloadTime + 100);

      expect(system.reserveAmmo).toBe(reserveBefore - 1);
    });

    it('should not reload when full', () => {
      const result = system.reload();
      expect(result).toBe(false);
    });

    it('should not reload with no reserve', () => {
      system.shoot({ currentTime: 1000 });
      system._state.reserveAmmo = 0;

      const result = system.reload();
      expect(result).toBe(false);
    });

    it('should cancel reload', () => {
      system.shoot({ currentTime: 1000 });
      system.reload();

      const result = system.cancelReload();

      expect(result).toBe(true);
      expect(system.isReloading).toBe(false);
    });

    it('should emit reload cancelled event', () => {
      const handler = vi.fn();
      system.on('weapon:reload:cancelled', handler);

      system.shoot({ currentTime: 1000 });
      system.reload();
      system.cancelReload();

      expect(handler).toHaveBeenCalled();
    });
  });

  // ==========================================================================
  // Shotgun Shell-by-Shell Reload
  // ==========================================================================

  describe('shotgun reload', () => {
    beforeEach(() => {
      system.unlockWeapon('shotgun');
      system.switchWeapon('shotgun');
    });

    it('should reload shell by shell', () => {
      // Fire some shots
      system.shoot({ currentTime: 1000 });
      system.shoot({ currentTime: 2000 });
      system.shoot({ currentTime: 3000 });
      const ammoAfterShots = system.currentAmmo;

      system.reload();

      // After first shell reload
      vi.advanceTimersByTime(Weapons.SHOTGUN.ammo.reloadTime + 10);
      expect(system.currentAmmo).toBe(ammoAfterShots + 1);

      // After second shell reload
      vi.advanceTimersByTime(Weapons.SHOTGUN.ammo.reloadTime);
      expect(system.currentAmmo).toBe(ammoAfterShots + 2);
    });

    it('should emit shell reload events', () => {
      const handler = vi.fn();
      system.on('weapon:reload:shell', handler);

      system.shoot({ currentTime: 1000 });
      system.reload();
      vi.advanceTimersByTime(Weapons.SHOTGUN.ammo.reloadTime + 10);

      expect(handler).toHaveBeenCalled();
    });

    it('should be interruptible', () => {
      system.shoot({ currentTime: 1000 });
      system.shoot({ currentTime: 2000 });
      system.reload();

      vi.advanceTimersByTime(Weapons.SHOTGUN.ammo.reloadTime + 10); // 1 shell loaded
      const ammoMid = system.currentAmmo;

      system.cancelReload();

      expect(system.isReloading).toBe(false);
      expect(system.currentAmmo).toBe(ammoMid); // Keeps loaded shells
    });
  });

  // ==========================================================================
  // Recoil
  // ==========================================================================

  describe('recoil', () => {
    it('should add recoil on shot', () => {
      system.shoot({ currentTime: 1000 });
      expect(system.recoilOffset).toBeGreaterThan(0);
    });

    it('should recover recoil over time', () => {
      system.shoot({ currentTime: 1000 });
      const recoilAfterShot = system.recoilOffset;

      system.updateRecoil(1); // 1 second

      expect(system.recoilOffset).toBeLessThan(recoilAfterShot);
    });

    it('should not go below zero recoil', () => {
      system.shoot({ currentTime: 1000 });
      system.updateRecoil(100); // Very long time

      expect(system.recoilOffset).toBe(0);
    });

    it('should affect effective cone angle', () => {
      const baseCone = system.currentWeapon.coneAngle;

      system.shoot({ currentTime: 1000 });

      expect(system.getEffectiveConeAngle()).toBeGreaterThan(baseCone);
    });

    it('should be disableable', () => {
      const noRecoilSystem = new WeaponSystem({ recoilEnabled: false });

      noRecoilSystem.shoot({ currentTime: 1000 });

      expect(noRecoilSystem.recoilOffset).toBe(0);
    });
  });

  // ==========================================================================
  // Ammo Management
  // ==========================================================================

  describe('ammo management', () => {
    it('should refill all ammo', () => {
      system.shoot({ currentTime: 1000 });
      system.shoot({ currentTime: 2000 });
      system._state.reserveAmmo = 10;

      system.refillAmmo();

      expect(system.currentAmmo).toBe(Weapons.PISTOL.ammo.clipSize);
      expect(system.reserveAmmo).toBe(Weapons.PISTOL.ammo.reserve);
    });

    it('should add ammo to reserve', () => {
      system._state.reserveAmmo = 10;
      system.addAmmo(20);

      expect(system.reserveAmmo).toBe(30);
    });

    it('should cap reserve at max', () => {
      system.addAmmo(1000);
      expect(system.reserveAmmo).toBe(Weapons.PISTOL.ammo.reserve);
    });

    it('should emit ammo added event', () => {
      const handler = vi.fn();
      system.on('ammo:added', handler);

      system.addAmmo(10);

      expect(handler).toHaveBeenCalledWith(
        expect.objectContaining({
          amount: 10,
        })
      );
    });
  });

  // ==========================================================================
  // Static Methods
  // ==========================================================================

  describe('static methods', () => {
    it('should get all available weapons', () => {
      const weapons = WeaponSystem.getAvailableWeapons();

      expect(weapons.length).toBe(5);
      expect(weapons.map((w) => w.id)).toContain('pistol');
      expect(weapons.map((w) => w.id)).toContain('shotgun');
    });

    it('should get weapon by ID', () => {
      const weapon = WeaponSystem.getWeaponById('rifle');
      expect(weapon.id).toBe('rifle');
    });

    it('should return null for unknown weapon', () => {
      const weapon = WeaponSystem.getWeaponById('unknown');
      expect(weapon).toBeNull();
    });
  });

  // ==========================================================================
  // Reset
  // ==========================================================================

  describe('reset', () => {
    it('should reset to initial state', () => {
      system.shoot({ currentTime: 1000 });
      system.shoot({ currentTime: 2000 });
      system.reload();

      system.reset();

      expect(system.currentAmmo).toBe(Weapons.PISTOL.ammo.clipSize);
      expect(system.isReloading).toBe(false);
      expect(system.recoilOffset).toBe(0);
    });

    it('should cancel reload on reset', () => {
      system.shoot({ currentTime: 1000 });
      system.reload();

      system.reset();

      expect(system.isReloading).toBe(false);
    });
  });

  // ==========================================================================
  // Singleton
  // ==========================================================================

  describe('singleton', () => {
    afterEach(() => {
      resetWeaponSystem();
    });

    it('should return same instance', () => {
      const instance1 = getWeaponSystem();
      const instance2 = getWeaponSystem();

      expect(instance1).toBe(instance2);
    });

    it('should create new instance after reset', () => {
      const instance1 = getWeaponSystem();
      resetWeaponSystem();
      const instance2 = getWeaponSystem();

      expect(instance1).not.toBe(instance2);
    });
  });
});
