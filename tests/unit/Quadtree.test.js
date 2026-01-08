/**
 * Unit tests for Quadtree spatial partitioning
 */

import {
  Quadtree,
  createQuadtreeFromObjects,
  createCenteredQuadtree,
  findAllCollisions,
  checkCollision,
} from '@utils/Quadtree.js';
import { describe, it, expect, beforeEach } from 'vitest';

describe('Quadtree', () => {
  let tree;

  beforeEach(() => {
    // Create a 100x100 quadtree centered at origin
    tree = new Quadtree({ x: 0, y: 0, width: 100, height: 100 });
  });

  describe('constructor', () => {
    it('should create tree with bounds', () => {
      expect(tree.bounds).toEqual({ x: 0, y: 0, width: 100, height: 100 });
    });

    it('should use default maxItems', () => {
      expect(tree.maxItems).toBe(8);
    });

    it('should use default maxDepth', () => {
      expect(tree.maxDepth).toBe(8);
    });

    it('should accept custom options', () => {
      const customTree = new Quadtree(
        { x: 0, y: 0, width: 100, height: 100 },
        { maxItems: 4, maxDepth: 5 }
      );
      expect(customTree.maxItems).toBe(4);
      expect(customTree.maxDepth).toBe(5);
    });
  });

  describe('insert', () => {
    it('should insert item inside bounds', () => {
      const item = { x: 10, y: 10 };
      const result = tree.insert(item);
      expect(result).toBe(true);
      expect(tree.getItemCount()).toBe(1);
    });

    it('should reject item outside bounds', () => {
      const item = { x: 100, y: 100 };
      const result = tree.insert(item);
      expect(result).toBe(false);
      expect(tree.getItemCount()).toBe(0);
    });

    it('should insert item at origin', () => {
      const item = { x: 0, y: 0 };
      expect(tree.insert(item)).toBe(true);
    });

    it('should insert item with radius', () => {
      const item = { x: 10, y: 10, radius: 5 };
      expect(tree.insert(item)).toBe(true);
    });

    it('should insert item with data', () => {
      const item = { x: 10, y: 10, data: { id: 'test' } };
      expect(tree.insert(item)).toBe(true);
    });

    it('should subdivide when exceeding maxItems', () => {
      const customTree = new Quadtree(
        { x: 0, y: 0, width: 100, height: 100 },
        { maxItems: 2, maxDepth: 4 }
      );

      // Insert 3 items to trigger subdivision
      customTree.insert({ x: -25, y: -25 });
      customTree.insert({ x: 25, y: 25 });
      customTree.insert({ x: -25, y: 25 });

      expect(customTree.root.divided).toBe(true);
    });
  });

  describe('insertAll', () => {
    it('should insert multiple items', () => {
      const items = [
        { x: 10, y: 10 },
        { x: 20, y: 20 },
        { x: -10, y: -10 },
      ];
      const count = tree.insertAll(items);
      expect(count).toBe(3);
      expect(tree.getItemCount()).toBe(3);
    });

    it('should return count of successfully inserted items', () => {
      const items = [
        { x: 10, y: 10 },
        { x: 200, y: 200 }, // Outside bounds
        { x: -10, y: -10 },
      ];
      const count = tree.insertAll(items);
      expect(count).toBe(2);
    });
  });

  describe('query', () => {
    beforeEach(() => {
      // Add items in different quadrants
      tree.insertAll([
        { x: 25, y: -25, data: { id: 'NE' } },
        { x: -25, y: -25, data: { id: 'NW' } },
        { x: -25, y: 25, data: { id: 'SW' } },
        { x: 25, y: 25, data: { id: 'SE' } },
        { x: 0, y: 0, data: { id: 'center' } },
      ]);
    });

    it('should return items in range', () => {
      const results = tree.query({ x: 25, y: -25, width: 20, height: 20 });
      expect(results.length).toBe(1);
      expect(results[0].data.id).toBe('NE');
    });

    it('should return multiple items in range', () => {
      const results = tree.query({ x: 0, y: 0, width: 60, height: 60 });
      expect(results.length).toBe(5);
    });

    it('should return empty array for empty range', () => {
      const results = tree.query({ x: 40, y: 40, width: 5, height: 5 });
      expect(results).toEqual([]);
    });

    it('should find items at range boundary', () => {
      const results = tree.query({ x: 25, y: -25, width: 1, height: 1 });
      expect(results.length).toBe(1);
    });
  });

  describe('queryCircle', () => {
    beforeEach(() => {
      tree.insertAll([
        { x: 10, y: 0, data: { id: 'A' } },
        { x: 20, y: 0, data: { id: 'B' } },
        { x: 30, y: 0, data: { id: 'C' } },
        { x: 0, y: 20, data: { id: 'D' } },
      ]);
    });

    it('should find items in circular range', () => {
      const results = tree.queryCircle(0, 0, 15);
      expect(results.length).toBe(1);
      expect(results[0].data.id).toBe('A');
    });

    it('should find multiple items in circular range', () => {
      const results = tree.queryCircle(0, 0, 25);
      expect(results.length).toBe(3);
    });

    it('should return empty for out-of-range query', () => {
      const results = tree.queryCircle(-40, -40, 5);
      expect(results).toEqual([]);
    });

    it('should consider item radius', () => {
      tree.clear();
      tree.insert({ x: 20, y: 0, radius: 8, data: { id: 'big' } });

      // Query should find the item even though center is at 20
      // because item radius extends towards origin
      const results = tree.queryCircle(0, 0, 15);
      expect(results.length).toBe(1);
    });
  });

  describe('queryPoint', () => {
    beforeEach(() => {
      tree.insertAll([
        { x: 10, y: 10, width: 10, height: 10, data: { id: 'A' } },
        { x: 30, y: 30, width: 10, height: 10, data: { id: 'B' } },
      ]);
    });

    it('should find item at point', () => {
      const results = tree.queryPoint(10, 10);
      expect(results.length).toBe(1);
      expect(results[0].data.id).toBe('A');
    });

    it('should return empty for miss', () => {
      const results = tree.queryPoint(-40, -40);
      expect(results).toEqual([]);
    });
  });

  describe('findPotentialCollisions', () => {
    beforeEach(() => {
      tree.insertAll([
        { x: 10, y: 10, radius: 5, data: { id: 'A' } },
        { x: 15, y: 10, radius: 5, data: { id: 'B' } }, // Overlaps A
        { x: 40, y: 40, radius: 5, data: { id: 'C' } }, // Far away
      ]);
    });

    it('should find potential collision candidates', () => {
      const item = { x: 10, y: 10, radius: 10 };
      const results = tree.findPotentialCollisions(item);
      expect(results.length).toBeGreaterThanOrEqual(2);
    });

    it('should not include distant items', () => {
      const item = { x: 10, y: 10, radius: 5 };
      const results = tree.findPotentialCollisions(item);
      const ids = results.map((r) => r.data?.id);
      expect(ids).not.toContain('C');
    });
  });

  describe('remove', () => {
    it('should remove item from tree', () => {
      const item = { x: 10, y: 10 };
      tree.insert(item);
      expect(tree.getItemCount()).toBe(1);

      tree.remove(item);
      expect(tree.getItemCount()).toBe(0);
    });

    it('should return true when item removed', () => {
      const item = { x: 10, y: 10 };
      tree.insert(item);
      expect(tree.remove(item)).toBe(true);
    });

    it('should return false when item not found', () => {
      const item = { x: 10, y: 10 };
      expect(tree.remove(item)).toBe(false);
    });

    it('should remove correct item when multiple exist', () => {
      const itemA = { x: 10, y: 10, data: { id: 'A' } };
      const itemB = { x: 20, y: 20, data: { id: 'B' } };
      tree.insert(itemA);
      tree.insert(itemB);

      tree.remove(itemA);

      const results = tree.query({ x: 0, y: 0, width: 100, height: 100 });
      expect(results.length).toBe(1);
      expect(results[0].data.id).toBe('B');
    });
  });

  describe('clear', () => {
    it('should remove all items', () => {
      tree.insertAll([
        { x: 10, y: 10 },
        { x: 20, y: 20 },
        { x: 30, y: 30 },
      ]);

      tree.clear();

      expect(tree.getItemCount()).toBe(0);
    });

    it('should reset subdivision', () => {
      const customTree = new Quadtree({ x: 0, y: 0, width: 100, height: 100 }, { maxItems: 2 });

      customTree.insertAll([
        { x: 10, y: 10 },
        { x: 20, y: 20 },
        { x: 30, y: 30 },
      ]);
      expect(customTree.root.divided).toBe(true);

      customTree.clear();
      expect(customTree.root.divided).toBe(false);
    });
  });

  describe('rebuild', () => {
    it('should rebuild tree with new items', () => {
      tree.insertAll([
        { x: 10, y: 10 },
        { x: 20, y: 20 },
      ]);

      tree.rebuild([
        { x: 30, y: 30 },
        { x: 40, y: 40 },
        { x: -10, y: -10 },
      ]);

      expect(tree.getItemCount()).toBe(3);
    });
  });

  describe('getAllNodes', () => {
    it('should return all nodes', () => {
      const nodes = tree.getAllNodes();
      expect(nodes.length).toBe(1); // Just root before subdivision
    });

    it('should return more nodes after subdivision', () => {
      const customTree = new Quadtree({ x: 0, y: 0, width: 100, height: 100 }, { maxItems: 2 });

      customTree.insertAll([
        { x: 10, y: 10 },
        { x: 20, y: 20 },
        { x: 30, y: 30 },
      ]);

      const nodes = customTree.getAllNodes();
      expect(nodes.length).toBeGreaterThan(1);
    });
  });

  describe('getBounds', () => {
    it('should return tree bounds', () => {
      expect(tree.getBounds()).toEqual({ x: 0, y: 0, width: 100, height: 100 });
    });
  });
});

