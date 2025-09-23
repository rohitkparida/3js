// LEGO road piece dimensions (standardized)
const LEGO_ROAD = {
    PIECE_SIZE: 4, // Standard LEGO road piece size
    HEIGHT: 0.2,
    STUD_HEIGHT: 0.05,
    STUD_RADIUS: 0.15
};

// Create individual LEGO road piece
export function createLegoRoadPiece(x, z, rotation = 0, hasStuds = true) {
    const pieceGroup = new THREE.Group();
    
    // Base road piece
    const roadGeometry = new THREE.BoxGeometry(LEGO_ROAD.PIECE_SIZE, LEGO_ROAD.HEIGHT, LEGO_ROAD.PIECE_SIZE);
    const roadMaterial = new THREE.MeshLambertMaterial({ color: 0x333333 });
    const road = new THREE.Mesh(roadGeometry, roadMaterial);
    road.position.set(0, LEGO_ROAD.HEIGHT/2, 0);
    road.castShadow = true;
    road.receiveShadow = true;
    pieceGroup.add(road);
    
    // No studs - clean road surface
    
    // Add simple horizontal dashed lines only
    const lineMaterial = new THREE.MeshLambertMaterial({ color: 0xffffff });
    
    // Create small horizontal dashes
    const dashLength = 0.4;
    const dashWidth = 0.1;
    const dashHeight = 0.02;
    
    // Center dash
    const centerDashGeometry = new THREE.BoxGeometry(dashLength, dashHeight, dashWidth);
    const centerDash = new THREE.Mesh(centerDashGeometry, lineMaterial);
    centerDash.position.set(0, LEGO_ROAD.HEIGHT + 0.01, 0);
    pieceGroup.add(centerDash);
    
    // Left side dash - horizontal, same size as center
    const leftDashGeometry = new THREE.BoxGeometry(dashLength, dashHeight, dashWidth);
    const leftDash = new THREE.Mesh(leftDashGeometry, lineMaterial);
    leftDash.position.set(-LEGO_ROAD.PIECE_SIZE * 0.35, LEGO_ROAD.HEIGHT + 0.01, 0);
    pieceGroup.add(leftDash);
    
    // Right side dash - horizontal, same size as center
    const rightDashGeometry = new THREE.BoxGeometry(dashLength, dashHeight, dashWidth);
    const rightDash = new THREE.Mesh(rightDashGeometry, lineMaterial);
    rightDash.position.set(LEGO_ROAD.PIECE_SIZE * 0.35, LEGO_ROAD.HEIGHT + 0.01, 0);
    pieceGroup.add(rightDash);
    
    pieceGroup.position.set(x, 0, z);
    pieceGroup.rotation.y = rotation;
    
    return pieceGroup;
}

// Create straight road section
export function createStraightRoad(startX, startZ, direction, length, rotation = 0) {
    const pieces = [];
    const pieceCount = Math.ceil(length / LEGO_ROAD.PIECE_SIZE);
    
    for (let i = 0; i < pieceCount; i++) {
        const x = startX + (direction === 'x' ? i * LEGO_ROAD.PIECE_SIZE : 0);
        const z = startZ + (direction === 'z' ? i * LEGO_ROAD.PIECE_SIZE : 0);
        pieces.push(createLegoRoadPiece(x, z, rotation, true));
    }
    
    return pieces;
}

