import { $ } from 'content/utils';
import BaseConnector from 'content/base-connector';
import _ from 'underscore';

const connector = new class extends BaseConnector {
    constructor() {
        super();
        this.name = 'Deezer';
        this.pageGetters = new Set([ 'playbackStatus', 'currentTime', 'volume', 'uniqueId' ]);
        this.pageSetters = new Set([ 'currentTime', 'volume' ]);
        this.pageActions = new Set([ 'play', 'pause', 'playPause', 'previous', 'next', 'seek' ]);
        this.prefix = '/com/deezer';
        this.scriptsToInject = ['inject/deezer.js'];
        this.isInjectedScriptEmittingChanges = true;
        // this.playerSelector = '.player-bottom';
        this.prevButtonSelector = '.player-controls > .svg-icon-group > li:nth-child(1) button';
        this.nextButtonSelector = '.player-controls > .svg-icon-group > li:nth-child(5) button';
    }

    get controlsInfo() {
        const getOr = (obj, prop, def) => {
            if (!obj) return def;
            return obj[prop];
        };
        return _(super.controlsInfo).extend({
            canSeek: this.dataFromPage.get('canSeek'),
            canGoPrevious: !getOr($(this.prevButtonSelector), 'disabled', true),
            canGoNext: !getOr($(this.nextButtonSelector), 'disabled', true),
            canStop: false,
        });
    }

    get trackInfo() {
        return _(this.dataFromPage.get('trackInfo')).extend({ trackId: this.trackId });
    }
}();

connector.start();
