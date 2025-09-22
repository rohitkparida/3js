// Scene setup
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
const renderer = new THREE.WebGLRenderer({ 
    canvas: document.getElementById('canvas'), 
    antialias: true,
    alpha: true
});

// Physics world setup (fallback if CANNON is not available)
let world, groundBody, characterBody, objectBodies = [];

if (typeof CANNON !== 'undefined') {
    world = new CANNON.World();
    world.gravity.set(0, -9.82, 0);
    world.broadphase = new CANNON.NaiveBroadphase();
    world.solver.iterations = 10;
} else {
    console.warn('Cannon.js not loaded, using simple physics fallback');
}

// Renderer configuration
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.2;
renderer.outputEncoding = THREE.sRGBEncoding;

// Camera position
camera.position.set(0, 8, 15);

// Lighting setup
const ambientLight = new THREE.AmbientLight(0x404040, 0.6);
scene.add(ambientLight);

const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
directionalLight.position.set(10, 10, 5);
directionalLight.castShadow = true;
directionalLight.shadow.mapSize.width = 2048;
directionalLight.shadow.mapSize.height = 2048;
directionalLight.shadow.camera.near = 0.5;
directionalLight.shadow.camera.far = 50;
directionalLight.shadow.camera.left = -20;
directionalLight.shadow.camera.right = 20;
directionalLight.shadow.camera.top = 20;
directionalLight.shadow.camera.bottom = -20;
scene.add(directionalLight);

// Create base terrain
const landGeometry = new THREE.PlaneGeometry(200, 200, 100, 100);
landGeometry.rotateX(-Math.PI / 2);

// Add gentle height variation
const vertices = landGeometry.attributes.position.array;
for (let i = 0; i < vertices.length; i += 3) {
    const x = vertices[i];
    const z = vertices[i + 2];
    
    // Create gentle hills and valleys
    const height = 
        Math.sin(x * 0.02) * Math.cos(z * 0.02) * 1 +
        Math.sin(x * 0.05) * Math.cos(z * 0.05) * 0.5 +
        Math.sin(Math.sqrt(x * x + z * z) * 0.01) * 0.3;
    
    vertices[i + 1] = height;
}
landGeometry.attributes.position.needsUpdate = true;
landGeometry.computeVertexNormals();

// Create grass material
const landMaterial = new THREE.MeshLambertMaterial({
    color: 0x4a7c59,
    side: THREE.DoubleSide
});

// Create land mesh
const land = new THREE.Mesh(landGeometry, landMaterial);
land.receiveShadow = true;
land.castShadow = true;
scene.add(land);

// Create ground physics body
if (typeof CANNON !== 'undefined') {
    const groundShape = new CANNON.Plane();
    groundBody = new CANNON.Body({ mass: 0 });
    groundBody.addShape(groundShape);
    groundBody.quaternion.setFromAxisAngle(new CANNON.Vec3(1, 0, 0), -Math.PI / 2);
    world.addBody(groundBody);
}

// Create environment objects
const objects = [];

// Create roads
function createRoad(x, z, width, length, rotation = 0) {
    const roadGeometry = new THREE.BoxGeometry(width, 0.1, length);
    const roadMaterial = new THREE.MeshLambertMaterial({ color: 0x333333 });
    const road = new THREE.Mesh(roadGeometry, roadMaterial);
    road.position.set(x, 0.05, z);
    road.rotation.y = rotation;
    road.receiveShadow = true;
    scene.add(road);
    
    // Add white dashed lines
    const lineGeometry = new THREE.BoxGeometry(width * 0.8, 0.02, 0.2);
    const lineMaterial = new THREE.MeshLambertMaterial({ color: 0xffffff });
    for (let i = -length/2; i < length/2; i += 2) {
        const line = new THREE.Mesh(lineGeometry, lineMaterial);
        line.position.set(x, 0.06, z + i);
        line.rotation.y = rotation;
        scene.add(line);
    }
}

