/**
 * Quadtree - Spatial partitioning for efficient 2D collision detection
 * Recursively subdivides 2D space into quadrants for O(log n) spatial queries
 */

// ==========================================================================
// Types
// ==========================================================================

/**
 * @typedef {Object} Rectangle
 * @property {number} x - Center X
 * @property {number} y - Center Y
 * @property {number} width - Full width
 * @property {number} height - Full height
 */

/**
 * @typedef {Object} QuadtreeItem
 * @property {number} x - X position
 * @property {number} y - Y position
 * @property {number} [radius] - Collision radius
 * @property {number} [width] - Collision width (for rectangles)
 * @property {number} [height] - Collision height (for rectangles)
 * @property {*} [data] - Associated data
 */

// ==========================================================================
// Constants
// ==========================================================================

/** Default maximum items per node before split */
const DEFAULT_MAX_ITEMS = 8;

/** Default maximum depth of tree */
const DEFAULT_MAX_DEPTH = 8;

// ==========================================================================
// Rectangle Utilities
// ==========================================================================

/**
 * Check if a point is inside a rectangle
 * @param {number} px - Point X
 * @param {number} py - Point Y
 * @param {Rectangle} rect - Rectangle
 * @returns {boolean}
 */
function pointInRect(px, py, rect) {
  const halfW = rect.width / 2;
  const halfH = rect.height / 2;
  return (
    px >= rect.x - halfW &&
    px <= rect.x + halfW &&
    py >= rect.y - halfH &&
    py <= rect.y + halfH
  );
}

/**
 * Check if two rectangles intersect
 * @param {Rectangle} a - First rectangle
 * @param {Rectangle} b - Second rectangle
 * @returns {boolean}
 */
function rectsIntersect(a, b) {
  const aHalfW = a.width / 2;
  const aHalfH = a.height / 2;
  const bHalfW = b.width / 2;
  const bHalfH = b.height / 2;

  return (
    a.x - aHalfW < b.x + bHalfW &&
    a.x + aHalfW > b.x - bHalfW &&
    a.y - aHalfH < b.y + bHalfH &&
    a.y + aHalfH > b.y - bHalfH
  );
}

/**
 * Check if circle intersects rectangle
 * @param {number} cx - Circle center X
 * @param {number} cy - Circle center Y
 * @param {number} radius - Circle radius
 * @param {Rectangle} rect - Rectangle
 * @returns {boolean}
 */
function circleIntersectsRect(cx, cy, radius, rect) {
  const halfW = rect.width / 2;
  const halfH = rect.height / 2;

  // Find closest point on rectangle to circle center
  const closestX = Math.max(rect.x - halfW, Math.min(cx, rect.x + halfW));
  const closestY = Math.max(rect.y - halfH, Math.min(cy, rect.y + halfH));

  // Check if closest point is within circle
  const dx = cx - closestX;
  const dy = cy - closestY;
  return dx * dx + dy * dy <= radius * radius;
}

// ==========================================================================
// Quadtree Node
// ==========================================================================

/**
 * QuadtreeNode - A single node in the quadtree
 */
class QuadtreeNode {
  /**
   * @param {Rectangle} bounds - Node bounds
   * @param {number} depth - Current depth
   * @param {number} maxItems - Max items before split
   * @param {number} maxDepth - Max tree depth
   */
  constructor(bounds, depth, maxItems, maxDepth) {
    /** @type {Rectangle} */
    this.bounds = bounds;

    /** @type {number} */
    this.depth = depth;

    /** @type {number} */
    this.maxItems = maxItems;

    /** @type {number} */
    this.maxDepth = maxDepth;

    /** @type {QuadtreeItem[]} */
    this.items = [];

    /** @type {QuadtreeNode[]|null} */
    this.children = null;

    /** @type {boolean} */
    this.divided = false;
  }

