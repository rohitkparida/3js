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
        const treePositions = [
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
