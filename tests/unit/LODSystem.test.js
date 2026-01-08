/**
 * Unit tests for LODSystem
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import {
  LODSystem,
  LODMeshHelper,
  LODQuality,
  DEFAULT_LOD_LEVELS,
  getLODSystem,
  resetLODSystem,
} from '@utils/LODSystem.js';

describe('LODSystem', () => {
  let lod;

  beforeEach(() => {
    resetLODSystem();
    lod = new LODSystem();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('constructor', () => {
    it('should use default levels', () => {
      expect(lod.levels).toHaveLength(4);
      expect(lod.levels[0].quality).toBe('high');
    });

    it('should accept custom levels', () => {
      const customLod = new LODSystem({
        levels: [
          { distance: 10, quality: 'ultra' },
          { distance: 50, quality: 'low' },
        ],
      });
      expect(customLod.levels).toHaveLength(2);
      expect(customLod.levels[0].quality).toBe('ultra');
    });

    it('should sort levels by distance', () => {
      const customLod = new LODSystem({
        levels: [
          { distance: 100, quality: 'low' },
          { distance: 10, quality: 'high' },
          { distance: 50, quality: 'medium' },
        ],
      });
      expect(customLod.levels[0].distance).toBe(10);
      expect(customLod.levels[1].distance).toBe(50);
      expect(customLod.levels[2].distance).toBe(100);
    });

    it('should set default update interval', () => {
      expect(lod.updateInterval).toBe(1);
    });

    it('should set default hysteresis', () => {
      expect(lod.hysteresis).toBe(2);
    });

    it('should accept custom options', () => {
      const customLod = new LODSystem({
        updateInterval: 5,
        hysteresis: 3,
      });
      expect(customLod.updateInterval).toBe(5);
      expect(customLod.hysteresis).toBe(3);
    });
  });

  describe('registerObject', () => {
    it('should register object with position', () => {
      const obj = lod.registerObject('test1', { x: 10, y: 20, z: 30 });

      expect(obj.id).toBe('test1');
      expect(obj.x).toBe(10);
      expect(obj.y).toBe(20);
      expect(obj.z).toBe(30);
    });

    it('should calculate initial LOD level', () => {
      lod.setCameraPosition(0, 0, 0);
      const obj = lod.registerObject('close', { x: 5, y: 0, z: 0 });

      expect(obj.currentLevel).toBe(LODQuality.HIGH);
    });

    it('should emit register event', () => {
      const handler = vi.fn();
      lod.on('object:registered', handler);

      lod.registerObject('test1', { x: 0, y: 0, z: 0 });

      expect(handler).toHaveBeenCalledWith(
        expect.objectContaining({ id: 'test1' })
      );
    });

    it('should accept mesh option', () => {
      const mesh = { name: 'testMesh' };
      const obj = lod.registerObject('test1', { x: 0, y: 0, z: 0 }, { mesh });

      expect(obj.mesh).toBe(mesh);
    });

    it('should accept data option', () => {
      const data = { type: 'enemy' };
      const obj = lod.registerObject('test1', { x: 0, y: 0, z: 0 }, { data });

      expect(obj.data).toEqual({ type: 'enemy' });
    });

    it('should use defaults for missing coordinates', () => {
      const obj = lod.registerObject('test1', {});

      expect(obj.x).toBe(0);
      expect(obj.y).toBe(0);
      expect(obj.z).toBe(0);
    });
  });

  describe('unregisterObject', () => {
    it('should remove registered object', () => {
      lod.registerObject('test1', { x: 0, y: 0, z: 0 });
      expect(lod.getObjectCount()).toBe(1);

      lod.unregisterObject('test1');
      expect(lod.getObjectCount()).toBe(0);
    });

    it('should return true when object removed', () => {
      lod.registerObject('test1', { x: 0, y: 0, z: 0 });
      expect(lod.unregisterObject('test1')).toBe(true);
    });

    it('should return false when object not found', () => {
      expect(lod.unregisterObject('nonexistent')).toBe(false);
    });

    it('should emit unregister event', () => {
      const handler = vi.fn();
      lod.registerObject('test1', { x: 0, y: 0, z: 0 });
      lod.on('object:unregistered', handler);

      lod.unregisterObject('test1');

      expect(handler).toHaveBeenCalledWith({ id: 'test1' });
    });
  });

  describe('updateObjectPosition', () => {
    it('should update object position', () => {
      lod.registerObject('test1', { x: 0, y: 0, z: 0 });
      lod.updateObjectPosition('test1', { x: 10, y: 20, z: 30 });

      const obj = lod.getObject('test1');
      expect(obj.x).toBe(10);
      expect(obj.y).toBe(20);
      expect(obj.z).toBe(30);
    });

    it('should partially update position', () => {
      lod.registerObject('test1', { x: 5, y: 5, z: 5 });
      lod.updateObjectPosition('test1', { x: 10 });

      const obj = lod.getObject('test1');
      expect(obj.x).toBe(10);
      expect(obj.y).toBe(5);
      expect(obj.z).toBe(5);
    });

    it('should handle non-existent object', () => {
      // Should not throw
      lod.updateObjectPosition('nonexistent', { x: 10 });
    });
  });

  describe('setCameraPosition', () => {
    it('should update camera position', () => {
      lod.setCameraPosition(100, 200, 300);

      expect(lod._cameraPosition).toEqual({ x: 100, y: 200, z: 300 });
    });
  });

  describe('update', () => {
    it('should update LOD levels based on distance', () => {
      lod.setCameraPosition(0, 0, 0);
      lod.registerObject('far', { x: 80, y: 0, z: 0 });

      // Object at 80 units should be 'low' (between 50 and 100)
      const obj = lod.getObject('far');
      expect(obj.currentLevel).toBe(LODQuality.LOW);
    });

    it('should respect update interval', () => {
      lod.updateInterval = 3;
      const handler = vi.fn();
      lod.on('lod:changed', handler);

      lod.registerObject('test1', { x: 0, y: 0, z: 0 });

      // First update (frame 1) - should not trigger
      lod.update();
      // Second update (frame 2) - should not trigger
      lod.update();
      // Third update (frame 3) - should trigger
      lod.setCameraPosition(80, 0, 0);
      lod.update();

      expect(handler).toHaveBeenCalled();
    });

    it('should not update when disabled', () => {
      lod.setEnabled(false);
      const handler = vi.fn();
      lod.on('lod:changed', handler);

      lod.registerObject('test1', { x: 0, y: 0, z: 0 });
      lod.setCameraPosition(80, 0, 0);
      lod.update();

      expect(handler).not.toHaveBeenCalled();
    });

    it('should emit lod:changed event', () => {
      const handler = vi.fn();
      lod.on('lod:changed', handler);

      lod.setCameraPosition(0, 0, 0);
      lod.registerObject('test1', { x: 10, y: 0, z: 0 }); // High

      // Move far away
      lod.setCameraPosition(80, 0, 0);
      lod.update();

      expect(handler).toHaveBeenCalledWith(
        expect.objectContaining({
          id: 'test1',
          oldLevel: LODQuality.HIGH,
          newLevel: expect.any(String),
        })
      );
    });
  });

  describe('forceUpdate', () => {
    it('should update regardless of interval', () => {
      lod.updateInterval = 100;
      const handler = vi.fn();
      lod.on('lod:changed', handler);

      lod.setCameraPosition(0, 0, 0);
      lod.registerObject('test1', { x: 10, y: 0, z: 0 });

      lod.setCameraPosition(80, 0, 0);
      lod.forceUpdate();

      expect(handler).toHaveBeenCalled();
    });
  });

  describe('LOD level calculation', () => {
    beforeEach(() => {
      lod.setCameraPosition(0, 0, 0);
    });

    it('should return HIGH for close objects', () => {
      lod.registerObject('test', { x: 10, y: 0, z: 0 });
      expect(lod.getObject('test').currentLevel).toBe(LODQuality.HIGH);
    });

    it('should return MEDIUM for medium distance', () => {
      lod.registerObject('test', { x: 35, y: 0, z: 0 });
      expect(lod.getObject('test').currentLevel).toBe(LODQuality.MEDIUM);
    });

    it('should return LOW for far objects', () => {
      lod.registerObject('test', { x: 80, y: 0, z: 0 });
      expect(lod.getObject('test').currentLevel).toBe(LODQuality.LOW);
    });

    it('should return CULLED for very far objects', () => {
      lod.registerObject('test', { x: 150, y: 0, z: 0 });
      expect(lod.getObject('test').currentLevel).toBe(LODQuality.CULLED);
    });

    it('should handle 3D distance calculation', () => {
      // Distance = sqrt(24^2 + 32^2) = 40 (a 3-4-5 triangle scaled by 8)
      lod.registerObject('test', { x: 24, y: 0, z: 32 });
      expect(lod.getObject('test').currentLevel).toBe(LODQuality.MEDIUM);
    });
  });

  describe('hysteresis', () => {
    it('should prevent rapid level switching', () => {
      lod.hysteresis = 5;
      lod.setCameraPosition(0, 0, 0);

      // Register at boundary (just under 20)
      const obj = lod.registerObject('test', { x: 19, y: 0, z: 0 });
      expect(obj.currentLevel).toBe(LODQuality.HIGH);

      // Move to just past boundary
      lod.updateObjectPosition('test', { x: 21 });
      lod.update();

      // Should still be HIGH due to hysteresis
      expect(lod.getObject('test').currentLevel).toBe(LODQuality.HIGH);

      // Move well past boundary
      lod.updateObjectPosition('test', { x: 30 });
      lod.update();

      // Now should be MEDIUM
      expect(lod.getObject('test').currentLevel).toBe(LODQuality.MEDIUM);
    });
  });

  describe('getObjectsByLevel', () => {
    beforeEach(() => {
      lod.setCameraPosition(0, 0, 0);
      lod.registerObject('close1', { x: 5, y: 0, z: 0 });
      lod.registerObject('close2', { x: 10, y: 0, z: 0 });
      lod.registerObject('medium', { x: 35, y: 0, z: 0 });
      lod.registerObject('far', { x: 80, y: 0, z: 0 });
    });

    it('should return objects at specified level', () => {
      const highObjects = lod.getObjectsByLevel(LODQuality.HIGH);
      expect(highObjects).toHaveLength(2);
    });

    it('should return empty array for level with no objects', () => {
      const culled = lod.getObjectsByLevel(LODQuality.CULLED);
      expect(culled).toEqual([]);
    });
  });

  describe('getVisibleObjects', () => {
    beforeEach(() => {
      lod.setCameraPosition(0, 0, 0);
      lod.registerObject('close', { x: 5, y: 0, z: 0 });
      lod.registerObject('far', { x: 80, y: 0, z: 0 });
      lod.registerObject('culled', { x: 150, y: 0, z: 0 });
    });

    it('should return non-culled objects', () => {
      const visible = lod.getVisibleObjects();
      expect(visible).toHaveLength(2);
      expect(visible.map((o) => o.id)).toContain('close');
      expect(visible.map((o) => o.id)).toContain('far');
    });

    it('should not include culled objects', () => {
      const visible = lod.getVisibleObjects();
      expect(visible.map((o) => o.id)).not.toContain('culled');
    });
  });

  describe('getObjectsWithinDistance', () => {
    beforeEach(() => {
      lod.setCameraPosition(0, 0, 0);
      lod.registerObject('at10', { x: 10, y: 0, z: 0 });
      lod.registerObject('at30', { x: 30, y: 0, z: 0 });
      lod.registerObject('at50', { x: 50, y: 0, z: 0 });
    });

    it('should return objects within distance', () => {
      const nearby = lod.getObjectsWithinDistance(25);
      expect(nearby).toHaveLength(1);
      expect(nearby[0].id).toBe('at10');
    });

    it('should include objects at exact distance', () => {
      const nearby = lod.getObjectsWithinDistance(30);
      expect(nearby).toHaveLength(2);
    });
  });

  describe('getLevelCounts', () => {
    it('should return counts by level', () => {
      lod.setCameraPosition(0, 0, 0);
      lod.registerObject('h1', { x: 5, y: 0, z: 0 });
      lod.registerObject('h2', { x: 10, y: 0, z: 0 });
      lod.registerObject('m1', { x: 35, y: 0, z: 0 });

      const counts = lod.getLevelCounts();

      expect(counts[LODQuality.HIGH]).toBe(2);
      expect(counts[LODQuality.MEDIUM]).toBe(1);
      expect(counts[LODQuality.LOW]).toBe(0);
    });
  });

  describe('clear', () => {
    it('should remove all objects', () => {
      lod.registerObject('test1', { x: 0, y: 0, z: 0 });
      lod.registerObject('test2', { x: 0, y: 0, z: 0 });

      lod.clear();

      expect(lod.getObjectCount()).toBe(0);
    });

    it('should emit cleared event', () => {
      const handler = vi.fn();
      lod.on('cleared', handler);

      lod.clear();

      expect(handler).toHaveBeenCalled();
    });
  });

  describe('setEnabled/isEnabled', () => {
    it('should toggle enabled state', () => {
      expect(lod.isEnabled()).toBe(true);

      lod.setEnabled(false);
      expect(lod.isEnabled()).toBe(false);

      lod.setEnabled(true);
      expect(lod.isEnabled()).toBe(true);
    });
  });

  describe('getLevelConfig', () => {
    it('should return level config', () => {
      const config = lod.getLevelConfig(LODQuality.HIGH);
      expect(config.distance).toBe(20);
    });

    it('should return undefined for unknown quality', () => {
      const config = lod.getLevelConfig('nonexistent');
      expect(config).toBeUndefined();
    });
  });

  describe('setLevels', () => {
    it('should update levels', () => {
      lod.setLevels([
        { distance: 5, quality: 'ultra' },
        { distance: 10, quality: 'high' },
      ]);

      expect(lod.levels).toHaveLength(2);
      expect(lod.levels[0].quality).toBe('ultra');
    });

    it('should force update after level change', () => {
      lod.setCameraPosition(0, 0, 0);
      lod.registerObject('test', { x: 8, y: 0, z: 0 });

      // Currently HIGH (distance < 20)
      expect(lod.getObject('test').currentLevel).toBe(LODQuality.HIGH);

      // Change levels so 8 is now 'low'
      lod.setLevels([
        { distance: 5, quality: 'high' },
        { distance: 10, quality: 'low' },
      ]);

      expect(lod.getObject('test').currentLevel).toBe('low');
    });
  });
});

describe('LODMeshHelper', () => {
  let helper;
  let mockScene;

  beforeEach(() => {
    mockScene = {
      add: vi.fn(),
      remove: vi.fn(),
    };
    helper = new LODMeshHelper({ scene: mockScene });
  });

  describe('constructor', () => {
    it('should store scene', () => {
      expect(helper.scene).toBe(mockScene);
    });
  });

  describe('registerMeshes', () => {
    it('should register meshes for object', () => {
      const meshes = {
        high: { name: 'highDetail' },
        medium: { name: 'mediumDetail' },
        low: { name: 'lowDetail' },
      };

      helper.registerMeshes('obj1', meshes);

      expect(helper.getMesh('obj1', 'high').name).toBe('highDetail');
    });
  });

  describe('onLODChanged', () => {
    it('should remove old mesh and add new mesh', () => {
      const highMesh = { name: 'high', visible: true };
      const mediumMesh = { name: 'medium', visible: false };

      helper.registerMeshes('obj1', {
        high: highMesh,
        medium: mediumMesh,
      });

      helper.onLODChanged({
        id: 'obj1',
        oldLevel: 'high',
        newLevel: 'medium',
      });

      expect(mockScene.remove).toHaveBeenCalledWith(highMesh);
      expect(mockScene.add).toHaveBeenCalledWith(mediumMesh);
      expect(highMesh.visible).toBe(false);
      expect(mediumMesh.visible).toBe(true);
    });

    it('should not add mesh when culled', () => {
      const highMesh = { name: 'high', visible: true };

      helper.registerMeshes('obj1', {
        high: highMesh,
      });

      helper.onLODChanged({
        id: 'obj1',
        oldLevel: 'high',
        newLevel: LODQuality.CULLED,
      });

      expect(mockScene.remove).toHaveBeenCalledWith(highMesh);
      expect(mockScene.add).not.toHaveBeenCalled();
    });

    it('should handle unregistered objects', () => {
      // Should not throw
      helper.onLODChanged({
        id: 'unknown',
        oldLevel: 'high',
        newLevel: 'low',
      });
    });
  });

  describe('getMesh', () => {
    it('should return mesh for level', () => {
      const mesh = { name: 'test' };
      helper.registerMeshes('obj1', { high: mesh });

      expect(helper.getMesh('obj1', 'high')).toBe(mesh);
    });

    it('should return undefined for unknown object', () => {
      expect(helper.getMesh('unknown', 'high')).toBeUndefined();
    });
  });

  describe('clear', () => {
    it('should clear all meshes', () => {
      helper.registerMeshes('obj1', { high: {} });
      helper.clear();

      expect(helper.getMesh('obj1', 'high')).toBeUndefined();
    });
  });
});

describe('LODQuality constants', () => {
  it('should define all quality levels', () => {
    expect(LODQuality.HIGH).toBe('high');
    expect(LODQuality.MEDIUM).toBe('medium');
    expect(LODQuality.LOW).toBe('low');
    expect(LODQuality.CULLED).toBe('culled');
  });
});

describe('DEFAULT_LOD_LEVELS', () => {
  it('should have expected defaults', () => {
    expect(DEFAULT_LOD_LEVELS).toHaveLength(4);
    expect(DEFAULT_LOD_LEVELS[0]).toEqual({ distance: 20, quality: 'high' });
    expect(DEFAULT_LOD_LEVELS[3]).toEqual({ distance: Infinity, quality: 'culled' });
  });
});

describe('Singleton', () => {
  beforeEach(() => {
    resetLODSystem();
  });

  describe('getLODSystem', () => {
    it('should return singleton instance', () => {
      const instance1 = getLODSystem();
      const instance2 = getLODSystem();

      expect(instance1).toBe(instance2);
    });
  });

  describe('resetLODSystem', () => {
    it('should clear and reset singleton', () => {
      const instance1 = getLODSystem();
      instance1.registerObject('test', { x: 0, y: 0, z: 0 });

      resetLODSystem();

      const instance2 = getLODSystem();
      expect(instance2).not.toBe(instance1);
      expect(instance2.getObjectCount()).toBe(0);
    });
  });
});