// Create realistic road network
// Main arterial roads (wider, more important)
createRoad(0, 0, 10, 140, 0); // Main Street (horizontal)
createRoad(0, 0, 10, 140, Math.PI/2); // Central Avenue (vertical)

// Secondary roads (medium width)
createRoad(-40, 0, 6, 80, 0); // West Street
createRoad(40, 0, 6, 80, 0); // East Street
createRoad(0, -40, 6, 80, Math.PI/2); // South Avenue
createRoad(0, 40, 6, 80, Math.PI/2); // North Avenue

// Residential streets (narrower)
createRoad(-20, 20, 4, 30, 0); // Oak Street
createRoad(20, 20, 4, 30, 0); // Pine Street
createRoad(-20, -20, 4, 30, 0); // Maple Street
createRoad(20, -20, 4, 30, 0); // Elm Street

// Cul-de-sacs
createRoad(-50, 30, 3, 20, 0); // Dead end street
createRoad(50, -30, 3, 20, 0); // Another dead end

// Create realistic roundabout at main intersection
const roundaboutGeometry = new THREE.CylinderGeometry(12, 12, 0.1, 16);
const roundaboutMaterial = new THREE.MeshLambertMaterial({ color: 0x333333 });
const roundabout = new THREE.Mesh(roundaboutGeometry, roundaboutMaterial);
roundabout.position.set(0, 0.05, 0);
roundabout.receiveShadow = true;
scene.add(roundabout);

// Create buildings
function createBuilding(x, z, width, height, depth, color, roofColor = 0x666666) {
    // Building base
    const buildingGeometry = new THREE.BoxGeometry(width, height, depth);
    const buildingMaterial = new THREE.MeshLambertMaterial({ color: color });
    const building = new THREE.Mesh(buildingGeometry, buildingMaterial);
    building.position.set(x, height/2, z);
    building.castShadow = true;
    building.receiveShadow = true;
    scene.add(building);
    
    // Roof
    const roofGeometry = new THREE.BoxGeometry(width + 0.5, 0.5, depth + 0.5);
    const roofMaterial = new THREE.MeshLambertMaterial({ color: roofColor });
    const roof = new THREE.Mesh(roofGeometry, roofMaterial);
    roof.position.set(x, height + 0.25, z);
    roof.castShadow = true;
    roof.receiveShadow = true;
    scene.add(roof);
    
    // Windows
    const windowGeometry = new THREE.BoxGeometry(1, 1.5, 0.1);
    const windowMaterial = new THREE.MeshLambertMaterial({ color: 0x87CEEB });
    const window1 = new THREE.Mesh(windowGeometry, windowMaterial);
    window1.position.set(x - width/3, height/2, z + depth/2 + 0.05);
    scene.add(window1);
    
    const window2 = new THREE.Mesh(windowGeometry, windowMaterial);
    window2.position.set(x + width/3, height/2, z + depth/2 + 0.05);
    scene.add(window2);
    
    return building;
}

// COMMERCIAL DISTRICT (Main Street area)
// Large office building (downtown)
const officeBuilding = createBuilding(-10, 10, 15, 12, 10, 0xFFD700, 0x666666);

// Shopping center
const shoppingCenter = createBuilding(10, 10, 20, 8, 15, 0x87CEEB, 0x666666);

// Bank
const bank = createBuilding(0, 5, 8, 6, 6, 0x0000FF, 0x666666);

// Restaurant
const restaurant = createBuilding(-5, 15, 6, 4, 8, 0xFF8C00, 0x666666);

// RESIDENTIAL DISTRICT (Side streets)
// Houses on Oak Street
const house1 = createBuilding(-25, 25, 6, 5, 8, 0x8B4513, 0x654321);
const house2 = createBuilding(-15, 25, 6, 5, 8, 0x228B22, 0x654321);
const house3 = createBuilding(-5, 25, 6, 5, 8, 0xDC143C, 0x654321);

