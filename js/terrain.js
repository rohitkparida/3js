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
    
    // Add a few rocks in organized clusters
    const rockClusters = [
        { x: -30, z: -30, count: 3 },
        { x: 30, z: 30, count: 3 },
        { x: -20, z: 40, count: 2 },
        { x: 40, z: -20, count: 2 }
    ];
    
    rockClusters.forEach(cluster => {
        for (let i = 0; i < cluster.count; i++) {
            const rock = createRock();
            const offsetX = (Math.random() - 0.5) * 8;
            const offsetZ = (Math.random() - 0.5) * 8;
            rock.position.set(cluster.x + offsetX, 0.05, cluster.z + offsetZ);
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
