/**
 * Unit tests for ObjectPool
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  ObjectPool,
  PooledParticle,
  PooledVector3,
  createParticlePool,
  createVector3Pool,
} from '@/utils/ObjectPool.js';

describe('ObjectPool', () => {
  let pool;
  let factory;
  let resetFn;

  beforeEach(() => {
    factory = vi.fn(() => ({ id: Math.random() }));
    resetFn = vi.fn((obj) => {
      obj.reset = true;
    });
    pool = new ObjectPool({
      factory,
      reset: resetFn,
      initialSize: 5,
      maxSize: 10,
    });
  });

  describe('constructor', () => {
    it('should throw without factory', () => {
      expect(() => new ObjectPool({})).toThrow('factory function');
    });

    it('should pre-populate pool', () => {
      expect(factory).toHaveBeenCalledTimes(5);
      expect(pool.available).toBe(5);
    });

    it('should respect initial size', () => {
      const p = new ObjectPool({
        factory: () => ({}),
        initialSize: 3,
      });
      expect(p.available).toBe(3);
    });
  });

  describe('acquire', () => {
    it('should return an object from pool', () => {
      const obj = pool.acquire();
      expect(obj).toBeDefined();
      expect(obj.id).toBeDefined();
    });

    it('should decrease available count', () => {
      pool.acquire();
      expect(pool.available).toBe(4);
    });

    it('should increase active count', () => {
      pool.acquire();
      expect(pool.activeCount).toBe(1);
    });

    it('should create new object when pool is empty', () => {
      // Acquire all pre-populated objects
      for (let i = 0; i < 5; i++) {
        pool.acquire();
      }
      const factoryCallsBefore = factory.mock.calls.length;

      pool.acquire();
      expect(factory.mock.calls.length).toBe(factoryCallsBefore + 1);
    });

    it('should return null when at max size and autoGrow is false', () => {
      const noGrowPool = new ObjectPool({
        factory: () => ({}),
        initialSize: 2,
        maxSize: 2,
        autoGrow: false,
      });

      noGrowPool.acquire();
      noGrowPool.acquire();
      const result = noGrowPool.acquire();
      expect(result).toBeNull();
    });
  });

  describe('release', () => {
    it('should return object to pool', () => {
      const obj = pool.acquire();
      pool.release(obj);
      expect(pool.available).toBe(5);
    });

    it('should decrease active count', () => {
      const obj = pool.acquire();
      pool.release(obj);
      expect(pool.activeCount).toBe(0);
    });

    it('should call reset function', () => {
      const obj = pool.acquire();
      pool.release(obj);
      expect(resetFn).toHaveBeenCalledWith(obj);
    });

    it('should return false for non-active object', () => {
      const result = pool.release({ random: 'object' });
      expect(result).toBe(false);
    });

    it('should return true for active object', () => {
      const obj = pool.acquire();
      const result = pool.release(obj);
      expect(result).toBe(true);
    });
  });

  describe('releaseAll', () => {
    it('should return all active objects to pool', () => {
      pool.acquire();
      pool.acquire();
      pool.acquire();
      expect(pool.activeCount).toBe(3);

      pool.releaseAll();
      expect(pool.activeCount).toBe(0);
      expect(pool.available).toBe(5);
    });
  });

  describe('clear', () => {
    it('should empty the pool', () => {
      pool.acquire();
      pool.clear();
      expect(pool.available).toBe(0);
      expect(pool.activeCount).toBe(0);
    });

    it('should call dispose on all objects', () => {
      const dispose = vi.fn();
      const disposablePool = new ObjectPool({
        factory: () => ({}),
        dispose,
        initialSize: 3,
      });

      disposablePool.acquire();
      disposablePool.clear();
      expect(dispose).toHaveBeenCalledTimes(3);
    });
  });

  describe('stats', () => {
    it('should return correct statistics', () => {
      pool.acquire();
      pool.acquire();

      const stats = pool.stats;
      expect(stats.available).toBe(3);
      expect(stats.active).toBe(2);
      expect(stats.total).toBe(5);
      expect(stats.maxSize).toBe(10);
    });
  });

  describe('prewarm', () => {
    it('should increase pool size', () => {
      pool = new ObjectPool({
        factory: () => ({}),
        initialSize: 2,
        maxSize: 20,
      });

      pool.prewarm(10);
      expect(pool.available).toBe(10);
    });

    it('should respect maxSize', () => {
      pool = new ObjectPool({
        factory: () => ({}),
        initialSize: 2,
        maxSize: 5,
      });

      pool.prewarm(100);
      expect(pool.available).toBe(5);
    });
  });
});

describe('PooledParticle', () => {
  let particle;

  beforeEach(() => {
    particle = new PooledParticle();
  });

  describe('constructor', () => {
    it('should initialize with default values', () => {
      expect(particle.x).toBe(0);
      expect(particle.y).toBe(0);
      expect(particle.z).toBe(0);
      expect(particle.life).toBe(0);
      expect(particle.active).toBe(false);
    });
  });

  describe('init', () => {
    it('should set all properties', () => {
      particle.init(1, 2, 3, 4, 5, 6, 1.5, 0xff0000);
      expect(particle.x).toBe(1);
      expect(particle.y).toBe(2);
      expect(particle.z).toBe(3);
      expect(particle.vx).toBe(4);
      expect(particle.vy).toBe(5);
      expect(particle.vz).toBe(6);
      expect(particle.life).toBe(1.5);
      expect(particle.color).toBe(0xff0000);
      expect(particle.active).toBe(true);
    });
  });

  describe('reset', () => {
    it('should reset all properties', () => {
      particle.init(1, 2, 3, 4, 5, 6, 1.5, 0xff0000);
      particle.reset();
      expect(particle.x).toBe(0);
      expect(particle.active).toBe(false);
    });
  });

  describe('update', () => {
    it('should update position based on velocity', () => {
      particle.init(0, 0, 0, 10, 0, 5, 1, 0xffffff);
      particle.update(0.1);
      expect(particle.x).toBe(1);
      expect(particle.z).toBe(0.5);
    });

    it('should apply gravity to y velocity', () => {
      particle.init(0, 10, 0, 0, 0, 0, 1, 0xffffff);
      particle.update(1, -10);
      expect(particle.vy).toBe(-10);
    });

    it('should decrease life', () => {
      particle.init(0, 0, 0, 0, 0, 0, 1, 0xffffff);
      particle.update(0.3);
      expect(particle.life).toBeCloseTo(0.7);
    });

    it('should deactivate when life reaches 0', () => {
      particle.init(0, 0, 0, 0, 0, 0, 0.1, 0xffffff);
      particle.update(0.2);
      expect(particle.active).toBe(false);
    });

    it('should not update when inactive', () => {
      particle.x = 5;
      particle.active = false;
      particle.update(1);
      expect(particle.x).toBe(5);
    });
  });

  describe('alpha', () => {
    it('should return life ratio', () => {
      particle.init(0, 0, 0, 0, 0, 0, 1, 0xffffff);
      particle.life = 0.5;
      expect(particle.alpha).toBe(0.5);
    });

    it('should not go below 0', () => {
      particle.init(0, 0, 0, 0, 0, 0, 1, 0xffffff);
      particle.life = -1;
      expect(particle.alpha).toBe(0);
    });
  });
});

describe('PooledVector3', () => {
  let vec;

  beforeEach(() => {
    vec = new PooledVector3();
  });

  describe('constructor', () => {
    it('should initialize with default values', () => {
      expect(vec.x).toBe(0);
      expect(vec.y).toBe(0);
      expect(vec.z).toBe(0);
    });

    it('should accept initial values', () => {
      const v = new PooledVector3(1, 2, 3);
      expect(v.x).toBe(1);
      expect(v.y).toBe(2);
      expect(v.z).toBe(3);
    });
  });

  describe('set', () => {
    it('should set all components', () => {
      vec.set(5, 6, 7);
      expect(vec.x).toBe(5);
      expect(vec.y).toBe(6);
      expect(vec.z).toBe(7);
    });

    it('should return this for chaining', () => {
      expect(vec.set(1, 2, 3)).toBe(vec);
    });
  });

  describe('copy', () => {
    it('should copy values from another vector', () => {
      const other = new PooledVector3(3, 4, 5);
      vec.copy(other);
      expect(vec.x).toBe(3);
      expect(vec.y).toBe(4);
      expect(vec.z).toBe(5);
    });
  });

  describe('add', () => {
    it('should add another vector', () => {
      vec.set(1, 2, 3);
      vec.add(new PooledVector3(4, 5, 6));
      expect(vec.x).toBe(5);
      expect(vec.y).toBe(7);
      expect(vec.z).toBe(9);
    });
  });

  describe('sub', () => {
    it('should subtract another vector', () => {
      vec.set(5, 7, 9);
      vec.sub(new PooledVector3(1, 2, 3));
      expect(vec.x).toBe(4);
      expect(vec.y).toBe(5);
      expect(vec.z).toBe(6);
    });
  });

  describe('multiplyScalar', () => {
    it('should multiply by scalar', () => {
      vec.set(2, 3, 4);
      vec.multiplyScalar(2);
      expect(vec.x).toBe(4);
      expect(vec.y).toBe(6);
      expect(vec.z).toBe(8);
    });
  });

  describe('length', () => {
    it('should calculate length', () => {
      vec.set(3, 4, 0);
      expect(vec.length()).toBe(5);
    });
  });

  describe('normalize', () => {
    it('should normalize vector', () => {
      vec.set(0, 0, 5);
      vec.normalize();
      expect(vec.z).toBe(1);
      expect(vec.length()).toBeCloseTo(1);
    });

    it('should handle zero vector', () => {
      vec.set(0, 0, 0);
      vec.normalize();
      expect(vec.length()).toBe(0);
    });
  });

  describe('distanceTo', () => {
    it('should calculate distance to another vector', () => {
      vec.set(0, 0, 0);
      const other = new PooledVector3(3, 4, 0);
      expect(vec.distanceTo(other)).toBe(5);
    });
  });

  describe('reset', () => {
    it('should reset to zero', () => {
      vec.set(5, 6, 7);
      vec.reset();
      expect(vec.x).toBe(0);
      expect(vec.y).toBe(0);
      expect(vec.z).toBe(0);
    });
  });
});

describe('createParticlePool', () => {
  it('should create a pool of particles', () => {
    const pool = createParticlePool(50);
    expect(pool.available).toBe(50);

    const particle = pool.acquire();
    expect(particle).toBeInstanceOf(PooledParticle);
  });
});

describe('createVector3Pool', () => {
  it('should create a pool of vectors', () => {
    const pool = createVector3Pool(20);
    expect(pool.available).toBe(20);

    const vec = pool.acquire();
    expect(vec).toBeInstanceOf(PooledVector3);
  });
});
