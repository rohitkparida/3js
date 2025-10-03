
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
    }

    update() {
        const now = performance.now();
        this.frameCount++;

        if (now - this.lastTime >= 1000) {
            this.fps = this.frameCount;
            this.frameCount = 0;
            this.lastTime = now;
            this.fpsElement.textContent = `FPS: ${this.fps}`;

            if (this.logEnabled && this.fps < this.fpsThreshold) {
                console.warn(`Performance Alert: FPS dropped to ${this.fps}`);
            }
        }
    }
}
