import { CONFIG } from './config.js';

// Camera controller with mouse tilt controls
export class CameraController {
    constructor(camera, character, domElement) {
        this.camera = camera;
        this.character = character;
        this.domElement = domElement || document.body;

        // Mouse control variables
        this.isMouseDown = false;
        this.mouseX = 0;
        this.mouseY = 0;
        this.lastMouseX = 0;
        this.lastMouseY = 0;

        // Camera rotation variables
        this.cameraRotationX = 0; // Rotation around X axis (vertical tilt)
        this.cameraRotationY = 0; // Rotation around Y axis (horizontal rotation)

        // Rotation constraints (in radians)
        this.minRotationX = -Math.PI / 3; // -60 degrees
        this.maxRotationX = Math.PI / 3;  // +60 degrees

        // Mouse sensitivity
        this.mouseSensitivity = 0.002;

        // Setup mouse event listeners
        this.setupMouseControls();
    }

    setupMouseControls() {
        // Mouse down event
        this.domElement.addEventListener('mousedown', (event) => {
            this.isMouseDown = true;
            this.lastMouseX = event.clientX;
            this.lastMouseY = event.clientY;
            this.domElement.style.cursor = 'grabbing';
        });

        // Mouse move event
        this.domElement.addEventListener('mousemove', (event) => {
            if (!this.isMouseDown) return;

            this.mouseX = event.clientX;
            this.mouseY = event.clientY;

            // Calculate mouse movement delta
            const deltaX = this.mouseX - this.lastMouseX;
            const deltaY = this.mouseY - this.lastMouseY;

            // Update camera rotation based on mouse movement
            this.cameraRotationY -= deltaX * this.mouseSensitivity; // Horizontal rotation
            this.cameraRotationX -= deltaY * this.mouseSensitivity; // Vertical tilt

            // Apply rotation constraints
            this.cameraRotationX = Math.max(this.minRotationX, Math.min(this.maxRotationX, this.cameraRotationX));

            // Update last mouse position
            this.lastMouseX = this.mouseX;
            this.lastMouseY = this.mouseY;
        });

        // Mouse up event
        document.addEventListener('mouseup', () => {
            this.isMouseDown = false;
            this.domElement.style.cursor = 'grab';
        });

        // Prevent context menu on right click
        this.domElement.addEventListener('contextmenu', (event) => {
            event.preventDefault();
        });

        // Set initial cursor style
        this.domElement.style.cursor = 'grab';
    }

    update() {
        // Calculate ideal camera position relative to character
        const baseOffset = new THREE.Vector3(0, 6, 12);
        const idealCameraPosition = this.character.position.clone().add(baseOffset);

        // Apply camera rotation to the offset
        const rotatedOffset = baseOffset.clone();
        rotatedOffset.applyAxisAngle(new THREE.Vector3(0, 1, 0), this.cameraRotationY); // Y-axis rotation
        rotatedOffset.applyAxisAngle(new THREE.Vector3(1, 0, 0), this.cameraRotationX); // X-axis rotation

        // Set final camera position
        this.camera.position.copy(this.character.position).add(rotatedOffset);

        // Calculate look-at target (character position with slight height offset)
        const lookAtTarget = new THREE.Vector3(
            this.character.position.x,
            this.character.position.y + 1,
            this.character.position.z
        );

        // Apply the same rotations to the look-at direction
        const lookAtOffset = new THREE.Vector3(0, 1, 0);
        lookAtOffset.applyAxisAngle(new THREE.Vector3(0, 1, 0), this.cameraRotationY);
        lookAtOffset.applyAxisAngle(new THREE.Vector3(1, 0, 0), this.cameraRotationX);
        lookAtTarget.add(lookAtOffset);

        // Make camera look at the target
        this.camera.lookAt(lookAtTarget);

        // Optional: Add some smoothing to the camera movement
        if (this.lastCameraPosition) {
            this.camera.position.lerp(this.lastCameraPosition, 0.1);
        }
        this.lastCameraPosition = this.camera.position.clone();
    }

    handleResize() {
        this.camera.aspect = window.innerWidth / window.innerHeight;
        this.camera.updateProjectionMatrix();
    }

    // Method to reset camera rotation to default
    resetRotation() {
        this.cameraRotationX = 0;
        this.cameraRotationY = 0;
    }

    // Method to set mouse sensitivity
    setSensitivity(sensitivity) {
        this.mouseSensitivity = sensitivity;
    }
}
