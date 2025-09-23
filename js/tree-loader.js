// Tree loader for external 3D models
export class TreeLoader {
    constructor() {
        this.loader = null;
        this.trees = [];
        this.loadedModels = new Map();
    }

    init() {
        // Try to initialize GLTFLoader
        try {
            if (typeof THREE !== 'undefined' && THREE.GLTFLoader) {
                this.loader = new THREE.GLTFLoader();
                console.log('✅ Tree GLTFLoader initialized successfully');
            } else {
                console.warn('❌ GLTFLoader not available in THREE object');
                console.log('Available THREE loaders:', Object.keys(THREE).filter(key => key.includes('Loader')));
                this.loader = null;
            }
        } catch (error) {
            console.warn('❌ Tree GLTFLoader initialization failed:', error);
            this.loader = null;
        }
    }

    // Load a tree model from URL
    async loadTreeModel(url) {
        if (!this.loader) {
            console.log('⚠️ No tree loader available, using fallback tree');
            return this.createFallbackTree();
        }

        console.log('🔄 Attempting to load tree model:', url);

        return new Promise((resolve, reject) => {
            this.loader.load(
                url,
                (gltf) => {
                    console.log('✅ Tree GLTF loaded successfully:', url);
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
                    
                    console.log('✅ Tree model processed successfully:', url);
                    console.log(`📏 Tree scaled by factor: ${scaleFactor.toFixed(2)}`);
                    resolve(model);
                },
                (progress) => {
                    if (progress.total > 0) {
                        console.log('Tree loading progress:', (progress.loaded / progress.total * 100).toFixed(1) + '%');
                    }
                },
                (error) => {
                    console.error('❌ Error loading tree model:', url, error);
                    console.log('🔄 Falling back to primitive tree');
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
            console.log('🔄 Attempting to load GLB tree model:', modelUrl);
            treeModel = await this.loadTreeModel(modelUrl);
        } else {
            console.log('🔄 Using fallback tree (no model URL or loader)');
            treeModel = this.createFallbackTree();
        }
        
        // Apply size scaling
        treeModel.scale.multiplyScalar(size);
        
        treeModel.position.set(x, 0, z);
        
        console.log(`🌳 Tree created at (${x}, ${z}) with size ${size}`);
        return treeModel;
    }

    // Create tree forest with external models
    async createTreeForest() {
        this.init();
        const trees = [];
        
        // Tree model URL
        const treeModelUrl = 'models/tree.glb';
        
        // Safe tree positions - far from roads
        let treePositions = [
            // North area (far from North Avenue)
            [-55, 55], [-45, 55], [-35, 55], [-25, 55], [-15, 55], [15, 55], [25, 55], [35, 55], [45, 55], [55, 55],
            
            // South area (far from South Avenue)
            [-55, -55], [-45, -55], [-35, -55], [-25, -55], [-15, -55], [15, -55], [25, -55], [35, -55], [45, -55], [55, -55],
            
            // East area (far from East Street and industrial buildings)
            [55, -45], [55, -35], [55, -25], [55, -5], [55, 5], [55, 25], [55, 35], [55, 45],
            
            // West area (far from West Street and industrial buildings)
            [-55, -45], [-55, -35], [-55, -25], [-55, -5], [-55, 5], [-55, 25], [-55, 35], [-55, 45],
            
            // Central areas (between main roads)
            [-25, 10], [-25, -10], [25, 10], [25, -10],
            [-10, 25], [-10, -25], [10, 25], [10, -25],
            
            // Corner areas
            [-65, 65], [65, 65], [-65, -65], [65, -65]
        ];
        // Apply light jitter to base positions
        treePositions = treePositions.map(([x, z]) => [
            x + (Math.random() - 0.5) * 2,
            z + (Math.random() - 0.5) * 2
        ]);

        // Create a second set with a radial offset (so they don't sit as pairs)
        const extra = treePositions.map(([x, z]) => {
            const angle = Math.random() * Math.PI * 2;
            const dist = 4 + Math.random() * 6; // 4–10 units away
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
                    const push = (halfRoad + safety - dz) + 1 + Math.random();
                    z += dir * push;
                    // Enforce minimum offset after push
                    const afterDz = Math.abs(z - rz);
                    if (afterDz < minOffsetFromCenter) {
                        z = rz + (z >= rz ? 1 : -1) * (minOffsetFromCenter + Math.random());
                    }
                }
            }
            // Nudge from vertical roads (constant x)
            for (const rx of primaryX) {
                const dx = Math.abs(x - rx);
                if (dx < halfRoad + safety) {
                    const dir = x >= rx ? 1 : -1;
                    const push = (halfRoad + safety - dx) + 1 + Math.random();
                    x += dir * push;
                    // Enforce minimum offset after push
                    const afterDx = Math.abs(x - rx);
                    if (afterDx < minOffsetFromCenter) {
                        x = rx + (x >= rx ? 1 : -1) * (minOffsetFromCenter + Math.random());
                    }
                }
            }
            // Clamp to map bounds (inside walls)
            const LIMIT = 68;
            if (x > LIMIT) x = LIMIT - Math.random()*2;
            if (x < -LIMIT) x = -LIMIT + Math.random()*2;
            if (z > LIMIT) z = LIMIT - Math.random()*2;
            if (z < -LIMIT) z = -LIMIT + Math.random()*2;
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
                    const pushOut = (h.r - dh) + 0.75 + Math.random();
                    xi = h.x + nx * (h.r + pushOut);
                    zi = h.z + nz * (h.r + pushOut);
                }
            }
            for (let j = 0; j < i; j++) {
                const [xj, zj] = treePositions[j];
                const dx = xi - xj, dz = zi - zj;
                const d = Math.hypot(dx, dz);
                if (d > 0 && d < minDist) {
                    const push = (minDist - d) + 0.5 * Math.random();
                    const nx = dx / d, nz = dz / d;
                    xi += nx * push;
                    zi += nz * push;
                }
            }
            // Clamp after adjustments
            const LIMIT = 68;
            if (xi > LIMIT) xi = LIMIT - Math.random()*2;
            if (xi < -LIMIT) xi = -LIMIT + Math.random()*2;
            if (zi > LIMIT) zi = LIMIT - Math.random()*2;
            if (zi < -LIMIT) zi = -LIMIT + Math.random()*2;
            treePositions[i] = [xi, zi];
        }

        // Shuffle to reduce visible pairing
        for (let i = treePositions.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [treePositions[i], treePositions[j]] = [treePositions[j], treePositions[i]];
        }
        
        console.log('🌲 Loading tree forest with external models...');
        console.log('📁 Tree model:', treeModelUrl);
        
        for (let i = 0; i < treePositions.length; i++) {
            const [x, z] = treePositions[i];
            const size = Math.random() * 0.3 + 0.7;
            
            console.log(`🔄 Creating tree ${i + 1}/${treePositions.length} at (${x}, ${z})`);
            
            try {
                const tree = await this.createTree(x, z, size, treeModelUrl);
                trees.push(tree);
                console.log(`✅ Tree ${i + 1}/${treePositions.length} created successfully at (${x}, ${z})`);
            } catch (error) {
                console.error('❌ Error creating tree:', error);
                // Create fallback tree
                console.log('🔄 Creating fallback tree...');
                const fallbackTree = await this.createTree(x, z, size);
                trees.push(fallbackTree);
                console.log(`✅ Fallback tree ${i + 1} created at (${x}, ${z})`);
            }
        }
        
        console.log(`🎉 Tree forest created with ${trees.length} trees`);
        return trees;
    }
}
