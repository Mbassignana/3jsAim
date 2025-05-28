// Player controller - handles FPS movement, gun rendering, and shooting mechanics
class Player {
    constructor(camera, scene, physicsWorld) {
        this.camera = camera;
        this.scene = scene;
        this.physicsWorld = physicsWorld;
        
        // Movement properties
        this.velocity = new THREE.Vector3();
        this.direction = new THREE.Vector3();
        this.moveForward = false;
        this.moveBackward = false;
        this.moveLeft = false;
        this.moveRight = false;
        this.canJump = false;
        
        // Mouse look
        this.euler = new THREE.Euler(0, 0, 0, 'YXZ');
        this.PI_2 = Math.PI / 2;
        
        // Gun properties
        this.gun = null;
        this.muzzleFlash = null;
        this.isReloading = false;
        this.lastShotTime = 0;
        this.fireRate = 200; // milliseconds between shots
        
        // Raycasting for shooting
        this.raycaster = new THREE.Raycaster();
        this.raycaster.far = 100;
        
        // Physics body
        this.body = null;
        
        // Callback for shooting hits
        this.onShoot = null;
        
        this.init();
    }
    
    init() {
        this.createGun();
        this.setupControls();
        this.createPhysicsBody();
    }
    
    createPhysicsBody() {
        // Create player physics body (capsule-like)
        this.body = this.physicsWorld.addPlayer(
            this.camera.position.x,
            this.camera.position.y,
            this.camera.position.z
        );
    }
    
    createGun() {
        // Create gun group
        this.gun = new THREE.Group();
        
        // Gun barrel
        const barrelGeometry = new THREE.CylinderGeometry(0.05, 0.08, 1.2, 8);
        const barrelMaterial = new THREE.MeshLambertMaterial({ color: 0x2C2C2C });
        const barrel = new THREE.Mesh(barrelGeometry, barrelMaterial);
        barrel.rotation.z = Math.PI / 2;
        barrel.position.set(0.3, -0.3, -0.8);
        this.gun.add(barrel);
        
        // Gun body/receiver
        const bodyGeometry = new THREE.BoxGeometry(0.15, 0.25, 0.8);
        const bodyMaterial = new THREE.MeshLambertMaterial({ color: 0x1A1A1A });
        const gunBody = new THREE.Mesh(bodyGeometry, bodyMaterial);
        gunBody.position.set(0.25, -0.25, -0.4);
        this.gun.add(gunBody);
        
        // Gun grip
        const gripGeometry = new THREE.BoxGeometry(0.1, 0.4, 0.15);
        const gripMaterial = new THREE.MeshLambertMaterial({ color: 0x4A3C28 });
        const grip = new THREE.Mesh(gripGeometry, gripMaterial);
        grip.position.set(0.25, -0.5, -0.1);
        this.gun.add(grip);
        
        // Gun sight
        const sightGeometry = new THREE.BoxGeometry(0.02, 0.1, 0.05);
        const sightMaterial = new THREE.MeshLambertMaterial({ color: 0x666666 });
        const sight = new THREE.Mesh(sightGeometry, sightMaterial);
        sight.position.set(0.25, -0.1, -0.6);
        this.gun.add(sight);
        
        // Create muzzle flash (hidden by default)
        this.createMuzzleFlash();
        
        // Add gun to camera
        this.camera.add(this.gun);
        this.scene.add(this.camera);
    }
    
    createMuzzleFlash() {
        const flashGeometry = new THREE.ConeGeometry(0.2, 0.5, 8);
        const flashMaterial = new THREE.MeshBasicMaterial({ 
            color: 0xFFFF00,
            transparent: true,
            opacity: 0.8
        });
        
        this.muzzleFlash = new THREE.Mesh(flashGeometry, flashMaterial);
        this.muzzleFlash.position.set(0.3, -0.3, -1.4);
        this.muzzleFlash.rotation.z = -Math.PI / 2;
        this.muzzleFlash.visible = false;
        this.gun.add(this.muzzleFlash);
    }
    
