'use strict';

define([
    'content/base-connector',
    'content/utils',
    'underscore',
], (BaseConnector, Utils, _) => {
new class extends BaseConnector {
    constructor() {
        super();

        this.name = 'Google Play Music';
        this.prefix = '/com/google';

        this.artistsSelector = '.track-info__artists a';
        this.titleSelector = '.track-info__name a';

        this.currentTimeSelector = '.playback-bar__progress-time:first-child';
        this.lengthSelector = '.playback-bar__progress-time:last-child';

        this.playButtonSelector = '.control-button[class*="spoticon-play-"],.control-button[class*="spoticon-pause-"]';

        this.prevButtonSelector = '.control-button[class*="spoticon-skip-back-"]';
        this.nextButtonSelector = '.control-button[class*="spoticon-skip-forward-"]';
        this.artSelector = '.now-playing__cover-art .cover-art-image-loaded';

        Utils.query('.now-playing-bar').then(elem => this.observe(elem));
    }

    get playbackStatus() {
        return Utils.query('.player-controls__buttons').then(elem => {
            let playButton = elem.querySelector('.control-button[class*="spoticon-play-"]');
            if (playButton) {
                return 'paused';
            }

            return 'playing';
        });
    }
};
});
