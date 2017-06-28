'use strict';

new class extends BaseConnector {
    constructor() {
        super();

        this.name = 'Google Play Music';
        this.prefix = '/com/google';
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

    get artist() {
        return this.query('#player-artist').then(elem => {
            return elem.textContent;
        });
    }

    get title() {
        return this.query('#currently-playing-title').then(elem => {
            return elem.textContent;
        });
    }

    get album() {
        return this.query('.player-album').then(elem => {
            return elem.textContent;
        });
    }

    get artUrl() {
        return this.query('#playerBarArt').then(elem => {
            if (elem) {
                return elem.src.replace('=s90-c-e100', '');
            }

            return null;
        });
    }

    get currentTime() {
        return this.query('#material-player-progress').then(elem => {
            return parseFloat(elem.getAttribute('aria-valuenow'));
        });
    }

    get length() {
        return this.query('#material-player-progress').then(elem => {
            return parseFloat(elem.getAttribute('aria-valuemax'));
        });
    }

    get volume() {
        return this.query('#material-vslider').then(elem => {
            return parseFloat(elem.getAttribute('aria-valuenow')) / 100;
        });
    }

    playPause() {
        this.query('#player-bar-play-pause').then(btn => btn.click());
    }

    next() {
        this.query('#player-bar-forward').then(btn => btn.click());
    }

    previous() {
        this.query('#player-bar-rewind').then(btn => btn.click());
    }
};