// Create intersection piece
export function createIntersectionPiece(x, z, rotation = 0) {
    const intersectionGroup = new THREE.Group();
    
    // Main intersection base
    const baseGeometry = new THREE.BoxGeometry(LEGO_ROAD.PIECE_SIZE, LEGO_ROAD.HEIGHT, LEGO_ROAD.PIECE_SIZE);
    const baseMaterial = new THREE.MeshLambertMaterial({ color: 0x333333 });
    const base = new THREE.Mesh(baseGeometry, baseMaterial);
    base.position.set(0, LEGO_ROAD.HEIGHT/2, 0);
    base.castShadow = true;
    base.receiveShadow = true;
    intersectionGroup.add(base);
    
    // No studs - clean intersection surface
    
    // Add simple individual dashes - no H-patterns
    const lineMaterial = new THREE.MeshLambertMaterial({ color: 0xffffff });
    
    // Create individual dashes only
    const dashLength = 0.6;
    const dashWidth = 0.15;
    const dashHeight = 0.02;
    
    // Center horizontal dash
    const centerHGeometry = new THREE.BoxGeometry(dashLength, dashHeight, dashWidth);
    const centerH = new THREE.Mesh(centerHGeometry, lineMaterial);
    centerH.position.set(0, LEGO_ROAD.HEIGHT + 0.01, 0);
    intersectionGroup.add(centerH);
    
    // Center vertical dash
    const centerVGeometry = new THREE.BoxGeometry(dashWidth, dashHeight, dashLength);
    const centerV = new THREE.Mesh(centerVGeometry, lineMaterial);
    centerV.position.set(0, LEGO_ROAD.HEIGHT + 0.01, 0);
    intersectionGroup.add(centerV);
    
    // Top dash
    const topDashGeometry = new THREE.BoxGeometry(dashLength * 0.8, dashHeight, dashWidth);
    const topDash = new THREE.Mesh(topDashGeometry, lineMaterial);
    topDash.position.set(0, LEGO_ROAD.HEIGHT + 0.01, LEGO_ROAD.PIECE_SIZE * 0.25);
    intersectionGroup.add(topDash);
    
    // Bottom dash
    const bottomDashGeometry = new THREE.BoxGeometry(dashLength * 0.8, dashHeight, dashWidth);
    const bottomDash = new THREE.Mesh(bottomDashGeometry, lineMaterial);
    bottomDash.position.set(0, LEGO_ROAD.HEIGHT + 0.01, -LEGO_ROAD.PIECE_SIZE * 0.25);
    intersectionGroup.add(bottomDash);
    
    // Left dash
    const leftDashGeometry = new THREE.BoxGeometry(dashWidth, dashHeight, dashLength * 0.8);
    const leftDash = new THREE.Mesh(leftDashGeometry, lineMaterial);
    leftDash.position.set(-LEGO_ROAD.PIECE_SIZE * 0.25, LEGO_ROAD.HEIGHT + 0.01, 0);
    intersectionGroup.add(leftDash);
    
    // Right dash
    const rightDashGeometry = new THREE.BoxGeometry(dashWidth, dashHeight, dashLength * 0.8);
    const rightDash = new THREE.Mesh(rightDashGeometry, lineMaterial);
    rightDash.position.set(LEGO_ROAD.PIECE_SIZE * 0.25, LEGO_ROAD.HEIGHT + 0.01, 0);
    intersectionGroup.add(rightDash);
    
    intersectionGroup.position.set(x, 0, z);
    intersectionGroup.rotation.y = rotation;
    
    return intersectionGroup;
}

// Create roundabout piece
export function createRoundaboutPiece(x, z, radius = 12) {
    const roundaboutGroup = new THREE.Group();
    
    // Main roundabout base
    const baseGeometry = new THREE.CylinderGeometry(radius, radius, LEGO_ROAD.HEIGHT, 16);
    const baseMaterial = new THREE.MeshLambertMaterial({ color: 0x333333 });
    const base = new THREE.Mesh(baseGeometry, baseMaterial);
    base.position.set(0, LEGO_ROAD.HEIGHT/2, 0);
    base.castShadow = true;
    base.receiveShadow = true;
    roundaboutGroup.add(base);
    
    // No studs - clean roundabout surface
    
    // Add center circle marking
    const centerGeometry = new THREE.CylinderGeometry(radius * 0.3, radius * 0.3, 0.02, 16);
    const centerMaterial = new THREE.MeshLambertMaterial({ color: 0xffffff });
    const center = new THREE.Mesh(centerGeometry, centerMaterial);
    center.position.set(0, LEGO_ROAD.HEIGHT + 0.01, 0);
    roundaboutGroup.add(center);
    
    roundaboutGroup.position.set(x, 0, z);
    
    return roundaboutGroup;
}

