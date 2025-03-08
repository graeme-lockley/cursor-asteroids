# Asteroids Game

A modern browser-based remake of the classic arcade game Asteroids, built with JavaScript and HTML5 Canvas.

## Features

- Classic Asteroids gameplay with modern graphics
- Smooth ship controls with thrust and rotation
- Asteroid splitting mechanics
- Score tracking and lives system
- Responsive canvas that adjusts to window size
- Modern development setup with Vite and Jest testing

## Controls

- Left Arrow (←): Rotate ship left
- Right Arrow (→): Rotate ship right
- Up Arrow (↑): Apply thrust
- Spacebar: Fire projectiles

## Development

### Prerequisites

- Node.js (v14 or higher)
- npm (v7 or higher)

### Setup

1. Clone the repository
2. Install dependencies:
```bash
npm install
```

### Running the Game

Development mode:
```bash
npm run dev
```

Build for production:
```bash
npm run build
```

Preview production build:
```bash
npm run preview
```

### Testing

Run tests:
```bash
npm test
```

Run tests in watch mode:
```bash
npm run test:watch
```

## Project Structure

```
/asteroids-game
│── /src              # Source code
│   ├── game.js       # Main game loop and state
│   ├── ship.js       # Player ship logic
│   ├── asteroid.js   # Asteroid behavior
│   ├── bullet.js     # Projectile behavior
│   ├── collision.js  # Collision detection
│   ├── input.js      # Input handling
│   └── index.js      # Entry point
│── /tests            # Test files
│── /public           # Static assets
└── /dist             # Production build
```

## License

MIT License 