// Tree collision detection with logging
function isTreePositionOnRoad(x, z, size) {
    const roadSize = 4; // LEGO road piece size
    const margin = 1.5; // Tree canopy radius + safety margin
    const treeRadius = 1.5 * size; // Tree canopy radius
    
    console.log(`🌳 Checking tree at (${x}, ${z}) with size ${size} (radius ${treeRadius})`);
    
    // Check if tree overlaps with any road
    // Main horizontal road at y=0
    if (Math.abs(z) < (treeRadius + roadSize/2 + margin)) {
        console.log(`  ❌ Collision with Main Street (y=0)`);
        return true;
    }
    
    // Central vertical road at x=0
    if (Math.abs(x) < (treeRadius + roadSize/2 + margin)) {
        console.log(`  ❌ Collision with Central Avenue (x=0)`);
        return true;
    }
    
    // West Street at x=-40
    if (Math.abs(x - (-40)) < (treeRadius + roadSize/2 + margin)) {
        console.log(`  ❌ Collision with West Street (x=-40)`);
        return true;
    }
    
    // East Street at x=40
    if (Math.abs(x - 40) < (treeRadius + roadSize/2 + margin)) {
        console.log(`  ❌ Collision with East Street (x=40)`);
        return true;
    }
    
    // South Avenue at y=-40
    if (Math.abs(z - (-40)) < (treeRadius + roadSize/2 + margin)) {
        console.log(`  ❌ Collision with South Avenue (y=-40)`);
        return true;
    }
    
    // North Avenue at y=40
    if (Math.abs(z - 40) < (treeRadius + roadSize/2 + margin)) {
        console.log(`  ❌ Collision with North Avenue (y=40)`);
        return true;
    }
    
    // Oak Street at y=20 (only check if tree is in the x-range of Oak Street)
    if (x >= -32 && x <= -8 && Math.abs(z - 20) < (treeRadius + roadSize/2 + margin)) {
        console.log(`  ❌ Collision with Oak Street (y=20)`);
        return true;
    }
    
    // Pine Street at y=20 (only check if tree is in the x-range of Pine Street)
    if (x >= 8 && x <= 32 && Math.abs(z - 20) < (treeRadius + roadSize/2 + margin)) {
        console.log(`  ❌ Collision with Pine Street (y=20)`);
        return true;
    }
    
    // Maple Street at y=-20 (only check if tree is in the x-range of Maple Street)
    if (x >= -32 && x <= -8 && Math.abs(z - (-20)) < (treeRadius + roadSize/2 + margin)) {
        console.log(`  ❌ Collision with Maple Street (y=-20)`);
        return true;
    }
    
    // Elm Street at y=-20 (only check if tree is in the x-range of Elm Street)
    if (x >= 8 && x <= 32 && Math.abs(z - (-20)) < (treeRadius + roadSize/2 + margin)) {
        console.log(`  ❌ Collision with Elm Street (y=-20)`);
        return true;
    }
    
    console.log(`  ✅ Safe position - no road collisions`);
    return false;
}

// Create tree with collision logging
export function createTree(x, z, size = 1) {
    console.log(`🌳 Creating tree at (${x}, ${z}) with size ${size}`);
    
    // Check for road collisions
    if (isTreePositionOnRoad(x, z, size)) {
        console.warn(`⚠️ Tree at (${x}, ${z}) may overlap with roads!`);
    }
    
    const treeGroup = new THREE.Group();
    
    // Trunk
    const trunkGeometry = new THREE.CylinderGeometry(0.3 * size, 0.4 * size, 2 * size, 6);
    const trunkMaterial = new THREE.MeshLambertMaterial({ color: 0x8B4513 });
    const trunk = new THREE.Mesh(trunkGeometry, trunkMaterial);
    trunk.position.set(0, size, 0);
    trunk.castShadow = true;
    trunk.receiveShadow = true;
    treeGroup.add(trunk);
    
    // Canopy
    const canopyGeometry = new THREE.SphereGeometry(1.5 * size, 8, 6);
    const canopyMaterial = new THREE.MeshLambertMaterial({ color: 0x228B22 });
    const canopy = new THREE.Mesh(canopyGeometry, canopyMaterial);
    canopy.position.set(0, 2.5 * size, 0);
    canopy.castShadow = true;
    canopy.receiveShadow = true;
    treeGroup.add(canopy);
    
    treeGroup.position.set(x, 0, z);
    
    return { group: treeGroup, trunk, canopy };
}

// Create tree forest with collision logging
export function createTreeForest() {
    console.log('🌲 Creating Tree Forest...');
    
    const treePositions = [
        // Residential areas (more trees) - safe positions
        [-30, 30], [-20, 30], [-10, 30], [10, 30], [20, 30], [30, 30],
        [-30, -30], [-20, -30], [-10, -30], [10, -30], [20, -30], [30, -30],
        
        // Park area (dense trees) - MOVED VERY FAR from Central Avenue
        [-20, 35], [-15, 35], [15, 35], [20, 35], [-20, 25], [-15, 25], [15, 25], [20, 25],
        
        // Street trees (along roads) - MOVED EXTREMELY FAR FROM ROADS
        [-40, 20], [-30, 20], [-20, 20], [20, 20], [30, 20], [40, 20],  // Above Main Street
        [-40, -20], [-30, -20], [-20, -20], [20, -20], [30, -20], [40, -20],  // Below Main Street
        [-20, -40], [-20, -30], [-20, -20], [-20, 20], [-20, 30], [-20, 40],  // Left of Central Avenue
        [20, -40], [20, -30], [20, -20], [20, 20], [20, 30], [20, 40],  // Right of Central Avenue
        
        // Industrial area (fewer trees) - moved away from Main Street
        [-60, 20], [60, 20], [-50, 10], [50, 10]
    ];
    
    const trees = [];
    let collisionCount = 0;
    
    treePositions.forEach(([x, z], index) => {
        console.log(`  📍 Tree ${index + 1}/${treePositions.length}`);
        const size = Math.random() * 0.3 + 0.7;
        const tree = createTree(x, z, size);
        trees.push(tree);
        
        // Count collisions
        if (isTreePositionOnRoad(x, z, size)) {
            collisionCount++;
        }
    });
    
    console.log(`✅ Tree Forest created with ${trees.length} trees`);
    if (collisionCount > 0) {
        console.warn(`⚠️ ${collisionCount} trees may be overlapping with roads!`);
    } else {
        console.log(`🎉 All trees are safely positioned away from roads!`);
    }
    
    return trees;
}
