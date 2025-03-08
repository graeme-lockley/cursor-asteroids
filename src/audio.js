export default class AudioManager {
    constructor() {
        this.sounds = {
            beat1: new Audio('sounds/beat1.wav'),
            beat2: new Audio('sounds/beat2.wav'),
            fire: new Audio('sounds/fire.wav'),
            bangLarge: new Audio('sounds/bang-large.wav'),
            bangMedium: new Audio('sounds/bang-medium.wav'),
            bangSmall: new Audio('sounds/bang-small.wav')
        };
        
        // Background beat settings
        this.currentBeat = 1;
        this.baseInterval = 1000;  // Start at 1 second between beats
        this.beatTimer = null;
        this.beatInterval = this.baseInterval;
    }
    
    playSound(name) {
        const sound = this.sounds[name];
        if (sound) {
            // Clone and play to allow overlapping sounds
            const clone = sound.cloneNode();
            clone.volume = 0.5;  // Set to 50% volume
            clone.play().catch(e => console.log('Error playing sound:', e));
        }
    }
    
    startBackgroundBeat(wave) {
        this.stopBackgroundBeat();
        
        // Increase tempo based on wave number (max 4x faster)
        const speedMultiplier = Math.min(4, 1 + (wave - 1) * 0.2);
        this.beatInterval = this.baseInterval / speedMultiplier;
        
        const playBeat = () => {
            this.playSound(this.currentBeat === 1 ? 'beat1' : 'beat2');
            this.currentBeat = this.currentBeat === 1 ? 2 : 1;
            this.beatTimer = setTimeout(playBeat, this.beatInterval);
        };
        
        playBeat();
    }
    
    stopBackgroundBeat() {
        if (this.beatTimer) {
            clearTimeout(this.beatTimer);
            this.beatTimer = null;
        }
    }
    
    playBangSound(asteroidSize) {
        switch (asteroidSize) {
            case 'large':
                this.playSound('bangLarge');
                break;
            case 'medium':
                this.playSound('bangMedium');
                break;
            case 'small':
                this.playSound('bangSmall');
                break;
        }
    }
    
    playFireSound() {
        this.playSound('fire');
    }
} 