// Clean Building Placement System - No Collisions

// Building configuration
const BUILDING_MARGIN = 6; // Distance from roads
const ROAD_WIDTH = 4;

// Check if position is safe for building
function isPositionSafe(x, z, width, depth) {
    // Check distance from all major roads
    const roads = [
        { x: 0, z: 0, width: ROAD_WIDTH, height: ROAD_WIDTH },      // Main intersection
        { x: -40, z: 0, width: ROAD_WIDTH, height: ROAD_WIDTH },   // West Street
        { x: 40, z: 0, width: ROAD_WIDTH, height: ROAD_WIDTH },    // East Street
        { x: 0, z: 40, width: ROAD_WIDTH, height: ROAD_WIDTH },    // North Avenue
        { x: 0, z: -40, width: ROAD_WIDTH, height: ROAD_WIDTH },   // South Avenue
        { x: -40, z: 20, width: ROAD_WIDTH, height: ROAD_WIDTH },  // Oak Street
        { x: 40, z: 20, width: ROAD_WIDTH, height: ROAD_WIDTH },   // Pine Street
        { x: -40, z: -20, width: ROAD_WIDTH, height: ROAD_WIDTH }, // Maple Street
        { x: 40, z: -20, width: ROAD_WIDTH, height: ROAD_WIDTH }   // Elm Street
    ];
    
    for (const road of roads) {
        const dx = Math.abs(x - road.x);
        const dz = Math.abs(z - road.z);
        
        // Check if building overlaps with road (including margin)
        if (dx < (width/2 + road.width/2 + BUILDING_MARGIN) && 
            dz < (depth/2 + road.height/2 + BUILDING_MARGIN)) {
            return false;
        }
    }
    
    return true;
}

// Create building
export function createBuilding(x, z, width, height, depth, color, roofColor = 0x666666) {
    console.log(`🏗️ Creating building at (${x}, ${z}) with size ${width}x${depth}`);
    
    // Check if position is safe
    if (!isPositionSafe(x, z, width, depth)) {
        console.warn(`⚠️ Building at (${x}, ${z}) would collide with roads!`);
        return null;
    }
    
    const group = new THREE.Group();
    
    // Building base
    const baseGeometry = new THREE.BoxGeometry(width, height, depth);
    const baseMaterial = new THREE.MeshLambertMaterial({ color });
    const base = new THREE.Mesh(baseGeometry, baseMaterial);
    base.position.set(0, height / 2, 0);
    base.castShadow = true;
    base.receiveShadow = true;
    group.add(base);
    
    // Roof
    const roofGeometry = new THREE.BoxGeometry(width + 0.5, 0.5, depth + 0.5);
    const roofMaterial = new THREE.MeshLambertMaterial({ color: roofColor });
    const roof = new THREE.Mesh(roofGeometry, roofMaterial);
    roof.position.set(0, height + 0.25, 0);
    roof.castShadow = true;
    roof.receiveShadow = true;
    group.add(roof);
    
    // Windows
    const windowGeometry = new THREE.BoxGeometry(0.3, 0.3, 0.1);
    const windowMaterial = new THREE.MeshLambertMaterial({ color: 0x87CEEB });
    
    // Add windows to front and back
    for (let i = 0; i < 3; i++) {
        for (let j = 0; j < 2; j++) {
            const window = new THREE.Mesh(windowGeometry, windowMaterial);
            window.position.set(
                (i - 1) * (width / 3),
                height * 0.3 + j * (height * 0.4),
                depth / 2 + 0.05
            );
            group.add(window);
            
            const backWindow = new THREE.Mesh(windowGeometry, windowMaterial);
            backWindow.position.set(
                (i - 1) * (width / 3),
                height * 0.3 + j * (height * 0.4),
                -depth / 2 - 0.05
            );
            group.add(backWindow);
        }
    }
    
    group.position.set(x, 0, z);
    
    console.log(`✅ Building created successfully at (${x}, ${z})`);
    return group;
}

// Commercial District - Safe positions
export function createCommercialDistrict() {
    console.log('🏢 Creating Commercial District...');
    const buildings = [];
    
    // Office buildings - positioned safely away from roads
    const office1 = createBuilding(-12, 12, 6, 8, 4, 0xFFD700, 0x666666);
    if (office1) buildings.push(office1);
    
    const office2 = createBuilding(12, 12, 6, 8, 4, 0x87CEEB, 0x666666);
    if (office2) buildings.push(office2);
    
    const office3 = createBuilding(-12, -12, 5, 6, 4, 0x0000FF, 0x666666);
    if (office3) buildings.push(office3);
    
    const office4 = createBuilding(12, -12, 5, 6, 4, 0xFF8C00, 0x666666);
    if (office4) buildings.push(office4);
    
    console.log(`✅ Commercial District created with ${buildings.length} buildings`);
    return buildings;
}

// Residential District - Safe positions
export function createResidentialDistrict() {
    console.log('🏠 Creating Residential District...');
    const buildings = [];
    
    // Houses in safe areas between roads (reduced from 32 to 8 for performance)
    const housePositions = [
        // North residential area - minimal selection
        [-35, 35], [-25, 35], [15, 35], [35, 35],

        // South residential area - minimal selection
        [-35, -35], [-25, -35], [15, -35], [35, -35]
    ];
    
    housePositions.forEach(([x, z], index) => {
        const house = createBuilding(x, z, 4, 6, 4, 0x8B4513, 0x654321);
        if (house) buildings.push(house);
    });
    
    console.log(`✅ Residential District created with ${buildings.length} buildings`);
    return buildings;
}

// Industrial District - Safe positions
export function createIndustrialDistrict() {
    console.log('🏭 Creating Industrial District...');
    const buildings = [];
    
    // Industrial buildings in safe areas
    const warehouse1 = createBuilding(-55, 15, 12, 8, 10, 0x708090, 0x666666);
    if (warehouse1) buildings.push(warehouse1);
    
    const warehouse2 = createBuilding(55, 15, 12, 10, 10, 0x696969, 0x666666);
    if (warehouse2) buildings.push(warehouse2);
    
    const factory1 = createBuilding(-55, -15, 10, 6, 8, 0xFF0000, 0x666666);
    if (factory1) buildings.push(factory1);
    
    const factory2 = createBuilding(55, -15, 10, 8, 8, 0x8B0000, 0x666666);
    if (factory2) buildings.push(factory2);
    
    console.log(`✅ Industrial District created with ${buildings.length} buildings`);
    return buildings;
}

// Public Spaces - Safe positions
export function createPublicSpaces() {
    console.log('🏛️ Creating Public Spaces...');
    const buildings = [];
    
    // Park (moved far from roads)
    const park = createBuilding(0, 70, 10, 2, 10, 0x90EE90, 0x654321);
    if (park) buildings.push(park);
    
    // Community center (moved far from Main Street)
    const communityCenter = createBuilding(-10, 0, 5, 2, 4, 0x87CEEB, 0x666666);
    if (communityCenter) buildings.push(communityCenter);
    
    // School (moved far from Main Street)
    const school = createBuilding(10, 0, 6, 4, 5, 0xF0E68C, 0x666666);
    if (school) buildings.push(school);
    
    console.log(`✅ Public Spaces created with ${buildings.length} buildings`);
    return buildings;
}
