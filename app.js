// Main Application Logic
class SoundMixerApp {
    constructor() {
        this.audioEngine = new AudioEngine();
        this.savedMixes = JSON.parse(localStorage.getItem('savedMixes') || '[]');
        this.currentMixId = null;
        
        this.init();
    }

    async init() {
        this.setupEventListeners();
        await this.loadSounds();
        this.renderSoundLibrary();
        this.renderMixingBoard();
        this.hideLoading();
    }

    setupEventListeners() {
        // Header controls
        document.getElementById('playAllBtn').addEventListener('click', () => this.playAll());
        document.getElementById('stopAllBtn').addEventListener('click', () => this.stopAll());
        document.getElementById('saveBtn').addEventListener('click', () => this.showSaveModal());
        document.getElementById('shareBtn').addEventListener('click', () => this.showShareModal());

        // Modal controls
        document.getElementById('confirmSave').addEventListener('click', () => this.saveMix());
        document.getElementById('cancelSave').addEventListener('click', () => this.hideSaveModal());
        document.getElementById('copyLink').addEventListener('click', () => this.copyShareLink());
        document.getElementById('downloadAudio').addEventListener('click', () => this.downloadAudio());

        // Modal close buttons
        document.querySelectorAll('.close').forEach(closeBtn => {
            closeBtn.addEventListener('click', (e) => {
                const modal = e.target.closest('.modal');
                modal.style.display = 'none';
            });
        });

        // Close modals when clicking outside
        window.addEventListener('click', (e) => {
            if (e.target.classList.contains('modal')) {
                e.target.style.display = 'none';
            }
        });

        // Handle keyboard shortcuts
        document.addEventListener('keydown', (e) => {
            if (e.code === 'Space' && !e.target.matches('input, textarea')) {
                e.preventDefault();
                if (this.audioEngine.isPlaying) {
                    this.stopAll();
                } else {
                    this.playAll();
                }
            }
        });
    }

    async loadSounds() {
        try {
            await this.audioEngine.loadSampleSounds();
        } catch (error) {
            console.error('Error loading sounds:', error);
            this.showError('Failed to load sounds. Please refresh the page.');
        }
    }

    renderSoundLibrary() {
        const instrumentsGrid = document.getElementById('instruments-grid');
        const environmentalGrid = document.getElementById('environmental-grid');
        
        instrumentsGrid.innerHTML = '';
        environmentalGrid.innerHTML = '';

        // Sample sound data
        const soundData = [
            { name: 'Piano', emoji: '🎹', category: 'instruments' },
            { name: 'Guitar', emoji: '🎸', category: 'instruments' },
            { name: 'Drums', emoji: '🥁', category: 'instruments' },
            { name: 'Bass', emoji: '🎸', category: 'instruments' },
            { name: 'Violin', emoji: '🎻', category: 'instruments' },
            { name: 'Trumpet', emoji: '🎺', category: 'instruments' },
            { name: 'Rain', emoji: '🌧️', category: 'environmental' },
            { name: 'Wind', emoji: '💨', category: 'environmental' },
            { name: 'Birds', emoji: '🐦', category: 'environmental' },
            { name: 'Ocean', emoji: '🌊', category: 'environmental' },
            { name: 'Fire', emoji: '🔥', category: 'environmental' },
            { name: 'Thunder', emoji: '⛈️', category: 'environmental' }
        ];

        soundData.forEach(sound => {
            const soundElement = this.createSoundElement(sound);
            
            if (sound.category === 'instruments') {
                instrumentsGrid.appendChild(soundElement);
            } else {
                environmentalGrid.appendChild(soundElement);
            }
        });
    }

    createSoundElement(sound) {
        const soundDiv = document.createElement('div');
        soundDiv.className = 'sound-item';
        soundDiv.innerHTML = `
            <span class="emoji">${sound.emoji}</span>
            <span class="name">${sound.name}</span>
        `;
        
        soundDiv.addEventListener('click', () => this.addSoundToMix(sound.name));
        
        return soundDiv;
    }

