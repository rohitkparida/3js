import { CONFIG } from './config.js';

// Create character
export function createCharacter() {
    const characterGroup = new THREE.Group();
    
    // Body (cylinder) - 50% smaller
    const bodyGeometry = new THREE.CylinderGeometry(0.25, 0.25, 0.75, 8);
    const characterMaterial = new THREE.MeshLambertMaterial({
        color: 0xff6b6b
    });
    const body = new THREE.Mesh(bodyGeometry, characterMaterial);
    
    // Head (sphere) - 50% smaller
    const headGeometry = new THREE.SphereGeometry(0.2, 8, 6);
    const head = new THREE.Mesh(headGeometry, characterMaterial);
    head.position.y = 0.6;
    
    // Legs (two cylinders) - 50% smaller
    const legGeometry = new THREE.CylinderGeometry(0.075, 0.075, 0.4, 6);
    const leftLeg = new THREE.Mesh(legGeometry, characterMaterial);
    const rightLeg = new THREE.Mesh(legGeometry, characterMaterial);
    leftLeg.position.set(-0.1, -0.55, 0);
    rightLeg.position.set(0.1, -0.55, 0);
    
    // Add parts to group
    characterGroup.add(body);
    characterGroup.add(head);
    characterGroup.add(leftLeg);
    characterGroup.add(rightLeg);
    
    characterGroup.position.set(0, 5, 0);
    
    // Enable shadows for all character parts
    characterGroup.traverse((child) => {
        if (child.isMesh) {
            child.castShadow = true;
            child.receiveShadow = true;
        }
    });
    
    // Try to load external mascot model asynchronously (fallback is the primitive above)
    try {
        const hasOBJ = typeof THREE !== 'undefined' && THREE.OBJLoader;
        if (hasOBJ) {
            const loader = new THREE.OBJLoader();
            loader.load(
                'models/mascot.obj',
                (obj) => {
                    // Prepare mascot: scale to a reasonable height and center on ground
                    const box = new THREE.Box3().setFromObject(obj);
                    const size = box.getSize(new THREE.Vector3());
                    const maxDim = Math.max(size.x, size.y, size.z) || 1;
                    const desiredHeight = 1.2; // roughly match old character height
                    const scale = desiredHeight / maxDim;
                    obj.scale.setScalar(scale);

                    // Recompute box after scale to center vertically on ground
                    const box2 = new THREE.Box3().setFromObject(obj);
                    const center = box2.getCenter(new THREE.Vector3());
                    const min = box2.min;
                    obj.position.sub(center); // center at origin
                    obj.position.y -= min.y * scale; // lift so feet touch ground

                    // Try to load and apply mascot texture (PNG)
                    const textureLoader = new THREE.TextureLoader();
                    textureLoader.load(
                        'models/mascot.png',
                        (tex) => {
                            if (THREE.sRGBEncoding) tex.encoding = THREE.sRGBEncoding;
                            obj.traverse((child) => {
                                if (child.isMesh) {
                                    child.castShadow = true;
                                    child.receiveShadow = true;
                                    const mat = new THREE.MeshStandardMaterial({
                                        map: tex,
                                        roughness: 0.8,
                                        metalness: 0.0
                                    });
                                    mat.side = THREE.FrontSide;
                                    child.material = mat;
                                }
                            });
                            console.log('🖼️ Mascot texture applied');
                        },
                        undefined,
                        () => {
                            // If texture fails, still ensure shadows/material sanity
                            obj.traverse((child) => {
                                if (child.isMesh) {
                                    child.castShadow = true;
                                    child.receiveShadow = true;
                                    if (child.material) child.material.side = THREE.FrontSide;
                                }
                            });
                            console.warn('Mascot texture not found; using default material');
                        }
                    );

                    // Hide primitive fallback and add mascot
                    body.visible = false;
                    head.visible = false;
                    leftLeg.visible = false;
                    rightLeg.visible = false;
                    characterGroup.add(obj);
                    console.log('🦊 Mascot model loaded and applied');
                },
                undefined,
                (err) => {
                    console.warn('Mascot OBJ load failed; using fallback character', err);
                }
            );
        } else {
            console.warn('OBJLoader not available; using fallback character');
        }
    } catch (e) {
        console.warn('Mascot setup error; using fallback character', e);
    }

    return characterGroup;
}

