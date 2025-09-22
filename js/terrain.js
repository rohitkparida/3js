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
        }
    });
    
    // Add grass patches in organized areas
    const grassAreas = [
        { x: -40, z: 0, count: 4 },
        { x: 40, z: 0, count: 4 },
        { x: 0, z: -40, count: 3 },
        { x: 0, z: 40, count: 3 }
    ];
    
    grassAreas.forEach(area => {
        for (let i = 0; i < area.count; i++) {
            const grassPatch = createGrassPatch();
            const offsetX = (Math.random() - 0.5) * 10;
            const offsetZ = (Math.random() - 0.5) * 10;
            grassPatch.position.set(area.x + offsetX, 0.02, area.z + offsetZ);
            detailGroup.add(grassPatch);
        }
    });
    
    terrain.add(detailGroup);
}

// Create small rock
function createRock() {
    const rockGeometry = new THREE.SphereGeometry(
        0.2 + Math.random() * 0.3,
        6,
        4
    );
    const rockMaterial = new THREE.MeshLambertMaterial({
        color: 0x666666 + Math.random() * 0x333333
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
    return rock;
}

// Create grass patch
function createGrassPatch() {
    const patchGroup = new THREE.Group();
    
    // Create multiple grass blades
    for (let i = 0; i < 8 + Math.random() * 12; i++) {
        const blade = createGrassBlade();
        blade.position.set(
            (Math.random() - 0.5) * 2,
            0,
            (Math.random() - 0.5) * 2
        );
        blade.rotation.y = Math.random() * Math.PI * 2;
        patchGroup.add(blade);
    }
    
    return patchGroup;
}

// Create individual grass blade
function createGrassBlade() {
    const bladeGeometry = new THREE.CylinderGeometry(0.01, 0.02, 0.3 + Math.random() * 0.4, 3);
    const bladeMaterial = new THREE.MeshLambertMaterial({
        color: 0x228B22 + Math.random() * 0x444444
    });
    const blade = new THREE.Mesh(bladeGeometry, bladeMaterial);
    blade.castShadow = true;
    blade.receiveShadow = true;
    return blade;
}
