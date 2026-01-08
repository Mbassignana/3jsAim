/**
 * OptimizedRaycast - Raycast optimizations with spatial partitioning and early-exit
 * Enhances raycasting performance using bounding box pre-checks and Quadtree integration
 */

import { createCenteredQuadtree } from './Quadtree.js';

// ==========================================================================
// Types
// ==========================================================================

/**
 * @typedef {Object} BoundingBox
 * @property {number} minX - Minimum X coordinate
 * @property {number} minY - Minimum Y coordinate
 * @property {number} maxX - Maximum X coordinate
 * @property {number} maxY - Maximum Y coordinate
 */

/**
 * @typedef {Object} RayConfig
 * @property {number} x - Ray origin X
 * @property {number} y - Ray origin Y
 * @property {number} angle - Ray direction angle (radians)
 * @property {number} maxRange - Maximum ray distance
 * @property {number} [coneAngle] - Half-angle of cone (for cone casting)
 */

/**
 * @typedef {Object} Target
 * @property {number} x - Target X position
 * @property {number} y - Target Y position
 * @property {number} [radius] - Target radius (for circle collision)
 * @property {*} [data] - Associated data
 */

// ==========================================================================
// Bounding Box Utilities
// ==========================================================================

/**
 * Create a bounding box from center and radius
 * @param {number} x - Center X
 * @param {number} y - Center Y
 * @param {number} radius - Radius
 * @returns {BoundingBox}
 */
export function createBoundsFromCircle(x, y, radius) {
  return {
    minX: x - radius,
    minY: y - radius,
    maxX: x + radius,
    maxY: y + radius,
  };
}

/**
 * Create a bounding box for a ray's potential hit area
 * @param {RayConfig} ray - Ray configuration
 * @returns {BoundingBox}
 */
export function createRayBounds(ray) {
  const { x, y, angle, maxRange, coneAngle = 0 } = ray;

  // Calculate the end point and cone edges
  const cosAngle = Math.cos(angle);
  const sinAngle = Math.sin(angle);

  // Points to consider: origin and cone end points
  const points = [{ x, y }];

  // End of ray (straight ahead)
  points.push({
    x: x + cosAngle * maxRange,
    y: y + sinAngle * maxRange,
  });

  // If cone casting, add cone edge points
  if (coneAngle > 0) {
    const leftAngle = angle - coneAngle;
    const rightAngle = angle + coneAngle;

    points.push({
      x: x + Math.cos(leftAngle) * maxRange,
      y: y + Math.sin(leftAngle) * maxRange,
    });
    points.push({
      x: x + Math.cos(rightAngle) * maxRange,
      y: y + Math.sin(rightAngle) * maxRange,
    });
  }

  // Find bounds from all points
  let minX = Infinity,
    minY = Infinity;
  let maxX = -Infinity,
    maxY = -Infinity;

  for (const point of points) {
    minX = Math.min(minX, point.x);
    minY = Math.min(minY, point.y);
    maxX = Math.max(maxX, point.x);
    maxY = Math.max(maxY, point.y);
  }

  return { minX, minY, maxX, maxY };
}

/**
 * Check if two bounding boxes intersect
 * @param {BoundingBox} a
 * @param {BoundingBox} b
 * @returns {boolean}
 */
export function boundsIntersect(a, b) {
  return a.minX <= b.maxX && a.maxX >= b.minX && a.minY <= b.maxY && a.maxY >= b.minY;
}

/**
 * Check if a point is inside a bounding box
 * @param {number} x
 * @param {number} y
 * @param {BoundingBox} bounds
 * @returns {boolean}
 */
export function pointInBounds(x, y, bounds) {
  return x >= bounds.minX && x <= bounds.maxX && y >= bounds.minY && y <= bounds.maxY;
}

// ==========================================================================
// Ray-Circle Intersection
// ==========================================================================

/**
 * Check if a ray intersects a circle (precise check)
 * @param {RayConfig} ray
 * @param {Target} circle - Circle with x, y, radius
 * @returns {{hit: boolean, distance: number, point: {x: number, y: number}|null}}
 */
