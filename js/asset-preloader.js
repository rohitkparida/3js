// Asset Preloader - Safe Implementation with comprehensive error handling
export class AssetPreloader {
    constructor(basePath = '') {
        this.basePath = basePath;
        this.cache = new Map();
        this.loadingPromises = new Map();
        this.failedAssets = new Set();
        this.loadedCount = 0;
        this.totalAssets = 0;
        this.onProgress = null; // Progress callback
        this.onComplete = null; // Completion callback
        this.onError = null;    // Error callback
    }

    /**
     * Safely preload critical assets with comprehensive error handling
     * @param {string[]} assetUrls - Array of asset URLs to preload
     * @param {Object} options - Configuration options
     * @returns {Promise<Object>} - Promise that resolves with loading results
     */
    async preloadAssets(assetUrls, options = {}) {
        const {
            timeout = 30000,        // 30 second timeout
            maxConcurrent = 6,      // Max simultaneous downloads
            retryAttempts = 3,      // Retry failed downloads
            criticalAssets = []     // Assets that must load for game to start
        } = options;

        this.totalAssets = assetUrls.length;
        this.loadedCount = 0;

        console.log(`🚀 Starting safe asset preloading for ${this.totalAssets} assets...`);

        try {
            // Validate input
            if (!Array.isArray(assetUrls) || assetUrls.length === 0) {
                throw new Error('Asset URLs must be a non-empty array');
            }

            // Filter out already cached assets
            const uncachedAssets = assetUrls.filter(url => !this.cache.has(url));

            if (uncachedAssets.length === 0) {
                console.log('✅ All assets already cached');
                this.onComplete?.({ success: true, cached: true, loaded: 0, failed: 0 });
                return { success: true, cached: true };
            }

            console.log(`📥 Preloading ${uncachedAssets.length} uncached assets...`);

            // Create loading promises with timeout and retry logic
            const loadingPromises = uncachedAssets.map(url =>
                this.loadAssetWithRetry(url, timeout, retryAttempts, maxConcurrent)
            );

            // Wait for all assets to complete (success or failure)
            const results = await Promise.allSettled(loadingPromises);

            // Analyze results
            const successful = results.filter(r => r.status === 'fulfilled').length;
            const failed = results.filter(r => r.status === 'rejected').length;

            console.log(`✅ Asset preloading complete: ${successful} loaded, ${failed} failed`);

            // Check if critical assets loaded
            const criticalFailed = criticalAssets.some(url => this.failedAssets.has(url));

            if (criticalFailed) {
                const error = `Critical assets failed to load: ${criticalAssets.filter(url => this.failedAssets.has(url)).join(', ')}`;
                console.error(`❌ ${error}`);
                this.onError?.(error);

                // Don't throw - let game continue with fallbacks
                return {
                    success: false,
                    error,
                    loaded: successful,
                    failed: failed,
                    criticalFailed: true
                };
            }

            // Success - all critical assets loaded
            const result = {
                success: true,
                loaded: successful,
                failed: failed,
                total: this.totalAssets
            };

            this.onComplete?.(result);
            return result;

        } catch (error) {
            console.error('💥 Asset preloading system error:', error);
            this.onError?.(error.message);

            return {
                success: false,
                error: error.message,
                loaded: this.loadedCount,
                failed: this.totalAssets - this.loadedCount
            };
        }
    }

    /**
     * Load a single asset with retry logic and timeout
     */
    async loadAssetWithRetry(url, timeout, maxRetries, maxConcurrent) {
        let lastError;

        for (let attempt = 1; attempt <= maxRetries; attempt++) {
            try {
                // Check concurrent loading limit
                await this.throttleConcurrentLoads(maxConcurrent);

                const assetData = await this.loadAssetWithTimeout(url, timeout);

                this.loadedCount++;
                this.updateProgress();

                return assetData;

            } catch (error) {
                lastError = error;
                console.warn(`⚠️ Asset load attempt ${attempt}/${maxRetries} failed for ${url}:`, error.message);

                // Mark as failed if this was the last attempt
                if (attempt === maxRetries) {
                    this.failedAssets.add(url);
                }

                // Wait before retry (exponential backoff)
                if (attempt < maxRetries) {
                    const delay = Math.min(1000 * Math.pow(2, attempt - 1), 5000);
                    await new Promise(resolve => setTimeout(resolve, delay));
                }
            }
        }

        throw lastError;
    }

