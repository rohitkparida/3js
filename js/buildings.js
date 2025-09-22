// Road collision detection with logging
function isPositionOnRoad(x, z, width, depth) {
    const roadSize = 4; // LEGO road piece size
    const margin = 2; // Safety margin
    
    console.log(`Checking building at (${x}, ${z}) with size ${width}x${depth}`);
    
    // Check if building overlaps with any road
    // Main horizontal road at y=0
    if (Math.abs(z) < (depth/2 + roadSize/2 + margin)) {
        console.log(`  ❌ Collision with Main Street (y=0)`);
        return true;
    }
    
    // Central vertical road at x=0
    if (Math.abs(x) < (width/2 + roadSize/2 + margin)) {
        console.log(`  ❌ Collision with Central Avenue (x=0)`);
        return true;
    }
    
    // West Street at x=-40
    if (Math.abs(x - (-40)) < (width/2 + roadSize/2 + margin)) {
        console.log(`  ❌ Collision with West Street (x=-40)`);
        return true;
    }
    
    // East Street at x=40
    if (Math.abs(x - 40) < (width/2 + roadSize/2 + margin)) {
        console.log(`  ❌ Collision with East Street (x=40)`);
        return true;
    }
    
    // South Avenue at y=-40
    if (Math.abs(z - (-40)) < (depth/2 + roadSize/2 + margin)) {
        console.log(`  ❌ Collision with South Avenue (y=-40)`);
        return true;
    }
    
    // North Avenue at y=40
    if (Math.abs(z - 40) < (depth/2 + roadSize/2 + margin)) {
        console.log(`  ❌ Collision with North Avenue (y=40)`);
        return true;
    }
    
    // Oak Street at y=20 (only check if building is in the x-range of Oak Street)
    if (x >= -32 && x <= -8 && Math.abs(z - 20) < (depth/2 + roadSize/2 + margin)) {
        console.log(`  ❌ Collision with Oak Street (y=20)`);
        return true;
    }
    
    // Pine Street at y=20 (only check if building is in the x-range of Pine Street)
    if (x >= 8 && x <= 32 && Math.abs(z - 20) < (depth/2 + roadSize/2 + margin)) {
        console.log(`  ❌ Collision with Pine Street (y=20)`);
        return true;
    }
    
    // Maple Street at y=-20 (only check if building is in the x-range of Maple Street)
    if (x >= -32 && x <= -8 && Math.abs(z - (-20)) < (depth/2 + roadSize/2 + margin)) {
        console.log(`  ❌ Collision with Maple Street (y=-20)`);
        return true;
    }
    
    // Elm Street at y=-20 (only check if building is in the x-range of Elm Street)
    if (x >= 8 && x <= 32 && Math.abs(z - (-20)) < (depth/2 + roadSize/2 + margin)) {
        console.log(`  ❌ Collision with Elm Street (y=-20)`);
        return true;
    }
    
    console.log(`  ✅ Safe position - no road collisions`);
    return false;
}

// Create building with logging
export function createBuilding(x, z, width, height, depth, color, roofColor = 0x666666) {
    console.log(`🏗️ Creating building at (${x}, ${z}) with size ${width}x${depth}`);
    
    // Check for road collisions
    if (isPositionOnRoad(x, z, width, depth)) {
        console.warn(`⚠️ Building at (${x}, ${z}) may overlap with roads!`);
    }
    
    // Building base
    const buildingGeometry = new THREE.BoxGeometry(width, height, depth);
    const buildingMaterial = new THREE.MeshLambertMaterial({ color: color });
    const building = new THREE.Mesh(buildingGeometry, buildingMaterial);
    building.position.set(x, height/2, z);
    building.castShadow = true;
    building.receiveShadow = true;
    
    // Roof
    const roofGeometry = new THREE.BoxGeometry(width + 0.5, 0.5, depth + 0.5);
    const roofMaterial = new THREE.MeshLambertMaterial({ color: roofColor });
    const roof = new THREE.Mesh(roofGeometry, roofMaterial);
    roof.position.set(x, height + 0.25, z);
    roof.castShadow = true;
    roof.receiveShadow = true;
    building.add(roof);
    
    // Windows
    const windowGeometry = new THREE.BoxGeometry(1, 1.5, 0.1);
    const windowMaterial = new THREE.MeshLambertMaterial({ color: 0x87CEEB });
    const window1 = new THREE.Mesh(windowGeometry, windowMaterial);
    window1.position.set(-width/3, 0, depth/2 + 0.05);
    building.add(window1);
    
    const window2 = new THREE.Mesh(windowGeometry, windowMaterial);
    window2.position.set(width/3, 0, depth/2 + 0.05);
    building.add(window2);
    
    return building;
}

