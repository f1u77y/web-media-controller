'use strict';

connect(new class extends BaseConnector {
    constructor() {
        super();
        this.prefix = '/moe/listen';
        this.lastTrackInfo = null;
        this.lastUniqueId = null;
        this.webSocket = this.createWebSocket();
        this.query('.player-wrapper').then(elem => this.observe(elem));
    }

    playPause() {
        this.query('.player-button').then(btn => btn.click());
    }

    get playbackStatus() {
        return this.query('.player-icon').then(icon => {
            if (icon.id === 'pause') {
                return 'playing';
            } else {
                return 'paused';
            }
        });
    }

    get canProperties() {
        return Promise.resolve(super.canProperties)
            .then(canProperties => _(canProperties).extendOwn({
                canGoPrevious: false,
                canGoNext: false,
                canSeek: false,
            }));
    }

    get trackInfo() {
        return Promise.resolve(this.trackId).then(trackId => {
            return _(_(this.lastTrackInfo).clone()).extend({ trackId });
        });
    }
    get uniqueId() { return this.lastUniqueId; }

    createWebSocket() {
        const webSocket = new WebSocket('wss://listen.moe/api/v2/socket');
        webSocket.addEventListener('message', ({ data }) => {
            try {
                const song = JSON.parse(data);
                this.lastTrackInfo = {
                    artist: song.artist_name,
                    album: song.anime_name,
                    title: song.song_name,
                };
                this.lastUniqueId = song.song_id;
                this.onStateChanged();
            } catch (SyntaxError) {
                console.log('err');
            }
        });
        webSocket.addEventListener('close', () => setTimeout(() => {
            this.webSocket = this.createWebSocket();
        }, 1000));
        return webSocket;
    }
});
