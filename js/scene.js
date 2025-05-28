// Scene manager - creates the town environment with Counter-Strike style aesthetics
class SceneManager {
    constructor(scene, physicsWorld) {
        this.scene = scene;
        this.physicsWorld = physicsWorld;
        this.buildings = [];
        
        this.init();
    }
    
    init() {
        this.setupLighting();
        this.createGround();
        this.createTownLayout();
        this.setupSkybox();
    }
    
    setupLighting() {
        // Ambient light for overall illumination
        const ambientLight = new THREE.AmbientLight(0x404040, 0.4);
        this.scene.add(ambientLight);
        
        // Directional light (sun) with shadows
        const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
        directionalLight.position.set(50, 100, 50);
        directionalLight.castShadow = true;
        
        // Configure shadow camera
        directionalLight.shadow.mapSize.width = 2048;
        directionalLight.shadow.mapSize.height = 2048;
        directionalLight.shadow.camera.near = 0.5;
        directionalLight.shadow.camera.far = 200;
        directionalLight.shadow.camera.left = -100;
        directionalLight.shadow.camera.right = 100;
        directionalLight.shadow.camera.top = 100;
        directionalLight.shadow.camera.bottom = -100;
        
        this.scene.add(directionalLight);
        
        // Additional point lights for atmosphere
        const pointLight1 = new THREE.PointLight(0xffa500, 0.5, 30);
        pointLight1.position.set(-20, 10, -20);
        this.scene.add(pointLight1);
        
        const pointLight2 = new THREE.PointLight(0xffa500, 0.5, 30);
        pointLight2.position.set(20, 10, 20);
        this.scene.add(pointLight2);
    }
    
    setupSkybox() {
        // Simple gradient sky using fog
        this.scene.fog = new THREE.Fog(0x87CEEB, 100, 200);
        
        // Create a large sphere for sky backdrop
        const skyGeometry = new THREE.SphereGeometry(180, 32, 32);
        const skyMaterial = new THREE.MeshBasicMaterial({
            color: 0x87CEEB,
            side: THREE.BackSide,
            fog: false
        });
        const sky = new THREE.Mesh(skyGeometry, skyMaterial);
        this.scene.add(sky);
    }
    
    createGround() {
        // Main ground plane
        const groundGeometry = new THREE.PlaneGeometry(200, 200);
        const groundMaterial = new THREE.MeshLambertMaterial({ 
            color: 0x8B7D6B, // Brown/tan color like CS maps
            transparent: true,
            opacity: 0.9
        });
        
        const ground = new THREE.Mesh(groundGeometry, groundMaterial);
        ground.rotation.x = -Math.PI / 2;
        ground.receiveShadow = true;
        ground.userData.type = 'ground';
        this.scene.add(ground);
        
        // Add physics body for ground
        this.physicsWorld.addGround();
        
        // Add some texture variation with additional planes
        this.createGroundDetails();
    }
    
    createGroundDetails() {
        // Create scattered ground patches for visual interest
        const patchGeometry = new THREE.PlaneGeometry(8, 8);
        const patchMaterial = new THREE.MeshLambertMaterial({ 
            color: 0x9B8D7B,
            transparent: true,
            opacity: 0.7
        });
        
        for (let i = 0; i < 15; i++) {
            const patch = new THREE.Mesh(patchGeometry, patchMaterial);
            patch.rotation.x = -Math.PI / 2;
            patch.position.set(
                (Math.random() - 0.5) * 180,
                0.01,
                (Math.random() - 0.5) * 180
            );
            patch.receiveShadow = true;
            this.scene.add(patch);
        }
    }
    
    createTownLayout() {
        // Create a town layout similar to Counter-Strike maps
        this.createMainBuildings();
        this.createWalls();
        this.createProps();
    }
    
    createMainBuildings() {
        // Building configurations (x, z, width, height, depth)
        const buildingConfigs = [
            { pos: [-30, 0, -30], size: [15, 12, 20], color: 0xB19CD9 },
            { pos: [25, 0, -25], size: [18, 15, 15], color: 0xC4A484 },
            { pos: [-35, 0, 25], size: [20, 10, 18], color: 0xD4C5B0 },
            { pos: [30, 0, 30], size: [16, 14, 22], color: 0xB8A68E },
            { pos: [0, 0, -40], size: [12, 8, 12], color: 0xA0956F },
            { pos: [-15, 0, 0], size: [10, 16, 10], color: 0xC0B283 }
        ];
        
        buildingConfigs.forEach((config) => {
            this.createBuilding(
                config.pos[0], config.pos[2], 
                config.size[0], config.size[1], config.size[2],
                config.color
            );
        });
    }
    
    createBuilding(x, z, width, height, depth, color) {
        const geometry = new THREE.BoxGeometry(width, height, depth);
        const material = new THREE.MeshLambertMaterial({ color: color });
        
        const building = new THREE.Mesh(geometry, material);
        building.position.set(x, height / 2, z);
        building.castShadow = true;
        building.receiveShadow = true;
        building.userData.type = 'building';
        
        this.scene.add(building);
        this.buildings.push(building);
        
        // Add physics body
        this.physicsWorld.addBuilding(x, height / 2, z, width, height, depth);
        
        // Add some building details
        this.addBuildingDetails(building, width, height, depth);
    }
    
