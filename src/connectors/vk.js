import BaseConnector from 'content/base-connector';
import MetadataFilter from 'content/filter';
import _ from 'underscore';

const connector = new class extends BaseConnector {
    constructor() {
        super();
        this.name = 'VK';
        this.prefix = '/com/vk';
        this.metadataFilter = MetadataFilter.decodeHTMLFilter();
        this.pageGetters = new Set([ 'playbackStatus', 'currentTime', 'volume', 'uniqueId' ]);
        this.pageSetters = new Set([ 'currentTime', 'volume' ]);
        this.pageActions = new Set([ 'play', 'pause', 'playPause', 'stop', 'previous', 'next', 'seek' ]);

        this.scriptsToInject = ['inject/vk.js'];
        this.isInjectedScriptEmittingChanges = true;
    }

    get trackInfo() {
        return Promise.all([ this.getFromPage('trackInfo'), this.trackId ])
            .then(([ trackInfo, trackId ]) => _(trackInfo).extendOwn({ trackId }));
    }
}();

connector.start();