// Houses on Pine Street
const house4 = createBuilding(15, 25, 6, 5, 8, 0xFFD700, 0x654321);
const house5 = createBuilding(25, 25, 6, 5, 8, 0x4169E1, 0x654321);

// Houses on Maple Street
const house6 = createBuilding(-25, -25, 6, 5, 8, 0xFF69B4, 0x654321);
const house7 = createBuilding(-15, -25, 6, 5, 8, 0x32CD32, 0x654321);

// Houses on Elm Street
const house8 = createBuilding(15, -25, 6, 5, 8, 0xFF4500, 0x654321);
const house9 = createBuilding(25, -25, 6, 5, 8, 0x9370DB, 0x654321);

// INDUSTRIAL DISTRICT (Outer areas)
// Warehouse
const warehouse = createBuilding(-50, 0, 20, 8, 15, 0x708090, 0x666666);

// Factory
const factory = createBuilding(50, 0, 18, 10, 12, 0x696969, 0x666666);

// Gas station
const gasStation = createBuilding(0, -15, 8, 4, 6, 0xFF0000, 0x666666);

// PUBLIC SPACES
// Park with playground
const playground = createBuilding(0, 30, 12, 2, 12, 0x90EE90, 0x654321);

// Community center
const communityCenter = createBuilding(-30, 0, 12, 6, 10, 0x87CEEB, 0x666666);

// School
const school = createBuilding(30, 0, 20, 8, 15, 0xF0E68C, 0x666666);

// Add all buildings to objects array for physics
objects.push(
    officeBuilding, shoppingCenter, bank, restaurant,
    house1, house2, house3, house4, house5, house6, house7, house8, house9,
    warehouse, factory, gasStation, playground, communityCenter, school
);

// Create trees
function createTree(x, z, size = 1) {
    // Trunk
    const trunkGeometry = new THREE.CylinderGeometry(0.3 * size, 0.4 * size, 2 * size, 6);
    const trunkMaterial = new THREE.MeshLambertMaterial({ color: 0x8B4513 });
    const trunk = new THREE.Mesh(trunkGeometry, trunkMaterial);
    trunk.position.set(x, size, z);
    trunk.castShadow = true;
    trunk.receiveShadow = true;
    scene.add(trunk);
    
    // Canopy
    const canopyGeometry = new THREE.SphereGeometry(1.5 * size, 8, 6);
    const canopyMaterial = new THREE.MeshLambertMaterial({ color: 0x228B22 });
    const canopy = new THREE.Mesh(canopyGeometry, canopyMaterial);
    canopy.position.set(x, 2.5 * size, z);
    canopy.castShadow = true;
    canopy.receiveShadow = true;
    scene.add(canopy);
    
    return { trunk, canopy };
}

// Place trees realistically around the environment
const treePositions = [
    // Residential areas (more trees)
    [-30, 30], [-20, 30], [-10, 30], [10, 30], [20, 30], [30, 30],
    [-30, -30], [-20, -30], [-10, -30], [10, -30], [20, -30], [30, -30],
    
    // Park area (dense trees)
    [-5, 35], [0, 35], [5, 35], [-5, 25], [0, 25], [5, 25],
    
    // Street trees (along roads)
    [-40, 0], [-30, 0], [-20, 0], [20, 0], [30, 0], [40, 0],
    [0, -40], [0, -30], [0, -20], [0, 20], [0, 30], [0, 40],
    
    // Industrial area (fewer trees)
    [-60, 0], [60, 0], [-50, 10], [50, 10]
];

const trees = [];
treePositions.forEach(([x, z]) => {
    const size = Math.random() * 0.3 + 0.7;
    const tree = createTree(x, z, size);
    trees.push(tree);
});

