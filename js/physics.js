// Physics world manager using Cannon.js for collision detection
class PhysicsWorld {
    constructor() {
        this.world = null;
        this.bodies = new Map(); // Track physics bodies for game objects
        this.groundBody = null;
        this.playerBody = null;
        
        this.init();
    }
    
    init() {
        // Create physics world
        this.world = new CANNON.World();
        this.world.gravity.set(0, -25, 0); // Earth-like gravity
        this.world.broadphase = new CANNON.NaiveBroadphase();
        this.world.solver.iterations = 10;
        
        // Create default materials and contact materials
        this.setupMaterials();
        
        console.log('Physics world initialized');
    }
    
    setupMaterials() {
        // Create materials for different object types
        this.materials = {
            ground: new CANNON.Material('ground'),
            player: new CANNON.Material('player'),
            building: new CANNON.Material('building'),
            circle: new CANNON.Material('circle'),
            npc: new CANNON.Material('npc')
        };
        
        // Create contact materials (define how materials interact)
        const groundPlayer = new CANNON.ContactMaterial(
            this.materials.ground,
            this.materials.player,
            {
                friction: 0.4,
                restitution: 0.0
            }
        );
        
        const playerBuilding = new CANNON.ContactMaterial(
            this.materials.player,
            this.materials.building,
            {
                friction: 0.8,
                restitution: 0.0
            }
        );
        
        const groundNPC = new CANNON.ContactMaterial(
            this.materials.ground,
            this.materials.npc,
            {
                friction: 0.6,
                restitution: 0.0
            }
        );
        
        const npcBuilding = new CANNON.ContactMaterial(
            this.materials.npc,
            this.materials.building,
            {
                friction: 0.8,
                restitution: 0.1
            }
        );
        
        // Add contact materials to world
        this.world.addContactMaterial(groundPlayer);
        this.world.addContactMaterial(playerBuilding);
        this.world.addContactMaterial(groundNPC);
        this.world.addContactMaterial(npcBuilding);
    }
    
    addGround() {
        // Create ground physics body
        const groundShape = new CANNON.Plane();
        this.groundBody = new CANNON.Body({
            mass: 0, // Static body
            material: this.materials.ground
        });
        this.groundBody.addShape(groundShape);
        this.groundBody.quaternion.setFromEuler(-Math.PI / 2, 0, 0);
        
        this.world.addBody(this.groundBody);
        console.log('Ground physics body added');
    }
    
    addPlayer(x, y, z) {
        // Create player physics body (capsule-like using cylinder)
        const playerShape = new CANNON.Cylinder(0.5, 0.5, 1.8, 8);
        this.playerBody = new CANNON.Body({
            mass: 80, // 80kg player
            material: this.materials.player
        });
        this.playerBody.addShape(playerShape);
        this.playerBody.position.set(x, y, z);
        
        // Prevent player from tipping over
        this.playerBody.fixedRotation = true;
        this.playerBody.updateMassProperties();
        
        this.world.addBody(this.playerBody);
        console.log('Player physics body added');
        
        return this.playerBody;
    }
    
    addBuilding(x, y, z, width, height, depth) {
        // Create building physics body
        const buildingShape = new CANNON.Box(new CANNON.Vec3(width/2, height/2, depth/2));
        const buildingBody = new CANNON.Body({
            mass: 0, // Static body
            material: this.materials.building
        });
        buildingBody.addShape(buildingShape);
        buildingBody.position.set(x, y, z);
        
        this.world.addBody(buildingBody);
        this.bodies.set(`building_${x}_${y}_${z}`, buildingBody);
        
        return buildingBody;
    }
    
    addWall(x, y, z, width, height, depth) {
        // Create wall physics body (same as building but different identifier)
        const wallShape = new CANNON.Box(new CANNON.Vec3(width/2, height/2, depth/2));
        const wallBody = new CANNON.Body({
            mass: 0, // Static body
            material: this.materials.building
        });
        wallBody.addShape(wallShape);
        wallBody.position.set(x, y, z);
        
        this.world.addBody(wallBody);
        this.bodies.set(`wall_${x}_${y}_${z}`, wallBody);
        
        return wallBody;
    }
    
    addProp(x, y, z, width, height, depth) {
        // Create prop physics body (barrels, crates, etc.)
        const propShape = new CANNON.Box(new CANNON.Vec3(width/2, height/2, depth/2));
        const propBody = new CANNON.Body({
            mass: 0, // Static body for now
            material: this.materials.building
        });
        propBody.addShape(propShape);
        propBody.position.set(x, y, z);
        
        this.world.addBody(propBody);
        this.bodies.set(`prop_${x}_${y}_${z}`, propBody);
        
        return propBody;
    }
    
    addCircle(x, y, z, radius) {
        // Create circle physics body (for collision detection, not visual)
        const circleShape = new CANNON.Sphere(radius);
        const circleBody = new CANNON.Body({
            mass: 0, // Static body (circles don't move physically)
            material: this.materials.circle
        });
        circleBody.addShape(circleShape);
        circleBody.position.set(x, y, z);
        
        this.world.addBody(circleBody);
        this.bodies.set(`circle_${x}_${y}_${z}_${Date.now()}`, circleBody);
        
        return circleBody;
    }
    
    removeCircle(circleObject) {
        // Find and remove circle physics body
        const position = circleObject.position;
        const bodyKey = Array.from(this.bodies.keys()).find(key => {
            if (key.startsWith('circle_')) {
                const body = this.bodies.get(key);
                const distance = Math.abs(body.position.x - position.x) + 
                               Math.abs(body.position.y - position.y) + 
                               Math.abs(body.position.z - position.z);
                return distance < 0.1; // Close enough
            }
            return false;
        });
        
        if (bodyKey) {
            const body = this.bodies.get(bodyKey);
            this.world.removeBody(body);
            this.bodies.delete(bodyKey);
        }
    }
    