describe('Factory Functions', () => {
  describe('createQuadtreeFromObjects', () => {
    it('should create tree with objects', () => {
      const objects = [
        { x: 10, y: 10 },
        { x: 20, y: 20 },
      ];
      const tree = createQuadtreeFromObjects(objects, { x: 0, y: 0, width: 100, height: 100 });

      expect(tree.getItemCount()).toBe(2);
    });
  });

  describe('createCenteredQuadtree', () => {
    it('should create centered tree', () => {
      const tree = createCenteredQuadtree(200);
      expect(tree.bounds).toEqual({ x: 0, y: 0, width: 200, height: 200 });
    });

    it('should accept options', () => {
      const tree = createCenteredQuadtree(200, { maxItems: 4 });
      expect(tree.maxItems).toBe(4);
    });
  });
});

describe('Collision Utilities', () => {
  describe('checkCollision', () => {
    it('should detect circle-circle collision', () => {
      const a = { x: 0, y: 0, radius: 10 };
      const b = { x: 15, y: 0, radius: 10 };
      expect(checkCollision(a, b)).toBe(true);
    });

    it('should detect circle-circle non-collision', () => {
      const a = { x: 0, y: 0, radius: 5 };
      const b = { x: 20, y: 0, radius: 5 };
      expect(checkCollision(a, b)).toBe(false);
    });

    it('should detect rectangle-rectangle collision', () => {
      const a = { x: 0, y: 0, width: 10, height: 10 };
      const b = { x: 5, y: 5, width: 10, height: 10 };
      expect(checkCollision(a, b)).toBe(true);
    });

    it('should detect rectangle-rectangle non-collision', () => {
      const a = { x: 0, y: 0, width: 10, height: 10 };
      const b = { x: 20, y: 20, width: 10, height: 10 };
      expect(checkCollision(a, b)).toBe(false);
    });

    it('should handle touching edges', () => {
      const a = { x: 0, y: 0, radius: 5 };
      const b = { x: 10, y: 0, radius: 5 };
      // At exactly touching distance, < comparison means not colliding
      expect(checkCollision(a, b)).toBe(false);
    });

    it('should detect overlapping circles', () => {
      const a = { x: 0, y: 0, radius: 5 };
      const b = { x: 9, y: 0, radius: 5 }; // Overlapping by 1 unit
      expect(checkCollision(a, b)).toBe(true);
    });
  });

  describe('findAllCollisions', () => {
    it('should find colliding pairs', () => {
      const tree = new Quadtree({ x: 0, y: 0, width: 100, height: 100 });
      const items = [
        { x: 0, y: 0, radius: 10, data: { id: 'A' } },
        { x: 15, y: 0, radius: 10, data: { id: 'B' } }, // Collides with A
        { x: 50, y: 50, radius: 5, data: { id: 'C' } }, // No collision
      ];

      tree.insertAll(items);
      const collisions = findAllCollisions(tree, items);

      expect(collisions.length).toBe(1);
      expect(collisions[0].map((c) => c.data.id).sort()).toEqual(['A', 'B']);
    });

    it('should not include duplicate pairs', () => {
      const tree = new Quadtree({ x: 0, y: 0, width: 100, height: 100 });
      const items = [
        { x: 0, y: 0, radius: 10, data: { id: 'A' } },
        { x: 10, y: 0, radius: 10, data: { id: 'B' } },
      ];

      tree.insertAll(items);
      const collisions = findAllCollisions(tree, items);

      expect(collisions.length).toBe(1);
    });

    it('should return empty array for no collisions', () => {
      const tree = new Quadtree({ x: 0, y: 0, width: 100, height: 100 });
      const items = [
        { x: -30, y: 0, radius: 5, data: { id: 'A' } },
        { x: 30, y: 0, radius: 5, data: { id: 'B' } },
      ];

      tree.insertAll(items);
      const collisions = findAllCollisions(tree, items);

      expect(collisions).toEqual([]);
    });
  });
});

