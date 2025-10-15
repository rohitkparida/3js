/**
 * Safe Object Pool for Three.js objects
 * Provides memory-efficient reuse of frequently created/destroyed objects
 */
export class ObjectPool {
    constructor(objectType, factoryFunction, options = {}) {
        this.objectType = objectType;
        this.factoryFunction = factoryFunction;
        this.options = {
            initialSize: 10,
            maxSize: 100,
            enablePooling: true,
            fallbackToDirectCreation: true,
            ...options
        };

        this.pool = [];
        this.active = new Set();
        this.createdCount = 0;
        this.reusedCount = 0;
        this.errors = [];

        // Initialize pool if enabled
        if (this.options.enablePooling) {
            this.initializePool();
        }
    }

    /**
     * Initialize the object pool with initial objects
     */
    initializePool() {
        try {
            for (let i = 0; i < this.options.initialSize; i++) {
                const obj = this.createNewObject();
                if (obj) {
                    this.pool.push(obj);
                }
            }
            console.log(`🔄 ObjectPool '${this.objectType}' initialized with ${this.pool.length} objects`);
        } catch (error) {
            console.warn(`⚠️ Failed to initialize ObjectPool '${this.objectType}':`, error);
            this.logError(error);
            this.options.enablePooling = false;
        }
    }

    /**
     * Create a new object using the factory function
     */
    createNewObject() {
        try {
            const obj = this.factoryFunction();
            if (obj) {
                obj._poolType = this.objectType;
                obj._isPooled = true;
                this.createdCount++;
            }
            return obj;
        } catch (error) {
            console.error(`❌ Failed to create ${this.objectType}:`, error);
            this.logError(error);
            return null;
        }
    }

    /**
     * Get an object from the pool or create a new one
     */
    get(...args) {
        // Fallback to direct creation if pooling is disabled
        if (!this.options.enablePooling || !this.options.fallbackToDirectCreation) {
            return this.createNewObject(...args);
        }

        try {
            // Try to get from pool first
            if (this.pool.length > 0) {
                const obj = this.pool.pop();
                this.active.add(obj);
                this.reusedCount++;

                // Reset object state if it has a reset method
                if (obj && typeof obj.reset === 'function') {
                    obj.reset(...args);
                }

                return obj;
            }

            // Pool empty, create new object
            if (this.pool.length + this.active.size < this.options.maxSize) {
                const obj = this.createNewObject(...args);
                if (obj) {
                    this.active.add(obj);
                }
                return obj;
            }

            // Pool at max capacity, still create new (will be cleaned up later)
            console.warn(`⚠️ ObjectPool '${this.objectType}' at max capacity (${this.options.maxSize}), creating additional object`);
            const obj = this.createNewObject(...args);
            if (obj) {
                this.active.add(obj);
            }
            return obj;

        } catch (error) {
            console.error(`❌ ObjectPool '${this.objectType}' get() failed:`, error);
            this.logError(error);

            // Fallback to direct creation
            if (this.options.fallbackToDirectCreation) {
                return this.createNewObject(...args);
            }

            return null;
        }
    }

    /**
     * Return an object to the pool for reuse
     */
    release(obj) {
        if (!obj || !this.options.enablePooling) {
            // If pooling disabled, just dispose normally
            this.disposeObject(obj);
            return;
        }

        try {
            // Remove from active set
            if (this.active.has(obj)) {
                this.active.delete(obj);

                // Reset object position and state
                if (obj.position) {
                    obj.position.set(0, 0, 0);
                }
                if (obj.rotation) {
                    obj.rotation.set(0, 0, 0);
                }
                if (obj.scale) {
                    obj.scale.set(1, 1, 1);
                }

                // Clear user data but preserve pool metadata
                if (obj.userData) {
                    const poolData = obj.userData._poolData || {};
                    obj.userData = { _poolData: poolData };
                }

                // Remove from parent if attached to scene
                if (obj.parent) {
                    obj.parent.remove(obj);
                }

                // Return to pool if not at max capacity
                if (this.pool.length < this.options.maxSize) {
                    this.pool.push(obj);
                } else {
                    // Pool full, dispose the object
                    this.disposeObject(obj);
                }
            } else {
                // Object not in active set, dispose it
                this.disposeObject(obj);
            }

        } catch (error) {
            console.error(`❌ ObjectPool '${this.objectType}' release() failed:`, error);
            this.logError(error);
            this.disposeObject(obj);
        }
    }

    /**
     * Dispose of an object completely
     */
    disposeObject(obj) {
        if (!obj) return;

        try {
            // Remove from scene if attached
            if (obj.parent) {
                obj.parent.remove(obj);
            }

            // Dispose Three.js resources
            if (obj.geometry) {
                obj.geometry.dispose();
            }
            if (obj.material) {
                if (Array.isArray(obj.material)) {
                    obj.material.forEach(mat => mat.dispose && mat.dispose());
                } else {
                    obj.material.dispose && obj.material.dispose();
                }
            }

            // Dispose physics body if exists
            if (obj.userData && obj.userData.physicsBody) {
                if (typeof window !== 'undefined' && window.CANNON) {
                    try {
                        // Remove from physics world if available
                        if (window.physicsWorld && obj.userData.physicsBody) {
                            window.physicsWorld.removeBody(obj.userData.physicsBody);
                        }
                        obj.userData.physicsBody = null;
                    } catch (e) {
                        // Ignore physics cleanup errors
                    }
                }
            }

            // Clear references
            obj.userData = {};
            obj.children.length = 0;

        } catch (error) {
            console.error(`❌ Failed to dispose ${this.objectType}:`, error);
            this.logError(error);
        }
    }

    /**
     * Log an error for debugging
     */
    logError(error) {
        this.errors.push({
            message: error.message,
            stack: error.stack,
            timestamp: Date.now()
        });

        // Keep only last 10 errors
        if (this.errors.length > 10) {
            this.errors.shift();
        }
    }

    /**
     * Get pool statistics
     */
    getStats() {
        return {
            objectType: this.objectType,
            poolSize: this.pool.length,
            activeCount: this.active.size,
            totalCreated: this.createdCount,
            totalReused: this.reusedCount,
            reuseRate: this.createdCount > 0 ? (this.reusedCount / (this.createdCount + this.reusedCount) * 100).toFixed(1) + '%' : '0%',
            errorCount: this.errors.length,
            enabled: this.options.enablePooling
        };
    }

    /**
     * Clean up all pooled objects
     */
    dispose() {
        try {
            // Dispose all pooled objects
            this.pool.forEach(obj => this.disposeObject(obj));
            this.pool = [];

            // Dispose all active objects
            this.active.forEach(obj => this.disposeObject(obj));
            this.active.clear();

            console.log(`🗑️ ObjectPool '${this.objectType}' disposed`);
        } catch (error) {
            console.error(`❌ ObjectPool '${this.objectType}' dispose() failed:`, error);
        }
    }
}