    addNPC(x, y, z, width, height, depth) {
        // Create NPC physics body
        const npcShape = new CANNON.Box(new CANNON.Vec3(width/2, height/2, depth/2));
        const npcBody = new CANNON.Body({
            mass: 50, // 50kg NPC
            material: this.materials.npc
        });
        npcBody.addShape(npcShape);
        npcBody.position.set(x, y, z);
        
        // Prevent NPCs from tipping over too easily
        npcBody.angularDamping = 0.9;
        npcBody.linearDamping = 0.1;
        
        this.world.addBody(npcBody);
        this.bodies.set(`npc_${x}_${y}_${z}_${Date.now()}`, npcBody);
        
        return npcBody;
    }
    
    removeNPC(npcObject) {
        // Find and remove NPC physics body
        const position = npcObject.position;
        const bodyKey = Array.from(this.bodies.keys()).find(key => {
            if (key.startsWith('npc_')) {
                const body = this.bodies.get(key);
                const distance = Math.abs(body.position.x - position.x) + 
                               Math.abs(body.position.y - position.y) + 
                               Math.abs(body.position.z - position.z);
                return distance < 1.0; // NPCs can move, so larger tolerance
            }
            return false;
        });
        
        if (bodyKey) {
            const body = this.bodies.get(bodyKey);
            this.world.removeBody(body);
            this.bodies.delete(bodyKey);
        }
    }
    
    update(deltaTime) {
        // Step the physics simulation
        const fixedTimeStep = 1.0 / 60.0; // 60 FPS
        const maxSubSteps = 3;
        
        this.world.step(fixedTimeStep, deltaTime, maxSubSteps);
        
        // Update NPC positions from physics (if they have physics bodies)
        this.updateNPCPositions();
    }
    
    updateNPCPositions() {
        // Sync NPC visual positions with physics bodies
        // This is a simplified approach - in a more complex system,
        // you'd maintain direct references between visual and physics objects
        this.bodies.forEach((body, key) => {
            if (key.startsWith('npc_') && body.mass > 0) {
                // Apply some basic constraints to keep NPCs upright
                if (Math.abs(body.quaternion.x) > 0.3 || Math.abs(body.quaternion.z) > 0.3) {
                    // Reset rotation if NPC tips over too much
                    body.quaternion.set(0, body.quaternion.y, 0, body.quaternion.w);
                    body.quaternion.normalize();
                }
                
                // Ensure NPCs don't sink into ground
                if (body.position.y < 0.5) {
                    body.position.y = 0.5;
                    body.velocity.y = Math.max(0, body.velocity.y);
                }
            }
        });
    }
    
    // Raycast for shooting collision detection
    raycast(from, to) {
        const fromVec = new CANNON.Vec3(from.x, from.y, from.z);
        const toVec = new CANNON.Vec3(to.x, to.y, to.z);
        
        const result = new CANNON.RaycastResult();
        const hasHit = this.world.raycastClosest(fromVec, toVec, {}, result);
        
        if (hasHit) {
            return {
                hasHit: true,
                point: new THREE.Vector3(result.hitPointWorld.x, result.hitPointWorld.y, result.hitPointWorld.z),
                normal: new THREE.Vector3(result.hitNormalWorld.x, result.hitNormalWorld.y, result.hitNormalWorld.z),
                body: result.body,
                distance: result.distance
            };
        }
        
        return { hasHit: false };
    }
    
    // Check if a position is valid (not inside a building)
    isPositionValid(x, y, z, radius = 0.5) {
        // Create a temporary sphere to test collision
        const testShape = new CANNON.Sphere(radius);
        const testBody = new CANNON.Body({ mass: 0 });
        testBody.addShape(testShape);
        testBody.position.set(x, y, z);
        
        // Check for collisions with existing bodies
        for (const [key, body] of this.bodies) {
            if (key.startsWith('building_') || key.startsWith('wall_')) {
                const distance = testBody.position.distanceTo(body.position);
                const combinedRadius = radius + 1; // Rough estimation
                
                if (distance < combinedRadius) {
                    return false;
                }
            }
        }
        
        return true;
    }
    
    // Get the ground height at a given x,z position
    getGroundHeight(x, z) {
        // For now, return 0 since we have a flat ground
        // In a more complex terrain system, this would raycast downward
        return 0;
    }
    
    // Reset physics world (remove all dynamic bodies except ground and buildings)
    reset() {
        // Remove all non-static bodies except ground and buildings
        const bodiesToRemove = [];
        
        this.bodies.forEach((body, key) => {
            if (key.startsWith('circle_') || key.startsWith('npc_')) {
                bodiesToRemove.push(key);
            }
        });
        
        bodiesToRemove.forEach(key => {
            const body = this.bodies.get(key);
            this.world.removeBody(body);
            this.bodies.delete(key);
        });
        
        // Reset player if it exists
        if (this.playerBody) {
            this.playerBody.position.set(0, 2, 5);
            this.playerBody.velocity.set(0, 0, 0);
            this.playerBody.angularVelocity.set(0, 0, 0);
        }
        
        console.log('Physics world reset');
    }
    
    // Debug method to visualize physics bodies (for development)
    createDebugRenderer(scene) {
        // This would create wireframe representations of physics bodies
        // Useful for debugging collision detection issues
        // Implementation would depend on specific debugging needs
        console.log('Debug renderer not implemented - physics bodies:', this.bodies.size);
    }
}