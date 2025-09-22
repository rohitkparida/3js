import { CONFIG } from './config.js';

// Camera controller
export class CameraController {
    constructor(camera, character) {
        this.camera = camera;
        this.character = character;
    }
    
    update() {
        // Camera follows character
        const idealCameraPosition = new THREE.Vector3(
            this.character.position.x,
            this.character.position.y + 6,
            this.character.position.z + 12
        );
        
        // Smooth camera following
        this.camera.position.lerp(idealCameraPosition, 0.1);
        
        // Look at character
        const lookAtTarget = new THREE.Vector3(
            this.character.position.x,
            this.character.position.y + 1,
            this.character.position.z
        );
        this.camera.lookAt(lookAtTarget);
    }
    
    handleResize() {
        this.camera.aspect = window.innerWidth / window.innerHeight;
        this.camera.updateProjectionMatrix();
    }
}
