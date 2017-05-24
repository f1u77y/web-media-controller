'use strict';

/* global BaseConnector */
/* global connect */

function maybe(object, property, def) {
    if (!object) {
        return def;
    } else if (typeof property === 'string') {
        return object[property];
    } else if (typeof property === 'function') {
        return property(object);
    } else {
        throw new TypeError('property must be string or function');
    }
}

class Connector extends BaseConnector {
    constructor() {
        super();
        this.objectPrefix = `${this.objectPrefix}/com/deezer`;
        this.onStateChanged();
        this.observe('#player');
        this.injectScript('vendor/underscore-min.js')
            .then(() => this.injectScript('inject/common.js'))
            .then(() => this.injectScript('inject/deezer.js'));
    }

    get playButton() { return document.querySelector('.control-play'); }
    get prevButton() { return document.querySelector('.control-prev'); }
    get nextButton() { return document.querySelector('.control-next'); }

    getPlaybackStatus() {
        const svg = document.querySelector('.control-play svg');
        if (!svg) return 'stopped';
        const isPlaying = svg.classList.contains('svg-icon-pause');
        return isPlaying ? 'playing' : 'paused';
    }

    get progressHandler() { return document.querySelector('.progress-handler'); }

    getCurrentTime() {
        return maybe(this.progressHandler,
                     ph => parseFloat(ph.getAttribute('aria-valuenow')) * 1000,
                     0);
    }

    getLength() {
        return maybe(this.progressHandler,
                     ph => parseFloat(ph.getAttribute('aria-valuemax')) * 1000,
                     0);
    }

    getArtist() {
        return maybe(document.querySelector('.player-track-artist .player-track-link'),
                     'textContent');
    }

    getAlbum() {
        return this.getFromPage('album');
    }

    getTitle() {
        return maybe(document.querySelector('.player-track-title .player-track-link'),
                          'textContent');
    }

    getVolume() {
        return maybe(document.querySelector('.volume-handler'),
                           elem => elem.getAttribute('aria-valuenow') / 100);
    }

    getArtUrl() {
        return maybe(document.querySelector('#player-cover img'), 'src');
    }

    getTrackId() {
        return this.getFromPage('songId')
            .then((songId) => `${this.objectPrefix}/${songId}`);
    }

    getCanProperties() {
        return Promise.resolve(super.getCanProperties())
            .then(canProperties => {
                const canGoPrevious = !maybe(this.prevButton, 'disabled', false);
                const canGoNext = !maybe(this.prevButton, 'disabled', false);
                return _(canProperties).extend({ canGoPrevious, canGoNext });
            });
    }

    playPause() { maybe(this.playButton, btn => btn.click()); }
    previous() { maybe(this.prevButton, btn => btn.click()); }
    next() { maybe(this.nextButton, btn => btn.click()); }

    setPosition({ trackId, position }) {
        Promise.all([ this.getLength(), this.getTrackId() ])
            .then(([ length, curTrackId ]) => {
                if (curTrackId !== trackId) return;
                this.sendToPage('setPosition', { position, length });
            });
    }

    seek(offset) {
        Promise.all([this.getLength(), this.getCurrentTime()])
            .then((length, position) => {
                this.sendToPage('seek', { offset, length, position });
            });
    }

    setVolume(volume) {
        this.sendToPage('setVolume', volume);
    }
}

connect(new Connector());
