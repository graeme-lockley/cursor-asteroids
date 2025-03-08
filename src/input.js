export const keys = {
    left: false,
    right: false,
    up: false,
    space: false
};

export function setupInput() {
    window.addEventListener('keydown', (e) => {
        switch (e.key) {
            case 'ArrowLeft':
                keys.left = true;
                break;
            case 'ArrowRight':
                keys.right = true;
                break;
            case 'ArrowUp':
                keys.up = true;
                break;
            case ' ':
                keys.space = true;
                e.preventDefault(); // Prevent page scrolling
                break;
        }
    });
    
    window.addEventListener('keyup', (e) => {
        switch (e.key) {
            case 'ArrowLeft':
                keys.left = false;
                break;
            case 'ArrowRight':
                keys.right = false;
                break;
            case 'ArrowUp':
                keys.up = false;
                break;
            case ' ':
                keys.space = false;
                break;
        }
    });
} 