// Create vehicles
function createCar(x, z, color, rotation = 0) {
    // Car body
    const carGeometry = new THREE.BoxGeometry(3, 1.5, 1.5);
    const carMaterial = new THREE.MeshLambertMaterial({ color: color });
    const car = new THREE.Mesh(carGeometry, carMaterial);
    car.position.set(x, 0.75, z);
    car.rotation.y = rotation;
    car.castShadow = true;
    car.receiveShadow = true;
    scene.add(car);
    
    // Wheels
    const wheelGeometry = new THREE.CylinderGeometry(0.3, 0.3, 0.2, 8);
    const wheelMaterial = new THREE.MeshLambertMaterial({ color: 0x333333 });
    
    const wheel1 = new THREE.Mesh(wheelGeometry, wheelMaterial);
    wheel1.position.set(x - 1, 0.3, z - 0.6);
    wheel1.rotation.z = Math.PI/2;
    scene.add(wheel1);
    
    const wheel2 = new THREE.Mesh(wheelGeometry, wheelMaterial);
    wheel2.position.set(x + 1, 0.3, z - 0.6);
    wheel2.rotation.z = Math.PI/2;
    scene.add(wheel2);
    
    const wheel3 = new THREE.Mesh(wheelGeometry, wheelMaterial);
    wheel3.position.set(x - 1, 0.3, z + 0.6);
    wheel3.rotation.z = Math.PI/2;
    scene.add(wheel3);
    
    const wheel4 = new THREE.Mesh(wheelGeometry, wheelMaterial);
    wheel4.position.set(x + 1, 0.3, z + 0.6);
    wheel4.rotation.z = Math.PI/2;
    scene.add(wheel4);
    
    return car;
}

// Place cars realistically on roads
// Cars on Main Street
const car1 = createCar(-15, 0, 0xFFD700, 0);
const car2 = createCar(15, 0, 0x0000FF, 0);

// Cars on residential streets
const car3 = createCar(-20, 20, 0x32CD32, 0);
const car4 = createCar(20, 20, 0xFF69B4, 0);
const car5 = createCar(-20, -20, 0xFF4500, 0);
const car6 = createCar(20, -20, 0x9370DB, 0);

// Cars in parking lots
const car7 = createCar(5, 15, 0x8B4513, 0); // Shopping center parking
const car8 = createCar(-5, 15, 0xDC143C, 0); // Restaurant parking
const car9 = createCar(0, -10, 0x4169E1, 0); // Gas station

// Create water pond
const pondGeometry = new THREE.CylinderGeometry(8, 8, 0.2, 16);
const pondMaterial = new THREE.MeshLambertMaterial({ color: 0x0066CC });
const pond = new THREE.Mesh(pondGeometry, pondMaterial);
pond.position.set(-30, 0.1, 30);
pond.receiveShadow = true;
scene.add(pond);

// Create small orange structures
const smallOrangeGeometry = new THREE.BoxGeometry(2, 2, 2);
const smallOrangeMaterial = new THREE.MeshLambertMaterial({ color: 0xFF8C00 });
const smallOrange = new THREE.Mesh(smallOrangeGeometry, smallOrangeMaterial);
smallOrange.position.set(40, 1, -30);
smallOrange.castShadow = true;
smallOrange.receiveShadow = true;
scene.add(smallOrange);

// Mushroom structure
const mushroomStemGeometry = new THREE.CylinderGeometry(0.5, 0.5, 2, 8);
const mushroomStemMaterial = new THREE.MeshLambertMaterial({ color: 0xFF8C00 });
const mushroomStem = new THREE.Mesh(mushroomStemGeometry, mushroomStemMaterial);
mushroomStem.position.set(45, 1, -30);
mushroomStem.castShadow = true;
mushroomStem.receiveShadow = true;
scene.add(mushroomStem);

const mushroomCapGeometry = new THREE.SphereGeometry(1.5, 8, 4, 0, Math.PI * 2, 0, Math.PI/2);
const mushroomCapMaterial = new THREE.MeshLambertMaterial({ color: 0xF5DEB3 });
const mushroomCap = new THREE.Mesh(mushroomCapGeometry, mushroomCapMaterial);
mushroomCap.position.set(45, 2.5, -30);
mushroomCap.rotation.x = Math.PI;
mushroomCap.castShadow = true;
mushroomCap.receiveShadow = true;
scene.add(mushroomCap);

