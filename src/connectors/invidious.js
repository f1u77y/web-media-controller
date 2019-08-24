import BaseConnector from 'content/base-connector';
import Utils from 'content/utils';
import _ from 'underscore';

new class extends BaseConnector {
    constructor() {
        super();
        this.name = 'Invidious';
        this.prefix = '/us/invidio';
        Utils.query('video').then((video) => {
            for (const event of [ 'timeupdate', 'play', 'pause', 'volumechange' ]) {
                video.addEventListener(event, () => this.onStateChanged());
            }
        });

        this.titleSelector = 'h1';
        this.mediaSelector = 'video';
        this.nextButtonSelector = 'li.pure-menu-item:nth-child(2) > a';
    }

    get uniqueId() {
        const params = new URLSearchParams(location.search.substr(1));
        return Promise.resolve(params.get('v')
            .replace('_', '_u')
            .replace('-', '_d'));
    }

    get controlsInfo() {
        return super.controlsInfo.then((controlsInfo) => _(controlsInfo).extend({
            canStop: false,
            canGoPrevious: false,
        }));
    }
}();
