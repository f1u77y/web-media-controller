'use strict';

import BaseConnector from 'content/base-connector';
import Utils from 'content/utils';
import _ from 'underscore';

new class extends BaseConnector {
    constructor() {
        super();
        this.name = 'JazzRadio';
        this.prefix = '/com/jazzradio';
        this.artistSelector = '.artist-name';
        this.titleSelector = '.track-name';
        this.lengthSelector = '.total';
        this.currentTimeSelector = '.time';
        this.artSelector = '#art';

        Utils.query('#row-player-controls').then(elem => this.observe(elem));
    }

    get playbackStatus() {
        return Utils.query('#play-button a').then(icon => {
            if (icon.classList.contains('icon-pause')) {
                return 'playing';
            } else {
                return 'paused';
            }
        });
    }
    get controlsInfo() {
        return Promise.resolve({
            canGoNext: false,
            canGoPrevious: false,
            canPlay: true,
            canPause: true,
            canSeek: false,
            canControl: true,
        });
    }
    playPause() {
        this.playbackStatus.then((status) => {
            if (status === 'playing') {
                Utils.queryClick('.icon-pause');
            } else {
                Utils.queryClick('.icon-play');
            }
        });
    }
    get artist() {
        return Utils.query(this.artistSelector)
            .then(node => node.textContent.trim().replace(/ -$/, ''));
    }
};
