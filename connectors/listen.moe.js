'use strict';

import BaseConnector from 'content/base-connector';
import Utils from 'content/utils';
import _ from 'underscore';
import MetadataFilter from 'content/filter';

new class extends BaseConnector {
    constructor() {
        super();
        this.name = 'listen.moe';
        this.prefix = '/moe/listen';

        this.artistsSelector = '.hero-body .player .player-song-artist';
        this.titleSelector = '.player-song-title';
        this.playButtonSelector = ['.icon-music-play', '.icon-music-pause-a'];
        this.progressSelector = '.progress';

        this.metadataFilter = MetadataFilter.trimFilter();

        Utils.query('.playerContainer').then(elem => this.observe(elem));
    }

    get currentTime() { return Promise.resolve(0); }

    get volume() { return Promise.resolve(1); }

    get playbackStatus() {
        return Utils.query(this.playButtonSelector).then(button => {
            return button.classList.contains('icon-music-pause-a') ? 'playing' : 'paused';
        });
    }

    get controlsInfo() {
        return super.controlsInfo.then(controlsInfo => _(controlsInfo).extendOwn({
            canGoPrevious: false,
            canGoNext: false,
            canSeek: false,
        }));
    }
};