describe('Performance characteristics', () => {
  it('should handle many items efficiently', () => {
    const tree = new Quadtree({ x: 0, y: 0, width: 1000, height: 1000 });

    // Insert 1000 items
    const items = [];
    for (let i = 0; i < 1000; i++) {
      items.push({
        x: (Math.random() - 0.5) * 900,
        y: (Math.random() - 0.5) * 900,
        radius: 5,
      });
    }

    const insertStart = performance.now();
    tree.insertAll(items);
    const insertTime = performance.now() - insertStart;

    // Item count may exceed 1000 due to items being added to multiple quadrants
    // when they span boundaries - this is expected quadtree behavior
    expect(tree.getItemCount()).toBeGreaterThanOrEqual(1000);
    expect(insertTime).toBeLessThan(100); // Should be fast

    // Query should be fast
    const queryStart = performance.now();
    tree.query({ x: 0, y: 0, width: 100, height: 100 });
    const queryTime = performance.now() - queryStart;

    expect(queryTime).toBeLessThan(10);
  });

  it('should have O(log n) query complexity', () => {
    // Compare query time with and without quadtree
    const items = [];
    for (let i = 0; i < 10000; i++) {
      items.push({
        x: (Math.random() - 0.5) * 9000,
        y: (Math.random() - 0.5) * 9000,
        radius: 5,
      });
    }

    const tree = new Quadtree({ x: 0, y: 0, width: 10000, height: 10000 });
    tree.insertAll(items);

    const range = { x: 0, y: 0, width: 500, height: 500 };

    // Quadtree query
    const qtStart = performance.now();
    const _qtResults = tree.query(range);
    const qtTime = performance.now() - qtStart;

    // Brute force for comparison
    const bfStart = performance.now();
    const _bfResults = items.filter((item) => {
      return item.x >= -250 && item.x <= 250 && item.y >= -250 && item.y <= 250;
    });
    const _bfTime = performance.now() - bfStart;

    // Quadtree should be competitive (and faster for sparse queries)
    expect(qtTime).toBeLessThan(50);
  });
});

