// Configuration constants
export const CONFIG = {
    // Scene settings
    SCENE: {
        FOV: 75,
        NEAR: 0.1,
        FAR: 8000,
        CAMERA_POSITION: { x: 0, y: 8, z: 15 }
    },
    
    // Renderer settings
    RENDERER: {
        ANTIALIAS: false,
        ALPHA: true,
        SHADOW_MAP_SIZE: 2048,
        TONE_MAPPING_EXPOSURE: 1.2
    },
    
    // Lighting settings
    LIGHTING: {
        AMBIENT_COLOR: 0x404040,
        AMBIENT_INTENSITY: 0.6,
        DIRECTIONAL_COLOR: 0xffffff,
        DIRECTIONAL_INTENSITY: 0.8,
        DIRECTIONAL_POSITION: { x: 15, y: 20, z: 10 },
        HEMISPHERE_SKY_COLOR: 0xffffff,
        HEMISPHERE_GROUND_COLOR: 0xdddddd,
        HEMISPHERE_INTENSITY: 0.45,
        POINT_LIGHT_COLOR: 0xffa500,
        POINT_LIGHT_INTENSITY: 0.4,
        POINT_LIGHT_DISTANCE: 50
    },
    
    // Character settings
    CHARACTER: {
        MOVE_SPEED: 0.35,
        JUMP_FORCE: 0.5,
        GRAVITY: 0.05,
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
};
