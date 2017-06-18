'use strict';

new class extends BaseConnector {
    constructor() {
        super();
        this.name = 'YouTube';
        this.prefix = '/com/youtube';
        this.query('video')
            .then(video => {
                for (let event of ['timeupdate', 'play', 'pause', 'volumechange']) {
                    video.addEventListener(event, () => this.onStateChanged());
                }
            });
    }

    play() { this.query('video').then(video => video.play()); }
    pause() { this.query('video').then(video => video.pause()); }
    next() { this.query('.ytp-next-button').then(btn => btn.click()); }
    seek(offset) {
        this.query('video').then(video => video.currentTime += offset / 1000);
    }
    set currentTime(currentTime) {
        this.query('video').then(video => video.currentTime = currentTime / 1000);
    }
    set volume(volume) {
        this.query('video').then(video => video.volume = volume);
    }

    get playbackStatus() {
        return this.query('video').then(video => {
            if (video.paused) {
                return 'paused';
            } else {
                return 'playing';
            }
        });
    }

    get currentTime() {
        return this.query('video').then(video => video.currentTime * 1000);
    }

    get volume() {
        return this.query('video').then(video => video.volume);
    }

    get uniqueId() {
        const params = new URLSearchParams(location.search.substr(1));
        return params.get('v');
    }

    get title() {
        return this.query('.ytp-title-link').then(link => link.textContent);
    }

    get length() {
        return this.query('video').then(video => video.duration * 1000);
    }

    get properties() {
        return Promise.resolve(super.properties)
            .then(properties => {
                return _(properties).extend({
                    canStop: false,
                    canGoPrevious: false,
                });
            });
    }
};