    addSoundToMix(soundName) {
        const trackId = this.audioEngine.addTrack(soundName);
        if (trackId) {
            this.renderMixingBoard();
            this.animateSoundItem(soundName);
        }
    }

    animateSoundItem(soundName) {
        const soundItems = document.querySelectorAll('.sound-item');
        soundItems.forEach(item => {
            if (item.textContent.includes(soundName)) {
                item.classList.add('playing');
                setTimeout(() => {
                    item.classList.remove('playing');
                }, 1000);
            }
        });
    }

    renderMixingBoard() {
        const mixTracks = document.getElementById('mix-tracks');
        const activeTracks = this.audioEngine.getActiveTracks();
        
        if (activeTracks.length === 0) {
            mixTracks.innerHTML = `
                <div class="empty-mix">
                    <span class="emoji">🎵</span>
                    <p>Add sounds from the library above to start mixing!</p>
                </div>
            `;
            return;
        }

        mixTracks.innerHTML = '';
        
        activeTracks.forEach(track => {
            const trackElement = this.createTrackElement(track);
            mixTracks.appendChild(trackElement);
        });
    }

    createTrackElement(track) {
        const trackDiv = document.createElement('div');
        trackDiv.className = 'mix-track';
        trackDiv.dataset.trackId = track.id;
        
        // Get emoji for the sound
        const soundEmojis = {
            'Piano': '🎹', 'Guitar': '🎸', 'Drums': '🥁', 'Bass': '🎸',
            'Violin': '🎻', 'Trumpet': '🎺', 'Rain': '🌧️', 'Wind': '💨',
            'Birds': '🐦', 'Ocean': '🌊', 'Fire': '🔥', 'Thunder': '⛈️'
        };
        
        const emoji = soundEmojis[track.soundName] || '🎵';
        
        trackDiv.innerHTML = `
            <div class="track-info">
                <span class="track-emoji">${emoji}</span>
                <span class="track-name">${track.soundName}</span>
            </div>
            <div class="track-controls">
                <button class="track-btn ${track.isPlaying ? 'pause' : 'play'}" 
                        data-action="${track.isPlaying ? 'pause' : 'play'}">
                    ${track.isPlaying ? '⏸️' : '▶️'}
                </button>
                <input type="range" class="volume-slider" min="0" max="1" step="0.1" 
                       value="${track.volume}" data-action="volume">
                <button class="track-btn remove" data-action="remove">❌</button>
            </div>
        `;
        
        // Add event listeners
        const playBtn = trackDiv.querySelector('[data-action="play"], [data-action="pause"]');
        const volumeSlider = trackDiv.querySelector('[data-action="volume"]');
        const removeBtn = trackDiv.querySelector('[data-action="remove"]');
        
        playBtn.addEventListener('click', () => this.toggleTrack(track.id));
        volumeSlider.addEventListener('input', (e) => this.setTrackVolume(track.id, parseFloat(e.target.value)));
        removeBtn.addEventListener('click', () => this.removeTrack(track.id));
        
        return trackDiv;
    }

    toggleTrack(trackId) {
        const track = this.audioEngine.activeTracks.get(trackId);
        if (track.isPlaying) {
            this.audioEngine.stopTrack(trackId);
        } else {
            this.audioEngine.playTrack(trackId);
        }
        this.renderMixingBoard();
    }

    setTrackVolume(trackId, volume) {
        this.audioEngine.setTrackVolume(trackId, volume);
    }

    removeTrack(trackId) {
        this.audioEngine.removeTrack(trackId);
        this.renderMixingBoard();
    }

    playAll() {
        this.audioEngine.playAll();
        this.renderMixingBoard();
        this.updatePlayButton(true);
    }

    stopAll() {
        this.audioEngine.stopAll();
        this.renderMixingBoard();
        this.updatePlayButton(false);
    }

    updatePlayButton(isPlaying) {
        const playBtn = document.getElementById('playAllBtn');
        playBtn.textContent = isPlaying ? '⏸️ Pause All' : '▶️ Play All';
    }

