import { initGame } from './game.js';

// Initialize the game when the page loads
document.addEventListener('DOMContentLoaded', async () => {
    const overlay = document.getElementById('loading-overlay');
    const bar = document.getElementById('loading-progress');

    // Time-based progress to 80%
    let p = 0;
    const targetTimeMs = 1500; // 1.5s to 80%
    const start = performance.now();
    let rafId;
    const tick = (t) => {
        const elapsed = t - start;
        const ratio = Math.min(1, elapsed / targetTimeMs);
        p = Math.max(p, Math.floor(ratio * 80));
        if (bar) bar.style.width = p + '%';
        if (ratio < 1) rafId = requestAnimationFrame(tick);
    };
    rafId = requestAnimationFrame(tick);

    // Init game
    await initGame();

    // Ensure bar reaches 100% before fading (force reflow + slight delay)
    if (rafId) cancelAnimationFrame(rafId);
    if (bar) bar.style.width = '100%';
    // Next frame, start fade
    requestAnimationFrame(() => {
        setTimeout(() => {
            if (overlay) {
                overlay.style.transition = 'opacity 350ms ease';
                overlay.style.opacity = '0';
                setTimeout(() => overlay.style.display = 'none', 400);
            }
        }, 120);
    });
});
