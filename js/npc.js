// NPC manager - handles animal NPCs with roaming behavior
class NPCManager {
    constructor(scene, physicsWorld, sceneManager = null) {
        this.scene = scene;
        this.physicsWorld = physicsWorld;
        this.sceneManager = sceneManager;
        this.npcs = [];
        this.maxNPCs = 8;
        
        // NPC types with different models and behaviors
        this.npcTypes = [
            {
                name: 'pig',
                color: 0xFFB6C1,
                size: { width: 1.2, height: 0.8, depth: 1.6 },
                speed: 2,
                wanderRadius: 15
            },
            {
                name: 'sheep',
                color: 0xF5F5DC,
                size: { width: 1.0, height: 1.0, depth: 1.4 },
                speed: 1.5,
                wanderRadius: 12
            },
            {
                name: 'cow',
                color: 0x654321,
                size: { width: 1.5, height: 1.2, depth: 2.0 },
                speed: 1,
                wanderRadius: 10
            }
        ];
        
        this.init();
    }
    
    init() {
        // Pre-create geometries for different NPC types
        this.createNPCGeometries();
    }
    
    createNPCGeometries() {
        this.npcGeometries = {};
        this.npcMaterials = {};
        
        this.npcTypes.forEach(type => {
            // Create simple animal-like geometry
            this.npcGeometries[type.name] = this.createAnimalGeometry(type);
            this.npcMaterials[type.name] = new THREE.MeshLambertMaterial({ 
                color: type.color 
            });
        });
    }
    
    createAnimalGeometry(type) {
        const group = new THREE.Group();
        
        // Body
        const bodyGeometry = new THREE.BoxGeometry(
            type.size.width, 
            type.size.height, 
            type.size.depth
        );
        const body = new THREE.Mesh(bodyGeometry);
        body.position.y = type.size.height / 2;
        group.add(body);
        
        // Head
        const headSize = type.size.height * 0.6;
        const headGeometry = new THREE.BoxGeometry(headSize, headSize, headSize);
        const head = new THREE.Mesh(headGeometry);
        head.position.set(0, type.size.height * 0.8, type.size.depth / 2 + headSize / 2);
        group.add(head);
        
        // Legs
        const legGeometry = new THREE.CylinderGeometry(0.1, 0.1, type.size.height * 0.6);
        const legPositions = [
            [-type.size.width * 0.3, 0, -type.size.depth * 0.3],
            [type.size.width * 0.3, 0, -type.size.depth * 0.3],
            [-type.size.width * 0.3, 0, type.size.depth * 0.3],
            [type.size.width * 0.3, 0, type.size.depth * 0.3]
        ];
        
        legPositions.forEach(pos => {
            const leg = new THREE.Mesh(legGeometry);
            leg.position.set(pos[0], type.size.height * 0.3, pos[2]);
            group.add(leg);
        });
        
        // Tail (simple)
        if (type.name !== 'cow') {
            const tailGeometry = new THREE.SphereGeometry(0.15, 6, 6);
            const tail = new THREE.Mesh(tailGeometry);
            tail.position.set(0, type.size.height * 0.7, -type.size.depth / 2 - 0.2);
            group.add(tail);
        }
        
        return group;
    }
    
    spawnNPCs(count = 3) {
        for (let i = 0; i < count && this.npcs.length < this.maxNPCs; i++) {
            this.spawnNPC();
        }
    }
    
    spawnNPC() {
        // Get a safe spawn position
        const position = this.sceneManager ? this.sceneManager.getSafeSpawnPosition() : {
            x: (Math.random() - 0.5) * 40,
            z: (Math.random() - 0.5) * 40
        };
        
        // Select random NPC type
        const npcType = this.npcTypes[Math.floor(Math.random() * this.npcTypes.length)];
        
        // Create NPC
        const npc = this.createNPC(npcType, position.x, position.z);
        
        this.scene.add(npc);
        this.npcs.push(npc);
        
        console.log(`Spawned ${npcType.name} at (${position.x.toFixed(1)}, ${position.z.toFixed(1)})`);
    }
    
    createNPC(type, x, z) {
        // Clone the geometry group
        const geometry = this.npcGeometries[type.name].clone();
        const material = this.npcMaterials[type.name];
        
        // Apply material to all meshes in the group
        geometry.traverse(child => {
            if (child instanceof THREE.Mesh) {
                child.material = material;
                child.castShadow = true;
                child.receiveShadow = true;
            }
        });
        
        // Position the NPC
        geometry.position.set(x, 0, z);
        
        // Set user data
        geometry.userData.type = 'npc';
        geometry.userData.npcType = type.name;
        geometry.userData.speed = type.speed;
        geometry.userData.wanderRadius = type.wanderRadius;
        geometry.userData.spawnTime = Date.now();
        geometry.userData.spawnPosition = new THREE.Vector3(x, 0, z);
        
        // Movement AI properties
        geometry.userData.targetPosition = new THREE.Vector3(x, 0, z);
        geometry.userData.isMoving = false;
        geometry.userData.moveTimer = 0;
        geometry.userData.idleTimer = Math.random() * 3; // Random initial idle time
        geometry.userData.direction = new THREE.Vector3();
        
        // Animation properties
        geometry.userData.walkCycle = Math.random() * Math.PI * 2;
        geometry.userData.headBob = Math.random() * Math.PI * 2;
        
        // Add physics body
        this.physicsWorld.addNPC(
            x, type.size.height / 2, z,
            type.size.width, type.size.height, type.size.depth
        );
        
        return geometry;
    }
    
