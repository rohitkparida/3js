// Invisible boundary walls to prevent character from falling off the map

export function createBoundaryWalls(scene, world, mapSize = 140) {
    console.log('🏗️ Creating invisible boundary walls...');
    
    const walls = [];
    const wallHeight = 20;
    const wallThickness = 1;
    const halfSize = mapSize / 2;
    
    console.log(`📍 Map size: ${mapSize}x${mapSize} units`);
    console.log(`📍 Wall positions: ±${halfSize} units from center`);
    console.log(`📍 Roads extend to ±60, walls at ±70 for buffer`);
    
    // Create 4 walls around the perimeter
    const wallConfigs = [
        // North wall
        { x: 0, z: halfSize + wallThickness/2, width: mapSize + 2*wallThickness, height: wallHeight, depth: wallThickness },
        // South wall  
        { x: 0, z: -halfSize - wallThickness/2, width: mapSize + 2*wallThickness, height: wallHeight, depth: wallThickness },
        // East wall
        { x: halfSize + wallThickness/2, z: 0, width: wallThickness, height: wallHeight, depth: mapSize },
        // West wall
        { x: -halfSize - wallThickness/2, z: 0, width: wallThickness, height: wallHeight, depth: mapSize }
    ];
    
    wallConfigs.forEach((config, index) => {
        // Create invisible visual wall (for debugging - can be removed later)
        const wallGeometry = new THREE.BoxGeometry(config.width, config.height, config.depth);
        const wallMaterial = new THREE.MeshBasicMaterial({ 
            color: 0x000000,
            transparent: true, 
            opacity: 0.01,
            visible: false // Invisible but physics still active
        });
        const wall = new THREE.Mesh(wallGeometry, wallMaterial);
        wall.position.set(config.x, config.height/2, config.z);
        wall.name = `boundary_wall_${index}`;
        scene.add(wall);
        walls.push(wall);
        
        // Create physics body for collision
        if (typeof CANNON !== 'undefined' && world) {
            const wallShape = new CANNON.Box(new CANNON.Vec3(
                config.width/2, 
                config.height/2, 
                config.depth/2
            ));
            const wallBody = new CANNON.Body({ 
                mass: 0, // Static body
                type: CANNON.Body.STATIC 
            });
            wallBody.addShape(wallShape);
            wallBody.position.set(config.x, config.height/2, config.z);
            world.addBody(wallBody);
            
            // Store reference for cleanup
            wall.userData = { physicsBody: wallBody };
        }
        
        console.log(`✅ Boundary wall ${index + 1} created at (${config.x}, ${config.z})`);
    });
    
    console.log(`🏗️ Created ${walls.length} invisible boundary walls around map perimeter`);
    return walls;
}

// Remove boundary walls (for cleanup)
export function removeBoundaryWalls(scene, world, walls) {
    console.log('🗑️ Removing boundary walls...');
    
    walls.forEach(wall => {
        // Remove from scene
        scene.remove(wall);
        
        // Remove physics body
        if (wall.userData && wall.userData.physicsBody && world) {
            world.remove(wall.userData.physicsBody);
        }
    });
    
    console.log('✅ Boundary walls removed');
}
