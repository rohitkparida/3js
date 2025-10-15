/**
 * Efficient Logging System
 * Provides configurable, performance-conscious logging with different levels
 */
export class Logger {
    constructor(options = {}) {
        this.options = {
            level: options.level || 'INFO', // ERROR, WARN, INFO, DEBUG
            enablePerformanceLogging: options.enablePerformanceLogging !== false,
            enableBatching: options.enableBatching !== false,
            batchSize: options.batchSize || 10,
            batchTimeout: options.batchTimeout || 100, // ms
            categories: options.categories || {},
            ...options
        };

        this.levels = {
            ERROR: 0,
            WARN: 1,
            INFO: 2,
            DEBUG: 3
        };

        this.currentLevel = this.levels[this.options.level] || 2;

        // Batching system
        this.batchBuffer = [];
        this.batchTimer = null;

        // Performance tracking
        this.logCount = 0;
        this.lastLogTime = 0;
        this.slowLogThreshold = 5; // ms

        // Category-specific settings
        this.categorySettings = {
            TREE: { enabled: true, level: 'INFO' },
            COLLISION: { enabled: true, level: 'INFO' },
            PERFORMANCE: { enabled: this.options.enablePerformanceLogging, level: 'WARN' },
            PHYSICS: { enabled: true, level: 'INFO' },
            RENDERING: { enabled: true, level: 'INFO' },
            ...this.options.categories
        };

        // Bind methods for performance
        this.error = this.error.bind(this);
        this.warn = this.warn.bind(this);
        this.info = this.info.bind(this);
        this.debug = this.debug.bind(this);
        this.flush = this.flush.bind(this);
    }

    /**
     * Check if a log level should be output
     */
    shouldLog(level, category = 'GENERAL') {
        if (this.levels[level] > this.currentLevel) return false;

        const categorySetting = this.categorySettings[category];
        if (!categorySetting || !categorySetting.enabled) return false;

        return this.levels[level] <= this.levels[categorySetting.level];
    }

    /**
     * Log an error message
     */
    error(message, category = 'GENERAL', data = null) {
        if (!this.shouldLog('ERROR', category)) return;

        const logData = {
            level: 'ERROR',
            message,
            category,
            data,
            timestamp: Date.now()
        };

        this.outputLog(logData);
    }

    /**
     * Log a warning message
     */
    warn(message, category = 'GENERAL', data = null) {
        if (!this.shouldLog('WARN', category)) return;

        const logData = {
            level: 'WARN',
            message,
            category,
            data,
            timestamp: Date.now()
        };

        this.outputLog(logData);
    }

    /**
     * Log an info message
     */
    info(message, category = 'GENERAL', data = null) {
        if (!this.shouldLog('INFO', category)) return;

        const logData = {
            level: 'INFO',
            message,
            category,
            data,
            timestamp: Date.now()
        };

        this.outputLog(logData);
    }

    /**
     * Log a debug message
     */
    debug(message, category = 'GENERAL', data = null) {
        if (!this.shouldLog('DEBUG', category)) return;

        const logData = {
            level: 'DEBUG',
            message,
            category,
            data,
            timestamp: Date.now()
        };

        this.outputLog(logData);
    }

    /**
     * Output log with performance considerations
     */
    outputLog(logData) {
        const now = performance.now();

        // Performance check - avoid logging too frequently
        if (this.options.enablePerformanceLogging && now - this.lastLogTime < 1) {
            return; // Skip if logging too fast
        }

        this.lastLogTime = now;
        this.logCount++;

        // Check if log is slow (for performance monitoring)
        const startTime = performance.now();
        const formattedMessage = this.formatMessage(logData);
        const logTime = performance.now() - startTime;

        if (logTime > this.slowLogThreshold) {
            console.warn(`🐌 Slow log detected (${logTime.toFixed(2)}ms):`, formattedMessage);
        }

        if (this.options.enableBatching) {
            this.batchBuffer.push(formattedMessage);

            if (this.batchBuffer.length >= this.options.batchSize) {
                this.flush();
            } else if (!this.batchTimer) {
                this.batchTimer = setTimeout(() => this.flush(), this.options.batchTimeout);
            }
        } else {
            console.log(formattedMessage);
        }
    }

