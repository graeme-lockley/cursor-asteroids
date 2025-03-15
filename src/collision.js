export function checkCollision(obj1, obj2) {
    const dx = obj1.x - obj2.x;
    const dy = obj1.y - obj2.y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    
    return distance < obj1.radius + obj2.radius;
}

// Screen wrapping utilities
export function wrapPosition(obj, width, height, options = {}) {
    const {
        useRadius = false,      // Whether to use the object's radius for smoother wrapping
        trackDistance = false,  // For tracking distance traveled (bullets)
        addDistanceCallback = null, // Callback for adding distance calculations
    } = options;
    
    const r = useRadius ? obj.radius : 0;
    let distanceMoved = { x: 0, y: 0 };
    
    // Store previous position if needed for distance tracking
    const prevX = trackDistance ? obj.prevX : null;
    const prevY = trackDistance ? obj.prevY : null;
    
    // Horizontal wrapping
    if (obj.x < -r) {
        distanceMoved.x = prevX;
        obj.x = width + r;
    } else if (obj.x > width + r) {
        distanceMoved.x = width - prevX;
        obj.x = r === 0 ? 0 : -r; // Use exact 0 when no radius for test compatibility
    } else if (trackDistance) {
        distanceMoved.x = Math.abs(obj.x - prevX);
    }
    
    // Vertical wrapping
    if (obj.y < -r) {
        distanceMoved.y = prevY;
        obj.y = height + r;
    } else if (obj.y > height + r) {
        distanceMoved.y = height - prevY;
        obj.y = r === 0 ? 0 : -r; // Use exact 0 when no radius for test compatibility
    } else if (trackDistance) {
        distanceMoved.y = Math.abs(obj.y - prevY);
    }
    
    // Add distance traveled if tracking is enabled
    if (trackDistance && addDistanceCallback) {
        addDistanceCallback(distanceMoved.x, distanceMoved.y);
    }
} 