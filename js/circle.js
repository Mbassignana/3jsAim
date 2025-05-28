// Circle manager - handles spawning, colors, and destruction of target circles
class CircleManager {
    constructor(scene, physicsWorld, sceneManager = null) {
        this.scene = scene;
        this.physicsWorld = physicsWorld;
        this.sceneManager = sceneManager;
        this.circles = [];
        this.maxCircles = 12;
        
        // Available colors for circles
        this.colors = [
            0xFF0000, // Red
            0x00FF00, // Green
            0x0000FF, // Blue
            0xFFFF00, // Yellow
            0xFF00FF, // Magenta
            0x00FFFF, // Cyan
            0xFF8000, // Orange
            0x8000FF  // Purple
        ];
        
        this.init();
    }
    
    init() {
        // Pre-create circle geometries and materials for performance
        this.circleGeometry = new THREE.TorusGeometry(1, 0.3, 8, 16);
        this.circleMaterials = this.colors.map(color => 
            new THREE.MeshLambertMaterial({ 
                color: color,
                emissive: color,
                emissiveIntensity: 0.2
            })
        );
    }
    
    spawnCircles(count = 5) {
        for (let i = 0; i < count && this.circles.length < this.maxCircles; i++) {
            this.spawnCircle();
        }
    }
    
    spawnCircle() {
        // Get a safe spawn position from scene manager
        const position = this.sceneManager ? this.sceneManager.getSafeSpawnPosition() : { 
            x: (Math.random() - 0.5) * 60, 
            z: (Math.random() - 0.5) * 60 
        };
        
        // Random height between 1 and 8 meters
        const height = Math.random() * 7 + 1;
        
        // Select random color
        const colorIndex = Math.floor(Math.random() * this.colors.length);
        const material = this.circleMaterials[colorIndex];
        
        // Create circle mesh
        const circle = new THREE.Mesh(this.circleGeometry, material);
        circle.position.set(position.x, height, position.z);
        circle.castShadow = true;
        circle.userData.type = 'circle';
        circle.userData.colorIndex = colorIndex;
        circle.userData.spawnTime = Date.now();
        
        // Add floating animation
        circle.userData.floatOffset = Math.random() * Math.PI * 2;
        circle.userData.floatSpeed = 0.5 + Math.random() * 0.5;
        circle.userData.floatAmplitude = 0.3 + Math.random() * 0.4;
        
        // Add rotation animation
        circle.userData.rotationSpeed = (Math.random() - 0.5) * 2;
        
        this.scene.add(circle);
        this.circles.push(circle);
        
        // Add physics body for collision detection
        this.physicsWorld.addCircle(
            position.x, 
            height, 
            position.z, 
            1 // radius
        );
        
        console.log(`Spawned circle at (${position.x.toFixed(1)}, ${height.toFixed(1)}, ${position.z.toFixed(1)})`);
    }
    
    destroyCircle(circleObject) {
        const index = this.circles.indexOf(circleObject);
        if (index > -1) {
            // Create destruction effect
            this.createDestructionEffect(circleObject);
            
            // Remove from scene
            this.scene.remove(circleObject);
            
            // Remove from array
            this.circles.splice(index, 1);
            
            // Remove physics body
            this.physicsWorld.removeCircle(circleObject);
            
            console.log('Circle destroyed!');
        }
    }
    
    createDestructionEffect(circle) {
        // Create explosion effect with particles
        const particleCount = 15;
        const particles = new THREE.Group();
        
        for (let i = 0; i < particleCount; i++) {
            // Create small particle
            const particleGeometry = new THREE.SphereGeometry(0.05, 4, 4);
            const particleMaterial = new THREE.MeshBasicMaterial({ 
                color: this.colors[circle.userData.colorIndex],
                transparent: true,
                opacity: 0.8
            });
            
            const particle = new THREE.Mesh(particleGeometry, particleMaterial);
            particle.position.copy(circle.position);
            
            // Random velocity
            const velocity = new THREE.Vector3(
                (Math.random() - 0.5) * 10,
                Math.random() * 8 + 2,
                (Math.random() - 0.5) * 10
            );
            particle.userData.velocity = velocity;
            particle.userData.life = 1.0;
            
            particles.add(particle);
        }
        
        this.scene.add(particles);
        
        // Animate particles
        this.animateParticles(particles);
    }
    
