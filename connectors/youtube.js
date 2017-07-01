'use strict';

new class extends BaseConnector {
    constructor() {
        super();
        this.name = 'YouTube';
        this.prefix = '/com/youtube';
        this.query('video').then(video => {
            for (let event of ['timeupdate', 'play', 'pause', 'volumechange']) {
                video.addEventListener(event, () => this.onStateChanged());
            }
        });

        this.nextButtonSelector = '.ytp-next-button';
        this.titleSelector = '.ytp-title-link';
        this.mediaSelector = 'video';
    }

    get uniqueId() {
        const params = new URLSearchParams(location.search.substr(1));
        return params.get('v');
    }

    get properties() {
        return super.properties.then(properties => {
            return _(properties).extend({
                canStop: false,
                canGoPrevious: false,
            });
        });
    }
};
