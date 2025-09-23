// Clean Tree Placement System - No Collisions

// Tree configuration
const TREE_MARGIN = 3; // Distance from roads and buildings
const ROAD_WIDTH = 4;

// Check if position is safe for tree
function isTreePositionSafe(x, z, radius) {
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
        
        // Check if tree overlaps with road (including margin)
        if (dx < (radius + road.width/2 + TREE_MARGIN) && 
            dz < (radius + road.height/2 + TREE_MARGIN)) {
            return false;
        }
    }
    
    return true;
}

// Create tree
export function createTree(x, z, size = 1) {
    console.log(`🌳 Creating tree at (${x}, ${z}) with size ${size}`);
    
    const radius = 1.5 * size;
    
    // Check if position is safe
    if (!isTreePositionSafe(x, z, radius)) {
        console.warn(`⚠️ Tree at (${x}, ${z}) would collide with roads!`);
        return null;
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
    
    console.log(`✅ Tree created successfully at (${x}, ${z})`);
    return { group: treeGroup, trunk, canopy };
}

// Create clean tree forest
export function createTreeForest() {
    console.log('🌲 Creating Clean Tree Forest...');
    
    // Safe tree positions - far from roads
    const treePositions = [
        // North area (far from North Avenue)
        [-55, 55], [-45, 55], [-35, 55], [-25, 55], [-15, 55], [15, 55], [25, 55], [35, 55], [45, 55], [55, 55],
        
        // South area (far from South Avenue)
        [-55, -55], [-45, -55], [-35, -55], [-25, -55], [-15, -55], [15, -55], [25, -55], [35, -55], [45, -55], [55, -55],
        
        // East area (far from East Street and industrial buildings)
        [55, -45], [55, -35], [55, -25], [55, -5], [55, 5], [55, 25], [55, 35], [55, 45],
        
        // West area (far from West Street and industrial buildings)
        [-55, -45], [-55, -35], [-55, -25], [-55, -5], [-55, 5], [-55, 25], [-55, 35], [-55, 45],
        
        // Central areas (between main roads)
        [-25, 10], [-25, -10], [25, 10], [25, -10],
        [-10, 25], [-10, -25], [10, 25], [10, -25],
        
        // Corner areas
        [-65, 65], [65, 65], [-65, -65], [65, -65]
    ];
    
    const trees = [];
    let successCount = 0;
    
    treePositions.forEach(([x, z], index) => {
        const size = Math.random() * 0.3 + 0.7;
        const tree = createTree(x, z, size);
        
        if (tree) {
            trees.push(tree);
            successCount++;
        }
    });
    
    console.log(`✅ Clean Tree Forest created with ${successCount}/${treePositions.length} trees`);
    console.log(`🎉 All trees are safely positioned away from roads!`);
    
    return trees;
}