export function rayCircleIntersection(ray, circle) {
  const { x: ox, y: oy, angle, maxRange } = ray;
  const { x: cx, y: cy, radius = 0 } = circle;

  // Ray direction unit vector
  const dx = Math.cos(angle);
  const dy = Math.sin(angle);

  // Vector from ray origin to circle center
  const fx = ox - cx;
  const fy = oy - cy;

  // Quadratic coefficients: at^2 + bt + c = 0
  // where t is distance along ray
  const a = dx * dx + dy * dy; // Always 1 for unit vector
  const b = 2 * (fx * dx + fy * dy);
  const c = fx * fx + fy * fy - radius * radius;

  const discriminant = b * b - 4 * a * c;

  if (discriminant < 0) {
    return { hit: false, distance: Infinity, point: null };
  }

  // Find nearest intersection point
  const sqrtDisc = Math.sqrt(discriminant);
  let t = (-b - sqrtDisc) / (2 * a);

  // If nearest point is behind ray, try the far point
  if (t < 0) {
    t = (-b + sqrtDisc) / (2 * a);
  }

  // Check if intersection is valid (in front of ray and within range)
  if (t < 0 || t > maxRange) {
    return { hit: false, distance: Infinity, point: null };
  }

  return {
    hit: true,
    distance: t,
    point: {
      x: ox + dx * t,
      y: oy + dy * t,
    },
  };
}

/**
 * Check if a target is within a cone
 * @param {RayConfig} ray - Ray with coneAngle
 * @param {Target} target
 * @returns {{inCone: boolean, distance: number, angleDiff: number}}
 */
export function isInCone(ray, target) {
  const { x: ox, y: oy, angle, maxRange, coneAngle = 0.1 } = ray;
  const { x: tx, y: ty } = target;

  // Vector to target
  const dx = tx - ox;
  const dy = ty - oy;
  const distance = Math.sqrt(dx * dx + dy * dy);

  // Range check
  if (distance > maxRange) {
    return { inCone: false, distance, angleDiff: Infinity };
  }

  // Angle to target
  const targetAngle = Math.atan2(dy, dx);
  let angleDiff = targetAngle - angle;

  // Normalize to [-PI, PI]
  while (angleDiff > Math.PI) angleDiff -= 2 * Math.PI;
  while (angleDiff < -Math.PI) angleDiff += 2 * Math.PI;

  const inCone = Math.abs(angleDiff) <= coneAngle;

  return { inCone, distance, angleDiff };
}

// ==========================================================================
// OptimizedRaycaster Class
// ==========================================================================

/**
 * Optimized raycaster with spatial partitioning and early-exit
 */
export class OptimizedRaycaster {
  /**
   * @param {Object} [options]
   * @param {number} [options.worldSize=2000] - World size for quadtree
   * @param {number} [options.maxItems=8] - Max items per quadtree node
   * @param {number} [options.maxDepth=6] - Max quadtree depth
   * @param {boolean} [options.useQuadtree=true] - Enable quadtree optimization
   */
  constructor(options = {}) {
    /** @type {number} */
    this.worldSize = options.worldSize ?? 2000;

    /** @type {number} */
    this.maxItems = options.maxItems ?? 8;

    /** @type {number} */
    this.maxDepth = options.maxDepth ?? 6;

    /** @type {boolean} */
    this.useQuadtree = options.useQuadtree ?? true;

    /** @type {Quadtree|null} */
    this._quadtree = null;

    /** @type {Array<Target>} */
    this._targets = [];

    /** @type {boolean} */
    this._dirty = true;

    // Stats for debugging/optimization
    /** @type {{checks: number, quadtreeQueries: number, hits: number}} */
    this.stats = {
      checks: 0,
      quadtreeQueries: 0,
      hits: 0,
    };
  }

  /**
   * Set targets for raycasting
   * @param {Array<Target>} targets
   */
  setTargets(targets) {
    this._targets = targets;
    this._dirty = true;
  }

  /**
   * Add a single target
   * @param {Target} target
   */
  addTarget(target) {
    this._targets.push(target);
    this._dirty = true;
  }

  /**
   * Remove a target by reference
   * @param {Target} target
   * @returns {boolean}
   */
  removeTarget(target) {
    const index = this._targets.indexOf(target);
    if (index !== -1) {
      this._targets.splice(index, 1);
      this._dirty = true;
      return true;
    }
    return false;
  }

  /**
   * Clear all targets
   */
  clearTargets() {
    this._targets = [];
    this._quadtree = null;
    this._dirty = true;
  }

