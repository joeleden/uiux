// Audio Engine for Sound Mixer App
class AudioEngine {
    constructor() {
        this.audioContext = null;
        this.sounds = new Map();
        this.activeTracks = new Map();
        this.masterGain = null;
        this.isPlaying = false;
        this.loopInterval = null;
        
        this.initAudioContext();
    }

    async initAudioContext() {
        try {
            this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
            this.masterGain = this.audioContext.createGain();
            this.masterGain.connect(this.audioContext.destination);
            this.masterGain.gain.value = 0.7; // Master volume control
        } catch (error) {
            console.error('Error initializing audio context:', error);
        }
    }

    async loadSound(name, url, category) {
        try {
            const response = await fetch(url);
            const arrayBuffer = await response.arrayBuffer();
            const audioBuffer = await this.audioContext.decodeAudioData(arrayBuffer);
            
            this.sounds.set(name, {
                buffer: audioBuffer,
                category: category,
                url: url
            });
            
            return true;
        } catch (error) {
            console.error(`Error loading sound ${name}:`, error);
            return false;
        }
    }

    async loadSampleSounds() {
        const sampleSounds = [
            // Instruments
            { name: 'Piano', emoji: '🎹', category: 'instruments', url: this.generateTone(440, 2, 'sine') },
            { name: 'Guitar', emoji: '🎸', category: 'instruments', url: this.generateTone(220, 2, 'sawtooth') },
            { name: 'Drums', emoji: '🥁', category: 'instruments', url: this.generateTone(60, 0.5, 'square') },
            { name: 'Bass', emoji: '🎸', category: 'instruments', url: this.generateTone(110, 2, 'triangle') },
            { name: 'Violin', emoji: '🎻', category: 'instruments', url: this.generateTone(880, 2, 'sine') },
            { name: 'Trumpet', emoji: '🎺', category: 'instruments', url: this.generateTone(330, 2, 'sawtooth') },
            
            // Environmental
            { name: 'Rain', emoji: '🌧️', category: 'environmental', url: this.generateNoise(2, 'brown') },
            { name: 'Wind', emoji: '💨', category: 'environmental', url: this.generateNoise(2, 'white') },
            { name: 'Birds', emoji: '🐦', category: 'environmental', url: this.generateTone(1760, 1, 'sine') },
            { name: 'Ocean', emoji: '🌊', category: 'environmental', url: this.generateNoise(2, 'pink') },
            { name: 'Fire', emoji: '🔥', category: 'environmental', url: this.generateNoise(1, 'white') },
            { name: 'Thunder', emoji: '⛈️', category: 'environmental', url: this.generateTone(55, 0.3, 'square') }
        ];

        for (const sound of sampleSounds) {
            await this.loadSound(sound.name, sound.url, sound.category);
        }
    }

    generateTone(frequency, duration, waveType) {
        // Create a data URL for a generated tone
        const sampleRate = 44100;
        const length = sampleRate * duration;
        const buffer = new ArrayBuffer(44 + length * 2);
        const view = new DataView(buffer);
        
        // WAV header
        const writeString = (offset, string) => {
            for (let i = 0; i < string.length; i++) {
                view.setUint8(offset + i, string.charCodeAt(i));
            }
        };
        
        writeString(0, 'RIFF');
        view.setUint32(4, 36 + length * 2, true);
        writeString(8, 'WAVE');
        writeString(12, 'fmt ');
        view.setUint32(16, 16, true);
        view.setUint16(20, 1, true);
        view.setUint16(22, 1, true);
        view.setUint32(24, sampleRate, true);
        view.setUint32(28, sampleRate * 2, true);
        view.setUint16(32, 2, true);
        view.setUint16(34, 16, true);
        writeString(36, 'data');
        view.setUint32(40, length * 2, true);
        
        // Generate audio data
        for (let i = 0; i < length; i++) {
            let sample = 0;
            const t = i / sampleRate;
            
            switch (waveType) {
                case 'sine':
                    sample = Math.sin(2 * Math.PI * frequency * t);
                    break;
                case 'square':
                    sample = Math.sin(2 * Math.PI * frequency * t) > 0 ? 1 : -1;
                    break;
                case 'sawtooth':
                    sample = 2 * (t * frequency - Math.floor(t * frequency + 0.5));
                    break;
                case 'triangle':
                    sample = 2 * Math.abs(2 * (t * frequency - Math.floor(t * frequency + 0.5))) - 1;
                    break;
            }
            
            // Apply envelope
            const envelope = Math.exp(-t * 2);
            sample *= envelope * 0.3;
            
            view.setInt16(44 + i * 2, sample * 32767, true);
        }
        
        const blob = new Blob([buffer], { type: 'audio/wav' });
        return URL.createObjectURL(blob);
    }

