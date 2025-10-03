import { createTerrain } from './terrain.js';
import { createCleanRoadNetwork, checkRoadConnectivity } from './roads-clean.js';
import { 
    createCommercialDistrict, 
    createResidentialDistrict, 
    createIndustrialDistrict, 
    createPublicSpaces 
} from './buildings-clean.js';
import { createTreeForest } from './vegetation-clean.js';
import { VehicleLoader } from './vehicle-loader.js';
import { TreeLoader } from './tree-loader.js';
import { createObjectBody } from './physics.js';
import { createBoundaryWalls } from './boundaries.js';

// Import DRACO Loader if available
let DRACOLoader;
if (typeof window !== 'undefined' && window.DRACOLoader) {
    DRACOLoader = window.DRACOLoader;
}

// Environment manager
export class EnvironmentManager {
    constructor(scene, world) {
        this.scene = scene;
        this.world = world;
        this.objects = [];
        this.objectBodies = [];
        this.trees = [];
        this.roads = [];
        this.buildings = [];
        this.boundaryWalls = [];
        this.animations = [];
    }
    
    async create() {
        // Create terrain
        const terrain = createTerrain();
        this.scene.add(terrain);
        // Keep a reference for grounding raycasts
        this.terrainRef = terrain;
        
        // Create clean road network
        this.roads = createCleanRoadNetwork();
        this.roads.forEach(road => this.scene.add(road));
        
        // Check road connectivity
        checkRoadConnectivity(this.roads);
        
        // Create buildings
        const commercialBuildings = createCommercialDistrict();
        const residentialBuildings = createResidentialDistrict();
        const industrialBuildings = createIndustrialDistrict();
        const publicBuildings = createPublicSpaces();
        
        this.buildings = [
            ...commercialBuildings,
            ...residentialBuildings,
            ...industrialBuildings,
            ...publicBuildings
        ];
        
        this.buildings.forEach(building => {
            this.scene.add(building);
        });

        // Create trees with external models
        const treeLoader = new TreeLoader();
        
        // Create trees first so they can be included in optimization
        this.trees = await treeLoader.createTreeForest();
        
        // Optimize placement of all environment objects
        const optimizationReport = this.optimizeObjectPlacement(this.terrain, this.roads, this.buildings, this.trees, this.vehicles);
        
        // Add all objects to the scene after optimization
        this.trees.forEach(tree => {
            this.scene.add(tree);
            this.objects.push(tree);
        });
        
        // Log detailed optimization report
        if (optimizationReport) {
            console.log('\n=== ENVIRONMENT OPTIMIZATION REPORT ===');
            console.log(optimizationReport.optimizationSuggestions);
            
            // Log object counts
            console.log('\n📦 Object Counts:');
            console.log(`- Trees: ${this.trees.length}`);
            console.log(`- Buildings: ${this.buildings.length}`);
            console.log(`- Rocks: ${this.terrainRef?.userData?.rocks?.length || 0}`);
            console.log(`- Vehicles: ${this.vehicles?.length || 0}`);
            
            // Log any optimization suggestions
            if (optimizationReport.problemZones && optimizationReport.problemZones.length > 0) {
                console.log('\n⚠️  Problem Areas:');
                optimizationReport.problemZones.forEach(zone => {
                    console.log(`- ${zone.area}: ${zone.issue} (${zone.count} objects)`);
                });
            }
            
            console.log('=======================================\n');
        }
        
        // Create and add vehicles to scene
        const vehicleLoader = new VehicleLoader();
        this.vehicles = await vehicleLoader.createVehicleFleet();
        
        // Add vehicles to scene and objects array
        this.vehicles.forEach(vehicle => {
            if (vehicle) {
                this.scene.add(vehicle);
                this.objects.push(vehicle);
            }
        });
        
        // Create an archway at the very north entrance over Central Avenue (use GLB if available)
        const archway = await this.createArchwayFromGLB('models/archway.glb', 0, -66).catch(() => null);
        if (archway) {
            archway.scale.multiplyScalar(1.25);
            this.scene.add(archway);
            this.objects.push(archway);
            this.addPillarColliders(archway);
        } else {
            const fallbackArch = this.createArchway(0, -66);
            fallbackArch.scale.multiplyScalar(1.25);
            this.scene.add(fallbackArch);
            this.objects.push(fallbackArch);
            this.addPillarColliders(fallbackArch, { pillarWidth: 1.1, depth: 1.0, height: 5.5 });
        }

        // Add logo on a podium near the center
        try {
            const logoGroup = await this.createLogoOnPodium('models/logo.glb', { x: 6, z: -62, ry: Math.PI / 8 });
            if (logoGroup) {
                this.scene.add(logoGroup);
                this.objects.push(logoGroup);
            }
        } catch (_) {}

        // Add reporter model near the podium
        try {
            const reporter = await this.loadAndPlaceReporter('models/reporter.gltf', { x: 12, z: -64 }, -Math.PI / 6);
            if (reporter) {
                this.scene.add(reporter);
                // Do NOT add reporter to physics-managed objects to avoid floating from box bodies
            }
        } catch (_) {}

        // Add tripod camera to film the reporter
        try {
            if (this.scene) {
                const reporterObj = this.scene.getObjectByName('reporter_npc');
                const cameraRig = await this.loadAndPlaceTripodCamera('models/camera.glb', reporterObj, { distance: 3.2, height: 1.4, azimuth: Math.PI * 0.12 });
                if (cameraRig) {
                    this.scene.add(cameraRig);
                    // Not adding to physics; decorative and static
                }
            }
        } catch (_) {}

        // Add animated fountain near spawn
        try {
            console.log('🔄 Loading fountain from models/fountain.glb...');
            const fountainPath = 'models/fountain.glb';
            
            try {
                // Check if the file exists first
                const response = await fetch(fountainPath, { method: 'HEAD' });
                if (!response.ok) {
                    throw new Error(`HTTP ${response.status} ${response.statusText}`);
                }
                console.log('✅ Fountain file is accessible');
                
                // Try loading the fountain
                const fountain = await this.loadAndPlaceFountain(fountainPath, { x: 7, z: 7 });
                if (fountain) {
                    this.scene.add(fountain);
                    this.objects.push(fountain);
                    console.log('✅ Fountain loaded and added to scene');
                } else {
                    throw new Error('Fountain loaded but returned null');
                }
            } catch (error) {
                console.error(`❌ Failed to load fountain from ${fountainPath}:`, error);
                console.warn('⚠️ Skipping fountain due to loading error');
            }
        } catch (error) {
            console.error('❌ Fountain loading error:', error);
        }
        // Add restaurant near spawn point
        try {
            console.log('🔄 Loading restaurant from models/restaurant.glb...');
            const restaurantPath = 'models/restaurant.glb';
            
            const response = await fetch(restaurantPath, { method: 'HEAD' });
            if (!response.ok) {
                throw new Error(`HTTP ${response.status} ${response.statusText}`);
            }
            console.log('✅ Restaurant file is accessible');
            
            // Load the restaurant model
            console.log('🔄 Creating GLTFLoader...');
            const loader = new THREE.GLTFLoader();
            console.log('🔄 Loading restaurant model...');
            const gltf = await loader.loadAsync(restaurantPath);
            const restaurant = gltf.scene;
            
            // Make sure the model is visible and scaled properly
            restaurant.traverse((child) => {
                if (child.isMesh) {
                    child.castShadow = true;
                    child.receiveShadow = true;
                    console.log(`🔍 Found mesh: ${child.name || 'unnamed'}, position:`, child.position);
                }
            });
            
            // Position the restaurant closer to the center and higher up
            // Using (0, 0, 0) as the spawn point reference
            restaurant.position.set(5, 0, -5);  // Closer to spawn
            restaurant.rotation.y = Math.PI / 4; // Rotate 45 degrees for better placement
            
            // Check the bounding box to ensure it's properly sized
            const box = new THREE.Box3().setFromObject(restaurant);
            const size = box.getSize(new THREE.Vector3());
            console.log('📏 Restaurant dimensions:', size);
            
            // Scale the restaurant to be twice as big
            const targetSize = 8; // Increased from 5 to 10 (twice as big)
            const scale = targetSize / Math.max(size.x, size.y, size.z);
            restaurant.scale.set(scale, scale, scale);
            
            // Tilt the restaurant in the opposite direction (negative rotation)
            restaurant.rotation.y = -Math.PI / 4; // Rotated in the opposite direction
            
            console.log('🎯 Restaurant position:', restaurant.position);
            console.log('📐 Restaurant scale:', restaurant.scale);
            console.log('🔄 Restaurant rotation (y):', restaurant.rotation.y);
            
            // Add to scene and objects array
            this.scene.add(restaurant);
            this.objects.push(restaurant);
            
            // Add physics body to make it solid
            if (this.world && typeof CANNON !== 'undefined') {
                console.log('🛡️  Adding physics body for restaurant');
                const body = createObjectBody(this.world, restaurant, { 
                    mass: 0, 
                    shape: 'box',
                    debug: true // Enable debug visualization if available
                });
                this.objectBodies.push(body);
            }
            
            console.log('✅ Restaurant added to scene at (15, -15)');
        } catch (error) {
            console.error('❌ Failed to load restaurant:', error);
        }
        
        // Create boundary walls
        this.boundaryWalls = createBoundaryWalls(this.scene, this.world);
        
        // Create physics bodies
        this.createPhysicsBodies();
        
        return {
            terrain,
            roads: this.roads,
            buildings: this.buildings,
            trees: this.trees,
            vehicles: this.vehicles || [],
            boundaryWalls: this.boundaryWalls,
            objects: this.objects
        };
    }
    
