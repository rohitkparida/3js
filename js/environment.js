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
            const fountain = await this.loadAndPlaceFountain('models/fountain.glb', { x: 8, z: 8 });
            if (fountain) {
                this.scene.add(fountain);
                this.objects.push(fountain);
            }
        } catch (_) {}

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
            if (!THREE || !THREE.GLTFLoader) return resolve(null);
            const loader = new THREE.GLTFLoader();
            loader.load(
                url,
                (gltf) => {
                    const fountain = gltf.scene || gltf.scenes?.[0];
                    if (!fountain) return resolve(null);

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

                    // Enable shadows and hide any grass/terrain components from the GLB
                    fountain.traverse((child) => {
                        if (child.isMesh) {
                            child.castShadow = true;
                            child.receiveShadow = true;
                            
                                // Hide grass/terrain components but PRESERVE water
                                if (child.material) {
                                    const matName = child.material.name ? child.material.name.toLowerCase() : '';
                                    const nodeName = child.name ? child.name.toLowerCase() : '';
                                    
                                    // NEVER hide water components - check for water first
                                    const isWaterComponent = () => {
                                        return matName.includes('water') || matName.includes('liquid') ||
                                               nodeName.includes('water') || nodeName.includes('liquid') ||
                                               matName.includes('flow') || nodeName.includes('flow');
                                    };
                                    
                                    if (isWaterComponent()) {
                                        // Preserve all water components
                                        console.log(`💧 Keeping water component: ${child.name || 'unnamed'}`);
                                        return;
                                    }
                                    
                                    // Only hide non-water grass/ground components
                                    const isGrassComponent = () => {
                                        return (matName.includes('grass') || matName.includes('ground') || 
                                               matName.includes('floor') || matName.includes('terrain')) &&
                                               !matName.includes('water') && !matName.includes('liquid');
                                    };
                                    
                                    const isGrassByName = () => {
                                        return (nodeName.includes('grass') || nodeName.includes('ground')) &&
                                               !nodeName.includes('water') && !nodeName.includes('liquid');
                                    };
                                    
                                    // Simple color check for ground (avoid water blue colors)
                                    const looksLikeGround = (material) => {
                                        if (!material.color) return false;
                                        const rgb = { r: material.color.r, g: material.color.g, b: material.color.b };
                                        const isGreen = rgb.g > rgb.r && rgb.g > rgb.b && rgb.g > 0.3;
                                        const isBrown = rgb.r > 0.4 && rgb.g > 0.2 && rgb.g < rgb.r && rgb.b < rgb.g;
                                        const isBlue = rgb.b > rgb.r && rgb.b > rgb.g && rgb.b > 0.3;
                                        
                                        // Don't hide blue materials (likely water)
                                        if (isBlue) return false;
                                        return isGreen || isBrown;
                                    };
                                    
                                    // Hide only definite ground/grass components
                                    if (isGrassComponent() || isGrassByName() || looksLikeGround(child.material)) {
                                        child.visible = false;
                                        console.log(`🌱 Hid grass component: ${child.name || 'unnamed'}`);
                                    }
                                }
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

                    // Guarantee fountain is grounded - set base to exact Y=0
                    const groundingBox = new THREE.Box3().setFromObject(fountain);
                    fountain.position.y = -groundingBox.min.y; // Force base at terrain level
                    
                    // Safety fallback - ensure fountain never appears to float
                    if (fountain.position.y < 0) {
                        fountain.position.y = Math.abs(groundingBox.min.y);
                    }

                    fountain.name = 'animated_fountain';
                    console.log(`⛲ Fountain placed at (${fountain.position.x.toFixed(2)}, ${fountain.position.z.toFixed(2)})`);
                    resolve(fountain);
                },
                undefined,
                () => resolve(null)
            );
        });
    }
}
