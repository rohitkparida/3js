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
            trs: true, // Include transform, rotation, scale
            onlyVisible: options.onlyVisible || false,
            binary: true, // GLB format
            includeCustomExtensions: true,
            ...options
        };

        return new Promise((resolve, reject) => {
            this.exporter.parse(
                exportData,
                (result) => {
                    console.log('✅ GLTF export completed');
                    this.downloadGLTF(result, metadata.name);
                    resolve(result);
                },
                (error) => {
                    console.error('❌ Export failed:', error);
                    reject(error);
                }
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
        let exportScene;
        
        if (options.fullScene !== false) {
            // Clone the entire scene
            exportScene = this.scene.clone();
        } else {
            // Export only specific objects
            exportScene = new THREE.Scene();
            exportScene.copy(this.scene);
            
            if (options.objects) {
                // Filter objects to export specific ones
                options.objects.forEach(objName => {
                    const obj = this.scene.getObjectByName(objName);
                    if (obj) exportScene.add(obj.clone());
                });
            }
        }

        // Enable optimal rendering for Spline
        this.optimizeForSpline(exportScene);
        
        return exportScene;
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
        const blob = new Blob([gltfData], { type: 'model/gltf-binary' });
        const url = URL.createObjectURL(blob);
        
        const a = document.createElement('a');
        a.style.display = 'none';
        a.href = url;
        a.download = `${filename}.glb`;
        document.body.appendChild(a);
        a.click();
        
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        
        console.log(`📁 Downloaded: ${filename}.glb`);
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