    createPhysicsBodies() {
        if (typeof CANNON !== 'undefined' && this.world) {
            // First clear any existing physics bodies
            this.objectBodies = [];
            
            // Add physics bodies for regular objects
            this.objects.forEach((obj) => {
                if (obj) {
                    const body = createObjectBody(this.world, obj);
                    this.objectBodies.push(body);
                } else {
                    this.objectBodies.push(null);
                }
            });
            
            // Add physics bodies for buildings
            this.buildings.forEach((building) => {
                if (building) {
                    // Create a static physics body for the building
                    const body = createObjectBody(this.world, building, { mass: 0 }); // Mass of 0 makes it static
                    this.objectBodies.push(body);
                }
            });
        }
    }
    
    update() {
        // Sync objects with physics bodies
        this.objects.forEach((obj, index) => {
            if (this.objectBodies[index]) {
                obj.position.copy(this.objectBodies[index].position);
                obj.quaternion.copy(this.objectBodies[index].quaternion);
            }
        });
        
        // Animate trees (gentle swaying) - only for fallback trees
        const time = Date.now() * 0.001;
        this.trees.forEach((tree, index) => {
            if (tree && tree.children) {
                // Check if it's a fallback tree with canopy
                const canopy = tree.children.find(child => child.geometry && child.geometry.type === 'SphereGeometry');
                if (canopy) {
                    canopy.rotation.z = Math.sin(time * 0.5 + index) * 0.1;
                }
            }
        });

        // Update all animations (like fountain animations)
        if (!this.lastAnimationTime) {
            this.lastAnimationTime = Date.now() * 0.001;
        }
        const deltaTime = (Date.now() * 0.001) - this.lastAnimationTime;
        this.lastAnimationTime = Date.now() * 0.001;
        this.animations.forEach((mixer) => {
            if (mixer) {
                mixer.update(deltaTime);
            }
        });
    }

