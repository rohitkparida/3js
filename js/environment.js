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
}
