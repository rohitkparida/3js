// Tree loader for external 3D models
import { logger } from './utils/logger.js';

export class TreeLoader {
    constructor() {
        this.loader = null;
        this.trees = [];
        this.loadedModels = new Map();
        this._rand = this.makeRng((typeof CONFIG !== 'undefined' && CONFIG.RANDOM && CONFIG.RANDOM.SEED) ? CONFIG.RANDOM.SEED : 12345);
    }
    // Simple seeded RNG (Mulberry32)
    makeRng(seed) {
        let t = seed >>> 0;
        return function() {
            t += 0x6D2B79F5;
            let r = Math.imul(t ^ t >>> 15, 1 | t);
            r ^= r + Math.imul(r ^ r >>> 7, 61 | r);
            return ((r ^ r >>> 14) >>> 0) / 4294967296;
        };
    }

    rand() { return this._rand ? this._rand() : Math.random(); }


    init() {
        // Try to initialize GLTFLoader
        try {
            if (typeof THREE !== 'undefined' && THREE.GLTFLoader) {
                this.loader = new THREE.GLTFLoader();
                logger.info('Tree GLTFLoader initialized successfully', 'TREE');
            } else {
                logger.warn('GLTFLoader not available in THREE object', 'TREE');
                logger.debug('Available THREE loaders:', Object.keys(THREE).filter(key => key.includes('Loader')), 'TREE');
                this.loader = null;
            }
        } catch (error) {
            logger.warn('Tree GLTFLoader initialization failed', 'TREE', error);
            this.loader = null;
        }
    }

    // Load a tree model from URL
    async loadTreeModel(url) {
        if (!this.loader) {
            logger.debug('No tree loader available, using fallback tree', 'TREE');
            return this.createFallbackTree();
        }

        logger.debug('Attempting to load tree model', 'TREE', { url });

        return new Promise((resolve, reject) => {
            this.loader.load(
                url,
                (gltf) => {
                    logger.info('Tree GLTF loaded successfully', 'TREE', { url });
                    const model = gltf.scene;
                    
                    // Calculate proper size scaling
                    const box = new THREE.Box3().setFromObject(model);
                    const size = box.getSize(new THREE.Vector3());
                    const maxDimension = Math.max(size.x, size.y, size.z);
                    const desiredSize = 6; // Desired tree size in our scene (doubled)
                    const scaleFactor = desiredSize / maxDimension;
                    model.scale.set(scaleFactor, scaleFactor, scaleFactor);
                    
                    // Reset and correct orientation
                    model.rotation.set(0, 0, 0);
                    
                    // Position above the ground
                    const center = box.getCenter(new THREE.Vector3());
                    model.position.y -= center.y;
                    model.position.y += size.y / 2;
                    
                    // Enable shadows
                    model.traverse((child) => {
                        if (child.isMesh) {
                            child.castShadow = true;
                            child.receiveShadow = true;
                        }
                    });
                    
                    logger.debug('Tree model processed successfully', 'TREE', { url, scaleFactor: scaleFactor.toFixed(2) });
                    resolve(model);
                },
                (progress) => {
                    if (progress.total > 0) {
                        const percent = (progress.loaded / progress.total * 100).toFixed(1);
                        logger.debug('Tree loading progress', 'TREE', { url, progress: `${percent}%` });
                    }
                },
                (error) => {
                    logger.error('Error loading tree model', 'TREE', { url, error });
                    logger.info('Falling back to primitive tree', 'TREE');
                    resolve(this.createFallbackTree());
                }
            );
        });
    }