  /**
   * Rebuild the quadtree if dirty
   * @private
   */
  _rebuildQuadtree() {
    if (!this._dirty || !this.useQuadtree || this._targets.length === 0) {
      return;
    }

    this._quadtree = createCenteredQuadtree(this.worldSize, {
      maxItems: this.maxItems,
      maxDepth: this.maxDepth,
    });

    for (let i = 0; i < this._targets.length; i++) {
      const target = this._targets[i];
      const radius = target.radius ?? 0;

      this._quadtree.insert({
        x: target.x,
        y: target.y,
        width: radius * 2,
        height: radius * 2,
        data: { target, index: i },
      });
    }

    this._dirty = false;
  }

  /**
   * Get potential targets using quadtree spatial query
   * @param {BoundingBox} bounds
   * @returns {Array<{target: Target, index: number}>}
   * @private
   */
  _queryQuadtree(bounds) {
    if (!this._quadtree) {
      // Fallback: return all targets with indices
      return this._targets.map((target, index) => ({ target, index }));
    }

    this.stats.quadtreeQueries++;

    // Convert corner-based bounds to center-based format for Quadtree
    const width = bounds.maxX - bounds.minX;
    const height = bounds.maxY - bounds.minY;
    const centerX = bounds.minX + width / 2;
    const centerY = bounds.minY + height / 2;

    const items = this._quadtree.query({
      x: centerX,
      y: centerY,
      width,
      height,
    });

    return items.map((item) => item.data);
  }

  /**
   * Cast a ray and find intersections with early-exit option
   * @param {RayConfig} ray
   * @param {Object} [options]
   * @param {boolean} [options.firstOnly=false] - Stop after first hit
   * @param {boolean} [options.useBounds=true] - Use bounding box pre-check
   * @param {Function} [options.filter] - Optional filter function (target) => boolean
   * @returns {Array<{target: Target, index: number, distance: number, point: {x: number, y: number}}>}
   */
  cast(ray, options = {}) {
    const { firstOnly = false, useBounds = true, filter = null } = options;
    const hits = [];

    this._rebuildQuadtree();

    // Get potential targets
    let candidates;
    if (this.useQuadtree && useBounds) {
      const rayBounds = createRayBounds(ray);
      candidates = this._queryQuadtree(rayBounds);
    } else {
      candidates = this._targets.map((target, index) => ({ target, index }));
    }

    // Check each candidate
    for (const { target, index } of candidates) {
      this.stats.checks++;

      // Apply filter if provided
      if (filter && !filter(target)) {
        continue;
      }

      // Bounding box pre-check
      if (useBounds) {
        const targetRadius = target.radius ?? 0;
        const targetBounds = createBoundsFromCircle(target.x, target.y, targetRadius);
        const rayBounds = createRayBounds(ray);

        if (!boundsIntersect(targetBounds, rayBounds)) {
          continue;
        }
      }

      // Precise intersection check
      let hitResult;

      if (ray.coneAngle && ray.coneAngle > 0) {
        // Cone cast - check if target center is in cone
        const coneResult = isInCone(ray, target);
        if (coneResult.inCone) {
          hitResult = {
            hit: true,
            distance: coneResult.distance,
            point: { x: target.x, y: target.y },
            angleDiff: coneResult.angleDiff,
          };
        } else {
          hitResult = { hit: false };
        }
      } else {
        // Ray cast - precise circle intersection
        hitResult = rayCircleIntersection(ray, target);
      }

      if (hitResult.hit) {
        this.stats.hits++;
        hits.push({
          target,
          index,
          distance: hitResult.distance,
          point: hitResult.point,
          angleDiff: hitResult.angleDiff,
        });

        // Early exit if only first hit needed
        if (firstOnly) {
          return hits;
        }
      }
    }

    // Sort by distance
    return hits.sort((a, b) => a.distance - b.distance);
  }

  /**
   * Cast a cone and find all targets within
   * @param {RayConfig} ray - Must include coneAngle
   * @param {Object} [options]
   * @returns {Array<{target: Target, index: number, distance: number, angleDiff: number}>}
   */
  castCone(ray, options = {}) {
    return this.cast(
      {
        ...ray,
        coneAngle: ray.coneAngle ?? 0.1,
      },
      options
    );
  }

  /**
   * Find closest target along ray
   * @param {RayConfig} ray
   * @param {Object} [options]
   * @returns {{target: Target, index: number, distance: number, point: Object}|null}
   */
  findClosest(ray, options = {}) {
    const hits = this.cast(ray, { ...options, firstOnly: false });
    return hits.length > 0 ? hits[0] : null;
  }

