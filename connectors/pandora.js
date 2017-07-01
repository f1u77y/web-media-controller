'use strict';

new class extends BaseConnector {
    constructor() {
        super();

        this.name = 'Pandora';
        this.prefix = '/com/pandora';

        this.artistSelector = '.Tuner__Audio__TrackDetail__artist';
        this.titleSelector = '.Tuner__Audio__TrackDetail__title';
        this.artSelector = '.Tuner__Audio__TrackDetail__img img';

        this.currentTimeSelector = '.Duration [data-qa="elapsed_time"]';
        this.lengthSelector = '.Duration [data-qa="remaining_time"]';

        this.playButtonSelector = '.PlayButton';
        this.nextButtonSelector = '.SkipButton';

        this.query('.region-bottomBar').then(elem => this.observe(elem));
    }

    get playbackStatus() {
        return this.query('.PlayButton use').then(icon => {
            if (icon.getAttribute('xlink:href').includes('pause')) {
                return 'playing';
            } else {
                return 'paused';
            }
        });
    }

    get artUrl() {
        return super.artUrl.then(url => url.replace('90W_90H', '500W_500H'));
    }

    get properties() {
        return super.properties.then(properties => _(properties).extend({
            canGoPrevious: false, canSeek: false,
        }));
    }
};