// Add vehicles to objects array
objects.push(car1, car2, car3, car4, car5, car6, car7, car8, car9);

// Create physics bodies for all objects
if (typeof CANNON !== 'undefined') {
    objects.forEach((obj, index) => {
        if (obj) {
            let shape;
            const box = new THREE.Box3().setFromObject(obj);
            const size = box.getSize(new THREE.Vector3());
            
            // Create appropriate physics shape based on object type
            if (obj.geometry instanceof THREE.BoxGeometry) {
                shape = new CANNON.Box(new CANNON.Vec3(size.x/2, size.y/2, size.z/2));
            } else if (obj.geometry instanceof THREE.SphereGeometry) {
                shape = new CANNON.Sphere(size.x/2);
            } else if (obj.geometry instanceof THREE.CylinderGeometry) {
                shape = new CANNON.Cylinder(size.x/2, size.x/2, size.y, 8);
            } else {
                // Default to box shape
                shape = new CANNON.Box(new CANNON.Vec3(size.x/2, size.y/2, size.z/2));
            }
            
            const body = new CANNON.Body({ mass: 1 });
            body.addShape(shape);
            body.position.set(obj.position.x, obj.position.y, obj.position.z);
            body.quaternion.setFromAxisAngle(new CANNON.Vec3(0, 1, 0), obj.rotation.y);
            
            world.addBody(body);
            objectBodies.push(body);
        } else {
            objectBodies.push(null);
        }
    });
}

// Create character (capsule-like shape using cylinder and spheres)
const characterGroup = new THREE.Group();

// Body (cylinder)
const bodyGeometry = new THREE.CylinderGeometry(0.5, 0.5, 1.5, 8);
const characterMaterial = new THREE.MeshLambertMaterial({
    color: 0xff6b6b
});
const body = new THREE.Mesh(bodyGeometry, characterMaterial);

// Head (sphere)
const headGeometry = new THREE.SphereGeometry(0.4, 8, 6);
const head = new THREE.Mesh(headGeometry, characterMaterial);
head.position.y = 1.2;

// Legs (two cylinders)
const legGeometry = new THREE.CylinderGeometry(0.15, 0.15, 0.8, 6);
const leftLeg = new THREE.Mesh(legGeometry, characterMaterial);
const rightLeg = new THREE.Mesh(legGeometry, characterMaterial);
leftLeg.position.set(-0.2, -1.1, 0);
rightLeg.position.set(0.2, -1.1, 0);

// Add parts to group
characterGroup.add(body);
characterGroup.add(head);
characterGroup.add(leftLeg);
characterGroup.add(rightLeg);

const character = characterGroup;
character.position.set(0, 5, 0);

// Enable shadows for all character parts
character.traverse((child) => {
    if (child.isMesh) {
        child.castShadow = true;
        child.receiveShadow = true;
    }
});

scene.add(character);

// Create character physics body
if (typeof CANNON !== 'undefined') {
    const characterShape = new CANNON.Sphere(0.8);
    characterBody = new CANNON.Body({ mass: 0 }); // Kinematic body (mass 0)
    characterBody.addShape(characterShape);
    characterBody.position.set(0, 5, 0);
    
    // Set as kinematic body to prevent physics from affecting it
    characterBody.type = CANNON.Body.KINEMATIC;
    
    world.addBody(characterBody);
}

// Character movement variables
const keys = {
    w: false,
    a: false,
    s: false,
    d: false,
    space: false
};

const moveForce = 15;
const jumpForce = 20;

