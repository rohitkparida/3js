// Vehicle loader for external 3D models
export class VehicleLoader {
    constructor() {
        this.loader = null;
        this.vehicles = [];
        this.loadedModels = new Map();
    }

    init() {
        // Try to initialize GLTFLoader
        try {
            if (typeof THREE !== 'undefined' && THREE.GLTFLoader) {
                this.loader = new THREE.GLTFLoader();
                console.log('✅ GLTFLoader initialized successfully');
            } else {
                console.warn('❌ GLTFLoader not available in THREE object');
                console.log('Available THREE loaders:', Object.keys(THREE).filter(key => key.includes('Loader')));
                this.loader = null;
            }
        } catch (error) {
            console.warn('❌ GLTFLoader initialization failed:', error);
            this.loader = null;
        }
    }


    // Load a car model from URL
    async loadCarModel(url) {
        if (!this.loader) {
            console.log('⚠️ No loader available, using fallback car');
            return this.createFallbackCar();
        }

        console.log('🔄 Attempting to load car model:', url);

        return new Promise((resolve, reject) => {
            this.loader.load(
                url,
                (gltf) => {
                    console.log('✅ GLTF loaded successfully:', url);
                    const model = gltf.scene;
                    
                    // Calculate proper size scaling
                    const box = new THREE.Box3().setFromObject(model);
                    const size = box.getSize(new THREE.Vector3());
                    const maxDimension = Math.max(size.x, size.y, size.z);
                    const desiredSize = 3; // Desired car size in our scene
                    const scaleFactor = desiredSize / maxDimension;
                    model.scale.set(scaleFactor, scaleFactor, scaleFactor);
                    
                    // Reset and correct orientation - rotate to face right (east)
                    model.rotation.set(0, 0, 0); // Reset all rotations first
                    
                    // Try different rotations to align with east direction
                    // Most GLB models face forward (negative Z) by default
                    // We need to rotate them to face east (positive X)
                    model.rotation.y = Math.PI / 2; // Rotate 90 degrees to face east
                    
                    // Position above the road
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
                    
                    console.log('✅ Car model processed successfully:', url);
                    console.log(`📏 Model scaled by factor: ${scaleFactor.toFixed(2)}`);
                    console.log(`🔄 Model rotation after processing: X=${model.rotation.x.toFixed(2)}, Y=${model.rotation.y.toFixed(2)}, Z=${model.rotation.z.toFixed(2)}`);
                    resolve(model);
                },
                (progress) => {
                    if (progress.total > 0) {
                        console.log('Loading progress:', (progress.loaded / progress.total * 100).toFixed(1) + '%');
                    }
                },
                (error) => {
                    console.error('❌ Error loading car model:', url, error);
                    console.log('🔄 Falling back to primitive car');
                    resolve(this.createFallbackCar());
                }
            );
        });
    }

