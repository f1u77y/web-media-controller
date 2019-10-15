import BaseConnector from 'content/base-connector';
import MetadataFilter from 'content/filter';
import Utils from 'content/utils';
import _ from 'underscore';

new class extends BaseConnector {
    constructor() {
        super();
        this.name = 'Deezer';

        this.pageGetters = new Set([ 'playbackStatus', 'currentTime', 'volume', 'uniqueId' ]);
        this.pageSetters = new Set([ 'currentTime', 'volume' ]);
        this.pageActions = new Set([ 'play', 'pause', 'playPause', 'previous', 'next', 'seek' ]);

        this.injectScripts('inject/deezer.js').then(() => {
            this.prefix = '/com/deezer';
            this.onStateChanged();
            Utils.query('.player-bottom').then((player) => this.observe(player));
        });
    }

    get controlsInfo() {
        const prevButton = document.querySelector('.player-controls > .svg-icon-group > li:nth-child(1) button');
        const nextButton = document.querySelector('.player-controls > .svg-icon-group > li:nth-child(5) button');
        return Promise.all([ super.controlsInfo, this.getFromPage('canSeek') ])
            .then(([ defaultCI, canSeek ]) => _(defaultCI).extend({
                canSeek,
                canGoPrevious: !prevButton.disabled,
                canGoNext: !nextButton.disabled,
                canStop: false,
            }));
    }

    get trackInfo() {
        return Promise.all([ this.getFromPage('trackInfo'), this.trackId ])
            .then(([ trackInfo, trackId ]) => _(trackInfo).extendOwn({ trackId }));
    }
}();
