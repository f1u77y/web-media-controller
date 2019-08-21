'use strict';

import BaseConnector from 'content/base-connector';
import Utils from 'content/utils';
import _ from 'underscore';
import MetadataFilter from 'content/filter';

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

        this.metadataFilter = new MetadataFilter({
            all: text => {
                let splitted = text.split(' : ');
                if (splitted.length !== 2 || splitted[0] !== splitted[1]) {
                    return text;
                }
                return splitted[0];
            },
        });

        this.prefix = '/com/deezer';
        this.onStateChanged();
        Utils.query('#player').then(player => this.observe(player));
        this.injectScripts('inject/deezer.js');
    }

    get playbackStatus() {
        return Utils.query('.control-play svg').then(svg => {
            const isPlaying = svg.classList.contains('svg-icon-pause');
            return isPlaying ? 'playing' : 'paused';
        });
    }

    get controlsInfo() {
        const canSeek = this.getFromPage('canSeek');
        const canGoPrevious = Utils.query('.control-prev').then(btn => !btn.disabled);
        const canGoNext = Utils.query('.control-next').then(btn => !btn.disabled);
        return Promise.all([super.controlsInfo, canSeek, canGoNext, canGoPrevious])
            .then(([controlsInfo, canSeek, canGoNext, canGoPrevious]) => {
                return _(controlsInfo).extend({ canGoPrevious, canGoNext, canSeek });
            });
    }

    get currentTime() { return super.currentTime; }

    set currentTime(currentTime) {
        this.length.then((length) => {
            this.setOnPage('currentTime', { position: currentTime, length });
        });
    }

    seek(offset) {
        Promise.all([this.length, this.currentTime]).then((length, position) => {
            this.sendToPage('seek', { offset, length, position });
        });
    }
};
