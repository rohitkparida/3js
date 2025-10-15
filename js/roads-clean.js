// Clean Road Network System - No Collisions

// Road configuration
const ROAD_WIDTH = 4;
const ROAD_HEIGHT = 0.1;
const DASH_LENGTH = 1.5;
const DASH_WIDTH = 0.3;
const DASH_SPACING = 1.5;

// Create a single road piece
function createRoadPiece(x, z, rotation = 0) {
    const group = new THREE.Group();
    
    // Road base
    const geometry = new THREE.BoxGeometry(ROAD_WIDTH, ROAD_HEIGHT, ROAD_WIDTH);
    const material = new THREE.MeshLambertMaterial({ color: 0x333333 });
    const road = new THREE.Mesh(geometry, material);
    road.position.set(0, ROAD_HEIGHT / 2, 0);
    road.castShadow = true;
    road.receiveShadow = true;
    group.add(road);
    
    // Road markings (dashes)
    const dashGeometry = new THREE.BoxGeometry(DASH_LENGTH, 0.01, DASH_WIDTH);
    const dashMaterial = new THREE.MeshLambertMaterial({ color: 0xFFFFFF });
    
    // Center dash
    const centerDash = new THREE.Mesh(dashGeometry, dashMaterial);
    centerDash.position.set(0, ROAD_HEIGHT + 0.01, 0);
    group.add(centerDash);
    
    // Side dashes
    const leftDash = new THREE.Mesh(dashGeometry, dashMaterial);
    leftDash.position.set(-1.2, ROAD_HEIGHT + 0.01, 0);
    group.add(leftDash);
    
    const rightDash = new THREE.Mesh(dashGeometry, dashMaterial);
    rightDash.position.set(1.2, ROAD_HEIGHT + 0.01, 0);
    group.add(rightDash);
    
    group.position.set(x, 0, z);
    group.rotation.y = rotation;
    
    return group;
}

// Create a smooth elevated flyover ramp
function createElevatedFlyover(startX, startZ, length, startElevation = 0, endElevation = 12, tiltAngle = 0.3) {
    const group = new THREE.Group();

    // Calculate the total distance and elevation change
    const totalDistance = length;
    const elevationChange = endElevation - startElevation;

    // Create a single long road piece for the entire flyover
    const roadWidth = ROAD_WIDTH;
    const roadLength = totalDistance;
    const roadHeight = ROAD_HEIGHT;

    // Create the main road surface as a long box
    const roadGeometry = new THREE.BoxGeometry(roadLength, roadHeight, roadWidth);
    const roadMaterial = new THREE.MeshLambertMaterial({ color: 0x333333 });
    const road = new THREE.Mesh(roadGeometry, roadMaterial);

    // Position the road to start at the "high end" (city center) and slope down to outskirts
    // For reversed direction: start at higher x (city), end at lower x (outskirts)
    road.position.set(0, startElevation + roadHeight / 2, 0);
    road.castShadow = true;
    road.receiveShadow = true;
    group.add(road);

    // Add road markings along the entire length
    const dashGeometry = new THREE.BoxGeometry(DASH_LENGTH, 0.01, DASH_WIDTH);
    const dashMaterial = new THREE.MeshLambertMaterial({ color: 0xFFFFFF });

    // Create dashes along the length of the road
    const numDashes = Math.floor(totalDistance / (DASH_LENGTH + DASH_SPACING));
    for (let i = 0; i < numDashes; i++) {
        const dashPos = (i * (DASH_LENGTH + DASH_SPACING));

        // Center dash
        const centerDash = new THREE.Mesh(dashGeometry, dashMaterial);
        centerDash.position.set(dashPos, startElevation + roadHeight + 0.01, 0);
        group.add(centerDash);

        // Left dash
        const leftDash = new THREE.Mesh(dashGeometry, dashMaterial);
        leftDash.position.set(dashPos, startElevation + roadHeight + 0.01, -1.2);
        group.add(leftDash);

        // Right dash
        const rightDash = new THREE.Mesh(dashGeometry, dashMaterial);
        rightDash.position.set(dashPos, startElevation + roadHeight + 0.01, 1.2);
        group.add(rightDash);
    }

    // Apply tilt - now sloping DOWN as we go from city center to outskirts
    // Positive Z rotation to tilt downward in the -X direction
    group.rotation.z = tiltAngle;

    // Position the entire flyover at the start position (city center end)
    group.position.set(startX, 0, startZ);

    // Add support structures along the length
    const numSupports = Math.ceil(totalDistance / 6); // Support every 6 units

    for (let i = 0; i <= numSupports; i++) {
        const supportPos = (i / numSupports) * totalDistance;
        // For reversed direction, elevation decreases as we move along the road
        const currentElevation = startElevation + (elevationChange * (1 - i / numSupports));

        // Create support pillars
        const pillarHeight = Math.max(currentElevation, 0.1); // Minimum height to avoid zero
        if (pillarHeight > 0.5) {
            const pillarGeometry = new THREE.BoxGeometry(0.8, pillarHeight, 0.8);
            const pillarMaterial = new THREE.MeshLambertMaterial({ color: 0x666666 });

            // Multiple pillars across the width for stability
            for (let pillarX = -1.5; pillarX <= 1.5; pillarX += 1.5) {
                const pillar = new THREE.Mesh(pillarGeometry, pillarMaterial);
                pillar.position.set(supportPos + pillarX, pillarHeight / 2, -1.5);
                pillar.castShadow = true;
                pillar.receiveShadow = true;
                group.add(pillar);

                const pillar2 = new THREE.Mesh(pillarGeometry, pillarMaterial);
                pillar2.position.set(supportPos + pillarX, pillarHeight / 2, 1.5);
                pillar2.castShadow = true;
                pillar2.receiveShadow = true;
                group.add(pillar2);
            }
        }
    }

    return group;
}

