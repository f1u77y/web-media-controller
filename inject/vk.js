'use strict';

(new class extends PageHelper {
    constructor() {
        super();
        this.e = 35;
        this.playbackStatus = 'stopped';
    }

    logVolume(num) {
        return (Math.pow(this.e, num) - 1) / (this.e - 1);
    }

    unlogVolume(num) {
        return Math.log(1 + num * (this.e - 1)) / Math.log(this.e);
    }

    set volume(volume) {
        window.ap.setVolume(this.logVolume(volume));
    }

    get volume() {
        return this.unlogVolume(window.ap.getVolume());
    }

    get audioElement() {
        return window.ap._impl._currentAudioEl || {};
    }

    get trackInfo() {
        function last(array) {
            return array[array.length - 1];
        }

        const infoIndex = {
            artist: 4,
            title: 3,
            length: 5,
            artUrl: 14,
        };
        const audioObject = window.ap._currentAudio;
        let trackInfo = {
            artist: audioObject[infoIndex.artist],
            title: audioObject[infoIndex.title],
            length: audioObject[infoIndex.length] * 1000,
        };
        if (audioObject[infoIndex.artUrl]) {
            trackInfo.artUrl = last(audioObject[infoIndex.artUrl].split(','));
        }
        return trackInfo;
    }

    get currentTime() {
        let {currentTime} = this.audioElement;
        return (currentTime || 0) * 1000;
    }

    handlePlayerEvent(event) {
        let scope = {
            volume: null,
            trackInfo: this.trackInfo,
            currentTime: this.currentTime,
            playbackStatus: null,
        };
        switch (event) {
        case 'start':
            scope.playbackStatus = 'playing';
            break;
        case 'stop':
            scope.playbackStatus = 'stopped';
            break;
        case 'pause':
            scope.playbackStatus = 'paused';
            break;
        case 'volume':
            scope.volume = this.volume;
            break;
        }

        if (scope.playbackStatus != null) {
            this.playbackStatus = scope.playbackStatus;
        }
        this.changeProperties(Object.keys(scope).filter(name => scope[name] != null));
    }

    start() {
        if (!this.canStart()) return;

        this.addListener('play', () => window.ap.play());
        this.addListener('pause', () => window.ap.pause());
        this.addListener('playPause', () => {
            if (window.ap.isPlaying()) {
                window.ap.pause();
            } else {
                window.ap.play();
            }
        });
        this.addListener('stop', () => window.ap.stop());
        this.addListener('next', () => window.ap.playNext());
        this.addListener('previous', () => window.ap.playPrev());
        this.addListener('seek', offset => this.audioElement.currentTime += offset/1000);
        this.addListener('set position', pos => this.audioElement.currentTime = pos/1000);
        this.addListener('set volume', volume => this.volume = volume);

        this.addGetter('playbackStatus', () => this.playbackStatus);
        this.addGetter('volume', () => this.volume);
        this.addGetter('trackInfo', () => this.trackInfo);
        this.addGetter('currentTime', () => this.currentTime);
        this.addGetter('uniqueId', () => window.ap.getCurrentAudio()[0]);

        this.changeProperties(['volume', 'playbackStatus']);

        for (let event of ['start', 'pause', 'stop', 'volume', 'progress']) {
            const ev = event;
            window.ap.subscribers.push({
                et: ev,
                cb: () => this.handlePlayerEvent(ev),
            });
        }
    }
}).start();
