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
        this._lastShadowCharacterPos = new THREE.Vector3();
        this._shadowRefreshFrames = 0;
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

        // Ensure shadows are built after environment creation, then freeze
        if (this.renderer && this.renderer.shadowMap) {
            this.renderer.shadowMap.autoUpdate = true;
            this.renderer.shadowMap.needsUpdate = true;
            // Force two frames of shadow updates before freezing
            requestAnimationFrame(() => {
                if (!this.renderer || !this.renderer.shadowMap) return;
                this.renderer.shadowMap.needsUpdate = true;
                requestAnimationFrame(() => {
                    if (!this.renderer || !this.renderer.shadowMap) return;
                    this.renderer.shadowMap.autoUpdate = false;
                });
            });
        }

        // Mark large static groups as non-updating to save CPU
        const markStatic = (node) => {
            if (!node) return;
            const process = (obj) => {
                if (!obj) return;
                if (!obj.matrixAutoUpdate) return;
                const name = (obj.name || '').toLowerCase();
                const isDynamic = name.includes('vehicle') || name.includes('car') || name.includes('reporter') || name.includes('mascot') || name.includes('character');
                if (!isDynamic) {
                    obj.matrixAutoUpdate = false;
                    if (typeof obj.updateMatrix === 'function') obj.updateMatrix();
                }
            };
            if (Array.isArray(node)) {
                node.forEach((n) => markStatic(n));
                return;
            }
            if (node.traverse && typeof node.traverse === 'function') {
                node.traverse(process);
                return;
            }
            if (node.children && Array.isArray(node.children)) {
                node.children.forEach((c) => markStatic(c));
                return;
            }
            // Fallback: single object
            process(node);
        };
        markStatic(this.environmentManager.roads);
        markStatic(this.environmentManager.buildings);
        markStatic(this.environmentManager.trees);
        // Archway and logo podium are in objects; mark non-dynamic ones
        (this.environmentManager.objects || []).forEach(o => {
            const n = (o && o.name || '').toLowerCase();
            if (n.includes('logo_podium') || n.includes('north_archway')) {
                markStatic(o);
            }
        });
        
        // Create collision detector
        this.collisionDetector = new CollisionDetector();
        
        // Run collision detection after environment is created
        this.runCollisionDetection();
        
        // Setup event listeners
        this.setupEventListeners();
        
        // Hide legacy loader if present (overlay fades in main.js)
        const legacy = document.getElementById('loading');
        if (legacy) legacy.style.display = 'none';
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

        // Trigger brief shadow map refresh when the character moves
        if (this.renderer && this.renderer.shadowMap && this.character) {
            const p = this.character.position;
            const moved = this._lastShadowCharacterPos.distanceToSquared(p) > 0.0025; // ~0.05 units
            if (moved) {
                this._lastShadowCharacterPos.copy(p);
                this._shadowRefreshFrames = Math.max(this._shadowRefreshFrames, 2);
                this.renderer.shadowMap.autoUpdate = true;
                this.renderer.shadowMap.needsUpdate = true;
            }
        }
        
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

        // After rendering, if we scheduled a brief refresh, count it down
        if (this.renderer && this.renderer.shadowMap && this._shadowRefreshFrames > 0) {
            this._shadowRefreshFrames -= 1;
            if (this._shadowRefreshFrames === 0) {
                this.renderer.shadowMap.autoUpdate = false;
            }
        }
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
export async function initGame() {
    const game = new Game();
    await game.init();
    game.start();
    return game;
}