    // Create fallback car if model loading fails
    createFallbackCar() {
        const carGroup = new THREE.Group();
        
        // Car body (much larger and properly sized)
        const carGeometry = new THREE.BoxGeometry(5, 2.2, 2.5);
        const carMaterial = new THREE.MeshLambertMaterial({ color: 0x333333 });
        const car = new THREE.Mesh(carGeometry, carMaterial);
        car.position.set(0, 1.1, 0);
        car.castShadow = true;
        car.receiveShadow = true;
        carGroup.add(car);
        
        // Car roof
        const roofGeometry = new THREE.BoxGeometry(4, 1.2, 2);
        const roofMaterial = new THREE.MeshLambertMaterial({ color: 0x444444 });
        const roof = new THREE.Mesh(roofGeometry, roofMaterial);
        roof.position.set(0, 2, 0);
        roof.castShadow = true;
        roof.receiveShadow = true;
        carGroup.add(roof);
        
        // Wheels (much larger)
        const wheelGeometry = new THREE.CylinderGeometry(0.6, 0.6, 0.4, 8);
        const wheelMaterial = new THREE.MeshLambertMaterial({ color: 0x000000 });
        
        const wheelPositions = [
            [-1.6, 0.6, -1],
            [1.6, 0.6, -1],
            [-1.6, 0.6, 1],
            [1.6, 0.6, 1]
        ];
        
        wheelPositions.forEach(pos => {
            const wheel = new THREE.Mesh(wheelGeometry, wheelMaterial);
            wheel.position.set(...pos);
            wheel.rotation.z = Math.PI/2;
            wheel.castShadow = true;
            wheel.receiveShadow = true;
            carGroup.add(wheel);
        });
        
        // Headlights (larger)
        const headlightGeometry = new THREE.SphereGeometry(0.3, 8, 8);
        const headlightMaterial = new THREE.MeshLambertMaterial({ color: 0xFFFFAA });
        
        const leftHeadlight = new THREE.Mesh(headlightGeometry, headlightMaterial);
        leftHeadlight.position.set(-2, 1.2, -1.2);
        carGroup.add(leftHeadlight);
        
        const rightHeadlight = new THREE.Mesh(headlightGeometry, headlightMaterial);
        rightHeadlight.position.set(2, 1.2, -1.2);
        carGroup.add(rightHeadlight);
        
        return carGroup;
    }

    // Create car with external model
    async createCar(x, z, color, rotation = 0, modelUrl = null) {
        let carModel;
        
        if (modelUrl && this.loader) {
            console.log('🔄 Attempting to load GLB model:', modelUrl);
            carModel = await this.loadCarModel(modelUrl);
        } else {
            console.log('🔄 Using fallback car (no model URL or loader)');
            carModel = this.createFallbackCar();
        }
        
        // Apply color to the model
        carModel.traverse((child) => {
            if (child.isMesh && child.material && child.material.color) {
                // Apply different colors to different parts
                if (child.geometry.type === 'BoxGeometry' && child.position.y > 1) {
                    // Roof - darker color
                    child.material.color.setHex(0x222222);
                } else if (child.geometry.type === 'BoxGeometry') {
                    // Body - main color
                    child.material.color.setHex(color);
                } else if (child.geometry.type === 'CylinderGeometry') {
                    // Wheels - keep black
                    child.material.color.setHex(0x000000);
                } else if (child.geometry.type === 'SphereGeometry') {
                    // Headlights - keep yellow
                    child.material.color.setHex(0xFFFFAA);
                }
            }
        });
        
        carModel.position.set(x, 0.1, z); // Slightly above ground to sit on road
        
        // Reset rotation first, then apply desired rotation
        carModel.rotation.set(0, 0, 0);
        carModel.rotation.y = rotation + Math.PI / 2; // Add base rotation to face east
        
        // Log the final orientation for debugging
        const direction = rotation === 0 ? 'EAST' : 
                         rotation === Math.PI/2 ? 'NORTH' : 
                         rotation === Math.PI ? 'WEST' : 
                         rotation === -Math.PI/2 ? 'SOUTH' : 'UNKNOWN';
        const finalRotation = rotation + Math.PI / 2;
        console.log(`🎯 Car positioned at (${x}, ${z}) with rotation ${rotation.toFixed(2)} (${direction})`);
        console.log(`🔄 Final car rotation: X=${carModel.rotation.x.toFixed(2)}, Y=${carModel.rotation.y.toFixed(2)} (${finalRotation.toFixed(2)}), Z=${carModel.rotation.z.toFixed(2)}`);
        console.log(`🛣️ Car should be facing: ${direction} based on road direction`);
        
        return carModel;
    }

