import { CONFIG } from './config.js';
import { createScene, createCamera, createRenderer, setupLighting } from './scene.js';
import { createPhysicsWorld, createGroundBody, createCharacterBody, stepPhysics } from './physics.js';
import { createCharacter, CharacterController } from './character.js';
import { CameraController } from './camera.js';
import { EnvironmentManager } from './environment.js';
import { CollisionDetector } from './collision-detection.js';

// Main game class
export class Game {
    constructor() {
        this.scene = null;
        this.camera = null;
        this.renderer = null;
        this.world = null;
        this.character = null;
        this.characterController = null;
        this.cameraController = null;
        this.environmentManager = null;
        this.collisionDetector = null;
        this.isRunning = false;
    }
    
    async init() {
        // Create scene
        this.scene = createScene();
        
        // Create camera
        this.camera = createCamera();
        
        // Create renderer
        const canvas = document.getElementById('canvas');
        this.renderer = createRenderer(canvas);
        
        // Setup lighting
        setupLighting(this.scene);
        
        // Create physics world
        this.world = createPhysicsWorld();
        
        // Create ground physics body
        if (this.world) {
            createGroundBody(this.world);
        }
        
        // Create character
        this.character = createCharacter();
        this.scene.add(this.character);
        
        // Create character physics body
        const characterBody = createCharacterBody(this.world);
        
        // Create character controller
        this.characterController = new CharacterController(this.character, characterBody);
        
        // Create camera controller
        this.cameraController = new CameraController(this.camera, this.character);
        
        // Create environment
        this.environmentManager = new EnvironmentManager(this.scene, this.world);
        await this.environmentManager.create();
        
        // Create collision detector
        this.collisionDetector = new CollisionDetector();
        
        // Run collision detection after environment is created
        this.runCollisionDetection();
        
        // Setup event listeners
        this.setupEventListeners();
        
        // Hide loading screen
        document.getElementById('loading').style.display = 'none';
    }
    
    runCollisionDetection() {
        console.log('🔍 Running comprehensive collision detection...');
        
        // Get all objects from environment
        const roads = this.environmentManager.roads || [];
        const buildings = this.environmentManager.buildings || [];
        const trees = this.environmentManager.trees || [];
        const terrain = this.scene.children.find(o => o.userData && o.userData.rocks);
        
        // Add objects to collision detector
        this.collisionDetector.addRoads(roads);
        this.collisionDetector.addBuildings(buildings);
        this.collisionDetector.addTrees(trees);
        if (terrain) this.collisionDetector.addRocksFromTerrain(terrain);
        
        // Detect all collisions
        const collisions = this.collisionDetector.detectAllCollisions();
        
        // Print detailed report
        this.collisionDetector.printDetailedReport();
        
        return collisions;
    }
    
    setupEventListeners() {
        // Handle window resize
        window.addEventListener('resize', () => {
            this.cameraController.handleResize();
            this.renderer.setSize(window.innerWidth, window.innerHeight);
        });
        
        // Handle keyboard events for collision detection
        window.addEventListener('keydown', (event) => {
            if (event.key === 'c' || event.key === 'C') {
                console.log('🔍 Running collision detection on demand...');
                this.runCollisionDetection();
            }
        });
    }
    
    update() {
        // Step physics world
        stepPhysics(this.world);
        
        // Update character
        this.characterController.update();
        
        // Update environment
        this.environmentManager.update();
        
        // Update camera
        this.cameraController.update();
    }
    
    render() {
        this.renderer.render(this.scene, this.camera);
    }
    
    animate() {
        if (!this.isRunning) return;
        
        requestAnimationFrame(() => this.animate());
        
        this.update();
        this.render();
    }
    
    start() {
        this.isRunning = true;
        this.animate();
    }
    
    stop() {
        this.isRunning = false;
    }
}

// Initialize and start the game
export function initGame() {
    const game = new Game();
    game.init();
    game.start();
    return game;
}
