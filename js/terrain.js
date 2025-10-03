import { CONFIG } from './config.js';

// Create improved terrain
export function createTerrain() {
    // Use a very large plane to simulate infinite ground
    const size = CONFIG.ENVIRONMENT.TERRAIN_SIZE * 10;
    const segments = Math.max(10, CONFIG.ENVIRONMENT.TERRAIN_SEGMENTS);
    const landGeometry = new THREE.PlaneGeometry(
        size,
        size,
        segments,
        segments
    );
    landGeometry.rotateX(-Math.PI / 2);
    
    // Keep terrain completely flat for roads
    // No height variations - all vertices at y=0
    const vertices = landGeometry.attributes.position.array;
    for (let i = 0; i < vertices.length; i += 3) {
        vertices[i + 1] = 0; // Set all y-coordinates to 0
    }
    landGeometry.attributes.position.needsUpdate = true;
    landGeometry.computeVertexNormals();
    
    // Create a subtle repeating grid/texture-like color with vertex colors disabled for simplicity
    const landMaterial = new THREE.MeshLambertMaterial({
        color: 0x3faf84, // slightly greener ground
        side: THREE.DoubleSide
    });
    
    // Create land mesh
    const land = new THREE.Mesh(landGeometry, landMaterial);
    land.receiveShadow = true;
    land.castShadow = true;
    
    // Keep details near the playable area only
    addTerrainDetails(land);
    
    return land;
}

// Add neat, organized terrain details
function addTerrainDetails(terrain) {
    const detailGroup = new THREE.Group();
    const rocks = [];
    const primaryZ = [ -60, -40, -20, 0, 20, 40, 60 ];
    const primaryX = [ -60, -40, 0, 40, 60 ];
    const rockClearance = 5; // minimum distance from road centerlines
    function clampAwayFromRoads(pos) {
        for (const rz of primaryZ) {
            const dz = Math.abs(pos.z - rz);
            if (dz < rockClearance) {
                pos.z = rz + (pos.z >= rz ? 1 : -1) * (rockClearance + Math.random());
            }
        }
        for (const rx of primaryX) {
            const dx = Math.abs(pos.x - rx);
            if (dx < rockClearance) {
                pos.x = rx + (pos.x >= rx ? 1 : -1) * (rockClearance + Math.random());
            }
        }
    }
    
    // Grid-based rock placement to ensure proper spacing
    const gridSize = 15; // Minimum distance between rocks
    const grid = [];
    
    // Function to check if a position is valid (not too close to other rocks or roads)
    function isValidPosition(x, z) {
        // Check against roads
        for (const rz of primaryZ) {
            if (Math.abs(z - rz) < rockClearance + 2) return false;
        }
        for (const rx of primaryX) {
            if (Math.abs(x - rx) < rockClearance + 2) return false;
        }
        
        // Check against other rocks
        const gridX = Math.round(x / gridSize) * gridSize;
        const gridZ = Math.round(z / gridSize) * gridSize;
        
        if (grid[`${gridX},${gridZ}`]) return false;
        
        // Mark this grid cell as occupied
        grid[`${gridX},${gridZ}`] = true;
        return true;
    }
    
    // Generate rock positions using grid system
    const rockPositions = [];
    const mapSize = 70; // Half of map size
    const minDistanceFromCenter = 15; // Don't place rocks too close to center
    
    // Try to place 9 rocks with proper spacing
    let attempts = 0;
    const maxAttempts = 100;
    
    while (rockPositions.length < 9 && attempts < maxAttempts) {
        attempts++;
        
        // Generate position in a ring around the center
        const angle = Math.random() * Math.PI * 2;
        const distance = minDistanceFromCenter + Math.random() * (mapSize - minDistanceFromCenter - 5);
        let x = Math.cos(angle) * distance;
        let z = Math.sin(angle) * distance;
        
        // Snap to grid for better spacing
        x = Math.round(x / 2) * 2; // Snap to even coordinates
        z = Math.round(z / 2) * 2;
        
        if (isValidPosition(x, z)) {
            rockPositions.push({ x, z });
        }
    }
    
    // If we couldn't place enough rocks, add some at fixed positions
    const fallbackPositions = [
        { x: -30, z: 30 },
        { x: 30, z: 30 },
        { x: -30, z: -30 },
        { x: 30, z: -30 },
        { x: 0, z: 40 },
        { x: 0, z: -40 },
        { x: 40, z: 0 },
        { x: -40, z: 0 },
        { x: 40, z: 40 }
    ];
    
    // Add fallback positions if needed
    for (const pos of fallbackPositions) {
        if (rockPositions.length >= 9) break;
        if (isValidPosition(pos.x, pos.z)) {
            rockPositions.push(pos);
        }
    }
    
    // Convert positions to cluster format
    const rockClusters = rockPositions.map(pos => ({
        x: pos.x,
        z: pos.z,
        count: 1
    }));
    
    // No position variance - exact placement
    const positionVariance = 0;
    
    rockClusters.forEach(cluster => {
        for (let i = 0; i < cluster.count; i++) {
            const rock = createRock();
            // Use smaller variance for optimized positions
            // Use exact positions with no variance
            const offsetX = 0;
            const offsetZ = 0;
            rock.position.set(cluster.x + offsetX, 0.05, cluster.z + offsetZ);
            clampAwayFromRoads(rock.position);
            detailGroup.add(rock);
            rocks.push(rock);
        }
    });
    
    terrain.add(detailGroup);
    // Expose rocks so other systems (collision, logging) can read them
    terrain.userData = terrain.userData || {};
    terrain.userData.rocks = rocks;
}

// Create small rock
function createRock() {
    const rockGeometry = new THREE.SphereGeometry(
        0.2 + Math.random() * 0.3,
        6,
        4
    );
    const rockMaterial = new THREE.MeshLambertMaterial({
        color: 0x444444
    });
    const rock = new THREE.Mesh(rockGeometry, rockMaterial);
    rock.scale.set(
        1 + Math.random() * 0.5,
        0.5 + Math.random() * 0.3,
        1 + Math.random() * 0.5
    );
    rock.rotation.set(
        Math.random() * Math.PI,
        Math.random() * Math.PI,
        Math.random() * Math.PI
    );
    rock.castShadow = true;
    rock.receiveShadow = true;
    rock.name = 'rock';
    return rock;
}
