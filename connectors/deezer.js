'use strict';

new class extends BaseConnector {
    constructor() {
        super();
        this.prefix = '/com/deezer';
        this.onStateChanged();
        this.query('#player').then(player => this.observe(player));
        this.injectScript('vendor/underscore-min.js')
            .then(() => this.injectScript('inject/common.js'))
            .then(() => this.injectScript('inject/deezer.js'));
    }

    get playbackStatus() {
        return this.query('.control-play svg').then(svg => {
            const isPlaying = svg.classList.contains('svg-icon-pause');
            return isPlaying ? 'playing' : 'paused';
        });
    }

    get currentTime() {
        return this.query('.progress-handler').then(elem => {
            return parseFloat(elem.getAttribute('aria-valuenow')) * 1000;
        });
    }

    get length() {
        return this.query('.progress-handler').then(elem => {
            return parseFloat(elem.getAttribute('aria-valuemax')) * 1000;
        });
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
        return this.query('.player-track-title .player-track-link')
            .then(elem => elem.textContent);
    }

    get volume() {
        return this.query('.volume-handler')
            .then(elem => elem.getAttribute('aria-valuenow') / 100);
    }

    get artUrl() {
        return this.query('#player-cover img').then(img => img.src);
    }

    get uniqueId() {
        return this.getFromPage('songId');
    }

    get properties() {
        const canSeek = this.getFromPage('canSeek');
        const canGoPrevious = this.query('.control-prev').then(btn => !btn.disabled);
        const canGoNext = this.query('.control-next').then(btn => !btn.disabled);
        return Promise.all([super.properties, canSeek, canGoNext, canGoPrevious])
            .then(([properties, canSeek, canGoNext, canGoPrevious]) => {
                return _(properties).extend({ canGoPrevious, canGoNext, canSeek });
            });
    }

    playPause() { this.query('.control-play').then(btn => btn.click()); }
    previous() { this.query('.control-prev').then(btn => btn.click()); }
    next() { this.query('.control-next').then(btn => btn.click()); }

    set currentTime(currentTime) {
        Promise.resolve(this.length).then((length) => {
            this.sendToPage('setPosition', { position: currentTime, length });
        });
    }

    seek(offset) {
        Promise.all([this.length, this.currentTime]).then((length, position) => {
            this.sendToPage('seek', { offset, length, position });
        });
    }

    set volume(volume) {
        this.sendToPage('setVolume', volume);
    }
};