    showSaveModal() {
        document.getElementById('saveModal').style.display = 'block';
        document.getElementById('mixName').focus();
    }

    hideSaveModal() {
        document.getElementById('saveModal').style.display = 'none';
        document.getElementById('mixName').value = '';
    }

    saveMix() {
        const mixName = document.getElementById('mixName').value.trim();
        if (!mixName) {
            alert('Please enter a name for your mix!');
            return;
        }

        const mixData = {
            id: Date.now(),
            name: mixName,
            data: this.audioEngine.exportMix(),
            createdAt: new Date().toISOString()
        };

        this.savedMixes.push(mixData);
        localStorage.setItem('savedMixes', JSON.stringify(this.savedMixes));
        
        this.hideSaveModal();
        this.showSuccess(`Mix "${mixName}" saved successfully!`);
    }

    showShareModal() {
        document.getElementById('shareModal').style.display = 'block';
    }

    copyShareLink() {
        const mixData = this.audioEngine.exportMix();
        const shareData = {
            type: 'soundmixer',
            version: '1.0',
            mix: mixData,
            timestamp: Date.now()
        };
        
        const shareString = btoa(JSON.stringify(shareData));
        const shareUrl = `${window.location.origin}${window.location.pathname}?mix=${shareString}`;
        
        navigator.clipboard.writeText(shareUrl).then(() => {
            this.showSuccess('Share link copied to clipboard!');
        }).catch(() => {
            // Fallback for older browsers
            const linkInput = document.getElementById('linkInput');
            const shareLink = document.getElementById('shareLink');
            
            linkInput.value = shareUrl;
            shareLink.style.display = 'block';
            linkInput.select();
        });
    }

    downloadAudio() {
        // For now, we'll create a simple text file with the mix data
        const mixData = this.audioEngine.exportMix();
        const dataStr = JSON.stringify(mixData, null, 2);
        const dataBlob = new Blob([dataStr], { type: 'application/json' });
        
        const link = document.createElement('a');
        link.href = URL.createObjectURL(dataBlob);
        link.download = `sound-mix-${Date.now()}.json`;
        link.click();
        
        this.showSuccess('Mix data downloaded!');
    }

    hideLoading() {
        document.getElementById('loading').style.display = 'none';
    }

    showSuccess(message) {
        // Simple success notification
        const notification = document.createElement('div');
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: #4ecdc4;
            color: white;
            padding: 1rem 1.5rem;
            border-radius: 10px;
            box-shadow: 0 4px 15px rgba(0,0,0,0.2);
            z-index: 10000;
            font-weight: 600;
        `;
        notification.textContent = message;
        document.body.appendChild(notification);
        
        setTimeout(() => {
            notification.remove();
        }, 3000);
    }

    showError(message) {
        const notification = document.createElement('div');
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: #ff6b6b;
            color: white;
            padding: 1rem 1.5rem;
            border-radius: 10px;
            box-shadow: 0 4px 15px rgba(0,0,0,0.2);
            z-index: 10000;
            font-weight: 600;
        `;
        notification.textContent = message;
        document.body.appendChild(notification);
        
        setTimeout(() => {
            notification.remove();
        }, 5000);
    }

    // Load mix from URL parameters
    loadMixFromUrl() {
        const urlParams = new URLSearchParams(window.location.search);
        const mixParam = urlParams.get('mix');
        
        if (mixParam) {
            try {
                const shareData = JSON.parse(atob(mixParam));
                if (shareData.type === 'soundmixer' && shareData.mix) {
                    this.audioEngine.importMix(shareData.mix);
                    this.renderMixingBoard();
                    this.showSuccess('Mix loaded from share link!');
                }
            } catch (error) {
                console.error('Error loading mix from URL:', error);
            }
        }
    }
}

// Initialize the app when the page loads
document.addEventListener('DOMContentLoaded', () => {
    const app = new SoundMixerApp();
    
    // Load mix from URL if present
    app.loadMixFromUrl();
    
    // Make app globally available for debugging
    window.soundMixerApp = app;
});