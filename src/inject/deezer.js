import { PageHelper } from 'content/inject-utils';

new class extends PageHelper {
    constructor() {
        super();
        this.tryInitEventListeners();
    }

    tryInitEventListeners() {
        let remainingRetriesNumber = 5;
        if (window.dzPlayer && window.Events) {
            this.initEventListeners();
        } else if (remainingRetriesNumber > 0) {
            remainingRetriesNumber -= 1;
            window.setTimeout(() => {
                this.tryInitEventListeners();
            }, 1000);
        } else {
            console.warn('WMC: failed to init Deezer injected script');
        }
    }

    subscribeToEvent(eventsObject, eventName, propertyNames) {
        eventsObject.subscribe(eventsObject.player[eventName], () => {
            this.sendUpdatedProperties(propertyNames);
        });
    }

    initEventListeners() {
        const ev = window.Events;
        this.subscribeToEvent(ev, 'play', [ 'playbackStatus', 'trackInfo', 'canSeek' ]);
        this.subscribeToEvent(ev, 'paused', ['playbackStatus']);
        this.subscribeToEvent(ev, 'resume', ['playbackStatus']);
        this.subscribeToEvent(ev, 'volume_changed', ['volume']);
        this.subscribeToEvent(ev, 'position', ['currentTime']);
    }

    play() {
        window.dzPlayer.control.play();
    }

    pause() {
        window.dzPlayer.control.pause();
    }

    playPause() {
        window.dzPlayer.control.togglePause();
    }

    get playbackStatus() {
        if (window.dzPlayer.isPlaying()) {
            return 'playing';
        } else if (window.dzPlayer.isPaused()) {
            return 'paused';
        } else {
            return 'stopped';
        }
    }

    next() {
        window.dzPlayer.control.nextSong();
    }

    previous() {
        window.dzPlayer.control.prevSong();
    }

    get trackInfo() {
        const artHash = window.dzPlayer.getCover();
        return {
            artist: window.dzPlayer.getArtistName(),
            title: window.dzPlayer.getSongTitle(),
            album: window.dzPlayer.getAlbumTitle(),
            artUrl: `https://e-cdns-images.dzcdn.net/images/cover/${artHash}/500x500-000000-80-0-0.jpg`,
            length: this.length,
        };
    }

    get length() {
        return window.dzPlayer.getDuration() * 1000;
    }

    get currentTime() {
        return Math.floor((window.dzPlayer.getDuration() - window.dzPlayer.getRemainingTime()) * 1000);
    }

    set currentTime(position) {
        console.log(`WMC: set pos = ${position / this.length}`);
        window.dzPlayer.control.seek(position / this.length);
    }

    get canSeek() {
        return window.dzPlayer.control.canSeek();
    }

    seek(offset) {
        window.dzPlayer.control.seek((this.currentTime + offset) / this.length);
    }

    get volume() {
        return window.dzPlayer.getVolume();
    }

    set volume(volume) {
        window.dzPlayer.control.setVolume(volume);
    }
}();