// Character movement function
function updateCharacter() {
    if (typeof CANNON !== 'undefined' && characterBody) {
        // Direct position-based movement for kinematic body
        const moveVector = new THREE.Vector3();
        
        if (keys.w) moveVector.z -= 0.2;
        if (keys.s) moveVector.z += 0.2;
        if (keys.a) moveVector.x -= 0.2;
        if (keys.d) moveVector.x += 0.2;
        
        if (moveVector.length() > 0) {
            // Move character directly
            character.position.add(moveVector);
            characterBody.position.copy(character.position);
            
            // Rotate character to face movement direction
            const targetRotation = Math.atan2(moveVector.x, moveVector.z);
            character.rotation.y = targetRotation;
        }
        
        // Jumping
        if (keys.space) {
            // Check if character is near ground (simple check)
            if (character.position.y < 3) {
                character.position.y += 0.5;
                characterBody.position.copy(character.position);
            }
        }
        
        // Simple gravity
        if (character.position.y > 1.5) {
            character.position.y -= 0.05;
            characterBody.position.copy(character.position);
        }
        
    } else {
        // Fallback movement without physics
        const moveVector = new THREE.Vector3();
        
        if (keys.w) moveVector.z -= 0.2;
        if (keys.s) moveVector.z += 0.2;
        if (keys.a) moveVector.x -= 0.2;
        if (keys.d) moveVector.x += 0.2;
        
        if (moveVector.length() > 0) {
            character.position.add(moveVector);
            const targetRotation = Math.atan2(moveVector.x, moveVector.z);
            character.rotation.y = targetRotation;
        }
        
        // Simple jumping
        if (keys.space && character.position.y < 3) {
            character.position.y += 0.5;
        }
        
        // Simple gravity
        if (character.position.y > 1.5) {
            character.position.y -= 0.05;
        }
    }
}

// Animation loop
function animate() {
    requestAnimationFrame(animate);
    
    const time = Date.now() * 0.001;
    
    // Step physics world
    world.step(1/60);
    
    // Update character movement
    updateCharacter();
    
    // Sync character visual with physics body
    character.position.copy(characterBody.position);
    character.quaternion.copy(characterBody.quaternion);
    
    // Sync objects with physics bodies
    objects.forEach((obj, index) => {
        if (objectBodies[index]) {
            obj.position.copy(objectBodies[index].position);
            obj.quaternion.copy(objectBodies[index].quaternion);
        }
    });
    
    // Animate trees (gentle swaying)
    trees.forEach((tree, index) => {
        if (tree && tree.canopy) {
            tree.canopy.rotation.z = Math.sin(time * 0.5 + index) * 0.1;
        }
    });
    
    // Camera follows character
    const idealCameraPosition = new THREE.Vector3(
        character.position.x,
        character.position.y + 6,
        character.position.z + 12
    );
    
    // Smooth camera following
    camera.position.lerp(idealCameraPosition, 0.1);
    
    // Look at character
    const lookAtTarget = new THREE.Vector3(
        character.position.x,
        character.position.y + 1,
        character.position.z
    );
    camera.lookAt(lookAtTarget);
    
    renderer.render(scene, camera);
}

// Keyboard event listeners
document.addEventListener('keydown', (event) => {
    switch(event.key.toLowerCase()) {
        case 'w':
            keys.w = true;
            break;
        case 'a':
            keys.a = true;
            break;
        case 's':
            keys.s = true;
            break;
        case 'd':
            keys.d = true;
            break;
        case ' ':
            event.preventDefault(); // Prevent page scroll
            keys.space = true;
            break;
    }
});

document.addEventListener('keyup', (event) => {
    switch(event.key.toLowerCase()) {
        case 'w':
            keys.w = false;
            break;
        case 'a':
            keys.a = false;
            break;
        case 's':
            keys.s = false;
            break;
        case 'd':
            keys.d = false;
            break;
        case ' ':
            keys.space = false;
            break;
    }
});

// Handle window resize
window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});

// Hide loading screen
document.getElementById('loading').style.display = 'none';

// Start animation
animate();

