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
    }
    
    async create() {
        // Create terrain
        const terrain = createTerrain();
        this.scene.add(terrain);
        
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
            this.objects.push(building);
        });

        // Nudge terrain rocks away from roads and buildings
        this.nudgeRocksAwayFromCollisions(terrain, this.roads, this.buildings);
        
        // Create trees with external models
        const treeLoader = new TreeLoader();
        this.trees = await treeLoader.createTreeForest();
        this.trees.forEach(tree => {
            this.scene.add(tree);
            this.objects.push(tree);
        });
        
        // Create vehicles with external models
        const vehicleLoader = new VehicleLoader();
        const vehicles = await vehicleLoader.createVehicleFleet();
        vehicles.forEach(vehicle => {
            this.scene.add(vehicle);
            this.objects.push(vehicle);
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

        // Create boundary walls
        this.boundaryWalls = createBoundaryWalls(this.scene, this.world);
        
        // Create physics bodies
        this.createPhysicsBodies();
        
        return {
            terrain,
            roads: this.roads,
            buildings: this.buildings,
            trees: this.trees,
            vehicles,
            boundaryWalls: this.boundaryWalls,
            objects: this.objects
        };
    }
    
    createPhysicsBodies() {
        if (typeof CANNON !== 'undefined' && this.world) {
            this.objects.forEach((obj) => {
                if (obj) {
                    const body = createObjectBody(this.world, obj);
                    this.objectBodies.push(body);
                } else {
                    this.objectBodies.push(null);
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
    }

    // Move rocks slightly if they overlap roads or buildings
    nudgeRocksAwayFromCollisions(terrain, roads, buildings) {
        if (!terrain || !terrain.userData || !terrain.userData.rocks) return;
        const rocks = terrain.userData.rocks;
        const roadBoxes = roads.map(r => new THREE.Box3().setFromObject(r));
        const buildingBoxes = buildings.map(b => new THREE.Box3().setFromObject(b));
        const isOverlapping = (box, target) => box.intersectsBox(target);
        const step = 1.2;
        rocks.forEach((rock) => {
            const box = new THREE.Box3().setFromObject(rock);
            let tries = 0;
            while (tries < 30 && (roadBoxes.some(b => isOverlapping(box, b)) || buildingBoxes.some(b => isOverlapping(box, b)))) {
                // Find nearest overlapping box center
                let nearestCenter = null;
                let minDist = Infinity;
                const center = box.getCenter(new THREE.Vector3());
                const check = (targets) => {
                    targets.forEach(t => {
                        if (isOverlapping(box, t)) {
                            const c = t.getCenter(new THREE.Vector3());
                            const d = center.distanceToSquared(c);
                            if (d < minDist) { minDist = d; nearestCenter = c; }
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
                rock.position.add(dir);
                box.translate(dir);
                tries++;
            }
            if (tries > 0) {
                console.log(`🪨 Nudged rock to (${rock.position.x.toFixed(1)}, ${rock.position.z.toFixed(1)}) after ${tries} step(s)`);
            }
        });
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
}
