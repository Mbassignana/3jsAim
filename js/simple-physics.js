// Simplified physics system without Cannon.js dependency
class SimplePhysicsWorld {
    constructor() {
        this.staticBodies = []; // Buildings, walls, etc.
        this.dynamicBodies = []; // Player, NPCs
        this.groundLevel = 0;
        console.log('Simple physics world initialized (no Cannon.js required)');
    }
    
    addGround() {
        // Ground is just at y = 0
        console.log('Simple ground physics added');
    }
    
    addPlayer(x, y, z) {
        const playerBody = {
            position: { x, y, z },
            velocity: { x: 0, y: 0, z: 0 },
            onGround: false,
            type: 'player'
        };
        this.dynamicBodies.push(playerBody);
        console.log('Simple player physics added');
        return playerBody;
    }
    
    addBuilding(x, y, z, width, height, depth) {
        const building = {
            position: { x, y, z },
            size: { width, height, depth },
            type: 'building'
        };
        this.staticBodies.push(building);
        return building;
    }
    
    addWall(x, y, z, width, height, depth) {
        const wall = {
            position: { x, y, z },
            size: { width, height, depth },
            type: 'wall'
        };
        this.staticBodies.push(wall);
        return wall;
    }
    
    addProp(x, y, z, width, height, depth) {
        const prop = {
            position: { x, y, z },
            size: { width, height, depth },
            type: 'prop'
        };
        this.staticBodies.push(prop);
        return prop;
    }
    
    addCircle(x, y, z, radius) {
        // Circles don't need physics bodies in simple version
        return { position: { x, y, z }, radius };
    }
    
    removeCircle(circleObject) {
        // Nothing to do in simple version
    }
    
    addNPC(x, y, z, width, height, depth) {
        const npc = {
            position: { x, y, z },
            velocity: { x: 0, y: 0, z: 0 },
            size: { width, height, depth },
            onGround: false,
            type: 'npc'
        };
        this.dynamicBodies.push(npc);
        return npc;
    }
    
    removeNPC(npcObject) {
        const index = this.dynamicBodies.findIndex(body => body === npcObject);
        if (index > -1) {
            this.dynamicBodies.splice(index, 1);
        }
    }
    
    // Simple collision detection
    checkCollision(body, newPosition) {
        const bodyRadius = 0.5; // Simple radius for collision
        
        for (const staticBody of this.staticBodies) {
            const dx = newPosition.x - staticBody.position.x;
            const dz = newPosition.z - staticBody.position.z;
            const dy = newPosition.y - staticBody.position.y;
            
            // Simple box collision
            const halfWidth = staticBody.size.width / 2 + bodyRadius;
            const halfDepth = staticBody.size.depth / 2 + bodyRadius;
            const halfHeight = staticBody.size.height / 2 + bodyRadius;
            
            if (Math.abs(dx) < halfWidth && 
                Math.abs(dz) < halfDepth && 
                Math.abs(dy) < halfHeight) {
                return true; // Collision detected
            }
        }
        
        return false; // No collision
    }
    
    update(deltaTime) {
        // Update dynamic bodies
        for (const body of this.dynamicBodies) {
            if (body.type === 'player') {
                this.updatePlayer(body, deltaTime);
            } else if (body.type === 'npc') {
                this.updateNPC(body, deltaTime);
            }
        }
    }
    
    updatePlayer(player, deltaTime) {
        // Apply gravity
        if (player.position.y > this.groundLevel + 0.9) {
            player.velocity.y -= 25 * deltaTime; // Gravity
        } else {
            player.position.y = this.groundLevel + 0.9;
            player.velocity.y = 0;
            player.onGround = true;
        }
        
        // Apply velocity with collision checking
        const newPosition = {
            x: player.position.x + player.velocity.x * deltaTime,
            y: player.position.y + player.velocity.y * deltaTime,
            z: player.position.z + player.velocity.z * deltaTime
        };
        
        // Check X movement
        const testX = { ...player.position, x: newPosition.x };
        if (!this.checkCollision(player, testX)) {
            player.position.x = newPosition.x;
        }
        
        // Check Y movement
        const testY = { ...player.position, y: newPosition.y };
        if (!this.checkCollision(player, testY)) {
            player.position.y = newPosition.y;
        } else if (player.velocity.y < 0) {
            player.onGround = true;
            player.velocity.y = 0;
        }
        
        // Check Z movement
        const testZ = { ...player.position, z: newPosition.z };
        if (!this.checkCollision(player, testZ)) {
            player.position.z = newPosition.z;
        }
        
        // Apply damping
        player.velocity.x *= 0.9;
        player.velocity.z *= 0.9;
    }
    
    updateNPC(npc, deltaTime) {
        // Simple NPC physics - just keep on ground
        if (npc.position.y > this.groundLevel) {
            npc.velocity.y -= 25 * deltaTime; // Gravity
            npc.position.y += npc.velocity.y * deltaTime;
        } else {
            npc.position.y = this.groundLevel;
            npc.velocity.y = 0;
            npc.onGround = true;
        }
    }
    
    // Simplified raycast for shooting
    raycast(from, to) {
        // This is a simplified version - in a real physics engine this would be more complex
        return { hasHit: false };
    }
    
    isPositionValid(x, y, z, radius = 0.5) {
        return !this.checkCollision({ type: 'test' }, { x, y, z });
    }
    
    getGroundHeight(x, z) {
        return this.groundLevel;
    }
    
    reset() {
        // Reset dynamic bodies
        this.dynamicBodies = this.dynamicBodies.filter(body => body.type !== 'npc');
        
        // Reset player if exists
        const player = this.dynamicBodies.find(body => body.type === 'player');
        if (player) {
            player.position = { x: 0, y: 2, z: 5 };
            player.velocity = { x: 0, y: 0, z: 0 };
        }
        
        console.log('Simple physics world reset');
    }
}