  /**
   * Subdivide this node into 4 children
   */
  subdivide() {
    if (this.divided) {
      return;
    }

    const { x, y, width, height } = this.bounds;
    const halfW = width / 2;
    const halfH = height / 2;
    const quarterW = width / 4;
    const quarterH = height / 4;

    this.children = [
      // NE (top-right)
      new QuadtreeNode(
        { x: x + quarterW, y: y - quarterH, width: halfW, height: halfH },
        this.depth + 1,
        this.maxItems,
        this.maxDepth
      ),
      // NW (top-left)
      new QuadtreeNode(
        { x: x - quarterW, y: y - quarterH, width: halfW, height: halfH },
        this.depth + 1,
        this.maxItems,
        this.maxDepth
      ),
      // SW (bottom-left)
      new QuadtreeNode(
        { x: x - quarterW, y: y + quarterH, width: halfW, height: halfH },
        this.depth + 1,
        this.maxItems,
        this.maxDepth
      ),
      // SE (bottom-right)
      new QuadtreeNode(
        { x: x + quarterW, y: y + quarterH, width: halfW, height: halfH },
        this.depth + 1,
        this.maxItems,
        this.maxDepth
      ),
    ];

    this.divided = true;

    // Redistribute existing items to children
    const itemsToMove = this.items;
    this.items = [];

    for (const item of itemsToMove) {
      this._insertIntoChildren(item);
    }
  }

  /**
   * Insert item into appropriate child nodes
   * @param {QuadtreeItem} item
   * @private
   */
  _insertIntoChildren(item) {
    if (!this.children) {
      return;
    }

    const itemBounds = this._getItemBounds(item);

    for (const child of this.children) {
      if (rectsIntersect(itemBounds, child.bounds)) {
        child.insert(item);
      }
    }
  }

  /**
   * Get bounding rectangle for an item
   * @param {QuadtreeItem} item
   * @returns {Rectangle}
   * @private
   */
  _getItemBounds(item) {
    if (item.radius !== undefined) {
      return {
        x: item.x,
        y: item.y,
        width: item.radius * 2,
        height: item.radius * 2,
      };
    }

    return {
      x: item.x,
      y: item.y,
      width: item.width || 1,
      height: item.height || 1,
    };
  }

  /**
   * Insert an item into this node
   * @param {QuadtreeItem} item
   * @returns {boolean} True if inserted
   */
  insert(item) {
    // Check if item is in bounds
    const itemBounds = this._getItemBounds(item);
    if (!rectsIntersect(itemBounds, this.bounds)) {
      return false;
    }

    // If we have children, try to insert there
    if (this.divided) {
      this._insertIntoChildren(item);
      return true;
    }

    // Add to this node's items
    this.items.push(item);

    // Check if we need to subdivide
    if (this.items.length > this.maxItems && this.depth < this.maxDepth) {
      this.subdivide();
    }

    return true;
  }

  /**
   * Query items in a range
   * @param {Rectangle} range - Query range
   * @param {QuadtreeItem[]} [found] - Array to collect results
   * @returns {QuadtreeItem[]}
   */
  query(range, found = []) {
    // Skip if range doesn't intersect this node
    if (!rectsIntersect(range, this.bounds)) {
      return found;
    }

    // Check items in this node
    for (const item of this.items) {
      const itemBounds = this._getItemBounds(item);
      if (rectsIntersect(itemBounds, range)) {
        found.push(item);
      }
    }

    // Query children
    if (this.divided && this.children) {
      for (const child of this.children) {
        child.query(range, found);
      }
    }

    return found;
  }

  /**
   * Query items within a circular range
   * @param {number} cx - Circle center X
   * @param {number} cy - Circle center Y
   * @param {number} radius - Circle radius
   * @param {QuadtreeItem[]} [found] - Array to collect results
   * @returns {QuadtreeItem[]}
   */
  queryCircle(cx, cy, radius, found = []) {
    // Skip if circle doesn't intersect this node
    if (!circleIntersectsRect(cx, cy, radius, this.bounds)) {
      return found;
    }

    // Check items in this node
    for (const item of this.items) {
      const dx = item.x - cx;
      const dy = item.y - cy;
      const distance = Math.sqrt(dx * dx + dy * dy);
      const itemRadius = item.radius || 0;

      if (distance - itemRadius <= radius) {
        found.push(item);
      }
    }

    // Query children
    if (this.divided && this.children) {
      for (const child of this.children) {
        child.queryCircle(cx, cy, radius, found);
      }
    }

    return found;
  }

