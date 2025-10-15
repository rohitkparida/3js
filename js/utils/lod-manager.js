/**
 * LOD Manager for handling Level of Detail (LOD) optimization
 * Uses the global THREE object
 */
export class LODManager {
    /**
     * Create a LOD manager
     * @param {THREE.Camera} camera - The camera to calculate distances from
     * @param {Object} options - Configuration options
     * @param {number} [options.highDetailDistance=20] - Distance for high detail model
     * @param {number} [options.mediumDetailDistance=50] - Distance for medium detail model
     * @param {number} [options.lowDetailDistance=100] - Distance for low detail model
     */
    constructor(camera, options = {}) {
        this.camera = camera;
        this.options = {
            highDetailDistance: 20,
            mediumDetailDistance: 50,
            lowDetailDistance: 100,
            ...options
        };
        this.lodGroups = new Map();
    }

    /**
     * Create LOD versions of a model
     * @param {THREE.Object3D} model - The original model (highest detail)
     * @param {Object} options - LOD options
     * @returns {THREE.LOD} The LOD group
     */
    createLOD(model, options = {}) {
        const lod = new THREE.LOD();
        const modelName = model.name || 'model';
        
        // Clone the original model for high detail
        const highDetail = model.clone();
        highDetail.name = `${modelName}_high`;
        
        // Create medium detail version (simplified)
        const mediumDetail = this._createSimplifiedModel(model, 0.7);
        mediumDetail.name = `${modelName}_medium`;
        
        // Create low detail version (more simplified)
        const lowDetail = this._createSimplifiedModel(model, 0.4);
        lowDetail.name = `${modelName}_low`;
        
        // Create billboard for very far distances
        const billboard = this._createBillboard(model);
        billboard.name = `${modelName}_billboard`;
        
        // Add LOD levels with distances
        const {
            highDetailDistance = this.options.highDetailDistance,
            mediumDetailDistance = this.options.mediumDetailDistance,
            lowDetailDistance = this.options.lowDetailDistance
        } = options;
        
        lod.addLevel(highDetail, 0);
        lod.addLevel(mediumDetail, highDetailDistance);
        lod.addLevel(lowDetail, mediumDetailDistance);
        lod.addLevel(billboard, lowDetailDistance);
        
        // Store reference
        this.lodGroups.set(model.uuid, lod);
        
        return lod;
    }
    
    /**
     * Create a simplified version of a model
     * @private
     */
    _createSimplifiedModel(original, quality = 0.5) {
        const simplified = new THREE.Group();
        
        original.traverse((child) => {
            if (!child.isMesh) return;
            
            const geometry = child.geometry;
            if (!geometry) return;
            
            // Create a simplified geometry
            const simplifiedGeometry = this._simplifyGeometry(geometry, quality);
            
            // Create a new mesh with the simplified geometry
            const material = child.material.clone();
            const simplifiedMesh = new THREE.Mesh(simplifiedGeometry, material);
            
            // Copy transform
            simplifiedMesh.position.copy(child.position);
            simplifiedMesh.rotation.copy(child.rotation);
            simplifiedMesh.scale.copy(child.scale);
            
            simplified.add(simplifiedMesh);
        });
        
        return simplified;
    }
    
    /**
     * Simplify geometry
     * @private
     */
    _simplifyGeometry(geometry, quality) {
        // If the geometry is already simplified or too simple, return a clone
        if (geometry.getAttribute('position').count < 100) {
            return geometry.clone();
        }
        
        // Use the SimplifyModifier if available
        if (window.SimplifyModifier) {
            const modifier = new window.SimplifyModifier();
            const simplified = geometry.clone();
            const count = Math.floor(geometry.getAttribute('position').count * quality);
            return modifier.modify(simplified, count);
        }
        
        // Fallback: Use a simple decimation
        return this._simpleDecimation(geometry, quality);
    }
    
