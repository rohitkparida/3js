import { AssetPreloader } from './asset-preloader.js';
import { CONFIG } from './config.js';
import { createScene, createCamera, createRenderer, setupLighting } from './scene.js';
import { createPhysicsWorld, createGroundBody, createCharacterBody, stepPhysics } from './physics.js';
import { createCharacter, CharacterController } from './character.js';
import { CameraController } from './camera.js';
import { EnvironmentManager } from './environment.js';
import { CollisionDetector } from './collision-detection.js';
import { Performance } from './performance.js';
import { TextureUtils } from './utils/texture-utils.js';

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
        this.performance = null;
        this._lastShadowCharacterPos = new THREE.Vector3();
        this._shadowRefreshFrames = 0;
        this._lastTime = 0;
        this._deltaTime = 0;
    }
    
    async init() {
        try {
            // Show single loading screen immediately (reuses existing if present)
            this.showSimpleLoadingScreen();

            // Define critical assets for your game (all major 3D models)
            const criticalAssets = [
                'models/mascot.obj',
                'models/mascot.png',
                'models/skybox.glb',
                'models/fountain.glb',     // Large central environment object
                'models/tree.glb',         // Trees used throughout environment
                'models/archway.glb',      // Architectural elements
                'models/restaurant.glb',   // Buildings
                'models/logo.glb',         // Important branding elements
                'models/reporter.gltf',    // Character/object models
                'models/reporter.jpeg',    // Associated textures
                'models/camera.glb',       // Scene objects
                'models/car1.glb',         // Vehicles
                'models/car2.glb'          // More vehicles
            ];

            const allAssets = [
                ...criticalAssets,
                // Add other assets as needed (textures, etc.)
            ];

            // Create and configure preloader (works in background)
            // Calculate correct base path for GitHub Pages
            const isGitHubPages = window.location.hostname.includes('github.io');
            const repoName = '3js';
            const basePath = isGitHubPages && window.location.pathname.includes(`/${repoName}/`)
                ? `/${repoName}/`
                : '';
            this.assetPreloader = new AssetPreloader(basePath);

            // Set up progress and error callbacks
            this.assetPreloader.onProgress = (progress, loaded, total) => {
                this.updateLoadingProgress(progress, loaded, total);
            };

            this.assetPreloader.onError = (error) => {
                console.warn('Asset preloading error:', error);
                // Continue with fallbacks - don't stop the game
            };

            // Start preloading in background (non-blocking)
            console.log('🚀 Starting asset preloading...');
            const startTime = Date.now();
            const preloadResult = await this.assetPreloader.preloadAssets(allAssets, {
                criticalAssets,
                timeout: 30000,
                maxConcurrent: 6,
                retryAttempts: 3
            });

            if (preloadResult.success) {
                console.log('✅ Asset preloading completed successfully');
                console.log(`📊 Preloaded ${preloadResult.loaded}/${preloadResult.total} assets`);
                console.log(`⏱️ Asset preloading took ~${Date.now() - startTime}ms`);
            } else if (preloadResult.criticalFailed) {
                console.warn('⚠️ Critical assets failed to load - using fallbacks');
            } else {
                console.log('✅ Non-critical assets loaded, some optional assets failed');
            }

            console.log('🏗️ Starting scene initialization...');
            const sceneStartTime = Date.now();

            // Initialize game systems (assets are now cached and ready)
            await this.initializeGameSystems();

            // Hide loading screen once everything is ready
            this.hideLoadingScreen();

            console.log(`🏗️ Scene initialization took ~${Date.now() - sceneStartTime}ms`);
            console.log('🎮 Game initialization complete!');

        } catch (error) {
            console.error('💥 Game initialization failed:', error);
            this.showErrorScreen(error.message);
            throw error;
        }
    }

    /**
     * Initialize all game systems after assets are preloaded
     */
    async initializeGameSystems() {
        // Create scene
        this.scene = await createScene();

        // Create camera
        this.camera = createCamera();

        // Create renderer
        const canvas = document.getElementById('canvas');
        if (!canvas) {
            throw new Error('Canvas element not found');
        }
        this.renderer = createRenderer(canvas);

        // Initialize texture utilities with renderer
        TextureUtils.init(this.renderer);

        // Create performance monitor
        this.performance = new Performance();

        // Create physics world
        this.world = createPhysicsWorld();

        // Create ground physics body
        if (this.world) {
            createGroundBody(this.world);
        }

        // Setup lighting after scene is created
        setupLighting(this.scene);

        // Create character (will use preloaded assets)
        this.character = createCharacter();
        this.scene.add(this.character);

        // Create character physics body
        const characterBody = createCharacterBody(this.world);

        // Create character controller with camera for relative movement
        this.characterController = new CharacterController(this.character, characterBody, this.camera);

        // Create camera controller with mouse controls
        this.cameraController = new CameraController(this.camera, this.character, this.renderer.domElement);

        // Create environment manager
        this.environmentManager = new EnvironmentManager(this.scene, this.world);

        // Initialize LOD manager with camera
        this.environmentManager.setCamera(this.camera);

        // Initialize environment
        await this.environmentManager.create();

        // Optimize static objects
        this.optimizeStaticObjects();

        // Create collision detector
        this.collisionDetector = new CollisionDetector();

        // Run initial collision detection
        this.runCollisionDetection();

        // Set up event listeners
        this.setupEventListeners();
    }

    /**
     * Show simple loading screen (reuses existing white loading screen)
     */
    showSimpleLoadingScreen() {
        // Use the existing white loading screen from HTML
        const loadingOverlay = document.getElementById('loading-overlay');
        if (loadingOverlay) {
            loadingOverlay.style.display = 'flex';
        }
    }

    /**
     * Update loading progress display (update existing white progress bar)
     */
    updateLoadingProgress(progress, loaded, total) {
        const progressBar = document.getElementById('loading-progress');
        if (progressBar) {
            const percent = Math.round(progress * 100);
            progressBar.style.width = `${percent}%`;
        }
    }

    /**
     * Hide loading screen
     */
    hideLoadingScreen() {
        const loadingOverlay = document.getElementById('loading-overlay');
        if (loadingOverlay) {
            loadingOverlay.style.display = 'none';
        }
    }

    /**
     * Show error screen if initialization fails
     */
    showErrorScreen(errorMessage) {
        const loadingScreen = document.getElementById('game-loading');
        if (loadingScreen) {
            loadingScreen.innerHTML = `
                <div style="text-align: center; color: #ff6b6b;">
                    <h2>⚠️ Loading Error</h2>
                    <p>${errorMessage}</p>
                    <p>Check console for details</p>
                    <button onclick="location.reload()" style="
                        padding: 10px 20px; margin-top: 20px;
                        background: #ff6b6b; color: white; border: none;
                        border-radius: 5px; cursor: pointer;
                    ">Retry</button>
                </div>
            `;
        }
    }
    
    /**
     * Optimize static objects by disabling matrix auto-update
     */
    optimizeStaticObjects() {
        if (!this.environmentManager) return;
        
        const markStatic = (node) => {
            if (!node) return;
            
            const process = (obj) => {
                if (!obj || !obj.matrixAutoUpdate) return;
                const name = (obj.name || '').toLowerCase();
                const isDynamic = name.includes('vehicle') || 
                                name.includes('car') || 
                                name.includes('reporter') || 
                                name.includes('mascot') || 
                                name.includes('character');
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
        
        // Mark static objects for optimization
        markStatic(this.environmentManager.roads);
        markStatic(this.environmentManager.buildings);
        markStatic(this.environmentManager.trees);
        
        // Mark specific static objects by name
        (this.environmentManager.objects || []).forEach(o => {
            const name = (o && o.name || '').toLowerCase();
            if (name.includes('logo_podium') || name.includes('north_archway')) {
                markStatic(o);
            }
        });
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
    
    update(deltaTime) {
        // Store delta time for this frame
        this._deltaTime = deltaTime || 0.016; // Default to 60fps if no delta time provided
        
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
        
        // Update environment, LODs, and animations
        if (this.environmentManager) {
            this.environmentManager.update(this._deltaTime);
        }
        
        // Update camera
        this.cameraController.update();
    }
    
    render() {
        this.renderer.render(this.scene, this.camera);
    }
    
    animate(timestamp) {
        if (!this.isRunning) return;

        // Calculate delta time
        const currentTime = timestamp || performance.now();
        const deltaTime = this._lastTime ? (currentTime - this._lastTime) / 1000 : 0.016; // In seconds
        this._lastTime = currentTime;

        // Cap delta time to avoid large jumps
        const cappedDeltaTime = Math.min(deltaTime, 0.1); // Cap at 100ms (10fps)

        // Update game state with delta time
        this.update(cappedDeltaTime);
        
        // Render the scene
        this.render();
        
        // Update performance metrics
        this.performance && this.performance.update();

        // After rendering, if we scheduled a brief refresh, count it down
        if (this.renderer?.shadowMap && this._shadowRefreshFrames > 0) {
            this._shadowRefreshFrames--;
            if (this._shadowRefreshFrames === 0) {
                this.renderer.shadowMap.autoUpdate = false;
            }
        }

        // Schedule next frame with proper timing
        const targetFps = CONFIG.RENDERER.TARGET_FPS || 0;
        if (targetFps > 0) {
            const frameMs = 1000 / targetFps;
            setTimeout(() => {
                requestAnimationFrame((ts) => this.animate(ts));
            }, frameMs);
        } else {
            requestAnimationFrame((ts) => this.animate(ts));
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
