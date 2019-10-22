import BaseConnector from 'content/base-connector';
import _ from 'underscore';

const connector = new class extends BaseConnector {
    constructor() {
        super();
        this.name = 'Yandex.Music';
        this.prefix = '/ru/yandex/music';

        this.pageGetters = new Set([ 'playbackStatus', 'currentTime', 'volume', 'uniqueId', 'controlsInfo' ]);
        this.pageSetters = new Set([ 'currentTime', 'volume' ]);
        this.pageActions = new Set([ 'play', 'pause', 'playPause', 'stop', 'previous', 'next', 'seek' ]);

        this.scriptsToInject = ['inject/yandex-music.js'];
        this.isInjectedScriptEmittingChanges = true;
    }

    get trackInfo() {
        return _(this.dataFromPage.get('trackInfo')).extendOwn({ trackId: this.trackId });
    }
}();

connector.start();
