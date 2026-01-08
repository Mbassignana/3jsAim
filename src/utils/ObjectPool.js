/**
 * ObjectPool - Generic object pooling system to reduce GC pressure
 * Pre-allocates objects and reuses them instead of creating/destroying
 */

/**
 * @template T
 */
export class ObjectPool {
  /**
   * @param {Object} options
   * @param {() => T} options.factory - Function to create new objects
   * @param {(obj: T) => void} [options.reset] - Function to reset object state
   * @param {(obj: T) => void} [options.dispose] - Function to cleanup object
   * @param {number} [options.initialSize=10] - Initial pool size
   * @param {number} [options.maxSize=100] - Maximum pool size
   * @param {boolean} [options.autoGrow=true] - Auto-grow when empty
   */
  constructor({
    factory,
    reset = null,
    dispose = null,
    initialSize = 10,
    maxSize = 100,
    autoGrow = true,
  }) {
    if (typeof factory !== 'function') {
      throw new Error('ObjectPool requires a factory function');
    }

    this._factory = factory;
    this._reset = reset;
    this._dispose = dispose;
    this._maxSize = maxSize;
    this._autoGrow = autoGrow;

    /** @type {T[]} */
    this._pool = [];

    /** @type {Set<T>} */
    this._active = new Set();

    // Pre-populate pool
    this._populate(initialSize);
  }

  /**
   * Populate the pool with objects
   * @param {number} count - Number of objects to create
   */
  _populate(count) {
    for (let i = 0; i < count && this._pool.length < this._maxSize; i++) {
      this._pool.push(this._factory());
    }
  }

  /**
   * Acquire an object from the pool
   * @returns {T|null} Object from pool, or null if pool is empty and can't grow
   */
  acquire() {
    let obj;

    if (this._pool.length > 0) {
      obj = this._pool.pop();
    } else if (this._autoGrow && this._active.size < this._maxSize) {
      obj = this._factory();
    } else {
      return null;
    }

    this._active.add(obj);
    return obj;
  }

  /**
   * Release an object back to the pool
   * @param {T} obj - Object to release
   * @returns {boolean} True if released successfully
   */
  release(obj) {
    if (!this._active.has(obj)) {
      return false;
    }

    this._active.delete(obj);

    // Reset the object if reset function provided
    if (this._reset) {
      this._reset(obj);
    }

    // Only return to pool if under max size
    if (this._pool.length < this._maxSize) {
      this._pool.push(obj);
    } else if (this._dispose) {
      this._dispose(obj);
    }

    return true;
  }

  /**
   * Release all active objects back to pool
   */
  releaseAll() {
    for (const obj of this._active) {
      if (this._reset) {
        this._reset(obj);
      }
      if (this._pool.length < this._maxSize) {
        this._pool.push(obj);
      } else if (this._dispose) {
        this._dispose(obj);
      }
    }
    this._active.clear();
  }

  /**
   * Clear the pool and dispose all objects
   */
  clear() {
    if (this._dispose) {
      for (const obj of this._pool) {
        this._dispose(obj);
      }
      for (const obj of this._active) {
        this._dispose(obj);
      }
    }

    this._pool = [];
    this._active.clear();
  }

  /**
   * Get pool statistics
   * @returns {{available: number, active: number, total: number, maxSize: number}}
   */
  get stats() {
    return {
      available: this._pool.length,
      active: this._active.size,
      total: this._pool.length + this._active.size,
      maxSize: this._maxSize,
    };
  }

  /**
   * Get number of available objects
   * @returns {number}
   */
  get available() {
    return this._pool.length;
  }

  /**
   * Get number of active objects
   * @returns {number}
   */
  get activeCount() {
    return this._active.size;
  }

  /**
   * Pre-warm the pool to a specific size
   * @param {number} targetSize - Target pool size
   */
  prewarm(targetSize) {
    const needed = Math.min(targetSize, this._maxSize) - this._pool.length;
    if (needed > 0) {
      this._populate(needed);
    }
  }
}

/**
 * Particle class for pooling
 */
export class PooledParticle {
  constructor() {
    this.x = 0;
    this.y = 0;
    this.z = 0;
    this.vx = 0;
    this.vy = 0;
    this.vz = 0;
    this.life = 0;
    this.maxLife = 1;
    this.color = 0xffffff;
    this.scale = 1;
    this.active = false;
  }

  reset() {
    this.x = 0;
    this.y = 0;
    this.z = 0;
    this.vx = 0;
    this.vy = 0;
    this.vz = 0;
    this.life = 0;
    this.maxLife = 1;
    this.color = 0xffffff;
    this.scale = 1;
    this.active = false;
  }

  init(x, y, z, vx, vy, vz, life, color) {
    this.x = x;
    this.y = y;
    this.z = z;
    this.vx = vx;
    this.vy = vy;
    this.vz = vz;
    this.life = life;
    this.maxLife = life;
    this.color = color;
    this.active = true;
  }

  update(deltaTime, gravity = -9.8) {
    if (!this.active) {
      return;
    }

    this.x += this.vx * deltaTime;
    this.y += this.vy * deltaTime;
    this.z += this.vz * deltaTime;

    this.vy += gravity * deltaTime;
    this.life -= deltaTime;

    if (this.life <= 0) {
      this.active = false;
    }
  }

  get alpha() {
    return Math.max(0, this.life / this.maxLife);
  }
}

/**
 * Create a particle pool
 * @param {number} [size=200] - Pool size
 * @returns {ObjectPool<PooledParticle>}
 */
export function createParticlePool(size = 200) {
  return new ObjectPool({
    factory: () => new PooledParticle(),
    reset: (p) => p.reset(),
    initialSize: size,
    maxSize: size * 2,
    autoGrow: true,
  });
}

/**
 * Vector3 class for pooling
 */
export class PooledVector3 {
  constructor(x = 0, y = 0, z = 0) {
    this.x = x;
    this.y = y;
    this.z = z;
  }

  set(x, y, z) {
    this.x = x;
    this.y = y;
    this.z = z;
    return this;
  }

  copy(v) {
    this.x = v.x;
    this.y = v.y;
    this.z = v.z;
    return this;
  }

  add(v) {
    this.x += v.x;
    this.y += v.y;
    this.z += v.z;
    return this;
  }

  sub(v) {
    this.x -= v.x;
    this.y -= v.y;
    this.z -= v.z;
    return this;
  }

  multiplyScalar(s) {
    this.x *= s;
    this.y *= s;
    this.z *= s;
    return this;
  }

  length() {
    return Math.sqrt(this.x * this.x + this.y * this.y + this.z * this.z);
  }

  normalize() {
    const len = this.length();
    if (len > 0) {
      this.multiplyScalar(1 / len);
    }
    return this;
  }

  distanceTo(v) {
    const dx = this.x - v.x;
    const dy = this.y - v.y;
    const dz = this.z - v.z;
    return Math.sqrt(dx * dx + dy * dy + dz * dz);
  }

  reset() {
    this.x = 0;
    this.y = 0;
    this.z = 0;
    return this;
  }
}

/**
 * Create a Vector3 pool
 * @param {number} [size=50] - Pool size
 * @returns {ObjectPool<PooledVector3>}
 */
export function createVector3Pool(size = 50) {
  return new ObjectPool({
    factory: () => new PooledVector3(),
    reset: (v) => v.reset(),
    initialSize: size,
    maxSize: size * 2,
    autoGrow: true,
  });
}

export default ObjectPool;
