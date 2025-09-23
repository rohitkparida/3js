import { CONFIG } from './config.js';

// Scene setup
export function createScene() {
    const scene = new THREE.Scene();
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
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
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
    directionalLight.shadow.mapSize.width = CONFIG.RENDERER.SHADOW_MAP_SIZE;
    directionalLight.shadow.mapSize.height = CONFIG.RENDERER.SHADOW_MAP_SIZE;
    directionalLight.shadow.camera.near = 0.5;
    directionalLight.shadow.camera.far = 500;
    directionalLight.shadow.camera.left = -200;
    directionalLight.shadow.camera.right = 200;
    directionalLight.shadow.camera.top = 200;
    directionalLight.shadow.camera.bottom = -200;
    directionalLight.shadow.bias = -0.0001;
    scene.add(directionalLight);
    
    // Multiple soft point lights distributed across the environment
    const pointLights = [];
    
    // North area light
    const northLight = new THREE.PointLight(0xffa500, 0.25, 200);
    northLight.position.set(0, 6, 40);
    northLight.castShadow = false;
    scene.add(northLight);
    pointLights.push(northLight);
    
    // South area light
    const southLight = new THREE.PointLight(0xffa500, 0.25, 200);
    southLight.position.set(0, 6, -40);
    southLight.castShadow = false;
    scene.add(southLight);
    pointLights.push(southLight);
    
    // East area light
    const eastLight = new THREE.PointLight(0xffa500, 0.25, 200);
    eastLight.position.set(40, 6, 0);
    eastLight.castShadow = false;
    scene.add(eastLight);
    pointLights.push(eastLight);
    
    // West area light
    const westLight = new THREE.PointLight(0xffa500, 0.25, 200);
    westLight.position.set(-40, 6, 0);
    westLight.castShadow = false;
    scene.add(westLight);
    pointLights.push(westLight);
    
    // Corner lights for better coverage
    const cornerLights = [];
    const cornerPositions = [
        { x: 30, z: 30 },
        { x: -30, z: 30 },
        { x: 30, z: -30 },
        { x: -30, z: -30 }
    ];
    
    cornerPositions.forEach(pos => {
        const cornerLight = new THREE.PointLight(0xffa500, 0.2, 30);
        cornerLight.position.set(pos.x, 5, pos.z);
        cornerLight.castShadow = false;
        scene.add(cornerLight);
        cornerLights.push(cornerLight);
    });
    
    // Soft fill lights from multiple directions
    const fillLights = [];
    
    // North fill light
    const northFill = new THREE.DirectionalLight(0x87ceeb, 0.2);
    northFill.position.set(0, 8, 20);
    scene.add(northFill);
    fillLights.push(northFill);
    
    // South fill light
    const southFill = new THREE.DirectionalLight(0x87ceeb, 0.2);
    southFill.position.set(0, 8, -20);
    scene.add(southFill);
    fillLights.push(southFill);
    
    // East fill light
    const eastFill = new THREE.DirectionalLight(0x87ceeb, 0.2);
    eastFill.position.set(20, 8, 0);
    scene.add(eastFill);
    fillLights.push(eastFill);
    
    // West fill light
    const westFill = new THREE.DirectionalLight(0x87ceeb, 0.2);
    westFill.position.set(-20, 8, 0);
    scene.add(westFill);
    fillLights.push(westFill);
    
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