    // Create vehicle fleet with external models
    async createVehicleFleet() {
        this.init();
        const vehicles = [];
        
        // Your GLB car models - using the actual filenames
        const carModels = [
            'models/car1.glb',
            'models/car2.glb' // Using same model for now, you can add the second model filename
        ];
        
        // Evenly distribute three paint colors across all cars: orange, blue, dull red
        const colorPalette = [0xFFA500, 0x0000FF, 0x8B0000];

        // Car placement and orientation (no fixed color per spot)
        const carSpots = [
            // Main Street (horizontal) - cars on left side, facing east
            { x: -10, z: -1.2, rotation: 0 },
            { x: 10, z: -1.2, rotation: 0 },

            // Residential streets (horizontal) - cars on left side, facing east
            { x: -15, z: 18.5, rotation: 0 },
            { x: 15, z: 18.5, rotation: 0 },
            { x: -15, z: -18.5, rotation: 0 },
            { x: 15, z: -18.5, rotation: 0 },

            // Vertical roads - cars on left side, facing north
            { x: -1.2, z: 17, rotation: Math.PI/2 },
            { x: 1.2, z: 17, rotation: Math.PI/2 },
            { x: -1.2, z: -12, rotation: Math.PI/2 }
        ];
        
        console.log('🚗 Loading vehicle fleet with external models...');
        console.log('📁 Available car models:', carModels);
        console.log('🛣️ Road Layout Info:');
        console.log('  - Main Street (horizontal): y=0, width=6, lanes at z=-3 to z=+3');
        console.log('  - Central Avenue (vertical): x=0, width=6, lanes at x=-3 to x=+3');
        console.log('  - Residential streets: y=±20, width=6, lanes at z=-3 to z=+3');
        console.log('  - All cars should be on LEFT side of their respective roads');
        
        for (let i = 0; i < carSpots.length; i++) {
            const spot = carSpots[i];
            const color = colorPalette[i % colorPalette.length];
            const modelUrl = carModels[i % carModels.length]; // Cycle through available models
            
            console.log(`🔄 Creating car ${i + 1}/${carSpots.length} with model: ${modelUrl}`);
            console.log(`📍 Car ${i + 1} config: x=${spot.x}, z=${spot.z}, rotation=${spot.rotation.toFixed(2)}, color=#${color.toString(16).padStart(6, '0')}`);
            
            // Determine which road this car is on
            let roadInfo = '';
            if (Math.abs(spot.z) < 3) {
                roadInfo = `Main Street (horizontal, y=0) - LEFT lane should be z=-1.5 to z=-3`;
            } else if (Math.abs(spot.x) < 3) {
                roadInfo = `Central Avenue (vertical, x=0) - LEFT lane should be x=-1.5 to x=-3`;
            } else if (Math.abs(spot.z - 20) < 3) {
                roadInfo = `Residential Street (horizontal, y=20) - LEFT lane should be z=18.5 to z=17`;
            } else if (Math.abs(spot.z + 20) < 3) {
                roadInfo = `Residential Street (horizontal, y=-20) - LEFT lane should be z=-18.5 to z=-17`;
            } else {
                roadInfo = `Unknown road location - z=${spot.z}, x=${spot.x}`;
            }
            console.log(`🛣️ Car ${i + 1} is on: ${roadInfo}`);
            
            try {
                const car = await this.createCar(
                    spot.x, 
                    spot.z, 
                    color, 
                    spot.rotation, 
                    modelUrl
                );
                vehicles.push(car);
                console.log(`✅ Car ${i + 1}/${carSpots.length} created successfully at (${spot.x}, ${spot.z})`);
            } catch (error) {
                console.error('❌ Error creating car:', error);
                // Create fallback car
                console.log('🔄 Creating fallback car...');
                const fallbackCar = await this.createCar(spot.x, spot.z, color, spot.rotation);
                vehicles.push(fallbackCar);
                console.log(`✅ Fallback car ${i + 1} created at (${spot.x}, ${spot.z})`);
            }
        }
        
        console.log(`🎉 Vehicle fleet created with ${vehicles.length} cars`);
        return vehicles;
    }
}
