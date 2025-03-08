import AudioManager from '../src/audio.js';

// Mock Audio class
global.Audio = class {
    constructor(src) {
        this.src = src;
        this.volume = 1;
    }
    
    play() {
        return Promise.resolve();
    }
    
    cloneNode() {
        return new Audio(this.src);
    }
};

describe('AudioManager', () => {
    let audio;
    
    beforeEach(() => {
        audio = new AudioManager();
        jest.useFakeTimers();
    });
    
    afterEach(() => {
        jest.useRealTimers();
    });
    
    test('initializes with correct sound files', () => {
        expect(audio.sounds.beat1.src).toContain('beat1.wav');
        expect(audio.sounds.beat2.src).toContain('beat2.wav');
        expect(audio.sounds.fire.src).toContain('fire.wav');
        expect(audio.sounds.bangLarge.src).toContain('bang-large.wav');
        expect(audio.sounds.bangMedium.src).toContain('bang-medium.wav');
        expect(audio.sounds.bangSmall.src).toContain('bang-small.wav');
    });
    
    test('plays fire sound', () => {
        const spy = jest.spyOn(audio.sounds.fire, 'cloneNode');
        audio.playFireSound();
        expect(spy).toHaveBeenCalled();
    });
    
    test('plays correct bang sound for each asteroid size', () => {
        const spyLarge = jest.spyOn(audio.sounds.bangLarge, 'cloneNode');
        const spyMedium = jest.spyOn(audio.sounds.bangMedium, 'cloneNode');
        const spySmall = jest.spyOn(audio.sounds.bangSmall, 'cloneNode');
        
        audio.playBangSound('large');
        expect(spyLarge).toHaveBeenCalled();
        
        audio.playBangSound('medium');
        expect(spyMedium).toHaveBeenCalled();
        
        audio.playBangSound('small');
        expect(spySmall).toHaveBeenCalled();
    });
    
    test('background beat speeds up with wave number', () => {
        audio.startBackgroundBeat(1);
        const initialInterval = audio.beatInterval;
        
        audio.startBackgroundBeat(2);
        expect(audio.beatInterval).toBeLessThan(initialInterval);
        
        audio.startBackgroundBeat(3);
        expect(audio.beatInterval).toBeLessThan(initialInterval);
    });
    
    test('background beat has maximum speed', () => {
        audio.startBackgroundBeat(1);
        const initialInterval = audio.beatInterval;
        
        audio.startBackgroundBeat(100);  // Very high wave number
        expect(audio.beatInterval).toBe(initialInterval / 4);  // Max 4x faster
    });
    
    test('stops background beat', () => {
        audio.startBackgroundBeat(1);
        expect(audio.beatTimer).toBeTruthy();
        
        audio.stopBackgroundBeat();
        expect(audio.beatTimer).toBeNull();
    });
    
    test('alternates between beat1 and beat2', () => {
        const spy1 = jest.spyOn(audio.sounds.beat1, 'cloneNode');
        const spy2 = jest.spyOn(audio.sounds.beat2, 'cloneNode');
        
        audio.startBackgroundBeat(1);
        
        // First beat
        expect(spy1).toHaveBeenCalled();
        expect(spy2).not.toHaveBeenCalled();
        
        // Advance timer to next beat
        jest.advanceTimersByTime(audio.beatInterval);
        
        // Second beat
        expect(spy2).toHaveBeenCalled();
    });
}); 