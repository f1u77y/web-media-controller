'use strict';

/* global BaseConnector */
/* global connect       */

connect(new class extends BaseConnector {
    constructor() {
        super();
        this.objectPrefix = `${this.objectPrefix}/com/youtube`;
        this.query('video')
            .then(video => {
                for (let event of ['timeupdate', 'play', 'pause', 'volumechange']) {
                    video.addEventListener(event, () => this.onStateChanged());
                }
            });
    }

    query(selector) {
        return new Promise((resolve) => {
            const elem = document.querySelector(selector);
            if (elem) {
                resolve(elem);
            } else {
                const waitObserver = new MutationObserver((mutations, observer) => {
                    const elem = document.querySelector(selector);
                    if (elem) {
                        observer.disconnect();
                        resolve(elem);
                    }
                });
                waitObserver.observe({
                    childList: true,
                    subtree: true,
                    attributes: true,
                    characterData: true,
                });
            }
        });
    }

    get nextButton() {
        return document.querySelector('.ytp-next-button');
    }

    play() { this.query('video').then(video => video.play()); }
    pause() { this.query('video').then(video => video.pause()); }
    next() { this.query('.ytp-next-button').then(btn => btn.click()); }
    seek(offset) { this.query('video').then(
        video => video.currentTime += offset / 1000
    ); }

    set position({ trackId, position }) {
        Promise.resolve(this.trackId)
            .then(curTrackId => {
                if (trackId !== curTrackId) return;
                this.query('video').then(video => {
                    video.currentTime = position / 1000;
                });
            });
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

    get trackId() {
        const params = new URLSearchParams(location.search.substr(1));
        return `${this.objectPrefix}/${params.get('v') || 'CurrentTrack'}`;
    }

    get title() {
        return this.query('.ytp-title-link').then(link => link.textContent);
    }

    get length() {
        return this.query('video').then(video => video.duration * 1000);
    }

    get canProperties() {
        return Promise.resolve(super.canProperties)
            .then(canProperties => {
                return _(canProperties).extend({
                    canStop: false,
                    canGoPrevious: false,
                });
            });
    }
});
