import { CONFIG } from './config.js';
import { TextureUtils } from './utils/texture-utils.js';

// Scene setup
export async function createScene() {
    const scene = new THREE.Scene();
    // Light fog to hide distant detail and reduce overdraw
    try {
        // Fog fully obscures at the far plane; start close to FAR for crisper horizon
        const nearFog = Math.max(CONFIG.SCENE.FAR - 40, CONFIG.SCENE.FAR * 0.7);
        scene.fog = new THREE.Fog(0x87ceeb, nearFog, CONFIG.SCENE.FAR);
    } catch (_) {}
    
    // Load a test texture (for demonstration)
    // Uncomment to test texture loading
    // await loadTestTexture(scene);
    
    // Detect mobile for reduced effects
    const isMobile = /Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    
    // Softer ambient light
    const ambientLight = new THREE.AmbientLight(
        CONFIG.LIGHTING.AMBIENT_COLOR,
        CONFIG.LIGHTING.AMBIENT_INTENSITY
    );
    scene.add(ambientLight);
    
    // Hemisphere light for realistic sky/ground lighting
    const hemisphereLight = new THREE.HemisphereLight(
        CONFIG.LIGHTING.HEMISPHERE_SKY_COLOR,
        CONFIG.LIGHTING.HEMISPHERE_GROUND_COLOR,
        CONFIG.LIGHTING.HEMISPHERE_INTENSITY
    );
    scene.add(hemisphereLight);
    
    // Main directional light (sun) with optimized shadows
    const directionalLight = new THREE.DirectionalLight(
        CONFIG.LIGHTING.DIRECTIONAL_COLOR,
        CONFIG.LIGHTING.DIRECTIONAL_INTENSITY
    );
    directionalLight.position.set(
        CONFIG.LIGHTING.DIRECTIONAL_POSITION.x,
        Math.max(100, CONFIG.LIGHTING.DIRECTIONAL_POSITION.y),
        CONFIG.LIGHTING.DIRECTIONAL_POSITION.z
    );
    
    // Enable shadows with optimized settings
    directionalLight.castShadow = true;
    
    // Dynamic shadow quality based on device
    const isHighEndDevice = !isMobile && window.devicePixelRatio > 1;
    const shadowMapSize = isMobile ? 512 : (isHighEndDevice ? 2048 : 1024);
    
    // Set shadow map properties
    directionalLight.shadow.mapSize.width = shadowMapSize;
    directionalLight.shadow.mapSize.height = shadowMapSize;
    
    // Optimize shadow camera frustum
    directionalLight.shadow.camera.near = 1;
    directionalLight.shadow.camera.far = 150; // Reduced from 200
    
    // Tighten shadow frustum to cover just the visible area
    const shadowDistance = 50; // How far shadows should be visible
    directionalLight.shadow.camera.left = -shadowDistance;
    directionalLight.shadow.camera.right = shadowDistance;
    directionalLight.shadow.camera.top = shadowDistance;
    directionalLight.shadow.camera.bottom = -shadowDistance;
    
    // Optimize shadow quality
    directionalLight.shadow.bias = -0.001; // Reduced from -0.0002 to reduce shadow acne
    if ('normalBias' in directionalLight.shadow) {
        directionalLight.shadow.normalBias = 0.05; // Helps with shadow acne
    }
    
    scene.add(directionalLight);
    
    // Add a small fill light to reduce harsh shadows
    const fillLight = new THREE.DirectionalLight(0xffffff, 0.3);
    fillLight.position.set(-50, 30, 30);
    scene.add(fillLight);
    
    return scene;
}

// Camera setup
export function createCamera() {
    const camera = new THREE.PerspectiveCamera(
        CONFIG.SCENE.FOV,
        window.innerWidth / window.innerHeight,
        CONFIG.SCENE.NEAR,
        CONFIG.SCENE.FAR
    );
    
    camera.position.set(
        CONFIG.SCENE.CAMERA_POSITION.x,
        CONFIG.SCENE.CAMERA_POSITION.y,
        CONFIG.SCENE.CAMERA_POSITION.z
    );
    
    return camera;
}

