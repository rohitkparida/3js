import { CONFIG } from './config.js';

// Scene setup
export function createScene() {
    const scene = new THREE.Scene();
    // Light fog to hide distant detail and reduce overdraw
    try {
        // Fog fully obscures at the far plane; start close to FAR for crisper horizon
        const nearFog = Math.max(CONFIG.SCENE.FAR - 40, CONFIG.SCENE.FAR * 0.7);
        scene.fog = new THREE.Fog(0x87ceeb, nearFog, CONFIG.SCENE.FAR);
    } catch (_) {}
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
    const renderer = new THREE.WebGLRenderer({
        canvas: canvas,
        antialias: CONFIG.RENDERER.ANTIALIAS,
        alpha: CONFIG.RENDERER.ALPHA
    });
    
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap; // smoother shadow filtering
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = CONFIG.RENDERER.TONE_MAPPING_EXPOSURE;
    renderer.outputEncoding = THREE.sRGBEncoding;
    renderer.setClearColor(0x87ceeb, 1); // sky blue
    return renderer;
}

// Soft, distributed lighting setup
export function setupLighting(scene) {
    const ENABLE_SKYBOX = false; // GLB skybox disabled
    const ENABLE_SKY_DOME = false; // fallback dome disabled
    const ENABLE_SKY_IMAGE = false; // image background disabled
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
    
    // Main directional light (sun) - softer
    const directionalLight = new THREE.DirectionalLight(
        CONFIG.LIGHTING.DIRECTIONAL_COLOR,
        CONFIG.LIGHTING.DIRECTIONAL_INTENSITY
    );
    directionalLight.position.set(
        CONFIG.LIGHTING.DIRECTIONAL_POSITION.x,
        Math.max(100, CONFIG.LIGHTING.DIRECTIONAL_POSITION.y),
        CONFIG.LIGHTING.DIRECTIONAL_POSITION.z
    );
    directionalLight.castShadow = true;
    // Balanced quality: slightly higher map size and tighter frustum for better texel density
    directionalLight.shadow.mapSize.width = Math.max(1024, Math.min(2048, 1536));
    directionalLight.shadow.mapSize.height = Math.max(1024, Math.min(2048, 1536));
    directionalLight.shadow.camera.near = 0.5;
    directionalLight.shadow.camera.far = 200;
    directionalLight.shadow.camera.left = -100;
    directionalLight.shadow.camera.right = 100;
    directionalLight.shadow.camera.top = 100;
    directionalLight.shadow.camera.bottom = -100;
    directionalLight.shadow.bias = -0.0002;
    if ('normalBias' in directionalLight.shadow) directionalLight.shadow.normalBias = 0.02;
    // Additional softness for PCFSoft
    if ('radius' in directionalLight.shadow) directionalLight.shadow.radius = 2;
    scene.add(directionalLight);
    
    // Multiple soft point lights distributed across the environment (optional)
    const pointLights = [];
    
    if (CONFIG.LIGHTING.USE_EXTRA_LIGHTS) {
        const mkPoint = (x, z) => {
            const l = new THREE.PointLight(0xffa500, 0.22, 70, 2); // modest intensity, limited distance
            l.position.set(x, 6, z);
            l.castShadow = false;
            scene.add(l);
            pointLights.push(l);
        };
        mkPoint(0, 40);   // North
        mkPoint(0, -40);  // South
        mkPoint(40, 0);   // East
        mkPoint(-40, 0);  // West
    }
    
    // Corner lights for better coverage
    const cornerLights = [];
    if (CONFIG.LIGHTING.USE_EXTRA_LIGHTS) {
        // Very light corner fills for balance at minimal cost
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
    if (CONFIG.LIGHTING.USE_EXTRA_LIGHTS) {
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
    
    // Fallback sky dome (disabled)
    let sky = null;
    if (ENABLE_SKY_DOME) {
        const skyGeometry = new THREE.SphereGeometry(3000, 32, 16);
        const skyMaterial = new THREE.MeshBasicMaterial({ color: 0x87ceeb, side: THREE.BackSide, depthWrite: false });
        sky = new THREE.Mesh(skyGeometry, skyMaterial);
        sky.name = 'fallback_sky_dome';
        scene.add(sky);
    }

    // Optional GLB skybox
    try {
        if (ENABLE_SKYBOX && THREE && THREE.GLTFLoader) {
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
    if (ENABLE_SKY_IMAGE) {
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
