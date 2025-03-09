// Mock canvas and context
class CanvasRenderingContext2D {
    save() {}
    restore() {}
    translate() {}
    rotate() {}
    beginPath() {}
    moveTo() {}
    lineTo() {}
    closePath() {}
    stroke() {}
    fill() {}
    arc() {}
    fillRect() {}
    fillText() {}
}

class HTMLCanvasElement {
    constructor() {
        this.width = 800;
        this.height = 600;
    }
    getContext() {
        return new CanvasRenderingContext2D();
    }
}

// Add canvas to global
global.HTMLCanvasElement = HTMLCanvasElement;

// Mock requestAnimationFrame
global.requestAnimationFrame = callback => setTimeout(callback, 0);
global.performance = { now: () => Date.now() };

// Mock DOM elements
const mockElement = {
    getContext: () => new CanvasRenderingContext2D(),
    addEventListener: jest.fn(),
    classList: {
        add: jest.fn(),
        remove: jest.fn()
    },
    clientWidth: 800,
    clientHeight: 600
};

document.getElementById = jest.fn(() => mockElement);
document.createElement = jest.fn(() => mockElement); 