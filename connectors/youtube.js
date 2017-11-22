'use strict';

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
        return Promise.resolve(params.get('v'));
    }

    get properties() {
        const hasPrevButton = document.querySelector(this.prevButtonSelector) !== null;
        return super.properties.then(properties => _(properties).extend({
            canStop: false,
            canGoPrevious: hasPrevButton,
        }));
    }
};
