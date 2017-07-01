'use strict';

new class extends BaseConnector {
    constructor() {
        super();
        this.name = 'listen.moe';
        this.prefix = '/moe/listen';
        this.lastTrackInfo = null;
        this.lastUniqueId = null;
        this.webSocket = this.createWebSocket();
        Utils.query('.player-wrapper').then(elem => this.observe(elem));

        this.playButtonSelector = '.player-button';
    }

    get playbackStatus() {
        return Utils.query('.player-icon').then(icon => {
            if (icon.id === 'pause') {
                return 'playing';
            } else {
                return 'paused';
            }
        });
    }

    get properties() {
        super.properties.then(properties => _(properties).extendOwn({
            canGoPrevious: false,
            canGoNext: false,
            canSeek: false,
        }));
    }

    get trackInfo() {
        return this.trackId.then(trackId => {
            return _(_(this.lastTrackInfo).clone()).extend({ trackId });
        });
    }
    get uniqueId() { return Promise.resolve(this.lastUniqueId); }

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
                // Socket sometimes sends bad messages. It's normal, so we
                // just ignore them
            }
        });
        webSocket.addEventListener('close', () => setTimeout(() => {
            this.webSocket = this.createWebSocket();
        }, 1000));
        return webSocket;
    }
};