    animateParticles(particleGroup) {
        const animate = () => {
            let allDead = true;
            
            particleGroup.children.forEach(particle => {
                if (particle.userData.life > 0) {
                    allDead = false;
                    
                    // Update position
                    particle.position.add(particle.userData.velocity.clone().multiplyScalar(0.016));
                    
                    // Apply gravity
                    particle.userData.velocity.y -= 15 * 0.016;
                    
                    // Fade out
                    particle.userData.life -= 0.016 * 2;
                    particle.material.opacity = particle.userData.life;
                    
                    if (particle.userData.life <= 0) {
                        particle.visible = false;
                    }
                }
            });
            
            if (allDead) {
                this.scene.remove(particleGroup);
            } else {
                requestAnimationFrame(animate);
            }
        };
        
        animate();
    }
    
    update(deltaTime) {
        // Update circle animations
        this.circles.forEach(circle => {
            // Floating animation
            const time = Date.now() * 0.001;
            const floatY = Math.sin(time * circle.userData.floatSpeed + circle.userData.floatOffset) * circle.userData.floatAmplitude;
            circle.position.y += floatY * deltaTime;
            
            // Rotation animation
            circle.rotation.y += circle.userData.rotationSpeed * deltaTime;
            circle.rotation.x += circle.userData.rotationSpeed * 0.5 * deltaTime;
            
            // Pulsing glow effect
            const pulseIntensity = 0.2 + Math.sin(time * 3 + circle.userData.floatOffset) * 0.1;
            circle.material.emissiveIntensity = pulseIntensity;
        });
        
        // Remove old circles (auto-despawn after 60 seconds)
        const currentTime = Date.now();
        this.circles = this.circles.filter(circle => {
            const age = currentTime - circle.userData.spawnTime;
            if (age > 60000) { // 60 seconds
                this.scene.remove(circle);
                this.physicsWorld.removeCircle(circle);
                console.log('Circle auto-despawned (timeout)');
                return false;
            }
            return true;
        });
    }
    
    reset() {
        // Remove all circles
        this.circles.forEach(circle => {
            this.scene.remove(circle);
            this.physicsWorld.removeCircle(circle);
        });
        this.circles = [];
        console.log('Circle manager reset');
    }
    
    // Get count of active circles
    getCircleCount() {
        return this.circles.length;
    }
    
    // Force spawn circles at specific positions (for testing)
    spawnCircleAt(x, y, z, colorIndex = null) {
        if (colorIndex === null) {
            colorIndex = Math.floor(Math.random() * this.colors.length);
        }
        
        const material = this.circleMaterials[colorIndex];
        const circle = new THREE.Mesh(this.circleGeometry, material);
        circle.position.set(x, y, z);
        circle.castShadow = true;
        circle.userData.type = 'circle';
        circle.userData.colorIndex = colorIndex;
        circle.userData.spawnTime = Date.now();
        circle.userData.floatOffset = Math.random() * Math.PI * 2;
        circle.userData.floatSpeed = 0.5 + Math.random() * 0.5;
        circle.userData.floatAmplitude = 0.3 + Math.random() * 0.4;
        circle.userData.rotationSpeed = (Math.random() - 0.5) * 2;
        
        this.scene.add(circle);
        this.circles.push(circle);
        
        this.physicsWorld.addCircle(x, y, z, 1);
        
        return circle;
    }
    
    // Get circles within a certain distance of a point
    getCirclesNear(position, radius) {
        return this.circles.filter(circle => {
            return circle.position.distanceTo(position) <= radius;
        });
    }
}