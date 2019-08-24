import BaseConnector from 'content/base-connector';
import Utils from 'content/utils';
import _ from 'underscore';

new class extends BaseConnector {
    constructor() {
        super();
        this.name = 'YouTube';
        this.prefix = '/com/youtube';
        Utils.query('video').then((video) => {
            for (const event of [ 'timeupdate', 'play', 'pause', 'volumechange' ]) {
                video.addEventListener(event, () => this.onStateChanged());
            }
        });

        const isYoutubeMusic = window.location.host === 'music.youtube.com';

        if (isYoutubeMusic) {
            this.prevButtonSelector = '.previous-button';
            this.nextButtonSelector = '.next-button';
            this.artistSelector = '.middle-controls .subtitle yt-formatted-string a:nth-child(1)';
            this.albumSelector = '.middle-controls .subtitle yt-formatted-string a:nth-child(3)';
            this.titleSelector = '.middle-controls .title';
            this.artSelector = '#song-image img';
        } else {
            this.prevButtonSelector = '.ytp-prev-button';
            this.nextButtonSelector = '.ytp-next-button';
            this.titleSelector = '.ytp-title-link';
        }
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
        return super.controlsInfo.then((controlsInfo) => _(controlsInfo).extend({
            canStop: false,
            canGoPrevious: hasPrevButton,
        }));
    }
}();
