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
    
    return characterGroup;
}

// Character movement controller
export class CharacterController {
    constructor(character, characterBody) {
        this.character = character;
        this.characterBody = characterBody;
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
            // Physics-driven movement: set body velocity, sync mesh from body
            const desiredVelocity = { x: 0, z: 0 };
            const speed = CONFIG.CHARACTER.MOVE_SPEED * 30; // faster traversal
            if (this.keys.w) desiredVelocity.z -= speed;
            if (this.keys.s) desiredVelocity.z += speed;
            if (this.keys.a) desiredVelocity.x -= speed;
            if (this.keys.d) desiredVelocity.x += speed;

            this.characterBody.velocity.x = desiredVelocity.x;
            this.characterBody.velocity.z = desiredVelocity.z;

            // Rotate character to face movement direction
            if (desiredVelocity.x !== 0 || desiredVelocity.z !== 0) {
                const targetRotation = Math.atan2(desiredVelocity.x, desiredVelocity.z);
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
            // Fallback movement without physics
            const moveVector = new THREE.Vector3();
            
            if (this.keys.w) moveVector.z -= CONFIG.CHARACTER.MOVE_SPEED;
            if (this.keys.s) moveVector.z += CONFIG.CHARACTER.MOVE_SPEED;
            if (this.keys.a) moveVector.x -= CONFIG.CHARACTER.MOVE_SPEED;
            if (this.keys.d) moveVector.x += CONFIG.CHARACTER.MOVE_SPEED;
            
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