    // Optimize object placement to avoid collisions and generate optimization report
    optimizeObjectPlacement(terrain, roads, buildings, trees = []) {
        const problemZones = [];
        
        // Check for high-density areas
        const checkDensity = (objects, type, threshold = 3) => {
            const grid = new Map();
            const cellSize = 10; // Size of each grid cell for density check
            
            objects.forEach(obj => {
                const pos = obj.position || obj;
                const cellX = Math.floor(pos.x / cellSize);
                const cellZ = Math.floor(pos.z / cellSize);
                const cellKey = `${cellX},${cellZ}`;
                grid.set(cellKey, (grid.get(cellKey) || 0) + 1);
            });
            
            // Find cells with too many objects
            grid.forEach((count, cellKey) => {
                if (count > threshold) {
                    const [x, z] = cellKey.split(',').map(Number);
                    problemZones.push({
                        area: `Zone (${x*cellSize}, ${z*cellSize}) to (${(x+1)*cellSize}, ${(z+1)*cellSize})`,
                        issue: `High density of ${type} (${count} objects)`,
                        count: count
                    });
                }
            });
        };
        
        // Check density for each object type
        if (terrain?.userData?.rocks?.length) checkDensity(terrain.userData.rocks, 'rocks');
        if (trees?.length) checkDensity(trees, 'trees');
        if (buildings?.length) checkDensity(buildings, 'buildings');
        
        // Check for objects too close to roads
        const checkRoadProximity = (objects, type, minDistance = 3) => {
            let tooCloseCount = 0;
            
            objects.forEach(obj => {
                const pos = obj.position || obj;
                for (const road of roads) {
                    const roadBox = new THREE.Box3().setFromObject(road);
                    const point = new THREE.Vector3(pos.x, 0, pos.z);
                    const closestPoint = roadBox.clampPoint(point, new THREE.Vector3());
                    const distance = point.distanceTo(closestPoint);
                    
                    if (distance < minDistance) {
                        tooCloseCount++;
                        problemZones.push({
                            area: `Near (${Math.round(pos.x)}, ${Math.round(pos.z)})`,
                            issue: `${type} too close to road (${distance.toFixed(1)} units)`,
                            count: 1
                        });
                        break;
                    }
                }
            });
            
            return tooCloseCount;
        };
        
        if (terrain?.userData?.rocks?.length) {
            const count = checkRoadProximity(terrain.userData.rocks, 'Rock');
            if (count > 0) {
                problemZones.push({
                    area: 'Various locations',
                    issue: `${count} rocks are too close to roads`,
                    count: count
                });
            }
        }
        const allObjects = [];
        
        // Prepare objects for optimization
        if (terrain?.userData?.rocks) {
            terrain.userData.rocks.forEach(rock => {
                allObjects.push({
                    type: 'rock',
                    mesh: rock,
                    originalPosition: rock.position.clone(),
                    size: new THREE.Box3().setFromObject(rock).getSize(new THREE.Vector3()).length(),
                    priority: 0 // Higher priority objects are processed first
                });
            });
        }
        
        // Add trees to optimization
        trees.forEach((tree, index) => {
            allObjects.push({
                type: 'tree',
                mesh: tree,
                originalPosition: tree.position.clone(),
                size: new THREE.Box3().setFromObject(tree).getSize(new THREE.Vector3()).length(),
                priority: 1
            });
        });
        
        // Sort by priority (and size for objects with same priority)
        allObjects.sort((a, b) => (b.priority - a.priority) || (b.size - a.size));
        
        const roadBoxes = roads.map(r => new THREE.Box3().setFromObject(r));
        const buildingBoxes = buildings.map(b => new THREE.Box3().setFromObject(b));
        const isOverlapping = (box, target) => box.intersectsBox(target);
        const step = 1.2;
        
        // Store optimization data for reporting
        const optimizationReport = {
            totalObjects: allObjects.length,
            nudgedObjects: 0,
            totalNudges: 0,
            maxNudges: 0,
            objectData: [],
            statsByType: {},
            
            addNudgedObject(objType, originalPos, newPos, nudges, nudgeDistance) {
                if (!this.statsByType[objType]) {
                    this.statsByType[objType] = {
                        count: 0,
                        totalNudges: 0,
                        totalDistance: 0
                    };
                }
                
                this.nudgedObjects++;
                this.totalNudges += nudges;
                this.maxNudges = Math.max(this.maxNudges, nudges);
                
                const typeStats = this.statsByType[objType];
                typeStats.count++;
                typeStats.totalNudges += nudges;
                typeStats.totalDistance += nudgeDistance;
                
                this.objectData.push({
                    type: objType,
                    originalPosition: originalPos,
                    position: newPos.clone(),
                    nudges: nudges,
                    nudgeDistance: nudgeDistance
                });
            },
            
            get optimizationSuggestions() {
                const suggestions = [];
                
                // Overall statistics
                suggestions.push('🚀 Optimization Suggestions:');
                suggestions.push(`- ${this.nudgedObjects} objects (${((this.nudgedObjects/this.totalObjects)*100).toFixed(1)}%) required nudging`);
                suggestions.push(`- Total ${this.totalNudges} nudges performed`);
                
                // Statistics by object type
                Object.entries(this.statsByType).forEach(([type, stats]) => {
                    const avgNudges = stats.totalNudges / stats.count;
                    const avgDist = stats.totalDistance / stats.count;
                    suggestions.push(`\n📊 ${type.charAt(0).toUpperCase() + type.slice(1)}s:`);
                    suggestions.push(`- ${stats.count} needed nudging (${((stats.count/this.totalObjects)*100).toFixed(1)}%)`);
                    suggestions.push(`- Average ${avgNudges.toFixed(1)} nudges per object`);
                    suggestions.push(`- Average nudge distance: ${avgDist.toFixed(2)} units`);
                });
                
                // Identify problem areas
                const gridSize = 20; // Size of each zone
                const zoneCounts = {};
                
                this.objectData.forEach(obj => {
                    const zoneX = Math.floor(obj.position.x / gridSize);
                    const zoneZ = Math.floor(obj.position.z / gridSize);
                    const zoneKey = `${zoneX},${zoneZ}`;
                    zoneCounts[zoneKey] = (zoneCounts[zoneKey] || 0) + 1;
                });
                
                // Find zones with most nudges
                const sortedZones = Object.entries(zoneCounts)
                    .sort((a, b) => b[1] - a[1])
                    .slice(0, 3);
                
                if (sortedZones.length > 0) {
                    suggestions.push('\n🔍 High-density zones (consider adjusting object placement here):');
                    sortedZones.forEach(([zone, count]) => {
                        const [x, z] = zone.split(',').map(Number);
                        suggestions.push(`- Zone (${x*gridSize}, ${z*gridSize}) to (${(x+1)*gridSize}, ${(z+1)*gridSize}): ${count} nudged objects`);
                    });
                }
                
                return suggestions.join('\n');
            }
        };
        
        // Process all objects for collision resolution
        allObjects.forEach(obj => {
            const mesh = obj.mesh;
            const originalPosition = new THREE.Vector3().copy(mesh.position);
            const box = new THREE.Box3().setFromObject(mesh);
            let tries = 0;
            let totalNudgeDistance = 0;
            let lastPosition = new THREE.Vector3().copy(mesh.position);
            
            // Get all objects that have been placed so far (to avoid nudging into them)
            const placedObjects = allObjects
                .filter(o => o !== obj && o.mesh.position.distanceToSquared(mesh.position) < 10000) // Only check nearby objects
                .map(o => ({
                    box: new THREE.Box3().setFromObject(o.mesh),
                    type: o.type,
                    size: o.size
                }));
                
            // Also check against roads and buildings
            const staticObjects = [
                ...roadBoxes.map(box => ({ box, type: 'road' })),
                ...buildingBoxes.map(box => ({ box, type: 'building' }))
            ];
            
            // Check for collisions with any static or placed objects
            const hasCollision = () => {
                // Check against static objects (roads, buildings)
                if (staticObjects.some(({box: b}) => isOverlapping(box, b))) return true;
                
                // Check against other placed objects of same or higher priority
                return placedObjects.some(other => {
                    // Only check against objects of same or higher priority
                    if (other.priority < obj.priority) return false;
                    return isOverlapping(box, other.box);
                });
            };
            
            while (tries < 30 && hasCollision()) {
                // Find nearest overlapping box center
                let nearestCenter = null;
                let minDist = Infinity;
                const center = box.getCenter(new THREE.Vector3());
                
                const check = (targets) => {
                    targets.forEach(t => {
                        if (isOverlapping(box, t)) {
                            const c = t.getCenter(new THREE.Vector3());
                            const d = center.distanceToSquared(c);
                            if (d < minDist) { 
                                minDist = d; 
                                nearestCenter = c; 
                            }
                        }
                    });
                };
                
                check(roadBoxes);
                check(buildingBoxes);
                
                let dir = new THREE.Vector3(1, 0, 0);
                if (nearestCenter) {
                    dir = new THREE.Vector3().subVectors(center, nearestCenter);
                    if (dir.lengthSq() < 1e-6) dir.set(1, 0, 0);
                    dir.setY(0).normalize().multiplyScalar(step);
                } else {
                    dir.set(1, 0, 0).multiplyScalar(step);
                }
                
                mesh.position.add(dir);
                box.translate(dir);
                
                // Track nudge distance
                const currentPosition = new THREE.Vector3().copy(mesh.position);
                totalNudgeDistance += currentPosition.distanceTo(lastPosition);
                lastPosition.copy(currentPosition);
                
                tries++;
            }
            
            if (tries > 0) {
                optimizationReport.addNudgedObject(
                    obj.type,
                    originalPosition,
                    mesh.position.clone(),
                    tries,
                    totalNudgeDistance
                );
                
                console.log(`🔄 Nudged ${obj.type} from (${originalPosition.x.toFixed(1)}, ${originalPosition.z.toFixed(1)}) ` +
                           `to (${mesh.position.x.toFixed(1)}, ${mesh.position.z.toFixed(1)}) ` +
                           `after ${tries} step(s) (${totalNudgeDistance.toFixed(2)} units)`);
            }
        });
        
        // Log optimization report
        if (optimizationReport.nudgedObjects > 0) {
            console.log('\n=== OBJECT PLACEMENT OPTIMIZATION REPORT ===');
            console.log(`Total objects processed: ${optimizationReport.totalObjects}`);
            console.log(`Objects that needed nudging: ${optimizationReport.nudgedObjects} (${((optimizationReport.nudgedObjects/optimizationReport.totalObjects)*100).toFixed(1)}%)`);
            console.log(`Total nudges performed: ${optimizationReport.totalNudges}`);
            console.log(`Maximum nudges for a single object: ${optimizationReport.maxNudges}`);
            
            // Show type-specific statistics
            Object.entries(optimizationReport.statsByType).forEach(([type, stats]) => {
                console.log(`\n📊 ${type.charAt(0).toUpperCase() + type.slice(1)}s:`);
                console.log(`- ${stats.count} needed nudging`);
                console.log(`- Total nudges: ${stats.totalNudges}`);
                console.log(`- Average nudges per object: ${(stats.totalNudges / stats.count).toFixed(1)}`);
                console.log(`- Total nudge distance: ${stats.totalDistance.toFixed(2)} units`);
            });
            
            console.log('\n' + optimizationReport.optimizationSuggestions);
            console.log('===========================================\n');
            
            // Generate code snippets for optimized positions by type
            const optimizedByType = {};
            optimizationReport.objectData.forEach(obj => {
                if (!optimizedByType[obj.type]) {
                    optimizedByType[obj.type] = [];
                }
                optimizedByType[obj.type].push({
                    original: obj.originalPosition,
                    position: obj.position,
                    nudges: obj.nudges
                });
            });
            
            // Generate code for each object type
            Object.entries(optimizedByType).forEach(([type, objects]) => {
                const optimizedPositions = objects
                    .map(obj => {
                        return `// Original: (${obj.original.x.toFixed(2)}, ${obj.original.z.toFixed(2)}), ` +
                               `Nudges: ${obj.nudges}\n` +
                               `{ x: ${obj.position.x.toFixed(2)}, z: ${obj.position.z.toFixed(2)} },`;
                    })
                    .join('\n');
                
                console.log(`💡 Optimized ${type} positions (${objects.length} objects):\n` + optimizedPositions + '\n');
            });
        } else {
            console.log('✅ No objects needed nudging - great job on the placement!');
        }
        
        return optimizationReport;
    }