// Create intersection
function createIntersection(x, z) {
    const group = new THREE.Group();

    // Intersection base
    const geometry = new THREE.BoxGeometry(ROAD_WIDTH, ROAD_HEIGHT, ROAD_WIDTH);
    const material = new THREE.MeshLambertMaterial({ color: 0x333333 });
    const intersection = new THREE.Mesh(geometry, material);
    intersection.position.set(0, ROAD_HEIGHT / 2, 0);
    intersection.castShadow = true;
    intersection.receiveShadow = true;
    group.add(intersection);

    // Intersection markings
    const dashGeometry = new THREE.BoxGeometry(DASH_LENGTH, 0.01, DASH_WIDTH);
    const dashMaterial = new THREE.MeshLambertMaterial({ color: 0xFFFFFF });

    // Horizontal dashes
    const hDash1 = new THREE.Mesh(dashGeometry, dashMaterial);
    hDash1.position.set(-1.2, ROAD_HEIGHT + 0.01, 0);
    group.add(hDash1);

    const hDash2 = new THREE.Mesh(dashGeometry, dashMaterial);
    hDash2.position.set(1.2, ROAD_HEIGHT + 0.01, 0);
    group.add(hDash2);

    // Vertical dashes
    const vDash1 = new THREE.Mesh(dashGeometry, dashMaterial);
    vDash1.position.set(0, ROAD_HEIGHT + 0.01, -1.2);
    vDash1.rotation.y = Math.PI / 2;
    group.add(vDash1);

    const vDash2 = new THREE.Mesh(dashGeometry, dashMaterial);
    vDash2.position.set(0, ROAD_HEIGHT + 0.01, 1.2);
    vDash2.rotation.y = Math.PI / 2;
    group.add(vDash2);

    group.position.set(x, 0, z);

    return group;
}

