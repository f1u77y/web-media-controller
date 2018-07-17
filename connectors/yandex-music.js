'use strict';

import BaseConnector from 'content/base-connector';
import Utils from 'content/utils';
import _ from 'underscore';

new class extends BaseConnector {
    constructor() {
        super();
        this.name = 'Yandex.Music';
        this.prefix = '/ru/yandex/music';

        this.pageGetters = new Set([
            'playbackStatus', 'currentTime', 'volume', 'uniqueId',
        ]);
        this.pageSetters = new Set([
            'currentTime', 'volume',
        ]);
        this.pageActions = new Set([
            'play', 'pause', 'playPause', 'stop', 'previous', 'next', 'seek',
        ]);

        this.injectScripts('inject/yandex-music.js')
            .then(() => this.listenPage());
    }

    get trackInfo() {
        return Promise.all([this.getFromPage('trackInfo'), this.trackId])
            .then(([trackInfo, trackId]) => _(trackInfo).extendOwn({ trackId }));
    }
};
