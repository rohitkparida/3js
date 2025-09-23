// Create car
export function createCar(x, z, color, rotation = 0) {
    const carGroup = new THREE.Group();
    
    // Car body
    const carGeometry = new THREE.BoxGeometry(3, 1.5, 1.5);
    const carMaterial = new THREE.MeshLambertMaterial({ color: color });
    const car = new THREE.Mesh(carGeometry, carMaterial);
    car.position.set(0, 0.75, 0);
    car.castShadow = true;
    car.receiveShadow = true;
    carGroup.add(car);
    
    // Wheels
    const wheelGeometry = new THREE.CylinderGeometry(0.3, 0.3, 0.2, 8);
    const wheelMaterial = new THREE.MeshLambertMaterial({ color: 0x333333 });
    
    const wheel1 = new THREE.Mesh(wheelGeometry, wheelMaterial);
    wheel1.position.set(-1, 0.3, -0.6);
    wheel1.rotation.z = Math.PI/2;
    carGroup.add(wheel1);
    
    const wheel2 = new THREE.Mesh(wheelGeometry, wheelMaterial);
    wheel2.position.set(1, 0.3, -0.6);
    wheel2.rotation.z = Math.PI/2;
    carGroup.add(wheel2);
    
    const wheel3 = new THREE.Mesh(wheelGeometry, wheelMaterial);
    wheel3.position.set(-1, 0.3, 0.6);
    wheel3.rotation.z = Math.PI/2;
    carGroup.add(wheel3);
    
    const wheel4 = new THREE.Mesh(wheelGeometry, wheelMaterial);
    wheel4.position.set(1, 0.3, 0.6);
    wheel4.rotation.z = Math.PI/2;
    carGroup.add(wheel4);
    
    carGroup.position.set(x, 0, z);
    carGroup.rotation.y = rotation;
    
    return carGroup;
}

// Create vehicle fleet
export function createVehicleFleet() {
    const vehicles = [];
    
    // Cars on Main Street
    vehicles.push(createCar(-15, 0, 0xFFD700, 0));
    vehicles.push(createCar(15, 0, 0x0000FF, 0));
    
    // Cars on residential streets
    vehicles.push(createCar(-20, 20, 0x32CD32, 0));
    vehicles.push(createCar(20, 20, 0xFF69B4, 0));
    vehicles.push(createCar(-20, -20, 0xFF4500, 0));
    vehicles.push(createCar(20, -20, 0x9370DB, 0));
    
    // Cars in parking lots
    vehicles.push(createCar(5, 15, 0x8B4513, 0)); // Shopping center parking
    vehicles.push(createCar(-5, 15, 0xDC143C, 0)); // Restaurant parking
    vehicles.push(createCar(0, -10, 0x4169E1, 0)); // Gas station
    
    return vehicles;
}