    update(deltaTime) {
        this.npcs.forEach(npc => {
            this.updateNPCBehavior(npc, deltaTime);
            this.updateNPCAnimation(npc, deltaTime);
        });
    }
    
    updateNPCBehavior(npc, deltaTime) {
        const userData = npc.userData;
        
        if (!userData.isMoving) {
            // Idle state - wait before choosing new target
            userData.idleTimer -= deltaTime;
            
            if (userData.idleTimer <= 0) {
                // Choose new random target within wander radius
                this.chooseNewTarget(npc);
                userData.isMoving = true;
                userData.moveTimer = 2 + Math.random() * 3; // Move for 2-5 seconds
            }
        } else {
            // Moving state
            userData.moveTimer -= deltaTime;
            
            // Move towards target
            const currentPos = npc.position.clone();
            const targetPos = userData.targetPosition.clone();
            const direction = targetPos.sub(currentPos).normalize();
            
            // Apply movement
            const moveDistance = userData.speed * deltaTime;
            npc.position.add(direction.multiplyScalar(moveDistance));
            
            // Face movement direction
            if (direction.length() > 0.1) {
                const angle = Math.atan2(direction.x, direction.z);
                npc.rotation.y = angle;
            }
            
            // Check if reached target or timer expired
            const distanceToTarget = npc.position.distanceTo(userData.targetPosition);
            if (distanceToTarget < 0.5 || userData.moveTimer <= 0) {
                userData.isMoving = false;
                userData.idleTimer = 1 + Math.random() * 4; // Idle for 1-5 seconds
            }
        }
    }
    
    chooseNewTarget(npc) {
        const userData = npc.userData;
        const spawnPos = userData.spawnPosition;
        const wanderRadius = userData.wanderRadius;
        
        // Generate random target within wander radius
        const angle = Math.random() * Math.PI * 2;
        const distance = Math.random() * wanderRadius;
        
        const targetX = spawnPos.x + Math.cos(angle) * distance;
        const targetZ = spawnPos.z + Math.sin(angle) * distance;
        
        userData.targetPosition.set(targetX, 0, targetZ);
    }
    
    updateNPCAnimation(npc, deltaTime) {
        const userData = npc.userData;
        const time = Date.now() * 0.001;
        
        // Walking animation
        if (userData.isMoving) {
            userData.walkCycle += deltaTime * 4;
            
            // Bob up and down
            const bobAmount = Math.sin(userData.walkCycle) * 0.1;
            npc.position.y = bobAmount;
            
            // Slight body rotation for walking
            npc.rotation.z = Math.sin(userData.walkCycle) * 0.05;
        } else {
            // Idle animations
            userData.headBob += deltaTime * 2;
            
            // Subtle head movements
            npc.children.forEach(child => {
                if (child.position.z > 0) { // Likely the head
                    child.rotation.y = Math.sin(userData.headBob) * 0.1;
                }
            });
        }
        
        // Breathing effect
        const breathScale = 1 + Math.sin(time * 3 + userData.spawnTime * 0.001) * 0.02;
        npc.scale.y = breathScale;
    }
    
    // Remove NPC when shot (called from game)
    removeNPC(npcObject) {
        const index = this.npcs.indexOf(npcObject);
        if (index > -1) {
            // Create death effect
            this.createDeathEffect(npcObject);
            
            // Remove from scene
            this.scene.remove(npcObject);
            
            // Remove from array
            this.npcs.splice(index, 1);
            
            // Remove physics body
            this.physicsWorld.removeNPC(npcObject);
            
            console.log(`${npcObject.userData.npcType} removed`);
        }
    }
    
    createDeathEffect(npc) {
        // Simple death effect - puff of smoke
        const smokeGeometry = new THREE.SphereGeometry(2, 8, 8);
        const smokeMaterial = new THREE.MeshBasicMaterial({
            color: 0x666666,
            transparent: true,
            opacity: 0.5
        });
        
        const smoke = new THREE.Mesh(smokeGeometry, smokeMaterial);
        smoke.position.copy(npc.position);
        smoke.position.y += 1;
        
        this.scene.add(smoke);
        
        // Animate smoke dissipation
        let opacity = 0.5;
        const fadeOut = () => {
            opacity -= 0.02;
            smoke.material.opacity = opacity;
            smoke.scale.multiplyScalar(1.02);
            
            if (opacity > 0) {
                requestAnimationFrame(fadeOut);
            } else {
                this.scene.remove(smoke);
            }
        };
        
        fadeOut();
    }
    
    reset() {
        // Remove all NPCs
        this.npcs.forEach(npc => {
            this.scene.remove(npc);
            this.physicsWorld.removeNPC(npc);
        });
        this.npcs = [];
        console.log('NPC manager reset');
    }
    
    // Get count of active NPCs
    getNPCCount() {
        return this.npcs.length;
    }
    
    // Get NPCs within a certain distance of a point
    getNPCsNear(position, radius) {
        return this.npcs.filter(npc => {
            return npc.position.distanceTo(position) <= radius;
        });
    }
    
    // Force spawn NPC at specific position (for testing)
    spawnNPCAt(x, z, typeName = null) {
        if (typeName && !this.npcTypes.find(type => type.name === typeName)) {
            typeName = null;
        }
        
        const npcType = typeName ? 
            this.npcTypes.find(type => type.name === typeName) :
            this.npcTypes[Math.floor(Math.random() * this.npcTypes.length)];
        
        const npc = this.createNPC(npcType, x, z);
        this.scene.add(npc);
        this.npcs.push(npc);
        
        return npc;
    }
}