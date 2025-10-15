
import { logger } from './utils/logger.js';

export class Performance {
    constructor() {
        this.fps = 0;
        this.lastTime = performance.now();
        this.frameCount = 0;
        this.fpsThreshold = 55; // FPS threshold for logging
        this.logEnabled = true;

        this.fpsElement = document.createElement('div');
        this.fpsElement.style.position = 'absolute';
        this.fpsElement.style.top = '10px';
        this.fpsElement.style.left = '10px';
        this.fpsElement.style.color = 'white';
        this.fpsElement.style.fontFamily = 'Arial, sans-serif';
        this.fpsElement.style.fontSize = '20px';
        this.fpsElement.style.backgroundColor = 'rgba(0, 0, 0, 0.5)';
        this.fpsElement.style.padding = '5px';
        document.body.appendChild(this.fpsElement);

        // Performance tracking for more detailed monitoring
        this.fpsHistory = [];
        this.maxHistorySize = 60; // Keep 1 minute of history at 60fps
        this.performanceAlerts = 0;
        this.lastAlertTime = 0;
        this.alertCooldown = 5000; // 5 seconds between alerts
    }

    update() {
        const now = performance.now();
        this.frameCount++;

        if (now - this.lastTime >= 1000) {
            this.fps = this.frameCount;
            this.frameCount = 0;
            this.lastTime = now;
            this.fpsElement.textContent = `FPS: ${this.fps}`;

            // Track FPS history for trend analysis
            this.fpsHistory.push(this.fps);
            if (this.fpsHistory.length > this.maxHistorySize) {
                this.fpsHistory.shift();
            }

            // Only log performance alerts, not every FPS check
            if (this.logEnabled && this.fps < this.fpsThreshold) {
                this.handlePerformanceAlert(this.fps);
            }
        }
    }

    handlePerformanceAlert(currentFps) {
        const now = Date.now();

        // Throttle alerts to avoid spam
        if (now - this.lastAlertTime < this.alertCooldown) {
            return;
        }

        this.performanceAlerts++;
        this.lastAlertTime = now;

        // Analyze FPS trend for better context
        const recentAverage = this.getRecentAverageFps();

        logger.warn('Performance Alert', 'PERFORMANCE', {
            currentFps,
            recentAverage: recentAverage.toFixed(1),
            alertCount: this.performanceAlerts,
            timestamp: new Date().toLocaleTimeString()
        });

        // Suggest optimizations for severe drops
        if (currentFps < 30) {
            logger.warn('Severe performance drop detected', 'PERFORMANCE', {
                suggestion: 'Consider reducing object count or enabling LOD'
            });
        }
    }

    getRecentAverageFps() {
        if (this.fpsHistory.length === 0) return this.fps;

        const recent = this.fpsHistory.slice(-10); // Last 10 seconds
        return recent.reduce((sum, fps) => sum + fps, 0) / recent.length;
    }

    getStats() {
        return {
            currentFps: this.fps,
            averageFps: this.getRecentAverageFps(),
            historySize: this.fpsHistory.length,
            alerts: this.performanceAlerts,
            threshold: this.fpsThreshold
        };
    }
}