    /**
     * Load asset with timeout protection
     */
    async loadAssetWithTimeout(url, timeout) {
        return new Promise(async (resolve, reject) => {
            // Set up timeout
            const timeoutId = setTimeout(() => {
                reject(new Error(`Asset load timeout: ${url}`));
            }, timeout);

            try {
                // Check cache first
                if (this.cache.has(url)) {
                    clearTimeout(timeoutId);
                    resolve(this.cache.get(url));
                    return;
                }

                // Prevent duplicate requests
                if (this.loadingPromises.has(url)) {
                    const existingPromise = this.loadingPromises.get(url);
                    clearTimeout(timeoutId);

                    try {
                        const result = await existingPromise;
                        resolve(result);
                    } catch (error) {
                        reject(error);
                    }
                    return;
                }

                // Start new load
                const loadPromise = this.performAssetLoad(url);
                this.loadingPromises.set(url, loadPromise);

                const result = await loadPromise;

                // Cache successful load
                this.cache.set(url, result);
                this.loadingPromises.delete(url);

                clearTimeout(timeoutId);
                resolve(result);

            } catch (error) {
                this.loadingPromises.delete(url);
                clearTimeout(timeoutId);
                reject(error);
            }
        });
    }

    /**
     * Perform the actual asset loading with browser compatibility
     */
    async performAssetLoad(url) {
        try {
            // Construct full URL with base path for GitHub Pages
            const baseUrl = this.basePath || '';
            const fullUrl = url.startsWith('http') ? url : `${baseUrl}${url}`;

            // Use modern fetch API with fallback
            if (typeof fetch !== 'undefined') {
                const response = await fetch(fullUrl);

                if (!response.ok) {
                    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
                }

                // Handle different asset types
                const contentType = response.headers.get('content-type') || '';

                if (contentType.includes('text') || url.endsWith('.obj') || url.endsWith('.gltf')) {
                    return await response.text();
                } else {
                    return await response.arrayBuffer();
                }
            } else {
                // Fallback for very old browsers
                return new Promise((resolve, reject) => {
                    const xhr = new XMLHttpRequest();
                    xhr.open('GET', fullUrl, true);
                    xhr.responseType = 'arraybuffer';

                    xhr.onload = () => {
                        if (xhr.status === 200) {
                            resolve(xhr.response);
                        } else {
                            reject(new Error(`HTTP ${xhr.status}: ${xhr.statusText}`));
                        }
                    };

                    xhr.onerror = () => reject(new Error('Network error'));
                    xhr.send();
                });
            }
        } catch (error) {
            throw new Error(`Failed to load asset ${url}: ${error.message}`);
        }
    }

    /**
     * Throttle concurrent loads to prevent overwhelming the browser/network
     */
    async throttleConcurrentLoads(maxConcurrent) {
        while (this.loadingPromises.size >= maxConcurrent) {
            await new Promise(resolve => setTimeout(resolve, 100));
        }
    }

    /**
     * Update loading progress
     */
    updateProgress() {
        const progress = this.loadedCount / this.totalAssets;
        this.onProgress?.(progress, this.loadedCount, this.totalAssets);
    }

    /**
     * Get cached asset if available
     */
    getCachedAsset(url) {
        return this.cache.get(url) || null;
    }

    /**
     * Check if asset is loaded (cached or failed)
     */
    isAssetReady(url) {
        return this.cache.has(url) || this.failedAssets.has(url);
    }

    /**
     * Clear cache (useful for memory management)
     */
    clearCache() {
        this.cache.clear();
        this.failedAssets.clear();
        this.loadedCount = 0;
        this.totalAssets = 0;
        console.log('🧹 Asset cache cleared');
    }

    /**
     * Get loading statistics
     */
    getStats() {
        return {
            cached: this.cache.size,
            failed: this.failedAssets.size,
            loading: this.loadingPromises.size,
            loaded: this.loadedCount,
            total: this.totalAssets
        };
    }
}