    // Create fallback tree if model loading fails
    createFallbackTree() {
        const treeGroup = new THREE.Group();
        
        // Trunk (doubled size)
        const trunkGeometry = new THREE.CylinderGeometry(0.6, 0.8, 4, 6);
        const trunkMaterial = new THREE.MeshLambertMaterial({ color: 0x8B4513 });
        const trunk = new THREE.Mesh(trunkGeometry, trunkMaterial);
        trunk.position.set(0, 2, 0);
        trunk.castShadow = true;
        trunk.receiveShadow = true;
        treeGroup.add(trunk);
        
        // Canopy (doubled size)
        const canopyGeometry = new THREE.SphereGeometry(3, 8, 6);
        const canopyMaterial = new THREE.MeshLambertMaterial({ color: 0x228B22 });
        const canopy = new THREE.Mesh(canopyGeometry, canopyMaterial);
        canopy.position.set(0, 5, 0);
        canopy.castShadow = true;
        canopy.receiveShadow = true;
        treeGroup.add(canopy);
        
        return treeGroup;
    }

    // Create tree with external model
    async createTree(x, z, size = 1, modelUrl = null) {
        let treeModel;
        
        if (modelUrl && this.loader) {
            logger.debug('Attempting to load GLB tree model', 'TREE', { modelUrl });
            treeModel = await this.loadTreeModel(modelUrl);
        } else {
            logger.debug('Using fallback tree (no model URL or loader)', 'TREE');
            treeModel = this.createFallbackTree();
        }
        
        // Apply size scaling
        treeModel.scale.multiplyScalar(size);
        
        treeModel.position.set(x, 0, z);
        
        logger.debug('Tree created', 'TREE', { x, z, size });
        return treeModel;
    }

