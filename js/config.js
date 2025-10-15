// Configuration constants
export const CONFIG = {
    // Scene settings
    SCENE: {
        FOV: 75,
        NEAR: 0.1,
        FAR: 120,
        CAMERA_POSITION: { x: 0, y: 8, z: 15 },
        ENABLE_SKY_DOME: false, // Disabled by default, set to true to enable sky dome
        ENABLE_SKYBOX: false,   // Disabled by default, set to true to enable GLB skybox
        ENABLE_SKY_IMAGE: false // Disabled by default, set to true to enable sky image
    },
    
    // Renderer settings
    RENDERER: {
        ANTIALIAS: false,
        ALPHA: true,
        SHADOW_MAP_SIZE: 1024,
        TONE_MAPPING_EXPOSURE: 1.35, // Balanced exposure between previous (1.2) and current (1.5)
        TARGET_FPS: 0, // 0 = uncapped (uses display refresh); set 30/45/60 to cap
        MOBILE_EFFECTS_REDUCED: true
    },
    
    // Lighting settings
    LIGHTING: {
        AMBIENT_COLOR: 0x484848,          // Balanced ambient color (between 0x404040 and 0x505040)
        AMBIENT_INTENSITY: 0.7,           // Balanced intensity (between 0.6 and 0.8)
        DIRECTIONAL_COLOR: 0xfff2d9,      // Balanced directional light color (between white and warm white)
        DIRECTIONAL_INTENSITY: 0.9,       // Balanced intensity (between 0.8 and 1.0)
        DIRECTIONAL_POSITION: { x: 15, y: 25, z: 10 }, // Higher angle for better shadows
        HEMISPHERE_SKY_COLOR: 0xaaccff,   // Slightly blue sky
        HEMISPHERE_GROUND_COLOR: 0xeeccaa, // Warmer ground
        HEMISPHERE_INTENSITY: 0.6,        // Increased hemisphere intensity
        POINT_LIGHT_COLOR: 0xffcc99,      // Warmer point light
        POINT_LIGHT_INTENSITY: 0.6,       // Increased point light intensity
        POINT_LIGHT_DISTANCE: 60,         // Slightly larger light radius
        USE_EXTRA_LIGHTS: true            // Keep extra lights enabled
    },
    
    // Character settings
    CHARACTER: {
        MOVE_SPEED: 0.35,
        JUMP_FORCE: 0.5,
        GRAVITY: 0.1,
        GROUND_LEVEL: 0.75, // 50% smaller ground level
        JUMP_THRESHOLD: 1.5 // 50% smaller jump threshold
    },
    
    // Physics settings
    PHYSICS: {
        GRAVITY: -9.82,
        SOLVER_ITERATIONS: 10,
        CHARACTER_MASS: 0,
        OBJECT_MASS: 1
    },
    
    // Environment settings
    ENVIRONMENT: {
        TERRAIN_SIZE: 120,
        TERRAIN_SEGMENTS: 60,
        TREE_COUNT: 15,
        CAR_COUNT: 6
    }
    ,
    // Deterministic randomness
    RANDOM: {
        SEED: 12345 // change to get a different but stable layout
    }
};
