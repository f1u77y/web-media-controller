'use strict';

new class extends BaseConnector {
    constructor() {
        super();

        this.name = 'Pandora';
        this.prefix = '/com/pandora';
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

    get artist() {
        return this.query('.Tuner__Audio__TrackDetail__artist').then(elem => {
            return elem.textContent;
        });
    }

    get title() {
        return this.query('.Tuner__Audio__TrackDetail__title').then(elem => {
            return elem.textContent;
        });
    }

    get artUrl() {
        return this.query('.Tuner__Audio__TrackDetail__img img').then(elem => {
            // Return URL of original image, not resized one.
            if (!elem) {
                return null;
            }
            return elem.src.replace('90W_90H', '500W_500H');
        });
    }

    get properties() {
        return _(super.properties).extend({
            canGoPrevious: false, canSeek: false,
        });
    }

    playPause() {
        this.query('.PlayButton').then(btn => {
            btn.click()
        });
    }

    next() {
        this.query('.SkipButton').then(btn => btn.click());
    }
};