    // Simple decorative archway: two pillars + semicircular top
    createArchway(x, z) {
        const group = new THREE.Group();
        const pillarMat = new THREE.MeshLambertMaterial({ color: 0x777777 });
        const beamMat = pillarMat;

        // Sturdier pillars and slightly shorter
        const pillarWidth = 1.1;
        const pillarDepth = 1.0;
        const pillarHeight = 5.5;
        const pillarGeom = new THREE.BoxGeometry(pillarWidth, pillarHeight, pillarDepth);
        const left = new THREE.Mesh(pillarGeom, pillarMat);
        const right = new THREE.Mesh(pillarGeom, pillarMat);
        const halfSpan = 2.2;
        left.position.set(-halfSpan, pillarHeight / 2, 0);
        right.position.set(halfSpan, pillarHeight / 2, 0);
        left.castShadow = right.castShadow = true;
        left.receiveShadow = right.receiveShadow = true;
        group.add(left);
        group.add(right);

        // Semicircular arch sized to meet inner pillar faces flush
        const tube = 0.18; // lighter than pillar depth
        const innerHalfSpan = halfSpan - pillarWidth / 2;
        const radius = innerHalfSpan + tube; // outer radius reaches pillar inner faces
        const torusGeom = new THREE.TorusGeometry(radius, tube, 16, 64, Math.PI);
        const torus = new THREE.Mesh(torusGeom, beamMat);
        // Arch opens downward across X, centered on pillar tops
        torus.rotation.set(Math.PI / 2, 0, Math.PI);
        const pillarTopY = pillarHeight;
        torus.position.set(0, pillarTopY, 0);
        torus.castShadow = torus.receiveShadow = true;
        group.add(torus);

        group.position.set(x, 0, z);
        group.name = 'north_archway';

        return group;
    }