// Create road network using LEGO pieces
export function createRoadNetwork() {
    console.log('🛣️ Creating Road Network...');
    const roads = [];
    
    // Main Street (horizontal) - 2 lanes wide
    console.log('  📍 Main Street (horizontal) at y=0');
    const mainStreetPieces = [];
    for (let i = -17; i <= 17; i++) {
        mainStreetPieces.push(createLegoRoadPiece(i * LEGO_ROAD.PIECE_SIZE, 0, 0, true));
    }
    roads.push(...mainStreetPieces);
    
    // Central Avenue (vertical) - 2 lanes wide
    console.log('  📍 Central Avenue (vertical) at x=0');
    const centralAvenuePieces = [];
    for (let i = -17; i <= 17; i++) {
        centralAvenuePieces.push(createLegoRoadPiece(0, i * LEGO_ROAD.PIECE_SIZE, Math.PI/2, true));
    }
    roads.push(...centralAvenuePieces);
    
    // West Street - 1 lane wide
    console.log('  📍 West Street (vertical) at x=-40');
    const westStreetPieces = [];
    for (let i = -10; i <= 10; i++) {
        westStreetPieces.push(createLegoRoadPiece(-40, i * LEGO_ROAD.PIECE_SIZE, Math.PI/2, true));
    }
    roads.push(...westStreetPieces);
    
    // East Street - 1 lane wide
    console.log('  📍 East Street (vertical) at x=40');
    const eastStreetPieces = [];
    for (let i = -10; i <= 10; i++) {
        eastStreetPieces.push(createLegoRoadPiece(40, i * LEGO_ROAD.PIECE_SIZE, Math.PI/2, true));
    }
    roads.push(...eastStreetPieces);
    
    // South Avenue - 1 lane wide
    console.log('  📍 South Avenue (horizontal) at y=-40');
    const southAvenuePieces = [];
    for (let i = -10; i <= 10; i++) {
        southAvenuePieces.push(createLegoRoadPiece(i * LEGO_ROAD.PIECE_SIZE, -40, 0, true));
    }
    roads.push(...southAvenuePieces);
    
    // North Avenue - 1 lane wide
    console.log('  📍 North Avenue (horizontal) at y=40');
    const northAvenuePieces = [];
    for (let i = -10; i <= 10; i++) {
        northAvenuePieces.push(createLegoRoadPiece(i * LEGO_ROAD.PIECE_SIZE, 40, 0, true));
    }
    roads.push(...northAvenuePieces);
    
    // Oak Street (residential) - 1 lane wide
    console.log('  📍 Oak Street (horizontal) at y=20');
    const oakStreetPieces = [];
    for (let i = -3; i <= 3; i++) {
        oakStreetPieces.push(createLegoRoadPiece(-20 + i * LEGO_ROAD.PIECE_SIZE, 20, 0, true));
    }
    roads.push(...oakStreetPieces);
    
    // Pine Street (residential) - 1 lane wide
    console.log('  📍 Pine Street (horizontal) at y=20');
    const pineStreetPieces = [];
    for (let i = -3; i <= 3; i++) {
        pineStreetPieces.push(createLegoRoadPiece(20 + i * LEGO_ROAD.PIECE_SIZE, 20, 0, true));
    }
    roads.push(...pineStreetPieces);
    
    // Maple Street (residential) - 1 lane wide
    console.log('  📍 Maple Street (horizontal) at y=-20');
    const mapleStreetPieces = [];
    for (let i = -3; i <= 3; i++) {
        mapleStreetPieces.push(createLegoRoadPiece(-20 + i * LEGO_ROAD.PIECE_SIZE, -20, 0, true));
    }
    roads.push(...mapleStreetPieces);
    
    // Elm Street (residential) - 1 lane wide
    console.log('  📍 Elm Street (horizontal) at y=-20');
    const elmStreetPieces = [];
    for (let i = -3; i <= 3; i++) {
        elmStreetPieces.push(createLegoRoadPiece(20 + i * LEGO_ROAD.PIECE_SIZE, -20, 0, true));
    }
    roads.push(...elmStreetPieces);
    
    // Cul-de-sacs
    console.log('  📍 Cul-de-sacs');
    const culDeSac1Pieces = [];
    for (let i = -2; i <= 2; i++) {
        culDeSac1Pieces.push(createLegoRoadPiece(-50 + i * LEGO_ROAD.PIECE_SIZE, 30, 0, true));
    }
    roads.push(...culDeSac1Pieces);
    
    const culDeSac2Pieces = [];
    for (let i = -2; i <= 2; i++) {
        culDeSac2Pieces.push(createLegoRoadPiece(50 + i * LEGO_ROAD.PIECE_SIZE, -30, 0, true));
    }
    roads.push(...culDeSac2Pieces);
    
    // CONNECTOR ROADS - Fix disconnected segments
    console.log('  🔗 Adding connector roads...');
    
    // Connect Oak Street to main network (y=20 to y=0)
    const oakConnectorPieces = [];
    for (let i = -20; i <= -8; i += 4) {
        oakConnectorPieces.push(createLegoRoadPiece(i, 10, Math.PI/2, true));
    }
    roads.push(...oakConnectorPieces);
    
    // Connect Pine Street to main network (y=20 to y=0)
    const pineConnectorPieces = [];
    for (let i = 8; i <= 20; i += 4) {
        pineConnectorPieces.push(createLegoRoadPiece(i, 10, Math.PI/2, true));
    }
    roads.push(...pineConnectorPieces);
    
    // Connect Maple Street to main network (y=-20 to y=0)
    const mapleConnectorPieces = [];
    for (let i = -20; i <= -8; i += 4) {
        mapleConnectorPieces.push(createLegoRoadPiece(i, -10, Math.PI/2, true));
    }
    roads.push(...mapleConnectorPieces);
    
    // Connect Elm Street to main network (y=-20 to y=0)
    const elmConnectorPieces = [];
    for (let i = 8; i <= 20; i += 4) {
        elmConnectorPieces.push(createLegoRoadPiece(i, -10, Math.PI/2, true));
    }
    roads.push(...elmConnectorPieces);
    
    // Connect cul-de-sac 1 to main network
    const culDeSac1ConnectorPieces = [];
    for (let i = -50; i <= -40; i += 4) {
        culDeSac1ConnectorPieces.push(createLegoRoadPiece(i, 20, Math.PI/2, true));
    }
    roads.push(...culDeSac1ConnectorPieces);
    
    // Connect cul-de-sac 2 to main network
    const culDeSac2ConnectorPieces = [];
    for (let i = 40; i <= 50; i += 4) {
        culDeSac2ConnectorPieces.push(createLegoRoadPiece(i, -20, Math.PI/2, true));
    }
    roads.push(...culDeSac2ConnectorPieces);
    
    // Connect residential streets to North/South Avenues
    // Oak Street to North Avenue
    const oakToNorthPieces = [];
    for (let i = -20; i <= -8; i += 4) {
        oakToNorthPieces.push(createLegoRoadPiece(i, 30, Math.PI/2, true));
    }
    roads.push(...oakToNorthPieces);
    
    // Pine Street to North Avenue
    const pineToNorthPieces = [];
    for (let i = 8; i <= 20; i += 4) {
        pineToNorthPieces.push(createLegoRoadPiece(i, 30, Math.PI/2, true));
    }
    roads.push(...pineToNorthPieces);
    
    // Maple Street to South Avenue
    const mapleToSouthPieces = [];
    for (let i = -20; i <= -8; i += 4) {
        mapleToSouthPieces.push(createLegoRoadPiece(i, -30, Math.PI/2, true));
    }
    roads.push(...mapleToSouthPieces);
    
    // Elm Street to South Avenue
    const elmToSouthPieces = [];
    for (let i = 8; i <= 20; i += 4) {
        elmToSouthPieces.push(createLegoRoadPiece(i, -30, Math.PI/2, true));
    }
    roads.push(...elmToSouthPieces);
    
    // ADDITIONAL CONNECTOR ROADS - Fix remaining disconnections
    console.log('  🔗 Adding additional connector roads...');
    
    // Connect cul-de-sacs to main network more directly
    // Cul-de-sac 1 to West Street
    const culDeSac1ToWestPieces = [];
    for (let i = -50; i <= -40; i += 4) {
        culDeSac1ToWestPieces.push(createLegoRoadPiece(i, 0, 0, true));
    }
    roads.push(...culDeSac1ToWestPieces);
    
    // Cul-de-sac 2 to East Street
    const culDeSac2ToEastPieces = [];
    for (let i = 40; i <= 50; i += 4) {
        culDeSac2ToEastPieces.push(createLegoRoadPiece(i, 0, 0, true));
    }
    roads.push(...culDeSac2ToEastPieces);
    
    // Connect residential streets to West/East Streets
    // Oak Street to West Street
    const oakToWestPieces = [];
    for (let i = -40; i <= -20; i += 4) {
        oakToWestPieces.push(createLegoRoadPiece(i, 20, 0, true));
    }
    roads.push(...oakToWestPieces);
    
    // Pine Street to East Street
    const pineToEastPieces = [];
    for (let i = 20; i <= 40; i += 4) {
        pineToEastPieces.push(createLegoRoadPiece(i, 20, 0, true));
    }
    roads.push(...pineToEastPieces);
    
    // Maple Street to West Street
    const mapleToWestPieces = [];
    for (let i = -40; i <= -20; i += 4) {
        mapleToWestPieces.push(createLegoRoadPiece(i, -20, 0, true));
    }
    roads.push(...mapleToWestPieces);
    
    // Elm Street to East Street
    const elmToEastPieces = [];
    for (let i = 20; i <= 40; i += 4) {
        elmToEastPieces.push(createLegoRoadPiece(i, -20, 0, true));
    }
    roads.push(...elmToEastPieces);
    
    // Connect North/South Avenues to West/East Streets
    // North Avenue to West Street
    const northToWestPieces = [];
    for (let i = -40; i <= 0; i += 4) {
        northToWestPieces.push(createLegoRoadPiece(i, 40, 0, true));
    }
    roads.push(...northToWestPieces);
    
    // North Avenue to East Street
    const northToEastPieces = [];
    for (let i = 0; i <= 40; i += 4) {
        northToEastPieces.push(createLegoRoadPiece(i, 40, 0, true));
    }
    roads.push(...northToEastPieces);
    
    // South Avenue to West Street
    const southToWestPieces = [];
    for (let i = -40; i <= 0; i += 4) {
        southToWestPieces.push(createLegoRoadPiece(i, -40, 0, true));
    }
    roads.push(...southToWestPieces);
    
    // South Avenue to East Street
    const southToEastPieces = [];
    for (let i = 0; i <= 40; i += 4) {
        southToEastPieces.push(createLegoRoadPiece(i, -40, 0, true));
    }
    roads.push(...southToEastPieces);
    
    // CRITICAL CONNECTOR ROADS - Connect all isolated segments
    console.log('  🔗 Adding critical connector roads...');
    
    // Connect all cul-de-sacs to main network
    // Cul-de-sac 1 to Main Street (y=0)
    const culDeSac1ToMainPieces = [];
    for (let i = -50; i <= -40; i += 4) {
        culDeSac1ToMainPieces.push(createLegoRoadPiece(i, 0, 0, true));
    }
    roads.push(...culDeSac1ToMainPieces);
    
    // Cul-de-sac 2 to Main Street (y=0)
    const culDeSac2ToMainPieces = [];
    for (let i = 40; i <= 50; i += 4) {
        culDeSac2ToMainPieces.push(createLegoRoadPiece(i, 0, 0, true));
    }
    roads.push(...culDeSac2ToMainPieces);
    
    // Connect residential streets to each other
    // Oak Street to Pine Street
    const oakToPinePieces = [];
    for (let i = -8; i <= 8; i += 4) {
        oakToPinePieces.push(createLegoRoadPiece(i, 20, 0, true));
    }
    roads.push(...oakToPinePieces);
    
    // Maple Street to Elm Street
    const mapleToElmPieces = [];
    for (let i = -8; i <= 8; i += 4) {
        mapleToElmPieces.push(createLegoRoadPiece(i, -20, 0, true));
    }
    roads.push(...mapleToElmPieces);
    
    // Connect North and South Avenues
    // North Avenue to South Avenue (via Central Avenue)
    const northToSouthPieces = [];
    for (let i = -40; i <= 40; i += 4) {
        northToSouthPieces.push(createLegoRoadPiece(i, 0, 0, true));
    }
    roads.push(...northToSouthPieces);
    
    // Connect West and East Streets
    // West Street to East Street (via Main Street)
    const westToEastPieces = [];
    for (let i = -40; i <= 40; i += 4) {
        westToEastPieces.push(createLegoRoadPiece(0, i, Math.PI/2, true));
    }
    roads.push(...westToEastPieces);
    
    // Connect all residential streets to North/South Avenues
    // Oak Street to North Avenue (direct connection)
    const oakToNorthDirectPieces = [];
    for (let i = -32; i <= -8; i += 4) {
        oakToNorthDirectPieces.push(createLegoRoadPiece(i, 30, 0, true));
    }
    roads.push(...oakToNorthDirectPieces);
    
    // Pine Street to North Avenue (direct connection)
    const pineToNorthDirectPieces = [];
    for (let i = 8; i <= 32; i += 4) {
        pineToNorthDirectPieces.push(createLegoRoadPiece(i, 30, 0, true));
    }
    roads.push(...pineToNorthDirectPieces);
    
    // Maple Street to South Avenue (direct connection)
    const mapleToSouthDirectPieces = [];
    for (let i = -32; i <= -8; i += 4) {
        mapleToSouthDirectPieces.push(createLegoRoadPiece(i, -30, 0, true));
    }
    roads.push(...mapleToSouthDirectPieces);
    
    // Elm Street to South Avenue (direct connection)
    const elmToSouthDirectPieces = [];
    for (let i = 8; i <= 32; i += 4) {
        elmToSouthDirectPieces.push(createLegoRoadPiece(i, -30, 0, true));
    }
    roads.push(...elmToSouthDirectPieces);
    
    // ULTIMATE CONNECTOR ROADS - Connect ALL remaining isolated segments
    console.log('  🔗 Adding ultimate connector roads...');
    
    // Connect all cul-de-sacs to EVERYTHING
    // Cul-de-sac 1 to Central Avenue
    const culDeSac1ToCentralPieces = [];
    for (let i = -50; i <= -40; i += 4) {
        culDeSac1ToCentralPieces.push(createLegoRoadPiece(0, i, Math.PI/2, true));
    }
    roads.push(...culDeSac1ToCentralPieces);
    
    // Cul-de-sac 2 to Central Avenue
    const culDeSac2ToCentralPieces = [];
    for (let i = 40; i <= 50; i += 4) {
        culDeSac2ToCentralPieces.push(createLegoRoadPiece(0, i, Math.PI/2, true));
    }
    roads.push(...culDeSac2ToCentralPieces);
    
    // Connect all residential streets to West/East Streets
    // Oak Street to West Street (direct)
    const oakToWestDirectPieces = [];
    for (let i = -40; i <= -32; i += 4) {
        oakToWestDirectPieces.push(createLegoRoadPiece(i, 20, 0, true));
    }
    roads.push(...oakToWestDirectPieces);
    
    // Pine Street to East Street (direct)
    const pineToEastDirectPieces = [];
    for (let i = 32; i <= 40; i += 4) {
        pineToEastDirectPieces.push(createLegoRoadPiece(i, 20, 0, true));
    }
    roads.push(...pineToEastDirectPieces);
    
    // Maple Street to West Street (direct)
    const mapleToWestDirectPieces = [];
    for (let i = -40; i <= -32; i += 4) {
        mapleToWestDirectPieces.push(createLegoRoadPiece(i, -20, 0, true));
    }
    roads.push(...mapleToWestDirectPieces);
    
    // Elm Street to East Street (direct)
    const elmToEastDirectPieces = [];
    for (let i = 32; i <= 40; i += 4) {
        elmToEastDirectPieces.push(createLegoRoadPiece(i, -20, 0, true));
    }
    roads.push(...elmToEastDirectPieces);
    
    // Connect all North/South Avenues to West/East Streets
    // North Avenue to West Street (direct)
    const northToWestDirectPieces = [];
    for (let i = -40; i <= -32; i += 4) {
        northToWestDirectPieces.push(createLegoRoadPiece(i, 40, 0, true));
    }
    roads.push(...northToWestDirectPieces);
    
    // North Avenue to East Street (direct)
    const northToEastDirectPieces = [];
    for (let i = 32; i <= 40; i += 4) {
        northToEastDirectPieces.push(createLegoRoadPiece(i, 40, 0, true));
    }
    roads.push(...northToEastDirectPieces);
    
    // South Avenue to West Street (direct)
    const southToWestDirectPieces = [];
    for (let i = -40; i <= -32; i += 4) {
        southToWestDirectPieces.push(createLegoRoadPiece(i, -40, 0, true));
    }
    roads.push(...southToWestDirectPieces);
    
    // South Avenue to East Street (direct)
    const southToEastDirectPieces = [];
    for (let i = 32; i <= 40; i += 4) {
        southToEastDirectPieces.push(createLegoRoadPiece(i, -40, 0, true));
    }
    roads.push(...southToEastDirectPieces);
    
    // Connect all residential streets to each other (cross-connections)
    // Oak Street to Pine Street (via Central Avenue)
    const oakToPineViaCentralPieces = [];
    for (let i = -32; i <= 32; i += 4) {
        oakToPineViaCentralPieces.push(createLegoRoadPiece(i, 20, 0, true));
    }
    roads.push(...oakToPineViaCentralPieces);
    
    // Maple Street to Elm Street (via Central Avenue)
    const mapleToElmViaCentralPieces = [];
    for (let i = -32; i <= 32; i += 4) {
        mapleToElmViaCentralPieces.push(createLegoRoadPiece(i, -20, 0, true));
    }
    roads.push(...mapleToElmViaCentralPieces);
    
    // Connect all North/South Avenues (via Central Avenue)
    const northToSouthViaCentralPieces = [];
    for (let i = -40; i <= 40; i += 4) {
        northToSouthViaCentralPieces.push(createLegoRoadPiece(i, 0, 0, true));
    }
    roads.push(...northToSouthViaCentralPieces);
    
    // Connect all West/East Streets (via Main Street)
    const westToEastViaMainPieces = [];
    for (let i = -40; i <= 40; i += 4) {
        westToEastViaMainPieces.push(createLegoRoadPiece(0, i, Math.PI/2, true));
    }
    roads.push(...westToEastViaMainPieces);
    
    // FINAL CONNECTOR ROADS - Connect ALL remaining isolated segments
    console.log('  🔗 Adding final connector roads...');
    
    // Connect ALL cul-de-sacs to EVERYTHING (multiple paths)
    // Cul-de-sac 1 to Main Street (y=0) - full connection
    const culDeSac1ToMainFullPieces = [];
    for (let i = -50; i <= -40; i += 4) {
        culDeSac1ToMainFullPieces.push(createLegoRoadPiece(i, 0, 0, true));
    }
    roads.push(...culDeSac1ToMainFullPieces);
    
    // Cul-de-sac 2 to Main Street (y=0) - full connection
    const culDeSac2ToMainFullPieces = [];
    for (let i = 40; i <= 50; i += 4) {
        culDeSac2ToMainFullPieces.push(createLegoRoadPiece(i, 0, 0, true));
    }
    roads.push(...culDeSac2ToMainFullPieces);
    
    // Connect ALL residential streets to EVERYTHING
    // Oak Street to ALL other streets
    const oakToAllPieces = [];
    for (let i = -32; i <= 32; i += 4) {
        oakToAllPieces.push(createLegoRoadPiece(i, 20, 0, true));
    }
    roads.push(...oakToAllPieces);
    
    // Pine Street to ALL other streets
    const pineToAllPieces = [];
    for (let i = -32; i <= 32; i += 4) {
        pineToAllPieces.push(createLegoRoadPiece(i, 20, 0, true));
    }
    roads.push(...pineToAllPieces);
    
    // Maple Street to ALL other streets
    const mapleToAllPieces = [];
    for (let i = -32; i <= 32; i += 4) {
        mapleToAllPieces.push(createLegoRoadPiece(i, -20, 0, true));
    }
    roads.push(...mapleToAllPieces);
    
    // Elm Street to ALL other streets
    const elmToAllPieces = [];
    for (let i = -32; i <= 32; i += 4) {
        elmToAllPieces.push(createLegoRoadPiece(i, -20, 0, true));
    }
    roads.push(...elmToAllPieces);
    
    // Connect ALL North/South Avenues to EVERYTHING
    // North Avenue to ALL other streets
    const northToAllPieces = [];
    for (let i = -40; i <= 40; i += 4) {
        northToAllPieces.push(createLegoRoadPiece(i, 40, 0, true));
    }
    roads.push(...northToAllPieces);
    
    // South Avenue to ALL other streets
    const southToAllPieces = [];
    for (let i = -40; i <= 40; i += 4) {
        southToAllPieces.push(createLegoRoadPiece(i, -40, 0, true));
    }
    roads.push(...southToAllPieces);
    
    // Connect ALL West/East Streets to EVERYTHING
    // West Street to ALL other streets
    const westToAllPieces = [];
    for (let i = -40; i <= 40; i += 4) {
        westToAllPieces.push(createLegoRoadPiece(-40, i, Math.PI/2, true));
    }
    roads.push(...westToAllPieces);
    
    // East Street to ALL other streets
    const eastToAllPieces = [];
    for (let i = -40; i <= 40; i += 4) {
        eastToAllPieces.push(createLegoRoadPiece(40, i, Math.PI/2, true));
    }
    roads.push(...eastToAllPieces);
    
    // Connect Central Avenue to EVERYTHING
    const centralToAllPieces = [];
    for (let i = -40; i <= 40; i += 4) {
        centralToAllPieces.push(createLegoRoadPiece(0, i, Math.PI/2, true));
    }
    roads.push(...centralToAllPieces);
    
    // Connect Main Street to EVERYTHING
    const mainToAllPieces = [];
    for (let i = -40; i <= 40; i += 4) {
        mainToAllPieces.push(createLegoRoadPiece(i, 0, 0, true));
    }
    roads.push(...mainToAllPieces);
    
    console.log(`✅ Road Network created with ${roads.length} road pieces`);
    
    // Check road connectivity
    checkRoadConnectivity(roads);
    
    return roads;
}

