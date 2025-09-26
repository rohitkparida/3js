// GLTFExporter is loaded in global scope by HTML script tag

/**
 * Spline 3D Export Utility
 * Exports complete Three.js scenes to GLTF format for Spline import
 */
export class SplineExporter {
    constructor(scene, game = null) {
        this.scene = scene;
        this.game = game;
        this.exporter = new THREE.GLTFExporter();
    }

    /**
     * Export entire scene to GLTF for Spline import
     */
    async exportSceneToSpline(options = {}) {
        console.log('🎨 Starting Spline export...');
        
        // Create metadata
        const metadata = this.createExportMetadata();
        
        // Prepare scene for export
        const exportData = this.prepareSceneForExport(options);
        
        // Export options  
        const exportOptions = {
            binary: true,
            trs: true,
            includeCustomExtensions: false,
            onlyVisible: options.onlyVisible || false,
        };

        return new Promise((resolve, reject) => {
            this.exporter.parse(
                exportData,
                (result) => {
                    console.log('✅ GLTF export completed.');
                    console.log('📄 Export result details:', Object.keys(result || {}));
                    console.log('🔍 Export type:', typeof result, result instanceof ArrayBuffer);
                    
                    if (!result || (typeof result === 'object' && Object.keys(result).length === 0)) {
                        reject(new Error('Empty export result'));
                        return;
                    }
                    
                    this.downloadGLTF(result, metadata.name);
                    resolve(result);
                },
                (error) => {
                    console.error('❌ Export failed:', error);
                    reject(error);
                },
                exportOptions
            );
        });
    }

    /**
     * Create scene metadata for export
     */
    createExportMetadata() {
        const sceneObjects = this.getSceneObjectCount();
        return {
            name: `3D_Scene_${new Date().toISOString().split('T')[0]}`,
            description: `3D Environment with ${sceneObjects.buildings} buildings, ${sceneObjects.trees} trees, ${sceneObjects.vehicles} vehicles`,
            created: new Date().toISOString(),
            version: '1.0.0',
            objects: sceneObjects
        };
    }

    /**
     * Prepare scene data for optimal Spline compatibility
     */
    prepareSceneForExport(options = {}) {
        const exportScene = new THREE.Scene();
        
        // Copy basic scene properties (ignore physics/references)
        exportScene.background = this.scene.background;
        exportScene.fog = this.scene.fog;
        
        // Add objects manually to avoid circular references
        // Only process direct children of scene first
        this.scene.children.forEach(child => {
            if (this.shouldIncludeObject(child)) {
                const cleanClone = this.cleanObjectForExport(child);
                if (cleanClone) {
                    exportScene.add(cleanClone);
                }
            }
        });

        // Enable optimal rendering for Spline
        this.optimizeForSpline(exportScene);
        
        return exportScene;
    }

    /**
     * Check if object should be included in export
     */
    shouldIncludeObject(child) {
        // Skip cameras (except if explicitly meant for export)
        if (child.type === 'Camera') {
            return false;
        }
        
        // Skip empty groups 
        if (child.isGroup && child.children.length === 0) {
            return false;
        }
        
        // Only include meshes and groups with actual content
        return child.isMesh || (child.isGroup && child.children.length > 0);
    }

    /**
     * Clone object safely for export, removing physics and circular refs
     */
    cleanObjectForExport(obj) {
        // Only export visual mesh objects and groups
        if (!(obj.isMesh || obj.isGroup || obj.isLight)) {
            return null;
        }
        
        try {
            // Create new object without cloning to avoid circular refs
            let cleanObj;
            
            if (obj.isMesh) {
                // Clean geometry/material references
                const geometry = obj.geometry ? obj.geometry.clone() : new THREE.BoxGeometry(1, 1, 1);
                let material = new THREE.MeshBasicMaterial({ color: 0x888888 });
                
                if (obj.material) {
                    // Create basic material similar to original
                    material = new THREE.MeshBasicMaterial({
                        color: obj.material.color || 0x888888,
                        transparent: obj.material.transparent || false,
                        opacity: obj.material.opacity || 1,
                    });
                }
                
                cleanObj = new THREE.Mesh(geometry, material);
                
            } else if (obj.isGroup) {
                cleanObj = new THREE.Group();
                
            } else {
                // Don't export if can't safely re-create
                return null;
            }

            // Copy essential properties safely
            if (obj.position) cleanObj.position.copy(obj.position);
            if (obj.rotation) cleanObj.rotation.copy(obj.rotation);
            if (obj.scale) cleanObj.scale.copy(obj.scale);
            
            cleanObj.name = obj.name || `${obj.type.toLowerCase()}_${Math.random().toString(36).substr(2, 5)}`;

            // Add children for groups only (avoid traversing mesh children)
            if (obj.isGroup && obj.children) {
                obj.children.forEach(child => {
                    if (child.isMesh || child.isGroup) {
                        const childClean = this.cleanObjectForExport(child);
                        if (childClean) {
                            cleanObj.add(childClean);
                        }
                    }
                });
            }

            return cleanObj;
            
        } catch (error) {
            console.warn('Skipping problematic object during export:', obj.name, error);
            return null;
        }
    }