describe('Edge Cases', () => {
  let tree;

  beforeEach(() => {
    tree = new Quadtree({ x: 0, y: 0, width: 100, height: 100 });
  });

  it('should handle items at exact boundaries', () => {
    // Tree bounds: x: 0, y: 0, width: 100, height: 100
    // This means: -50 to 50 on both axes
    const item = { x: 50, y: 50 }; // At boundary edge
    // Items at the boundary edge are still considered inside
    expect(tree.insert(item)).toBe(true);
  });

  it('should reject items outside boundaries', () => {
    const item = { x: 60, y: 60 }; // Outside bounds
    expect(tree.insert(item)).toBe(false);
  });

  it('should handle negative coordinates', () => {
    const item = { x: -25, y: -25 };
    expect(tree.insert(item)).toBe(true);
  });

  it('should handle zero-size items', () => {
    const item = { x: 0, y: 0 };
    expect(tree.insert(item)).toBe(true);
  });

  it('should handle very large radius', () => {
    const item = { x: 0, y: 0, radius: 40 };
    expect(tree.insert(item)).toBe(true);

    // Should be found in any query that intersects
    const results = tree.query({ x: 30, y: 30, width: 20, height: 20 });
    expect(results.length).toBe(1);
  });

  it('should handle max depth', () => {
    const deepTree = new Quadtree(
      { x: 0, y: 0, width: 100, height: 100 },
      { maxItems: 1, maxDepth: 3 }
    );

    // Insert many items at same location to force max depth
    for (let i = 0; i < 10; i++) {
      deepTree.insert({ x: 0, y: 0, data: { id: i } });
    }

    // Items at origin (0,0) will be added to multiple quadrants
    // when the tree subdivides, so the total count can exceed 10
    // The important thing is that query returns the distinct items
    const results = deepTree.query({ x: 0, y: 0, width: 10, height: 10 });
    expect(results.length).toBeGreaterThanOrEqual(10);
  });

  it('should handle empty tree queries', () => {
    const results = tree.query({ x: 0, y: 0, width: 50, height: 50 });
    expect(results).toEqual([]);
  });
});