    addBuildingDetails(building, width, height, depth) {
        // Add windows
        const windowGeometry = new THREE.PlaneGeometry(1.5, 2);
        const windowMaterial = new THREE.MeshBasicMaterial({ 
            color: 0x4A4A4A,
            transparent: true,
            opacity: 0.8
        });
        
        // Front windows
        for (let i = 0; i < Math.floor(width / 4); i++) {
            for (let j = 1; j < Math.floor(height / 3); j++) {
                const window = new THREE.Mesh(windowGeometry, windowMaterial);
                window.position.set(
                    (i - Math.floor(width / 8)) * 3,
                    (j - height / 6) * 3,
                    depth / 2 + 0.01
                );
                building.add(window);
            }
        }
    }
    
    createWalls() {
        // Create perimeter walls and internal barriers
        const wallConfigs = [
            { pos: [-50, 0, 0], size: [2, 8, 80], rotation: 0 },
            { pos: [50, 0, 0], size: [2, 8, 80], rotation: 0 },
            { pos: [0, 0, -50], size: [80, 8, 2], rotation: 0 },
            { pos: [0, 0, 50], size: [80, 8, 2], rotation: 0 },
            // Internal walls for cover
            { pos: [10, 0, 10], size: [2, 6, 15], rotation: 0 },
            { pos: [-10, 0, -10], size: [15, 6, 2], rotation: 0 },
            { pos: [0, 0, 15], size: [8, 5, 2], rotation: 0 }
        ];
        
        wallConfigs.forEach(config => {
            this.createWall(
                config.pos[0], config.pos[1], config.pos[2],
                config.size[0], config.size[1], config.size[2]
            );
        });
    }
    
    createWall(x, y, z, width, height, depth) {
        const geometry = new THREE.BoxGeometry(width, height, depth);
        const material = new THREE.MeshLambertMaterial({ 
            color: 0x8B7355 // Dark brown/concrete color
        });
        
        const wall = new THREE.Mesh(geometry, material);
        wall.position.set(x, y + height / 2, z);
        wall.castShadow = true;
        wall.receiveShadow = true;
        wall.userData.type = 'wall';
        
        this.scene.add(wall);
        
        // Add physics body
        this.physicsWorld.addWall(x, y + height / 2, z, width, height, depth);
    }
    
    createProps() {
        // Add barrels, crates, and other props for cover and atmosphere
        this.createBarrels();
        this.createCrates();
    }
    
    createBarrels() {
        const barrelGeometry = new THREE.CylinderGeometry(1, 1, 3, 8);
        const barrelMaterial = new THREE.MeshLambertMaterial({ color: 0x654321 });
        
        const barrelPositions = [
            [15, 0, 15], [-20, 0, 10], [5, 0, -20], [-5, 0, 35]
        ];
        
        barrelPositions.forEach(pos => {
            const barrel = new THREE.Mesh(barrelGeometry, barrelMaterial);
            barrel.position.set(pos[0], 1.5, pos[1]);
            barrel.castShadow = true;
            barrel.receiveShadow = true;
            barrel.userData.type = 'prop';
            this.scene.add(barrel);
            
            // Add physics body
            this.physicsWorld.addProp(pos[0], 1.5, pos[1], 1, 3, 1);
        });
    }
    
    createCrates() {
        const crateGeometry = new THREE.BoxGeometry(2, 2, 2);
        const crateMaterial = new THREE.MeshLambertMaterial({ color: 0x8B4513 });
        
        const cratePositions = [
            [18, 0, -15], [-15, 0, 20], [8, 0, 25], [-25, 0, -5]
        ];
        
        cratePositions.forEach(pos => {
            const crate = new THREE.Mesh(crateGeometry, crateMaterial);
            crate.position.set(pos[0], 1, pos[1]);
            crate.castShadow = true;
            crate.receiveShadow = true;
            crate.userData.type = 'prop';
            this.scene.add(crate);
            
            // Add physics body
            this.physicsWorld.addProp(pos[0], 1, pos[1], 2, 2, 2);
        });
    }
    
    // Method to get safe spawn positions (away from buildings)
    getSafeSpawnPosition() {
        let attempts = 0;
        while (attempts < 50) {
            const x = (Math.random() - 0.5) * 80;
            const z = (Math.random() - 0.5) * 80;
            
            // Check if position is not inside a building
            let isSafe = true;
            for (const building of this.buildings) {
                const bx = building.position.x;
                const bz = building.position.z;
                const bw = building.geometry.parameters.width / 2;
                const bd = building.geometry.parameters.depth / 2;
                
                if (x > bx - bw - 3 && x < bx + bw + 3 &&
                    z > bz - bd - 3 && z < bz + bd + 3) {
                    isSafe = false;
                    break;
                }
            }
            
            if (isSafe) {
                return { x, z };
            }
            
            attempts++;
        }
        
        // Fallback to origin
        return { x: 0, z: 0 };
    }
}