    // Load archway from GLB and tint to charcoal
    async createArchwayFromGLB(url, x, z) {
        return new Promise((resolve, reject) => {
            try {
                if (!THREE || !THREE.GLTFLoader) {
                    return reject(new Error('GLTFLoader not available'));
                }
                const loader = new THREE.GLTFLoader();
                loader.load(
                    url,
                    (gltf) => {
                        const arch = gltf.scene;
                        // Charcoal tint and unifying material tweaks
                        arch.traverse((child) => {
                            if (child.isMesh && child.material) {
                                if (Array.isArray(child.material)) {
                                    child.material.forEach(m => { m.color && m.color.setHex(0x2b2b2b); if ('roughness' in m) m.roughness = 0.8; if ('metalness' in m) m.metalness = 0.0; });
                                } else {
                                    child.material.color && child.material.color.setHex(0x2b2b2b);
                                    if ('roughness' in child.material) child.material.roughness = 0.8;
                                    if ('metalness' in child.material) child.material.metalness = 0.0;
                                }
                                child.castShadow = true;
                                child.receiveShadow = true;
                            }
                        });

                        // Auto-scale to reasonable size similar to previous arch
                        const box = new THREE.Box3().setFromObject(arch);
                        const size = box.getSize(new THREE.Vector3());
                        const maxDim = Math.max(size.x, size.y, size.z) || 1;
                        const target = 7; // approx overall height
                        const s = target / maxDim;
                        arch.scale.setScalar(s);

                        // Center and position
                        const center = box.getCenter(new THREE.Vector3());
                        arch.position.sub(center.multiplyScalar(s));
                        arch.position.set(x, 0, z);

                        resolve(arch);
                    },
                    undefined,
                    (err) => reject(err)
                );
            } catch (e) {
                reject(e);
            }
        });
    }

