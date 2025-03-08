// Constants
export const BULLET_MAX_DISTANCE = 0.95; // As a fraction of screen dimension

export default class Bullet {
    constructor(x, y, velocityX, velocityY) {
        // Position
        this.x = x;
        this.y = y;
        
        // Movement
        this.velocity = { x: velocityX, y: velocityY };
        
        // Visual
        this.radius = 2;
        
        // State
        this.distanceTraveled = 0;
        this.isDead = false;
    }
    
    update(deltaTime, width, height) {
        this.updatePosition(deltaTime);
        this.handleScreenWrapping(width, height);
        this.checkExpiration(width, height);
    }
    
    updatePosition(deltaTime) {
        // Store previous position for distance calculation
        this.prevX = this.x;
        this.prevY = this.y;
        
        // Update position based on velocity
        this.x += this.velocity.x * deltaTime;
        this.y += this.velocity.y * deltaTime;
    }
    
    handleScreenWrapping(width, height) {
        // Handle horizontal wrapping
        if (this.x < 0) {
            this.addDistanceTraveled(this.prevX, 0);
            this.x = width;
        } else if (this.x > width) {
            this.addDistanceTraveled(width - this.prevX, 0);
            this.x = 0;
        } else {
            this.addDistanceTraveled(Math.abs(this.x - this.prevX), 0);
        }
        
        // Handle vertical wrapping
        if (this.y < 0) {
            this.addDistanceTraveled(0, this.prevY);
            this.y = height;
        } else if (this.y > height) {
            this.addDistanceTraveled(0, height - this.prevY);
            this.y = 0;
        } else {
            this.addDistanceTraveled(0, Math.abs(this.y - this.prevY));
        }
    }
    
    addDistanceTraveled(dx, dy) {
        // Use Pythagorean theorem to calculate actual distance moved
        this.distanceTraveled += Math.sqrt(dx * dx + dy * dy);
    }
    
    checkExpiration(width, height) {
        const minScreenDimension = Math.min(width, height);
        const maxDistance = minScreenDimension * BULLET_MAX_DISTANCE;
        
        if (this.distanceTraveled >= maxDistance) {
            this.isDead = true;
        }
    }
    
    render(ctx) {
        ctx.save();
        ctx.fillStyle = '#fff';
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
    }
} 