    setupControls() {
        // Keyboard controls
        document.addEventListener('keydown', (event) => this.onKeyDown(event));
        document.addEventListener('keyup', (event) => this.onKeyUp(event));
        
        // Mouse controls
        document.addEventListener('mousemove', (event) => this.onMouseMove(event));
        document.addEventListener('click', (event) => this.onMouseClick(event));
        
        // Prevent context menu
        document.addEventListener('contextmenu', (event) => event.preventDefault());
    }
    
    onKeyDown(event) {
        switch (event.code) {
            case 'ArrowUp':
            case 'KeyW':
                this.moveForward = true;
                break;
            case 'ArrowLeft':
            case 'KeyA':
                this.moveLeft = true;
                break;
            case 'ArrowDown':
            case 'KeyS':
                this.moveBackward = true;
                break;
            case 'ArrowRight':
            case 'KeyD':
                this.moveRight = true;
                break;
            case 'Space':
                if (this.canJump) this.jump();
                break;
        }
    }
    
    onKeyUp(event) {
        switch (event.code) {
            case 'ArrowUp':
            case 'KeyW':
                this.moveForward = false;
                break;
            case 'ArrowLeft':
            case 'KeyA':
                this.moveLeft = false;
                break;
            case 'ArrowDown':
            case 'KeyS':
                this.moveBackward = false;
                break;
            case 'ArrowRight':
            case 'KeyD':
                this.moveRight = false;
                break;
        }
    }
    
    onMouseMove(event) {
        if (document.pointerLockElement === document.body) {
            this.euler.setFromQuaternion(this.camera.quaternion);
            
            this.euler.y -= event.movementX * 0.002;
            this.euler.x -= event.movementY * 0.002;
            
            this.euler.x = Math.max(-this.PI_2, Math.min(this.PI_2, this.euler.x));
            
            this.camera.quaternion.setFromEuler(this.euler);
        }
    }
    
    onMouseClick(event) {
        if (document.pointerLockElement === document.body) {
            event.preventDefault();
            this.shoot();
        }
    }
    
    shoot() {
        const currentTime = Date.now();
        if (currentTime - this.lastShotTime < this.fireRate) {
            return; // Rate limiting
        }
        
        this.lastShotTime = currentTime;
        
        // Show muzzle flash
        this.showMuzzleFlash();
        
        // Create ray from camera center
        this.raycaster.setFromCamera(new THREE.Vector2(0, 0), this.camera);
        
        // Find intersections with shootable objects
        const intersects = this.raycaster.intersectObjects(this.scene.children, true);
        
        let hit = null;
        for (const intersect of intersects) {
            const object = intersect.object;
            if (object.userData.type === 'circle' || object.userData.type === 'npc') {
                hit = intersect;
                break;
            }
        }
        
        // Call shoot callback
        if (this.onShoot) {
            this.onShoot(hit);
        }
        
        // Add gun recoil animation
        this.animateRecoil();
    }
    
    showMuzzleFlash() {
        if (this.muzzleFlash) {
            this.muzzleFlash.visible = true;
            
            // Hide muzzle flash after short delay
            setTimeout(() => {
                if (this.muzzleFlash) {
                    this.muzzleFlash.visible = false;
                }
            }, 50);
        }
    }
    
    animateRecoil() {
        // Simple recoil animation
        const originalPosition = this.gun.position.clone();
        const recoilAmount = 0.05;
        
        // Move gun back
        this.gun.position.z += recoilAmount;
        this.gun.rotation.x += 0.02;
        
        // Return to original position
        setTimeout(() => {
            this.gun.position.copy(originalPosition);
            this.gun.rotation.x = 0;
        }, 100);
    }
    
