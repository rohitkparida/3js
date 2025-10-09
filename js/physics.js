import { CONFIG } from './config.js';

// Physics world setup
export function createPhysicsWorld() {
    if (typeof CANNON === 'undefined') {
        console.warn('Cannon.js not loaded, using simple physics fallback');
        return null;
    }
    
    const world = new CANNON.World();
    world.gravity.set(0, CONFIG.PHYSICS.GRAVITY, 0);
    
    // Use SAPBroadphase for better performance with many objects
    world.broadphase = new CANNON.SAPBroadphase(world);
    
    // Enable sleeping for better performance
    world.allowSleep = true;
    
    // Optimize solver settings
    world.solver.iterations = Math.min(10, CONFIG.PHYSICS.SOLVER_ITERATIONS); // Reduced from max to min
    world.solver.tolerance = 0.01; // Slightly higher tolerance for better performance
    
    // Optimize broadphase
    world.broadphase.useBoundingBoxes = true;
    world.broadphase.dirty = true;
    
    // Enable sleeping for static bodies by default
    world.defaultContactMaterial.contactEquationStiffness = 1e6;
    world.defaultContactMaterial.contactEquationRelaxation = 4;
    
    return world;
}

// Create ground physics body
export function createGroundBody(world) {
    if (!world) return null;
    
    const groundShape = new CANNON.Plane();
    const groundBody = new CANNON.Body({ 
        mass: 0, // Static body
        shape: groundShape,
        material: new CANNON.Material('groundMaterial')
    });
    
    // Optimize static body
    groundBody.allowSleep = true;
    groundBody.sleepSpeedLimit = 0.1;
    groundBody.sleepTimeLimit = 1;
    
    groundBody.quaternion.setFromAxisAngle(new CANNON.Vec3(1, 0, 0), -Math.PI / 2);
    world.addBody(groundBody);
    
    return groundBody;
}

// Create character physics body
export function createCharacterBody(world, position = { x: 0, y: 5, z: 0 }) {
    if (!world) return null;
    
    const characterShape = new CANNON.Sphere(0.4); // 50% smaller physics body
    // Use a dynamic body so it collides with static walls
    const characterBody = new CANNON.Body({ mass: 1 });
    characterBody.addShape(characterShape);
    characterBody.position.set(position.x, position.y, position.z);
    characterBody.type = CANNON.Body.DYNAMIC;
    characterBody.linearDamping = 0.4; // Less damping for snappier movement
    characterBody.angularDamping = 0.9;
    
    world.addBody(characterBody);
    return characterBody;
}

// Create physics body for object
export function createObjectBody(world, object) {
    if (!world || !object) return null;
    
    let shape;
    const box = new THREE.Box3().setFromObject(object);
    const size = box.getSize(new THREE.Vector3());
    
    // For buildings (groups), use the bounding box
    if (object.isGroup || object.children.length > 0) {
        shape = new CANNON.Box(new CANNON.Vec3(size.x/2, size.y/2, size.z/2));
    } else if (object.geometry instanceof THREE.BoxGeometry) {
        shape = new CANNON.Box(new CANNON.Vec3(size.x/2, size.y/2, size.z/2));
    } else if (object.geometry instanceof THREE.SphereGeometry) {
        shape = new CANNON.Sphere(size.x/2);
    } else if (object.geometry instanceof THREE.CylinderGeometry) {
        shape = new CANNON.Cylinder(size.x/2, size.x/2, size.y, 8);
    } else {
        shape = new CANNON.Box(new CANNON.Vec3(size.x/2, size.y/2, size.z/2));
    }
    
    const body = new CANNON.Body({ mass: CONFIG.PHYSICS.OBJECT_MASS });
    body.addShape(shape);
    body.position.set(object.position.x, object.position.y, object.position.z);
    body.quaternion.setFromAxisAngle(new CANNON.Vec3(0, 1, 0), object.rotation.y);
    
    // Make buildings static (don't move)
    body.type = CANNON.Body.KINEMATIC;
    body.mass = 0;
    
    world.addBody(body);
    return body;
}

// Step physics world
export function stepPhysics(world, deltaTime = 1/60) {
    if (world) {
        world.step(deltaTime);
    }
}
