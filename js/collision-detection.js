// Comprehensive Collision Detection System with BVH Optimization
// Note: three-mesh-bvh is loaded via UMD in HTML, available globally

export class CollisionDetector {
    constructor() {
        this.collisions = [];
        this.roadPositions = [];
        this.buildingPositions = [];
        this.treePositions = [];
        this.rockPositions = [];

        // BVH structures for spatial queries
        this.bvhMeshes = new Map(); // Mesh -> BVH mapping
        this.bvhInitialized = false;
    }

    // Initialize BVH acceleration for raycasting
    initializeBVH() {
        if (typeof THREE !== 'undefined' && THREE.Mesh) {
            try {
                // Check if three-mesh-bvh UMD build is loaded globally
                if (typeof window !== 'undefined' && window.MeshBVH && window.acceleratedRaycast) {
                    // Enable accelerated raycasting globally
                    THREE.Mesh.prototype.raycast = window.acceleratedRaycast;
                    this.bvhInitialized = true;
                    console.log('✅ BVH acceleration enabled for raycasting (UMD)');
                    return;
                }

                // Fallback: try direct global access
                if (typeof MeshBVH !== 'undefined' && typeof acceleratedRaycast !== 'undefined') {
                    THREE.Mesh.prototype.raycast = acceleratedRaycast;
                    this.bvhInitialized = true;
                    console.log('✅ BVH acceleration enabled for raycasting (global)');
                    return;
                }

                console.warn('⚠️ three-mesh-bvh not found globally');
                this.bvhInitialized = false;
            } catch (error) {
                console.warn('⚠️ BVH acceleration failed:', error);
                this.bvhInitialized = false;
            }
        }
    }

    // Build BVH for a mesh (for raycasting optimization)
    buildBVHForMesh(mesh) {
        if (!mesh.geometry || !this.bvhInitialized) return null;

        try {
            // Get MeshBVH constructor from global scope
            const MeshBVH = typeof window !== 'undefined' && window.MeshBVH ? window.MeshBVH :
                           typeof global !== 'undefined' && global.MeshBVH ? global.MeshBVH :
                           typeof MeshBVH !== 'undefined' ? MeshBVH : null;

            if (!MeshBVH) {
                console.warn('⚠️ MeshBVH constructor not found');
                return null;
            }

            // Compute bounds tree for the geometry
            const bvh = new MeshBVH(mesh.geometry);
            this.bvhMeshes.set(mesh, bvh);

            // Store BVH reference in mesh for easy access
            mesh.userData.bvh = bvh;

            console.log(`🏗️ Built BVH for mesh: ${mesh.name || 'unnamed'}`);
            return bvh;
        } catch (error) {
            console.warn('⚠️ Failed to build BVH for mesh:', error);
            return null;
        }
    }

    // Fast ray-mesh intersection using BVH
    raycastMesh(raycaster, mesh) {
        if (!mesh.userData.bvh) {
            this.buildBVHForMesh(mesh);
        }

        const bvh = mesh.userData.bvh;
        if (!bvh) return [];

        // Use BVH-accelerated raycasting
        const intersects = [];
        raycaster.intersectObject(mesh, false, intersects);
        return intersects;
    }

    // Fast spatial query using BVH for collision detection
    queryBVHSphere(center, radius) {
        const results = [];

        // Check each BVH-enabled mesh for sphere intersection
        this.bvhMeshes.forEach((bvh, mesh) => {
            try {
                // Create a sphere for the query
                const sphere = new THREE.Sphere(center, radius);

                // Use BVH to find intersecting triangles
                const triangles = [];
                bvh.intersectsSphere(sphere, triangles);

                if (triangles.length > 0) {
                    results.push({
                        mesh: mesh,
                        triangles: triangles.length,
                        distance: center.distanceTo(mesh.position)
                    });
                }
            } catch (error) {
                console.warn('BVH sphere query failed:', error);
            }
        });

        return results;
    }

    // Fast bounding box query using BVH
    queryBVHBox(box) {
        const results = [];

        this.bvhMeshes.forEach((bvh, mesh) => {
            try {
                const intersects = bvh.intersectsBox(box);
                if (intersects) {
                    results.push(mesh);
                }
            } catch (error) {
                console.warn('BVH box query failed:', error);
            }
        });

        return results;
    }

