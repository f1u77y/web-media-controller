'use strict';

new class extends BaseConnector {
    constructor() {
        super();
        this.name = 'VK';
        this.prefix = '/com/vk';
        this.pageGetters = new Set([
            'playbackStatus', 'currentTime', 'volume', 'uniqueId',
        ]);
        this.pageSetters = new Set([
            'currentTime', 'volume',
        ]);
        this.pageActions = new Set([
            'play', 'pause', 'playPause', 'stop', 'previous', 'next', 'seek',
        ]);
        this.injectScripts('vendor/underscore.js',
                           'inject/common.js',
                           'inject/vk.js')
            .then(() => this.listenPage());
    }

    get trackInfo() {
        return Promise.all([this.getFromPage('trackInfo'), this.trackId])
            .then(([trackInfo, trackId]) => _(trackInfo).extendOwn({ trackId }))
            .then(trackInfo => Utils.deepMap(trackInfo, _.unescape));
    }
};