    // Create two box colliders for pillars only, leaving the arch center passable
    addPillarColliders(group, opts = {}) {
        if (!this.world || typeof CANNON === 'undefined') return;
        // Remove previous bodies if any
        if (group.userData && group.userData.pillarBodies) {
            group.userData.pillarBodies.forEach(b => b && this.world.removeBody(b));
        }

        const box = new THREE.Box3().setFromObject(group);
        const size = box.getSize(new THREE.Vector3());
        const min = box.min, max = box.max;
        const sceneDepth = Math.max(0.8, size.z || 1.0);
        const pillarWidth = opts.pillarWidth || Math.min(1.2, size.x * 0.15);
        const pillarHeight = opts.height || size.y; // from ground to top
        const zCenter = (min.z + max.z) / 2;

        const makeBodyAtX = (xCenter) => {
            const shape = new CANNON.Box(new CANNON.Vec3(pillarWidth/2, pillarHeight/2, sceneDepth/2));
            const body = new CANNON.Body({ mass: 0 });
            body.type = CANNON.Body.STATIC;
            body.addShape(shape);
            body.position.set(xCenter, pillarHeight/2, zCenter);
            this.world.addBody(body);
            return body;
        };

        const leftX = min.x + pillarWidth/2;
        const rightX = max.x - pillarWidth/2;
        const leftBody = makeBodyAtX(leftX);
        const rightBody = makeBodyAtX(rightX);

        group.userData = group.userData || {};
        group.userData.pillarBodies = [leftBody, rightBody];
    }

    // Create a simple podium and place the GLB logo on top
    async createLogoOnPodium(url, pos = { x: 0, z: 0, ry: 0 }) {
        return new Promise((resolve) => {
            if (!THREE || !THREE.GLTFLoader) return resolve(null);
            const group = new THREE.Group();

            // Podium: stepped cylinders
            const baseMat = new THREE.MeshStandardMaterial({ color: 0x333333, roughness: 0.85, metalness: 0.05 });
            const step1 = new THREE.Mesh(new THREE.CylinderGeometry(2.2, 2.2, 0.25, 32), baseMat);
            const step2 = new THREE.Mesh(new THREE.CylinderGeometry(1.8, 1.8, 0.25, 32), baseMat);
            const step3 = new THREE.Mesh(new THREE.CylinderGeometry(1.3, 1.3, 0.25, 32), baseMat);
            step1.position.y = 0.125;
            step2.position.y = 0.125 + 0.25;
            step3.position.y = 0.125 + 0.5;
            [step1, step2, step3].forEach(m => { m.castShadow = true; m.receiveShadow = true; });
            group.add(step1); group.add(step2); group.add(step3);

            // Load logo
            const loader = new THREE.GLTFLoader();
            loader.load(
                url,
                (gltf) => {
                    const logo = gltf.scene;
                    logo.traverse((child) => { if (child.isMesh) { child.castShadow = true; child.receiveShadow = true; } });

                    // Classify meshes: assume largest-volume mesh is the block, others are text/logo glyphs
                    const meshEntries = [];
                    logo.traverse((child) => {
                        if (child.isMesh) {
                            const b = new THREE.Box3().setFromObject(child);
                            const s = b.getSize(new THREE.Vector3());
                            const volume = Math.max(0.0001, s.x * s.y * s.z);
                            meshEntries.push({ mesh: child, volume });
                        }
                    });
                    if (meshEntries.length) {
                        meshEntries.sort((a, b) => b.volume - a.volume);
                        const blockMesh = meshEntries[0].mesh;
                        const blockMat = new THREE.MeshStandardMaterial({ color: 0xFFD700, roughness: 0.6, metalness: 0.0 });
                        blockMat.side = THREE.FrontSide;
                        blockMesh.material = blockMat;
                        for (let i = 1; i < meshEntries.length; i++) {
                            const textMesh = meshEntries[i].mesh;
                            const textMat = new THREE.MeshStandardMaterial({ color: 0x000000, roughness: 0.7, metalness: 0.0 });
                            textMat.side = THREE.FrontSide;
                            textMesh.material = textMat;
                        }
                    }
                    // Scale logo to fit podium nicely (~1 unit tall)
                    const box = new THREE.Box3().setFromObject(logo);
                    const size = box.getSize(new THREE.Vector3());
                    const maxDim = Math.max(size.x, size.y, size.z) || 1;
                    const targetHeight = 3.0; // make clearly visible
                    const s = targetHeight / maxDim;
                    logo.scale.setScalar(s);

                    // Recenter and place on top step so its base sits flush
                    const box2 = new THREE.Box3().setFromObject(logo);
                    const center = box2.getCenter(new THREE.Vector3());
                    logo.position.sub(center);
                    const boxAfterCenter = new THREE.Box3().setFromObject(logo);
                    const minY = boxAfterCenter.min.y;
                    const topY = step3.position.y + 0.125 + 0.01;
                    logo.position.y += -minY + topY;

                    group.add(logo);
                    group.position.set(pos.x, 0, pos.z);
                    if (pos.ry) group.rotation.y = pos.ry;
                    group.name = 'logo_podium';
                    resolve(group);
                },
                undefined,
                () => resolve(group)
            );
        });
    }

