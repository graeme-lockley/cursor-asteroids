import Game from './game.js';

console.log('Game script loading...');

// Wait for DOM to load
document.addEventListener('DOMContentLoaded', () => {
    console.log('DOM loaded, initializing game...');
    
    const canvas = document.getElementById('game-canvas');
    const container = document.getElementById('game-container');
    
    if (!canvas || !container) {
        console.error('Could not find canvas or container elements:', {
            canvas: !!canvas,
            container: !!container
        });
        return;
    }
    
    console.log('Found canvas and container elements');
    
    // Set canvas size to match container
    function resizeCanvas() {
        console.log('Resizing canvas to:', {
            width: container.clientWidth,
            height: container.clientHeight
        });
        canvas.width = container.clientWidth;
        canvas.height = container.clientHeight;
    }
    
    // Initial resize
    resizeCanvas();
    
    // Resize canvas when window is resized
    window.addEventListener('resize', resizeCanvas);
    
    // Create game instance
    console.log('Creating game instance...');
    const game = new Game(canvas);
    
    // Add event listeners for buttons
    const startButton = document.getElementById('start-button');
    const restartButton = document.getElementById('restart-button');
    
    if (!startButton || !restartButton) {
        console.error('Could not find game buttons:', {
            startButton: !!startButton,
            restartButton: !!restartButton
        });
        return;
    }
    
    startButton.addEventListener('click', () => {
        console.log('Starting game...');
        document.getElementById('start-screen').classList.add('hidden');
        game.reset();
    });
    
    restartButton.addEventListener('click', () => {
        console.log('Restarting game...');
        document.getElementById('game-over-screen').classList.add('hidden');
        game.reset();
    });
    
    console.log('Game initialization complete');
}); 