  /**
   * Find all items that could collide with the given item
   * @param {QuadtreeItem} item
   * @param {QuadtreeItem[]} [found]
   * @returns {QuadtreeItem[]}
   */
  findPotentialCollisions(item, found = []) {
    const itemBounds = this._getItemBounds(item);
    return this.query(itemBounds, found);
  }

  /**
   * Remove an item from the tree
   * @param {QuadtreeItem} item
   * @returns {boolean} True if removed
   */
  remove(item) {
    // Try to remove from this node
    const index = this.items.indexOf(item);
    if (index !== -1) {
      this.items.splice(index, 1);
      return true;
    }

    // Try to remove from children
    if (this.divided && this.children) {
      for (const child of this.children) {
        if (child.remove(item)) {
          return true;
        }
      }
    }

    return false;
  }

  /**
   * Clear all items from this node and children
   */
  clear() {
    this.items = [];

    if (this.children) {
      for (const child of this.children) {
        child.clear();
      }
      this.children = null;
    }

    this.divided = false;
  }

  /**
   * Get total item count in this subtree
   * @returns {number}
   */
  getItemCount() {
    let count = this.items.length;

    if (this.children) {
      for (const child of this.children) {
        count += child.getItemCount();
      }
    }

    return count;
  }

  /**
   * Get all nodes for visualization/debugging
   * @returns {QuadtreeNode[]}
   */
  getAllNodes() {
    const nodes = [this];

    if (this.children) {
      for (const child of this.children) {
        nodes.push(...child.getAllNodes());
      }
    }

    return nodes;
  }
}

// ==========================================================================
// Quadtree Class
// ==========================================================================

/**
 * Quadtree - Main quadtree class for spatial partitioning
 */
export class Quadtree {
  /**
   * @param {Rectangle} bounds - World bounds
   * @param {Object} [options]
   * @param {number} [options.maxItems] - Max items per node
   * @param {number} [options.maxDepth] - Max tree depth
   */
  constructor(bounds, options = {}) {
    /** @type {Rectangle} */
    this.bounds = bounds;

    /** @type {number} */
    this.maxItems = options.maxItems ?? DEFAULT_MAX_ITEMS;

    /** @type {number} */
    this.maxDepth = options.maxDepth ?? DEFAULT_MAX_DEPTH;

    /** @type {QuadtreeNode} */
    this.root = new QuadtreeNode(bounds, 0, this.maxItems, this.maxDepth);
  }

  /**
   * Insert an item into the quadtree
   * @param {QuadtreeItem} item
   * @returns {boolean}
   */
  insert(item) {
    return this.root.insert(item);
  }

  /**
   * Insert multiple items
   * @param {QuadtreeItem[]} items
   * @returns {number} Number of items inserted
   */
  insertAll(items) {
    let count = 0;
    for (const item of items) {
      if (this.insert(item)) {
        count++;
      }
    }
    return count;
  }

  /**
   * Query items in a rectangular range
   * @param {Rectangle} range
   * @returns {QuadtreeItem[]}
   */
  query(range) {
    return this.root.query(range);
  }

  /**
   * Query items in a circular range
   * @param {number} cx - Center X
   * @param {number} cy - Center Y
   * @param {number} radius - Range radius
   * @returns {QuadtreeItem[]}
   */
  queryCircle(cx, cy, radius) {
    return this.root.queryCircle(cx, cy, radius);
  }

  /**
   * Query items at a point
   * @param {number} x - X coordinate
   * @param {number} y - Y coordinate
   * @returns {QuadtreeItem[]}
   */
  queryPoint(x, y) {
    return this.query({ x, y, width: 1, height: 1 });
  }