    // Create tree forest with external models
    async createTreeForest() {
        this.init();
        const trees = [];
        
        // Tree model URL
        const treeModelUrl = 'models/tree.glb';
        
        // Safe tree positions - far from roads (reduced for performance - 25 total)
        let treePositions = [
            // North area - 6 positions for 25 total
            [-55, 55], [-45, 55], [-35, 55], [-25, 55], [-15, 55], [15, 55],

            // South area - 6 positions
            [-55, -55], [-45, -55], [-35, -55], [-25, -55], [-15, -55], [15, -55],

            // East area - 5 positions
            [55, -35], [55, -25], [55, -15], [55, 15], [55, 25],

            // West area - 5 positions
            [-55, -35], [-55, -25], [-55, -15], [-55, 15], [-55, 25],

            // Central areas - 3 positions
            [-25, 10], [25, 10], [-10, 25]
        ];

        // Create a second set with radial offset (25 more for 50 total)
        const extra = treePositions.map(([x, z]) => {
            const angle = this.rand() * Math.PI * 2;
            const dist = 4 + this.rand() * 6; // 4–10 units away
            return [x + Math.cos(angle) * dist, z + Math.sin(angle) * dist];
        });
        treePositions = treePositions.concat(extra);

        // Softly push trees away from primary road centerlines
        const primaryZ = [ -60, -40, -20, 0, 20, 40, 60 ];
        const primaryX = [ -60, -40, 0, 40, 60 ];
        const halfRoad = 3; // road half-width
        const safety = 2.0; // additional buffer (bigger to avoid high-severity hits)
        const minOffsetFromCenter = halfRoad + safety + 1.0; // hard minimum distance
        treePositions = treePositions.map(([x, z]) => {
            // Nudge from horizontal roads (constant z)
            for (const rz of primaryZ) {
                const dz = Math.abs(z - rz);
                if (dz < halfRoad + safety) {
                    const dir = z >= rz ? 1 : -1;
                    const push = (halfRoad + safety - dz) + 1 + this.rand();
                    z += dir * push;
                    // Enforce minimum offset after push
                    const afterDz = Math.abs(z - rz);
                    if (afterDz < minOffsetFromCenter) {
                        z = rz + (z >= rz ? 1 : -1) * (minOffsetFromCenter + this.rand());
                    }
                }
            }
            // Nudge from vertical roads (constant x)
            for (const rx of primaryX) {
                const dx = Math.abs(x - rx);
                if (dx < halfRoad + safety) {
                    const dir = x >= rx ? 1 : -1;
                    const push = (halfRoad + safety - dx) + 1 + this.rand();
                    x += dir * push;
                    // Enforce minimum offset after push
                    const afterDx = Math.abs(x - rx);
                    if (afterDx < minOffsetFromCenter) {
                        x = rx + (x >= rx ? 1 : -1) * (minOffsetFromCenter + this.rand());
                    }
                }
            }
            // Clamp to map bounds (inside walls)
            const LIMIT = 68;
            if (x > LIMIT) x = LIMIT - this.rand()*2;
            if (x < -LIMIT) x = -LIMIT + this.rand()*2;
            if (z > LIMIT) z = LIMIT - this.rand()*2;
            if (z < -LIMIT) z = -LIMIT + this.rand()*2;
            return [x, z];
        });

        // De-clump trees: ensure a minimum separation between trees
        const minDist = 2.5;
        for (let i = 0; i < treePositions.length; i++) {
            let [xi, zi] = treePositions[i];
            // Push away from known building hotspots to avoid Tree-Building overlap
            const hotspots = [
                // Industrial corners
                { x: -55, z: -15, r: 5 },
                { x: -55, z:  15, r: 7 },
                { x:  55, z:  15, r: 8 },
                { x: -10, z: -35, r: 4 },
                // Commercial district corners near center
                { x:  12, z:  12, r: 5 },
                { x:  12, z: -12, r: 5 },
                { x: -35, z: -10, r: 5 }
            ];
            for (const h of hotspots) {
                const dxh = xi - h.x, dzh = zi - h.z;
                const dh = Math.hypot(dxh, dzh);
                if (dh < h.r) {
                    const nx = dxh === 0 && dzh === 0 ? 1 : dxh / (dh || 1);
                    const nz = dxh === 0 && dzh === 0 ? 0 : dzh / (dh || 1);
                    const pushOut = (h.r - dh) + 0.75 + this.rand();
                    xi = h.x + nx * (h.r + pushOut);
                    zi = h.z + nz * (h.r + pushOut);
                }
            }
            for (let j = 0; j < i; j++) {
                const [xj, zj] = treePositions[j];
                const dx = xi - xj, dz = zi - zj;
                const d = Math.hypot(dx, dz);
                if (d > 0 && d < minDist) {
                    const push = (minDist - d) + 0.5 * this.rand();
                    const nx = dx / d, nz = dz / d;
                    xi += nx * push;
                    zi += nz * push;
                }
            }
            // Clamp after adjustments
            const LIMIT = 68;
            if (xi > LIMIT) xi = LIMIT - this.rand()*2;
            if (xi < -LIMIT) xi = -LIMIT + this.rand()*2;
            if (zi > LIMIT) zi = LIMIT - this.rand()*2;
            if (zi < -LIMIT) zi = -LIMIT + this.rand()*2;
            treePositions[i] = [xi, zi];
        }

        // Shuffle to reduce visible pairing
        for (let i = treePositions.length - 1; i > 0; i--) {
            const j = Math.floor(this.rand() * (i + 1));
            [treePositions[i], treePositions[j]] = [treePositions[j], treePositions[i]];
        }
        
        logger.info('Loading tree forest with external models', 'TREE');
        logger.debug('Tree model', 'TREE', { treeModelUrl });

        for (let i = 0; i < treePositions.length; i++) {
            const [x, z] = treePositions[i];
            const size = this.rand() * 0.3 + 0.7;

            // Only log progress every 10 trees to reduce spam
            if (i % 10 === 0) {
                logger.debug('Creating trees', 'TREE', { progress: `${i}/${treePositions.length}` });
            }

            try {
                const tree = await this.createTree(x, z, size, treeModelUrl);
                trees.push(tree);

                // Log success every 20 trees to reduce noise
                if (i % 20 === 0) {
                    logger.debug('Tree batch created', 'TREE', { count: i + 1, total: treePositions.length });
                }
            } catch (error) {
                logger.error('Error creating tree', 'TREE', { index: i, x, z, error });
                // Create fallback tree
                logger.debug('Creating fallback tree', 'TREE');
                const fallbackTree = await this.createTree(x, z, size);
                trees.push(fallbackTree);
                logger.debug('Fallback tree created', 'TREE', { index: i, x, z });
            }
        }

        logger.info('Tree forest created', 'TREE', { count: trees.length });
        return trees;
    }
}
