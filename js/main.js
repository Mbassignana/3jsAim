// Main game controller - coordinates all game systems
class Game {
    constructor() {
        this.scene = null;
        this.camera = null;
        this.renderer = null;
        this.physicsWorld = null;
        this.player = null;
        this.sceneManager = null;
        this.circleManager = null;
        this.npcManager = null;
        this.ui = null;
        
        this.gameState = 'menu'; // 'menu', 'playing', 'ended'
        this.gameTime = 120; // 2 minutes in seconds
        this.score = 0;
        this.isRunning = false;
        
        this.clock = new THREE.Clock();
        this.lastTime = 0;
        
        this.spawnTimer = 0;
        this.spawnInterval = 30; // Spawn new circles every 30 seconds
    }
    
    init() {
        try {
            console.log('Setting up renderer...');
            this.setupRenderer();
            
            console.log('Setting up camera...');
            this.setupCamera();
            
            console.log('Initializing physics...');
            this.initializePhysics();
            
            console.log('Initializing managers...');
            this.initializeManagers();
            
            console.log('Setting up event listeners...');
            this.setupEventListeners();
            
            console.log('Initializing UI...');
            this.ui = new UIManager();
            
            console.log('Starting render loop...');
            // Start render loop
            this.animate();
            
            console.log('Game initialization complete!');
        } catch (error) {
            console.error('Error during game initialization:', error);
            throw error;
        }
    }
    
    setupRenderer() {
        const canvas = document.getElementById('renderer');
        this.renderer = new THREE.WebGLRenderer({ 
            canvas: canvas,
            antialias: true 
        });
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.setClearColor(0x87CEEB); // Sky blue background
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    }
    
    setupCamera() {
        this.camera = new THREE.PerspectiveCamera(
            75, 
            window.innerWidth / window.innerHeight, 
            0.1, 
            1000
        );
        this.camera.position.set(0, 1.7, 5); // Eye level height
    }
    
    initializePhysics() {
        this.physicsWorld = new PhysicsWorld();
    }
    
    initializeManagers() {
        this.scene = new THREE.Scene();
        this.sceneManager = new SceneManager(this.scene, this.physicsWorld);
        this.player = new Player(this.camera, this.scene, this.physicsWorld);
        this.circleManager = new CircleManager(this.scene, this.physicsWorld, this.sceneManager);
        this.npcManager = new NPCManager(this.scene, this.physicsWorld, this.sceneManager);

        // Setup occlusion culling for circles and NPCs (hidden behind walls)
        this.circleManager.setCamera(this.camera);
        this.circleManager.buildOcclusionList();
        this.npcManager.setCamera(this.camera);
        this.npcManager.buildOcclusionList();

        // Setup raycasting for shooting
        this.player.onShoot = (hit) => this.handleShoot(hit);
    }
    
    setupEventListeners() {
        window.addEventListener('resize', () => this.onWindowResize());
        
        // Pointer lock for FPS controls
        document.addEventListener('click', () => {
            if (this.gameState === 'playing') {
                document.body.requestPointerLock();
            }
        });
    }
    
    onWindowResize() {
        this.camera.aspect = window.innerWidth / window.innerHeight;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(window.innerWidth, window.innerHeight);
    }
    
    startGame() {
        this.gameState = 'playing';
        this.gameTime = 120;
        this.score = 0;
        this.spawnTimer = 0;
        this.isRunning = true;
        
        // Reset managers
        this.circleManager.reset();
        this.npcManager.reset();
        this.player.reset();
        
        // Spawn initial objects
        this.circleManager.spawnCircles(8);
        this.npcManager.spawnNPCs(5);
        
        // Update UI
        this.ui.showGameUI();
        this.ui.updateScore(this.score);
        this.ui.updateTimer(this.gameTime);
        
        // Request pointer lock
        document.body.requestPointerLock();
        
        console.log('Game started!');
    }
    
    endGame() {
        this.gameState = 'ended';
        this.isRunning = false;
        
        // Exit pointer lock
        if (document.pointerLockElement) {
            document.exitPointerLock();
        }
        
        // Show end screen
        this.ui.showEndScreen(this.score);
        
        console.log('Game ended! Final score:', this.score);
    }
    
    restartGame() {
        this.gameState = 'menu';
        this.ui.showMenu();
        console.log('Game restarted!');
    }
    
    handleShoot(hit) {
        if (!hit || !this.isRunning) return;
        
        const object = hit.object;
        
        // Check if hit a circle
        if (object.userData.type === 'circle') {
            this.score += 10;
            this.circleManager.destroyCircle(object);
            this.ui.updateScore(this.score);
            this.ui.showMessage('+10 Points!', 1000, '#00ff00');
            console.log('Hit circle! Score:', this.score);
        }
        // Check if hit an NPC
        else if (object.userData.type === 'npc') {
            this.score -= 1;
            // Don't remove NPCs when shot, just penalize
            this.ui.updateScore(this.score);
            this.ui.showMessage('-1 Point', 1000, '#ff0000');
            console.log('Hit NPC! Score:', this.score);
        }
    }
    
    update(deltaTime) {
        if (!this.isRunning) return;

        // Update physics
        this.physicsWorld.update(deltaTime);

        // Update player
        this.player.update(deltaTime);

        // Update circles (animations, occlusion, auto-despawn)
        this.circleManager.update(deltaTime);

        // Update NPCs
        this.npcManager.update(deltaTime);

        // Update spawn timer
        this.spawnTimer += deltaTime;
        if (this.spawnTimer >= this.spawnInterval) {
            this.circleManager.spawnCircles(3); // Spawn 3 new circles
            this.spawnTimer = 0;
        }

        // Update game timer
        this.gameTime -= deltaTime;
        this.ui.updateTimer(Math.max(0, this.gameTime));

        if (this.gameTime <= 0) {
            this.endGame();
        }
    }
    
    animate() {
        requestAnimationFrame(() => this.animate());
        
        const currentTime = this.clock.getElapsedTime();
        const deltaTime = currentTime - this.lastTime;
        this.lastTime = currentTime;
        
        this.update(deltaTime);
        this.renderer.render(this.scene, this.camera);
    }
}

// Global game instance
let game;

// Global functions called from HTML
function startGame() {
    if (game) {
        game.startGame();
    }
}

function restartGame() {
    if (game) {
        game.restartGame();
    }
}

// Initialize game when page loads
window.addEventListener('load', () => {
    // Wait a bit for libraries to fully load
    setTimeout(() => {
        try {
            // Check if required libraries are available
            if (typeof THREE === 'undefined') {
                throw new Error('THREE.js library not loaded');
            }
            if (typeof CANNON === 'undefined') {
                throw new Error('CANNON.js library not loaded');
            }
            
            console.log('Starting game initialization...');
            game = new Game();
            game.init();
            console.log('3jsAim game initialized successfully!');
        } catch (error) {
            console.error('Failed to initialize game:', error);
            alert('Failed to load game. Error: ' + error.message + '\nPlease check the browser console for details.');
        }
    }, 100); // Small delay to ensure libraries are loaded
});