// Create commercial district - in empty blocks between roads
export function createCommercialDistrict() {
    console.log('🏢 Creating Commercial District...');
    const buildings = [];
    
    // Large office building (downtown) - in block between Main St (y=0) and North Ave (y=40)
    console.log('  📍 Office Building');
    buildings.push(createBuilding(-12, 10, 12, 12, 8, 0xFFD700, 0x666666));
    
    // Shopping center - in block between Main St (y=0) and North Ave (y=40)
    console.log('  📍 Shopping Center');
    buildings.push(createBuilding(12, 10, 12, 8, 12, 0x87CEEB, 0x666666));
    
    // Bank - in block between Main St (y=0) and South Ave (y=-40)
    console.log('  📍 Bank');
    buildings.push(createBuilding(-12, -10, 8, 6, 6, 0x0000FF, 0x666666));
    
    // Restaurant - in block between Main St (y=0) and South Ave (y=-40)
    console.log('  📍 Restaurant');
    buildings.push(createBuilding(12, -10, 6, 4, 8, 0xFF8C00, 0x666666));
    
    console.log(`✅ Commercial District created with ${buildings.length} buildings`);
    return buildings;
}

// Create residential district - in empty blocks between roads
export function createResidentialDistrict() {
    console.log('🏠 Creating Residential District...');
    const buildings = [];
    
    // Houses in Oak Street area (between Oak St y=20 and North Ave y=40) - in blocks
    console.log('  📍 Oak Street Houses');
    buildings.push(createBuilding(-28, 30, 6, 5, 8, 0x8B4513, 0x654321));
    buildings.push(createBuilding(-20, 30, 6, 5, 8, 0x228B22, 0x654321));
    buildings.push(createBuilding(-12, 30, 6, 5, 8, 0xDC143C, 0x654321));
    
    // Houses in Pine Street area (between Pine St y=20 and North Ave y=40) - in blocks
    console.log('  📍 Pine Street Houses');
    buildings.push(createBuilding(20, 30, 6, 5, 8, 0xFFD700, 0x654321));
    buildings.push(createBuilding(28, 30, 6, 5, 8, 0x4169E1, 0x654321));
    
    // Houses in Maple Street area (between South Ave y=-40 and Maple St y=-20) - in blocks
    console.log('  📍 Maple Street Houses');
    buildings.push(createBuilding(-28, -30, 6, 5, 8, 0xFF69B4, 0x654321));
    buildings.push(createBuilding(-20, -30, 6, 5, 8, 0x32CD32, 0x654321));
    
    // Houses in Elm Street area (between South Ave y=-40 and Elm St y=-20) - in blocks
    console.log('  📍 Elm Street Houses');
    buildings.push(createBuilding(20, -30, 6, 5, 8, 0xFF4500, 0x654321));
    buildings.push(createBuilding(28, -30, 6, 5, 8, 0x9370DB, 0x654321));
    
    console.log(`✅ Residential District created with ${buildings.length} buildings`);
    return buildings;
}

// Create industrial district - in empty blocks between roads
export function createIndustrialDistrict() {
    console.log('🏭 Creating Industrial District...');
    const buildings = [];
    
    // Warehouse - in block between West Street (x=-40) and edge
    console.log('  📍 Warehouse');
    buildings.push(createBuilding(-52, 10, 16, 8, 12, 0x708090, 0x666666));
    
    // Factory - in block between East Street (x=40) and edge
    console.log('  📍 Factory');
    buildings.push(createBuilding(52, 10, 16, 10, 12, 0x696969, 0x666666));
    
    // Gas station - in block between South Avenue (y=-40) and edge
    console.log('  📍 Gas Station');
    buildings.push(createBuilding(-12, -52, 8, 4, 6, 0xFF0000, 0x666666));
    
    console.log(`✅ Industrial District created with ${buildings.length} buildings`);
    return buildings;
}

// Create public spaces - in empty blocks between roads
export function createPublicSpaces() {
    console.log('🏛️ Creating Public Spaces...');
    const buildings = [];
    
    // Park with playground - in block between North Avenue (y=40) and edge
    console.log('  📍 Park');
    buildings.push(createBuilding(12, 52, 12, 2, 12, 0x90EE90, 0x654321));
    
    // Community center - in block between West Street (x=-40) and Central Avenue (x=0)
    console.log('  📍 Community Center');
    buildings.push(createBuilding(-28, 10, 12, 6, 10, 0x87CEEB, 0x666666));
    
    // School - in block between East Street (x=40) and Central Avenue (x=0)
    console.log('  📍 School');
    buildings.push(createBuilding(28, 10, 16, 8, 12, 0xF0E68C, 0x666666));
    
    console.log(`✅ Public Spaces created with ${buildings.length} buildings`);
    return buildings;
}
