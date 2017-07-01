'use strict';

new class extends BaseConnector {
    constructor() {
        super();

        this.name = 'Google Play Music';
        this.prefix = '/com/google';

        this.artistSelector = '#player-artist';
        this.titleSelector = '#currently-playing-title';
        this.albumSelector = '.player-album';
        this.progressSelector = '#material-player-progress';
        this.volumeSelector = '#material-vslider';
        this.artSelector = '#playerBarArt';

        this.playButtonSelector = '#player-bar-play-pause';
        this.prevButtonSelector = '#player-bar-rewind';
        this.nextButtonSelector = '#player-bar-forward';

        this.query('#player').then(elem => this.observe(elem));
    }

    get playbackStatus() {
        return this.query('#player-bar-play-pause').then(icon => {
            if (icon.classList.contains('playing')) {
                return 'playing';
            } else {
                return 'paused';
            }
        });
    }

    get artUrl() {
        return Promise.resolve(super.artUrl)
            .then(url => url.replace('=s90-c-e100', ''));
    }
};
