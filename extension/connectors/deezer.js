'use strict';

/* global BaseConnector */
/* global connect */

class Connector extends BaseConnector {
    constructor(properties) {
        super(properties);
        this.onStateChanged();
        this.observe('#player');
    }

    get playButton() { return document.querySelector('.control-play'); }
    get prevButton() { return document.querySelector('.control-prev'); }
    get nextButton() { return document.querySelector('.control-next'); }

    isPlaying() {
        const svg = document.querySelector('.control-play svg');
        return svg ? svg.classList.contains('svg-icon-pause') : false;
    }

    get progressHandler() { return document.querySelector('.progress-handler'); }

    getCurrentTime() {
        const ph = this.progressHandler;
        const secs = ph ? parseFloat(ph.getAttribute('aria-valuenow')) : 0;
        return secs * 1000;
    }

    getLength() {
        const ph = this.progressHandler;
        const secs = ph ? parseFloat(ph.getAttribute('aria-valuemax')) : 0;
        return secs * 1000;
    }

    getArtist() {
        const elem = document.querySelector('.player-track-artist .player-track-link');
        return elem ? elem.textContent : undefined;
    }

    getTitle() {
        const elem = document.querySelector('.player-track-title .player-track-link');
        return elem ? elem.textContent : undefined;
    }

    getVolume() {
        const elem = document.querySelector('.volume-handler');
        return elem ? elem.getAttribute('aria-valuenow') / 100 : 1;
    }

    getArtUrl() {
        const elem = document.querySelector('#player-cover img');
        return elem ? elem.src : undefined;
    }

    getCanProperties() {
        return Promise.resolve(super.getCanProperties())
            .then(canProperties => {
                const canGoPrevious = !this.getAttrIfExists(this.prevButton,
                                                            'disabled',
                                                            false);
                const canGoNext = !this.getAttrIfExists(this.nextButton,
                                                        'disabled',
                                                        false);
                const canSeek = false;
                return _(canProperties).extend({ canGoPrevious, canGoNext, canSeek });
            });
    }

    getAttrIfExists(elem, attr, def) {
        if (elem == null) return def;
        return elem[attr];
    }

    clickIfExists(elem) { if (elem) elem.click(); }

    playPause() { this.clickIfExists(this.playButton); }
    previous() { this.clickIfExists(this.prevButton); }
    next() { this.clickIfExists(this.nextButton); }
}

connect(new Connector());