// Create clean road network
export function createCleanRoadNetwork() {
    console.log('🛣️ Creating Clean Road Network...');
    const roads = [];
    
    // Main horizontal roads
    console.log('  📍 Creating Main Street (y=0)');
    for (let x = -60; x <= 60; x += 4) {
        roads.push(createRoadPiece(x, 0, 0));
    }
    
    // Main vertical roads
    console.log('  📍 Creating Central Avenue (x=0)');
    for (let z = -60; z <= 60; z += 4) {
        roads.push(createRoadPiece(0, z, Math.PI / 2));
    }
    
    // West Street
    console.log('  📍 Creating West Street (x=-40)');
    for (let z = -60; z <= 60; z += 4) {
        roads.push(createRoadPiece(-40, z, Math.PI / 2));
    }
    
    // East Street
    console.log('  📍 Creating East Street (x=40)');
    for (let z = -60; z <= 60; z += 4) {
        roads.push(createRoadPiece(40, z, Math.PI / 2));
    }
    
    // North Avenue
    console.log('  📍 Creating North Avenue (y=40)');
    for (let x = -60; x <= 60; x += 4) {
        roads.push(createRoadPiece(x, 40, 0));
    }
    
    // South Avenue
    console.log('  📍 Creating South Avenue (y=-40)');
    for (let x = -60; x <= 60; x += 4) {
        roads.push(createRoadPiece(x, -40, 0));
    }
    
    // Residential streets (shorter, connected to main roads)
    console.log('  📍 Creating Residential Streets');
    
    // Oak Street (connected to West Street and Central Avenue)
    for (let x = -40; x <= 0; x += 4) {
        roads.push(createRoadPiece(x, 20, 0));
    }
    
    // Pine Street (connected to Central Avenue and East Street)
    for (let x = 0; x <= 40; x += 4) {
        roads.push(createRoadPiece(x, 20, 0));
    }
    
    // Maple Street (connected to West Street and Central Avenue)
    for (let x = -40; x <= 0; x += 4) {
        roads.push(createRoadPiece(x, -20, 0));
    }
    
    // Elm Street (connected to Central Avenue and East Street)
    for (let x = 0; x <= 40; x += 4) {
        roads.push(createRoadPiece(x, -20, 0));
    }
    
    // Add intersections at key points
    console.log('  🚦 Creating Intersections');
    const intersections = [
        [0, 0],      // Main intersection
        [-40, 0],    // West Street & Main Street
        [40, 0],     // East Street & Main Street
        [0, 40],     // Central Avenue & North Avenue
        [0, -40],    // Central Avenue & South Avenue
        [-40, 20],   // West Street & Oak Street
        [0, 20],     // Central Avenue & Oak/Pine Streets
        [40, 20],    // East Street & Pine Street
        [-40, -20],  // West Street & Maple Street
        [0, -20],    // Central Avenue & Maple/Elm Streets
        [40, -20],   // East Street & Elm Street
        [-40, 40],   // West Street & North Avenue
        [40, 40],    // East Street & North Avenue
        [-40, -40],  // West Street & South Avenue
        [40, -40]    // East Street & South Avenue
    ];
    
    intersections.forEach(([x, z]) => {
        roads.push(createIntersection(x, z));
    });

    // Add smooth elevated flyover going from city center (higher x) to outskirts (lower x)
    console.log('  🛤️ Creating Elevated Flyover (City Center to Outskirts)');
    const flyoverStartX = 60; // Start further east (city center area)
    const flyoverLength = 28; // Slightly shorter for better proportions
    const flyoverStartElevation = 1; // Reduced from 8 for safer, more realistic height
    const flyoverEndElevation = 0; // End at ground level in outskirts
    const flyoverTiltAngle = 0.15; // Reduced tilt angle for gentler slope

    const flyover = createElevatedFlyover(
        flyoverStartX,
        0,
        flyoverLength,
        flyoverStartElevation,
        flyoverEndElevation,
        flyoverTiltAngle
    );

    roads.push(flyover);
    console.log(`    📍 Outbound flyover: ${flyoverLength} units long, elevation ${flyoverStartElevation}-${flyoverEndElevation}, tilt ${flyoverTiltAngle.toFixed(3)} radians`);

    console.log(`✅ Clean Road Network created with ${roads.length} road pieces`);
    return roads;
}

// Check road connectivity
export function checkRoadConnectivity(roads) {
    console.log('🔗 Checking Road Connectivity...');
    
    // Create adjacency list
    const adjacencyList = new Map();
    const roadPositions = roads.map(road => ({
        x: road.position.x,
        z: road.position.z,
        rotation: road.rotation.y
    }));
    
    // Build graph
    roadPositions.forEach((road, index) => {
        adjacencyList.set(index, []);
        
        roadPositions.forEach((otherRoad, otherIndex) => {
            if (index === otherIndex) return;
            
            const dx = Math.abs(road.x - otherRoad.x);
            const dz = Math.abs(road.z - otherRoad.z);
            
            // Check if roads are adjacent (4 units apart)
            if ((dx === 4 && dz === 0) || (dx === 0 && dz === 4)) {
                adjacencyList.get(index).push(otherIndex);
            }
        });
    });
    
    // DFS to find connected components
    const visited = new Set();
    const components = [];
    
    function dfs(node, component) {
        visited.add(node);
        component.push(node);
        
        for (const neighbor of adjacencyList.get(node)) {
            if (!visited.has(neighbor)) {
                dfs(neighbor, component);
            }
        }
    }
    
    for (let i = 0; i < roadPositions.length; i++) {
        if (!visited.has(i)) {
            const component = [];
            dfs(i, component);
            components.push(component);
        }
    }
    
    console.log(`  🔍 Found ${components.length} connected components`);
    components.forEach((component, index) => {
        console.log(`    - Component ${index + 1}: ${component.length} roads`);
    });
    
    if (components.length === 1) {
        console.log('  ✅ All roads are properly connected!');
        return true;
    } else {
        console.log(`  ❌ Road network is fragmented into ${components.length} separate networks`);
        return false;
    }
}