    /**
     * Format log message with emoji and styling
     */
    formatMessage(logData) {
        const emojis = {
            ERROR: '❌',
            WARN: '⚠️',
            INFO: 'ℹ️',
            DEBUG: '🔍'
        };

        const emoji = emojis[logData.level] || '📝';
        const category = logData.category !== 'GENERAL' ? `[${logData.category}] ` : '';
        const message = `${emoji} ${category}${logData.message}`;

        // Add data if present and not too large
        if (logData.data && typeof logData.data === 'object') {
            try {
                const dataStr = JSON.stringify(logData.data);
                if (dataStr.length < 200) { // Limit data size
                    return `${message} ${dataStr}`;
                }
            } catch (e) {
                // Ignore stringify errors
            }
        }

        return message;
    }

    /**
     * Flush batched logs to console
     */
    flush() {
        if (this.batchBuffer.length > 0) {
            console.log(this.batchBuffer.join('\n'));
            this.batchBuffer = [];
        }

        if (this.batchTimer) {
            clearTimeout(this.batchTimer);
            this.batchTimer = null;
        }
    }

    /**
     * Set log level
     */
    setLevel(level) {
        this.options.level = level;
        this.currentLevel = this.levels[level] || 2;
    }

    /**
     * Enable/disable category
     */
    setCategory(category, enabled, level = 'INFO') {
        this.categorySettings[category] = { enabled, level };
    }

    /**
     * Get logging statistics
     */
    getStats() {
        return {
            totalLogs: this.logCount,
            currentLevel: this.options.level,
            batchingEnabled: this.options.enableBatching,
            categories: this.categorySettings,
            bufferSize: this.batchBuffer.length
        };
    }

    /**
     * Force flush and cleanup
     */
    dispose() {
        this.flush();
        this.logCount = 0;
        this.batchBuffer = [];
        if (this.batchTimer) {
            clearTimeout(this.batchTimer);
            this.batchTimer = null;
        }
    }
}

// Global logger instance
export const logger = new Logger({
    level: 'WARN', // Start with WARN level to reduce noise
    enablePerformanceLogging: true,
    enableBatching: true,
    batchSize: 20, // Larger batches for better performance
    categories: {
        TREE: { enabled: false, level: 'INFO' }, // Disable by default - too verbose
        COLLISION: { enabled: false, level: 'INFO' }, // Disable by default
        PERFORMANCE: { enabled: true, level: 'WARN' }, // Keep performance warnings
        PHYSICS: { enabled: true, level: 'WARN' },
        RENDERING: { enabled: true, level: 'INFO' }
    }
});

// Development mode - enable debug logging only for localhost
if (typeof window !== 'undefined' && window.location && window.location.hostname === 'localhost') {
    logger.setLevel('INFO'); // More verbose in development
    // Enable tree and collision logs only in development
    logger.setCategory('TREE', true, 'INFO');
    logger.setCategory('COLLISION', true, 'INFO');
}

// Safe logger function that won't throw if logger isn't initialized
export const safeLog = {
    error: (message, category = 'GENERAL', data = null) => {
        try {
            logger.error(message, category, data);
        } catch (e) {
            console.error('Logger error:', e);
            console.error(message, data);
        }
    },
    warn: (message, category = 'GENERAL', data = null) => {
        try {
            logger.warn(message, category, data);
        } catch (e) {
            console.warn('Logger error:', e);
            console.warn(message, data);
        }
    },
    info: (message, category = 'GENERAL', data = null) => {
        try {
            logger.info(message, category, data);
        } catch (e) {
            console.info('Logger error:', e);
            console.info(message, data);
        }
    },
    debug: (message, category = 'GENERAL', data = null) => {
        try {
            logger.debug(message, category, data);
        } catch (e) {
            console.debug('Logger error:', e);
            console.debug(message, data);
        }
    }
};
