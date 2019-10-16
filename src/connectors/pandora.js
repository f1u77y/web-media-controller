import BaseConnector from 'content/base-connector';
import Utils from 'content/utils';
import _ from 'underscore';

const connector = new class extends BaseConnector {
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

        this.playerSelector = '.region-bottomBar';
    }

    get playbackStatus() {
        return Utils.query('.Tuner__Control__Play__Button').then((icon) => {
            if (icon.getAttribute('data-qa').includes('pause_button')) {
                return 'playing';
            } else {
                return 'paused';
            }
        });
    }

    get artUrl() {
        return super.artUrl.then((url) => url.replace('90W_90H', '500W_500H'));
    }

    get controlsInfo() {
        return super.controlsInfo.then((controlsInfo) => _(controlsInfo).extend({
            canGoPrevious: false, canSeek: false,
        }));
    }
}();

connector.start();