// Renderer setup
export function createRenderer(canvas) {
    // Detect device capabilities
    const isMobile = /Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    const isHighEndDevice = !isMobile && window.devicePixelRatio > 1;
    
    // Optimize WebGL context creation
    const contextAttributes = {
        alpha: CONFIG.RENDERER.ALPHA,
        antialias: isHighEndDevice && CONFIG.RENDERER.ANTIALIAS, // Only enable antialias on high-end devices
        powerPreference: 'high-performance',
        stencil: false,
        depth: true,
        failIfMajorPerformanceCaveat: true
    };

    // Create renderer with optimized settings
    const renderer = new THREE.WebGLRenderer({
        canvas: canvas,
        ...contextAttributes
    });
    
    // Set size with DPR consideration
    const pixelRatio = isMobile ? Math.min(window.devicePixelRatio, 1.0) : Math.min(window.devicePixelRatio, 2.0);
    renderer.setPixelRatio(pixelRatio);
    renderer.setSize(window.innerWidth, window.innerHeight);
    
    // Enable and configure shadows
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = isMobile ? THREE.BasicShadowMap : THREE.PCFSoftShadowMap;
    
    // Optimize renderer settings
    renderer.autoClear = true;
    renderer.sortObjects = true; // Important for transparency
    renderer.autoClearDepth = true;
    renderer.autoClearStencil = false;
    renderer.autoClearColor = true;
    
    // Tone mapping and output encoding
    renderer.toneMapping = THREE.ReinhardToneMapping; // More vibrant than ACESFilmic
    renderer.toneMappingExposure = CONFIG.RENDERER.TONE_MAPPING_EXPOSURE;
    renderer.outputEncoding = THREE.sRGBEncoding;
    
    // Enable gamma correction for more accurate colors
    renderer.gammaFactor = 2.2;
    renderer.gammaOutput = true;
    
    // Enable WebGL 2.0 features if available
    if (renderer.capabilities.isWebGL2) {
        // Enable EXT_color_buffer_float for HDR rendering
        renderer.extensions.get('EXT_color_buffer_float');
        // Enable OES_texture_float_linear for better texture filtering
        renderer.extensions.get('OES_texture_float_linear');
    }
    
    // Set clear color (sky blue)
    renderer.setClearColor(0x87ceeb, 1);
    
    // Log WebGL capabilities for debugging
    console.log('WebGL Renderer:', renderer.info.render);
    console.log('Max Texture Size:', renderer.capabilities.maxTextureSize);
    console.log('Max Anisotropy:', renderer.capabilities.maxAnisotropy);
    return renderer;
}

// Soft, distributed lighting setup
/**
 * Test texture loading and optimization
 * @param {THREE.Scene} scene - The scene to add the test object to
 * @returns {Promise<THREE.Mesh|null>} The created plane mesh or null if failed
 */
async function loadTestTexture(scene) {
    try {
        // Create a simple test plane with a texture
        const geometry = new THREE.PlaneGeometry(5, 5);
        
        // Load and optimize texture
        const texture = await TextureUtils.loadTexture('textures/test-texture.jpg', {
            generateMipmaps: true,
            anisotropy: 4
        });
        
        const material = new THREE.MeshStandardMaterial({
            map: texture,
            side: THREE.DoubleSide
        });
        
        const plane = new THREE.Mesh(geometry, material);
        plane.rotation.x = -Math.PI / 2; // Make it horizontal
        plane.position.y = 0.1; // Slightly above ground to avoid z-fighting
        plane.receiveShadow = true;
        scene.add(plane);
        
        console.log('Test texture loaded and optimized');
        
        // Log texture memory usage (for debugging)
        setTimeout(() => {
            TextureUtils.debug.logMemoryUsage();
        }, 1000);
        
        return plane;
    } catch (error) {
        console.error('Failed to load test texture:', error);
        return null;
    }
}

