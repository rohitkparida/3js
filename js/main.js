import { initGame } from './game.js';

// Initialize the game when the page loads
document.addEventListener('DOMContentLoaded', async () => {
    await initGame();
});