    jump() {
        if (this.body && this.canJump) {
            if (this.body.velocity.y !== undefined) {
                // Cannon.js physics
                this.body.velocity.y = 8;
            } else {
                // Simple physics
                this.body.velocity = this.body.velocity || { x: 0, y: 0, z: 0 };
                this.body.velocity.y = 8;
                this.body.onGround = false;
            }
            this.canJump = false;
        }
    }
    
    update(deltaTime) {
        this.updateMovement(deltaTime);
        this.updatePhysics();
        this.updateGunSway(deltaTime);
    }
    
    updateMovement(deltaTime) {
        const speed = 15;
        
        this.velocity.x -= this.velocity.x * 10.0 * deltaTime;
        this.velocity.z -= this.velocity.z * 10.0 * deltaTime;
        
        this.direction.z = Number(this.moveForward) - Number(this.moveBackward);
        this.direction.x = Number(this.moveRight) - Number(this.moveLeft);
        this.direction.normalize();
        
        if (this.moveForward || this.moveBackward) {
            this.velocity.z -= this.direction.z * speed * deltaTime;
        }
        if (this.moveLeft || this.moveRight) {
            this.velocity.x -= this.direction.x * speed * deltaTime;
        }
        
        // Apply movement to physics body
        if (this.body) {
            const forward = new THREE.Vector3(0, 0, -1);
            forward.applyQuaternion(this.camera.quaternion);
            forward.y = 0;
            forward.normalize();
            
            const right = new THREE.Vector3(1, 0, 0);
            right.applyQuaternion(this.camera.quaternion);
            right.y = 0;
            right.normalize();
            
            const moveVector = new THREE.Vector3();
            moveVector.addScaledVector(forward, this.velocity.z);
            moveVector.addScaledVector(right, this.velocity.x);
            
            // Handle both Cannon.js and simple physics
            if (this.body.velocity) {
                this.body.velocity.x = moveVector.x;
                this.body.velocity.z = moveVector.z;
            } else {
                // Simple physics system
                this.body.velocity = this.body.velocity || { x: 0, y: 0, z: 0 };
                this.body.velocity.x = moveVector.x;
                this.body.velocity.z = moveVector.z;
            }
        }
    }
    
    updatePhysics() {
        if (this.body) {
            // Handle both Cannon.js and simple physics
            if (this.body.position.copy) {
                // Cannon.js physics body
                this.camera.position.copy(this.body.position);
                this.camera.position.y += 0.5; // Eye height offset
                this.canJump = Math.abs(this.body.velocity.y) < 0.1;
            } else {
                // Simple physics body
                this.camera.position.set(
                    this.body.position.x,
                    this.body.position.y + 0.5,
                    this.body.position.z
                );
                this.canJump = this.body.onGround || false;
            }
        }
    }
    
    updateGunSway(deltaTime) {
        // Add subtle gun sway for realism
        const time = Date.now() * 0.001;
        const swayAmount = 0.002;
        
        if (this.gun) {
            this.gun.rotation.x = Math.sin(time * 2) * swayAmount;
            this.gun.rotation.y = Math.cos(time * 1.5) * swayAmount;
        }
    }
    
    reset() {
        // Reset player position and state
        if (this.body) {
            if (this.body.position.set) {
                // Cannon.js physics
                this.body.position.set(0, 2, 5);
                this.body.velocity.set(0, 0, 0);
                this.body.angularVelocity.set(0, 0, 0);
            } else {
                // Simple physics
                this.body.position = { x: 0, y: 2, z: 5 };
                this.body.velocity = { x: 0, y: 0, z: 0 };
                this.body.onGround = false;
            }
        }
        
        this.camera.position.set(0, 1.7, 5);
        this.euler.set(0, 0, 0);
        this.camera.quaternion.setFromEuler(this.euler);
        
        // Reset movement state
        this.moveForward = false;
        this.moveBackward = false;
        this.moveLeft = false;
        this.moveRight = false;
        this.velocity.set(0, 0, 0);
        
        console.log('Player reset');
    }
}