// Setup lighting for the scene
export function setupLighting(scene) {
    // Initialize light arrays
    const pointLights = [];
    const cornerLights = [];
    
    // Detect mobile for reduced effects
    const isMobile = /Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    
    // Softer ambient light
    const ambientLight = new THREE.AmbientLight(
        CONFIG.LIGHTING.AMBIENT_COLOR,
        CONFIG.LIGHTING.AMBIENT_INTENSITY
    );
    scene.add(ambientLight);
    
    // Hemisphere light for realistic sky/ground lighting
    const hemisphereLight = new THREE.HemisphereLight(
        CONFIG.LIGHTING.HEMISPHERE_SKY_COLOR,
        CONFIG.LIGHTING.HEMISPHERE_GROUND_COLOR,
        CONFIG.LIGHTING.HEMISPHERE_INTENSITY
    );
    scene.add(hemisphereLight);
    
    // Main directional light (sun) with optimized shadows
    const directionalLight = new THREE.DirectionalLight(
        CONFIG.LIGHTING.DIRECTIONAL_COLOR,
        CONFIG.LIGHTING.DIRECTIONAL_INTENSITY
    );
    directionalLight.position.set(
        CONFIG.LIGHTING.DIRECTIONAL_POSITION.x,
        Math.max(100, CONFIG.LIGHTING.DIRECTIONAL_POSITION.y),
        CONFIG.LIGHTING.DIRECTIONAL_POSITION.z
    );
    
    // Enable shadows with optimized settings
    directionalLight.castShadow = true;
    
    // Dynamic shadow quality based on device
    const isHighEndDevice = !isMobile && window.devicePixelRatio > 1;
    const shadowMapSize = isMobile ? 512 : (isHighEndDevice ? 2048 : 1024);
    
    // Set shadow map properties
    directionalLight.shadow.mapSize.width = shadowMapSize;
    directionalLight.shadow.mapSize.height = shadowMapSize;
    directionalLight.shadow.bias = -0.001;
    
    if ('normalBias' in directionalLight.shadow) {
        directionalLight.shadow.normalBias = 0.05;
    }
    
    // Optimize shadow camera frustum
    directionalLight.shadow.camera.near = 1;
    directionalLight.shadow.camera.far = 150;
    
    // Tighten shadow frustum to cover just the visible area
    const shadowDistance = 50;
    directionalLight.shadow.camera.left = -shadowDistance;
    directionalLight.shadow.camera.right = shadowDistance;
    directionalLight.shadow.camera.top = shadowDistance;
    directionalLight.shadow.camera.bottom = -shadowDistance;
    
    // Update the shadow camera's projection matrix
    directionalLight.shadow.camera.updateProjectionMatrix();
    
    // Additional softness for PCFSoft
    if ('radius' in directionalLight.shadow) {
        directionalLight.shadow.radius = 2;
    }
    
    scene.add(directionalLight);
    
    // Multiple soft point lights distributed across the environment (optional)
    if (CONFIG.LIGHTING.USE_EXTRA_LIGHTS && !isMobile) {
        // Main directional lights
        const mkPoint = (x, z) => {
            const l = new THREE.PointLight(0xffa500, 0.22, 70, 2);
            l.position.set(x, 6, z);
            l.castShadow = false;
            scene.add(l);
            pointLights.push(l);
        };
        
        mkPoint(0, 40);   // North
        mkPoint(0, -40);  // South
        mkPoint(40, 0);   // East
        mkPoint(-40, 0);  // West
        
        // Corner lights for better coverage
        const mkCorner = (x, z) => {
            const c = new THREE.PointLight(0xffe0a0, 0.08, 20, 2);
            c.position.set(x, 5, z);
            c.castShadow = false;
            scene.add(c);
            cornerLights.push(c);
        };
        
        mkCorner(30, 30);
        mkCorner(-30, 30);
        mkCorner(30, -30);
        mkCorner(-30, -30);
    }
    
    // Soft fill lights from multiple directions
    const fillLights = [];
    if (CONFIG.LIGHTING.USE_EXTRA_LIGHTS && !isMobile) {
        // Re-introduce very soft directional fills to improve shading without much cost
        const mkFill = (x, z) => {
            const d = new THREE.DirectionalLight(0x87ceeb, 0.12);
            d.position.set(x, 8, z);
            d.castShadow = false;
            scene.add(d);
            fillLights.push(d);
        };
        mkFill(0, 20);    // North
        mkFill(0, -20);   // South
        mkFill(20, 0);    // East
        mkFill(-20, 0);   // West
    }
    
    // Fallback sky dome (disabled by default)
    let sky = null;
    if (CONFIG.SCENE.ENABLE_SKY_DOME) {
        const skyGeometry = new THREE.SphereGeometry(3000, 32, 16);
        const skyMaterial = new THREE.MeshBasicMaterial({ color: 0x87ceeb, side: THREE.BackSide, depthWrite: false });
        sky = new THREE.Mesh(skyGeometry, skyMaterial);
        sky.name = 'fallback_sky_dome';
        scene.add(sky);
    }

    // Optional GLB skybox
    try {
        if (CONFIG.SCENE.ENABLE_SKYBOX && THREE && THREE.GLTFLoader) {
            const loader = new THREE.GLTFLoader();
            loader.load(
                'models/skybox.glb',
                (gltf) => {
                    const skybox = gltf.scene;
                    // Ensure materials render as a backdrop without killing embedded textures
                    skybox.traverse((child) => {
                        if (child.isMesh && child.material) {
                            const m = child.material;
                            // Keep existing maps/shaders; just make it always visible
                            m.side = THREE.DoubleSide; // support planes, not only shells
                            m.depthTest = false;
                            m.depthWrite = false;
                            m.toneMapped = false;
                            m.fog = false;
                            // Do NOT override color or map; preserve GLB textures
                            child.castShadow = false;
                            child.receiveShadow = false;
                        }
                    });
                    // Auto-center and scale to huge radius
                    const box = new THREE.Box3().setFromObject(skybox);
                    const size = box.getSize(new THREE.Vector3());
                    const center = box.getCenter(new THREE.Vector3());
                    skybox.position.sub(center); // center at origin
                    const maxDim = Math.max(size.x, size.y, size.z) || 1;
                    const desired = 4000; // very large
                    const s = desired / maxDim;
                    skybox.scale.setScalar(s);
                    skybox.renderOrder = -1;
                    skybox.frustumCulled = false;
                    // Prefer GLB over fallbacks
                    const fallback = scene.getObjectByName('fallback_sky_dome');
                    if (fallback) scene.remove(fallback);
                    scene.background = null;
                    scene.add(skybox);
                    console.log('✅ Skybox GLB added to scene');
                },
                undefined,
                (err) => {
                    console.warn('⚠️ Skybox GLB failed to load:', err?.message || err);
                }
            );
        } else {
            console.warn('⚠️ GLTFLoader not available for skybox');
        }
    } catch (e) {
        console.warn('⚠️ Skybox setup error:', e);
    }

    // Image background fallback (JPG/PNG)
    if (CONFIG.SCENE.ENABLE_SKY_IMAGE) {
        try {
            const texLoader = new THREE.TextureLoader();
            const candidates = ['models/skybox.jpg', 'models/skybox.png', 'models/sky.jpg', 'models/sky.png'];
            const tryNext = (i) => {
                if (i >= candidates.length) return;
                texLoader.load(
                    candidates[i],
                    (tex) => {
                        tex.colorSpace = THREE.SRGBColorSpace;
                        scene.background = tex;
                        console.log('✅ Sky image set as scene background:', candidates[i]);
                    },
                    undefined,
                    () => tryNext(i + 1)
                );
            };
            tryNext(0);
        } catch (e) {
            console.warn('⚠️ Sky image setup error:', e);
        }
    }

    return { 
        ambientLight, 
        hemisphereLight, 
        directionalLight, 
        pointLights,
        cornerLights,
        fillLights,
        sky
    };
}
