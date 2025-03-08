export const BULLET_MAX_DISTANCE = 0.95; // As a fraction of screen dimension

export default class Bullet {
    constructor(x, y, velocityX, velocityY) {
        this.x = x;
        this.y = y;
        this.velocity = { x: velocityX, y: velocityY };
        this.radius = 2;
        this.isDead = false;
        
        // Track initial position and distance traveled
        this.initialX = x;
        this.initialY = y;
        this.distanceTraveled = 0;
    }
    
    update(deltaTime, width, height) {
        // Update position
        const prevX = this.x;
        const prevY = this.y;
        
        this.x += this.velocity.x * deltaTime;
        this.y += this.velocity.y * deltaTime;
        
        // Handle wrapping and distance calculation
        if (this.x < 0) {
            this.distanceTraveled += prevX;
            this.x = width;
        } else if (this.x > width) {
            this.distanceTraveled += (width - prevX);
            this.x = 0;
        } else {
            this.distanceTraveled += Math.abs(this.x - prevX);
        }
        
        if (this.y < 0) {
            this.distanceTraveled += prevY;
            this.y = height;
        } else if (this.y > height) {
            this.distanceTraveled += (height - prevY);
            this.y = 0;
        } else {
            this.distanceTraveled += Math.abs(this.y - prevY);
        }
        
        // Use the minimum screen dimension as the reference for maximum travel distance
        const minScreenDimension = Math.min(width, height);
        
        // Expire bullet if it has traveled most of the way across the minimum screen dimension
        if (this.distanceTraveled >= minScreenDimension * BULLET_MAX_DISTANCE) {
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