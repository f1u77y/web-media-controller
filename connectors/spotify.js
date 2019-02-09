'use strict';

import BaseConnector from 'content/base-connector';
import Utils from 'content/utils';
import _ from 'underscore';

new class extends BaseConnector {
    constructor() {
        super();

        this.name = 'Spotify';
        this.prefix = '/com/spotify';

        this.artistsSelector = '.track-info__artists';
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

    get artist() {
        let artistContainer = document.querySelector(this.artistsSelector);
        if (artistContainer) {
            let artistNodes = artistContainer.querySelectorAll('a');
            if (artistNodes) {
                let artists = [];

                for (let node of artistNodes) {
                    artists.push(node.textContent.trim());
                }

                return artists;
            }
        }

        return Promise.resolve(undefined);
    }
};
