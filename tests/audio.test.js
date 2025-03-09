// Mock Web Audio API
class MockAudioContext {
    constructor() {
        this.currentTime = 0;
        this.state = 'suspended';
    }
    
    createBufferSource() {
        return {
            connect: jest.fn(),
            disconnect: jest.fn(),
            start: jest.fn(),
            stop: jest.fn(),
            buffer: null,
            onended: null
        };
    }
    
    createGain() {
        return {
            connect: jest.fn(),
            gain: { value: 1 }
        };
    }
    
    decodeAudioData(buffer) {
        return Promise.resolve({});
    }
    
    resume() {
        this.state = 'running';
        return Promise.resolve();
    }
}

// Mock fetch for audio file loading
global.fetch = jest.fn(() =>
    Promise.resolve({
        arrayBuffer: () => Promise.resolve(new ArrayBuffer(0))
    })
);

global.window = {
    AudioContext: MockAudioContext,
    webkitAudioContext: MockAudioContext
};

import AudioManager from '../src/audio.js';

describe('AudioManager', () => {
    let audio;
    
    beforeEach(() => {
        jest.useFakeTimers();
        audio = new AudioManager(true);  // Pass true to enable test mode
    });
    
    afterEach(() => {
        jest.clearAllMocks();
        jest.useRealTimers();
    });
    
    test('initializes with correct sound pools', () => {
        expect(audio.pools.beat1).toBeDefined();
        expect(audio.pools.beat2).toBeDefined();
        expect(audio.pools.fire).toBeDefined();
        expect(audio.pools.bangLarge).toBeDefined();
        expect(audio.pools.bangMedium).toBeDefined();
        expect(audio.pools.bangSmall).toBeDefined();
        
        // Check that each pool has the correct number of nodes
        expect(audio.pools.beat1.length).toBe(2);
        expect(audio.pools.beat2.length).toBe(2);
        expect(audio.pools.fire.length).toBe(4);
        expect(audio.pools.bangLarge.length).toBe(4);
        expect(audio.pools.bangMedium.length).toBe(4);
        expect(audio.pools.bangSmall.length).toBe(4);
    });
    
    test('plays fire sound', () => {
        audio.playFireSound();
        const fireNode = audio.pools.fire[0];
        expect(fireNode.source.start).toHaveBeenCalled();
    });
    
    test('plays correct bang sound for each asteroid size', () => {
        audio.playBangSound('large');
        expect(audio.pools.bangLarge[0].source.start).toHaveBeenCalled();
        
        audio.playBangSound('medium');
        expect(audio.pools.bangMedium[0].source.start).toHaveBeenCalled();
        
        audio.playBangSound('small');
        expect(audio.pools.bangSmall[0].source.start).toHaveBeenCalled();
    });
    
    test('background beat speeds up with wave number', () => {
        const initialInterval = audio.beatInterval;
        audio.startBackgroundBeat(2);
        expect(audio.beatInterval).toBeLessThan(initialInterval);
    });
    
    test('background beat has maximum speed', () => {
        const initialInterval = audio.beatInterval;
        audio.startBackgroundBeat(100);
        expect(audio.beatInterval).toBe(initialInterval / 4);
    });
    
    test('stops background beat', () => {
        audio.startBackgroundBeat(1);
        expect(audio.beatTimer).toBeTruthy();
        audio.stopBackgroundBeat();
        expect(audio.beatTimer).toBeNull();
    });
    
    test('alternates between beat1 and beat2', () => {
        audio.startBackgroundBeat(1);
        expect(audio.currentBeat).toBe(1); // After first beat
        
        // Advance timer
        jest.advanceTimersByTime(audio.beatInterval);
        expect(audio.currentBeat).toBe(0); // After second beat
        
        // Advance timer again
        jest.advanceTimersByTime(audio.beatInterval);
        expect(audio.currentBeat).toBe(1); // Back to first beat
    });
    
    test('reuses audio nodes from pool', () => {
        // Play sound multiple times
        audio.playFireSound();
        audio.playFireSound();
        audio.playFireSound();
        
        // Should reuse nodes from the pool
        const fireNode = audio.pools.fire[0];
        expect(fireNode.source.start).toHaveBeenCalled();
    });
}); 