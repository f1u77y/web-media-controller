'use strict';

/* global BaseConnector */
/* global connect */

class Connector extends BaseConnector {
    constructor() {
        super();
        this.objectPrefix = `${this.objectPrefix}/moe/listen`;
        this.lastTrackInfo = null;
        this.webSocket = this.createWebSocket();
        this.observe('.player-wrapper');
    }

    playPause() {
        document.querySelector('.player-button').click();
    }

    get playbackStatus() {
        const icon = document.querySelector('.player-icon');
        let status = null;
        if (!icon) {
            status = 'stopped';
        } else if (icon.id === 'pause') {
            status = 'playing';
        } else {
            status = 'paused';
        }
        return status;
    }

    get canProperties() {
        return Promise.resolve(super.canProperties)
            .then(canProperties => _(canProperties).extendOwn({
                canGoPrevious: false,
                canGoNext: false,
                canSeek: false,
            }));
    }

    get trackInfo() { return this.lastTrackInfo; }

    createWebSocket() {
        const webSocket = new WebSocket('wss://listen.moe/api/v2/socket');
        webSocket.addEventListener('message', ({ data }) => {
            try {
                const song = JSON.parse(data);
                this.lastTrackInfo = {
                    artist: song.artist_name,
                    album: song.anime_name,
                    title: song.song_name,
                    trackId: `${this.objectPrefix}/${song.song_id}`,
                };
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
}

connect(new Connector());