  /**
   * Find potential collision candidates for an item
   * @param {QuadtreeItem} item
   * @returns {QuadtreeItem[]}
   */
  findPotentialCollisions(item) {
    return this.root.findPotentialCollisions(item);
  }

  /**
   * Remove an item from the quadtree
   * @param {QuadtreeItem} item
   * @returns {boolean}
   */
  remove(item) {
    return this.root.remove(item);
  }

  /**
   * Clear all items from the quadtree
   */
  clear() {
    this.root.clear();
  }

  /**
   * Rebuild the tree with new items (useful after many changes)
   * @param {QuadtreeItem[]} items
   */
  rebuild(items) {
    this.clear();
    this.insertAll(items);
  }

  /**
   * Get total number of items in the tree
   * @returns {number}
   */
  getItemCount() {
    return this.root.getItemCount();
  }

  /**
   * Get all nodes for visualization
   * @returns {QuadtreeNode[]}
   */
  getAllNodes() {
    return this.root.getAllNodes();
  }

  /**
   * Get bounds of the quadtree
   * @returns {Rectangle}
   */
  getBounds() {
    return this.bounds;
  }
}

// ==========================================================================
// Factory Functions
// ==========================================================================

/**
 * Create a quadtree from an array of objects with x, y properties
 * @param {Object[]} objects - Objects with x, y positions
 * @param {Rectangle} bounds - World bounds
 * @param {Object} [options]
 * @returns {Quadtree}
 */
export function createQuadtreeFromObjects(objects, bounds, options = {}) {
  const tree = new Quadtree(bounds, options);
  tree.insertAll(objects);
  return tree;
}

/**
 * Create a centered quadtree with given size
 * @param {number} size - Size of the world (width = height = size)
 * @param {Object} [options]
 * @returns {Quadtree}
 */
export function createCenteredQuadtree(size, options = {}) {
  return new Quadtree(
    {
      x: 0,
      y: 0,
      width: size,
      height: size,
    },
    options
  );
}

// ==========================================================================
// Collision Detection Utilities
// ==========================================================================

/**
 * Find all colliding pairs using quadtree
 * @param {Quadtree} tree
 * @param {QuadtreeItem[]} items
 * @returns {Array<[QuadtreeItem, QuadtreeItem]>}
 */
export function findAllCollisions(tree, items) {
  const collisions = [];
  const checked = new Set();

  for (const item of items) {
    const candidates = tree.findPotentialCollisions(item);

    for (const other of candidates) {
      if (item === other) continue;

      // Create unique pair key to avoid duplicate checks
      const pairKey =
        item.data?.id < other.data?.id
          ? `${item.data?.id}-${other.data?.id}`
          : `${other.data?.id}-${item.data?.id}`;

      if (checked.has(pairKey)) continue;
      checked.add(pairKey);

      // Actual collision check
      if (checkCollision(item, other)) {
        collisions.push([item, other]);
      }
    }
  }

  return collisions;
}

/**
 * Check if two items actually collide
 * @param {QuadtreeItem} a
 * @param {QuadtreeItem} b
 * @returns {boolean}
 */
export function checkCollision(a, b) {
  // Circle-circle collision
  if (a.radius !== undefined && b.radius !== undefined) {
    const dx = a.x - b.x;
    const dy = a.y - b.y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    return distance < a.radius + b.radius;
  }

  // Rectangle-rectangle collision (AABB)
  const aW = a.width || a.radius * 2 || 1;
  const aH = a.height || a.radius * 2 || 1;
  const bW = b.width || b.radius * 2 || 1;
  const bH = b.height || b.radius * 2 || 1;

  return (
    a.x - aW / 2 < b.x + bW / 2 &&
    a.x + aW / 2 > b.x - bW / 2 &&
    a.y - aH / 2 < b.y + bH / 2 &&
    a.y + aH / 2 > b.y - bH / 2
  );
}

export default Quadtree;