// Character movement controller
export class CharacterController {
    constructor(character, characterBody, camera = null) {
        this.character = character;
        this.characterBody = characterBody;
        this.camera = camera; // Add camera reference for relative movement
        this.keys = {
            w: false,
            a: false,
            s: false,
            d: false,
            space: false
        };

        this.setupEventListeners();
    }

    setupEventListeners() {
        document.addEventListener('keydown', (event) => {
            switch(event.key.toLowerCase()) {
                case 'w':
                    this.keys.w = true;
                    break;
                case 'a':
                    this.keys.a = true;
                    break;
                case 's':
                    this.keys.s = true;
                    break;
                case 'd':
                    this.keys.d = true;
                    break;
                case ' ':
                    event.preventDefault();
                    this.keys.space = true;
                    break;
            }
        });

        document.addEventListener('keyup', (event) => {
            switch(event.key.toLowerCase()) {
                case 'w':
                    this.keys.w = false;
                    break;
                case 'a':
                    this.keys.a = false;
                    break;
                case 's':
                    this.keys.s = false;
                    break;
                case 'd':
                    this.keys.d = false;
                    break;
                case ' ':
                    this.keys.space = false;
                    break;
            }
        });
    }

    update() {
        if (typeof CANNON !== 'undefined' && this.characterBody) {
            // Physics-driven movement with camera-relative controls
            const moveVector = new THREE.Vector3();

            // Get camera rotation for relative movement
            if (this.camera) {
                // Extract camera's Y rotation (horizontal rotation) for movement direction
                // Add π to flip the direction so W moves forward as expected
                const cameraRotationY = this.camera.rotation.y + Math.PI;

                // Create movement vector relative to camera direction
                if (this.keys.w) {
                    // Forward relative to camera - W should move FORWARD
                    moveVector.x += Math.sin(cameraRotationY) * CONFIG.CHARACTER.MOVE_SPEED * 20;
                    moveVector.z += Math.cos(cameraRotationY) * CONFIG.CHARACTER.MOVE_SPEED * 20;
                }
                if (this.keys.s) {
                    // Backward relative to camera - S should move BACKWARD
                    moveVector.x -= Math.sin(cameraRotationY) * CONFIG.CHARACTER.MOVE_SPEED * 20;
                    moveVector.z -= Math.cos(cameraRotationY) * CONFIG.CHARACTER.MOVE_SPEED * 20;
                }
                if (this.keys.a) {
                    // Left relative to camera - use the original rotation for strafing
                    const originalRotationY = this.camera.rotation.y;
                    moveVector.x += Math.sin(originalRotationY - Math.PI / 2) * CONFIG.CHARACTER.MOVE_SPEED * 20;
                    moveVector.z += Math.cos(originalRotationY - Math.PI / 2) * CONFIG.CHARACTER.MOVE_SPEED * 20;
                }
                if (this.keys.d) {
                    // Right relative to camera - use the original rotation for strafing
                    const originalRotationY = this.camera.rotation.y;
                    moveVector.x += Math.sin(originalRotationY + Math.PI / 2) * CONFIG.CHARACTER.MOVE_SPEED * 20;
                    moveVector.z += Math.cos(originalRotationY + Math.PI / 2) * CONFIG.CHARACTER.MOVE_SPEED * 20;
                }
            } else {
                // Fallback to world-relative movement if no camera
                if (this.keys.w) moveVector.z -= CONFIG.CHARACTER.MOVE_SPEED * 20;
                if (this.keys.s) moveVector.z += CONFIG.CHARACTER.MOVE_SPEED * 20;
                if (this.keys.a) moveVector.x -= CONFIG.CHARACTER.MOVE_SPEED * 20;
                if (this.keys.d) moveVector.x += CONFIG.CHARACTER.MOVE_SPEED * 20;
            }

            // Apply movement to physics body
            this.characterBody.velocity.x = moveVector.x;
            this.characterBody.velocity.z = moveVector.z;

            // Rotate character to face movement direction
            if (moveVector.length() > 0) {
                const targetRotation = Math.atan2(moveVector.x, moveVector.z);
                this.character.rotation.y = targetRotation;
            }

            // Jumping: apply upward velocity if near ground
            if (this.keys.space) {
                const onGround = this.characterBody.position.y <= (CONFIG.CHARACTER.GROUND_LEVEL + 0.05);
                if (onGround) {
                    this.characterBody.velocity.y = CONFIG.CHARACTER.JUMP_FORCE * 8;
                }
            }

            // Sync mesh to physics body and clamp to ground
            const radius = 0.4; // physics sphere radius
            const minY = CONFIG.CHARACTER.GROUND_LEVEL;
            if (this.characterBody.position.y < minY) {
                this.characterBody.position.y = minY;
                this.characterBody.velocity.y = Math.max(this.characterBody.velocity.y, 0);
            }
            this.character.position.set(
                this.characterBody.position.x,
                this.characterBody.position.y,
                this.characterBody.position.z
            );


        } else {
            // Fallback movement without physics (camera-relative)
            const moveVector = new THREE.Vector3();

            if (this.camera) {
                // Camera-relative movement for non-physics fallback
                // Add π to flip the direction so W moves forward as expected
                const cameraRotationY = this.camera.rotation.y + Math.PI;

                if (this.keys.w) {
                    moveVector.x += Math.sin(cameraRotationY) * CONFIG.CHARACTER.MOVE_SPEED;
                    moveVector.z += Math.cos(cameraRotationY) * CONFIG.CHARACTER.MOVE_SPEED;
                }
                if (this.keys.s) {
                    moveVector.x -= Math.sin(cameraRotationY) * CONFIG.CHARACTER.MOVE_SPEED;
                    moveVector.z -= Math.cos(cameraRotationY) * CONFIG.CHARACTER.MOVE_SPEED;
                }
                if (this.keys.a) {
                    // Left relative to camera - use the original rotation for strafing
                    const originalRotationY = this.camera.rotation.y;
                    moveVector.x += Math.sin(originalRotationY - Math.PI / 2) * CONFIG.CHARACTER.MOVE_SPEED;
                    moveVector.z += Math.cos(originalRotationY - Math.PI / 2) * CONFIG.CHARACTER.MOVE_SPEED;
                }
                if (this.keys.d) {
                    // Right relative to camera - use the original rotation for strafing
                    const originalRotationY = this.camera.rotation.y;
                    moveVector.x += Math.sin(originalRotationY + Math.PI / 2) * CONFIG.CHARACTER.MOVE_SPEED;
                    moveVector.z += Math.cos(originalRotationY + Math.PI / 2) * CONFIG.CHARACTER.MOVE_SPEED;
                }
            } else {
                // World-relative fallback
                if (this.keys.w) moveVector.z -= CONFIG.CHARACTER.MOVE_SPEED;
                if (this.keys.s) moveVector.z += CONFIG.CHARACTER.MOVE_SPEED;
                if (this.keys.a) moveVector.x -= CONFIG.CHARACTER.MOVE_SPEED;
                if (this.keys.d) moveVector.x += CONFIG.CHARACTER.MOVE_SPEED;
            }

            if (moveVector.length() > 0) {
                this.character.position.add(moveVector);
                const targetRotation = Math.atan2(moveVector.x, moveVector.z);
                this.character.rotation.y = targetRotation;
            }

            // Simple jumping
            if (this.keys.space && this.character.position.y < CONFIG.CHARACTER.JUMP_THRESHOLD) {
                this.character.position.y += CONFIG.CHARACTER.JUMP_FORCE;
            }

            // Simple gravity
            if (this.character.position.y > CONFIG.CHARACTER.GROUND_LEVEL) {
                this.character.position.y -= CONFIG.CHARACTER.GRAVITY;
            }
        }
    }
}