    // Load a glTF reporter and place near podium
    async loadAndPlaceReporter(url, pos = { x: 0, z: 0 }, ry = 0) {
        return new Promise((resolve) => {
            if (!THREE || !THREE.GLTFLoader) return resolve(null);
            const loader = new THREE.GLTFLoader();
            loader.load(
                url,
                (gltf) => {
                    const model = gltf.scene;
                    // Apply reporter texture to existing materials (preserve PBR)
                    const textureLoader = new THREE.TextureLoader();
                    const tex = textureLoader.load('models/reporter.jpeg');
                    if ('sRGBEncoding' in THREE) { tex.encoding = THREE.sRGBEncoding; }
                    if ('SRGBColorSpace' in THREE) { tex.colorSpace = THREE.SRGBColorSpace; }
                    tex.flipY = false; // glTF expects UV origin at top-left
                    model.traverse((child) => {
                        if (child.isMesh) {
                            child.castShadow = true;
                            child.receiveShadow = true;
                            const materials = Array.isArray(child.material) ? child.material : [child.material];
                            materials.forEach((mat) => {
                                if (!mat) return;
                                mat.map = tex;
                                if ('toneMapped' in mat) mat.toneMapped = true;
                                if (mat.color) mat.color.setHex(0xFFFFFF);
                                if ('roughness' in mat) mat.roughness = 0.7;
                                if ('metalness' in mat) mat.metalness = 0.0;
                                if ('emissive' in mat && mat.emissive) {
                                    mat.emissive.setHex(0x202020);
                                    if ('emissiveIntensity' in mat) mat.emissiveIntensity = 0.25;
                                }
                                mat.needsUpdate = true;
                            });
                        }
                    });

                    // Scale to ~1.8 units tall
                    const box = new THREE.Box3().setFromObject(model);
                    const size = box.getSize(new THREE.Vector3());
                    const height = Math.max(0.0001, size.y);
                    const targetHeight = 1.8;
                    const s = targetHeight / height;
                    model.scale.setScalar(s);

                    // Recenter to stand on ground at given pos
                    const box2 = new THREE.Box3().setFromObject(model);
                    const center = box2.getCenter(new THREE.Vector3());
                    model.position.sub(center);
                    const boxAfter = new THREE.Box3().setFromObject(model);
                    const minY = boxAfter.min.y;
                    model.position.set(pos.x, -minY, pos.z);
                    model.rotation.y = ry;
                    model.name = 'reporter_npc';

                    // Snap near the nearest road but not on it
                    try {
                        const safePlaced = this.placeNearNearestRoad(model, { x: pos.x, z: pos.z }, 1.5);
                        if (safePlaced) { model.position.x = safePlaced.x; model.position.z = safePlaced.z; }
                    } catch (_) {}

                    // Ground the reporter using a downward raycast onto terrain
                    try { this.groundObject(model); } catch (_) {}
                    resolve(model);
                },
                undefined,
                () => resolve(null)
            );
        });
    }

    // Load a tripod camera GLB and place it to film a target (e.g., reporter)
    async loadAndPlaceTripodCamera(url, targetObject, opts = {}) {
        const options = {
            distance: 3.0,   // horizontal distance from target
            height: 1.3,     // camera head height from ground
            azimuth: 0.0,    // rotate around target on XZ plane
            ...opts,
        };
        if (!THREE || !THREE.GLTFLoader || !targetObject) return null;

        return new Promise((resolve) => {
            const loader = new THREE.GLTFLoader();
            loader.load(
                url,
                (gltf) => {
                    const rig = gltf.scene || gltf.scenes?.[0];
                    if (!rig) return resolve(null);

                    // Enable shadows on meshes
                    rig.traverse((child) => {
                        if (child.isMesh) {
                            child.castShadow = true;
                            child.receiveShadow = true;
                        }
                    });

                    // Scale rig so its height is ~1.6 units
                    const box = new THREE.Box3().setFromObject(rig);
                    const size = box.getSize(new THREE.Vector3());
                    const height = Math.max(0.0001, size.y);
                    const scale = 1.6 / height;
                    rig.scale.setScalar(scale);

                    // Recompute after scaling and center to base
                    const box2 = new THREE.Box3().setFromObject(rig);
                    const center = box2.getCenter(new THREE.Vector3());
                    rig.position.sub(center);
                    const minY = new THREE.Box3().setFromObject(rig).min.y;

                    // Compute placement around target
                    const targetPos = new THREE.Vector3();
                    targetObject.getWorldPosition(targetPos);
                    // Determine target forward (where target looks). If not available, assume -Z to +Z arrangement based on rotation.y
                    const targetYaw = targetObject.rotation?.y || 0;
                    const dirFromTarget = new THREE.Vector3(0, 0, 1).applyAxisAngle(new THREE.Vector3(0, 1, 0), targetYaw + options.azimuth);
                    const placePos = targetPos.clone().add(dirFromTarget.multiplyScalar(options.distance));

                    // Set rig position on ground with small offset, then orient to look at target head
                    rig.position.set(placePos.x, -minY, placePos.z);
                    try { this.groundObject(rig); } catch (_) {}

                    const lookAtPoint = targetPos.clone();
                    lookAtPoint.y += options.height; // aim roughly at head
                    rig.lookAt(lookAtPoint);
                    // Correct model's forward axis by +90° so lens points at target
                    rig.rotateY(Math.PI / 0.65);
                    rig.name = 'tripod_camera_rig';

                    resolve(rig);
                },
                undefined,
                () => resolve(null)
            );
        });
    }

    // Compute closest point to a Box3
    closestPointOnBox(box, point) {
        const clampedX = Math.min(Math.max(point.x, box.min.x), box.max.x);
        const clampedY = Math.min(Math.max(point.y, box.min.y), box.max.y);
        const clampedZ = Math.min(Math.max(point.z, box.min.z), box.max.z);
        return new THREE.Vector3(clampedX, clampedY, clampedZ);
    }

    // Place an object near the nearest road but offset outside the road bounds
    placeNearNearestRoad(object3d, desired, offset = 1.2) {
        if (!this.roads || this.roads.length === 0) return null;
        const pos = new THREE.Vector3(desired.x, 0, desired.z);
        let best = null;
        let bestDist = Infinity;
        this.roads.forEach((road) => {
            const box = new THREE.Box3().setFromObject(road);
            const closest = this.closestPointOnBox(box, pos);
            const dist = closest.distanceTo(pos);
            if (dist < bestDist) {
                bestDist = dist;
                best = { box, closest, road };
            }
        });
        if (!best) return null;
        // Determine outward direction away from the road box center
        const boxCenter = best.box.getCenter(new THREE.Vector3());
        const dir = new THREE.Vector3().subVectors(pos, boxCenter);
        if (dir.lengthSq() < 1e-6) dir.set(1, 0, 0);
        dir.setY(0).normalize();
        const target = new THREE.Vector3().copy(best.closest).add(dir.multiplyScalar(offset));
        return { x: target.x, z: target.z };
    }