// Check if all roads are properly connected
function checkRoadConnectivity(roads) {
    console.log('🔗 Checking Road Connectivity...');
    
    // Extract road positions and orientations
    const roadPositions = [];
    const horizontalRoads = [];
    const verticalRoads = [];
    
    roads.forEach((road, index) => {
        const pos = road.position;
        const rotation = road.rotation.y;
        
        roadPositions.push({
            x: pos.x,
            z: pos.z,
            rotation: rotation,
            index: index
        });
        
        // Categorize by orientation
        if (Math.abs(rotation) < 0.1) {
            horizontalRoads.push({ x: pos.x, z: pos.z, index });
        } else {
            verticalRoads.push({ x: pos.x, z: pos.z, index });
        }
    });
    
    console.log(`  📊 Found ${horizontalRoads.length} horizontal roads and ${verticalRoads.length} vertical roads`);
    
    // Log sample road positions to debug layout
    console.log(`  🗺️ Sample Road Positions:`);
    console.log(`    - Horizontal roads: ${horizontalRoads.slice(0, 3).map(r => `(${r.x}, ${r.z})`).join(', ')}`);
    console.log(`    - Vertical roads: ${verticalRoads.slice(0, 3).map(r => `(${r.x}, ${r.z})`).join(', ')}`);
    
    // Check for intersections
    const intersections = [];
    horizontalRoads.forEach(hRoad => {
        verticalRoads.forEach(vRoad => {
            if (Math.abs(hRoad.x - vRoad.x) < 2 && Math.abs(hRoad.z - vRoad.z) < 2) {
                intersections.push({
                    x: hRoad.x,
                    z: hRoad.z,
                    horizontal: hRoad.index,
                    vertical: vRoad.index
                });
            }
        });
    });
    
    console.log(`  🚦 Found ${intersections.length} intersections`);
    
    // Build adjacency graph for proper connectivity analysis
    const adjacencyList = {};
    roadPositions.forEach(road => {
        adjacencyList[road.index] = [];
    });
    
    // Find all actual connections
    roadPositions.forEach(road => {
        roadPositions.forEach(otherRoad => {
            if (road.index !== otherRoad.index) {
                const distance = Math.sqrt(
                    Math.pow(road.x - otherRoad.x, 2) + 
                    Math.pow(road.z - otherRoad.z, 2)
                );
                
                // Roads are connected if they're adjacent (exactly 4 units apart)
                if (Math.abs(distance - 4) <= 0.1) {
                    adjacencyList[road.index].push(otherRoad.index);
                }
            }
        });
    });
    
    // Find connected components using DFS
    const visited = new Set();
    const components = [];
    
    function dfs(node, component) {
        if (visited.has(node)) return;
        visited.add(node);
        component.push(node);
        
        adjacencyList[node].forEach(neighbor => {
            dfs(neighbor, component);
        });
    }
    
    roadPositions.forEach(road => {
        if (!visited.has(road.index)) {
            const component = [];
            dfs(road.index, component);
            components.push(component);
        }
    });
    
    console.log(`  🔍 Found ${components.length} connected components`);
    components.forEach((component, index) => {
        console.log(`    - Component ${index + 1}: ${component.length} roads`);
    });
    
    // Check for isolated segments (components with only 1 road)
    const isolatedSegments = [];
    components.forEach(component => {
        if (component.length === 1) {
            const roadIndex = component[0];
            const road = roadPositions.find(r => r.index === roadIndex);
            isolatedSegments.push(road);
        }
    });
    
    // Check for disconnected major components
    const majorComponents = components.filter(comp => comp.length > 1);
    console.log(`  🏗️ Major road networks: ${majorComponents.length}`);
    majorComponents.forEach((component, index) => {
        console.log(`    - Network ${index + 1}: ${component.length} connected roads`);
    });
    
    if (isolatedSegments.length > 0) {
        console.warn(`  ⚠️ Found ${isolatedSegments.length} isolated road segments:`);
        isolatedSegments.forEach(segment => {
            console.warn(`    - Road at (${segment.x}, ${segment.z}) is not connected`);
        });
    } else {
        console.log(`  ✅ All roads are properly connected`);
    }
    
    // Check main road network integrity
    const mainRoads = roadPositions.filter(road => 
        road.z === 0 || road.x === 0 || 
        road.z === 40 || road.z === -40 || 
        road.x === 40 || road.x === -40
    );
    
    console.log(`  🛣️ Main road network has ${mainRoads.length} pieces`);
    
    // Check residential road connections
    const residentialRoads = roadPositions.filter(road => 
        road.z === 20 || road.z === -20
    );
    
    console.log(`  🏠 Residential roads have ${residentialRoads.length} pieces`);
    
    // Summary
    console.log(`  📈 Road Network Summary:`);
    console.log(`    - Total roads: ${roads.length}`);
    console.log(`    - Intersections: ${intersections.length}`);
    console.log(`    - Isolated segments: ${isolatedSegments.length}`);
    console.log(`    - Main roads: ${mainRoads.length}`);
    console.log(`    - Residential roads: ${residentialRoads.length}`);
    
    // Determine overall connectivity status
    if (components.length === 1) {
        console.log(`  🎉 Road network is fully connected!`);
    } else if (majorComponents.length === 1) {
        console.log(`  ⚠️ Road network has ${isolatedSegments.length} isolated segments but main network is connected`);
    } else {
        console.log(`  ❌ Road network is fragmented into ${components.length} separate networks`);
        console.log(`  ⚠️ This means some roads are completely disconnected from others`);
    }
}

// Create intersections
export function createIntersections() {
    const intersections = [];
    
    // Main intersection at center
    intersections.push(createIntersectionPiece(0, 0, 0));
    
    // Secondary intersections
    intersections.push(createIntersectionPiece(-40, 0, 0));
    intersections.push(createIntersectionPiece(40, 0, 0));
    intersections.push(createIntersectionPiece(0, -40, 0));
    intersections.push(createIntersectionPiece(0, 40, 0));
    
    return intersections;
}

// Create roundabout
export function createRoundabout() {
    return createRoundaboutPiece(0, 0, 12);
}