    /**
     * Optimize scene objects for Spline compatibility
     */
    optimizeForSpline(scene) {
        scene.traverse((child) => {
            // Name unlabeled objects
            if (!child.name) {
                child.name = `${child.type}_${Math.random().toString(36).substr(2, 9)}`;
            }
            
            // Fix material properties for Spline
            if (child.isMesh) {
                this.optimizeMaterials(child);
                
                // Ensure shadows work correctly
                child.castShadow = false; // Avoid double shadows
                child.receiveShadow = true;
            }
            
            // Remove physics properties (not exported)
            if (child.userData && child.userData.cannon) {
                delete child.userData.cannon;
            }
        });

        // Add camera for perspective if not present
        this.ensureExportCamera(scene);
    }

    /**
     * Optimize materials for best Spline compatibility
     */
    optimizeMaterials(mesh) {
        if (!mesh.material) return;

        const material = mesh.material;
        
        // Enable vertex colors for better compatibility
        if (material.vertexColors === undefined) {
            material.vertexColors = false;
        }
        
        // Disable complex physics properties
        if (material.normalScale) {
            material.normalScale.set(1, 1);
        }

        // Ensure proper transparency settings
        if (material.transparent) {
            material.blending = THREE.NormalBlending;
        }
    }

    /**
     * Add camera for Spline preview if not present
     */
    ensureExportCamera(scene) {
        if (!scene.getObjectByName('ExportCamera')) {
            const camera = new THREE.PerspectiveCamera(75, 16/9, 0.1, 1000);
            camera.position.set(0, 10, 20);
            camera.name = 'ExportCamera';
            scene.add(camera);
        }
    }

    /**
     * Count objects in scene for metadata
     */
    getSceneObjectCount() {
        let counts = { buildings: 0, trees: 0, vehicles: 0, other: 0 };
        
        this.scene.traverse((child) => {
            if (child.isMesh) {
                if (child.name.includes('building')) counts.buildings++;
                else if (child.name.includes('tree')) counts.trees++;
                else if (child.name.includes('car')) counts.vehicles++;
                else counts.other++;
            }
        });
        
        return counts;
    }

    /**
     * Download GLTF/GLB file
     */
    downloadGLTF(gltfData, filename) {
        // Handle binary GLB properly
        try {
            if (gltfData instanceof ArrayBuffer || gltfData instanceof Uint8Array) {
                // Binary GLB data (preferred)
                const blob = new Blob([gltfData], { type: 'model/gltf-binary' });
                this.downloadFile(blob, `${filename}.glb`);
                console.log(`📁 Downloaded: ${filename}.glb`);
                
            } else if (gltfData && typeof gltfData === 'object') {
                // JSON GLTF 
                try {
                    const jsonString = JSON.stringify(gltfData, null, 2);
                    const blob = new Blob([jsonString], { type: 'model/gltf+json' });
                    this.downloadFile(blob, `${filename}.gltf`);
                    console.log(`📁 Downloaded: ${filename}.gltf`);
                } catch (jsonError) {
                    console.error('Cannot stringify GLTF data:', jsonError, gltfData);
                    alert('Export data corrupted. Check console.');
                    return;
                }
            } else {
                console.error('Invalid GLTF export format:', typeof gltfData, gltfData);
                return;
            }
            
        } catch (error) {
            console.error('Failed to download GLTF:', error);
            alert('Downloading failed. Check console writes.');
        }
    }
    
    downloadFile(blob, filename) {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.style.display = 'none';
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }

    /**
     * Export specific layer (buildings, roads, vehicles, etc.)
     */
    async exportLayer(layerType, options = {}) {
        const layerObjects = this.getObjectsByLayer(layerType);
        
        if (layerObjects.length === 0) {
            console.warn(`⚠️ No objects found for layer: ${layerType}`);
            return null;
        }

        // Create temporary scene with only this layer
        const tempScene = new THREE.Scene();
        layerObjects.forEach(obj => tempScene.add(obj.clone()));
        
        // Optimize layer
        this.optimizeForSpline(tempScene);
        
        return this.exportSceneToSpline({ 
            ...options, 
            fullScene: false,
            objects: layerObjects.map(o => o.name) 
        });
    }

    /**
     * Get objects by layer/purpose
     */
    getObjectsByLayer(layerType) {
        const objects = [];
        
        this.scene.traverse((child) => {
            if (child.isMesh || child.isGroup) {
                const name = child.name.toLowerCase();
                
                switch(layerType) {
                    case 'buildings':
                        if (name.includes('building') || name.includes('house')) {
                            objects.push(child);
                        }
                        break;
                    case 'vehicles':
                        if (name.includes('car') || name.includes('vehicle')) {
                            objects.push(child);
                        }
                        break;
                    case 'nature':
                        if (name.includes('tree') || name.includes('grass')) {
                            objects.push(child);
                        }
                        break;
                    case 'infrastructure':
                        if (name.includes('road') || name.includes('archway')) {
                            objects.push(child);
                        }
                        break;
                }
            }
        });
        
        return objects;
    }
}

/**
 * Utility function to export current scene
 */
export async function exportToSpline(gameObject = null) {
    if (!gameObject) {
        console.error('❌ Game object required for export');
        return;
    }

    const exporter = new SplineExporter(gameObject.scene, gameObject);
    
    // Export options
    const options = {
        onlyVisible: true,
        binary: true,
        trs: true
    };

    try {
        await exporter.exportSceneToSpline(options);
    } catch (error) {
        console.error('Failed to export to Spline:', error);
    }
}