    // Add road positions for collision detection
    addRoads(roads) {
        this.roadPositions = [];
        roads.forEach(road => {
            const position = road.position;
            const rotation = road.rotation;
            const size = 4; // LEGO road piece size
            
            // Calculate road bounds based on rotation
            if (Math.abs(rotation.y) < 0.1) {
                // Horizontal road
                this.roadPositions.push({
                    x: position.x,
                    z: position.z,
                    width: size,
                    height: size,
                    type: 'horizontal'
                });
            } else {
                // Vertical road
                this.roadPositions.push({
                    x: position.x,
                    z: position.z,
                    width: size,
                    height: size,
                    type: 'vertical'
                });
            }
        });
        console.log(`📊 Added ${this.roadPositions.length} road positions for collision detection`);
    }

    // Add building positions for collision detection
    addBuildings(buildings) {
        this.buildingPositions = [];
        buildings.forEach(building => {
            if (building.children && building.children.length > 0) {
                // Get bounding box for building group
                const box = new THREE.Box3().setFromObject(building);
                const size = box.getSize(new THREE.Vector3());
                const center = box.getCenter(new THREE.Vector3());
                
                this.buildingPositions.push({
                    x: center.x,
                    z: center.z,
                    width: size.x,
                    height: size.z,
                    type: 'building'
                });
            }
        });
        console.log(`🏢 Added ${this.buildingPositions.length} building positions for collision detection`);
    }

    // Add tree positions for collision detection
    addTrees(trees) {
        this.treePositions = [];
        trees.forEach(tree => {
            const position = tree.position;
            const scale = tree.scale;
            const radius = 1.5 * Math.max(scale.x, scale.z); // Tree canopy radius
            
            this.treePositions.push({
                x: position.x,
                z: position.z,
                radius: radius,
                type: 'tree'
            });
        });
        console.log(`🌳 Added ${this.treePositions.length} tree positions for collision detection`);
    }

    // Add rocks from terrain.userData.rocks if available
    addRocksFromTerrain(terrain) {
        this.rockPositions = [];
        const rocks = terrain && terrain.userData && terrain.userData.rocks ? terrain.userData.rocks : [];
        rocks.forEach((rock, i) => {
            const box = new THREE.Box3().setFromObject(rock);
            const size = box.getSize(new THREE.Vector3());
            const center = box.getCenter(new THREE.Vector3());
            this.rockPositions.push({
                x: center.x,
                z: center.z,
                width: size.x,
                height: size.z,
                type: 'rock'
            });
        });
        console.log(`🪨 Added ${this.rockPositions.length} rock positions for collision detection`);
    }

    // Check if two objects overlap
    checkOverlap(obj1, obj2) {
        if (obj1.type === 'tree' && obj2.type === 'tree') {
            // Tree to tree collision
            const distance = Math.sqrt(
                Math.pow(obj1.x - obj2.x, 2) + Math.pow(obj1.z - obj2.z, 2)
            );
            return distance < (obj1.radius + obj2.radius);
        } else if (obj1.type === 'tree' && obj2.type === 'building') {
            // Tree to building collision
            const dx = Math.abs(obj1.x - obj2.x);
            const dz = Math.abs(obj1.z - obj2.z);
            return dx < (obj1.radius + obj2.width/2) && dz < (obj1.radius + obj2.height/2);
        } else if (obj1.type === 'building' && obj2.type === 'building') {
            // Building to building collision
            const dx = Math.abs(obj1.x - obj2.x);
            const dz = Math.abs(obj1.z - obj2.z);
            return dx < (obj1.width + obj2.width)/2 && dz < (obj1.height + obj2.height)/2;
        } else if (obj1.type === 'rock' && obj2.type === 'horizontal') {
            // Rock to horizontal road
            const dx = Math.abs(obj1.x - obj2.x);
            const dz = Math.abs(obj1.z - obj2.z);
            return dx < (obj1.width/2 + obj2.width/2) && dz < (obj1.height/2 + obj2.height/2);
        } else if (obj1.type === 'rock' && obj2.type === 'vertical') {
            // Rock to vertical road
            const dx = Math.abs(obj1.x - obj2.x);
            const dz = Math.abs(obj1.z - obj2.z);
            return dx < (obj1.width/2 + obj2.width/2) && dz < (obj1.height/2 + obj2.height/2);
        } else if (obj1.type === 'tree' && obj2.type === 'horizontal') {
            // Tree to horizontal road collision
            const dx = Math.abs(obj1.x - obj2.x);
            const dz = Math.abs(obj1.z - obj2.z);
            return dx < (obj1.radius + obj2.width/2) && dz < (obj1.radius + obj2.height/2);
        } else if (obj1.type === 'tree' && obj2.type === 'vertical') {
            // Tree to vertical road collision
            const dx = Math.abs(obj1.x - obj2.x);
            const dz = Math.abs(obj1.z - obj2.z);
            return dx < (obj1.radius + obj2.width/2) && dz < (obj1.radius + obj2.height/2);
        } else if (obj1.type === 'building' && obj2.type === 'horizontal') {
            // Building to horizontal road collision
            const dx = Math.abs(obj1.x - obj2.x);
            const dz = Math.abs(obj1.z - obj2.z);
            return dx < (obj1.width + obj2.width)/2 && dz < (obj1.height + obj2.height)/2;
        } else if (obj1.type === 'building' && obj2.type === 'vertical') {
            // Building to vertical road collision
            const dx = Math.abs(obj1.x - obj2.x);
            const dz = Math.abs(obj1.z - obj2.z);
            return dx < (obj1.width + obj2.width)/2 && dz < (obj1.height + obj2.height)/2;
        } else if (obj1.type === 'rock' && obj2.type === 'building') {
            // Rock to building
            const dx = Math.abs(obj1.x - obj2.x);
            const dz = Math.abs(obj1.z - obj2.z);
            return dx < (obj1.width/2 + obj2.width/2) && dz < (obj1.height/2 + obj2.height/2);
        }
        return false;
    }

