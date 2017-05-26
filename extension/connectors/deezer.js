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
    get progressHandler() { return document.querySelector('.progress-handler'); }

    get playbackStatus() {
        const svg = document.querySelector('.control-play svg');
        if (!svg) return 'stopped';
        const isPlaying = svg.classList.contains('svg-icon-pause');
        return isPlaying ? 'playing' : 'paused';
    }

    get currentTime() {
        return maybe(this.progressHandler,
                     ph => parseFloat(ph.getAttribute('aria-valuenow')) * 1000,
                     0);
    }

    get length() {
        return maybe(this.progressHandler,
                     ph => parseFloat(ph.getAttribute('aria-valuemax')) * 1000,
                     0);
    }

    get artist() {
        const artistSelector = '.player-track-artist .player-track-link';
        let artists = [];
        for (let node of document.querySelectorAll(artistSelector)) {
            artists.push(node.textContent);
        }
        return artists;
    }

    get album() {
        return this.getFromPage('album');
    }

    get title() {
        return maybe(document.querySelector('.player-track-title .player-track-link'),
                          'textContent');
    }

    get volume() {
        return maybe(document.querySelector('.volume-handler'),
                           elem => elem.getAttribute('aria-valuenow') / 100);
    }

    get artUrl() {
        return maybe(document.querySelector('#player-cover img'), 'src');
    }

    get trackId() {
        return this.getFromPage('songId')
            .then((songId) => `${this.objectPrefix}/${songId}`);
    }

    get canSeek() {
        return this.getFromPage('canSeek');
    }

    get canProperties() {
        return Promise.all([super.canProperties, this.canSeek])
            .then(([canProperties, canSeek]) => {
                const canGoPrevious = !maybe(this.prevButton, 'disabled', false);
                const canGoNext = !maybe(this.nextButton, 'disabled', false);
                return _(canProperties).extend({ canGoPrevious, canGoNext, canSeek });
            });
    }

    playPause() { maybe(this.playButton, btn => btn.click()); }
    previous() { maybe(this.prevButton, btn => btn.click()); }
    next() { maybe(this.nextButton, btn => btn.click()); }

    set position({ trackId, position }) {
        Promise.all([ this.length, this.trackId ])
            .then(([ length, curTrackId ]) => {
                if (curTrackId !== trackId) return;
                this.sendToPage('setPosition', { position, length });
            });
    }

    seek(offset) {
        Promise.all([this.length(), this.currentTime()])
            .then((length, position) => {
                this.sendToPage('seek', { offset, length, position });
            });
    }

    set volume(volume) {
        this.sendToPage('setVolume', volume);
    }
}

connect(new Connector());