    /**
     * Simple geometry decimation fallback
     * @private
     */
    _simpleDecimation(geometry, quality) {
        // This is a very basic decimation - consider using a proper algorithm
        const simplified = geometry.clone();
        const position = simplified.getAttribute('position');
        const count = Math.floor(position.count * quality);
        
        if (count < position.count) {
            // Create a new buffer geometry with fewer vertices
            const newGeometry = new THREE.BufferGeometry();
            const newPositions = [];
            const newNormals = [];
            const newUvs = [];
            
            // Copy attributes with reduced density
            for (let i = 0; i < count; i++) {
                const idx = Math.floor(i / quality);
                if (idx < position.count) {
                    newPositions.push(
                        position.getX(idx),
                        position.getY(idx),
                        position.getZ(idx)
                    );
                    
                    if (simplified.hasAttribute('normal')) {
                        const normal = simplified.getAttribute('normal');
                        newNormals.push(
                            normal.getX(idx),
                            normal.getY(idx),
                            normal.getZ(idx)
                        );
                    }
                    
                    if (simplified.hasAttribute('uv')) {
                        const uv = simplified.getAttribute('uv');
                        newUvs.push(
                            uv.getX(idx),
                            uv.getY(idx)
                        );
                    }
                }
            }
            
            // Set the new attributes
            newGeometry.setAttribute('position', new THREE.Float32BufferAttribute(newPositions, 3));
            if (newNormals.length > 0) {
                newGeometry.setAttribute('normal', new THREE.Float32BufferAttribute(newNormals, 3));
            }
            if (newUvs.length > 0) {
                newGeometry.setAttribute('uv', new THREE.Float32BufferAttribute(newUvs, 2));
            }
            
            return newGeometry;
        }
        
        return simplified;
    }
    
    /**
     * Create a billboard for very distant objects
     * @private
     */
    _createBillboard(model) {
        // Create a simple billboard (sprite) for very distant objects
        const box = new THREE.Box3().setFromObject(model);
        const size = box.getSize(new THREE.Vector3());
        const maxDim = Math.max(size.x, size.y, size.z);
        
        // Create a simple plane with the model's main texture (if any)
        const material = new THREE.MeshBasicMaterial({
            color: 0x888888,
            transparent: true,
            opacity: 0.8
        });
        
        const plane = new THREE.Mesh(
            new THREE.PlaneGeometry(maxDim, maxDim),
            material
        );
        
        // Make it face the camera
        plane.lookAt = (camera) => {
            plane.quaternion.copy(camera.quaternion);
        };
        
        return plane;
    }
    
    /**
     * Update all LOD levels based on camera position
     */
    update() {
        if (!this.camera) return;
        
        for (const [id, lod] of this.lodGroups.entries()) {
            // Skip if LOD object was removed from scene
            if (!lod.parent) continue;
            
            // Calculate distance from camera to LOD object
            const distance = this.camera.position.distanceTo(lod.getWorldPosition(new THREE.Vector3()));
            
            // Update LOD level
            lod.update(this.camera);
            
            // Additional optimizations for distant objects
            this._optimizeDistantObject(lod, distance);
        }
    }
    
    /**
     * Apply additional optimizations for distant objects
     * @private
     */
    _optimizeDistantObject(object, distance) {
        const isDistant = distance > this.options.mediumDetailDistance;
        
        object.traverse((child) => {
            if (!child.isMesh) return;
            
            // Skip if already processed
            if (child.userData.originalMaterial) return;
            
            if (isDistant) {
                // Store original material for later restoration
                if (!child.userData.originalMaterial) {
                    child.userData.originalMaterial = child.material;
                    
                    // Create simplified material for distant objects
                    const material = child.material.clone();
                    material.aoMap = null;
                    material.normalMap = null;
                    material.metalnessMap = null;
                    material.roughnessMap = null;
                    material.emissiveMap = null;
                    material.displacementMap = null;
                    material.clearcoatNormalMap = null;
                    material.clearcoatRoughnessMap = null;
                    material.iridescenceMap = null;
                    material.specularIntensityMap = null;
                    material.specularColorMap = null;
                    material.transmissionMap = null;
                    material.thicknessMap = null;
                    
                    // Apply simplified material
                    child.material = material;
                }
            } else if (child.userData.originalMaterial) {
                // Restore original material when object is close again
                child.material = child.userData.originalMaterial;
                child.userData.originalMaterial = null;
            }
        });
    }
    
    /**
     * Dispose of resources
     */
    dispose() {
        for (const lod of this.lodGroups.values()) {
            lod.traverse((child) => {
                if (child.isMesh) {
                    if (child.geometry) child.geometry.dispose();
                    if (child.material) {
                        if (Array.isArray(child.material)) {
                            child.material.forEach(m => m.dispose());
                        } else {
                            child.material.dispose();
                        }
                    }
                }
            });
        }
        this.lodGroups.clear();
    }
}
