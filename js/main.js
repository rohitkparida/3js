import { initGame } from './game.js';
import { SplineExporter } from './spline-export.js';

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
    const game = await initGame();
    
    // Setup export functionality
    setupExportHandlers(game);

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

// Setup export button handlers
function setupExportHandlers(game) {
    const exportBtn = document.getElementById('export-btn');
    const buildingsBtn = document.getElementById('export-buildings-btn');
    const vehiclesBtn = document.getElementById('export-vehicles-btn');
    
    if (exportBtn) {
        exportBtn.addEventListener('click', async () => {
            exportBtn.innerHTML = '⏳ Exporting...';
            exportBtn.disabled = true;
            
            try {
                const exporter = new SplineExporter(game.scene, game);
                await exporter.exportSceneToSpline({ fullScene: true });
            } catch (error) {
                console.error('Export failed:', error);
                alert('Export failed - check console for details');
            } finally {
                exportBtn.innerHTML = '🎨 Export to Spline';
                exportBtn.disabled = false;
            }
        });
    }
    
    if (buildingsBtn) {
        buildingsBtn.addEventListener('click', async () => {
            buildingsBtn.innerHTML = '⏳ Buildings...';
            buildingsBtn.disabled = true;
            
            try {
                const exporter = new SplineExporter(game.scene, game);
                await exporter.exportLayer('buildings');
            } catch (error) {
                console.error('Buildings export failed:', error);
            } finally {
                buildingsBtn.innerHTML = '🏢 Export Buildings';
                buildingsBtn.disabled = false;
            }
        });
    }
    
    if (vehiclesBtn) {
        vehiclesBtn.addEventListener('click', async () => {
            vehiclesBtn.innerHTML = '⏳ Vehicles...';
            vehiclesBtn.disabled = true;
            
            try {
                const exporter = new SplineExporter(game.scene, game);
                await exporter.exportLayer('vehicles');
            } catch (error) {
                console.error('Vehicles export failed:', error);
            } finally {
                vehiclesBtn.innerHTML = '🚗 Export Vehicles';
                vehiclesBtn.disabled = false;
            }
        });
    }
}
