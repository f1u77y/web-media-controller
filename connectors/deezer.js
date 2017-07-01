'use strict';

new class extends BaseConnector {
    constructor() {
        super();
        this.name = 'Deezer';

        this.playButtonSelector = '.control-play';
        this.prevButtonSelector = '.control-prev';
        this.nextButtonSelector = '.control-next';
        this.artistsSelector = '.player-track-artist .player-track-link';
        this.titleSelector = '.player-track-title .player-track-link';
        this.artSelector = '#player-cover img';
        this.progressSelector = '.progress-handler';
        this.volumeSelector = '.volume-handler';

        this.timeCoefficient = 1000;
        this.pageGetters = new Set(['album', 'uniqueId']);
        this.pageSetters = new Set(['volume']);

        this.prefix = '/com/deezer';
        this.onStateChanged();
        this.query('#player').then(player => this.observe(player));
        this.injectScripts('vendor/underscore-min.js',
                           'inject/common.js',
                           'inject/deezer.js');
    }

    get playbackStatus() {
        return this.query('.control-play svg').then(svg => {
            const isPlaying = svg.classList.contains('svg-icon-pause');
            return isPlaying ? 'playing' : 'paused';
        });
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

    get currentTime() { return super.currentTime; }

    set currentTime(currentTime) {
        this.length.then((length) => {
            this.sendToPage('set currentTime', { position: currentTime, length });
        });
    }

    seek(offset) {
        Promise.all([this.length, this.currentTime]).then((length, position) => {
            this.sendToPage('seek', { offset, length, position });
        });
    }
};
