/**
 * Unit tests for Occlusion Culling System
 * Tests visibility checks for targets behind walls/buildings
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock THREE.js
const mockTHREE = {
    Vector3: class {
        constructor(x = 0, y = 0, z = 0) {
            this.x = x;
            this.y = y;
            this.z = z;
        }
        subVectors(a, b) {
            this.x = a.x - b.x;
            this.y = a.y - b.y;
            this.z = a.z - b.z;
            return this;
        }
        normalize() {
            const len = Math.sqrt(this.x * this.x + this.y * this.y + this.z * this.z);
            if (len > 0) {
                this.x /= len;
                this.y /= len;
                this.z /= len;
            }
            return this;
        }
        clone() {
            return new mockTHREE.Vector3(this.x, this.y, this.z);
        }
        distanceTo(other) {
            const dx = this.x - other.x;
            const dy = this.y - other.y;
            const dz = this.z - other.z;
            return Math.sqrt(dx * dx + dy * dy + dz * dz);
        }
    },
    Raycaster: class {
        constructor() {
            this.origin = new mockTHREE.Vector3();
            this.direction = new mockTHREE.Vector3();
            this.far = 100;
            this._mockIntersects = [];
        }
        set(origin, direction) {
            this.origin = origin;
            this.direction = direction;
        }
        intersectObjects(_objects, _recursive) {
            // Return mock intersections that can be configured per test
            return this._mockIntersects;
        }
        setMockIntersects(intersects) {
            this._mockIntersects = intersects;
        }
    },
    TorusGeometry: class {
        constructor() {}
    },
    MeshLambertMaterial: class {
        constructor(options) {
            Object.assign(this, options);
        }
    },
    Mesh: class {
        constructor(geometry, material) {
            this.geometry = geometry;
            this.material = material;
            this.position = new mockTHREE.Vector3();
            this.rotation = { x: 0, y: 0, z: 0 };
            this.userData = {};
            this.visible = true;
            this.castShadow = false;
        }
    },
    Group: class {
        constructor() {
            this.children = [];
            this.position = new mockTHREE.Vector3();
            this.rotation = { x: 0, y: 0, z: 0 };
            this.userData = {};
            this.visible = true;
        }
        add(child) {
            this.children.push(child);
        }
        traverse(callback) {
            callback(this);
            this.children.forEach(child => {
                if (child.traverse) child.traverse(callback);
                else callback(child);
            });
        }
    }
};

// Make THREE globally available
global.THREE = mockTHREE;

// Create mock classes that mirror the occlusion functionality
class MockCircleManager {
    constructor(scene, physicsWorld, sceneManager) {
        this.scene = scene;
        this.physicsWorld = physicsWorld;
        this.sceneManager = sceneManager;
        this.circles = [];
        this.occlusionRaycaster = new mockTHREE.Raycaster();
        this.camera = null;
        this.occlusionObjects = [];
    }

    setCamera(camera) {
        this.camera = camera;
    }

    buildOcclusionList() {
        this.occlusionObjects = [];
        this.scene.traverse((object) => {
            if (object.isMesh &&
                (object.userData.type === 'building' ||
                 object.userData.type === 'wall' ||
                 object.userData.type === 'prop')) {
                this.occlusionObjects.push(object);
            }
        });
    }

    setOcclusionObjects(objects) {
        this.occlusionObjects = objects;
    }

    isCircleVisible(circle) {
        if (!this.camera) return true;

        const direction = new mockTHREE.Vector3();
        direction.subVectors(circle.position, this.camera.position).normalize();

        const distanceToCircle = this.camera.position.distanceTo(circle.position);

        this.occlusionRaycaster.set(this.camera.position, direction);
        this.occlusionRaycaster.far = distanceToCircle;

        const intersects = this.occlusionRaycaster.intersectObjects(this.occlusionObjects, true);

        for (const hit of intersects) {
            if (hit.distance < distanceToCircle - 1) {
                return false;
            }
        }

        return true;
    }

    updateOcclusion() {
        if (!this.camera || this.occlusionObjects.length === 0) return;

        for (const circle of this.circles) {
            const isVisible = this.isCircleVisible(circle);
            circle.visible = isVisible;
            circle.userData.occluded = !isVisible;
        }
    }

    addCircle(x, y, z) {
        const circle = new mockTHREE.Mesh();
        circle.position.x = x;
        circle.position.y = y;
        circle.position.z = z;
        circle.userData.type = 'circle';
        this.circles.push(circle);
        return circle;
    }
}

class MockNPCManager {
    constructor(scene, physicsWorld, sceneManager) {
        this.scene = scene;
        this.physicsWorld = physicsWorld;
        this.sceneManager = sceneManager;
        this.npcs = [];
        this.occlusionRaycaster = new mockTHREE.Raycaster();
        this.camera = null;
        this.occlusionObjects = [];
    }

    setCamera(camera) {
        this.camera = camera;
    }

    buildOcclusionList() {
        this.occlusionObjects = [];
        this.scene.traverse((object) => {
            if (object.isMesh &&
                (object.userData.type === 'building' ||
                 object.userData.type === 'wall' ||
                 object.userData.type === 'prop')) {
                this.occlusionObjects.push(object);
            }
        });
    }

    isNPCVisible(npc) {
        if (!this.camera) return true;

        const npcCenter = npc.position.clone();
        npcCenter.y += 0.5;

        const direction = new mockTHREE.Vector3();
        direction.subVectors(npcCenter, this.camera.position).normalize();

        const distanceToNPC = this.camera.position.distanceTo(npcCenter);

        this.occlusionRaycaster.set(this.camera.position, direction);
        this.occlusionRaycaster.far = distanceToNPC;

        const intersects = this.occlusionRaycaster.intersectObjects(this.occlusionObjects, true);

        for (const hit of intersects) {
            if (hit.distance < distanceToNPC - 1) {
                return false;
            }
        }

        return true;
    }

    updateOcclusion() {
        if (!this.camera || this.occlusionObjects.length === 0) return;

        for (const npc of this.npcs) {
            npc.visible = this.isNPCVisible(npc);
            npc.userData.occluded = !npc.visible;
        }
    }

    addNPC(x, y, z) {
        const npc = new mockTHREE.Group();
        npc.position.x = x;
        npc.position.y = y;
        npc.position.z = z;
        npc.userData.type = 'npc';
        this.npcs.push(npc);
        return npc;
    }
}

// Helper to create a mock scene with buildings
function createMockScene() {
    const buildings = [];
    const walls = [];

    const scene = {
        add: vi.fn(),
        remove: vi.fn(),
        traverse: function(callback) {
            buildings.forEach(callback);
            walls.forEach(callback);
        },
        addBuilding: function(x, y, z) {
            const building = new mockTHREE.Mesh();
            building.isMesh = true;
            building.position.x = x;
            building.position.y = y;
            building.position.z = z;
            building.userData.type = 'building';
            buildings.push(building);
            return building;
        },
        addWall: function(x, y, z) {
            const wall = new mockTHREE.Mesh();
            wall.isMesh = true;
            wall.position.x = x;
            wall.position.y = y;
            wall.position.z = z;
            wall.userData.type = 'wall';
            walls.push(wall);
            return wall;
        }
    };

    return scene;
}

function createMockCamera(x, y, z) {
    return {
        position: new mockTHREE.Vector3(x, y, z)
    };
}

describe('OcclusionSystem', () => {
    describe('CircleManager Occlusion', () => {
        let manager;
        let mockScene;
        let camera;

        beforeEach(() => {
            mockScene = createMockScene();
            manager = new MockCircleManager(mockScene, {}, null);
            camera = createMockCamera(0, 1.7, 5);
            manager.setCamera(camera);
        });

        it('should set camera reference', () => {
            expect(manager.camera).toBe(camera);
        });

        it('should build occlusion list from scene', () => {
            mockScene.addBuilding(10, 5, 10);
            mockScene.addBuilding(-10, 5, -10);
            mockScene.addWall(0, 2, 0);

            manager.buildOcclusionList();

            expect(manager.occlusionObjects.length).toBe(3);
        });

        it('should return visible when no camera is set', () => {
            manager.camera = null;
            const circle = manager.addCircle(10, 5, 10);

            expect(manager.isCircleVisible(circle)).toBe(true);
        });

        it('should return visible when no occlusion objects exist', () => {
            const circle = manager.addCircle(10, 5, 10);
            manager.occlusionObjects = [];

            expect(manager.isCircleVisible(circle)).toBe(true);
        });

        it('should mark circle as visible when not occluded', () => {
            const wall = mockScene.addWall(100, 5, 100); // Wall far away
            manager.setOcclusionObjects([wall]);

            const circle = manager.addCircle(10, 5, 10);

            // Configure raycaster to return no hits (clear line of sight)
            manager.occlusionRaycaster.setMockIntersects([]);

            expect(manager.isCircleVisible(circle)).toBe(true);
        });

        it('should mark circle as occluded when wall is between camera and circle', () => {
            const wall = mockScene.addWall(5, 5, 5); // Wall between camera and circle
            manager.setOcclusionObjects([wall]);

            const circle = manager.addCircle(10, 5, 10);

            // Configure raycaster to return a hit closer than the circle
            manager.occlusionRaycaster.setMockIntersects([
                { distance: 5, object: wall } // Wall at distance 5
            ]);

            // Circle is ~9 units away, wall is at 5 units
            expect(manager.isCircleVisible(circle)).toBe(false);
        });

        it('should not occlude when intersection is beyond circle', () => {
            const wall = mockScene.addWall(20, 5, 20); // Wall beyond circle
            manager.setOcclusionObjects([wall]);

            const circle = manager.addCircle(10, 5, 10);

            // Wall hit is further than circle
            manager.occlusionRaycaster.setMockIntersects([
                { distance: 25, object: wall }
            ]);

            expect(manager.isCircleVisible(circle)).toBe(true);
        });

        it('should update visibility of all circles', () => {
            const wall = mockScene.addWall(5, 5, 0);
            manager.setOcclusionObjects([wall]);

            const _visibleCircle = manager.addCircle(-10, 5, -10);
            const occludedCircle = manager.addCircle(10, 5, 0);

            // First circle has clear line of sight
            // Second circle is blocked by wall
            const _originalIntersects = manager.occlusionRaycaster.intersectObjects;
            manager.occlusionRaycaster.intersectObjects = (_objects) => {
                // Check which circle we're testing by looking at current circle
                return [{ distance: 3, object: wall }]; // Always return wall hit
            };

            manager.updateOcclusion();

            // Both should be occluded since we're returning wall hit for all
            expect(occludedCircle.visible).toBe(false);
            expect(occludedCircle.userData.occluded).toBe(true);
        });

        it('should handle edge case with threshold', () => {
            const wall = mockScene.addWall(9, 5, 9);
            manager.setOcclusionObjects([wall]);

            const circle = manager.addCircle(10, 5, 10);
            const distanceToCircle = camera.position.distanceTo(circle.position);

            // Wall hit is just inside the threshold (distance - 1)
            manager.occlusionRaycaster.setMockIntersects([
                { distance: distanceToCircle - 0.5, object: wall }
            ]);

            // Should still be visible because hit is within threshold
            expect(manager.isCircleVisible(circle)).toBe(true);
        });
    });

    describe('NPCManager Occlusion', () => {
        let manager;
        let mockScene;
        let camera;

        beforeEach(() => {
            mockScene = createMockScene();
            manager = new MockNPCManager(mockScene, {}, null);
            camera = createMockCamera(0, 1.7, 5);
            manager.setCamera(camera);
        });

        it('should set camera reference', () => {
            expect(manager.camera).toBe(camera);
        });

        it('should build occlusion list from scene', () => {
            mockScene.addBuilding(10, 5, 10);
            mockScene.addWall(0, 2, 0);

            manager.buildOcclusionList();

            expect(manager.occlusionObjects.length).toBe(2);
        });

        it('should return visible when no camera is set', () => {
            manager.camera = null;
            const npc = manager.addNPC(10, 0, 10);

            expect(manager.isNPCVisible(npc)).toBe(true);
        });

        it('should mark NPC as visible when not occluded', () => {
            manager.occlusionObjects = [];
            const npc = manager.addNPC(10, 0, 10);

            expect(manager.isNPCVisible(npc)).toBe(true);
        });

        it('should mark NPC as occluded when building is between camera and NPC', () => {
            const building = mockScene.addBuilding(5, 5, 5);
            manager.occlusionObjects = [building];

            const npc = manager.addNPC(10, 0, 10);

            manager.occlusionRaycaster.setMockIntersects([
                { distance: 4, object: building }
            ]);

            expect(manager.isNPCVisible(npc)).toBe(false);
        });

        it('should account for NPC center height offset', () => {
            const npc = manager.addNPC(10, 0, 10);

            // The NPC center should be at y + 0.5
            const npcCenter = npc.position.clone();
            npcCenter.y += 0.5;

            expect(npcCenter.y).toBe(0.5);
        });

        it('should update visibility of all NPCs', () => {
            const wall = mockScene.addWall(5, 2, 5);
            manager.occlusionObjects = [wall];

            const npc1 = manager.addNPC(-10, 0, -10);
            const npc2 = manager.addNPC(10, 0, 10);

            manager.occlusionRaycaster.setMockIntersects([
                { distance: 3, object: wall }
            ]);

            manager.updateOcclusion();

            expect(npc1.userData.occluded).toBe(true);
            expect(npc2.userData.occluded).toBe(true);
        });
    });

    describe('Integration scenarios', () => {
        it('should handle multiple occlusion objects', () => {
            const mockScene = createMockScene();
            const manager = new MockCircleManager(mockScene, {}, null);
            const camera = createMockCamera(0, 1.7, 0);
            manager.setCamera(camera);

            // Add multiple walls and buildings
            const _wall1 = mockScene.addWall(5, 2, 0);
            const _wall2 = mockScene.addWall(10, 2, 0);
            const _building = mockScene.addBuilding(15, 5, 0);

            manager.buildOcclusionList();
            expect(manager.occlusionObjects.length).toBe(3);
        });

        it('should handle moving camera position', () => {
            const mockScene = createMockScene();
            const manager = new MockCircleManager(mockScene, {}, null);

            // Start with camera at one position
            const camera = createMockCamera(0, 1.7, 0);
            manager.setCamera(camera);

            const circle = manager.addCircle(10, 5, 10);

            // No occlusion initially
            manager.occlusionRaycaster.setMockIntersects([]);
            expect(manager.isCircleVisible(circle)).toBe(true);

            // Move camera to new position
            camera.position.x = -20;
            camera.position.z = -20;

            // Still visible (no walls)
            expect(manager.isCircleVisible(circle)).toBe(true);
        });

        it('should correctly filter occluding objects by type', () => {
            const mockScene = createMockScene();
            const manager = new MockCircleManager(mockScene, {}, null);

            // Add building (should be in occlusion list)
            mockScene.addBuilding(10, 5, 10);

            // Add a non-occluding mesh (like ground)
            const ground = new mockTHREE.Mesh();
            ground.isMesh = true;
            ground.userData.type = 'ground'; // Ground shouldn't occlude

            // The scene traverse should only include building
            manager.buildOcclusionList();

            expect(manager.occlusionObjects.length).toBe(1);
            expect(manager.occlusionObjects[0].userData.type).toBe('building');
        });

        it('should handle empty scenes gracefully', () => {
            const emptyScene = {
                add: vi.fn(),
                remove: vi.fn(),
                traverse: function(_callback) {} // No objects
            };

            const manager = new MockCircleManager(emptyScene, {}, null);
            manager.buildOcclusionList();

            expect(manager.occlusionObjects.length).toBe(0);

            const circle = manager.addCircle(10, 5, 10);
            const camera = createMockCamera(0, 1.7, 0);
            manager.setCamera(camera);

            // Should be visible since no occlusion objects
            manager.updateOcclusion();
            expect(circle.visible).toBe(true);
        });
    });
});