    // Detect all collisions
    detectAllCollisions() {
        this.collisions = [];
        console.log('🔍 Starting comprehensive collision detection...');
        
        // Check rock to road collisions
        console.log('  🪨 Checking rock to road collisions...');
        let rockRoadCollisions = 0;
        this.rockPositions.forEach((rock, i) => {
            this.roadPositions.forEach((road, j) => {
                if (this.checkOverlap(rock, road)) {
                    this.collisions.push({
                        type: 'rock-road',
                        object1: `Rock ${i+1} at (${rock.x.toFixed(1)}, ${rock.z.toFixed(1)})`,
                        object2: `${road.type} road at (${road.x.toFixed(1)}, ${road.z.toFixed(1)})`,
                        severity: 'low'
                    });
                    rockRoadCollisions++;
                }
            });
        });
        console.log(`    Found ${rockRoadCollisions} rock-road collisions`);

        // Check tree to road collisions
        console.log('  🌳 Checking tree to road collisions...');
        let treeRoadCollisions = 0;
        this.treePositions.forEach((tree, i) => {
            this.roadPositions.forEach((road, j) => {
                if (this.checkOverlap(tree, road)) {
                    this.collisions.push({
                        type: 'tree-road',
                        object1: `Tree ${i+1} at (${tree.x.toFixed(1)}, ${tree.z.toFixed(1)})`,
                        object2: `${road.type} road at (${road.x.toFixed(1)}, ${road.z.toFixed(1)})`,
                        severity: 'high'
                    });
                    treeRoadCollisions++;
                }
            });
        });
        console.log(`    Found ${treeRoadCollisions} tree-road collisions`);

        // Check building to road collisions
        console.log('  🏢 Checking building to road collisions...');
        let buildingRoadCollisions = 0;
        this.buildingPositions.forEach((building, i) => {
            this.roadPositions.forEach((road, j) => {
                if (this.checkOverlap(building, road)) {
                    this.collisions.push({
                        type: 'building-road',
                        object1: `Building ${i+1} at (${building.x.toFixed(1)}, ${building.z.toFixed(1)})`,
                        object2: `${road.type} road at (${road.x.toFixed(1)}, ${road.z.toFixed(1)})`,
                        severity: 'high'
                    });
                    buildingRoadCollisions++;
                }
            });
        });
        console.log(`    Found ${buildingRoadCollisions} building-road collisions`);

        // Check rock to building collisions
        console.log('  🪨🏢 Checking rock to building collisions...');
        let rockBuildingCollisions = 0;
        this.rockPositions.forEach((rock, i) => {
            this.buildingPositions.forEach((building, j) => {
                if (this.checkOverlap(rock, building)) {
                    this.collisions.push({
                        type: 'rock-building',
                        object1: `Rock ${i+1} at (${rock.x.toFixed(1)}, ${rock.z.toFixed(1)})`,
                        object2: `Building ${j+1} at (${building.x.toFixed(1)}, ${building.z.toFixed(1)})`,
                        severity: 'low'
                    });
                    rockBuildingCollisions++;
                }
            });
        });
        console.log(`    Found ${rockBuildingCollisions} rock-building collisions`);

        // Check tree to building collisions
        console.log('  🌳🏢 Checking tree to building collisions...');
        let treeBuildingCollisions = 0;
        this.treePositions.forEach((tree, i) => {
            this.buildingPositions.forEach((building, j) => {
                if (this.checkOverlap(tree, building)) {
                    this.collisions.push({
                        type: 'tree-building',
                        object1: `Tree ${i+1} at (${tree.x.toFixed(1)}, ${tree.z.toFixed(1)})`,
                        object2: `Building ${j+1} at (${building.x.toFixed(1)}, ${building.z.toFixed(1)})`,
                        severity: 'medium'
                    });
                    treeBuildingCollisions++;
                }
            });
        });
        console.log(`    Found ${treeBuildingCollisions} tree-building collisions`);

        // Check tree to tree collisions
        console.log('  🌳🌳 Checking tree to tree collisions...');
        let treeTreeCollisions = 0;
        for (let i = 0; i < this.treePositions.length; i++) {
            for (let j = i + 1; j < this.treePositions.length; j++) {
                if (this.checkOverlap(this.treePositions[i], this.treePositions[j])) {
                    this.collisions.push({
                        type: 'tree-tree',
                        object1: `Tree ${i+1} at (${this.treePositions[i].x.toFixed(1)}, ${this.treePositions[i].z.toFixed(1)})`,
                        object2: `Tree ${j+1} at (${this.treePositions[j].x.toFixed(1)}, ${this.treePositions[j].z.toFixed(1)})`,
                        severity: 'low'
                    });
                    treeTreeCollisions++;
                }
            }
        }
        console.log(`    Found ${treeTreeCollisions} tree-tree collisions`);

        // Check building to building collisions
        console.log('  🏢🏢 Checking building to building collisions...');
        let buildingBuildingCollisions = 0;
        for (let i = 0; i < this.buildingPositions.length; i++) {
            for (let j = i + 1; j < this.buildingPositions.length; j++) {
                if (this.checkOverlap(this.buildingPositions[i], this.buildingPositions[j])) {
                    this.collisions.push({
                        type: 'building-building',
                        object1: `Building ${i+1} at (${this.buildingPositions[i].x.toFixed(1)}, ${this.buildingPositions[i].z.toFixed(1)})`,
                        object2: `Building ${j+1} at (${this.buildingPositions[j].x.toFixed(1)}, ${this.buildingPositions[j].z.toFixed(1)})`,
                        severity: 'high'
                    });
                    buildingBuildingCollisions++;
                }
            }
        }
        console.log(`    Found ${buildingBuildingCollisions} building-building collisions`);

        // Summary
        console.log('📊 Collision Detection Summary:');
        console.log(`  🚨 Total collisions: ${this.collisions.length}`);
        console.log(`  🪨 Rock-road collisions: ${rockRoadCollisions}`);
        console.log(`  🌳 Tree-road collisions: ${treeRoadCollisions}`);
        console.log(`  🏢 Building-road collisions: ${buildingRoadCollisions}`);
        console.log(`  🪨🏢 Rock-building collisions: ${rockBuildingCollisions}`);
        console.log(`  🌳🏢 Tree-building collisions: ${treeBuildingCollisions}`);
        console.log(`  🌳🌳 Tree-tree collisions: ${treeTreeCollisions}`);
        console.log(`  🏢🏢 Building-building collisions: ${buildingBuildingCollisions}`);

        return this.collisions;
    }