    generateNoise(duration, type) {
        const sampleRate = 44100;
        const length = sampleRate * duration;
        const buffer = new ArrayBuffer(44 + length * 2);
        const view = new DataView(buffer);
        
        // WAV header (same as above)
        const writeString = (offset, string) => {
            for (let i = 0; i < string.length; i++) {
                view.setUint8(offset + i, string.charCodeAt(i));
            }
        };
        
        writeString(0, 'RIFF');
        view.setUint32(4, 36 + length * 2, true);
        writeString(8, 'WAVE');
        writeString(12, 'fmt ');
        view.setUint32(16, 16, true);
        view.setUint16(20, 1, true);
        view.setUint16(22, 1, true);
        view.setUint32(24, sampleRate, true);
        view.setUint32(28, sampleRate * 2, true);
        view.setUint16(32, 2, true);
        view.setUint16(34, 16, true);
        writeString(36, 'data');
        view.setUint32(40, length * 2, true);
        
        // Generate noise
        for (let i = 0; i < length; i++) {
            let sample = (Math.random() * 2 - 1);
            
            // Apply filtering based on noise type
            if (type === 'brown') {
                // Brown noise (1/f^2)
                sample *= Math.pow(i / length, 0.5);
            } else if (type === 'pink') {
                // Pink noise (1/f)
                sample *= Math.pow(i / length, 0.25);
            }
            
            // Apply envelope
            const envelope = Math.exp(-i / (sampleRate * 0.5));
            sample *= envelope * 0.1;
            
            view.setInt16(44 + i * 2, sample * 32767, true);
        }
        
        const blob = new Blob([buffer], { type: 'audio/wav' });
        return URL.createObjectURL(blob);
    }

    addTrack(soundName) {
        if (!this.sounds.has(soundName)) {
            console.error(`Sound ${soundName} not found`);
            return false;
        }

        const trackId = Date.now() + Math.random();
        const sound = this.sounds.get(soundName);
        
        this.activeTracks.set(trackId, {
            soundName: soundName,
            sound: sound,
            gainNode: null,
            source: null,
            volume: 0.5,
            isPlaying: false
        });

        return trackId;
    }

    removeTrack(trackId) {
        if (this.activeTracks.has(trackId)) {
            const track = this.activeTracks.get(trackId);
            if (track.source) {
                track.source.stop();
            }
            this.activeTracks.delete(trackId);
            return true;
        }
        return false;
    }

    playTrack(trackId) {
        const track = this.activeTracks.get(trackId);
        if (!track || track.isPlaying) return;

        try {
            if (this.audioContext.state === 'suspended') {
                this.audioContext.resume();
            }

            track.source = this.audioContext.createBufferSource();
            track.gainNode = this.audioContext.createGain();
            
            track.source.buffer = track.sound.buffer;
            track.source.loop = true;
            track.gainNode.gain.value = track.volume;
            
            track.source.connect(track.gainNode);
            track.gainNode.connect(this.masterGain);
            
            track.source.start();
            track.isPlaying = true;
        } catch (error) {
            console.error('Error playing track:', error);
        }
    }

    stopTrack(trackId) {
        const track = this.activeTracks.get(trackId);
        if (!track || !track.isPlaying) return;

        try {
            track.source.stop();
            track.isPlaying = false;
        } catch (error) {
            console.error('Error stopping track:', error);
        }
    }

    setTrackVolume(trackId, volume) {
        const track = this.activeTracks.get(trackId);
        if (track) {
            track.volume = Math.max(0, Math.min(1, volume));
            if (track.gainNode) {
                track.gainNode.gain.value = track.volume;
            }
        }
    }

    playAll() {
        if (this.isPlaying) return;
        
        this.isPlaying = true;
        for (const [trackId, track] of this.activeTracks) {
            this.playTrack(trackId);
        }
    }

    stopAll() {
        this.isPlaying = false;
        for (const [trackId, track] of this.activeTracks) {
            this.stopTrack(trackId);
        }
    }

    getActiveTracks() {
        return Array.from(this.activeTracks.entries()).map(([id, track]) => ({
            id: id,
            soundName: track.soundName,
            volume: track.volume,
            isPlaying: track.isPlaying
        }));
    }

    exportMix() {
        // This would export the current mix as audio
        // For now, we'll return a simple representation
        const tracks = this.getActiveTracks();
        return {
            tracks: tracks,
            timestamp: Date.now()
        };
    }

    importMix(mixData) {
        // Clear existing tracks
        this.stopAll();
        this.activeTracks.clear();
        
        // Add tracks from mix data
        for (const trackData of mixData.tracks) {
            const trackId = this.addTrack(trackData.soundName);
            if (trackId) {
                this.setTrackVolume(trackId, trackData.volume);
            }
        }
    }
}

// Export for use in other files
window.AudioEngine = AudioEngine;