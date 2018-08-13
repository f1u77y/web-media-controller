'use strict';

import BaseConnector from 'content/base-connector';
import Utils from 'content/utils';
import _ from 'underscore';

new class extends BaseConnector {
    constructor() {
        super();
        this.name = 'YouTube';
        this.prefix = '/com/youtube';
        Utils.query('video').then(video => {
            for (let event of ['timeupdate', 'play', 'pause', 'volumechange']) {
                video.addEventListener(event, () => this.onStateChanged());
            }
        });

        this.prevButtonSelector = '.ytp-prev-button';
        this.nextButtonSelector = '.ytp-next-button';
        this.titleSelector = '.ytp-title-link';
        this.mediaSelector = 'video';
    }

    get uniqueId() {
        const params = new URLSearchParams(location.search.substr(1));
        return Promise.resolve(params.get('v')
                               .replace('_', '_u')
                               .replace('-', '_d'));
    }

    get controlsInfo() {
        const hasPrevButton = document.querySelector(this.prevButtonSelector) !== null;
        return super.controlsInfo.then(controlsInfo => _(controlsInfo).extend({
            canStop: false,
            canGoPrevious: hasPrevButton,
        }));
    }
};