  /**
   * Check if any target is hit
   * @param {RayConfig} ray
   * @param {Object} [options]
   * @returns {boolean}
   */
  hasHit(ray, options = {}) {
    const hits = this.cast(ray, { ...options, firstOnly: true });
    return hits.length > 0;
  }

  /**
   * Reset stats
   */
  resetStats() {
    this.stats = { checks: 0, quadtreeQueries: 0, hits: 0 };
  }

  /**
   * Mark quadtree as needing rebuild
   * Call this if target positions change
   */
  markDirty() {
    this._dirty = true;
  }

  /**
   * Get the number of targets
   * @returns {number}
   */
  getTargetCount() {
    return this._targets.length;
  }
}

// ==========================================================================
// Optimized Canvas2D Raycast Strategy
// ==========================================================================

/**
 * Optimized 2D cone-based targeting strategy
 * Drop-in replacement for Canvas2DRaycastStrategy with spatial partitioning
 */
export class OptimizedCanvas2DRaycastStrategy {
  /**
   * @param {Object} [config]
   * @param {number} [config.maxRange=1000] - Maximum detection range
   * @param {number} [config.coneAngle=0.1] - Shoot cone half-angle (radians)
   * @param {number} [config.worldSize=2000] - World size for quadtree
   * @param {boolean} [config.useQuadtree=true] - Enable quadtree optimization
   */
  constructor(config = {}) {
    this.maxRange = config.maxRange ?? 1000;
    this.coneAngle = config.coneAngle ?? 0.1;
    this.worldSize = config.worldSize ?? 2000;
    this.useQuadtree = config.useQuadtree ?? true;

    this._raycaster = new OptimizedRaycaster({
      worldSize: this.worldSize,
      useQuadtree: this.useQuadtree,
    });
  }

  /**
   * Cast ray and find all hits within cone
   * @param {Object} origin - {x, y, angle}
   * @param {Array} targets - Target objects
   * @param {Object} [options]
   * @returns {Array}
   */
  cast(origin, targets, options = {}) {
    const maxRange = options.maxRange ?? this.maxRange;
    const coneAngle = options.coneAngle ?? this.coneAngle;

    // Set targets (rebuilds quadtree if needed)
    this._raycaster.setTargets(targets);

    // Cast cone
    const hits = this._raycaster.castCone(
      {
        x: origin.x,
        y: origin.y,
        angle: origin.angle,
        maxRange,
        coneAngle,
      },
      {
        useBounds: this.useQuadtree,
      }
    );

    // Convert to expected format
    return hits.map((hit) => ({
      type: hit.target.type,
      index: hit.index,
      distance: hit.distance,
      object: hit.target,
      point: hit.point,
      angleDiff: hit.angleDiff,
    }));
  }

  /**
   * Check if a single target is within the cone
   * @param {Object} origin
   * @param {Object} target
   * @param {Object} [options]
   * @returns {Object|null}
   */
  checkTarget(origin, target, options = {}) {
    const maxRange = options.maxRange ?? this.maxRange;
    const coneAngle = options.coneAngle ?? this.coneAngle;
    const index = options.index ?? 0;

    const result = isInCone(
      { x: origin.x, y: origin.y, angle: origin.angle, maxRange, coneAngle },
      target
    );

    if (result.inCone) {
      return {
        type: target.type,
        index,
        distance: result.distance,
        object: target,
        point: { x: target.x, y: target.y },
        angleDiff: result.angleDiff,
      };
    }

    return null;
  }

  /**
   * Get raycaster stats
   * @returns {Object}
   */
  getStats() {
    return { ...this._raycaster.stats };
  }

  /**
   * Reset stats
   */
  resetStats() {
    this._raycaster.resetStats();
  }
}

// ==========================================================================
// Factory Functions
// ==========================================================================

/**
 * Create an optimized raycaster
 * @param {Object} [options]
 * @returns {OptimizedRaycaster}
 */
export function createOptimizedRaycaster(options = {}) {
  return new OptimizedRaycaster(options);
}

/**
 * Create an optimized Canvas2D raycast strategy
 * @param {Object} [config]
 * @returns {OptimizedCanvas2DRaycastStrategy}
 */
export function createOptimizedCanvas2DStrategy(config = {}) {
  return new OptimizedCanvas2DRaycastStrategy(config);
}

export default OptimizedRaycaster;