    // Raycast down and align object's world AABB minY to ground hit (no double-lift)
    groundObject(object3d) {
        if (!THREE || !THREE.Raycaster) return;
        const rayOrigin = new THREE.Vector3(object3d.position.x, (object3d.position.y || 0) + 50, object3d.position.z);
        const raycaster = new THREE.Raycaster(rayOrigin, new THREE.Vector3(0, -1, 0), 0, 200);
        // Prefer podium/terrain/roads as hit targets
        const targets = [];
        if (this.scene) targets.push(this.scene);
        const hits = raycaster.intersectObjects(targets, true);
        if (hits && hits.length) {
            const groundY = hits[0].point.y;
            const boxWorld = new THREE.Box3().setFromObject(object3d);
            const currentMinY = boxWorld.min.y;
            const delta = (groundY + 0.02) - currentMinY;
            object3d.position.y += delta;
        }
    }

    // Load animated fountain and place near spawn but off road
    async loadAndPlaceFountain(url, pos = { x: 0, z: 0 }) {
        return new Promise((resolve) => {
            if (!THREE || !THREE.GLTFLoader) {
                console.error('❌ THREE.js or GLTFLoader not available');
                return resolve(null);
            }
            
            console.log(`🔄 Loading fountain from: ${url}`);
            
            const loader = new THREE.GLTFLoader();
            
            // Set up DRACO loader if available
            if (window.DRACO_LOADER_AVAILABLE && window.THREE && window.THREE.DRACOLoader) {
                try {
                    // Use the global DRACOLoader that was already configured in the HTML
                    loader.setDRACOLoader(new window.THREE.DRACOLoader());
                    console.log('✅ Using pre-configured DRACO loader');
                } catch (error) {
                    console.warn('⚠️ Failed to set up DRACO loader, falling back to uncompressed models:', error);
                }
            } else {
                console.warn('⚠️ DRACOLoader not available - using uncompressed models');
            }
            loader.load(
                url,
                (gltf) => {
                    console.log('📦 GLTF loaded successfully');
                    const fountain = gltf.scene || gltf.scenes?.[0];
                    if (!fountain) {
                        console.error('❌ No scene found in GLTF file');
                        return resolve(null);
                    }

                    // Store animations if available
                    this.animations = this.animations || [];
                    if (gltf.animations && gltf.animations.length > 0) {
                        fountain.userData.mixer = new THREE.AnimationMixer(fountain);
                        gltf.animations.forEach((clip) => {
                            const action = fountain.userData.mixer.clipAction(clip);
                            action.play();
                        });
                        this.animations.push(fountain.userData.mixer);
                        console.log(`🎬 Fountain animations loaded: ${gltf.animations.length} clips`);
                    }

                    // Enable shadows
                    fountain.traverse((child) => {
                        if (child.isMesh) {
                            child.castShadow = true;
                            child.receiveShadow = true;
                        }
                    });

                    // Scale to reasonable size (make it bigger)
                    const scaleBox = new THREE.Box3().setFromObject(fountain);
                    const size = scaleBox.getSize(new THREE.Vector3());
                    const height = Math.max(0.0001, size.y);
                    const targetHeight = 8.0; // make fountain much more visible
                    const s = targetHeight / height;
                    fountain.scale.setScalar(s);

                    // Recenter and position at ground level
                    const box2 = new THREE.Box3().setFromObject(fountain);
                    const center = box2.getCenter(new THREE.Vector3());
                    fountain.position.sub(center);
                    // Position at ground level first
                    fountain.position.set(pos.x, 0, pos.z);
                    
                    // Ground the fountain - force to terrain level
                    const groundBox = new THREE.Box3().setFromObject(fountain);
                    fountain.position.y = -groundBox.min.y; // Place base at ground level (Y = 0)

                    // Place near nearest road but not on it  
                    try {
                        const safePos = this.placeNearNearestRoad(fountain, { x: pos.x, z: pos.z }, 2.0);
                        if (safePos) { 
                            fountain.position.x = safePos.x; 
                            fountain.position.z = safePos.z; 
                        }
                    } catch (_) {}

                    // Ground fountain and move 1 unit down to hide grass part in model
                    const groundingBox = new THREE.Box3().setFromObject(fountain);
                    fountain.position.y = -groundingBox.min.y - 0.01; // Base at ground then 1 unit down to hide grass
                    
                    // Ensure fountain base is still at reasonable ground level (1 unit below)
                    if (fountain.position.y > 0) {
                        fountain.position.y = -1; // Fallback to 1 unit below ground
                    }

                    fountain.name = 'animated_fountain';
                    console.log(`⛲ Fountain placed at (${fountain.position.x.toFixed(2)}, ${fountain.position.z.toFixed(2)})`);
                    resolve(fountain);
                },
                (progress) => {
                    console.log(`📊 Fountain loading progress: ${(progress.loaded / progress.total * 100).toFixed(1)}%`);
                },
                (error) => {
                    console.error('❌ Fountain loading failed:', error);
                    console.error('❌ Error details:', {
                        message: error.message,
                        type: error.type,
                        url: url
                    });
                    resolve(null);
                }
            );
        });
    }
}
