/**
 * Texture optimization utilities
 * Provides safe texture loading and optimization with error handling
 */

export const TextureUtils = {
    renderer: null,
    
    /**
     * Initialize the texture utils with the renderer
     * @param {THREE.WebGLRenderer} renderer - The renderer instance
     */
    init(renderer) {
        if (!renderer) {
            console.warn('TextureUtils: Renderer not provided, some features may be limited');
        }
        this.renderer = renderer;
        console.log('TextureUtils initialized');
    },
    
    /**
     * Optimize a texture with safe defaults
     * @param {THREE.Texture} texture - The texture to optimize
     * @param {Object} options - Optimization options
     * @param {boolean} options.generateMipmaps - Whether to generate mipmaps
     * @param {number} options.anisotropy - Anisotropy level
     * @returns {THREE.Texture} The optimized texture
     */
    optimize(texture, options = {}) {
        if (!texture || !texture.isTexture) {
            console.warn('TextureUtils: Invalid texture provided to optimize()');
            return texture;
        }

        // Default options
        const {
            generateMipmaps = true,
            anisotropy = null
        } = options;

        try {
            // Basic optimization
            if (texture.encoding === undefined) {
                texture.encoding = THREE.sRGBEncoding;
            }
            
            // Mipmapping
            if (texture.generateMipmaps !== generateMipmaps) {
                texture.generateMipmaps = generateMipmaps;
                texture.minFilter = generateMipmaps ? THREE.LinearMipMapLinearFilter : THREE.LinearFilter;
                texture.magFilter = THREE.LinearFilter;
            }

            // Anisotropy
            if (this.renderer && anisotropy !== null) {
                const maxAnisotropy = this.renderer.capabilities.getMaxAnisotropy();
                texture.anisotropy = Math.min(anisotropy, maxAnisotropy);
            }

            texture.needsUpdate = true;
            return texture;
        } catch (error) {
            console.error('Error optimizing texture:', error);
            return texture; // Return original texture if optimization fails
        }
    },

    /**
     * Safely load and optimize a texture
     * @param {string} url - Path to the texture
     * @param {Object} options - Texture options
     * @returns {Promise<THREE.Texture>} A promise that resolves with the loaded texture
     */
    loadTexture(url, options = {}) {
        return new Promise((resolve, reject) => {
            try {
                new THREE.TextureLoader().load(
                    url,
                    (texture) => {
                        try {
                            const optimizedTexture = this.optimize(texture, options);
                            resolve(optimizedTexture);
                        } catch (error) {
                            console.error(`Error optimizing texture ${url}:`, error);
                            resolve(texture); // Fallback to unoptimized
                        }
                    },
                    undefined,
                    (error) => {
                        console.error(`Error loading texture ${url}:`, error);
                        reject(error);
                    }
                );
            } catch (error) {
                console.error(`Failed to load texture ${url}:`, error);
                reject(error);
            }
        });
    },

    // Debug utilities
    debug: {
        textures: new Set(),
        
        /**
         * Track a texture for debugging
         * @param {THREE.Texture} texture - Texture to track
         */
        track(texture) {
            if (!texture || !texture.uuid) return;
            this.textures.add(texture);
        },
        
        /**
         * Log memory usage of tracked textures
         */
        logMemoryUsage() {
            let totalMemory = 0;
            console.group('Texture Memory Usage');
            
            this.textures.forEach(tex => {
                const size = this.estimateTextureSize(tex);
                const src = tex.image?.src || 'unknown';
                const name = src.split('/').pop();
                console.log(`${name}: ${(size / 1024 / 1024).toFixed(2)}MB`);
                totalMemory += size;
            });
            
            console.log('---');
            console.log(`Total: ${(totalMemory / 1024 / 1024).toFixed(2)}MB`);
            console.groupEnd();
            
            return totalMemory;
        },
        
        /**
         * Estimate texture memory usage
         * @private
         */
        estimateTextureSize(texture) {
            if (!texture.image) return 0;
            const width = texture.image.width || 1;
            const height = texture.image.height || 1;
            const channels = 4; // RGBA
            const mipmaps = texture.generateMipmaps ? Math.floor(Math.log2(Math.max(width, height))) + 1 : 1;
            return width * height * channels * 1.33 * (1 - Math.pow(0.25, mipmaps)) / (1 - 0.25);
        }
    }
};

// Track all optimized textures for debugging
const originalOptimize = TextureUtils.optimize;
TextureUtils.optimize = function(...args) {
    const texture = originalOptimize.apply(this, args);
    if (texture) {
        this.debug.track(texture);
    }
    return texture;
};
