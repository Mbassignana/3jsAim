/**
 * Unit tests for Arena System - Multiple map layouts
 */

import { describe, it, expect, beforeEach } from 'vitest';

// Mock arena manager functionality
class MockArenaManager {
  constructor() {
    this.arenas = this.initArenas();
    this.currentArena = 'urban';
    this.map = this.arenas[this.currentArena].map;
  }

  initArenas() {
    return {
      training: {
        name: 'Training Room',
        description: 'Open space for practice',
        floorColor: '#4a6741',
        skyColor: '#87CEEB',
        map: [
          [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
          [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
          [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
          [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
          [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
          [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
          [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
          [1, 0, 0, 0, 0, 0, 0, 2, 2, 0, 0, 0, 0, 0, 0, 1],
          [1, 0, 0, 0, 0, 0, 0, 2, 2, 0, 0, 0, 0, 0, 0, 1],
          [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
          [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
          [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
          [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
          [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
          [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
          [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
        ],
      },
      warehouse: {
        name: 'Warehouse',
        description: 'Indoor with crates and cover',
        floorColor: '#5c5c5c',
        skyColor: '#3a3a3a',
        map: [
          [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
          [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1],
          [1, 0, 2, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 2, 0, 1],
          [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
          [1, 0, 0, 0, 0, 0, 0, 2, 2, 0, 0, 0, 0, 0, 0, 1],
          [1, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 1],
          [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
          [1, 0, 0, 2, 0, 0, 0, 0, 0, 0, 0, 0, 2, 0, 0, 1],
          [1, 0, 0, 2, 0, 0, 0, 0, 0, 0, 0, 0, 2, 0, 0, 1],
          [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
          [1, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 1],
          [1, 0, 0, 0, 0, 0, 0, 2, 2, 0, 0, 0, 0, 0, 0, 1],
          [1, 0, 2, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 2, 0, 1],
          [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1],
          [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1],
          [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
        ],
      },
      urban: {
        name: 'Urban',
        description: 'City streets with buildings',
        floorColor: '#654321',
        skyColor: '#87CEEB',
        map: [
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
        ],
      },
      maze: {
        name: 'Maze',
        description: 'Tight corridors and turns',
        floorColor: '#3d3d3d',
        skyColor: '#1a1a2e',
        map: [
          [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
          [1, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 1],
          [1, 0, 1, 0, 1, 0, 1, 1, 1, 1, 0, 1, 0, 1, 0, 1],
          [1, 0, 1, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 1, 0, 1],
          [1, 0, 1, 1, 1, 1, 1, 1, 0, 1, 1, 1, 0, 1, 0, 1],
          [1, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 1, 0, 1],
          [1, 1, 1, 1, 1, 1, 0, 1, 1, 1, 1, 1, 1, 1, 0, 1],
          [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
          [1, 0, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0, 1],
          [1, 0, 1, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 1],
          [1, 0, 1, 0, 1, 1, 1, 1, 0, 1, 0, 1, 1, 1, 1, 1],
          [1, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 1],
          [1, 1, 1, 0, 1, 0, 1, 1, 1, 1, 1, 1, 1, 1, 0, 1],
          [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
          [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
          [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
        ],
      },
    };
  }

  setArena(arenaId) {
    if (this.arenas[arenaId]) {
      this.currentArena = arenaId;
      this.map = this.arenas[arenaId].map;
      return true;
    }
    return false;
  }

  getArenaInfo() {
    const arena = this.arenas[this.currentArena];
    return {
      id: this.currentArena,
      name: arena.name,
      description: arena.description,
    };
  }
}

describe('ArenaSystem', () => {
  let manager;

  beforeEach(() => {
    manager = new MockArenaManager();
  });

  describe('constructor', () => {
    it('should initialize with default arena (urban)', () => {
      expect(manager.currentArena).toBe('urban');
    });

    it('should load the default arena map', () => {
      expect(manager.map).toBeDefined();
      expect(manager.map.length).toBe(16);
      expect(manager.map[0].length).toBe(16);
    });

    it('should have 4 arena configurations', () => {
      const arenaIds = Object.keys(manager.arenas);
      expect(arenaIds).toContain('training');
      expect(arenaIds).toContain('warehouse');
      expect(arenaIds).toContain('urban');
      expect(arenaIds).toContain('maze');
    });
  });

  describe('arena configurations', () => {
    it('should have name and description for each arena', () => {
      Object.values(manager.arenas).forEach((arena) => {
        expect(arena.name).toBeDefined();
        expect(typeof arena.name).toBe('string');
        expect(arena.description).toBeDefined();
        expect(typeof arena.description).toBe('string');
      });
    });

    it('should have floor and sky colors for each arena', () => {
      Object.values(manager.arenas).forEach((arena) => {
        expect(arena.floorColor).toBeDefined();
        expect(arena.skyColor).toBeDefined();
        expect(arena.floorColor).toMatch(/^#[0-9a-fA-F]{6}$/);
        expect(arena.skyColor).toMatch(/^#[0-9a-fA-F]{6}$/);
      });
    });

    it('should have 16x16 map for each arena', () => {
      Object.values(manager.arenas).forEach((arena) => {
        expect(arena.map.length).toBe(16);
        arena.map.forEach((row) => {
          expect(row.length).toBe(16);
        });
      });
    });

    it('should have walls around perimeter of each arena', () => {
      Object.values(manager.arenas).forEach((arena) => {
        // Top and bottom walls
        arena.map[0].forEach((cell) => expect(cell).toBe(1));
        arena.map[15].forEach((cell) => expect(cell).toBe(1));
        // Left and right walls
        for (let i = 0; i < 16; i++) {
          expect(arena.map[i][0]).toBe(1);
          expect(arena.map[i][15]).toBe(1);
        }
      });
    });
  });

  describe('training arena', () => {
    it('should have mostly open space', () => {
      const trainingMap = manager.arenas.training.map;
      let openSpaces = 0;
      for (let y = 1; y < 15; y++) {
        for (let x = 1; x < 15; x++) {
          if (trainingMap[y][x] === 0) openSpaces++;
        }
      }
      // Training should have high open space ratio (>180 out of 196)
      expect(openSpaces).toBeGreaterThan(180);
    });

    it('should have green floor color', () => {
      expect(manager.arenas.training.floorColor).toBe('#4a6741');
    });
  });

  describe('warehouse arena', () => {
    it('should have internal walls', () => {
      const warehouseMap = manager.arenas.warehouse.map;
      let internalWalls = 0;
      for (let y = 1; y < 15; y++) {
        for (let x = 1; x < 15; x++) {
          if (warehouseMap[y][x] === 1) internalWalls++;
        }
      }
      expect(internalWalls).toBeGreaterThan(0);
    });

    it('should have dark indoor colors', () => {
      expect(manager.arenas.warehouse.floorColor).toBe('#5c5c5c');
      expect(manager.arenas.warehouse.skyColor).toBe('#3a3a3a');
    });
  });

  describe('maze arena', () => {
    it('should have many walls for corridors', () => {
      const mazeMap = manager.arenas.maze.map;
      let walls = 0;
      for (let y = 1; y < 15; y++) {
        for (let x = 1; x < 15; x++) {
          if (mazeMap[y][x] === 1) walls++;
        }
      }
      // Maze should have many internal walls (>30)
      expect(walls).toBeGreaterThan(30);
    });

    it('should have dark dungeon colors', () => {
      expect(manager.arenas.maze.floorColor).toBe('#3d3d3d');
      expect(manager.arenas.maze.skyColor).toBe('#1a1a2e');
    });
  });

  describe('setArena', () => {
    it('should switch to valid arena', () => {
      const result = manager.setArena('training');
      expect(result).toBe(true);
      expect(manager.currentArena).toBe('training');
      expect(manager.map).toBe(manager.arenas.training.map);
    });

    it('should return false for invalid arena', () => {
      const result = manager.setArena('invalid');
      expect(result).toBe(false);
      expect(manager.currentArena).toBe('urban'); // Unchanged
    });

    it('should update map when switching arenas', () => {
      const originalMap = manager.map;
      manager.setArena('maze');
      expect(manager.map).not.toBe(originalMap);
      expect(manager.map).toBe(manager.arenas.maze.map);
    });
  });

  describe('getArenaInfo', () => {
    it('should return current arena info', () => {
      const info = manager.getArenaInfo();
      expect(info.id).toBe('urban');
      expect(info.name).toBe('Urban');
      expect(info.description).toBe('City streets with buildings');
    });

    it('should update after arena switch', () => {
      manager.setArena('training');
      const info = manager.getArenaInfo();
      expect(info.id).toBe('training');
      expect(info.name).toBe('Training Room');
    });
  });

  describe('map cell types', () => {
    it('should use 0 for empty space', () => {
      Object.values(manager.arenas).forEach((arena) => {
        let hasEmpty = false;
        arena.map.forEach((row) => {
          row.forEach((cell) => {
            if (cell === 0) hasEmpty = true;
          });
        });
        expect(hasEmpty).toBe(true);
      });
    });

    it('should use 1 for walls', () => {
      Object.values(manager.arenas).forEach((arena) => {
        let hasWall = false;
        arena.map.forEach((row) => {
          row.forEach((cell) => {
            if (cell === 1) hasWall = true;
          });
        });
        expect(hasWall).toBe(true);
      });
    });

    it('should use 2 for buildings/obstacles', () => {
      // Most arenas should have buildings
      const arenasWithBuildings = ['training', 'warehouse', 'urban'];
      arenasWithBuildings.forEach((arenaId) => {
        let hasBuilding = false;
        manager.arenas[arenaId].map.forEach((row) => {
          row.forEach((cell) => {
            if (cell === 2) hasBuilding = true;
          });
        });
        expect(hasBuilding).toBe(true);
      });
    });
  });
});