    // Get collisions by type
    getCollisionsByType(type) {
        return this.collisions.filter(collision => collision.type === type);
    }

    // Get collisions by severity
    getCollisionsBySeverity(severity) {
        return this.collisions.filter(collision => collision.severity === severity);
    }

    // Print detailed collision report
    printDetailedReport() {
        console.log('📋 DETAILED COLLISION REPORT:');
        console.log('================================');
        
        if (this.collisions.length === 0) {
            console.log('✅ No collisions detected!');
            return;
        }

        // Group by type
        const byType = {};
        this.collisions.forEach(collision => {
            if (!byType[collision.type]) {
                byType[collision.type] = [];
            }
            byType[collision.type].push(collision);
        });

        Object.keys(byType).forEach(type => {
            console.log(`\n🔍 ${type.toUpperCase()} COLLISIONS (${byType[type].length}):`);
            byType[type].forEach((collision, index) => {
                console.log(`  ${index + 1}. ${collision.object1} ↔ ${collision.object2} [${collision.severity}]`);
            });
        });

        // Summary by severity
        console.log('\n📊 SEVERITY BREAKDOWN:');
        const high = this.getCollisionsBySeverity('high').length;
        const medium = this.getCollisionsBySeverity('medium').length;
        const low = this.getCollisionsBySeverity('low').length;
        console.log(`  🚨 High severity: ${high}`);
        console.log(`  ⚠️  Medium severity: ${medium}`);
        console.log(`  ℹ️  Low severity: ${low}`);
    }
}
